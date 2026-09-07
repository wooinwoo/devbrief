import { Body, Controller, Logger, Post, Res, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AdminGuard } from '../common/admin.guard';
import { ChatService } from './chat.service';

class ChatBody {
  @IsString()
  @MinLength(1)
  query!: string;
}

// RAG 챗은 임베딩+LLM 비용이 발생하므로 어드민 전용.
// (프론트는 어드민 세션 프록시 /api/admin/chat/stream 을 경유해 호출)
@Controller('chat')
@UseGuards(AdminGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private chat: ChatService) {}

  @Post('stream')
  async stream(@Body() body: ChatBody, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const event of this.chat.chatStream(body.query)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (e) {
      // 내부 예외 원문(모델명/키 힌트/SQL 조각 등)은 클라이언트로 흘리지 않는다 —
      // 상세는 서버 로그로, 클라이언트에는 일반화된 메시지만.
      this.logger.error((e as Error).stack ?? String(e));
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: '일시적 오류가 발생했습니다.' })}\n\n`);
      }
    }
    res.end();
  }
}
