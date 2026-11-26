// Daily download totals ({ "YYYY-MM-DD": total }) to sparkline points and the gain over the window.
export function trend(history, days = 30) {
  const dates = Object.keys(history).sort();
  const last = dates.at(-1);
  if (!last) return null;
  const since = new Date(Date.parse(last) - days * 864e5).toISOString().slice(0, 10);
  const inWindow = dates.filter((d) => d >= since);
  if (inWindow.length < 2) return null;
  const pts = inWindow.map((d) => history[d]);
  return { pts, gain: pts.at(-1) - pts[0], span: Math.round((Date.parse(last) - Date.parse(inWindow[0])) / 864e5) };
}

// points for an SVG polyline inside a w by h box; a flat series sits on the bottom edge
export function polyline(pts, w, h) {
  const min = Math.min(...pts), range = Math.max(...pts) - min || 1;
  return pts.map((v, i) => `${((i * w) / (pts.length - 1)).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
}
