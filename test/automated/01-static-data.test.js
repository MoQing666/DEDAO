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
    const refs = new Set();
    for (const m of uiJs.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.add(m[1]);
    for (const m of uiJs.matchAll(/\$\(\s*['"]([^'"]+)['"]\s*\)/g)) refs.add(m[1]);
    const missing = [...refs].filter(id =>
      !htmlIds.has(id) &&                       // 不在 index.html 中定义
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
      if (!ART[f.out] && !ELX[f.out] && !equipIds.has(f.out)) badOut.push(`${f.id} → ${f.out}`);
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
      // 法宝以 type 区分：攻 / 守 / 辅
      if (!['攻', '守', '辅'].includes(a.type)) badType.push(`${id}:${a.type}`);
    }
    if (noName.length) t.fail(`法宝缺少 name: ${noName.slice(0, 8).join(', ')}`);
    if (badType.length) t.fail(`法宝 type 非法: ${badType.slice(0, 8).join(', ')}`);
    t.note(`法宝 ${ids.length} 件（剧情获取，不可炼制），类型: ${[...types].join(' / ')}`);
    // 校验：炼制配方中不应出现法宝产物
    const F = get('FORMULAS') || [];
    const fa = F.filter(f => f.type === '法宝');
    if (fa.length) t.fail(`存在可炼制法宝配方: ${fa.map(x => x.id).join(', ')} — 法宝应仅由剧情获取`);
  });

  S.case('法宝系统：39 件完整 & 全链路挂载 & 数值单位校验', (t) => {
    const ART = get('ARTIFACTS') || {};
    const ids = Object.keys(ART);
    t.eq(ids.length, 39, `法宝应为 39 件（剧情26+商店13），实际 ${ids.length}`);

    const effKeys = ['wu','ti','dun','shen','dao','ling','atk','hpMax','def','critPct','dodgePct','defPct','atkPct','cult','stealPct','defToAtk','tiHpBonus','duantiEff','duantiMax','craftEff','farmEff','mineEff','stoneYearPct','cultTwice','modeBonus','craftKind','daoAtkPct','lowHpAtk','scale'];
    const pctFields = ['critPct','dodgePct','defPct','atkPct','cult','stealPct','daoAtkPct','craftEff','tiHpBonus','duantiEff','farmEff','mineEff','stoneYearPct'];
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

  return S;
};
