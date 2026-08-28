/* ============================================================
   DEDAO 得道 —— 数据与文案库
   ============================================================ */

/* ---------------- 境界体系：15 小阶（5 大境界 × 前中后期） ---------------- */
const STAGES = [];
const REALM_META = {
  '炼气': { color: '#b8b8c8', sym: 'Ⅰ', life: 150,  atk: 0,  hp: 0 },
  '筑基': { color: '#4ec9a0', sym: 'Ⅱ', life: 250,  atk: 1,  hp: 1 },
  '金丹': { color: '#e8c15a', sym: 'Ⅲ', life: 400,  atk: 2,  hp: 2 },
  '元婴': { color: '#b26de0', sym: 'Ⅳ', life: 700,  atk: 3,  hp: 3 },
  '仙':   { color: '#e8c15a', sym: 'Ⅵ', life: 9999, atk: 5,  hp: 5 }
};
const NEED = [
  500, 800, 1200,           // 炼气 前中后
  1200, 1600, 2100,         // 筑基 前中后
  3800, 4800, 6200,         // 金丹 前中后
  12000, 15000, 19000       // 元婴 前中后
];
const SUB_NAMES = ['前期', '中期', '后期'];
(function () {
  ['炼气', '筑基', '金丹', '元婴'].forEach(function (r) {
    for (let s = 0; s < 3; s++) STAGES.push({ idx: STAGES.length, realm: r, sub: SUB_NAMES[s] });
  });
  STAGES.forEach(function (st) {
    st.color = REALM_META[st.realm].color;
    st.sym = REALM_META[st.realm].sym;
    st.need = NEED[st.idx];
    st.bigRealm = ['炼气', '筑基', '金丹', '元婴'].indexOf(st.realm);
  });
})();
const BIG_REALMS = ['炼气','筑基','金丹','元婴'];
const BIG_IDX = function (realm) { return BIG_REALMS.indexOf(realm); };
const TRIBULATIONS = ['金丹','元婴','飞升'];   // 大劫名单

/* ---------------- 丹药 ---------------- */
const ELIXIRS = {
  juling:   { name: '聚气丹',   desc: '修炼时自动服用，此次修炼收益加倍。' },
  zhuji:    { name: '筑基丹',   desc: '突破筑基时自动服用，成功率 +25%。' },
jiejin:   { name: '结金丹', desc: '突破金丹渡劫时自动服用，成功率 +25%。' },
  yuanying: { name: '元婴丹', desc: '突破元婴渡劫时自动服用，成功率 +25%。' },
  zengshou: { name: '增寿丹',   desc: '服用后寿元 +50。' },
  wudao:    { name: '悟道丹',   desc: '服用后道心通明，悟性 +1。' }
};
const BREAK_ELIXIR = { 筑基: 'zhuji', 金丹: 'jiejin', 元婴: 'yuanying' };

/* ---------------- 灵物（秘境BOSS掉落，用于完美突破） ---------------- */
const SPIRIT_ITEMS = {
  shangpin_lingjing: {
    name: '上品灵晶',
    grade: '黄',
    desc: '蕴含纯净灵气的晶石，突破筑基时使用可完美突破。',
    effect: '灵力上限 +100',
    apply: { moMax: 100 }
  },
  shangpin_yaodan: {
    name: '上品妖丹',
    grade: '玄',
    desc: '千年妖兽凝聚的内丹，突破金丹时使用可完美突破。',
    effect: '气血上限 +300',
    apply: { hpMax: 300 }
  },
  dongxu_micui: {
    name: '洞虚秘淬',
    grade: '地',
    desc: '洞天深处孕育的神秘液体，突破元婴时使用可完美突破。',
    effect: '修炼30%几率双倍修为',
    apply: { doubleCult: 0.3 }
  },
  mohex_suibian: {
    name: '魔核碎片',
    grade: '天',
    desc: '魔祖核心碎裂的碎片，飞升时使用可完美突破。',
    effect: '法术和攻击50%几率双倍伤害',
    apply: { doubleDmg: 0.5 }
  }
};

// 灵物与境界对应
const SPIRIT_FOR_REALM = {
  筑基: 'shangpin_lingjing',
  金丹: 'shangpin_yaodan',
  元婴: 'dongxu_micui',
  飞升: 'mohex_suibian'
};

// 丹药等级对应突破效果
const ELIXIR_GRADE_HP = {
  '黄': 50,
  '玄': 100,
  '地': 300,
  '天': 500
};

/* ---------------- 功法：心法（修行） / 法术（招式） / 遁术（身法） ---------------- */
// 五行相克：金→木→土→水→火→金
const ELEMENT_COUNTER = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };
const TECHNIQUES = {
  /* ========== 心法：修炼加成 ========== */
  // --- 通用五行心法(黄) ---
  jingang:   { name: '金刚诀',   cls: 'xinfa', grade: '黄', mult: 1.20, element: '金', desc: '刚猛无铸，金气贯体。' },
  qingmu:    { name: '青木功',   cls: 'xinfa', grade: '黄', mult: 1.20, element: '木', desc: '青木生机，气机流转。' },
  xuanshui:  { name: '玄水诀',   cls: 'xinfa', grade: '黄', mult: 1.20, element: '水', desc: '上善若水，润泽经脉。' },
  chihuo:    { name: '赤火功',   cls: 'xinfa', grade: '黄', mult: 1.20, element: '火', desc: '烈焰焚天，以火炼体。' },
  houtu:     { name: '厚土诀',   cls: 'xinfa', grade: '黄', mult: 1.20, element: '土', desc: '厚德载物，稳如泰山。' },
  // --- 通用五行心法(玄) ---
  tiangang:  { name: '天罡诀',   cls: 'xinfa', grade: '玄', mult: 1.50, element: '金', desc: '引天罡正气，浩然沛然。' },
  changchun: { name: '长春功',   cls: 'xinfa', grade: '玄', mult: 1.50, element: '木', desc: '生机绵绵，如草木长春。' },
  taiyin:    { name: '太阴诀',   cls: 'xinfa', grade: '玄', mult: 1.50, element: '水', desc: '太阴之气，润物无声。' },
  chunyang:  { name: '纯阳功',   cls: 'xinfa', grade: '玄', mult: 1.50, element: '火', desc: '纯阳之气，焚尽阴邪。' },
  kunyuan:   { name: '坤元诀',   cls: 'xinfa', grade: '玄', mult: 1.50, element: '土', desc: '坤元厚德，承载万物。' },
  // --- 通用五行心法(地) ---
  gengjin:   { name: '庚金诀',   cls: 'xinfa', grade: '地', mult: 1.80, element: '金', desc: '庚金之气，锐不可当。' },
  yimu:      { name: '乙木诀',   cls: 'xinfa', grade: '地', mult: 1.80, element: '木', desc: '乙木生机，生生不息。' },
  guishui:   { name: '癸水诀',   cls: 'xinfa', grade: '地', mult: 1.80, element: '水', desc: '癸水之精，润泽万物。' },
  binghuo:   { name: '丙火诀',   cls: 'xinfa', grade: '地', mult: 1.80, element: '火', desc: '丙火之威，焚天灭地。' },
  wutu:      { name: '戊土诀',   cls: 'xinfa', grade: '地', mult: 1.80, element: '土', desc: '戊土之厚，镇压四方。' },
  // --- 通用五行心法(天) ---
  baihu:     { name: '白虎诀',   cls: 'xinfa', grade: '天', mult: 2.30, element: '金', desc: '白虎主杀，金气冲霄。' },
  qinglong:  { name: '青龙诀',   cls: 'xinfa', grade: '天', mult: 2.30, element: '木', desc: '青龙盘踞，万木回春。' },
  xuanwu:    { name: '玄武诀',   cls: 'xinfa', grade: '天', mult: 2.30, element: '水', desc: '玄武镇北，水火不侵。' },
  zhuque:    { name: '朱雀诀',   cls: 'xinfa', grade: '天', mult: 2.30, element: '火', desc: '朱雀涅槃，浴火重生。' },
  qilin:     { name: '麒麟诀',   cls: 'xinfa', grade: '天', mult: 2.30, element: '土', desc: '麒麟踏云，厚德无疆。' },
  // --- 仙级心法 ---
  kaitian:   { name: '开天篇',   cls: 'xinfa', grade: '仙', mult: 3.00, desc: '盘古遗篇，一斧开天。' },
  // --- 通用心法（商店/掉落） ---
  tunai:    { name: '吐纳术',   cls: 'xinfa', grade: '黄', mult: 1.10, desc: '最基础的吐纳之法，引气入体。' },
  shengong:  { name: '生息功',   cls: 'xinfa', grade: '黄', mult: 1.15, desc: '吐纳生息，气机绵长。' },
  taixuan:   { name: '太玄经',   cls: 'xinfa', grade: '地', mult: 1.80, desc: '太玄妙法，道法自然。' },
  hundun:    { name: '混沌诀',   cls: 'xinfa', grade: '天', mult: 2.30, desc: '混沌初开，万法归宗。' },
  // --- 宗门心法：青云剑宗 ---
  qy_xinfa1: { name: '青云剑诀', cls: 'xinfa', grade: '黄', mult: 1.20, sect: 'qingyunjian', atkMul: 0.05, desc: '剑气贯体，攻伐初显。' },
  qy_xinfa2: { name: '御剑心法', cls: 'xinfa', grade: '玄', mult: 1.50, sect: 'qingyunjian', atkMul: 0.10, desc: '御剑凌空，剑意通神。' },
  qy_xinfa3: { name: '剑魂心经', cls: 'xinfa', grade: '地', mult: 1.80, sect: 'qingyunjian', atkMul: 0.15, spellMul: 0.05, desc: '人剑合一，剑魂觉醒。' },
  qy_xinfa4: { name: '太虚剑典', cls: 'xinfa', grade: '天', mult: 2.30, sect: 'qingyunjian', atkMul: 0.20, spellMul: 0.10, desc: '太虚剑道，万法归一。' },
  // --- 宗门心法：丹霞谷 ---
  dx_xinfa1: { name: '丹霞心法', cls: 'xinfa', grade: '黄', mult: 1.20, sect: 'dpxia', desc: '以丹入道，初窥门径。' },
  dx_xinfa2: { name: '火灵心经', cls: 'xinfa', grade: '玄', mult: 1.50, sect: 'dpxia', atkMul: 0.05, desc: '丹火通灵，威力初显。' },
  dx_xinfa3: { name: '丹道真解', cls: 'xinfa', grade: '地', mult: 1.80, sect: 'dpxia', atkMul: 0.10, craftTimeReduce: 1, desc: '丹道大成，炼丹如神。' },
  dx_xinfa4: { name: '九转丹典', cls: 'xinfa', grade: '天', mult: 2.30, sect: 'dpxia', atkMul: 0.15, craftTimeReduce: 1, desc: '九转金丹，道法自然。' },
  // --- 宗门心法：玄天门 ---
  xt_xinfa1: { name: '玄天心法', cls: 'xinfa', grade: '黄', mult: 1.20, sect: 'xuantian', guard: 0.05, desc: '阵法护体，初入门墙。' },
  xt_xinfa2: { name: '护山心经', cls: 'xinfa', grade: '玄', mult: 1.50, sect: 'xuantian', guard: 0.10, hpMax: 50, desc: '护山大阵，固若金汤。' },
  xt_xinfa3: { name: '天罡心法', cls: 'xinfa', grade: '地', mult: 1.80, sect: 'xuantian', guard: 0.15, hpMax: 100, desc: '天罡正气，万邪不侵。' },
  xt_xinfa4: { name: '玄武真经', cls: 'xinfa', grade: '天', mult: 2.30, sect: 'xuantian', guard: 0.20, hpMax: 150, reduceDmg: 0.05, desc: '玄武真身，不朽不灭。' },

  /* ========== 法术：战斗招式 ========== */
  // --- 黄级法术 ---
  jinren:    { name: '金刃术',   cls: 'shufa', grade: '黄', element: '金', dmg: 3.0,  cost: 15, desc: '金气化刃，斩敌经脉。' },
  tengman:   { name: '藤蔓术',   cls: 'shufa', grade: '黄', element: '木', dmg: 2.5,  cost: 12, debuff: { atkDown: 20, duration: 2 }, desc: '藤蔓缠绕，令敌行动迟缓。' },
  shuidan:   { name: '水弹术',   cls: 'shufa', grade: '黄', element: '水', dmg: 2.8,  cost: 14, desc: '水气凝聚，化弹击敌。' },
  huoqiu:    { name: '火球术',   cls: 'shufa', grade: '黄', element: '火', dmg: 2.5,  cost: 13, buff: { atkUp: 20, duration: 3 }, desc: '火球焚身，烈焰加护。' },
  luoshi:    { name: '落石术',   cls: 'shufa', grade: '黄', element: '土', dmg: 2.5,  cost: 13, buff: { defUp: 20, duration: 2 }, desc: '巨石压顶，土气护体。' },
  yuhuo:     { name: '御火诀',   cls: 'shufa', grade: '黄', element: '火', dmg: 2.5,  cost: 13, desc: '御火之术，焚尽万物。' },
  hanshuang: { name: '凝霜诀',   cls: 'shufa', grade: '黄', element: '水', dmg: 2.5,  cost: 13, desc: '凝霜化冰，寒气逼人。' },
  leiyin:    { name: '雷音引',   cls: 'shufa', grade: '黄', element: '金', dmg: 2.5,  cost: 13, desc: '雷音震耳，破敌心神。' },
  jianqi:    { name: '剑气诀',   cls: 'shufa', grade: '黄', element: '金', dmg: 3.0,  cost: 15, desc: '剑气纵横，斩敌百步。' },
  // --- 玄级法术（攻击） ---
  jinguang:  { name: '金光剑',   cls: 'shufa', grade: '玄', element: '金', dmg: 4.0,  cost: 25, desc: '金光化剑，锐不可当。' },
  muyuling:  { name: '木灵治愈', cls: 'shufa', grade: '玄', element: '木', dmg: 0,    cost: 20, heal: 0.30, desc: '木灵之力，治愈创伤。' },
  hanbing:   { name: '寒冰刺',   cls: 'shufa', grade: '玄', element: '水', dmg: 3.5,  cost: 28, freeze: 1, desc: '寒冰刺骨，冻彻心扉。' },
  lieyan:    { name: '烈焰斩',   cls: 'shufa', grade: '玄', element: '火', dmg: 2.5,  cost: 22, buff: { atkUp: 20, duration: 3 }, desc: '烈焰缠身，攻伐加护。' },
  luoyan:    { name: '落岩术',   cls: 'shufa', grade: '玄', element: '土', dmg: 3.5,  cost: 26, desc: '巨岩轰击，势大力沉。' },
  // --- 玄级法术（抵御/恢复） ---
  jinguanghu: { name: '金光护体', cls: 'shufa', grade: '玄', element: '金', dmg: 0,   cost: 18, buff: { defUp: 30, duration: 3 }, desc: '金光护体，刀枪不入。' },
  shengji:    { name: '生机缠绕', cls: 'shufa', grade: '玄', element: '木', dmg: 0,   cost: 18, debuff: { atkDown: 25, duration: 2 }, desc: '生机缠绕，削弱敌势。' },
  shuilingshu: { name: '水灵术', cls: 'shufa', grade: '玄', element: '水', dmg: 0,   cost: 20, heal: 0.25, desc: '水灵之力，治愈创伤。' },
  huodun:     { name: '火盾术',   cls: 'shufa', grade: '玄', element: '火', dmg: 0,   cost: 18, buff: { defUp: 25, duration: 2 }, desc: '烈焰护盾，焚尽攻击。' },
  yanjia:     { name: '岩甲术',   cls: 'shufa', grade: '玄', element: '土', dmg: 0,   cost: 20, buff: { defUp: 40, duration: 3 }, desc: '岩石护甲，固若金汤。' },
  // --- 地级法术 ---
  wanjian:    { name: '万剑归宗', cls: 'shufa', grade: '地', element: '金', dmg: 5.5,  cost: 45, desc: '万剑齐鸣，天地失色。' },
  shengjiayang: { name: '生机盎然', cls: 'shufa', grade: '地', element: '木', dmg: 0,  cost: 40, heal: 0.50, desc: '生机盎然，枯木回春。' },
  xuanbing:   { name: '玄冰阵',   cls: 'shufa', grade: '地', element: '水', dmg: 4.0,  cost: 42, freeze: 2, desc: '玄冰大阵，冻彻天地。' },
  tianhuo:    { name: '天火焚城', cls: 'shufa', grade: '地', element: '火', dmg: 5.5,  cost: 45, desc: '天火降世，焚尽万物。' },
  shanyue:    { name: '山岳镇压', cls: 'shufa', grade: '地', element: '土', dmg: 3.5,  cost: 38, debuff: { atkDown: 30, duration: 3 }, desc: '山岳压顶，镇压四方。' },
  // --- 天级法术 ---
  potian:     { name: '破天一击', cls: 'shufa', grade: '天', element: '金', dmg: 7.0,  cost: 70, desc: '金光破天，一击必杀。' },
  wanmu:      { name: '万木回春', cls: 'shufa', grade: '天', element: '木', dmg: 0,    cost: 65, heal: 0.80, desc: '万木回春，枯木逢生。' },
  bingfeng:   { name: '冰封千里', cls: 'shufa', grade: '天', element: '水', dmg: 5.0,  cost: 75, freeze: 3, desc: '冰封千里，万物凝固。' },
  fantian:    { name: '焚天灭地', cls: 'shufa', grade: '天', element: '火', dmg: 7.0,  cost: 70, desc: '焚天灭地，烈焰滔天。' },
  dadi:       { name: '大地守护', cls: 'shufa', grade: '天', element: '土', dmg: 0,    cost: 60, buff: { defUp: 50, duration: 3 }, desc: '大地守护，万邪不侵。' },

  /* ========== 遁术：逃跑与防御 ========== */
  // --- 通用遁术 ---
  xiaoyao:   { name: '逍遥步',   cls: 'dunshu', grade: '黄', flee: 0.40, desc: '踏歌而行，来去如风。' },
  yingdun:   { name: '影遁术',   cls: 'dunshu', grade: '玄', flee: 0.60, guard: 0.10, desc: '身化残影，刀剑难近。' },
  suodi:     { name: '缩地成寸', cls: 'dunshu', grade: '地', flee: 1.00, guard: 0.20, desc: '一步千里，万军难留。' },
  // --- 青云剑宗遁术 ---
  qy_dun1:   { name: '剑影步',   cls: 'dunshu', grade: '黄', flee: 0.40, sect: 'qingyunjian', desc: '身随剑动，剑影随行。' },
  qy_dun2:   { name: '御剑飞行', cls: 'dunshu', grade: '玄', flee: 0.60, guard: 0.10, sect: 'qingyunjian', desc: '御剑凌空，逍遥天地。' },
  qy_dun3:   { name: '剑遁术',   cls: 'dunshu', grade: '地', flee: 0.80, guard: 0.15, sect: 'qingyunjian', desc: '人剑合一，瞬息千里。' },
  qy_dun4:   { name: '万剑归一', cls: 'dunshu', grade: '天', flee: 1.00, guard: 0.20, sect: 'qingyunjian', desc: '万剑归一，剑道极致。' },
  // --- 丹霞谷遁术 ---
  dx_dun1:   { name: '火遁术',   cls: 'dunshu', grade: '黄', flee: 0.40, sect: 'dpxia', desc: '借火遁形，烟消云散。' },
  dx_dun2:   { name: '烟火遁',   cls: 'dunshu', grade: '玄', flee: 0.60, guard: 0.10, sect: 'dpxia', desc: '烟雾弥漫，遁入无形。' },
  dx_dun3:   { name: '丹火遁',   cls: 'dunshu', grade: '地', flee: 0.80, guard: 0.15, sect: 'dpxia', desc: '丹火护体，浴火而遁。' },
  dx_dun4:   { name: '浴火遁',   cls: 'dunshu', grade: '天', flee: 1.00, guard: 0.20, sect: 'dpxia', desc: '浴火重生，凤凰涅槃。' },
  // --- 玄天门遁术 ---
  xt_dun1:   { name: '土遁术',   cls: 'dunshu', grade: '黄', flee: 0.40, sect: 'xuantian', desc: '借土遁形，遁地无形。' },
  xt_dun2:   { name: '石壁遁',   cls: 'dunshu', grade: '玄', flee: 0.60, guard: 0.10, sect: 'xuantian', desc: '石壁护身，固若金汤。' },
  xt_dun3:   { name: '阵遁术',   cls: 'dunshu', grade: '地', flee: 0.80, guard: 0.15, sect: 'xuantian', desc: '阵法传送，瞬息千里。' },
  xt_dun4:   { name: '天罡遁',   cls: 'dunshu', grade: '天', flee: 1.00, guard: 0.20, sect: 'xuantian', desc: '天罡护体，万法不侵。' }
};
const GRADE_COLOR = { 黄: '#c9a86a', 玄: '#6ab8c9', 地: '#a06ac9', 天: '#e05a7a', 仙: '#9adcff' };

/* ---------------- 法宝（炼器产物） ---------------- */
const ARTIFACTS = {
  // 黄级法宝
  qingfeng: { name: '青锋剑', type: '攻', grade: '黄', desc: '寒光三尺，取人首级于百步之外。', effect: '攻击 +20' },
  // 地级法宝
  yuewang_sword: { name: '越王勾践剑', type: '攻', grade: '地', desc: '千古名剑，锋芒毕露，斩妖除魔。', effect: '攻击 +50' },
  xuantie:  { name: '玄铁甲', type: '守', grade: '地', desc: '玄铁千锻，渡劫之时护住肉身。', effect: '气血 +150，天劫加护' },
  juling_art: { name: '聚灵珠', type: '辅', grade: '地', desc: '灵珠悬顶，天地灵气自聚。', effect: '修炼 +5%' },
  // 天级法宝
  jinylv:   { name: '金缕衣', type: '守', grade: '天', desc: '天蚕金丝所织，万法不侵。', effect: '渡劫成功率 +10%' }
};

/* ---------------- 材料与货币 ---------------- */
const MATERIALS = {
  herb:  { name: '灵草', emoji: '🌿' },
  herb_huang: { name: '黄级灵草', emoji: '🌿', grade: '黄' },
  herb_xuan:  { name: '玄级灵草', emoji: '🌿', grade: '玄' },
  herb_di:    { name: '地级灵草', emoji: '🌿', grade: '地' },
  herb_tian:  { name: '天级灵草', emoji: '🌿', grade: '天' },
  iron:  { name: '灵铁', emoji: '⚒' },
  iron_huang: { name: '黄级灵铁', emoji: '⚒', grade: '黄' },
  iron_xuan:  { name: '玄级灵铁', emoji: '⚒', grade: '玄' },
  iron_di:    { name: '地级灵铁', emoji: '⚒', grade: '地' },
  iron_tian:  { name: '天级灵铁', emoji: '⚒', grade: '天' },
  stone: { name: '灵石', emoji: '◇' }
};

/* ---------------- 炼器丹方（配方） ---------------- */
const FORMULAS = [
  // 黄级配方（炼气）
  { id: 'qingfeng', out: 'qingfeng', type: '法宝', cost: { iron_huang: 15 }, needRealm: 0, grade: '黄', years: 2 },
  { id: 'juling_pill', out: 'juling', type: '丹',  cost: { herb_huang: 5 },  needRealm: 0, grade: '黄', years: 1 },
  // 玄级配方（筑基）
  { id: 'xuantie',  out: 'xuantie',  type: '法宝', cost: { iron_xuan: 25 }, needRealm: 1, grade: '玄', years: 4 },
  { id: 'zhuji_pill', out: 'zhuji',  type: '丹',  cost: { herb_xuan: 10 }, needRealm: 1, grade: '玄', years: 3 },
  { id: 'zengshou_pill', out: 'zengshou', type: '丹', cost: { herb_xuan: 15 }, needRealm: 1, grade: '玄', years: 4 },
  // 地级配方（金丹）
  { id: 'juling_art',   out: 'juling',   type: '法宝', cost: { iron_di: 35 }, needRealm: 2, grade: '地', years: 6 },
  { id: 'jiejin_pill', out: 'jiejin', type: '丹',  cost: { herb_di: 20 }, needRealm: 2, grade: '地', years: 5 },
  { id: 'yuanying_pill', out: 'yuanying', type: '丹', cost: { herb_di: 30 }, needRealm: 2, grade: '地', years: 7 },
  // 天级配方（元婴）
  { id: 'jinylv',   out: 'jinylv',   type: '法宝', cost: { iron_tian: 50 }, needRealm: 3, grade: '天', years: 10 },
  { id: 'wudao_pill', out: 'wudao',  type: '丹',  cost: { herb_tian: 40 }, needRealm: 3, grade: '天', years: 8 }
];

/* ---------------- 灵田种子（百艺 · 种植） ---------------- */
const FIELD_SEEDS = {
  lingshen_huang: { name: '黄级灵草田', cost: 1, years: 1, gain: [3, 6], grade: '黄', desc: '种黄级灵草苗，一年后收3~6株。' },
  lingshen_xuan:  { name: '玄级灵草田', cost: 3, years: 2, gain: [4, 8], grade: '玄', desc: '种玄级灵草苗，两年后收4~8株。' },
  lingshen_di:    { name: '地级灵草田', cost: 6, years: 3, gain: [5, 10], grade: '地', desc: '种地级灵草苗，三年后收5~10株。' },
  lingshen_tian:  { name: '天级灵草田', cost: 10, years: 4, gain: [6, 12], grade: '天', desc: '种天级灵草苗，四年后收6~12株。' }
};

// 灵田产出映射
const FIELD_GRADE_MAP = { '黄': 'herb_huang', '玄': 'herb_xuan', '地': 'herb_di', '天': 'herb_tian' };

/* ---------------- 灵根 ---------------- */
const LINGGEN_POOL = [
  { id: 'shuang',   name: '水火双灵根', desc: '五行驳杂，修行平平。',      w: 46, qiMul: 1.0,  body: null },
  { id: 'shuang2',  name: '土木双灵根', desc: '中正平和，胜在扎实。',      w: 30, qiMul: 1.05, body: null },
  { id: 'jin',      name: '金灵根',     desc: '锐金之气，攻伐凌厉。',      w: 6,  qiMul: 1.25, body: { atk: 15 } },
  { id: 'mu',       name: '木灵根',     desc: '青木生机，生机勃勃。',      w: 6,  qiMul: 1.25, body: { hpMax: 80 } },
  { id: 'shui',     name: '水灵根',     desc: '润泽万灵，渡劫有福。',      w: 6,  qiMul: 1.25, body: { trib: 0.08, mo: 40 } },
  { id: 'huo',      name: '火灵根',     desc: '烈焰焚天，攻伐凌厉。',      w: 6,  qiMul: 1.25, body: { atk: 15 } },
  { id: 'tu',       name: '土灵根',     desc: '厚重如山，肉身强横。',      w: 6,  qiMul: 1.25, body: { hpMax: 80 } },
  { id: 'lei',      name: '雷灵根',     desc: '先天雷脉！渡劫天雷反成补益。', w: 3, qiMul: 1.5, body: { trib: 0.15 } },
  { id: 'feng',     name: '风灵根',     desc: '身随清风，轻灵缥缈。',      w: 3,  qiMul: 1.5, body: { quirk: 'feng' } },
  { id: 'bing',     name: '冰灵根',     desc: '玄冰彻骨，举世罕见。',      w: 3,  qiMul: 1.5, body: { atk: 20, trib: 0.05, mo: 30 } },
  { id: 'hundun',   name: '混沌灵体',   desc: '鸿蒙未判之气加身，万法归宗！', w: 1, qiMul: 2.0, body: { trib: 0.08, atk: 10 } }
];

/* ---------------- 开局天赋 ---------------- */
const TALENTS = [
  { id: 'daoti',   name: '天生道体',   desc: '天地灵气亲近你，修炼速度 +10%。',  apply: { cultMul: 0.1 } },
  { id: 'liancai', name: '炼丹奇才',   desc: '丹火亲和，炼丹成功率 +20%。',      apply: { alchemyMul: 0.2 } },
  { id: 'fuyuan',  name: '福缘深厚',   desc: '财源广进，获得灵石时 +10%。',      apply: { stoneMul: 0.10 } },
  { id: 'kejian',  name: '天生剑胚',   desc: '剑心通明，攻击 +20%。',           apply: { atkMul: 0.2 } },
  { id: 'shengji', name: '生生不息',   desc: '寿元 +40 载。',                   apply: { life: 40 } },
  { id: 'tongmei', name: '大智若愚',   desc: '大智若愚，初始悟性 +2。',         apply: { wu: 2 } },
  { id: 'qixue',   name: '气血充足',   desc: '先天体魄强健，体魄 +2。',         apply: { ti: 2 } }
];

/* ---------------- 名字彩蛋 ---------------- */
const EASTER_EGGS = {
  '韩立': { title: '凡人流祖师爷降临', effect: { wu: 1, linggen: 'mu' },
    text: '冥冥之中，一个手持小绿瓶的身影隔着万古朝你微微一笑。你觉得自己该去种点什么。' },
  '萧炎': { title: '白山老怪隔空点赞', effect: { ti: 1 },
    text: '三年前离去的纳兰……咳，你打了个喷嚏，指尖竟腾起一簇诡异的幽火。' },
  '王林': { title: '极境仙王一声冷哼', effect: { wu: 1 },
    text: '天地仿佛冷了一瞬。你耳畔响起四个字——"化凡，可入体悟。"' },
  '叶凡': { title: '荒古圣体遥遥感应', effect: { atk: 10 },
    text: '你胸口一热，心头明悟：肉身亦是一条大道。' },
  '徐缺': { title: '道祖露出一抹欣慰的笑容', effect: { ti: 1 },
    text: '你莫名觉得，做人要苟，考灵石要快，打架要狠。' },
  '陈平安': { title: '泥瓶巷的风吹了过来', effect: { wu: 1, ti: 1 },
    text: '天地之间，仿佛有剑鸣一声。' },
  '李长寿': { title: '长生大道为你让路', effect: { life: 30 },
    text: '你觉得，活得久，就是最大的赢。' }
};

/* ---------------- 出生背景 ---------------- */
const BACKGROUNDS = [
  {
    title: '山村少年',
    lines: [
      '你生在青州一个叫槐溪村的小地方。爹娘是老实巴交的农人，家里三亩薄田，一头老黄牛。',
      '七岁那年起，你便随着爹下地，麦子割了十几茬，手上的茧早就磨得很厚。',
      '村东头有个疯癫的算命先生，见你路过总说："这娃儿，眉宇间有股子别样的气。"',
      '爹听了只当是疯话，笑呵呵塞给先生一个饼子。',
      '十六岁这年，春耕时你弯腰拔起一株野草，忽然间——',
      '满山的朝霞流光都朝你涌了过来。'
    ],
    flavor: { stone: 30 }
  },
  {
    title: '世家庶子',
    lines: [
      '你是青州城赵家的庶子。母亲原是侍女，你自幼便懂得看人眼色。',
      '嫡兄的功课你替抄，嫡姐的婚事你来斟茶。族学里先生教过你《千字文》，其余皆靠你夜夜偷读。',
      '你总觉着，这世道欠你一道门——一道能让你头也不回离开的门。',
      '这日族中祭祖，祠堂里那根供奉百年的测灵柱忽然亮了一亮。',
      '满堂寂静。所有人的目光，都落在了你身上。'
    ],
    flavor: { wu: 1, stone: 50 }
  },
  {
    title: '遗孤',
    lines: [
      '你不知自己生来何处。残破襁褓、一枚褪色玉佩，是你在道观门口被拾起时仅有的一切。',
      '老道士把你养大，教你读经、煮药、治病救人，观星看命。他说你根骨清奇，又说你命数缠劫。',
      '十八岁这年，老道士将一碗水泼在你头顶，笑呵呵道：',
      '"水往低处流，人往高处走。去吧，去找你的来处，也找你的去处。"',
      '你背着那枚玉佩下了山。山脚下第一缕朝阳照在身上时，你忽然觉得——',
      '下了山的红尘，有趣得很。'
    ],
    flavor: { stone: 20, life: 20 }
  }
];

/* ---------------- 宗门 ---------------- */
const SECTS = {
  qingyunjian: { name: '青云剑宗', desc: '剑修云集，剑气纵横三千里。' , effect: { atkMul: 0.10 }, perk: '每十载宗门大比，胜者得灵石' },
  dpxia:      { name: '丹霞谷',   desc: '以丹入道，谷中灵田千顷。' ,    effect: { alchemyMul: 0.20 }, perk: '每十载分得灵丹十枚' },
  xuantian:   { name: '玄天门',   desc: '重守御，善阵法，护山罩如金钟。', effect: { cultMul: 0.10, hpMax: 100 }, perk: '师门阵法定你心，修炼有加护' }
};

/* ---------------- 渡劫文案 ---------------- */
const TRIBULATION_TEXTS = {
  金丹: {
    intro: [
      '丹田之中，金丹凝意已成。天地倏然色变——',
      '黑云压城，雷光在云层深处翻滚吞吐，仿佛一头愤怒的天龙。',
      '第一道天雷，轰然落下！'
    ],
    resultWin: '雷光散去，你浑身上下焦黑如炭，丹田中却结出一颗圆润金丹，光晕流转，天地灵气为之雀跃。\n你，金丹成矣。',
    resultLose: '天雷入体，经脉寸寸炸裂。你喷出一口逆血，倒跌下山崖——',
    failModes: ['这一劫，险些劈散你的道基。你身上焦痕满布，气息萎靡，修为折损四成。', '雷劫余威尚在，你撑着残躯，勉强保住了一条命。']
  },
  元婴: {
    intro: [
      '金丹之上，阳神欲出。你盘坐于峰顶，头顶的云海忽然化为一片紫红色的漩涡。',
      '这一次，劫云中响起了沉闷的鼓声——每一下都像敲在你的魂魄上。',
      '阴火自你丹田燃起，与天雷内外交攻！'
    ],
    resultWin: '劫云散，阳神出窍。婴啼一声，响彻百里山河，诸峰修士纷纷抬头。\n自此天地困不住你，元婴已成！',
    resultLose: '阴火焚身，阳神险些溃散。你七窍流血，坠向凡尘——',
    failModes: ['你在崖下躺了三天三夜，才勉强爬回洞府。元婴未成，道基已损。', '那一劫烧去了你半身精气，你花了很久才缓过气来。']
  },
  飞升: {
    intro: [
      '元婴圆满，天心已通。你抬头，看见九天之上垂落的登仙梯——',
      '那也是天道给修者的最后一道考题。成，则羽化登仙；败，则身死道消。',
      '地、水、火、风、心魔，五劫齐至！你放开全部防护，直面天劫。',
      '这一世的道与怨、因与果，尽在此一搏！'
    ],
    resultWin: '五劫尽灭，天门大开。你周身金光流转，仙乐自九霄传来。\n自此凡尘一别，天上人间——你，得道了。',
    resultLose: '天劫轰碎了你的道体，你仰望着那近在咫尺的天门，缓缓闭目——\n终究，差了一步。'
  }
};

/* ---------------- 宿命之战（岁满一百年） ---------------- */
const FATE_EVENT = {
  title: '魔渊之劫 · 宿命之战',
  lines: [
    '这一日，整个九州的天都灰了。',
    '魔渊裂开，七十二道魔气冲天而起。所有人都想起那个古老的预言——',
    '"魔渊既开，天道当哭。唯得道者，可镇之。"',
    '你望向天际那道漆黑的身影。身后，是无数的凡人、同门、亲人。',
    '你没有退路。'
  ],
  winLines: [
    '那一战，打得山河倒卷，打得日月无光。',
    '当你把那道黑影按回魔渊深处时，你听见自己骨骼寸断的声音，也听见了天地间亿万的欢呼。',
    '你以凡人之躯，镇住了魔渊。从此九州传唱你的名字，香火千年不断。',
    '……不必成仙，亦然得道。'
  ],
  loseLines: [
    '你败了。',
    '魔气贯穿胸膛的那一刻，你看见天地倒转，看见漫天都是火光。',
    '你闭上眼。"若有来世……"'    ]
};

/* ---------------- 普通事件库 ---------------- */
const EVENTS = { jiyuan: [], shejiao: [], mijing: [], year: [] };

function E(tag, ev) { ev.tag = tag; EVENTS[tag].push(ev); return ev; }

/* ================ 机缘 ================ */
E('jiyuan', {
  id: 'jishi_book', title: '集市旧书摊', chapter: true, weight: 8, min: 0, max: 2,
  lines: [
    '城中集市，一个破旧书摊前，掌柜正双目放光地盯着来往行人。',
    '你随手翻开一本纸页发黄的《引气初解》，书页间竟夹着一枚泛着微光的玉简。',
    '掌柜瞥了一眼："五十灵石，爱要不要。"'
  ],
  effect: { stone: -50, tech: function (s) {
    if (s.techs.indexOf('tunai') < 0) return 'tunai';
    const got = ['yuhuo', 'hanshuang'].filter(function (t) { return s.techs.indexOf(t) < 0; });
    return got.length ? got[Math.floor(Math.random() * got.length)] : null;
  } },
  result: '你买下书册。夜里翻开玉简，一道口诀流入识海——从此你与仙法结缘。\n（获得一本功法/法术）'
});
E('jiyuan', {
  id: 'leiyu_wudao', title: '雷雨悟道', chapter: true, weight: 6, min: 0, max: 14,
  lines: [
    '夜半雷雨大作，你披着蓑衣立在崖边，看闪电撕开夜幕。',
    '雷光将落的刹那，你忽然看懂了雨水的轨迹、风的呼啸、山间草木的一呼一吸。',
    '天地之间，自有大道。'
  ],
  effect: { qiMul: function () { return 1; }, qi: function (s) { return Math.round(requireNeed(s) * 0.25); } },
  result: '你心头豁然开朗，修为大涨，隐隐触到了这一层的瓶颈。'
});
E('jiyuan', {
  id: 'lingquan', title: '山涧灵泉', chapter: false, weight: 6, min: 0, max: 14,
  lines: ['你在山涧深处寻到一汪冒着白气的灵泉，泉眼处竟长着一株通体翠绿的草药。'],
  effect: { herb: 2, stone: 20 },
  result: '你采下灵草，又装了两葫芦泉水。'
});
E('jiyuan', {
  id: 'xuanya_dongfu', title: '断崖洞府', chapter: true, weight: 5, min: 2, max: 14,
  lines: [
    '为追一只受伤的白鹿，你失足跌下断崖。',
    '崖壁半空竟有一处被藤蔓遮住的洞口，里面石桌石凳俱全，看来是哪位前辈的坐化洞府。',
    '石桌上摆着一只落灰的玉匣。'
  ],
  choices: [
    { t: '开匣', 
      effect: { stone: 120, herb: 5 },
      lines: ['玉匣中是一叠灵石与几株灵草，入手微温，灵气盎然。你恭敬地朝石凳拜了三拜。'] },
    { t: '只取灵草，留下灵石', 
      effect: { herb: 8 },
      lines: ['你只取了墙角那几株年份最足的灵草。出去时，隐约听见身后传来一声轻叹。'] }
  ]
});
E('jiyuan', {
  id: 'jianseng_zengjian', title: '无名剑客', chapter: true, weight: 4, min: 5, max: 14,
  req: { minAtk: 60 },
  lines: [
    '山道上，一个背剑的独行客与你并肩行了一程。',
    '他话不多，只在分别时看了你一眼："你的剑，握得太紧了。"',
    '说着解下背后那柄青鞘长剑，抛给你。'
  ],
  effect: { art: 'qingfeng' },
  result: '你接剑只觉通体一轻——好剑，真正的好剑！（获得法宝：青锋剑）'
});
E('jiyuan', {
  id: 'tianjiang_yuntie', title: '天降陨铁', chapter: false, weight: 5, min: 1, max: 14,
  lines: ['一道火光自天边坠落，砸在你身前十丈的山坳里，烟尘散尽，竟是一块碗口大的陨铁。'],
  effect: { iron: 10 },
  result: '你收好陨铁，暗自欣喜——这可是炼器的好东西。'
});
E('jiyuan', {
  id: 'xianhe_songyao', title: '仙鹤衔药', chapter: false, weight: 4, min: 4, max: 14,
  lines: ['一只白鹤掠过你头顶，丢下一株通体泛着金芒的灵芝，长鸣一声消失在云间。'],
  effect: { herb: 5 },
  result: '你收下灵芝与鹤羽。那白鹤，来处不明。'
});
E('jiyuan', {
  id: 'paomai_hui', title: '灵石拍卖会', chapter: true, weight: 5, min: 6, max: 14,
  lines: [
    '城中最大的拍卖行今夜开拍，传闻压轴之物是一篇玄阶功法。',
    '大厅里人头攒动，你握了握怀中的灵石袋。'
  ],
  choices: [
    { t: '竞拍功法（600灵石）', req: { stone: 600 },
      effect: { stone: -600, tech: 'changchun' },
      lines: ['你举牌七次，终于在满堂惊叹中拍下那卷《长春功》。'] },
    { t: '只看看热闹', 
      effect: {},
      lines: ['你看完全场，默记下几句拍卖师的吆喝——那倒也像门手艺。'] }
  ]
});
E('jiyuan', {
  id: 'xiongzhao', title: '夜半凶兆', chapter: false, weight: 5, min: 0, max: 14,
  lines: ['这一夜，你修到紧要关头时，丹田中忽然一凉——窗外似有一双眼睛盯着你。'],
  effect: { hp: -40, qi: function (s) { return -Math.round(STAGES[s.idx].need * 0.05); } },
  result: '你强行收功，仍被反噬伤了经脉。窗外那双眼睛，早已不见。'
});
E('jiyuan', {
  id: 'lao_qigai', title: '城中老乞丐', chapter: true, weight: 6, min: 0, max: 2, once: true,
  setFlags: { beggar: 1 },
  lines: [
    '城隍庙前，一个老乞丐蜷在墙角，面前破碗里干干净净。',
    '他抬起头，浑浊的眼睛越过你，望向天边："小娃娃，你那脑门上，有气。"',
    '说完便不再理你，只是轻轻咳了两声。'
  ],
  choices: [
    { t: '买只烧鸡给他（10灵石）', req: { stone: 10 },
      effect: { stone: -10, flags: { beggar_kind: 1 } },
      lines: ['你从摊上买了只肥鸡递过去。老乞丐愣了愣，忽然笑了："行，是个心善的。"'] },
    { t: '施舍一个热馒头',
      effect: { flags: { beggar_kind: 1 } },
      lines: ['你到路边粥铺买了个热气腾腾的馒头，轻轻放在他手边。他看了你很久，点了点头。'] },
    { t: '绕道走开',
      effect: { flags: { beggar_cold: 1 } },
      lines: ['你摇摇头走开。身后传来一声若有若无的叹息。'] }
  ]
});
E('jiyuan', {
  id: 'beggar_return', title: '老乞丐的回报', chapter: true, weight: 100, min: 5, max: 14, once: true,
  req: { flags: { beggar_kind: 1 } },
  setFlags: { beggar_repaid: 1 },
  lines: [
    '多年后，你再次路过那座城隍庙。',
    '老乞丐还躺在老地方，仿佛这些年从未动过。这一次，他往你手里塞了一个布袋：',
    '"老头我捡破烂捡了一辈子，攒了点碎银子。拿去吧，别嫌少。"'
  ],
  effect: { stone: 100 },
  result: '你接过沉甸甸的布袋，里面装满了灵石。他朝你挥挥手，像赶一只聒噪的乌鸦。'
});
E('jiyuan', {
  id: 'beggar_cold_return', title: '一个馒头的遗憾', chapter: true, weight: 100, min: 9, max: 14, once: true,
  req: { flags: { beggar_cold: 1 } },
  setFlags: { beggar_cold_done: 1 },
  lines: [
    '多年后你故地重游，城隍庙的墙垣已塌了大半。',
    '墙角不剩下什么。看庙的老人口里念叨：那位老神仙，三年前就走了。',
    '你在原地站了很久，终究什么都没说。'
  ],
  effect: { wu: 1 },
  result: '你忽然想明白许多事。有些缘分，错过就是错过了。（悟性 +1）'
});
E('jiyuan', {
  id: 'xinzang_shuji', title: '古卷遗页', chapter: false, weight: 4, min: 4, max: 14, once: true,
  lines: ['你在洞府之底挖出一页残破金页，上面的文字你认不得，却莫名明白了它的意思——那是一门心法的开头。'],
  effect: { tech: 'taixuan' },
  result: '你一页一页研读，招式心法渐渐自洽，竟是上古《太玄经》残篇！（获得功法：太玄经 地阶）'
});
E('jiyuan', {
  id: 'moyou_shanyao', title: '山中遇险', chapter: true, weight: 5, min: 1, max: 14, once: true,
  lines: [
    '采药归途，一群蒙面人截住你的去路。',
    '领头那人冷笑："把储物袋留下，饶你一命。"'
  ],
  choices: [
    { t: '拔剑迎战', fight: { name: '劫修头领', atk: 40, hp: 120, loot: { stone: 80, herb: 2 } },
      lines: ['你剑光如电，三招放倒两人。那劫修头领见势不妙，丢下口袋便跑。'] },
    { t: '交出储物袋，忍辱负重',
      effect: { stone: -15 },
      lines: ['你交出小半积蓄。他们满意地走了。你盯着那道背影，攥紧了拳头。'] }
  ]
});
E('jiyuan', {
  id: 'lao_shenxian', title: '白须老道', chapter: true, weight: 3, min: 4, max: 11, once: true,
  lines: [
    '山神庙里，一个白须老道正就着月光烤番薯。',
    '他瞥你一眼，掰了半块递过来："小子，看你筋骨，像块能修的料。"',
    '"就是灵根差了点——来，老夫帮你捋一捋。"'
  ],
  choices: [
    { t: '道谢领受', effect: { wu: 1 },
      lines: ['他伸手在你天灵盖上一抚，你顿觉灵台清明，神思通彻。（悟性 +1）'] },
    { t: '婉言谢绝，虚心求教', effect: { qi: 120 },
      lines: ['你拱手求教修行之道。他笑呵呵讲了一夜，字字珠玑。你修为大涨。'] }
  ]
});
E('jiyuan', {
  id: 'xinyin_zhaoyu', title: '心魔初现', chapter: true, weight: 100, min: 9, max: 11, once: true,
  setFlags: { xinmo: 1 },
  lines: [
    '元婴期的瓶颈像一堵墙，堵得你夜夜难眠。',
    '这一夜，你在蒲团上看见了一个与你一模一样的人——他坐在你对面，笑盈盈道：',
    '"你修这劳什子大道，到底图什么？图长生？图逍遥？还是……图那个人的一句夸奖？"',
    '那人心口的位置，赫然映着你此生最痛的画面。'
  ],
  choices: [
    { t: '挥剑斩之："吾道自在我心！"', 
      fight: { name: '心魔化身', atk: 0, hp: 300, loot: {} },
      lines: ['你闭眼，再睁眼，一剑而出——那人影碎成漫天光点。原来一切皆是虚妄。你道心愈发坚定。'] },
    { t: '盘膝不动，与之相望一炷香',
      effect: { wu: 1 },
      lines: ['你静静看着他，看他笑，看他怒，看他终于自己散去。"心有挂碍，方能破碍。"你似乎悟了什么。（悟性 +1）'] }
  ]
});

/* ================ 社交 ================ */
E('shejiao', {
  id: 'lundao_dahui', title: '论道大会', chapter: false, weight: 6, min: 1, max: 14,
  lines: ['城中茶楼举行论道会，诸修高谈阔论，你听得入神，偶有所得。'],
  effect: { wu: function (s) { return 0.2; }, qi: 15, tech: function (s) {
    if (Math.random() < 0.3) {
      const got = ['yuhuo', 'hanshuang', 'leiyin', 'jianqi'].filter(function (t) { return s.techs.indexOf(t) < 0; });
      if (got.length) return got[Math.floor(Math.random() * got.length)];
    }
    return null;
  } },
  result: '你获益良多。（悟性微涨，修为小增）'
});
E('shejiao', {
  id: 'qianbei_zhidian', title: '前辈指点', chapter: false, weight: 5, min: 2, max: 14,
  lines: ['你向一位游历的前辈请教修行疑难。他看了你半晌，只说了八个字："少想，多看，多活，多练。"'],
  effect: { qi: function (s) { return Math.round(requireNeed(s) * 0.2); } },
  result: '醍醐灌顶，修为大涨。'
});
E('shejiao', {
  id: 'qiecuo', title: '同辈切磋', chapter: true, weight: 6, min: 1, max: 14,
  lines: ['一个修为与你相仿的年轻修士向你挑战，围观者众。',
    '他拱手："点到为止。请！"'],
  choices: [
    { t: '应战', fight: { name: '同辈修士', atk: 40, hp: 150, loot: { stone: 50 } }, resultWin: '你技高一筹。对方落败后倒是爽快，留下一袋灵石作彩头。', resultLose: '你在第十招落败。对方笑着扶起你："承让。"你觉得，下次该赢回来。' },
    { t: '婉拒，请他喝茶', effect: { stone: -10 }, lines: ['你们在茶楼聊了一下午，结下一个善缘。'] }
  ]
});
E('shejiao', {
  id: 'qiaoyu_sansan', title: '巧遇散修', chapter: false, weight: 5, min: 0, max: 14,
  lines: ['渡口遇到一个落草的散修，听他讲了一路各派趣闻，倒也有趣。'],
  effect: { stone: 15 },
  result: '临别时他赠你一袋灵石，权当酒钱。'
});
E('shejiao', {
  id: 'living_room_lin', title: '药庐初遇 · 林婉儿', chapter: true, weight: 8, min: 0, max: 4, once: true,
  setFlags: { lin: 1 },
  lines: [
    '你在城南药庐躲雨，檐下站着个挎着药篓的姑娘。',
    '她仰头看雨，忽然开口："你说，这雨是从天上来的，还是从云里来的？"',
    '你答不上来。她噗嗤一声笑了："呆子。"',
    '雨停时她卷起药篓走了，走了两步又回头："下次再躲雨，记得带伞。"'
  ],
  effect: { stone: 20 },
  result: '你站在原地，忽然觉得这趟雨淋得值。'
});
E('shejiao', {
  id: 'living_room_lin2', title: '灵谷相遇 · 林婉儿', chapter: true, weight: 8, min: 3, max: 5, once: true,
  req: { flags: { lin: 1 } },
  setFlags: { lin2: 1 },
  lines: [
    '灵谷禁地外，你远远看见一个熟悉的身影背着药筐在挖灵石。',
    '正是林婉儿。她看见你，眼睛一亮："喂，呆子！帮我看着点巡山的，这地儿可好挖了。"',
    '你们对视片刻，不约而同笑出声来。',
    '分赃……哦不，分战果时，她塞给你半筐灵石："收着，当还你那天的伞。"'
  ],
  effect: { stone: 80 },
  result: '（灵石 +80）你望着她蹦蹦跳跳的背影，心想这趟禁地来得很值。'
});
E('shejiao', {
  id: 'living_room_lin3', title: '剑冢夜话 · 结为道侣', chapter: true, weight: 8, min: 6, max: 8, once: true,
  req: { flags: { lin2: 1 } },
  setFlags: { daoLu: 1 },
  lines: [
    '剑冢月下，你终于鼓起勇气约她夜话。',
    '她背着手在月光里踱步半天，忽然站定：',
    '"我问你——"我曾许愿，要嫁给一个砍得了妖、熬得了丹、扛得住天劫的人。""',
    '她掰着手指头数完，抬头看你："你占了两样半。剩下那半天劫，我陪你一起扛。"',
    '你看着她眼睛里的月光，忽然什么话都说不出了。'
  ],
  choices: [
    { t: '"好，我娶你。"', effect: {}, lines: ['她沉默一瞬，忽然狠狠踹了你一脚："……让你说娶！谁让你说娶的！"','可第二天，她还是搬进了你的洞府。（结为道侣：修炼速度 +10%）'] },
    { t: '"那天劫，我一个人扛。"', effect: {}, lines: ['她沉默了。半晌，她轻声说："好，那我也一个人活。"说完转身走了。','你站在原地，恍然若失。那天晚上你第一次觉得，天劫好像没那么难扛了。（心绪不宁：悟性 +1）'] }
  ]
});
E('shejiao', {
  id: 'daolu_growth', title: '道侣相伴', chapter: false, weight: 6, min: 6, max: 14,
  req: { flags: { daoLu: 1 } },
  lines: ['林婉儿在洞府外等你，给你温了一壶灵酒，还贴了张歪歪扭扭的平安符："出门在外，多想想我。"'],
  effect: { hp: 30, qi: 20 },
  result: '有个人等你回家的感觉，让这漫长修行路都轻快了几分。'
});
E('shejiao', {
  id: 'giant_zhe_liang', title: '同门相轻', chapter: true, weight: 4, min: 0, max: 14,
  lines: ['一个衣饰华贵的同门弟子当众讥讽你的出身："泥腿子也想修仙？早点回家种地去吧。"', '围观者窃窃私语。'],
  choices: [
    { t: '反唇相讥', fight: { name: '纨绔弟子', atk: 30, hp: 100, loot: { stone: 40 } }, resultLose: '你被他的护卫架住，好不狼狈。', resultWin: '你三言两语把他驳得面红耳赤，拂袖而去。他暗暗记恨。' },
    { t: '微微一笑，转身就走', effect: { wu: 0.1 }, lines: ['狗叫而已。你从兜里摸出一枚灵石，弹向身后——正中那厮后脑。回家种地？你也配。'] }
  ]
});
E('shejiao', {
  id: 'chou_xiang', title: '旧怨寻仇', chapter: true, weight: 4, min: 2, max: 14, once: true,
  setFlags: { choux: 1 },
  lines: ['采药时节，当年在你家中落难时借了五十灵石不还、还反咬一口的同乡，带着三个帮手堵住了你。', '"风水轮流转。今日，连本带利还来！"'],
  choices: [
    { t: '剑出鞘，讨个公道', fight: { name: '同乡恶徒', atk: 35, hp: 160, loot: { stone: 120 } }, resultWin: '你一剑扫开三人，盯着他发抖的腿："当年五十的债，现在拿命了。"他跪了。', resultLose: '双拳难敌四手，你挂了彩，被抢走一些灵石。（气血受损）' },
    { t: '破财消灾', effect: { stone: -60 }, lines: ['你把六十灵石丢在地上："拿了，滚。"他们捡起钱，连滚带爬地跑了。你望着那道背影，心中毫无波澜。'] }
  ]
});
E('shejiao', {
  id: 'women_zhi', title: '市井烟火', chapter: false, weight: 5, min: 0, max: 14,
  lines: ['你混在凡人堆里赶了趟大集，听戏、看杂耍、吃碗阳春面。俗得很，也热得很。'],
  effect: { hp: 25 },
  result: '烟火气回了血。'
});


E('mijing', {
  id: 'wu_valley', title: '青云雾谷', chapter: true, weight: 8, min: 0, max: 2, needRealm: '炼气',
  lines: [
    '青云山深处的雾谷终年不散。传闻谷中灵草遍地，也传闻谷中有妖。',
    '你踏进浓雾，脚下腐叶发出窸窣声。一株泛着青光的灵草就在十步开外。'
  ],
  choices: [
    { t: '弯腰去采', fight: { name: '青纹狼', atk: 30, hp: 120, loot: { herb: 4, stone: 30 } }, resultWin: '青纹狼伏诛，你采下灵草满载而归。', resultLose: '你被青纹狼狠狠抓了一爪，仓皇逃出雾谷。（气血受损）' },
    { t: '以灵石布阵试探', effect: { stone: -20, herb: 2 }, lines: ['你布下简易困阵，引开妖物后从容采药而去。'] }
  ]
});
E('mijing', {
  id: 'baigu_gumu', title: '白骨古墓', chapter: true, weight: 6, min: 3, max: 5, needRealm: '筑基',
  lines: [
    '荒山裂开一道地缝，露出半截青石墓门。墓碑上刻着：入者自误。',
    '你推开石门，甬道两侧的白骨齐刷刷望着你。尽头一口青铜棺，棺盖上压着一方玉玺。'
  ],
  choices: [
    { t: '开棺取宝', fight: { name: '守墓尸傀', atk: 60, hp: 260, loot: { iron: 15, stone: 100 } }, resultWin: '尸傀碎裂，棺中丹药玉简俱在。你满载而归。', resultLose: '尸傀力大无穷，你舍下一臂之伤才脱身。（气血受损，丢失灵石）',
      next: {
        winOnly: true,
        lines: ['棺底还有一层夹板，压着一枚青玉简。',
          '你拾起玉简，神识探入——里面竟是一门心法的开篇。'],
        choices: [
          { t: '收入囊中', effect: { wu: 1 }, lines: ['你将玉简贴身收好。这位墓主生前，大概也是个不肯认命的人。（悟性+1）'] },
          { t: '放回棺中，物归原主', effect: { qi: 80 }, lines: ['你将玉简轻轻放回，重新合上棺盖。"入土为安。"你低声说。尸傀裂开的面孔，仿佛平和了一瞬。（修为+）'] }
        ]
      } },
    { t: '焚香三拜，取香案之物', effect: { herb: 3, stone: 60 }, lines: ['你以香火礼敬墓主，只取走案上的供奉之物。身后棺中传来一声若有若无的叹息，似在相送。'] }
  ]
});
E('mijing', {
  id: 'han_feng_tan', title: '玄冰寒潭', chapter: true, weight: 6, min: 6, max: 8, needRealm: '金丹',
  lines: [
    '北境寒潭，水面终年结着薄冰，传说潭心沉着一块万年冰髓。',
    '你破冰而入，寒气顺着经脉直往心口钻。潭底白影一晃——一头沉睡的冰蛟盘踞在冰髓旁。'
  ],
  choices: [
    { t: '悄悄取髓', fight: { name: '冰蛟', atk: 90, hp: 420, loot: { iron: 20, stone: 160 } }, resultWin: '冰蛟轰然倒下，冰髓入手的一刻，你手心的温度几乎被冻透，心却是热的。', resultLose: '冰蛟一尾将你拍飞，你被寒气冻昏在半路，醒来时已在十里外的山脚。（气血大损）',
      next: {
        winOnly: true,
        lines: ['冰髓在掌中散发着幽幽蓝光。传闻将冰髓融入经脉，可大幅拓宽道基，但也有逆流之险。'],
        choices: [
          { t: '熔髓入体', effect: { hpMax: 120, hp: -40 }, lines: ['冰髓化作一缕寒流钻进经脉，你痛得单膝跪地，却能感到道基在缓缓拓宽。（气血上限+120）'] },
          { t: '留作炼器之用', effect: { iron: 25 }, lines: ['你以玉匣封存冰髓。这世上最好的冰系炼器材料，值得等一个最好的炉子。'] }
        ]
      } },
    { t: '以灵草敬奉，舍髓而去', effect: { herb: 10, stone: 80 }, lines: ['你将灵草投入蛟口，冰蛟竟温顺下来，拱了拱你的手。它额头缺了一角——旧伤仍在。你忽然想起那句"修行，修的也是慈悲"。'] }
  ]
});
E('mijing', {
  id: 'huo_mai_dong', title: '火脉洞窟', chapter: true, weight: 6, min: 9, max: 11, needRealm: '元婴',
  lines: [
    '地底火脉，热浪滔天。传闻上古火神在此铸兵，炉底还压着半炉神铁。',
    '你顶着灼热深入，却见炉前坐着一具焦黑的身躯——一位抱炉而死的铸师。'
  ],
  choices: [
    { t: '以礼相待，取炉中神铁', fight: { name: '火脉元灵', atk: 130, hp: 600, loot: { iron: 40, art: 'jinylv' } }, resultWin: '元灵散去，神铁入手滚烫，仿佛还带着那位铸师的掌温。（获得灵铁与金缕衣）', resultLose: '火灵反噬，你被热浪卷出洞外，衣甲尽碎。（气血大损，丢失两株灵草）' },
    { t: '收骨安葬，不取一物', effect: { herb: 8, wu: 1 }, lines: ['你用潭水洗净尸骨，以石头垒墓。最后一铲土落下时，炉中竟"叮"一声弹出一柄火红短剑——他留给有缘人的。（悟性+1）'] }
  ]
});
E('mijing', {
  id: 'shanggu_yaoyuan', title: '上古药园', chapter: true, weight: 6, min: 9, max: 11, needRealm: '元婴',
  lines: [
    '云海之间，一座悬空的药园静静漂移了万年。',
    '园中灵药成精，见人便逃跑。最深处那株悟道茶树下，坐着一头老龟。',
    '"小辈，"老龟睁开眼，"来讨茶喝，还是来打架？"'
  ],
  choices: [
    { t: '讨一杯悟道茶', effect: { herb: 30, wu: 2, elixirs: { wudao: 1 } }, lines: ['老龟煮茶，你饮下三口。一时间，万年光阴在你眼前流淌而过，你什么都懂了。（悟性+2，获得悟道丹与大量灵草）'] },
    { t: '拔剑，请指教', fight: { name: '守园老龟', atk: 200, hp: 2000, loot: { wu: 1, elixirs: { wudao: 1 } } }, resultWin: '老龟挨了一剑，不怒反笑："好剑。这园子，送你了。"你抱拳一礼，悟道意蕴入体。（悟性+1，获得悟道丹）', resultLose: '老龟一爪将你按下："败了，就留下喝一年的茶。"你哭笑不得——这园子，怕是要扫一年地了。（气血受损）' }
  ]
});
E('mijing', {
  id: 'lingkuang_lu', title: '灵石矿脉', chapter: false, weight: 7, min: 1, max: 14,
  lines: ['你随矿工混进一处新开的灵石矿脉，掰下一块晶莹矿石，在矿灯下竟透出道道虹光。'],
  effect: { stone: function (s) { return 60 + BIG_IDX(s.realm) * 40; } },
  result: '发财了。（灵石大涨）'
});
E('mijing', {
  id: 'youwu_zhulin', title: '幽雾竹林', chapter: true, weight: 7, min: 0, max: 2, needRealm: '炼气',
  lines: [
    '山阴之下的竹林终年笼罩在淡紫色的幽雾中，竹节上凝着一层发光的水珠。',
    '传闻这里的露珠可入药，也传闻——雾深处有东西在看着你。',
    '竹叶深处，两道幽绿的光一明一灭。'
  ],
  choices: [
    { t: '采集露珠（收益稳，但慢）', effect: { herb: 3, stone: 10 },
      lines: ['你小心翼翼地收集露珠，装了满满一葫芦。竹叶间那道绿光始终没有靠近。'] },
    { t: '循着绿光追去', fight: { name: '竹林竹妖', atk: 25, hp: 100, loot: { herb: 5, iron: 3 } },
      resultWin: '竹妖嘶叫着炸成一蓬木屑，留下几株年份最足的灵草和一段沉铁。',
      resultLose: '竹妖一鞭抽来，你摔了个跟头，连滚带爬逃出竹林。（气血受损）' },
    { t: '布下简易困阵，静待其变', effect: { stone: -10, herb: 2, wu: 0.3 },
      lines: ['你以灵石布阵守了一夜，天将明时雾气自散。阵中多了一株半人高的灵竹——那竹妖竟连夜移栽来赔罪。'] }
  ]
});
E('mijing', {
  id: 'chenchuan_baozang', title: '沉船秘藏', chapter: true, weight: 6, min: 1, max: 4, needRealm: '炼气',
  lines: [
    '河底一截翻覆的商船斜插在淤泥里，半扇舱门大敞。',
    '水草间隐约可见翻倒的木箱，一尾水鬼般的黑影正围着船身打转。',
    '你潜入水底，屏息贴近那扇舱门。'
  ],
  choices: [
    { t: '悄悄潜进去摸宝', fight: { name: '溺亡水鬼', atk: 32, hp: 130, loot: { stone: 90, herb: 2 } },
      resultWin: '水鬼被你的剑气搅散，你从舱底捞出一袋灵石和几株水灵草。',
      resultLose: '水鬼拽住你的脚踝，你呛了好几口水才挣脱，仓皇逃回岸上。（气血受损）' },
    { t: '以灵绳系住自己，先取箱再跑', effect: { stone: 40, iron: 5 },
      lines: ['你绑好绳索，迅速拖出一只木箱。打开一看，半箱铁器浸了水，倒也还能炼器用。'] },
    { t: '在船头焚一炷香，取三件即走', effect: { stone: 30, wu: 0.3 },
      lines: ['香火袅袅沉入水底。你只取了船头供奉的三枚古钱便退——身后传来一声幽幽叹息，似在道谢。'] }
  ]
});
E('mijing', {
  id: 'wangu_dong', title: '万骨洞', chapter: true, weight: 6, min: 3, max: 5, needRealm: '筑基',
  lines: [
    '白骨堆成的洞口，风穿过骨缝，发出呜咽般的声响。',
    '洞中盘坐着一具具枯骨，每具都朝着洞底深处拜伏。洞底石台上，一盏长明灯还亮着。',
    '灯下压着一卷泛黄的帛书。'
  ],
  choices: [
    { t: '直接取帛书', fight: { name: '守灯尸修', atk: 55, hp: 240, loot: { tech: 'changchun', stone: 60 } },
      resultWin: '尸修散作飞灰，帛书入手——竟是一门玄阶功法《长春功》！',
      resultLose: '尸修枯爪拍来，你肋下一痛，不得不丢下帛书逃命。（气血受损）' },
    { t: '先拜三拜，再求借阅', effect: { wu: 1, qi: 60 },
      lines: ['你依礼数拜了三拜，说明来意。长明灯焰火一跳，帛书自行展开，字句直入你识海。（悟性+1，修为+）'] },
    { t: '引开灯焰，另寻他路', effect: { stone: 80, iron: 8 },
      lines: ['你用火种引走灯焰，从石台暗格中撬出一盒灵石与几块灵铁。那帛书，你终究没动。'] }
  ]
});
E('mijing', {
  id: 'lingchu_yuzai', title: '灵兽幼崽', chapter: true, weight: 6, min: 5, max: 7, needRealm: '筑基',
  setFlags: { petEncounter: 1 },
  lines: [
    '山道旁的灌木丛里，一只通体雪白的幼狐被兽夹夹住了后腿，正呜呜地挣命。',
    '它看见你，琥珀色的眼睛里满是惊恐，却还是虚张声势地龇了龇牙。',
    '兽夹上刻着符文——是附近猎妖门的标记。'
  ],
  choices: [
    { t: '救下它，带回洞府养着', effect: { flags: { pet: 1 }, hp: -5 },
      lines: ['你小心掰开兽夹，替它裹好伤口。小东西在你手心里蜷成一团，从此赖上了你。（获得灵狐：修炼 +5%）'],
      next: {
        lines: ['回洞府的路上，它一直叼着你的衣角。你给它取名——就叫"小白"吧。'],
        choices: [
          { t: '喂它一颗聚气丹', effect: { elixirs: { juling: -1 } }, lines: ['小白吞下丹药，打了个滚，毛色都亮了几分。'], },
          { t: '留它慢慢养', effect: {}, lines: ['你摸了摸它的头。修行路长，有个伴儿总是好的。'] }
        ]
      } },
    { t: '放归山林', effect: { wu: 0.5 },
      lines: ['你解开兽夹，退开十步。幼狐回头看了你很久，才一瘸一拐钻进林间。你忽然觉得心口很软。'] },
    { t: '不理会，绕道走', effect: { flags: { petCold: 1 } },
      lines: ['你走了。身后那呜呜的叫声，在风里散了。'] }
  ]
});
E('mijing', {
  id: 'lingchu_chengzhang', title: '灵狐报恩', chapter: true, weight: 100, min: 8, max: 14, once: true,
  req: { flags: { pet: 1 } },
  setFlags: { petGrown: 1 },
  lines: [
    '某日深夜，洞府外传来熟悉的呜呜声。',
    '你推门一看——小白长大了，通体银白，额间多了一撮金毛。它嘴里叼着一株泛着紫光的灵草，冲你摇了摇尾巴。',
    '这几年它偷偷在山里替你寻药，长成了一头真正的灵狐。'
  ],
  choices: [
    { t: '收下灵草，摸摸它的头', effect: { herb: 6, elixirs: { wudao: 1 } },
      lines: ['你接过灵草——是炼制悟道丹的主药！小白在你手心里蹭了蹭，尾巴翘得老高。（灵狐进阶：修炼 +8% → +15%）'],
      next: {
        lines: ['从此小白不再只是小白。它是你的伙伴。'],
        choices: [
          { t: '"以后，跟着我闯荡天下。"', effect: { atk: 10 }, lines: ['小白长啸一声，月光下银毛如霜。你的心，暖得像春日。'] }
        ]
      } },
    { t: '放它回山林', effect: { wu: 1 },
      lines: ['你蹲下来与它平视："去吧。"小白绕着你的腿转了三圈，一步三回头地消失在晨雾里。你道心微动。（悟性+1）'] }
  ]
});
E('mijing', {
  id: 'gushi_yifu', title: '古修遗府', chapter: true, weight: 6, min: 7, max: 8, needRealm: '金丹',
  lines: [
    '一座被藤蔓吞没的洞府，石门上的禁制早已斑驳。',
    '门上刻着一行字："余一生所求，唯大道尔。后人取吾遗物，当立此志。"',
    '门缝里透出一线幽光——禁制之内的东西，还在发亮。'
  ],
  choices: [
    { t: '破禁而入', fight: { name: '守府阵灵', atk: 70, hp: 320, loot: { tech: 'taixuan', stone: 120 } },
      resultWin: '阵灵破碎，你入府取走一卷《太玄经》残篇与灵石——那正是这位前辈毕生所求的道。',
      resultLose: '禁制反噬，你被弹出十丈，额头撞出个包。看来修为还差些火候。（气血受损）' },
    { t: '以灵石供于门前，只取一物', effect: { stone: -50, qi: 200 },
      lines: ['你将灵石摆在门前，只取走石桌上的聚灵阵盘。禁制深处的幽光，仿佛明亮了一瞬。'] },
    { t: '记下门上的话，转身离去', effect: { wu: 1, qi: 120 },
      lines: ['你没有进门。那行字却在你心头刻了一夜——"余生所求，唯大道尔。"（悟性+1，修为+）'] }
  ]
});
E('mijing', {
  id: 'tianji_dao', title: '天机浮空岛', chapter: true, weight: 6, min: 9, max: 10, needRealm: '金丹',
  lines: [
    '云雾深处，一座倒悬的山峰悬在半空，峰底刻着"天机"二字。',
    '岛上机关重重，传闻藏着一位阵道大师的毕生心血。你踏上岛屿的一瞬，脚下齿轮转动的声音便响了起来。',
    '一道石门拦在面前，门上九格，格格里是一副残局。'
  ],
  choices: [
    { t: '推演残局', effect: { wu: 2, stone: 80 },
      lines: ['你盘坐门前推演了三天三夜，落下一子——石门应声而开，你取走石室中的阵道笔记与灵石。（悟性+2）'],
      next: {
        lines: ['石室深处还有一扇暗门，门上刻着：一子一乾坤。'],
        choices: [
          { t: '以鲜血为引，强开暗门', fight: { name: '天机傀儡', atk: 110, hp: 450, loot: { art: 'juling', wu: 1 } },
            resultWin: '傀儡散架，你从暗格里捧出聚灵珠——阵道大师的随身之宝！',
            resultLose: '傀儡一拳将你轰出石室，你带着阵道笔记逃之夭夭。（气血受损）' },
          { t: '见好就收，打道回府', effect: { stone: 40 }, lines: ['你掂了掂怀里的收获，心满意足地离开。有些门，不必全开。'] }
        ]
      } },
    { t: '以力破门', fight: { name: '石门机关', atk: 80, hp: 380, loot: { stone: 150, iron: 12 } },
      resultWin: '你把机关砸了个稀烂，从废墟里翻出灵石与灵铁——粗暴，但有效。',
      resultLose: '机关迸出铁刺，你躲闪不及，肩头挂了彩。（气血受损）' },
    { t: '在门口刻下"后来者，天机有缘"，便走', effect: { wu: 1 },
      lines: ['你留下一行字便走。三日后梦见那位阵道大师朝你颔首——悟道，有时也在不取。（悟性+1）'] }
  ]
});
E('mijing', {
  id: 'leichi', title: '九天雷池', chapter: true, weight: 6, min: 10, max: 11, needRealm: '元婴',
  lines: [
    '雷云终年不散的山坳里，一方紫色雷池翻涌着电弧。',
    '传说雷池能淬体、能炼器、能悟法，但雷池没有慈悲——失手者，皆成飞灰。',
    '你站在池边，雷光倒映在你眼底。'
  ],
  choices: [
    { t: '入池淬体', effect: { hp: -50, ti: 1 },
      lines: ['你咬牙踏入雷池。电蛇顺着经脉游走全身，剧痛中，你能感觉到肉身在变强。（体魄+1）'],
      next: {
        lines: ['雷池深处，一团紫色雷液在池心缓缓旋转——那是淬炼千年才成的雷髓。'],
        choices: [
          { t: '涉足池心，取雷髓', fight: { name: '雷池元灵', atk: 150, hp: 550, loot: { iron: 30, hpMax: 150 } },
            resultWin: '你以手代器，将雷髓淬入己身——经脉拓宽，气血如虹！（气血上限+150）',
            resultLose: '雷髓反噬，你被电弧轰出雷池，躺在岸边抽搐了半日。（气血受损）' },
          { t: '取一瓢雷液便退', effect: { iron: 20 },
            lines: ['你以玉瓶装走一瓢雷液——那是绝佳的炼器材料。'] }
        ]
      } },
    { t: '在池边以雷液炼符', effect: { herb: 5, stone: 30 },
      lines: ['你借雷光淬炼符纸，炼出几张灵符。雷池虽险，未入者无伤。'] },
    { t: '引雷悟道', effect: { wu: 2, hp: -20 },
      lines: ['你以引雷诀引来一道细雷，于雷光中观想阴阳生灭。仿佛有什么在心头破壳。（悟性+2）'] }
  ]
});
E('mijing', {
  id: 'huangshen_tan', title: '荒神祭坛', chapter: true, weight: 6, min: 12, max: 14, needRealm: '元婴',
  lines: [
    '沙漠深处，一座巨石堆成的祭坛孤零零立着，仿佛已经等了万年。',
    '坛顶供奉着一尊无面神像，神像手中托着一枚发光的玉果。',
    '石壁上刻着古语：以诚献之，以命取之，以空敬之。'
  ],
  choices: [
    { t: '献上灵石，叩首求取', effect: { stone: -100, elixirs: { wudao: 1 } },
      lines: ['你献上灵石，三叩九拜。神像手中的玉果滚落一枚——是悟道丹的丹引！（获得悟道丹）'],
      next: {
        lines: ['祭坛深处传来一声低沉的鼻息。那尊神像的眼睛，似乎……动了。'],
        choices: [
          { t: '转身就走', effect: {}, lines: ['你连滚带爬下了祭坛。身后，那尊神像缓缓重新合上了眼。'] },
          { t: '再拜一礼，从容离开', effect: { wu: 1 }, lines: ['你不疾不徐行了一礼，才转身离去。走出三里，背后传来一声悠长的叹息——"善。"（悟性+1）'] }
        ]
      } },
    { t: '取玉果', fight: { name: '荒神残念', atk: 180, hp: 900, loot: { elixirs: { wudao: 2 }, wu: 1 } },
      resultWin: '残念消散，你捧起两枚玉果——这是神佛都垂涎的东西！（悟道丹×2，悟性+1）',
      resultLose: '神像掌风扫来，你倒飞十丈，埋在沙里半晌才爬起来。（气血大损）' },
    { t: '以空敬之：不取一物，只静坐一夜', effect: { wu: 2, qi: function (s) { return Math.round(requireNeed(s) * 0.3); } },
      lines: ['你在祭坛下静坐一夜，听风沙诵经。天明时起身——心头空明一片，如拭净的明镜。（悟性+2，修为+）'] }
  ]
});
E('mijing', {
  id: 'xukong_lie', title: '虚空裂缝', chapter: true, weight: 6, min: 9, max: 11, needRealm: '元婴',
  lines: [
    '天穹之上裂开一道漆黑的缝隙，缝隙中传来不属于此界的风声。',
    '有上古传说：虚空之后，藏着成仙的答案；也藏着吃人的深渊。',
    '你御剑悬停在裂缝前，指尖凝起灵力。'
  ],
  choices: [
    { t: '冲入裂缝，一探究竟', fight: { name: '虚空兽潮', atk: 220, hp: 1500, loot: { tech: 'kaitian', wu: 2 } },
      resultWin: '你杀穿兽潮，在虚空尽头拾得一片金色残页——那是《开天篇》的最后一页！（获得仙阶功法）',
      resultLose: '虚空兽潮将你撕扯得遍体鳞伤，你拼死退回人间。（气血大损）' },
    { t: '以灵力封印裂缝', effect: { qi: function (s) { return Math.round(requireNeed(s) * 0.5); }, hp: -60 },
      lines: ['你以自身灵力为锁，将裂缝缓缓缝合。虚空深处传来一声不甘的咆哮，又归于寂静。（修为+）'] },
    { t: '记下坐标，他日再来', effect: { stone: 100 },
      lines: ['你以玉简记下虚空裂缝的坐标。此界之后，尚有彼界——这条路，你迟早要再走。'] }
  ]
});
E('mijing', {
  id: 'xingluo_gu', title: '星落谷', chapter: true, weight: 5, min: 9, max: 11, needRealm: '元婴',
  lines: [
    '上古陨星坠出的巨谷，谷中遍地星铁，温度高得连山石都融化过。',
    '谷底中央，一颗半埋的陨星核泛着幽幽蓝光——那是星辰的"心"。',
    '陨星核旁，一头吞星巨蟒正盘踞酣睡。'
  ],
  choices: [
    { t: '偷挖星核', fight: { name: '吞星巨蟒', atk: 200, hp: 1300, loot: { iron: 60, elixirs: { zengshou: 1 } } },
      resultWin: '巨蟒被你一剑惊走，你掘出星核——炽热得几乎握不住！（灵铁×60，增寿丹）',
      resultLose: '巨蟒尾鞭扫来，你被拍飞出谷，星铁碎了一地。（气血大损）' },
    { t: '收集谷中星铁便走', effect: { iron: 35 },
      lines: ['你捡了满满一袋星铁——足够炼一炉好器了。谷底的巨蟒翻了个身，并未理会你。'] },
    { t: '观星悟道', effect: { wu: 2, qi: function (s) { return Math.round(requireNeed(s) * 0.2); } },
      lines: ['你盘坐在谷顶，看了一夜星辰起落，忽然明白了"周天"二字的含义。（悟性+2，修为+）'] }
  ]
});
E('mijing', {
  id: 'yuanshi_shenchu', title: '秘境深处 · 仙人残影', chapter: true, weight: 3, min: 9, max: 14, once: true,
  req: { minAtk: 150 },
  lines: [
    '一座无名秘境的深处，你在一面石壁上看见一段剑光流转的刻痕。',
    '那刻痕如活物，在你凝视时缓缓演化出七式剑招。',
    '最后一式收剑时，石壁上的身影竟朝你微微颔首——那是上古剑仙残留下的意志。'
  ],
  choices: [
    { t: '枯坐三年，悟他七剑', effect: { wu: 3, qi: function (s) { return Math.round(requireNeed(s) * 0.6); } },
      lines: ['三年弹指，你出关时，剑已在心中。七剑化作一剑，天地皆明。（悟性+3，修为大进）'] },
    { t: '录其形意即去', effect: { atk: 30 },
      lines: ['你将剑意拓印心中便走。此后出剑，总多一分飘然仙意。（攻击+30）'] }
  ]
});

/* ================ 年岁小事件（年末广播） ================ */
E('year', { id: 'y_pinghe', title: '岁月静好', weight: 5, lines: '这一年过得平顺。春来播种，秋来收丹，冬日你在檐下看雪，觉得"长生"二字，也没那么急。' });
E('year', { id: 'y_fengshou', title: '丰年', weight: 4, lines: '灵田丰收，灵石入库。你清点家底时，嘴角不自觉地翘了起来。', effect: { stone: 40 } });
E('year', { id: 'y_drough', title: '大旱之年', weight: 3, lines: '大旱三月，凡间颗粒无收。你夜施甘霖，救了一方百姓。香火虽无形，心却安。' });
E('year', { id: 'y_xiaye', title: '夏夜萤火', weight: 4, lines: '夏夜，萤火漫天。你忽然想起许多年前那个和你在屋檐下躲雨的人。' });

/* ---------------- 宗门剧情（拜入后触发） ---------------- */
/* min/max 为“大境界序号”：0炼气 1筑基 2金丹 3元婴 */

/* 年末宗门事件：大事件先行，平时琐事铺陈 */
const SECT_EVENTS = {
  qingyunjian: [
    { id: 'qy_ruyun', title: '青云·初闻剑鸣', chapter: true, weight: 8, min: 0, max: 0, once: true,
      lines: [
        '拜入青云剑宗第一年，你被安排住在剑峰东麓的一间竹舍。',
        '推开窗，满山都是剑——插在石里、悬在檐下、浮在溪上，剑鸣如松涛。',
        '同门的师兄敲了敲你的门："掌门说，明日晨课带你去藏剑阁。好好挑一柄。"'
      ],
      choices: [
        { t: '以水代酒，敬一敬这场仙缘', effect: { wu: 1 }, lines: ['你对着剑峰满月敬了三杯清茶，从今夜起，此身便属于剑了。（悟性+1）'] },
        { t: '闭目调息，早入定', effect: { atk: 3 }, lines: ['你一夜吐纳不息，次日上剑峰时步履反而比谁都稳。（攻击+3）'] }
      ] },
    { id: 'qy_cangjian', title: '青云·藏剑阁选剑', chapter: true, weight: 7, min: 0, max: 3,
      lines: [
        '藏剑阁的守阁长老眯着眼打量你半晌，才放你进门。',
        '"剑过千人，择主而鸣。你静心去听——哪一柄在为你响，就是你的剑。"',
        '阁内万剑轻颤，你凝神倾听，足音在剑丛间回响。'
      ],
      choices: [
        { t: '取那柄最亮的青锋', effect: { atk: 6 }, lines: ['青锋入手，寒光如月。长老颔首："眼力尚可。"（攻击+6）'] },
        { t: '取那柄厚重的沉渊', effect: { ti: 1 }, lines: ['沉渊入手，沉甸甸的，剑身乌黑如墨。长老抚须："此剑重拙，非体魄过人者不能驭。好选择。"（体魄+1）'] },
        { t: '闭目随缘而取', effect: { atk: 3, wu: 0.5 }, lines: ['你随手抓了把古剑，剑柄竟刻着你名字的首字。长老抚掌："缘也。"（攻击+3，悟性+0.5）'] }
      ] },
    { id: 'qy_jianzhong', title: '青云·剑冢问剑', chapter: true, weight: 6, min: 1, max: 3, once: true,
      lines: [
        '剑冢在剑峰之阴，埋着历代陨落同门的剑。',
        '你奉师命来取一截无主残剑炼器，却见冢中剑气凝而不散，如万军列阵。',
        '冢门口，一柄锈剑自行出鞘，拦在你面前——它想和你过招。'
      ],
      choices: [
        { t: '接剑，与冢灵一战', fight: { name: '守冢剑灵', atk: 90, hp: 420, loot: { tech: 'jianqi', iron: 10 } },
          resultWin: '锈剑断成两截，冢中剑气尽数归附于你。你悟得杀伐之剑——剑气化形！（习得《剑气诀》）',
          resultLose: '你被剑气震出十步，跌坐在地。冢灵缓缓归位，似在说：再来。' },
        { t: '长揖一礼，退而不战', effect: { wu: 1 }, lines: ['你弯腰一礼。冢中剑鸣竟渐渐平息，仿佛认可了你的敬畏之心。（悟性+1）'] }
      ] },
    { id: 'qy_fengjian', title: '青云·剑峰论道', chapter: true, weight: 5, min: 2, max: 3, once: true,
      lines: [
        '剑峰大比落幕，掌门召你至峰顶。',
        '"你的剑里，有杀意，有敬意，却还没有放下二字。"',
        '他随手折下一根松枝，在你面前缓缓划出一道剑痕——那道剑痕里，装着整座剑峰。'
      ],
      choices: [
        { t: '枯坐三日，悟那道剑痕', effect: { wu: 2, tech: 'wanjian' }, lines: ['三日之后，你睁开眼，手中无剑，心中有剑。掌门大笑："成了。"（悟性+2，习得《万剑归宗》）'] },
        { t: '请教掌门剑中放下二字', effect: { wu: 1, atk: 5 }, lines: ['掌门道："放下，是忘掉输赢，记得剑。"你似懂非懂，但出剑时确实少了三分迟疑。（悟性+1，攻击+5）'] }
      ] },
    { id: 'qy_xiashan', title: '青云·下山除妖', chapter: false, weight: 7, min: 1, max: 3,
      lines: ['山下村寨闹黑风妖，你领命下山，一剑破风，寨民要凑钱给你立祠。你只讨了一碗热汤喝。'],
      effect: { stone: 60 } },
    { id: 'qy_yezhan', title: '青云·夜半练剑', chapter: false, weight: 6, min: 0, max: 3,
      lines: ['月下练剑，露重霜寒。你一气呵成三千剑，收势时，山间剑鸣为你和了一声。'],
      effect: { atk: 4 } }
  ],
  dpxia: [
    { id: 'dx_kaiyuan', title: '丹霞·初入丹谷', chapter: true, weight: 8, min: 0, max: 0, once: true,
      lines: [
        '丹霞谷的春天是从药香里醒来的。',
        '你拜入的第一日，大长老塞给你一只药篓："去后山采三株赤芝、五两灵参、外加一株会跑的老山参。"',
        '你抬头看了看云雾中的丹谷，忽然觉得这条路，走得值。'
      ],
      choices: [
        { t: '老老实实采药去', effect: { herb: 6 }, lines: ['你忙了一整天，篓子满了，老山参也捉住了。大长老满意地捋了捋胡子。（灵草+6）'] },
        { t: '先绕去丹房偷师', effect: { wu: 1 }, lines: ['你在丹房窗外蹲了半日，记下三味药材的配伍。篓子虽空了一半，心却满了。（悟性+1）'] }
      ] },
    { id: 'dx_danfang', title: '丹霞·丹房帮工', chapter: true, weight: 7, min: 0, max: 3,
      lines: [
        '丹房的炉火彻夜不熄，你一炉接一炉地扇着风。',
        '师姐边称药边念叨："火候这东西，慢一分是水，急一分是灰。做人也是。"',
        '炉火映着她的侧脸，丹谷的夜色安静得能听见灵草生长的声音。'
      ],
      choices: [
        { t: '用心记下火候之道', effect: { wu: 1 }, lines: ['你记住了每一炉药材的脾气。此后炼丹，火候再没出过岔子。（悟性+1）'] },
        { t: '多要几株边角料灵草', effect: { herb: 6, elixirs: { juling: 1 } }, lines: ['师姐笑骂你一声"会过日子"，随手又塞给你一株灵草。（灵草+6，聚气丹+1）'] }
      ] },
    { id: 'dx_hanyi', title: '丹霞·炉中寒意', chapter: true, weight: 6, min: 1, max: 3, once: true,
      lines: [
        '大雪封谷那夜，丹房的千年炉火竟燃起了幽蓝色。',
        '大长老一身半夜爬起，急吼吼喊你："天霜诞日，百年一遇！快，跟我守炉！"',
        '蓝火中，一炉丹药正在凝形——天霜丹，服用感悟更添三分。'
      ],
      choices: [
        { t: '守着炉火直到天亮', effect: { wu: 2, elixirs: { wudao: 1 } }, lines: ['天光破晓时开炉，丹成十二颗。大长老分你一颗："留着，悟道用。"（悟性+2，悟道丹+1）'] },
        { t: '趁热研究那炉蓝火', effect: { wu: 1, qi: function (s) { return Math.round(requireNeed(s) * 0.15); } }, lines: ['你对火的理解上了一个台阶，顺手汲谷中灵力修炼了片刻。（悟性+1，修为+）'] }
      ] },
    { id: 'dx_changchun', title: '丹霞·长春秘决', chapter: true, weight: 5, min: 2, max: 3, once: true,
      lines: [
        '大长老唤你入药王洞，洞中只有一枚青玉简。',
        '"谷中修士，重的是长生，不是杀伐。这部《长春功》，是谷中老祖用三百年枯荣换来的。"',
        '"修它，先学会舍不得；练它，先学会留得住。"'
      ],
      choices: [
        { t: '跪受长春功，三昼夜不辍', effect: { tech: 'changchun' }, lines: ['三昼夜后，你周身缠着一缕青气，桌案上干枯的兰草竟为你返青。（习得《长春功》）'] },
        { t: '欲参悟更上乘的长生之道', effect: { wu: 2 }, lines: ['大长老深深看你一眼："心比天高，也是好事。"当夜你于药王洞参悟，道心通明。（悟性+2）'] }
      ] },
    { id: 'dx_yaotian', title: '丹霞·药田巡视', chapter: false, weight: 7, min: 0, max: 3,
      lines: ['你巡了半日药田，捉了三只偷啃灵参的田鼠，还给一株蔫了的紫芝浇了灵泉。'],
      effect: { herb: 5, stone: 20 } },
    { id: 'dx_lundan', title: '丹霞·丹道小论', chapter: false, weight: 6, min: 1, max: 3,
      lines: ['晚课丹道小论，你与几位师兄辩"文火武火"之争，引经据典，长老频频点头。'],
      effect: { wu: 0.5 } }
  ],
  xuantian: [
    { id: 'xt_shanmen', title: '玄天·入门壮行', chapter: true, weight: 8, min: 0, max: 0, once: true,
      lines: [
        '玄天门山门立在万丈罡风崖上，石阶每一级都比人还高。',
        '"入我玄天门，先过三关：一步一叩，风淬骨，雷洗澡。"守门长老的声音像洪钟。',
        '山上传来师兄们的呼喝声，正是暮课演法。'
      ],
      choices: [
        { t: '一步一叩，拾级而上', effect: { hpMax: 40 }, lines: ['你一路叩到山门，膝盖磨破，气海却稳如磐石。（气血上限+40）'] },
        { t: '以轻身术踏阶直上', effect: { wu: 1 }, lines: ['守门长老眯眼："机灵。"他虽不罚你，还是把你丢进了罡风崖磨了三天。（悟性+1）'] }
      ] },
    { id: 'xt_hushan', title: '玄天·护山阵巡', chapter: true, weight: 7, min: 0, max: 3,
      lines: [
        '今夜轮到你随长老巡护山大阵。',
        '阵眼在一块磨盘大的天青石下，长老指着阵纹说："阵是死的，人是活的。你站进去试试。"',
        '你踏入阵眼，只觉山川气脉顺着脚步涌来，连呼吸都沉了几分。'
      ],
      choices: [
        { t: '静立阵眼，感受山力', effect: { hpMax: 30 }, lines: ['一炷香后你走出阵眼，脚步带风——整座山都在为你壮气。（气血上限+30）'] },
        { t: '请教阵纹玄理', effect: { wu: 1 }, lines: ['长老耐心讲了半夜阵纹，你听了个囫囵，却已种下一颗阵道的种子。（悟性+1）'] }
      ] },
    { id: 'xt_gangfeng', title: '玄天·罡风淬体', chapter: true, weight: 6, min: 1, max: 3, once: true,
      lines: [
        '罡风崖的风，能把石笋削成针。',
        '凡谷修士都不敢在此久留，玄天门却把每一名弟子都扔进来"洗"一遍。',
        '你盘坐崖口，风刃如刀，一刀刀削去你的浮躁。'
      ],
      choices: [
        { t: '七日不出，硬抗罡风', effect: { hpMax: 60 }, lines: ['第七日出崖时，你皮开肉绽，筋骨却硬了不止一层。（气血上限+60）'] },
        { t: '于风眼中观风势', effect: { wu: 1.5 }, lines: ['风眼里反而无风。你枯坐三日，看出风的"势"，自此脚下生根。（悟性+1.5）'] }
      ] },
    { id: 'xt_leichi', title: '玄天·雷池淬体', chapter: true, weight: 5, min: 2, max: 3, once: true,
      lines: [
        '玄天门的雷池，是老祖用一截九天落雷引来的。',
        '池中雷光如蛇，凡人近身即灰飞烟灭。而玄天门的规矩是——要么下水，要么下山。',
        '你深吸一口气，一步踏入雷池。'
      ],
      choices: [
        { t: '沉入池底，引雷入体', fight: { name: '雷池之灵', atk: 100, hp: 520, loot: { tech: 'leiyin', iron: 12 } },
          resultWin: '你驾驭了池中雷灵，肉身如遭雷锻，耳畔似有天雷轰鸣之声回荡。（习得《雷音引》，灵铁+12）',
          resultLose: '你被雷光轰出池面，浑身焦黑，在崖边躺了两天才缓过来。' },
        { t: '在池边观雷悟法', effect: { wu: 2, hpMax: 30 }, lines: ['你没有下水，却在池边把那雷光看了个透。三个月后，你出招时指尖总会带一丝电弧。（悟性+2，气血上限+30）'] }
      ] },
    { id: 'xt_zhenshou', title: '玄天·天关镇守', chapter: true, weight: 5, min: 2, max: 3, once: true,
      lines: [
        '北境天关告急，黑潮初现。玄天门受命镇守天门关。',
        '你随军行至关下，看见关墙上密密麻麻的旧剑痕与名字——那是历代守关人的遗愿。',
        '守关的老将军拍了拍你的肩："站稳了，小道士。关在，人在。"'
      ],
      choices: [
        { t: '镇守天关一年', effect: { wu: 2, hpMax: 80 }, lines: ['你在大雪与黑潮之间站了一年。剑与骨都磨成了关墙的颜色，气血与道心一同沉厚。（悟性+2，气血上限+80）'] },
        { t: '主动请缨袭扰黑潮', effect: { atk: 10, stone: 80 }, lines: ['你带一队勇士夜袭黑潮营地，斩其先锋凯旋。老将军亲自给你温了一碗酒。（攻击+10，灵石+80）'] }
      ] },
    { id: 'xt_xunshan', title: '玄天·山门巡查', chapter: false, weight: 7, min: 0, max: 3,
      lines: ['你巡山时见一名采药人跌下崖去，你飞身接住。对方千恩万谢，硬塞给你一袋灵石。'],
      effect: { stone: 50 } },
    { id: 'xt_muke', title: '玄天·暮课演法', chapter: false, weight: 6, min: 0, max: 3,
      lines: ['暮课万人大演法，山川共鸣。你随阵势运转三个时辰，不觉间肉身又厚了一层。'],
      effect: { hpMax: 25 } }
  ]
};

/* 宗门活动（行动点·1点）：拜入后替代“会友” */
const SECT_SOCIAL = {
  qingyunjian: [
    { id: 'ss_qy_xiying', title: '青云·剑峰习剑', chapter: true, weight: 6, min: 0, max: 3,
      lines: ['剑峰晨课，百人同练一套基础剑。你混在人群里，一招一式练得极为扎实。'],
      choices: [
        { t: '请教剑术教习', effect: { atk: 3, wu: 0.3 }, lines: ['教习也不藏私，点出你三处破绽。当夜你练到月挂中天才歇。（攻击+3，悟性+0.3）'] },
        { t: '约师兄切磋一场', fight: { name: '同门师兄', atk: 60, hp: 300, loot: { stone: 30, atk: 2 } },
          resultWin: '你胜了半招，师兄输得心服口服，改日还帮你磨了剑。（攻击+2）',
          resultLose: '你输得干脆，回去后对镜练了半夜，剑意似乎更锋了些。' }
      ] },
    { id: 'ss_qy_yunhe', title: '青云·云河悟剑', chapter: true, weight: 4, min: 1, max: 3,
      lines: ['剑峰之巅有云河，云起时如剑流。你盘坐河畔，看云聚云散，恍若剑势。'],
      choices: [
        { t: '静观云势一昼夜', effect: { wu: 1 }, lines: ['你看了一昼夜的云。出剑时，剑路竟带了几分云绻云舒。（悟性+1）'] },
        { t: '踏云运剑', effect: { atk: 4, hp: -15 }, lines: ['你在云上运剑三千式，体力耗尽险些坠峰，剑法却再进一步。（攻击+4）'] }
      ] }
  ],
  dpxia: [
    { id: 'ss_dx_caiyao', title: '丹霞·后山采药', chapter: true, weight: 6, min: 0, max: 3,
      lines: ['后山灵药随节气而长，你挎着药篓，顺着药香摸进了云雾深处。'],
      choices: [
        { t: '专挑年份足的挖', effect: { herb: 6 }, lines: ['你挖到三株五十年份的灵参，篓子沉甸甸的。（灵草+6）'] },
        { t: '顺着灵泉走', effect: { herb: 3, elixirs: { juling: 1 } }, lines: ['灵泉尽头长着一丛凝露草，你揣走三株，顺手煮了一壶灵泉茶。（灵草+3，聚气丹+1）'] }
      ] },
    { id: 'ss_dx_zaodan', title: '丹霞·晨起炼丹', chapter: true, weight: 4, min: 1, max: 3,
      lines: ['晨雾未散，丹房已燃起第一炉火。你挽袖上前，接过大长老手里的药臼。'],
      choices: [
        { t: '捣药研配，循序而作', effect: { wu: 0.5, herb: 3 }, lines: ['你配的一剂活血丹火候刚好，大长老验收时"嗯"了一声。（悟性+0.5，灵草+3）'] },
        { t: '求教一炉聚气丹的成败关窍', effect: { stone: -15, elixirs: { juling: 2 } }, lines: ['大长老让你亲自执炉，你赔上十五块灵石的材料，好在丹成两粒。（聚气丹+2）'] }
      ] }
  ],
  xuantian: [
    { id: 'ss_xt_zhenpan', title: '玄天·阵眼打坐', chapter: true, weight: 6, min: 0, max: 3,
      lines: ['护山大阵的阵眼今日轮到你值守，你盘坐石台，山岳气脉顺着坐垫涌来。'],
      choices: [
        { t: '借阵气淬炼肉身', effect: { hpMax: 25 }, lines: ['一炷香的功夫，你感觉皮肉都紧实了几分。（气血上限+25）'] },
        { t: '静听山川气机', effect: { wu: 0.5 }, lines: ['你听见了山川的呼吸声——那是阵心上最难得的顿悟。（悟性+0.5）'] }
      ] },
    { id: 'ss_xt_lianwu', title: '玄天·演武场磨砺', chapter: true, weight: 4, min: 1, max: 3,
      lines: ['演武场沙尘满天，两名师弟正对拆。你下场，挑了块最重的石锁。'],
      choices: [
        { t: '与师弟对拆百招', fight: { name: '玄天师弟', atk: 55, hp: 280, loot: { stone: 25, hpMax: 20 } },
          resultWin: '拳脚往来间，你越打越稳，收了势，师弟揉着肩膀说"师兄手下留情"。（气血上限+20）',
          resultLose: '你被师弟一记抱摔放倒，爬起来拍拍土，倒也觉得爽快。' },
        { t: '举石锁炼力', effect: { hpMax: 35 }, lines: ['一百二十斤的石锁举到第十轮，你双臂发颤，气血却是真的厚了。（气血上限+35）'] }
      ] }
  ]
};

/* ---------------- 成就 ---------------- */
const ACHIEVEMENTS = {
  shou_zhuji:   { name: '破境·筑基',  desc: '第一次突破筑基。',            pts: 2 },
  shou_jiejin:  { name: '金丹大道',    desc: '第一次结成金丹。',            pts: 3 },
  shou_yuanying:{ name: '元婴出窍',    desc: '第一次凝出元婴。',            pts: 4 },
  feisheng:     { name: '羽化登仙',    desc: '渡劫飞升，得道而去。',        pts: 10 },
  daolu:        { name: '道侣同心',    desc: '此生结下道侣。',              pts: 2 },
  shou_zhong:   { name: '寿终正寝',    desc: '安然走完一世凡尘。',          pts: 1 },
  mo_yuan:      { name: '镇魔渊',      desc: '以身镇魔渊，护九州黎民。',    pts: 8 },
  binjie_3:     { name: '三次渡劫',    desc: '一生渡劫三次而不陨。',        pts: 3 },
  ai_renzi:     { name: '双甲子',      desc: '活过二百岁。',                pts: 2 }
};

/* ---------------- 轮回天赋（局外成长） ---------------- */
const REINCARNATION = [
  { id: 'wu',         name: '慧根',     desc: '悟性 +1（先天资质）',            cost: 3, max: 5,  apply: { wu: 1 } },
  { id: 'ti',         name: '强体',     desc: '体魄 +1（肉身根基）',            cost: 3, max: 5,  apply: { ti: 1 } },
  { id: 'stone',      name: '殷实',     desc: '出生时灵石 +1000',               cost: 2, max: 4,  apply: { stone: 1000 } },
  { id: 'juling0',    name: '见面礼',   desc: '出生时自带聚气丹 ×3',           cost: 1, max: 3,  apply: { elixirs: { juling: 3 } } },
  { id: 'cult',       name: '道种',     desc: '修炼速度 +10%（永驻）',          cost: 6, max: 5,  apply: { cultMul: 0.10 } },
  { id: 'alchemy',    name: '丹心',     desc: '炼丹时间 -1年',                   cost: 3, max: 3,  apply: { alchemyTimeReduce: 1 } },
  { id: 'forge',      name: '器魂',     desc: '炼器时间 -1年',                   cost: 3, max: 3,  apply: { forgeTimeReduce: 1 } },
  { id: 'tech0',      name: '家传心法', desc: '出生自带黄阶功法《生息功》',     cost: 3, max: 1,  apply: { tech: 'shengong' } },
  { id: 'sword0',     name: '祖传宝剑', desc: '出生自带法宝【越王勾践剑】',     cost: 6, max: 1,  apply: { art: 'yuewang_sword' } },
  { id: 'life20',     name: '延寿',     desc: '出生寿元 +20',                   cost: 2, max: 3,  apply: { life: 20 } },
  { id: 'shesheng',   name: '舍生',     desc: '修炼速度 +10%，每次修炼 -1寿元', cost: 5, max: 3,  apply: { shesheng: 0.10 } },
  { id: 'lvling_bottle', name: '小绿瓶', desc: '灵草成长时间 -1年',              cost: 3, max: 3,  apply: { herbGrowReduce: 1 } },
  { id: 'extra_field',   name: '随身灵田', desc: '初始灵田 +1块',                cost: 3, max: 3,  apply: { extraField: 1 } },
  { id: 'wuxing_body',   name: '五行灵体', desc: '修炼五行心法速度 +10%',        cost: 5, max: 3,  apply: { wuxingCultMul: 0.10 } }
];

/* ---------------- 工具函数 ---------------- */
function safeStage(s)     { return STAGES[s.idx] || STAGES[11]; }
function requireNeed(s)   { return safeStage(s).need; }
function stageOf(s)       { return safeStage(s); }
function bigIdxOf(s)      { return safeStage(s).bigRealm; }
function realmLife(s)     { return REALM_META[safeStage(s).realm].life; }

/* ============================================================
   装备系统 / 冒险素材 / 坊市（v2 新增）
   ============================================================ */

/* ---------------- 装备档位与槽位 ---------------- */
const EQUIP_TIERS = {
  1: { name: '凡品', color: '#b0b0bc' },
  2: { name: '良品', color: '#5ac8fa' },
  3: { name: '上品', color: '#c06ae0' },
  4: { name: '极品', color: '#e8c15a' },
  5: { name: '仙品', color: '#ff9d3c' }
};
const EQUIP_SLOTS = {
  head:     { name: '头饰' },
  body:     { name: '躯干' },
  leg:      { name: '腿部' },
  treasure: { name: '宝物' }
};

/* ---------------- 装备库 ---------------- */
const EQUIPS = {
  head: {
    ling_toujin:     { name: '云纹包头巾', tier: 1, hpMax: 20,  price: 40,   desc: '粗棉织就，胜在清爽。' },
    wenyao_guan:     { name: '文瑶玉冠',   tier: 2, hpMax: 35,  atk: 6,      price: 160,  desc: '玉质温润，灵光内蕴。' },
    xuantie_kuijia:  { name: '玄铁战盔',   tier: 3, hpMax: 90,  atk: 10, ti: 1, price: 600, desc: '铁血千锤，镇守灵台。' },
    tianbao_guan:    { name: '天宝紫金冠', tier: 4, hpMax: 140, atk: 18, wu: 1, price: 2200, desc: '紫金流彩，天地垂青。' },
    taiyi_huxian:    { name: '太一太上冠', tier: 5, hpMax: 100, wu: 1, price: 6800, desc: '太一之气氤氲，冠上云霞流转。' }
  },
  body: {
    cubu_daopao:     { name: '粗布道袍',   tier: 1, hpMax: 18,  price: 45,   desc: '山门弟子人手一件。' },
    linwen_ruanjia:  { name: '鳞纹软甲',   tier: 2, hpMax: 55,  atk: 5,      price: 180,  desc: '蛟鳞串成，贴身轻盈。' },
    xuanjing_zhongjia:{ name: '玄精重甲',  tier: 3, hpMax: 110, atk: 12,     price: 650,  desc: '玄精所铸，重逾千钧。' },
    jinluo_baoyi:    { name: '金络宝衣',   tier: 4, hpMax: 180, atk: 15, wu: 1, price: 2400, desc: '金丝络络，百邪不侵。' },
    xinghe_fayi:     { name: '星河法衣',   tier: 5, hpMax: 250, ti: 2, price: 7200, desc: '衣上星辰自晦明，映照周天。' }
  },
  leg: {
    qingma_caoxie:   { name: '青麻草鞋',   tier: 1, hpMax: 8,   price: 30,   desc: '山野寻常物，走得稳当。' },
    yunwen_buxue:    { name: '云纹步靴',   tier: 2, hpMax: 25,  atk: 6, wu: 1, price: 170, desc: '靴底绣云，步履生风。' },
    fenglei_zhuiyue: { name: '风雷追月靴', tier: 3, hpMax: 50,  atk: 14,     price: 620,  desc: '雷霆加身，追风逐月。' },
    tianxing_xue:    { name: '天行靴',     tier: 4, hpMax: 70,  atk: 20, wu: 1, price: 2300, desc: '天行健，君子自强不息。' },
    lingyun_xianlv:  { name: '凌云仙履',   tier: 5, hpMax: 100, dun: 2, price: 6600, desc: '履下生云，步步登仙。' }
  },
  treasure: {
    // 基础宝物
    gutang_pinganpai:{ name: '古檀平安牌', tier: 1, hpMax: 15,  price: 50,   desc: '老檀木所刻，讨个吉利。' },
    juling_zhu:      { name: '聚灵珠',     tier: 2, hpMax: 20,  cult: 0.10,  price: 200,  desc: '明珠悬佩，灵气自聚。' },
    zhenhun_moyu:    { name: '镇魂墨玉',   tier: 3, hpMax: 40,  atk: 16,     price: 680,  desc: '墨玉一枚，静心凝神。' },
    jingang_xiangmoyin:{ name: '金刚降魔印', tier: 4, hpMax: 90, atk: 26, wu: 1, price: 2500, desc: '万佛铸印，降魔护身。' },
    taiji_baguapei:  { name: '太极八卦佩', tier: 5, wu: 2, price: 7600, desc: '阴阳相抱，八卦周流，万法不侵。' },
    // 炼器法宝
    qingfeng:        { name: '青锋剑',     tier: 1, atk: 20,    price: 100,  desc: '寒光三尺，取人首级于百步之外。' },
    yuewang_sword:   { name: '越王勾践剑', tier: 5, atk: 50,    price: 0,    desc: '千古名剑，锋芒毕露，斩妖除魔。' },
    xuantie:         { name: '玄铁甲',     tier: 2, hpMax: 150, price: 300,  desc: '玄铁千锻，渡劫之时护住肉身。' },
    juling_art:      { name: '聚灵珠',     tier: 3, cult: 0.05, price: 500,  desc: '灵珠悬顶，天地灵气自聚。' },
    jinylv:          { name: '金缕衣',     tier: 4, hpMax: 200, atk: 30, price: 1000, desc: '天蚕金丝所织，万法不侵。' }
  }
};

/* ---------------- 对手名框素材（按秘境等级分层） ---------------- */
const MONSTER_POOL = {
  // 黄级秘境：匪徒营寨（炼气期，人型怪）
  huang: [
    { name: '劫修', line: '蒙面劫修，手持锈剑，眼中满是贪婪。' },
    { name: '匪徒头目', line: '彪形大汉，腰间挂着几只储物袋，显然是惯犯。' },
    { name: '邪修弟子', line: '修炼邪功走火入魔，神智不清却杀意凛然。' },
    { name: '散修败类', line: '曾经的散修，如今沦为劫道的强盗。' }
  ],
  // 玄级秘境：大黑山（筑基期，妖兽）
  xuan: [
    { name: '黑风狼', line: '狼眼幽绿，伏低身形，喉咙里压着低吼。' },
    { name: '魔化熊妖', line: '熊掌拍地，黑色魔气从伤口溢出。' },
    { name: '毒雾瘴蟒', line: '蟒身盘踞，吐出的黑雾带着腥甜。' },
    { name: '双头犬妖', line: '一火一风两颗头颅，都死死盯着你。' }
  ],
  // 地级秘境：洞天福地（金丹期，混合型）
  di: [
    { name: '洞天守护者', line: '古修士残魂，守护洞天千年不散。' },
    { name: '上古阵灵', line: '阵法凝聚的灵体，周身符文流转。' },
    { name: '仙人遗蜕', line: '肉身不腐，却已被邪气侵染。' },
    { name: '千目蛛母', line: '八足盘踞蛛网中央，千目齐睁。' }
  ],
  // 天级秘境：魔道祖地（元婴期，魔道势力）
  tian: [
    { name: '堕落仙人', line: '仙袍褴褛，眼中一片死寂的金光。' },
    { name: '魔道修士', line: '周身魔气翻涌，已彻底堕入魔道。' },
    { name: '上古妖魔', line: '封印万年，魔性不减反增。' },
    { name: '血铠魔将', line: '血色战甲锈迹斑斑，长戟拖地而行。' }
  ],
  boss: [
    { name: '匪首', line: '独眼龙，手中大刀饮血无数，今日又来猎物。' },
    { name: '黑山老妖', line: '千年树妖，根须遍布整座黑山。' },
    { name: '洞天之主', line: '上古大能残念，一念可镇压金丹修士。' },
    { name: '魔祖化身', line: '魔渊深处的一缕意志，足以让元婴修士胆寒。' }
  ]
};

/* ---------------- 秘境等级配置 ---------------- */
const ADVENTURE_CONFIG = {
  huang: {
    name: '匪徒营寨',
    grade: '黄',
    realmReq: 0,
    desc: '炼气期秘境，匪徒盘踞之地。',
    monsters: MONSTER_POOL.huang,
    boss: MONSTER_POOL.boss[0],
    drops: { herb: 'herb_huang', iron: 'iron_huang' }
  },
  xuan: {
    name: '大黑山',
    grade: '玄',
    realmReq: 1,
    desc: '筑基期秘境，妖兽横行之地。',
    monsters: MONSTER_POOL.xuan,
    boss: MONSTER_POOL.boss[1],
    drops: { herb: 'herb_xuan', iron: 'iron_xuan' }
  },
  di: {
    name: '洞天福地',
    grade: '地',
    realmReq: 2,
    desc: '金丹期秘境，上古洞天遗迹。',
    monsters: MONSTER_POOL.di,
    boss: MONSTER_POOL.boss[2],
    drops: { herb: 'herb_di', iron: 'iron_di' }
  },
  tian: {
    name: '魔道祖地',
    grade: '天',
    realmReq: 3,
    desc: '元婴期秘境，魔道势力盘踞之地。',
    monsters: MONSTER_POOL.tian,
    boss: MONSTER_POOL.boss[3],
    drops: { herb: 'herb_tian', iron: 'iron_tian' }
  },
  xian: {
    name: '遗世仙踪',
    grade: '仙',
    realmReq: 3,
    desc: '每十年一现的仙人遗迹，内藏仙品宝物。',
    monsters: MONSTER_POOL.tian,
    boss: { name: '仙人残念', line: '一缕仙人残念，金光万丈，威压如山。' },
    drops: { herb: 'herb_tian', iron: 'iron_tian' },
    isSpecial: true
  }
};

// 秘境等级映射
const ADVENTURE_GRADE = {
  huang: 0,
  xuan: 1,
  di: 2,
  tian: 3,
  xian: 3
};

// 秘境功法掉落映射
const TECH_DROPS_MAP = {
  huang: ['shengong', 'yuhuo', 'hanshuang', 'xiaoyao', 'changchun', 'leiyin', 'yingdun'],
  xuan: ['shengong', 'yuhuo', 'hanshuang', 'xiaoyao', 'changchun', 'leiyin', 'yingdun'],
  di: ['taixuan', 'hundun', 'jianqi', 'wanjian', 'suodi', 'tiangang'],
  tian: ['taixuan', 'hundun', 'jianqi', 'wanjian', 'suodi', 'tiangang'],
  xian: ['kaitian', 'taixuan', 'hundun', 'jianqi', 'wanjian', 'suodi']
};

/* ---------------- 冒险环境与节点文案（按秘境等级分层） ---------------- */
// 黄级秘境：匪徒营寨（炼气期，人型怪）
const ADV_SETTINGS_HUANG = [
  '破败的山寨前，篝火映着几张凶狠的面孔。',
  '山道上横七竖八躺着醉倒的匪徒，酒气冲天。',
  '暗哨里有人低声交谈，你屏息靠近。',
  '粮仓外堆满劫来的货物，几个小喽啰在分赃。',
  '寨主的大帐灯火通明，隐约传来争吵声。'
];
// 玄级秘境：大黑山（筑基期，妖兽）
const ADV_SETTINGS_XUAN = [
  '黑雾弥漫的山林，兽吼声从四面八方传来。',
  '古木参天，树冠间有巨大的蛛网闪烁着幽光。',
  '山涧溪水漆黑如墨，散发着淡淡的魔气。',
  '悬崖峭壁上，妖兽的巢穴隐约可见。',
  '深谷中磷火点点，白骨堆积如山。'
];
// 地级秘境：洞天福地（金丹期，混合型）
const ADV_SETTINGS_DI = [
  '星光倒悬的诡异洞窟，天顶有星辰在缓缓流转。',
  '爬满藤蔓的废弃宫殿，檐角滴着不知名的水。',
  '暗河奔涌的地底河道，水声在石壁间来回冲撞。',
  '悬浮在虚空中的碎石小径，两侧是无尽深渊。',
  '仙气缭绕的庭院，石桌上还摆着未下完的棋局。'
];
// 天级秘境：魔道祖地（元婴期，魔道势力）
const ADV_SETTINGS_TIAN = [
  '魔气冲天的祭坛，血色符文在地面缓缓流动。',
  '倒塌的魔宫废墟，残垣断壁间传来低沉的呜咽。',
  '黑色的天穹下，巨大的魔像俯视着来者。',
  '万魔殿前，魔火熊熊燃烧，热浪扑面。',
  '魔渊深处，黑暗中无数双眼睛在注视着你。'
];
// 仙级秘境：遗世仙踪（每十年一现）
const ADV_SETTINGS_XIAN = [
  '金光万丈的仙人洞府，灵气浓郁得几乎凝成实质。',
  '悬浮在云端的仙宫废墟，仙鹤盘旋，钟声悠扬。',
  '千年古树下，一位白发老者正在品茶，似在等你。',
  '仙泉叮咚，池中金莲绽放，每一瓣都蕴含道韵。',
  '天门半开，仙乐阵阵，隐约可见琼楼玉宇。'
];
// 按秘境等级索引
const ADV_SETTINGS_MAP = {
  huang: ADV_SETTINGS_HUANG,
  xuan: ADV_SETTINGS_XUAN,
  di: ADV_SETTINGS_DI,
  tian: ADV_SETTINGS_TIAN,
  xian: ADV_SETTINGS_XIAN
};
const ADV_NODES = {
  combat:   { name: '遭遇战',   icon: '⚔', desc: '前方妖气冲天，一场恶战在所难免。' },
  elite:    { name: '精英强敌', icon: '☠', desc: '它守在必经之路上，气息远比同类可怕。' },
  treasure: { name: '无名宝箱', icon: '▣', desc: '一口微微发光的宝箱，看不出年月。' },
  herb:     { name: '灵草丛',   icon: '❀', desc: '药香扑鼻，年份十足，四周却静得反常。' },
  iron:     { name: '灵铁矿脉', icon: '▲', desc: '矿脉露出地表，半截石壁闪着金属光泽。' },
  shop:     { name: '荒野坊市', icon: '◇', desc: '荒僻之地竟有一间亮着灯的小铺。' },
  event:    { name: '雾中奇遇', icon: '☯', desc: '迷雾深处，似乎传来一声苍老的咳嗽。' }
};

/* ---------------- 坊市商品 ---------------- */
const SHOP_ITEMS = [
  { id: 'herb5',       name: '灵草 ×5',    price: 30,  give: { herb: 5 } },
  { id: 'iron3',       name: '灵铁 ×3',    price: 30,  give: { iron: 3 } },
  { id: 'juling',      name: '聚气丹',     price: 80,  give: { elixirs: { juling: 1 } } },
  { id: 'zhuji',       name: '筑基丹',     price: 150, give: { elixirs: { zhuji: 1 } } },
  { id: 'jiejin',      name: '结金丹',     price: 400, give: { elixirs: { jiejin: 1 } } },
  { id: 'zengshou',    name: '增寿丹',     price: 250, give: { elixirs: { zengshou: 1 } } },
  { id: 'tech_shengong', name: '功法·生息功', price: 150, tech: 'shengong' },
  { id: 'tech_xiaoyao',  name: '功法·逍遥步', price: 90,  tech: 'xiaoyao' },
  { id: 'tech_yuhuo',    name: '功法·御火诀', price: 120, tech: 'yuhuo' },
  { id: 'tech_hanshuang',name: '功法·凝霜诀', price: 160, tech: 'hanshuang' },
  { id: 'tech_changchun',name: '功法·长春功', price: 480, tech: 'changchun' },
  { id: 'tech_leiyin',   name: '功法·雷音引', price: 500, tech: 'leiyin' },
  { id: 'tech_jianqi',   name: '功法·剑气诀', price: 550, tech: 'jianqi' },
  { id: 'tech_tiangang', name: '功法·天罡诀', price: 700, tech: 'tiangang' },
  { id: 'tech_yingdun',  name: '功法·影遁术', price: 320, tech: 'yingdun' },
  { id: 'tech_suodi',    name: '功法·缩地成寸', price: 900, tech: 'suodi' }
];

/* ---------------- 宗门俸禄（每年） ---------------- */
const SECT_FENGLU = {
  qingyunjian: { stone: 18, herb: 1 },
  dpxia:       { stone: 12, herb: 8 },
  xuantian:    { stone: 15, iron: 2 }
};

/* ---------------- 宗门活动：降妖除魔 ---------------- */
const SECT_COMBAT = {
  qingyunjian: [
    { id: 'qy_xm1', title: '降妖·山猪精', min: 0, max: 2,
      enemy: { name: '山猪精', line: '一头鬃毛如铁的山猪横冲而来，獠牙闪着寒光。', atk: 28, hp: 140, loot: { stone: 60, herb: 2 } },
      lines: ['青云山脚偶有妖兽出没，宗门悬赏降妖。你领了令，循着蹄印入了林子。'] },
    { id: 'qy_xm2', title: '降妖·毒蛇群', min: 0, max: 2,
      enemy: { name: '毒蛇群', line: '数十条毒蛇从草丛中窜出，蛇信嘶嘶作响。', atk: 22, hp: 180, loot: { stone: 50, herb: 4 } },
      lines: ['后山药田遭蛇群侵扰，药农苦不堪言。你提剑前往，一探究竟。'] },
    { id: 'qy_xm3', title: '降妖·剑齿虎', min: 0, max: 2,
      enemy: { name: '剑齿虎', line: '一头斑斓猛虎拦在路中央，两根剑齿足有三尺长。', atk: 35, hp: 120, loot: { stone: 80 }, equipChance: 0.2 },
      lines: ['师兄传来急报：剑齿虎伤了过路商旅。你二话不说，提剑下山。'] },
    { id: 'qy_xm4', title: '降妖·妖修残党', min: 3, max: 5,
      enemy: { name: '妖修残党', line: '一名散修周身妖气缠绕，手中捏着一柄淬毒短剑。', atk: 65, hp: 320, loot: { stone: 180, iron: 5 }, techChance: 0.2 },
      lines: ['有妖修混入坊市，被察觉后逃入山林。宗门下令围剿。'] },
    { id: 'qy_xm5', title: '降妖·傀儡阵', min: 3, max: 5,
      enemy: { name: '石傀儡', line: '三尊石傀儡齐齐转头，关节发出嘎嘎声响。', atk: 55, hp: 400, loot: { stone: 150, iron: 8 } },
      lines: ['古遗迹中发现一具傀儡阵，宗门派你前去试探虚实。'] },
    { id: 'qy_xm6', title: '降妖·黑风寨', min: 3, max: 5,
      enemy: { name: '黑风寨主', line: '寨主一身横肉，手持狼牙棒，脚下踩着半坛烈酒。', atk: 70, hp: 280, loot: { stone: 200 }, equipChance: 0.3 },
      lines: ['黑风寨劫掠商队，宗门震怒。你主动请缨，率队清剿。'] },
    { id: 'qy_xm7', title: '降妖·蛟龙', min: 6, max: 8,
      enemy: { name: '恶蛟', line: '一条黑蛟盘踞湖心，鳞甲如铁，龙息灼热。', atk: 120, hp: 600, loot: { stone: 400, herb: 8 }, techChance: 0.3 },
      lines: ['碧波湖中出了恶蛟，渔民不敢出船。宗门悬赏：斩蛟者，赏灵石四百。'] },
    { id: 'qy_xm8', title: '降妖·魔修入侵', min: 6, max: 8,
      enemy: { name: '魔修长老', line: '一名黑袍老者踏空而来，周身魔气翻涌如墨。', atk: 140, hp: 520, loot: { stone: 350, iron: 12 }, equipChance: 0.3 },
      lines: ['魔修犯境，宗门大阵轰鸣。你请缨出战，迎击来犯之敌。'] },
    { id: 'qy_xm9', title: '降妖·远古凶兽', min: 6, max: 8,
      enemy: { name: '远古凶兽', line: '一头从未见过的巨兽从地底钻出，双眼如血月。', atk: 130, hp: 700, loot: { stone: 500 }, techChance: 0.4 },
      lines: ['地脉异动，一头远古凶兽破土而出。宗门倾巢出动，你担任先锋。'] }
  ],
  dpxia: [
    { id: 'dx_xm1', title: '降妖·毒蟒', min: 0, max: 2,
      enemy: { name: '毒蟒', line: '一条碗口粗的毒蟒缠在灵草田边，信子嘶嘶作响。', atk: 25, hp: 150, loot: { stone: 50, herb: 5 } },
      lines: ['灵草田遭毒蟒侵扰，药童哭丧着脸来报。你取了药锄，往田间走去。'] },
    { id: 'dx_xm2', title: '降妖·偷药贼', min: 0, max: 2,
      enemy: { name: '偷药散修', line: '一个鬼鬼祟祟的散修怀里揣满了灵草，正想翻墙逃跑。', atk: 20, hp: 120, loot: { stone: 40, herb: 6 } },
      lines: ['连日来灵草频频失窃，你设下埋伏，果然逮到了贼人。'] },
    { id: 'dx_xm3', title: '降妖·火蝎群', min: 0, max: 2,
      enemy: { name: '火蝎群', line: '数十只火蝎从地缝中涌出，尾针闪着赤红毒光。', atk: 30, hp: 160, loot: { stone: 70, herb: 3 } },
      lines: ['丹房地基下涌出火蝎，炼丹被迫中断。你被派去清理。'] },
    { id: 'dx_xm4', title: '降妖·毒蛙王', min: 3, max: 5,
      enemy: { name: '毒蛙王', line: '一只磨盘大的毒蛙蹲在池塘中央，浑身冒着绿泡。', atk: 60, hp: 350, loot: { stone: 160, herb: 10 }, techChance: 0.2 },
      lines: ['后山池塘被毒蛙占据，连水源都被污染。你领命前往清除。'] },
    { id: 'dx_xm5', title: '降妖·灵草大盗', min: 3, max: 5,
      enemy: { name: '灵草大盗', line: '一个蒙面修士背着满满一袋灵草，身法诡异。', atk: 70, hp: 260, loot: { stone: 200, herb: 12 }, equipChance: 0.25 },
      lines: ['谷中灵草被大量盗取，损失惨重。你主动请缨追查。'] },
    { id: 'dx_xm6', title: '降妖·妖蜂巢', min: 3, max: 5,
      enemy: { name: '妖蜂后', line: '蜂巢足有磨盘大，蜂后盘踞其上，翅翼如刀。', atk: 50, hp: 420, loot: { stone: 180, herb: 8 } },
      lines: ['妖蜂巢堵住了灵脉泉眼，不除不行。你穿好防护，深入蜂巢。'] },
    { id: 'dx_xm7', title: '降妖·千年毒蛟', min: 6, max: 8,
      enemy: { name: '千年毒蛟', line: '一条浑身碧绿的毒蛟盘踞在药田深处，吐息间草木枯萎。', atk: 110, hp: 650, loot: { stone: 450, herb: 15 }, techChance: 0.3 },
      lines: ['千年毒蛟侵入核心药田，丹霞谷倾全力围剿。你率队直取蛟首。'] },
    { id: 'dx_xm8', title: '降妖·炼丹邪修', min: 6, max: 8,
      enemy: { name: '邪丹师', line: '一个披头散发的修士面前摆着三口黑锅，锅中翻滚着不明液体。', atk: 100, hp: 550, loot: { stone: 400, herb: 10 }, equipChance: 0.3 },
      lines: ['有人用活人炼丹，丹霞谷震怒。你带队清剿邪修老巢。'] },
    { id: 'dx_xm9', title: '降妖·万毒之母', min: 6, max: 8,
      enemy: { name: '万毒之母', line: '一团蠕动的毒液聚合体缓缓成形，散发着令人窒息的恶臭。', atk: 90, hp: 800, loot: { stone: 500, herb: 20 }, techChance: 0.4 },
      lines: ['毒脉深处孕育出万毒之母，若不除去，整个丹霞谷的灵草都将枯死。'] }
  ],
  xuantian: [
    { id: 'xt_xm1', title: '降妖·鬼火', min: 0, max: 2,
      enemy: { name: '幽冥鬼火', line: '一团幽蓝火焰在夜空中飘荡，所过之处草木枯萎。', atk: 22, hp: 160, loot: { stone: 55, iron: 3 } },
      lines: ['山门外现幽冥鬼火，弟子人心惶惶。你领了镇鬼符，前往查看。'] },
    { id: 'xt_xm2', title: '降妖·僵尸', min: 0, max: 2,
      enemy: { name: '跳尸', line: '一具僵尸从棺中跳出，指甲乌黑如铁，直扑你面门。', atk: 30, hp: 130, loot: { stone: 65, herb: 2 } },
      lines: ['后山古墓传出异响，守墓弟子失联。你提灯夜探古墓。'] },
    { id: 'xt_xm3', title: '降妖·恶灵', min: 0, max: 2,
      enemy: { name: '怨灵', line: '一道虚影在月光下凝聚，面容扭曲，口中发出无声的尖叫。', atk: 18, hp: 200, loot: { stone: 50, iron: 4 } },
      lines: ['弟子修炼时被怨灵侵扰，心神不宁。你布下法阵，引灵现身。'] },
    { id: 'xt_xm4', title: '降妖·地煞', min: 3, max: 5,
      enemy: { name: '地煞魔', line: '地面裂开一道缝隙，一只漆黑的巨手从中伸出。', atk: 75, hp: 300, loot: { stone: 200, iron: 8 }, techChance: 0.2 },
      lines: ['地脉异动，地煞之气冲破封印。你率弟子前往镇压。'] },
    { id: 'xt_xm5', title: '降妖·夺舍邪修', min: 3, max: 5,
      enemy: { name: '夺舍邪修', line: '一个年轻修士眼中闪过不属于他的凶光——这具身体，早已不是原来的主人。', atk: 65, hp: 350, loot: { stone: 180, iron: 6 }, equipChance: 0.25 },
      lines: ['有弟子行为异常，疑被夺舍。你暗中调查，揭穿邪修面目。'] },
    { id: 'xt_xm6', title: '降妖·封印裂隙', min: 3, max: 5,
      enemy: { name: '裂隙魔物', line: '一道空间裂缝中涌出奇形怪状的魔物，嘶吼着扑来。', atk: 60, hp: 380, loot: { stone: 220, iron: 10 } },
      lines: ['宗门封印出现裂隙，魔物趁虚而入。你挺身而出，填补裂隙。'] },
    { id: 'xt_xm7', title: '降妖·天魔化身', min: 6, max: 8,
      enemy: { name: '天魔化身', line: '一尊虚幻的魔影凝聚成形，魔气冲天，连大阵都在颤抖。', atk: 130, hp: 580, loot: { stone: 420, iron: 15 }, techChance: 0.3 },
      lines: ['天魔分出一缕化身侵入玄天门，宗门大阵全力运转。你被选为斩魔之人。'] },
    { id: 'xt_xm8', title: '降妖·阴兵过境', min: 6, max: 8,
      enemy: { name: '阴兵将领', line: '一名身披黑甲的阴将立于万军之前，手中长戟泛着幽光。', atk: 120, hp: 700, loot: { stone: 380, iron: 12 }, equipChance: 0.3 },
      lines: ['阴兵过境，生人回避。你以法阵开路，正面迎击阴兵大军。'] },
    { id: 'xt_xm9', title: '降妖·域外天魔', min: 6, max: 8,
      enemy: { name: '域外天魔', line: '一道漆黑的裂缝撕开天幕，一只不可名状的巨眼从中窥视。', atk: 140, hp: 650, loot: { stone: 500, iron: 20 }, techChance: 0.4 },
      lines: ['域外天魔撕裂虚空入侵，玄天门全员戒备。你以命为引，布下封魔大阵。'] }
  ]
};

/* ---------------- 宗门活动：道庭讲法 ---------------- */
const SECT_LECTURE = {
  id: 'dao_ting_jiang', title: '道庭讲法',
  lines: [
    '道庭之中，一位长老端坐蒲团之上，面前数十名弟子屏息静听。',
    '今日讲的是灵气运转与经脉共鸣之理——你坐在后排，听得入神。'
  ],
  effect: { qi: 200 },
  result: '你心有所悟，体内灵气流转顺畅了不少。',
  req: { maxRealm: 2 }
};