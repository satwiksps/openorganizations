<p align="center">
  <a href="https://github.com/satwiksps/openorganizations/stargazers"><img src="static/readme-banner.svg" width="100%" alt="OpenOrganizations — Find your open source community. Please star for a cookie!" /></a>
</p>

<p align="center">
  <a href="https://github.com/satwiksps/openorganizations/actions/workflows/ci.yml"><img src="https://github.com/satwiksps/openorganizations/actions/workflows/ci.yml/badge.svg" alt="Validate and build" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-orange" alt="GPL-3.0 license" /></a>
  <a href="https://github.com/satwiksps/openorganizations/stargazers"><img src="https://img.shields.io/github/stars/satwiksps/openorganizations?style=flat&amp;color=e78a32" alt="GitHub stars" /></a>
</p>

# One place to find your open-source community

Explore organizations, compare their program history, learn from public proposal examples, and discover the smaller communities inside umbrella organizations.

**[Get started](#run-locally) · [Coverage](#data-coverage) · [Deploy for free](docs/DEPLOYMENT.md) · [Contribute](CONTRIBUTING.md)**

> **Please star for a cookie! 🍪** If this directory helps you find your next contribution, [star the repository](https://github.com/satwiksps/openorganizations). A virtual cookie, our gratitude, and an easy way to find us again.

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

The production build is in `public/`; the local production preview is [http://127.0.0.1:9000](http://127.0.0.1:9000). Normal builds are offline with respect to program data and use committed snapshots. Dependency installation requires network access. Cached organization logos are served locally; uncached images may load from their upstream hosts.

## What works

- Search organization names, aliases, sub-organizations, descriptions, technologies, and topics.
- Public proposal library with organization search, year filters, and archive-reported outcomes.
- NumFOCUS, Apache, and CNCF sub-organization tables with distinct-year frequencies and source links.
- Locally cached logos, visible loading/error fallbacks, and a consistent original brand mark.
- GitHub stars and the cookie invitation in the sidebar, with a saved-count fallback.
- Program tabs with live counts; year, category, technology, topic, and application-status filters.
- Filters preserved in the URL, browser back/forward support, 24-card pagination, and sorting.
- One organization card with separate program/year/cohort participation records and project links.
- Responsive native filter dialog, keyboard controls, skip navigation, image fallbacks, and meaningful empty states.
- Pre-rendered organization pages, sitemap, source attribution, and a downloadable project source archive.
- Optional advertising integration, disabled until publisher configuration and explicit consent are provided.

## Data coverage

The snapshot expanded on 2026-10-02 contains **1,155 organization records and 4,089 participation records** across seven programs. Counts change when refreshed; one organization may appear in multiple program counts. Historical renames and ambiguous identities may still require manual deduplication.

| Program | Organizations | Included evidence |
| --- | ---: | --- |
| GSoC | 899 | 2009–2015 project records from an MIT-licensed community mirror; organization/project snapshots for 2016–2026 |
| LFX | 86 | CNCF LFX projects for 2023–2026; this does not cover every Linux Foundation project |
| Summer of Bitcoin | 69 | Community-maintained participation and project titles for 2021–2025 |
| ESoC | 10 | Eleven reviewed 2026 opportunity cards grouped by organization; ideas are not accepted projects |
| Outreachy | 90 | Public community/project archives from May 2020 through May 2026; December 2026 is not included |
| C4GT | 42 | Dedicated Mentoring Program 2025 archive; 2026 and ongoing Community opportunities are not covered |
| Season of KDE | 1 | KDE's 2025 selected-project announcement; nine projects under one community |

`data/programs.json` and each participation record provide the current coverage statement, source URL, and evidence date. Historical participation does not imply an open application. An open badge requires recorded open status, valid verification evidence, and a valid unexpired deadline; missing dates are not guessed. Check the linked official program before applying.

SoB is a community snapshot and includes source repository links that may be personal forks. Tags are accumulated organization metadata and may not describe every project or past round. Name/website deduplication and explicit aliases reduce duplicates, but ambiguous organizations still need human review. See [CONTRIBUTING.md](CONTRIBUTING.md) for corrections.

## Proposals, sub-organizations, and logos

The proposal library indexes **89 public document links** from the [community GSoC archive](https://github.com/Google-Summer-of-Code-Archive/gsoc-proposals-archive) and [GSoC_archive_2026](https://github.com/satwiksps/GSoC_archive_2026). Accepted/rejected labels are reported by archive maintainers, not independently verified. Documents stay with their authors. A proposal is not evidence of participation or an acceptance-rate estimate.

For **NumFOCUS and Apache**, frequency means distinct years where an indexed GSoC project title unambiguously names the sub-project. Generic and ambiguous titles remain unassigned, so counts are lower bounds. NumFOCUS's official ideas-list appearances for 2015–2026 have a separate count and source links. For **CNCF**, frequency uses indexed LFX participation records, counting multiple terms in a year once.

Organization images are served locally when retrievable; `data/logos.json` retains source URLs and dates. Website icons are distinguished from organization images. Missing images show initials immediately, including during loading and after errors. Some historical organizations no longer have working sites or retrievable logos.

```sh
pnpm data:history    # Reviewed GSoC 2009–2015 mirror
pnpm data:resources  # Pinned proposal archives and umbrella sources
pnpm logos:cache     # Cache available raster logos and website icons
pnpm repo:refresh    # GitHub star snapshot (GITHUB_TOKEN if private)
```

Never expose a GitHub token through a `GATSBY_*` variable. The browser uses the public API and a six-hour count cache, falling back to the committed snapshot on failure. A private repository cannot receive stars from public visitors. The cookie invitation does not set tracking cookies or claim to verify stars.

## Refresh data

```sh
pnpm data:refresh
pnpm test
pnpm build
```

The refresh wrapper runs the GSoC, SoB, and supplemental CLI importers sequentially, then builds and validates the combined directory. GSoC follows upstream `master`; SoB follows upstream `main`, resolving both to recorded commits. Supplemental GitHub sources retain reviewed pins and public archive adapters. Any importer or validation failure exits nonzero and restores the previous local snapshots.

`node scripts/refresh-data.mjs --pinned` uses the importers' reviewed GSoC/SoB defaults instead. This pins their repository data, while the supplemental HTML archives and fetch timestamps can still change. For a reproducible offline build, use the checked-in snapshots and `pnpm build`.

The weekly GitHub workflow opens or updates a data pull request only after tests and a production build pass. It also updates the star-count snapshot. It never merges automatically. Repository owners must enable Actions' permission to create pull requests. CI validates the code; Cloudflare's Git integration publishes the website when configured.

## Hosting and ads

Cloudflare Pages Free is the intended host: connect the repository, build with `pnpm build`, and publish `public/`. Static asset requests are [free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/); this architecture is designed for an expected **$0/month hosting bill** within the platform's published limits. No server plan is required. Free hosting does not guarantee indefinite capacity or uptime.

Start with a free `pages.dev` address or connect a domain bought elsewhere. A domain is the main expected recurring expense. Namecheap's [.site page](https://www.namecheap.com/domains/registration/gtld/site/) listed a $0.98 first-year promotion and $31.98 annual renewal on 2026-09-28, before the stated ICANN fee/taxes; check checkout and renewal pricing for your exact name. Availability of `openorganizations.site` has not been verified.

Vercel Hobby explicitly excludes [commercial use including AdSense](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage), so it is not the proposed host for an ad-supported deployment. Ad approval and earnings are not guaranteed. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for exact deployment, source-download, consent, and DNS instructions.

## License and attribution

Project code is licensed under [GPL-3.0-only](LICENSE). GSoC data and normalization code derive from [nishantwrp/gsoc-organizations](https://github.com/nishantwrp/gsoc-organizations) under GPL-3.0; SoB data comes from [Jaydeep869/SOB_Organizations](https://github.com/Jaydeep869/SOB_Organizations) under MIT. Attribution and original notices are retained in [vendor/README.md](vendor/README.md) and [NOTICE.md](NOTICE.md).

Third-party material retains its own licenses: Outreachy public content is attributed under CC BY 3.0, the KDE announcement under CC BY-SA 4.0, and the bundled DM Sans font under the SIL Open Font License. The project's GPL label does not relicense these materials, organization marks, or externally hosted logos.

Every production build publishes `/source.tar.gz`, containing the project source, build instructions, lockfile, data snapshots, bundled fonts, and retained notices. This keeps the project source accessible to website users even when the working GitHub repository is private.
