const fs = require('fs');
const vm = require('vm');

function makeEl(id) {
  const el = {
    id: id, style: {}, _html: '', _txt: null, className: '', value: '',
    children: [], disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    onclick: null,
    set innerHTML(v) { this._html = String(v); this._txt = null; if (this._html === '') this.children = []; },
    get innerHTML() { return this._html; },
    set textContent(v) { this._txt = String(v); },
    get textContent() {
      if (this._txt !== null) return this._txt;
      return this._html.replace(/<[^>]*>/g, ' ') + ' ' + this.children.map(ch => ch.textContent).join(' ');
    },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    querySelector(sel) {
      if (sel !== 'button') return null;
      if (!this._btn) { this._btn = makeEl('<button>'); this.children.push(this._btn); }
      return this._btn;
    },
    querySelectorAll(sel) {
      if (sel !== 'button') return [];
      const n = (this._html || '').split('<button').length - 1;
      const arr = [];
      for (let i = 0; i < n; i++) {
        const b = makeEl('<button>');
        this.children.push(b);
        arr.push(b);
      }
      return arr;
    },
    scrollTop: 0, scrollHeight: 0,
    focus() {}, select() {},
    setAttribute() {}, getAttribute() { return null; }
  };
  return el;
}
const els = {};
const cbs = [];
const bodyEl = makeEl('body');
const document = {
  __cbs: cbs,
  body: bodyEl,
  getElementById(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; },
  createElement(tag) { return makeEl('<' + tag + '>'); },
  addEventListener(type, cb) { if (typeof type === 'function') cbs.push({ type: 'fn', cb: type }); else cbs.push({ type, cb }); }
};
const store = {};
store['dedao_meta'] = JSON.stringify({ points: 6, lives: 0, reinc: {}, achievements: {}, flown: false });
const ctx = {
  console, document, confirm: () => true,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  Math, JSON, setTimeout, Promise, Date, documentElement: { addEventListener() {} }
};
vm.createContext(ctx);
process.on('unhandledRejection', (reason) => {
  console.log('UNHANDLED REJECTION: ' + (reason && reason.stack ? reason.stack.split('\n').slice(0, 6).join('\n') : String(reason)));
});
let c = '';
for (const f of ['data.js', 'engine.js']) c += fs.readFileSync('D:/opencode/DEDAO/js/' + f, 'utf8') + '\n';
let uiSrc = fs.readFileSync('D:/opencode/DEDAO/js/ui.js', 'utf8');
uiSrc = uiSrc.replace('let S = null;', 'let S = null;\n  _Spatch = function (fn) { return fn(S); };');
c += uiSrc + '\n';
c += 'var __cbs = document.__cbs;\n' +
  'for (var i = 0; i < __cbs.length; i++) { var x = __cbs[i]; if (x.type === "DOMContentLoaded") x.cb(); }\n' +
  'var __Engine = Engine;\n';
try { vm.runInContext(c, ctx, { filename: 'b.js' }); console.log('BOOT OK'); }
catch (e) { console.log('BOOT THROW: ' + (e.stack || e).toString().split('\n').slice(0, 8).join('\n')); process.exit(1); }

const $ = (id) => (typeof id === 'object') ? id : (els[id] || document.getElementById(id));
const logTxt = () => $('log').children.map(x => (x.children || []).map(n => {
  if (n.id === '<div>') return (n.children || []).map(p => (p._html || '')).join(' ');
  return n._html || n.textContent || '';
}).join(' ')).join(' | ');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function click(id, label) {
  const b = $(id);
  if (!b || !b.onclick) { console.log('  ' + (label || id) + ': NO HANDLER'); return false; }
  try { b.onclick(); await sleep(8); return true; }
  catch (e) { console.log('  THROW @' + (label || id) + ': ' + e.message + ' / ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); return false; }
}
async function clickUntilClosed(id, max) {
  for (let i = 0; i < max; i++) {
    const ch = $('chapter');
    await click(id, 'chapter-action#' + i);
    if (!ch || ch.style.display !== 'flex') return;
  }
}
const rows = () => {
  const out = [];
  const walk = (el) => {
    if (!el) return;
    (el.children || []).forEach(ch => {
      if (ch.id === '<div>' && ((ch._html || '').indexOf('formula-row') >= 0 || (ch.className || '').indexOf('formula-row') >= 0)) out.push(ch);
      walk(ch);
    });
  };
  walk($('modal-body'));
  return out;
};
const btnOf = (el, txt) => {
  const out = [];
  const walk = (e) => {
    if (!e) return;
    (e.children || []).forEach(ch => {
      if (ch.id === '<button>' && (!txt || (ch.textContent || '').indexOf(txt) >= 0)) out.push(ch);
      walk(ch);
    });
  };
  walk(el);
  return out;
};
const bodyText = () => {
  const flat = [];
  const walk = (el) => { (el.children || []).forEach(ch => { flat.push(ch.textContent); walk(ch); }); };
  walk($('modal-body'));
  return flat.join(' || ');
};

let failN = 0;
function check(label, cond, extra) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra !== undefined ? '  [' + extra + ']' : ''));
  if (!cond) failN++;
}

async function run() {
  // ---- Phase 1: 标题�?存档入口 ----
  await click('t-load', 't-load');
  check('标题可开存档面板', $('modal').style.display === 'flex');
  check('自动�?三槽 �?�?, rows().length === 4);
  check('初始无覆盖存档按�?非游戏�?', btnOf($('modal-body'), '覆盖').length === 0);
  await click('modal-close', 'modal-close');

  // ---- Phase 2: 新一�?----
  await click('t-new', 't-new');
  if ($('name-input')) $('name-input').value = '青崖';
  await click('name-ok', 'name-ok');
  await sleep(12);
  await clickUntilClosed('chapter-actions', 12);
  const chc = $('chapter-choices');
  if (chc && chc.children.length) await click(chc.children[0], 'talent-choice');
  await clickUntilClosed('chapter-actions', 8);

  // 调教：给功法材料
  ctx._Spatch(s => {
    s.techs = ['tunai', 'shengong', 'yuhuo', 'hanshuang', 'jianqi', 'suodi'];
    s.herb = 500; s.iron = 300; s.actionsLeft = 12; s.stone = 9000;
    s.idx = 3; s.realm = '筑基'; s.sub = '初期';
  });
  ctx.__Engine.ensureTechEquip(ctx._Spatch(s => s));

  // ---- Phase 3: 功法面板 ----
  await click('btn-tech', 'btn-tech');
  const techTxt = bodyText();
  check('功法面板含三大区�?, techTxt.indexOf('心法') >= 0 && techTxt.indexOf('法术�?) >= 0 && techTxt.indexOf('遁术') >= 0);
  const techRows = rows();
  const xinfaRow = techRows.find(x => (x.textContent || '').indexOf('生息�?) >= 0);
  check('心法行含 修行 按钮', !!xinfaRow && btnOf(xinfaRow, '修行').length > 0);
  const xinfaBtn = btnOf(xinfaRow, '修行')[0];
  await click(xinfaBtn, 'xinfa-switch');
  check('换心法生�?, ctx._Spatch(s => s.techEquip.xinfa) === 'shengong');
  $('modal').style.display = 'none';

  // 装备两门法术
  ctx._Spatch(s => { s.techEquip.shufa = ['yuhuo']; });
  await click('btn-tech', 'btn-tech');
  const fRows = rows();
  const shufaRow = fRows.find(x => (x.textContent || '').indexOf('御火诀') >= 0);
  const unShufaRow = fRows.find(x => (x.textContent || '').indexOf('凝霜诀') >= 0);
  check('法术�?fire)有装备钮', !!unShufaRow && btnOf(unShufaRow, '装备').length > 0);
  const eqBtn = btnOf(shufaRow, '装备')[0];
  const takedownBtn = btnOf(shufaRow, '卸下')[0];
  check('已装法术显示"卸下"', !!takedownBtn);
  await click(takedownBtn, 'shufa-unequip');
  check('卸下后法术位0/0', ctx._Spatch(s => s.techEquip.shufa).length === 0);
  $('modal').style.display = 'none';

  ctx._Spatch(s => { s.techEquip.shufa = ['yuhuo', 'hanshuang']; });
  check('预装2法术(行动�?上限)', ctx._Spatch(s => s.techEquip.shufa).length === 2);
  $('modal').style.display = 'none';

  // ---- Phase 4: 连炼（炼到材料尽或行动点尽） ----
  ctx._Spatch(s => { s.herb = 40; s.actionsLeft = 10; });
  await click('btn-arts', 'btn-arts');
  const alchemyTab = btnOf($('modal-body'), '炼丹').find(b => (b.className || '').indexOf('tab') >= 0);
  if (alchemyTab) { await click(alchemyTab, 'arts-tab-alchemy'); }
  const aRows = rows();
  check('丹炉行有2按钮(单炼/连炼)', aRows.length > 0 && btnOf(aRows[0]).length === 2);
  const batchBtn = btnOf(aRows[0])[1];
  await click(batchBtn, 'alchemy-batch');
  const sA = ctx._Spatch(s => s);
  check('连炼后材料耗尽或行动点�?, sA.herb < 40 && (sA.herb < 3 || sA.actionsLeft <= 0));
  check('连炼扣了行动�?, sA.actionsLeft < 10);
  check('日志含连炼结�?, logTxt().indexOf('连炼') >= 0);
  $('modal').style.display = 'none';

  // ---- Phase 5: 设置 / 暂停 / 存档 ----
  await click('btn-settings', 'btn-settings');
  const setTxt = bodyText();
  check('设置面板含控�?, setTxt.indexOf('音效') >= 0 && setTxt.indexOf('音量') >= 0 && setTxt.indexOf('节奏') >= 0 && setTxt.indexOf('特效') >= 0);
  check('设置面板�?暂停/存读/退�?, setTxt.indexOf('暂停') >= 0 && setTxt.indexOf('�?) >= 0 && setTxt.indexOf('退�?) >= 0);

  const sButtons = btnOf($('modal-body'));
  const pauseBtn = btnOf($('modal-body'), '暂停')[0];
  await click(pauseBtn, 'settings-pause');
  check('暂停层打开且有信息', $('pause').style.display === 'flex' && ($('pause-info').textContent || '').indexOf('青崖') >= 0);
  await click('pause-resume', 'pause-resume');
  check('恢复修行关闭暂停�?, $('pause').style.display === 'none');

  // 存档
  const saveBtn = btnOf($('modal-body'), '�?)[0];
  await click(saveBtn, 'settings-savepanel');
  check('游戏态存读面板有覆盖�?, btnOf($('modal-body'), '覆盖').length > 0);
  const autoRow = rows()[0];
  const ovBtn = btnOf(autoRow, '覆盖')[0];
  await click(ovBtn, 'save-auto-slot0');
  const inf0 = ctx.__Engine.slotInfo(0);
  check('手存�?=青崖', inf0 && inf0.name === '青崖');
  check('自动档同步镜�?, ctx.__Engine.slotInfo(null).name === '青崖');
  await click('modal-close', 'modal-close');

  // ---- Phase 6: 战斗法术�?----
  let battleTested = false;
  let yearGateTested = false;
  for (let advN = 1; advN <= 4 && !battleTested; advN++) {
    ctx._Spatch(s => { s.actionsLeft = 6; s.techEquip.shufa = ['yuhuo', 'hanshuang']; if (advN > 1 && !yearGateTested) { s.year = 1; s.adventuredYear = 1; } });
    if (advN > 1 && !yearGateTested) {
      await click('btn-explore', 'btn-explore');
      await sleep(10);
      const gateLog = $('log-inner').textContent;
      check('一年一次拒绝提�?, gateLog.indexOf('一�?) >= 0);
      yearGateTested = true;
      ctx._Spatch(s => { s.year = 1; s.adventuredYear = undefined; });
      const chk = $('chapter').style.display;
      if (chk === 'flex') await clickUntilClosed('chapter-actions', 3);
    } else {
      await click('btn-explore', 'btn-explore');
      await sleep(10);
      await clickUntilClosed('chapter-actions', 8);
    }
    for (let layer = 1; layer <= 7 && !battleTested; layer++) {
      const ch = $('chapter');
      if (!ch || ch.style.display !== 'flex') break;
      await sleep(8);
      const picks = $('chapter-choices');
      if (!picks || !picks.children.length) { await clickUntilClosed('chapter-actions', 5); break; }
      let btn = null;
      for (const kid of picks.children) if ((kid.textContent || '').indexOf('�?) >= 0) { btn = kid; break; }
      if (!btn) btn = picks.children[0];
      await click(btn, 'adv-choice-l' + layer);
      await sleep(8);
      await clickUntilClosed('chapter-actions', 5);
      const battle = $('battle');
      if (battle.style.display === 'flex') {
        console.log('BATTLE OPENED layer=' + layer);
        check('战斗界面有逃跑按钮', !!$('b-flee') && $('b-flee').onclick !== null);
        check('战斗界面有一键代�?, !!$('b-auto') && $('b-auto').onclick !== null);
        for (let i = 0; i < 30 && battle.style.display === 'flex'; i++) await click('b-auto', 'b-auto');
        battleTested = true;
        await clickUntilClosed('chapter-actions', 6);
      }
    }
  }
  check('战斗法术条实测完�?, battleTested);

  // ---- Phase 7: 退出到主页 + 继续 + 读档 ----
  await click('btn-settings', 'btn-settings');
  const exitBtn = btnOf($('modal-body'), '退�?)[0];
  await click(exitBtn, 'settings-exit');
  check('退回标题页', $('screen-game').style.display === 'none' && $('screen-title').style.display === 'flex');
  check('标题页显示继续钮', $('t-continue').style.display !== 'none');
  const yearAtExit = ctx.__Engine.slotInfo(null).year;
  await click('t-continue', 't-continue');
  check('继续后回到游�?, $('screen-game').style.display === 'flex');
  check('年份一�?, ctx._Spatch(s => s.year) === yearAtExit);

  await click('t-load', 't-load');
  const row0 = rows()[0];
  check('标题读档面板·自动档有信息', (row0.textContent || '').indexOf('青崖') >= 0);
  const loadBtn = btnOf(row0, '读档')[0];
  check('自动档读档钮可用', !!loadBtn && !loadBtn.disabled);
  await click(loadBtn, 't-load-auto');
  check('读档进入游戏', $('screen-game').style.display === 'flex' && ctx._Spatch(s => s.name) === '青崖');

  console.log('== DRIVE4 DONE. fail=' + failN);
}
run().catch(e => console.log('RUN THROW: ' + (e.stack || e)));
