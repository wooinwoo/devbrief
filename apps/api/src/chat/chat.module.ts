import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { EmbeddingModule } from '../embedding/embedding.module';
import { GeminiModule } from '../ai/gemini.module';

@Module({
  imports: [EmbeddingModule, GeminiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
