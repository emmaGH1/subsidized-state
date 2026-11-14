// the query strip: every number opens the query that produced it

import { fmt, get, CALC, yocto } from './lib.js';

const $ = (s, r = document) => r.querySelector(s);
export const FALLBACK_LIVE = 'https://rpc.mainnet.near.org';

// one-line meanings, from data/SCHEMA.md
const MEANING = {
  'meta.head_block': 'final block all "now" values are anchored to',
  'meta.head_timestamp_utc': 'header timestamp of head_block',
  'constants.near_per_mb': 'protocol storage price in near per megabyte: storage_amount_per_byte × 10^6 / 10^24',
  'lock.checkpoints[].storage_usage_bytes': 'view_account.storage_usage of intents.near at this block',
  'lock.checkpoints[].locked_near': 'storage_usage_bytes × storage_amount_per_byte / 10^24',
  'lock.checkpoints[].amount_near': 'view_account.amount at this block',
  'lock.checkpoints[].free_near': 'amount_near − locked_near: what the account can spend before new state is refused',
  'lock.checkpoints[].timestamp_utc': 'header timestamp of the checkpoint block',
  'lock.checkpoints[].block': 'height read',
  'lock.growth_365d.near': 'locked_near at the last checkpoint − locked_near at the first',
  'lock.growth_365d.days': 'exact days between the first and last checkpoint header timestamps',
  'lock.locked_share_of_balance_pct': 'locked_near / amount_near × 100 at head',
  'sawtooth.free_min_near': 'lowest free balance over the trace',
  'sawtooth.free_max_near': 'highest free balance over the trace',
  'sawtooth.trigger_free_mean_near': 'mean of free_before_near over all refills',
  'sawtooth.refill_amount_median_near': 'median amount_near over all refills',
  'sawtooth.refill_count': 'steps up in free balance of more than 100 near inside the window',
  'sawtooth.refilled_near': 'sum of amount_near over all refills',
  'sawtooth.interval_hours_mean': 'mean gap between consecutive refills, from header timestamps',
  'sawtooth.from_refiller_pct': 'share of refills whose receipt predecessor_id is intents_refiller.near',
  'sawtooth.window.days': 'days between the window\'s first and last block, from header timestamps',
  'sawtooth.refills[].amount_near': 'amount at block − amount at block − 1',
  'sawtooth.refills[].block': 'first block where the higher balance is visible',
  'sawtooth.refills[].timestamp_utc': 'header timestamp of the refill block',
  'sawtooth.refills[].free_before_near': 'free balance at block − 1',
  'sawtooth.refills[].free_after_near': 'free balance at block',
  'payer.treasury.liquid_near': 'view_account.amount of the treasury dao at head',
  'payer.treasury.staked_near': 'get_account.staked_balance of the treasury on its staking pool',
  'payer.refiller.balance_near': 'view_account.amount of intents_refiller.near at head',
  'payer.refiller.access_key_count': 'number of access keys on intents_refiller.near',
  'payer.approved_to_refiller_near': 'sum of approved Transfer proposals from the treasury dao to intents_refiller.near',
  'payer.approved_to_refiller_count': 'number of approved Transfer proposals to intents_refiller.near',
  'payer.proposals_to_refiller[].amount_near': 'native near transfer proposed to intents_refiller.near',
  'issuance.d365.annualized_pct': 'annualized_near / supply_from_near × 100',
  'issuance.total_supply_near': 'header total_supply at head_block',
  'gas_burn.burned_near_per_year': 'Σ burned / Σ seconds × 31,536,000, from intra-epoch total_supply decline',
  'gas_burn.pct_of_net_issuance': 'burned_near_per_year / issuance.d365.annualized_near × 100',
  'gap.lock_near_per_year': 'lock.growth_365d.near_per_year: locked growth, annualised',
  'gap.net_issuance_near_per_year': 'issuance.d365.annualized_near: header total_supply change over 365 days',
  'gap.lock_pct_of_issuance': 'lock_near_per_year / net_issuance_near_per_year × 100',
  'gap.multiple': 'net_issuance_near_per_year / lock_near_per_year',
  'gap.state_gb_per_year_now': 'lock.growth_365d.gb_per_year: storage growth in bytes / 10^9, annualised',
  'gap.state_gb_per_year_to_offset': 'net_issuance_near_per_year / (near_per_mb × 1000)',
  'gap.near_per_gb': 'near_per_mb × 1000',
  'vaults.buybacks.balance_near': 'view_account.amount of buybacks.multisignature.near at head',
  'vaults.buybacks.net_change_30d_near': 'balance now − balance at issuance.d30.from_block',
  'vaults.buybacks.num_confirmations': 'get_num_confirmations on the multisig',
  'vaults.buybacks.access_key_count': 'number of access keys on buybacks.multisignature.near',
  'vaults.fefunds.balance_near': 'view_account.amount of fefundsadmin.sputnik-dao.near at head',
  'facts.bridge_mng.access_key_count': 'number of access keys on bridge-mng.near',
  'facts.bridge_mng.full_access_key_count': 'number of FullAccess keys on bridge-mng.near',
  'facts.v1_signer.threshold': 'state().Running.parameters.threshold on v1.signer',
  'facts.v1_signer.participants': 'number of participants in state().Running on v1.signer',
  'facts.omft_float.total_usd': 'Σ ft_total_supply × third-party price over *.omft.near tokens',
  'facts.omft_float.contracts_queried': '*.omft.near tokens with a supply read',
  'facts.omft_float.zec_share_pct': 'zec.omft.near supply × price / total_usd × 100',
};

const norm = f => f.replace(/\[-?\d+\]/g, '[]');
const idx = (f, name) => { const m = f.match(new RegExp(name + '\\[(-?\\d+)\\]')); return m ? +m[1] : null; };
const at = (arr, i) => (Array.isArray(arr) ? arr[i < 0 ? arr.length + i : i] : undefined);

// field path -> where it was read
export function resolve(D, f, depth = 0) {
  const head = D.meta.head_block;
  const r = { src: 'view_account', block: head, account: null, formula: null, extra: [] };
  const n = norm(f);
  if (f.startsWith('calc.')) {
    const c = CALC[f.slice(5)];
    return { ...resolve(D, c.under, depth + 1), formula: c.formula, meaning: 'computed on this page' };
  }
  if (f.startsWith('claims[')) {
    const ci = idx(f, 'claims'), ki = idx(f, 'checks');
    const ck = at(at(D.claims, ci).checks, ki);
    return { ...resolve(D, ck.field, depth + 1), meaning: `${ck.field} ${ck.op} ${ck.value}`, title: ck.field };
  }
  if (f.startsWith('meta.')) return { ...r, src: 'block_header_at_height' };
  if (f.startsWith('constants.') || f === 'gap.near_per_gb') return { ...r, src: 'protocol_config' };
  if (f.startsWith('lock.checkpoints')) {
    const cp = at(D.lock.checkpoints, idx(f, 'checkpoints'));
    return { ...r, src: 'view_account_at_block', block: cp.block, ts: cp.timestamp_utc, account: 'intents.near' };
  }
  if (f.startsWith('lock.') || f === 'gap.lock_near_per_year' || f === 'gap.state_gb_per_year_now') {
    const g = D.lock.growth_365d;
    return { ...r, src: 'view_account_at_block', block: g.to_block, account: 'intents.near',
      formula: f.startsWith('lock.growth') || f.startsWith('gap.') ? `read at blocks ${fmt(g.from_block, 'int')} and ${fmt(g.to_block, 'int')}; the curl below is the second` : null };
  }
  if (f.startsWith('sawtooth.refills')) {
    const i = idx(f, 'refills'), rf = at(D.sawtooth.refills, i);
    return { ...r, src: 'view_account_at_block', block: rf.block, ts: rf.timestamp_utc, account: 'intents.near', refill: i };
  }
  if (f.startsWith('sawtooth.')) {
    const st = D.sawtooth, tr = st.trace || [];
    if (f === 'sawtooth.free_min_near' || f === 'sawtooth.free_max_near') {
      const key = f.endsWith('min_near') ? 'min' : 'max';
      const p = tr.reduce((a, b) => (key === 'min' ? (b.free_near < a.free_near ? b : a) : (b.free_near > a.free_near ? b : a)), tr[0]);
      return { ...r, src: 'view_account_at_block', block: p.block, account: 'intents.near' };
    }
    if (f.startsWith('sawtooth.window')) return { ...r, src: 'block_header_at_height', block: st.window.from_block };
    const rf = (st.refills || [])[0] || {};
    const extra = (st.refills || []).map(x => `block ${fmt(x.block, 'int')} · +${fmt(x.amount_near, 'near2')} · ${fmt(x.free_before_near, 'near2')} → ${fmt(x.free_after_near, 'near2')} · from ${x.predecessor_id ?? 'unavailable'}`);
    return { ...r, src: f === 'sawtooth.from_refiller_pct' ? 'neardata_block' : 'view_account_at_block', block: rf.block ?? head, account: 'intents.near',
      formula: `computed over ${fmt((st.refills || []).length, 'int')} refills; the curl below reads the first`, extra };
  }
  if (f.startsWith('payer.')) {
    const p = D.payer;
    if (f === 'payer.treasury.staked_near') return { ...r, src: 'pool_get_account' };
    if (f.startsWith('payer.treasury')) return { ...r, account: p.treasury.account };
    if (f === 'payer.refiller.access_key_count') return { ...r, src: 'view_access_key_list', account: p.refiller.account };
    if (f.startsWith('payer.refiller')) return { ...r, account: p.refiller.account };
    const extra = (p.proposals_to_refiller || []).map(x => `proposal #${x.id} · ${fmt(x.amount_near, 'near0')} near · ${fmt(x.submitted_utc, 'date')} · ${x.status}`);
    const pi = idx(f, 'proposals_to_refiller');
    if (pi !== null) {
      const x = at(p.proposals_to_refiller, pi);
      return { ...r, src: 'dao_get_proposals', title: `proposal #${x.id} · ${fmt(x.amount_near, 'near0')} near · ${fmt(x.submitted_utc, 'date')} · ${x.status}`, extra };
    }
    return { ...r, src: 'dao_get_proposals', extra };
  }
  if (f.startsWith('issuance.') || f === 'gap.net_issuance_near_per_year' || f.startsWith('gap.')) {
    const d = f.includes('d30') ? D.issuance.d30 : D.issuance.d365;
    return { ...r, src: 'block_header_at_height', block: d.from_block,
      formula: `header total_supply at blocks ${fmt(d.from_block, 'int')} and ${fmt(d.to_block, 'int')}; the curl below is the first` };
  }
  if (f.startsWith('gas_burn.')) {
    const e = (D.gas_burn.epochs || [])[0] || {};
    return { ...r, src: 'block_header_at_height', block: e.first_block ?? head,
      formula: `header total_supply at blocks ${fmt(e.first_block, 'int')} and ${fmt(e.last_block, 'int')}; ${D.gas_burn.method || ''}` };
  }
  if (f.startsWith('vaults.')) {
    const v = D.vaults[f.split('.')[1]];
    if (/net_change_30d|30d_ago/.test(f)) return { ...r, src: 'view_account_at_block', block: D.issuance.d30.from_block, account: v.account, formula: 'balance at head − balance at the block below' };
    if (/net_change_365d|365d_ago/.test(f)) return { ...r, src: 'view_account_at_block', block: D.issuance.d365.from_block, account: v.account };
    if (f.endsWith('num_confirmations')) return { ...r, src: 'multisig_confirmations' };
    if (f.endsWith('access_key_count')) return { ...r, src: 'view_access_key_list', account: v.account };
    return { ...r, account: v.account };
  }
  if (f.startsWith('facts.bridge_mng')) return { ...r, src: f.endsWith('has_contract') ? 'view_account' : 'view_access_key_list', account: 'bridge-mng.near' };
  if (f.startsWith('facts.v1_signer')) return { ...r, src: 'signer_state' };
  if (f.startsWith('facts.omft_acl')) return { ...r, src: 'omft_acl' };
  if (f === 'facts.omft_float.total_usd' || f === 'facts.omft_float.zec_usd') return { ...r, src: 'oneclick_tokens' };
  if (f.startsWith('facts.omft_float')) return { ...r, src: 'ft_total_supply' };
  return r;
}

const ENDPOINT = (D, e) => (e === 'live' ? D.meta.endpoints.live : e === 'archival' ? D.meta.endpoints.archival : e);

function subst(v, block, account) {
  if (v === '<block>') return Number(block);
  if (v === '<account>') return account;
  if (Array.isArray(v)) return v.map(x => subst(x, block, account));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, subst(x, block, account)]));
  return v;
}

export function request(D, srcId, block, account) {
  const s = D.sources && D.sources[srcId];
  if (!s) return null;
  if (s.method === 'GET') {
    const url = ENDPOINT(D, s.endpoint).replace('<block>', String(block));
    return { url, get: true, curl: `curl -sL --compressed '${url}'` };
  }
  const url = ENDPOINT(D, s.endpoint);
  const body = { jsonrpc: '2.0', id: 1, method: s.method, params: subst(s.params, block, account) };
  const json = JSON.stringify(body);
  return { url, body: json, live: s.endpoint === 'live', curl: `curl -s ${url} -H 'Content-Type: application/json' \\\n  -d '${json}'` };
}

export async function rpc(url, body, timeout = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctl.signal } : { signal: ctl.signal });
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { status: r.status });
    const j = await r.json();
    if (j && j.error) throw Object.assign(new Error(j.error.cause?.name || j.error.name || 'rpc error'), { status: j.error.cause?.name || j.error.name || 'rpc error' });
    return j;
  } catch (e) {
    if (e.status) throw e;
    throw Object.assign(e, { status: e.name === 'AbortError' ? 'timeout' : 'network error' });
  } finally { clearTimeout(t); }
}

function summarize(j) {
  const res = j.result ?? j;
  const out = [];
  if (res.amount !== undefined) {
    out.push(`amount ${yocto(res.amount)} near`);
    if (res.storage_usage !== undefined) out.push(`storage_usage ${fmt(res.storage_usage, 'int')} bytes → locked ${fmt(res.storage_usage * 1e-5, 'near2')} near`);
    if (res.locked !== undefined && res.locked !== '0') out.push(`staked ${yocto(res.locked)} near`);
    if (res.block_height) out.push(`block_height ${fmt(res.block_height, 'int')}`);
    if (res.code_hash) out.push(`code_hash ${res.code_hash}`);
  } else if (res.header || res.block?.header) {
    const h = res.header || res.block.header;
    out.push(`height ${fmt(h.height, 'int')}`, `timestamp ${new Date(Number(BigInt(h.timestamp) / 1000000n)).toISOString()}`, `total_supply ${yocto(h.total_supply)} near`);
  } else if (Array.isArray(res.keys)) {
    out.push(`keys ${res.keys.length}`);
    res.keys.slice(0, 6).forEach(k => out.push(`  ${k.public_key.slice(0, 20)}… ${typeof k.access_key.permission === 'string' ? k.access_key.permission : 'FunctionCall'}`));
  } else if (Array.isArray(res.result)) {
    let s = '';
    try { s = new TextDecoder().decode(new Uint8Array(res.result)); } catch (e) { s = '[bytes]'; }
    out.push(`result ${s.length > 900 ? s.slice(0, 900) + '…' : s}`);
    if (res.block_height) out.push(`block_height ${fmt(res.block_height, 'int')}`);
  } else if (res.runtime_config) {
    out.push(`storage_amount_per_byte ${res.runtime_config.storage_amount_per_byte}`, `max_inflation_rate ${JSON.stringify(res.max_inflation_rate)}`, `protocol_version ${res.protocol_version}`);
  } else if (res.epoch_start_height !== undefined) {
    out.push(`epoch_start_height ${fmt(res.epoch_start_height, 'int')}`, `current_validators ${res.current_validators?.length}`);
  } else if (Array.isArray(res.receipts)) {
    out.push(`receipts ${res.receipts.length}`);
  } else if (Array.isArray(res)) {
    out.push(`${res.length} entries`);
  } else {
    const s = JSON.stringify(res);
    out.push(s.length > 900 ? s.slice(0, 900) + '…' : s);
  }
  return out.join('\n');
}

export function initStrip(D) {
  const strip = $('.strip');
  const T = { title: $('.q-title', strip), meaning: $('.q-meaning', strip), read: $('.q-read', strip), extra: $('.q-extra', strip), curl: $('.q-curl', strip), out: $('.q-out', strip) };
  let opener = null, req = null;

  function open(a) {
    const f = a.dataset.f;
    const q = resolve(D, f);
    const src = a.dataset.src || q.src;
    const block = a.dataset.block ? Number(a.dataset.block) : q.block;
    const account = a.dataset.account || q.account || a.closest('[data-account]')?.dataset.account || 'intents.near';
    const v = get(D, f);
    const fmtd = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(v)) : JSON.stringify(v ?? null);
    T.title.textContent = q.title && !f.startsWith('claims') ? q.title : `${q.title || f} = ${fmtd}`;
    T.meaning.textContent = [MEANING[norm(q.title || f)] || q.meaning || '', q.formula].filter(Boolean).join(' · ');
    const ts = q.ts || (block === D.meta.head_block ? D.meta.head_timestamp_utc : null);
    const liveSrc = D.sources && D.sources[src] && D.sources[src].endpoint === 'live';
    T.read.textContent = `read at block ${fmt(block, 'int')}${ts ? ' · ' + fmt(ts, 'datetime') : ''} · source ${src}${liveSrc ? ' · the curl below reads the chain as it is now' : ''}${D.meta.is_sample ? ' · sample artifact' : ''}`;
    const extra = [...(q.extra || [])];
    if (q.refill !== undefined) {
      const rf = D.sawtooth.refills[q.refill];
      extra.length = 0;
      extra.push(`receipt ${rf.receipt_id ?? 'unavailable'}`, `from ${rf.predecessor_id ?? 'unavailable'}`,
        `block ${fmt(rf.block - 1, 'int')}: ${fmt(rf.free_before_near, 'near2')} near free`, `block ${fmt(rf.block, 'int')}: ${fmt(rf.free_after_near, 'near2')} near free`);
    }
    T.extra.replaceChildren(...extra.map(s => Object.assign(document.createElement('p'), { textContent: s })));
    req = request(D, src, block, account);
    T.curl.textContent = req ? req.curl : 'no query recorded for this value';
    T.out.textContent = '';
    opener = a;
    strip.hidden = false;
    strip.focus();
  }
  function close() {
    strip.hidden = true;
    if (opener) opener.focus();
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a.n, a.riser, a.q');
    if (!a || !a.dataset.f) return;
    e.preventDefault();
    open(a);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !strip.hidden) close(); });
  $('.q-close', strip).addEventListener('click', close);
  $('.q-copy', strip).addEventListener('click', async () => {
    const s = T.curl.textContent;
    try { await navigator.clipboard.writeText(s); T.out.textContent = 'copied.'; }
    catch (e) {
      const r = document.createRange(); r.selectNodeContents(T.curl);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      T.out.textContent = 'selected. press ctrl+c / cmd+c.';
    }
  });
  $('.q-run', strip).addEventListener('click', async () => {
    if (!req) return;
    T.out.textContent = 'asking mainnet…';
    try {
      let j;
      try { j = await rpc(req.url, req.get ? null : req.body); }
      catch (e) {
        if (req.live && req.url !== FALLBACK_LIVE && typeof e.status !== 'number') j = await rpc(FALLBACK_LIVE, req.body);
        else throw e;
      }
      T.out.textContent = summarize(j);
    } catch (e) {
      T.out.textContent = `endpoint refused the request (${e.status || e.message}). the curl above is the same query.`;
    }
  });
}
