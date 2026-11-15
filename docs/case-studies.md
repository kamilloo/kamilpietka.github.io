# Case study implementation and evidence

The portfolio uses plain HTML, shared CSS and vanilla JavaScript. It has no client router, framework, package dependencies or existing test runner. Production serves `public/` through Caddy `file_server` (in the separate infrastructure repository). Directory `index.html` files provide direct navigation and refresh support, directory redirects and genuine missing-file 404 responses. No SPA fallback or server migration is needed.

## Build and maintenance

Run from the repository root:

```sh
python3 scripts/build.py
python3 -m unittest discover -s tests -v
node --test tests/portfolio.test.cjs
```

`content/projects.json` owns project identifiers, titles, categories, summaries, SEO fields, sections, technologies, sources and related-project relationships. `templates/home.html` preserves the original homepage markup and its detailed project evidence; shared titles/categories/summaries are substituted from the data. `templates/case-study.html` renders all detail pages. The standard-library Python generator writes the homepage, case studies and sitemap into the existing deployment directory. Generated HTML is committed so the site also remains deployable as static files without a runtime or build service.

To add a project, add its record and supported content to the JSON, add a homepage card using the existing data attributes and `{{slug.title}}`, `{{slug.category}}`, `{{slug.summary}}` placeholders, and update relevant related-project relationships. Run the generator and tests and commit the sources and generated files together. Preserve old `route` values for public bookmarks. Do not hand-edit generated HTML. Sections without paragraphs are omitted.

`deploy.sh` now builds and tests before its existing deployment operations. `.github/workflows/validate-pr.yml` runs generation, both test suites and a committed-output check on pull requests with read-only permissions. It performs no deployment. The existing `.github/workflows/deploy.yml.disabled` remains disabled and unchanged; automatic deployment has not been enabled. No deployment was performed in this task.

## Inventory and evidence

All URLs below are relative to https://kamilpietka.dev. All pages also include explicit source links.

| Case study | Canonical route | Evidence reviewed | Scope and omissions |
| --- | --- | --- | --- |
| AI Job Hunter | `/projects/ai-job-hunter/` | Portfolio card and README; local job-hunter README, evaluation methodology and validation source structure | ATS flow, deterministic/LLM boundary, quotation provenance, bounded recovery, evaluation and limits. No unseen-job accuracy, recruitment results or performance claims. |
| Vouchers | `/projects/vouchers/` | Local API routes, API voucher controller, controller feature tests and voucher model tests; public controller checked against GitHub; infrastructure production case study | Authenticated QR lookup, redemption validation, resources, persistence assertions and deployment. No concurrency guarantee or claim that upstream tests were run. |
| AWS Data Engineering Labs | `/projects/aws-data-engineering/` | Existing case study; public READMEs from both AWS lab repositories | Raw Athena queries versus Glue ETL, streaming counters, manual verification and service trade-offs. No production SLA, benchmarks, cost results, infrastructure-as-code or automated-test results. |
| Moja Biblioteka | `/projects/mojabiblioteka/` | Existing page, local my-library-app README, repository privacy page | Local SQLite, offline boundary, explicit Open Library lookup, ISBN uncertainty, documented test/CI and release preparation. No store-release, user adoption or completed device-QA claim. |
| Production Infrastructure & Deployment | `/projects/production-infrastructure/` | Public `kamilpietka-devops/docs/production-case-study.md`; local Caddyfile and deployment workflow | HTTPS routing, Compose service boundaries, internal networking, persistence, observed rollout and rollback option. No automatic rollback, tested database restore, high availability or complete six-domain health-script claim. |

Local source inspection was read-only; upstream application test suites were not executed. Each project page distinguishes documented validation from results obtained for this portfolio change. Source links support a reader's deeper review; the text does not infer deployment success from the presence of configuration alone.

## SEO and navigation

Each detail page contains its own title, description, self-referencing canonical, Open Graph and summary Twitter Card metadata in initial HTML. There is no JavaScript prerequisite for reading any case study. Canonicals retain the established trailing slash and the existing `mojabiblioteka` spelling, avoiding a duplicate `/moja-biblioteka/` page.

JSON-LD has one WebPage, BreadcrumbList and CreativeWork per page. Existing homepage Person and WebSite IDs are referenced without redefining them. Breadcrumbs use Home → project, reflecting the actual pages; there is no invented Projects index. No ratings, prices, dates or unsupported application properties are supplied.

The sitemap is derived from the same project records and contains the homepage plus five canonical case studies, with no synthetic last-modified dates. `robots.txt` is unchanged. Ordinary anchors connect homepage cards, related projects, next projects and back navigation. Existing external destinations and demo assets remain available.

## Validation recorded during implementation

- Static production generation: passed for all five detail pages, homepage and sitemap.
- Four Python tests: passed; cover initial HTML metadata, canonical URLs, JSON-LD syntax and entity relationships, one H1 and language, sitemap completeness, homepage discovery, all internal links and fragments, and existing homepage links/hooks.
- One Node built-in test: passed; exercises the actual homepage script with a DOM test double for focus selection, pressed state, ordering, history, restoring all projects and reduced-motion scrolling. It is not a browser rendering test.
- Local HTTP checks: all five canonical routes return 200; slashless forms resolve to canonical directory URLs; nonexistent project returns 404. Run `python3 scripts/check_routes.py` against a local preview to repeat.
- Production Caddy configuration inspection: static file server without SPA rewrite. Actual deployed behavior has not been rechecked because these changes have not been deployed.
- Shared color tokens, buttons, tags, cards, focus outlines and responsive breakpoint reused. Detail pages use semantic landmarks and headings, a skip link, wrapping actions and no page JavaScript. Mobile primary navigation retains all three links. Homepage scroll now honors reduced motion explicitly.
- The initial implementation could not complete browser checks because the IDE-provided Chrome DevTools daemon timed out. Browser access succeeded during the subsequent PR review; see [PR #4 review](pr-4-review.md) for the completed viewport, interaction and keyboard checks. These checks are not a full accessibility audit.

## Evidence that would strengthen future revisions

- AI: larger labeled reference datasets, repeated live runs and documented error distributions.
- Vouchers: current runnable test report, authenticated deployment checks, transaction/concurrency review and legacy dependency upgrade evidence.
- AWS: executed test artifacts, measured processing delays and costs, scoped IAM, explicit duplicate/retry behavior and reproducible provisioning.
- Moja Biblioteka: executed physical-device QA, signed release verification and confirmed distribution status.
- Infrastructure: six-domain health output, backup/restore drills, tested rollback procedures, monitoring and runtime upgrade records.

## Changed files

Created:

- `content/projects.json`
- `templates/home.html`, `templates/case-study.html`
- `scripts/build.py`, `scripts/check_routes.py`
- `tests/test_site.py`, `tests/portfolio.test.cjs`
- `public/projects/ai-job-hunter/index.html`
- `public/projects/vouchers/index.html`
- `public/projects/production-infrastructure/index.html`
- `docs/case-studies.md`

Modified:

- `public/index.html`
- `public/projects/aws-data-engineering/index.html`
- `public/projects/mojabiblioteka/index.html`
- `public/styles.css`, `public/script.js`, `public/sitemap.xml`
- `README.md`, `.gitignore`, `deploy.sh`

The deployment script remains ignored by the existing ignore rule but is tracked already. No secrets, remote infrastructure files or disabled workflow were changed.
