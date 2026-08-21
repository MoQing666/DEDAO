const fs = require('fs');
const vm = require('vm');

function makeEl(id) {
  return {
    id: id, style: {}, _html: '', textContent: '', className: '', value: '',
    children: [], disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    onclick: null,
    set innerHTML(v) { this._html = String(v); if (this._html === '') this.children = []; },
    get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    scrollTop: 0, scrollHeight: 0,
    focus() {}, select() {},
    setAttribute() {}, getAttribute() { return null; }
  };
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
for (const f of ['data.js', 'engine.js', 'ui.js']) c += fs.readFileSync('D:/opencode/DEDAO/js/' + f, 'utf8') + '\n';
c += 'var __cbs = document.__cbs;\n' +
  'for (var i = 0; i < __cbs.length; i++) { var x = __cbs[i]; if (x.type === "DOMContentLoaded") x.cb(); }\n';
try { vm.runInContext(c, ctx, { filename: 'b.js' }); console.log('BOOT OK'); }
catch (e) { console.log('BOOT THROW: ' + (e.stack || e).toString().split('\n').slice(0, 8).join('\n')); process.exit(1); }

const $ = (id) => (typeof id === 'object') ? id : (els[id] || document.getElementById(id));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function click(id, label) {
  const b = $(id);
  if (!b || !b.onclick) { console.log((label || id) + ': NO HANDLER'); return false; }
  try { b.onclick(); await sleep(5); return true; }
  catch (e) { console.log('THROW @' + (label || id) + ': ' + e.message + ' / ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); return false; }
}
async function clickUntilClosed(id, max) {
  for (let i = 0; i < max; i++) {
    const ch = $('chapter');
    await click(id, 'chapter-action#' + i);
    if (!ch || ch.style.display !== 'flex') return;
  }
}
async function run() {
  const fails = [];
  await click('t-new', 't-new');
  if ($('name-input')) $('name-input').value = '青崖';
  await click('name-ok', 'name-ok');
  await sleep(10);
  await clickUntilClosed('chapter-actions', 15);
  // talent choices? click first
  const chc = $('chapter-choices');
  if (chc && chc.children.length) {
    console.log('talent choices rendered: ' + chc.children.length);
    await click(chc.children[0], 'talent-choice');
    await clickUntilClosed('chapter-actions', 8);
  }
  // should be in game now — explore
  console.log('explore button onclick? ' + ($('btn-explore').onclick ? 'yes' : 'no'));
  await click('btn-explore', 'btn-explore');
  await sleep(10);
  await clickUntilClosed('chapter-actions', 10);
  // now choices for layer 1
  for (let layer = 1; layer <= 8; layer++) {
    const ch = $('chapter');
    if (!ch || ch.style.display !== 'flex') { console.log('chapter hidden at layer ' + layer + ' — adventure over'); break; }
    await sleep(10);
    const picks = $('chapter-choices');
    if (!picks || !picks.children.length) {
      console.log('NO CHOICES at layer ' + layer + ' — likely final chapter, clicking through');
      await clickUntilClosed('chapter-actions', 6);
      const battle2 = $('battle');
      if (battle2.style.display === 'flex') {
        console.log('BATTLE OPENED (final?) enemy hp: ' + $('b-enemy-num').textContent);
        for (let i = 0; i < 40 && battle2.style.display === 'flex'; i++) {
          if (i === 0) await click('b-spell', 'b-spell');
          await click('b-guard', 'b-guard');
          await click('b-atk', 'b-atk');
        }
        console.log('final battle over');
      }
      await clickUntilClosed('chapter-actions', 8);
      break;
    }
    console.log('layer ' + layer + ': choices = ' + picks.children.map(x => (x.textContent || '').split('\n')[0].slice(0, 12)).join(' | '));
    // prefer rest when hp low (read hp text), else battle, else first
    const hpText = $('st-hp').textContent;
    const hpPct = parseFloat(hpText) > 0 ? parseFloat(hpText.split('/')[0]) / parseFloat(hpText.split('/')[1]) : 1;
    let btn = null;
    for (const kid of picks.children) { if ((kid.textContent || '').indexOf('坊') >= 0) { btn = kid; break; } }
    if (!btn && hpPct < 0.75) {
      for (const kid of picks.children) { if ((kid.textContent || '').indexOf('岩') >= 0 || (kid.textContent || '').indexOf('歇') >= 0) { btn = kid; break; } }
    }
    if (!btn) { for (const kid of picks.children) { if ((kid.textContent || '').indexOf('战') >= 0) { btn = kid; break; } } }
    if (!btn) btn = picks.children[0];
    console.log('  -> chose: ' + (btn.textContent || '').split('\n')[0].slice(0, 14) + ' (hp ' + hpText + ')');
    await click(btn, 'choice-layer' + layer);
    await sleep(10);
    // result text '继续' first (chapterAppend), then battle may open
    await clickUntilClosed('chapter-actions', 6);
    // battle?
    const battle = $('battle');
    if (battle.style.display === 'flex') {
      console.log('BATTLE OPENED at layer ' + layer + ' (enemy hp: ' + $('b-enemy-num').textContent + ')');
      if (layer === 1) {
        await click('b-auto', 'b-auto');
        console.log('AI代打 result -> chapter-title now: [' + $('chapter-title').textContent + ']');
      } else {
        for (let i = 0; i < 40 && battle.style.display === 'flex'; i++) {
          if (i === 0) await click('b-spell', 'b-spell');
          await click('b-guard', 'b-guard');
          await click('b-atk', 'b-atk');
        }
      }
      const closed = battle.style.display !== 'flex';
      console.log('battle over. chapter-title now: [' + $('chapter-title').textContent + ']');
      if (!closed) { /* stuck */ }
    } else {
      // shop modal?
      const modal = $('modal');
      if (modal.style.display === 'flex') {
        console.log('SHOP MODAL OPENED at layer ' + layer);
        const body = $('modal-body');
        const leave = body.children[body.children.length - 1];
        if (leave && leave.onclick) { leave.onclick(); await sleep(5); }
        else console.log('shop leave button missing');
      }
    }
    await clickUntilClosed('chapter-actions', 6);
    await sleep(5);
  }
  console.log('DONE. battle=' + $('battle').style.display + ' chapter=' + $('chapter').style.display);
}
run().catch(e => console.log('RUN THROW: ' + (e.stack || e)));