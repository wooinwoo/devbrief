import { describe, expect, it } from 'vitest';
import { CATEGORIES, type CategorizableArticle, categoryOf } from './category';

// 태그만으로 분류 (과거 동작 호환 확인용)
const byTags = (tags: string[]): CategorizableArticle => ({ title: '', tags });
// 제목만으로 분류 (태그 없는 실제 글 시뮬레이션)
const byTitle = (title: string): CategorizableArticle => ({ title, tags: [] });

describe('categoryOf — 태그 기반(하위호환)', () => {
  it('AI 키워드(ASCII) → ai 카테고리', () => {
    expect(categoryOf(byTags(['llm'])).key).toBe('ai');
    expect(categoryOf(byTags(['claude'])).key).toBe('ai');
    expect(categoryOf(byTags(['gpt'])).key).toBe('ai');
  });

  it('프론트엔드 키워드 → frontend', () => {
    expect(categoryOf(byTags(['react'])).key).toBe('frontend');
    expect(categoryOf(byTags(['tailwind'])).key).toBe('frontend');
  });

  it('백엔드 키워드 → backend', () => {
    expect(categoryOf(byTags(['postgres'])).key).toBe('backend');
    expect(categoryOf(byTags(['nest'])).key).toBe('backend');
  });

  it('인프라 키워드 → infra', () => {
    expect(categoryOf(byTags(['kubernetes'])).key).toBe('infra');
    expect(categoryOf(byTags(['terraform'])).key).toBe('infra');
  });

  it('데이터/모바일 키워드 매핑', () => {
    expect(categoryOf(byTags(['kafka'])).key).toBe('data');
    expect(categoryOf(byTags(['flutter'])).key).toBe('mobile');
  });

  // 유니코드 경계 적용: 한글 단독 키워드도 올바른 카테고리로 분류된다.
  it('한글 단독 키워드 → 올바른 카테고리', () => {
    expect(categoryOf(byTags(['머신러닝'])).key).toBe('ai');
    expect(categoryOf(byTags(['딥러닝'])).key).toBe('ai');
    expect(categoryOf(byTags(['에이전트'])).key).toBe('ai');
    expect(categoryOf(byTags(['백엔드'])).key).toBe('backend');
    expect(categoryOf(byTags(['서버'])).key).toBe('backend');
    expect(categoryOf(byTags(['아키텍처'])).key).toBe('backend');
    expect(categoryOf(byTags(['인프라'])).key).toBe('infra');
    expect(categoryOf(byTags(['클라우드'])).key).toBe('infra');
    expect(categoryOf(byTags(['데이터'])).key).toBe('data');
    expect(categoryOf(byTags(['분석'])).key).toBe('data');
    expect(categoryOf(byTags(['모바일'])).key).toBe('mobile');
    expect(categoryOf(byTags(['웹'])).key).toBe('frontend');
  });

  it('한글 키워드가 다른 한글/공백과 섞여도 매칭', () => {
    expect(categoryOf(byTags(['백엔드 프레임워크'])).key).toBe('backend');
    expect(categoryOf(byTags(['최신 머신러닝 동향'])).key).toBe('ai');
    expect(categoryOf(byTags(['클라우드 인프라'])).key).toBe('infra');
  });

  it('ASCII 오탐 방지 — "java"는 "javascript" 안에서 backend로 매칭되지 않음', () => {
    expect(categoryOf(byTags(['javascript'])).key).toBe('frontend');
  });

  it('한글이 ASCII 키워드와 섞이면(예: "AI 에이전트") 매칭 가능', () => {
    expect(categoryOf(byTags(['AI 에이전트'])).key).toBe('ai');
  });

  it('매칭 없으면 etc fallback', () => {
    expect(categoryOf(byTags(['관계없는태그'])).key).toBe('etc');
    expect(categoryOf(byTags([])).key).toBe('etc');
  });

  it('반환 객체는 CATEGORIES의 참조', () => {
    expect(categoryOf(byTags(['gpt']))).toBe(CATEGORIES.ai);
  });
});

describe('categoryOf — 제목 기반(태그 없는 실제 글)', () => {
  // 태그가 없어도 제목만으로 분류되어야 한다(과거엔 전부 etc).
  it('AI를 다룬 글 → ai', () => {
    expect(categoryOf(byTitle('포드는 AI를 고용하고 인간을 해고했다')).key).toBe('ai');
  });

  it('명백한 AI/LLM 신호 → ai', () => {
    expect(categoryOf(byTitle('Claude Code로 사이드 프로젝트 자동화하기')).key).toBe('ai');
    expect(categoryOf(byTitle('GPT-5 벤치마크 결과 정리')).key).toBe('ai');
    expect(categoryOf(byTitle('로컬에서 Llama 모델 돌리기')).key).toBe('ai');
  });

  it('클러스터/RDMA/GPU 운영 → infra', () => {
    expect(categoryOf(byTitle('AMD Strix Halo RDMA 클러스터 설정 가이드')).key).toBe('infra');
    expect(categoryOf(byTitle('vllm self-host 배포 가이드')).key).toBe('infra');
  });

  it('웹 API/스캐너 구축 → frontend 또는 backend (etc 아님)', () => {
    const cat = categoryOf(byTitle('웹 바코드 감지 API를 사용하여 제로 종속성 바코드 스캐너 구축'));
    expect(['frontend', 'backend']).toContain(cat.key);
  });

  it('iMessage 프로그래밍 → mobile', () => {
    expect(categoryOf(byTitle('프로그래밍 방식으로 iMessage 보내는 방법')).key).toBe('mobile');
    expect(categoryOf(byTitle('SwiftUI로 iOS 위젯 만들기')).key).toBe('mobile');
  });

  it('프론트엔드 프레임워크 출시 → frontend (ai로 새지 않음)', () => {
    expect(categoryOf(byTitle('React 19 출시')).key).toBe('frontend');
    expect(categoryOf(byTitle('Next.js 16 정식 릴리스')).key).toBe('frontend');
  });

  it('벡터 임베딩/데이터 파이프라인 → data', () => {
    expect(categoryOf(byTitle('벡터 임베딩으로 검색 품질 올리기')).key).toBe('data');
    expect(categoryOf(byTitle('Kafka 기반 데이터 파이프라인 설계')).key).toBe('data');
  });

  it('REST/gRPC 마이크로서비스 → backend', () => {
    expect(categoryOf(byTitle('gRPC 마이크로서비스 간 통신 패턴')).key).toBe('backend');
  });

  it('관련 신호 없는 제목 → etc', () => {
    expect(categoryOf(byTitle('주말에 다녀온 제주도 맛집 후기')).key).toBe('etc');
  });

  it('한 줄 요약/번역 제목도 매칭 대상에 포함', () => {
    const article: CategorizableArticle = {
      title: 'A weekend hack',
      titleKo: '주말 해킹',
      summaryOneLine: 'Kubernetes 클러스터를 처음부터 구축한 기록',
      tags: [],
    };
    expect(categoryOf(article).key).toBe('infra');
  });
});
