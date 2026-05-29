import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private ingestion: IngestionService) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    if (job.name === 'ingest-all') {
      return this.ingestion.ingestAll();
    }
    if (job.name === 'ingest-source') {
      const { sourceId, feedUrl } = job.data as { sourceId: string; feedUrl: string };
      return this.ingestion.ingestSource(sourceId, feedUrl);
    }
    this.logger.warn(`Unknown job name: ${job.name}`);
    return null;
  }
}
