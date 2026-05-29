import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmbeddingService } from './embedding.service';

interface EmbedJob {
  articleId: string;
  title: string;
  snippet: string;
}

@Processor('embedding')
export class EmbeddingProcessor extends WorkerHost {
  constructor(private embedding: EmbeddingService) {
    super();
  }

  async process(job: Job<EmbedJob>) {
    const { articleId, title, snippet } = job.data;
    await this.embedding.storeArticleEmbedding(articleId, title, snippet);
    return { ok: true };
  }
}
