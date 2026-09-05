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
    effect: '气血上限 +100',
    apply: { hpMax: 100 }
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
  jinren:    { name: '金刃术',   cls: 'shufa', grade: '黄', element: '金', dmg: 2.0,  cost: 15, desc: '金气化刃，斩敌经脉。' },
  tengman:   { name: '藤蔓术',   cls: 'shufa', grade: '黄', element: '木', dmg: 1.5,  cost: 12, debuff: { atkDown: 20, duration: 2 }, desc: '藤蔓缠绕，令敌行动迟缓。' },
  shuidan:   { name: '水弹术',   cls: 'shufa', grade: '黄', element: '水', dmg: 1.8,  cost: 14, desc: '水气凝聚，化弹击敌。' },
  huoqiu:    { name: '火球术',   cls: 'shufa', grade: '黄', element: '火', dmg: 1.5,  cost: 13, buff: { atkUp: 20, duration: 3 }, desc: '火球焚身，烈焰加护。' },
  luoshi:    { name: '落石术',   cls: 'shufa', grade: '黄', element: '土', dmg: 1.5,  cost: 13, buff: { defUp: 20, duration: 2 }, desc: '巨石压顶，土气护体。' },
  yuhuo:     { name: '御火诀',   cls: 'shufa', grade: '黄', element: '火', dmg: 1.5,  cost: 13, desc: '御火之术，焚尽万物。' },
  hanshuang: { name: '凝霜诀',   cls: 'shufa', grade: '黄', element: '水', dmg: 1.5,  cost: 13, desc: '凝霜化冰，寒气逼人。' },
  leiyin:    { name: '雷音引',   cls: 'shufa', grade: '黄', element: '金', dmg: 1.5,  cost: 13, desc: '雷音震耳，破敌心神。' },
  jianqi:    { name: '剑气诀',   cls: 'shufa', grade: '黄', element: '金', dmg: 2.0,  cost: 15, desc: '剑气纵横，斩敌百步。' },
  // --- 玄级法术（攻击） ---
  jinguang:  { name: '金光剑',   cls: 'shufa', grade: '玄', element: '金', dmg: 3.0,  cost: 25, desc: '金光化剑，锐不可当。' },
  muyuling:  { name: '木灵治愈', cls: 'shufa', grade: '玄', element: '木', dmg: 0,    cost: 20, heal: 0.30, desc: '木灵之力，治愈创伤。' },
  hanbing:   { name: '寒冰刺',   cls: 'shufa', grade: '玄', element: '水', dmg: 2.5,  cost: 28, freeze: 1, desc: '寒冰刺骨，冻彻心扉。' },
  lieyan:    { name: '烈焰斩',   cls: 'shufa', grade: '玄', element: '火', dmg: 2.0,  cost: 22, buff: { atkUp: 20, duration: 3 }, desc: '烈焰缠身，攻伐加护。' },
  luoyan:    { name: '落岩术',   cls: 'shufa', grade: '玄', element: '土', dmg: 2.5,  cost: 26, desc: '巨岩轰击，势大力沉。' },
  // --- 玄级法术（抵御/恢复） ---
  jinguanghu: { name: '金光护体', cls: 'shufa', grade: '玄', element: '金', dmg: 0,   cost: 18, buff: { defUp: 30, duration: 3 }, desc: '金光护体，刀枪不入。' },
  shengji:    { name: '生机缠绕', cls: 'shufa', grade: '玄', element: '木', dmg: 0,   cost: 18, debuff: { atkDown: 25, duration: 2 }, desc: '生机缠绕，削弱敌势。' },
  shuilingshu: { name: '水灵术', cls: 'shufa', grade: '玄', element: '水', dmg: 0,   cost: 20, heal: 0.25, desc: '水灵之力，治愈创伤。' },
  huodun:     { name: '火盾术',   cls: 'shufa', grade: '玄', element: '火', dmg: 0,   cost: 18, buff: { defUp: 25, duration: 2 }, desc: '烈焰护盾，焚尽攻击。' },
  yanjia:     { name: '岩甲术',   cls: 'shufa', grade: '玄', element: '土', dmg: 0,   cost: 20, buff: { defUp: 40, duration: 3 }, desc: '岩石护甲，固若金汤。' },
  // --- 地级法术 ---
  wanjian:    { name: '万剑归宗', cls: 'shufa', grade: '地', element: '金', dmg: 4.0,  cost: 45, desc: '万剑齐鸣，天地失色。' },
  shengjiayang: { name: '生机盎然', cls: 'shufa', grade: '地', element: '木', dmg: 0,  cost: 40, heal: 0.50, desc: '生机盎然，枯木回春。' },
  xuanbing:   { name: '玄冰阵',   cls: 'shufa', grade: '地', element: '水', dmg: 3.0,  cost: 42, freeze: 2, desc: '玄冰大阵，冻彻天地。' },
  tianhuo:    { name: '天火焚城', cls: 'shufa', grade: '地', element: '火', dmg: 4.0,  cost: 45, desc: '天火降世，焚尽万物。' },
  shanyue:    { name: '山岳镇压', cls: 'shufa', grade: '地', element: '土', dmg: 3.0,  cost: 38, debuff: { atkDown: 30, duration: 3 }, desc: '山岳压顶，镇压四方。' },
  // --- 天级法术 ---
  potian:     { name: '破天一击', cls: 'shufa', grade: '天', element: '金', dmg: 4.5,  cost: 70, desc: '金光破天，一击必杀。' },
  wanmu:      { name: '万木回春', cls: 'shufa', grade: '天', element: '木', dmg: 0,    cost: 65, heal: 0.80, desc: '万木回春，枯木逢生。' },
  bingfeng:   { name: '冰封千里', cls: 'shufa', grade: '天', element: '水', dmg: 3.5,  cost: 75, freeze: 3, desc: '冰封千里，万物凝固。' },
  fantian:    { name: '焚天灭地', cls: 'shufa', grade: '天', element: '火', dmg: 4.5,  cost: 70, desc: '焚天灭地，烈焰滔天。' },
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
  { id: 'shui',     name: '水灵根',     desc: '润泽万灵，渡劫有福。',      w: 6,  qiMul: 1.25, body: { trib: 0.08 } },
  { id: 'huo',      name: '火灵根',     desc: '烈焰焚天，攻伐凌厉。',      w: 6,  qiMul: 1.25, body: { atk: 15 } },
  { id: 'tu',       name: '土灵根',     desc: '厚重如山，肉身强横。',      w: 6,  qiMul: 1.25, body: { hpMax: 80 } },
  { id: 'lei',      name: '雷灵根',     desc: '先天雷脉！渡劫天雷反成补益。', w: 3, qiMul: 1.5, body: { trib: 0.15 } },
  { id: 'feng',     name: '风灵根',     desc: '身随清风，轻灵缥缈。',      w: 3,  qiMul: 1.5, body: { quirk: 'feng' } },
  { id: 'bing',     name: '冰灵根',     desc: '玄冰彻骨，举世罕见。',      w: 3,  qiMul: 1.5, body: { atk: 20, trib: 0.05 } },
  { id: 'hundun',   name: '混沌灵体',   desc: '鸿蒙未判之气加身，万法归宗！', w: 1, qiMul: 2.0, body: { trib: 0.08, atk: 10 } }
];

/* ---------------- 开局命格（品质分级） ---------------- */
const TIER_COLORS = { white: '#b0b0bc', green: '#4ec9a0', blue: '#5ac8fa', purple: '#c06ae0', gold: '#e8c15a' };
const TIER_NAMES = { white: '凡命', green: '本命', blue: '奇命', purple: '极命', gold: '仙命' };
const TALENTS = [
  // ==================== 凡命（白）—— 单维+2 ====================
  { id: 't_wu2',    name: '灵台清明',   tier: 'white', desc: '灵台清明，悟性 +2。',           apply: { wu: 2 } },
  { id: 't_ti2',    name: '铜皮铁骨',   tier: 'white', desc: '铜皮铁骨，体魄 +2。',           apply: { ti: 2 } },
  { id: 't_dun2',   name: '踏雪无痕',   tier: 'white', desc: '踏雪无痕，遁速 +2。',           apply: { dun: 2 } },
  { id: 't_shen2',  name: '洞察秋毫',   tier: 'white', desc: '洞察秋毫，神识 +2。',           apply: { shen: 2 } },
  { id: 't_dao2',   name: '心如止水',   tier: 'white', desc: '心如止水，道心 +2。',           apply: { dao: 2 } },
  { id: 't_fu2',    name: '财星高照',   tier: 'white', desc: '财星高照，福源 +2。',           apply: { fu: 2 } },
  // ==================== 本命（绿）—— 属性+战斗 ====================
  { id: 't_dati',   name: '道体天成',   tier: 'green', desc: '道体天成，悟性 +3，道心 +1。',   apply: { wu: 3, dao: 1 } },
  { id: 't_jianxin',name: '剑心通明',   tier: 'green', desc: '剑心通明，神识 +3，悟性 +1。',   apply: { shen: 3, wu: 1 } },
  { id: 't_xixue',  name: '噬血诀',     tier: 'green', desc: '攻击时回复伤害 10% 的气血。',   apply: { lifesteal: 0.10 } },
  { id: 't_fanshe', name: '玄甲反噬',   tier: 'green', desc: '受击时反弹 15% 伤害给敌人。',   apply: { thorns: 0.15 } },
  { id: 't_lianji', name: '疾风连击',   tier: 'green', desc: '攻击时 15% 概率追加一次攻击。', apply: { doubleHit: 0.15 } },
  { id: 't_juxi',   name: '聚息养神',   tier: 'green', desc: '聚息养神，道心 +2，悟性 +2。',   apply: { dao: 2, wu: 2 } },
  // ==================== 奇命（蓝）—— 属性放大+战斗 ====================
  { id: 't_ti_amplify', name: '金刚不坏',  tier: 'blue', desc: '体魄对气血的影响翻倍。',     apply: { tiMul: 2 } },
  { id: 't_dun_amplify',name: '风驰电掣',  tier: 'blue', desc: '遁速对闪避和额外攻击的影响翻倍。', apply: { dunMul: 2 } },
  { id: 't_shen_amplify',name: '天眼通',   tier: 'blue', desc: '神识对暴击率的影响翻倍。',   apply: { shenMul: 2 } },
  { id: 't_fu_amplify', name: '天赐财缘',  tier: 'blue', desc: '福源对灵石获取的影响翻倍。', apply: { fuMul: 2 } },
  { id: 't_zhanmie',    name: '一剑封喉',  tier: 'blue', desc: '攻击时对气血低于 20% 的敌人直接斩杀。', apply: { execute: 0.20 } },
  { id: 't_baoji_boost',name: '致命一击',  tier: 'blue', desc: '暴击伤害从 200% 提升至 300%。', apply: { critDmgBoost: 1.0 } },
  // ==================== 极命（紫）—— 强力战斗+三维 ====================
  { id: 't_tianling',name: '天灵根',    tier: 'purple',desc: '天灵根，悟性 +5，道心 +3，福源 +2。', apply: { wu: 5, dao: 3, fu: 2 } },
  { id: 't_hunti',  name: '混元道体',   tier: 'purple',desc: '混元道体，体魄 +5，道心 +3，悟性 +2。', apply: { ti: 5, dao: 3, wu: 2 } },
  { id: 't_leiling',name: '雷灵之体',   tier: 'purple',desc: '雷灵之体，遁速 +5，神识 +3，体魄 +2。', apply: { dun: 5, shen: 3, ti: 2 } },
  { id: 't_xixue2', name: '血魔大法',   tier: 'purple',desc: '攻击时回复伤害 25% 的气血。',   apply: { lifesteal: 0.25 } },
  { id: 't_fanshe2',name: '荆棘之体',   tier: 'purple',desc: '受击时反弹 30% 伤害给敌人。',   apply: { thorns: 0.30 } },
  // ==================== 仙命（金）—— 逆天效果 ====================
  { id: 't_jiutian',name: '九天玄体',   tier: 'gold',  desc: '九天玄体，全六维 +3。',         apply: { wu: 3, ti: 3, dun: 3, shen: 3, dao: 3, fu: 3 } },
  { id: 't_grow_wu',name: '道心渐明',   tier: 'gold',  desc: '道心渐明，每年悟性 +0.5（永久）。', apply: { growWu: 0.5 } },
  { id: 't_grow_ti',name: '肉身成圣',   tier: 'gold',  desc: '肉身成圣，每年体魄 +0.5（永久）。', apply: { growTi: 0.5 } },
  { id: 't_grow_dun',name: '御风化影',  tier: 'gold',  desc: '御风化影，每年遁速 +0.5（永久）。', apply: { growDun: 0.5 } },
  { id: 't_tianming',name: '天命之子',  tier: 'gold',  desc: '天命之子，道心 +5，福源 +5，渡劫 +25%。', apply: { dao: 5, fu: 5, trib: 0.25 } }
];

/* ---------------- 劫轮回系统 ---------------- */
const JIE_DATA = [
  { jie: 0, name: '凡尘轮回', diff: 1.0,  unlock: 0,  desc: '默认轮回' },
  { jie: 1, name: '初劫',     diff: 1.15, unlock: 1,  desc: '完成1次0劫轮回' },
  { jie: 2, name: '二劫',     diff: 1.30, unlock: 2,  desc: '完成1次1劫轮回' },
  { jie: 3, name: '三劫',     diff: 1.50, unlock: 3,  desc: '完成1次2劫轮回' },
  { jie: 4, name: '四劫',     diff: 1.75, unlock: 4,  desc: '完成1次3劫轮回' },
  { jie: 5, name: '五劫',     diff: 2.00, unlock: 5,  desc: '完成1次4劫轮回' },
  { jie: 6, name: '六劫',     diff: 2.40, unlock: 6,  desc: '完成1次5劫轮回' },
  { jie: 7, name: '七劫',     diff: 2.80, unlock: 7,  desc: '完成1次6劫轮回' },
  { jie: 8, name: '八劫',     diff: 3.30, unlock: 8,  desc: '完成1次7劫轮回' },
  { jie: 9, name: '九劫',     diff: 4.00, unlock: 9,  desc: '完成1次8劫轮回' }
];
// 命格品质权重表 [白, 绿, 蓝, 紫, 金]
const JIE_TIER_WEIGHTS = [
  [40, 35, 20, 5, 0],    // 0劫
  [35, 35, 22, 8, 0],    // 1劫
  [30, 33, 25, 12, 0],   // 2劫
  [25, 30, 28, 15, 2],   // 3劫
  [20, 28, 30, 18, 4],   // 4劫
  [15, 25, 30, 22, 8],   // 5劫
  [10, 20, 30, 28, 12],  // 6劫
  [5, 15, 28, 32, 20],   // 7劫
  [0, 10, 25, 35, 30],   // 8劫
  [0, 5, 20, 35, 40]     // 9劫
];
const TIER_KEYS = ['white', 'green', 'blue', 'purple', 'gold'];

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
      '满山的朝霞流光都朝你涌了过来。',
      '没过几天，一位身着打着补丁却洗的干净道袍的清瘦道士路过村子，他唤你走近，伸出两根枯瘦的手指搭在你腕上，闭目不语。',
      '片刻后，他睁开眼，目光复杂，似是喜悦似是不忍："根骨不错，但...." 犹豫片刻后，他终究从怀中取出一枚玉符递给你。',
      '你接过那隐约闪着灵光的玉符，指尖触及冰凉的玉石，一股暖流涌入体内——那就是说书先生口中的天地灵气吧！',
      '"灵根既已觉醒，从今日起，你便不再是凡人了，这玉符之中有一段口诀，小娃娃，要好生修行啊！"'
    ],
    flavor: { stone: 30, ti: 3 }
  },
  {
    title: '世家庶子',
    lines: [
      '你是青州城赵家的庶子。母亲原是侍女，又在你幼时离世，全靠姨母照料方能长成，你自幼便懂得看人眼色。',
      '嫡兄的功课你替抄，嫡姐的婚事你来斟茶。族学里先生教过你《千字文》，其余皆靠你夜夜偷读。',
      '这世道似乎欠你一道门—，一道能让你头也不回离开的门。',
      '这日族中祭祖，祠堂里那根供奉百年的测灵柱忽然亮了一亮。',
      '霎时间，满堂寂静，而所有人的目光都落在了你身上。',
      '一位路过的老道士挤进人群，伸出两根枯瘦的手指搭在你腕上，闭目不语。',
      '片刻后，他睁开眼，目光复杂似是喜悦似是不忍："根骨不错，但...." 犹豫片刻后，他终究从怀中取出一枚玉符递给你。',
      '你接过那隐约闪着灵光的玉符，指尖触及冰凉的玉石，一股暖流涌入体内——那就是古书中的天地灵气吧！',
      '"灵根已觉醒。从今日起，你便不再是凡人了，这玉符之中有一段口诀，小娃娃，要好生修行啊！"'
    ],
    flavor: { wu: 1, stone: 50, dao: 1 }
  },
  {
    title: '道门遗孤',
    lines: [
      '你不知自己生来何处。残破襁褓、一枚褪色玉佩，是你在道观门口被拾起时仅有的一切。',
      '老道士把你养大，教你读经、煮药、治病救人，观星看命。他说你根骨清奇，又说你命数缠劫。',
      '十六岁这年，那养你十余载的老人神情复杂，似是喜悦似是不忍，',
      '犹豫片刻后，他终究从怀中取出一枚玉符递给你："该到的还是要到啊，娃娃，下山去吧，也是时候去找你的来处，也找你的去处了。"',
      '你接过那隐约闪着灵光的玉符，一股暖流涌入体内——那是老道士口中的天地灵气，你也曾在入静之时感受过，',
      '此刻，你只觉生活多年的青翠山野间实则灵压流转气势磅礴，如一粒蜉蝣，得见真天地。',
      '"娃娃，你的灵根已觉醒。从今日起，你便是名副其实的修真者了，道门戒律你要谨记，更要对得起自己的心，去吧，去吧！"',
      '山脚下第一缕朝阳照在身上时，少年剑已佩妥，下山便入江湖。'
    ],
    flavor: { stone: 20, life: 20, shen: 1, dao: 1 }
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

/* ---------------- 主线剧情（境界触发） ---------------- */
const MAINLINE = [
  // 第一章：灵根觉醒（炼气前期 idx 0，第1-3年）
  { id: 'ml_0_2', idx: 0, title: '初修功法', chapter: true,
    lines: [
      '跟随玉符指引，你来到了一处山野之地，附近也有村落，你拿起玉符，感应其中道士教你的吐纳之法。',
      '宏大而平和的声音响起："修真之本，得道成真。灵气为根，淬体修身...."',
      '在宁静的内心与周围活跃的灵气交感之中，你闭目打坐，感受一缕缕灵气丝自天地引入体内流转，由此壮大，壮大....'
    ],
    choices: [
      { t: '专心修炼（修为+100）', effect: { qi: 100 }, lines: ['你沉心静气，修为精进。'] },
      { t: '四处看看（体魄+0.5）', effect: { ti: 0.5 }, lines: ['你走出茅屋，望着远山，心中若有所悟，灵气也随着你的心情波动而入体，你感觉身体坚韧了一些。'] }
    ] },
  // 新手指引：修行总纲（炼气前期 idx 0）
  { id: 'ml_0_g1', idx: 0, title: '修行之道', chapter: true,
    lines: [
      '夜深了，你盘点自己这一年学到的门道——修行之路，不过几件要紧事：',
      '【修炼】：每年消耗行动点闭关吐纳，修为圆满便可冲击瓶颈、破境突破。',
      '【游历与秘境】：游历遇机缘；秘境层层深入，宝物灵材皆在其中，随时可撤退保住收获。',
      '【行动点】：每年行动点有限，修炼、游历、宗门都要花点数——用完便只能「下一年」。',
      '【储物袋】：屏幕底部的袋中装着丹药、灵材与装备，莫要积灰。'
    ],
    effect: { wu: 0.5 },
    choices: [
      { t: '谨记于心（悟性+0.5）', lines: ['你把这几条要紧事默诵三遍，只觉前路清晰了几分。'] },
      { t: '一一记在随身小册上（福源+0.5）', lines: ['你寻了册子逐条记下。日后翻看，少走了许多弯路。'] }
    ] },

  { id: 'ml_0_3', idx: 0, title: '村庄危机', chapter: true,
    lines: [
      '修炼三月有余，你已能感应方圆百米的灵气。',
      '忽然，附近的村中传来惨叫！你飞奔过去，竟是一头妖兽正在袭击村中人！旁边地上还躺着村里的猪，身上有三条巨大的创口！',
      '你握紧拳头，冲了出去，若是身怀灵气还躲躲藏藏导致村人惨死，这修的还是仙么！'
    ],
    fight: { name: '妖兽', atk: 30, hp: 150, loot: { stone: 20 } },
    resultWin: '你一拳击退妖兽，村民围着你叽叽喳喳，那老农跪下给你磕头，你赶忙避开，这天村里敲锣打鼓，好不热闹。',
    resultLose: '妖兽太强，你被打得吐血——但村民得救了。' },
  { id: 'ml_0_4', idx: 0, title: '离乡修行', chapter: true,
    lines: [
      '妖兽事件后，你知道这小小山野与村庄已容不下你的修行。',
      '你救过的村人含泪塞给你一袋干粮："恩人，这是俺自家烙出来的油馍，抗饿，你带着，慢点走。"',
      '你背起行囊，踏上远游修行之路。'
    ],
    effect: { stone: 50 } },

  { id: 'ml_0_5', idx: 0, title: '城中老乞丐', chapter: true,
    lines: [
      '城隍庙前，一个老乞丐蜷在墙角，双手揣着，面前破碗里干干净净。',
      '他穿着一身破烂的袄子，头发花白凌乱，满脸褶子。你路过时，他忽然抬起头，浑浊的眼睛越过你，望向天边。',
      '"小娃娃。"他开口了，声音沙哑得像砂纸磨过木板，"给老头子点吃的吧。"',
      '你愣了片刻，此时是年关，这老人独自在城隍庙前过年，不合常理，但你没多想，只是一口吃的。'
    ],
    choices: [
      { t: '买只烧鸡给他（50灵石）', req: { stone: 50 },
        effect: { stone: -50, flags: { beggar_kind: 1 } },
        lines: [
          '你从摊上买了只肥鸡递过去。老乞丐愣了愣，忽然笑了："行，是个心善的。"',
          '他撕下一只鸡腿，吃得满嘴流油。吃完了，他抹抹嘴，从怀里摸出一枚铜钱递给你：',
          '"拿着。老头我没什么值钱的东西，就这枚铜钱跟了我一辈子。你别嫌少。"',
          '你接过铜钱——入手微沉。你看了看他，他已经在打瞌睡了。'
        ] },
      { t: '施舍一个热馒头',
        effect: { flags: { beggar_cold: 1 } },
        lines: [
          '你到路边买了个热气腾腾的馒头，轻轻放在他手边。',
          '他看了你很久，点了点头："好孩子。"',
          '他掰开馒头，慢慢吃完。吃完后，他闭上眼，像是睡着了。',
          '你站了一会儿，转身离去。身后传来他的声音："小娃娃，以后别走夜路。"',
          '你回头一看，他还是那副昏昏欲睡的样子。'
        ] }
    ] },

  { id: 'ml_0_6', idx: 0, title: '青梅往事', chapter: true,
    setFlags: { lin: 1, linChildhood: 1 },
    lines: [
      '你在城中闲逛，忽然看见一棵老槐树。',
      '那槐树少说也有百年了，树干粗壮，枝叶繁茂。你走近，看见树干上刻着两个小字——是你小时候刻的。旁边还有一个歪歪扭扭的名字：林婉儿。',
      '你伸手触摸那两个名字，指尖传来粗糙的触感。那是岁月的痕迹。',
      '你想起许多年前，有个小女孩总是跟在你身后，叽叽喳喳说个不停。',
      '"你说过要带我去修仙的。你忘了？"'
    ],
    effect: { dao: 0.5, hp: 15 },
    result: '你站在槐树下很久。那些年的画面，一帧帧闪过脑海。（道心+0.5，气血+15）' },

  // 第二章：初窥门径（炼气中后期 idx 1-2，第4-9年）
  { id: 'ml_1_0', idx: 1, title: '云游散修', chapter: true,
    lines: [
      '你游历三年，见识了修仙世界的残酷与精彩。',
      '在一座破庙中，你遇见一位受伤的散修。',
      '他奄奄一息，手中紧握一枚玉简。'
    ],
    choices: [
      { t: '救治散修（体魄≥3）', req: { ti: 3 }, effect: { stone: 100 }, lines: ['你以灵力为他疗伤，他醒来后取出一百灵石递给你："多谢道友，这点灵石作为救命之恩的一点心意。"'] },
      { t: '取走玉简', effect: { stone: 50, dao: -1 }, lines: ['你犹豫片刻，最终取走了玉简。散修叹了口气，决绝闭目而逝，你手中的玉简也随之碎裂。'] }
    ] },
  { id: 'ml_1_1', idx: 1, title: '坊市偶遇', chapter: true,
    lines: [
      '你来到一座修仙坊市，琳琅满目的丹药法宝让你目不暇接。',
      '一位神秘商人拉住你："小友，我这有一件宝物，只需50灵石。"'
    ],
    choices: [
      { t: '购买（灵石≥50）', req: { stone: 50 }, effect: { stone: -50, atk: 5 }, lines: ['你买下宝物，竟是一柄品质不错的飞剑。'] },
      { t: '拒绝', effect: {}, lines: ['你摇摇头走了，那商人在你背后轻笑一声。'] }
    ] },
  { id: 'ml_1_2', idx: 1, title: '山中悟道', chapter: true,
    lines: [
      '你在一座深山中闭关修炼，感悟天地道韵。',
      '三月后，你睁开眼，修为大进。'
    ],
    effect: { qi: 200, wu: 0.5 } },
  { id: 'ml_1_3', idx: 1, title: '同道切磋', chapter: true,
    lines: [
      '你遇见一位同境界的修士，他邀你切磋。',
      '"修仙之路，需以战养战。来吧！"'
    ],
    choices: [
      { t: '全力应战', fight: { name: '同道修士', atk: 50, hp: 300, loot: { stone: 80 } }, resultWin: '你险胜一招，对方抱拳："道友果然厉害。"', resultLose: '你惜败，但收获颇丰。' },
      { t: '婉拒', effect: { hp: 1 }, lines: ['你摇摇头："改日再战。"对方略显失望。'] }
    ] },
  { id: 'ml_1_4', idx: 1, title: '灵草采集', chapter: true,
    lines: [
      '你发现一片灵草丛生的山谷。',
      '采集过程中，你发现一株千年灵草。'
    ],
    effect: { herb: 10, qi: 50 } },

  // 新手指引：装备与储物袋（炼气中期 idx 1）
  { id: 'ml_1_g1', idx: 1, title: '行囊与法器', chapter: true,
    lines: [
      '谷口歇脚时，一位路过的器修看了看你背上的行囊，摇头失笑：「小友，宝物蒙尘啊。」',
      '他打开你的储物袋比划着讲了一炷香：「装备分四个部位——头部、身体、腿部，另有法宝随身。穿上才见效，躺在袋里不算数。」',
      '「装备还分黄、玄、地、天五等品级，品级越高灵纹越强。多余的可去装备栏卖掉换灵石——卖一件是一件，穿在身上的它可动不得。」',
      '「妖兽内丹、秘藏灵物，也都在袋里，突破了别忘了用。」'
    ],
    choices: [
      { t: '当即整理行囊，分类归置', lines: ['你把袋中物什分门别类摆开，刀归鞘、丹归瓶，整整齐齐。那器修满意地点点头，飘然而去。'] },
      { t: '请他喝了口水，谢过指点', lines: ['你递过水囊。他饮了一口，笑道：「孺子可教。」言罢化虹而去。'] }
    ] },

  // 第三章：宗门风云（筑基前期 idx 3，第10-15年）
  { id: 'ml_2_0', idx: 2, title: '拜入仙门', chapter: true,
    lines: [
      '你修行数年，灵气初凝，已能御风而行。',
      '这一日，一道剑光自天际落下，一位青袍修士站在你面前。',
      '"我乃青云剑宗传法长老，观察了你几日，见你根骨不错，心性尚可，欲引你入青云，你看如何？"'
    ],
    choices: [
      { t: '恭敬拜师', effect: { sect: 'qingyunjian' }, lines: ['你躬身一礼："弟子愿往。"青袍修士大笑，携你御剑而去。'] },
      { t: '婉言谢绝', effect: { stone: 500 }, lines: ['你拱手道："晚辈还想再游历几年。"他点点头，留下一袋灵石便走了。'] }
    ] },
  { id: 'ml_2_1', idx: 3, title: '初入宗门', chapter: true,
    lines: [
      '你随青袍修士御剑飞行，脚下山河如棋盘。',
      '云海之上，一座浮空仙山赫然入目——那便是青云剑宗。',
      '山门前，掌门负手而立："来了就好。先去藏剑阁挑柄剑。"'
    ],
    effect: { hpMax: 30, atk: 5 } },

  // 新手指引：百艺入门（宗门剧情，筑基前期 idx 3）
  { id: 'ml_2_g1', idx: 3, title: '百艺初窥', chapter: true,
    lines: [
      '安顿下来的次日，一位执事长老领你去了半山腰的百艺坊。',
      '坊内丹香与铁火气交织：鼎炉边弟子守着灵草熬炼丹药；铸炉前锤声阵阵，灵铁百炼成器；坊后一畦畦灵田四时流转，矿洞里灵脉幽幽发光。',
      '长老捋须道：「修行百艺，补己之短——灵田种草，灵矿采铁；草铁入坊，炼丹炼器。点开底部栏的【百艺】，四艺尽在其中。」',
      '「炼丹炼器皆耗灵材，丹成可辅助突破、延寿增智，器成可披挂上身。材料品级要与功法相配——黄级配方吃黄级灵材，缺什么，去对应品级的秘境里刷便是。」',
      '「记住了：同种材料不够，可『连炼至材尽』，省得一次次点。炼出来的东西，都在储物袋里。」'
    ],
    choices: [
      { t: '守着鼎炉看了一夜（悟性+0.5）', lines: ['你看了一夜炼丹，火候起落间若有所悟。', '长老笑道：「有点意思。以后常来。」'] },
      { t: '撸起袖子帮着锤了一日铁（体魄+0.5）', lines: ['你抡锤一日，胳膊酸了三日，手上的茧却厚实了。', '铸炉的师傅赞道：「是块料。」'] }
    ] },

  { id: 'ml_2_2', idx: 3, title: '藏剑阁', chapter: true,
    lines: [
      '藏剑阁中，无数飞剑悬于壁上，剑气纵横。',
      '你伸手取下一柄青锋剑，剑身嗡鸣，似在认主。'
    ],
    effect: { atk: 10 } },
  { id: 'ml_2_3', idx: 3, title: '宗门任务', chapter: true,
    lines: [
      '长老派你下山执行任务：剿灭山下妖兽。',
      '你带领几位师弟，前往妖兽巢穴。'
    ],
    fight: { name: '妖兽首领', atk: 80, hp: 400, loot: { stone: 120 } },
    resultWin: '你斩杀妖兽首领，师弟们欢呼雀跃。',
    resultLose: '妖兽凶猛，你受伤退走——但任务失败了。' },

  // 第四章：金丹之路（筑基中后期 idx 4-5，第16-25年）
  { id: 'ml_3_0', idx: 4, title: '秘境探索', chapter: true,
    lines: [
      '宗门开放秘境，你进入探索。',
      '秘境中危机四伏，但也充满机缘。'
    ],
    choices: [
      { t: '深入探索', fight: { name: '秘境守护者', atk: 150, hp: 800, loot: { stone: 200, herb: 5 } }, resultWin: '你击败守护者，获得秘境宝藏。', resultLose: '你重伤退出，但捡到一些灵草。' },
      { t: '稳扎稳打', effect: { qi: 300 }, lines: ['你稳扎稳打，修为稳步提升。'] }
    ] },
  { id: 'ml_3_1', idx: 4, title: '宗门大比', chapter: true,
    lines: [
      '三年一度的宗门大比如期而至。',
      '擂台上剑光如雨，你连胜三场，终于站在了首席弟子面前。',
      '"出剑吧。"他说。'
    ],
    choices: [
      { t: '全力一战', fight: { name: '首席弟子', atk: 180, hp: 1000, loot: { stone: 300, atk: 15 } }, resultWin: '你一剑破防，首席弟子收剑而笑："好剑。"', resultLose: '你惜败一招，首席弟子拍拍你的肩："下次再战。"' },
      { t: '认输请教', effect: { atk: 5 }, lines: ['你收剑抱拳："师兄剑法高明，愿请教。"他欣然指点。（攻击+5）'] }
    ] },

  { id: 'ml_3_2', idx: 5, title: '故人重逢', chapter: true,
    req: { flags: { lin: 1 } },
    setFlags: { lin2: 1 },
    lines: [
      '宗门大比结束后，你在山间小径上独行。',
      '忽然，一个熟悉的身影出现在前方——是林婉儿。',
      '她穿着一身青色道袍，手持长剑，朝你微微一笑："呆子，好久不见。"',
      '她拔剑出鞘，剑光如水——这些年，她也没闲着。'
    ],
    choices: [
      { t: '擂台切磋', fight: { name: '林婉儿', atk: 50, hp: 200, loot: { stone: 100 } },
        resultWin: '你一剑挑飞她的长剑，她跌坐在地，气鼓鼓地瞪你："你赢了。"但她眼中分明带着笑意。',
        resultLose: '她的剑比你快半招，你输了。她扶你起来："下次再来。"你闻到她身上淡淡的药香。' },
      { t: '台下叙旧', effect: { fu: 0.5, hp: 30 },
        lines: ['你跳下擂台，和她坐在角落里聊天。她给你讲这些年走南闯北的故事，你给她讲修行中的趣事。不知不觉，天就黑了。'] }
    ] },

  { id: 'ml_3_3', idx: 5, title: '道侣之约', chapter: true,
    req: { flags: { lin2: 1 } },
    setFlags: { daoLu: 1 },
    lines: [
      '月色如水，你和林婉儿坐在山巅。',
      '她忽然开口："你说，我们能修到飞升吗？"',
      '你没有回答。',
      '她笑了笑："飞升不了也没关系。有你在，哪里都是家。"',
      '她从怀里摸出一张泛黄的纸条递给你。你打开一看——是小时候你写给她的那张"修仙保证书"，歪歪扭扭的字迹，上面还画着一个不成人形的小人。',
      '"你……一直留着？"你愣住了。',
      '她抢回纸条，塞进怀里，耳根泛红："谁让你写得那么丑。我留着是想等你出名了拿去卖钱。"'
    ],
    effect: { hp: 40, qi: 50, dao: 0.5 },
    result: '有一个人等你回家的感觉，让这漫长修行路都轻快了几分。（道心+0.5）' },

  // 第四章·尾声：锻体机缘（筑基后期 idx 5，三段剧情必然成功，得《锻体诀》解锁锻体）
  { id: 'ml_5_t1', idx: 5, title: '断崖桩印', chapter: true,
    lines: [
      '筑基后期，你的灵力已然凝实，可肉身依旧是最明显的短板——法体不匹，灵压再盛，也如沙上筑塔。',
      '这一日你循着一缕异样的地气，行至一处断崖。崖壁上刻满人形桩印，深深嵌入山岩，最深的那一个，竟是一具完整的人形轮廓。',
      '桩印之侧，留着一行古字：「炼气三年，不如锻体一日。欲学锻体，先问己身。」'
    ],
    choices: [
      { t: '依样站桩，以身为锤（体魄+0.5）', effect: { ti: 0.5, flags: { duanti_r1: 1 } },
        lines: [
          '你学着桩印，站入那个人形轮廓。初时只觉气血翻涌，站到第三日，你竟隐隐听见自己骨骼如金石交鸣。',
          '你若有所悟——这崖壁之后，必藏着一部炼体传承。'
        ] },
      { t: '拓印桩印，他日参详（福源+0.5）', effect: { fu: 0.5, flags: { duanti_r1: 1 } },
        lines: [
          '你以灵力拓下满崖桩印。拓毕，指尖犹有余震——这些桩印的行气路线，暗合某种失传的炼体法门。',
          '看来得循着这缕地气，去找找传承的下落。'
        ] }
    ] },
  { id: 'ml_5_t2', idx: 5, title: '炼体遗府', chapter: true,
    lines: [
      '你循着地气而行，三日后来到一座无字石府之前。府门虚掩，其上只刻着两个字：「问心」。',
      '推门而入，府中无金无银，唯有一座药浴石池，池边玉简流光。',
      '你刚要伸手，玉简中传出苍老的声音：「炼体之道，以身为炉，以痛为火。寻常修士避痛如避死——你，可想好了？」'
    ],
    choices: [
      { t: '入池淬体，痛又如何（体魄+0.5）', effect: { hp: -30, ti: 0.5 },
        lines: [
          '你纵身入池。药液如万千钢针钻入骨缝，你咬碎牙关，一声不吭。',
          '不知过了多久，痛楚忽然化作暖流，你的皮肉筋骨，韧了一分。',
          '石壁缓缓开启，里面是一本泛黄的功法总纲。'
        ] },
      { t: '先观玉简，再定行止（悟性+0.5）', effect: { wu: 0.5 },
        lines: [
          '你静下心来，先将玉简中的炼体总纲看了个通透，方才入池淬体。因你行功有序，事半功倍。',
          '石壁缓缓开启，里面是一本泛黄的功法总纲。'
        ] }
    ] },
  { id: 'ml_5_t3', idx: 5, title: '得授《锻体诀》', chapter: true,
    effect: { flags: { duanti: 1 }, hpMax: 20 },
    lines: [
      '功法总纲之上，只三个古字——《锻体诀》。',
      '「炼体非弃法。法体两全，方为大道：淬体魄以固其基，炼遁速以轻其身，凝神识以明其念。」',
      '「然大境界有涯，肉身亦有涯。每一大境界，每一种淬炼，至多十次。十次之后，非突破大境界，不可再进。」',
      '你盘膝而坐，将《锻体诀》一字一字刻进识海。从今往后，「锻体」一门，正式入了你的修行。'
    ] },

  // 第五章：九州风云（金丹前期 idx 6，第26-35年）
  { id: 'ml_4_0', idx: 6, title: '九州游历', chapter: true,
    lines: [
      '你辞别宗门，踏上九州游历之路。',
      '青州的剑修豪爽，一言不合便拔剑论道；徐州的丹师温婉，炼丹时如绣花般细致；冀州的阵师古板，布阵规矩森严，错一步便全盘皆输。',
      '你路过南疆的蛊寨，见蛊师与毒虫同眠同食；你登上北境的冰原，见雪修在暴风雪中打坐，浑身结满冰霜。',
      '最难忘是东海之滨——一位渔夫打扮的老者坐在礁石上垂钓，你走近才发现，他钓的不是鱼，是潮汐中的天地道韵。'
    ],
    effect: { wu: 0.5, stone: 100 } },

  // 第六章：魔劫降临（金丹中后期 idx 7-8，第36-55年）
  { id: 'ml_5_0', idx: 7, title: '魔修现世', chapter: true,
    lines: [
      '你游历至北境，忽然看见天边一道黑气冲天。',
      '那是魔修的气息——沉寂千年的魔道，终于按捺不住了。',
      '一个浑身缠绕黑雾的魔修拦住你的去路，他双眼赤红，声音沙哑："正道的蝼蚁，今日便是你的死期。"'
    ],
    fight: { name: '魔修先锋', atk: 250, hp: 1200, loot: { stone: 200 } },
    resultWin: '你一剑斩开黑雾，魔修惨叫一声化为飞灰。远处传来更多魔气——这只是先锋。',
    resultLose: '魔气侵入经脉，你重伤退走——但你知道，更大的风暴即将来临。' },

  { id: 'ml_5_1', idx: 8, title: '道侣危机', chapter: true,
    req: { flags: { daoLu: 1 } },
    setFlags: { linCrisisDone: 1 },
    lines: [
      '林婉儿忽然吐血倒地，你冲过去扶住她。',
      '她的经脉中有一股暗伤在蔓延——那是多年前她独自面对心魔时留下的。',
      '"我没事……"她勉强笑了笑，"别担心。"'
    ],
    choices: [
      { t: '以灵力救治', effect: { hp: -50, flags: { linHealed: 1 } },
        lines: ['你将灵力灌入她体内，一点一点修复她的经脉。三个时辰后，她终于沉沉睡去。你守在床边，一夜未眠。'] },
      { t: '寻找天材地宝', req: { stone: 300 },
        effect: { stone: -300, flags: { linHealed: 1 } },
        lines: ['你花了三百灵石买来续脉丹，喂她服下。她缓缓睁开眼，看见你憔悴的脸，伸手摸了摸："傻子......"'] }
    ] },

  { id: 'ml_5_2', idx: 8, title: '并肩御敌', chapter: true,
    req: { flags: { daoLu: 1 } },
    setFlags: { linBattle: 1 },
    lines: [
      '魔修突袭宗门，你和林婉儿并肩站在城墙上。',
      '她拔出长剑，剑光如水："今天，我们一起守。"',
      '魔修如潮水般涌来，你们背靠背，剑光交织。'
    ],
    choices: [
      { t: '并肩作战', fight: { name: '魔修先锋', atk: 130, hp: 600, loot: { stone: 200, atk: 10 } },
        resultWin: '你们联手斩杀魔修先锋，魔修溃退。她靠在你肩上，大口喘气："我们赢了。"你握紧她的手。',
        resultLose: '魔修太强，你们被迫撤退。她的手臂被划伤，你为她包扎时，手在发抖。' },
      { t: '让她断后', effect: { atk: 15, dao: 0.5 },
        lines: ['你冲入敌阵，她在身后掩护。你斩杀数十魔修，回头时，看见她独自面对三倍的敌人——她的眼神告诉你：我能行。'] }
    ] },

  // 第七章：元婴之路（元婴前期 idx 9，第56-70年）
  { id: 'ml_6_0', idx: 9, title: '天地棋局', chapter: true,
    lines: [
      '你站在九州最高的山巅，俯瞰天下。',
      '一位白发老者在山巅摆了一盘棋，棋盘上黑白子交错，竟隐隐映出九州山河。',
      '"小友，"老者拈起一子，"这盘棋，你可敢接？"'
    ],
    choices: [
      { t: '执黑先行，以攻代守', effect: { atk: 20 }, lines: ['你落子如剑，步步紧逼。老者连连点头："好棋。攻伐之道，你已得其髓。"（攻击+20）'] },
      { t: '执白后手，以守待攻', effect: { hpMax: 100 }, lines: ['你稳扎稳打，步步为营。老者捋须微笑："善。守御之道，在于不动如山。"（气血上限+100）'] },
      { t: '推棋不弈，直言请教', effect: { wu: 0.5 }, lines: ['你推开棋盘："前辈，魔渊将开，天下将乱，晚辈无心弈棋。"老者大笑："好，这才是正道修士该说的话。"（悟性+0.5）'] }
    ] },

  // 第八章：宿命决战（元婴中后期 idx 10-11，第71-100年）
  { id: 'ml_7_0', idx: 10, title: '最终决战', chapter: true,
    lines: [
      '魔渊终于裂开了。',
      '七十二道魔气冲天而起，遮天蔽日。你站在魔渊边缘，身后是整个九州。',
      '"这一战，不是为了成仙，是为了让他们活下去。"',
      '你拔剑，踏入黑暗。'
    ],
    fight: { name: '魔祖化身', atk: 500, hp: 5000, loot: { stone: 600 } },
    resultWin: '你将魔祖化身按回魔渊深处，天地重归宁静。',
    resultLose: '魔气贯穿胸膛，你缓缓闭目——终究，差了一步。' }
];

/* ---------------- 死劫事件（血量×150%） ---------------- */
const DEATH_EVENTS = [
  { year: 10, title: '妖兽袭击', chapter: true,
    lines: ['一头妖兽突然出现在村庄外……'],
    fight: { name: '妖兽头领', atk: 60, hp: 600 } },
  { year: 20, title: '劫修围杀', chapter: true,
    lines: ['一群劫修从四面八方围来……'],
    fight: { name: '劫修头领', atk: 120, hp: 1200 } },
  { year: 30, title: '毒瘴侵袭', chapter: true,
    lines: ['一片毒瘴笼罩了你修炼的山谷……'],
    fight: { name: '毒瘴蛊王', atk: 200, hp: 1800 } },
  { year: 40, title: '妖兽潮', chapter: true,
    lines: ['北境妖兽忽然暴动，潮水般涌向人族城池……'],
    fight: { name: '妖兽王', atk: 300, hp: 2700 } },
  { year: 50, title: '魔修刺客', chapter: true,
    lines: ['一位魔修刺客潜入你的修炼之地……'],
    fight: { name: '魔修杀手', atk: 400, hp: 3600 } },
  { year: 60, title: '魔修入侵', chapter: true,
    lines: ['魔修大军忽然出现在九州边境……'],
    fight: { name: '魔修将领', atk: 500, hp: 4500 } },
  { year: 70, title: '心魔入侵', chapter: true,
    lines: ['你修炼至关键时刻，心魔忽然入侵……'],
    fight: { name: '心魔化身', atk: 600, hp: 5400 } },
  { year: 80, title: '天劫降临', chapter: true,
    lines: ['你修炼至瓶颈，天劫忽然降临……'],
    fight: { name: '天劫化身', atk: 700, hp: 6300 } },
  { year: 90, title: '古魔苏醒', chapter: true,
    lines: ['远古魔将从沉睡中苏醒……'],
    fight: { name: '远古魔将', atk: 800, hp: 7500 } },
  { year: 100, title: '魔渊决战', chapter: true,
    lines: ['这是最后的机会……'],
    fight: { name: '魔祖化身', atk: 1000, hp: 9000 } },
  { year: 110, title: '天道考验', chapter: true,
    lines: ['天道化身出现在你面前……'],
    fight: { name: '天道化身', atk: 1200, hp: 10500 } },
  { year: 120, title: '仙界试炼', chapter: true,
    lines: ['仙界守卫出现在你面前……'],
    fight: { name: '仙界守卫', atk: 1400, hp: 12000 } },
  { year: 130, title: '飞升之劫', chapter: true,
    lines: ['飞升天劫降临……'],
    fight: { name: '飞升天劫', atk: 1600, hp: 15000 } },
  { year: 140, title: '终极之战', chapter: true,
    lines: ['隐藏死劫出现……'],
    fight: { name: '魔祖仙帝', atk: 2000, hp: 22500 } }
];

/* ---------------- 普通事件库 ---------------- */
const EVENTS = { jiyuan: [], shejiao: [], mijing: [], year: [] };

function E(tag, ev) { ev.tag = tag; EVENTS[tag].push(ev); return ev; }

/* ================ 机缘 ================ */
E('jiyuan', {
  id: 'jishi_book', title: '集市旧书摊', chapter: true, weight: 8, min: 0, max: 2, once: true,
  lines: [
    '城中集市，一个破旧书摊前，掌柜正双目放光地盯着来往行人。',
    '你随手翻开一本纸页发黄的《御火诀》，书页间竟夹着一枚泛着微光的玉简。',
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
          '雷光将落的刹那，你看懂了雨水的轨迹、风的呼啸、山间草木的一呼一吸。',
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
    '城隍庙前，一个老乞丐蜷在墙角，双手揣着，面前破碗里干干净净。',
    '他穿着一身破烂的袄子，头发花白凌乱，满脸褶子。你路过时，他忽然抬起头，浑浊的眼睛越过你，望向天边。',
    '"小娃娃。"他开口了，声音沙哑得像砂纸磨过木板，"给老头子点吃的吧。"',
    '你愣了片刻，此时是年关，这老人独自在城隍庙前过年，不合常理，但你没多想，只是一口吃的。'
  ],
  choices: [
    { t: '买只烧鸡给他（50灵石）', req: { stone: 50 },
      effect: { stone: -50, flags: { beggar_kind: 1 } },
      lines: [
        '你从摊上买了只肥鸡递过去。老乞丐愣了愣，忽然笑了："行，是个心善的。"',
        '他撕下一只鸡腿，吃得满嘴流油。吃完了，他抹抹嘴，从怀里摸出一枚铜钱递给你：',
        '"拿着。老头我没什么值钱的东西，就这枚铜钱跟了我一辈子。你别嫌少。"',
        '你接过铜钱——入手微沉。你看了看他，他已经在打瞌睡了。'
      ] },
    { t: '施舍一个热馒头',
      effect: { flags: { beggar_cold: 1 } },
      lines: [
        '你到路边买了个热气腾腾的馒头，轻轻放在他手边。',
        '他看了你很久，点了点头："好孩子。"',
        '他掰开馒头，慢慢吃完。吃完后，他闭上眼，像是睡着了。',
        '你站了一会儿，转身离去。身后传来他的声音："小娃娃，以后别走夜路。"',
        '你回头一看，他还是那副昏昏欲睡的样子。'
      ] }
  ]
});
E('jiyuan', {
  id: 'beggar_return', title: '老乞丐的回报', chapter: true, weight: 100, min: 6, max: 8, once: true,
  req: { flags: { beggar_kind: 1 } },
  setFlags: { beggar_repaid: 1 },
  lines: [
    '多年后，你再次路过那座城隍庙。',
    '老乞丐还躺在老地方，仿佛这些年从未动过。你走近，他睁开眼，看了你半晌，忽然笑了："哟，是你这小娃娃。"',
    '他颤巍巍地站起来，从怀里摸出一枚古朴的铜钱——和你当年接过的那枚一模一样。',
    '"老头我捡破烂捡了一辈子，攒了点碎银子。拿去吧，别嫌少。"',
    '他将铜钱塞进你手里。你低头一看——那铜钱在你掌心分化重组，化作一柄古朴的铜钱小剑，通体玄黑，上面刻着密密麻麻的古文。',
    '"这是……"你愣住了。',
    '"小玩意。"他打了个哈欠，"老头我年轻时用的。现在老了，用不动了。你拿去吧。"',
    '你抬头想说什么，他已经又缩回墙角，开始打瞌睡了。你收起那柄铜钱小剑，对着老人一拜，回头离开。'
  ],
  effect: { equip: 'tongqian_jian' },
  result: '你收起铜钱小剑，入手沉甸甸的，剑身上古文流转。（获得法宝：铜钱剑）'
});
E('jiyuan', {
  id: 'beggar_cold_return', title: '一个馒头的遗憾', chapter: true, weight: 100, min: 9, max: 11, once: true,
  req: { flags: { beggar_cold: 1 } },
  setFlags: { beggar_cold_done: 1 },
  lines: [
    '多年后你故地重游，城隍庙的墙垣已塌了大半。',
    '墙角不剩下什么。看庙的老人口里念叨：那位老神仙，三年前就走了。走的时候身边什么都没带，就带了一壶酒。',
    '你心念微动，似是错过什么，思索一番，也是无愧道心，便继续前行。'
  ],
  effect: { dao: 0.5 },
  result: '道心+0.5'
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

/* ================ 金丹期机缘（idx 6-8） ================ */
E('jiyuan', {
  id: 'jd_jianzhong_canhun', title: '剑冢残魂', chapter: true, weight: 6, min: 6, max: 8, once: true,
  lines: [
    '你在剑冢深处发现一缕残魂，那是千年前陨落的剑修。',
    '残魂凝视你片刻，忽然开口："你的剑意……还差一味。"',
    '他伸手在你眉心一点——一道剑光直冲识海。'
  ],
  choices: [
    { t: '静心感悟剑意', effect: { wu: 1 }, lines: ['剑光在识海中翻涌三日，你悟得剑意真谛。（悟性+1）'] },
    { t: '以剑意淬体', effect: { atk: 5 }, lines: ['剑意灌注经脉，你的剑锋更加凌厉。（攻击+5）'] }
  ]
});
E('jiyuan', {
  id: 'jd_danlu_yibian', title: '丹炉异变', chapter: true, weight: 5, min: 6, max: 8, once: true,
  lines: [
    '你在丹房炼丹时，炉火忽然变色。',
    '炉中竟自行凝出一枚丹药，丹纹流转，灵光四溢。',
    '你从未见过如此异象。'
  ],
  choices: [
    { t: '取出丹药', effect: { elixirs: { wudao: 1 } }, lines: ['丹药入手温热，竟是传说中的悟道丹！（获得悟道丹）'] },
    { t: '研究炉火异变', effect: { wu: 1, qi: function (s) { return Math.round(requireNeed(s) * 0.2); } }, lines: ['你参悟炉火异变，道心通明。（悟性+1，修为+）'] }
  ]
});
E('jiyuan', {
  id: 'jd_tianjiang_jiyuan', title: '天降机缘', chapter: true, weight: 5, min: 6, max: 8,
  lines: [
    '一道金光自天际坠落，砸在你洞府门前。',
    '金光散去，一枚古朴玉简静静躺在碎石中。',
    '你以神识探入——竟是一门上古心法。'
  ],
  choices: [
    { t: '研习心法', effect: { tech: 'taixuan' }, lines: ['心法玄奥，你参悟数日，竟是《太玄经》残篇！（习得太玄经）'] },
    { t: '以玉简换取灵石', effect: { stone: 300 }, lines: ['你将玉简售出，换得大量灵石。（灵石+300）'] }
  ]
});
E('jiyuan', {
  id: 'jd_guren_laifang', title: '故人来访', chapter: true, weight: 4, min: 6, max: 8, once: true,
  req: { flags: { beggar_kind: 1 } },
  lines: [
    '一位故人叩响你的洞府。',
    '正是当年那个老乞丐——此刻他一身仙风道骨，笑呵呵道："小子，当年那顿烧鸡，今日来还。"'
  ],
  choices: [
    { t: '恭敬相迎', effect: { wu: 1 }, lines: ['他与你论道三日，字字珠玑。临别时他拍拍你的肩："好好修，天劫见。"（悟性+1）'] },
    { t: '请教天劫之事', effect: { trib: 0.05 }, lines: ['他传授你一些渡劫心得，让你受益匪浅。（渡劫+5%）'] }
  ]
});
E('jiyuan', {
  id: 'jd_danxia_micang', title: '丹霞密藏', chapter: true, weight: 5, min: 6, max: 8, once: true,
  lines: [
    '你在丹霞谷深处发现一间密室。',
    '室内只有一口古井，井水泛着七彩光芒。',
    '井底似乎沉着什么东西。'
  ],
  choices: [
    { t: '潜入井底', fight: { name: '井底灵蛟', atk: 80, hp: 350, loot: { herb: 20, stone: 200 } },
      resultWin: '灵蛟伏诛，你从井底捞出大量灵草与灵石。',
      resultLose: '灵蛟一尾将你拍飞，你狼狈逃出密室。（气血受损）' },
    { t: '以灵力探取', effect: { hpMax: 50 }, lines: ['你以灵力探入井中，井水化作一股暖流涌入经脉。（气血上限+50）'] }
  ]
});
E('jiyuan', {
  id: 'jd_jianyi_gongming', title: '剑意共鸣', chapter: true, weight: 5, min: 6, max: 8,
  lines: [
    '你在崖边练剑，忽然感到天地间一股剑意与你共鸣。',
    '那剑意来自千里之外的某处——一位隐世剑修在向你发出邀请。'
  ],
  choices: [
    { t: '循剑意而去', effect: { atk: 10 }, lines: ['你御剑千里，在深山中找到那位剑修。他与你切磋三日，你的剑法大进。（攻击+10）'] },
    { t: '在原地感悟', effect: { wu: 1 }, lines: ['你在崖边静坐三日，将那股剑意融入己身。（悟性+1）'] }
  ]
});

/* ================ 金丹期游历（idx 6-8） ================ */
E('shejiao', {
  id: 'jd_jiuzhou_xingshang', title: '九州行商', chapter: true, weight: 6, min: 6, max: 8,
  lines: [
    '一队行商邀请你随行护送。',
    '商队穿越三州，沿途风景各异，奇人异事层出不穷。',
    '临别时，商队首领赠你一袋灵石。'
  ],
  effect: { stone: 200 },
  result: '你望着商队远去的背影，忽然觉得这九州之大，远超想象。（灵石+200）'
});
E('shejiao', {
  id: 'jd_gusha_zhongsheng', title: '古刹钟声', chapter: true, weight: 5, min: 6, max: 8,
  lines: [
    '你路过一座荒废古刹，钟声忽然自鸣。',
    '钟声中蕴含一丝道韵，你驻足倾听，道心微动。'
  ],
  choices: [
    { t: '静听钟声', effect: { wu: 1, qi: 80 }, lines: ['你听了半日钟声，道心通明。（悟性+1，修为+）'] },
    { t: '探索古刹', fight: { name: '古刹怨灵', atk: 70, hp: 280, loot: { stone: 120 } },
      resultWin: '怨灵散去，你在佛像后发现一袋灵石。',
      resultLose: '怨灵缠身，你费了好大功夫才脱身。（气血受损）' }
  ]
});
E('shejiao', {
  id: 'jd_hepan_diaoyu', title: '河畔垂钓', chapter: true, weight: 5, min: 6, max: 8,
  lines: [
    '你在河边垂钓，鱼钩忽然被巨力拉扯。',
    '你用力一拽——竟钓上来一柄生锈的古剑。',
    '古剑虽锈，剑意犹存。'
  ],
  choices: [
    { t: '以灵力洗剑', effect: { atk: 12 }, lines: ['你以灵力洗去锈迹，古剑重现锋芒。（攻击+12）'] },
    { t: '以古剑换灵石', effect: { stone: 250 }, lines: ['你将古剑售出，换得大量灵石。（灵石+250）'] }
  ]
});
E('shejiao', {
  id: 'jd_shanzhong_yinshi', title: '山中隐士', chapter: true, weight: 5, min: 6, max: 8, once: true,
  lines: [
    '你寻访到一位隐居山中的老者。',
    '他自称千年前的散修，因厌倦争斗而隐居。',
    '他与你论道三日，临别赠你一枚玉简。'
  ],
  choices: [
    { t: '收下玉简', effect: { wu: 2 }, lines: ['玉简中记载着一门玄奥心法。（悟性+2）'] },
    { t: '请教修行之道', effect: { qi: function (s) { return Math.round(requireNeed(s) * 0.3); } }, lines: ['老者传授你修行心得，你修为大涨。'] }
  ]
});
E('shejiao', {
  id: 'jd_yuexia_duzhuo', title: '月下独酌', chapter: true, weight: 5, min: 6, max: 8,
  lines: [
    '你在月下独酌，忽然听见远处传来琴声。',
    '循声而去，一位白衣修士正在月下抚琴。',
    '他见你来，微微一笑："知音难觅。"'
  ],
  effect: { wu: 0.5 },
  result: '你们饮酒论道至天明，临别时他赠你一枚音律玉简。（悟性微涨）'
});
E('shejiao', {
  id: 'jd_huangye_qiusheng', title: '荒野求生', chapter: true, weight: 4, min: 6, max: 8,
  lines: [
    '你在荒野中迷路，灵力耗尽。',
    '三天三夜后，你终于找到出路。',
    '这段经历让你的意志更加坚定。'
  ],
  effect: { ti: 2, hpMax: 50 },
  result: '你在绝境中磨砺了意志，肉身也更加强韧。（体魄+2，气血上限+50）'
});

/* ================ 元婴期机缘（idx 9-11） ================ */
E('jiyuan', {
  id: 'yy_tianjie_yuzhao', title: '天劫预兆', chapter: true, weight: 5, min: 9, max: 11, once: true,
  lines: [
    '你在修炼时，忽然感应到一丝天劫的气息。',
    '那是来自九天之上的威压——你的飞升之劫，已在酝酿。'
  ],
  choices: [
    { t: '静心感悟天劫', effect: { trib: 0.05, wu: 1 }, lines: ['你静心感悟天劫气息，道心通明。（渡劫+5%，悟性+1）'] },
    { t: '以天劫气息淬体', effect: { trib: 0.03, ti: 2 }, lines: ['你以天劫气息淬炼肉身，体魄更加强横。（渡劫+3%，体魄+2）'] }
  ]
});
E('jiyuan', {
  id: 'yy_moyuan_diyu', title: '魔渊低语', chapter: true, weight: 5, min: 9, max: 11, once: true,
  lines: [
    '夜深人静时，你听见来自魔渊的低语。',
    '那声音诱惑你堕入魔道，许以无上力量。',
    '你紧守道心，将那声音驱散。'
  ],
  choices: [
    { t: '以道心镇压', effect: { wu: 1 }, lines: ['你以道心镇压魔念，道心愈发坚定。（悟性+1）'] },
    { t: '反探魔渊', effect: { atk: 10 }, lines: ['你以神识反探魔渊，从魔念中悟得一丝攻伐之道。（攻击+10）'] }
  ]
});
E('jiyuan', {
  id: 'yy_xianjie_suipian', title: '仙界碎片', chapter: true, weight: 4, min: 9, max: 11, once: true,
  lines: [
    '你在虚空中拾得一块碎片。',
    '碎片散发着不属于此界的气息——那是仙界的残片。'
  ],
  choices: [
    { t: '炼化碎片', effect: { hpMax: 50, atk: 5 }, lines: ['你炼化碎片，肉身与攻击都得到提升。（气血上限+50，攻击+5）'] },
    { t: '参悟碎片', effect: { wu: 1 }, lines: ['你参悟碎片中的道韵，悟性大增。（悟性+1）'] }
  ]
});
E('jiyuan', {
  id: 'yy_guren_chongfeng2', title: '故人重逢', chapter: true, weight: 3, min: 9, max: 11, once: true,
  req: { flags: { beggar_kind: 1 } },
  lines: [
    '你在九州游历时，遇见一位故人。',
    '正是当年那个老乞丐——此刻他已飞升成仙，只留一缕分身在此等你。'
  ],
  choices: [
    { t: '请教飞升之道', effect: { trib: 0.10 }, lines: ['他传授你飞升心得，你受益匪浅。（渡劫+10%）'] },
    { t: '求赐仙宝', effect: { atk: 10 }, lines: ['他赠你一柄仙剑，剑光如虹。（攻击+10）'] }
  ]
});
E('jiyuan', {
  id: 'yy_tianjige_chuancheng', title: '天机阁传承', chapter: true, weight: 4, min: 9, max: 11, once: true,
  lines: [
    '你寻到传说中的天机阁遗址。',
    '阁中机关重重，最终你来到阁顶，发现一枚金色玉简。'
  ],
  choices: [
    { t: '研习玉简', effect: { wu: 1 }, lines: ['玉简中记载着天机阁的阵道传承。（悟性+1）'] },
    { t: '以玉简换取资源', effect: { stone: 500, iron: 30 }, lines: ['你将玉简售出，换得大量资源。（灵石+500，灵铁+30）'] }
  ]
});
E('jiyuan', {
  id: 'yy_mozu_huashen', title: '魔祖化身', chapter: true, weight: 4, min: 9, max: 11, once: true,
  lines: [
    '一道黑影拦住你的去路。',
    '那是魔祖的一缕化身，他冷笑道："你就是那个要飞升的人？"'
  ],
  choices: [
    { t: '拔剑迎战', fight: { name: '魔祖化身', atk: 180, hp: 800, loot: { stone: 300, wu: 1 } },
      resultWin: '魔祖化身消散，留下一件魔道秘宝。',
      resultLose: '魔祖化身太强，你重伤退走。（气血大损）' },
    { t: '以道心化解', effect: { wu: 1, atk: 5 }, lines: ['你以道心化解魔念，魔祖化身自行消散。（悟性+1，攻击+5）'] }
  ]
});

/* ================ 元婴期游历（idx 9-11） ================ */
E('shejiao', {
  id: 'yy_jiuzhou_menghui', title: '九州盟会', chapter: true, weight: 6, min: 9, max: 11, once: true,
  lines: [
    '九州修士齐聚，共商对抗魔渊之策。',
    '你作为元婴修士，被推举为盟主之一。'
  ],
  choices: [
    { t: '担任盟主', effect: { hpMax: 100, atk: 5 }, lines: ['你担任盟主，威望大增。（气血上限+100，攻击+5）'] },
    { t: '推辞不就', effect: { wu: 1 }, lines: ['你推辞不就，专心修炼。（悟性+1）'] }
  ]
});
E('shejiao', {
  id: 'yy_tianguan_zhenshou', title: '天关镇守', chapter: true, weight: 5, min: 9, max: 11,
  lines: [
    '北境天关告急，你前往镇守。',
    '在关墙上，你看见历代守关人的遗愿。'
  ],
  choices: [
    { t: '镇守天关一年', effect: { hpMax: 100, ti: 2 }, lines: ['你在天关镇守一年，肉身更加强横。（气血上限+100，体魄+2）'] },
    { t: '主动出击', effect: { atk: 15, stone: 100 }, lines: ['你主动出击，斩杀大量魔物。（攻击+15，灵石+100）'] }
  ]
});
E('shejiao', {
  id: 'yy_xinghai_guanxing', title: '星海观星', chapter: true, weight: 5, min: 9, max: 11,
  lines: [
    '你登上九州最高的星台，观星悟道。',
    '漫天星辰仿佛在向你诉说宇宙的奥秘。'
  ],
  choices: [
    { t: '静观三日', effect: { wu: 3 }, lines: ['你静观三日，悟性大增。（悟性+3）'] },
    { t: '引星力入体', effect: { qi: function (s) { return Math.round(requireNeed(s) * 0.4); } }, lines: ['你引星力入体，修为大涨。'] }
  ]
});
E('shejiao', {
  id: 'yy_xukong_tansuo', title: '虚空探索', chapter: true, weight: 5, min: 9, max: 11,
  lines: [
    '你深入虚空裂缝，探索未知世界。',
    '在虚空中，你发现了一座漂浮的仙宫。'
  ],
  choices: [
    { t: '进入仙宫', fight: { name: '仙宫守护者', atk: 160, hp: 700, loot: { stone: 400, wu: 2 } },
      resultWin: '你击败守护者，获得仙宫中的宝物。',
      resultLose: '守护者太强，你被迫退出虚空。（气血受损）' },
    { t: '在外围探索', effect: { stone: 200, iron: 20 }, lines: ['你在虚空外围探索，收获颇丰。（灵石+200，灵铁+20）'] }
  ]
});
E('shejiao', {
  id: 'yy_moyuan_qianxian', title: '魔渊前线', chapter: true, weight: 5, min: 9, max: 11,
  lines: [
    '魔渊裂隙扩大，黑潮涌动。',
    '你带领修士军团，在前线与魔物激战。'
  ],
  choices: [
    { t: '身先士卒', effect: { atk: 20, hp: -50 }, lines: ['你身先士卒，斩杀大量魔物。（攻击+20）'] },
    { t: '坐镇指挥', effect: { wu: 2, hpMax: 60 }, lines: ['你坐镇指挥，运筹帷幄。（悟性+2，气血上限+60）'] }
  ]
});
E('shejiao', {
  id: 'yy_feisheng_yuzhao', title: '飞升预兆', chapter: true, weight: 4, min: 9, max: 11, once: true,
  lines: [
    '你在修炼时，忽然看见天门的幻影。',
    '那是飞升的预兆——你的道，即将圆满。'
  ],
  choices: [
    { t: '静心感悟', effect: { trib: 0.15, wu: 2 }, lines: ['你静心感悟天门，道心通明。（渡劫+15%，悟性+2）'] },
    { t: '以天门之力淬体', effect: { trib: 0.10, hpMax: 100, atk: 15 }, lines: ['你以天门之力淬炼肉身，实力大增。（渡劫+10%，气血上限+100，攻击+15）'] }
  ]
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
    { t: '以灵草敬奉，舍髓而去', effect: { herb: 10, stone: 80 }, lines: ['你将灵草投入蛟口，冰蛟竟温顺下来，拱了拱你的手。它额头缺了一角——旧伤仍在。你想起那句"修行，修的也是慈悲"。'] }
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
      lines: ['你解开兽夹，退开十步。幼狐回头看了你很久，才一瘸一拐钻进林间。你觉得心口很软。'] },
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

/* ================ 搜神记灵感事件 ================ */
E('jiyuan', {
  id: 'ssj_huqi_baoen', title: '狐妻报恩', chapter: true, weight: 5, min: 0, max: 2, once: true,
  setFlags: { foxGraced: 1 },
  lines: [
    '你在山中救了一只被猎夹困住的白狐，替它包扎伤口后放归山林。',
    '当夜，洞府外响起叩门声。一位白衣女子立在月光下，眉眼如画，身后拖着一条雪白的狐尾。',
    '"恩公，小女子白素，特来报救命之恩。"她从袖中取出一只沉甸甸的灵石袋。'
  ],
  choices: [
    { t: '收下灵石', effect: { stone: 80 },
      lines: ['你接过灵石袋，她朝你盈盈一拜，化作一道白光消失在夜色中。那灵石袋上，还带着淡淡的桃花香。'] },
    { t: '婉拒，只求她平安', effect: { dao: 0.5 },
      lines: ['你摆手道："举手之劳，不必挂怀。"她愣了愣，忽然红了眼眶："恩公……"说完消失在夜色中。'] }
  ]
});
E('jiyuan', {
  id: 'ssj_canma_yao', title: '蚕马妖', chapter: true, weight: 4, min: 3, max: 5, once: true,
  lines: [
    '南疆密林深处，一座破败的蚕神庙前，你看见一位白衣少年正对着蚕茧哭泣。',
    '他转过头，眼中满是哀伤："我娘……被困在茧里了。求你救救她。"',
    '你走近蚕茧，里面传出微弱的呼吸声——那不是妖，是人。'
  ],
  choices: [
    { t: '斩开蚕茧', fight: { name: '蚕马妖', atk: 55, hp: 240, loot: { equip: 'canjia' } },
      resultWin: '蚕茧裂开，里面是一位昏厥的妇人。少年抱着母亲痛哭。你收好蚕马妖留下的蚕丝甲——柔软如水，坚韧如铁。',
      resultLose: '蚕丝缠住你的手腕，越勒越紧。你奋力挣脱，掌心已被勒出血痕。（气血受损）' },
    { t: '倾听少年的故事', effect: { dao: 0.5, qi: 80 },
      lines: ['少年说，他母亲本是蚕神，因触犯天条被打落凡间，被仇家困在茧中。你静静听完，心中若有所悟。（悟性+1，修为+）'] },
    { t: '焚香三拜，转身离去', effect: { herb: 5, stone: 60 },
      lines: ['你以香火礼敬蚕神，取了庙中供奉的灵草与灵石便走。身后传来少年的哭声，在密林中回荡。'] }
  ]
});
E('jiyuan', {
  id: 'ssj_ganjiang_moye', title: '干将莫邪', chapter: true, weight: 4, min: 6, max: 8, once: true,
  lines: [
    '你寻访到一处古铸剑炉，炉火虽灭，炉中仍有一股不甘的剑意。',
    '炉前石壁上刻着两行字："干将莫邪，以身殉剑，剑成则人亡，人亡则剑灵。"',
    '炉底沉着一柄残剑，剑身已断，却仍散发着惊人的锋芒。'
  ],
  choices: [
    { t: '以血祭剑，重铸锋芒', effect: { atk: 5 },
      lines: ['你割破掌心，鲜血滴在断剑上。剑身嗡鸣，裂纹渐渐愈合——一柄完整的古剑在你掌中重生。你感到剑与你血脉相连。（攻击+5）'] },
    { t: '参悟铸剑之道', effect: { dao: 0.5, atk: 5 },
      lines: ['你盘坐炉前，参悟三日三夜。铸剑之道，亦是修行之道。你悟得"人剑合一"之理。（道心+0.5，攻击+5）'] }
  ]
});
E('jiyuan', {
  id: 'ssj_fox_accessory', title: '灵狐配饰', chapter: false, weight: 100, min: 3, max: 14, once: true,
  req: { flags: { foxGraced: 1 } },
  lines: [
    '白素再次出现在你洞府前。',
    '这一次她没有带灵石，只带来一件精致的配饰——一枚赤红的狐毛编织成的坠子，在月光下泛着淡淡的银光。',
    '"恩公。"她盈盈下拜，"上次匆忙，只来得及给你一枚信物。这一次，小女子正式将这枚灵狐配饰赠予恩公。"',
    '她将配饰递给你，指尖微微颤抖。',
    '"这配饰以我自己的尾毛编织，又以千年灵力温养。戴在身上，可保不受妖邪迷惑。"',
    '她顿了顿，轻声说，"恩公……保重。"'
  ],
  effect: { equip: 'linghu_pei' },
  result: '你接过灵狐配饰，入手温热，能感到一股柔和的灵力在其中流转。她朝你笑了笑，化作白光消散。（获得法宝：灵狐配饰）'
});

/* ================ 聊斋志异灵感事件 ================ */
E('shejiao', {
  id: 'lzh_yingning', title: '婴宁笑缘', chapter: true, weight: 5, min: 3, max: 5, once: true,
  req: { flags: { lin: 1 } },
  setFlags: { yingning: 1 },
  lines: [
    '你在山间小径上，忽然听见银铃般的笑声。',
    '一个梳着双丫髻的少女蹲在花丛中，对着一朵野花笑个不停。',
    '她看见你，非但不避，反而指着花说："你看它，它也在笑呢！"'
  ],
  choices: [
    { t: '与她同笑', effect: { fu: 0.5, hp: 20 },
      lines: ['你蹲下来，和她一起笑。笑够了，她从花丛中摘下一朵别在你耳边："送你。你笑起来也好看。"'] },
    { t: '赠她一株灵花', req: { stone: 200 }, effect: { stone: -200, fu: 1 },
      lines: ['你从储物袋中取出一株品相最好的灵花递给她。她眼睛亮了，小心翼翼地捧着花，像捧着全世界。'] }
  ]
});
E('shejiao', {
  id: 'lzh_lianxiang', title: '莲香情劫', chapter: true, weight: 4, min: 6, max: 8, once: true,
  setFlags: { lianxiang: 1 },
  lines: [
    '你在月下独行，忽然闻到一股异香。',
    '一位红衣女子坐在莲池边，手中捻着一朵血红的莲花。她转过头，眼中满是哀伤。',
    '"少侠，我本是千年莲精，如今劫数将至，恐怕……活不过今夜了。"'
  ],
  choices: [
    { t: '助她渡劫', fight: { name: '莲香之劫', atk: 80, hp: 350, loot: { herb: 15, stone: 120, flags: { lianxiang_saved: 1 } } },
      resultWin: '你以剑气斩碎天劫，莲精化为人形，盈盈下拜："少侠大恩，来世再报。"你收好她留下的莲子——那是千年道行的结晶。',
      resultLose: '天劫太强，你被震退。莲精在劫火中渐渐消散，最后朝你笑了笑。（气血大损）' },
    { t: '无力相助，黯然离去', effect: { dao: -0.5 },
      lines: ['你看着劫火中的她，无能为力。那一夜，你在莲池边坐了很久。次日，池中多了一朵永不凋谢的白莲。'] }
  ]
});
E('shejiao', {
  id: 'lzh_lianxiang_return', title: '莲香归来', chapter: true, weight: 100, min: 6, max: 14, once: true,
  req: { flags: { lianxiang_saved: 1 } },
  setFlags: { lianxiang_done: 1 },
  lines: [
    '你在莲池边打坐，忽然闻到一股熟悉的异香。',
    '睁开眼，一位红衣女子站在你面前。她比上次更美了——肌肤如雪，眉眼如画，周身灵气流转，显然修为大进。',
    '"少侠。"她盈盈下拜，"莲香归来，特来报恩。"',
    '你扶她起来："不必多礼。你渡劫成功了？"',
    '她点头："多亏少侠相助。莲香修行千年，今日终于化形成功。"',
    '她从袖中取出一枚通体碧绿的莲子递给你，"这是千年道行的结晶——碧莲子。服下可增寿二十年，百毒不侵。"',
  ],
  effect: { life: 20 },
  result: '你服下碧莲子，感到寿元大增，百毒不侵。（寿元+20）'
});
E('shejiao', {
  id: 'lzh_nie_xiaoqian', title: '聂小倩往生', chapter: true, weight: 4, min: 3, max: 5, once: true,
  setFlags: { xiaolian: 1 },
  lines: [
    '你在古寺中歇脚，月光下忽然出现一位青衣女子。',
    '她面容姣好，却浑身散发着阴冷的气息。"公子，我本是聂小倩，含冤而死，魂魄困于此地。"',
    '"求公子助我往生，来世必报大恩。"'
  ],
  choices: [
    { t: '以道力送她往生', effect: { dao: 0.5, qi: 100 },
      lines: ['你盘坐诵经，以道力超度她的亡魂。她含笑消散，化作点点荧光飞向天际。古寺中回荡着一声轻叹："多谢公子……"'] },
    { t: '收留她，为她塑灵位', req: { stone: 200 }, effect: { stone: -200, flags: { xiaolianStay: 1 }, hp: -20 },
      lines: ['你花了两百灵石为她塑了一座灵位，日日供奉。她的魂魄渐渐凝实，偶尔会在月下现身，与你对坐饮茶。'] }
  ]
});
E('shejiao', {
  id: 'lzh_nie_xiaoqian_return', title: '小倩报恩', chapter: true, weight: 5, min: 6, max: 8, once: true,
  req: { flags: { xiaolianStay: 1 } },
  setFlags: { xiaolianDone: 1 },
  lines: [
    '你在灵位前打坐，忽然感到一股熟悉的阴冷气息。睁开眼，聂小倩站在你面前——',
    '她的身形比从前凝实了许多，眉眼间多了一丝生气。',
    '"公子。"她盈盈下拜，"这些日子，我日夜守护公子的洞府。今夜特来现身，有一事相告。"',
    '她告诉你，古寺之下埋着一枚"冥灵珠"，那是她生前的本命法宝。她已将其炼化，如今可助公子一臂之力。',
    '"公子收留之恩，小倩无以为报。这枚冥灵珠，便赠予公子吧。"'
  ],
  effect: { shen: 1, dao: 0.5 },
  result: '你接过冥灵珠，感到一股阴柔的灵力涌入体内。小倩朝你微微一笑，化作青烟消散在月光中。（神识+1，道心+0.5）'
});
E('mijing', {
  id: 'lzh_huapi', title: '画皮之祸', chapter: true, weight: 4, min: 6, max: 8, once: true,
  lines: [
    '你在城中遇见一位美貌女子，她楚楚可怜地向你诉苦。',
    '"妾身被恶人追杀，求少侠收留。她只有你了。"你正要答应，忽然看见她眼角有一丝不自然的褶皱——',
    '那不是皱纹，是画皮的接缝。'
  ],
  choices: [
    { t: '揭穿妖物', req: { shen: 3 }, effect: { shen: 0.5 },
      lines: ['你凝神细观，一眼看穿画皮之下青面獠牙的真容。妖物惊觉被识破，惨叫着逃走。（神识+0.5）'] },
    { t: '以道心洞察', req: { dao: 3 }, effect: { dao: 0.5, hpMax: 50 },
      lines: ['你闭目凝神，以道心洞察虚实。画皮在道力面前无所遁形，化作一缕青烟散去。（道心+0.5，气血上限+50）'] },
    { t: '勉强应对', fight: { name: '画皮妖', atk: 90, hp: 400, loot: { stone: 200 } },
      resultWin: '你一剑划破她的画皮，露出底下青面獠牙的真容。妖物惨叫着逃走，留下两百灵石。',
      resultLose: '妖物突然暴起，你被利爪划伤。她冷笑着消失在夜色中。（气血受损）' }
  ]
});

/* ================ 山海经灵感事件 ================ */

E('jiyuan', {
  id: 'shj_bifang', title: '毕方现世', chapter: true, weight: 5, min: 6, max: 8, once: true,
  setFlags: { bifang: 1 },
  lines: [
    '你在丹霞谷深处看见一只独脚的火鸟，通体赤红，立于枯木之上。',
    '那是毕方——传闻它出现之处，必有大火。但此刻它静静立着，眼中没有敌意，只有疲惫。',
    '它的翅膀受了伤，正在滴血。'
  ],
  choices: [
    { t: '炼化它的火源', fight: { name: '受伤毕方', atk: 85, hp: 380, loot: { stone: 200, herb: 10 } },
      resultWin: '毕方挣扎片刻，终于倒下。你从它体内取出一枚火红的内丹——毕方火源。你感到体内灵力涌动。',
      resultLose: '毕方一口真火喷来，你被烧得满身焦黑，仓皇逃出谷外。（气血大损）' },
    { t: '为它疗伤', effect: { dun: 1, hpMax: 60 },
      lines: ['你取出灵药敷在它的伤口上。它低头看了你很久，忽然用喙衔下一枚赤红的羽毛递给你——那是毕方的翎羽，火系至宝。（遁速+1，气血上限+60）'] }
  ]
});

E('jiyuan', {
  id: 'shj_xiwangmu', title: '西王母赐桃', chapter: true, weight: 3, min: 9, max: 11, once: true,
  lines: [
    '你在昆仑山巅看见一座仙宫，宫门半开，里面传出淡淡的桃香。',
    '一位雍容华贵的女子坐在玉座上，手中托着一枚散发着金光的仙桃。',
    '"你来了。"她微微一笑，"我等你很久了。"'
  ],
  choices: [
    { t: '求长生', effect: { life: 50, hpMax: 80 },
      lines: ['她将仙桃递给你："吃了这枚桃子，可增寿五十年。但记住——长生不是目的，而是修行的开始。"仙桃入口即化，你感到寿元大增。'] },
    { t: '求大道', effect: { dao: 0.5, qi: 300 },
      lines: ['她看着你，眼中露出赞许："好，有志气。"她伸出手指在你眉心一点——大道真意灌入识海。（道心+0.5，修为大进）'] }
  ]
});

E('shejiao', {
  id: 'lin_childhood', title: '青梅往事', chapter: true, weight: 8, min: 0, max: 2, once: true,
  req: { flags: { lin: 1 } },
  setFlags: { linChildhood: 1 },
  lines: [
    '你在城中闲逛，忽然看见一棵老槐树。',
    '树下刻着两个小字——是你小时候刻的。旁边还有一个歪歪扭扭的名字：林婉儿。',
    '你想起许多年前，有个小女孩总是跟在你身后，叽叽喳喳说个不停。',
    '"你说过要带我去修仙的。你忘了？"'
  ],
  effect: { dao: 0.5, hp: 15 },
  result: '你站在槐树下很久。那些年的画面，一帧帧闪过脑海。（道心+0.5，气血+15）'
});
E('shejiao', {
  id: 'lin_dabi', title: '宗门大比·再遇', chapter: true, weight: 7, min: 3, max: 5, once: true,
  req: { flags: { lin2: 1 } },
  setFlags: { linDabi: 1 },
  lines: [
    '宗门大比，你站在擂台上，忽然看见对面站着一个熟悉的身影。',
    '林婉儿穿着一身青色道袍，手持长剑，朝你微微一笑："呆子，好久不见。"',
    '她拔剑出鞘，剑光如水——这些年，她也没闲着。'
  ],
  choices: [
    { t: '擂台切磋', fight: { name: '林婉儿', atk: 50, hp: 200, loot: { stone: 100 } },
      resultWin: '你一剑挑飞她的长剑，她跌坐在地，气鼓鼓地瞪你："你赢了。"但她眼中分明带着笑意。',
      resultLose: '她的剑比你快半招，你输了。她扶你起来："下次再来。"你闻到她身上淡淡的药香。' },
    { t: '台下叙旧', effect: { fu: 0.5, hp: 30 },
      lines: ['你跳下擂台，和她坐在角落里聊天。她给你讲这些年走南闯北的故事，你给她讲修行中的趣事。不知不觉，天就黑了。'] }
  ]
});
E('shejiao', {
  id: 'lin_rain', title: '道侣日常·雨夜', chapter: true, weight: 6, min: 6, max: 8, once: true,
  req: { flags: { daoLu: 1 } },
  setFlags: { linRain: 1 },
  lines: [
    '洞府外下着大雨，你和林婉儿坐在檐下，温了一壶灵酒。',
    '她靠在你肩上，轻声说："你说，我们能修到飞升吗？"',
    '你没有回答。她笑了笑："飞升不了也没关系。有你在，哪里都是家。"'
  ],
  effect: { hp: 40, qi: 50 },
  result: '雨声如琴，酒香如故。这漫长修行路，有一个人等你回家，便已足够。（气血+40，修为+）'
});
E('shejiao', {
  id: 'lin_crisis', title: '道侣危机·旧伤', chapter: true, weight: 5, min: 6, max: 8, once: true,
  req: { flags: { daoLu: 1 } },
  setFlags: { linCrisisDone: 1 },
  lines: [
    '林婉儿忽然吐血倒地，你冲过去扶住她。',
    '她的经脉中有一股暗伤在蔓延——那是多年前她独自面对心魔时留下的。',
    '"我没事……"她勉强笑了笑，"别担心。"'
  ],
  choices: [
    { t: '以灵力救治', effect: { hp: -50, flags: { linHealed: 1 } },
      lines: ['你将灵力灌入她体内，一点一点修复她的经脉。三个时辰后，她终于沉沉睡去。你守在床边，一夜未眠。'] },
    { t: '寻找天材地宝', req: { stone: 300 },
      effect: { stone: -300, flags: { linHealed: 1 } },
      lines: ['你花了三百灵石买来续脉丹，喂她服下。她缓缓睁开眼，看见你憔悴的脸，伸手摸了摸："傻子......"'] }
  ]
});
E('shejiao', {
  id: 'lin_battle', title: '并肩御敌', chapter: true, weight: 5, min: 9, max: 11, once: true,
  req: { flags: { daoLu: 1 } },
  setFlags: { linBattle: 1 },
  lines: [
    '魔修突袭宗门，你和林婉儿并肩站在城墙上。',
    '她拔出长剑，剑光如水："今天，我们一起守。"',
    '魔修如潮水般涌来，你们背靠背，剑光交织。'
  ],
  choices: [
    { t: '并肩作战', fight: { name: '魔修先锋', atk: 130, hp: 600, loot: { stone: 200, atk: 10 } },
      resultWin: '你们联手斩杀魔修先锋，魔修溃退。她靠在你肩上，大口喘气："我们赢了。"你握紧她的手。',
      resultLose: '魔修太强，你们被迫撤退。她的手臂被划伤，你为她包扎时，手在发抖。' },
    { t: '让她断后', effect: { atk: 15, dao: 0.5 },
      lines: ['你冲入敌阵，她在身后掩护。你斩杀数十魔修，回头时，看见她独自面对三倍的敌人——她的眼神告诉你：我能行。'] }
  ]
});
E('shejiao', {
  id: 'lin_reunion', title: '前缘再续', chapter: true, weight: 4, min: 9, max: 11, once: true,
  req: { flags: { daoLu: 1 } },
  setFlags: { linReunion: 1 },
  lines: [
    '你在洞府中打坐，忽然看见一个画面——',
    '那是前世的记忆：你和她站在奈何桥头，她含泪喝下孟婆汤，回头看了你最后一眼。',
    '"来世，我还要遇见你。"',
    '你睁开眼，发现林婉儿正坐在对面，静静地看着你。她的眼中，也闪着泪光。'
  ],
  effect: { wu: 0.5, dao: 1, hpMax: 60, qi: 200 },
  result: '原来你们的缘分，不止这一世。（悟性+0.5，道心+1，气血上限+60，修为大进）'
});
E('shejiao', {
  id: 'lin_ascend', title: '并肩飞升', chapter: true, weight: 3, min: 9, max: 11, once: true,
  req: { flags: { daoLu: 1, linReunion: 1 } },
  setFlags: { linAscend: 1 },
  lines: [
    '天劫降临，九道天雷劈下。你站在峰顶，林婉儿站在你身旁。',
    '"我说过——天劫，我们一起扛。"',
    '她握住你的手。你们一起踏入雷海。'
  ],
  effect: { trib: 0.20, wu: 1, dao: 1, hpMax: 100 },
  result: '天劫虽强，你们的道心更强。雷海中，你们携手飞升。（渡劫+20%，悟性+1，道心+1，气血上限+100）'
});

/* ================ 年岁小事件（年末广播） ================ */
E('year', { id: 'y_pinghe', title: '岁月静好', weight: 5, lines: '这一年过得平顺。春来播种，秋来收丹，冬日你在檐下看雪，觉得"长生"二字，也没那么急。' });
E('year', { id: 'y_fengshou', title: '丰年', weight: 4, lines: '灵田丰收，灵石入库。你清点家底时，嘴角不自觉地翘了起来。', effect: { stone: 40 } });
E('year', { id: 'y_drough', title: '大旱之年', weight: 3, lines: '大旱三月，凡间颗粒无收。你夜施甘霖，救了一方百姓。香火虽无形，心却安。' });
E('year', { id: 'y_xiaye', title: '夏夜萤火', weight: 4, lines: '夏夜，萤火漫天。你想起许多年前那个和你在屋檐下躲雨的人。' });

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
  { id: 'wu',         name: '慧根',     desc: '悟性 +1（先天资质）',            cost: 6, max: 5,  apply: { wu: 1 } },
  { id: 'ti',         name: '强体',     desc: '体魄 +1（肉身根基）',            cost: 3, max: 5,  apply: { ti: 1 } },
  { id: 'stone',      name: '殷实',     desc: '出生时灵石 +100',                cost: 2, max: 4,  apply: { stone: 100 } },
  { id: 'juling0',    name: '见面礼',   desc: '出生时自带聚气丹 ×3',           cost: 3, max: 3,  apply: { elixirs: { juling: 3 } } },
  { id: 'cult',       name: '道种',     desc: '修炼速度 +10%（永驻）',          cost: 6, max: 5,  apply: { cultMul: 0.10 } },
  { id: 'alchemy',    name: '丹心',     desc: '炼丹时间 -1年',                   cost: 3, max: 3,  apply: { alchemyTimeReduce: 1 } },
  { id: 'forge',      name: '器魂',     desc: '炼器时间 -1年',                   cost: 3, max: 3,  apply: { forgeTimeReduce: 1 } },
  { id: 'dun',        name: '灵步',     desc: '遁速 +1（先天身法）',            cost: 3, max: 5,  apply: { dun: 1 } },
  { id: 'shen',       name: '神念',     desc: '神识 +1（先天感知）',            cost: 3, max: 5,  apply: { shen: 1 } },
  { id: 'dao',        name: '定心',     desc: '道心 +1（先天心境）',            cost: 6, max: 5,  apply: { dao: 1 } },
  { id: 'fu',         name: '招财',     desc: '福源 +1（先天福运）',            cost: 3, max: 5,  apply: { fu: 1 } },
  { id: 'life20',     name: '延寿',     desc: '出生寿元 +20',                   cost: 2, max: 3,  apply: { life: 20 } },
  { id: 'shesheng',   name: '舍生',     desc: '修炼速度 +10%，每次修炼 -1寿元', cost: 5, max: 3,  apply: { shesheng: 0.10 } },
  { id: 'lvling_bottle', name: '小绿瓶', desc: '灵草成长时间 -1年',              cost: 3, max: 3,  apply: { herbGrowReduce: 1 } },
  { id: 'extra_field',   name: '随身灵田', desc: '初始灵田 +1块',                cost: 3, max: 3,  apply: { extraField: 1 } },
  { id: 'destiny_slot',  name: '我命由我', desc: '初始命格栏 +1格',                cost: 12, max: 1,  apply: { destinySlot: 1 } },
  { id: 'extra_destiny', name: '大千命格', desc: '初始可抽取命格 +1',              cost: 5, max: 4,  apply: { extraDestiny: 1 } },
  { id: 'destiny_lock', name: '天命锁定', desc: '可锁定1个命格后重新抽取',        cost: 12, max: 1,  apply: { destinyLock: 1 } }
];

/* ---------------- 命格系统 ---------------- */
const DESTINIES = {
  /* ======== 凡命（白）—— 属性+1 / 战斗+3% ======== */
  tongpi:       { name:'铜皮铁骨',   grade:'白', type:'attr',  attr:{ ti:1 }, desc:'肉身强健，不易受伤' },
  lingtai:      { name:'灵台清明',   grade:'白', type:'attr',  attr:{ wu:1 }, desc:'心思澄澈，易于参悟' },
  taxue:        { name:'踏雪无痕',   grade:'白', type:'attr',  attr:{ dun:1 }, desc:'身法轻盈，如履平地' },
  dongcha:      { name:'洞察秋毫',   grade:'白', type:'attr',  attr:{ shen:1 }, desc:'目光如炬，明察秋毫' },
  xinruzhishui: { name:'心如止水',   grade:'白', type:'attr',  attr:{ dao:1 }, desc:'心境平和，不受外扰' },
  caixing:      { name:'财星高照',   grade:'白', type:'attr',  attr:{ fu:1 }, desc:'财运亨通，机缘不断' },
  jianyi:       { name:'剑意初凝',   grade:'白', type:'combat', effect:{ atkMul:0.03 }, desc:'剑气初显，锋芒毕露' },
  lingqi:       { name:'灵气护体',   grade:'白', type:'combat', effect:{ defMul:0.03 }, desc:'灵气自动护体' },
  qingling:     { name:'轻灵之体',   grade:'白', type:'combat', effect:{ dodgeRate:0.02 }, desc:'身法灵动，难以捉摸' },
  shafa:        { name:'杀伐果断',   grade:'白', type:'combat', effect:{ critRate:0.02 }, desc:'出手果断，一击致命' },

  /* ======== 本命（绿）—— 属性+1~2 / 战斗+5~8% ======== */
  daoti:        { name:'道体天成',   grade:'绿', type:'attr',  attr:{ wu:2, dao:1 }, desc:'天生道体，修行如饮水' },
  jianxin:      { name:'剑心通明',   grade:'绿', type:'attr',  attr:{ shen:2, wu:1 }, desc:'剑心通明，万法皆可为剑' },
  xuanjia:      { name:'玄甲反噬',   grade:'绿', type:'combat', attr:{ ti:2 }, effect:{ thorns:0.08 }, desc:'玄甲护体，敌伤我百，自损一千' },
  shixue:       { name:'噬血诀',     grade:'绿', type:'combat', attr:{ ti:1 }, effect:{ lifesteal:0.03 }, desc:'攻击附带吸血效果' },
  yibi:         { name:'以彼之道',   grade:'绿', type:'combat', attr:{ dun:1 }, effect:{ counterRate:0.05 }, desc:'以彼之道，还施彼身' },
  tianshengsl:  { name:'天生神力',   grade:'绿', type:'combat', effect:{ atkMul:0.05, critRate:0.03 }, desc:'力大无穷，一力降十会' },
  lingqiao:     { name:'灵巧之身',   grade:'绿', type:'attr',  attr:{ dun:2 }, effect:{ dodgeRate:0.03 }, desc:'身法灵动，闪避极高' },
  houtu:        { name:'厚土之体',   grade:'绿', type:'attr',  attr:{ ti:2 }, effect:{ defMul:0.05 }, desc:'如大地般厚重坚韧' },
  lingqinqinhe: { name:'灵气亲和',   grade:'绿', type:'attr',  attr:{ wu:1, dao:1 }, desc:'与天地灵气亲和' },
  zhuifeng:     { name:'追风逐电',   grade:'绿', type:'combat', attr:{ dun:2 }, effect:{ firstStrike:0.10 }, desc:'速度如电，必定先手' },

  /* ======== 奇命（蓝）—— 属性+2~3 / 战斗+8~13% ======== */
  tianshengjp:  { name:'天生剑胚',   grade:'蓝', type:'attr',  attr:{ shen:2, wu:1 }, desc:'天生剑道奇才' },
  liuli:        { name:'琉璃宝体',   grade:'蓝', type:'combat', attr:{ ti:3 }, effect:{ defMul:0.08 }, desc:'肉身如琉璃，坚不可摧' },
  zhuifeng2:    { name:'追风逐电',   grade:'蓝', type:'combat', attr:{ dun:3 }, effect:{ dodgeRate:0.05 }, desc:'速度极快，闪避极高' },
  jubao:        { name:'聚宝盆',     grade:'蓝', type:'attr',  attr:{ fu:3, wu:1 }, desc:'财运极佳，机缘不断' },
  shixuekuang:  { name:'嗜血狂徒',   grade:'蓝', type:'combat', effect:{ lifesteal:0.05, critRate:0.05 }, desc:'攻击附带吸血，暴击极高' },
  fanshangdun:  { name:'反伤之盾',   grade:'蓝', type:'combat', effect:{ defMul:0.10, thorns:0.13 }, desc:'防御极高，反伤恐怖' },
  xiantiandt:   { name:'先天道体',   grade:'蓝', type:'attr',  attr:{ wu:1, ti:1, dun:1, shen:1, dao:1, fu:1 }, desc:'全面发展的先天体质' },
  jiandaozs:    { name:'剑道宗师',   grade:'蓝', type:'combat', effect:{ atkMul:0.08, critRate:0.05 }, desc:'剑道大成，攻伐无双' },
  linghunjr:    { name:'灵魂坚韧',   grade:'蓝', type:'attr',  attr:{ dao:1, shen:2 }, desc:'灵魂坚韧，难以动摇' },
  tianshengfx:  { name:'天生福星',   grade:'蓝', type:'attr',  attr:{ fu:3 }, effect:{ stonePerYear:10 }, desc:'福运绵长，财源广进' },

  /* ======== 极命（紫）—— 属性+3~4 / 战斗+13~18% ======== */
  tianlinggen:  { name:'天灵根',     grade:'紫', type:'attr',  attr:{ wu:3, dao:2, fu:1 }, desc:'天生灵根，修行无瓶颈' },
  hunyuan:      { name:'混元道体',   grade:'紫', type:'attr',  attr:{ ti:3, dao:2, wu:1 }, desc:'混元一体，万法皆通' },
  leiling:      { name:'雷灵之体',   grade:'紫', type:'combat', attr:{ dun:3, shen:2, ti:1 }, desc:'雷霆之体，速度与力量兼备' },
  shashen:      { name:'杀神转世',   grade:'紫', type:'combat', effect:{ critRate:0.05, lifesteal:0.05 }, desc:'杀神降世，挡我者死' },
  bumie:        { name:'不灭金身',   grade:'紫', type:'combat', attr:{ ti:3 }, effect:{ defMul:0.13, thorns:0.15 }, desc:'金身不灭，万法不侵' },
  xiantijian:   { name:'先天剑体',   grade:'紫', type:'combat', attr:{ shen:3 }, effect:{ atkMul:0.08, critRate:0.06 }, desc:'先天剑体，剑道无双' },
  tianming:     { name:'天命之子',   grade:'紫', type:'attr',  attr:{ wu:1, ti:1, dun:1, shen:1, dao:1, fu:1 }, effect:{ stonePerYear:15 }, desc:'天命所归，万事亨通' },

  /* ======== 仙命（金）—— 全维+2 / 战斗+18~25% ======== */
  jiutian:      { name:'九天玄体',   grade:'金', type:'attr',  attr:{ wu:2, ti:2, dun:2, shen:2, dao:2, fu:2 }, desc:'九天之上，唯我独尊' },
  daoxinjm:     { name:'道心渐明',   grade:'金', type:'attr',  effect:{ wuPerYear:0.3 }, desc:'道心通明，悟性渐增' },
  roushen:      { name:'肉身成圣',   grade:'金', type:'combat', effect:{ tiPerYear:0.3, defMul:0.15 }, desc:'肉身成圣，万法不侵' },
  tianming2:    { name:'天命之子',   grade:'金', type:'attr',  attr:{ dao:3, fu:3 }, effect:{ tribBonus:0.15 }, desc:'天命所归，渡劫无忧' },
  shafadj:      { name:'杀伐果断',   grade:'金', type:'combat', effect:{ atkMul:0.15, critRate:0.13, executeBonus:0.10 }, desc:'一击必杀，挡我者死' },
  wanfabuqin:   { name:'万法不侵',   grade:'金', type:'combat', effect:{ defMul:0.18, thorns:0.20, controlImmune:true }, desc:'万法不侵，反伤极致' },
  xiantiandao:  { name:'先天道体',   grade:'金', type:'attr',  attr:{ wu:2, ti:2, dun:2, shen:2, dao:2, fu:2 }, effect:{ stonePerYear:25 }, desc:'先天道体，万法皆通' },
  zhanshen:     { name:'战神降世',   grade:'金', type:'combat', effect:{ atkMul:0.18, critRate:0.15, lifesteal:0.08 }, desc:'战神降世，天下无敌' },
  tiandao:      { name:'天道宠儿',   grade:'金', type:'attr',  attr:{ wu:2, ti:2, dun:2, shen:2, dao:2, fu:2 }, effect:{ tribBonus:0.15, stonePerYear:20 }, desc:'天道眷顾，万事如意' },
  wanjian:      { name:'万剑归宗',   grade:'金', type:'combat', effect:{ atkMul:0.20, critRate:0.18, techTypeBonus:{ xinfa:0.25 } }, desc:'万剑归宗，剑道巅峰' }
};

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
  weapon:    { name: '武器' },
  head:      { name: '头饰' },
  body:      { name: '躯干' },
  leg:       { name: '腿部' },
  accessory: { name: '饰品' },
  treasure:  { name: '法宝' }
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
    xinghe_fayi:     { name: '星河法衣',   tier: 5, hpMax: 250, ti: 2, price: 7200, desc: '衣上星辰自晦明，映照周天。' },
    canjia:          { name: '蚕丝甲',     tier: 2, hpMax: 60,  atk: 8,  price: 80,  desc: '白素以千年蚕丝织成，柔软如水，坚韧如铁。' }
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
    jinylv:          { name: '金缕衣',     tier: 4, hpMax: 200, atk: 30, price: 1000, desc: '天蚕金丝所织，万法不侵。' },
    linghu_pei:      { name: '灵狐配饰',   tier: 2, dao: 3, price: 0, desc: '灵狐尾毛与感恩之心所成，持之不受迷惑。' },
    dashen_bian:     { name: '打神鞭',     tier: 3, atk: 16, price: 0, desc: '古朴铜鞭，刻满古文，可破万法。' },
    tongqian_jian:   { name: '铜钱剑',     tier: 3, atk: 5, price: 0, desc: '古朴铜钱所化小剑，看似寻常却蕴含深意。' }
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