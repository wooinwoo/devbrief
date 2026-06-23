import { OgImageService } from './og-image.service';

describe('OgImageService', () => {
  let service: OgImageService;

  beforeEach(() => {
    service = new OgImageService();
  });

  describe('parse', () => {
    it('og:image 표준 형식', () => {
      const html = `<meta property="og:image" content="https://example.com/og.jpg">`;
      expect(service.parse(html)).toBe('https://example.com/og.jpg');
    });

    it('content / property 순서 뒤집힌 형식', () => {
      const html = `<meta content="https://example.com/og.jpg" property="og:image">`;
      expect(service.parse(html)).toBe('https://example.com/og.jpg');
    });

    it('og:image:secure_url 도 매치', () => {
      const html = `<meta property="og:image:secure_url" content="https://secure.example.com/og.jpg">`;
      expect(service.parse(html)).toBe('https://secure.example.com/og.jpg');
    });

    it('twitter:image fallback', () => {
      const html = `<meta name="twitter:image" content="https://example.com/twitter.png">`;
      expect(service.parse(html)).toBe('https://example.com/twitter.png');
    });

    it('twitter:image 순서 뒤집힌 형식', () => {
      const html = `<meta content="https://example.com/twitter.png" name="twitter:image">`;
      expect(service.parse(html)).toBe('https://example.com/twitter.png');
    });

    it('link rel=image_src fallback', () => {
      const html = `<link rel="image_src" href="https://example.com/icon.png">`;
      expect(service.parse(html)).toBe('https://example.com/icon.png');
    });

    it('og:image 우선 (twitter보다)', () => {
      const html = `
        <meta property="og:image" content="https://og.com/a.jpg">
        <meta name="twitter:image" content="https://twitter.com/a.jpg">
      `;
      expect(service.parse(html)).toBe('https://og.com/a.jpg');
    });

    it('아무 메타도 없으면 null', () => {
      expect(service.parse('<html><body>Hello</body></html>')).toBeNull();
    });

    it('상대 경로 + base → 절대화', () => {
      const html = `<meta property="og:image" content="/static/og.jpg">`;
      expect(service.parse(html, 'https://blog.com/post/1')).toBe('https://blog.com/static/og.jpg');
    });

    it('// 시작 → https:// 붙임', () => {
      const html = `<meta property="og:image" content="//cdn.com/og.jpg">`;
      expect(service.parse(html)).toBe('https://cdn.com/og.jpg');
    });
  });

  describe('absolutize', () => {
    it('이미 절대 URL은 그대로', () => {
      expect(service.absolutize('https://a.com/x.png')).toBe('https://a.com/x.png');
    });

    it('// → https://', () => {
      expect(service.absolutize('//a.com/x.png')).toBe('https://a.com/x.png');
    });

    it('/path + base → 절대화', () => {
      expect(service.absolutize('/p/x.png', 'https://a.com/sub/y')).toBe('https://a.com/p/x.png');
    });

    it('base 없으면 상대경로 그대로', () => {
      expect(service.absolutize('/p/x.png')).toBe('/p/x.png');
    });

    it('잘못된 base URL은 graceful', () => {
      expect(service.absolutize('/x.png', 'not-a-url')).toBe('/x.png');
    });
  });
});
