// Builds the profile README's live parts from public GitHub data: the metrics card (dark and light)
// and the project, upstream and writing blocks between markers. Work commits reach this account's
// own calendar through private mirror repos (activity-sync-engine), so they are not added again here.
import { readFileSync, writeFileSync } from "node:fs";
import { trend, polyline } from "./trend.mjs";

const LOGIN = "ajithakdev";
const FEATURED = "claude-desktop-rpm";
const FEATURED_ABOUT = "Installs Anthropic's official Claude Desktop on Fedora: checksum-verified, no root, updates itself. Fixes dark mode, the tray icon, GNOME search and Cowork (KVM). One Bash script.";

// [name, live URL, label shown, what it is, built with]; each URL is checked on every run for the status dot
const LIVE = [
  ["Toolglass", "https://toolglass.ajithakdev.com", "toolglass.ajithakdev.com", "41 developer tools, all client-side", "React, TypeScript, Vite, offline PWA"],
  ["MeterX", "https://meterx.ajithakdev.com", "meterx.ajithakdev.com", "Speed test extension with a bufferbloat grade", "WebExtension, Cloudflare Workers"],
  ["Minnoli", "https://minnoli.ajithakdev.com", "minnoli.ajithakdev.com", "Fetches Tamil Nadu electricity bills", "Next.js, Tesseract.js OCR, AES-GCM in the browser"],
  ["Auraksha Finds", "https://aurakshafinds.ajithakdev.com", "aurakshafinds.ajithakdev.com", "Storefront on the edge", "Astro, Cloudflare D1 with Drizzle, R2"],
  ["media", "https://media.ajithakdev.com", "media.ajithakdev.com", "Write-ups of production bugs and fixes", "Static Astro, RSS"],
];

async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${process.env.GH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

const d = await gql(`query($login:String!,$featured:String!,$prs:String!,$up:String!){
  user(login:$login){
    createdAt
    repositories(ownerAffiliations:OWNER,isFork:false,first:100,privacy:PUBLIC){nodes{stargazerCount}}
    featured:repository(name:$featured){stargazerCount url latestRelease{tagName publishedAt}
      releases(first:100){nodes{releaseAssets(first:20){nodes{downloadCount}}}}}
  }
  prs:search(query:$prs,type:ISSUE){issueCount}
  up:search(query:$up,type:ISSUE,first:20){nodes{... on PullRequest{title url number mergedAt repository{nameWithOwner}}}}
}`, {
  login: LOGIN, featured: FEATURED,
  prs: `author:${LOGIN} is:pr is:public`,
  up: `author:${LOGIN} is:pr is:merged is:public -user:${LOGIN} sort:updated-desc`,
});

// the API caps each contributions window at one year.
// shortcut: private work commits show as restricted contributions to the Actions token, which also counts
// the odd private issue or PR; fine at this scale, split them only if the profile enables private detail.
const now = new Date();
let commits = 0;
for (let from = new Date(d.user.createdAt); from < now; ) {
  const to = new Date(Math.min(now, new Date(from).setFullYear(from.getFullYear() + 1)));
  const { user } = await gql(`query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){
    contributionsCollection(from:$from,to:$to){totalCommitContributions restrictedContributionsCount}}}`,
  { login: LOGIN, from: from.toISOString(), to: to.toISOString() });
  commits += user.contributionsCollection.totalCommitContributions + user.contributionsCollection.restrictedContributionsCount;
  from = to;
}

const up = await Promise.all(LIVE.map(async ([, url]) => {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "ajithakdev-profile-cards (+https://github.com/ajithakdev/ajithakdev)" } });
    return res.ok;
  } catch { return false; }
}));

const f = d.user.featured;
const upstream = d.up.nodes.filter((p) => p.mergedAt);
const stats = {
  // every release asset, the same total shields.io's downloads badge shows
  downloads: f.releases.nodes.flatMap((r) => r.releaseAssets.nodes).reduce((s, a) => s + a.downloadCount, 0),
  stars: d.user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
  prs: d.prs.issueCount,
  commits,
};
for (const [k, v] of Object.entries(stats)) {
  if (!Number.isInteger(v) || v < 0) throw new Error(`bad stat ${k}=${v}`);
}

// one total per UTC day; GitHub keeps no download history, so the sparkline grows from the first run
const HISTORY = "data/downloads.json";
let history = {};
try { history = JSON.parse(readFileSync(HISTORY, "utf8")); } catch (e) { if (e.code !== "ENOENT") throw e; }
history[now.toISOString().slice(0, 10)] = stats.downloads;
writeFileSync(HISTORY, `${JSON.stringify(history, null, 1)}\n`);
const tr = trend(history);

const n = (v) => v.toLocaleString("en-US");
const count = (v, word) => `${n(v)} ${word}${v === 1 ? "" : "s"}`;
// titles come from other people's repos and the RSS feed: keep them plain text inside a markdown link
const plain = (t) => t.replace(/[[\]<>`*_!]/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

// ---------- metrics card, one file per GitHub theme ----------
const THEMES = {
  dark: { bg: "#0d1117", line: "#30363d", ink: "#e6edf3", muted: "#9198a1", up: "#3fb950" },
  light: { bg: "#ffffff", line: "#d1d9e0", ink: "#1f2328", muted: "#59636e", up: "#1a7f37" },
};
const W = 840, H = 132, PAD = 28;
const tiles = [
  [n(stats.downloads), "release downloads", FEATURED],
  [n(stats.stars), "stars", "across public repos"],
  [n(stats.prs), "public pull requests", "own and upstream"],
  [n(stats.commits), "commits", "all time, incl. private work"],
];
const TW = (W - 2 * PAD) / tiles.length;
const gain = tr && `${tr.gain < 0 ? "" : "+"}${n(tr.gain)} in ${tr.span}`;
// right edge of the sparkline and its label inside the first tile.
// shortcut: clears totals up to 5 digits at 30px; revisit if downloads pass 99,999
const RX = PAD + TW - 22;

for (const [name, t] of Object.entries(THEMES)) {
  const cells = tiles.map(([v, label, sub], i) => {
    const x = PAD + i * TW;
    return `${i ? `<line x1="${x - 14}" y1="${PAD + 4}" x2="${x - 14}" y2="${PAD + 70}" stroke="${t.line}"/>` : ""}
  <text x="${x}" y="${PAD + 30}" class="v">${v}</text>
  <text x="${x}" y="${PAD + 54}" class="l">${label}</text>
  <text x="${x}" y="${PAD + 72}" class="s">${sub}</text>`;
  }).join("\n  ") + (tr ? `
  <polyline points="${polyline(tr.pts, 64, 14)}" transform="translate(${RX - 64} ${PAD + 2})" fill="none" stroke="${t.up}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <text x="${RX}" y="${PAD + 30}" class="g" text-anchor="end">${gain}d</text>` : "");
  writeFileSync(`assets/metrics-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tiles.map(([v, l, s]) => `${v} ${l} (${s})`).join(", ")}${gain ? `, downloads ${gain} days` : ""}">
<style>
  text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
  .v{font-size:30px;font-weight:600;fill:${t.ink};letter-spacing:-.01em}.l{font-size:14px;fill:${t.ink}}.s{font-size:12px;fill:${t.muted}}.g{font-size:11px;font-weight:600;fill:${t.up}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="6" fill="${t.bg}" stroke="${t.line}"/>
  ${cells}
<text x="${W - PAD}" y="${H - 12}" class="s" text-anchor="end" style="font-size:11px">updated ${day(now)}</text>
</svg>
`);
}

// ---------- README blocks between markers ----------
const rel = f.latestRelease;
const blocks = {
  featured: `**[${FEATURED}](${f.url})** · ${[rel && `${rel.tagName}, ${day(rel.publishedAt)}`, count(f.stargazerCount, "star")].filter(Boolean).join(" · ")}\
<br />\n${FEATURED_ABOUT}`,
  live: [
    "| | Product | What it is | Built with |",
    "| :-: | --- | --- | --- |",
    ...LIVE.map(([name, url, label, about, stack], i) =>
      `| <img src="assets/${up[i] ? "up" : "down"}.svg" width="14" height="14" alt="${up[i] ? "up" : "down"}" /> | **${name}**<br /><sub><a href="${url}">${label}</a></sub> | ${about} | ${stack} |`),
  ].join("\n"),
  upstream: upstream.length
    ? upstream.map((p) => `- [${p.repository.nameWithOwner}#${p.number}](${p.url}): ${plain(p.title)} · merged ${day(p.mergedAt)}`).join("\n")
    : null,
};

// a feed failure keeps the last list rather than failing the run
try {
  const res = await fetch("https://media.ajithakdev.com/rss.xml", { headers: { "User-Agent": "ajithakdev-profile-cards (+https://github.com/ajithakdev/ajithakdev)" } });
  const xml = await res.text();
  if (!res.ok) throw new Error(`rss http ${res.status}`);
  const unxml = (t) => t.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const tag = (item, t) => unxml(item.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "").trim();
  const posts = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3).map(([, it]) => ({
    title: tag(it, "title"), link: tag(it, "link"), date: day(tag(it, "pubDate")),
  }));
  if (!posts.length || posts.some((p) => !p.title || !p.link.startsWith("https://media.ajithakdev.com/"))) throw new Error("rss parse failed");
  blocks.writing = posts.map((p) => `- [${plain(p.title)}](${p.link}) · ${p.date}`).join("\n");
} catch (e) {
  console.warn(`::warning::latest writing not updated: ${e.message}`);
}

let readme = readFileSync("README.md", "utf8");
for (const [key, body] of Object.entries(blocks)) {
  if (!body) continue;
  const re = new RegExp(`(<!-- ${key}:start -->)[\\s\\S]*?(<!-- ${key}:end -->)`);
  if (!re.test(readme)) throw new Error(`${key} markers missing from README`);
  readme = readme.replace(re, (_, a, b) => `${a}\n${body}\n${b}`); // a function, so "$" in titles stays literal
}
writeFileSync("README.md", readme);
console.log(stats, `upstream: ${upstream.length}`);
