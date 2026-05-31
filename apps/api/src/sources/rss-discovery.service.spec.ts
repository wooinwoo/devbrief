import { Test } from '@nestjs/testing';
import { RssDiscoveryService } from './rss-discovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { OgImageService } from '../common/og-image.service';

describe('RssDiscoveryService', () => {
  let service: RssDiscoveryService;
  let prisma: { source: { findUnique: jest.Mock; create: jest.Mock } };
  let og: OgImageService;

  beforeEach(async () => {
    prisma = { source: { findUnique: jest.fn(), create: jest.fn() } };
    og = new OgImageService();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RssDiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: OgImageService, useValue: og },
      ],
    }).compile();

    service = moduleRef.get(RssDiscoveryService);
  });

  describe('extractAlternateLinks', () => {
    it('표준 rss <link rel=alternate type=application/rss+xml>', () => {
      const html = `<link rel="alternate" type="application/rss+xml" title="Blog Feed" href="https://blog.com/rss">`;
      const result = service.extractAlternateLinks(html, 'https://blog.com');
      expect(result).toEqual([
        { feedUrl: 'https://blog.com/rss', title: 'Blog Feed', type: 'rss' },
      ]);
    });

    it('atom 형식도 매치', () => {
      const html = `<link rel="alternate" type="application/atom+xml" title="Atom" href="/atom.xml">`;
      const result = service.extractAlternateLinks(html, 'https://blog.com/about');
      expect(result).toEqual([
        { feedUrl: 'https://blog.com/atom.xml', title: 'Atom', type: 'atom' },
      ]);
    });

    it('속성 순서 무관 처리', () => {
      const html = `<link type="application/rss+xml" href="https://x.com/rss" rel="alternate">`;
      const result = service.extractAlternateLinks(html, 'https://x.com');
      expect(result).toHaveLength(1);
      expect(result[0].feedUrl).toBe('https://x.com/rss');
    });

    it('rel에 alternate 없으면 skip', () => {
      const html = `<link rel="stylesheet" type="application/rss+xml" href="/x">`;
      expect(service.extractAlternateLinks(html, 'https://x.com')).toEqual([]);
    });

    it('rss/atom 외 type은 skip', () => {
      const html = `<link rel="alternate" type="application/json" href="/x.json">`;
      expect(service.extractAlternateLinks(html, 'https://x.com')).toEqual([]);
    });

    it('여러 피드 동시 추출 (최대 5개)', () => {
      const html = Array.from(
        { length: 8 },
        (_, i) =>
          `<link rel="alternate" type="application/rss+xml" title="F${i}" href="https://x.com/f${i}">`,
      ).join('\n');
      expect(service.extractAlternateLinks(html, 'https://x.com')).toHaveLength(5);
    });

    it('title 누락 시 fallback', () => {
      const html = `<link rel="alternate" type="application/rss+xml" href="/rss">`;
      const result = service.extractAlternateLinks(html, 'https://blog.com');
      expect(result[0].title).toBe('Untitled feed');
    });
  });

  describe('guessFeedPaths', () => {
    it('흔한 경로 5개 생성', () => {
      const result = service.guessFeedPaths('https://blog.com/some/page');
      const paths = result.map((r) => new URL(r.feedUrl).pathname);
      expect(paths).toEqual(['/rss', '/feed', '/rss.xml', '/atom.xml', '/feed.xml']);
    });

    it('잘못된 URL은 빈 배열', () => {
      expect(service.guessFeedPaths('not-a-url')).toEqual([]);
    });
  });

  describe('discoverAndRegister', () => {
    it('새 피드는 create, 기존 feedUrl은 skip', async () => {
      jest.spyOn(service, 'discover').mockResolvedValue([
        { feedUrl: 'https://a.com/rss', title: 'A Blog', type: 'rss' },
        { feedUrl: 'https://b.com/feed', title: 'B 한국어', type: 'rss' },
      ]);
      prisma.source.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });
      prisma.source.create.mockResolvedValue({ id: 'new' });

      const result = await service.discoverAndRegister('https://a.com');

      expect(result.created).toBe(1);
      expect(result.existing).toBe(1);
      const data = prisma.source.create.mock.calls[0][0].data;
      expect(data.provider).toBe('rss_generic');
      expect(data.feedUrl).toBe('https://a.com/rss');
      expect(data.language).toBe('en');
    });

    it('한국어 제목이면 language=ko', async () => {
      jest.spyOn(service, 'discover').mockResolvedValue([
        { feedUrl: 'https://k.com/rss', title: '오늘의 한국 블로그', type: 'rss' },
      ]);
      prisma.source.findUnique.mockResolvedValue(null);
      prisma.source.create.mockResolvedValue({ id: 'k' });

      await service.discoverAndRegister('https://k.com');
      const data = prisma.source.create.mock.calls[0][0].data;
      expect(data.language).toBe('ko');
    });

    it('discover 결과 0개면 created 0', async () => {
      jest.spyOn(service, 'discover').mockResolvedValue([]);
      const result = await service.discoverAndRegister('https://x.com');
      expect(result).toEqual({ created: 0, existing: 0, feeds: [] });
    });
  });
});
