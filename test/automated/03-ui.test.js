/* DEDAO 自动化测试 —— 03 UI / DOM 层（jsdom 真实渲染）
 */
const fs = require('fs');
const path = require('path');
// 解析 jsdom：优先环境变量，其次隔离工作区，最后全局
let JSDOM, VirtualConsole, ResourceLoader;
(function () {
  const base = process.env.USERPROFILE || path.join('C:', 'Users', process.env.USERNAME || '');
  const candidates = [
    process.env.JSDOM_PATH,
    path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules', 'jsdom'),
    'jsdom',
  ].filter(Boolean);
  if (fs.existsSync(path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules'))) {
    module.paths.push(path.join(base, '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules'));
  }
  for (const c of candidates) {
    try { ({ JSDOM, VirtualConsole, ResourceLoader } = require(c)); return; } catch (e) { /* 继续尝试 */ }
  }
})();
const { ROOT, Suite } = require('./_harness');

/* 把 http://localhost/xxx 映射到本地文件，绕开 jsdom 无法从 http 取资源的问题 */
class LocalResourceLoader extends (ResourceLoader || Object) {
  fetch(url, options) {
    try {
      const u = new URL(url);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const p = path.join(ROOT, decodeURIComponent(u.pathname).replace(/^\//, ''));
        if (fs.existsSync(p)) return Promise.resolve(fs.readFileSync(p));
        return Promise.reject(new Error('本地资源不存在: ' + p));
      }
    } catch (e) { /* 非 URL，交给默认逻辑 */ }
    return super.fetch ? super.fetch(url, options) : Promise.reject(new Error('无法加载 ' + url));
  }
}

/* 把外链资源内联进 HTML：jsdom 无法从 http:// 取本地文件，
   内联后既不依赖网络，也能保留 http:// 源以便使用 localStorage。 */
function inlineAssets(html) {
  let out = html;
  out = out.replace(/<script[^>]*\ssrc="([^"]+)"[^>]*>\s*<\/script>/gi, (m, src) => {
    const p = path.join(ROOT, src.split('?')[0].replace(/^\.?\//, ''));
    if (!fs.existsSync(p)) return `<!-- 缺失脚本 ${src} -->`;
    return '<script>' + fs.readFileSync(p, 'utf8') + '<\/script>';
  });
  out = out.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi, (m, href) => {
    const p = path.join(ROOT, href.split('?')[0].replace(/^\.?\//, ''));
    if (!fs.existsSync(p)) return `<!-- 缺失样式 ${href} -->`;
    return '<style>' + fs.readFileSync(p, 'utf8') + '</style>';
  });
  return out;
}



/* 推进章节叙事层：开局后会连续弹出剧情，需点击“继续”才会进入主界面 */
async function advanceChapters(win, doc, max = 20) {
  for (let i = 0; i < max; i++) {
    if (visible(doc, 'screen-game') === true) return i;
    click(win, 'chapter-actions');
    await new Promise(r => setTimeout(r, 150));
  }
  return -1;
}

/* 统一的进入游戏流程：标题页 →（进入页）→ 章节 → 主界面 */
async function enterGame(win, doc, name) {
  click(win, 't-new');
  await new Promise(r => setTimeout(r, 180));
  if (visible(doc, 'screen-enter') === true) {
    const input = doc.getElementById('enter-name-input');
    if (input) { input.value = name; input.dispatchEvent(new win.Event('input', { bubbles: true })); }
    const pool = doc.getElementById('enter-destiny-pool');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    }
    await new Promise(r => setTimeout(r, 60));
    click(win, 'enter-start');
  } else {
    const input = doc.getElementById('name-input');
    if (input && !input.value) input.value = name;
    click(win, 'name-ok');
  }
  await new Promise(r => setTimeout(r, 250));
  // P1 开荒页：玩家自选灵根 / 出身后落定命数，再进入章节 → 主界面
  if (visible(doc, 'screen-create') === true) {
    const firstLg = doc.querySelector('#create-body [data-lg]');
    if (firstLg) firstLg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    const firstBg = doc.querySelector('#create-body [data-bg]');
    if (firstBg) firstBg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    // 开荒页分两步：先点「预览命数 · 下一页」进入总览页，再落定命数
    const nx = doc.getElementById('ct-next');
    if (nx && !nx.disabled) nx.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const cf = doc.getElementById('ct-confirm');
    if (cf && !cf.disabled) cf.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
  }
  await advanceChapters(win, doc);
  await new Promise(r => setTimeout(r, 200));
}

/* 续一份「第 3 年」存档进入游戏（秘境已解锁）。秘境相关用例从第 3 年起验证机制，
   避免触碰「第 1~2 年秘境未解锁」的新手引导分期规则。 */
async function bootYear3() {
  const raw = await battleSave();
  const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
  click(win, 't-continue');
  await new Promise(r => setTimeout(r, 220));
  await advanceChapters(win, doc);
  await new Promise(r => setTimeout(r, 180));
  return { win, doc, errors };
}

async function boot(opts = {}) {
  const htmlPath = path.join(ROOT, 'index.html');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  vc.on('warn', () => {});
  vc.on('log', () => {});
  vc.on('info', () => {});

  const html = inlineAssets(fs.readFileSync(htmlPath, 'utf8'));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    virtualConsole: vc,
    beforeParse(win) {
      win.localStorage.clear();
      // 允许预置 localStorage（用于「中途退出后重新开机」这类跨会话场景）
      if (opts.seed) {
        Object.keys(opts.seed).forEach(function (k) {
          if (opts.seed[k] != null) win.localStorage.setItem(k, opts.seed[k]);
        });
      }
      win.alert = () => {};
      win.confirm = () => true;
      win.prompt = () => '自动化测试';
      win.HTMLMediaElement.prototype.play = () => Promise.resolve();
      win.HTMLMediaElement.prototype.pause = () => {};
      win.matchMedia = win.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    },
  });
  await new Promise(r => setTimeout(r, opts.wait || 350));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}

function click(win, id) {
  const el = win.document.getElementById(id);
  if (!el) return false;
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
  return true;
}
const visible = (doc, id) => {
  const el = doc.getElementById(id);
  if (!el) return null;
  const st = el.getAttribute('style') || '';
  if (/display:\s*none/.test(st)) return false;
  return true;
};
/* 轮询等待：UI 刷新依赖 setTimeout / 动画回调，固定等待在慢机器上会假红。
   用法：await waitUntil(() => cond, 1500) */
async function waitUntil(fn, ms = 1500, step = 40) {
  const t0 = Date.now();
  for (;;) {
    let v = false;
    try { v = !!fn(); } catch (e) { /* 中途 DOM 未就绪，继续等 */ }
    if (v) return true;
    if (Date.now() - t0 >= ms) return false;
    await new Promise(r => setTimeout(r, step));
  }
}

/* ============================================================
   战斗状态徽章「端到端」用例的共用前置（2026-09-15 新增）
   徽章只在战斗覆盖层渲染，而战斗层只能由秘境的战斗节点（或渡劫/主线）进入；
   秘境地图**不能**用存档续（读档时 ui.js 会把 running 的 adv 置为 done），
   所以必须在同一次会话里「进秘境 → 点战斗节点」。下面这组 helper 走通该链路。
   ============================================================ */

/* 取一份「学会了 玄阶·岩甲术 / 黄阶·火球术 且灵力够放」的存档，供后续 boot 直接续档。
   只生成一次（jsdom 启动昂贵），后续用例复用同一个 Promise。 */
let _battleSaveP = null;
function battleSave() {
  if (_battleSaveP) return _battleSaveP;
  _battleSaveP = (async () => {
    const a = await boot();
    await enterGame(a.win, a.doc, '徽章');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) throw new Error('未取得存档');
    // techEquip.shufa 会被 ensureTechEquip 按 s.techs 过滤，故两边都要写
    raw.techs = (raw.techs || []).concat(['yanjia', 'huoqiu']).filter((v, i, arr) => arr.indexOf(v) === i);
    raw.techEquip = Object.assign({}, raw.techEquip, { shufa: ['yanjia', 'huoqiu'] });
    raw.ling = 15;   // 灵力 15 → mpMax ≈ 300，够放「岩甲术 50 灵 + 火球术 35 灵」
    raw.mp = 300;
    raw.year = 3;    // 秘境第 3 年起解锁（新手引导分期规则），秘境相关用例统一在此年份续档
    return raw;
  })();
  return _battleSaveP;
}

/* 固定随机源（LCG）。秘境首层节点类型由 shuffle 决定，有约三成概率抽不到战斗节点；
   在点「入秘境」之前替换 win.Math.random，即可让首层稳定含 combat（启动顺序无关）。 */
function seedRng(win, seed) {
  let s = seed >>> 0;
  win.Math.random = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* 续档 → 进秘境 → 点首层战斗节点 → 返回战斗层上下文（失败时返回 { err }） */
async function enterAdvBattle(seed) {
  const raw = await battleSave();
  const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
  click(win, 't-continue');
  await new Promise(r => setTimeout(r, 220));
  await advanceChapters(win, doc);
  await new Promise(r => setTimeout(r, 180));

  click(win, 'btn-explore');
  await new Promise(r => setTimeout(r, 220));
  if (visible(doc, 'modal') !== true) return { err: '秘境选择弹窗未出现' };
  seedRng(win, seed);
  const enter = [...doc.querySelectorAll('#modal-body .btn-main')].find(b => /入秘境/.test(b.textContent));
  if (!enter) return { err: '未找到「入秘境」按钮' };
  enter.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
  await new Promise(r => setTimeout(r, 280));
  // 秘境开场章节 → 连点继续，直到地图出现可选节点
  for (let i = 0; i < 12; i++) {
    if (doc.querySelectorAll('#adv-map .adv-node.selectable').length) break;
    click(win, 'chapter-actions');
    await new Promise(r => setTimeout(r, 150));
  }
  await new Promise(r => setTimeout(r, 220));
  const combat = [...doc.querySelectorAll('#adv-map .adv-node.selectable')].find(n => n.classList.contains('combat'));
  if (!combat) return { err: '秘境首层未抽到战斗节点' };
  combat.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
  await new Promise(r => setTimeout(r, 400));
  if (visible(doc, 'battle') !== true) return { err: '未进入战斗层' };
  return { win, doc, errors };
}

/* 打开法术栏并施放指定法术。法术栏只在点「法术」时才渲染，故每次都要先点开。 */
async function castSpell(win, doc, nameRe) {
  click(win, 'b-spell');
  await new Promise(r => setTimeout(r, 200));
  const btn = [...doc.querySelectorAll('#b-spellbar .btn-small')].find(b => nameRe.test(b.textContent));
  if (!btn || btn.disabled) return false;
  btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
  await new Promise(r => setTimeout(r, 350));
  return true;
}
const badges = (doc, id) => [...doc.querySelectorAll('#' + id + ' .buff')];

module.exports = async function build() {
  const S = new Suite('03 UI / DOM 层（jsdom）');

  S.case('页面可加载且核心脚本无报错', async (t) => {
    const { win, errors } = await boot();
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    t.note(`加载期消息 ${errors.length} 条（已过滤无关项后 ${real.length} 条）`);
    if (real.length) t.fail('加载期报错: ' + real.slice(0, 4).join(' ;; '));
    // 顶层 const 声明不会成为 window 属性，需在脚本作用域内求值
    t.eq(win.eval('typeof Engine'), 'object', 'Engine 未在全局作用域中定义');
    t.ok(!!win.document.getElementById('screen-title'), '标题页缺失');
  });

  S.case('标题页可见且主按钮齐备', async (t) => {
    const { doc } = await boot();
    t.eq(visible(doc, 'screen-title'), true, '标题页应可见');
    for (const id of ['t-new', 't-continue', 't-load', 't-rebirth', 't-settings']) {
      t.ok(!!doc.getElementById(id), `标题页缺少按钮 #${id}`);
    }
    // 2026-09-14：成就/图鉴 已「挪」到主页面（成就→HUD 设置上方、图鉴→底部栏），标题页不再有
    for (const id of ['btn-ach-title', 'btn-codex-title']) {
      t.ok(!doc.querySelector('.title-util-row #' + id), `#${id} 应已从标题页迁走`);
    }
  });

  S.case('走通开局流程：开始轮回 → 起名 → 进入主界面', async (t) => {
    const { win, doc, errors } = await boot();
    t.ok(click(win, 't-new'), '点击“开始轮回”失败');
    await new Promise(r => setTimeout(r, 200));
    // 新版开局走 screen-enter（进入页面）：起名 → 选命格 → 开始这一世
    const useEnter = visible(doc, 'screen-enter') === true;
    if (useEnter) {
      const input = doc.getElementById('enter-name-input');
      t.ok(!!input, '进入页缺少名字输入框');
      if (input) { input.value = '测试道人'; input.dispatchEvent(new win.Event('input', { bubbles: true })); }
      const pool = doc.getElementById('enter-destiny-pool');
      if (pool && pool.children.length) {
        pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      }
      t.note(`命格候选项 ${pool ? pool.children.length : 0} 个`);
      await new Promise(r => setTimeout(r, 80));
      t.ok(click(win, 'enter-start'), '点击“开始这一世”失败');
      // P1 开荒页：自选灵根 / 出身后落定命数，再进入章节 → 主界面
      if (visible(doc, 'screen-create') === true) {
        const firstLg = doc.querySelector('#create-body [data-lg]');
        if (firstLg) firstLg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        const firstBg = doc.querySelector('#create-body [data-bg]');
        if (firstBg) firstBg.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 150));
        const nx = doc.getElementById('ct-next');
        if (nx && !nx.disabled) nx.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 150));
        const cf = doc.getElementById('ct-confirm');
        if (cf && !cf.disabled) cf.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 200));
      }
      const steps = await advanceChapters(win, doc);
      t.note();
    } else {
      const input = doc.getElementById('name-input');
      if (input && !input.value) input.value = '测试道人';
      click(win, 'name-ok');
    }
    await new Promise(r => setTimeout(r, 350));
    t.eq(visible(doc, 'screen-game'), true, '未进入游戏主界面');
    const nameEl = doc.getElementById('h-name');
    t.ok(!!nameEl && nameEl.textContent.length > 0, 'HUD 未显示角色名');
    t.note(`角色名: ${nameEl ? nameEl.textContent : '(空)'}，HUD 气血: ${doc.getElementById('hp-val') ? doc.getElementById('hp-val').textContent : '?'}`);
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('开局流程报错: ' + real.slice(0, 4).join(' ;; '));
  });

  S.case('主界面行动按钮可点击且不抛错', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '甲');
    // 动态发现行动按钮（不同版本 ID 可能不同）
    let acts = [...doc.querySelectorAll('.act-grid .act, .act-grid button')].map(e => e.id).filter(Boolean);
    if (!acts.length) acts = ['btn-cult', 'btn-explore', 'btn-arts', 'btn-social', 'btn-fate'].filter(id => doc.getElementById(id));
    if (doc.getElementById('btn-break')) acts.push('btn-break');
    t.gt(acts.length, 0, '未发现任何行动按钮');
    for (const id of acts) {
      try { click(win, id); await new Promise(r => setTimeout(r, 40)); }
      catch (e) { t.fail(`点击 #${id} 抛错: ${e.message}`); }
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('行动按钮报错: ' + real.slice(0, 4).join(' ;; '));
    t.note(`已点击 ${acts.length} 个行动按钮`);
  });

  S.case('底部栏与功能弹窗可正常开关', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '乙');
    let bars = [...doc.querySelectorAll('.bottom-bar .bottom-btn')].map(e => e.id).filter(Boolean);
    if (!bars.length) bars = ['btn-bag-bottom', 'btn-char-bottom', 'btn-sect-bottom', 'btn-travel-bottom', 'btn-npc-bottom'].filter(id => doc.getElementById(id));
    t.gt(bars.length, 0, '未发现任何底部按钮');
    for (const id of bars) {
      try {
        click(win, id); await new Promise(r => setTimeout(r, 60));
        click(win, 'modal-close'); await new Promise(r => setTimeout(r, 40));
      } catch (e) { t.fail(`操作 #${id} 抛错: ${e.message}`); }
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('底部栏报错: ' + real.slice(0, 4).join(' ;; '));
    t.note(`已遍历 ${bars.length} 个底部入口`);
  });

  S.case('底部栏 3 项（角色/储物袋/仙缘），成就/图鉴/设置 已上移 HUD 功能列', async (t) => {
    const { win, doc, errors } = await boot();
    const ids = [...doc.querySelectorAll('.bottom-bar .bottom-btn')].map(e => e.id).filter(Boolean);
    // 2026-09-14：设置上移 HUD（3 项）；同日二次定稿把【图鉴】落到底部栏（4 项）；
    // 本次（用户要求「成就和图鉴放回主页面、放在设置附近」）把【图鉴】也上移 HUD，
    // 与【成就】【设置】同簇 → 底部栏回到 3 项。
    t.eq(ids.length, 3, '底部栏应只剩 3 个入口（角色/储物袋/仙缘），实际: ' + ids.join(', '));
    t.ok(!doc.querySelector('.bottom-bar #btn-codex-bottom'), '图鉴不应再出现在底部栏（已上移 HUD）');
    ['btn-ach-bottom', 'btn-omen-bottom', 'btn-settings-bottom'].forEach(function (id) {
      t.ok(!doc.querySelector('.bottom-bar #' + id), id + ' 不应再出现在底部栏');
    });
    // 成就 / 图鉴 / 设置 的新家：HUD 右侧功能列（.hud-side），三者同簇、图鉴夹在成就与设置之间
    const side = doc.querySelector('#screen-game .hud-top .hud-side');
    t.ok(!!side, 'HUD 应有右侧功能列 .hud-side');
    const ach = doc.getElementById('btn-ach-hud');
    const codex = doc.getElementById('btn-codex-hud');
    const set = doc.getElementById('hud-settings');
    t.ok(!!ach, 'HUD 应有成就按钮 #btn-ach-hud');
    t.ok(!!codex, 'HUD 应有图鉴按钮 #btn-codex-hud（设置附近）');
    t.ok(!!set, 'HUD 应有设置按钮 #hud-settings');
    if (side && ach && codex && set) {
      const kids = [...side.children];
      t.ok(kids.indexOf(ach) < kids.indexOf(codex), '成就应排在图鉴之前');
      t.ok(kids.indexOf(codex) < kids.indexOf(set), '图鉴应排在设置之前（两者相邻、同在设置附近）');
    }
    // 标题页已无玉符入口（用户 2026-09-15 要求删除；PC 端仍由右上角 pc-omen 进入）
    t.ok(!doc.querySelector('#btn-omen-title'), '标题页玉符入口应已删除');
    // 主页面行动区不应再挂这排入口
    t.ok(!doc.querySelector('.actions .util-row'), '主页面行动区不应再有资料页入口行');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('资料页入口报错: ' + real.slice(0, 4).join(' ;; '));
  });

  S.case('HUD 成就 / 图鉴 / 设置：局内可点开且返回主界面', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '局内入口');
    t.eq(visible(doc, 'screen-game'), true, '未进入主界面');

    click(win, 'btn-ach-hud');
    await waitUntil(() => visible(doc, 'screen-achievements') === true);
    t.eq(visible(doc, 'screen-achievements'), true, '局内点 HUD「成就」未进入成就页');
    click(win, 'ach-back');
    await waitUntil(() => visible(doc, 'screen-game') === true);
    t.eq(visible(doc, 'screen-game'), true, '从成就返回应回到主界面');

    click(win, 'btn-codex-hud');
    await waitUntil(() => visible(doc, 'screen-codex') === true);
    t.eq(visible(doc, 'screen-codex'), true, 'HUD 点「图鉴」未进入图鉴页');
    click(win, 'codex-back');
    await waitUntil(() => visible(doc, 'screen-game') === true);
    t.eq(visible(doc, 'screen-game'), true, '从图鉴返回应回到主界面');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('局内入口流程报错: ' + real.slice(0, 4).join(' ;; '));
  });

  /* 「仙命」卷是命格（DESTINIES）金阶子集，不是独立收藏集。
     若把它并入总览计数，那 10 条会被算两次（既在「命格 47」内、又在「仙命 10」内）：
     分母虚高 10（274，真实唯一项 264），玩家抽到金阶命格后分子同样重复 +1。 */
  S.case('图鉴计数：分母不得因「仙命卷」重复统计金阶命格', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '图鉴计数');
    click(win, 'btn-codex-hud');
    await waitUntil(() => visible(doc, 'screen-codex') === true);
    t.eq(visible(doc, 'screen-codex'), true, '未进入图鉴页');

    const tabs = [...doc.querySelectorAll('#codex-tabs .codex-tab')];
    t.gt(tabs.length, 0, '图鉴应有分卷按钮');

    const sumTxt = (doc.getElementById('codex-summary') || {}).textContent || '';
    const m = /已发现\s*(\d+)\s*\/\s*(\d+)\s*项/.exec(sumTxt);
    t.ok(!!m, '总览文案应形如「已发现 N / M 项」（实：' + sumTxt + '）');
    if (!m) return;
    const denom = parseInt(m[2], 10);

    // 各卷徽标分母之和 − 「仙命」卷 = 唯一项数
    let perTab = 0, skip = 0;
    tabs.forEach(function (b) {
      const mm = /(\d+)\s*\/\s*(\d+)\s*$/.exec(b.textContent.trim());
      if (!mm) return;
      const n = parseInt(mm[2], 10);
      perTab += n;
      if (/仙命/.test(b.textContent)) skip += n;
    });
    t.eq(skip, 9, '仙命卷应恒为 9 条金阶命格（2026-09-14 删除【杀伐果断】后：10 → 9）');
    t.eq(denom, perTab - skip, '总览分母应等于「各卷之和 − 仙命卷」（仙命是命格子集，不得重复计入）');

    // 仙命卷徽标保留满额：那是「本卷展示条数」，不是收藏进度
    const xm = tabs.filter(function (b) { return /仙命/.test(b.textContent); })[0];
    t.ok(!!xm && /9\s*\/\s*9/.test(xm.textContent), '仙命卷徽标应为 9/9（全展示）');
    t.note('修复前分母虚高 10（题面 274，真实唯一项 264）；删【杀伐果断】后再降 1 → 263');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('图鉴计数流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('局内打开成就，返回仍回主界面（PC 侧栏经隐藏靶点触发）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '丁');
    t.eq(visible(doc, 'screen-game'), true, '未进入主界面');
    // 局内触发同一个 openAchievements（PC 侧栏就是这样 clickBtn 隐藏靶点的）
    click(win, 'btn-ach-hud'); await new Promise(r => setTimeout(r, 220));
    t.eq(visible(doc, 'screen-achievements'), true, '局内点「成就」未进入成就页');
    click(win, 'ach-back'); await new Promise(r => setTimeout(r, 180));
    t.eq(visible(doc, 'screen-game'), true, '从成就返回应回到主界面（而非标题页）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('局内资料页入口报错: ' + real.slice(0, 4).join(' ;; '));
  });

  S.case('轮回塔页面可进入并渲染天赋列表', async (t) => {
    const { win, doc, errors } = await boot();
    click(win, 't-rebirth'); await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-rebirth'), true, '轮回塔未显示');
    const list = doc.getElementById('rb-list');
    t.ok(!!list, '轮回塔列表容器缺失');
    if (list) t.note(`轮回塔条目数: ${list.children.length}`);
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('轮回塔报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('游戏状态可持久化到 localStorage', async (t) => {
    const { win } = await boot();
    await enterGame(win, win.document, '丙');
    const keys = Object.keys(win.localStorage).length
      ? Object.keys(win.localStorage)
      : Array.from({ length: win.localStorage.length }, (_, i) => win.localStorage.key(i));
    t.gt(keys.length, 0, '开局后未写入任何 localStorage 键');
    t.note(`存档键: ${keys.join(', ')}`);
  });

  S.case('自定义弹窗替代原生 confirm（WebView 不阻塞）', async (t) => {
    const { win, doc, errors } = await boot();
    if (!click(win, 't-settings')) { t.fail('找不到 t-settings 入口'); return; }
    await new Promise(r => setTimeout(r, 200));
    const clearBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /清除所有存档/.test(b.textContent));
    if (!clearBtn) { t.fail('设置弹窗中未找到“清除所有存档”按钮'); return; }
    clearBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const ov = doc.getElementById('dialog-overlay');
    t.ok(!!ov, '点击清除存档后未生成自定义弹窗 dialog-overlay（说明仍依赖原生 confirm）');
    if (!ov) return;
    t.eq(ov.style.display, 'flex', '自定义弹窗未显示（display 应为 flex）');
    const card = doc.getElementById('dialog-card');
    t.ok(card && /清除所有存档/.test(card.textContent), '弹窗缺少确认文案');
    const cancel = card && [...card.querySelectorAll('button')].find(b => /取消/.test(b.textContent));
    t.ok(!!cancel, '弹窗缺少“取消”按钮');
    if (cancel) {
      cancel.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 120));
      t.eq(ov.style.display, 'none', '点击取消后弹窗未关闭');
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('弹窗交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('锻体：未解锁时仅给引导，不进页面不耗行动点', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '锻体未解锁');
    const apEl = doc.getElementById('h-actions-left');
    const apBefore = apEl ? apEl.textContent : '';
    t.ok(click(win, 'btn-arts'), 'btn-arts 不存在');
    await new Promise(r => setTimeout(r, 200));
    const bodyText = doc.body.textContent || '';
    t.ok(/未解之法|锻体诀/.test(bodyText), '未解锁应显示锻体引导文案');
    t.eq(visible(doc, 'screen-duanti'), false, '未解锁不应进入锻体页');
    t.eq(apEl ? apEl.textContent : '', apBefore, '未解锁点击不应消耗行动点');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('未解锁锻体报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('锻体：解锁后进入页面，淬炼生效且计入次数', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '锻体解锁');
    // 修改自动存档：解锁《锻体诀》并补足行动点
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!raw, '自动存档不存在');
    if (!raw) return;
    raw.flags = Object.assign({}, raw.flags, { duanti: 1 });
    raw.actionsLeft = 6;
    // jsdom 开局流程可能未选中命格导致 talents/linggen 为空，被 validSave 判为失效档，此处补齐
    if (!raw.talents || !raw.talents.length) raw.talents = ['t_duanti_test'];
    if (!raw.linggen) raw.linggen = { id: 'lg_duanti_test' };
    win.localStorage.setItem('dedao_save', JSON.stringify(raw));
    // 读档：存档弹窗 → 第一行“读档” → 自定义确认
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 150));
    const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
    t.ok(!!loadBtn, '存档弹窗中无可用“读档”按钮');
    if (!loadBtn) return;
    loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
    const card = doc.getElementById('dialog-card');
    const okBtn = card ? [...card.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
    t.ok(!!okBtn, '读档确认弹窗未出现');
    if (!okBtn) return;
    okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // 解锁态按钮文案
    t.eq((doc.getElementById('btn-arts-label') || {}).textContent, '锻体', '解锁后按钮文案应为「锻体」');
    // 进入锻体页（进入不耗行动点）
    const apEl = doc.getElementById('h-actions-left');
    const apEnter = apEl ? apEl.textContent : '';
    click(win, 'btn-arts');
    await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-duanti'), true, '解锁后应进入锻体页');
    t.eq(apEl ? apEl.textContent : '', apEnter, '进入锻体页不应消耗行动点');
    const rows = [...doc.querySelectorAll('#duanti-body .formula-row')];
    t.eq(rows.length, 2, '锻体页应有 2 种淬炼（体魄/遁速；神识由宗门提供，已移除）');
    if (rows.length !== 2) return;
    t.ok(/1 行动点/.test(rows[0].textContent) && /0\.5/.test(rows[0].textContent), '体魄淬炼应为 1点→+0.5');
    t.ok(/1 行动点/.test(rows[1].textContent) && /0\.5/.test(rows[1].textContent), '遁速淬炼应为 1点→+0.5');
    // 淬炼体魄：行动点 -1，计数 1/10
    const firstBtn = rows[0] && rows[0].querySelector('button');
    t.ok(firstBtn && !firstBtn.disabled, '淬炼按钮应可用');
    firstBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const rows2 = [...doc.querySelectorAll('#duanti-body .formula-row')];
    t.ok(/已淬 1\/10/.test(rows2[0].textContent), '淬炼后应显示 已淬 1/10');
    t.eq(apEl ? apEl.textContent : '', String(Number(apEnter) - 1), '淬炼体魄应消耗 1 行动点');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('锻体页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：法宝页未持有时必须展示「空的法宝槽」（曾用一句提示顶掉整个面板，且文案误指「装备」页） ===
  S.case('法宝页：未持有时渲染空的法宝槽，文案不再指向「装备」页', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '法宝空槽');
    t.ok(click(win, 'btn-char-bottom'), 'btn-char-bottom 不存在');
    await new Promise(r => setTimeout(r, 180));
    t.eq(visible(doc, 'screen-char'), true, '应进入角色页');
    const tab = doc.querySelector('.char-tab[data-tab="treasure"]');
    t.ok(!!tab, '法宝分页按钮不存在');
    if (!tab) return;
    tab.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 80));
    const box = doc.getElementById('char-treasure-slots');
    t.ok(!!box, 'char-treasure-slots 容器不存在');
    if (!box) return;
    const text = box.textContent || '';
    t.ok(/法宝栏\s*0\s*\/\s*\d+\s*已用/.test(text), '应显示「法宝栏 0 / N 已用」（实际：' + text.slice(0, 60) + '）');
    const slots = [...box.querySelectorAll('.treasure-slot')];
    const empty = slots.filter(c => /空栏位/.test(c.textContent));
    t.gte(empty.length, 3, '炼气期至少应渲染 3 个「空栏位」（实际 ' + empty.length + '）');
    t.ok(!/「装备」页/.test(text), '法宝页不应再出现「法宝需于『装备』页穿戴」这类错误引导');
    t.ok(/尚未获得/.test(text), '应有一句「尚未获得法宝」的说明');
    const real2 = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real2.length) t.fail('法宝页渲染报错: ' + real2.slice(0, 3).join(' ;; '));
  });

  // === 回归：秘境入口不再卡死（章节层 z-index 修复 + 背景切换） ===
  S.case('秘境入口：章节层正常显示且背景切换到秘境图', async (t) => {
    const { win, doc, errors } = await bootYear3();
    // 点秘境打开选择弹窗
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 150));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '秘境选择弹窗应出现「入秘境 / 深探」按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // 不再有整备弹窗：选完行动点直接进秘境（携带丹药机制已删除）
    const prepBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /空手进入|携带丹药/.test(b.textContent));
    t.ok(!prepBtn, '整备弹窗应已删除（不应再出现携带丹药页）');
    // 关键回归点：章节层应可见且位于主界面之上
    const chap = doc.getElementById('chapter');
    t.ok(chap && chap.style.display !== 'none', '章节层应在秘境入口后可见（修复 z-index 后不再卡死）');
    t.ok(chap && chap.classList.contains('explore-mode'), '章节层应带 explore-mode 类');
    t.ok(doc.getElementById('screen-game').classList.contains('explore-active'), '主界面应带 explore-active 类');
    // 章节层有交互按钮（继续 / 后续选择）
    t.ok(!!doc.getElementById('chapter-actions'), '章节层应提供「继续」交互按钮');
    // 章节层背景已切换为秘境图（不再是洞府）
    const chapBg = chap ? (chap.style.background || chap.getAttribute('style') || '') : '';
    t.ok(/mijing/.test(chapBg), '章节层背景应切换到秘境图（包含 mijing 关键字）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('秘境入口交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // 回归：秘境地图必须做成「杀戮尖塔式」——canvas 绝对定位节点 + SVG 连线 + 多条真实可选路线。
  // 历史 bug：每层只连 1 条相邻边，玩家经常「只有一条路可走」，选了等于没选。
  S.case('秘境地图：SVG 连线 + ≥2 条真实可选路线（杀戮尖塔式）', async (t) => {
    const { win, doc, errors } = await bootYear3();
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 160));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '未找到秘境入口按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 300));
    // 关键回归：不再有「携带丹药」整备页，点完行动点直接进秘境
    const prepLeft = [...doc.querySelectorAll('#modal-body button')].find(b => /空手进入|携带丹药/.test(b.textContent));
    t.ok(!prepLeft, '不应再出现「携带丹药」整备页（已删除）');
    // 点掉入口引导章节，直到秘境地图层出现
    const advOv = doc.getElementById('adv-screen');
    for (let i = 0; i < 25; i++) {
      if (advOv && advOv.style.display === 'flex') break;
      const chap = doc.getElementById('chapter');
      let btn = null;
      if (chap && chap.style.display !== 'none') btn = [...chap.querySelectorAll('button')].filter(b => !b.disabled)[0];
      if (!btn) {
        const mb = doc.getElementById('modal-body');
        if (mb) btn = [...mb.querySelectorAll('button')].filter(b => !b.disabled)[0];
      }
      if (!btn) break;
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
    }
    t.eq(advOv.style.display, 'flex', '秘境地图层应已打开');
    const mapEl = doc.getElementById('adv-map');
    t.ok(!!mapEl.querySelector('.adv-canvas'), '地图应渲染为 canvas 容器（不再是 .adv-col 竖列）');
    const paths = [...mapEl.querySelectorAll('svg.adv-links path')];
    t.gte(paths.length, 100, 'SVG 连线数量过少：' + paths.length + '（50 层地图应上百条）');
    t.gte(mapEl.querySelectorAll('.adv-node').length, 100, '地图节点数量过少：' + mapEl.querySelectorAll('.adv-node').length);
    t.eq(mapEl.querySelectorAll('.adv-node.current').length, 1, '应有且仅有 1 个当前节点');
    t.gte(mapEl.querySelectorAll('.adv-node.selectable').length, 2, '当前节点应有 ≥2 条真实可选路线（不再是独木桥）');
    t.eq(mapEl.querySelectorAll('.adv-node.boss').length, 1, '地图应始终渲染出 Boss 节点');
    t.eq(mapEl.querySelectorAll('.adv-node.boss.locked').length, 1, '探索度未满时 Boss 应处于锁定态');
    // —— 几何回归：连线必须只走「层间空隙」，不得压在选项块上 ——
    // 节点高 56px、行距 88px，故一条正常连线的纵向跨度 = 88 − 56 = 32px。
    let longLink = 0, maxSpan = 0;
    paths.forEach((p) => {
      if (/reveal/.test(p.getAttribute('class') || '')) return; // 血色虚线允许跨行
      const nums = (p.getAttribute('d') || '').match(/-?\d+(\.\d+)?/g);
      if (!nums || nums.length < 8) return;
      const span = Math.abs(Number(nums[1]) - Number(nums[nums.length - 1]));
      maxSpan = Math.max(maxSpan, span);
      if (span > 34) longLink++;
    });
    t.eq(longLink, 0, '存在压在选项块上的连线（' + longLink + ' 条，最长跨度 ' + maxSpan + 'px；正常应 ≤32px）');
    // 每行 3 个选项：同一 top 值的节点不超过 3 个
    const tops = {};
    [...mapEl.querySelectorAll('.adv-node')].forEach((n) => {
      const m = /top:\s*(-?\d+(?:\.\d+)?)px/.exec(n.getAttribute('style') || '');
      if (m) tops[m[1]] = (tops[m[1]] || 0) + 1;
    });
    const maxPerRow = Object.keys(tops).reduce((a, k) => Math.max(a, tops[k]), 0);
    t.lte(maxPerRow, 3, '同一层出现 ' + maxPerRow + ' 个节点（应为每行 3 个）');
    // HUD：实时气血 / 灵力条已就位（替代原「说明」按钮的位置）
    t.ok(!!doc.getElementById('adv-hp-bar') && !!doc.getElementById('adv-mp-bar'), '秘境 HUD 应显示实时气血 / 灵力条');
    // 手游版 HUD：行动 / 灵石在六维右侧网格内（不再挤在 header 与名字同一行）
    const kv = [...doc.querySelectorAll('#screen-game .stats .stat-grid.main-stats .kv')];
    const actKv = kv.find(k => /行动/.test(k.textContent) && k.querySelector('#h-actions-left'));
    const stoneKv = kv.find(k => /灵石/.test(k.textContent) && k.querySelector('#h-stone'));
    t.ok(!!actKv, 'HUD 应含「行动」资源块（#h-actions-left）');
    t.ok(!!stoneKv, 'HUD 应含「灵石」资源块（#h-stone）');
    t.ok(!doc.querySelector('#screen-game .hud-actions'), 'header 内不应再有 .hud-actions（已移至六维右侧网格）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    if (real.length) t.fail('地图渲染报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('秘境右下角【强行撤离】按钮已接线（不再点击无反应）+ HUD 左右分栏', async (t) => {
    const { win, doc, errors } = await bootYear3();
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 160));
    const entryBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /入秘境|深探/.test(b.textContent) && !b.disabled);
    t.ok(!!entryBtn, '未找到秘境入口按钮');
    if (!entryBtn) return;
    entryBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 300));
    const advOv = doc.getElementById('adv-screen');
    for (let i = 0; i < 25; i++) {
      if (advOv && advOv.style.display === 'flex') break;
      const chap = doc.getElementById('chapter');
      let btn = null;
      if (chap && chap.style.display !== 'none') btn = [...chap.querySelectorAll('button')].filter(b => !b.disabled)[0];
      if (!btn) {
        const mb = doc.getElementById('modal-body');
        if (mb) btn = [...mb.querySelectorAll('button')].filter(b => !b.disabled)[0];
      }
      if (!btn) break;
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
    }
    t.eq(advOv.style.display, 'flex', '秘境地图层应已打开');
    // 1) 按钮存在且有 onclick（此前无接线 → 点击无反应）
    const rt = doc.getElementById('adv-retreat');
    t.ok(!!rt, '右下角应存在 #adv-retreat 按钮');
    t.ok(typeof rt.onclick === 'function', '右下角按钮必须已接线 onclick（否则点击无反应）');
    t.ok(/强行撤离/.test(rt.textContent || ''), '按钮文案应为【强行撤离】，实际: ' + (rt.textContent || ''));
    // 2) HUD 左右分栏：气血/灵力在左(.adv-vitals)、体力/探索在右(.adv-right)
    t.ok(!!doc.querySelector('.adv-hud .adv-vitals'), 'HUD 应含左侧气血/灵力块 .adv-vitals');
    t.ok(!!doc.querySelector('.adv-hud .adv-right'), 'HUD 应含右侧体力/探索块 .adv-right');
    // 3) 点击按钮应弹出确认层（验证接线真正生效，而非仅绑定函数）
    rt.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 220));
    const chap = doc.getElementById('chapter');
    t.ok(chap && chap.style.display !== 'none' && /强行撤离/.test(chap.textContent || ''), '点击后应弹出「强行撤离」确认层');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    if (real.length) t.fail('撤离开线报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 新手引导分期规则：秘境第 1~2 年未解锁，第 3 年自动开放 ===
  S.case('秘境随年份解锁：第 1 年显示「未解锁」且点击不开启，第 3 年才开放', async (t) => {
    // 第 1 年（新游戏开局）
    const a = await boot();
    await enterGame(a.win, a.doc, '锁定期');
    const exp = a.doc.getElementById('btn-explore');
    const span = exp && exp.querySelector('span');
    t.ok(span && /未解锁/.test(span.textContent || ''), '第 1 年秘境按钮应显示「未解锁」，实际: ' + (span ? span.textContent : '(无)'));
    t.ok(exp && exp.classList.contains('disabled'), '第 1 年秘境按钮应置灰（disabled）');
    click(a.win, 'btn-explore');
    await new Promise(r => setTimeout(r, 150));
    t.eq(visible(a.doc, 'modal'), false, '第 1 年点击秘境不应弹出选择窗');
    // 第 3 年（预置 year=3 存档续档）
    const b = await bootYear3();
    const exp2 = b.doc.getElementById('btn-explore');
    const span2 = exp2 && exp2.querySelector('span');
    t.ok(span2 && span2.textContent === '秘境', '第 3 年秘境按钮文案应为「秘境」，实际: ' + (span2 ? span2.textContent : '(无)'));
    t.ok(!(exp2 && exp2.classList.contains('disabled')), '第 3 年秘境按钮不应置灰');
    click(b.win, 'btn-explore');
    await new Promise(r => setTimeout(r, 150));
    const entry = [...b.doc.querySelectorAll('#modal-body button')].find(x => /入秘境|深探/.test(x.textContent) && !x.disabled);
    t.ok(!!entry, '第 3 年点击秘境应弹出选择窗');
  });

  // === 回归：角色属性删除（轮回加成）（天赋），灵根注明效果 ===
  S.case('角色属性：删除轮回加成与天赋；灵根与实际一致并注明效果', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '角色回归');
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    if (raw) {
      // 注入真实灵根（含 qiMul / body）以便校验"注明效果"
      raw.linggen = { id: 'mu', name: '木灵根', desc: '青木生机，生机勃勃。', qiMul: 1.25, body: { hpMax: 80 } };
      win.localStorage.setItem('dedao_save', JSON.stringify(raw));
      click(win, 't-load');
      await new Promise(r => setTimeout(r, 150));
      const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
      if (loadBtn) {
        loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
        await new Promise(r => setTimeout(r, 200));
        const card = doc.getElementById('dialog-card');
        const okBtn = card ? [...card.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
        if (okBtn) {
          okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
    // 打开角色页
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'screen-char'), true, '应进入角色页');
    const attrText = (doc.getElementById('char-attr-content') || {}).textContent || '';
    // 灵根：与实际一致 + 注明效果
    t.ok(/灵根/.test(attrText), '角色属性应包含「灵根」板块');
    t.ok(/木灵根/.test(attrText), '灵根应与存档一致（木灵根）');
    t.ok(/修炼速度/.test(attrText), '灵根应注明效果（修炼速度）');
    t.ok(/气血上限/.test(attrText), '灵根应注明效果（气血上限）');
    // 删除项：轮回加成、天赋不应作为独立板块出现
    const headings = [...doc.querySelectorAll('#char-attr-content h4')].map(h => h.textContent.trim());
    t.ok(!headings.includes('天赋'), '角色属性不应再展示「天赋」板块');
    t.ok(!headings.includes('轮回加成'), '角色属性不应再展示「轮回加成」板块');
    // 命格（新版）应保留
    t.ok(headings.includes('命格'), '角色属性应保留「命格」板块');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('角色面板交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：主角初始六维（0~2 劫 = 1；3 劫及以上 = 2） ===
  S.case('主角初始六维：0~2 劫为 1，3 劫及以上为 2（规避负属性风险）', async (t) => {
    const { win } = await boot();
    const read = (jie) => JSON.parse(win.eval(`(function(){
      var m = Engine.loadMeta(); m.nextJie = ${jie}; Engine.saveMeta(m);
      var s = Engine.startLife('初始六维');
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, ling:s.ling, linggen: s.linggen, jie: s.jie});
    })()`));
    const keys = ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'];
    const names = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', ling: '灵力' };

    const low = read(0);
    keys.forEach((k) => t.eq(low[k], 1, `${names[k]} 在 0 劫初始应为 1`));
    t.eq(low.linggen, null, '开局前灵根应为 null（提交后觉醒）');
    // 边界：2 劫仍是 1（阈值是「3 劫及以上」）
    const two = read(2);
    keys.forEach((k) => t.eq(two[k], 1, `${names[k]} 在 2 劫初始应仍为 1`));

    [3, 5, 9].forEach((jie) => {
      const hi = read(jie);
      t.eq(hi.jie, jie, `${jie} 劫应写入 s.jie`);
      keys.forEach((k) => t.eq(hi[k], 2, `${names[k]} 在 ${jie} 劫初始应为 2`));
    });

    // 动机守卫：3 劫起才可能抽到金阶仙命【九天玄体】（ti-1/dun-1）——
    // 六维为 2 时有效值最坏为 1，永不落到 0 或负数（气血/回复不会被扣穿）。
    const worst = JSON.parse(win.eval(`(function(){
      var m = Engine.loadMeta(); m.nextJie = 3; Engine.saveMeta(m);
      var s = Engine.startLife('负值风险'); s.destinies = ['jiutian']; Engine.refreshStats(s);
      return JSON.stringify({ ti: Engine.effAttr(s,'ti'), dun: Engine.effAttr(s,'dun'), hpMax: s.hpMax, recover: Engine.getRecoverPct(s) });
    })()`));
    t.gte(worst.ti, 1, '3 劫 + 【九天玄体】有效体魄应 ≥ 1（不得触 0）');
    t.gte(worst.dun, 1, '3 劫 + 【九天玄体】有效遁速应 ≥ 1（不得触 0）');
    t.gt(worst.hpMax, 0, '3 劫 + 【九天玄体】气血上限应为正');
    t.gte(worst.recover, 0, '3 劫 + 【九天玄体】回复不得为负');
    t.note(`3 劫基准 2 + 九天玄体 → 有效体魄 ${worst.ti} / 遁速 ${worst.dun} / 气血上限 ${worst.hpMax} / 回复 ${worst.recover}`);
  });

  // === 回归：灵根开局即觉醒（commitStart 已实装，不再显示“未觉醒”） ===
  S.case('灵根开局即觉醒（不再显示未觉醒）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '觉醒测试');
    const save = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(save && save.linggen, '存档中灵根应已觉醒（非 null）');
    t.ok(save && typeof save.linggen === 'object' && save.linggen.name, '灵根应带有名称');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    const attrText = (doc.getElementById('char-attr-content') || {}).textContent || '';
    t.ok(!/未觉醒/.test(attrText), '角色属性不应显示「未觉醒」');
    t.ok(/灵根/.test(attrText), '角色属性应包含「灵根」板块');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('灵根觉醒流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：轮回天赋属性加成实装（慧根+3 → 悟性 1→4） ===
  S.case('轮回天赋属性加成实装（慧根+3 → 悟性=4）', async (t) => {
    const { win } = await boot();
    win.eval(`(function(){
      var m = Engine.loadMeta(); m.reinc = m.reinc || {}; m.reinc.wu = 3; Engine.saveMeta(m);
    })()`);
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('轮回测试');
      s.bg = null; s.destinies = [];
      Engine.commitStart(s, null);
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, ling:s.ling, linggen: s.linggen ? s.linggen.name : null});
    })()`));
    t.eq(v.wu, 4, '悟性应为 基础1 + 慧根3 = 4（轮回属性加成已实装）');
    t.eq(v.ti, 1, '体魄无轮回加成应为1');
    t.eq(v.dun, 1, '遁速无轮回加成应为1');
    t.eq(v.shen, 1, '神识无轮回加成应为1');
    t.eq(v.dao, 1, '道心无轮回加成应为1');
    t.eq(v.ling, 1, '灵力无轮回加成应为1（六维之一）');
    t.ok(!!v.linggen, '灵根应已觉醒');
  });

  // === 回归：属性公式优化（神识→攻击、道心→暴击、遁速→闪避/攻速、体魄→气血） ===
  S.case('属性公式优化：神识→攻击/道心→暴击/遁速→闪避攻速/体魄→气血', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('公式');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.ti=1; Engine.refreshStats(s); var hp1=s.hpMax;
      s.ti=11; Engine.refreshStats(s); var hp2=s.hpMax;
      s.ti=1; s.shen=1; Engine.refreshStats(s); var a1=s.atk;
      s.shen=5; Engine.refreshStats(s); var a2=s.atk;
      s.shen=1; s.dao=1; var c1=Engine.getCritRate(s);
      s.dao=11; var c2=Engine.getCritRate(s);
      s.dao=1; s.dun=1; var d1=Engine.getDodgeRate(s), e1=Engine.getExtraAtkChance(s);
      s.dun=11; var d2=Engine.getDodgeRate(s), e2=Engine.getExtraAtkChance(s);
      return JSON.stringify({hp1:hp1,hp2:hp2,a1:a1,a2:a2,c1:c1,c2:c2,d1:d1,d2:d2,e1:e1,e2:e2});
    })()`));
    t.eq(v.hp2 - v.hp1, 500, '体魄每点应 +50 气血（ti 1→11 共 +500）');
    t.eq(v.a2 - v.a1, 20, '神识每点应 +5 攻击（shen 1→5 共 +20）');
    t.ok(Math.abs(v.c1 - 0.03) < 1e-9, '暴击率=神识1%×1+道心2%×1=3%');
    t.ok(Math.abs((v.c2 - v.c1) - 0.20) < 1e-9, '道心每点应 +2% 暴击（dao 1→11 共 +20%）');
    t.ok(Math.abs(v.d1 - 0.02) < 1e-9, '闪避率=遁速2%×1=2%');
    t.ok(Math.abs((v.d2 - v.d1) - 0.20) < 1e-9, '遁速每点应 +2% 闪避（dun 1→11 共 +20%）');
    t.ok(Math.abs(v.e1 - 0.01) < 1e-9, '攻速=遁速1%×1=1%（几率额外攻击一次）');
    t.ok(Math.abs((v.e2 - v.e1) - 0.10) < 1e-9, '遁速每点应 +1% 攻速（dun 1→11 共 +10%）');
  });

  // === 回归：顶栏 防御/暴击/闪避 与角色页属性面板同源（都走引擎统一口径） ===
  S.case('顶栏与角色页属性口径一致（防御/暴击/闪避同源）', async (t) => {
    const { win, doc } = await boot();
    await enterGame(win, doc, '口径一致');
    const readTop = (id) => (doc.getElementById(id) || {}).textContent;
    const topDef = (readTop('st-def') || '').trim();
    const topCrit = (readTop('st-crit') || '').trim();
    const topDodge = (readTop('st-dodge') || '').trim();
    t.ok(/^\d+$/.test(topDef), '顶栏防御应为整数，实为「' + topDef + '」');
    t.ok(/^\d+%$/.test(topCrit), '顶栏暴击应为百分比，实为「' + topCrit + '」');
    t.ok(/^\d+%$/.test(topDodge), '顶栏闪避应为百分比，实为「' + topDodge + '」');

    t.ok(click(win, 'btn-char-bottom'), '应能进入角色页');
    await new Promise(r => setTimeout(r, 200));
    const pick = (name) => {
      const cells = [...doc.querySelectorAll('#char-attr-content .attr-combat-cell')];
      const c = cells.filter(x => {
        const l = x.querySelector('.attr-combat-label');
        return l && l.textContent.trim() === name;
      })[0];
      if (!c) return null;
      const v = c.querySelector('.attr-combat-val');
      return v ? v.textContent.trim() : null;
    };
    t.eq(pick('防御'), topDef, '角色页「防御」应与顶栏一致（同走 Engine.getDefense）');
    t.eq(pick('暴击'), topCrit, '角色页「暴击」应与顶栏一致（同走 Engine.getCritRate）');
    t.eq(pick('闪避'), topDodge, '角色页「闪避」应与顶栏一致（同走 Engine.getDodgeRate）');
    t.note('顶栏 st-def/st-crit/st-dodge 与属性面板共用引擎统一口径，杜绝各自自算');
  });

  // === 回归：灵根面板必须展示真实灵根效果（旧实现只读已废弃的 linggen.body → 战斗加成全不显示） ===
  S.case('灵根面板展示 = 真实灵根数据（trait.effect 口径）', async (t) => {
    const { win, doc } = await boot();
    await enterGame(win, doc, '灵根展示');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));

    const lg = JSON.parse(win.localStorage.getItem('dedao_save')).linggen;
    t.ok(!!lg, '存档应含灵根');
    const section = [...doc.querySelectorAll('#char-attr-content .attr-section')]
      .map(x => x.textContent).filter(x => x.indexOf(lg.name) >= 0).join(' ');
    t.ok(section.length > 0, '角色页应渲染灵根区块');

    // 独立口径（与 ui.js 的展示映射互为对照，故意重写一遍）
    const LABEL = { atk: '攻击', hpMax: '气血', mpMax: '灵力上限', def: '防御', critPct: '暴击', dodgePct: '闪避', tribPct: '渡劫' };
    const PCT = { critPct: 1, dodgePct: 1, tribPct: 1 };
    t.ok(section.indexOf('修炼速度 +' + Math.round((lg.qiMul - 1) * 100) + '%') >= 0, '应展示修炼速度加成');

    const eff = (lg.trait && lg.trait.effect) || {};
    let checked = 0;
    for (const k in eff) {
      if (!LABEL[k]) continue;
      const txt = LABEL[k] + '+' + Math.round(eff[k]) + (PCT[k] ? '%' : '');
      t.ok(section.indexOf(txt) >= 0, '灵根词条未展示：' + txt);
      checked++;
    }
    if (lg.trait && lg.trait.name) {
      t.ok(section.indexOf('特质【' + lg.trait.name + '】') >= 0, '应展示特质名【' + lg.trait.name + '】');
      checked++;
    }
    if ((lg.affinity || []).length && lg.affinityBonus) {
      const lead = lg.affinity.length >= 5 ? '全系' : lg.affinity.join('/') + '系';
      t.ok(section.indexOf(lead + '功法/法术伤害 +' + lg.affinityBonus + '%') >= 0, '应展示功法/法术亲和加成');
      checked++;
    }
    t.gt(checked, 0, '本次随机到的灵根至少应有一条可展示效果');
    t.ok(!/特质：(jin|mu|shui|huo|tu|tian|hundun|wei)/.test(section), '不应再把内部 quirk 代码（如 jin）当作特质文案暴露');
    t.note('灵根="' + lg.name + '" 词条=' + JSON.stringify(eff) + '；面板读 Engine.linggenTrait（trait.effect / body 兜底）');
  });

  // === 回归：自动存档真实可读（旧版 linggen=null 虚假存档应在读取时修复，而非“已失效”） ===
  S.case('自动存档真实可读：旧版 linggen=null 的存档读档时自动修复', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '读档测试');
    // 模拟“刷新后”从 localStorage 读到的旧版遗留自动存档（linggen 缺失）
    const raw = win.localStorage.getItem('dedao_save');
    t.ok(!!raw, '开局后应存在自动存档 dedao_save');
    const obj = JSON.parse(raw);
    obj.linggen = null; obj.talents = []; // 旧版未调用 commitStart 导致的虚假存档
    win.localStorage.setItem('dedao_save', JSON.stringify(obj));

    // 打开读档弹窗：slotInfo 现在会走 loadState 修复灵根，自动存档应显示可读
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 120));
    const loadBtns = [...doc.querySelectorAll('#modal-body button')].filter(b => b.textContent.trim() === '读档');
    t.ok(loadBtns.length >= 1, '读档弹窗应出现「自动存档」的读档按钮');
    const autoLoadBtn = loadBtns[0];
    t.ok(autoLoadBtn && !autoLoadBtn.disabled, '修复后的自动存档读档按钮应可用（非虚假）');

    // 点击自动存档读档，应成功载入而非报“该存档已失效”
    if (autoLoadBtn) {
      autoLoadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
      await new Promise(r => setTimeout(r, 150));
    }
    const logTxt = (doc.getElementById('log') || {}).textContent || '';
    t.ok(logTxt.indexOf('已失效') < 0, '旧版 linggen=null 存档应被修复并可读取（不应出现“已失效”）');
    t.eq(visible(doc, 'screen-game'), true, '读取后应处于游戏主界面');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('读档修复流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归：进入页未选命格时“开始这一世”按钮禁用（避免产生无命格的虚假存档） ===
  S.case('进入页未选命格时「开始这一世」禁用', async (t) => {
    const { win, doc } = await boot();
    click(win, 't-new');
    await new Promise(r => setTimeout(r, 200));
    const useEnter = visible(doc, 'screen-enter') === true;
    t.ok(useEnter, '应进入新版进入页');
    if (!useEnter) return;
    const startBtn = doc.getElementById('enter-start');
    t.ok(!!startBtn, '进入页应含「开始这一世」按钮');
    t.eq(startBtn.disabled, true, '未选任何命格时按钮应禁用');
    // 选中一个命格后按钮应启用
    const pool = doc.getElementById('enter-destiny-pool');
    t.ok(pool && pool.children.length > 0, '命格候选项应存在');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
      await new Promise(r => setTimeout(r, 80));
      t.eq(startBtn.disabled, false, '选中命格后按钮应启用');
    }
  });

  // === 回归：灵力条（统一口径 mpMax = 20 + (灵力-1)×20；战前 +75% 加法、不覆盖回满） ===
  S.case('灵力条：上限=20+(灵力-1)×20，战前 +75% 灵力且不覆盖年末回满', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('灵力条');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.ling=1; Engine.refreshStats(s); var lowL=s.mpMax;
      s.ling=3; Engine.refreshStats(s); var highL=s.mpMax;
      s.ling=2; Engine.refreshStats(s); var cap=s.mpMax;
      s.mp=5; var before=s.mp;
      Engine.combatStart(s, { name:'测试', atk:10, hp:50, line:'' });
      var aLow = s.mp;
      s.mp=cap; // 满蓝进战（模拟年末回满后开打）
      Engine.combatStart(s, { name:'测试', atk:10, hp:50, line:'' });
      var aFull = s.mp;
      return JSON.stringify({ lowL:lowL, highL:highL, cap:cap, before:before, aLow:aLow, aFull:aFull, afterMax:s.mpMax });
    })()`));
    t.eq(v.lowL, 20, '灵力=1 时灵力上限应为 20+(1-1)×20=20');
    t.eq(v.highL, 60, '灵力=3 时灵力上限应为 20+(3-1)×20=60');
    t.eq(v.cap, 40, '灵力=2 时灵力上限应为 20+(2-1)×20=40');
    // 场景A：低蓝进战，+75% 加法封顶
    const expectLow = Math.min(v.afterMax, v.before + Math.round(v.afterMax * 0.75));
    t.eq(v.aLow, expectLow, '低蓝进战：灵力应为 进战前 + 75% 上限（加法封顶）');
    t.gt(v.aLow, v.before, '低蓝进战：灵力应净增');
    // 场景B：满蓝进战（年末回满后），应保持满蓝，不被战前恢复压回 75%
    t.eq(v.aFull, v.cap, '满蓝进战：灵力应保持满蓝（不覆盖年末回满）');
  });

  // === 回归：神识×5攻击、灵力×5攻击（原神识×10已下调） ===
  S.case('神识每点+5攻击、灵力每点+5攻击', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('攻击');
      s.talents=[]; s.sect=null; s.arts=[]; s.extraAtk=0; s.destinies=[];
      s.equip={head:null,body:null,leg:null,treasure:[]}; s.linggen=null;
      s.shen=0; s.ling=0; Engine.refreshStats(s); var a0=s.atk;
      s.shen=1; Engine.refreshStats(s); var a1=s.atk;
      s.ling=1; Engine.refreshStats(s); var a2=s.atk;
      return JSON.stringify({a0:a0, a1:a1, a2:a2});
    })()`));
    t.ok(Math.abs((v.a1 - v.a0) - 5) < 1e-9, '神识每点应 +5 攻击（原+10）');
    t.ok(Math.abs((v.a2 - v.a1) - 5) < 1e-9, '灵力每点应 +5 攻击');
  });

  // === 回归：得到装备不再自动穿上（一律入储物袋） ===
  S.case('得到装备不再自动穿上（一律入储物袋）', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('装备');
      s.bg=null; s.destinies=[]; Engine.commitStart(s, null);
      var id='tietou_kui';
      var out = Engine.gainEquip(s, id);
      var inInv = s.inventory.some(function(x){ var e=(x&&x.id)?x:{id:x}; return e.id===id; });
      return JSON.stringify({ inInv: inInv, equipped: (s.equip.head && s.equip.head.id ? s.equip.head.id===id : s.equip.head===id), msg: out.join('') });
    })()`));
    t.ok(v.inInv, '获得装备应进入储物袋（inventory）');
    t.ok(!v.equipped, '获得装备不应自动穿上（equip.head 不应被设置）');
    t.ok(/储物袋/.test(v.msg), '提示文案应说明收入储物袋');
  });

  // === 回归：寿元移出战斗属性；灵力条显示在角色战斗属性页 ===
  S.case('寿元移出战斗属性，灵力条显示在角色页', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '寿元测试');
    click(win, 'btn-char-bottom');
    await new Promise(r => setTimeout(r, 200));
    const cells = [...doc.querySelectorAll('#char-attr-content .attr-combat-cell')].map(c => c.textContent);
    const joined = cells.join(' ');
    t.ok(!/寿元/.test(joined), '战斗属性区不应再显示「寿元」');
    t.ok(/灵力/.test(joined), '战斗属性区应显示「灵力」条');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('寿元移出战斗属性流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 宗门页门禁：未过考验仅受限应考界面（无商人/任务/晋升） ===
  S.case('宗门页门禁：未入宗/未过考验 仅受限应考界面', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '宗门门禁');
    const btn = doc.getElementById('btn-sect-bottom') || doc.getElementById('btn-sect');
    t.ok(!!btn, '宗门入口缺失');
    if (!btn) return;
    btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    t.eq(visible(doc, 'screen-sect'), true, '宗门屏未打开');
    let body = doc.getElementById('sect-body');
    t.ok(!!body, 'sect-body 缺失');
    if (!body) return;
    let txt = body.textContent;
    // 散修态A：只见择宗/应考提示，不得出现完整宗门功能
    t.ok(/散修|择一仙门/.test(txt), '未入宗应见散修择宗提示');
    t.ok(txt.indexOf('宗门商人') < 0, '未过考验不应显示宗门商人');
    t.ok(txt.indexOf('宗门任务') < 0, '未过考验不应显示宗门任务');
    t.ok(txt.indexOf('申请晋升') < 0, '未过考验不应显示申请晋升');
    t.ok(txt.indexOf('宗门大比') < 0, '未过考验不应显示宗门大比');
    // 择一仙门 → 转为「待考」，出现入宗考验入口（仍无完整功能）
    const card = body.querySelector('[data-sect]');
    t.ok(!!card, '无宗门可选卡');
    if (card) {
      card.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 150));
    }
    body = doc.getElementById('sect-body');
    txt = body ? body.textContent : '';
    t.ok(txt.indexOf('入宗考验') >= 0, '择宗后应显示「入宗考验」');
    t.ok(txt.indexOf('宗门商人') < 0, '择宗未过考验仍不应有宗门商人');
    t.ok(txt.indexOf('宗门任务') < 0, '择宗未过考验仍不应有宗门任务');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('宗门页门禁流程报错: ' + real.slice(0, 4).join(' ;; '));
  });

  // === 回归：大境界渡劫前必须弹「败则身死道消 + 建议先存档」确认，且可直达存档面板 ===
  S.case('渡劫前提示存档：败则身死道消，可先去存档再回来渡劫', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '渡劫存档提示');
    // 造一个「筑基后期 · 修为圆满」的存档，再读档载入
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!raw, '自动存档不存在');
    if (!raw) return;
    raw.idx = 5; raw.realm = '筑基'; raw.qi = 999999;
    if (!raw.talents || !raw.talents.length) raw.talents = ['t_dao2'];
    if (!raw.linggen) raw.linggen = { id: 'lg_trib_test' };
    win.localStorage.setItem('dedao_save', JSON.stringify(raw));
    click(win, 't-load');
    await new Promise(r => setTimeout(r, 150));
    const loadBtn = [...doc.querySelectorAll('#modal-body button')].find(b => b.textContent === '读档' && !b.disabled);
    t.ok(!!loadBtn, '存档弹窗中无可用「读档」按钮');
    if (!loadBtn) return;
    loadBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 150));
    const card0 = doc.getElementById('dialog-card');
    const okBtn = card0 ? [...card0.querySelectorAll('button')].find(b => /确定/.test(b.textContent)) : null;
    if (okBtn) okBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));

    // 突破按钮 → 突破弹窗 → 直接突破 → 渡劫确认框
    t.ok(click(win, 'btn-break'), '突破按钮不存在');
    await new Promise(r => setTimeout(r, 200));
    const direct = [...doc.querySelectorAll('#modal-body button')].find(b => /直接突破/.test(b.textContent));
    t.ok(!!direct, '突破弹窗中无「直接突破」按钮');
    if (!direct) return;
    direct.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));

    const card = doc.getElementById('dialog-card');
    const txt = card ? card.textContent : '';
    t.ok(/渡劫 · 金丹劫/.test(txt), '渡劫确认框应标明「渡劫 · 金丹劫」，实为「' + txt.slice(0, 40) + '」');
    t.ok(txt.indexOf('此劫共 1 重劫境') >= 0, '应写明劫境重数');
    t.ok(txt.indexOf('须以实战连胜') >= 0, '应写明以实战决胜负');
    t.ok(txt.indexOf('身死道消') >= 0, '必须写明败则身死道消');
    t.ok(txt.indexOf('直接结档') >= 0, '必须写明直接结档');
    t.ok(txt.indexOf('此战不可重来') >= 0, '必须写明不可重来');
    t.ok(txt.indexOf('建议道友做好准备') >= 0, '必须提示玩家做好准备（先去存档）');
    t.ok(!/渡劫成功率/.test(txt), '大境界渡劫以实战决胜负，弹窗不再展示「渡劫成功率」数字');
    const btns = card ? [...card.querySelectorAll('button')].map(b => b.textContent) : [];
    t.ok(btns.indexOf('立即渡劫') >= 0, '应有「立即渡劫」按钮');
    t.ok(btns.indexOf('先去存档') >= 0, '应有「先去存档」按钮');

    // 点「先去存档」→ 关掉确认框，打开存档面板，且不得开始渡劫
    const goSave = card ? [...card.querySelectorAll('button')].find(b => b.textContent === '先去存档') : null;
    t.ok(!!goSave, '找不到「先去存档」按钮');
    if (goSave) goSave.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'dialog-overlay'), false, '点「先去存档」后确认框应关闭');
    const modalTxt = (doc.getElementById('modal-body') || {}).textContent || '';
    t.ok(modalTxt.indexOf('存档一') >= 0 && modalTxt.indexOf('自动存档') >= 0, '应先打开存档面板（含自动存档 / 存档一）');
    t.eq(visible(doc, 'adv-screen'), false, '不得进入劫境（玩家选择先去存档）');
    t.eq(visible(doc, 'battle'), false, '不得进入战斗');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('渡劫前提示存档流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 注：自动续档（autoResumeSave 开机自动读档）已按需求移除；开机停在标题页，
     由玩家手动点【继续征途】读取存档。相关断言（存活自动进游戏 / 结档停标题页）随之删除。 */

  // === 回归 2026-09-13：宗门页菜单（切磋演武未开放 / 任务年上限 / 大比倒计时） ===
  S.case('宗门页菜单：切磋演武（未开放）+ 宗门任务年上限 + 大比倒计时', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '宗门菜单');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    raw.sect = 'qingyunjian'; raw.sectRank = '内门';
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 200));
    await advanceChapters(win, doc);
    click(win, 'btn-sect');
    await new Promise(r => setTimeout(r, 220));
    const body = doc.getElementById('sect-body');
    const txt = body ? body.textContent : '';
    t.ok(/切磋演武（未开放）/.test(txt), '宗门页应标「切磋演武（未开放）」（实：' + txt.slice(0, 90) + '）');
    t.ok(/本年剩余 3\/3 件/.test(txt), '宗门任务应显示「本年剩余 3/3 件」');
    t.ok(/距离下次大比还有 \d+ 年/.test(txt), '宗门大比应显示「距离下次大比还有 X 年」');
    const fb = doc.querySelector('[data-act="sect-fight"]');
    t.ok(!!fb, '切磋演武入口应存在');
    if (fb) {
      fb.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 180));
      const dc = doc.getElementById('dialog-card');
      t.ok(dc && /尚未开放/.test(dc.textContent), '点击切磋演武应提示「尚未开放」（不再静默无效）');
      t.eq(visible(doc, 'battle'), false, '切磋演武不应进入战斗层');
    }
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('宗门页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归 2026-09-13：新账号开局可自由选择 0–9 劫（不再受「历史最高」封顶） ===
  S.case('进入页劫数自由选择：新账号可选 0–9 劫，所选劫数生效到本世', async (t) => {
    const a = await boot(); // 全新账号（meta.maxJie = 0）
    const { win, doc } = a;
    click(win, 't-new');
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'screen-enter'), true, '新账号应进入「天命抉择」页');
    const plus = doc.getElementById('enter-jie-plus');
    const minus = doc.getElementById('enter-jie-minus');
    t.ok(plus && !plus.disabled, '初始 0 劫时「+」应可用（旧版新账号被 maxJie=0 封死）');
    for (let i = 0; i < 9; i++) {
      plus.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
      await new Promise(r => setTimeout(r, 25));
    }
    const jieName = doc.getElementById('enter-jie-name');
    t.ok(/9劫/.test(jieName ? jieName.textContent : ''), '应可连点到 9 劫（实：' + (jieName && jieName.textContent) + '）');
    t.ok(plus.disabled, '到 9 劫后「+」应禁用');
    t.ok(minus && !minus.disabled, '9 劫时「-」应可用');
    // 以 9 劫开局 → 本世 jie=9（难度倍率/命格金池/隐藏线阈值均按所选劫数）
    const input = doc.getElementById('enter-name-input');
    input.value = '九劫君'; input.dispatchEvent(new win.Event('input', { bubbles: true }));
    const pool = doc.getElementById('enter-destiny-pool');
    if (pool && pool.children.length) {
      pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    }
    await new Promise(r => setTimeout(r, 60));
    // 命格未选满（9劫 3选2，此处只选了 1 个）：首次点「开始」只提醒，不真正开局
    click(win, 'enter-start');
    await new Promise(r => setTimeout(r, 120));
    const hintEl = doc.getElementById('enter-name-hint');
    t.ok(/还有\s*1\s*个命格可选/.test(hintEl ? hintEl.textContent : ''),
      '命格未选满时应给出提醒（实：' + (hintEl && hintEl.textContent) + '）');
    const titleEl = doc.getElementById('enter-destiny-title');
    t.ok(/已选\s*1\/2/.test(titleEl ? titleEl.textContent : ''),
      '天命标题应实时显示已选/可选（实：' + (titleEl && titleEl.textContent) + '）');
    let rawMid = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!(rawMid && rawMid.jie === 9), '首次点击只提醒，不应写入本世存档');
    click(win, 'enter-start');   // 再点一次：确认开始
    await new Promise(r => setTimeout(r, 250));
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    t.ok(!!(raw && raw.jie === 9), '所选 9 劫应写入本世存档（实：' + (raw && raw.jie) + '）');
    const real = a.errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('劫数选择交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  // === 回归 2026-09-13：百艺「阵法」板块（研习改名 + 内容归位 + 不再重复追加） ===
  S.case('百艺「阵法」板块：只做阵法研习；炼丹/炼器各自带研习入口', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '百艺阵法');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    raw.sect = 'qingyunjian'; raw.sectRank = '内门';
    raw.craft = { liandan: { lv: 2, exp: 0 }, lianqi: { lv: 2, exp: 0 }, zhenfa: { lv: 2, exp: 0 } };
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 200));
    await advanceChapters(win, doc);
    click(win, 'btn-baiyi');
    await new Promise(r => setTimeout(r, 220));
    const cb = () => doc.getElementById('crafts-body');
    if (!cb()) { t.fail('百艺页未打开（#crafts-body 缺失）'); return; }
    const tabs = [...cb().querySelectorAll('.tab')].map(x => x.textContent);
    t.eq(tabs.join('/'), '炼丹/炼器/灵田/灵矿/阵法', '第 5 个板块应叫「阵法」（旧名「研习」）');
    t.eq(cb().querySelectorAll('.crafts-body').length, 0, '不应再嵌套 .crafts-body（同名 class 嵌套会叠加间距/滚动）');
    const pickTab = (name) => {
      const b = [...cb().querySelectorAll('.tab')].find(x => x.textContent === name);
      if (b) b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    };
    pickTab('阵法'); await new Promise(r => setTimeout(r, 140));
    let txt = cb().textContent;
    t.ok(/五行阵/.test(txt), '阵法板块应含五行阵');
    t.ok(/阵法研习/.test(txt), '阵法板块应含「阵法研习」');
    t.ok(!/百艺研习/.test(txt), '标题「百艺研习」应已改为「阵法研习」');
    t.eq([...cb().querySelectorAll('button')].filter(b => b.textContent === '研习').length, 1, '阵法板块应只有 1 个研习按钮（仅阵法）');
    const h4Before = cb().querySelectorAll('h4').length;
    pickTab('阵法'); await new Promise(r => setTimeout(r, 140));
    t.eq(cb().querySelectorAll('h4').length, h4Before, '重复点击「阵法」不得重复追加内容（用户反馈的「下拉后弹出新内容」）');
    pickTab('炼丹'); await new Promise(r => setTimeout(r, 140));
    t.ok(/炼丹研习/.test(cb().textContent), '炼丹板块应带「炼丹研习」入口（否则炼丹等级无处提升）');
    t.eq([...cb().querySelectorAll('button')].filter(b => b.textContent === '研习').length, 1, '炼丹板块应有 1 个研习按钮');
    pickTab('炼器'); await new Promise(r => setTimeout(r, 140));
    t.ok(/炼器研习/.test(cb().textContent), '炼器板块应带「炼器研习」入口');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('百艺页交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 回归 2026-09-14：开荒分四段（灵根/出身/经历/百艺）。
     殷实/见面礼/延寿 由轮回塔移入「三 · 经历」，百艺由三挪到四；新增【早夭】= -3 点（反向收益）。 */
  S.case('开荒页：三 · 经历 四项齐备、点数结算正确、【早夭】为负点、百艺已挪到「四」', async (t) => {
    const { win, doc, errors } = await boot();
    click(win, 't-new');
    await new Promise(r => setTimeout(r, 200));
    const input = doc.getElementById('enter-name-input');
    if (input) { input.value = '经历校验'; input.dispatchEvent(new win.Event('input', { bubbles: true })); }
    const pool = doc.getElementById('enter-destiny-pool');
    if (pool && pool.children.length) pool.children[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 80));
    click(win, 'enter-start');
    await new Promise(r => setTimeout(r, 300));
    t.eq(visible(doc, 'screen-create'), true, '未进入开荒页');

    const body = doc.getElementById('create-body');
    const secs = [...body.querySelectorAll('.ct-sec')].map(e => e.textContent.replace(/\s+/g, ''));
    t.eq(secs.length, 4, '开荒页应有 4 段（灵根/出身/经历/百艺），实际: ' + secs.join(' | '));
    t.eq(secs[2], '三·经历', '第三段必须是「三 · 经历」，实际: ' + secs[2]);
    t.eq(secs[3], '四·百艺', '百艺应挪到「四 · 百艺」，实际: ' + secs[3]);

    const expCard = (i) => body.querySelectorAll('[data-exp]')[i];
    const expTxt = [...body.querySelectorAll('[data-exp]')].map(c => c.textContent.replace(/\s+/g, ''));
    t.eq(expTxt.length, 4, '经历应有 4 项（殷实/见面礼/延寿/早夭），实际 ' + expTxt.length);
    t.ok(/^殷实3点/.test(expTxt[0]), '殷实应为 3 点，实际: ' + expTxt[0]);
    t.ok(/^见面礼4点/.test(expTxt[1]), '见面礼应为 4 点，实际: ' + expTxt[1]);
    t.ok(/^延寿2点/.test(expTxt[2]), '延寿应为 2 点，实际: ' + expTxt[2]);
    t.ok(/^早夭-3点/.test(expTxt[3]), '早夭应为 -3 点，实际: ' + expTxt[3]);

    const budgetTxt = () => doc.querySelector('.create-budget b').textContent.trim();
    const base = parseInt(budgetTxt(), 10);
    t.eq(base, 14, '开荒池 = 基础 10 + 开荒 Lv1 的 4 = 14，实际 ' + base);
    const fire = (el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));

    fire(expCard(0));                                  // 殷实 +3
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base - 3, '选「殷实」（3 点）后剩余点数应 -3');
    t.ok(/selected/.test(expCard(0).className), '「殷实」卡片应高亮为已选');

    fire(expCard(3));                                  // 早夭 -3
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base, '再选「早夭」（-3 点）应把消耗抵消回原值 —— 早夭是「增加预算」而非消耗');
    t.note('全选四项净花 = 3+4+2-3 = 6 点');

    fire(expCard(3));                                  // 再点一次取消
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base - 3, '再点一次「早夭」应取消选择（多选 toggle）');
    t.ok(!/selected/.test(expCard(3).className), '取消后卡片不应再高亮');

    fire(expCard(1));                                  // 见面礼 +4
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base - 7, '再选「见面礼」（4 点）剩余应再 -4（累计 -7）');
    fire(expCard(1));                                  // 取消见面礼
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base - 3, '取消「见面礼」应退回 4 点');
    t.note('全选四项净花 = 3 + 4 + 2 - 3 = 6 点');

    // 命数总览页应列出已选经历（灵根 5 + 出身 1 + 殷实 3 + 延寿 2 = 11 ≤ 14，不超支）
    fire(expCard(2));                                  // 延寿 +2 → 已选 [殷实, 延寿]
    await new Promise(r => setTimeout(r, 80));
    t.eq(parseInt(budgetTxt(), 10), base - 5, '已选殷实+延寿 → 累计 -5 点');
    // 「下一页」需先择灵根 / 定出身，否则按钮 disabled（预览页不会渲染）
    fire(body.querySelector('[data-lg]'));
    await new Promise(r => setTimeout(r, 80));
    fire(body.querySelector('[data-bg]'));
    await new Promise(r => setTimeout(r, 80));
    const nx = doc.getElementById('ct-next');
    t.ok(nx && !nx.disabled, '择灵根 + 定出身 + 未超支 后「预览命数」应可点');
    if (nx && !nx.disabled) fire(nx);
    await new Promise(r => setTimeout(r, 180));
    const pv = doc.getElementById('ct-preview');
    t.ok(pv && /经历：[\s\S]*殷实[\s\S]*延寿/.test(pv.textContent), '命数总览应列出已选经历（殷实/延寿），实际: ' + (pv ? pv.textContent.replace(/\s+/g, ' ').slice(-90) : '无预览'));
    t.ok(pv && /寿元：90\s*年/.test(pv.textContent), '总览寿元应为 70 + 20（延寿）= 90 年，实际: ' + (pv ? pv.textContent.replace(/\s+/g, ' ').slice(-90) : '无预览'));

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('开荒经历页报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('轮回塔：加减按钮真实可点（+/− 生效·点数变动·可返还）', async (t) => {
    const meta = { points: 999, lives: 1, reinc: {}, achievements: {}, flown: false, maxJie: 0 };
    const { win, doc, errors } = await boot({ seed: { dedao_meta: JSON.stringify(meta) } });
    click(win, 't-rebirth');
    await new Promise(r => setTimeout(r, 200));
    const list = doc.getElementById('rb-list');
    if (!list) { t.fail('轮回塔列表 #rb-list 缺失'); return; }
    const cards = () => [...list.querySelectorAll('.rb-card')];
    // 卡数 = 「开荒」1 张 + REINCARNATION 全量。2026-09-14 二批：殷实/见面礼/延寿 移入开荒经历、
    // 舍生 删除 → 18 → 14。这里取引擎真值动态断言，避免以后再动天赋表时写死数字失效。
    const reincLen = (win.Engine && win.Engine.REINCARNATION) ? win.Engine.REINCARNATION.length : 14;
    t.eq(cards().length, reincLen + 1,
      '轮回塔应渲染「开荒 + ' + reincLen + ' 天赋」共 ' + (reincLen + 1) + ' 张卡，实际 ' + cards().length);
    // 退役天赋不得再出现（殷实/见面礼/延寿/舍生）
    const gone = ['殷实', '见面礼', '延寿', '舍生'];
    const still = cards().filter(c => gone.some(n => (c.querySelector('h4') || {}).textContent === n));
    if (still.length) t.fail('轮回塔仍残留已退役天赋：' + still.map(c => c.querySelector('h4').textContent).join('、'));
    t.note('殷实/见面礼/延寿 → 开荒「三 经历」；舍生 → 删除。旧档已购等级由 loadMeta 全额退还轮回点');

    // 结构：每张卡恰有 2 个步进按钮，且位于天赋名所在行（.rb-head）—— 手机端不再单占一行
    const noBtns = cards().filter(c => c.querySelectorAll('.rb-step').length !== 2);
    if (noBtns.length) t.fail('有卡片缺少 +/- 步进按钮：' + noBtns.length + ' 张');
    const headBad = cards().filter(c => !c.querySelector('.rb-head .rb-step'));
    if (headBad.length) t.fail('步进按钮未置于天赋名右侧（.rb-head 内找不到 .rb-step）');

    const starCount = (el) => (el.querySelector('.lvl').textContent.match(/★/g) || []).length;
    const pts = () => parseInt(doc.getElementById('rb-points').textContent, 10);
    const card = () => cards()[1];                       // 第 2 张 = 第一个普通天赋「慧根」
    const name = card().querySelector('h4').textContent;
    const p0 = pts(), s0 = starCount(card());

    // 事件必须真的绑在按钮上（历史 bug：innerHTML += 重建 DOM 会让 onclick 静默丢失）
    const add0 = card().querySelectorAll('.rb-step')[1];
    if (add0.disabled) { t.fail('轮回点 999 时「+」不应禁用'); return; }
    if (typeof add0.onclick !== 'function') { t.fail('「+」按钮未绑定 onclick（DOM 重建导致事件丢失）'); return; }
    add0.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 160));
    t.eq(starCount(card()), s0 + 1, name + ' 点「+」后星级应 +1');
    t.ok(pts() < p0, '点「+」后轮回点应减少（' + p0 + ' → ' + pts() + '）');

    // 「−」应返还并回到原星级
    const sub = card().querySelectorAll('.rb-step')[0];
    if (sub.disabled) { t.fail('已加 1 级后「−」不应禁用'); return; }
    sub.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 160));
    t.eq(starCount(card()), s0, '点「−」后应回到原星级');
    t.eq(pts(), p0, '点「−」后轮回点应全额返还（应为 ' + p0 + '）');

    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('轮回塔交互报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 回归 2026-09-14：山河探索的「文案 / 选项 / 属性结果」都必须展示并真正结算。
     旧逻辑 runEvent 只在 ev.chapter 为真时才走章节层，而 shanhe 池 13 个事件里有 7 个是
     chapter:false 且带 choices（又没有顶层 effect）：
       → 选项永不展示 → choices[].effect 永不结算（拿不到任何属性）
       → 文案与结果只能写进主界面日志，而玩家当时停留在游历页（静态地图，没有日志区）
     玩家端表现就是「文案和结果都不出现，且没有属性结果」。 */
  S.case('山河探索：文案/选项/属性结果都要展示并结算（chapter:false 也走章节层）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '山河');
    t.eq(visible(doc, 'screen-game'), true, '未进入主界面');
    // 把 shanhe 池替换为一个**确定性的** chapter:false + choices + 无顶层 effect 事件
    //   —— 正是旧版被静默吞掉的那一类（chapter:false 才是复现关键）。
    //   min:0 保证炼气期（idx=0）也满足 evOK，无需伪造境界存档。
    win.eval(`(function(){
      EVENTS.shanhe.length = 0;
      E('shanhe', {
        id: 'test_shanhe_reg', title: '测试山河', weight: 1, min: 0, max: 14,
        lines: ['山河文案·第一段', '山河文案·第二段'],
        choices: [{ t: '拾取灵石', effect: { stone: 123 }, lines: ['你拾得灵石一枚。（灵石+123）'] }]
      });
    })()`);
    const stoneBefore = parseInt((doc.getElementById('h-stone') || {}).textContent, 10);
    click(win, 'btn-social');
    await new Promise(r => setTimeout(r, 250));
    t.eq(visible(doc, 'screen-travel'), true, '点「游历」未进入游历页');
    const node = doc.querySelector('#travel-body [data-act="shanhe"]');
    t.ok(!!node, '游历页应有「山河探索」入口');
    if (!node) return;
    node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // ① 择一而往的弹窗必须回到主界面（游历页没有日志区，否则文案/结果全落在离屏日志）
    t.eq(visible(doc, 'screen-game'), true, '择一弹窗应回到主界面展示');
    const cards = [...doc.querySelectorAll('#modal-body > div')].filter(e => /测试山河/.test(e.textContent));
    t.ok(cards.length >= 1, '弹窗应列出可去的际遇');
    if (!cards.length) return;
    cards[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // ② chapter:false 的事件同样要弹章节层，文案必须可见
    t.eq(visible(doc, 'chapter'), true, 'chapter:false 的山河事件也应弹章节层（旧版此处无任何展示）');
    const cbody = () => (doc.getElementById('chapter-body') || {}).textContent || '';
    t.ok(/山河文案·第一段/.test(cbody()), '章节层应展示文案（实：' + cbody().slice(0, 60) + '）');
    // 推进到选项
    for (let i = 0; i < 6 && !doc.querySelector('#chapter-choices .choice-btn'); i++) {
      click(win, 'chapter-actions');
      await new Promise(r => setTimeout(r, 160));
    }
    const cb = doc.querySelector('#chapter-choices .choice-btn');
    t.ok(!!cb, '应出现可选项（旧版此处永远不展示 → 属性永远拿不到）');
    if (!cb) return;
    cb.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
    // ③ 结果必须展示在章节层
    t.ok(/灵石 \+123/.test(cbody()), '属性结果应展示在章节层（实：' + cbody().slice(-70) + '）');
    // 收尾：关掉章节层 → 触发 afterAction/refresh，确认主日志与主界面数值都同步
    click(win, 'chapter-actions');
    await new Promise(r => setTimeout(r, 250));
    const logTxt = (doc.getElementById('log') || {}).textContent || '';
    t.ok(/【测试山河】/.test(logTxt), '主日志应留下山河际遇记录（实：' + logTxt.slice(-90) + '）');
    // 主界面顶栏由 refresh() 驱动，可能比章节层晚一拍；轮询等它同步（固定等待在慢机器上假红）
    await waitUntil(() => parseInt((doc.getElementById('h-stone') || {}).textContent, 10) === stoneBefore + 123);
    const stoneAfter = parseInt((doc.getElementById('h-stone') || {}).textContent, 10);
    t.eq(stoneAfter, stoneBefore + 123,
      '选项 effect 应真正结算（灵石应 +123，实 ' + stoneBefore + ' → ' + stoneAfter + '）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('山河探索流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 回归 2026-09-14：游历页「探寻仙缘」点击无反应。
     根因：游历页（#screen-travel）是静态地图、没有日志区，而 xunxian 分支在
       「行动点不足 / 尚无已解锁的仙缘之人 / 今年已探寻过」时只调用 log()——
       日志写进了离屏的主界面 #log，玩家在游历页上什么都看不到 = 「点了没反应」。
     修法：新增页内提示区 #travel-msg，本页所有字符串提示走 travelMsg()。 */
  S.case('游历页「探寻仙缘」：无仙缘之人时必须有页内提示（旧版静默无反应）', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '寻仙');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    raw.seen = {};                 // 未结识任何仙缘之人 → 探寻仙缘必然返回字符串提示
    raw.npcTravelYearCount = 0;
    raw.xianyuanYearCount = 0;
    raw.actionsLeft = 9;           // 行动点充足，排除「行动点不足」这条分支
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 220));
    await advanceChapters(win, doc);
    click(win, 'btn-social');
    await new Promise(r => setTimeout(r, 250));
    t.eq(visible(doc, 'screen-travel'), true, '点「游历」未进入游历页');
    const msg = doc.getElementById('travel-msg');
    t.ok(!!msg, '游历页应有页内提示区 #travel-msg');
    const node = doc.querySelector('#travel-body [data-act="xunxian"]');
    t.ok(!!node, '游历页应有「探寻仙缘」入口');
    if (!node || !msg) return;
    node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 220));
    t.eq(visible(doc, 'travel-msg'), true,
      '点「探寻仙缘」后页内提示应可见（旧版：提示只写进离屏主日志 → 玩家看到的是「没反应」）');
    t.ok(/尚无可寻访的仙缘之人/.test(msg.textContent || ''),
      '提示应说明「尚无可寻访的仙缘之人」（实：' + (msg.textContent || '').slice(0, 60) + '）');
    t.eq(visible(doc, 'chapter'), false, '无仙缘之人时不应弹出章节层');
    const hp = doc.getElementById('h-actions-left');
    t.eq(parseInt(hp ? hp.textContent : '0', 10), 9, '无仙缘之人时不应消耗行动点');
    // 顺带：提示必须同时留痕在主日志（回到主界面能回看）
    const logTxt = (doc.getElementById('log') || {}).textContent || '';
    t.ok(/尚无可寻访的仙缘之人/.test(logTxt), '页内提示应同时留痕主日志');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('探寻仙缘流程报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('游历页「探寻仙缘」：已结识仙缘之人时回到主界面并弹章节层', async (t) => {
    const a = await boot();
    await enterGame(a.win, a.doc, '寻仙2');
    const raw = JSON.parse(a.win.localStorage.getItem('dedao_save') || 'null');
    if (!raw) { t.fail('未取得存档'); return; }
    // 只解锁林婉儿（unlock.story = ml_0_6）→ 池中只有 xian_lin，抽取结果确定
    raw.seen = { ml_0_6: 1 };
    raw.npcTravelYearCount = 0;
    raw.actionsLeft = 9;
    const { win, doc, errors } = await boot({ seed: { dedao_save: JSON.stringify(raw) } });
    click(win, 't-continue');
    await new Promise(r => setTimeout(r, 220));
    await advanceChapters(win, doc);
    click(win, 'btn-social');
    await new Promise(r => setTimeout(r, 250));
    const node = doc.querySelector('#travel-body [data-act="xunxian"]');
    t.ok(!!node, '游历页应有「探寻仙缘」入口');
    if (!node) return;
    node.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 300));
    t.eq(visible(doc, 'screen-game'), true, '触发缘法后应回到主界面展示（游历页没有日志/章节区）');
    t.eq(visible(doc, 'chapter'), true, 'NPC 缘法应弹出章节层');
    const cbody = (doc.getElementById('chapter-body') || {}).textContent || '';
    const ctitle = (doc.getElementById('chapter-title') || {}).textContent || '';
    t.ok(/药庐初遇/.test(ctitle), '章节层标题应是【药庐初遇】（实：' + ctitle + '）');
    t.ok(/青衣少女正扶着门框看你/.test(cbody), '章节层应展示缘法文案（实：' + cbody.slice(0, 60) + '）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('探寻仙缘触发报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* 回归 2026-09-14：主页面 HUD 布局（用户反馈「头像单独占了一行」）。
     目标：头像在左 / 道号在右（同一行）/ 命格在下一行 / 右侧功能列（成就上、设置下）。
     旧版 flex + flex-wrap：窄屏上 .hud-name 的 min-content 顶破容器 → 整块换行。
     jsdom 量不出几何，故这里断言「结构 + 网格口径」（防回退），几何由 Edge 探针实测。 */
  S.case('主页面 HUD：头像左 / 道号右 / 命格下一行 / 右侧功能列（成就上·设置下）', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '布局');
    const top = doc.querySelector('#screen-game .hud-top');
    t.ok(!!top, '主界面应有 .hud-top');
    if (!top) return;
    const avatar = top.querySelector('.hud-avatar');
    const nameBox = top.querySelector('.hud-name');
    const destiny = top.querySelector('.hud-destiny-inline');
    const gear = doc.getElementById('hud-settings');
    t.ok(!!avatar, 'HUD 应有头像块 .hud-avatar');
    t.ok(!!nameBox, 'HUD 应有道号块 .hud-name');
    t.ok(!!destiny, 'HUD 应有命格行 .hud-destiny-inline');
    t.ok(!!gear, 'HUD 应有设置按钮 #hud-settings');
    if (!avatar || !nameBox || !destiny || !gear) return;
    // 命格必须移出 .hud-name，否则与道号挤在同一行（用户要求「命格在下一行」）
    t.ok(!nameBox.contains(destiny), '命格必须在 .hud-name 之外（独占第二行）');
    const kids = [...top.children];
    t.ok(kids.indexOf(avatar) < kids.indexOf(nameBox), '头像应排在道号之前（头像在左）');
    t.ok(kids.indexOf(nameBox) < kids.indexOf(destiny), '道号应排在命格之前（命格在下一行）');
    t.eq(typeof gear.onclick, 'function', '设置按钮必须绑定 onclick（能点）');
    // 设置按钮点开的是设置面板
    gear.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 200));
    t.eq(visible(doc, 'modal'), true, '点 HUD 设置按钮应打开设置面板');
    // 底部栏不再重复放设置，也不放成就（两者都在 HUD）
    t.ok(!doc.getElementById('btn-settings-bottom'), '底部栏不应再有设置按钮（已上移到 HUD）');
    t.ok(!doc.getElementById('btn-ach-bottom'), '底部栏不应有成就按钮（成就已上移 HUD）');
    t.eq(doc.querySelectorAll('#bottom-bar .bottom-btn').length, 3, '底部栏应 3 项（角色/储物袋/仙缘）');
    // 布局口径守卫：必须是固定列网格，禁止回退成 flex-wrap（回退=头像又会单独占一行）
    const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
    t.ok(/\.hud-top\s*\{[^}]*display:\s*grid/.test(css), '.hud-top 必须是网格布局');
    t.ok(/\.hud-top\s*\{[^}]*grid-template-columns/.test(css), '.hud-top 必须固定列（否则窄屏又换行）');
    t.ok(/\.hud-avatar\s*\{[^}]*grid-row:\s*1\s*\/\s*span\s*2/.test(css), '头像应跨两行（左侧竖排居中）');
    t.ok(/\.hud-side\s*\{[^}]*grid-column:\s*3/.test(css), '右侧功能列应固定在第 3 列（命格右侧）');
    t.ok(/\.hud-side\s*\{[^}]*grid-row:\s*1\s*\/\s*span\s*2/.test(css), '右侧功能列应跨两行（成就在上/设置在下方）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext/i.test(e));
    if (real.length) t.fail('HUD 渲染报错: ' + real.slice(0, 3).join(' ;; '));
  });

  /* ============================================================
     回归 2026-09-15：战斗状态徽章「端到端」渲染（图标方案 §8 待办项）
     这一组补上自动化测试的最后一环：以往只测了 Engine.battleFxList 的**纯派生输出**
     （11-suite），没有任何用例真的把徽章渲染进 DOM。徽章唯一的真源是
     Engine.battleFxList(s, b) 的 { me, foe }；旧版两行都读 bb.buffs（bb === S.battle），
     而 s.battle.buffs 全仓库从未被写入 → 徽章恒为空。下面两条用例锁死这条链路。
     ============================================================ */
  S.case('战斗徽章端到端：施放岩甲术 → 我方出徽章、敌方为空', async (t) => {
    const ctx = await enterAdvBattle(1);
    if (ctx.err) { t.fail('未能进入战斗层：' + ctx.err); return; }
    const { win, doc, errors } = ctx;
    t.eq(visible(doc, 'battle'), true, '应已进入战斗层');
    // 开战无状态 → 两行都应为空（证明徽章不是「恒亮」的假象）
    t.eq(badges(doc, 'b-me-buffs').length, 0, '开战时我方不应有徽章');
    t.eq(badges(doc, 'b-enemy-buffs').length, 0, '开战时敌方不应有徽章');

    t.ok(await castSpell(win, doc, /岩甲术/), '法术栏中未找到可施放的岩甲术');
    const me = badges(doc, 'b-me-buffs');
    t.ok(me.length > 0, '施放岩甲术后我方应出现徽章（实为 ' + me.length + ' 枚）');
    if (!me.length) return;
    const ic = me[0].querySelector('.bf-ic');
    t.ok(!!ic && !!(ic.textContent || '').trim(), '徽章应含非空 .bf-ic 图标（emoji）');
    t.ok(/减伤 40%/.test(me[0].textContent || ''), '岩甲术应挂「减伤 40%」徽章，实为「' + (me[0].textContent || '') + '」');
    t.ok(!!me[0].title, '徽章应带 title 说明（悬浮可见数值与剩余回合）');
    t.ok(!me[0].classList.contains('bad'), '岩甲术是增益，不应带 bad 类（暗红）');
    // 关键防回退：只给我方挂状态时敌方行必须为空（旧版两行同源，会一起亮起来）
    t.eq(badges(doc, 'b-enemy-buffs').length, 0, '只给我方挂状态时，敌方行必须为空（防回退成共用同一数组）');
    const real = errors.filter(e => !/Could not parse CSS|Not implemented|AudioContext|serviceWorker/i.test(e));
    if (real.length) t.fail('徽章渲染报错: ' + real.slice(0, 3).join(' ;; '));
  });

  S.case('战斗徽章：法术同时挂敌我 → 两行各取各的（增益/减益分明）', async (t) => {
    const ctx = await enterAdvBattle(1);
    if (ctx.err) { t.fail('未能进入战斗层：' + ctx.err); return; }
    const { win, doc } = ctx;
    t.ok(await castSpell(win, doc, /火球术/), '法术栏中未找到可施放的火球术');
    const me = badges(doc, 'b-me-buffs');
    const foe = badges(doc, 'b-enemy-buffs');
    const meTx = me.map(e => e.textContent).join('|');
    const foeTx = foe.map(e => e.textContent).join('|');
    t.note('我方=' + meTx + ' ／ 敌方=' + foeTx);
    // 火球术：自身「攻击 +12%」+ 敌方「灼烧 1 层」——一次施法同时点亮两行
    t.ok(/攻击 \+12%/.test(meTx), '我方应挂「攻击 +12%」（火球术增益）');
    t.ok(!/灼烧/.test(meTx), '敌方的灼烧不应串进我方行');
    t.ok(/灼烧 1 层/.test(foeTx), '敌方应挂「灼烧 1 层」（火球术灼烧）');
    t.ok(!/攻击 \+12%/.test(foeTx), '我方的攻击增益不应串进敌方行');
    t.ok(meTx !== foeTx && meTx && foeTx, '敌我两行内容必须不同（防回退成同一份数据源）');
    // 减益→暗红（bad）、增益→金黄；敌方 dot 必须是减益
    t.ok(foe.every(e => e.classList.contains('bad')), '敌方减益徽章应带 bad 类');
    t.ok(me.every(e => !e.classList.contains('bad')), '我方增益徽章不应带 bad 类');
    t.ok(foe.every(e => { const i = e.querySelector('.bf-ic'); return i && (i.textContent || '').trim(); }), '敌方徽章图标不得为空');
  });

  return S;
};
