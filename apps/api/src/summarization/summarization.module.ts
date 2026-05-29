import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SummarizationService } from './summarization.service';
import { SummarizationProcessor } from './summarization.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'summarization' })],
  providers: [SummarizationService, SummarizationProcessor],
})
export class SummarizationModule {}
