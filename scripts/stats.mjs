// Builds assets/stats.svg from public GitHub data for the personal and work accounts.
import { writeFileSync } from "node:fs";

const PERSONAL = "ajithakdev";
const WORK = "ajithakdev-valor"; // private work repos; only the public contribution count is read

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

const YEAR = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){
  contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions}}}}`;

async function contributions(login, from, to) {
  const d = await gql(YEAR, { login, from: from.toISOString(), to: to.toISOString() });
  return d.user.contributionsCollection.contributionCalendar.totalContributions;
}

async function allTime(login) {
  const { user } = await gql(`query($login:String!){user(login:$login){createdAt}}`, { login });
  const now = new Date();
  let total = 0;
  // the API caps each window at one year
  for (let from = new Date(user.createdAt); from < now; ) {
    const to = new Date(Math.min(now, new Date(from).setFullYear(from.getFullYear() + 1)));
    total += await contributions(login, from, to);
    from = to;
  }
  return total;
}

const yearAgo = new Date(Date.now() - 365 * 864e5);
const [pAll, wAll, pYear, wYear, me] = await Promise.all([
  allTime(PERSONAL),
  allTime(WORK),
  contributions(PERSONAL, yearAgo, new Date()),
  contributions(WORK, yearAgo, new Date()),
  gql(`query($login:String!){user(login:$login){
    pullRequests{totalCount}
    repositories(ownerAffiliations:OWNER,isFork:false,first:100,privacy:PUBLIC){totalCount nodes{stargazerCount}}}}`, { login: PERSONAL }),
]);

const stats = {
  all: pAll + wAll, pAll, wAll, year: pYear + wYear,
  prs: me.user.pullRequests.totalCount,
  repos: me.user.repositories.totalCount,
  stars: me.user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
};
for (const [k, v] of Object.entries(stats)) {
  if (!Number.isInteger(v) || v < 0) throw new Error(`bad stat ${k}=${v}`);
}

const n = (v) => v.toLocaleString("en-US");
const lines = [
  ["$ ", "whoami", "cmd"],
  ["", "ajith · backend engineer · bangalore", "out"],
  ["$ ", "gh stats --accounts personal,work", "cmd"],
  ["", `contributions, all time  ${n(stats.all).padStart(8)}`, "hi"],
  ["", `  personal               ${n(stats.pAll).padStart(8)}`, "out"],
  ["", `  work (private repos)   ${n(stats.wAll).padStart(8)}`, "out"],
  ["", `last 12 months           ${n(stats.year).padStart(8)}`, "hi"],
  ["", `pull requests opened     ${n(stats.prs).padStart(8)}`, "out"],
  ["", `public repos · stars     ${`${stats.repos} · ${stats.stars}`.padStart(8)}`, "out"],
  ["$ ", "_", "cmd"],
];
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const H = 60 + lines.length * 24;
const body = lines.map(([p, t, cls], i) =>
  `<text x="24" y="${70 + i * 24}" class="${cls} l" style="animation-delay:${(i * 0.35).toFixed(2)}s">` +
  `${p ? `<tspan class="p">${p}</tspan>` : ""}${esc(t)}</text>`).join("\n  ");

writeFileSync("assets/stats.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="872" height="${H}" viewBox="0 0 872 ${H}">
<style>
  text{font:14px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}
  .cmd{fill:#e6edf3}.out{fill:#8b949e}.hi{fill:#8ea3ff;font-weight:600}.p{fill:#3fb950}
  .l{opacity:0;animation:in .4s ease forwards}
  @keyframes in{to{opacity:1}}
  @media (prefers-reduced-motion:reduce){.l{animation:none;opacity:1}}
</style>
<rect width="872" height="${H}" rx="14" fill="#0d1117" stroke="#30363d"/>
<circle cx="22" cy="22" r="6" fill="#ff5f57"/><circle cx="42" cy="22" r="6" fill="#febc2e"/><circle cx="62" cy="22" r="6" fill="#28c840"/>
<text x="436" y="27" text-anchor="middle" class="out" style="font-size:12px">ajith@github: ~</text>
${body}
</svg>
`);
console.log(stats);

// Work account heatmap: the personal one already shows on the profile page.
const { user: work } = await gql(`query($login:String!){user(login:$login){contributionsCollection{
  contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`, { login: WORK });
const cal = work.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays);
if (days.reduce((s, d) => s + d.contributionCount, 0) !== cal.totalContributions) throw new Error("calendar sum mismatch");

const active = days.filter((d) => d.contributionCount).length;
const busiest = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a));

const LEVEL = { NONE: "#161b22", FIRST_QUARTILE: "#1f2a52", SECOND_QUARTILE: "#34449a", THIRD_QUARTILE: "#5b6fd6", FOURTH_QUARTILE: "#8ea3ff" };
const C = 12, G = 3, X0 = 40, Y0 = 168;
const gridW = cal.weeks.length * (C + G) - G, W = gridW + 2 * X0, TW = (gridW - 3 * 14) / 4;
const fmtDay = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const cells = cal.weeks.map((w, wi) => w.contributionDays.map((d) => {
  const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
  const x = X0 + wi * (C + G), y = Y0 + dow * (C + G);
  const peak = d === busiest ? " pk" : "";
  return `<rect x="${x}" y="${y}" width="${C}" height="${C}" rx="3" fill="${LEVEL[d.contributionLevel]}" class="c${peak}" style="animation-delay:${(0.6 + wi * 0.025).toFixed(3)}s"><title>${fmtDay(d.date)}: ${d.contributionCount}</title></rect>`;
}).join("")).join("\n  ");

let lastMonth = -1;
const months = cal.weeks.map((w, wi) => {
  const m = new Date(w.contributionDays[0].date + "T00:00:00Z").getUTCMonth();
  if (m === lastMonth || wi === 0 || wi > cal.weeks.length - 3) { lastMonth = m; return ""; }
  lastMonth = m;
  return `<text x="${X0 + wi * (C + G)}" y="${Y0 - 10}" class="mo">${new Date(Date.UTC(2000, m)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</text>`;
}).join("");

const tiles = [
  ["contributions", n(cal.totalContributions)],
  ["active days", `${active}`],
  ["per active day", (cal.totalContributions / active).toFixed(1)],
  ["peak day", `${busiest.contributionCount} · ${fmtDay(busiest.date)}`],
].map(([k, v], i) => {
  const x = X0 + i * (TW + 14);
  return `<g class="t" style="animation-delay:${(0.15 + i * 0.12).toFixed(2)}s">
    <rect x="${x}" y="58" width="${TW}" height="64" rx="10" fill="#0f141c" stroke="#222b38"/>
    <text x="${x + 16}" y="82" class="k">${k}</text><text x="${x + 16}" y="108" class="v">${v}</text></g>`;
}).join("\n  ");

const WH = Y0 + 7 * (C + G) + 52;
const legend = Object.values(LEVEL).map((f, i) => `<rect x="${X0 + gridW - 5 * 16 + i * 16 - 36}" y="${WH - 34}" width="12" height="12" rx="3" fill="${f}"/>`).join("");

writeFileSync("assets/work.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${WH}" viewBox="0 0 ${W} ${WH}">
<defs>
  <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="#8ea3ff" stop-opacity="0"/><stop offset=".85" stop-color="#8ea3ff" stop-opacity=".22"/><stop offset="1" stop-color="#c9d3ff" stop-opacity=".9"/></linearGradient>
  <clipPath id="grid"><rect x="${X0 - 2}" y="${Y0 - 2}" width="${gridW + 2}" height="${7 * (C + G) + 2}"/></clipPath>
</defs>
<style>
  text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  .h{font-size:13px;fill:#e6edf3;font-weight:600}.s{font-size:12px;fill:#6e7681}
  .k{font-size:11px;fill:#6e7681;letter-spacing:.08em;text-transform:uppercase}.v{font-size:20px;fill:#e6edf3;font-weight:600}
  .mo{font-size:10px;fill:#6e7681}
  .c{transform-box:fill-box;transform-origin:center;opacity:0;animation:pop .45s cubic-bezier(.2,.9,.3,1.3) forwards}
  .t{opacity:0;animation:rise .6s ease forwards}
  .pk{stroke:#c9d3ff;stroke-width:1.5}
  .dot{animation:pulse 2s ease-in-out infinite}
  .sweep{animation:sweep 5s linear 2.4s infinite;opacity:0}
  @keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
  @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes pulse{50%{opacity:.25}}
  @keyframes sweep{0%{opacity:1;transform:translateX(0)}90%{opacity:1}100%{opacity:0;transform:translateX(${gridW}px)}}
  @media (prefers-reduced-motion:reduce){.c,.t{animation:none;opacity:1}.sweep,.dot{animation:none}}
</style>
<rect width="${W}" height="${WH}" rx="14" fill="#0b0f16" stroke="#222b38"/>
<circle cx="${X0 + 4}" cy="31" r="4.5" fill="#3fb950" class="dot"/>
<text x="${X0 + 18}" y="35" class="h">work / healthcare-saas</text>
<text x="${W - X0}" y="35" class="s" text-anchor="end">private repos · last 12 months · synced daily</text>
<line x1="${X0}" y1="46" x2="${W - X0}" y2="46" stroke="#1b2230"/>
  ${tiles}
  ${months}
  ${cells}
<g clip-path="url(#grid)"><rect x="${X0 - 60}" y="${Y0 - 2}" width="60" height="${7 * (C + G) + 2}" fill="url(#scan)" class="sweep"/></g>
<text x="${X0}" y="${WH - 24}" class="s">each cell is one day of commits, reviews and PRs in private work repos</text>
<text x="${X0 + gridW - 5 * 16 - 43}" y="${WH - 24}" class="s" text-anchor="end">less</text>${legend}<text x="${X0 + gridW - 30}" y="${WH - 24}" class="s">more</text>
</svg>
`);
console.log({ work: { total: cal.totalContributions, active, busiest } });
