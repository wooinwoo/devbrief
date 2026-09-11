import { SummarizationService } from './summarization.service';

// Gemini 성공/실패/미설정 각 경로에서 summarySource 기록·에러 전파를 검증한다.
describe('SummarizationService.summarize', () => {
  let gemini: { isAvailable: jest.Mock; generateJson: jest.Mock };
  let prisma: { article: { update: jest.Mock; findUnique: jest.Mock } };
  let translation: { hasKorean: jest.Mock; toKorean: jest.Mock };
  let fetcher: { fetchBody: jest.Mock };
  let svc: SummarizationService;

  // 무료 경로가 fetch 없이 문장 추출을 끝낼 만큼 긴 한국어 스니펫
  const KO_SNIPPET =
    '첫 번째 문장은 충분히 길게 작성했다. 두 번째 문장도 충분히 길게 작성했다. 세 번째 문장도 충분히 길게 작성했다.';

  beforeEach(() => {
    gemini = { isAvailable: jest.fn(), generateJson: jest.fn() };
    prisma = {
      article: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          url: 'https://x.com/a',
          contentSnippet: KO_SNIPPET,
        }),
      },
    };
    translation = {
      hasKorean: jest.fn((s: string) => /[가-힣]/.test(s)),
      toKorean: jest.fn().mockResolvedValue('번역된 제목'),
    };
    fetcher = { fetchBody: jest.fn().mockResolvedValue(null) };
    svc = new SummarizationService(
      gemini as any,
      prisma as any,
      translation as any,
      fetcher as any,
    );
  });

  it('Gemini 성공 시 summarySource=gemini 로 저장한다', async () => {
    gemini.isAvailable.mockReturnValue(true);
    gemini.generateJson.mockResolvedValue({
      language: 'en',
      titleKo: '한국어 제목',
      summaryOneLine: '한 줄 요약.',
      summaryThreeLine: '줄1\n줄2\n줄3',
    });

    await svc.summarize('a1', 'Title', KO_SNIPPET);

    expect(prisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: expect.objectContaining({ summarySource: 'gemini' }),
      }),
    );
    // 무료 경로(번역)는 타지 않는다
    expect(translation.toKorean).not.toHaveBeenCalled();
  });

  it('Gemini 사용 가능한데 호출 실패하면 폴백하지 않고 throw (재시도는 processor 몫)', async () => {
    gemini.isAvailable.mockReturnValue(true);
    gemini.generateJson.mockRejectedValue(new Error('429 rate limit'));

    await expect(svc.summarize('a1', 'Title', KO_SNIPPET)).rejects.toThrow('429 rate limit');
    // 폴백 저장이 일어나지 않아야 한다
    expect(prisma.article.update).not.toHaveBeenCalled();
    expect(translation.toKorean).not.toHaveBeenCalled();
  });

  it('키 미설정(isAvailable=false)이면 즉시 무료 경로 — summarySource=free', async () => {
    gemini.isAvailable.mockReturnValue(false);

    await svc.summarize('a1', '한국어 제목', KO_SNIPPET);

    expect(gemini.generateJson).not.toHaveBeenCalled();
    const data = prisma.article.update.mock.calls.at(-1)[0].data;
    expect(data.summarySource).toBe('free');
    expect(data.summaryOneLine).toBeTruthy();
  });

  it('summarizeFree 직접 호출도 summarySource=free 로 기록한다', async () => {
    await svc.summarizeFree('a1', '한국어 제목', KO_SNIPPET);
    const data = prisma.article.update.mock.calls.at(-1)[0].data;
    expect(data.summarySource).toBe('free');
  });
  it('preserves an existing translated title when the translation provider is unavailable', async () => {
    translation.toKorean.mockResolvedValue(null);
    const titleKo = '\uAE30\uC874 \uBC88\uC5ED';
    prisma.article.findUnique.mockResolvedValue({
      url: 'https://example.com',
      contentSnippet: KO_SNIPPET,
      titleKo,
    });
    await svc.summarizeFree('a1', 'Original title', KO_SNIPPET);
    expect(prisma.article.update.mock.calls.at(-1)[0].data.titleKo).toBe(titleKo);
  });
  it('본문 근거가 없으면 AI에게 제목만으로 요약을 생성시키지 않는다', async () => {
    gemini.isAvailable.mockReturnValue(true);
    prisma.article.findUnique.mockResolvedValue({ url: 'https://example.com' });
    await svc.summarize('a1', '새로운 기술', '');
    expect(gemini.generateJson).not.toHaveBeenCalled();
    expect(prisma.article.update.mock.calls.at(-1)[0].data.summaryOneLine).toBeNull();
  });
  it('AI 응답 형식이 깨지면 기존 요약에 쓰지 않는다', async () => {
    gemini.isAvailable.mockReturnValue(true);
    gemini.generateJson.mockResolvedValue({
      language: 'en',
      titleKo: null,
      summaryOneLine: { text: 'bad' },
    });
    await expect(svc.summarize('a1', 'Title', KO_SNIPPET)).rejects.toThrow(
      'Invalid grounded summary',
    );
    expect(prisma.article.update).not.toHaveBeenCalled();
  });
  it('메타데이터뿐인 피드는 저장된 본문에서 요약한다', async () => {
    prisma.article.findUnique.mockResolvedValue({
      url: 'https://example.com',
      contentHtml: `<article><p>${KO_SNIPPET}</p></article>`,
    });
    await svc.summarizeFree(
      'a1',
      '한국어 제목',
      'Article URL: https://example.com Comments URL: https://news.ycombinator.com Points: 50 # Comments: 3',
    );
    expect(fetcher.fetchBody).not.toHaveBeenCalled();
    expect(prisma.article.update.mock.calls.at(-1)[0].data.summaryOneLine).toContain(
      '첫 번째 문장',
    );
  });
  it.each(['', KO_SNIPPET])(
    '무료 폴백이 기존 Gemini 요약을 지우거나 추출문으로 낮추지 않는다 (%s)',
    async (snippet) => {
      translation.toKorean.mockResolvedValue(null);
      prisma.article.findUnique.mockResolvedValue({
        url: 'https://example.com',
        summaryOneLine: '기존 정상 요약',
        summaryThreeLine: '기존 정상 상세 요약',
        summarySource: 'gemini',
      });
      await svc.summarizeFree('a1', 'Original title', snippet);
      expect(prisma.article.update.mock.calls.at(-1)[0].data).toEqual(
        expect.objectContaining({
          summaryOneLine: '기존 정상 요약',
          summaryThreeLine: '기존 정상 상세 요약',
          summarySource: 'gemini',
        }),
      );
    },
  );
});
