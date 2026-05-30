import { RssParserService, RssItem } from './rss-parser.service';
import { OgImageService } from '../common/og-image.service';

describe('RssParserService', () => {
  let service: RssParserService;
  let og: jest.Mocked<OgImageService>;

  beforeEach(() => {
    og = {
      fetch: jest.fn(),
      absolutize: jest.fn((src: string, base?: string) => {
        if (src.startsWith('//')) return `https:${src}`;
        if (src.startsWith('/') && base) {
          try {
            const u = new URL(base);
            return `${u.protocol}//${u.host}${src}`;
          } catch {
            return src;
          }
        }
        return src;
      }),
      parse: jest.fn(),
    } as unknown as jest.Mocked<OgImageService>;
    service = new RssParserService(og);
  });

  describe('extractImageFromItem', () => {
    it('enclosure가 image/* type이면 enclosure.url 반환', () => {
      const item: RssItem = {
        enclosure: { url: 'https://example.com/a.jpg', type: 'image/jpeg' },
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/a.jpg',
      );
    });

    it('enclosure type 미지정 시 enclosure.url 반환', () => {
      const item: RssItem = {
        enclosure: { url: 'https://example.com/a.jpg' },
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/a.jpg',
      );
    });

    it('enclosure가 audio면 enclosure 무시하고 다음 후보로', () => {
      const item: RssItem = {
        enclosure: { url: 'https://example.com/a.mp3', type: 'audio/mpeg' },
        'media:thumbnail': { $: { url: 'https://example.com/thumb.png' } },
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/thumb.png',
      );
    });

    it('media:thumbnail 우선', () => {
      const item: RssItem = {
        'media:thumbnail': { $: { url: 'https://example.com/thumb.png' } },
        'media:content': { $: { url: 'https://example.com/content.png' } },
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/thumb.png',
      );
    });

    it('media:content medium=image 인 경우 url 반환', () => {
      const item: RssItem = {
        'media:content': {
          $: { url: 'https://example.com/content.png', medium: 'image' },
        },
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/content.png',
      );
    });

    it('media:content medium=video 인 경우 무시', () => {
      const item: RssItem = {
        'media:content': {
          $: { url: 'https://example.com/v.mp4', medium: 'video' },
        },
        'content:encoded': '<p>본문</p><img src="https://example.com/in.jpg" />',
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/in.jpg',
      );
    });

    it('content:encoded 안 첫 <img src> 추출', () => {
      const item: RssItem = {
        'content:encoded':
          '<p>안녕</p><img src="https://example.com/first.png"><img src="https://example.com/second.png">',
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/first.png',
      );
    });

    it('description 안 <img> 도 처리', () => {
      const item: RssItem = {
        description: '<img src="https://example.com/d.jpg" />',
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/d.jpg',
      );
    });

    it('이미지 후보 전무하면 null', () => {
      const item: RssItem = {
        title: '제목',
        description: '<p>이미지 없는 본문</p>',
      };
      expect(service.extractImageFromItem(item)).toBeNull();
    });

    it('따옴표 single 도 처리', () => {
      const item: RssItem = {
        'content:encoded': "<img src='https://example.com/s.png' />",
      };
      expect(service.extractImageFromItem(item)).toBe(
        'https://example.com/s.png',
      );
    });
  });

  describe('absolutize (private이지만 resolveImageUrl을 통해 검증)', () => {
    it('//example.com/x.png → https:// 붙임', async () => {
      jest
        .spyOn(service, 'extractImageFromItem')
        .mockReturnValue('//cdn.example.com/x.png');
      const result = await service.resolveImageUrl({
        link: 'https://blog.com/post',
      } as RssItem);
      expect(result).toBe('https://cdn.example.com/x.png');
    });

    it('절대 경로 /path/x.png → host 합성', async () => {
      jest
        .spyOn(service, 'extractImageFromItem')
        .mockReturnValue('/uploads/x.png');
      const result = await service.resolveImageUrl({
        link: 'https://blog.com/article/1',
      } as RssItem);
      expect(result).toBe('https://blog.com/uploads/x.png');
    });

    it('이미 절대 URL은 그대로', async () => {
      jest
        .spyOn(service, 'extractImageFromItem')
        .mockReturnValue('https://cdn.com/a.png');
      const result = await service.resolveImageUrl({
        link: 'https://blog.com/x',
      } as RssItem);
      expect(result).toBe('https://cdn.com/a.png');
    });
  });

  describe('resolveImageUrl', () => {
    it('RSS에서 잡히면 OgImageService.fetch 호출 안 함', async () => {
      jest
        .spyOn(service, 'extractImageFromItem')
        .mockReturnValue('https://rss-img.com/a.png');
      const result = await service.resolveImageUrl({
        link: 'https://blog.com/x',
      } as RssItem);
      expect(result).toBe('https://rss-img.com/a.png');
      expect(og.fetch).not.toHaveBeenCalled();
    });

    it('RSS에서 못 잡고 link 없으면 null', async () => {
      jest.spyOn(service, 'extractImageFromItem').mockReturnValue(null);
      const result = await service.resolveImageUrl({} as RssItem);
      expect(result).toBeNull();
      expect(og.fetch).not.toHaveBeenCalled();
    });

    it('RSS에서 못 잡으면 OgImageService.fetch 시도', async () => {
      jest.spyOn(service, 'extractImageFromItem').mockReturnValue(null);
      og.fetch.mockResolvedValue('https://og.com/a.png');
      const result = await service.resolveImageUrl({
        link: 'https://blog.com/x',
      } as RssItem);
      expect(result).toBe('https://og.com/a.png');
      expect(og.fetch).toHaveBeenCalledWith('https://blog.com/x');
    });
  });
});
