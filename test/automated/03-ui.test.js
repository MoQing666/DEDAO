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
  await advanceChapters(win, doc);
  await new Promise(r => setTimeout(r, 200));
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
    if (!bars.length) bars = ['btn-bag-bottom', 'btn-gear-bottom', 'btn-tech-bottom', 'btn-favor', ].filter(id => doc.getElementById(id));
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
    t.eq(rows.length, 3, '锻体页应有 3 种淬炼（体魄/遁速/神识）');
    if (rows.length !== 3) return;
    t.ok(/1 行动点/.test(rows[0].textContent) && /0\.5/.test(rows[0].textContent), '体魄淬炼应为 1点→+0.5');
    t.ok(/2 行动点/.test(rows[2].textContent) && /0\.5/.test(rows[2].textContent), '神识淬炼应为 2点→+0.5');
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

  // === 回归：秘境入口不再卡死（章节层 z-index 修复 + 背景切换） ===
  S.case('秘境入口：章节层正常显示且背景切换到秘境图', async (t) => {
    const { win, doc, errors } = await boot();
    await enterGame(win, doc, '秘境回归');
    const raw = JSON.parse(win.localStorage.getItem('dedao_save') || 'null');
    if (raw) {
      raw.actionsLeft = 5;
      raw.adv = null;
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
    // 点秘境打开选择弹窗
    click(win, 'btn-explore');
    await new Promise(r => setTimeout(r, 150));
    const enterBtn = [...doc.querySelectorAll('#modal-body button')].find(b => /进入/.test(b.textContent) && !b.disabled);
    t.ok(!!enterBtn, '秘境选择弹窗应出现「进入」按钮');
    if (!enterBtn) return;
    enterBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
    await new Promise(r => setTimeout(r, 250));
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

  // === 回归：主角初始六维=1 ===
  S.case('主角初始六维=1（开局基础值）', async (t) => {
    const { win } = await boot();
    const v = JSON.parse(win.eval(`(function(){
      var s = Engine.startLife('初始六维');
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, fu:s.fu, linggen: s.linggen});
    })()`));
    t.eq(v.wu, 1, '悟性初始应为1');
    t.eq(v.ti, 1, '体魄初始应为1');
    t.eq(v.dun, 1, '遁速初始应为1');
    t.eq(v.shen, 1, '神识初始应为1');
    t.eq(v.dao, 1, '道心初始应为1');
    t.eq(v.fu, 1, '福源初始应为1');
    t.eq(v.linggen, null, '开局前灵根应为 null（提交后觉醒）');
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
      return JSON.stringify({wu:s.wu, ti:s.ti, dun:s.dun, shen:s.shen, dao:s.dao, fu:s.fu, linggen: s.linggen ? s.linggen.name : null});
    })()`));
    t.eq(v.wu, 4, '悟性应为 基础1 + 慧根3 = 4（轮回属性加成已实装）');
    t.eq(v.ti, 1, '体魄无轮回加成应为1');
    t.eq(v.dun, 1, '遁速无轮回加成应为1');
    t.eq(v.shen, 1, '神识无轮回加成应为1');
    t.eq(v.dao, 1, '道心无轮回加成应为1');
    t.eq(v.fu, 1, '福源无轮回加成应为1');
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
    t.eq(v.a2 - v.a1, 40, '神识每点应 +10 攻击（shen 1→5 共 +40）');
    t.ok(Math.abs(v.c1 - 0.03) < 1e-9, '暴击率=神识1%×1+道心2%×1=3%');
    t.ok(Math.abs((v.c2 - v.c1) - 0.20) < 1e-9, '道心每点应 +2% 暴击（dao 1→11 共 +20%）');
    t.ok(Math.abs(v.d1 - 0.02) < 1e-9, '闪避率=遁速2%×1=2%');
    t.ok(Math.abs((v.d2 - v.d1) - 0.20) < 1e-9, '遁速每点应 +2% 闪避（dun 1→11 共 +20%）');
    t.ok(Math.abs(v.e1 - 0.02) < 1e-9, '攻速=遁速2%×1=2%（几率额外攻击一次）');
    t.ok(Math.abs((v.e2 - v.e1) - 0.20) < 1e-9, '遁速每点应 +2% 攻速（dun 1→11 共 +20%）');
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

  return S;
};
