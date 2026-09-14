/* DEDAO 轮回天赋加满测算 + 高劫最终加成（收敛版）
   纠正：之前误把 REINC_TALENT(开荒池加成)当全部；真实系统是 REINCARNATION 天赋树。
   成本公式（ui.js:5058 实装）：第 n 级花费 = r.cost × n；
   单天赋满级成本 = r.cost × (1+2+...+max) = r.cost × max(max+1)/2。 */

// 真实 REINCARNATION（data.js）
// 2026-09-14 同步：殷实/见面礼/延寿 → 移入开荒「三 · 经历」(INIT_EXP)；舍生 / 大千命格 → 已删除
const REINC = [
  { id:'wu',   name:'慧根',   cost:6, max:5 }, { id:'ti',   name:'强体',   cost:3, max:5 },
  { id:'dun',  name:'灵步',   cost:3, max:5 }, { id:'shen', name:'神念',   cost:3, max:5 },
  { id:'dao',  name:'定心',   cost:6, max:5 }, { id:'ling', name:'灵海',   cost:3, max:5 },
  { id:'cult', name:'道种',   cost:6, max:5 }, { id:'alchemy',name:'丹心',  cost:3, max:3 },
  { id:'forge',name:'器魂',   cost:3, max:3 }, { id:'lvling_bottle',name:'小绿瓶',cost:3,max:3 },
  { id:'extra_field',name:'随身灵田',cost:3, max:3 }, { id:'destiny_slot',name:'我命由我',cost:12,max:1 },
  { id:'destiny_lock',name:'天命锁定',cost:12,max:1 }, { id:'xianling',name:'先天灵宝',cost:5, max:3 }
];
const SIX = ['wu','ti','dun','shen','dao','ling'];
/* 开荒「三 · 经历」（INIT_EXP，2026-09-14 新增）：固定点数、二值选择；早夭为负值（增加预算） */
const INIT_EXP_SIM = [
  { id:'stone',   name:'殷实',   cost:  3, apply:'灵石 +500' },
  { id:'juling0', name:'见面礼', cost:  4, apply:'聚气丹 ×3' },
  { id:'life20',  name:'延寿',   cost:  2, apply:'寿元 +20' },
  { id:'zaoyao',  name:'早夭',   cost: -3, apply:'寿元 -20' }
];
function talentMaxCost(r){ let s=0; for(let n=1;n<=r.max;n++) s += r.cost*n; return s; }

console.log('========== 1. 轮回天赋(REINCARNATION)各满级成本 ==========');
let sixTotal=0, allTotal=0;
REINC.forEach(r=>{
  const c = talentMaxCost(r);
  allTotal += c;
  if (SIX.includes(r.id)) sixTotal += c;
  console.log((r.name+'('+r.id+')').padEnd(14)+' cost'+r.cost+'×max'+r.max+' → 满级 '+String(c)+' 点');
});
console.log('---');
console.log('六维核心(慧根/强体/灵步/神念/定心/灵海)全满 = '+sixTotal+' 点');
console.log('全部天赋拉满 = '+allTotal+' 点');
console.log('验证：道心(定心)90 + 悟性(慧根)90 = 180 点 ✓（与反馈一致）');

// ===== 重做版 earnPoints（不翻倍成就 + 收敛高劫最终加成）=====
const REALM_TIER = { 炼气:2, 筑基:4, 金丹:7, 元婴:11, 仙:25 };
const ACH_PTS = {
  shou_zhuji:2, shou_jiejin:3, shou_yuanying:4, feisheng:10,
  daolu:2, shou_zhong:1, binjie_3:3, ai_renzi:2,
  chu_tan:1, collector:6, yishixian:4, wudao:5, baijia:3, changsheng:3, sanxiu:4
};
const ADV_PTS = { 黄:2, 玄:4, 地:7, 天:11, 仙:15 };
function advPoints(realm, cleared){
  let p=0; cleared.forEach(t=>p+=ADV_PTS[t]);
  const n=cleared.length;
  if(n>=4)p+=8; else if(n>=3)p+=4; else if(n>=2)p+=2;
  return Math.min(p, REALM_TIER[realm]*2);
}
function earn(state, K){
  const realm = REALM_TIER[state.realm];
  const trib = Math.min(10, Math.floor(state.broken/3));
  const death = (state.deathPassed||0)*2;
  const adv = advPoints(state.realm, state.cleared||[]);
  let achPts=0; for(const id of Object.keys(state.ach||{})) achPts+=(ACH_PTS[id]||0);
  const base = realm + trib + death + adv + achPts;
  const jie = state.jie||0;
  // 收敛高劫加成：比例形式 base×jie×K（替代原 flat jie×5，消除低阶膨胀）
  let pts = Math.round(base*(1+jie*0.2)) + Math.round(base*jie*K);  // 高劫最终加成：比例形式 base×jie×K；原 jie×2 平加已删除
  return { pts, base };
}

const SCEN = [
  { tag:'炼气初陨', realm:'炼气', broken:0, deathPassed:0, cleared:['黄'], ach:{chu_tan:1,shou_zhong:1} },
  { tag:'筑基陨',   realm:'筑基', broken:1, deathPassed:1, cleared:['黄','玄'], ach:{shou_zhuji:1,daolu:1,shou_zhong:1} },
  { tag:'金丹陨',   realm:'金丹', broken:3, deathPassed:2, cleared:['黄','玄','地'], ach:{shou_zhuji:1,shou_jiejin:1,daolu:1,shou_zhong:1,sanxiu:1} },
  { tag:'元婴陨',   realm:'元婴', broken:5, deathPassed:4, cleared:['黄','玄','地','天'], ach:{shou_zhuji:1,shou_jiejin:1,shou_yuanying:1,daolu:1,shou_zhong:1,sanxiu:1,changsheng:1} },
  { tag:'飞升',     realm:'仙',   broken:9, deathPassed:4, cleared:['黄','玄','地','天','仙'], ach:{shou_zhuji:1,shou_jiejin:1,shou_yuanying:1,feisheng:1,daolu:1,shou_zhong:1,sanxiu:1,changsheng:1,chu_tan:1,collector:1,yishixian:1,wudao:1,baijia:1} },
];

const K = 0.05; // 高劫最终加成系数（用户拍板 0.05）；原 jie×2 平加已删除
console.log('\n========== 2. 各场景单局收益（重做版·成就不翻倍·高劫比例加成 K=0.05·已删 jie×2） ==========');
console.log('--- 高劫最终加成：每劫额外 +round(base×'+K+')；原"叠劫 jie×2 平加"已删除 ---');
console.log('场景'.padEnd(10)+'| jie0'.padStart(5)+' | jie3'.padStart(5)+' | jie6'.padStart(5)+' | jie9'.padStart(5));
SCEN.forEach(s=>{
  const e0=earn({...s,jie:0},K).pts, e3=earn({...s,jie:3},K).pts, e6=earn({...s,jie:6},K).pts, e9=earn({...s,jie:9},K).pts;
  console.log(s.tag.padEnd(8)+' | '+String(e0).padStart(5)+' | '+String(e3).padStart(5)+' | '+String(e6).padStart(5)+' | '+String(e9).padStart(5));
});

console.log('\n========== 3. 加满所需局数（每局稳定达成该场景，忽略 reroll 消耗） ==========');
console.log('--- 目标A：六维核心全满('+sixTotal+'点) | 目标B：全部天赋全满('+allTotal+'点) ---');
console.log('场景'.padEnd(10)+'| jie0_A'.padStart(7)+' | jie9_A'.padStart(7)+' | jie0_B'.padStart(7)+' | jie9_B'.padStart(7));
SCEN.forEach(s=>{
  const e0=earn({...s,jie:0},K).pts, e9=earn({...s,jie:9},K).pts;
  console.log(s.tag.padEnd(8)+' | '+String(Math.ceil(sixTotal/e0)).padStart(7)+' | '+String(Math.ceil(sixTotal/e9)).padStart(7)+' | '+String(Math.ceil(allTotal/e0)).padStart(7)+' | '+String(Math.ceil(allTotal/e9)).padStart(7));
});

console.log('\n========== 4. 现实 progression 区间 ==========');
const avgLow=(earn({...SCEN[0],jie:0},K).pts+earn({...SCEN[1],jie:0},K).pts)/2;
const avgMid=(earn({...SCEN[2],jie:0},K).pts+earn({...SCEN[3],jie:0},K).pts)/2;
console.log('六维全满('+sixTotal+'点)：保守(均~'+avgLow.toFixed(0)+'/局)≈'+Math.ceil(sixTotal/avgLow)+'局；中性(均~'+avgMid.toFixed(0)+'/局)≈'+Math.ceil(sixTotal/avgMid)+'局');
console.log('全天赋全满('+allTotal+'点)：保守≈'+Math.ceil(allTotal/avgLow)+'局；中性≈'+Math.ceil(allTotal/avgMid)+'局');
