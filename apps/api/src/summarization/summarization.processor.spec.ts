import { Job } from 'bullmq';
import { SummarizationProcessor } from './summarization.processor';

// 폴백 결정은 processor 책임: 마지막 시도 전엔 rethrow(BullMQ backoff),
// 마지막 시도 실패에만 무료 폴백. attemptsMade 는 "이전 실패 횟수"(첫 시도=0).
describe('SummarizationProcessor.process', () => {
  let summarization: { summarize: jest.Mock; summarizeFree: jest.Mock };
  let processor: SummarizationProcessor;

  const makeJob = (attemptsMade: number, attempts?: number) =>
    ({
      data: { articleId: 'a1', title: 'T', snippet: 'S' },
      opts: attempts === undefined ? {} : { attempts },
      attemptsMade,
    }) as unknown as Job;

  beforeEach(() => {
    summarization = {
      summarize: jest.fn().mockResolvedValue(undefined),
      summarizeFree: jest.fn().mockResolvedValue(undefined),
    };
    processor = new SummarizationProcessor(summarization as any);
  });

  it('성공 시 summarize 만 호출하고 ok 반환', async () => {
    const result = await processor.process(makeJob(0, 6));
    expect(summarization.summarize).toHaveBeenCalledWith('a1', 'T', 'S');
    expect(summarization.summarizeFree).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it('마지막 시도 전 실패는 rethrow — BullMQ backoff 재시도에 태운다', async () => {
    summarization.summarize.mockRejectedValue(new Error('429'));
    await expect(processor.process(makeJob(0, 6))).rejects.toThrow('429');
    await expect(processor.process(makeJob(4, 6))).rejects.toThrow('429');
    expect(summarization.summarizeFree).not.toHaveBeenCalled();
  });

  it('마지막 시도(attemptsMade=attempts-1) 실패면 무료 폴백으로 마무리', async () => {
    summarization.summarize.mockRejectedValue(new Error('여전히 429'));
    const result = await processor.process(makeJob(5, 6));
    expect(summarization.summarizeFree).toHaveBeenCalledWith('a1', 'T', 'S');
    expect(result).toEqual({ ok: true });
  });

  it('attempts 미설정(1회 잡)이면 첫 실패가 곧 마지막 — 즉시 무료 폴백', async () => {
    summarization.summarize.mockRejectedValue(new Error('boom'));
    const result = await processor.process(makeJob(0));
    expect(summarization.summarizeFree).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });
});
