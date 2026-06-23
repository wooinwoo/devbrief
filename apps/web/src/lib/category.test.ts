import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryOf } from './category';

describe('categoryOf', () => {
  it('AI 키워드(ASCII) → ai 카테고리', () => {
    expect(categoryOf(['llm']).key).toBe('ai');
    expect(categoryOf(['claude']).key).toBe('ai');
    expect(categoryOf(['gpt']).key).toBe('ai');
  });

  it('프론트엔드 키워드 → frontend', () => {
    expect(categoryOf(['react']).key).toBe('frontend');
    expect(categoryOf(['tailwind']).key).toBe('frontend');
  });

  it('백엔드 키워드 → backend', () => {
    expect(categoryOf(['postgres']).key).toBe('backend');
    expect(categoryOf(['nest']).key).toBe('backend');
  });

  it('인프라 키워드 → infra', () => {
    expect(categoryOf(['kubernetes']).key).toBe('infra');
    expect(categoryOf(['terraform']).key).toBe('infra');
  });

  it('데이터/모바일 키워드 매핑', () => {
    expect(categoryOf(['kafka']).key).toBe('data');
    expect(categoryOf(['flutter']).key).toBe('mobile');
  });

  // 알려진 한계(버그): TAG_MAP 정규식이 \b(워드 경계)를 쓰는데
  // \b는 ASCII 단어 문자만 인식하므로 한글 키워드(머신러닝/백엔드/인프라/데이터/모바일 등)는
  // 매칭되지 않고 항상 etc로 떨어진다. 현재 동작을 명시적으로 고정한다.
  it('한글 단독 키워드는 \\b 한계로 매칭 실패 → etc (현재 동작 고정)', () => {
    expect(categoryOf(['머신러닝']).key).toBe('etc');
    expect(categoryOf(['백엔드']).key).toBe('etc');
    expect(categoryOf(['인프라']).key).toBe('etc');
    expect(categoryOf(['모바일']).key).toBe('etc');
  });

  it('한글이 ASCII 키워드와 섞이면(예: "AI 에이전트") 매칭 가능', () => {
    // 'ai'가 공백 경계로 매칭됨
    expect(categoryOf(['AI 에이전트']).key).toBe('ai');
  });

  it('매칭 없으면 etc fallback', () => {
    expect(categoryOf(['관계없는태그']).key).toBe('etc');
    expect(categoryOf([]).key).toBe('etc');
  });

  it('첫 매칭 태그 우선 — 순회 순서대로', () => {
    // 'react'가 먼저 → frontend (뒤 backend 태그 무시)
    expect(categoryOf(['react', 'postgres']).key).toBe('frontend');
  });

  it('반환 객체는 CATEGORIES의 참조', () => {
    expect(categoryOf(['gpt'])).toBe(CATEGORIES.ai);
  });
});
