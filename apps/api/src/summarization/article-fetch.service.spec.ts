jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
import axios from 'axios';
import { ArticleFetchService } from './article-fetch.service';

const mockGet = axios.get as jest.Mock;
const page = (body: string) => ({ data: `<html><body>${body}</body></html>` });

describe('ArticleFetchService.fetchBody', () => {
  let svc: ArticleFetchService;
  beforeEach(() => {
    svc = new ArticleFetchService();
    mockGet.mockReset();
  });

  it('<article> 안의 문단을 평문으로 추출한다', async () => {
    const para = '가'.repeat(50);
    mockGet.mockResolvedValue(page(`<article><p>${para}</p></article>`));
    const out = await svc.fetchBody('https://x.com/a');
    expect(out).toContain(para);
  });

  it('보일러플레이트(nav/script)는 제거하고 본문만 남긴다', async () => {
    const body = `<nav>메뉴 메뉴 메뉴 메뉴 메뉴 메뉴 메뉴 메뉴</nav><article><p>${'본문내용'.repeat(15)}</p></article><script>alert(1)</script>`;
    mockGet.mockResolvedValue(page(body));
    const out = await svc.fetchBody('https://x.com/a');
    expect(out).not.toContain('메뉴');
    expect(out).not.toContain('alert');
    expect(out).toContain('본문내용');
  });

  it('<article>이 없으면 <main>을 사용한다', async () => {
    const para = '본문'.repeat(30);
    mockGet.mockResolvedValue(page(`<main><p>${para}</p></main>`));
    const out = await svc.fetchBody('https://x.com/a');
    expect(out).toContain('본문');
  });

  it('max 길이를 넘으면 잘라낸다', async () => {
    const para = '글'.repeat(2000);
    mockGet.mockResolvedValue(page(`<article><p>${para}</p></article>`));
    const out = await svc.fetchBody('https://x.com/a', 300);
    expect(out!.length).toBeLessThanOrEqual(300);
  });

  it('본문이 너무 짧으면 null', async () => {
    mockGet.mockResolvedValue(page('<p>짧음</p>'));
    expect(await svc.fetchBody('https://x.com/a')).toBeNull();
  });

  it('네트워크 실패 시 throw 하지 않고 null', async () => {
    mockGet.mockRejectedValue(new Error('ECONNRESET'));
    expect(await svc.fetchBody('https://x.com/a')).toBeNull();
  });

  describe('리다이렉트 수동 추종 (SSRF 가드)', () => {
    const redirect = (to: string) => ({
      status: 301,
      headers: { location: to },
      data: '',
    });
    const para = '본문내용'.repeat(20);
    const okPage = {
      status: 200,
      ...page(`<article><p>${para}</p></article>`),
    };

    it('자동 추종은 꺼져 있다 (maxRedirects: 0)', async () => {
      mockGet.mockResolvedValue(okPage);
      await svc.fetchBody('https://x.com/a');
      expect(mockGet.mock.calls[0][1].maxRedirects).toBe(0);
    });

    it('3회 이내 리다이렉트는 홉마다 재검증하며 추종한다', async () => {
      mockGet
        .mockResolvedValueOnce(redirect('https://x.com/b'))
        .mockResolvedValueOnce(redirect('https://x.com/c'))
        .mockResolvedValueOnce(okPage);
      const out = await svc.fetchBody('https://x.com/a');
      expect(out).toContain('본문내용');
      expect(mockGet).toHaveBeenCalledTimes(3);
      expect(mockGet.mock.calls[1][0]).toBe('https://x.com/b');
      expect(mockGet.mock.calls[2][0]).toBe('https://x.com/c');
    });

    it('상대경로 Location 은 현재 URL 기준으로 해석한다', async () => {
      mockGet.mockResolvedValueOnce(redirect('/moved')).mockResolvedValueOnce(okPage);
      await svc.fetchBody('https://x.com/a');
      expect(mockGet.mock.calls[1][0]).toBe('https://x.com/moved');
    });

    it('리다이렉트가 3회를 넘으면 중단하고 null', async () => {
      mockGet.mockResolvedValue(redirect('https://x.com/loop'));
      expect(await svc.fetchBody('https://x.com/a')).toBeNull();
      expect(mockGet).toHaveBeenCalledTimes(4); // 최초 1 + 리다이렉트 3
    });

    it('http/https 외 프로토콜로의 리다이렉트는 거부한다', async () => {
      mockGet.mockResolvedValueOnce(redirect('file:///etc/passwd'));
      expect(await svc.fetchBody('https://x.com/a')).toBeNull();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('내부망 호스트로의 리다이렉트는 거부한다 (클라우드 메타데이터)', async () => {
      mockGet.mockResolvedValueOnce(redirect('http://169.254.169.254/latest/meta-data'));
      expect(await svc.fetchBody('https://x.com/a')).toBeNull();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('시작 URL 자체가 내부망이면 fetch 하지 않는다', async () => {
      expect(await svc.fetchBody('http://localhost:6379/x')).toBeNull();
      expect(await svc.fetchBody('http://10.0.0.5/internal')).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('3xx 인데 Location 이 없으면 null', async () => {
      mockGet.mockResolvedValueOnce({ status: 304, headers: {}, data: '' });
      expect(await svc.fetchBody('https://x.com/a')).toBeNull();
    });
  });
});
