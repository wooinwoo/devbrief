// Source 카테고리
export type SourceKind = 'article' | 'conference' | 'meetup' | 'video';

export type SourceProvider =
  | 'geeknews'
  | 'hackernews'
  | 'devto'
  | 'techcrunch'
  | 'producthunt'
  | 'company_blog'
  | 'anthropic'
  | 'openai'
  | 'youtube'
  | 'rss_generic';

// Article (글)
export interface Article {
  id: string;
  title: string;
  url: string;
  source: SourceProvider;
  publishedAt: string;
  author?: string;
  summaryOneLine?: string;
  summaryThreeLine?: string;
  tags: string[];
  language: 'ko' | 'en' | 'mixed';
}

// Conference (컨퍼런스)
export interface Conference {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate?: string;
  location: string;
  topics: string[];
  description?: string;
  youtubeChannelId?: string;
}

// Chat
export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Array<{
    articleId: string;
    snippet: string;
  }>;
  createdAt: string;
}

// User reading memory
export interface ReadingEvent {
  userId: string;
  articleId: string;
  event: 'viewed' | 'opened' | 'saved' | 'dismissed';
  at: string;
}
