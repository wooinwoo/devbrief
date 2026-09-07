import { prisma } from '../packages/db/src/index.ts';

try {
  if (process.argv[2] === 'prepare') {
    // Recovery preflight: pending July migration must not discard user data.
    for (const table of ['User', 'ReadingEvent', 'ChatSession', 'ChatMessage']) {
      const exists = await prisma.$queryRawUnsafe(
        'SELECT to_regclass($1) IS NOT NULL AS present',
        `"${table}"`,
      );
      if (exists[0].present) {
        const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
        if (rows[0].count !== 0)
          throw new Error(`Migration would remove non-empty table: ${table}`);
      }
    }
    const duplicates = await prisma.$queryRawUnsafe(
      'SELECT count(*)::int AS count FROM (SELECT name, "startDate" FROM "Conference" GROUP BY name, "startDate" HAVING count(*) > 1) duplicates',
    );
    if (duplicates[0].count !== 0)
      throw new Error('Conference duplicates require manual review before migration');
    // Old summaries have unknown provenance. Preserve this instead of the historic
    // migration incorrectly labelling every old summary as Gemini-generated.
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "summarySource" TEXT',
    );
    const changed = await prisma.$executeRawUnsafe(
      'UPDATE "Article" SET "summarySource" = $1 WHERE "summaryOneLine" IS NOT NULL AND "summarySource" IS NULL',
      'legacy',
    );
    console.log(JSON.stringify({ legacySummaries: changed }));
  }
  const counts = await prisma.$queryRawUnsafe(`
    SELECT 'articles' AS metric, count(*)::int AS count FROM "Article"
    UNION ALL SELECT 'article bodies', count(*)::int FROM "Article" WHERE "contentHtml" IS NOT NULL
    UNION ALL SELECT 'article summaries', count(*)::int FROM "Article" WHERE "summaryOneLine" IS NOT NULL
    UNION ALL SELECT 'translation errors', count(*)::int FROM "Article" WHERE concat("titleKo", "summaryOneLine", "summaryThreeLine") ILIKE '%QUERY LENGTH LIMIT EXCEEDED%'
    UNION ALL SELECT 'videos', count(*)::int FROM "Video"
    UNION ALL SELECT 'sources', count(*)::int FROM "Source"
    UNION ALL SELECT 'repos', count(*)::int FROM "Repo"
    UNION ALL SELECT 'digests', count(*)::int FROM "DailyDigest"
    UNION ALL SELECT 'conferences ' || status::text, count(*)::int FROM "Conference" GROUP BY status
  `);
  console.log(JSON.stringify({ at: new Date().toISOString(), counts }, null, 2));
} catch (error) {
  // Never emit a connection string or Prisma invocation/engine details in Actions.
  console.error('Database recovery/audit failed:', error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
