jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
import axios from 'axios';
import { TranslationService } from './translation.service';

const mockGet = axios.get as jest.Mock;

describe('TranslationService', () => {
  let svc: TranslationService;
  beforeEach(() => {
    svc = new TranslationService();
    mockGet.mockReset();
  });

  describe('hasKorean', () => {
    it('한글 음절이 하나라도 있으면 true', () => {
      expect(svc.hasKorean('hello 안녕')).toBe(true);
    });
    it('영문/숫자만이면 false', () => {
      expect(svc.hasKorean('hello world 123')).toBe(false);
    });
  });

  describe('toKorean', () => {
    it('이미 한국어면 번역 호출 없이 null', async () => {
      expect(await svc.toKorean('이미 한국어 문장')).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('빈 값이면 null', async () => {
      expect(await svc.toKorean('   ')).toBeNull();
    });

    it('Google 비공식 경로로 영문을 번역한다', async () => {
      // translate_a 응답: data[0] = [[번역, 원문, ...], ...]
      mockGet.mockResolvedValue({ data: [[['안녕하세요', 'Hello']]] });
      expect(await svc.toKorean('Hello')).toBe('안녕하세요');
    });

    it('보호 매체명(Import AI)은 번역 과정에서 보존된다', async () => {
      // mock은 받은 q(placeholder 마스킹된 텍스트)를 그대로 돌려준다
      mockGet.mockImplementation((_url: string, opts: { params: { q: string } }) =>
        Promise.resolve({ data: [[[`${opts.params.q} 출시`, opts.params.q]]] }),
      );
      const out = await svc.toKorean('Import AI launches today');
      expect(out).toContain('Import AI'); // ⟦0⟧ 복원 확인
      expect(out).not.toContain('⟦'); // 잔여 placeholder 없음
    });

    it('Google 실패 시 MyMemory로 폴백한다', async () => {
      mockGet.mockRejectedValueOnce(new Error('google down')).mockResolvedValueOnce({
        data: { responseStatus: 200, responseData: { translatedText: '폴백 번역' } },
      });
      expect(await svc.toKorean('Hello')).toBe('폴백 번역');
    });

    it('두 경로 모두 실패하면 null', async () => {
      mockGet.mockRejectedValue(new Error('all down'));
      expect(await svc.toKorean('Hello')).toBeNull();
    });
    it('비영문은 언어 자동 감지로 번역하며 영어 전용 대체 경로로 보내지 않는다', async () => {
      mockGet.mockResolvedValueOnce({ data: [[['새로운 모델을 발표했습니다', 'ประกาศโมเดลใหม่']]] });
      expect(await svc.toKorean('ประกาศโมเดลใหม่')).toBe('새로운 모델을 발표했습니다');
      expect(mockGet.mock.calls[0][1].params.sl).toBe('auto');
      mockGet.mockReset().mockRejectedValueOnce(new Error('offline'));
      expect(await new TranslationService().toKorean('新しいモデルを公開しました')).toBeNull();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
    it('한국어가 아닌 응답과 누락된 고유명사 토큰을 저장하지 않는다', async () => {
      mockGet
        .mockResolvedValueOnce({ data: [[['Still English', 'Original']]] })
        .mockResolvedValueOnce({
          data: { responseStatus: 200, responseData: { translatedText: 'English again' } },
        });
      expect(await svc.toKorean('Original')).toBeNull();
      mockGet
        .mockReset()
        .mockResolvedValueOnce({ data: [[['새 소식입니다', 'Import AI']]] })
        .mockResolvedValueOnce({
          data: { responseStatus: 200, responseData: { translatedText: '새 소식입니다' } },
        });
      expect(await new TranslationService().toKorean('Import AI launches today')).toBeNull();
    });
  });

  describe('스로틀 (비공식 엔드포인트 IP 차단 방지)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('연속 호출은 최소 300ms 간격을 두고 나간다 (첫 호출은 지연 0)', async () => {
      mockGet.mockResolvedValue({ data: [[['번역', 'src']]] });

      // 첫 호출 — lastCallAt=0 이라 대기 없이 즉시
      await svc.toKorean('One');
      expect(mockGet).toHaveBeenCalledTimes(1);

      // 두 번째 호출 — 간격이 안 지났으므로 대기
      const second = svc.toKorean('Two');
      await jest.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(1); // 아직 스로틀 대기 중

      await jest.advanceTimersByTimeAsync(300);
      expect(await second).toBe('번역');
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('간격이 이미 지난 뒤의 호출은 대기 없이 즉시 나간다', async () => {
      mockGet.mockResolvedValue({ data: [[['번역', 'src']]] });
      await svc.toKorean('One');

      jest.advanceTimersByTime(500); // 300ms 초과 경과
      const p = svc.toKorean('Two');
      await jest.advanceTimersByTimeAsync(0);
      expect(mockGet).toHaveBeenCalledTimes(2);
      await p;
    });
  });
});

describe('Translation provider failures are not article summaries', () => {
  beforeEach(() => mockGet.mockReset());
  it('rejects an HTTP-200 response carrying a MyMemory application error', async () => {
    mockGet.mockRejectedValueOnce(new Error('google down')).mockResolvedValueOnce({
      data: {
        responseStatus: 403,
        responseData: { translatedText: 'QUERY LENGTH LIMIT EXCEEDED' },
      },
    });
    expect(await new TranslationService().toKorean('Example')).toBeNull();
  });
  it('does not send over 500 UTF-8 bytes to MyMemory', async () => {
    mockGet.mockRejectedValueOnce(new Error('google down'));
    expect(await new TranslationService().toKorean('é'.repeat(251))).toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
  it('rejects a quota warning even if its application status claims success', async () => {
    mockGet.mockRejectedValueOnce(new Error('google down')).mockResolvedValueOnce({
      data: {
        responseStatus: 200,
        quotaFinished: true,
        responseData: { translatedText: 'MYMEMORY WARNING' },
      },
    });
    expect(await new TranslationService().toKorean('Example')).toBeNull();
  });
});

describe('Translation rate limit backoff', () => {
  it('stops repeatedly calling a rate-limited provider during Retry-After', async () => {
    mockGet.mockReset();
    mockGet
      .mockRejectedValueOnce({
        message: 'rate limit',
        response: { status: 429, headers: { 'retry-after': '600' } },
      })
      .mockResolvedValue({
        data: { responseStatus: 200, responseData: { translatedText: '\uBC88\uC5ED' } },
      });
    const svc = new TranslationService();
    await svc.toKorean('First title');
    await svc.toKorean('Second title');
    expect(
      mockGet.mock.calls.filter(([url]) => url.includes('translate.googleapis.com')),
    ).toHaveLength(1);
    expect(mockGet.mock.calls.filter(([url]) => url.includes('mymemory'))).toHaveLength(2);
  });
});
