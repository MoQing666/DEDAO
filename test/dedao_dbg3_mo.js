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
  const s = E.startLife('x');
  E.commitStart(s, 'liancai');
  s.actionsLeft = 10;
  s.herb = 20;
  console.log('FIELDS', typeof FIELD_SEEDS, JSON.stringify(FIELD_SEEDS && Object.keys(FIELD_SEEDS)));
  const pf = E.plantField(s, 'lingshen');
  console.log('plant:', pf);
  console.log('herb', s.herb, 'ap', s.actionsLeft);
  const fi = E.fieldInfo(s, 0);
  console.log('info:', fi && JSON.stringify(fi));
  return 1;
})();`;
vm.runInContext(c, ctx);
console.log('OK', ctx.probe);