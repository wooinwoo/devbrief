import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SummarizationService } from './summarization.service';

interface SummarizeJob {
  articleId: string;
  title: string;
  snippet: string;
}

// Gemini 무료 티어: 기본 모델 gemini-2.5-flash-lite 는 분당 15 요청 한도.
// limiter max:10/분으로 여유를 두고 429 회피. GEMINI_MODEL 을 더 낮은 RPM
// 모델(flash 등)로 바꾸면 limiter 도 함께 낮출 것.
// (embedding 은 text-embedding-004 별도 쿼터 버킷이라 이 한도에 합산되지 않는다)
@Processor('summarization', {
  concurrency: 2,
  limiter: { max: 10, duration: 60_000 },
})
export class SummarizationProcessor extends WorkerHost {
  private readonly logger = new Logger(SummarizationProcessor.name);

  constructor(private summarization: SummarizationService) {
    super();
  }

  async process(job: Job<SummarizeJob>) {
    const { articleId, title, snippet } = job.data;
    try {
      await this.summarization.summarize(articleId, title, snippet);
    } catch (e) {
      // attemptsMade 는 처리 시점 기준 "이전 실패 횟수" (첫 시도 = 0).
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade < attempts - 1) {
        throw e; // 마지막 시도 전 — BullMQ 지수 backoff 재시도에 태운다
      }
      // 마지막 시도까지 실패 — 화면이 비지 않도록 무료 폴백으로 마무리.
      // summarySource='free' 로 남아 키 복구 후 백필 승격 대상이 된다.
      this.logger.warn(
        `[${articleId}] Gemini ${attempts}회 실패 → 무료 폴백: ${(e as Error).message.slice(0, 100)}`,
      );
      await this.summarization.summarizeFree(articleId, title, snippet);
    }
    return { ok: true };
  }
}
