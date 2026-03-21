# dinn-lexical

Shared Lexical package extracted from `admin.dinn`.

## Public API

- `Editor`
- `ReadOnlyLexicalRenderer`
- `ServerGeneratedLexicalHtml`
- `generateHtmlFromContent`
- `generateHtmlFromMarkdown`
- `theme`
- `nodes`
- `transformers`
- `setupPrism`

## Extraction Boundary

Moved into this package:

- Lexical nodes
- Markdown transformers
- SSR HTML generation
- Read-only renderer
- Editor core
- Theme and CSS
- Common plugins
- Fixture and test utilities under `dinn-lexical/test-utils`

Left in `admin.dinn`:

- Admin routes
- Auth exceptions
- Post save wiring
- Admin toolbar policy and insert/menu plugins
# dinn-lexical
