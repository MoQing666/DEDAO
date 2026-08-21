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
  catch (e) { console.log('  THROW @' + (label || id) + ': ' + e.message); return false; }
}
async function clickUntilClosed(id, max) {
  for (let i = 0; i < max; i++) {
    const ch = $('chapter');
    await click(id, 'chapter-action#' + i);
    if (!ch || ch.style.display !== 'flex') return;
  }
}

let fail = 0;
function check(name, cond) {
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  if (!cond) { fail++; process.exitCode = 1; }
}

let fightsDone = 0;
async function stepOnce(where, prefShop) {
  ctx._Spatch(s => { s.actionsLeft = 50; });
  const battle = $('battle');
  if (battle.style.display === 'flex') {
    ctx._Spatch(s => { s.hp = 1e9; });
    for (let i = 0; i < 10 && battle.style.display === 'flex'; i++) {
      await click('b-auto', where + '-auto');
    }
    fightsDone++;
    await sleep(10);
    return 'battle';
  }
  const ch = $('chapter');
  if (!ch || ch.style.display !== 'flex') {
    const modal = $('modal');
    if (modal.style.display === 'flex') {
      if (where !== 'shopwalk') {
        console.log('  [walker] 途中遇到弹窗:' + (($('modal-body').textContent || '').slice(0, 18)) + ' => 关闭');
        await click('modal-close', where + '-modal-close');
        await sleep(10);
        return 'modal';
      }
      return 'modal';
    }
    return 'none';
  }
  const picks = $('chapter-choices');
  if (picks && picks.children.length) {
    let btn = null;
    if (prefShop) { for (const kid of picks.children) { if ((kid.textContent || '').indexOf('坊') >= 0) { btn = kid; break; } } }
    if (!btn) { for (const kid of picks.children) { if ((kid.textContent || '').indexOf('战') >= 0) { btn = kid; break; } } }
    if (!btn) { for (const kid of picks.children) { if ((kid.textContent || '').indexOf('前') >= 0) { btn = kid; break; } } }
    if (!btn) btn = picks.children[0];
    await click(btn, where + '-choice');
    return 'choice';
  }
  await click('chapter-actions', where + '-next');
  return 'next';
}
async function ride(untilFn, max, where) {
  let noneStreak = 0;
  for (let i = 0; i < max; i++) {
    if (untilFn()) return true;
    const r = await stepOnce(where);
    if (r === 'none') {
      if (++noneStreak > 30) return false;
      await sleep(20);
    } else noneStreak = 0;
  }
  return untilFn();
}

(async function () {
  check('new-life', (await click('t-new', 'new')) === true);
  $('name-input').value = 'duobao';
  await click('name-ok', 'name-ok');
  ctx._Spatch(s => {
    s.atk = 99999; s.hpMax = 6000; s.hp = 30000; s.def = 99999; s.stone = 900;
    s.equip = { head: 'xuantie_kuijia', body: null, leg: null, treasure: null };
    s.inventory = [];
    s.pendingDuobao = null;
    s.actionsLeft = 6;
  });
  await click('btn-explore', 'explore-enter');
  check('秘境章节打开', $('chapter').style.display === 'flex');
  check('探索工具条可见', $('adv-tools').style.display === 'flex');

  await click('adv-bag', 'adv-bag');
  check('探险中打开储物袋', $('modal').style.display === 'flex' && ($('modal-body').textContent || '').indexOf('储物袋') >= 0);
  await click('modal-close', 'bag-close');
  check('储物袋关闭', $('modal').style.display === 'none');
  await click('adv-gear', 'adv-gear');
  const gearTxt = $('modal-body').textContent || '';
  check('探险中打开行装', gearTxt.indexOf('随身行装') >= 0);
  check('行装显示上品品质', gearTxt.indexOf('上品') >= 0);
  check('行装显示玄铁战盔', gearTxt.indexOf('玄铁') >= 0);
  await click('modal-close', 'gear-close');
  await click('adv-tech', 'adv-tech');
  check('探险中打开功法', $('modal').style.display === 'flex' && ($('modal-body').textContent || '').indexOf('功法') >= 0);
  await click('modal-close', 'tech-close');
  check('功法面板关闭', $('modal').style.display === 'none');

  ctx._Spatch(s => { s.pendingDuobao = ['xuantie_kuijia']; });
  let introSeen = false;
  await ride(() => {
    introSeen = ($('chapter').style.display === 'flex') && (($('chapter-title').textContent || '').indexOf('夺宝') >= 0);
    return introSeen;
  }, 40, 'intro');
  check('夺宝引劫章节出现', introSeen);
  if (introSeen) { await click('chapter-actions', 'intro-next'); await sleep(10); }
  console.log('  [intro-after] battle=' + $('battle').style.display + ' title=[' + $('chapter-title').textContent + ']');

  const pendChecked = () => ctx._Spatch(s => !s.pendingDuobao || s.pendingDuobao.length === 0);
  await ride(pendChecked, 60, 'fight2');
  const stA = ctx._Spatch(s => s);
  const dbgLog = (logTxt() || '').split(' | ').slice(-14).join(' | ');
  console.log('  [duobao-end] battle=' + $('battle').style.display + ' chapter=' + $('chapter').style.display +
    ' title=[' + $('chapter-title').textContent + '] pending=' + JSON.stringify(stA.pendingDuobao) +
    ' inv=' + JSON.stringify(stA.inventory || []) + ' equip=' + JSON.stringify(stA.equip));
  console.log('  [log-tail] ' + dbgLog);
  check('守宝后队列清空', pendChecked());
  const invHas = (stA.inventory || []).indexOf('xuantie_kuijia') >= 0;
  const chTitle = ($('chapter-title').textContent || '');
  const ended = chTitle.indexOf('技不如人') >= 0 || (logTxt() || '').indexOf('夺走') >= 0;
  check('秘宝归我(入库)或易主(被夺)', invHas || ended);
  if (invHas) console.log('  玄铁战盔已收入行囊');
  else if (ended) console.log('  宝物被强人夺走');

  await ride(() => { const st = ctx._Spatch(s => s); return !(st.adv && st.adv.status === 'running'); }, 160, 'settle');
  for (let pass = 0; pass < 3; pass++) {
    const stNow = ctx._Spatch(s => s);
    if (!(stNow.adv && stNow.adv.status === 'running')) break;
    await clickUntilClosed('chapter-actions', 6);
    await sleep(30);
  }
  {
    const stD = ctx._Spatch(s => s);
    console.log('  [settle-st] status=' + (stD.adv && stD.adv.status) + ' chapter=' + $('chapter').style.display +
      ' battle=' + $('battle').style.display + ' modal=' + $('modal').style.display +
      ' title=[' + $('chapter-title').textContent + '] year=' + stD.year + ' ap=' + stD.actionsLeft);
  }
  for (let i = 0; i < 24; i++) {
    const ch = $('chapter');
    if (ch.style.display === 'flex') await click('chapter-actions', 'settle-tail#' + i);
    else await sleep(25);
    if ((logTxt() || '').indexOf('本次收获') >= 0) break;
  }
  await sleep(20);
  const logAll = logTxt() || '';
  console.log('  [settle] log has 本次收获? ' + (logAll.indexOf('本次收获') >= 0));
  check('归途结算汇总(本次收获)', logAll.indexOf('本次收获') >= 0 || logAll.indexOf('一无所获') >= 0);

  const st3 = ctx._Spatch(s => s);
  if (st3.adv && st3.adv.status !== 'running') {
    const chk3 = $('chapter');
    if (chk3.style.display === 'flex') await clickUntilClosed('chapter-actions', 6);
    ctx._Spatch(s => { s.actionsLeft = 6; });
    await click('btn-explore', 'explore-again');
    await sleep(10);
    console.log('  [year-gate] log tail: ' + (logTxt() || '').split(' | ').slice(-3).join(' | '));
    check('一年一次: 二次探索被拒', (logTxt() || '').indexOf('一年') >= 0 && $('chapter').style.display !== 'flex');
  }

  let shopModalSeen = false;
  let shopResume = false;
  for (let advN = 1; advN <= 10 && !shopResume; advN++) {
    ctx._Spatch(s => {
      s.actionsLeft = 6;
      if (s.adv && s.adv.status !== 'running') { s.year = 2 + advN; s.adventuredYear = undefined; }
    });
    await click('btn-explore', 'shop-attempt#' + advN);
    await sleep(10);
    const chk = $('chapter');
    if (!chk || chk.style.display !== 'flex') continue;
    for (let i = 0; i < 40 && !shopModalSeen; i++) {
      const modal = $('modal');
      if (modal.style.display === 'flex') {
        const mt = $('modal-body').textContent || '';
        if (mt.indexOf('坊市') >= 0) {
          shopModalSeen = true;
          console.log('  坊市出现(adv#' + advN + ') => 点右上角关闭');
          await click('modal-close', 'shop-modal-close');
          await sleep(10);
          const ch3 = $('chapter');
          const stNow = ctx._Spatch(s => s);
          if (ch3.style.display === 'flex' && stNow.adv && stNow.adv.status === 'running') {
            shopResume = true;
          }
          break;
        }
      }
      await stepOnce('shopwalk', true);
    }
  }
  check('本趟遇到坊市', shopModalSeen);
  check('坊市关闭后继续探索(未卡死)', shopResume);

  console.log('== DRIVE5 DONE. fail=' + fail + ' ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('DRIVE5 CRASH: ' + (e.stack || e)); process.exit(1); });