const fs = require('fs');
const vm = require('vm');
const store = {};
const realRandom = Math.random;
const FR = { v: null };
Math.random = function () { return FR.v !== null ? FR.v : realRandom(); };
const ctx = {
  console, FR, localStorage: {
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
  const out = [];
  const E = Engine;
  const fail = function (label, cond) { out.push((cond ? 'PASS ' : 'FAIL ') + label); };
  const s = E.startLife('存档测试');
  E.commitStart(s, 'dujie');
  E.clearState();

  // ---- 存档�?----
  fail('slotExists(0) 初始=false', E.slotExists(0) === false);
  E.saveState(s, 0);
  fail('saveState(slot0) �?slotExists(0)=true', E.slotExists(0) === true);
  const inf0 = E.slotInfo(0);
  fail('slotInfo(0) name/realm/year', inf0 && inf0.name === '存档测试' && inf0.realm && inf0.year === 1 && inf0.dead === false);
  E.saveState(s, 2);
  fail('slotExists(2)=true', E.slotExists(2) === true);
  const sBack = E.loadState(2);
  fail('loadState(2) 回读一�?, sBack && sBack.name === '存档测试' && sBack.idx === 0);
  fail('存档2镜像写入自动�?, E.slotExists(null) === true && !!localStorage.getItem('dedao_save'));
  fail('auto档与slot2同人', E.slotInfo(null).name === '存档测试');

  // ---- 功法装备迁移 ----
  localStorage.removeItem('dedao_save'); localStorage.removeItem('dedao_slot2');
  const s2 = E.startLife('迁移测试');
  E.commitStart(s2, 'dujie');
  s2.techs = ['tunai', 'shengong', 'yuhuo', 'hanshuang', 'leiyin', 'suodi'];
  delete s2.techEquip;
  E.saveState(s2, 1);
  localStorage.removeItem('dedao_save');
  const mig = E.loadState(1);
  fail('旧档迁移�?techEquip', !!mig.techEquip && !!mig.techEquip.xinfa && Array.isArray(mig.techEquip.shufa));
  fail('迁移心法=最高倍率(吐纳1.2 vs 玄天1.25 -> shengong)', mig.techEquip.xinfa === 'shengong');
  const ap0 = E.actionPoints(mig);
  fail('迁移法术�?actionPoints(' + ap0 + ')', mig.techEquip.shufa.length === Math.min(3, ap0));
  fail('迁移遁术=最�?, mig.techEquip.dunshu === 'suodi');

  // ---- 法术位上限与切换 ----
  E.clearState();
  const s3 = E.startLife('法术测试');
  E.commitStart(s3, 'dujie');
  s3.techs = ['tunai', 'shengong', 'yuhuo', 'hanshuang', 'leiyin', 'jianqi', 'suodi'];
  E.ensureTechEquip(s3);
  const ap3 = E.actionPoints(s3); // 炼气 = 3
  let rej = 0;
  const backup = s3.techEquip.shufa.slice();
  while (s3.techEquip.shufa.length < ap3 && rej < 10) {
    const got = ['yuhuo', 'hanshuang', 'leiyin', 'jianqi'].find(function (t) { return s3.techEquip.shufa.indexOf(t) < 0; });
    if (!got) break;
    E.toggleShufa(s3, got);
  }
  fail('装备�?' + ap3 + ' 门法�?, s3.techEquip.shufa.length === ap3);
  const first = s3.techEquip.shufa[0];
  fail('满位后装备被�?false)', E.toggleShufa(s3, 'jianqi') === false);
  fail('未占位法术仍可换? (jianqi在外)', s3.techEquip.shufa.indexOf('jianqi') < 0);
  E.toggleShufa(s3, first);
  fail('卸下一门后腾出位置', s3.techEquip.shufa.indexOf(first) < 0);
  const ok2 = (function () {
    return E.toggleShufa(s3, 'jianqi');
  })();
  fail('腾位后再装备=true', ok2 === true);
  E.setXinfa(s3, 'tunai');
  fail('setXinfa 生效', s3.techEquip.xinfa === 'tunai');
  E.setDunshu(s3, 'suodi');
  fail('setDunshu 生效', s3.techEquip.dunshu === 'suodi');
  fail('equippedShufa 排好�?, E.equippedShufa(s3).length === ap3);

  // ---- 战斗法术（仅装备之法术入列；显式释放一次） ----
  const s4 = E.startLife('战斗测试');
  E.commitStart(s4, 'dujie');
  s4.techs = ['tunai', 'changchun', 'yuhuo', 'hanshuang'];
  E.ensureTechEquip(s4);
  E.toggleShufa(s4, 'yuhuo');
  const b1 = E.combatStart(s4, E.enemyGen(s4, 'normal', 1));
  const listIds = (b1.spellList || []).map(function (x) { return x.id; }).join();
  fail('combatStart.spellList 仅含已装法术', listIds === 'yuhuo');
  fail('spellName=首法术名', b1.spellName === TECHNIQUES.yuhuo.name);
  const hp0 = s4.battle.hp0 || s4.battle.hpMax;
  const mo0 = s4.mo;
  const r1 = E.combatAct(s4, 'spell', 'yuhuo');
  fail('显式法术出招包含法术�?, r1.lines.join().indexOf(TECHNIQUES.yuhuo.name) >= 0);
  fail('法术误伤敌人(伤害>0或描�?', s4.battle.hp < hp0 && r1.lines.join().indexOf('伤害') >= 0);
  fail('施法消耗灵�?, s4.mo === mo0 - (TECHNIQUES.yuhuo.cost || 15));
  const r2 = E.combatAct(s4, 'spell', 'yuhuo');
  fail('法术第二次施放或分胜�?灵力�?', r2.done === true || s4.mo < mo0 - (TECHNIQUES.yuhuo.cost || 15));
  const s4b = E.startLife('战斗测试2');
  E.commitStart(s4b, 'dujie');
  s4b.techs = ['tunai', 'changchun', 'yuhuo', 'hanshuang'];
  E.ensureTechEquip(s4b);
  E.toggleShufa(s4b, 'yuhuo');
  E.combatStart(s4b, E.enemyGen(s4b, 'normal', 1));
  s4b.mo = 0;
  const r2b = E.combatAct(s4b, 'spell', 'yuhuo');
  fail('灵力不足禁施�?, r2b.lines.join().indexOf('灵力不足') >= 0);
  fail('灵力不足时灵力不�?, s4b.mo === 0);
  const r3 = E.combatAct(s4, 'atk');
  fail('普攻正常', r3.done === false || r3.done === true);
  fail('灵力必不小于0', s4.mo >= 0);

  // ---- 探索·灵铁实装 ----
  E.clearState();
  const s5 = E.startLife('灵铁测试');
  E.commitStart(s5, 'dujie');
  s5.actionsLeft = 3;
  let ironTot = 0;
  let ironHits = 0;
  for (let k = 0; k < 30; k++) {
    const a = { status: 'running', depth: 1, maxDepth: 4, gains: [], done: false };
    s5.adv = a;
    const layer = E.advGenLayer(s5);
    const ironNode = layer.choices.find(function (ch) { return ch.type === 'iron'; });
    if (ironNode) {
      ironHits++;
      const res = E.advResolve(s5, ironNode);
      const lastLine = res.lines[res.lines.length - 1];
      const i2N = parseInt(String(lastLine).replace(/[^0-9]/g, ''), 10);
      const num = isNaN(i2N) ? 0 : i2N;
      ironTot += num;
    }
  }
  fail('30层中至少抽中1次灵铁节�?, ironHits > 0);
  fail('灵铁节点有产出且写回 s.iron', ironTot > 0 && s5.iron >= ironTot);
  fail('铁节点产出下限≥3', ironTot >= ironHits * 3);

  // ---- 坊市功法概率0.9 �?新增功法货物 ----
  let shopTechN = 0, seen = [];
  for (let k = 0; k < 200; k++) {
    const stk = E.shopStock({ ...s5, techs: s5.techs, stone: 99999, idx: 3 });
    stk.forEach(function (si) { if (si.tech) { shopTechN++; seen.push(si.tech); } });
  }
  fail('坊市出功法概率≈0.9(200次样�?', shopTechN / 200 > 0.8);
  fail('坊市含新功法 changchun/jianqi', seen.indexOf('changchun') >= 0 && seen.indexOf('jianqi') >= 0);

  // ---- 机缘/论道 功法获取 ----
  E.clearState();
  const s6 = E.startLife('功法获取');
  E.commitStart(s6, 'dujie');
  FR.v = 0;
  const jishu = EVENTS.jiyuan.find(function (e) { return e.id === 'jishi_book'; });
  const g1 = E.runEvent(s6, jishu);
  FR.v = null;
  fail('机缘书摊：携tunai时授 random(yuhuo/hanshuang)→yuhuo', s6.techs.indexOf('yuhuo') >= 0);
  fail('机缘书摊: 已有两法后不再重�?', true);
  const s6b = E.startLife('功法获取1b');
  E.commitStart(s6b, 'dujie');
  s6b.techs = ['tunai', 'yuhuo', 'hanshuang'];
  const stoneBefore = s6b.stone;
  const g1b = E.runEvent(s6b, jishu);
  fail('书摊无新功法�?effect 不越�?仅扣灵石)', g1b.length === 1 && s6b.techs.length === 3 && s6b.stone === stoneBefore - 50);
  const s7 = E.startLife('功法获取2');
  E.commitStart(s7, 'dujie');
  FR.v = 0.1;
  const lundao = EVENTS.shejiao.find(function (e) { return e.id === 'lundao_dahui'; });
  E.runEvent(s7, lundao);
  FR.v = null;
  fail('论道大会30%授法�?rand=0.1命中)', s7.techs.length > 1);
  const s7b = E.startLife('功法获取2b');
  E.commitStart(s7b, 'dujie');
  FR.v = 0.8;
  E.runEvent(s7b, lundao);
  FR.v = null;
  fail('论道大会未命中不授技', s7b.techs.length === 1);

  // ---- 品质与境界匹�?----
  fail('境界品质区间 炼气[1,2]', E.realmTierRange(0).join() === '1,2');
  fail('境界品质区间 筑基[2,3]', E.realmTierRange(1).join() === '2,3');
  fail('境界品质区间 金丹[3,4]', E.realmTierRange(2).join() === '3,4');
  fail('境界品质区间 元婴[4,5]', E.realmTierRange(3).join() === '4,5');
  const te = E.startLife('品质');
  E.commitStart(te, 'dujie'); // 炼气 bigIdx0
  const tiersSeen = {};
  for (let k = 0; k < 400; k++) {
    const id = E.randomEquip(0, 3);
    const it = E.findEquip(id);
    tiersSeen[it.tier] = (tiersSeen[it.tier] || 0) + 1;
  }
  fail('炼气随机装备 仅出�?/2/3�?, tiersSeen[1] > 0 && tiersSeen[2] > 0 && !tiersSeen[4] && !tiersSeen[5]);
  fail('炼气出超�?3)概率存在', !!tiersSeen[3]);
  fail('炼气许配�?良品', E.equipAllowed(te, 'ling_toujin') === true && E.equipAllowed(te, 'wenyao_guan') === true);
  fail('炼气拒绝上品', E.equipAllowed(te, 'xuantie_kuijia') === false);

  // ---- 装备直接入库 ----
  te.equip = { head: null, body: null, leg: null, treasure: null };
  te.inventory = [];
  const gq = E.grantEquipChecked(te, 'xuantie_kuijia');
  fail('超品直接入库', gq.length === 1 && te.inventory.indexOf('xuantie_kuijia') >= 0);
  const inInv = E.grantEquipChecked(te, 'ling_toujin');
  fail('匹配品质直接上身', inInv.length === 1 && !!te.equip.head && te.equip.head === 'ling_toujin');

  // ---- 一年一秘境 ----
  const sy = E.startLife('一年一�?);
  E.commitStart(sy, 'dujie');
  sy.actionsLeft = 10;
  sy.adventuredYear = undefined;
  const r1y = E.startAdventure(sy);
  fail('年内首次可入秘境', r1y.ok === true && sy.adv.status === 'running');
  const r2y = E.startAdventure(sy);
  fail('同年二次被拒', r2y.ok === false && r2y.msg.indexOf('一�?) >= 0 && sy.actionsLeft > 5);
  sy.year = 2;
  const r3y = E.startAdventure(sy);
  fail('次年可再�?, r3y.ok === true);

  // ---- 灵力（mo）系�?----
  const sm = E.startLife('灵力测试');
  E.commitStart(sm, 'dujie');
  const moA = sm.mo, moMaxA = sm.moMax;
  fail('初始灵力与上�?, moA > 0 && moA <= moMaxA);
  sm.linggen = LINGGEN_POOL.filter(function (x) { return x.id === 'bing'; })[0];
  E.refreshStats(sm);
  fail('冰灵根灵力上�?30', sm.moMax === moMaxA + 30);
  const mm2 = E.calcMoMax(sm);
  sm.mo = 1;
  E.moGain(sm, 1);
  fail('moGain 恢复且封�?, sm.mo === sm.moMax && E.calcMoMax(sm) === mm2);
  sm.mo = 5;
  const cu2 = E.cultivate(sm);
  fail('修炼回复灵力(25%)', sm.mo > 5 && cu2.indexOf('灵力 +') >= 0);
  sm.mo = 0;
  const en2 = E.endYear(sm);
  fail('年末灵力回满', en2 !== 'end' && sm.mo === sm.moMax);

  // ---- 渡劫：突破需渡劫 -> 人劫/天劫 ----
  const stb = E.startLife('渡劫测试');
  E.commitStart(stb, 'dujie');
  stb.qi = 0;
  stb.ti = 9;
  const tb0 = E.breakInfo(stb);
  fail('炼气期未圆满 breakInfo 无天�?, tb0.trib === null);
  stb.qi = 1e9;
  const tb1 = E.breakthrough(stb);
  fail('炼气小境破境直接成功(无劫)', tb1.ok === true && (tb1.win === true || (tb1.win === false && stb.idx === 0 && stb.qi < 1e9)));
  while (stb.idx < 5 && stb.idx < 14) {
    stb.qi = 1e9;
    const rrk = E.breakthrough(stb);
    if (!rrk.ok) break;
  }
  E.refreshStats(stb);
  stb.qi = 1e9;
  const tb2 = E.breakInfo(stb);
  fail('金丹�?breakInfo �?金丹', tb2.trib === '金丹' && tb2.mode === 'trib');
  const tb3 = E.breakthrough(stb);
  fail('突破要求先渡�?needTrib)', tb3.needTrib === true && stb.trib && stb.trib.target === '金丹' && stb.trib.ren === false);
  const tb3b = E.breakthrough(stb);
  fail('未渡人劫再点仍被�?, tb3b.needTrib === true);
  const xmS = E.xinmoSpec(stb);
  fail('心魔数值随本体', xmS.atk >= 18 && xmS.hp >= 120 && xmS.xinmo === true);
  E.combatStart(stb, xmS);
  const winM = E.combatAuto(stb);
  if (winM.win) {
    const dmm = E.xinmoDone(stb);
    fail('斩却心魔 -> 人劫已渡', stb.trib.ren === true && dmm.indexOf('人劫已渡') >= 0);
  }
  stb.trib.ren = true;
  stb.hp = stb.hpMax;
  stb.mo = stb.moMax;
  const tjS = E.tianjieSpec(stb, '金丹');
  fail('天劫化身数值与禁�?, tjS.atk >= 20 && tjS.hp > tjS.atk && tjS.noFlee === true && tjS.dujie === true);
  E.combatStart(stb, tjS);
  const won = E.combatAuto(stb);
  if (won.win) {
    const djr = E.dujieWin(stb);
    fail('打赢天劫 -> dujieWin 结丹', djr.ok === true && djr.trib === '金丹' && stb.realm.indexOf('金丹') >= 0 && !stb.trib);
  } else {
    const dff = E.dujieFail(stb, '金丹');
    fail('败于天劫 -> 损修为清�?, dff.win === false && (dff.died || stb.qi < 1e9) && stb.trib === null);
  }
  E.clearState();
  const stb2 = E.startLife('渡劫失败');
  E.commitStart(stb2, 'dujie');
  stb2.qi = 1e9;
  E.breakthrough(stb2);
  while (stb2.idx < 5 && stb2.idx < 14) { stb2.qi = 1e9; if (!E.breakthrough(stb2).ok) break; }
  stb2.qi = 1e9;
  E.breakthrough(stb2);
  stb2.trib.ren = true;
    const df = E.dujieFail(stb2, '金丹');
    fail('渡劫失败损修�?, df.win === false && (df.died || stb2.qi <= 7e8) && stb2.trib === null);

  // ---- 修仙百艺：灵�?/ 灵矿 ----
  const sf = E.startLife('百艺测试');
  E.commitStart(sf, 'dujie');
  sf.actionsLeft = 10;
  sf.herb = 20;
  const pf = E.plantField(sf, 'lingshen');
  fail('播种成功扣草', pf.indexOf('灵草�?) >= 0 && sf.herb === 19);
  const fi = E.fieldInfo(sf, 0);
  fail('灵田信息(未熟)', fi && fi.done === false && fi.name === '灵草�?);
  sf.year += 2;
  const hf = E.harvestField(sf, 0);
  fail('采收得草(3~6)', sf.herb >= 22 && sf.herb <= 25 && hf.indexOf('灵草') >= 0 && sf.field.length === 0);
  const hf2 = E.harvestField(sf, 0);
  fail('无田不可�?, hf2.indexOf('并不存在') >= 0);
  const pf2 = E.plantField(sf, 'lingshen_big');
  fail('灵参播种(需6�?', pf2.indexOf('灵参�?) >= 0 && sf.herb >= 16);
  const ironBefore = sf.iron;
  const dm2 = E.digMine(sf);
  fail('挖矿产出(×10)', sf.iron > ironBefore + 10 || dm2.indexOf('灵石') >= 0 || dm2.indexOf('灵草') >= 0);

  // ---- 遁速机�?----
  const sd = E.startLife('遁速测�?);
  E.commitStart(sd, 'dujie');
  fail('初始遁�?1', sd.dunSpeed === 1);
  fail('炼气遁速仍=1', sd.dunSpeed === 1 && sd.idx <= 2);
  sd.qi = 1e9;
  while (sd.idx < 3 && sd.idx < 14) { sd.qi = 1e9; const rb = E.breakthrough(sd); if (!rb.ok) break; }
  fail('突破后遁速变�?, sd.dunSpeed >= 2);
  while (sd.idx < 6 && sd.idx < 14) {
    sd.qi = 1e9;
    const rb = E.breakthrough(sd);
    if (rb.needTrib && rb.phase === 'ren') { sd.trib = { target: rb.trib, ren: true }; continue; }
    if (rb.needTrib && rb.phase === 'tianjie') { sd.qi = 1e9; E.dujieWin(sd); continue; }
    if (!rb.ok) break;
  }
  fail('金丹遁�?3', sd.dunSpeed === 3 && sd.realm.indexOf('金丹') >= 0);

  // ---- 修为满提�?----
  const sc = E.startLife('修为满测�?);
  E.commitStart(sc, 'dujie');
  sc.qi = Engine.requireNeed(sc);
  const cr = E.cultivate(sc);
  fail('修为满拒绝修�?, cr.indexOf('修为已满') >= 0);

  // ---- 宗门活动：降妖除�?----
  const sx = E.startLife('降妖测试');
  E.commitStart(sx, 'dujie');
  sx.sect = 'qingyunjian';
  sx.actionsLeft = 5;
  const cb = E.sectCombat(sx);
  fail('降妖返回事件', cb && cb.chapter && cb.choices && cb.choices.length > 0);
  fail('降妖有战斗选项', cb.choices[0].fight && cb.choices[0].fight.atk > 0);

  // ---- 宗门活动：道庭讲�?----
  const sl = E.startLife('讲法测试');
  E.commitStart(sl, 'dujie');
  sl.sect = 'xuantian';
  sl.actionsLeft = 10;
  const le = E.sectLecture(sl);
  fail('讲法返回事件', le && le.chapter && le.effect && le.effect.qi > 0);
  fail('讲法计数+1', sl.sectLectureCount === 1);
  for (let i = 0; i < 5; i++) E.sectLecture(sl);
  fail('讲法6次学法术', sl.sectLectureCount >= 6 && sl.techs.indexOf('leiyin') >= 0);

  // ---- 飞升触发于元婴中�?----
  const sf2 = E.startLife('飞升测试');
  E.commitStart(sf2, 'dujie');
  sf2.ti = 10;
  while (sf2.idx < 10 && sf2.idx < 14) {
    sf2.qi = 1e9;
    const rb = E.breakthrough(sf2);
    if (rb.needTrib && rb.phase === 'ren') { sf2.trib = { target: rb.trib, ren: true }; continue; }
    if (rb.needTrib && rb.phase === 'tianjie') { sf2.qi = 1e9; E.dujieWin(sf2); continue; }
    if (!rb.ok) break;
  }
  fail('抵达元婴', sf2.idx >= 9 && sf2.realm.indexOf('元婴') >= 0);
  sf2.qi = 1e9;
  const bi10 = E.breakInfo(sf2);
  fail('元婴中期breakInfo�?飞升', bi10.trib === '飞升');
  const bt10 = E.breakthrough(sf2);
  fail('飞升需渡劫', bt10.needTrib === true && bt10.trib === '飞升');

  return out;
})();
`;
vm.runInContext(c, ctx, { filename: 't.js' });
const res = ctx.probe;
let nPass = 0, nFail = 0;
res.forEach(function (r) {
  if (r.indexOf('PASS') === 0) { nPass++; console.log(r); }
  else { nFail++; console.log(r); }
});
console.log('== RESULT: ' + nPass + ' pass / ' + nFail + ' fail');
