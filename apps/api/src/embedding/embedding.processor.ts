import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmbeddingService } from './embedding.service';

interface EmbedJob {
  articleId: string;
  title: string;
  snippet: string;
}

// text-embedding-004 는 generation 모델과 쿼터 버킷이 분리돼 있지만,
// 대량 수집일에 잡이 한꺼번에 발사되면 자체 RPM 한도(429)에 걸리므로 워커에서 묶는다.
@Processor('embedding', {
  limiter: { max: 20, duration: 60_000 },
})
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
