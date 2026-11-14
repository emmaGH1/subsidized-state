// formatting, field access and svg helpers

export const NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// computed bindings: value, formula and the fields they come from
export const CALC = {
  checkpoint_count: {
    v: D => D.lock.checkpoints.length,
    formula: 'lock.checkpoints.length',
    under: 'lock.checkpoints[-1].locked_near',
  },
  vaults_total: {
    v: D => {
      const a = D.vaults.buybacks.balance_near, b = D.vaults.fefunds.balance_near;
      return a == null || b == null ? null : a + b;
    },
    formula: 'vaults.buybacks.balance_near + vaults.fefunds.balance_near',
    under: 'vaults.buybacks.balance_near',
  },
};

export function get(D, path) {
  if (!D || !path) return undefined;
  if (path.startsWith('calc.')) {
    const c = CALC[path.slice(5)];
    try { return c ? c.v(D) : undefined; } catch (e) { return undefined; }
  }
  let cur = D;
  for (const part of path.split('.')) {
    const m = part.match(/^([^[\]]+)((?:\[-?\d+\])*)$/);
    if (!m) return undefined;
    cur = cur == null ? undefined : cur[m[1]];
    for (const ix of m[2].match(/-?\d+/g) || []) {
      if (!Array.isArray(cur)) return undefined;
      const i = +ix;
      cur = cur[i < 0 ? cur.length + i : i];
    }
  }
  return cur;
}

const sep = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export function fmt(v, f) {
  if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return 'unavailable';
  switch (f) {
    case 'int': case 'near0': return sep(Math.round(+v));
    case 'near2': return sep(+v, 2);
    case 'm1': return (v / 1e6).toFixed(1) + 'm';
    case 'k0': return Math.round(v / 1e3) + 'k';
    case 'x0': return Math.round(v) + 'x';
    case 'pct2': return (+v).toFixed(2) + '%';
    case 'pct1': return (+v).toFixed(1) + '%';
    case 'gb1': return (v / 1e9).toFixed(1);
    case 'num1': return (+v).toFixed(1);
    case 'usd0m': return '$' + Math.round(v / 1e6) + 'm';
    case 'date': case 'month': case 'datetime': {
      const d = new Date(v);
      if (isNaN(d)) return String(v);
      const day = d.getUTCDate(), mo = MONTHS[d.getUTCMonth()], y = d.getUTCFullYear();
      if (f === 'month') return `${mo} ${y}`;
      if (f === 'date') return `${day} ${mo} ${y}`;
      const hh = String(d.getUTCHours()).padStart(2, '0'), mm = String(d.getUTCMinutes()).padStart(2, '0');
      return `${day} ${mo} ${y}, ${hh}:${mm} utc`;
    }
    case 'raw': default: return String(v);
  }
}

// yoctoNEAR string -> "1,234.56"
export function yocto(s) {
  try {
    const b = BigInt(s), U = 10n ** 24n;
    const whole = b / U, frac = (b % U) / 10n ** 22n;
    return `${sep(Number(whole))}.${String(frac).padStart(2, '0')}`;
  } catch (e) { return String(s); }
}

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

// a number in a drawing: <a class="n" data-f data-fmt><text/></a>
export function num(parent, D, f, format, x, y, opts = {}) {
  const a = el('a', { class: 'n', href: '#q', 'data-f': f, 'data-fmt': format }, parent);
  for (const [k, v] of Object.entries(opts.data || {})) a.dataset[k] = v;
  if (opts.pre) a.dataset.pre = opts.pre;
  if (opts.post) a.dataset.post = opts.post;
  const t = el('text', { x, y, class: 't ' + (opts.cls || ''), 'text-anchor': opts.anchor || 'start' }, a);
  t.textContent = (opts.pre || '') + fmt(get(D, f), format) + (opts.post || '');
  return a;
}

export function text(parent, str, x, y, cls = '', anchor = 'start') {
  const t = el('text', { x, y, class: 't ' + cls, 'text-anchor': anchor }, parent);
  t.textContent = str;
  return t;
}

// rough text width for clamping labels (Inter 500)
export const tw = (s, size) => s.length * size * 0.58;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function svg(parent, w, h, cls = '') {
  const s = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: cls });
  parent.appendChild(s);
  return s;
}

export function figure(parent, kind, x, y, h, extra = {}) {
  // feet at (x, y)
  const w = h / 2;
  return el('use', { href: '#' + kind, x: -w / 2, y: -h, width: w, height: h, transform: `translate(${x} ${y})`, fill: 'var(--ink)', class: 'fig', ...extra }, parent);
}

export const isDesk = () => innerWidth >= 1024;
export const figH = () => (isDesk() ? 28 : 20);

// a label line mixing words and bound numbers: parts = ['word ', ['field', 'fmt', {pre, post, data}], ...]
export function line(parent, D, parts, x, y, cls = '', anchor = 'start') {
  const t = el('text', { x, y, class: 't ' + cls, 'text-anchor': anchor }, parent);
  for (const p of parts) {
    if (typeof p === 'string') { t.appendChild(document.createTextNode(p)); continue; }
    const [f, format, o = {}] = p;
    const a = el('a', { class: 'n', href: '#q', 'data-f': f, 'data-fmt': format }, t);
    if (o.pre) a.dataset.pre = o.pre;
    if (o.post) a.dataset.post = o.post;
    for (const [k, v] of Object.entries(o.data || {})) a.dataset[k] = v;
    a.textContent = (o.pre || '') + fmt(get(D, f), format) + (o.post || '');
  }
  return t;
}

// a 1px ink hairline as a thin rect, so the pen-wobble filter has a box to work in
export function hair(parent, x1, x2, y, attrs = {}) {
  return el('rect', { x: Math.min(x1, x2), y: Math.round(y), width: Math.abs(x2 - x1), height: 1, fill: 'var(--ink)', filter: 'url(#ink-hair)', ...attrs }, parent);
}
