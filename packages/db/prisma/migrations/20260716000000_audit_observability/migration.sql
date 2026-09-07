-- 2026-07 전수 감사 후속: 관측성 컬럼 + 인덱스 정리 (전부 additive/idempotent — 라이브 DB 안전)

-- Article.summarySource: 요약 출처('gemini'|'free') — 폴백 요약을 키 복구 후 백필로 승격하기 위한 구분
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "summarySource" TEXT;

-- 기존 행 보정: 요약이 있는 글은 전부 Gemini 경로였다고 간주 (폴백 구분 도입 이전 데이터)
UPDATE "Article" SET "summarySource" = 'gemini' WHERE "summaryOneLine" IS NOT NULL AND "summarySource" IS NULL;

-- Source 수집 관측: 죽은 피드를 어드민에서 감지할 수 있도록
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "lastFetchedAt" TIMESTAMP(3);
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- DailyDigest: @unique(date)가 이미 인덱스를 만들므로 중복 인덱스 제거
DROP INDEX IF EXISTS "DailyDigest_date_idx";

-- Article.embedding ANN 인덱스(HNSW) — related/RAG 코사인 검색 풀스캔 제거.
-- pgvector 구버전(<0.5.0)이면 HNSW 미지원이므로 실패해도 마이그레이션은 통과시킨다.
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS "Article_embedding_hnsw_idx"
    ON "Article" USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'HNSW 인덱스 생성 건너뜀 (pgvector 버전 확인 필요): %', SQLERRM;
END $$;
