# OpenOrganizations

A fast, searchable directory of open source organizations across GSoC, LFX, Summer of Bitcoin, ESoC, Outreachy, C4GT, and Season of KDE. The interface follows the familiar search, sidebar filters, and organization-card pattern of [GSoC Organizations](https://www.gsocorganizations.dev/), with program tabs directly below the search box.

This is a Gatsby 5 / React 18 static website. Pages and data are built ahead of time; search, filters, and pagination run in the visitor's browser. There is no production database, application server, login service, or request-time scraper.

## Run locally

Use Node.js 22.13 or newer in the Node 22 line and the pnpm version specified by `packageManager` in `package.json` (currently 11.25.0). With Corepack available:

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). If Corepack is unavailable, follow [pnpm's installation instructions](https://pnpm.io/installation); no global Gatsby installation is needed. The approved native dependency build scripts are listed in `pnpm-workspace.yaml`.

```sh
pnpm test
pnpm build
pnpm serve
```

The production build is in `public/`; the local production preview is [http://127.0.0.1:9000](http://127.0.0.1:9000). Normal builds are offline with respect to program data and use committed snapshots. Dependency installation requires network access, and organization logos load from their upstream hosts in visitors' browsers.

## What works

- Search organization names, descriptions, technologies, and topics.
- Program tabs with live counts; year, category, technology, topic, and application-status filters.
- Filters preserved in the URL, browser back/forward support, 24-card pagination, and sorting.
- One organization card with separate program/year/cohort participation records and project links.
- Responsive native filter dialog, keyboard controls, skip navigation, image fallbacks, and meaningful empty states.
- Pre-rendered organization pages, sitemap, source attribution, and a downloadable project source archive.
- Optional advertising integration, disabled until publisher configuration and explicit consent are provided.

## Data coverage

The initial snapshot assembled on 2026-09-28 contains **738 unique organizations and 2,676 participation records** across seven programs. Counts change when the data is refreshed; one organization may appear in multiple program counts.

| Program | Organizations | Included evidence |
| --- | ---: | --- |
| GSoC | 519 | Community-maintained organization/project archives for 2016–2026, with official archive links |
| LFX | 72 | CNCF LFX projects for 2024–2026; this does not cover every Linux Foundation project |
| Summer of Bitcoin | 69 | Community-maintained participation and project titles for 2021–2025 |
| ESoC | 10 | Eleven reviewed 2026 opportunity cards grouped by organization; ideas are not accepted projects |
| Outreachy | 48 | Public community/project archives from May 2023 through May 2026; December 2026 is not included |
| C4GT | 42 | Dedicated Mentoring Program 2025 archive; 2026 and ongoing Community opportunities are not covered |
| Season of KDE | 1 | KDE's 2025 selected-project announcement; nine projects under one community |

`data/programs.json` and each participation record provide the current coverage statement, source URL, and evidence date. Historical participation does not imply an open application. An open badge requires recorded open status, valid verification evidence, and a valid unexpired deadline; missing dates are not guessed. Check the linked official program before applying.

SoB is a community snapshot and includes source repository links that may be personal forks. Tags are accumulated organization metadata and may not describe every project or past round. Name/website deduplication and explicit aliases reduce duplicates, but ambiguous organizations still need human review. See [CONTRIBUTING.md](CONTRIBUTING.md) for corrections.

## Refresh data

```sh
pnpm data:refresh
pnpm test
pnpm build
```

The refresh wrapper runs the GSoC, SoB, and supplemental CLI importers sequentially, then builds and validates the combined directory. GSoC follows upstream `master`; SoB follows upstream `main`, resolving both to recorded commits. Supplemental GitHub sources retain reviewed pins and public archive adapters. Any importer or validation failure exits nonzero and restores the previous local snapshots.

`node scripts/refresh-data.mjs --pinned` uses the importers' reviewed GSoC/SoB defaults instead. This pins their repository data, while the supplemental HTML archives and fetch timestamps can still change. For a reproducible offline build, use the checked-in snapshots and `pnpm build`.

The weekly GitHub workflow opens or updates a data pull request only after tests and a production build pass. It never merges automatically. Repository owners must enable Actions' permission to create pull requests. Scheduled workflows become active once present on the default branch; no workflow or deployment has been run remotely by creating these files.

## Hosting and ads

Cloudflare Pages Free is the intended host: connect the repository, build with `pnpm build`, and publish `public/`. Static asset requests are [free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/); this architecture is designed for an expected **$0/month hosting bill** within the platform's published limits. No server plan is required. Free hosting does not guarantee indefinite capacity or uptime.

Start with a free `pages.dev` address or connect a domain bought elsewhere. A domain is the main expected recurring expense. Namecheap's [.site page](https://www.namecheap.com/domains/registration/gtld/site/) listed a $0.98 first-year promotion and $31.98 annual renewal on 2026-09-28, before the stated ICANN fee/taxes; check checkout and renewal pricing for your exact name. Availability of `openorganizations.site` has not been verified.

Vercel Hobby explicitly excludes [commercial use including AdSense](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), so it is not the proposed host for an ad-supported deployment. Ad approval and earnings are not guaranteed. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for exact deployment, source-download, consent, and DNS instructions.

## License and attribution

Project code is licensed under [GPL-3.0-only](LICENSE). GSoC data and normalization code derive from [nishantwrp/gsoc-organizations](https://github.com/nishantwrp/gsoc-organizations) under GPL-3.0; SoB data comes from [Jaydeep869/SOB_Organizations](https://github.com/Jaydeep869/SOB_Organizations) under MIT. Attribution and original notices are retained in [vendor/README.md](vendor/README.md) and [NOTICE.md](NOTICE.md).

Third-party material retains its own licenses: Outreachy public content is attributed under CC BY 3.0, the KDE announcement under CC BY-SA 4.0, and the bundled DM Sans font under the SIL Open Font License. The project's GPL label does not relicense these materials, organization marks, or externally hosted logos.

Every production build publishes `/source.tar.gz`, containing the project source, build instructions, lockfile, data snapshots, bundled fonts, and retained notices. This keeps the project source accessible to website users even when the working GitHub repository is private.
