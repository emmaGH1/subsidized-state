// the ledger: a year of net issuance drawn as a square, and what offset it, to scale by area.
// used large on the cover and in section 5 (where the slider grows the red square).

import { el, line, fmt, get, tw, CALC } from './lib.js';

let uid = 0;

// s: parent svg; o: { x, y, side, fs, lockF, lockPctF, title }
// returns { setLock(near) } so the slider can grow the red square
export function drawLedger(s, D, o) {
  const iss = D.gap.net_issuance_near_per_year;
  const side = o.side, fs = o.fs, lh = fs + 4;
  const k = v => (v > 0 ? Math.max(3, side * Math.sqrt(v / iss)) : 0);
  const vN = CALC.vaults_change_365d.v(D) || 0;
  const bN = D.gas_burn.burned_near_per_year || 0;
  const lN = D.gap.lock_near_per_year || 0;
  const vs = k(vN), bs = k(bN), ls0 = k(lN);
  const gap = Math.max(10, Math.round(side * 0.04));
  const floor = side;
  const g = el('g', { class: 'ledger-g', transform: `translate(${o.x} ${o.y})` }, s);

  // hatching for "held"
  const pid = 'hatch' + (++uid);
  const pat = el('pattern', { id: pid, width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, el('defs', {}, g));
  el('rect', { x: 0, y: 0, width: 1.3, height: 7, fill: 'var(--ink)' }, pat);

  // a year of new supply: the outline
  el('rect', { class: 'outline', x: 0.75, y: 0.75, width: side - 1.5, height: side - 1.5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5, pathLength: 1000 }, g);
  const tParts = ['new supply in a year · ', ['gap.net_issuance_near_per_year', 'near0'], ' near'];
  const full = 'new supply in a year · 31,753,343 near · drawn to scale by area';
  if (tw(full, fs) <= side) line(g, D, [...tParts, ' · drawn to scale by area'], 0, -10, 'lab');
  else { line(g, D, tParts, 0, -10 - lh, 'lab'); line(g, D, ['drawn to scale by area'], 0, -10, 'lab'); }

  // remainder, top right inside
  const rem = el('g', { class: 'rem' }, g);
  line(rem, D, ['no offset measured here · ', ['calc.uncaptured_pct', 'pct1']], side - 10, fs + 10, 'lab', 'end');

  const xV = 0, xB = vs + gap, xL0 = vs + gap + bs + gap;
  // the lock sits behind the other two, so when the slider grows it they stay visible on top of it
  const lock = el('rect', { class: 'lock', x: xL0, y: floor - ls0, width: ls0, height: ls0, fill: 'var(--red)' }, g);
  const sq = el('g', { class: 'speck' }, g);
  el('rect', { x: xV, y: floor - vs, width: vs, height: vs, fill: `url(#${pid})`, stroke: 'var(--ink)', 'stroke-width': 1.2 }, sq);
  el('rect', { x: xB, y: floor - bs, width: bs, height: bs, fill: 'var(--ink)', filter: 'url(#ink-edge)' }, sq);

  // labels: two or three lines each, ink text (small red text fails contrast), red leader for the lock
  const labs = el('g', { class: 'speck labs' }, g);
  const block = (lines, x, base, anchor = 'start') => {
    const n = lines.length;
    lines.forEach((p, i) => line(labs, D, p, x, base - (n - 1 - i) * lh, i === 0 ? 'lab' : '', anchor));
    return { x0: x, x1: x + width(lines), top: base - n * lh, bot: base + 4 };
  };
  const width = lines => Math.max(...lines.map(p => tw(p.map(q => (typeof q === 'string' ? q : fmt(get(D, q[0]), q[1]))).join(''), fs)));
  const fit = (cx, lines) => Math.max(6, Math.min(cx + 6, side - 10 - width(lines)));

  const held = [['held · two fee vaults'], [['calc.vaults_change_365d', 'm1', { pre: '+' }], ' near · ', ['calc.vaults_pct_of_issuance', 'pct1']]];
  const burned = [['burned · gas'], [['gas_burn.burned_near_per_year', 'near0'], ' near · ', ['gas_burn.pct_of_net_issuance', 'pct2']]];
  const lockF = o.lockF || 'gap.lock_near_per_year', lockPctF = o.lockPctF || 'gap.lock_pct_of_issuance';
  const nums = [[lockF, 'near0'], ' near · ', [lockPctF, 'pct2']];
  // one line if it fits right of the burn leader, else wrap
  const locked = tw('locked · state collateral, intents.near', fs) <= side - 10 - (xB + bs / 2 + 8)
    ? [['locked · state collateral, intents.near'], nums]
    : [['locked · state collateral,'], ['intents.near'], nums];

  // held: above the hatched square
  const hb = floor - vs - 10;
  const H = block(held, 6, hb);
  // locked: just above the red square; burned: above that
  let lb = floor - Math.max(ls0, 4) - 22;
  let lx = fit(xL0 + ls0 / 2, locked);
  let bb = lb - locked.length * lh - 14;
  const bx = fit(xB + bs / 2, burned);
  if (bx < H.x1 + 8 && bb - burned.length * lh < H.bot + 6) bb = H.top - 10; // clear of the held label
  block(burned, bx, bb);
  el('rect', { x: xB + bs / 2 - 0.5, y: bb + 6, width: 1, height: Math.max(0, floor - bs - bb - 10), fill: 'var(--ink)' }, labs);
  const lg = el('g', {}, g);
  const leader = el('rect', { width: 1, fill: 'var(--red)' }, lg);
  const lockLab = el('g', {}, lg);

  function setLock(v) {
    const s2 = Math.min(side, k(v));
    const x = Math.max(0, Math.min(xL0, side - s2));
    lock.setAttribute('x', x); lock.setAttribute('y', floor - s2); lock.setAttribute('width', s2); lock.setAttribute('height', s2);
    lockLab.replaceChildren();
    // grown by the slider: the label moves to the top-left corner (inside the red once it reaches there), marked with a red square
    const grown = s2 > ls0 * 1.4;
    const n = locked.length;
    const base = grown ? fs + 10 + (n - 1) * lh : Math.min(lb, floor - s2 - 22);
    // keep the text clear of the burn leader to its left
    const tx = grown ? 22 : Math.max(fit(x + s2 / 2, locked), x > xB ? xB + bs / 2 + 8 : 6);
    if (grown) el('rect', { x: 10, y: base - (n - 1) * lh - fs + 2, width: 8, height: 8, fill: 'var(--red)', stroke: 'var(--ink)', 'stroke-width': s2 > side - fs * 3 ? 1 : 0 }, lockLab);
    locked.forEach((p, i) => line(lockLab, D, p, tx, base - (n - 1 - i) * lh, i === 0 ? 'lab' : '', 'start'));
    leader.setAttribute('x', x + s2 / 2 - 0.5);
    leader.setAttribute('y', base + 6);
    leader.setAttribute('height', grown ? 0 : Math.max(0, floor - s2 - base - 10));
    rem.style.opacity = v === lN ? '' : '0';
  }
  setLock(lN);
  return { setLock, side, floor };
}
