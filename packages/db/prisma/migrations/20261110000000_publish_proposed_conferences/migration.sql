-- 검토 대기(PROPOSED)를 없앤다. 2026-11-10 기준 대기 중인 행사는 모두 공식 일정 피드에서 온
-- 공식 URL이 있는 행사라 그대로 공개한다.
-- DEVIEW 2026 시드는 공식 사이트에 2026 행사가 없어(2026-11-10 확인) 거절한다.
UPDATE "Conference" SET status = 'REJECTED'
WHERE name = 'DEVIEW 2026' AND url = 'https://deview.kr' AND status = 'PROPOSED';

UPDATE "Conference" SET status = 'ACTIVE'
WHERE status = 'PROPOSED' AND url NOT LIKE 'proposed://%';
