import { test } from "node:test";
import assert from "node:assert/strict";
import { trend, polyline } from "./trend.mjs";

test("needs two days in the window", () => {
  assert.equal(trend({}), null);
  assert.equal(trend({ "2026-11-27": 8119 }), null);
  assert.equal(trend({ "2026-09-01": 5000, "2026-11-27": 8119 }), null); // first day is outside 30 days
});

test("gain and span cover only the last 30 days", () => {
  const t = trend({ "2026-09-01": 5000, "2026-10-28": 7000, "2026-11-20": 7800, "2026-11-27": 8119 });
  assert.deepEqual(t, { pts: [7000, 7800, 8119], gain: 1119, span: 30 });
});

test("polyline spans the box, flat series stays on the bottom", () => {
  assert.equal(polyline([0, 5, 10], 64, 22), "0.0,22.0 32.0,11.0 64.0,0.0");
  assert.equal(polyline([7, 7], 10, 4), "0.0,4.0 10.0,4.0");
});
