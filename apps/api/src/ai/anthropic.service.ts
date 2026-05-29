import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  readonly client: Anthropic;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY') ?? '';
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY 미설정. 요약/챗봇이 동작하지 않아요.');
    }
    this.client = new Anthropic({ apiKey });
  }
}
