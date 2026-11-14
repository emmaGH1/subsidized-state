// section 4 · who pays: three squares on one area scale and the red line between them

import { el, hair, line, svg, figure, fmt, isDesk, figH } from './lib.js';

export function drawPayer(D, sec, { reduce }) {
  const box = sec.querySelector('.drawing');
  box.replaceChildren();
  const p = D.payer;
  if (!p || !p.treasury || !p.refiller) throw new Error('no payer');
  const desk = isDesk();
  const W = innerWidth, gut = desk ? 48 : 16;
  const fs = desk ? 13 : 11, lh = fs + 4;
  const tN = (p.treasury.staked_near || 0) + (p.treasury.liquid_near || 0);
  const rN = p.refiller.balance_near || 0;
  const iN = D.lock.checkpoints[D.lock.checkpoints.length - 1].free_near || 0;
  // desktop: the treasury square takes the height left under the words
  let ts = W * 0.46;
  if (desk) {
    const st = sec.getBoundingClientRect().top;
    const top = Math.max(...['.hl', '.copy'].map(q => sec.querySelector(q).getBoundingClientRect().bottom)) - st;
    const avail = innerHeight - top - 48;
    ts = Math.max(180, Math.min(avail - 150, 0.36 * (W - 2 * gut), 460));
  }
  const k = v => Math.max(3, ts * Math.sqrt(v / tN));
  const rs = k(rN), is = k(iN);
  const col = c => gut + (c - 1) * (W - 2 * gut) / 12;

  box.setAttribute('aria-label', `three black squares sized by the near they hold: the treasury dao with ${fmt(tN, 'near0')} near, intents_refiller.near with ${fmt(rN, 'near0')}, and intents.near with ${fmt(iN, 'near0')} spare. a red line runs from the treasury through the refiller to intents.near. ${fmt(p.approved_to_refiller_count, 'int')} approved proposals hang from it. the figure, the users, stands apart with no line to it.`);

  const appr = (p.proposals_to_refiller || []).filter(x => x.status === 'Approved');
  const times = appr.map(x => Date.parse(x.submitted_utc));
  const t0 = Math.min(...times), t1 = Math.max(...times);
  const tickLen = a => (a / 5000) * 8;

  let H, T, R, I, path1, path2, span, fl1, fl2, U;
  if (desk) {
    H = ts + 150;
    const gy = ts + 30;
    T = { x: col(1), y: gy - ts, s: ts };
    R = { x: col(6), y: gy - rs, s: rs };
    I = { x: col(9), y: gy - is, s: is };
    const ly = gy - Math.max(rs * 0.5, 22);
    path1 = `M${T.x + ts} ${ly}H${R.x}`;
    const ix = I.x + is / 2;
    path2 = `M${R.x + rs} ${ly}H${ix}V${I.y}`;
    span = { x0: T.x + ts + 18, x1: R.x - 18, y: ly, dir: 1 };
    fl1 = { x: T.x + ts + 14, y: ly - 10, a: 'start' };
    fl2 = { x: R.x + rs + 14, y: ly - 10 - lh, a: 'start', two: true };
    U = { x: col(12) + (W - 2 * gut) / 24, gy: gy + 46 };
    const s = svg(box, W, H);
    s.style.marginLeft = 'calc(-1 * var(--g))';
    hair(s, 0, col(10) + 20, gy + 0.5);
    build(s, gy);
  } else {
    const top = 2 * lh + 6;
    T = { x: gut, y: top, s: ts };
    const ly = T.y + ts * 0.82;
    R = { x: W - gut - rs, y: ly + 64, s: rs };
    const y2 = R.y + rs + 96;
    I = { x: gut, y: y2 - is / 2, s: is };
    path1 = `M${T.x + ts} ${ly}H${R.x + rs / 2}V${R.y}`;
    path2 = `M${R.x + rs / 2} ${R.y + rs}V${y2}H${I.x + is}`;
    span = { x0: T.x + ts + 14, x1: R.x + rs / 2 - 14, y: ly, dir: 1 };
    fl1 = { x: T.x + ts + 10, y: ly - 10, a: 'start' };
    fl2 = { x: I.x + is + 16, y: y2 - 10, a: 'start' };
    U = { x: W - gut - 14, gy: y2 + 92, left: true };
    H = U.gy + 8;
    const s = svg(box, W, H);
    s.style.marginLeft = 'calc(-1 * var(--g))';
    build(s, null);
  }

  function build(s, gy) {
    const sq = el('g', { class: 'sq' }, s);
    const ink = el('g', { filter: 'url(#ink-edge)' }, sq);
    for (const q of [T, R, I]) el('rect', { x: q.x, y: q.y, width: q.s, height: q.s, fill: 'var(--ink)' }, ink);

    const red = el('g', { class: 'flow' }, s);
    const rl = el('g', { filter: 'url(#ink-line)' }, red);
    el('path', { d: path1, fill: 'none', stroke: 'var(--red)', 'stroke-width': 2, pathLength: 1, class: 'draw1' }, rl);
    el('path', { d: path2, fill: 'none', stroke: 'var(--red)', 'stroke-width': 2, pathLength: 1, class: 'draw2' }, rl);
    // cap at intents
    const cap = desk ? { x: I.x + is / 2 - 3, y: I.y - 6 } : { x: I.x + is, y: I.y + is / 2 - 3 };
    el('rect', { x: cap.x, y: cap.y, width: 6, height: 6, fill: 'var(--red)', class: 'cap' }, red);

    // proposal ticks, spaced by submitted_utc along the first span
    const ticks = el('g', { class: 'ticks' }, s);
    appr.forEach((x, i) => {
      const t = Date.parse(x.submitted_utc);
      const tx = t1 > t0 ? span.x0 + (t - t0) / (t1 - t0) * (span.x1 - span.x0) : (span.x0 + span.x1) / 2;
      const j = p.proposals_to_refiller.indexOf(x);
      const a = el('a', { class: 'q tick', href: '#q', 'data-f': `payer.proposals_to_refiller[${j}].amount_near`, 'aria-label': `proposal ${x.id}: ${fmt(x.amount_near, 'near0')} near on ${fmt(x.submitted_utc, 'date')}` }, ticks);
      el('rect', { x: tx - 5, y: span.y, width: 10, height: 22, fill: 'transparent' }, a);
      el('rect', { x: tx - 1, y: span.y, width: 2, height: tickLen(x.amount_near), fill: 'var(--red)' }, a);
      a.style.setProperty('--i', i);
    });

    // loop: one small red square travelling the path
    if (!reduce) {
      const m = el('rect', { x: -2, y: -2, width: 4, height: 4, fill: 'var(--red)', class: 'traveller', visibility: 'hidden' }, red);
      const am = el('animateMotion', { dur: '4s', repeatCount: 'indefinite', path: (path1 + (desk ? '' : '') + ' ' + path2.replace(/^M[^HV]+/, m => 'L' + m.slice(1))), begin: 'indefinite' }, m);
      m._am = am;
    }

    const labs = el('g', { class: 'labs' }, s);
    // flow labels (red)
    line(labs, D, [['payer.approved_to_refiller_near', 'near0'], ' near approved'], fl1.x, fl1.y, 'red', fl1.a);
    if (fl2.two) {
      line(labs, D, [['sawtooth.refill_amount_median_near', 'near0'], ' near per refill'], fl2.x, fl2.y, 'red', fl2.a);
      line(labs, D, [['sawtooth.refilled_near', 'near0'], ' in ', ['sawtooth.window.days', 'num1'], ' days'], fl2.x, fl2.y + lh, 'red', fl2.a);
    } else {
      line(labs, D, [['sawtooth.refill_amount_median_near', 'near0'], ' near per refill · ', ['sawtooth.refilled_near', 'near0'], ' in ', ['sawtooth.window.days', 'num1'], ' days'], fl2.x, fl2.y, 'red', fl2.a);
    }

    // node labels
    const tl = [p.treasury.account, [['payer.treasury.staked_near', 'near0'], ' near staked · ', ['payer.treasury.liquid_near', 'near0'], ' liquid']];
    const rlab = [p.refiller.account, [['payer.refiller.balance_near', 'near0'], ' near · ', ['payer.refiller.access_key_count', 'int'], ' keys · ', p.refiller.has_contract ? 'has a contract' : 'no contract']];
    const il = ['intents.near', [['lock.checkpoints[-1].free_near', 'near0'], ' near spare']];
    const two = (l, x, y, a) => { line(labs, D, [l[0]], x, y, 'lab', a); line(labs, D, l[1], x, y + lh, '', a); };
    if (desk) {
      two(tl, T.x, gy + fs + 12, 'start');
      two(rlab, R.x, gy + fs + 12, 'start');
      two(il, I.x, gy + fs + 12, 'start');
    } else {
      two(tl, T.x, fs, 'start');
      two(rlab, R.x - 10, R.y + rs / 2 - lh / 2 + 4, 'end');
      two(il, I.x, I.y + is + fs + 10, 'start');
    }

    // users: the figure, apart, on its own short ground, no line to it
    const ug = el('g', { class: 'users' }, s);
    hair(ug, U.x - 40, U.x + 14, U.gy + 0.5);
    figure(ug, 'figure-stand', U.x, U.gy, figH());
    if (U.left) {
      line(ug, D, ['users'], U.x - 48, U.gy - lh - 2, 'lab', 'end');
      line(ug, D, ['not on this line'], U.x - 48, U.gy - 2, '', 'end');
    } else {
      line(ug, D, ['users'], U.x + 14, U.gy + fs + 10, 'lab', 'end');
      line(ug, D, ['not on this line'], U.x + 14, U.gy + fs + 10 + lh, '', 'end');
    }
  }
}

export function startPayerLoop(sec) {
  const t = sec.querySelector('.traveller');
  if (t && t._am && !t._started) { t._started = true; try { t._am.beginElementAt(2.6); setTimeout(() => t.setAttribute('visibility', 'visible'), 2600); } catch (e) { /* no smil */ } }
}
