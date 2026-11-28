<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/metrics-dark.svg" />
  <img src="assets/metrics-light.svg" width="100%" alt="Profile metrics, refreshed daily from the GitHub API" />
</picture>

### Open source

<!-- featured:start -->
**[claude-desktop-rpm](https://github.com/ajithakdev/claude-desktop-rpm)** · v1.3.1, Nov 18, 2026 · 68 stars<br />
Installs Anthropic's official Claude Desktop on Fedora: checksum-verified, no root, updates itself. Fixes dark mode, the tray icon, GNOME search and Cowork (KVM). One Bash script.
<!-- featured:end -->

### Live

<!-- live:start -->
| | Product | What it is | Built with |
| :-: | --- | --- | --- |
| <img src="assets/up.svg" width="14" height="14" alt="up" /> | **Toolglass**<br /><sub><a href="https://toolglass.ajithakdev.com">toolglass.ajithakdev.com</a></sub> | 41 developer tools, all client-side | React, TypeScript, Vite, offline PWA |
| <img src="assets/up.svg" width="14" height="14" alt="up" /> | **MeterX**<br /><sub><a href="https://meterx.ajithakdev.com">meterx.ajithakdev.com</a></sub> | Speed test extension with a bufferbloat grade | WebExtension, Cloudflare Workers |
| <img src="assets/up.svg" width="14" height="14" alt="up" /> | **Minnoli**<br /><sub><a href="https://minnoli.ajithakdev.com">minnoli.ajithakdev.com</a></sub> | Fetches Tamil Nadu electricity bills | Next.js, Tesseract.js OCR, AES-GCM in the browser |
| <img src="assets/up.svg" width="14" height="14" alt="up" /> | **Auraksha Finds**<br /><sub><a href="https://aurakshafinds.ajithakdev.com">aurakshafinds.ajithakdev.com</a></sub> | Storefront on the edge | Astro, Cloudflare D1 with Drizzle, R2 |
| <img src="assets/up.svg" width="14" height="14" alt="up" /> | **media**<br /><sub><a href="https://media.ajithakdev.com">media.ajithakdev.com</a></sub> | Write-ups of production bugs and fixes | Static Astro, RSS |
<!-- live:end -->

<sub>Status checked daily. Also: [clip-paste](https://github.com/ajithakdev/clip-paste), a clipboard applet for the COSMIC desktop in Rust.</sub>

### Recognition

- Published in **Fedora Magazine**: [Installing the official Claude Desktop Linux beta on Fedora Linux](https://fedoramagazine.org/installing-the-official-claude-desktop-linux-beta-on-fedora-linux/) · Nov 13, 2026
- [Fedora Discussion thread](https://discussion.fedoraproject.org/t/205947) for claude-desktop-rpm. A reviewer found a gap in the signature check; the fix shipped the same day in v1.1.1.
- Outside contributions: openSUSE Tumbleweed support from [whud](https://github.com/whud) (merged), and confirmed installs on Fedora Workstation, Aurora, COSMIC and Cinnamon.
- Also on [dev.to](https://dev.to/ajithakdev/how-i-install-claude-desktop-on-fedora-44-the-official-linux-build-no-root-5gcc).

### Upstream contributions

<!-- upstream:start -->
- [flatpark/flatpark#1616](https://github.com/flatpark/flatpark/pull/1616): fix(claude-desktop): Cowork follow-ups from the #1562 review · merged Nov 26, 2026
- [flatpark/flatpark#1562](https://github.com/flatpark/flatpark/pull/1562): feat(claude-desktop): add Cowork as an opt-in through flatpak overrides · merged Nov 26, 2026
<!-- upstream:end -->

### Writing

<!-- writing:start -->
- [Building a Live Terminal Statusline for Claude Code: Tokens, Limits, and Responsive Wrapping](https://media.ajithakdev.com/blog/claude-code-live-terminal-statusline/) · Sep 17, 2026
- [Silent Grouping: How a Missing Field in MongoDB $group Generates Plausible False Positives](https://media.ajithakdev.com/blog/mongodb-group-missing-field-silent-failure/) · Sep 17, 2026
- [Why encodeURIComponent Breaks S3 CopyObject with Silent NoSuchKey Errors](https://media.ajithakdev.com/blog/s3-copyobject-encodeuricomponent-nosuchkey/) · Sep 17, 2026
<!-- writing:end -->

More at [media.ajithakdev.com](https://media.ajithakdev.com).

### Setup

Fedora Workstation with GNOME, daily. Before that: Pop!_OS, Linux Mint and Ubuntu, with Windows since my first PC.

### Contributing

Pick a [good first issue](https://github.com/issues?q=is%3Aopen+is%3Aissue+user%3Aajithakdev+label%3A%22good+first+issue%22) in Toolglass or MeterX, or send a claude-desktop-rpm test report from your distro. I review every pull request.

### Support

These tools are free and will stay that way. If one saved you time, a star helps, and so does a coffee:

<table>
  <tr>
    <td align="center" valign="top" width="280"><b>From anywhere</b><br /><br /><a href="https://ko-fi.com/ajithakdev"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" /></a><br /><br /><sub>Card or PayPal on <a href="https://ko-fi.com/ajithakdev">ko-fi.com/ajithakdev</a></sub></td>
    <td align="center" valign="top" width="280"><b>In India, over UPI</b><br /><br /><img src="assets/upi-qr.svg" width="120" height="120" alt="UPI QR code for ajithakdev@sbi" /><br /><code>ajithakdev@sbi</code><br /><sub>Scan or paste into GPay, PhonePe or any UPI app</sub></td>
  </tr>
</table>
