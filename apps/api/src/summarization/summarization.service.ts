import { Injectable, Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { AnthropicService } from '../ai/anthropic.service';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_PROMPT = `당신은 기술 글 요약 전문가입니다. 주어진 글의 제목과 본문 일부를 보고 한국어로 자연스럽게 두 가지를 생성합니다.

1. ONE_LINE: 한 문장 (40자 내외)
2. THREE_LINE: 세 줄 (각 줄 70자 내외, \\n 으로 구분)

규칙:
- 한국어 자연 문장. 영어 단어는 그대로 둬도 OK
- em dash 사용 금지 (쉼표, 마침표로 대체)
- 클릭베이트 금지. 정직한 요약
- 본문이 없거나 짧으면 제목 기반으로 추정

JSON 만 출력. 예시:
{ "oneLine": "Anthropic 이 Claude Opus 4.8 을 출시했다.", "threeLine": "Anthropic 이 4.8 버전을 발표했다.\\n기존 대비 코딩 정확도가 개선됐다.\\n dynamic workflow 도구가 추가됐다." }`;

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(
    private anthropic: AnthropicService,
    private prisma: PrismaService,
  ) {}

  async summarize(articleId: string, title: string, snippet: string): Promise<void> {
    const response = await this.anthropic.client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `제목: ${title}\n\n본문 일부:\n${snippet || '(본문 없음)'}` },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    let parsed: { oneLine?: string; threeLine?: string } = {};
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    } catch {
      parsed = { oneLine: text.trim().slice(0, 100) };
    }

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        summaryOneLine: parsed.oneLine ?? null,
        summaryThreeLine: parsed.threeLine ?? null,
      },
    });

    this.logger.log(`Summarized ${articleId}`);
  }
}
