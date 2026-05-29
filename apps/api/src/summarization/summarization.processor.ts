import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SummarizationService } from './summarization.service';

interface SummarizeJob {
  articleId: string;
  title: string;
  snippet: string;
}

@Processor('summarization')
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
