import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SummarizationService } from './summarization.service';

interface SummarizeJob {
  articleId: string;
  title: string;
  snippet: string;
}

// Gemini 무료 티어: gemini-2.5-flash 분당 5 요청 제한.
// limiter 로 워커 전체를 분당 4개로 묶어 429 회피 (embedding 큐와 합쳐 여유).
@Processor('summarization', {
  concurrency: 2,
  limiter: { max: 10, duration: 60_000 },
})
export class SummarizationProcessor extends WorkerHost {
  constructor(private summarization: SummarizationService) {
    super();
  }

  async process(job: Job<SummarizeJob>) {
    const { articleId, title, snippet } = job.data;
    await this.summarization.summarize(articleId, title, snippet);
    return { ok: true };
  }
}
