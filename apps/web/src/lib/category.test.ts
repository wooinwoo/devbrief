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

  // 유니코드 경계 적용 후: 한글 단독 키워드도 올바른 카테고리로 분류된다.
  it('한글 단독 키워드 → 올바른 카테고리', () => {
    expect(categoryOf(['머신러닝']).key).toBe('ai');
    expect(categoryOf(['딥러닝']).key).toBe('ai');
    expect(categoryOf(['에이전트']).key).toBe('ai');
    expect(categoryOf(['백엔드']).key).toBe('backend');
    expect(categoryOf(['서버']).key).toBe('backend');
    expect(categoryOf(['아키텍처']).key).toBe('backend');
    expect(categoryOf(['인프라']).key).toBe('infra');
    expect(categoryOf(['클라우드']).key).toBe('infra');
    expect(categoryOf(['데이터']).key).toBe('data');
    expect(categoryOf(['분석']).key).toBe('data');
    expect(categoryOf(['모바일']).key).toBe('mobile');
    expect(categoryOf(['웹']).key).toBe('frontend');
  });

  it('한글 키워드가 다른 한글/공백과 섞여도 매칭', () => {
    expect(categoryOf(['백엔드 프레임워크']).key).toBe('backend');
    expect(categoryOf(['최신 머신러닝 동향']).key).toBe('ai');
    expect(categoryOf(['클라우드 인프라']).key).toBe('infra');
  });

  it('ASCII 오탐 방지 유지 — "java"는 "javascript" 안에서 backend로 매칭되지 않음', () => {
    // javascript는 frontend로 매칭(backend의 java가 아님)
    expect(categoryOf(['javascript']).key).toBe('frontend');
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
