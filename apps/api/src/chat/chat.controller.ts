import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
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
  constructor(private chat: ChatService) {}

  @Post('stream')
  async stream(@Body() body: ChatBody, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.chat.chatStream(body.query)) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
    }
    res.end();
  }
}
