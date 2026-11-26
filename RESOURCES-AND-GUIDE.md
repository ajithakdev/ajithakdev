# Resources and guide

## TL;DR

- Live profile: https://github.com/ajithakdev
- A GitHub Action refreshes the cards and README blocks every day at 00:30 UTC.
- To change the text, edit `scripts/stats.mjs` (the constants at the top) or the static parts of `README.md`, then run the script.

## Links

| Link | What it is for |
| --- | --- |
| [github.com/ajithakdev](https://github.com/ajithakdev) | The profile page this repo renders |
| [Actions](https://github.com/ajithakdev/ajithakdev/actions) | The daily "Refresh profile cards" run |
| [ajithakdev.com](https://ajithakdev.com) | Portfolio, linked from the profile sidebar |

## How it works

`scripts/stats.mjs` reads public GitHub data and rewrites:

- `assets/metrics-dark.svg` and `assets/metrics-light.svg` (downloads, stars, PRs, commits)
- the README blocks between `<!-- name:start -->` and `<!-- name:end -->` markers: featured, live, upstream, writing
- the status dot for each product in `LIVE`, from a request to its URL (`assets/up.svg` or `assets/down.svg`)

## Run it locally

```sh
GH_TOKEN=$(gh auth token) node scripts/stats.mjs
```

It prints the stats it used. Check `git diff` before you commit.

## When something goes wrong

| Problem | Fix |
| --- | --- |
| Cards stop updating | Check the latest run under Actions; rerun with `gh workflow run profile.yml` |
| A product shows a red dot | Its URL did not answer on the last run. Open it; if it is up, the next daily run fixes the dot |
| A README block is wrong | Edit the constant in `scripts/stats.mjs`, not the README text between the markers; the bot overwrites that |
