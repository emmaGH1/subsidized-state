// section 2 · the lock: a stepped monolith, one column per checkpoint

import { el, hair, num, svg, figure, fmt, isDesk, figH } from './lib.js';

export function drawLock(D, sec) {
  const box = sec.querySelector('.drawing');
  box.replaceChildren();
  const cps = D.lock && D.lock.checkpoints;
  if (!Array.isArray(cps) || !cps.length) throw new Error('no checkpoints');

  const desk = isDesk();
  const W = innerWidth;
  const vh = innerHeight;
  const H = Math.round((desk ? 0.64 : 0.5) * vh);
  const fs = desk ? 13 : 11;
  const below = desk ? 40 : 34;
  const above = fs + 12;
  const SH = H + above + below;
  const gy = above + H; // ground line
  const gut = desk ? 48 : 16;
  const x0 = desk ? gut + 4 * (W - 2 * gut) / 12 : 44;
  const N = cps.length;
  const cw = (W - x0) / N;
  const max = Math.max(...cps.map(c => c.locked_near || 0));
  const h = v => (v / max) * H;
  const bl = 14;

  box.setAttribute('aria-label', `a black stepped monolith, one column per checkpoint: intents.near had ${fmt(cps[0].locked_near, 'near0')} near locked on ${fmt(cps[0].timestamp_utc, 'date')} and ${fmt(cps[N - 1].locked_near, 'near0')} on ${fmt(cps[N - 1].timestamp_utc, 'date')}, growing at every step.`);

  const s = svg(box, W, SH, 'mono-svg');
  s.style.marginLeft = `calc(-1 * var(--g))`;
  let d = `M${x0} ${gy + bl}`;
  cps.forEach((c, i) => {
    const xl = x0 + i * cw, xr = i === N - 1 ? W + bl : x0 + (i + 1) * cw;
    d += `L${xl.toFixed(1)} ${(gy - h(c.locked_near)).toFixed(1)}L${xr.toFixed(1)} ${(gy - h(c.locked_near)).toFixed(1)}`;
  });
  d += `L${W + bl} ${gy + bl}Z`;
  const cp = el('clipPath', { id: 'mono-clip' }, el('defs', {}, s));
  el('rect', { x: -bl, y: -20, width: W + 2 * bl, height: gy + 20 }, cp);
  const wipe = el('g', { class: 'wipe' }, s);
  el('path', { d, fill: 'var(--ink)' }, el('g', { filter: 'url(#ink-edge)' }, el('g', { 'clip-path': 'url(#mono-clip)' }, wipe)));
  hair(s, 0, W, gy + 0.5);

  // label every column only when the month names fit side by side; otherwise every other one
  const every = cw >= fs * 0.58 * 9 + 10 ? 1 : 2;
  const show = i => (desk ? (i % every === (N - 1) % every) : (i === 0 || i === N - 1 || i === Math.floor((N - 1) / 2)));
  const labels = el('g', { class: 'labels' }, s);
  cps.forEach((c, i) => {
    const cx = x0 + i * cw + cw / 2;
    const data = { block: String(c.block), account: 'intents.near', src: 'view_account_at_block' };
    // hit area: tapping a column opens its query
    const hit = el('a', { class: 'q col', href: '#q', 'data-f': `lock.checkpoints[${i}].locked_near`, 'aria-label': `${fmt(c.timestamp_utc, 'date')}: ${fmt(c.locked_near, 'near0')} near locked` }, labels);
    Object.assign(hit.dataset, data);
    el('rect', { x: x0 + i * cw, y: gy - h(c.locked_near), width: cw, height: h(c.locked_near), fill: 'transparent' }, hit);
    const vis = show(i);
    if (vis) hit.setAttribute('tabindex', '-1');
    const anchor = i === N - 1 && !desk ? 'end' : 'middle';
    const lx = anchor === 'end' ? W - gut : cx;
    const a = num(labels, D, `lock.checkpoints[${i}].locked_near`, 'k0', lx, gy - h(c.locked_near) - 8, { anchor, data });
    a.classList.toggle('opt', !vis);
    if (!vis) a.setAttribute('tabindex', '-1');
    a.style.setProperty('--i', i);
    const ta = i === 0 && !desk ? 'start' : anchor;
    const tx = ta === 'start' ? Math.max(gut, x0 + 2) : lx;
    const b = num(labels, D, `lock.checkpoints[${i}].timestamp_utc`, desk ? 'month' : 'month', tx, gy + fs + 8, { anchor: ta, data });
    b.classList.toggle('opt', !vis);
    if (!vis) b.setAttribute('tabindex', '-1');
    b.style.setProperty('--i', i);
  });
  // tapping a hidden column reveals its label
  labels.addEventListener('click', e => {
    const c = e.target.closest('a.col');
    if (!c) return;
    const i = c.dataset.f.match(/\d+/)[0];
    labels.querySelectorAll('.opt').forEach(o => o.classList.remove('shown'));
    labels.querySelectorAll(`a.n[data-f^="lock.checkpoints[${i}]"]`).forEach(o => o.classList.add('shown'));
  });

  figure(s, 'figure-look-up', desk ? x0 - 14 : 22, gy, figH());
}
