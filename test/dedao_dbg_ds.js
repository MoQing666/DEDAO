const fs = require('fs');
const vm = require('vm');
const store = {};
const ctx = {
  console, localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  document: { addEventListener: () => {}, getElementById: () => null },
  Math, JSON
};
vm.createContext(ctx);
let c = '';
for (const f of ['data.js', 'engine.js']) c += fs.readFileSync('D:/opencode/DEDAO/js/' + f, 'utf8') + '\n';
c += `probe=(function(){
  const E = Engine;
  const s = E.startLife('t');
  E.commitStart(s, 'dujie');
  console.log('init ds', s.dunSpeed, 'idx', s.idx, 'realm', s.realm);
  s.qi = 1e9;
  const r1 = E.breakthrough(s);
  console.log('bt1 ok', r1.ok, 'idx', s.idx, 'ds', s.dunSpeed, 'realm', s.realm);
  s.qi = 1e9;
  const r2 = E.breakthrough(s);
  console.log('bt2 ok', r2.ok, 'idx', s.idx, 'ds', s.dunSpeed, 'realm', s.realm);
  s.qi = 1e9;
  const r3 = E.breakthrough(s);
  console.log('bt3', JSON.stringify(r3), 'idx', s.idx, 'ds', s.dunSpeed, 'realm', s.realm);
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log('OK', ctx.probe);
