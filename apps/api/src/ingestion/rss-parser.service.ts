import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

export type RssItem = Parser.Item & {
  'content:encoded'?: string;
  description?: string;
};

@Injectable()
export class RssParserService {
  private parser = new Parser<Record<string, unknown>, RssItem>({
    timeout: 10_000,
    customFields: {
      item: ['content:encoded', 'description'],
    },
  });

  async parse(url: string): Promise<Parser.Output<RssItem>> {
    return this.parser.parseURL(url);
  }
}
