// section 1 · cover, section 6 · verdict (tests, facts, verify live)

import { el, hair, svg, figure, fmt, get, isDesk, isTwo, isShort, figH, clamp, yocto, CALC } from './lib.js';
import { drawLedger } from './ledger.js';
import { gapScale } from './s5.js';
import { rpc, FALLBACK_LIVE } from './query.js';

const $ = (s, r = document) => r.querySelector(s);

export function drawCover(D, sec) {
  const desk = isDesk(), two = isTwo();
  const W = innerWidth, gut = desk ? 48 : 16, fs = desk ? 13 : 11, lh = fs + 4;
  const vh = innerHeight;

  // the ground: the real spare-balance trace, red risers, the figure standing on it
  const g = sec.querySelector('.ground');
  g.replaceChildren();
  const st = D.sawtooth;
  const GH = two ? Math.round(clamp(0.13 * vh, 64, 130)) : 76;
  g.setAttribute('width', W); g.setAttribute('height', GH); g.setAttribute('viewBox', `0 0 ${W} ${GH}`);
  const trace = [...(st.trace || [])].sort((a, b) => a.block - b.block);
  if (trace.length > 1) {
    const from = st.window.from_block, to = st.window.to_block;
    const x = b => ((b - from) / (to - from)) * W;
    const max = 1.15 * st.free_max_near;
    const y = v => GH - (v / max) * GH; // zero-based: the bottom edge is 0 near spare
    const rBy = new Map((st.refills || []).map(r => [r.block, r]));
    const pts = [];
    trace.forEach((p, i) => {
      const r = rBy.get(p.block);
      if (r && i > 0) { pts.push([x(p.block), y(r.free_before_near)], [x(p.block), y(r.free_after_near)]); }
      else pts.push([x(p.block), y(p.free_near)]);
    });
    const d = `M-14 ${GH + 14}L-14 ${pts[0][1].toFixed(1)}` + pts.map(([a, b]) => `L${a.toFixed(1)} ${b.toFixed(1)}`).join('') + `L${W + 14} ${pts[pts.length - 1][1].toFixed(1)}L${W + 14} ${GH + 14}Z`;
    const cid = 'cover-clip';
    el('rect', { x: -14, y: -40, width: W + 28, height: GH + 40 }, el('clipPath', { id: cid }, el('defs', {}, g)));
    el('path', { d, fill: 'var(--ink)' }, el('g', { filter: 'url(#ink-edge)' }, el('g', { 'clip-path': `url(#${cid})` }, g)));
    (st.refills || []).forEach((r, i) => {
      const rx = x(r.block), y0 = y(r.free_before_near), y1 = y(r.free_after_near);
      const a = el('a', { class: 'riser', href: '#q', 'data-f': `sawtooth.refills[${i}].amount_near`, 'data-refill': i,
        'aria-label': `refill of ${fmt(r.amount_near, 'near0')} near at block ${fmt(r.block, 'int')}` }, g);
      el('rect', { x: rx - 10, y: y1 - 8, width: 20, height: y0 - y1 + 16, fill: 'transparent' }, a);
      el('rect', { x: rx - 1.5, y: y1, width: 3, height: Math.max(1, y0 - y1), fill: 'var(--red)', filter: 'url(#ink-riser)' }, a);
    });
    // the figure stands on the trace, late in the window
    const fx = W * (two ? 0.86 : 0.78);
    let fy = pts[0][1];
    for (const [px, py] of pts) { if (px > fx) break; fy = py; }
    figure(g, 'figure-stand', fx, fy + 1, figH());
    g.setAttribute('aria-label', `the ground is the spare balance of intents.near over ${fmt(st.window.days, 'num1')} days: it slides down, then jumps up ${fmt(st.refill_count, 'int')} times, each a red riser.`);
  }

  // the ledger: a year of new supply and what offset it, to scale by area
  const box = sec.querySelector('.ledger');
  box.replaceChildren();
  const titleH = 2 * lh + 10;
  let side;
  if (two) {
    const top = desk ? 70 : 48;
    // fit the first screen when it is tall enough; on short landscape screens let the cover grow
    side = Math.min(0.42 * (W - 2 * gut), isShort() ? Infinity : Math.max(240, vh - top - GH - 70 - titleH));
    side = Math.min(side, 820);
  } else side = Math.min(W - 2 * gut, 520);
  side = Math.round(side);
  const s = svg(box, side + 2, side + titleH + 2, 'ledger-svg');
  drawLedger(s, D, { x: 1, y: titleH, side, fs });
  box.setAttribute('aria-label', `a square whose area is the ${fmt(D.gap.net_issuance_near_per_year, 'near0')} near of new supply in a year. on its floor, to scale: a hatched square for the ${fmt(CALC.vaults_change_365d.v(D), 'near0')} near the two fee vaults gained, a black square for the ${fmt(D.gas_burn.burned_near_per_year, 'near0')} near burned as gas, and a red square for the ${fmt(D.gap.lock_near_per_year, 'near0')} near locked under intents.near. the rest of the square, ${fmt(CALC.uncaptured_pct.v(D), 'pct1')}, has no offset measured here.`);
}

export function drawVerdict(D, sec) {
  const box = sec.querySelector('.vfig');
  box.replaceChildren();
  const { k } = gapScale(D);
  const s = k(D.gap.lock_near_per_year);
  const W = innerWidth, fh = figH();
  const H = Math.max(s, fh) + 2;
  box.setAttribute('aria-label', `the figure beside the ${fmt(D.gap.lock_near_per_year, 'near0')} near locked in a year, drawn at the same scale as the issuance square above.`);
  const v = svg(box, W, H, 'vfig-svg');
  v.style.marginLeft = 'calc(-1 * var(--g))';
  const gut = isDesk() ? 48 : 16;
  hair(v, 0, W, H - 0.5);
  figure(v, 'figure-stand', gut + 5, H - 0.5, fh);
  el('rect', { x: gut + 18, y: H - 0.5 - s, width: s, height: s, fill: 'var(--ink)' }, v);
}

export function renderTests(D, sec) {
  const rows = $('.tests .rows', sec);
  rows.replaceChildren();
  if (!Array.isArray(D.claims)) { rows.textContent = 'unavailable'; return; }
  D.claims.forEach((c, i) => {
    const r = document.createElement('div');
    r.className = 'row';
    const checks = (c.checks || []).map((k, j) =>
      `<span class="chk">${esc(k.field)} ${esc(k.op)} ${esc(String(k.value))} — observed <a class="n" data-f="claims[${i}].checks[${j}].observed" data-fmt="raw"></a></span>`).join('');
    r.innerHTML = `<span class="id label">${esc(c.id)}</span><span class="st">${esc(c.statement)}</span><span class="checks">${checks}</span><span class="res">${c.pass ? 'pass' : 'fail'}</span>`;
    rows.appendChild(r);
  });
}

export function renderFacts(D, sec) {
  const roles = $('.roles', sec);
  const acl = D.facts && D.facts.omft_acl && D.facts.omft_acl.roles;
  if (!acl) { roles.textContent = 'roles (unavailable)'; return; }
  const who = D.facts.bridge_mng.account || 'bridge-mng.near';
  const names = Object.entries(acl).filter(([, v]) => (v.grantees || []).includes(who)).map(([k]) => k);
  roles.textContent = names.length === 0 ? 'no roles'
    : names.length === 1 ? `${names[0]} role` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} roles`;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initVerify(D, sec) {
  const btn = $('.verify-btn', sec), out = $('.verify-out', sec);
  if (btn.dataset.init) return;
  btn.dataset.init = '1';
  btn.addEventListener('click', async () => {
    out.textContent = 'asking mainnet…';
    btn.disabled = true;
    const q = (method, params) => JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const acct = (id, type = 'view_account') => q('query', { request_type: type, finality: 'final', account_id: id });
    const calls = [
      q('block', { finality: 'final' }),
      acct('intents.near'),
      acct(D.vaults.buybacks.account || 'buybacks.multisignature.near'),
      acct(D.facts.bridge_mng.account || 'bridge-mng.near', 'view_access_key_list'),
      acct(D.payer.refiller.account || 'intents_refiller.near'),
    ];
    const run = async url => { const r = []; for (const c of calls) r.push(await rpc(url, c)); return r; };
    try {
      let res;
      try { res = await run(D.meta.endpoints.live); }
      catch (e) { res = await run(FALLBACK_LIVE); }
      const [blk, ia, bb, keys, rf] = res.map(r => r.result);
      const toN = y => Number(BigInt(y) / 10n ** 20n) / 1e4;
      const liveH = blk.header.height;
      const lockLive = ia.storage_usage * 1e-5;
      const spareLive = toN(ia.amount) - lockLive;
      const last = D.lock.checkpoints[D.lock.checkpoints.length - 1];
      const rows = [
        ['state locked (near)', last.locked_near, lockLive, 'near2'],
        ['spare balance (near)', last.free_near, spareLive, 'near2'],
        ['total supply (near)', D.issuance.total_supply_near, toN(blk.header.total_supply), 'near2'],
        ['buyback vault (near)', D.vaults.buybacks.balance_near, toN(bb.amount), 'near2'],
        ['bridge-mng keys', D.facts.bridge_mng.access_key_count, keys.keys.length, 'int'],
      ];
      const diff = (a, b, f) => (a == null || b == null ? 'unavailable' : (b - a >= 0 ? '+' : '−') + fmt(Math.abs(b - a), f));
      const dLock = lockLive - last.locked_near, dB = liveH - last.block;
      out.innerHTML = `<table><thead><tr><th>value</th><th>artifact (block ${esc(fmt(D.meta.head_block, 'int'))})</th><th>live (block ${esc(fmt(liveH, 'int'))})</th><th>difference</th></tr></thead><tbody>${
        rows.map(([n, a, b, f]) => `<tr><td>${n}</td><td>${fmt(a, f)}</td><td>${fmt(b, f)}</td><td>${diff(a, b, f)}</td></tr>`).join('')
      }</tbody></table><p>since the artifact was built, intents.near locked ${fmt(dLock, 'near0')} more near in ${fmt(dB, 'int')} blocks.</p>`;
    } catch (e) {
      out.textContent = `mainnet did not answer (${e.status || e.message}). run python3 scripts/rebuild.py to check from your own machine.`;
    } finally { btn.disabled = false; }
  });
}
