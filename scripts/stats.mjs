// Builds the profile cards in assets/ from public GitHub data for the personal and work accounts.
import { writeFileSync } from "node:fs";

const PERSONAL = "ajithakdev";
const WORK = "ajithakdev-valor"; // private work repos; only the public contribution calendar is read
const JOINED = "2024-10-07";

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

const CAL = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){
  contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;

async function calendar(login, from, to) {
  const d = await gql(CAL, { login, from: from.toISOString(), to: to.toISOString() });
  const cal = d.user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  return { total: cal.totalContributions, days };
}

async function allTime(login) {
  const { user } = await gql(`query($login:String!){user(login:$login){createdAt}}`, { login });
  const now = new Date();
  let total = 0;
  // the API caps each window at one year
  for (let from = new Date(user.createdAt); from < now; ) {
    const to = new Date(Math.min(now, new Date(from).setFullYear(from.getFullYear() + 1)));
    total += (await calendar(login, from, to)).total;
    from = to;
  }
  return total;
}

const now = new Date();
const yearAgo = new Date(now - 365 * 864e5);
const thisYear = now.getUTCFullYear();
const years = [];
for (let y = thisYear; y >= +JOINED.slice(0, 4); y--) years.push(y);

const [pAll, pYear, wYear, me, ...workYears] = await Promise.all([
  allTime(PERSONAL),
  calendar(PERSONAL, yearAgo, now),
  calendar(WORK, yearAgo, now),
  gql(`query($login:String!,$prs:String!){search(query:$prs,type:ISSUE){issueCount} user(login:$login){
    repositories(ownerAffiliations:OWNER,isFork:false,first:100,privacy:PUBLIC){totalCount nodes{stargazerCount}}}}`, { login: PERSONAL, prs: `author:${PERSONAL} is:pr is:public` }),
  ...years.map((y) => calendar(WORK, new Date(Date.UTC(y, 0, 1)), new Date(Math.min(now, Date.UTC(y, 11, 31, 23, 59, 59))))),
]);

// keep each year's own days, and check they add up to GitHub's total for that year
workYears.forEach((wy, i) => {
  wy.days = wy.days.filter((d) => d.date.startsWith(String(years[i])));
  if (wy.days.reduce((s, d) => s + d.contributionCount, 0) !== wy.total) throw new Error(`calendar sum mismatch for ${years[i]}`);
});

const wAll = workYears.flatMap((y) => y.days).filter((d) => d.date >= JOINED).reduce((s, d) => s + d.contributionCount, 0);

const stats = {
  all: pAll + wAll, pAll, wAll, year: pYear.total + wYear.total,
  prs: me.search.issueCount,
  repos: me.user.repositories.totalCount,
  stars: me.user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
};
for (const [k, v] of Object.entries(stats)) {
  if (!Number.isInteger(v) || v < 0) throw new Error(`bad stat ${k}=${v}`);
}

const n = (v) => v.toLocaleString("en-US");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmtDay = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const FONT = `text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}`;
const BG = "#0b0f16", LINE = "#222b38", INK = "#e6edf3", MUTED = "#6e7681", ACCENT = "#8ea3ff";

// grid geometry shared by every card so they line up in the README
const C = 11, G = 3, COLS = 54, X0 = 40, LABEL = 96;
const GX = X0 + LABEL, GW = COLS * (C + G) - G, W = GX + GW + X0;
const panel = (h) => `<rect width="${W}" height="${h}" rx="14" fill="${BG}" stroke="${LINE}"/>`;

// ---------- hero ----------
{
  const H = 270;
  const nodes = {
    client: [W - 400, 46, "client"], api: [W - 190, 46, "api · node.js"],
    sqs: [W - 190, 120, "queue · sqs"], worker: [W - 400, 120, "worker"],
    db: [W - 400, 194, "documentdb"], s3: [W - 190, 194, "s3"],
  };
  const NW = 150, NH = 34;
  const mid = (k) => [nodes[k][0] + NW / 2, nodes[k][1] + NH / 2];
  const [cx, cy] = mid("client"), [ax, ay] = mid("api"), [qx, qy] = mid("sqs"), [wx, wy] = mid("worker"), [dx, dy] = mid("db"), [sx, sy] = mid("s3");
  const main = `M${cx + NW / 2},${cy} H${ax - NW / 2} M${ax},${ay + NH / 2} V${qy - NH / 2} M${qx - NW / 2},${qy} H${wx + NW / 2} M${wx},${wy + NH / 2} V${dy - NH / 2}`;
  const flow = `M${cx + NW / 2},${cy} H${ax} V${qy} H${wx} V${dy - NH / 2}`;
  const side = `M${wx + NW / 2},${wy + 8} L${sx - NW / 2},${sy - 8}`;
  const box = Object.entries(nodes).map(([k, [x, y, label]], i) =>
    `<g class="nd" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s"><rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="8" fill="#0f141c" stroke="${k === "api" ? ACCENT : LINE}"/>` +
    `<circle cx="${x + 14}" cy="${y + NH / 2}" r="3" fill="${k === "api" ? ACCENT : "#3fb950"}"/><text x="${x + 26}" y="${y + 21}" class="nl">${label}</text></g>`).join("\n  ");
  const packets = [0, 1.2, 2.4].map((b) =>
    `<circle r="3.5" fill="${ACCENT}" filter="url(#glow)" class="pkt" style="offset-path:path('${flow}');animation-delay:${b + 1}s"/>`).join("") +
    `<circle r="3" fill="#3fb950" class="pkt" style="offset-path:path('${side}');animation-duration:1.8s;animation-delay:2.2s"/>`;
  const taglines = ["node.js · typescript · mongodb · aws", "a 26s patient-list query, now 19s", "tools that keep your data on your machine"];
  const rot = taglines.map((t, i) => `<text x="${X0}" y="196" class="tg" style="animation-delay:${0.6 + i * 3}s"><tspan fill="#3fb950">›</tspan> ${esc(t)}</text>`).join("");

  writeFileSync("assets/hero.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#1b2230"/></pattern>
  <radialGradient id="halo" cx="0.2" cy="0.45" r="0.5"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".16"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>
  <filter id="glow" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<style>
  ${FONT}
  .nm{font:700 48px system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;fill:${INK};letter-spacing:-.02em}
  .sub{font-size:14px;fill:#8b949e}.path{font-size:12px;fill:${ACCENT}}.s{font-size:12px;fill:${MUTED}}
  .nl{font-size:12px;fill:#c9d1d9}
  .tg{font-size:15px;fill:${INK};opacity:0;animation:rot 9s infinite}
  .edge{fill:none;stroke:#2d3a55;stroke-width:1.5;stroke-dasharray:4 5;animation:dash 1.2s linear infinite}
  .nd{opacity:0;animation:rise .6s ease forwards}.in{opacity:0;animation:rise .7s ease forwards}
  .dot{animation:pulse 2s ease-in-out infinite}
  .pkt{offset-distance:0;opacity:0;animation:travel 3.6s linear infinite}
  @keyframes travel{0%{offset-distance:0;opacity:0}6%,92%{opacity:1}100%{offset-distance:100%;opacity:0}}
  @keyframes rot{0%{opacity:0;transform:translateY(8px)}4%,30%{opacity:1;transform:none}34%,100%{opacity:0;transform:translateY(-8px)}}
  @keyframes dash{to{stroke-dashoffset:-9}}
  @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes pulse{50%{opacity:.25}}
  @media (prefers-reduced-motion:reduce){.nd,.in{animation:none;opacity:1}.tg{animation:none}.tg:first-of-type{opacity:1}.edge,.dot,.pkt{animation:none}.pkt{opacity:0}}
</style>
${panel(H)}
<rect width="${W}" height="${H}" rx="14" fill="url(#dots)"/><rect width="${W}" height="${H}" rx="14" fill="url(#halo)"/>
<g class="in"><text x="${X0}" y="70" class="path">~/ajithakdev</text>
<text x="${X0}" y="124" class="nm">Ajith Kumar</text>
<text x="${X0}" y="154" class="sub">backend engineer · healthcare saas · bangalore</text></g>
${rot}
<circle cx="${X0 + 4}" cy="232" r="4" fill="#3fb950" class="dot"/><text x="${X0 + 16}" y="236" class="s">in production since oct 2024</text>
<path d="${main}" class="edge"/><path d="${side}" class="edge"/>
${packets}
  ${box}
</svg>
`);
}

// ---------- terminal ----------
{
  const left = [
    ["$ ", "whoami", "cmd"], ["", "ajith kumar karudasevai", "hi"], ["", "backend engineer @ healthcare saas", "out"], ["", "bangalore, india", "out"],
    ["$ ", "cat stack.txt", "cmd"], ["", "node.js   typescript   express", "out"], ["", "mongodb   documentdb   aws", "out"], ["", "rust      c            python", "out"],
    ["$ ", "_", "cmd blink"],
  ];
  const row = (k, v, cls = "out") => ["", `${k.padEnd(30)}${String(v).padStart(6)}`, cls];
  const right = [
    ["$ ", "gh stats --account personal", "cmd"],
    row("contributions, all time", n(stats.pAll), "hi"),
    row("last 12 months", n(pYear.total)),
    row("public pull requests", n(stats.prs)),
    row("public repos · stars", `${stats.repos} · ${stats.stars}`),
    ["$ ", "gh stats --account work --private", "cmd"],
    row("contributions, since oct 2024", n(stats.wAll), "hi"),
    row("last 12 months", n(wYear.total)),
    ["", `synced ${now.toISOString().slice(0, 10)} · weekly`, "dim"],
  ];
  const H = 62 + Math.max(left.length, right.length) * 24;
  const col = (lines, x, d0) => lines.map(([p, t, cls], i) =>
    `<text x="${x}" y="${72 + i * 24}" class="${cls} l" style="animation-delay:${(d0 + i * 0.22).toFixed(2)}s">${p ? `<tspan class="p">${p}</tspan>` : ""}${esc(t)}</text>`).join("\n  ");
  writeFileSync("assets/stats.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
  ${FONT} text{font-size:14px;white-space:pre}
  .cmd{fill:${INK}}.out{fill:#8b949e}.hi{fill:${ACCENT};font-weight:600}.p{fill:#3fb950}.dim{fill:#484f58;font-size:12px}
  .l{opacity:0;animation:in .35s ease forwards}.blink{animation:in .35s ease forwards,blink 1s steps(1) 3s infinite}
  @keyframes in{to{opacity:1}}@keyframes blink{50%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.l{animation:none;opacity:1}}
</style>
${panel(H)}
<circle cx="22" cy="22" r="6" fill="#ff5f57"/><circle cx="42" cy="22" r="6" fill="#febc2e"/><circle cx="62" cy="22" r="6" fill="#28c840"/>
<text x="${W / 2}" y="27" text-anchor="middle" style="font-size:12px;fill:${MUTED}">ajith@prod: ~</text>
<line x1="0" y1="42" x2="${W}" y2="42" stroke="#1b2230"/><line x1="${W / 2}" y1="42" x2="${W / 2}" y2="${H - 1}" stroke="#1b2230"/>
  ${col(left, X0 - 16, 0.1)}
  ${col(right, W / 2 + 24, 0.5)}
</svg>
`);
}

// ---------- work heatmaps, one row per year ----------
{
  const LEVEL = { NONE: "#161b22", FIRST_QUARTILE: "#1f2a52", SECOND_QUARTILE: "#34449a", THIRD_QUARTILE: "#5b6fd6", FOURTH_QUARTILE: ACCENT };
  const since = workYears.flatMap((y) => y.days).filter((d) => d.date >= JOINED);
  const total = wAll;
  const active = since.filter((d) => d.contributionCount).length;
  const peak = since.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a));
  const today = now.toISOString().slice(0, 10);

  const RH = 7 * (C + G) - G, Y0 = 176, GAP = 30;
  const H = Y0 + years.length * (RH + GAP) + 30;
  const TW = (W - 2 * X0 - 3 * 14) / 4;
  const tiles = [
    ["contributions", n(total)], ["active days", n(active)],
    ["per active day", (total / active).toFixed(1)], ["peak day", `${peak.contributionCount} · ${fmtDay(peak.date).replace(/, \d+$/, "")}`],
  ].map(([k, v], i) => {
    const x = X0 + i * (TW + 14);
    return `<g class="t" style="animation-delay:${(0.15 + i * 0.12).toFixed(2)}s"><rect x="${x}" y="58" width="${TW}" height="64" rx="10" fill="#0f141c" stroke="${LINE}"/>` +
      `<text x="${x + 16}" y="82" class="k">${k}</text><text x="${x + 16}" y="108" class="v">${esc(v)}</text></g>`;
  }).join("\n  ");

  const pos = (y, iso) => {
    const jan1 = Date.UTC(y, 0, 1), t = Date.parse(iso + "T00:00:00Z");
    return [Math.floor(((t - jan1) / 864e5 + new Date(jan1).getUTCDay()) / 7), new Date(t).getUTCDay()];
  };
  const byDate = new Map(workYears.flatMap((y) => y.days).map((d) => [d.date, d]));
  let joinedMark = "";
  const rows = years.map((y, ri) => {
    const top = Y0 + ri * (RH + GAP);
    const yearTotal = workYears[ri].days.filter((d) => d.date >= JOINED).reduce((s, d) => s + d.contributionCount, 0);
    let cells = "";
    for (let t = Date.UTC(y, 0, 1); new Date(t).getUTCFullYear() === y; t += 864e5) {
      const iso = new Date(t).toISOString().slice(0, 10);
      const [c, r] = pos(y, iso);
      const x = GX + c * (C + G), yy = top + r * (C + G);
      const d = byDate.get(iso);
      const delay = `animation-delay:${(0.5 + ri * 0.45 + c * 0.014).toFixed(3)}s`;
      if (iso > today) cells += `<rect x="${x + .5}" y="${yy + .5}" width="${C - 1}" height="${C - 1}" rx="2.5" fill="none" stroke="#131922" class="c" style="${delay}"/>`;
      else if (iso < JOINED) cells += `<rect x="${x}" y="${yy}" width="${C}" height="${C}" rx="2.5" fill="#0f141b" class="c" style="${delay}"/>`;
      else cells += `<rect x="${x}" y="${yy}" width="${C}" height="${C}" rx="2.5" fill="${LEVEL[d?.contributionLevel ?? "NONE"]}" class="c${d === peak ? " pk" : ""}" style="${delay}"><title>${fmtDay(iso)}: ${d?.contributionCount ?? 0}</title></rect>`;
      if (iso === JOINED) joinedMark = `<g class="t" style="animation-delay:${(1 + ri * 0.45).toFixed(2)}s"><line x1="${x + C / 2}" y1="${top - 8}" x2="${x + C / 2}" y2="${top + RH + 4}" stroke="#3fb950" stroke-dasharray="2 3"/>` +
        `<text x="${x + C / 2 - 6}" y="${top - 12}" class="j" text-anchor="end">joined · oct 7</text></g>`;
    }
    return `<text x="${X0}" y="${top + 22}" class="yr">${y}</text><text x="${X0}" y="${top + 42}" class="s">${n(yearTotal)}</text>
  ${cells}
  <g clip-path="url(#r${ri})"><rect x="${GX - 70}" y="${top - 2}" width="70" height="${RH + 4}" fill="url(#scan)" class="sweep" style="animation-delay:${(3 + ri * 1.6).toFixed(1)}s"/></g>`;
  }).join("\n  ");
  const clips = years.map((_, ri) => `<clipPath id="r${ri}"><rect x="${GX - 1}" y="${Y0 + ri * (RH + GAP) - 2}" width="${GW + 2}" height="${RH + 4}"/></clipPath>`).join("");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) =>
    `<text x="${GX + pos(years[0], `${years[0]}-${String(i + 1).padStart(2, "0")}-01`)[0] * (C + G)}" y="${Y0 - 14}" class="mo">${m}</text>`).join("");
  const legend = Object.values(LEVEL).map((f, i) => `<rect x="${W - X0 - 118 + i * 16}" y="${H - 34}" width="11" height="11" rx="2.5" fill="${f}"/>`).join("");

  writeFileSync("assets/work.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0"/><stop offset=".85" stop-color="${ACCENT}" stop-opacity=".2"/><stop offset="1" stop-color="#c9d3ff" stop-opacity=".85"/></linearGradient>
  ${clips}
</defs>
<style>
  ${FONT}
  .h{font-size:13px;fill:${INK};font-weight:600}.s{font-size:12px;fill:${MUTED}}.j{font-size:11px;fill:#3fb950}
  .k{font-size:11px;fill:${MUTED};letter-spacing:.08em;text-transform:uppercase}.v{font-size:20px;fill:${INK};font-weight:600}
  .yr{font-size:18px;fill:${INK};font-weight:600}.mo{font-size:10px;fill:${MUTED}}
  .c{transform-box:fill-box;transform-origin:center;opacity:0;animation:pop .45s cubic-bezier(.2,.9,.3,1.3) forwards}
  .t{opacity:0;animation:rise .6s ease forwards}
  .pk{stroke:#c9d3ff;stroke-width:1.5}
  .dot{animation:pulse 2s ease-in-out infinite}
  .sweep{opacity:0;animation:sweep 6s linear infinite}
  @keyframes pop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
  @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes pulse{50%{opacity:.25}}
  @keyframes sweep{0%{opacity:1;transform:translateX(0)}60%{opacity:1;transform:translateX(${GW + 70}px)}61%,100%{opacity:0;transform:translateX(${GW + 70}px)}}
  @media (prefers-reduced-motion:reduce){.c,.t{animation:none;opacity:1}.sweep,.dot{animation:none}}
</style>
${panel(H)}
<circle cx="${X0 + 4}" cy="31" r="4.5" fill="#3fb950" class="dot"/>
<text x="${X0 + 18}" y="35" class="h">work / healthcare-saas</text>
<text x="${W - X0}" y="35" class="s" text-anchor="end">private repos · since oct 2024 · synced daily</text>
<line x1="${X0}" y1="46" x2="${W - X0}" y2="46" stroke="#1b2230"/>
  ${tiles}
  ${months}
  ${rows}
  ${joinedMark}
<text x="${X0}" y="${H - 24}" class="s">each cell is one day of commits, reviews and PRs in private work repos</text>
<text x="${W - X0 - 126}" y="${H - 24}" class="s" text-anchor="end">less</text>${legend}<text x="${W - X0 - 32}" y="${H - 24}" class="s">more</text>
</svg>
`);
  console.log({ work: { total, active, peak: peak.date, years: years.map((y, i) => [y, workYears[i].total]) } });
}

// ---------- setup: OS timeline and what's next ----------
{
  // Simple Icons (CC0), pinned; Windows and AWS are not in the set
  const SI = "https://cdn.jsdelivr.net/npm/simple-icons@16.35.0/icons";
  const slugs = ["linuxmint", "popos", "fedora", "gnome", "xfce", "cinnamon", "opensuse", "python", "docker", "kubernetes", "terraform", "ansible", "githubactions"];
  const icon = Object.fromEntries(await Promise.all(slugs.map(async (s) => {
    const svg = await (await fetch(`${SI}/${s}.svg`)).text();
    const d = svg.match(/<path d="([^"]+)"/)?.[1];
    if (!d) throw new Error(`icon ${s} missing`);
    return [s, d];
  })));
  const windows = `<path d="M2 3.5l8.5-1.2v8.2H2zM11.5 2.2L22 .8v9.7H11.5zM2 11.5h8.5v8.2L2 18.5zM11.5 11.5H22v9.7l-10.5-1.4z"/>`;
  const glyph = (key, x, y, size, fill) => `<g transform="translate(${x},${y}) scale(${size / 24})" fill="${fill}">${key === "windows" ? windows : `<path d="${icon[key]}"/>`}</g>`;

  const H = 330, TY = 118;
  const stops = [
    ["windows", "#00a4ef", "windows", "where it started"],
    ["linuxmint", "#86be43", "linux mint", "xfce · cinnamon · 6 mo"],
    ["popos", "#48b9c7", "pop!_os", "1+ year"],
    ["fedora", "#51a2da", "fedora workstation", "gnome · now"],
  ];
  const span = W - 2 * X0 - 160, step = span / (stops.length - 1), SX = X0 + 80;
  const nodes = stops.map(([k, color, name, sub], i) => {
    const x = SX + i * step, now = i === stops.length - 1;
    return `<g class="t" style="animation-delay:${(0.3 + i * 0.35).toFixed(2)}s">
    ${now ? `<circle cx="${x}" cy="${TY}" r="28" fill="none" stroke="${color}" class="ring"/>` : ""}
    <circle cx="${x}" cy="${TY}" r="26" fill="#0f141c" stroke="${now ? color : LINE}" stroke-width="${now ? 1.5 : 1}"/>
    ${glyph(k, x - 12, TY - 12, 24, color)}
    <text x="${x}" y="${TY + 50}" class="nm" text-anchor="middle">${name}</text>
    <text x="${x}" y="${TY + 68}" class="s" text-anchor="middle">${sub}</text></g>`;
  }).join("\n  ");
  const rail = `M${SX},${TY} H${SX + span}`;

  const next = [["aws", "#ff9900", "aws cloud"], ["opensuse", "#73ba25", "opensuse"], ["python", "#3776ab", "python, advanced"],
    ["docker", "#2496ed", "docker"], ["kubernetes", "#326ce5", "kubernetes"], ["terraform", "#844fba", "terraform"], ["ansible", "#ee0000", "ansible"], ["githubactions", "#2088ff", "ci/cd"]];
  const CW = (W - 2 * X0 - 3 * 12) / 4, CH = 36, CY = 228;
  const chips = next.map(([k, color, label], i) => {
    const x = X0 + (i % 4) * (CW + 12), y = CY + Math.floor(i / 4) * (CH + 10);
    const mark = k === "aws" ? `<text x="${x + 14}" y="${y + 23}" style="font-size:11px;font-weight:700;fill:${color}">aws</text>` : glyph(k, x + 14, y + 9, 18, color);
    return `<g class="t" style="animation-delay:${(1.8 + i * 0.08).toFixed(2)}s"><rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="8" fill="#0f141c" stroke="${LINE}" stroke-dasharray="3 3"/>
    ${mark}<text x="${x + (k === "aws" ? 46 : 42)}" y="${y + 23}" class="cl">${label}</text></g>`;
  }).join("\n  ");

  writeFileSync("assets/setup.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="glow" x="-2" y="-2" width="5" height="5"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<style>
  ${FONT}
  .h{font-size:13px;fill:${INK};font-weight:600}.s{font-size:11px;fill:${MUTED}}.nm{font-size:13px;fill:${INK}}.cl{font-size:12px;fill:#c9d1d9}
  .sec{font-size:11px;fill:${MUTED};letter-spacing:.08em;text-transform:uppercase}
  .t{opacity:0;animation:rise .6s ease forwards}
  .rail{fill:none;stroke:#2d3a55;stroke-width:1.5;stroke-dasharray:${span};stroke-dashoffset:${span};animation:draw 1.6s ease .2s forwards}
  .pkt{offset-path:path('${rail}');offset-distance:0;opacity:0;animation:travel 4s linear 2s infinite}
  .ring{transform-box:fill-box;transform-origin:center;animation:ring 2.4s ease-out 1.6s infinite;opacity:0}
  .dot{animation:pulse 2s ease-in-out infinite}
  @keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes travel{0%{offset-distance:0;opacity:0}8%,90%{opacity:1}100%{offset-distance:100%;opacity:0}}
  @keyframes ring{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}
  @keyframes pulse{50%{opacity:.25}}
  @media (prefers-reduced-motion:reduce){.t{animation:none;opacity:1}.rail{animation:none;stroke-dashoffset:0}.pkt,.ring,.dot{animation:none}}
</style>
${panel(H)}
<circle cx="${X0 + 4}" cy="31" r="4.5" fill="#3fb950" class="dot"/>
<text x="${X0 + 18}" y="35" class="h">~/.config / setup</text>
<text x="${W - X0}" y="35" class="s" text-anchor="end">daily drivers · learning next</text>
<line x1="${X0}" y1="46" x2="${W - X0}" y2="46" stroke="#1b2230"/>
<text x="${X0}" y="72" class="sec">daily drivers</text>
<path d="${rail}" class="rail"/>
<circle r="3.5" fill="${ACCENT}" filter="url(#glow)" class="pkt"/>
  ${nodes}
<text x="${X0}" y="${CY - 14}" class="sec">learning next</text>
  ${chips}
</svg>
`);
}
console.log(stats);
