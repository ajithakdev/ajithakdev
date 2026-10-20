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

writeFileSync("assets/stats.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="${H}" viewBox="0 0 560 ${H}">
<style>
  text{font:14px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}
  .cmd{fill:#e6edf3}.out{fill:#8b949e}.hi{fill:#8ea3ff;font-weight:600}.p{fill:#3fb950}
  .l{opacity:0;animation:in .4s ease forwards}
  @keyframes in{to{opacity:1}}
  @media (prefers-reduced-motion:reduce){.l{animation:none;opacity:1}}
</style>
<rect width="560" height="${H}" rx="12" fill="#0d1117" stroke="#30363d"/>
<circle cx="22" cy="22" r="6" fill="#ff5f57"/><circle cx="42" cy="22" r="6" fill="#febc2e"/><circle cx="62" cy="22" r="6" fill="#28c840"/>
<text x="280" y="27" text-anchor="middle" class="out" style="font-size:12px">ajith@github: ~</text>
${body}
</svg>
`);
console.log(stats);
