# Deploying OpenOrganizations

The deployable output is Gatsby's `public/` directory. All organization pages, data, fonts, scripts, and styles are static assets. Search and filtering happen in the browser. Production has no database, Node server, or per-visitor data import.

## Cost and limits

Cloudflare Pages Free is the recommended starting point. Its [static requests are free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/). Published [Free limits](https://developers.cloudflare.com/pages/platform/limits/) include 500 builds per month, one concurrent build, 20,000 files, and 25 MiB per file. The postbuild script checks file sizes, including the compressed source archive. Do not add a catch-all Function or middleware that turns every static request into a metered execution.

The intended hosting cost is $0/month while using this static architecture within those limits. The domain registration/renewal is separate. A free `pages.dev` hostname works before buying a domain. Namecheap's `.site` introductory price and renewal price differ substantially; check the [actual renewal price](https://www.namecheap.com/domains/registration/gtld/site/) before buying. Buying Namecheap hosting, an additional SSL certificate, or PremiumDNS is unnecessary for this setup.

GitHub Actions for a private repository has [included usage and storage limits](https://docs.github.com/en/billing/concepts/product-billing/github-actions). The supplied automation refreshes weekly, keeps small build artifacts for three days, and avoids uploading the entire Gatsby output. Keep paid Actions overages disabled if your budget is zero; inspect usage before increasing the schedule frequency.

## Cloudflare Pages Git integration

1. Create a Cloudflare Pages project and connect the GitHub repository, granting access only to the needed repository. A private source repository can be connected.
2. Select your actual default branch as the production branch.
3. Configure these build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Gatsby, or None with the explicit settings below |
   | Build command | `pnpm build` |
   | Build output directory | `public` |
   | Root directory | Repository root |
   | `NODE_VERSION` | `22` |
   | `PNPM_VERSION` | `11.25.0`, matching `package.json` |
   | `SITE_URL` | Your actual public origin, such as `https://your-project.pages.dev` |
   | `GATSBY_TELEMETRY_DISABLED` | `1` |

4. Leave advertising variables empty for the first deployment. Optionally set `GATSBY_CONTACT_EMAIL` to a public project contact address, particularly if repository issues are private.
5. Run the build. Confirm the deployed root page, an organization URL opened directly, `/programs/`, `/sources/`, `/sitemap.xml`, and `/source.tar.gz` all load. Test a URL containing a program and year filter, refresh it, and use browser Back.
6. After connecting the final domain, change `SITE_URL` and rebuild so canonical URLs, sitemap, and robots.txt use that domain. `SITE_URL` is an origin only: no path, query, credentials, or fragment.

Cloudflare must use the pnpm version declared by the project; `pnpm-workspace.yaml` explicitly permits needed native build scripts. If the selected build image does not honor the pinned package manager, configure its documented Corepack/pnpm support or use a supported build image. Do not bypass dependency-script approvals wholesale. See [Cloudflare build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/).

No credentials or remote deployment are configured in this repository. The workflows validate changes; they do not deploy to Cloudflare. Cloudflare's Git integration rebuilds after changes are merged into the production branch. Use its deployment history to roll back to a previous successful static release.

## Connect a Namecheap domain

Keep the domain registered at Namecheap. For an apex domain such as `openorganizations.site`, add the domain to Cloudflare DNS and add it under the Pages project's **Custom domains**. Cloudflare provides two nameservers.

In Namecheap, open **Domain List → Manage → Nameservers → Custom DNS**, enter those exact nameservers, and save. Copy any existing mail or other DNS records into Cloudflare before switching an already-used domain. Wait for Cloudflare to confirm activation and issue the certificate. Add `www` if desired and choose one canonical hostname; configure its redirect in Cloudflare and update `SITE_URL` accordingly.

Use the [Cloudflare custom-domain steps](https://developers.cloudflare.com/pages/configuration/custom-domains/) and [Namecheap nameserver instructions](https://www.namecheap.com/support/knowledgebase/article.aspx/767/10/how-to-change-dns-for-a-domain/). Add the hostname through Pages instead of creating an isolated DNS record and assuming Pages will recognize it.

## Automated data refresh and review

`.github/workflows/ci.yml` runs tests, the production build, and validation for pull requests and main/master pushes. `.github/workflows/refresh-data.yml` runs every Monday at 04:23 UTC and can be started manually. It imports all sources sequentially, validates the combined data, runs tests, builds the full site, then opens or updates `automation/refresh-program-data` as a pull request.

GSoC and SoB follow their current upstream branches and record resolved revisions. The supplemental importer uses reviewed repository pins and bounded official HTML archives; its coverage does not expand to new cohorts automatically. Update those pins and adapters deliberately. `--pinned` on the refresh wrapper uses the reviewed GSoC/SoB defaults for comparison. Offline builds continue to use checked-in snapshots.

In repository **Settings → Actions → General → Workflow permissions**, allow GitHub Actions to create pull requests. The refresh workflow requests only `contents: write` and `pull-requests: write`; it never pushes directly to the default branch or merges itself. For bot-created pull requests, GitHub may show an **Approve workflows to run** prompt for the normal PR checks. The refresh workflow has already run tests and the production build before it creates the PR. See [GitHub workflow-trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Review the source revisions, deleted records, organization merges, counts, and coverage notes before merging. A failed refresh restores the previous local snapshot set, fails the job, and creates no update PR. It cannot alter the deployed site until a successful change is merged and deployed.

## Optional advertising

Ads are disabled by default. AdSense approval requires [eligible, original content](https://support.google.com/adsense/answer/9724?hl=en), policy compliance, and an approved account/site; neither approval nor earnings is guaranteed. The existing source and organization pages do not remove those requirements.

After approval, set the **real** values issued by Google in the hosting build environment:

- `GATSBY_ADSENSE_CLIENT`: your `ca-pub-` publisher ID followed by 16 digits.
- `GATSBY_ADSENSE_SLOT`: your numeric ad-unit ID.
- `GATSBY_ADSENSE_AUTO_ADS`: set to `true` only when native Auto ads are configured in AdSense.

These are public identifiers compiled into browser code, not secrets. The postbuild script emits an `ads.txt` Google DIRECT record only when a syntactically valid publisher ID is configured; it cannot confirm account ownership or approval. With no publisher ID, it publishes no `ads.txt`. Never use dummy IDs in production. Match the generated entry to Google's [ads.txt instructions](https://support.google.com/adsense/answer/12171612?hl=en-GB).

The `AdSlot` component also requires an explicit consent bridge. Integrate a Google-certified consent management platform where Google requires one; the CMP must map its actual advertising-consent result to:

```js
window.__ooAdsConsent = true; // Only after the CMP reports valid ad consent.
window.dispatchEvent(new Event('openorganizations:ads-consent'));
```

For refusal or withdrawal, set the value to `false` and dispatch the same event. Manual placements disappear when consent is false, but an already-loaded third-party script cannot be fully unloaded by removing markup. Wire withdrawal to the CMP's revocation procedure and reload the page after persisting the refusal, so the next page starts without loading the ad script. Initialize the bridge to false/absent until the CMP confirms consent. Continued browsing, the visitor's inferred region, and elapsed time are never treated as consent by the component.

Before enabling ads, update the privacy page for the actual providers, contact information, cookie use, and controls. Follow [Google's required privacy disclosures](https://support.google.com/adsense/answer/1348695?hl=en) and [consent-management requirements](https://support.google.com/adsense/answer/13554116?hl=en). Reserved ad slots remain separate from organization links. Test refusal, withdrawal, and ad blockers; browsing should work in each case.

## Downloadable project source

Every production build creates deterministic `public/source.tar.gz` with Node's built-in USTAR writer and gzip implementation. It includes project source, scripts, data snapshots, Gatsby/pnpm configuration, the lockfile, documentation, workflow files, static fonts, and retained license/attribution files. It excludes installed dependencies, `.git`, `.reference`, `public`, caches, `.env` files, and recognized secret-file names. `.env.example` is included as a nonsecret configuration example.

The `/sources/` page links this archive, allowing public source downloads even if the working repository is private. Users can extract it, install the pinned dependencies, and rebuild with the commands in [the project guide](PROJECT.md#run-locally). Do not replace it with a link to an inaccessible private repository. Rebuild the archive in the same deployment as any source change, retain third-party notices, and check the archive if new build inputs are added outside the allowlist.

The postbuild step rejects a source archive at or above the Pages 25 MiB single-file limit instead of silently removing source access. It also emits `sitemap.xml` and `robots.txt` from actual built routes, excluding the 404 route. Production domain changes require a rebuild.

### Ad placement limits

Manual units appear after the eighth and twentieth organization cards (only with further results), after the eighth proposal card, or between the profile chart and participation list. Each has a separate close button. They request ads only within 300px of the viewport after consent, with no timed refresh. Unfilled slots are hidden.

For collapsible edge ads and occasional full-screen ads, enable Google's native anchor and vignette formats in AdSense Auto ads. Google owns their creative, close controls and delivery; this site never puts a display unit inside a custom popup. Set vignette frequency to at least 10 minutes in the AdSense dashboard, and exclude API and privacy pages and navigation areas. The environment flag loads the consent-gated script; it does not configure account settings or guarantee an ad will appear. See [anchor settings](https://support.google.com/adsense/answer/15484692?hl=en) and [vignette frequency](https://support.google.com/adsense/answer/13956167?hl=en).

Optional `GATSBY_ADSENSE_PROFILE_SLOT` and `GATSBY_ADSENSE_PROPOSALS_SLOT` can use separate reporting units; both fall back to `GATSBY_ADSENSE_SLOT`. Test desktop and mobile with approved ad units before launch. No configured publisher means no slot or empty ad space.

For placement review only, append `?ad-preview=1` to a localhost URL. This renders labeled inline placeholders and controls for opening anchor and vignette previews, without loading advertising scripts. It has no effect on public hostnames. Previews are layout checks, not a simulation of Google's delivery rules.

## Public API

The build exports `/api/v1/organizations.json`, `/api/v1/programs.json`, `/api/v1/proposals.json` and one `/api/v1/organizations/SLUG.json` file per organization. These static files support cross-origin GET requests through `static/_headers`; they require no server or API key. `/api/` documents the response shape and coverage. Unknown slugs return 404.
