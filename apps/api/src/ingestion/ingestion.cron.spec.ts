import { kstDateLabel } from '../common/kst';
import { IngestionCron } from './ingestion.cron';

describe('IngestionCron', () => {
  it('daily 는 KST 날짜 기반 jobId 로 dedupe 되는 ingest-all 잡 적재', async () => {
    const queue = { add: jest.fn() };
    const cron = new IngestionCron(queue as never);

    await cron.daily();

    // 같은 날 GHA/다중 레플리카/재시작으로 중복 트리거돼도 하루 1회로 멱등화
    expect(queue.add).toHaveBeenCalledWith(
      'ingest-all',
      {},
      expect.objectContaining({ jobId: `ingest-all:${kstDateLabel()}` }),
    );
  });
});
