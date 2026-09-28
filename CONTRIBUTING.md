# Contributing

This directory depends on accurate source evidence. Report a missing organization or incorrect record with the [data correction issue template](https://github.com/satwiksps/openorganizations/issues/new?template=data-correction.yml). A private repository's issues and pull requests are available only to collaborators; deployers should provide an accessible contact address on the About page if they keep the repository private.

## Local checks

Use Node.js 22.13 or newer in the Node 22 line and the pinned pnpm version in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm data:validate
```

The full production output is static. Keep request-time APIs, database services, and paid search dependencies out of the directory's essential browsing flow. Check mobile layout, keyboard navigation, program/year combinations, browser back/forward, and a direct organization-page reload after a UI change.

## Correcting data

1. Identify the program, year, cohort, organization, and public evidence URL. Prefer official archives or accepted-project lists. Distinguish project ideas, accepted projects, and current applications.
2. Find the responsible adapter in `scripts/import-*.mjs`. Fix the adapter or its reviewed source revision when the issue would otherwise return on refresh. Use `data/aliases.json` for explicit canonical-name corrections.
3. Refresh the affected source, rebuild, and validate. The generated `data/directory.json` is not a hand-maintained source file.
4. Review organization merges, deleted records, new source commits, and changes to application status. Update the program's coverage note when the import scope changes.

Do not join unrelated projects merely because their repository URLs share `github.com`, `gitlab.com`, or another host. Preserve the program/year/cohort relationship: participation in GSoC in 2024 and LFX in 2025 does not prove participation in GSoC in 2025.

Each participation needs a source URL, evidence date, status, year, cohort, and projects array. Use `historical` or `unknown` unless current status is explicitly supported. Open applications also need a valid deadline and verified evidence. Do not infer availability from the presence of a project on an ideas page.

Current importer interfaces:

```sh
node scripts/import-gsoc.mjs --ref master
node scripts/import-sob.mjs --ref main
node scripts/import-supplemental.mjs --check
node scripts/import-supplemental.mjs --only=lfx,outreachy
pnpm data:build
pnpm data:validate
```

GSoC and SoB accept a commit SHA instead of a branch to inspect a specific revision. Supplemental repository pins and archive URLs are reviewed in its script; it does not offer an unrestricted `--latest` mode. All adapters validate before replacing their snapshot. The combined refresh wrapper additionally restores the entire previous snapshot set if any adapter or combined validation fails.

## Adding a program

Add a stable lowercase ID and official links to `data/programs.json`. Implement a source adapter with narrow, documented coverage and tests for its parsing/normalization boundaries. Add provenance and any third-party license/attribution requirements, then include the adapter in the refresh flow. Additional programs appear in the More selector automatically. Never fabricate organization examples in production snapshots.

## Licensing and release source

Keep `LICENSE`, `NOTICE.md`, vendor licenses, source attributions, and font license files intact. Contributions to project code follow GPL-3.0-only; third-party data retains its own terms. Do not copy personal applicant information or execute downloaded JavaScript as an import shortcut.

`scripts/postbuild.mjs` creates the downloadable source from an explicit directory/file allowlist. When adding build-relevant files outside those locations, extend that allowlist and confirm the archive still reconstructs the site. Never place credentials in source-controlled files or `.env.example`. Review the archive after changes involving configuration, dependencies, or licenses.
