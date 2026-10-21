// Check script for the founding counter on nursenote.html. Runs the real inline <script> in node:vm
// with a DOM stub and a fake fetch (no network). Cases include Oreo's r9 junk inputs.
// Usage: node tests/nursenote-counter-check.mjs   (exit 1 on any mismatch)
import { readFileSync } from "node:fs";
import vm from "node:vm";
const html = readFileSync(new URL("../nursenote.html", import.meta.url), "utf8");
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("founding-left"));
const patched = src.replace(/const PROXY_BASE = '[^']*';/, "const PROXY_BASE = 'https://proxy.example.test';");
if (patched === src) throw new Error("PROXY_BASE line not found");
const FALLBACK = "Limited to 25 founding nurses";
function el(text) { return { textContent: text, innerHTML: "", style: {}, attrs: {}, removeAttribute(a) { delete this.attrs[a]; } }; }
async function run(fetchImpl, waitMs = 60) {
  const els = { spots: el(FALLBACK), "buy-monthly": el(""), "buy-yearly": el(""), "founding-badge": el(""), "offer-title": el("Founding Nurse price"), "main-price": el(""), "main-terms": el(""), "regular-line": el("") };
  const ctx = { document: { getElementById: (i) => els[i], querySelector: () => el("") }, location: { hostname: "jslegends.com", search: "" }, URLSearchParams, Number, Array, console,
    setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 300)), clearTimeout, AbortController, fetch: fetchImpl };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(patched, ctx); await new Promise((r) => setTimeout(r, waitMs));
  return { spots: els.spots.textContent, soldOut: els.spots.style.display === "none" && els["main-terms"].textContent.includes("taken") };
}
const json = (b, status = 200) => async () => new Response(typeof b === "string" ? b : JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
const cases = [
  ["ok_7_left", json({ left: 7, total: 25 }), "7 of 25 founding spots left", false],
  ["ok_25_left", json({ left: 25, total: 25 }), "25 of 25 founding spots left", false],
  ["ok_0_left_sold_out", json({ left: 0, total: 25 }), null, true],
  ["network_error", async () => { throw new TypeError("fail"); }, FALLBACK, false],
  ["http_500", json({ error: "x" }, 500), FALLBACK, false],
  ["http_403", json({ error: "bad_origin" }, 403), FALLBACK, false],
  ["timeout", (u, o) => new Promise((_, rej) => o && o.signal && o.signal.addEventListener("abort", () => rej(new Error("abort")))), FALLBACK, false, 600],
  ["html", json("<html>oops</html>"), FALLBACK, false],
  ["empty_obj", json({}), FALLBACK, false],
  ["null_body", json("null"), FALLBACK, false],
  ["array_body", json([]), FALLBACK, false],
  ["left_null", json({ left: null, total: 25 }), FALLBACK, false],
  ["left_emptystr", json({ left: "", total: 25 }), FALLBACK, false],
  ["left_false", json({ left: false, total: 25 }), FALLBACK, false],
  ["left_true", json({ left: true, total: 25 }), FALLBACK, false],
  ["left_fraction", json({ left: 3.7, total: 25 }), FALLBACK, false],
  ["left_over_total", json({ left: 9999, total: 25 }), FALLBACK, false],
  ["left_string_num", json({ left: "12", total: 25 }), FALLBACK, false],
  ["left_negative", json({ left: -1, total: 25 }), FALLBACK, false],
  ["left_array1", json({ left: [5], total: 25 }), FALLBACK, false],
  ["total_negative", json({ left: 3, total: -5 }), FALLBACK, false],
  ["total_huge", json({ left: 3, total: 1e9 }), FALLBACK, false],
  ["total_missing", json({ left: 3 }), FALLBACK, false],
  ["total_string", json({ left: 3, total: "25" }), FALLBACK, false],
  ["total_fraction", json({ left: 3, total: 25.5 }), FALLBACK, false],
];
let bad = 0;
for (const [name, f, wantSpots, wantSold, wait] of cases) {
  const r = await run(f, wait || 60);
  const ok = wantSold ? r.soldOut : (!r.soldOut && r.spots === wantSpots);
  if (!ok) bad++;
  console.log((ok ? "ok  " : "FAIL") + " " + name.padEnd(20) + " | " + (r.soldOut ? "(sold out)" : r.spots));
}
console.log(bad ? bad + " failed" : "all " + cases.length + " passed");
process.exit(bad ? 1 : 0);
