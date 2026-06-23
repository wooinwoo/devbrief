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
        Promise.resolve({ data: [[[opts.params.q, opts.params.q]]] }),
      );
      const out = await svc.toKorean('Import AI launches today');
      expect(out).toContain('Import AI'); // ⟦0⟧ 복원 확인
      expect(out).not.toContain('⟦'); // 잔여 placeholder 없음
    });

    it('Google 실패 시 MyMemory로 폴백한다', async () => {
      mockGet
        .mockRejectedValueOnce(new Error('google down'))
        .mockResolvedValueOnce({
          data: { responseData: { translatedText: '폴백 번역' } },
        });
      expect(await svc.toKorean('Hello')).toBe('폴백 번역');
    });

    it('두 경로 모두 실패하면 null', async () => {
      mockGet.mockRejectedValue(new Error('all down'));
      expect(await svc.toKorean('Hello')).toBeNull();
    });
  });
});
