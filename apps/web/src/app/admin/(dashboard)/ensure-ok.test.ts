import { describe, expect, it } from 'vitest';
import { ensureOk } from './ensure-ok';

function fakeRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function fakeBrokenRes(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('invalid json');
    },
  } as unknown as Response;
}

describe('ensureOk', () => {
  it('2xx 응답은 그대로 반환한다', async () => {
    const res = fakeRes(200, { feeds: [] });
    await expect(ensureOk(res)).resolves.toBe(res);
  });

  it('401 은 세션 만료 안내로 throw (프록시 { error: unauthorized })', async () => {
    await expect(ensureOk(fakeRes(401, { error: 'unauthorized' }))).rejects.toThrow(/세션이 만료/);
  });

  it('Nest 에러의 message(string) 를 그대로 보여준다', async () => {
    await expect(
      ensureOk(fakeRes(500, { statusCode: 500, message: '요약 큐 오류' })),
    ).rejects.toThrow('요약 큐 오류');
  });

  it('ValidationPipe 의 message(string[]) 는 join 해서 보여준다', async () => {
    await expect(
      ensureOk(fakeRes(400, { statusCode: 400, message: ['url 은 필수', '형식 오류'] })),
    ).rejects.toThrow('url 은 필수, 형식 오류');
  });

  it('message 없는 { error } 바디는 error 값을 쓴다', async () => {
    await expect(ensureOk(fakeRes(403, { error: 'forbidden' }))).rejects.toThrow('forbidden');
  });

  it('바디가 없으면 액션명 + 상태 코드로 폴백', async () => {
    await expect(ensureOk(fakeRes(500, {}), '소스 등록')).rejects.toThrow('소스 등록 실패 (500)');
  });

  it('JSON 파싱 실패도 폴백 메시지로 처리한다', async () => {
    await expect(ensureOk(fakeBrokenRes(502))).rejects.toThrow('요청 실패 (502)');
  });
});
