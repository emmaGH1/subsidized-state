// optional: a 30-day refill trace from data/refills_30d.json. absent or empty: nothing is drawn.

import { el, hair, fmt } from './lib.js';

export async function load30() {
  try {
    const r = await fetch('../data/refills_30d.json', { cache: 'no-cache' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.window && Array.isArray(j.refills) && j.refills.length ? j : null;
  } catch (e) { return null; }
}

// one tick per refill across the window: red from intents_refiller.near, ink from anyone else, hollow if unresolved
export function draw30(D, sec) {
  const wrap = sec.querySelector('.r30');
  if (!wrap) return;
  const R = D.refills_30d;
  if (!R) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const box = wrap.querySelector('svg');
  box.replaceChildren();
  const W = Math.max(120, wrap.clientWidth), H = 22;
  box.setAttribute('width', W); box.setAttribute('height', H); box.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const a0 = R.window.from_block, a1 = R.window.to_block;
  const x = b => 2 + ((b - a0) / Math.max(1, a1 - a0)) * (W - 4);
  hair(box, 0, W, H - 0.5);
  R.refills.forEach((r, i) => {
    const who = r.predecessor_id;
    const a = el('a', { class: 'q tick30', href: '#q', 'data-f': `refills_30d.refills[${i}].amount_near`,
      'aria-label': `refill of ${fmt(r.amount_near, 'near0')} near at block ${fmt(r.block, 'int')} from ${who ?? 'an unresolved sender'}` }, box);
    const tx = x(r.block);
    el('rect', { x: tx - 4, y: 0, width: 8, height: H, fill: 'transparent' }, a);
    if (who == null) el('rect', { x: tx - 1.5, y: 4.5, width: 3, height: H - 5.5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1 }, a);
    else el('rect', { x: tx - 1, y: 4, width: 2, height: H - 4.5, fill: who === 'intents_refiller.near' ? 'var(--red)' : 'var(--ink)' }, a);
  });
  box.setAttribute('aria-label', `${fmt(R.refill_count, 'int')} top-ups to intents.near over ${fmt(R.window.days, 'int')} days, one tick each: red from intents_refiller.near, black from any other sender, hollow where the sender is unresolved.`);
}
