import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConferenceDiscoveryService } from './conference-discovery.service';

@Injectable()
export class ConferenceDiscoveryCron {
  private readonly logger = new Logger(ConferenceDiscoveryCron.name);

  constructor(private discovery: ConferenceDiscoveryService) {}

  // 매일 자정 (Asia/Seoul) — 어제까지 들어온 글에서 새 컨퍼런스 후보 추출
  @Cron('0 0 * * *', { timeZone: 'Asia/Seoul' })
  async daily() {
    this.logger.log('Daily conference discovery triggered');
    try {
      const result = await this.discovery.discoverFromRecentArticles({
        days: 7,
        limit: 100,
      });
      this.logger.log(
        `Discovery done: scanned=${result.scannedArticles} llm=${result.llmCalls} proposed=${result.proposed} skipped=${result.skipped}`,
      );
    } catch (e) {
      this.logger.error(`Discovery failed: ${(e as Error).message}`);
    }
  }
}
