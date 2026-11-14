// section 5 · the gap: issuance, lock and burn on one area scale

import { el, hair, line, svg, figure, fmt, get, isDesk, isTwo, isShort, figH, CALC } from './lib.js';
import { drawLedger } from './ledger.js';

export const SL = { gb: null };
let G = null;

// live slider readout values, exposed as computed bindings
CALC.slider_gb = { v: D => SL.gb ?? D.gap.state_gb_per_year_now, formula: 'slider position (gb of new state a year)', under: 'gap.state_gb_per_year_now' };
CALC.slider_near = { v: D => (SL.gb == null || SL.gb === D.gap.state_gb_per_year_now ? D.gap.lock_near_per_year : SL.gb * D.gap.near_per_gb), formula: 'slider gb × gap.near_per_gb', under: 'gap.near_per_gb' };
CALC.slider_pct = { v: D => CALC.slider_near.v(D) / D.gap.net_issuance_near_per_year * 100, formula: 'slider gb × gap.near_per_gb / gap.net_issuance_near_per_year × 100', under: 'gap.net_issuance_near_per_year' };
CALC.slider_x = { v: D => (SL.gb ?? D.gap.state_gb_per_year_now) / D.gap.state_gb_per_year_now, formula: 'slider gb / gap.state_gb_per_year_now', under: 'gap.state_gb_per_year_now' };

// side of the section 5 ledger square: one shared area scale for the gap and the verdict figure
export function gapScale(D) {
  const W = innerWidth, gut = isDesk() ? 48 : 16;
  let side;
  if (isTwo()) side = Math.min(0.5 * (W - 2 * gut), isShort() ? Infinity : Math.max(260, innerHeight - 150));
  else side = W - 2 * gut;
  side = Math.round(Math.min(side, 760));
  const iss = D.gap.net_issuance_near_per_year;
  return { side, k: v => Math.max(3, side * Math.sqrt(Math.max(0, v) / iss)) };
}

export function drawGap(D, sec) {
  const box = sec.querySelector('.drawing');
  box.replaceChildren();
  const g = D.gap;
  if (!g || g.net_issuance_near_per_year == null || g.lock_near_per_year == null) throw new Error('no gap');
  const desk = isDesk();
  const { side } = gapScale(D);
  const fs = desk ? 13 : 11, lh = fs + 4;
  const titleH = 2 * lh + 10;
  const fh = figH();
  const W = side + 2 + fh;
  box.setAttribute('aria-label', `a square whose area is the ${fmt(g.net_issuance_near_per_year, 'near0')} near issued in a year. on its floor, to scale: hatched, the ${fmt(CALC.vaults_change_365d.v(D), 'near0')} near the two fee vaults gained; black, the ${fmt(D.gas_burn.burned_near_per_year, 'near0')} near burned as gas; red, the ${fmt(g.lock_near_per_year, 'near0')} near locked by intents.near. the slider grows the red square toward break-even.`);
  const s = svg(box, W, side + titleH + 2, 'gap-svg');
  const L = drawLedger(s, D, { x: 1, y: titleH, side, fs, lockF: 'calc.slider_near', lockPctF: 'calc.slider_pct' });
  hair(s, side + 2, W + 20, titleH + side + 0.5);
  figure(s, 'figure-look-up', side + 4 + fh / 4, titleH + side, fh, { class: 'fig speck' });
  G = { D, L };
  initSlider(D, sec);
}

function layoutLocked() {
  if (!G) return;
  G.L.setLock(CALC.slider_near.v(G.D));
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
