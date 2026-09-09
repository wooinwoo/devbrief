# LLM benchmark data

The AI tab uses Artificial Analysis's public LLM leaderboard. The bundled
snapshot provides immediate rendering and an offline fallback. On mount, the
browser checks a small JSON feed on the public repository's dedicated
benchmark-data branch. A successful, validated newer snapshot replaces the
fallback. No Render request, API key, or Pages deployment is required for daily
updates.

Refresh LLM benchmarks runs at 00:20 UTC (09:20 KST) each day and can be run
manually in GitHub Actions. GitHub may delay scheduled jobs. The workflow reads
the rendered public table once, validates its column names and units, the index
version, model source links and numeric fields, then publishes atomically.
Incomplete index values marked with an asterisk and models without an index
score are excluded. Scores, speed and cost all come from the same response.
The feed retains individual reasoning configurations and original model links.

Cost per Task is the weighted average USD cost of an Intelligence Index task;
it is not the token price per million tokens. Speed is median output tokens/s.
SWE-bench estimates previously embedded in the UI were removed: results from
different harnesses or index versions must not be combined into one ranking.

The UI labels the collection date and index version. After three days without
a successful check, it displays a freshness warning and links to the source.
Network, schema, parsing and unexpectedly large model-count drops keep the
previous file and its original date; failed jobs remain visible in Actions.
If Artificial Analysis changes its HTML, review and update the parser before
republishing. No guessed values or fabricated update timestamps are allowed.

Local refresh and verification:

~~~sh
node --test scripts/refresh-benchmarks.test.mjs
node scripts/refresh-benchmarks.mjs
corepack pnpm --filter @devbrief/web test
~~~

To bootstrap benchmark-data, create an orphan branch containing only the
validated llm-benchmarks.json. Regular application changes remain on master.
The browser accepts only schema version 1 and the expected source URL.
The bundled snapshot is refreshed when preparing a new application release.

Source: https://artificialanalysis.ai/leaderboards/models
Methodology: https://artificialanalysis.ai/methodology/intelligence-benchmarking
