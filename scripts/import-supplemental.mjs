#!/usr/bin/env node
/**
 * Refresh reviewed public program snapshots. Node 20+, no dependencies.
 * Run: node scripts/import-supplemental.mjs [--check] [--only=lfx,outreachy,...]
 * GitHub sources are pinned to reviewed commits; edit pins deliberately after review.
 * HTML/wiki sources are content-hashed. No login, private applicant data, or live
 * browser/API requests are required by the website. All imports validate before
 * one atomic rename, so an upstream error never replaces the last good snapshot.
 */
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'data', 'supplemental.json');
const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);
const CNCF_REV = '17ef996a1fc7b266dbf2cfa6362752d6bb5c4c3d';
const ESOC_REV = 'ff518b94da468b07c906323ab91b5b79b12b81be';
const only = process.argv.find(x => x.startsWith('--only='))?.slice(7).split(',');
const check = process.argv.includes('--check');
const hash = text => createHash('sha256').update(text).digest('hex');
const uniq = xs => [...new Set(xs.filter(Boolean))];
const plain = text => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([a-f\d]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
const slug = text => plain(text).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
const mdLinks = text => [...text.matchAll(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g)].map(m => ({ title: plain(m[1]), url: m[2] }));
const urlIn = text => text?.match(/https:\/\/[^\s<>\])"']+/)?.[0]?.replace(/[.,;]+$/, '');
function safeUrl(url) { try { return new URL(url).protocol === 'https:'; } catch { return false; } }
function assert(condition, message) { if (!condition) throw new Error(message); }
async function fetchText(url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'OpenOrganizations-data-import/1.0', Accept: 'text/plain,text/html,application/json' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
      const text = await response.text();
      assert(text.length > 50, `Empty source: ${url}`);
      return text;
    } catch (error) { last = error; }
  }
  throw last;
}
async function mapLimit(items, fn, limit = 4) {
  const results = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const i = cursor++; results[i] = await fn(items[i], i); }
  }));
  return results;
}
function provenance(sourceUrl, text, sourceRevision) {
  return { sourceUrl, verifiedAt: TODAY, fetchedAt: NOW, sourceHash: hash(text), ...(sourceRevision ? { sourceRevision } : {}) };
}
// Tags are extracted only from explicitly supplied skills/technology fields.
const TECH = [
  ['Python', /\bpython\b/i], ['JavaScript', /\bjavascript\b|\bJS\b/i], ['TypeScript', /\btypescript\b/i],
  ['Go', /\bgolang\b|\bgo\b/i], ['Rust', /\brust\b/i], ['C++', /\bc\+\+/i], ['C', /\bC language\b|(?:^|[,/])\s*C\s*(?:[,/]|$)/],
  ['Java', /\bjava\b/i], ['Kotlin', /\bkotlin\b/i], ['PHP', /\bphp\b/i], ['Ruby', /\bruby\b/i], ['R', /(?:^|[,/])\s*R\s*(?:[,/]|$)/],
  ['React', /\breact(?:js|\.js| native)?\b/i], ['Vue', /\bvue(?:js|\.js)?\b/i], ['Angular', /\bangular\b/i],
  ['Node.js', /\bnode(?:js|\.js)?\b/i], ['Next.js', /\bnext\.js\b/i], ['HTML', /\bhtml\b/i], ['CSS', /\bcss\b/i],
  ['SQL', /\bsql\b/i], ['PostgreSQL', /\bpostgres(?:ql)?\b|\bpsql\b/i], ['MongoDB', /\bmongo(?:db)?\b/i],
  ['Docker', /\bdocker\b/i], ['Kubernetes', /\bkubernetes\b|\bk8s\b/i], ['Helm', /\bhelm\b/i], ['eBPF', /\bebpf\b/i],
  ['Django', /\bdjango\b/i], ['Flask', /\bflask\b/i], ['FastAPI', /\bfastapi\b/i], ['Spring Boot', /\bspring(?: boot)?\b/i],
  ['PyTorch', /\bpytorch\b/i], ['TensorFlow', /\btensorflow\b/i], ['Figma', /\bfigma\b/i], ['Qt', /\bqt\b/i],
  ['QML', /\bqml\b/i], ['Shell', /\bshell\b|\bbash\b/i], ['Git', /\bgit\b/i], ['GitHub Actions', /\bgithub actions\b/i],
  ['OpenTelemetry', /\bopentelemetry\b|\botel\b/i], ['GraphQL', /\bgraphql\b/i], ['gRPC', /\bgrpc\b/i],
  ['Solidity', /\bsolidity\b/i], ['Dart', /\bdart\b/i], ['Flutter', /\bflutter\b/i], ['Svelte', /\bsvelte\b/i],
];
const technologies = text => TECH.filter(([, re]) => re.test(text || '')).map(([name]) => name);
function sourceWebsite(sourceUrl, name) { return { website: `${sourceUrl.split('#')[0]}#${slug(name)}`, websiteIsSource: true }; }
function org(name, website, description, category, tech = [], topics = [], fallback = false) {
  return { name: plain(name), website, ...(fallback ? { websiteIsSource: true } : {}), description: plain(description), category, technologies: tech, topics, participations: [] };
}
function add(map, row, participation) {
  const aliases = { 'The Update Framework (TUF)': 'TUF', 'WasmEdge Runtime': 'WasmEdge', 'CNCF OpenTelemetry': 'OpenTelemetry' };
  if (aliases[row.name]) { row.aliases = uniq([...(row.aliases || []), row.name]); row.name = aliases[row.name]; }
  const key = row.name.toLowerCase();
  if (!map.has(key)) map.set(key, row);
  const existing = map.get(key);
  existing.technologies = uniq([...existing.technologies, ...row.technologies]).sort();
  existing.topics = uniq([...existing.topics, ...row.topics]).sort();
  if (existing.websiteIsSource && !row.websiteIsSource) { existing.website = row.website; delete existing.websiteIsSource; }
  const same = existing.participations.find(p => p.program === participation.program && p.year === participation.year && p.cohort === participation.cohort);
  if (same) {
    for (const project of participation.projects) if (!same.projects.some(p => p.url === project.url && p.title === project.title)) same.projects.push(project);
  } else existing.participations.push(participation);
}

const LFX_ALIASES = {
  'krkn - Chaos': 'Krkn', 'Headlamp (a Kubernetes UI)': 'Headlamp', 'volcano/kthena': 'Kthena',
  'Volcano/AgentCube': 'AgentCube', 'Meshery (CNCF Sandbox)': 'Meshery',
};
async function importLfx() {
  const map = new Map();
  const terms = [
    ['2023/01-Mar-May', 2023, 'Term 1 · March–May'], ['2023/02-Jun-Aug', 2023, 'Term 2 · June–August'], ['2023/03-Sep-Nov', 2023, 'Term 3 · September–November'],
    ['2024/01-Mar-May', 2024, 'Term 1 · March–May'], ['2024/02-Jun-Aug', 2024, 'Term 2 · June–August'], ['2024/03-Sep-Nov', 2024, 'Term 3 · September–November'],
    ['2025/01-Mar-May', 2025, 'Term 1 · March–May'], ['2025/02-Jun-Aug', 2025, 'Term 2 · June–August'], ['2025/03-Sep-Nov', 2025, 'Term 3 · September–November'],
    ['2026/01-Mar-May', 2026, 'Term 1 · March–May'], ['2026/02-Jun-Aug', 2026, 'Term 2 · June–August'],
  ];
  const snapshots = await mapLimit(terms, async ([folder, year, cohort]) => {
    const file = `programs/lfx-mentorship/${folder}/README.md`;
    const text = await fetchText(`https://raw.githubusercontent.com/cncf/mentoring/${CNCF_REV}/${file}`);
    const sourceUrl = `https://github.com/cncf/mentoring/blob/${CNCF_REV}/${file}`;
    const lines = text.split('\n'); const records = []; let orgName = '', projectTitle = '', body = [];
    function flush() {
      const block = body.join('\n');
      // Use the explicit LFX URL field. Descriptions sometimes link an older
      // mentorship as context, which must never become this project's apply link.
      const applicationUrl = urlIn(block.match(/^[ \t]*[-*]\s*(?:\*\*)?LFX URL(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.+)$/mi)?.[1]);
      if (!applicationUrl) return;
      assert(orgName && projectTitle, `Unclassified LFX project (${orgName} / ${projectTitle}): ${sourceUrl}`);
      const blockLines = block.split('\n');
      const issueIndex = blockLines.findIndex(line => /(?:Upstream )?Issue(?: URL)?\s*(?:\*\*)?\s*:/i.test(line));
      const issueUrl = issueIndex < 0 ? undefined : urlIn(blockLines.slice(issueIndex, issueIndex + 2).join('\n'));
      const skills = block.match(/(?:Recommended Skills|Technologies|Skills)\s*(?:\*\*)?\s*:\s*([\s\S]*?)(?=\n[-*]\s*(?:\*\*)?(?:Mentor|Upstream|LFX|Expected)|$)/i)?.[1] || '';
      records.push({ name: LFX_ALIASES[orgName] || orgName, title: projectTitle, applicationUrl, url: issueUrl || applicationUrl, skills });
    }
    // 2025 Terms 2/3 place organization headings directly after instructions.
    const sectionStart = text.search(/^## (?:Accepted )?Projects/mi);
    let inProjects = sectionStart === -1;
    for (const line of lines) {
      if (/^## (?:Accepted )?Projects\s*$/i.test(line)) { inProjects = true; continue; }
      if (!inProjects) continue;
      const heading = line.match(/^(#{3,6})\s+(.+)/);
      if (heading) {
        flush(); body = [];
        // These three reviewed headings in the official 2024 Term 2 file use
        // organization depth for a project. Preserve their preceding organization.
        if (folder === '2024/02-Jun-Aug' && ['Add GUAC support', 'Enhancements in Chaoscenter: GitOps Support for Azure Git, Group Chaos Infra by Environments in Infrastructure Selection Modal', 'Implementing Upgrade Agent Support in Litmus 3.x'].includes(plain(heading[2]))) projectTitle = plain(heading[2]);
        else if (heading[1].length === 3) { orgName = plain(heading[2]); projectTitle = ''; }
        else projectTitle = plain(heading[2]);
      } else body.push(line);
    }
    flush();
    // A project is included only with a real LFX project link; never import ideas as accepted.
    const links = uniq([...text.slice(Math.max(0, sectionStart)).matchAll(/^[ \t]*[-*]\s*(?:\*\*)?LFX URL(?:\*\*)?\s*:\s*(?:\*\*)?\s*(.+)$/gmi)].map(m => urlIn(m[1])));
    assert(records.length >= 10 && records.length === links.length, `LFX coverage changed in ${folder}: parsed ${records.length}, links ${links.length}`);
    console.log(`lfx ${folder}: ${records.length} linked accepted projects`);
    return { records, year, cohort, sourceUrl, text };
  });
  for (const { records, year, cohort, sourceUrl, text } of snapshots) {
    for (const r of records) {
      const website = sourceWebsite(sourceUrl, r.name);
      add(map, org(r.name, website.website, `${r.name} is listed in CNCF's LFX Mentorship project directory. Browse its published mentorship projects and skills.`, 'Infrastructure and cloud', technologies(r.skills), ['Cloud native', 'Mentorship'], true), {
        program: 'lfx', year, cohort, status: 'historical', ...provenance(sourceUrl, text, CNCF_REV),
        projects: [{ title: r.title, url: r.url, applicationUrl: r.applicationUrl, sourceStatus: 'accepted' }],
        applicationUrl: r.applicationUrl,
      });
    }
  }
  const file = 'programs/lfx-mentorship/2026/03-Sep-Nov/lfx-export.json';
  const text = await fetchText(`https://raw.githubusercontent.com/cncf/mentoring/${CNCF_REV}/${file}`);
  const sourceUrl = `https://github.com/cncf/mentoring/blob/${CNCF_REV}/${file}`;
  const data = JSON.parse(text);
  assert(data.programs.length === data._count && data._count === 59, 'LFX 2026 Term 3 reviewed export changed');
  for (const r of data.programs) {
    const name = LFX_ALIASES[r.cncf_project] || r.cncf_project;
    const website = sourceWebsite(sourceUrl, name);
    add(map, org(name, website.website, `${name} is listed in CNCF's LFX Mentorship project directory. Browse its published mentorship projects and skills.`, 'Infrastructure and cloud', technologies(r.technologies), ['Cloud native', 'Mentorship'], true), {
      program: 'lfx', year: 2026, cohort: 'Term 3 · September–November', status: 'unknown', ...provenance(sourceUrl, text, CNCF_REV),
      projects: [{ title: r.program_name_short, url: r.upstream_issue_url || r.issue_url, applicationUrl: r.lfx_url, sourceStatus: 'accepted' }],
      ...(safeUrl(r.lfx_url) ? { applicationUrl: r.lfx_url } : {}),
    });
  }
  return [...map.values()];
}

async function importOutreachy() {
  const indexUrl = 'https://www.outreachy.org/past-projects/';
  const index = await fetchText(indexUrl);
  const rounds = [...index.matchAll(/<a href="([^"]+)">((?:May|June|December) (202[0-6]) Outreachy internship cohort)<\/a>/g)]
    .filter(m => !m[2].startsWith('December 2026')).map(m => ({ url: new URL(m[1], indexUrl).href, year: +m[3], cohort: m[2].replace(' Outreachy internship cohort', '') }));
  assert(rounds.length >= 7, 'Outreachy archive structure changed');
  const pages = await mapLimit(rounds, async r => ({ ...r, text: await fetchText(r.url) }));
  const map = new Map();
  for (const { url, year, cohort, text } of pages) {
    const section = text.split(/<h1>Past Participating Communities<\/h1>|<h1>Participating Communities<\/h1>/i)[1];
    assert(section, `No public community section: ${url}`);
    const blocks = [...section.matchAll(/<h4>([\s\S]*?)<\/h4>([\s\S]*?)(?=<h4>|<div class="footer">|$)/g)];
    assert(blocks.length >= 3, `Outreachy community coverage changed: ${url}`);
    let count = 0;
    for (const [, nameHtml, block] of blocks) {
      const name = plain(nameHtml); const description = plain(block.match(/<p>([\s\S]*?)<\/p>/)?.[1]) || `${name} has participated in Outreachy.`;
      const landing = block.match(/href="([^"]+\/communities\/[^\"]+)"/)?.[1];
      const sourceUrl = landing ? new URL(landing, url).href : url;
      const projects = [...block.matchAll(/<div class="card border" id="([^"]+)"[^>]*>([\s\S]*?)(?=<div class="card border"|$)/g)]
        .map(([, id, card]) => ({ title: plain(card.match(/<p><strong>([\s\S]*?)<\/strong><\/p>/)?.[1]), url: `${url}#${id}` })).filter(p => p.title);
      // Some listed communities have no public project cards. Preserve the community
      // participation without fabricating a project or scraping hidden detail pages.
      const publicCards = [...block.matchAll(/<div class="card border" id=/g)].length;
      assert(projects.length === publicCards, `Outreachy project markup changed for ${name} (${url})`);
      const skills = [...block.matchAll(/<div class="col-sm card-text border">([\s\S]*?)<\/div>/g)].map(m => plain(m[1])).join(', ');
      const row = org(name, sourceUrl, description, 'Open source communities', technologies(skills), ['Open source', 'Outreachy'], true);
      add(map, row, { program: 'outreachy', year, cohort, status: 'historical', ...provenance(url, text), sourceLicense: 'CC-BY-3.0', sourceAttribution: 'Outreachy / Software Freedom Conservancy', projects });
      count += projects.length;
    }
    console.log(`outreachy ${cohort}: ${blocks.length} communities, ${count} public project titles`);
  }
  return [...map.values()];
}

async function importC4gt() {
  const page = 'Dedicated-Mentoring-Program-2025-%E2%80%90-Project-List';
  const sourceUrl = `https://github.com/CodeForGoodTech/C4GT/wiki/${page}`;
  const text = await fetchText(`https://raw.githubusercontent.com/wiki/CodeForGoodTech/C4GT/${page}.md`);
  const lines = text.split('\n').filter(line => /^\|\s*\d+\s*\|/.test(line));
  assert(lines.length === 105, `C4GT reviewed 2025 table changed (${lines.length} rows); review before updating count`);
  const map = new Map();
  for (const line of lines) {
    const cells = line.split('|').slice(1).map(plain);
    const rawCells = line.split('|').slice(1);
    assert(cells.length >= 8, 'Malformed C4GT table');
    const name = cells[1]; const title = cells[3]; const url = urlIn(rawCells[4]);
    assert(name && title && safeUrl(url), `Invalid C4GT row ${cells[0]}`);
    const website = sourceWebsite(sourceUrl, name);
    add(map, org(name, website.website, `${name} listed ${cells[2]} projects in Code for Good Tech's 2025 Dedicated Mentoring Program.`, 'Social impact', technologies(cells[5]), ['Digital public goods', 'Social impact'], true), {
      program: 'c4gt', year: 2025, cohort: 'Dedicated Mentoring Program 2025', status: 'historical', ...provenance(sourceUrl, text),
      projects: [{ title, url, product: cells[2], sourceStatus: 'listed' }],
    });
  }
  return [...map.values()];
}

async function importEsoc() {
  const sourceUrl = `https://github.com/european-summer-of-code/esoc2026/blob/${ESOC_REV}/README.md`;
  const text = await fetchText(`https://raw.githubusercontent.com/european-summer-of-code/esoc2026/${ESOC_REV}/README.md`);
  const section = text.split('# 2026 Project list')[1]; assert(section, 'ESoC project section missing');
  const blocks = [...section.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm)];
  assert(blocks.length === 11, `ESoC reviewed project-card count changed: ${blocks.length}`);
  const map = new Map();
  const identity = {
    'CLAAS - Embedded AI for Predictive Sensor Systems in Agriculture 4.0': ['CLAAS', 'https://www.claas.com/', 'Embedded AI for predictive agricultural sensor systems.'],
    'AI for automated drug discovery with pyaptamer': ['pyaptamer', 'https://github.com/gc-os-ai/pyaptamer', 'Open source tools for in-silico aptamer generation.'],
    'sktime agentic': ['sktime', 'https://github.com/sktime/sktime', 'A unified framework for machine learning with time series.'],
    'AI-on-Demand platform': ['AI-on-Demand', 'https://github.com/aiondemand/aiondemand', 'An open platform and metadata catalogue for AI resources.'],
    'pytorch-forecasting & dsip-ts': ['pytorch-forecasting', 'https://github.com/sktime/pytorch-forecasting', 'Deep learning for time series forecasting with PyTorch.'],
  };
  for (const [, heading, block] of blocks) {
    const title = plain(heading); const links = mdLinks(block);
    const [name, website, summary] = identity[title] || [title, links.find(l => l.title === 'GitHub repo')?.url, plain(block.match(/^\*\*(?!APPLICATIONS)(.+?)\*\*$/m)?.[1])];
    assert(safeUrl(website), `ESoC website missing: ${title}`);
    const deadline = block.match(/\* Deadline: (March|April) (\d+), 18:00 UTC/);
    const applicationDeadline = deadline ? `2026-${deadline[1] === 'March' ? '03' : '04'}-${deadline[2].padStart(2, '0')}T18:00:00Z` : undefined;
    const cardUrl = `${sourceUrl}#${slug(title)}`;
    const ideas = links.filter(l => /project ideas|starter project|detail info sheet|sktime agentic project ideas|mentored projects/i.test(l.title));
    // A card is a listed opportunity, not proof of an accepted contributor/project.
    const projects = ideas.length ? ideas.map(l => ({ title: `${title}: ${l.title}`, url: l.url, sourceStatus: 'listed' })) : [{ title, url: cardUrl, sourceStatus: 'listed' }];
    add(map, org(name, website, summary || `${name} offers mentored projects through European Summer of Code.`, 'Data and science', technologies(block), ['Artificial intelligence', 'Research']), {
      program: 'esoc', year: 2026, cohort: deadline?.[1] === 'April' ? 'Batch 2' : 'Batch 1',
      status: /APPLICATIONS CLOSED/.test(block) ? 'closed' : 'unknown', ...provenance(cardUrl, text, ESOC_REV),
      projects, applicationUrl: 'https://github.com/european-summer-of-code/esoc2026#application-process',
      ...(applicationDeadline ? { applicationDeadline } : {}),
    });
  }
  return [...map.values()];
}

async function importSok() {
  const sourceUrl = 'https://mentorship.kde.org/blog/2025-01-19-sok-25-welcome/';
  const text = await fetchText(sourceUrl);
  const projectIds = ['animated-transition-preview-for-kdenlive', 'audiotube-youtube-music-app', 'add-kalah-to-mankala-engine', 'add-pallanguzhipallanguli-to-mankala-engine', 'improve-mankala-gui', 'remote-multiplayer-mode-for-mankala', 'documentation', 'pdf-application-comparison', 'win2linux-chooser'];
  const projects = projectIds.map(id => {
    const match = text.match(new RegExp(`<h[12] id=["']?${id}["']?>([\\s\\S]*?)<\\/h[12]>`));
    assert(match, `KDE reviewed heading missing: ${id}`);
    return { title: plain(match[1]), url: `${sourceUrl}#${id}`, sourceStatus: 'selected' };
  });
  const row = org('KDE', 'https://kde.org/', 'KDE creates free software for desktop and mobile computers. Season of KDE supports mentored contributions across its community.', 'End user applications', [], ['Desktop', 'Community', 'Mentorship']);
  row.participations.push({ program: 'sok', year: 2025, cohort: 'Season of KDE 2025', status: 'historical', ...provenance(sourceUrl, text), sourceLicense: 'CC-BY-SA-4.0', sourceAttribution: 'Benson Muite / KDE Mentorship', projects });
  return [row];
}

function validate(rows) {
  assert(Array.isArray(rows) && rows.length, 'No supplemental organizations');
  const seen = new Set();
  for (const row of rows) {
    assert(row.name && row.description && safeUrl(row.website), `Invalid org ${row.name}`);
    const key = row.name.toLowerCase(); assert(!seen.has(key), `Duplicate org ${row.name}`); seen.add(key);
    assert(Array.isArray(row.technologies) && Array.isArray(row.topics) && row.participations.length, `Invalid fields for ${row.name}`);
    for (const p of row.participations) {
      assert(['lfx', 'outreachy', 'c4gt', 'esoc', 'sok'].includes(p.program) && Number.isInteger(p.year) && p.cohort, `Invalid participation ${row.name}`);
      assert(['historical', 'unknown', 'open', 'closed', 'upcoming'].includes(p.status) && safeUrl(p.sourceUrl) && /^\d{4}-\d{2}-\d{2}$/.test(p.verifiedAt), `Invalid provenance ${row.name}`);
      assert(Array.isArray(p.projects) && p.projects.every(project => project.title && safeUrl(project.url)), `Invalid projects ${row.name}`);
      if (p.applicationUrl) assert(safeUrl(p.applicationUrl), `Invalid application URL ${row.name}`);
    }
  }
}
const IMPORTERS = { lfx: importLfx, outreachy: importOutreachy, c4gt: importC4gt, esoc: importEsoc, sok: importSok };
async function main() {
  const programs = only || Object.keys(IMPORTERS);
  assert(programs.every(p => IMPORTERS[p]), `Unknown program in --only: ${programs}`);
  let previous = []; try { previous = JSON.parse(await readFile(OUTPUT, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const map = new Map();
  for (const row of previous) {
    const participations = row.participations.filter(p => !programs.includes(p.program));
    for (const p of participations) add(map, { ...row, participations: [] }, p);
  }
  // Fetch all selected sources before replacing a single byte of the prior snapshot.
  for (const program of programs) {
    const rows = await IMPORTERS[program]();
    for (const row of rows) for (const p of row.participations) add(map, { ...row, participations: [] }, p);
    console.log(`${program}: ${rows.length} organizations, ${rows.reduce((n, r) => n + r.participations.reduce((m, p) => m + p.projects.length, 0), 0)} projects`);
  }
  const rows = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const row of rows) row.participations.sort((a, b) => b.year - a.year || a.program.localeCompare(b.program) || a.cohort.localeCompare(b.cohort));
  validate(rows);
  if (check) { console.log(`Validated ${rows.length} organizations; --check leaves the saved snapshot unchanged.`); return; }
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  const temp = `${OUTPUT}.tmp`;
  await writeFile(temp, `${JSON.stringify(rows, null, 2)}\n`);
  await rename(temp, OUTPUT);
  console.log(`Saved ${rows.length} source-backed organizations to data/supplemental.json`);
}
main().catch(error => { console.error(`Import failed; previous snapshot preserved. ${error.message}`); process.exitCode = 1; });
