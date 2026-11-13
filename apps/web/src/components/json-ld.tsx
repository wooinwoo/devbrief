/** 구조화 데이터(JSON-LD). 제목·요약은 외부 RSS에서 오므로 </script> 조기 종료를 막도록 <, >, &를 이스케이프한다. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 이스케이프한 JSON만 넣는다.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
          .replace(/</g, '\\u003c')
          .replace(/>/g, '\\u003e')
          .replace(/&/g, '\\u0026'),
      }}
    />
  );
}
