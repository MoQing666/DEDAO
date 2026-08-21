const fs = require('fs');
const vm = require('vm');

function makeEl(id) {
  const el = {
    id: id, style: {}, _html: '', textContent: '', className: '', value: '',
    children: [], disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    onclick: null,
    set innerHTML(v) { this._html = String(v); if (this._html === '') this.children = []; },
    get innerHTML() { return this._html; },
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
  console, document,
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
  try { b.onclick(); await sleep(5); return true; }
  catch (e) { console.log('  THROW @' + (label || id) + ': ' + e.message + ' / ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); return false; }
}
async function clickUntilClosed(id, max) {
  for (let i = 0; i < max; i++) {
    const ch = $('chapter');
    await click(id, 'chapter-action#' + i);
    if (!ch || ch.style.display !== 'flex') return;
  }
}
async function run() {
  // ---- Phase 1: 轮回塔 ----
  await click('t-rebirth', 't-rebirth');
  const list = $('rb-list');
  console.log('rebirth cards: ' + list.children.length + ' | 轮回点=' + $('rb-points').textContent);
  for (let i = 0; i < 4; i++) {
    const card = list.children.find(x => (x.innerHTML || '').indexOf('见面礼') >= 0);
    if (!card) { console.log('REBIRTH: 见面礼 card missing'); break; }
    const btns = card.children.filter(x => x.id === '<button>');
    if (!btns.length || btns[0].disabled) break;
    const before = $('rb-points').textContent;
    await click(btns[0], 'rb-buy#' + i);
    console.log('  买了第' + (i + 1) + '次: ' + before + ' -> ' + $('rb-points').textContent + ' | btn=[' + btns[0].textContent + ']');
  }
  await click('rb-back', 'rb-back');

  // ---- Phase 2: 新一世 ----
  await click('t-new', 't-new');
  if ($('name-input')) $('name-input').value = '青崖';
  await click('name-ok', 'name-ok');
  await sleep(10);
  await clickUntilClosed('chapter-actions', 15);
  const chc = $('chapter-choices');
  if (chc && chc.children.length) {
    console.log('talent choices rendered: ' + chc.children.length);
    await click(chc.children[0], 'talent-choice');
    await clickUntilClosed('chapter-actions', 8);
  }

  // ---- Phase 3: 炼丹 / 炼器 / 储物袋 ----
  const formulaRows = () => {
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
  const findTabBtns = () => {
    const out = [];
    const walk = (el) => {
      (el.children || []).forEach(ch => {
        if (ch.id === '<div>' && ((ch.className || '').indexOf('arts-tabs') >= 0)) {
          (ch.children || []).forEach(b => { if (b.id === '<button>') out.push(b); });
        }
        walk(ch);
      });
    };
    walk($('modal-body'));
    return out;
  };
  ctx._Spatch(s => { s.herb = 500; s.iron = 200; s.stone = 5000; s.actionsLeft = 20; });
  await click('btn-arts', 'btn-arts');
  const m1 = $('modal');
  const tabs1 = findTabBtns();
  if (tabs1.length) await click(tabs1[0], 'arts-tab-alchemy');
  const rows = formulaRows();
  console.log('alchemy modal: rows=' + rows.length);
  for (let i = 0; i < 3 && m1.style.display === 'flex'; i++) {
    await click(rows[i % rows.length]._btn, 'alchemy-row#' + i);
  }
  console.log('alchemy done: modal-open=' + (m1.style.display === 'flex') + ' 丹成?=' + (logTxt().indexOf('丹成') >= 0 ? 'YES' : 'no'));

  ctx._Spatch(s => { s.herb = 500; s.iron = 200; s.actionsLeft = 20; });
  await click('btn-arts', 'btn-arts');
  const tabs2 = findTabBtns();
  if (tabs2.length >= 2) await click(tabs2[1], 'arts-tab-forge');
  const rows2 = formulaRows();
  console.log('forge modal: rows=' + rows2.length);
  for (let i = 0; i < 3 && m1.style.display === 'flex'; i++) {
    await click(rows2[i % rows2.length]._btn, 'forge-row#' + i);
  }
  console.log('forge done: modal-open=' + (m1.style.display === 'flex') + ' 炼成?=' + (logTxt().indexOf('炼成') >= 0 ? 'YES' : 'no'));

  await click('btn-bag', 'btn-bag');
  const bagTxt = $('modal-body').children.map(x => (x.textContent || '').slice(0, 40)).filter(Boolean).join(' / ');
  console.log('bag text: ' + bagTxt.slice(0, 160));
  await click('modal-close', 'modal-close');
  console.log('bag closed: modal-open=' + (m1.style.display === 'flex'));

  // ---- Phase 3.5: 突破结算流程（0 行动点也可突破） ----
  ctx._Spatch(s => { s.actionsLeft = 0; s.qi = 99999; });
  await click('btn-cult', 'btn-cult(refresh)');
  const realmBefore = ctx._Spatch(s => s.idx);
  console.log('break btn enabled=' + (!$('btn-break').disabled) + ' canBreak=' + ctx.__Engine.canBreak(ctx._Spatch(s => s)));
  await click('btn-break', 'btn-break');
  await clickUntilClosed('chapter-actions', 10);
  const idxAfter = ctx._Spatch(s => s.idx);
  console.log('breakthrough settle: idx ' + realmBefore + ' -> ' + idxAfter + ' | 结算明细?=' + (logTxt().indexOf('境界') >= 0 ? 'YES' : 'no'));

  // ---- Phase 4: 冒险流程 + 坊市连续购买 ----
  let shopTested = false;
  for (let advN = 1; advN <= 5 && !shopTested; advN++) {
    ctx._Spatch(s => { s.actionsLeft = 5; if (advN > 1) s.year += 1; });
    await click('btn-explore', 'btn-explore');
    await sleep(10);
    await clickUntilClosed('chapter-actions', 10);
    for (let layer = 1; layer <= 8; layer++) {
      const ch = $('chapter');
      if (!ch || ch.style.display !== 'flex') { console.log('adv#' + advN + ' adventure over at layer ' + layer); break; }
      await sleep(10);
      const picks = $('chapter-choices');
      if (!picks || !picks.children.length) {
        console.log('adv#' + advN + ' click-through layer ' + layer);
        await clickUntilClosed('chapter-actions', 6);
        const battle2 = $('battle');
        if (battle2.style.display === 'flex') {
          console.log('BATTLE (final) enemy hp: ' + $('b-enemy-num').textContent);
          for (let i = 0; i < 40 && battle2.style.display === 'flex'; i++) {
            if (i === 0) await click('b-spell', 'b-spell');
            await click('b-guard', 'b-guard');
            await click('b-atk', 'b-atk');
          }
        }
        await clickUntilClosed('chapter-actions', 8);
        break;
      }
      console.log('adv#' + advN + ' layer ' + layer + ': ' + picks.children.map(x => (x.textContent || '').split('\n')[0].slice(0, 12)).join(' | '));
      const hpText = $('st-hp').textContent;
      const hpPct = parseFloat(hpText) > 0 ? parseFloat(hpText.split('/')[0]) / parseFloat(hpText.split('/')[1]) : 1;
      let btn = null;
      for (const kid of picks.children) { if ((kid.textContent || '').indexOf('坊') >= 0) { btn = kid; break; } }
      if (!btn && hpPct < 0.75) {
        for (const kid of picks.children) { if ((kid.textContent || '').indexOf('岩') >= 0 || (kid.textContent || '').indexOf('歇') >= 0) { btn = kid; break; } }
      }
      if (!btn) { for (const kid of picks.children) { if ((kid.textContent || '').indexOf('战') >= 0) { btn = kid; break; } } }
      if (!btn) btn = picks.children[0];
      console.log('  -> chose (' + hpText + ') ' + (btn.textContent || '').split('\n')[0].slice(0, 14));
      await click(btn, 'choice-layer' + layer);
      await sleep(10);
      await clickUntilClosed('chapter-actions', 6);
      const battle = $('battle');
      if (battle.style.display === 'flex') {
        console.log('BATTLE OPENED at layer ' + layer);
        if (layer === 1 && advN === 1) {
          await click('b-auto', 'b-auto');
          console.log('  AI代打 -> [' + $('chapter-title').textContent + ']');
        } else {
          for (let i = 0; i < 40 && battle.style.display === 'flex'; i++) {
            if (i === 0) await click('b-spell', 'b-spell');
            await click('b-guard', 'b-guard');
            await click('b-atk', 'b-atk');
          }
        }
      } else {
        const modal = $('modal');
        if (modal.style.display === 'flex') {
          const body = $('modal-body');
          const rowsS = body.children.filter(x => x.id === '<div>');
          const buy0 = rowsS.length ? (rowsS[0].children.find(c => c.id === '<button>') || null) : null;
          const stoneBefore = ctx._Spatch(s => s.stone);
          console.log('SHOP MODAL adv#' + advN + ' rows=' + rowsS.length + ' buy0=' + (buy0 ? '[' + buy0.textContent + ']' : 'none'));
          if (buy0 && !buy0.disabled) {
            await click(buy0, 'shop-buy#1');
            await click(buy0, 'shop-buy#2(dup-should-noop)');
            const stoneAfter = ctx._Spatch(s => s.stone);
            console.log('  after-buy: [' + buy0.textContent + '] disabled=' + buy0.disabled + ' 灵石 ' + stoneBefore + '->' + stoneAfter + (stoneBefore - stoneAfter > 0 ? ' (扣款正确)' : ' (!)'));
            shopTested = true;
          } else { console.log('  (nothing buyable — skipped this adv)'); }
          const leave = body.children[body.children.length - 1];
          if (leave && leave.onclick) { leave.onclick(); await sleep(5); }
        }
      }
      await clickUntilClosed('chapter-actions', 6);
      await sleep(5);
    }
  }
  console.log('DONE. battle=' + $('battle').style.display + ' chapter=' + $('chapter').style.display + ' shopTested=' + shopTested);
}
run().catch(e => console.log('RUN THROW: ' + (e.stack || e)));