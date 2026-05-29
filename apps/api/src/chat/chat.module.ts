import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
  imports: [EmbeddingModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
