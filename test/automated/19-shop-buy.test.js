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

  return S;
};
