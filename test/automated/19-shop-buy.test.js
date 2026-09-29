/* DEDAO 自动化测试 —— 19 坊市购买 & 包体同步
 * 起因（用户实测 BUG，2026-09-23）：
 *   游历·流动商贩购买时出现四个症状——
 *     ① 买一件后货架立刻刷新（重掷）      ② 购买直接失败
 *     ③ 灵石显示 NaN                       ④ 日志区连续输出 undefined
 *   根因：ui.js 把「数组下标」当商品对象传给 Engine.buyStock（si.price 为 undefined
 *          → s.stone -= undefined → NaN），且成功时读 r.msg 渲染（buyStock 成功分支
 *          返回的是 { ok, lines, gains }，没有 msg → 打印 undefined）。
 *   修复：引擎加入参守卫 + 灵石脏值兜底；UI 改传 stock[i] 并逐行输出 r.lines；
 *         新增 shopStockYearly 按年缓存货架（年内不重掷，含已售标记）。
 * 本套件把这些固化为回归用例，并新增「包体守卫」：
 *   源码修好但没同步进 dist/zip 正是玩家仍遇到旧 BUG 的原因，故用字节级比对卡死该环节。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const vm = require('vm');
const { Suite, createGameContext, ROOT } = require('./_harness');

/* ---------- 小工具 ---------- */
function md5(p) {
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
}

// 极简 ZIP 读取：按中央目录定位条目并解压（Node 无内置 unzip，避免引入依赖）
// 文件名版本化（js/ui.179.js 等）破 CDN 缓存；包内实际文件名带版本号，但内容与未版本化源码逐字节一致，
// 故匹配时除精确后缀外，也接受「base.NNN.js」版本化变体。
function zipNameMatches(name, suffix) {
  if (name.endsWith(suffix)) return true;
  const base = suffix.slice(0, -3); // 去掉 '.js'：'/js/ui' → 匹配 '.../js/ui.179.js'
  const re = new RegExp(base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.\\d+\\.js$');
  return re.test(name);
}
function readZipEntry(zipPath, suffix) {
  let buf;
  try { buf = fs.readFileSync(zipPath); } catch (e) { return null; }
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const n = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    if (zipNameMatches(name, suffix)) {
      const lnLen = buf.readUInt16LE(localOff + 26);
      const lxLen = buf.readUInt16LE(localOff + 28);
      const dataOff = localOff + 30 + lnLen + lxLen;
      const data = buf.slice(dataOff, dataOff + compSize);
      try {
        return (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
      } catch (e) { return null; }
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

module.exports = async function build() {
  const S = new Suite('19 坊市购买 & 包体同步');
  const G = createGameContext({ seed: 20260923 });
  const E = G.get('Engine');
  const TALENTS = G.get('TALENTS') || [];

  function fresh(stone) {
    const s = E.startLife('shop-buy-test');
    E.commitStart(s, TALENTS[0].id);
    s.actionsLeft = 99;
    s.stone = stone;
    return s;
  }

  /* ---------- 1. 正常成交 ---------- */
  S.case('购买传商品对象：成交、灵石正确扣减、标记已售、返回可输出的 lines', (t) => {
    const s = fresh(500);
    const stock = E.shopStockYearly(s);
    const it = stock.filter((x) => x.mat)[0];
    t.ok(!!it, '货架应含灵材类商品');
    if (!it) return;
    const r = E.buyStock(s, it);
    t.ok(r && r.ok === true, '应成交（实际 ' + JSON.stringify(r) + '）');
    t.eq(s.stone, 500 - it.price, '灵石应按价扣减');
    t.ok(Number.isFinite(s.stone), '灵石必须是有限数字（不得 NaN）');
    t.ok(it.sold === true, '商品应标记已售（重绘显示「已售」）');
    t.ok(Array.isArray(r.lines) && r.lines.length > 0, '应返回 lines 供逐行输出');
    t.ok(r.lines.every((l) => typeof l === 'string' && l.indexOf('undefined') < 0),
      'lines 不得含 undefined（日志区那五行 undefined 即源于此）');
    t.ok((r.lines || []).some((l) => /^支出灵石 \d+$/.test(l)), '应含「支出灵石 N」行');
  });

  /* ---------- 2. 非法入参守卫（防 NaN + undefined 日志） ---------- */
  S.case('非法入参（下标/undefined/null/缺 price）一律拒绝，且失败必带 msg', (t) => {
    const bads = [
      ['数组下标', 3],
      ['undefined', undefined],
      ['null', null],
      ['缺 price', { name: 'x' }],
      ['价格负数', { name: 'x', price: -1 }],
      ['价格为 NaN', { name: 'x', price: NaN }],
    ];
    bads.forEach(([label, v]) => {
      const s = fresh(500);
      const before = s.stone;
      const r = E.buyStock(s, v);
      t.ok(r && r.ok === false, '入参[' + label + '] 应被拒绝（实际 ' + JSON.stringify(r) + '）');
      t.ok(typeof r.msg === 'string' && r.msg.length > 0,
        '入参[' + label + '] 失败分支必须带 msg，否则 UI 会打印 undefined');
      t.ok(Number.isFinite(s.stone), '入参[' + label + '] 不得把灵石变成 NaN（实际 ' + s.stone + '）');
      t.eq(s.stone, before, '入参[' + label + '] 不得扣款');
    });
  });

  /* ---------- 3. 脏灵石兜底 ---------- */
  S.case('脏灵石兜底：NaN/null 补偿 1000 后结算，真 0 不得被拔高', (t) => {
    t.eq(E.STONE_DIRTY_FALLBACK, 1000, '引擎应导出补偿常量 STONE_DIRTY_FALLBACK=1000');
    [NaN, null, undefined].forEach((dirty, i) => {
      const s = fresh(500);
      s.stone = dirty;
      const stock = E.shopStockYearly(s);
      const it = stock[0];
      const r = E.buyStock(s, it);
      t.ok(Number.isFinite(s.stone), '脏值[' + i + '] 结算后灵石应为有限数字（实际 ' + s.stone + '）');
      const want = (r && r.ok) ? 1000 - it.price : 1000;
      t.eq(s.stone, want, '脏值[' + i + '] 应先补偿 1000 再结算（实际 ' + s.stone + '，期望 ' + want + '）');
      t.ok(r && (r.ok ? Array.isArray(r.lines) : typeof r.msg === 'string'),
        '脏值[' + i + '] 返回值应自洽：成功给 lines、失败给 msg（实际 ' + JSON.stringify(r) + '）');
    });
    // 真 0 是合法值：兜底只对「非有限数」生效，0 不得被拔高成 1000
    const s0 = fresh(0);
    const st0 = E.shopStockYearly(s0);
    E.buyStock(s0, st0[0]);
    t.eq(s0.stone, 0, '真 0 灵石买不起时仍应是 0（不得被补偿成 1000），实际 ' + s0.stone);
  });

  /* ---------- 4. 货架按年缓存 ---------- */
  S.case('货架按年缓存：年内（含购买后）不重掷，跨年才重新进货', (t) => {
    const s = fresh(5000);
    const sig = (arr) => arr.map((x) => x.id + '@' + x.price).join('|');
    const a = E.shopStockYearly(s);
    const a2 = E.shopStockYearly(s);
    t.ok(a === a2, '同年重复进店应返回同一货架对象（不再重掷）');
    t.eq(sig(a), sig(a2), '同年货架内容应完全一致');
    const bought = a.filter((x) => x.mat)[0] || a[0];
    E.buyStock(s, bought);
    const a3 = E.shopStockYearly(s);
    t.ok(a3 === a, '购买后同年货架不应重掷（用户反馈「买一件就换货」即此）');
    t.ok(bought.sold === true, '已售标记应保留在缓存货架上');
    s.year = (s.year || 1) + 1;
    const b = E.shopStockYearly(s);
    t.ok(b !== a, '跨年后应重新进货');
    t.eq(s.shop.year, s.year, '缓存年份应更新');
    t.ok(b.every((x) => Number.isFinite(x.price)), '新货架价格应全部为有限数');
  });

  /* ---------- 5. 包体守卫：dist 副本必须与源码字节一致 ---------- */
  S.case('包体守卫：4 个 dist 发布副本的 JS 与源码字节一致（防「修了源码没进包」）', (t) => {
    const distBase = path.join(ROOT, 'dist');
    // dist/ 是构建产物（.gitignore 已忽略）：CI 全新检出、隔离测试仓都没有它。
    // 缺失时跳过而非报红 —— 否则 CI 会永远红，守卫反而失去意义。
    // 本地有 dist/ 时照旧严格比对。
    if (!fs.existsSync(distBase)) { t.note('当前目录无 dist/（构建产物，非仓库根或未构建），跳过包体守卫'); return; }
    const dists = ['DEDAO_release', 'taptap/dedao', 'taptap/dedao-pc', 'taptap/dedao_tap'];
    // ⚠ tutorial.js 必须在此清单内：2026-09-23 新增「仙门赶考」引导阶段改的正是它，
    //   早期清单只有 data/engine/ui 三个 JS，改引导漏同步不会报红 —— 已补齐为 4 个。
    const files = ['data.js', 'engine.js', 'ui.js', 'tutorial.js'];
    let checked = 0, bad = 0;
    dists.forEach((d) => {
      files.forEach((f) => {
        const sp = path.join(ROOT, 'js', f);
        const dp = path.join(ROOT, 'dist', d, 'js', f);
        if (!fs.existsSync(dp)) { t.fail('缺失发布文件: dist/' + d + '/js/' + f); bad++; return; }
        checked++;
        if (md5(sp) !== md5(dp)) {
          t.fail('发布副本与源码不一致: dist/' + d + '/js/' + f + '（请运行 python tools/sync_dist.py）');
          bad++;
        }
      });
    });
    t.note('已比对 ' + checked + ' 个文件（4 副本 × 4 JS）');
    t.eq(bad, 0, '不应存在不一致的发布文件');
  });

  /* ---------- 6. 源码守卫：实现方式不回退 ---------- */
  S.case('源码守卫：引擎导出 shopStockYearly，且 UI 购买入口传商品对象而非下标', (t) => {
    const engSrc = fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8');
    t.ok(/shopStockYearly:\s*shopStockYearly/.test(engSrc), '引擎应导出 shopStockYearly（按年缓存货架）');
    t.ok(/function buyStock\(s,\s*si\)/.test(engSrc) &&
         /!Number\.isFinite\(si\.price\)/.test(engSrc), 'buyStock 应保留入参守卫');
    t.ok(/const STONE_DIRTY_FALLBACK = 1000/.test(engSrc) && /function repairStone\(/.test(engSrc),
      '引擎应定义灵石脏值补偿常量 1000 与统一修复入口 repairStone');
    t.ok(/repairStone\(s\)/.test(engSrc), 'buyStock 应保留灵石脏值兜底（统一走 repairStone，补偿 1000）');

    const uiSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
    const codeLines = uiSrc.split('\n').filter((l) => {
      const s = l.trim();
      return s.indexOf('//') !== 0 && s.indexOf('*') !== 0 && s.indexOf('/*') !== 0;
    }).join('\n');
    t.ok(!/buyStock\([^)]*\+[^)]*getAttribute/.test(codeLines),
      'UI 不得再把数组下标传给 buyStock（旧写法导致 NaN + undefined）');
    t.ok(/const si = stock\[\+b\.getAttribute\('data-i'\)\]/.test(codeLines),
      '游历商贩应取 stock[i] 商品对象传入');
    // 所有 buyStock 调用点的失败分支都要有 msg 兜底，避免日志打印 undefined
    const calls = codeLines.split('\n').filter((l) => /buyStock\(/.test(l));
    t.ok(calls.length >= 1, '应存在 buyStock 调用点（实际 ' + calls.length + '）');
    t.ok(!/log\(r\.msg,\s*r\.ok/.test(codeLines) || /r\.msg \|\| /.test(codeLines),
      '失败日志应有 msg 兜底，禁止裸 log(r.msg) 打出 undefined');
  });

  /* ---------- 7. zip 守卫：TapTap 上传包内必须含修复 ---------- */
  S.case('zip 守卫：3 个 TapTap 上传包内 ui.js / tutorial.js 与源码一致且含修复', (t) => {
    const zips = {
      'dedao-taptap-h5.zip': 'dedao',
      'dedao-pc-h5.zip': 'dedao-pc',
      'dedao_tap-taptap-h5.zip': 'dedao_tap',
    };
    // dist/taptap 不存在 = 未构建（CI 全新检出即如此）→ 跳过；
    // 目录存在但缺某个 zip = 真的漏打包 → 仍然报红。
    if (!fs.existsSync(path.join(ROOT, 'dist', 'taptap'))) {
      t.note('无 dist/taptap 目录（构建产物，未构建或非仓库根），跳过 zip 守卫'); return;
    }
    Object.keys(zips).forEach((zn) => {
      const zp = path.join(ROOT, 'dist', 'taptap', zn);
      if (!fs.existsSync(zp)) { t.fail('缺失上传包: ' + zn); return; }
      const inner = readZipEntry(zp, '/js/ui.js');
      if (inner == null) { t.fail('无法读取 ' + zn + ' 内 js/ui.js'); return; }
      const src = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
      t.eq(inner, src, zn + ' 内 js/ui.js 应与源码完全一致');
      t.ok(inner.indexOf('shopStockYearly') >= 0, zn + ' 内应含按年缓存修复');
      t.ok(!/buyStock\([^)]*\+[^)]*getAttribute/.test(
        inner.split('\n').filter((l) => {
          const s = l.trim();
          return s.indexOf('//') !== 0 && s.indexOf('*') !== 0 && s.indexOf('/*') !== 0;
        }).join('\n')), zn + ' 内不得残留「传下标」旧写法');
      // 引导脚本同样必须随包更新（仙门赶考 exam 阶段在 tutorial.js 内）
      const tut = readZipEntry(zp, '/js/tutorial.js');
      if (tut == null) { t.fail('无法读取 ' + zn + ' 内 js/tutorial.js'); return; }
      const tutSrc = fs.readFileSync(path.join(ROOT, 'js', 'tutorial.js'), 'utf8');
      t.eq(tut, tutSrc, zn + ' 内 js/tutorial.js 应与源码完全一致');
      t.ok(tut.indexOf('exam') >= 0, zn + ' 内应含「仙门赶考」exam 引导阶段');
    });
  });

  /* ---------- 8. 包内实测：直接用上传包里的代码跑一遍购买 ----------
   * 「源码修好、包没更新」正是玩家仍遇到旧 BUG 的原因。字节级比对只能证明文件相同，
   * 这里把 zip 内的 data.js + engine.js 真正加载运行一遍，用行为证明包是好的。 */
  S.case('包内实测：3 个上传包内代码跑购买 → 灵石非 NaN / 日志无 undefined / 年内不重掷 / 脏档补偿 1000', (t) => {
    const zips = ['dedao-taptap-h5.zip', 'dedao-pc-h5.zip', 'dedao_tap-taptap-h5.zip'];
    if (!fs.existsSync(path.join(ROOT, 'dist', 'taptap'))) {
      t.note('无 dist/taptap 目录（构建产物，未构建或非仓库根），跳过包内实测'); return;
    }
    zips.forEach((zn) => {
      const zp = path.join(ROOT, 'dist', 'taptap', zn);
      if (!fs.existsSync(zp)) { t.fail('缺失上传包: ' + zn); return; }
      const dataSrc = readZipEntry(zp, '/js/data.js');
      const engSrc = readZipEntry(zp, '/js/engine.js');
      if (dataSrc == null || engSrc == null) { t.fail('无法读取 ' + zn + ' 内 js/data.js 或 js/engine.js'); return; }

      // 用包内代码建一个独立引擎实例
      let seed = 20260923;
      const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      const fakeMath = Object.create(Math); fakeMath.random = rand;
      const store = new Map();
      const sandbox = {
        console, Math: fakeMath, JSON, Date, Object, Array, String, Number, Boolean, Error, TypeError,
        RegExp, Map, Set, WeakMap, WeakSet, Promise, Symbol, Proxy,
        isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
        setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
        localStorage: {
          getItem: (k) => (store.has(k) ? store.get(k) : null),
          setItem: (k, v) => store.set(k, String(v)),
          removeItem: (k) => store.delete(k),
          clear: () => store.clear(),
        },
      };
      sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
      sandbox.navigator = { userAgent: 'node-test', language: 'zh-CN' };
      sandbox.document = new Proxy({}, { get: () => () => null });
      sandbox.alert = () => {}; sandbox.confirm = () => true; sandbox.prompt = () => '';
      const ctx = vm.createContext(sandbox);
      vm.runInContext(dataSrc, ctx, { filename: 'data.js' });
      vm.runInContext(engSrc, ctx, { filename: 'engine.js' });
      const get = (n) => vm.runInContext(n, ctx);
      const E2 = get('Engine');
      const T2 = get('TALENTS') || [];
      if (!E2) { t.fail(zn + ' 内 Engine 未导出'); return; }

      t.ok(typeof E2.shopStockYearly === 'function', zn + ' 内应有按年缓存货架 shopStockYearly');
      t.ok(typeof E2.repairStone === 'function', zn + ' 内应有灵石自愈入口 repairStone');

      const mk = (stone) => {
        const s = E2.startLife('zip-pkg-test');
        if (T2[0] && typeof E2.commitStart === 'function') E2.commitStart(s, T2[0].id);
        s.actionsLeft = 99;
        s.stone = stone;
        return s;
      };

      // a) 脏档补偿（线上被 NaN 污染的存档 → 1000，真 0 不动）
      t.eq(E2.repairStone(mk(null)), 1000, zn + ' 脏档 stone=null → 补偿 1000');
      t.eq(E2.repairStone(mk(0)), 0, zn + ' 真 0 灵石保持 0，不得被拔高');

      // b) 正常购买：扣款正确、灵石非 NaN、返回可输出的 lines 且不含 undefined
      const s = mk(5000);
      const stock = E2.shopStockYearly(s);
      const it = (stock || []).filter((x) => x.mat)[0] || (stock || [])[0];
      if (!it) { t.fail(zn + ' 内货架为空，无法验证购买'); return; }
      const before = s.stone, price = it.price;
      const r = E2.buyStock(s, it);
      t.ok(Number.isFinite(s.stone), zn + ' 购买后灵石应为有限数字（非 NaN），实际 ' + s.stone);
      t.eq(s.stone, before - price, zn + ' 扣款正确：' + before + ' - ' + price);
      t.ok(r && r.ok && Array.isArray(r.lines) && r.lines.length > 0, zn + ' 成功分支应返回 lines 供逐行输出');
      t.ok(!(r.lines || []).some((x) => x === undefined || String(x).indexOf('undefined') >= 0),
        zn + ' lines 内不得含 undefined（日志不会再打出 undefined）');

      // c) 年内不重掷（买一件就换货的问题）
      const s2 = mk(5000);
      const a1 = JSON.stringify(E2.shopStockYearly(s2));
      const a2 = JSON.stringify(E2.shopStockYearly(s2));
      t.eq(a1, a2, zn + ' 同一年内两次取货架应一致（不重掷）');

      // d) 旧 BUG 路径（传下标）必须被拒且带可读 msg
      const s3 = mk(5000);
      const rb = E2.buyStock(s3, 0);
      t.ok(rb && rb.ok === false, zn + ' 传下标必须拒绝（旧 BUG 正是这样把灵石写成 NaN）');
      t.ok(rb && typeof rb.msg === 'string' && rb.msg.length > 0, zn + ' 传下标应返回可读 msg');
      t.ok(Number.isFinite(s3.stone), zn + ' 传下标后灵石未被污染，实际 ' + s3.stone);
    });
  });

  /* ---------- 9. HTML 包体守卫（2026-09-24 线上事故） ----------
   * 起因：玩家反馈「当前 h5 包体全是老东西」，实测发现**代码是新的、玩家看到的却是旧的**。
   * 定位到发布管线（tools/sync_dist.py）两个同源缺陷 —— 它不是「没同步」，而是
   * **把 HTML 排除在真源同步之外**：
   *   缺陷 1「只抬戳、不抄内容」：脚本对 dist 的 index.html 只做「归一 + ?v= +1」，
   *     从不把根 index.html 的内容抄进副本。于是根的结构改动**永远进不了 dist** ——
   *     2026-09-23 新增的 `#sect-msg`（宗门页反馈条）在 4 个副本里全缺。
   *     最坏后果：按既定流程「用 dist/DEDAO_release/ 覆盖仓库根」会把线上新结构打回旧版。
   *   缺陷 2「根戳从不抬」：抬戳只抬 dist 的 HTML，根 index.html 的 `?v=` 恒为 168。
   *     而玩家/用户最常用的上传路径恰恰是「覆盖仓库根」→ URL 不变 → 浏览器与 SW
   *     直接复用旧缓存，连请求都不发 → 内容再新也看不到。
   * 本用例把「HTML 与 JS 同等对待」这条口径钉死：根是唯一真源，dist 入口页必须是根的副本，
   * 同步完成后两边**字节一致**（结构与缓存戳一并同步）。漏同步 / 漏抬戳都会在这里报红。
   *
   * ⚠ 锚定 REPO（测试代码所在仓库）而非 ROOT：dist 副本既不含 dist/ 也不含 tools/，
   *   本用例也只在仓库根跑得通（与 01 号的文档守卫同口径）。 */
  S.case('HTML 包体守卫：dist 各入口页与根真源字节一致 + zip 内入口页同源（防结构漏同步 / 根戳不抬）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const distBase = path.join(REPO, 'dist');
    if (!fs.existsSync(distBase)) { t.note('当前目录无 dist/（非仓库根），跳过 HTML 包体守卫'); return; }

    // dist 入口页 -> 根内真源。
    // ⚠ 各副本入口页的真源**并不统一**：taptap/dedao-pc/index.html 是 PC 版页面
    //   （body.pc + style_pc.css + ui_pc.js），真源是根 index_pc.html —— 一律当成
    //   index.html 的副本去覆盖会直接毁掉 PC 包。
    const map = [
      ['DEDAO_release/index.html',       'index.html'],
      ['DEDAO_release/index_pc.html',    'index_pc.html'],   // L6：发布包必须含 PC 页（线上根有此文件）
      ['taptap/dedao/index.html',        'index.html'],
      ['taptap/dedao/index_pc.html',     'index_pc.html'],
      ['taptap/dedao-pc/index.html',     'index_pc.html'],
      ['taptap/dedao_tap/index.html',    'index.html'],
      ['taptap/dedao_tap/index_pc.html', 'index_pc.html'],
    ];
    let n = 0;
    map.forEach(([rel, src]) => {
      const dp = path.join(distBase, rel);
      const sp = path.join(REPO, src);
      if (!fs.existsSync(dp)) { t.fail('缺失发布入口页 dist/' + rel + '（应把根 ' + src + ' 同步过去）'); return; }
      if (!fs.existsSync(sp)) { t.fail('缺失根真源 ' + src + '（dist/' + rel + ' 的真源）'); return; }
      n++;
      if (md5(sp) !== md5(dp)) {
        t.fail('入口页结构漏同步：dist/' + rel + ' 与根 ' + src + ' 不一致'
          + '（请运行 python tools/sync_dist.py）');
      }
    });
    t.eq(n, 7, '应核对 7 个 dist 入口页（实为 ' + n + '）');
    t.note('入口页字节比对 ' + n + ' 个：dist 入口页 ← 根真源');

    /* 关键元素守卫：`#sect-msg` 正是「结构漏同步」那次漏掉的元素，
       单独点名断言，报红时一眼看出漏的是哪个元素。 */
    const rootIdx = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
    ['id="sect-msg"', 'id="travel-msg"'].forEach((k) => {
      t.ok(rootIdx.indexOf(k) >= 0, '根 index.html 应含 ' + k + '（页内反馈条：宗门页 2026-09-23 / 游历页 2026-09-14）');
    });
    ['DEDAO_release/index.html', 'taptap/dedao/index.html', 'taptap/dedao_tap/index.html'].forEach((rel) => {
      const p = path.join(distBase, rel);
      if (!fs.existsSync(p)) return;
      t.ok(fs.readFileSync(p, 'utf8').indexOf('id="sect-msg"') >= 0,
        'dist/' + rel + ' 应含 id="sect-msg"（4 副本曾全缺此元素）');
    });
    /* PC 系入口页也必须有这两条页内反馈条：PC 版长期缺它们，
       「宗门/游历页点了没反应」在 PC 端至今存在（2026-09-24 补）。 */
    ['DEDAO_release/index_pc.html', 'taptap/dedao/index_pc.html',
      'taptap/dedao-pc/index.html', 'taptap/dedao_tap/index_pc.html'].forEach((rel) => {
      const p = path.join(distBase, rel);
      if (!fs.existsSync(p)) { t.fail('缺失 PC 系入口页 dist/' + rel); return; }
      const pcHtml = fs.readFileSync(p, 'utf8');
      ['id="sect-msg"', 'id="travel-msg"'].forEach((k) => {
        t.ok(pcHtml.indexOf(k) >= 0, 'dist/' + rel + ' 应含 ' + k + '（PC 版页内反馈条）');
      });
    });

    /* 缓存戳守卫：根 index.html 的脚本戳必须**统一**（均由 sync_dist.py 一并抬升）。
       历史 BUG 下根戳恒为 168 从不变化，导致 URL 不变 → 回访者永远命中旧缓存。 */
    const stamps = (rootIdx.match(/js\/[a-z_]+\.js\?v=(\d+)/g) || []).map((s) => s.replace(/^.*=/, ''));
    t.gte(stamps.length, 4, '根 index.html 应含多个带戳脚本引用（实为 ' + stamps.length + '）');
    t.eq(new Set(stamps).size, 1, '根 index.html 的 JS 缓存戳应统一（实际 ' + [...new Set(stamps)].join('/') + '）');

    /* zip 内的入口页必须与 dist 入口页一致 —— 防「改了源码/副本但 zip 没重建」，
       也就是 TapTap 侧上传到旧包。 */
    const zips = {
      'dedao-taptap-h5.zip': 'taptap/dedao',
      'dedao-pc-h5.zip': 'taptap/dedao-pc',
      'dedao_tap-taptap-h5.zip': 'taptap/dedao_tap',
    };
    Object.keys(zips).forEach((zn) => {
      const zp = path.join(distBase, 'taptap', zn);
      if (!fs.existsSync(zp)) { t.fail('缺失上传包: ' + zn); return; }
      const inner = readZipEntry(zp, '/index.html');
      if (inner == null || inner === '') { t.fail('无法读取 ' + zn + ' 内 index.html'); return; }
      const dp = path.join(distBase, zips[zn], 'index.html');
      if (!fs.existsSync(dp)) { t.fail('缺失 ' + zips[zn] + '/index.html'); return; }
      t.eq(inner, fs.readFileSync(dp, 'utf8'),
        zn + ' 内 index.html 应与 dist 入口页一致（不一致说明 zip 没重建，TapTap 侧会传旧包）');
    });

    /* 源码守卫：sync_dist.py 必须保留「HTML 也走真源同步」与「根 HTML 抬戳」两条口径，
       否则缺陷 1/2 会以「重构时顺手删掉」的方式回归。 */
    const syncPy = path.join(REPO, 'tools', 'sync_dist.py');
    if (fs.existsSync(syncPy)) {
      const py = fs.readFileSync(syncPy, 'utf8');
      t.ok(/HTML_MAP\s*=/.test(py), 'sync_dist.py 应保留 HTML_MAP（HTML 也是真源同步的对象）');
      t.ok(/def bump_root_html/.test(py), 'sync_dist.py 应保留 bump_root_html（根 index.html 必须一起抬戳）');
      t.ok(/strip_stamps/.test(py), 'sync_dist.py 应保留 strip_stamps（--check 只比结构、忽略戳号）');
    } else {
      t.note('当前目录无 tools/sync_dist.py（非仓库根），跳过同步脚本源码守卫');
    }
  });

  /* ---------- 10. 发布包组成守卫（2026-09-24 续，L6） ----------
   * 与用例 9 是**不同**的不变量：用例 9 管「入口页的内容是否同步」，本用例管
   * 「发布包的**组成**是否等于要部署的仓库根」。
   * 起因（L6）：`dist/DEDAO_release/` 是「覆盖到静态站根目录」用的包，由
   *   tools/build_release.sh 按白名单构建 —— 白名单是 `index.html manifest.json sw.js`
   *   + css/js/assets，**漏了 index_pc.html**；而线上根目录**确实有**这张 PC 页。
   *   于是无论同步多少次、覆盖多少次 release 包，线上 index_pc.html 永远停在旧版
   *   （HTTP 200，但内容与 `?v=` 都是旧的）。
   * L5 / L6 同一病根：「发布物的集合」没有和「部署目标的集合」对齐。
   * ⚠ 同样锚定 REPO（dev 专属目录只在仓库根存在）。 */
  S.case('发布包组成守卫：DEDAO_release 覆盖可部署的仓库根（含 PC 入口页 / JS·CSS 清单齐备 / 无开发物）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const distBase = path.join(REPO, 'dist');
    const rel = path.join(distBase, 'DEDAO_release');
    if (!fs.existsSync(rel)) {
      t.note('当前目录无 dist/DEDAO_release（非仓库根），跳过发布包组成守卫');
      return;
    }

    /* ① 可部署顶层项齐备 —— 与静态站根目录的组成对齐 */
    ['index.html', 'index_pc.html', 'manifest.json', 'sw.js'].forEach((f) => {
      t.ok(fs.existsSync(path.join(rel, f)),
        'DEDAO_release 应含 ' + f + '（发布包组成必须与要覆盖的仓库根对齐）');
    });
    ['css', 'js', 'assets'].forEach((d) => {
      const p = path.join(rel, d);
      t.ok(fs.existsSync(p) && fs.statSync(p).isDirectory(), 'DEDAO_release 应含目录 ' + d + '/');
    });

    /* ② JS / CSS 文件名集合必须与仓库根完全一致 ——
       防「新增源文件后忘了加进同步白名单」（sync_dist.py 的 JS_FILES 是显式清单，
       历史上 tutorial.js 就漏过，包体守卫当时只查三个文件所以没报红）。 */
    const namesOf = (d) => fs.readdirSync(d).filter((f) => /\.(js|css)$/.test(f)).sort().join(',');
    ['js', 'css'].forEach((sub) => {
      const rootSet = namesOf(path.join(REPO, sub));
      const pkgSet = namesOf(path.join(rel, sub));
      t.eq(pkgSet, rootSet,
        'DEDAO_release/' + sub + '/ 文件集合应与仓库根 ' + sub + '/ 一致'
        + '（新增源文件后须同步进 tools/sync_dist.py 的清单）');
    });

    /* ③ 发布包不得混入开发物（源码目录 / 文档 / 构建产物 / AI 原图） */
    ['test', 'tools', 'dist', '_probe', '_preview', 'node_modules', 'dedao-backend', '.git']
      .forEach((d) => {
        t.ok(!fs.existsSync(path.join(rel, d)), 'DEDAO_release 不应含开发目录 ' + d + '/');
      });
    const mdInPkg = fs.readdirSync(rel).filter((f) => /\.md$/i.test(f));
    t.eq(mdInPkg.length, 0, 'DEDAO_release 顶层不应含 .md 文档（实为 ' + (mdInPkg.join('/') || '无') + '）');

    /* ④ 商店包体积守卫：3 个 TapTap 包不得含 AI 原图 assets/img/_src
       （游戏运行时不引用它；build_release.sh 也显式 `rm -rf` 剔除，包体 13M vs 84M）。 */
    ['taptap/dedao', 'taptap/dedao-pc', 'taptap/dedao_tap'].forEach((d) => {
      t.ok(!fs.existsSync(path.join(distBase, d, 'assets', 'img', '_src')),
        'dist/' + d + ' 不应含 assets/img/_src（AI 原图，会让上架包暴增 ~72MB）');
    });
    /* DEDAO_release 同样不得含 —— 它是「覆盖 Pages 根」的包，带上 72MB 源图会被一起推上线。
       2026-09-24 已清理（84M → 13M），本断言防回归。 */
    t.ok(!fs.existsSync(path.join(rel, 'assets', 'img', '_src')),
      'DEDAO_release 不应含 assets/img/_src（AI 原图 ~72MB，运行时不引用）');

    /* ④ 源码守卫：两处「包体组成」口径都必须声明 PC 入口页，
       否则会以「重构时改回去」的方式回归（这正是 L6 的成因）。 */
    const syncPy = path.join(REPO, 'tools', 'sync_dist.py');
    if (fs.existsSync(syncPy)) {
      const py = fs.readFileSync(syncPy, 'utf8');
      const m = py.match(/'DEDAO_release'\s*:\s*\[([^\]]*)\]/);
      t.ok(!!m, 'sync_dist.py 的 HTML_MAP 应含 DEDAO_release 条目');
      if (m) {
        t.ok(/index_pc\.html/.test(m[1]),
          'HTML_MAP 的 DEDAO_release 条目应声明 index_pc.html（否则线上 PC 页永远更新不到）');
      }
    }
    const sh = path.join(REPO, 'tools', 'build_release.sh');
    if (fs.existsSync(sh)) {
      const txt = fs.readFileSync(sh, 'utf8');
      const cpLines = (txt.match(/^cp\s+.*$/gm) || []).join(' | ');
      t.ok(/index_pc\.html/.test(cpLines),
        'build_release.sh 的运行时白名单应含 index_pc.html（实际 cp 行: ' + cpLines.trim() + '）');
    } else {
      t.note('当前目录无 tools/build_release.sh，跳过打包白名单守卫');
    }
  });

  /* ---------- 11. 共享 boot 未判空绑定守卫（2026-09-24 高危 BUG） ----------
   * 起因：PC 版「能开工、但一半按钮点了没反应」。手指向「PC 页少元素」，真凶却是
   *   **共享启动函数 boot() 抛错 → 它后面的绑定链整体不执行**：
   *   `js/ui.js` 的 boot() 里写过 `$('hongchen-back').onclick = ...`（未判空），
   *   而 `#hongchen-back` / `#screen-hongchen` 只在 index.html 有 → PC 页 `null.onclick`
   *   抛 TypeError → boot() 后半段约 100 行、**19 处绑定**全部静默落空
   *   （设置 / 角色 / 储物袋 / 宗门 / 弹窗关闭 / 暂停继续 / 秘境说明·撤离…，
   *    且 ui_pc.js 的顶部状态条靠 clickBtn('btn-xxx-bottom') 代理这些绑定，一并失效）。
   *
   * 一个 uncaught TypeError 就能让后半段绑定全废，且**页面不白屏**（前面已绑的还能用）→ 极难发现。
   *
   * 本守卫的不变量：**启动路径（boot()）里未判空的元素引用，必须在每个入口页都能找到该元素**。
   *   · 只查 boot()：行动态函数里的未判空引用不会致命（异常被局限在单个处理器内），
   *     且存在「先 innerHTML 建出来再绑」的合法写法（renderCreatePage / renderCultivate 等），
   *     一律全查会误报 —— 精确到启动路径才有意义。
   *   · 判空写法（同一处 `if (` 守卫先行）不计入。
   *   · 该元素在两页都缺席但由 boot 之前/内部创建的情形：本规则要求它出现在静态 HTML 里
   *     —— boot() 不做 DOM 创建，故该约束成立（误报已被 30 处实测引用验证为 0）。
   * ⚠ 同样锚 REPO：入口页与 ui.js 相对仓库根定位。 */
  S.case('共享 boot 未判空绑定守卫：启动路径引用的元素在每个入口页都存在（防一行 null.onclick 废掉整段绑定链）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const uiPath = path.join(REPO, 'js', 'ui.js');
    if (!fs.existsSync(uiPath)) { t.note('当前目录无 js/ui.js，跳过 boot 绑定守卫'); return; }
    const lines = fs.readFileSync(uiPath, 'utf8').split('\n');

    /* 定位共享启动函数 boot()（2 空格缩进、无参数） */
    const bs = lines.findIndex((l) => /^\s{2}function boot\(\)\s*\{/.test(l));
    if (bs < 0) { t.fail('ui.js 未找到 boot()（启动绑定链的宿主函数）'); return; }
    let be = -1;
    for (let k = bs + 1; k < lines.length; k++) {
      if (lines[k].replace(/\s+$/, '') === '  }') { be = k; break; }
    }
    if (be < 0) { t.fail('未找到 boot() 的结束位置（用于限定扫描范围）'); return; }
    const body = lines.slice(bs, be + 1);
    t.gte(body.length, 50, 'boot() 应是一个成规模的绑定块（实为 ' + body.length + ' 行）');

    /* 扫描启动路径里所有「未判空」的 $('id').prop 引用 */
    const re = /\$\('([a-z0-9_:-]+)'\)\.([a-zA-Z]+)/g;
    const refs = [];
    body.forEach((l, i) => {
      const s = l.trim();
      if (s.indexOf('//') === 0 || s.indexOf('*') === 0) return;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(l)) !== null) {
        const prefix = l.slice(0, m.index);
        if (/if\s*\(/.test(prefix)) continue;   // 同一行已有 if 守卫
        refs.push({ id: m[1], line: bs + i + 1 });
      }
    });
    t.gte(refs.length, 20, '启动路径应有可观数量的未判空引用（实为 ' + refs.length + ' 处，兜底防正则失效）');

    /* 每个入口页都必须能找到这些元素 */
    const pages = ['index.html', 'index_pc.html'];
    pages.forEach((pg) => {
      const pp = path.join(REPO, pg);
      if (!fs.existsSync(pp)) { t.fail('缺失入口页 ' + pg); return; }
      const ids = new Set([...fs.readFileSync(pp, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      const missing = [...new Set(refs.filter((r) => !ids.has(r.id))
        .map((r) => r.id + '（ui.js:' + r.line + '）'))];
      t.eq(missing.length, 0,
        pg + ' 缺少启动路径未判空引用的元素：' + (missing.join('、') || '无')
        + ' —— 该页会在 boot() 中途抛 TypeError，其后的绑定链整体失效；'
        + '修法：给 ui.js 那一行加 `if ($(id))` 判空（与同文件既有写法一致），或把元素补进该入口页');
    });

    t.note('启动路径未判空引用 ' + refs.length + ' 处，已在 ' + pages.join(' / ') + ' 两页逐一核对存在性');
  });

  return S;
};
