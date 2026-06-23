import { Module } from '@nestjs/common';
import { GeminiModule } from '../ai/gemini.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [EmbeddingModule, GeminiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
