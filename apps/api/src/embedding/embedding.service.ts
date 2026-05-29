import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private readonly model = 'voyage-3'; // 1024 차원, 한국어 양호

  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = config.get<string>('VOYAGE_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('VOYAGE_API_KEY 미설정. 임베딩 / RAG 동작 안 함.');
    }
  }

  private async callVoyage(text: string, inputType: 'document' | 'query'): Promise<number[]> {
    if (!this.apiKey) throw new Error('VOYAGE_API_KEY not set');
    const res = await axios.post<VoyageResponse>(
      'https://api.voyageai.com/v1/embeddings',
      { input: [text], model: this.model, input_type: inputType },
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    const vector = res.data.data[0]?.embedding;
    if (!vector) throw new Error('Voyage returned no embedding');
    return vector;
  }

  embedDocument(text: string) {
    return this.callVoyage(text, 'document');
  }

  embedQuery(text: string) {
    return this.callVoyage(text, 'query');
  }

  async storeArticleEmbedding(articleId: string, title: string, snippet: string) {
    const content = `${title}\n\n${snippet}`.slice(0, 8000);
    const vector = await this.embedDocument(content);
    const literal = `[${vector.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Article" SET embedding = $1::vector WHERE id = $2`,
      literal,
      articleId,
    );
    this.logger.log(`Embedded ${articleId}`);
  }
}
