import { categorize, stripEmoji } from './repos.service';

describe('categorize', () => {
  it('AI 키워드를 ai 분야로 분류한다', () => {
    expect(categorize('an autonomous LLM agent framework')).toBe('ai');
    expect(categorize('RAG pipeline with embedding')).toBe('ai');
  });

  it('프론트엔드 키워드를 web 으로 분류한다', () => {
    expect(categorize('a React component library with tailwind')).toBe('web');
  });

  it('인프라 키워드를 infra 로 분류한다', () => {
    expect(categorize('kubernetes monitoring for docker')).toBe('infra');
  });

  it('CLI 키워드를 cli 로 분류한다', () => {
    expect(categorize('a blazing fast terminal file manager')).toBe('cli');
  });

  it('알려진 함정: "shell prompt" 의 prompt 가 ai 키워드라 ai 로 오분류된다', () => {
    // CATEGORY_RULES 의 ai 정규식에 'prompt' 가 있어 shell prompt 도구가 ai 로 빠진다.
    // 카테고리 정확도 개선(UX-041) 시 이 케이스가 cli 로 바뀌어야 한다.
    expect(categorize('a minimal shell prompt theme')).toBe('ai');
  });

  it('규칙 순서상 ai 가 web 보다 우선한다 (먼저 매칭 채택)', () => {
    // 'ai' 와 'react' 둘 다 포함 → ai 가 위에 있으므로 ai
    expect(categorize('react hooks for ai agents')).toBe('ai');
  });

  it('어떤 규칙에도 안 걸리면 etc', () => {
    expect(categorize('a random hobby project about gardening')).toBe('etc');
  });
});

describe('stripEmoji', () => {
  it('이모지를 제거하고 공백을 정리한다', () => {
    expect(stripEmoji('🚀 빠른 라이브러리 ✨')).toBe('빠른 라이브러리');
  });

  it('ZWJ 시퀀스/변형 셀렉터를 제거한다', () => {
    expect(stripEmoji('hello 👨‍💻 world')).toBe('hello world');
  });

  it('이모지가 없으면 원문 유지', () => {
    expect(stripEmoji('plain description')).toBe('plain description');
  });
});
