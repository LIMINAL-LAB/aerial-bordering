# CLAUDE.md

**aerial-bordering** is a React (Vite) SPA presenting Liminal's investigation into Frontex's
aerial surveillance of the Central Mediterranean. Deployed on Netlify (`netlify.toml`, publishes
`build/`).

## Commands

```bash
just dev                    # dev server: assume it is already running, never start it yourself
just build                  # production build
just port-report <docx>     # regenerate src/data/report.json from a report draft
```

There are no tests.

## Routes

`/` `HomePage` · `/report` `ReportPage` · `/database` `DatabasePage` · `/methodology`
`MethodologyPage`, all in `src/components/`. Every page but the home page is lazy-loaded, so its
CSS only joins the cascade once visited: a bare class selector in one page's CSS can restyle
another page after navigation. Scope selectors to the page.

## Where content comes from

| File | Source | Edit by |
|---|---|---|
| `src/data/report.json` | report draft (.docx) | `just port-report <docx>`; hand edits are lost on the next port |
| `src/data/abstract.json` | abstract docx | hand (kept out of `report.json` so a port doesn't wipe it) |
| `MethodologyPage.jsx` | methodology docx | hand: text, grade table and credits live in the JSX |
| `src/data/app_data_all.json`, `irini.json` | external data pipeline | regenerate upstream, never by hand |
| `src/data/violations.json`, `public/pattern-media/` | external data pipeline | regenerate upstream, never by hand |
| `public/report-images/` | figure originals | `scripts/optimize_report_images.py <dir>` (webp only) |
| `public/downloads/` | report PDF, data-analysis PDF, JORA/Irini xlsx | replace the file, keeping its name (linked from Report and Methodology) |

Never hand-edit a generated file. Drafts and design originals live in the gitignored `design/`.

## Gotchas

- The brand font "ABC Diatype Edu" is not shipped (no `@font-face`), so visitors see the
  fallback stack. The home page's highlighted text (`ContentSection.css`) is sized against those
  fallback metrics; re-check it if the font is ever added.
