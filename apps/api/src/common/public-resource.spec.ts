import axios from 'axios';
import { fetchPublicResource } from './public-resource';
import { assertPublicHttpUrl } from './url-guard';
jest.mock('axios');
jest.mock('./url-guard', () => ({ assertPublicHttpUrl: jest.fn() }));
const get = axios.get as jest.Mock;
const check = assertPublicHttpUrl as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  check.mockImplementation(async (url: string) => new URL(url));
});
it('validates each redirect and resolves the final page URL', async () => {
  get
    .mockResolvedValueOnce({ status: 302, headers: { location: '/2026/' } })
    .mockResolvedValueOnce({
      status: 200,
      headers: {},
      data: 'ok',
      config: { url: 'https://event.test/2026/' },
    });
  const response = await fetchPublicResource('https://event.test', { timeout: 5000 });
  expect(check.mock.calls).toEqual([['https://event.test'], ['https://event.test/2026/']]);
  expect(get).toHaveBeenCalledWith(
    'https://event.test/',
    expect.objectContaining({ maxRedirects: 0 }),
  );
  expect(response.data).toBe('ok');
});
it('never requests a rejected redirect destination', async () => {
  get.mockResolvedValueOnce({ status: 302, headers: { location: 'http://127.0.0.1/admin' } });
  check
    .mockResolvedValueOnce(new URL('https://event.test'))
    .mockRejectedValueOnce(new Error('private host'));
  await expect(fetchPublicResource('https://event.test', { timeout: 5000 })).rejects.toThrow(
    'private host',
  );
  expect(get).toHaveBeenCalledTimes(1);
});
it('rejects credential-bearing resources before a request', async () => {
  await expect(
    fetchPublicResource('https://user:pass@event.test', { timeout: 5000 }),
  ).rejects.toThrow('credentials');
  expect(get).not.toHaveBeenCalled();
});
