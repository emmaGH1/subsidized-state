// subsidized state · loader, formatter, binder, drawings, query strip.
// Every number and every mark on the page comes from data/artifact.json.

import { fmt, get, CALC } from './lib.js';
import { initStrip } from './query.js';
import { drawSawtooth, scrollSawtooth } from './s3.js';
import { drawLock } from './s2.js';
import { drawPayer, startPayerLoop } from './s4.js';
import { drawGap } from './s5.js';
import { drawCover, drawVerdict, renderTests, renderFacts, initVerify } from './s6.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

async function load() {
  for (const u of ['../data/artifact.json', '../data/artifact.sample.json']) {
    try {
      const r = await fetch(u, { cache: 'no-cache' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && typeof j === 'object' && j.meta) return j;
    } catch (e) { /* try the next file */ }
  }
  return null;
}

export function bind(D, root = document) {
  for (const el of $$('[data-f]', root)) {
    if (!el.classList.contains('n') && !el.matches('a.riser, a.q')) continue;
    if (el.closest('svg') && el.dataset.bound) continue;
    const v = get(D, el.dataset.f);
    const txt = fmt(v, el.dataset.fmt);
    const target = el.querySelector('text') || el;
    if (el.classList.contains('n')) target.textContent = (el.dataset.pre || '') + txt + (el.dataset.post || '');
    el.setAttribute('href', '#q');
    el.dataset.bound = '1';
  }
  for (const el of $$('.plural', root)) {
    const c = get(D, el.dataset.count);
    el.textContent = c === 1 ? el.dataset.one : el.dataset.many;
  }
}

function fallback() {
  for (const s of $$('.sec')) {
    for (const el of $$('.bound, .drawing, .slider', s)) el.hidden = true;
    const f = $('.fallback', s);
    if (f) f.hidden = false;
  }
  document.documentElement.classList.add('static');
}

const DRAW = { cover: drawCover, lock: drawLock, sawtooth: drawSawtooth, payer: drawPayer, gap: drawGap, verdict: drawVerdict };

function drawAll(D) {
  for (const [id, fn] of Object.entries(DRAW)) {
    const sec = document.getElementById(id);
    try { fn(D, sec, { reduce }); }
    catch (e) {
      console.error(id, e);
      for (const el of $$('.drawing', sec)) el.replaceChildren();
      const f = $('.fallback', sec); if (f) f.hidden = false;
    }
  }
  bind(D);
}

function observe() {
  const secs = $$('.sec');
  const ticks = $$('.progress a');
  const nav = $('.progress');
  let flashT;
  if (reduce || !('IntersectionObserver' in window)) { secs.forEach(s => s.classList.add('in')); }
  else {
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting && e.intersectionRect.height >= Math.min(0.35 * e.boundingClientRect.height, 0.35 * innerHeight)) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.id === 'payer') startPayerLoop(e.target); }
    }, { threshold: [0, 0.05, 0.1, 0.2, 0.35] });
    secs.forEach(s => io.observe(s));
  }
  const io2 = new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) {
      ticks.forEach((t, i) => t.classList.toggle('on', secs[i] === e.target));
      // name the chapter beside its tick for a moment, then keep only the tick (hover shows it again)
      nav.classList.add('flash'); clearTimeout(flashT); flashT = setTimeout(() => nav.classList.remove('flash'), 1800);
    }
  }, { rootMargin: '-50% 0px -50% 0px' });
  secs.forEach(s => io2.observe(s));
}

async function main() {
  if (reduce) document.documentElement.classList.add('reduce');
  else document.documentElement.classList.add('js-motion');
  const D = await load();
  if (!D) { fallback(); return; }
  window.__artifact = D;
  if (D.meta && D.meta.is_sample === true) {
    $('.sample-strip').hidden = false;
    document.documentElement.classList.add('has-strip');
  }
  drawAll(D);
  renderTests(D, $('#verdict'));
  renderFacts(D, $('#verdict'));
  bind(D);
  initStrip(D);
  initVerify(D, $('#verdict'));
  observe();

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; scrollSawtooth(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  let lastW = innerWidth, lastH = innerHeight, t;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) { onScroll(); return; }
      lastW = innerWidth; lastH = innerHeight;
      drawAll(D); renderTests(D, $('#verdict')); bind(D); onScroll();
    }, 150);
  });
  if (document.fonts) document.fonts.ready.then(() => { drawAll(D); bind(D); onScroll(); });
}

main();
