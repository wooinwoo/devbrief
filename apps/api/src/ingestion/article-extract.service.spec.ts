import { ArticleExtractService } from './article-extract.service';

describe('ArticleExtractService', () => {
  let service: ArticleExtractService;
  const base = 'https://example.com/post';

  // MIN_TEXT_LEN(200) 를 넘기기 위한 충분히 긴 본문 문단.
  const longText =
    '이 글은 본문 추출 정제 로직을 검증하기 위한 충분히 긴 문단입니다. ' +
    '정제 후에도 평문 길이가 최소 기준을 넘어야 추출 성공으로 간주되며, ' +
    '그렇지 않으면 null 을 반환해 추출 실패로 처리합니다. 반복 문장으로 길이를 확보합니다. ' +
    'cheerio 휴리스틱과 sanitize 가 함께 동작하는지 확인합니다. ' +
    '추가 문장을 더 넣어 단일 문단만으로도 최소 길이 기준을 넉넉히 넘기도록 합니다. ' +
    '이렇게 하면 한 문단짜리 테스트에서도 추출이 성공으로 판정됩니다.';

  beforeEach(() => {
    service = new ArticleExtractService();
  });

  it('script/style 및 on* 핸들러를 완전히 제거한다', () => {
    const html = `
      <html><body>
        <article>
          <p onclick="alert('xss')">${longText}</p>
          <script>window.evil = 1;</script>
          <style>.x{color:red}</style>
          <p>두 번째 문단도 정상적으로 남아야 합니다. ${longText}</p>
        </article>
      </body></html>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!).not.toMatch(/<script/i);
    expect(out!).not.toMatch(/<style/i);
    expect(out!).not.toMatch(/onclick/i);
    expect(out!).toMatch(/<p>/);
  });

  it('허용되지 않은 태그(div/span)는 풀어헤쳐 텍스트를 보존한다', () => {
    const html = `
      <main>
        <div class="wrap"><span>${longText}</span></div>
        <div><p>문단 본문 ${longText}</p></div>
      </main>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!).not.toMatch(/<div/i);
    expect(out!).not.toMatch(/<span/i);
    expect(out!).toContain('본문 추출 정제 로직');
  });

  it('a 는 href 만 남기고 target/rel 을 부여, 상대경로는 절대화한다', () => {
    const html = `
      <article>
        <p>${longText} <a href="/next" class="link" data-x="1" onclick="x()">다음 글</a></p>
      </article>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!).toContain('href="https://example.com/next"');
    expect(out!).toContain('target="_blank"');
    expect(out!).toContain('rel="noopener noreferrer nofollow"');
    expect(out!).not.toMatch(/class=/i);
    expect(out!).not.toMatch(/data-x/i);
    expect(out!).not.toMatch(/onclick/i);
  });

  it('javascript: 링크는 href 가 제거되어 위험 링크가 남지 않는다', () => {
    const html = `
      <article>
        <p>${longText} <a href="javascript:alert(1)">위험</a></p>
      </article>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).not.toContain('javascript:');
  });

  it('img 는 src/alt 만 남기고 src 는 절대화한다', () => {
    const html = `
      <article>
        <p>${longText}</p>
        <img src="/img/a.png" alt="설명" width="800" class="hero" onerror="x()" />
      </article>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!).toContain('src="https://example.com/img/a.png"');
    expect(out!).toContain('alt="설명"');
    expect(out!).not.toMatch(/width=/i);
    expect(out!).not.toMatch(/onerror/i);
  });

  it('본문이 너무 짧으면 null 을 반환한다', () => {
    const html = '<article><p>짧은 본문</p></article>';
    expect(service.extractFromHtml(html, base)).toBeNull();
  });

  it('pre/code/blockquote 등 허용 태그는 보존한다', () => {
    const html = `
      <article>
        <p>${longText}</p>
        <pre><code>const a = 1;</code></pre>
        <blockquote>인용문 ${longText}</blockquote>
      </article>`;

    const out = service.extractFromHtml(html, base);
    expect(out).not.toBeNull();
    expect(out!).toMatch(/<pre>/);
    expect(out!).toMatch(/<code>/);
    expect(out!).toMatch(/<blockquote>/);
  });
});
