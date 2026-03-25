const detailViewerShowcase = `# Detail Viewer Showcase

퍼블릭 상세 뷰에서 많이 나오는 블록을 한 번에 확인하기 위한 샘플입니다. 본문 타이포, 링크, 인용문, 코드, 표, 이미지, 유튜브, 트윗 카드가 함께 들어 있습니다.

## Intro Copy

이 문단은 **굵은 텍스트**, *기울임 텍스트*, ~~취소선~~, \`inline code\`, 그리고 [외부 링크](https://example.com/reference) 가 한 줄에 같이 섞였을 때 어떻게 보이는지 확인합니다.

> 서버에서 먼저 그려진 HTML이 hydration 이후에도 같은 리듬을 유지하는지 보려면, 본문 흐름이 긴 문단과 인용문에서 가장 잘 드러납니다.

## Checklist

- [x] 헤딩 간격과 첫 문단 여백
- [x] 본문 링크와 인라인 코드
- [ ] 임베드 블록의 상하 리듬
- [ ] 표와 코드 블록의 폭 정책

## Code Sample

\`\`\`tsx
export function DetailViewerCard({ title }: { title: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm text-slate-600">
        SSR output stays stable and embeds hydrate progressively.
      </p>
    </article>
  );
}
\`\`\`

## Comparison Table

| Block | Expected in Detail Viewer | Notes |
| --- | --- | --- |
| Headings | Tight top rhythm, readable scale | First heading should not jump too far down |
| Code | Dark block with syntax colors | Width should stay inside article area |
| Table | Preserve relative column widths | Should not always stretch like a sheet |
| Embeds | Keep vertical spacing and alignment | Tweet card may hydrate after first paint |

## Media Blocks

![Showcase image](https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80 =640x)

[youtube](dQw4w9WgXcQ =640x)

[tweet](1715716917854646386)

## Mixed Layout

마지막 섹션은 일반 문단 다음에 다시 표가 나올 때 전체 리듬이 유지되는지 보기 위한 블록입니다.

| Surface | Rendering Strategy | Client Cost |
| --- | --- | --- |
| admin detail | CSR read-only viewer | higher |
| public detail | SSR HTML + embed hydration | lower |
| editor preview | full Lexical editor | highest |
`;

export default detailViewerShowcase;
