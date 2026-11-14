// section 5 · the gap: issuance, lock and burn on one area scale

import { el, hair, line, svg, figure, fmt, get, isDesk, figH, CALC } from './lib.js';

export const SL = { gb: null };
let G = null;

// live slider readout values, exposed as computed bindings
CALC.slider_gb = { v: D => SL.gb ?? D.gap.state_gb_per_year_now, formula: 'slider position (gb of new state a year)', under: 'gap.state_gb_per_year_now' };
CALC.slider_near = { v: D => (SL.gb == null || SL.gb === D.gap.state_gb_per_year_now ? D.gap.lock_near_per_year : SL.gb * D.gap.near_per_gb), formula: 'slider gb × gap.near_per_gb', under: 'gap.near_per_gb' };
CALC.slider_pct = { v: D => CALC.slider_near.v(D) / D.gap.net_issuance_near_per_year * 100, formula: 'slider gb × gap.near_per_gb / gap.net_issuance_near_per_year × 100', under: 'gap.net_issuance_near_per_year' };
CALC.slider_x = { v: D => (SL.gb ?? D.gap.state_gb_per_year_now) / D.gap.state_gb_per_year_now, formula: 'slider gb / gap.state_gb_per_year_now', under: 'gap.state_gb_per_year_now' };

// side of a square whose area is the given near, on the shared scale of section 5
export function gapScale(D) {
  const desk = isDesk();
  const side = desk ? 0.56 * innerHeight : innerWidth - 32;
  const iss = D.gap.net_issuance_near_per_year;
  return { side, k: v => Math.max(3, side * Math.sqrt(Math.max(0, v) / iss)) };
}

export function drawGap(D, sec) {
  const box = sec.querySelector('.drawing');
  box.replaceChildren();
  const g = D.gap;
  if (!g || g.net_issuance_near_per_year == null || g.lock_near_per_year == null) throw new Error('no gap');
  const desk = isDesk();
  const { side, k } = gapScale(D);
  const fs = desk ? 13 : 11;
  const burnS = k(D.gas_burn.burned_near_per_year ?? 0);
  const top = fs + 14;
  const W = desk ? side + burnS + 140 : side;
  const SH = top + side + (desk ? 30 : 26);
  const gy = top + side;

  box.setAttribute('aria-label', `three squares on one area scale. an outline for the ${fmt(g.net_issuance_near_per_year, 'near0')} near issued in a year. inside its corner a black speck for the ${fmt(g.lock_near_per_year, 'near0')} near locked by intents.near, and a small black square for the ${fmt(D.gas_burn.burned_near_per_year, 'near0')} near burned as gas.`);

  const s = svg(box, W, SH, 'gap-svg');
  // ground
  hair(s, desk ? -40 : -16, W + (desk ? 40 : 16), gy + 0.5);
  // issued: outline
  el('rect', { class: 'outline', x: 0.75, y: top + 0.75, width: side - 1.5, height: side - 1.5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.5, filter: 'url(#ink-pen)', pathLength: 1000 }, s);
  line(s, D, ['issued · ', ['gap.net_issuance_near_per_year', 'near0'], ' near a year'], 0, fs, 'lab');

  // burned
  const bx = desk ? side + 40 : side - burnS - 8;
  const burn = el('g', { class: 'speck' }, s);
  el('rect', { x: bx, y: gy - burnS, width: burnS, height: burnS, fill: 'var(--ink)', filter: 'url(#ink-edge)' }, burn);
  const bl = el('g', { class: 'speck' }, s);
  line(bl, D, ['burned · ', ['gas_burn.burned_near_per_year', 'near0']], desk ? bx : bx + burnS, gy - burnS - 8, 'lab', desk ? 'start' : 'end');

  // locked: true scale, driven by the slider
  const lock = el('rect', { class: 'locked speck', x: 0, y: gy - k(g.lock_near_per_year), width: k(g.lock_near_per_year), height: k(g.lock_near_per_year), fill: 'var(--ink)' }, s);
  const ll = el('g', { class: 'speck' }, s);
  const lw = line(ll, D, ['locked · ', ['calc.slider_near', 'near0']], 8, 0, 'lab');
  const la = null;
  const fig = figure(s, 'figure-look-up', 0, gy, figH(), { class: 'fig speck' });

  G = { D, k, gy, lock, lw, fig, side, fs, desk };
  layoutLocked();
  initSlider(D, sec);
}

function layoutLocked() {
  if (!G) return;
  const { D, k, gy, lock, lw, fig, side, fs } = G;
  const v = CALC.slider_near.v(D);
  const s = Math.min(side, k(v));
  lock.setAttribute('y', gy - s); lock.setAttribute('width', s); lock.setAttribute('height', s);
  const big = s > side * 0.3;
  const lx = big ? 10 : 0;
  const ly = big ? gy - s + fs + 10 : gy - Math.max(s, figH()) - 10;
  lw.setAttribute('x', lx); lw.setAttribute('y', ly); lw.classList.toggle('paper', big);
  const a = lw.querySelector('a.n'); a.textContent = fmt(v, 'near0');
  fig.setAttribute('transform', `translate(${(s + 12 + figH() / 4).toFixed(1)} ${gy})`);
  fig.style.display = s > side - 30 ? 'none' : '';
}

function initSlider(D, sec) {
  const g = D.gap;
  const input = sec.querySelector('#gb');
  const out = sec.querySelector('.readout');
  const now = g.state_gb_per_year_now, max = 1.2 * g.state_gb_per_year_to_offset;
  const ok = now > 0 && max > now;
  if (!ok) { sec.querySelector('.slider').hidden = true; return; }
  const toGb = t => now * Math.pow(max / now, t / 1000);
  const toT = gb => Math.round(Math.log(gb / now) / Math.log(max / now) * 1000);
  const even = toT(g.state_gb_per_year_to_offset);
  sec.querySelector('.t-even').style.left = `${even / 10}%`;
  if (!out.firstChild) {
    out.innerHTML = '<a class="n" data-f="calc.slider_gb" data-fmt="num1"></a> gb a year locks <a class="n" data-f="calc.slider_near" data-fmt="near0"></a> near: <a class="n" data-f="calc.slider_pct" data-fmt="pct2"></a> of issuance, <a class="n" data-f="calc.slider_x" data-fmt="x0"></a> today\'s pace';
  }
  const upd = () => {
    const t = +input.value;
    SL.gb = t >= even - 2 && t <= even + 2 ? g.state_gb_per_year_to_offset : toGb(t);
    if (t === 0) SL.gb = now;
    for (const a of out.querySelectorAll('a.n')) a.textContent = fmt(get(D, a.dataset.f), a.dataset.fmt);
    input.setAttribute('aria-valuetext', out.textContent);
    layoutLocked();
  };
  if (!input.dataset.init) {
    input.dataset.init = '1';
    input.value = 0;
    input.addEventListener('input', upd);
    sec.querySelector('.reset').addEventListener('click', e => { e.preventDefault(); input.value = 0; upd(); input.focus(); });
  }
  upd();
}
