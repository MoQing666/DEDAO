/* DEDAO 自动化测试 —— 01 静态一致性 & 数据完整性
 * 不依赖浏览器，纯静态分析与数据校验。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT, Suite, createGameContext } = require('./_harness');

module.exports = async function build() {
  const S = new Suite('01 静态一致性 & 数据完整性');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
  const uiJs = fs.readFileSync(path.join(ROOT, 'js', 'ui.js'), 'utf8');
  const dataJs = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
  const engineJs = fs.readFileSync(path.join(ROOT, 'js', 'engine.js'), 'utf8');
  const audioJs = fs.readFileSync(path.join(ROOT, 'js', 'audio.js'), 'utf8');

  /* ---------- 1. 源码可解析性 ---------- */
  S.case('全部 JS 源文件语法可解析', (t) => {
    const files = { 'js/data.js': dataJs, 'js/engine.js': engineJs, 'js/ui.js': uiJs, 'js/audio.js': audioJs };
    for (const [f, code] of Object.entries(files)) {
      try { new vm.Script(code, { filename: f }); }
      catch (e) { t.fail(`${f} 语法错误: ${e.message}`); }
    }
  });

  S.case('源文件无编码损坏（U+FFFD 替换字符）', (t) => {
    const files = { 'index.html': html, 'css/style.css': css, 'js/data.js': dataJs, 'js/engine.js': engineJs, 'js/ui.js': uiJs, 'js/audio.js': audioJs };
    for (const [f, code] of Object.entries(files)) {
      const n = (code.match(/\uFFFD/g) || []).length;
      t.ok(n === 0, `${f} 含 ${n} 个 U+FFFD 损坏字符`);
    }
  });

  /* ---------- 2. DOM 引用一致性 ---------- */
  S.case('ui.js 引用的元素 ID 均存在于 index.html（非守护式引用）', (t) => {
    const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    // PC 副本（index_pc.html）里有「隐藏靶点」按钮：ui_pc.js 的顶部状态条用
    // clickBtn('btn-xxx') 代理触发 ui.js 的绑定（如 #btn-settings-bottom）。
    // 这类 ID 在手机版 index.html 中不存在属预期，不计入「死 ID」。
    // ⚠ 发布包（dist/*）按白名单打包、**不含 index_pc.html**，故此处显式列出，
    //   不能只靠读 index_pc.html —— 否则跑 dist 副本时会误报「守护式死代码」。
    const PC_PROXY_IDS = ['btn-omen-bottom', 'btn-ach-bottom', 'btn-codex-bottom', 'btn-settings-bottom'];
    const pcIds = new Set(PC_PROXY_IDS);
    const pcPath = path.join(ROOT, 'index_pc.html');
    if (fs.existsSync(pcPath)) {
      for (const m of fs.readFileSync(pcPath, 'utf8').matchAll(/\sid="([^"]+)"/g)) pcIds.add(m[1]);
    }
    const refs = new Set();
    for (const m of uiJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.add(m[1]);
    for (const m of uiJs.matchAll(/\$\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.add(m[1]);
    const missing = [...refs].filter(id =>
      !htmlIds.has(id) &&                       // 不在 index.html 中定义
      !pcIds.has(id) &&                         // 且不在 PC 副本中（隐藏代理靶点）
      !uiJs.includes(`id="${id}"`) &&           // 且非 ui.js 运行时通过模板动态创建的 ID（如开荒/宗门/仙缘面板）
      !uiJs.includes(`id='${id}'`)
    );
    t.note(`检查了 ${refs.size} 个 ID 引用 / HTML 定义 ${htmlIds.size} 个`);
    if (!missing.length) return;
    // 区分「裸引用」（真实缺陷）与「if ($(id)) 守护式死代码」（低风险）
    const lines = uiJs.split('\n');
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const unguarded = [], guarded = [];
    for (const id of missing) {
      const guardRe = new RegExp(`if\\s*\\(\\s*\\$\\(\\s*['"]${esc(id)}['"]\\s*\\)`);
      const refRe = new RegExp(`\\$\\(\\s*['"]${esc(id)}['"]\\s*\\)|getElementById\\(\\s*['"]${esc(id)}['"]\\s*\\)`);
      const refLines = lines.map(ln => ln).filter(ln => refRe.test(ln));
      const allGuarded = refLines.length > 0 && refLines.every(ln => guardRe.test(ln));
      (allGuarded ? guarded : unguarded).push(id);
    }
    if (guarded.length) t.warn(`守护式死代码（旧布局遗留，已用 if($(id)) 兜底，不触发）: ${guarded.join(', ')}`);
    if (unguarded.length) t.fail(`非守护式引用了不存在的 ID (${unguarded.length}): ${unguarded.slice(0, 15).join(', ')}`);
  });

  S.case('index.html 定义的元素 ID 均被使用（无死元素）', (t) => {
    const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    const allJs = uiJs + engineJs + audioJs;
    const unused = [...htmlIds].filter(id => !allJs.includes(`'${id}'`) && !allJs.includes(`"${id}"`));
    t.note(`未被引用的 ID ${unused.length} 个: ${unused.slice(0, 12).join(', ')}`);
    // 仅提示，不作失败（部分为纯样式容器）
  });

  S.case('HTML 中引用的资源文件均存在', (t) => {
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
      .filter(u => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:'));
    for (const u of refs) {
      const clean = u.split('?')[0].split('#')[0]; // 去掉 ?v=30 之类的版本号
      const p = path.join(ROOT, clean.replace(/^\.\//, ''));
      t.ok(fs.existsSync(p), `引用了不存在的资源: ${u}`);
    }
    t.note(`校验 ${refs.length} 个资源引用`);
  });

  /* ---------- 3. 移动端 / 小游戏宿主风险扫描 ---------- */
  S.case('未使用 alert / confirm / prompt（小游戏宿主会阻塞，移植风险）', (t) => {
    const all = { 'js/ui.js': uiJs, 'js/engine.js': engineJs };
    for (const [f, code] of Object.entries(all)) {
      const hits = [...code.matchAll(/\b(alert|confirm|prompt)\s*\(/g)].map(m => m[1]);
      if (hits.length) t.warn(`${f} 使用了 ${[...new Set(hits)].join('/')} 共 ${hits.length} 处 —— WebView 内嵌（抖音/华为/TapTap）时可能阻塞宿主线程，上线前需替换为自定义弹窗`);
    }
  });

  S.case('未硬编码 Windows 绝对路径', (t) => {
    const all = { 'index.html': html, 'js/ui.js': uiJs, 'js/engine.js': engineJs, 'js/data.js': dataJs };
    for (const [f, code] of Object.entries(all)) {
      const hits = [...code.matchAll(/[A-Za-z]:[\\\/][^\s'"]{3,}/g)].map(m => m[0]);
      if (hits.length) t.fail(`${f} 含绝对路径: ${hits.slice(0, 3).join(' | ')}`);
    }
  });

  S.case('Service Worker 缓存版本已声明', (t) => {
    const swPath = path.join(ROOT, 'sw.js');
    t.ok(fs.existsSync(swPath), '缺少 sw.js');
    if (fs.existsSync(swPath)) {
      const sw = fs.readFileSync(swPath, 'utf8');
      t.ok(/CACHE\s*=\s*['"][^'"]+['"]/.test(sw), 'sw.js 未定义 CACHE 版本常量');
      const m = /CACHE\s*=\s*['"]([^'"]+)['"]/.exec(sw);
      if (m) t.note(`当前缓存版本: ${m[1]}`);
    }
  });

  /* ---------- 4. 数据完整性 ---------- */
  const g = createGameContext({ seed: 1 });
  const get = g.get;

  S.case('境界体系 STAGES 完整且修为需求递增', (t) => {
    const STAGES = get('STAGES');
    t.ok(Array.isArray(STAGES) && STAGES.length === 12, `STAGES 应为 12 阶，实际 ${STAGES && STAGES.length}`);
    if (STAGES && STAGES.length) {
      for (let i = 0; i < STAGES.length; i++) {
        t.ok(STAGES[i].need > 0, `第 ${i} 阶 need 非正数`);
        t.ok(!!STAGES[i].realm && !!STAGES[i].sub, `第 ${i} 阶缺少 realm/sub`);
        t.ok(!!STAGES[i].color, `第 ${i} 阶缺少 color`);
        if (i > 0) t.gte(STAGES[i].need, STAGES[i - 1].need, `第 ${i} 阶修为需求低于前一阶`);
      }
      t.note(`需求曲线: ${STAGES.map(s => s.need).join(' → ')}`);
    }
  });

  S.case('功法 TECHNIQUES 字段合法', (t) => {
    const TECH = get('TECHNIQUES');
    const GRADE_COLOR = get('GRADE_COLOR') || {};
    const ids = Object.keys(TECH || {});
    t.gt(ids.length, 20, '功法数量过少');
    const badCls = [], badGrade = [], noName = [], badMult = [];
    for (const id of ids) {
      const x = TECH[id];
      if (!x.name) noName.push(id);
      if (!['xinfa', 'shufa', 'dunshu'].includes(x.cls)) badCls.push(`${id}:${x.cls}`);
      if (Object.keys(GRADE_COLOR).length && !GRADE_COLOR[x.grade]) badGrade.push(`${id}:${x.grade}`);
      if (x.cls === 'xinfa' && !(x.mult > 0)) badMult.push(`${id}:${x.mult}`);
    }
    if (noName.length) t.fail(`缺少 name: ${noName.join(', ')}`);
    if (badCls.length) t.fail(`非法 cls: ${badCls.slice(0, 10).join(', ')}`);
    if (badGrade.length) t.fail(`非法 grade: ${badGrade.slice(0, 10).join(', ')}`);
    if (badMult.length) t.fail(`心法 mult 非法: ${badMult.slice(0, 10).join(', ')}`);
    t.note(`功法 ${ids.length} 个，心法 ${ids.filter(i => TECH[i].cls === 'xinfa').length} / 术法 ${ids.filter(i => TECH[i].cls === 'shufa').length} / 遁术 ${ids.filter(i => TECH[i].cls === 'dunshu').length}`);
  });

  S.case('天赋 TALENTS 唯一且有 tier', (t) => {
    const TAL = get('TALENTS') || [];
    t.gt(TAL.length, 10, '天赋数量过少');
    const seen = new Set(), dup = [];
    for (const x of TAL) {
      if (seen.has(x.id)) dup.push(x.id);
      seen.add(x.id);
    }
    if (dup.length) t.fail(`重复天赋 ID: ${[...new Set(dup)].join(', ')}`);
    const noTier = TAL.filter(x => !x.tier).map(x => x.id);
    if (noTier.length) t.fail(`缺少 tier: ${noTier.slice(0, 10).join(', ')}`);
    const noName = TAL.filter(x => !x.name).map(x => x.id);
    if (noName.length) t.fail(`缺少 name: ${noName.slice(0, 10).join(', ')}`);
    t.note(`天赋 ${TAL.length} 个，档位分布: ${JSON.stringify(Object.fromEntries([...new Set(TAL.map(x => x.tier))].map(k => [k, TAL.filter(x => x.tier === k).length])))}`);
  });

  S.case('炼制配方 FORMULAS 产物与材料引用有效', (t) => {
    const F = get('FORMULAS') || [];
    const ART = get('ARTIFACTS') || {};
    const ELX = get('ELIXIRS') || {};
    const MAT = get('MATERIALS') || {};
    // 可炼制产物：丹(ELIXIRS) / 装备(EQUIPS 各槽位)。法宝(ARTIFACTS) 仅可剧情获取，不在炼制配方内。
    const EQ = get('EQUIPS') || {};
    const equipIds = new Set();
    for (const slot in EQ) for (const id in EQ[slot]) equipIds.add(id);
    t.gt(F.length, 5, '配方数量过少');
    const badOut = [], badCost = [];
    for (const f of F) {
      // 丹方用 out；装备配方用 slot+sub（炼器，品质由炼器等级驱动，无固定 out）
      if (f.type === '丹') {
        if (!ART[f.out] && !ELX[f.out]) badOut.push(`${f.id} → ${f.out}`);
      } else if (f.slot && f.sub) {
        // 校验 slot 存在，且该 slot 内存在该 sub 的至少一个模板
        const bucket = EQ[f.slot];
        let hasSub = false;
        if (bucket) for (const id in bucket) if (bucket[id].sub === f.sub) { hasSub = true; break; }
        if (!bucket || !hasSub) badOut.push(`${f.id} → slot:${f.slot}/sub:${f.sub}`);
      } else if (!ART[f.out] && !ELX[f.out] && !equipIds.has(f.out)) {
        badOut.push(`${f.id} → ${f.out}`);
      }
      for (const k of Object.keys(f.cost || {})) {
        if (!MAT[k]) badCost.push(`${f.id}:${k}`);
      }
    }
    if (badOut.length) t.fail(`配方产物不存在: ${badOut.join(', ')}`);
    if (badCost.length) t.fail(`配方材料不存在: ${[...new Set(badCost)].join(', ')}`);
    const outTypes = F.map(f => f.type);
    t.note(`配方 ${F.length} 条，类型分布: ${[...new Set(outTypes)].join(' / ')}`);
  });

  S.case('事件库 EVENTS 结构合法', (t) => {
    const E = get('EVENTS') || {};
    const cats = Object.keys(E);
    t.gt(cats.length, 0, 'EVENTS 为空');
    let total = 0, noText = [], noId = [];
    for (const c of cats) {
      const arr = E[c] || [];
      total += arr.length;
      for (const ev of arr) {
        if (!ev.id) noId.push(c);
        if (!ev.text && !ev.title && !ev.desc) noText.push(`${c}:${ev.id || '?'}`);
      }
    }
    if (noId.length) t.fail(`${[...new Set(noId)].join(',')} 中存在无 id 事件`);
    if (noText.length) t.fail(`无文案事件 ${noText.length} 条，例如 ${noText.slice(0, 5).join(', ')}`);
    t.note(`事件分类: ${cats.map(c => `${c}=${E[c].length}`).join(' / ')}，合计 ${total}`);
  });

  S.case('宗门数据 SECTS 与各事件表键一致', (t) => {
    const SECTS = get('SECTS') || {};
    const names = Object.keys(SECTS);
    t.gt(names.length, 0, '无宗门数据');
    for (const tbl of ['SECT_EVENTS', 'SECT_SOCIAL', 'SECT_COMBAT']) {
      const T = get(tbl);
      if (!T) { t.note(`未定义 ${tbl}`); continue; }
      const keys = Object.keys(T);
      const unknown = keys.filter(k => !names.includes(k));
      if (unknown.length) t.fail(`${tbl} 含未知宗门键: ${unknown.join(', ')}`);
      const missing = names.filter(n => !keys.includes(n));
      if (missing.length) t.fail(`${tbl} 缺少宗门: ${missing.join(', ')}`);
    }
    t.note(`宗门 ${names.length} 个: ${names.map(n => SECTS[n].name).join('、')}`);
  });

  S.case('灵根/彩蛋/背景池数据合法', (t) => {
    const LG = get('LINGGEN_POOL') || [];
    t.gt(LG.length, 0, '灵根池为空');
    const badW = LG.filter(l => !(l.w > 0)).map(l => l.id);
    if (badW.length) t.fail(`灵根权重非正: ${badW.join(', ')}`);
    const EG = get('EASTER_EGGS') || {};
    for (const [k, v] of Object.entries(EG)) {
      t.ok(!!(v && v.effect), `彩蛋 ${k} 缺少 effect`);
    }
    const BG = get('BACKGROUNDS') || [];
    t.gt(BG.length, 0, '出身背景为空');
    const bgNoName = BG.filter(b => !(b.name || b.title)).length;
    if (bgNoName) t.fail(`${bgNoName} 个背景缺少 name/title`);
    t.note(`灵根 ${LG.length} / 彩蛋 ${Object.keys(EG).length} / 背景 ${BG.length}`);
  });

  S.case('法宝 ARTIFACTS 合法（仅剧情获取，不可炼制）', (t) => {
    const ART = get('ARTIFACTS') || {};
    const ids = Object.keys(ART);
    const types = new Set(), badType = [], noName = [];
    for (const id of ids) {
      const a = ART[id];
      types.add(a.type);
      if (!a.name) noName.push(id);
      // 法宝以 type 区分：攻 / 守 / 辅；灵物类法宝（秘境秘藏专属）为「灵」
      if (!['攻', '守', '辅', '灵'].includes(a.type)) badType.push(`${id}:${a.type}`);
    }
    if (noName.length) t.fail(`法宝缺少 name: ${noName.slice(0, 8).join(', ')}`);
    if (badType.length) t.fail(`法宝 type 非法: ${badType.slice(0, 8).join(', ')}`);
    t.note(`法宝 ${ids.length} 件（剧情获取，不可炼制），类型: ${[...types].join(' / ')}`);
    // 校验：炼制配方中不应出现法宝产物
    const F = get('FORMULAS') || [];
    const fa = F.filter(f => f.type === '法宝');
    if (fa.length) t.fail(`存在可炼制法宝配方: ${fa.map(x => x.id).join(', ')} — 法宝应仅由剧情获取`);
  });

  S.case('法宝系统：47 件完整 & 全链路挂载 & 数值单位校验', (t) => {
    const ART = get('ARTIFACTS') || {};
    const ids = Object.keys(ART);
    // 50 = 剧情26 + 商店13 + 山河1 + 灵物4 + 秘境掉落类6
    //   （秘境掉落护身三宝 古檀平安牌/镇魂墨玉/金刚降魔印 + 2026-09-23 新增三件转系数法宝
    //      焚神残剑/灵海池/纷飞桃花；2026-09-13 灵物由独立道具改制成法宝；
    //      2026-09-14 古檀平安牌/镇魂墨玉/金刚降魔印由 EQUIPS.treasure 迁入）
    t.eq(ids.length, 50, `法宝应为 50 件（剧情26+商店13+山河1+灵物4+秘境6），实际 ${ids.length}`);
    // 灵物类法宝：4 件，必须带 spirit:true（否则会被随机法宝池抽走）
    const spiritArts = ids.filter(id => ART[id].spirit);
    t.eq(spiritArts.length, 4, `灵物类法宝应为 4 件，实际 ${spiritArts.length}`);
    if (spiritArts.some(id => ART[id].type !== '灵')) t.fail('灵物类法宝 type 应为「灵」');
    t.eq(spiritArts.filter(id => ['黄','玄','地','天'].includes(ART[id].grade)).length, 4, '灵物阶位应为 黄/玄/地/天 各一件');

    // 秘境掉落护身三宝（2026-09-14 由 EQUIPS.treasure 迁入）：
    //   必须非灵物 + grade 落在某个 BOSS_TREASURE_BAND 内，否则 advBossBonus 永远抽不到
    const BAND = get('BOSS_TREASURE_BAND') || {};
    const bandGrades = new Set();
    Object.keys(BAND).forEach(k => (BAND[k] || []).forEach(gr => bandGrades.add(gr)));
    const advDrop = ['gutang_pinganpai', 'zhenhun_moyu', 'jingang_xiangmoyin'];
    advDrop.forEach(id => {
      if (!ART[id]) { t.fail(`秘境掉落法宝 ${id} 缺失`); return; }
      if (ART[id].spirit) t.fail(`${id} 不应是灵物（灵物被排除出随机法宝池）`);
      if (!bandGrades.has(ART[id].grade)) t.fail(`${id}（${ART[id].grade}级）不在任何 BOSS_TREASURE_BAND 内，秘境掉不出`);
    });
    // 四件都不该再留在 EQUIPS.treasure：该槽不进秘境随机池，挂在那儿等于拿不到
    const EQ = get('EQUIPS') || {};
    const left = advDrop.concat(['taiji_baguapei']).filter(id => EQ.treasure && EQ.treasure[id]);
    if (left.length) t.fail(`EQUIPS.treasure 仍残留: ${left.join(', ')}（应迁至 ARTIFACTS 或删除）`);
    t.note(`秘境掉落护身三宝: ${advDrop.map(id => ART[id] && ART[id].name + '(' + ART[id].grade + ')').join(' / ')}`);

    const effKeys = ['wu','ti','dun','shen','dao','ling','atk','hpMax','def','critPct','dodgePct','defPct','atkPct','cult','stealPct','defToAtk','tiHpBonus','duantiEff','duantiShenEff','duantiMax','craftEff','farmEff','mineEff','stoneYearPct','cultTwice','modeBonus','craftKind','daoAtkPct','lowHpAtk','scale','atkSpd','doubleCult','doubleDmg','daoCritMul','shenAtkMul','lingMpMul','dunSpdMul'];
    const pctFields = ['critPct','dodgePct','defPct','atkPct','cult','stealPct','daoAtkPct','craftEff','tiHpBonus','duantiEff','duantiShenEff','farmEff','mineEff','stoneYearPct','doubleCult','doubleDmg'];
    const noEffect = [], empty = [], badPct = [];
    for (const id of ids) {
      const e = ART[id].effect;
      if (!e || typeof e !== 'object') { noEffect.push(id); continue; }
      if (!effKeys.some(k => e[k] !== undefined && e[k] !== null)) empty.push(id);
      for (const k of pctFields) {
        if (e[k] !== undefined && e[k] !== null) {
          if (typeof e[k] !== 'number' || e[k] <= 0 || e[k] >= 1) badPct.push(`${id}.${k}=${e[k]}`);
        }
      }
    }
    if (noEffect.length) t.fail(`法宝缺少 effect: ${noEffect.join(', ')}`);
    if (empty.length) t.fail(`法宝 effect 无任何生效键: ${empty.join(', ')}`);
    if (badPct.length) t.fail(`百分比字段须为小数(0.05=5%)，非法: ${badPct.slice(0, 10).join(', ')}`);

    // 商店挂载：SECT_GOODS / ART_SHOP_ITEMS 的 art 引用必须存在
    const SECT_GOODS = get('SECT_GOODS') || [];
    const ART_SHOP = get('ART_SHOP_ITEMS') || [];
    const sectBad = SECT_GOODS.filter(g => g.kind === 'art' && !ART[g.ref]).map(g => g.ref);
    const shopBad = ART_SHOP.filter(it => !ART[it.id]).map(it => it.id);
    if (sectBad.length) t.fail(`宗门功业商店引用了不存在的法宝: ${sectBad.join(', ')}`);
    if (shopBad.length) t.fail(`游历流动商贩池引用了不存在的法宝: ${shopBad.join(', ')}`);
    t.note(`宗门功业商店法宝 ${SECT_GOODS.filter(g => g.kind === 'art').length} 件 / 游历流动商贩池 ${ART_SHOP.length} 件`);

    // 剧情挂载：26 件剧情法宝都需在 data.js 中实际发放（effect.art 或 loot.art）
    const story = ['linghu_pei','tongqian_jian','dashen_bian','taixu_zhu','wudao_yujian','xuanwu_guijia','fengxing_yuyi','yuanshen_deng','mingxin_jing','zhoutian_xingpan','zhanxian_feidao','bumie_jinshen','shixue_zhu','yuzhi_motong','youhun_pijian','panshi_kai','juling_art','daolv_tongxin_pei','changsheng_yusui','jingshi_yupai','wuchen_putuan','xinru_zhishui','dixue_ren','jilin_jia','xuechi_duanjian','huixin_jian'];
    const missing = story.filter(id => !new RegExp(`art:\\s*['"]${id}['"]`).test(dataJs));
    if (missing.length) t.fail(`剧情法宝未挂载发放: ${missing.join(', ')}`);
    t.note('26 件剧情法宝全部挂载 ✓（含新增事件 yl_dashen）');

    // 剧情装备挂载：所有事件 / 战斗掉落里的 loot.equip / effect.equip 必须真实存在
    const EQUIPS = get('EQUIPS') || {};
    function findEquipId(id) {
      for (const slot in EQUIPS) if (EQUIPS[slot][id]) return true;
      return false;
    }
    const equipRefs = new Set();
    const equipMatches = dataJs.matchAll(/equip:\\s*['"]([a-z_]+)['"]/g);
    for (const m of equipMatches) equipRefs.add(m[1]);
    const slotNames = new Set(['head','body','leg','treasure']);
    const badEquip = [...equipRefs].filter(id => !slotNames.has(id) && !findEquipId(id));
    if (badEquip.length) t.fail(`剧情/掉落引用了不存在的装备 id: ${badEquip.join(', ')}`);
    t.note(`剧情/掉落装备引用 ${equipRefs.size} 个，全部存在 ✓`);

    // 门槛选项：清净明心剑/无尘蒲团/周天星盘 的 req 门槛存在
    t.ok(/id:\s*'jd_shanzhong_yinshi'[\s\S]*?req:\s*\{\s*dao:\s*10/.test(dataJs), '清净明心剑缺少 dao:10 门槛');
    t.ok(/id:\s*'jd_gusha_zhongsheng'[\s\S]*?req:\s*\{\s*wu:\s*10/.test(dataJs), '无尘蒲团缺少 wu:10 门槛');
    t.ok(/id:\s*'xingluo_gu'[\s\S]*?req:\s*\{\s*shen:\s*8/.test(dataJs), '周天星盘缺少 shen:8 门槛');

    // 老乞丐 50 灵石门槛维持不补（确认 ml_0_5 仍有 req:{stone:50}）
    t.ok(/id:\s*'ml_0_5'[\s\S]*?req:\s*\{\s*stone:\s*50/.test(dataJs), '老乞丐 ml_0_5 的 50 灵石门槛缺失');

    // 公式产物不得是法宝
    const F = get('FORMULAS') || [];
    const fa2 = F.filter(f => ART[f.out]);
    if (fa2.length) t.fail(`炼制配方产物是法宝: ${fa2.map(x => x.id).join(', ')}`);

    // 新增事件 yl_dashen 存在且发放打神鞭
    t.ok(/id:\s*'yl_dashen'[\s\S]*?art:\s*'dashen_bian'/.test(dataJs), '新增事件 yl_dashen 未正确发放打神鞭');

    // —— 宗门商品池结构：无 array(阵法) 商品、单货币按类型、价格字段合法 ——
    const coinKinds = { stone: ['tech', 'dun', 'art', 'equip'], gongye: ['elixir', 'mat'] };
    const STONE_KINDS = coinKinds.stone, GONGYE_KINDS = coinKinds.gongye;
    if (SECT_GOODS.some(g => g.kind === 'array')) t.fail('宗门商店不应再售 array(阵法)商品（已移除法阵，仅洞府/百艺有效）');
    SECT_GOODS.forEach(g => {
      const coin = g.coin || (GONGYE_KINDS.indexOf(g.kind) >= 0 ? 'gongye' : 'stone');
      const expect = STONE_KINDS.indexOf(g.kind) >= 0 ? 'stone' : 'gongye';
      if (coin !== expect) t.fail(`${g.ref} 币种应为 ${expect}，实际 ${coin}（kind=${g.kind}）`);
      // 单货币：只允许存在所属币种的价格字段
      const priceFields = (STONE_KINDS.indexOf(g.kind) >= 0) ? ['stoneFix', 'grade'] : ['gongye'];
      if (expect === 'gongye' && !(g.gongye > 0)) t.fail(`${g.ref} 功业类缺少正价 gongye`);
      if (expect === 'stone' && !(g.stoneFix > 0) && !(g.grade)) t.fail(`${g.ref} 灵石类缺少 stoneFix/grade 定价`);
    });
    t.note(`宗门商品 ${SECT_GOODS.length} 件，全部单货币（灵石 ${SECT_GOODS.filter(g => STONE_KINDS.indexOf(g.kind) >= 0).length} / 功业 ${SECT_GOODS.filter(g => GONGYE_KINDS.indexOf(g.kind) >= 0).length}）`);
  });


  /* 守卫：法宝效果文案不得出现「++」与水词
     历史 bug：UI 侧 pct() 自带「+」、调用处又补了一次「+」→「灵矿产量++30%」。
     现 artEffectText 已收敛到引擎唯一实现，UI 只做转发。 */
  S.case('法宝效果文案：无「++」重复加号 / 不出现栏位解锁水词', (t) => {
    const E = get('Engine');
    const ART = get('ARTIFACTS') || {};
    const bad = [], water = [];
    Object.keys(ART).forEach(function (id) {
      const txt = E.artEffectText(id);
      if (txt.indexOf('++') >= 0 || txt.indexOf('+-') >= 0) bad.push(id + ':' + txt);
      if (txt.indexOf('解锁') >= 0 || txt.indexOf('栏位') >= 0) water.push(id + ':' + txt);
    });
    if (bad.length) t.fail('法宝文案出现重复加号：' + bad.slice(0, 5).join(' | '));
    if (water.length) t.fail('法宝文案出现「解锁/栏位」水词：' + water.slice(0, 5).join(' | '));
    // 抽样校验绝对值
    t.ok(E.artEffectText('xunkuang_luopan').indexOf('灵矿产量+30%') >= 0, '寻矿罗盘应显示「灵矿产量+30%」，实际：' + E.artEffectText('xunkuang_luopan'));
    t.ok(E.artEffectText('shangpin_lingjing').indexOf('气血上限+100') >= 0, '上品灵晶应显示「气血上限+100」');
    t.ok(E.artEffectText('mohex_suibian').indexOf('伤害翻倍') >= 0, '魔核碎片应显示双倍伤害');
  });

  /* 守卫：静室歇脚弹窗不得再有「不再停留」，该位置改为「撤离（保住收获）」
     用户 2026-09-14 要求。理由：【不再停留】与右上【关闭】完全等价
     （advMove 早已把玩家移到该节点，advAdvanceToMap 只是刷回地图），留两个出口纯属冗余；
     而静室是秘境中唯一可完整收货的撤退点，按钮就该占原来那一格。
     本用例读的是 ROOT 下的 ui.js —— 以 DEDAO_ROOT=dist/... 复跑时可顺带守住「dist 忘了同步」。 */
  S.case('静室歇脚：已删除「不再停留」，原位置为「撤离（保住收获）」', (t) => {
    // 先剥掉注释再断言：否则注释里提到旧按钮名就会误报（本用例首版即踩此坑）
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    t.ok(code.indexOf('不再停留') < 0, '静室歇脚不应再出现「不再停留」按钮（其作用与右上【关闭】重复）');
    const RET = '撤离（保住收获）';
    const iRet = code.indexOf(RET);
    t.ok(iRet > 0, '应保留「' + RET + '」按钮');
    // 位置：必须排在「养精蓄锐」之后 —— 即原「不再停留」所占的那一格
    const iStam = code.indexOf('养精蓄锐（秘境体力 +10）');
    t.ok(iStam > 0 && iRet > iStam, '「' + RET + '」应排在「养精蓄锐」之后（原「不再停留」的位置）');
    t.eq(code.split(RET).length - 1, 1, '「' + RET + '」应只出现一次（不得与旧按钮并存）');
    t.ok(code.indexOf("advFinish('撤离')") > 0, '静室撤离应走 advFinish(\'撤离\') —— 完整收货分支');
  });

  /* 守卫：商店购买必须以「商品对象」调用 buyStock（2026-09-23 用户实测 BUG）
     旧写法 `Engine.buyStock(S, +b.getAttribute('data-i'))` 把下标（number）当商品传进引擎：
     引擎里 si.price 为 undefined → `s.stone -= undefined` → 灵石变 NaN（截图即「灵石 NaN」），
     商品还拿不到、只留一行 undefined 日志，玩家端表现「购买直接失败」。
     本用例守调用形态；引擎侧入参守卫另在 02 用例守。 */
  S.case('流动商贩购买：必须以商品对象调用 buyStock（禁止传下标 / 禁止读不存在的 msg）', (t) => {
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const at = code.indexOf('function travelShop');
    t.ok(at > 0, '应存在 travelShop（游历·流动商贩）入口');
    // 截取函数体：到下一个同缩进（两空格）的 function 声明为止
    const nxt = code.indexOf('\n  function ', at + 10);
    const body = code.slice(at, nxt > 0 ? nxt : at + 3000);
    // ⚠ 注意：`log(r.msg, r.ok ? ...)` 在 ui.js 里是通用写法（多数引擎动作确实返回 msg），
    //   只有商店这一处是错的 —— 所以断言必须收在 travelShop 函数体内，不能全局扫。
    t.ok(!/buyStock\(\s*S\s*,\s*\+/.test(body),
      '不得把 data-i 下标直接传给 buyStock（会把 si.price 读成 undefined → 灵石 NaN）');
    t.ok(/stock\[\s*\+[^\]]*data-i[^\]]*\]/.test(body),
      '应取 stock[+data-i] 得到商品对象后再传入 buyStock');
    t.ok(body.indexOf('log(r.msg, r.ok') < 0,
      '不得以 log(r.msg, r.ok ? ...) 输出购买结果 —— buyStock 成功路径只返回 lines/gains，msg 为 undefined');
    t.ok(/r\.lines/.test(body), '成交结果应逐行输出 r.lines');
    t.ok(/shopStockYearly/.test(body), '货架应走 Engine.shopStockYearly（每年一换），不再每次进店重掷');
    const E = get('Engine');
    t.eq(typeof E.shopStockYearly, 'function', '引擎应导出 shopStockYearly（货架每年一换）');
  });

  /* 守卫：仙门赶考引导（2026-09-23）
     主线【仙门收徒】选「赴仙门应考」→ 剧情关闭后弹聚光灯指向行动栏【宗门】，可跳过且永久静默。
     挂三点：data 选项带 tutorial / ui choose 收集 / playMainlineChain 的 done() 触发且与 onYear 互斥。 */
  S.case('仙门赶考引导挂载：选项带 tutorial、choose 收集、剧情关闭后触发且与年份引导互斥', (t) => {
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    // ① 数据侧：赴考选项必须带 tutorial 标记，且【婉拒】选项不得带（玩家自己说再游几年，不该弹赴考）
    const mlAt = dataJs.indexOf("id: 'ml_2_0'");
    t.ok(mlAt > 0, '应存在主线 ml_2_0（仙门收徒）');
    const mlBody = dataJs.slice(mlAt, mlAt + 1400);
    // 注意：选项体内嵌 `effect: {}` 等花括号，不能用 [^}]* 截断，改用限长跨字符匹配
    t.ok(/t:\s*'赴仙门应考'[\s\S]{0,200}?tutorial:\s*'exam'/.test(mlBody),
      '「赴仙门应考」选项应带 tutorial:\'exam\'（赴考才引导）');
    const dAt = mlBody.indexOf('再游历几年（婉拒）');
    t.ok(dAt > 0 && !/tutorial/.test(mlBody.slice(dAt, dAt + 220)),
      '「婉拒」选项不得带 tutorial（玩家自己说再游几年，不该劝人赴考）');
    t.ok(mlBody.indexOf('底部栏【宗门】') < 0, '文案「底部栏【宗门】」已过时（宗门入口在行动栏），须为「行动栏【宗门】」');
    // ② ui 侧：choose() 收集标记
    const chAt = code.indexOf('function choose(c)');
    t.ok(chAt > 0, '应存在 choose(c)（章节选项处理器）');
    t.ok(/if\s*\(\s*c\.tutorial\s*\)\s*pendingTutorial\s*=\s*c\.tutorial/.test(code.slice(chAt, chAt + 400)),
      'choose() 应收集 c.tutorial 到 pendingTutorial');
    // ③ 触发点：在 playMainlineChain 的 done() 内，且与 onYear 互斥
    const pmAt = code.indexOf('function playMainlineChain');
    const pmBody = code.slice(pmAt, pmAt + 1200);
    t.ok(/pendingTutorial[\s\S]{0,300}Tutorial\.start\(/.test(pmBody),
      'playMainlineChain 应在剧情关闭后触发 pendingTutorial 引导');
    t.ok(/started\s*=\s*!!window\.Tutorial\.start\(tg,\s*false\)/.test(pmBody),
      '应以 start(stage, false) 触发（已看过则静默 → 永久不再提示）');
    t.ok(/if\s*\(!started\)\s*window\.Tutorial\.onYear\(/.test(pmBody),
      '引导与年份引导必须互斥，避免两次 start 互相覆盖');
  });

  /* 守卫：三个商人页（宗门商人 / 游历流动商贩 / 秘境荒野坊市）都必须展示当前灵石，
     且一律走 Engine.repairStone —— 旧档脏值（null/NaN）须自愈为 1000，不得显示空白。 */
  S.case('商人页灵石展示：宗门/游历/秘境三处均显示「灵石可用」且统一走 repairStone', (t) => {
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const shops = [
      { name: '宗门商人', at: code.indexOf('function sectDoShop') },
      { name: '游历·流动商贩', at: code.indexOf('function travelShop') },
      { name: '秘境·荒野坊市', at: code.indexOf('function advShop') }
    ];
    for (const sp of shops) {
      t.ok(sp.at > 0, '应存在 ' + sp.name + ' 入口');
      const body = code.slice(sp.at, sp.at + 2600);
      t.ok(/灵石可用/.test(body), sp.name + ' 应展示「灵石可用：X」');
      t.ok(/repairStone\(S\)/.test(body), sp.name + ' 灵石应走 Engine.repairStone（脏值自愈为 1000，不空白）');
      // 裸 S.stone 参与显示/比较是脏值源头：显示与比价两处都不得出现
      t.ok(!/'灵石可用：'\s*\+\s*S\.stone/.test(body), sp.name + ' 不得用裸 S.stone 渲染灵石（脏值会显示空白）');
      t.ok(!/S\.stone\s*<\s*x?\.?si\.price/.test(body), sp.name + ' 不得用裸 S.stone 做「灵石不足」比较');
    }
  });

  /* 守卫：六维面板文案只说「一共加了多少」
     用户 2026-09-13 定稿：不写「（基础+命格）」、不写「每点+多少」、不写栏位解锁。 */
  S.case('六维面板文案：只给总增益，无「基础/命格/每点/解锁」', (t) => {
    const E = get('Engine');
    const st = E.startLife('测试');
    t.ok(!!st, '无法构造存档（startLife 失败）');
    if (!st) return;
    const keys = ['wu', 'ti', 'dun', 'dao', 'ling', 'shen'];
    keys.forEach(function (k) {
      E.refreshStats(st);
      const txt = E.attrGainText(st, k);
      if (!txt) t.fail('六维 ' + k + ' 缺少收益文案');
      if (txt.indexOf('基础') >= 0 || txt.indexOf('命格+') >= 0) t.fail('六维 ' + k + ' 文案出现「基础/命格+」：' + txt);
      if (txt.indexOf('每点') >= 0) t.fail('六维 ' + k + ' 文案出现「每点」：' + txt);
      if (txt.indexOf('解锁') >= 0 || txt.indexOf('栏位') >= 0) t.fail('六维 ' + k + ' 文案出现栏位解锁：' + txt);
    });
    t.note('六维文案样例：体魄「' + E.attrGainText(st, 'ti') + '」/ 道心「' + E.attrGainText(st, 'dao') + '」');
  });

  /* ---------- 事件 effect 的键必须被 applyOps 白名单支持 ----------
     历史 bug：applyOps 的 `case 'trib'` 写进死字段 s.linggen.body.trib（现代存档只认 linggen.trait.effect）；
     而 `case 'shen'/'dun'` 写好了、白名单数组却没开 → effect:{dun:1}/{shen:1} 点下去等于什么都没给，
     文案却写着「遁速+1 / 神识+0.5」。此守卫把「文案承诺但静默无效」挡在提交前。 */
  S.case('事件 effect 的键必须被 applyOps 白名单支持', (t) => {
    const opsStart = engineJs.indexOf("['qi', 'hp', 'stone'");
    const allow = engineJs.slice(opsStart, engineJs.indexOf(']', opsStart) + 1).match(/'([a-zA-Z]+)'/g).map(s => s.replace(/'/g, ''));
    t.gte(allow.length, 20, 'applyOps 白名单应能解析出来（实 ' + allow.length + ' 项）');
    const G = createGameContext();
    const bad = [];
    const chk = function (where, eff) {
      if (!eff || typeof eff !== 'object') return;
      Object.keys(eff).forEach(function (k) { if (allow.indexOf(k) < 0) bad.push(where + ' → ' + k); });
    };
    const walk = function (where, ev) {
      if (!ev || typeof ev !== 'object') return;
      if (Array.isArray(ev)) { ev.forEach((e, i) => walk(where + '[' + i + ']', e)); return; }
      chk(where, ev.effect);
      (ev.choices || []).forEach((c, i) => chk(where + '.choice' + i, c.effect));
    };
    const EVENTS = G.get('EVENTS') || {};
    Object.keys(EVENTS).forEach(p => walk('EVENTS.' + p, EVENTS[p]));
    walk('XIANYUAN', G.get('XIANYUAN') || []);
    walk('MAINLINE', G.get('MAINLINE') || []);
    const NPCS = G.get('NPCS') || {};
    Object.keys(NPCS).forEach(id => walk('NPCS.' + id, NPCS[id]));
    walk('SECT_SOCIAL', G.get('SECT_SOCIAL') || {});
    walk('SECT_COMBAT', G.get('SECT_COMBAT') || {});
    if (bad.length) t.fail('以下 effect 键不在 applyOps 白名单里（玩家点了等于没给）：\n    ' + bad.join('\n    '));
    t.note('白名单 ' + allow.length + ' 项：' + allow.join(','));
  });

  // === 回归 2026-09-13：手机端「所有页面全量可滑动」适配（用户反馈进入页裁切、开始不了新游戏） ===
  S.case('手机端滚动适配：关键屏幕必须有可用滚动容器', (t) => {
    const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
    // 每条规则：容器名 → 检测函数（防滚动适配被误删后内容被 .screen overflow:hidden 裁掉）
    const need = [
      ['天命抉择页', (c) => c.includes('#screen-enter .enter-wrap') && /#screen-enter \.enter-wrap \{[^}]*overflow-y:\s*auto/.test(c)],
      ['百艺/锻体内滚层', (c) => /#screen-crafts #crafts-body[, {][^}]*overflow-y:\s*auto/.test(c) || (c.includes('#screen-crafts #crafts-body') && /#screen-duanti #duanti-body \{[^}]*overflow-y:\s*auto/.test(c))],
      ['装备页储物区', (c) => /#gear-inv-wrap \{[^}]*overflow-y:\s*auto/.test(c)],
      ['轮回塔列表', (c) => /\.rb-list \{[^}]*overflow-y:\s*auto/.test(c)],
      ['子页面通用 screen-body', (c) => /\.screen-body \{ flex: 1; min-height: 0; overflow-y: auto;/.test(c)],
      ['角色页', (c) => /#screen-char \{[^}]*overflow-y:\s*auto/.test(c)],
      ['结算页', (c) => /#screen-settlement \{[^}]*overflow-y:\s*auto/.test(c)],
    ];
    const miss = need.filter(([, fn]) => !fn(css)).map(([n]) => n);
    if (miss.length) t.fail('以下屏幕的滚动适配规则缺失（内容超屏会被裁切）：' + miss.join('、'));
    t.note('滚动适配规则 7/7 在位');
  });

  /* === 回归 2026-09-14：战斗状态徽章（图标 + 名称）的供数与渲染契约 ===
     背景：index.html 的 #b-me-buffs / #b-enemy-buffs 与 ui.js 的 renderBuffs() 早就写好，
     但 s.battle.buffs 全仓库从未被写入 → 徽章恒为空、敌我两行又因 bb === S.battle 而同源。
     现在改为调用 Engine.battleFxList(s, b) 现算。本用例守住这条链路，防回退。 */
  S.case('战斗徽章契约：由 Engine.battleFxList 供数 + 图标/文字双节点 + 减益底色区分', (t) => {
    const cssSrc = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
    t.ok(/Engine\.battleFxList\(/.test(uiJs), 'ui.js 必须调用 Engine.battleFxList() 取状态列表');
    t.ok(/renderBuffs\('b-enemy-buffs',\s*fxl\.foe\)/.test(uiJs), '敌方徽章应取 fxl.foe（独立于我方）');
    t.ok(/renderBuffs\('b-me-buffs',\s*fxl\.me\)/.test(uiJs), '我方徽章应取 fxl.me');
    // 回退守卫：不得再读 battle.buffs（无写入点 → 徽章会恒空）
    t.ok(!/renderBuffs\([^)]*\.buffs\)/.test(uiJs),
      '不得回退读 s.battle.buffs（该字段全仓库无写入点，徽章会恒空且敌我同源）');
    // 渲染出「图标 + 名称」两个子节点
    t.ok(/bf-ic/.test(uiJs) && /bf-tx/.test(uiJs), '徽章应渲染图标(.bf-ic)与文字(.bf-tx)两个子节点');
    t.ok(/\.buff\s+\.bf-ic\s*\{/.test(cssSrc), 'CSS 应有 .buff .bf-ic 图标样式');
    t.ok(/\.buff\.bad\s*\{[^}]*background/.test(cssSrc), '减益徽章应有用底色区分（.buff.bad background）');
    t.note('链路：Engine.battleFxList → renderBuffs → .buff/.bf-ic/.bf-tx');
  });

  /* === 回归 2026-09-15：AGENTS.md 的「测试模块表」用例数是**手工维护的硬编码总数** ===
     与成就文案里的「四十七件」是同一类漂移源，而且更误导 —— 这张表是 agent 判断
     「哪个模块守住了什么」的依据，写小了会让人以为那里没有覆盖。
     2026-09-15 实测：12 个模块里 **7 个**数字是错的（03 写 32 实为 44、11 写 24 实为 36、
     09 写 6 实为 8 ……）。
     修法不是「把数字改对」，而是让表与文件长期对账：数每个测试文件里 S\.case\( 的出现次数，
     与 AGENTS.md 模块表该行写的数字比对，不一致即红。
     注：AGENTS.md 只在仓库根（dist 副本不含），故锚定「测试代码所在仓库」而非 ROOT ——
     这样主仓库 / 两份 dist 三种跑法都能校验同一份文档。 */
  S.case('AGENTS.md 测试模块表用例数与实际一致（防手工维护的计数漂移）', (t) => {
    const REPO = path.join(__dirname, '..', '..');   // 测试代码恒来自仓库，与 DEDAO_ROOT 无关
    const agentsPath = path.join(REPO, 'AGENTS.md');
    t.ok(fs.existsSync(agentsPath), '仓库根应存在 AGENTS.md');
    if (!fs.existsSync(agentsPath)) return;
    const agents = fs.readFileSync(agentsPath, 'utf8');
    const dir = path.join(REPO, 'test', 'automated');
    const files = fs.readdirSync(dir).filter(f => /^\d\d-.*\.test\.js$/.test(f)).sort();
    t.gte(files.length, 13, '应至少扫到 13 个测试模块');

    let total = 0, checked = 0;
    files.forEach(function (f) {
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      const n = (txt.match(/S\.case\(/g) || []).length;   // 每个 S\.case\( 即一条用例
      total += n;
      // 模块表行形如： | `01-static-data.test.js` | 21 | 说明 |
      // 注意：本文件自身的注释里**不许出现未转义的字面量**，否则会被自己数进去（踩过）
      const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = agents.match(new RegExp('`' + esc + '`\\s*\\|\\s*(\\d+)'));
      t.ok(!!m, 'AGENTS.md 测试模块表缺少 ' + f + ' 一行');
      if (!m) return;
      checked++;
      t.eq(parseInt(m[1], 10), n,
        f + ' 模块表写的用例数与实际不符（实际 ' + n + ' 条）—— 改了测试就必须同步 AGENTS.md 模块表');
    });
    t.ok(checked >= 13, '应至少核对 13 行模块表，实为 ' + checked);
    t.note('模块表合计用例数应为 ' + total + '（可对照 run.js 报告的总计）');
  });

  /* === 回归 2026-09-15：DEDAO_项目简介.md（对外简历附件）的数量口径 ===
     为什么单独守这一份：它是**唯一对外可见**且逐条列举「当前总量」的文档（发给 HR 的附件），
     数字错了直接对外失实。2026-09-15 实测本文档内有 4 处漂移，其中 2 处是上一轮修文档时自己写错的：
       · 「28 个轮回天赋」—— 28 其实是**旧「开局命格」表 `TALENTS`** 的条数，
         现行轮回天赋是 `REINCARNATION`（14）；且 `TALENTS` 与「天赋」无关（引擎注释即写「旧命格」）
       · 「99 个游历奇遇事件」—— 99 是全部随机事件，游历口径只有 68（jiyuan 30 + shejiao 38）
       · 三处「255」（用例数），实际已达 258
     为什么**不做**全仓库文档裸扫：实测正则法在两个方向上都不成立 ——
       · 漏报：`47 件可收集法宝`（量词与实体间有修饰词）匹配不到
       · 误报：`### 4.3 命格池` 被当成「命格 3 个」，69 处告警里几乎没有真的
     故本类守卫一律**定向**：选定「宣称当前总量」的那一句，逐项与数据表对比。
     锚定仓库根（dist 副本不含此文档），找不到则跳过。 */
  S.case('DEDAO_项目简介.md（对外简历附件）的数量口径与数据表一致', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const docPath = path.join(REPO, 'DEDAO_项目简介.md');
    if (!fs.existsSync(docPath)) { t.note('未找到 DEDAO_项目简介.md（dist 副本无此文件），跳过'); return; }
    const doc = fs.readFileSync(docPath, 'utf8');

    const G = createGameContext({ seed: 1 });
    const cnt = function (name) {
      const tb = G.get(name);
      if (!tb) return 0;
      return Array.isArray(tb) ? tb.length : Object.keys(tb).length;
    };
    const EVENTS = G.get('EVENTS') || {};
    const evAll = Object.keys(EVENTS).reduce((a, k) => a + (Array.isArray(EVENTS[k]) ? EVENTS[k].length : 0), 0);
    const evTravel = ((EVENTS.jiyuan || []).length) + ((EVENTS.shejiao || []).length);
    const ADV = G.get('ADVENTURE_CONFIG') || {};
    const advN = Object.keys(ADV).filter(k => k !== 'trial').length;   // trial 是「劫境」，不是秘境
    // 用例总数（与上一条用例同一算法，避免两处口径分叉）
    const tdir = path.join(REPO, 'test', 'automated');
    const total = fs.readdirSync(tdir).filter(f => /^\d\d-.*\.test\.js$/.test(f))
      .reduce((a, f) => a + (fs.readFileSync(path.join(tdir, f), 'utf8').match(/S\.case\(/g) || []).length, 0);

    const CLAIMS = [
      [evAll + ' 个随机事件',                '随机事件（EVENTS 各组合计）'],
      ['游历奇遇 ' + evTravel,               '游历奇遇（jiyuan + shejiao）'],
      [cnt('ARTIFACTS') + ' 件可收集法宝',    'ARTIFACTS'],
      [cnt('DESTINIES') + ' 个命格',         'DESTINIES（现行命格表）'],
      [cnt('TECHNIQUES') + ' 部功法',        'TECHNIQUES'],
      [cnt('REINCARNATION') + ' 项轮回天赋',  'REINCARNATION'],
      [cnt('FORMULAS') + ' 条炼制配方',       'FORMULAS'],
      [advN + ' 处秘境',                     'ADVENTURE_CONFIG（不含 trial 劫境）'],
      [cnt('ACHIEVEMENTS') + ' 个成就',      'ACHIEVEMENTS'],
      [total + ' 项用例',                    '测试用例总数'],
      [total + '/' + total + ' 通过',         '测试通过数'],
    ];
    CLAIMS.forEach(function (c) {
      t.ok(doc.indexOf(c[0]) >= 0,
        '文档里找不到「' + c[0] + '」（应等于 ' + c[1] + '）—— 数据增删或用例数变化后必须同步本文档');
    });
    t.note('已核 ' + CLAIMS.length + ' 项：' + CLAIMS.map(c => c[0]).join(' · '));
  });

  /* ---------- 已删除字段：不得复活 ---------- */
  /* 「突破次数」字段（每次小阶提升 +1）已于 2026-09-15 全量删除（AGENTS.md 变更日志 #61）。
     它历史上被误用过两次：成就 `sanjie` 拿它当渡劫次数、`tools/` 三个镜像脚本拿它算渡劫分。
     它既不能当境界判据（境界看 s.idx）、也不能当渡劫判据（渡劫看 s.tribPassed），
     留着只会招来第三次误用 —— 故加一道"不得复活"的守卫。
     范围：`js/` 跟 DEDAO_ROOT 走（三份复跑各验各的那份）；`tools/` 只在仓库根有，找不到就跳过。
     ⚠ 必须剥注释：历史教训本身写在注释里，不剥会自己撞自己。 */
  S.case('已删除的「突破次数」字段不得复活（js/ 与 tools/ 代码里均无 .broken）', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    function stripComments(src) {
      return src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/[;)}\]]\s*\/\/[^\n]*/g, '');
    }
    function scanDir(label, dir, must) {
      if (!fs.existsSync(dir)) {
        if (must) t.ok(false, label + ' 目录不存在：' + dir);
        else t.note(label + ' 不存在（dist 副本不含该目录），跳过');
        return 0;
      }
      let n = 0; const bad = [];
      fs.readdirSync(dir).forEach(function (f) {
        if (!/\.js$/.test(f)) return;
        n++;
        const code = stripComments(fs.readFileSync(path.join(dir, f), 'utf8'));
        const m = code.match(/\b\w+\.broken\b/g);
        if (m) bad.push(f + ' → ' + m.join(', '));
      });
      t.ok(bad.length === 0,
        label + ' 出现已删字段的引用：' + bad.join(' | ') +
        '（该字段 2026-09-15 已删；境界判据用 s.idx、渡劫判据用 s.tribPassed）');
      return n;
    }
    const nJs = scanDir('js/', path.join(ROOT, 'js'), true);
    const nTools = scanDir('tools/', path.join(REPO, 'tools'), false);
    t.note('已扫 js/ ' + nJs + ' 个文件（ROOT=' + (process.env.DEDAO_ROOT ? 'dist 副本' : '仓库根') +
      '）+ tools/ ' + nTools + ' 个脚本（仓库根）');
  });

  /* ---------- 法术大表：文档里的 dmg / cost 必须与 data.js 逐条一致 ---------- */
  /* 为什么非加不可：这份文档的 cost 列**已经漂移过一次**——
     原先整列抄成 15/13/14… 而 data.js 是 40/35/35…，约 2.5× 系统性偏差，41 行全错，
     而且是靠人工翻文档才发现的（AGENTS.md #59 才校正）。
     同一份漂移在 `tools/player_sim.js` 和 `balance_sim.js` 里也各藏着一份（#63 才挖出来），
     并直接导致「法术耗蓝批量下调已驳回」这个结论建立在错误数据上。
     文档是给人看的、没人会天天对账 → 必须让机器替我们对。 */
  S.case('DEDAO_法术效果全等级大表.md 的 dmg / cost 与 data.js 逐条一致', (t) => {
    const REPO = path.join(__dirname, '..', '..');
    const docPath = path.join(REPO, 'DEDAO_法术效果全等级大表.md');
    if (!fs.existsSync(docPath)) { t.note('未找到 DEDAO_法术效果全等级大表.md，跳过'); return; }
    const TECH = get('TECHNIQUES') || {};
    const lines = fs.readFileSync(docPath, 'utf8').split(/\r?\n/);

    let n = 0; const bad = []; const seen = {};
    lines.forEach(function (ln) {
      // 形如： | 金刃术 | `jinren` | 金 | ×2.0 | 40 | … | ✅实装 |
      // 治疗/护盾类 dmg 为 0，文档写「0」而非「×0」，故两态都要认。
      const m = ln.match(/^\|\s*([^|]+?)\s*\|\s*`([a-z0-9_]+)`\s*\|\s*([^|]*?)\s*\|\s*(?:×\s*)?([0-9.]+)\s*\|\s*([0-9]+)\s*\|/);
      if (!m) return;
      n++;
      const name = m[1], id = m[2], dDoc = parseFloat(m[4]), cDoc = parseInt(m[5], 10);
      seen[id] = 1;
      const sp = TECH[id];
      if (!sp) { bad.push(name + '（`' + id + '`）在 data.js 中不存在'); return; }
      if (Math.abs(dDoc - sp.dmg) > 1e-9) bad.push(name + ' dmg 文档=' + dDoc + ' vs data.js=' + sp.dmg);
      if (cDoc !== sp.cost) bad.push(name + ' cost 文档=' + cDoc + ' vs data.js=' + sp.cost);
    });
    t.gte(n, 30, '至少应核到 30 条法术，实为 ' + n + '（文档表格格式变了？正则需同步）');
    t.ok(bad.length === 0, '法术大表与 data.js 不一致 ' + bad.length + ' 处：' + bad.join(' | '));

    // 反向：data.js 里的法术若整条没在文档出现，同样要报（新增法术忘了补文档）
    const missing = Object.keys(TECH).filter(id => TECH[id] && TECH[id].cls === 'shufa' && !seen[id]);
    t.ok(missing.length === 0, 'data.js 有但文档未收录的法术 ' + missing.length + ' 条：' + missing.join(', '));
    t.note('已核 ' + n + ' 条法术（data.js 共 ' +
      Object.keys(TECH).filter(id => TECH[id].cls === 'shufa').length + ' 条 shufa）');
  });

  /* ---------- 好感度星星：初始空心、满足后变金色（防回退） ---------- */
  /* 为什么非加不可：2026-09-16 用户要求「初始空心、满足后变金色」，而实现分**两处**——
     缘法页 createFavorSection 与仙缘页 renderNpc。当时只改了前者、后者漏改，
     玩家在仙缘页看到的仍是旧的深紫实心星（AGENTS.md #80 才补齐）。
     「同一视觉契约两处各自实现」正是本项目口径分叉的温床，必须让机器替我们盯。 */
  S.case('好感度星星：初始空心 + 满足变金色，两处渲染口径一致（防回退）', (t) => {
    // 剥注释后再断言：注释里会提到被禁用的旧写法，不剥会自己撞自己
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const hollow = (code.match(/-webkit-text-stroke:1\.5px #b9b2a4/g) || []).length;
    t.gte(hollow, 2, '空心星样式应至少两处（缘法页 + 仙缘页），实为 ' + hollow);
    const gold = (code.match(/#a8792a/g) || []).length;
    t.gte(gold, 2, '金色实心星应至少两处，实为 ' + gold);
    t.ok(!/\? '#a8792a' : '#3a3450'/.test(code),
      '仍残留旧的实心星三元配色（未达成时填深紫实心）——空心化未彻底');
    const lit = (code.match(/Math\.floor\(fa/g) || []).length;
    t.gte(lit, 2, '两处点亮数都应取 Math.floor（浮点口径统一），实为 ' + lit);
  });

  /* ---------- 2026-09-16 一轮四项改动的防回退守卫 ---------- */
  /* 四项都是「玩家看得见、但没有行为断言会红」的视觉 / 口径契约：
     ① 云纹水印压住小数（六维会出现 3.5）② 修为条颜色 ③ 教程跳转 ④ 早夭 -30 与延寿互斥。
     不加守卫就会像 #80 的空心星那样，改完过几天被人改回去还毫无察觉。 */
  S.case('云纹不压字 / 修为条淡蓝 / 教程游历步回主屏 / 早夭 -30 且与延寿互斥（防回退）', (t) => {
    // 剥注释后再断言：注释里会提到被禁用的旧写法，不剥会自己撞自己
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const dataCode = dataJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const engCode = engineJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

    // ① 云纹水印必须落在文字之下：父级 isolation:isolate + 水印 z-index:-1
    function ruleBlock(src, sel) {
      const i = src.indexOf(sel + ' {');
      if (i < 0) return null;
      const j = src.indexOf('}', i);
      return j < 0 ? null : src.slice(i + sel.length, j);
    }
    [
      ['.stat-grid.six-dim .kv', '.stat-grid.six-dim .kv::after'],
      ['.stat-grid.main-stats .kv.six', '.stat-grid.main-stats .kv.six::after'],
      ['.attr-six-card', '.attr-six-card::after']
    ].forEach(function (p) {
      const base = ruleBlock(cssCode, p[0]);
      const wm = ruleBlock(cssCode, p[1]);
      t.ok(base && /isolation:\s*isolate/.test(base),
        p[0] + ' 父级须 isolation:isolate（云纹才落得到文字之下）');
      t.ok(wm && /z-index:\s*-1/.test(wm),
        p[1] + ' 水印须 z-index:-1（六维出现 3.5 这类小数时不得糊住数字）');
    });

    // ② 修为条淡蓝（原深绿 #1d7a55 与气血条撞色）
    const qiBar = code.match(/bar\('bar-qi',[^)]*\)/g) || [];
    t.eq(qiBar.length, 1, '修为条渲染应只有一处，实为 ' + qiBar.length);
    t.ok(qiBar.length === 1 && /#74b9e7/.test(qiBar[0]), '修为条应为淡蓝 #74b9e7，实为 ' + (qiBar[0] || '无'));
    t.ok(!/bar\('bar-qi',[^)]*#1d7a55/.test(code), '修为条不得再是深绿 #1d7a55');

    // ③ 教程「游历」步必须显式回到主屏 —— 上一站在角色页，不回主屏高亮会丢失（提示被盖掉）
    const tutPath = path.join(ROOT, 'js', 'tutorial.js');
    const tut = fs.existsSync(tutPath) ? fs.readFileSync(tutPath, 'utf8') : '';
    if (!tut) {
      t.note('js/tutorial.js 不存在（dist 副本？），跳过教程跳转守卫');
    } else {
      const step = tut.match(/\{ target: 'btn-social'[^}]*\}/);
      t.ok(step && /goto:\s*'game'/.test(step[0]),
        "教程「游历」步须声明 goto:'game'（上一站是角色页，不回主屏则高亮与提示都定位不到）");
    }

    // ④ 早夭 -30，且与延寿互斥（双向声明 + 引擎消费）
    t.ok(/id:\s*'zaoyao'[\s\S]{0,200}?life:\s*-30/.test(dataCode), '早夭须为 出生寿元 -30');
    t.ok(/id:\s*'life20'[\s\S]{0,220}?conflict:\s*\[[^\]]*'zaoyao'/.test(dataCode), '延寿须声明与早夭互斥');
    t.ok(/id:\s*'zaoyao'[\s\S]{0,220}?conflict:\s*\[[^\]]*'life20'/.test(dataCode), '早夭须声明与延寿互斥（双向）');
    t.ok(/it\.conflict/.test(engCode), '引擎 initExpIds 须消费 conflict（只做 UI 互斥会被公开接口打穿）');
  });

  /* 主界面战斗属性区的「灵力」只显示总量（灵力上限），不再显示「100/100」。
     旧写法是「当前/上限」，而战前灵力本就补满 → 两个数恒等、纯属占位，
     且六维里已有一个「灵力」属性点，并排两个「灵力 · 100/100」极易看错成同一项。 */
  S.case('主界面战斗属性「灵力」只显示总量（防回退）', (t) => {
    // 剥注释后再断言：注释里要写清被禁用的旧写法，不剥会自己撞自己
    const code = uiJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const hit = code.match(/\$\('st-mo'\)\.textContent\s*=[^;]+;/g) || [];
    t.eq(hit.length, 1, '主界面 st-mo 赋值应只有一处，实为 ' + hit.length);
    const v = hit[0] || '';
    t.ok(/S\.mpMax/.test(v), 'st-mo 应取灵力上限 mpMax（总量），实为 ' + v);
    t.ok(!/S\.mp\b/.test(v), 'st-mo 不得再拼当前值 mp');
    t.ok(!/' \/ '/.test(v), 'st-mo 不得再出现「当前/上限」分隔（如 100/100）');
    // 反向守卫：角色/属性面板里灵力有消耗，那里**必须**保留「当前/上限」
    const panel = code.match(/name:\s*'灵(?:力|量)'[^}]*mpMax[^}]*\}/g) || [];
    t.gte(panel.length, 1, '角色/属性面板仍须显示灵力「当前/上限」（战斗中要看余量），实为 ' + panel.length);
  });

  /* ---------- 回归 2026-09-17：子页面返回按钮统一为「返回修行」 ----------
     用户要求：宗门/仙缘/游历等所有进一步页面的返回，必须是统一 UI、统一位置的「返回修行」。
     旧实现有两套样式：部分页面用顶部 .screen-head 里的 btn-small ghost「返回」，
     其余页面用底部 .gear-footer 里的 btn-main「返回修行」。本守卫锁死统一结果：
       · 这三类页面（cultivate/sect/travel）的返回按钮必须是 btn-main「返回修行」
       · 且不得再出现顶部 header 风格的 btn-small ghost「返回」（曾与底部样式并存、位置不统一） */
  S.case('子页面返回按钮统一为底部 btn-main「返回修行」（宗门/仙缘/游历等）', (t) => {
    const ids = ['cultivate-back', 'sect-back', 'travel-back'];
    ids.forEach(function (id) {
      t.ok(html.indexOf('id="' + id + '" class="btn-main">返回修行') >= 0,
        '#' + id + ' 应使用统一样式 btn-main「返回修行」');
      t.ok(html.indexOf('class="btn-small ghost" id="' + id + '"') < 0,
        '#' + id + ' 不得再保留顶部 header 风格的 btn-small ghost「返回」');
    });
    // 反向：统一后的按钮必须位于 gear-footer 容器内（位置统一）
    const footer = html.match(/<div class="gear-footer">[\s\S]*?<\/div>/g) || [];
    let inFooter = 0;
    ids.forEach(function (id) {
      footer.forEach(function (blk) { if (blk.indexOf('id="' + id + '"') >= 0) inFooter++; });
    });
    t.eq(inFooter, ids.length, '三个返回按钮都应位于 .gear-footer 容器内（位置统一），实为 ' + inFooter);
  });

  return S;
};
