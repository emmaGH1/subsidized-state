// section 3 · the sawtooth: the ground the figure walks on

import { el, num, text, svg, figure, fmt, get, tw, clamp, isDesk, figH } from './lib.js';

let S = null; // state for the scroll handler

export function drawSawtooth(D, sec, { reduce }) {
  const plot = sec.querySelector('.plot');
  plot.replaceChildren();
  S = null;
  const st = D.sawtooth;
  if (!st || !Array.isArray(st.trace) || st.trace.length < 2) throw new Error('no trace');

  const desk = isDesk();
  const statik = reduce || document.documentElement.classList.contains('static');
  const W = plot.clientWidth || innerWidth;
  const PH = plot.clientHeight;
  const TW = desk || statik ? W : Math.round(W * 3.2);
  const floorPad = desk ? 64 : 68;
  const floorY = PH - floorPad;
  const top = 1.25 * st.free_max_near;
  const from = st.window.from_block, to = st.window.to_block;
  const x = b => ((b - from) / (to - from)) * TW;
  const y = v => floorY - (v / top) * floorY;
  const fs = desk ? 13 : 11;
  const lh = fs + 3;

  const trace = [...st.trace].sort((a, b) => a.block - b.block);
  const refills = Array.isArray(st.refills) ? st.refills : [];
  const rBy = new Map(refills.map(r => [r.block, r]));

  // top edge of the ground mass, as a polyline (vertical jump at every refill)
  const pts = [];
  trace.forEach((p, i) => {
    const r = rBy.get(p.block);
    if (r && i > 0) {
      pts.push([x(p.block), y(r.free_before_near)]);
      pts.push([x(p.block), y(r.free_after_near)]);
    } else pts.push([x(p.block), y(p.free_near)]);
  });
  // the mass bleeds past both ends and below the floor; a clip keeps the floor straight
  const bl = 14;
  const d = `M${-bl} ${floorY + bl}L${-bl} ${pts[0][1].toFixed(1)}` + pts.map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`).join('') + `L${TW + bl} ${pts[pts.length - 1][1].toFixed(1)}L${TW + bl} ${floorY + bl}Z`;

  plot.setAttribute('aria-label',
    `the free balance of intents.near over ${fmt(st.window.days, 'num1')} days, drawn as black ground: it slides from about ${fmt(st.free_max_near, 'near0')} to about ${fmt(st.trigger_free_mean_near, 'near0')} near, then jumps back up ${fmt(st.refill_count, 'int')} times, each a red riser of about ${fmt(st.refill_amount_median_near, 'near0')} near from intents_refiller.near.`);

  // panning layer: ground mass, trigger line, risers, riser labels
  const pan = svg(plot, TW, PH, 'pan');
  const cid = 'saw-clip';
  const cp = el('clipPath', { id: cid }, el('defs', {}, pan));
  el('rect', { x: -bl, y: -40, width: TW + 2 * bl, height: floorY + 40 }, cp);
  const g = el('g', { filter: 'url(#ink-edge)' }, el('g', { 'clip-path': `url(#${cid})` }, pan));
  el('path', { d, fill: 'var(--ink)' }, g);
  el('line', { x1: 0, x2: TW, y1: floorY + 0.5, y2: floorY + 0.5, stroke: 'var(--ink)', 'stroke-width': 1 }, pan);
  if (st.trigger_free_mean_near != null) {
    const ty = Math.round(y(st.trigger_free_mean_near)) + 0.5;
    el('line', { x1: 0, x2: TW, y1: ty, y2: ty, stroke: 'var(--paper)', 'stroke-opacity': 0.55, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, pan);
  }

  const rw = desk ? 4 : 3;
  refills.forEach((r, i) => {
    const rx = x(r.block), y0 = y(r.free_before_near), y1 = y(r.free_after_near);
    const a = el('a', { class: 'riser', href: '#q', 'data-f': `sawtooth.refills[${i}].amount_near`, 'data-refill': i,
      'aria-label': `refill of ${fmt(r.amount_near, 'near0')} near at block ${fmt(r.block, 'int')}` }, pan);
    el('rect', { class: 'rhit', x: rx - 12, y: y1 - 8, width: 24, height: y0 - y1 + 16, fill: 'transparent' }, a);
    el('rect', { x: rx - rw / 2, y: y1, width: rw, height: Math.max(1, y0 - y1), fill: 'var(--red)', filter: 'url(#ink-riser)' }, a);
    el('rect', { x: rx - 3, y: y1 - 6, width: 6, height: 6, fill: 'var(--red)' }, a);

    // label stack above the cap: +amount (red), block, [datetime]
    const lines = [[`sawtooth.refills[${i}].amount_near`, 'near0', 'red', '+'], [`sawtooth.refills[${i}].block`, 'int', '', 'block ']];
    if (desk) lines.push([`sawtooth.refills[${i}].timestamp_utc`, 'datetime', '', '']);
    const widest = Math.max(...lines.map(([f, ff, , pre]) => tw(pre + fmt(get(D, f), ff), fs)));
    const cx = clamp(rx, 8 + widest / 2, TW - 8 - widest / 2);
    const base = y1 - 6 - 7;
    lines.forEach(([f, ff, cls, pre], k) => {
      const ly = base - (lines.length - 1 - k) * lh;
      num(pan, D, f, ff, cx, ly, { cls, pre, anchor: 'middle', data: { block: String(r.block), refill: String(i) } });
    });
  });

  // fixed layer: floor label, trigger label, figure
  const fix = svg(plot, W, PH, 'fix');
  text(fix, '0 near spare: the protocol refuses new state', isDesk() ? 48 : 16, floorY + fs + 8, 'lab');
  if (st.trigger_free_mean_near != null) {
    num(fix, D, 'sawtooth.trigger_free_mean_near', 'near0', isDesk() ? 48 : 16, Math.round(y(st.trigger_free_mean_near)) + fs + 5, { cls: 'paper lab', post: ' near' });
  }
  const fh = figH();
  const fig = figure(fix, statik ? 'figure-stand' : 'figure', 0, 0, fh);

  S = { pan, fig, pts, W, TW, desk, statik, sec, fh, gut: desk ? 48 : 16 };
  scrollSawtooth();
}

function yAt(pts, xt) {
  // last point with x <= xt (so at a riser the figure is already lifted)
  let lo = 0, hi = pts.length - 1;
  if (xt <= pts[0][0]) return { y: pts[0][1], i: 0 };
  if (xt >= pts[hi][0]) return { y: pts[hi][1], i: hi };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= xt) lo = m; else hi = m; }
  while (lo + 1 < pts.length && pts[lo + 1][0] === pts[lo][0] && pts[lo + 1][0] <= xt) lo++;
  const [x0, y0] = pts[lo], [x1, y1] = pts[lo + 1];
  const t = x1 === x0 ? 1 : (xt - x0) / (x1 - x0);
  return { y: y0 + (y1 - y0) * t, i: lo };
}

export function scrollSawtooth() {
  if (!S) return;
  const { pan, fig, pts, W, TW, desk, statik, sec, fh, gut } = S;
  let p = 1;
  if (!statik) {
    const r = sec.getBoundingClientRect();
    const span = sec.offsetHeight - innerHeight;
    p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }
  let fx, xt, panX = 0;
  if (statik) { fx = clamp(pts[pts.length - 1][0], gut, W - gut); xt = pts[pts.length - 1][0] - 0.01; }
  else if (desk) { fx = gut + p * (W - 2 * gut); xt = fx; }
  else { panX = -p * (TW - W); fx = W * 0.3; xt = fx - panX; }
  pan.style.transform = `translate3d(${panX.toFixed(1)}px,0,0)`;
  const { y } = yAt(pts, xt);
  const a = yAt(pts, xt - 6).y, b = yAt(pts, xt + 6).y;
  let ang = Math.atan2(b - a, 12) * 180 / Math.PI;
  if (Math.abs(b - a) > 40) ang = 0; // across a riser: stand straight
  ang = clamp(ang, -6, 6);
  const travel = desk ? fx : -panX;
  const kind = statik ? 'figure-stand' : (Math.floor(travel / 24) % 2 ? 'figure-stand' : 'figure');
  fig.setAttribute('href', '#' + kind);
  fig.setAttribute('transform', `translate(${fx.toFixed(1)} ${(y + 1).toFixed(1)}) rotate(${ang.toFixed(1)})`);
}
