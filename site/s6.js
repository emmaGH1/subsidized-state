// section 1 · cover, section 6 · verdict (tests, facts, verify live)

import { el, hair, svg, figure, fmt, get, isDesk, figH, yocto } from './lib.js';
import { gapScale } from './s5.js';
import { rpc, FALLBACK_LIVE } from './query.js';

const $ = (s, r = document) => r.querySelector(s);

export function drawCover(D, sec) {
  const g = sec.querySelector('.ground');
  g.replaceChildren();
  const W = innerWidth, gut = isDesk() ? 48 : 16;
  const h = figH() + 4;
  g.setAttribute('width', W); g.setAttribute('height', h); g.setAttribute('viewBox', `0 0 ${W} ${h}`);
  hair(g, 0, W, h - 0.5);
  const fx = isDesk() ? gut + 9.5 * (W - 2 * gut) / 12 : W * 0.7;
  figure(g, 'figure-stand', fx, h - 0.5, figH());
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
