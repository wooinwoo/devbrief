-- 감사 c67/c28 후속: 미사용 모델 제거 + 소프트 참조 FK 승격 + 컨퍼런스 중복 방어선
-- 전부 idempotent — 라이브 DB 재실행 안전

-- 1) 미사용 테이블 4개 드롭 (코드 참조 0 — User/ReadingEvent/ChatSession/ChatMessage)
DROP TABLE IF EXISTS "ReadingEvent";
DROP TABLE IF EXISTS "ChatMessage";
DROP TABLE IF EXISTS "ChatSession";
DROP TABLE IF EXISTS "User";

-- 2) Conference.discoveredFromArticleId — 고아 참조 정리 후 FK(SET NULL) 추가
UPDATE "Conference" c
   SET "discoveredFromArticleId" = NULL
 WHERE "discoveredFromArticleId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "Article" a WHERE a.id = c."discoveredFromArticleId");

ALTER TABLE "Conference" DROP CONSTRAINT IF EXISTS "Conference_discoveredFromArticleId_fkey";
ALTER TABLE "Conference"
  ADD CONSTRAINT "Conference_discoveredFromArticleId_fkey"
  FOREIGN KEY ("discoveredFromArticleId") REFERENCES "Article"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) 중복 컨퍼런스(name, startDate) 정리 — 가장 오래된 행 유지, 영상은 유지 행으로 재연결
WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY name, "startDate" ORDER BY "createdAt" ASC, id ASC) AS keep_id
    FROM "Conference"
), losers AS (
  SELECT id, keep_id FROM ranked WHERE id <> keep_id
)
UPDATE "Video" v SET "conferenceId" = l.keep_id FROM losers l WHERE v."conferenceId" = l.id;

WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY name, "startDate" ORDER BY "createdAt" ASC, id ASC) AS keep_id
    FROM "Conference"
), losers AS (
  SELECT id FROM ranked WHERE id <> keep_id
)
DELETE FROM "Conference" c USING losers l WHERE c.id = l.id;

-- 4) 재발 방어선 — 시더/디스커버리 코드 dedupe(name+startDate)와 동일 규칙
CREATE UNIQUE INDEX IF NOT EXISTS "Conference_name_startDate_key" ON "Conference"("name", "startDate");
