const { createGameContext } = require('../test/automated/_harness');

const ctx = createGameContext({ seed: 20260905 });
const E = ctx.get('Engine');
const T = ctx.get('TECHNIQUES');
const G = (id) => T[id];
const TALENTS = ctx.get('TALENTS') || [];

// 1) 新法术存在性
const newSpells = ['yujue','danhuo','lianhuo','jiuzhuan','honglian','yanci','fumo','tiangang_zhen','xuanwu_zhen'];
console.log('=== 新宗门法术 ===');
let ok = true;
newSpells.forEach(id => { const t = G(id); if (!t || t.sect == null) { ok = false; console.log('  缺失/无sect:', id); } else console.log(`  ${id} ${t.name} [${t.grade}/${t.cls}] sect=${t.sect} dmg=${t.dmg} cost=${t.cost} ext=${JSON.stringify({stun:t.stun,dotBurn:t.dotBurn,heal:t.heal,atkUp:t.buff&&t.buff.atkUp})}`); });
console.log('  全部存在:', ok);

// 2) 心法修订
console.log('\n=== 心法修订 ===');
console.log('  青云剑诀 atkSpd=', G('qy_xinfa1').atkSpd, '(应0.05) atkMul=', G('qy_xinfa1').atkMul);
console.log('  太虚剑典 atkSpd=', G('qy_xinfa4').atkSpd, '(应0.20)');
console.log('  护山心经 thorns=', G('xt_xinfa2').thorns, '(应0.05)');
console.log('  天罡心法 thorns=', G('xt_xinfa3').thorns, '(应0.10)');
console.log('  玄武真经 thorns=', G('xt_xinfa4').thorns, '(应0.15) reduceDmg=', G('xt_xinfa4').reduceDmg, '(应undefined)');

// 3) 五行心法额外效果
console.log('\n=== 五行心法额外效果 ===');
[['tiangang','critPct',0.05],['baihu','critPct',0.15],['chunyang','atkMul',0.05],['zhuque','atkMul',0.15],['taiyin','mpMul',0.10],['xuanwu','mpMul',0.20],['changchun','hpMul',0.10],['qinglong','hpMul',0.20],['kunyuan','defMul',0.05],['qilin','defMul',0.15],['kunyuan','thorns',0.05],['qilin','thorns',0.15]].forEach(([id,k,v])=>{
  const t = G(id);
  const got = t[k];
  console.log(`  ${id}.${k}=${got} (期望${v}) ${Math.abs((got||0)-(v||0))<1e-9?'OK':'MISMATCH'}`);
});

// 4) 引擎流程（正确建号）
console.log('\n=== 引擎流程 ===');
const s = E.startLife('宗门测试');
E.commitStart(s, TALENTS[0].id);
s.sect = 'qingyunjian';
s.idx = 3;            // 筑基 → 玄阶
s.techs = ['qy_xinfa1']; // 仅已习本宗黄阶心法
s.advType = 'huang';
E.refreshStats(s);
console.log('  本等级=', E.gradeOfBig(E.bigIdxOf(s)), '(应 玄)');
console.log('  sectTeachPool=', E.sectTeachPool(s).join(','));
let r = E.sectLecture(s);
console.log('  sectLecture ->', JSON.stringify(r));
console.log('  sectTeachYear=', s.sectTeachYear, ' qi=', s.qi);
let r2 = E.sectLecture(s);
console.log('  sectLecture again ->', JSON.stringify(r2), '(used 应为 true)');

s.sectTeachYear = 0;
let mp = E.sectMasterPrep(s);
console.log('  sectMasterPrep -> type=', mp.type, 'specName=', mp.spec.name, 'pool=', mp.pool.length, 'qiLose=', mp.qiLose, 'qiWin=', mp.qiWin);
console.log('  spec atk/hp=', mp.spec.atk, '/', mp.spec.hp);
let chosen = mp.pool[0] || null;
let wr = E.sectMasterResolve(s, true, chosen);
console.log('  sectMasterResolve(win) ->', JSON.stringify(wr));
console.log('  习得技含 chosen?', chosen ? s.techs.indexOf(chosen) >= 0 : 'pool空', ' sectTeachYear=', s.sectTeachYear);

// 战败路径
s.sectTeachYear = 0;
let mp2 = E.sectMasterPrep(s);
let lr = E.sectMasterResolve(s, false, null);
console.log('  sectMasterResolve(lose) ->', JSON.stringify(lr));
console.log('  lose 后 sectTeachYear=', s.sectTeachYear);

// 5) 五行心法效果接线
console.log('\n=== 五行心法接线 ===');
s.techs.push('baihu');
E.refreshStats(s);
const cr1 = E.getCritRate(s);
s.techEquip.xinfa = 'baihu'; E.refreshStats(s);
const cr2 = E.getCritRate(s);
console.log('  装备白虎诀 暴击率 前=', cr1.toFixed(4), ' 后=', cr2.toFixed(4), ' 差值≈0.15?', Math.abs(cr2-cr1-0.15)<1e-6);
// 必须先习得才能装备（ensureTechEquip 会清掉未习得装备）
s.techs.push('qinglong', 'kunyuan');
s.techEquip.xinfa = 'qinglong'; E.refreshStats(s);
console.log('  装备青龙诀(气血+20%) hpMax=', s.hpMax);
s.techEquip.xinfa = 'kunyuan'; E.refreshStats(s);
console.log('  装备坤元诀(防御+5%反伤5%) defPct=', E.getDefensePct(s).toFixed(3), ' xinfaThorns=', E.getXinfaThorns(s), '(应 0.050 / 0.050)');
s.techEquip.xinfa = 'qy_xinfa1'; E.refreshStats(s);
console.log('  装备青云剑诀(攻速+5%) extraAtkChance=', E.getExtraAtkChance(s).toFixed(3));

console.log('\nSMOKE DONE');
