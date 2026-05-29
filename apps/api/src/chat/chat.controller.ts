import { Body, Controller, Post, Res } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Response } from 'express';
import { ChatService } from './chat.service';

class ChatBody {
  @IsString()
  @MinLength(1)
  query!: string;
}

@Controller('chat')
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
