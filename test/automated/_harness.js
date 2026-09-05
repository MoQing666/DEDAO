/* DEDAO 测试版 —— 测试基础设施
 * 用 Node 的 vm 模块加载浏览器端脚本，注入 localStorage / window 等桩件。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.DEDAO_ROOT
  ? path.resolve(process.env.DEDAO_ROOT)
  : path.resolve(__dirname, '..', '..');

/* ---------- 可复现随机数 ---------- */
function makeRandom(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* ---------- localStorage 桩 ---------- */
function makeLocalStorage(initial) {
  const map = new Map();
  if (initial) for (const k of Object.keys(initial)) map.set(k, String(initial[k]));
  const ls = {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
    _dump: () => Object.fromEntries(map),
    _size: () => map.size,
  };
  return ls;
}

/* ---------- 构建沙箱并加载脚本 ---------- */
function createGameContext(opts = {}) {
  const files = opts.files || ['js/data.js', 'js/engine.js'];
  const seed = opts.seed == null ? 20260905 : opts.seed;
  const store = makeLocalStorage(opts.storage);

  const rand = makeRandom(seed);
  const fakeMath = Object.create(Math);
  fakeMath.random = rand;

  const sandbox = {
    console,
    localStorage: store,
    Math: fakeMath,
    JSON, Date, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    RegExp, Map, Set, WeakMap, WeakSet, Promise, Symbol, Proxy,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.navigator = { userAgent: 'node-test', language: 'zh-CN', maxTouchPoints: 0 };
  sandbox.document = makeDocumentStub();
  sandbox.alert = () => {};
  sandbox.confirm = () => true;
  sandbox.prompt = () => '';
  sandbox.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);

  const ctx = vm.createContext(sandbox);
  const loaded = [];
  for (const f of files) {
    const p = path.join(ROOT, f);
    const code = fs.readFileSync(p, 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: p });
      loaded.push(f);
    } catch (e) {
      throw new Error(`加载 ${f} 失败: ${e.message}`);
    }
  }
  const get = (name) => {
    try { return vm.runInContext(name, ctx); } catch (e) { return undefined; }
  };
  return { ctx, sandbox, localStorage: store, get, loaded, seed };
}

/* ---------- 极简 document 桩（引擎层用不到 DOM，仅防崩） ---------- */
function makeDocumentStub() {
  const noop = () => {};
  const el = new Proxy({}, {
    get(_, k) {
      if (k === 'style') return {};
      if (k === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (k === 'children' || k === 'childNodes') return [];
      if (k === 'dataset') return {};
      if (typeof k === 'string' && k.startsWith('get')) return () => null;
      if (typeof k === 'string' && k.startsWith('set')) return noop;
      if (k === 'appendChild' || k === 'removeChild' || k === 'addEventListener' ||
          k === 'removeEventListener' || k === 'click' || k === 'focus' || k === 'blur' ||
          k === 'scrollIntoView' || k === 'insertAdjacentHTML' || k === 'remove') return noop;
      if (k === 'value' || k === 'innerHTML' || k === 'textContent' || k === 'id') return '';
      if (k === Symbol.toPrimitive || k === 'toString') return () => '[stub-el]';
      return undefined;
    },
  });
  return {
    getElementById: () => el,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => el,
    createTextNode: () => el,
    addEventListener: noop,
    removeEventListener: noop,
    body: el, head: el, documentElement: el,
    title: '', readyState: 'complete',
  };
}

/* ---------- 极简断言框架 ---------- */
class Suite {
  constructor(name) { this.name = name; this.cases = []; this._cur = null; }
  case(title, fn) { this.cases.push({ title, fn }); }
  async run(report) {
    for (const c of this.cases) {
      const t0 = Date.now();
      const msgs = [];
      const ctxObj = {
        ok: (cond, msg) => { if (!cond) msgs.push('断言失败: ' + (msg || '(无描述)')); return !!cond; },
        eq: (a, b, msg) => { if (a !== b) msgs.push(`期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}` + (msg ? ' — ' + msg : '')); },
        notEq: (a, b, msg) => { if (a === b) msgs.push(`不应等于 ${JSON.stringify(b)}` + (msg ? ' — ' + msg : '')); },
        gt: (a, b, msg) => { if (!(a > b)) msgs.push(`期望 ${a} > ${b}` + (msg ? ' — ' + msg : '')); },
        gte: (a, b, msg) => { if (!(a >= b)) msgs.push(`期望 ${a} >= ${b}` + (msg ? ' — ' + msg : '')); },
        lt: (a, b, msg) => { if (!(a < b)) msgs.push(`期望 ${a} < ${b}` + (msg ? ' — ' + msg : '')); },
        lte: (a, b, msg) => { if (!(a <= b)) msgs.push(`期望 ${a} <= ${b}` + (msg ? ' — ' + msg : '')); },
        inRange: (v, lo, hi, msg) => { if (!(v >= lo && v <= hi)) msgs.push(`期望 ${v} 落在 [${lo}, ${hi}]` + (msg ? ' — ' + msg : '')); },
        noNaN: (obj, label) => scanNaN(obj, label, msgs),
        throws: (fn, msg) => { try { fn(); msgs.push('期望抛出异常但没有' + (msg ? ' — ' + msg : '')); } catch (e) { /* ok */ } },
        note: (m) => msgs.push('[note] ' + m),
        warn: (m) => msgs.push('[warn] ' + m),
        fail: (m) => msgs.push(m),
      };
      let error = null;
      try {
        await c.fn(ctxObj);
      } catch (e) {
        error = e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e);
      }
      const dur = Date.now() - t0;
      const real = msgs.filter(m => !m.startsWith('[note]') && !m.startsWith('[warn]'));
      const notes = msgs.filter(m => m.startsWith('[note]'));
      const warns = msgs.filter(m => m.startsWith('[warn]'));
      report.push({
        suite: this.name, title: c.title,
        pass: !error && real.length === 0,
        error, messages: real, notes: notes.map(n => n.slice(7)), warns: warns.map(n => n.slice(7)), ms: dur,
      });
    }
  }
}

function scanNaN(obj, label, msgs, depth = 0) {
  if (depth > 6) return;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) msgs.push(`${label} 存在非法数值: ${obj}`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanNaN(v, `${label}[${i}]`, msgs, depth + 1));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) scanNaN(obj[k], `${label}.${k}`, msgs, depth + 1);
  }
}

module.exports = { ROOT, Suite, createGameContext, makeLocalStorage, makeRandom, scanNaN };
