import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseLeaderboard, refreshBenchmarks } from './refresh-benchmarks.mjs';

const headings = [
  'Model',
  'Context Window',
  'Creator',
  'Artificial Analysis Intelligence Index',
  'Cost per Task USD',
  'Time per Task Minutes',
  'First Answer Token (s)',
  'Further Analysis',
];
const row = (i, score = '53', price = '$7.63') =>
  `<tr>${[
    `Model &amp; ${i}`,
    '1M',
    'Lab',
    score,
    price,
    '12.5',
    '1.2',
    '<button>Model Providers</button>',
  ]
    .map((value) => `<td>${value}</td>`)
    .join('')}</tr>`;
// 페이지에 직렬화되어 실린 모델 목록(이스케이프된 JSON). 표 이름 → slug 매핑에 쓴다.
const modelData = Array.from(
  { length: 40 },
  (_, i) =>
    `{\\"slug\\":\\"test-${i}\\",\\"name\\":\\"Model & ${i} (full)\\",\\"shortName\\":\\"Model & ${i}\\"}`,
).join(',');
const fixture = (extra = '') =>
  `<script>self.__next_f.push([1,"[${modelData}]"])</script><p>Intelligence Index v4.3</p><table><thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: 12 }, (_, i) => row(i)).join('')}${extra}</tbody></table>`;

test('reads table, preserves units and does not invent missing metrics', () => {
  const snapshot = parseLeaderboard(fixture(row(12, '42*') + row(13, '--') + row(14, '0', '--')));
  assert.equal(snapshot.indexVersion, '4.3');
  assert.equal(snapshot.models.length, 13);
  assert.equal(snapshot.models[0].name, 'Model & 0');
  assert.equal(snapshot.models[0].slug, 'test-0');
  assert.equal(snapshot.models[0].costPerTask, 7.63);
  // 원본이 초당 토큰을 싣지 않으므로 지어내지 않는다.
  assert.equal(snapshot.models[0].speed, null);
  assert.equal(snapshot.models.at(-1).intelligence, 0);
  assert.equal(snapshot.models.at(-1).costPerTask, null);
});
test('skips rows whose model page cannot be identified', () => {
  const snapshot = parseLeaderboard(fixture(row(99)));
  assert.equal(snapshot.models.length, 12);
  assert.ok(!snapshot.models.some((model) => model.name === 'Model & 99'));
});
test('rejects changed units, columns, missing version and malformed rows', () => {
  for (const html of [
    fixture().replace('Cost per Task USD', 'Price per Million Tokens'),
    fixture().replace('Time per Task Minutes', 'Median Tokens/s'),
    fixture().replace('Intelligence Index v4.3', 'Intelligence'),
    fixture().replace('$7.63', 'estimate'),
    fixture().replace('<td>Lab</td>', ''),
    `${fixture()}<p>Intelligence Index v5.0</p>`,
  ])
    assert.throws(() => parseLeaderboard(html));
});
test('failed refresh preserves the last good data and date', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devbrief-benchmark-'));
  const output = join(directory, 'snapshot.json');
  try {
    const original = JSON.stringify(parseLeaderboard(fixture(), '2026-09-01T00:00:00Z'));
    await writeFile(output, original);
    for (const response of [
      new Response('unavailable', { status: 503 }),
      new Response('<html>challenge</html>'),
      new Response(fixture().replace('Cost per Task USD', 'Price')),
    ]) {
      await assert.rejects(refreshBenchmarks(output, { fetcher: async () => response }));
      assert.equal(await readFile(output, 'utf8'), original);
    }
    const snapshot = await refreshBenchmarks(output, {
      fetcher: async () => new Response(fixture()),
      now: new Date('2026-09-09T00:00:00Z'),
    });
    assert.equal(snapshot.checkedAt, '2026-09-09T00:00:00.000Z');
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), snapshot);
  } finally {
    // mkdtemp returns an absolute directory strictly under the OS temporary directory.
    assert.ok(directory.startsWith(join(tmpdir(), 'devbrief-benchmark-')));
    await rm(directory, { recursive: true, force: true });
  }
});
test('rejects an unexpectedly truncated but valid model list', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devbrief-benchmark-'));
  const output = join(directory, 'snapshot.json');
  try {
    const previous = parseLeaderboard(
      fixture(Array.from({ length: 15 }, (_, i) => row(i + 12)).join('')),
    );
    await writeFile(output, JSON.stringify(previous));
    await assert.rejects(
      refreshBenchmarks(output, { fetcher: async () => new Response(fixture()) }),
      /unexpectedly lost models/,
    );
    assert.equal(JSON.parse(await readFile(output, 'utf8')).models.length, 27);
  } finally {
    assert.ok(directory.startsWith(join(tmpdir(), 'devbrief-benchmark-')));
    await rm(directory, { recursive: true, force: true });
  }
});
