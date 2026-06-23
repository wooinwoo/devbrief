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
});
