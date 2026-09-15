/* DEDAO 工具共用 —— 加载「真引擎」，而不是再手抄一份镜像
 * ------------------------------------------------------------------
 * 背景（AGENTS.md 变更日志 #59「第四大 bug 类」）：
 *   `tools/` 下的分析脚本常需要「引擎的公式 / 数据表」，过去各自**手抄一份**，
 *   结果一张错误镜像（`reinc_validate.js` 曾整列算错）污染了四张文档表。
 *
 * 本模块改在 vm 沙箱里**真加载** `js/data.js` + `js/engine.js`，直接调 `Engine.*`，
 * 从根上消除镜像分叉 —— 引擎改公式，工具自动跟着改。
 *
 * 用法：
 *   const { load } = require('./_engine_loader');
 *   const G = load();                      // 已加载的沙箱
 *   G.Engine.earnPoints(state, meta);      // 真公式
 *   G.REINCARNATION / G.ACHIEVEMENTS ...   // 真数据表
 *
 * 兼容 `DEDAO_ROOT`（指向 dist 副本时加载那一份；默认仓库根）。
 * 需要 Node 内置 `vm`，无第三方依赖。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.DEDAO_ROOT
  ? path.resolve(process.env.DEDAO_ROOT)
  : path.resolve(__dirname, '..');

/* 需要暴露给调用方的 `const` 全局（data.js / engine.js 里都是顶层 const，不挂 window） */
const EXPOSE = [
  'Engine', 'ARTIFACTS', 'DESTINIES', 'TECHNIQUES', 'ACHIEVEMENTS', 'NPCS', 'EVENTS',
  'ADVENTURE_CONFIG', 'REINCARNATION', 'REINC_TALENT', 'INIT_EXP', 'INIT_POINTS',
  'NEED', 'JIE_DATA', 'DEATH_SCALES', 'DEATH_EVENTS', 'SECTS', 'SECT_GOODS',
  'FORMULAS', 'EQUIPS', 'TALENTS', 'MONSTER_POOL', 'TRIB_BOSSES', 'CODEX',
];

function makeStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => m.delete(String(k)),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

let _cached = null;

/* 加载并返回 { Engine, <各数据表>, sandbox, ROOT }。同一进程内重复调用走缓存。 */
function load() {
  if (_cached) return _cached;

  const sandbox = {
    console, localStorage: makeStore(),
    JSON, Date, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    RegExp, Map, Set, WeakMap, WeakSet, Promise, Symbol, Proxy,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, Math,
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  sandbox.navigator = { userAgent: 'node', language: 'zh-CN' };
  sandbox.document = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({}), addEventListener: () => {}, body: {}, head: {}, documentElement: {},
  };
  sandbox.alert = () => {}; sandbox.confirm = () => true; sandbox.prompt = () => '';

  const ctx = vm.createContext(sandbox);
  const code =
    fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8') + '\n' +
    ';globalThis.__G={' + EXPOSE.map(k => k + ':typeof ' + k + '!=="undefined"?' + k + ':undefined').join(',') + '};';
  vm.runInContext(code, ctx, { filename: 'combined.js' });

  const out = Object.assign({ sandbox, ROOT }, sandbox.__G);
  _cached = out;
  return out;
}

module.exports = { load, ROOT, EXPOSE };
