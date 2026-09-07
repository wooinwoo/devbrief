import { normalizeArticleUrl } from './url-normalizer';

describe('normalizeArticleUrl', () => {
  it('utm_* 트래킹 파라미터 제거', () => {
    expect(normalizeArticleUrl('https://blog.x/post?utm_source=rss&utm_medium=email')).toBe(
      'https://blog.x/post',
    );
  });

  it('fbclid/gclid 등 트래킹 파라미터 제거', () => {
    expect(normalizeArticleUrl('https://blog.x/post?fbclid=abc123')).toBe('https://blog.x/post');
    expect(normalizeArticleUrl('https://blog.x/post?gclid=xyz')).toBe('https://blog.x/post');
  });

  it('의미 있는 쿼리 파라미터는 보존', () => {
    expect(normalizeArticleUrl('https://blog.x/post?id=42&utm_source=rss')).toBe(
      'https://blog.x/post?id=42',
    );
  });

  it('프래그먼트(#...) 제거', () => {
    expect(normalizeArticleUrl('https://blog.x/post#section-2')).toBe('https://blog.x/post');
  });

  it('트레일링 슬래시 제거 (루트는 유지)', () => {
    expect(normalizeArticleUrl('https://blog.x/post/')).toBe('https://blog.x/post');
    // 루트는 두 표기가 같은 값으로 수렴
    expect(normalizeArticleUrl('https://blog.x')).toBe(normalizeArticleUrl('https://blog.x/'));
  });

  it('호스트는 소문자화, 경로 대소문자는 보존', () => {
    expect(normalizeArticleUrl('https://Blog.X/Post')).toBe('https://blog.x/Post');
  });

  it('http 를 https 로 승격하지 않음 (링크 파손 방지)', () => {
    expect(normalizeArticleUrl('http://old-site.com/post')).toBe('http://old-site.com/post');
  });

  it('http/https 외 스킴은 손대지 않음', () => {
    expect(normalizeArticleUrl('mailto:hi@example.com')).toBe('mailto:hi@example.com');
  });

  it('URL 형식이 아니면 trim 만 하고 그대로 반환', () => {
    expect(normalizeArticleUrl('  not a url  ')).toBe('not a url');
  });
});
