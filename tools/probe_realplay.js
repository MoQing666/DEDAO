const fs = require('fs');
const OUT = 'C:/tmp/probe.txt';
fs.writeFileSync(OUT, '');
function log(...a) { fs.appendFileSync(OUT, a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ') + '\n'); }
process.on('uncaughtException', e => { log('UNCAUGHT:', e && e.stack ? e.stack : String(e)); process.exit(1); });

log('step0: require harness');
const { createGameContext } = require('../test/automated/_harness');
log('step1: createGameContext');
const G = createGameContext({ seed: 20260918, files: ['js/data.js', 'js/engine.js'] });
log('step2: get Engine');
const E = G.get('Engine');
log('  Engine?', typeof E, 'sectLecture?', !!(E && E.sectLecture));
const T = G.get('TECHNIQUES');
const TALENTS = G.get('TALENTS') || [];
log('  TALENTS', TALENTS.length);

function fresh(sect, idx, techs) {
  const s = E.startLife('探针');
  E.commitStart(s, TALENTS[0] ? TALENTS[0].id : undefined);
  s.sect = sect; s.idx = idx; s.techs = techs.slice(); s.advType = 'huang';
  E.refreshStats(s);
  return s;
}

log('===== ① 讲法给法术？ =====');
for (const [sect, idx, name] of [['qingyunjian',3,'青云·筑基'],['dpxia',3,'丹霞·筑基'],['xuantian',3,'玄天·筑基']]) {
  let gotShufa = 0, gotAny = 0, poolEmpty = 0;
  for (let i = 0; i < 30; i++) {
    const s = fresh(sect, idx, []);
    const r = E.sectLecture(s);
    if (r.poolEmpty) { poolEmpty++; continue; }
    gotAny++;
    const t = T[r.tech];
    if (t && t.cls === 'shufa') gotShufa++;
  }
  log(`  ${name}: 给到技=${gotAny}/30 法术=${gotShufa} 池空=${poolEmpty}/30`);
}

log('===== ② 心法 getter =====');
let s = fresh('qingyunjian', 3, ['qy_xinfa4']);
log('  qy_xinfa4 atkSpd =', E.getXinfaAtkSpd(s), '(期望0.20)');
s = fresh('xuantian', 3, ['xt_xinfa4']);
log('  xt_xinfa4 thorns =', E.getXinfaThorns(s), '(期望0.15)');
s = fresh('qingyunjian', 3, ['qinglong']);
log('  qinglong hpMul =', E.getXinfaHpMul(s), '(期望0.20)');

log('===== ③ 血量小数（木心法 hpMul×1.20） =====');
s = fresh('qingyunjian', 3, ['qinglong']);
E.refreshStats(s);
log('  hpMax =', s.hpMax, '整数?', Number.isInteger(s.hpMax));
function fmtStat(v){ if(typeof v!=='number'||!isFinite(v))return v; const r=Math.round(v*10)/10; return (r%1===0)?String(r):r.toFixed(1); }
log('  fmtStat(hpMax) =', fmtStat(s.hpMax));

log('===== ④ 师父传功前置 =====');
s = fresh('qingyunjian', 3, []);
const mp = E.sectMasterPrep(s);
log('  type=', mp.type, 'name=', mp.spec && mp.spec.name, 'hp=', mp.spec && mp.spec.hp, 'qiWin=', mp.qiWin, 'pool=', mp.pool && mp.pool.length);
log('DONE');
