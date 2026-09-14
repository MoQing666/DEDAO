/* ============================================================
   DEDAO 得道 —— 引擎（行动 / 突破 / 天劫 / 战斗 / 轮回）
   ============================================================ */
const Engine = (function () {

  const LS_SAVE = 'dedao_save';
  const LS_META = 'dedao_meta';
  const LS_SLOTS = ['dedao_slot0', 'dedao_slot1', 'dedao_slot2'];

  /* 存档版本号：每次破坏性改动 +1。
     旧档（无 __saveVersion 字段，或 < 当前值）在开机时由 cleanupLegacySaves 清理，
     强制以新版本重开，避免老结构存档被误读导致崩溃 / 异常。 */
  const SAVE_VERSION = 1;

  /* ---------------- 档案 ---------------- */
  function defaultMeta() {
    return { points: 0, lives: 0, reinc: {}, achievements: {}, flown: false, maxJie: 0 };
  }
  function loadMeta() {
    try {
      const m = JSON.parse(localStorage.getItem(LS_META));
      if (m && m.reinc) {
        // 迁移：天赋「大千命格」(extra_destiny) 已于 2026-09-14 删除，
        // 已购买的等级按原价（3 点/级）全额退还轮回点，并清除该字段，避免残留继续生效。
        if (m.reinc.extra_destiny) {
          const lv = m.reinc.extra_destiny || 0;
          m.points = (m.points || 0) + lv * 3;
          delete m.reinc.extra_destiny;
          saveMeta(m);
        }
        // 兼容：补齐缺失字段（旧档可能只有 reinc 而无 achievements/points/lives 等），
        // 否则 openAchievements 里 `meta.achievements[id]` 会抛 TypeError，导致成就页（成就·轮回印记）整页空白。
        const d = defaultMeta();
        for (const k in d) if (m[k] === undefined) m[k] = d[k];
        if (!m.reinc) m.reinc = {};
        if (!m.achievements) m.achievements = {};
        return m;
      }
    } catch (e) {}
    return defaultMeta();
  }
  function saveMeta(meta) {
    try { localStorage.setItem(LS_META, JSON.stringify(meta)); } catch (e) {}
  }
  function slotKey(slot) { return slot == null ? LS_SAVE : LS_SLOTS[slot]; }
  function loadState(slot) {
    try {
      const s = JSON.parse(localStorage.getItem(slotKey(slot)));
      if (!s) return null;
      ensureTechEquip(s);
      // 迁移旧材料系统到分级材料系统
      if (s && !s.materials) {
        s.materials = {
          herb_huang: s.herb || 0,
          herb_xuan: 0, herb_di: 0, herb_tian: 0,
          iron_huang: s.iron || 0,
          iron_xuan: 0, iron_di: 0, iron_tian: 0
        };
        s.herb = 0;
        s.iron = 0;
      }
      // 兼容旧存档：确保新属性存在
      if (s) {
        if (s.wu === undefined) s.wu = 0;
        if (s.ti === undefined) s.ti = 0;
        if (s.dun === undefined) s.dun = 0;
        if (s.shen === undefined) s.shen = 0;
        if (s.dao === undefined) s.dao = 0;
        if (s.ling === undefined) s.ling = 0;
        // 灵力条（法力）兼容：旧档无 mp 字段则按公式补算
        if (s.mpMax === undefined) { s.mpMax = 20 + Math.max(0, (s.ling || 0) - 1) * 20; s.mp = s.mpMax; }
        if (!s.destinies) s.destinies = [];
        if (!s.destinySlots) s.destinySlots = 1;
        if (!s.equip) s.equip = { head: null, body: null, weapon: null, accessory: null, treasure: [] };
        if (s.equip.leg !== undefined) delete s.equip.leg;   // 腿部槽已移除（装备体系重做）
        if (s.equip.treasure === undefined) s.equip.treasure = [];
        // 灵物改制（2026-09-13）：旧档的 s.spiritItems（独立道具，只能完美突破）
        // 全部并入法宝囊 s.arts —— 灵物的本质已是法宝，之后与其他法宝同吃装备槽。
        if (Array.isArray(s.spiritItems) && s.spiritItems.length) {
          if (!Array.isArray(s.arts)) s.arts = [];
          s.spiritItems.forEach(function (id) {
            if (ARTIFACTS[id] && s.arts.indexOf(id) < 0) s.arts.push(id);
          });
        }
        delete s.spiritItems;
        delete s.perfectBreaks;
        // 法宝统一为装备型：旧档中处于 s.arts（原「本命型·自动生效」）的法宝，
        // 迁移进装备槽（按当前上限尽量自动装备，超出上限的留在库存 s.arts）。
        if (Array.isArray(s.arts) && Array.isArray(s.equip.treasure)) {
          s.arts.slice().forEach(function (id) {
            if (s.equip.treasure.indexOf(id) >= 0) return;
            if (s.equip.treasure.length < maxTreasure(s)) s.equip.treasure.push(id);
          });
        }
        // P1–P7 新字段兼容
        if (s.gongye === undefined) s.gongye = 0;
        if (s.gongyeEarned === undefined) s.gongyeEarned = 0;
        if (s.sectRank === undefined) s.sectRank = null;
        if (!s.array) s.array = { juling: { level: 0, paid: false }, wuxing: { fire: false, metal: false, water: false, wood: false, earth: false } };
        if (!s.array.wuxing) s.array.wuxing = { fire: false, metal: false, water: false, wood: false, earth: false };
        if (s.reincTalent === undefined) s.reincTalent = 1;
        if (s.reincPoints === undefined) s.reincPoints = 0;
        if (s.initPoints === undefined) s.initPoints = 0;
        if (!s.craft) s.craft = { liandan: { lv: 1, exp: 0 }, lianqi: { lv: 1, exp: 0 }, zhenfa: { lv: 1, exp: 0 } };
        ['liandan', 'lianqi', 'zhenfa'].forEach(function (k) { if (!s.craft[k]) s.craft[k] = { lv: 1, exp: 0 }; });
        if (!s.sectTrain) s.sectTrain = { shenByRealm: {}, lingByRealm: {} };
        // 兼容旧存档：确保 flags 存在；原老乞丐线仅置 beggar_kind/beggar_cold，
        // 新锻体主线（练气后期）需 beggar_met 才能触发解锁《锻体诀》。
        if (!s.flags) s.flags = {};
        if ((s.flags.beggar_kind || s.flags.beggar_cold) && !s.flags.beggar_met) s.flags.beggar_met = 1;
      }
      // 修复旧版遗留的“虚假存档”：早期版本的 confirmEnterPage 未调用 commitStart，
      // 导致自动存档里 linggen 为 null（且天赋/命格仅其一为空）。这类存档在“读档菜单”
      // 里显示为存在（有名字/功法），但 validSave 校验失败，点击读档会报“该存档已失效”。
      // 仅当存档已具备角色要素（有名字且至少带命格/天赋）但灵根缺失时，补抽灵根以恢复可读性。
      if (s && s.name && !s.linggen &&
          ((s.destinies && s.destinies.length) || (s.talents && s.talents.length))) {
        s.linggen = s.linggenRaw || rollLinggen();
      }
      return s;
    } catch (e) {}
    return null;
  }
  function saveState(s, slot) {
    if (s && typeof s === 'object') s.__saveVersion = SAVE_VERSION;  // 盖上当前存档版本戳
    try { localStorage.setItem(slotKey(slot), JSON.stringify(s)); } catch (e) {}
    if (slot != null) { try { localStorage.setItem(LS_SAVE, JSON.stringify(s)); } catch (e) {} }
  }
  function clearState() {
    try { localStorage.removeItem(LS_SAVE); } catch (e) {}
  }
  function slotExists(slot) {
    try { return !!localStorage.getItem(slotKey(slot)); } catch (e) { return false; }
  }
  function isLegacySave(s) {
    // 无版本戳（V40 等极老存档）或版本低于当前 → 视为需清理的旧版存档
    return !s || s.__saveVersion === undefined || s.__saveVersion < SAVE_VERSION;
  }
  function clearCloudVersionMarkers() {
    // 清掉云存档乐观锁的本地 version 标记，避免旧档清掉后残留 version 触发 409 / 锁冲突
    try {
      const toDel = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('dedao_save_version_') === 0) toDel.push(k);
      }
      toDel.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) {}
  }
  function clearAllSaves() {
    // 清掉全部本地存档位（自动存档 + 3 个槽位），以及云存档乐观锁的本地 version 标记。
    // 注意：保留 LS_META（轮回点 / 成就等账号级进度），仅清“一局游戏”的存档。
    try { localStorage.removeItem(LS_SAVE); } catch (e) {}
    LS_SLOTS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    clearCloudVersionMarkers();
  }
  function cleanupLegacySaves() {
    // 开机时调用：扫描所有存档位，凡是旧版（无版本戳 / 版本过低）一律删除。
    // 返回被清理的存档数量，供 UI 层提示。
    let n = 0;
    [LS_SAVE].concat(LS_SLOTS).forEach(function (k) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (isLegacySave(s)) { localStorage.removeItem(k); n++; }
      } catch (e) {}
    });
    if (n > 0) clearCloudVersionMarkers();  // 旧档已清，连带清云存档 version 标记
    return n;
  }
  /* 存档是否“真实且可读取”：灵根 + 名字 + 至少一项命格/天赋 + 境界与阶段一致 */
  function isUsableSave(S) {
    if (!S || !S.linggen || !S.name) return false;
    const hasFate = (S.talents && S.talents.length) || (S.destinies && S.destinies.length);
    if (!hasFate) return false;
    if (S.dead || S.endReason) return true;
    const st = STAGES[S.idx];
    if (!st || st.realm !== S.realm) return false;
    return true;
  }
  function slotInfo(slot) {
    const s = loadState(slot);
    if (!s || !isUsableSave(s)) return null;
    const st = safeStage(s);
    return {
      name: s.name,
      realm: st.realm + ' · ' + st.sub,
      year: s.year || 1,
      age: s.age || 16,
      dead: !!s.dead,
      endReason: s.endReason || null,
      sect: s.sect ? SECTS[s.sect].name : null,
      idx: s.idx
    };
  }

  /* ---------------- 功法装备体系 ---------------- */
  const GRADE_ORDER = ['黄', '玄', '地', '天', '仙'];
  function ensureTechEquip(s) {
    if (!s || !s.techs || !Array.isArray(s.techs)) return;
    if (!s.techEquip) {
      s.techEquip = { xinfa: null, shufa: [], dunshu: null };
      let bestX = null, bestM = 1;
      s.techs.forEach(function (t) {
        const x = TECHNIQUES[t];
        if (x && x.cls === 'xinfa' && x.mult > bestM) { bestM = x.mult; bestX = t; }
      });
      s.techEquip.xinfa = bestX;
      const shufa = s.techs.filter(function (t) {
        const x = TECHNIQUES[t];
        return x && x.cls === 'shufa';
      }).sort(function (a, b) {
        return GRADE_ORDER.indexOf(TECHNIQUES[b].grade) - GRADE_ORDER.indexOf(TECHNIQUES[a].grade);
      });
      s.techEquip.shufa = shufa.slice(0, Math.max(1, actionPoints(s)));
      let bestD = null, bestF = -1;
      s.techs.forEach(function (t) {
        const x = TECHNIQUES[t];
        if (!x || x.cls !== 'dunshu') return;
        const f = (x.flee || 0) + (x.guard || 0);
        if (f > bestF) { bestF = f; bestD = t; }
      });
      s.techEquip.dunshu = bestD;
    } else {
      s.techEquip.shufa = (s.techEquip.shufa || []).filter(function (t) { return s.techs.indexOf(t) >= 0; });
      if (s.techEquip.xinfa && s.techs.indexOf(s.techEquip.xinfa) < 0) s.techEquip.xinfa = null;
      if (s.techEquip.dunshu && s.techs.indexOf(s.techEquip.dunshu) < 0) s.techEquip.dunshu = null;
      if (!s.techEquip.xinfa) {
        let bestX = null, bestM = 1;
        s.techs.forEach(function (t) {
          const x = TECHNIQUES[t];
          if (x && x.cls === 'xinfa' && x.mult > bestM) { bestM = x.mult; bestX = t; }
        });
        s.techEquip.xinfa = bestX;
      }
    }
  }
  function techMult(s) {
    // 命格【万剑归宗】techTypeBonus{xinfa:0.25}：心法效果 +25%（无心法时不生效，避免白送）
    const bonus = 1 + getTechTypeBonus(s, 'xinfa');
    const x = s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa];
    if (x && x.mult) return x.mult * bonus;
    if (!s.techs.length) return 1;
    let m = 1;
    s.techs.forEach(function (t) {
      const y = TECHNIQUES[t];
      if (y && y.mult > m) m = y.mult;
    });
    return m > 1 ? m * bonus : m;
  }
  function equippedShufa(s) {
    ensureTechEquip(s);
    const list = (s.techEquip.shufa || []).map(function (id) { return TECHNIQUES[id]; }).filter(Boolean);
    list.sort(function (a, b) {
      return GRADE_ORDER.indexOf(b.grade) - GRADE_ORDER.indexOf(a.grade);
    });
    return list;
  }
  function getBestShufa(s) {
    return equippedShufa(s)[0] || null;
  }
  function getDunshu(s) {
    ensureTechEquip(s);
    const t = s.techEquip && s.techEquip.dunshu && TECHNIQUES[s.techEquip.dunshu];
    if (t) return { flee: t.flee || 0, guard: t.guard || 0 };
    return { flee: 0, guard: 0 };
  }
  function setXinfa(s, id) {
    if (id !== null && (s.techs.indexOf(id) < 0 || TECHNIQUES[id].cls !== 'xinfa')) return false;
    s.techEquip.xinfa = id;
    refreshStats(s); saveState(s);
    return true;
  }
  function setDunshu(s, id) {
    if (id !== null && (s.techs.indexOf(id) < 0 || TECHNIQUES[id].cls !== 'dunshu')) return false;
    s.techEquip.dunshu = id;
    saveState(s);
    return true;
  }
  function toggleShufa(s, id) {
    if (s.techs.indexOf(id) < 0 || TECHNIQUES[id].cls !== 'shufa') return false;
    const eq = s.techEquip.shufa || [];
    const i = eq.indexOf(id);
    if (i >= 0) {
      eq.splice(i, 1);
      saveState(s);
      return true;
    }
    if (eq.length >= actionPoints(s)) return false;
    eq.push(id);
    saveState(s);
    return true;
  }

  // 装备实例：穿戴/掉落存 { id: 模板id, aff: [{key,val}] }；旧档字符串 id 兼容升格为无词条实例。
  function equipInst(idOrObj) {
    if (!idOrObj) return null;
    if (typeof idOrObj === 'string') return { id: idOrObj, aff: [] };
    if (typeof idOrObj === 'object' && idOrObj.id) return { id: idOrObj.id, aff: Array.isArray(idOrObj.aff) ? idOrObj.aff : [] };
    return null;
  }
  // 读取某槽已穿装备实例的模板 + 词条
  function equipTemplate(inst) {
    const e = equipInst(inst);
    if (!e) return null;
    const it = findEquip(e.id);
    return it ? { template: it, aff: e.aff } : null;
  }
  // 生成随机词条：按模板 tier 决定词条数，从槽位词条池滚动，取值区间随机
  function rollAffixes(slot, tier) {
    const poolKeys = AFFIX_BY_SLOT[slot] || [];
    if (!poolKeys.length) return [];
    // 词条数量：tier1~2 → 1 条；tier3~4 → 2 条；tier5 → 3 条
    const count = tier >= 5 ? 3 : (tier >= 3 ? 2 : 1);
    const picked = [];
    const bag = poolKeys.slice();
    for (let i = 0; i < count && bag.length; i++) {
      const k = bag.splice(Math.floor(Math.random() * bag.length), 1)[0];
      const def = AFFIX_POOLS[k];
      const val = def.min + Math.random() * (def.max - def.min);
      const rounded = def.step >= 1 ? Math.round(val) : Math.round(val * 100) / 100;
      picked.push({ key: def.key, val: rounded });
    }
    return picked;
  }
  function equipStats(s) {
    const st = { hpMax: 0, atk: 0, def: 0, critPct: 0, atkSpd: 0, recover: 0, mpPct: 0, hpPct: 0, wu: 0, ti: 0, cult: 0 };
    ['weapon', 'head', 'body', 'accessory'].forEach(function (slot) {
      const inst = s.equip && s.equip[slot];
      const et = equipTemplate(inst);
      if (!et) return;
      const it = et.template;
      // 主属性（固定值）
      if (it.main) {
        st.atk += it.main.atk || 0;
        st.atk += it.main.atk2 || 0;      // 锤的「额外攻击」主词条（atk2 视作额外攻击）
        st.def += it.main.def || 0;
        st.critPct += it.main.critPct || 0;
        st.atkSpd += it.main.atkSpd || 0;
        st.recover += it.main.recover || 0;
        st.mpPct += it.main.mpPct || 0;
        st.hpPct += it.main.hpPct || 0;
      }
      // 旧式平铺属性（向后兼容）
      st.hpMax += it.hpMax || 0;
      st.atk += it.atk || 0;
      st.wu += it.wu || 0;
      st.ti += it.ti || 0;
      st.cult += it.cult || 0;
      // 附加词条
      et.aff.forEach(function (a) {
        if (a.key === 'atk') st.atk += a.val;
        else if (a.key === 'def') st.def += a.val;
        else if (a.key === 'critPct') st.critPct += a.val;
        else if (a.key === 'atkSpd') st.atkSpd += a.val;
        else if (a.key === 'recover') st.recover += a.val;
        else if (a.key === 'mpPct') st.mpPct += a.val;
        else if (a.key === 'hpPct') st.hpPct += a.val;
      });
    });
    if (Array.isArray(s.equip.treasure)) {
      s.equip.treasure.forEach(function (id) {
        const it = EQUIPS.treasure && EQUIPS.treasure[id];
        if (!it) return;
        st.hpMax += it.hpMax || 0;
        st.atk += it.atk || 0;
        st.wu += it.wu || 0;
        st.ti += it.ti || 0;
        st.cult += it.cult || 0;
      });
    }
    return st;
  }
  // 法宝聚合：遍历「已装备」的法宝（s.equip.treasure，统一为装备型），累计其 effect。
  // 仅装备槽内的法宝生效；库存（s.arts）中的法宝不生效。
  // 含 scale 资源缩放 / stack 累计 / 血量条件 / 道心向 等子机制。
  // 选项门槛（道心≥10 等）由 UI 的 c.req 在前端拦截，此处只负责数值生效。
  function artifactStats(s) {
    const arts = (s.equip && s.equip.treasure) || [];
    const st = {
      wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0,
      atk: 0, hpMax: 0, def: 0, critPct: 0, dodgePct: 0, defPct: 0, atkPct: 0, atkSpd: 0,
      cult: 0, stealPct: 0, defToAtk: 0, tiHpBonus: 0,
      duantiEff: 0, duantiShenEff: 0, duantiMax: 0, craftEff: 0,
      farmEff: 0, mineEff: 0, stoneYearPct: 0,
      doubleCult: 0, doubleDmg: 0,
      cultTwice: false,
      modeBonus: { normal: 0, focus: 0, seclusion: 0 },
      craftKind: {}
    };
    arts.forEach(function (id) {
      const a = ARTIFACTS[id];
      if (!a || !a.effect) return;
      const e = a.effect;
      ['wu', 'ti', 'dun', 'shen', 'dao', 'ling', 'atk', 'hpMax', 'def', 'critPct', 'dodgePct', 'defPct', 'atkPct', 'cult', 'stealPct', 'defToAtk', 'tiHpBonus', 'duantiEff', 'duantiShenEff', 'duantiMax', 'craftEff', 'farmEff', 'mineEff', 'stoneYearPct', 'atkSpd', 'doubleCult', 'doubleDmg'].forEach(function (k) {
        if (e[k]) st[k] += e[k];
      });
      if (e.modeBonus) {
        st.modeBonus.normal += e.modeBonus.normal || 0;
        st.modeBonus.focus += e.modeBonus.focus || 0;
        st.modeBonus.seclusion += e.modeBonus.seclusion || 0;
      }
      if (e.craftKind) {
        for (const k in e.craftKind) st.craftKind[k] = (st.craftKind[k] || 0) + e.craftKind[k];
      }
      if (e.cultTwice) st.cultTwice = true;
      // 资源缩放：每 per 资源 +perPoint，封顶 cap
      if (e.scale) {
        const sv = (e.scale.res === 'stone') ? (s.stone || 0) : 0;
        const per = e.scale.per || 100;
        const pp = e.scale.perPoint || 0.01;
        const cap = (e.scale.cap == null) ? 1 : e.scale.cap;
        const n = Math.min(Math.floor(sv / per) * pp, cap);
        if (e.scale.stat === 'atk') st.atkPct += n;
        else if (e.scale.stat === 'defPct') st.defPct += n;
      }
      // 累计类（如 嗜血珠：每杀 1 敌 +per，封顶 cap）
      if (a.stack && a.stack.stat) {
        st[a.stack.stat] += Math.min((s.killCount || 0) * (a.stack.per || 1), a.stack.cap || 0);
      }
      // 血量条件：血越低攻越高（按 当前/最大 比例）
      if (e.lowHpAtk) {
        const ratio = 1 - (s.hp || 0) / (s.hpMax || 1);
        st.atkPct += Math.min(ratio * e.lowHpAtk, e.lowCap || 0.40);
      }
      // 道心向攻击：每 1 点道心 +daoAtkPct，封顶 daoCap
      if (e.daoAtkPct) {
        st.atkPct += Math.min((s.dao || 0) * e.daoAtkPct, e.daoCap || 0.30);
      }
      // 注：棘鳞甲「防御值×N 转攻击」不在此处结算——它需要「统一口径防御」，
      // 而统一口径依赖本轮 artifactStats 产出的 artDef/artAttr，
      // 故移至 calcAtk（refreshStats 中 artAttr/artDef 就绪之后）结算，避免读到上一轮旧值。
    });
    return st;
  }
  // 灵根战斗词条（兼容旧档 body 结构）
  function linggenTrait(s) {
    if (!s.linggen) return null;
    if (s.linggen.trait) return s.linggen.trait.effect || null;
    if (s.linggen.body) return s.linggen.body; // 旧档兼容
    return null;
  }
  // 功法/法术亲和加成：法术 element 属于灵根亲和系别时，伤害 ×(1+affinityBonus/100)
  function linggenAffinityMul(s, element) {
    if (!s.linggen || !element || !s.linggen.affinity) return 1;
    if (s.linggen.affinity.indexOf(element) >= 0) return 1 + (s.linggen.affinityBonus || 0) / 100;
    return 1;
  }
  function calcHpMax(s) {
    // 体魄系数：基础 50 ×（法宝 tiHpBonus）×（旧命格 tiMul「体魄对气血影响翻倍」）
    const tiCoeff = 50 * (1 + (artifactStats(s).tiHpBonus || 0)) * (talentApply(s, 'tiMul') || 1);
    let m = 80 + effAttr(s, 'ti') * tiCoeff + bigIdxOf(s) * 80;
    const eff = linggenTrait(s);
    if (eff && eff.hpMax) m += eff.hpMax;
    if (s.sect && sectPassed(s) && SECTS[s.sect].effect.hpMax) m += SECTS[s.sect].effect.hpMax;
    m += s.hpMaxBonus || 0;
    m += equipStats(s).hpMax;
    m += artifactStats(s).hpMax;
    m += getXinfaHpMax(s);   // 当前装备心法的固定气血（玄天门系：护山心经/天罡心法/玄武真经）
    // 装备「血量上限 %」词条
    m = Math.round(m * (1 + (equipStats(s).hpPct || 0) / 100));
    // 五行阵·木阵（气血上限 %）
    m = applyWuxing(s, 'hpMax', m);
    // 体魄=1点×50气血（命格体魄加成已并入 effAttr）
    // ⚠ 下限 1：负体魄（仙命【九天玄体】ti-1）会让 effAttr(ti) 变小甚至为负；
    //   本公式无天然地板，极端叠加能算出 hpMax ≤ 0 → 战斗一进场即死、存档不可玩。
    //   当前最坏情况为 effAttr(ti)=0 → hpMax=80，故本次兜底不改动任何现状数值。
    return Math.max(1, m);
  }
  function calcAtk(s) {
    let a = 10 + bigIdxOf(s) * 15;
    a += effAttr(s, 'shen') * 5; // 神识挂钩攻击：1点+5攻击
    a += effAttr(s, 'ling') * 5; // 灵力挂钩攻击：1点+5攻击（灵力同时关系灵力条上限）
    if (s.talents.indexOf('kejian') >= 0) a *= 1.2;
    const eff = linggenTrait(s);
    if (eff && eff.atk) a += eff.atk;
    if (s.sect && sectPassed(s) && SECTS[s.sect].effect.atkMul) a *= (1 + SECTS[s.sect].effect.atkMul);
    // 心法攻击加成（青云剑宗 / 丹霞谷宗门心法：青云剑诀 +5% … 太虚剑典 +20%）
    a *= (1 + getXinfaAtkMul(s));
    // 命格攻击加成
    var talentAtkMul = 0;
    s.talents.forEach(function (tid) {
      var t = TALENTS.filter(function (x) { return x.id === tid; })[0];
      if (t && t.apply && t.apply.atkMul) talentAtkMul += t.apply.atkMul;
    });
    if (talentAtkMul > 0) a *= (1 + talentAtkMul);
    // 命格战斗攻击加成
    a *= getDestinyAttrMult(s, 'atk');
    // 仙品全属性加成
    s.talents.forEach(function (tid) {
      var t = TALENTS.filter(function (x) { return x.id === tid; })[0];
      if (t && t.apply && t.apply.allMul) a *= (1 + t.apply.allMul);
    });
    a += s.extraAtk || 0;
    a += equipStats(s).atk;
    const art = artifactStats(s);
    a += art.atk;
    // 棘鳞甲：护体反射——「防御值」×N 转攻击。防御取统一口径 getDefense()
    // （此处在 refreshStats 中 artAttr/artDef 已就绪之后调用，取到的是本轮最新值）。
    if (art.defToAtk) a += Math.round(getDefense(s) * art.defToAtk);
    a = Math.round(a * (1 + art.atkPct));
    // 五行阵
    a = applyWuxing(s, 'atk', a);
    return Math.round(a);
  }
  // 五行阵：对攻击/灵力上限/气血上限/防御 施加百分比加成（随阵法 lv 缩放）
  function applyWuxing(s, attr, base) {
    if (!s.array || !s.array.wuxing) return base;
    const lv = (s.craft && s.craft.zhenfa && s.craft.zhenfa.lv) || 1;
    let mul = 1;
    WUXING_ORDER.forEach(function (key) {
      if (!s.array.wuxing[key]) return;
      const def = WUXING_ARRAY[key];
      if (def.attr !== attr) return;
      mul += def.pctByLv[Math.min(lv, 5)];
    });
    return base * mul;
  }
  function cultGain(s) {
    const CULT_REALM = [0, 1, 5, 6]; // 炼气=0, 筑基=1, 金丹=5, 元婴=6
    let g = (60 + s.wu * 10) * (1 + 0.3 * CULT_REALM[bigIdxOf(s)]);
    if (s.wu >= 10) g *= 1.1;
    g *= techMult(s);
    if (s.linggen) g *= (s.linggen.qiMul || 1);
    if (s.talents.indexOf('daoti') >= 0) g *= 1.1;
    if (s.array && s.array.juling && s.array.juling.level > 0) {
      const jl = JULING_ARRAY[s.array.juling.level];
      if (jl) g *= (1 + jl.pct);
    }
    if (s.flags.daoLu) g *= 1.1;
    if (s.flags.petGrown) g *= 1.15;
    else if (s.flags.pet) g *= 1.05;
    g *= 1 + ((s.reinc && s.reinc.cult) || 0) * 0.10;
    g *= 1 + ((s.reinc && s.reinc.shesheng) || 0) * 0.10;
    // 命格修炼加成
    var talentCultMul = 0;
    s.talents.forEach(function (tid) {
      var t = TALENTS.filter(function (x) { return x.id === tid; })[0];
      if (t && t.apply && t.apply.cultMul) talentCultMul += t.apply.cultMul;
    });
    if (talentCultMul > 0) g *= (1 + talentCultMul);
    // 仙品全属性加成
    s.talents.forEach(function (tid) {
      var t = TALENTS.filter(function (x) { return x.id === tid; })[0];
      if (t && t.apply && t.apply.allMul) g *= (1 + t.apply.allMul);
    });

    g *= 1 + equipStats(s).cult;
    if (s.sect && sectPassed(s) && SECTS[s.sect].effect.cultMul) g *= (1 + SECTS[s.sect].effect.cultMul);
    g *= 1 + artifactStats(s).cult;
    let note = '';
    if ((s.elixirs.juling || 0) > 0) {
      s.elixirs.juling--;
      if (s.elixirs.juling <= 0) delete s.elixirs.juling;
      g *= 1.2;
      note = '【聚气丹】';
    }
    return { gain: Math.round(g), note: note };
  }
  function actionPoints(s) {
    let n = 3;
    if (s.idx >= 3) n++;
    if (s.idx >= 6) n++;
    if (s.idx >= 9) n++;
    return n + (artifactStats(s).apBonus || 0);
  }
  function cultCost(s) { return s.idx >= 6 ? 2 : 1; }

  function useElixir(s, id) {
    const e = ELIXIRS[id];
    if (!e || (s.elixirs[id] || 0) <= 0) return false;
    s.elixirs[id]--;
    if (s.elixirs[id] <= 0) delete s.elixirs[id];
    if (id === 'zengshou') s.lifeMax += 50;
    else if (id === 'wudao') { s.wu++; s.wuAcc = 0; }
    refreshStats(s);
    return true;
  }

  /* ---------------- 属性基础 ---------------- */
  function calcMpMax(s) {
    // 灵力条上限（统一口径）：灵力=1 时 20，此后每点 +20 → mpMax = 20 + (灵-1)×20
    let m = 20 + Math.max(0, effAttr(s, 'ling') - 1) * 20;
    const eff = linggenTrait(s);
    if (eff && eff.mpMax) m += eff.mpMax;
    m = Math.round(m * (1 + (equipStats(s).mpPct || 0) / 100));
    m = applyWuxing(s, 'mpMax', m);
    return Math.round(m);
  }
  // 灵根词条 + 五行阵 → 战斗次级属性（暴击/闪避/渡劫/防御）
  function recalcLinggenBonus(s) {
    const eff = linggenTrait(s);
    let critPct = (eff && eff.critPct) ? eff.critPct / 100 : 0;
    let dodgePct = (eff && eff.dodgePct) ? eff.dodgePct / 100 : 0;
    let tribPct = (eff && eff.tribPct) ? eff.tribPct / 100 : 0;
    let flatDef = (eff && eff.def) ? eff.def : 0;
    let earthPct = 0;
    if (s.array && s.array.wuxing) {
      const lv = (s.craft && s.craft.zhenfa && s.craft.zhenfa.lv) || 1;
      WUXING_ORDER.forEach(function (key) {
        if (!s.array.wuxing[key]) return;
        const def = WUXING_ARRAY[key];
        if (def.attr === 'critPct') critPct += def.pctByLv[Math.min(lv, 5)];
        if (def.attr === 'dodgePct') dodgePct += def.pctByLv[Math.min(lv, 5)];
        if (def.attr === 'tribPct') tribPct += def.pctByLv[Math.min(lv, 5)];
        if (def.attr === 'def') earthPct += def.pctByLv[Math.min(lv, 5)];
      });
    }
    s.critPct = critPct;
    s.dodgePct = dodgePct;
    s.tribPct = tribPct;
    s.flatDef = flatDef;      // 灵根土词条：绝对防御点
    s.earthPct = earthPct;   // 五行阵·土阵：百分比减伤
  }
  function refreshStats(s) {
    recalcLinggenBonus(s);
    const a = artifactStats(s);
    s.artAttr = { wu: a.wu, ti: a.ti, dun: a.dun, shen: a.shen, dao: a.dao, ling: a.ling };
    s.artDef = a.def;
    s.artDefPct = a.defPct;
    s.equipDef = equipStats(s).def;   // 装备「防御」词条（已被 getDefense() 纳入统一口径；此处保留仅供兼容/诊断）
    s.cultMax = a.cultTwice ? 2 : 1;   // 时停月华：每年可修炼 2 次
    const m = calcHpMax(s);
    s.hpMax = m;
    s.atk = calcAtk(s);
    if (s.hp > m) s.hp = m;
    s.mpMax = calcMpMax(s);
    if (s.mp === undefined || s.mp > s.mpMax) s.mp = s.mpMax;
    // 金缕衣：每持有100灵石，防御+1%，上限300%（减伤 1/(1+def)）
    if (s.equip && Array.isArray(s.equip.treasure) && s.equip.treasure.indexOf('jinylv') >= 0) {
      s.jinylvDef = Math.min(3.0, Math.floor((s.stone || 0) / 100) * 0.01);
    } else {
      s.jinylvDef = 0;
    }
  }

  /* ---------------- 开局 ---------------- */
  function rollLinggen() {
    let total = 0;
    LINGGEN_POOL.forEach(function (l) { total += l.w; });
    let r = Math.random() * total;
    for (let i = 0; i < LINGGEN_POOL.length; i++) {
      r -= LINGGEN_POOL[i].w;
      if (r <= 0) return LINGGEN_POOL[i];
    }
    return LINGGEN_POOL[0];
  }
  function rollTalents(n) {
    const pool = TALENTS.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function rollMingge(n, jie) {
    var weights = JIE_TIER_WEIGHTS[jie] || JIE_TIER_WEIGHTS[0];
    var pools = {};
    TIER_KEYS.forEach(function (tk, i) {
      pools[tk] = TALENTS.filter(function (t) { return t.tier === tk; });
    });
    var out = [];
    var used = {};
    var attempts = 0;
    while (out.length < n && attempts < 200) {
      attempts++;
      var total = 0;
      weights.forEach(function (w) { total += w; });
      var r = Math.random() * total;
      var tierIdx = 0;
      for (var i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) { tierIdx = i; break; }
      }
      var tierKey = TIER_KEYS[tierIdx];
      var tierPool = pools[tierKey];
      if (!tierPool || !tierPool.length) continue;
      var t = tierPool[Math.floor(Math.random() * tierPool.length)];
      if (used[t.id]) continue;
      used[t.id] = true;
      out.push(t);
    }
    // 记录「曾拥有命格」到 meta.destinySeen（跨世持久，供成就统计）
    try {
      var dm = loadMeta();
      if (!dm.destinySeen) dm.destinySeen = {};
      out.forEach(function (t) { if (t && t.id) dm.destinySeen[t.id] = 1; });
      saveMeta(dm);
    } catch (e) { /* 忽略存档异常 */ }
    return out;
  }

  /* ---------------- 命格系统 ---------------- */
  /* 命格战斗加成汇总。
     ⚠️ 原先限定 dest.type === 'combat'，导致挂在「属性命格」上的 tribBonus（天命之子/天道宠儿，type:'attr'）
     永远读不到 = 死配置。属性类命格的 effect 只承载 stonePerYear / wuPerYear / tiPerYear / tribBonus，
     这些均不走战斗通道（年度类字段由 endYear / applyDestinyYearly 直接读），故去掉 type 限制不会串味。 */
  function getDestinyBonus(s, type) {
    let bonus = 0;
    (s.destinies || []).forEach(function(d) {
      const dest = DESTINIES[d];
      if (dest && dest.effect && dest.effect[type] !== undefined && typeof dest.effect[type] === 'number') {
        bonus += dest.effect[type];
      }
    });
    return bonus;
  }

  function getDestinyAttrBonus(s, attr) {
    let bonus = 0;
    (s.destinies || []).forEach(function(d) {
      const dest = DESTINIES[d];
      if (dest && dest.attr && dest.attr[attr] !== undefined) {
        bonus += dest.attr[attr];
      }
    });
    return bonus;
  }

  function getDestinyAttrMult(s, attr) {
    let mult = 1;
    (s.destinies || []).forEach(function(d) {
      const dest = DESTINIES[d];
      if (dest && dest.type === 'combat' && dest.effect && dest.effect[attr + 'Mul']) {
        mult *= (1 + dest.effect[attr + 'Mul']);
      }
    });
    return mult;
  }
  /* 旧命格（TALENTS）apply 汇总：key 在所有已选命格上的累加（缺失记 0）。
     ⚠️ 此前 tiMul/shenMul/dunMul/doubleHit/execute/critDmgBoost/growDun/trib 八项只写在 data 里、
     引擎从不读，导致玩家开局 3 选 1 抽到「金刚不坏/天眼通/风驰电掣/剑封喉/致命一击/御风化影/天命之子」时毫无效果。 */
  function talentApply(s, key) {
    let v = 0;
    (s.talents || []).forEach(function (id) {
      const t = TALENTS.filter(function (x) { return x.id === id; })[0];
      if (t && t.apply && t.apply[key]) v += t.apply[key];
    });
    return v;
  }
  /* 命格「功法类型加成」（万剑归宗 techTypeBonus{xinfa:0.25}）——值为对象，不能用 getDestinyBonus（会做对象加法） */
  function getTechTypeBonus(s, cls) {
    let v = 0;
    (s.destinies || []).forEach(function (d) {
      const dest = DESTINIES[d];
      const b = dest && dest.effect && dest.effect.techTypeBonus;
      if (b && b[cls]) v += b[cls];
    });
    return v;
  }
  /* 当前「装备心法」本体（所有心法附加效果都只认已装备的那一本，与 techMult 同源） */
  function xinfaCur(s) {
    ensureTechEquip(s);
    return (s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa]) || null;
  }
  /* 心法攻击加成（青云剑宗/丹霞谷宗门心法 atkMul：青云剑诀 +5% … 太虚剑典 +20%）
     ⚠️ 此前只写在 data 里、引擎从不读；而 DEDAO_秘境功法法术池映射.md 明文宣传了这些效果。 */
  function getXinfaAtkMul(s) { const t = xinfaCur(s); return (t && t.atkMul) || 0; }
  /* 心法法术伤害加成（太虚剑典 spellMul 0.10 / 剑魂心经 0.05） */
  function getXinfaSpellMul(s) { const t = xinfaCur(s); return (t && t.spellMul) || 0; }
  /* 心法常驻减伤（玄天门系 guard：玄天心法 5% … 玄武真经 20%），与护盾 buff 同通道累加 */
  function getXinfaGuard(s) { const t = xinfaCur(s); return (t && t.guard) || 0; }
  /* 心法固定气血（玄天门系 hpMax：护山心经 +50 / 天罡心法 +100 / 玄武真经 +150） */
  function getXinfaHpMax(s) { const t = xinfaCur(s); return (t && t.hpMax) || 0; }
  /* 心法减伤（玄武真经 reduceDmg 0.05）：当前装备心法提供的百分比减伤 */
  function getXinfaReduceDmg(s) { const t = xinfaCur(s); return (t && t.reduceDmg) || 0; }
  /* 心法缩短炼制时间（丹道真解/九转丹典 craftTimeReduce，单位：年） */
  function getXinfaCraftReduce(s, kind) {
    const t = xinfaCur(s);
    if (!t || !t.craftTimeReduce) return 0;
    if (kind === '丹' && t.sect === 'dpxia') return t.craftTimeReduce;
    return 0;
  }

  /* 有效六维 = 基础值 + 命格属性加成 + 法宝六维加成 */
  function effAttr(s, k) { return (s[k] || 0) + getDestinyAttrBonus(s, k) + ((s.artAttr && s.artAttr[k]) || 0); }
  /* 暴击率：神识×1%（×天眼通 shenMul）×命格 + 道心×2% + 装备 + 法宝 */
  function getCritRate(s) { return effAttr(s, 'shen') * 0.01 * (talentApply(s, 'shenMul') || 1) + effAttr(s, 'dao') * 0.02 + getDestinyBonus(s, 'critRate') + (s.critPct || 0) + artifactStats(s).critPct + (equipStats(s).critPct || 0) / 100; }
  /* 闪避率：遁速×2%（×风驰电掣 dunMul）+ 命格闪避 + 法宝 */
  function getDodgeRate(s) { return effAttr(s, 'dun') * 0.02 * (talentApply(s, 'dunMul') || 1) + getDestinyBonus(s, 'dodgeRate') + (s.dodgePct || 0) + artifactStats(s).dodgePct; }
  /* 攻速（几率额外攻击一次）：遁速×1%（×dunMul）+ 命格额外攻击 + 装备攻速 + 疾风连击 doubleHit */
  function getExtraAtkChance(s) { return effAttr(s, 'dun') * 0.01 * (talentApply(s, 'dunMul') || 1) + getDestinyBonus(s, 'extraAttack') + (equipStats(s).atkSpd || 0) / 100 + (artifactStats(s).atkSpd || 0) / 100 + talentApply(s, 'doubleHit'); }
  /* 回复（吸血）：体魄×1% + 命格 recoverPct（回复）+ 命格 lifesteal（吸血）+ 装备回复词条
     ⚠ 下限 0：仙命【九天玄体】起首次引入**负体魄**（ti-1）。开局六维恒为 1，故当下 effAttr(ti)≥0、
       结果非负；但一旦再出现第二个「减体魄」来源（剧情/新命格），负值会让吸血变成**自残**
       （战斗中 `Math.round(dmg * recover)` 为负即扣自己血）。此处兜底，当前数值不发生任何变化。 */
  function getRecoverPct(s) { return Math.max(0, effAttr(s, 'ti') * 0.01 + getDestinyBonus(s, 'recoverPct') + getDestinyBonus(s, 'lifesteal') + (equipStats(s).recover || 0) / 100); }
  /* 反击率：遁速（有效值）×1% + 命格反击率。与 getDodgeRate/getExtraAtkChance 同族，一律取 effAttr（漏用基础值会让命格/法宝加成失效） */
  function getCounterRate(s) { return effAttr(s, 'dun') * 0.01 + getDestinyBonus(s, 'counterRate'); }
  /* ---------------- 防御：唯一权威口径（面板显示 = 战斗实际减伤） ----------------
     绝对防御 getDefense(s) = 体魄有效值×0.5×命格防御倍率
                            + 装备防御（equipStats().def）
                            + 灵根土词条绝对防御（s.flatDef）
                            + 法宝防御（s.artDef）
     体魄取「有效值」（基础 + 命格 + 法宝），与 getCritRate / getDodgeRate / getRecoverPct 口径一致。
     减免流程（enemyAtkRoll）：百分比减伤 getDefensePct → 绝对减伤 getDefense → 除算减伤 getDefenseDiv。
     面板（顶栏/属性弹窗/角色属性页）与战斗均调用本组函数，任何一处改动即全局生效。 */
  function getDefense(s) {
    const tiEff = effAttr(s, 'ti');
    const base = Math.round(Math.round(tiEff * 0.5) * getDestinyAttrMult(s, 'def'));
    return base + (equipStats(s).def || 0) + (s.flatDef || 0) + (s.artDef || 0);
  }
  /* 防御·百分比减伤：五行阵·土阵(earthPct) + 法宝(defPct)，合计封顶 90% 防溢出 */
  function getDefensePct(s) { return Math.min(0.9, (s.earthPct || 0) + (s.artDefPct || 0)); }
  /* 防御·除算减伤：金缕衣（每 100 灵石 +1%，上限 300%）→ 受伤 ÷(1+x) */
  function getDefenseDiv(s) { return s.jinylvDef || 0; }

  function applyDestinyYearly(s) {
    (s.destinies || []).forEach(function(d) {
      const dest = DESTINIES[d];
      if (!dest || !dest.effect) return;
      // *_PerYearCap：只在前 N 年逐年生效（仙命【道心渐明】/【肉身成圣】= 前 6 年每年 +1）
      const y = s.year || 0;
      const inCap = function (cap) { return !cap || y <= cap; };
      if (dest.effect.wuPerYear && inCap(dest.effect.wuPerYearCap)) s.wu = (s.wu || 0) + dest.effect.wuPerYear;
      if (dest.effect.tiPerYear && inCap(dest.effect.tiPerYearCap)) s.ti = (s.ti || 0) + dest.effect.tiPerYear;
    });
  }

  function applyReinc(s, meta) {
    s.reinc.cult = meta.reinc.cult || 0;
    s.reinc.alchemyTimeReduce = meta.reinc.alchemy || 0;
    s.reinc.forgeTimeReduce = meta.reinc.forge || 0;
    s.reinc.shesheng = meta.reinc.shesheng || 0;
    s.reinc.herbGrowReduce = meta.reinc.lvling_bottle || 0;
    s.reinc.extraField = meta.reinc.extra_field || 0;
    s.reinc.destinySlot = meta.reinc.destiny_slot || 0;
    // s.reinc.extraDestiny（大千命格）已随天赋删除；loadMeta 会把旧档字段清掉
    s.reinc.treasureSlot = meta.reinc.xianling || 0;     // 先天灵宝：每级 +1 法宝槽，最高 3 级
    const list = REINCARNATION;
    list.forEach(function (r) {
      const n = meta.reinc[r.id] || 0;
      if (!n) return;
      for (let i = 0; i < n; i++) {
        if (r.id === 'wu') s.wu++;
        else if (r.id === 'ti') s.ti++;
        else if (r.id === 'dun') s.dun = (s.dun || 0) + 1;
        else if (r.id === 'shen') s.shen = (s.shen || 0) + 1;
        else if (r.id === 'dao') s.dao = (s.dao || 0) + 1;
        else if (r.id === 'ling') s.ling = (s.ling || 0) + 1;
        else if (r.id === 'stone') s.stone += 100;
        else if (r.id === 'juling0') s.elixirs.juling = (s.elixirs.juling || 0) + 3;
        else if (r.id === 'life20') s.lifeMax += 20;
      }
    });
    // 初始化命格系统
    if (!s.destinies) s.destinies = [];
    if (s.destinySlots === undefined || s.destinySlots === null) s.destinySlots = 1;
    s.destinySlots += (s.reinc.destinySlot || 0);
    // s.extraDestiny 已随「大千命格」天赋一并删除；旧档残留字段不再参与结算
    // 初始化灵田（基础1块 + 随身灵田天赋）
    var fieldCount = 1 + (s.reinc.extraField || 0);
    while (s.field.length < fieldCount) {
      s.field.push(null);
    }
  }
  function startLife(name) {
    const meta = loadMeta();
    const s = {
      name: name, bgIdx: 0, age: 16,
      linggen: null, talents: [],
      realm: '炼气', idx: 0, qi: 0,
      hp: 100, hpMax: 100, atk: 10, hpMaxBonus: 0,
      dunSpeed: 1,
      wu: 1, wuAcc: 0,
      ti: 1,
      dun: 1, shen: 1, dao: 1,       ling: 1,
      mp: 1, mpMax: 10,
      destinies: [], destinySlots: 1,
      stone: 50, herb: 3, iron: 0,
      elixirs: {}, techs: ['tunai'], arts: [], extraAtk: 0,
      techEquip: { xinfa: 'tunai', shufa: [], dunshu: null },
      sect: null, broken: 0, tribPassed: 0, actionsLeft: 3,
      gongye: 0, gongyeEarned: 0, sectRank: null,
      craft: { liandan: { lv: 1, exp: 0 }, lianqi: { lv: 1, exp: 0 }, zhenfa: { lv: 1, exp: 0 } },
      array: { juling: { level: 0, paid: false }, wuxing: { fire: false, metal: false, water: false, wood: false, earth: false } },
      reincTalent: (meta.reincTalent || 1), reincPoints: 0, initPoints: 0,
      sectTrain: { shenByRealm: {}, lingByRealm: {} },
      dabi: null,
      year: 1, flags: {}, seen: {}, log: [], lifeLog: [], dead: false,
      endReason: null, lifeMax: 70, reinc: {},
      equip: { head: null, body: null, leg: null, treasure: [] },
      trib: null, field: [], mine: { depth: 0 },
      inventory: [], battle: null, adv: null,
      jie: meta.nextJie || 0
    };
    meta.lives++;
    const egg = (s.name && s.name.trim()) ? EASTER_EGGS[s.name.trim()] : null;
    const talentRolled = rollMingge(egg && egg.effect.linggen ? 4 : 5, s.jie);
    s.talentRoll = talentRolled;
    s.easterEgg = egg || null;
    s.linggenRaw = egg && egg.effect.linggen ? LINGGEN_POOL.filter(function (l) { return l.id === egg.effect.linggen; })[0] : null;
    const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    s.bgIdx = BACKGROUNDS.indexOf(bg);
    s.bg = bg;
    return s;
  }
  function commitStart(s, talentId) {
    const meta = loadMeta();
    const egg = s.easterEgg;
    s.linggen = s.linggenRaw || rollLinggen();
    // 新进入流程（confirmEnterPage/命格选择）可能不传单一天赋，
    // 兜底为空数组，并把彩蛋天赋 fuyuan 合并进来
    s.talents = (talentId ? [talentId] : []).concat(egg ? ['fuyuan'] : []);
    if (egg) {
      if (egg.effect.wu) s.wu += egg.effect.wu;
      if (egg.effect.ti) s.ti += egg.effect.ti;
      if (egg.effect.atk) s.extraAtk += egg.effect.atk;
      if (egg.effect.life) s.lifeMax += egg.effect.life;
    }
    if (talentId) {
      const t = TALENTS.filter(function (x) { return x.id === talentId; })[0];
      if (t && t.apply) {
        if (t.apply.wu) s.wu += t.apply.wu;
        if (t.apply.ti) s.ti += t.apply.ti;
        if (t.apply.life) s.lifeMax += t.apply.life;
        if (t.apply.stone) s.stone += t.apply.stone;
        if (t.apply.atk) s.extraAtk += t.apply.atk;
        if (t.apply.hpMax) s.hpMaxBonus = (s.hpMaxBonus || 0) + t.apply.hpMax;
      }
    }
    if (s.bg && s.bg.flavor) {
      const f = s.bg.flavor;
      if (f.stone) s.stone += f.stone;
      if (f.wu) s.wu += f.wu;
      if (f.ti) s.ti += f.ti;
      if (f.dun) s.dun += f.dun;
      if (f.shen) s.shen += f.shen;
      if (f.dao) s.dao += f.dao;
      if (f.ling) s.ling += f.ling;
      if (f.life) s.lifeMax += f.life;
    }
    applyReinc(s, meta);
    s.actionsLeft = actionPoints(s);
    refreshStats(s);
    s.hp = s.hpMax;
    saveState(s);
    return s;
  }

  /* 进入页命格数量（唯一口径，见《进入页面重做方案》§1.2 / §2.3）：
     抽取数 = 3（固定；原「大千命格 extra_destiny」天赋已于 2026-09-14 删除）；
     可选数 = 1 + 我命由我(destiny_slot) 等级 + 劫数加成（3 劫及以上 +1）。
     例：凡尘无天赋 3选1；3劫无天赋 3选2；3劫+我命由我 3选3（极限）。 */
  function destinyCounts(jie) {
    const meta = loadMeta();
    const reinc = meta.reinc || {};
    const slotTalent = reinc.destiny_slot || 0;
    const jieBonus = ((jie || 0) >= 3) ? 1 : 0;
    const pick = 3;
    const slot = Math.min(1 + slotTalent + jieBonus, pick); // 栏位不会超过抽到的数量
    return { pick: pick, slot: slot };
  }

  /* ---------------- 通用属性操作 ---------------- */
  function gainWu(s, n) {
    s.wuAcc += n;
    while (s.wuAcc >= 1) { s.wu++; s.wuAcc -= 1; }
  }
  function applyOps(s, ops) {
    const out = [];
    if (!ops) return out;
    if (typeof ops === 'function') ops = ops(s);
    if (!ops) return out;
    // ⚠ 白名单与下方 case 必须一一对应：曾出现「case 写了 shen/dun，白名单却没开」
    //   → 事件 effect:{dun:1} / {shen:1} 静默无效（文案承诺「遁速+1」，玩家什么也拿不到）。
    ['qi', 'hp', 'stone', 'herb', 'iron', 'life', 'wu', 'ti', 'dun', 'shen', 'atk', 'art', 'tech', 'elixirs', 'flags', 'sect', 'hpMax', 'equip', 'inv', 'trib', 'mo', 'dao', 'ling'].forEach(function (k) {
      let v = ops[k];
      if (v === undefined || v === null) return;
      if (typeof v === 'function') v = v(s);
      if (!v) return;
      switch (k) {
        case 'qi': s.qi += v; out.push('修为 ' + (v > 0 ? '+' : '') + v); break;
        case 'hp': s.hp += v; out.push('气血 ' + (v > 0 ? '+' : '') + v); break;
        case 'stone': {
          let sv = v;
          if (s.talents.indexOf('fuyuan') >= 0 && sv > 0) sv = Math.round(sv * 1.10);
          s.stone += sv;
          out.push('灵石 ' + (sv > 0 ? '+' : '') + sv);
          break;
        }
        case 'herb': {
          // 根据境界给予对应等级灵草
          if (!s.materials) s.materials = {};
          var herbGrades = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'];
          var herbKey = herbGrades[bigIdxOf(s)] || 'herb_huang';
          s.materials[herbKey] = (s.materials[herbKey] || 0) + v;
          out.push(MATERIALS[herbKey].name + ' ' + (v > 0 ? '+' : '') + v);
          break;
        }
        case 'iron': {
          // 根据境界给予对应等级灵铁
          if (!s.materials) s.materials = {};
          var ironGrades = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
          var ironKey = ironGrades[bigIdxOf(s)] || 'iron_huang';
          s.materials[ironKey] = (s.materials[ironKey] || 0) + v;
          out.push(MATERIALS[ironKey].name + ' ' + (v > 0 ? '+' : '') + v);
          break;
        }
        case 'life': s.lifeMax += v; out.push('寿元 ' + (v > 0 ? '+' : '') + v); break;
        case 'wu': gainWu(s, v); out.push('悟性 +' + v); break;
        case 'ti': s.ti += v; out.push('体魄 +' + v); break;
        case 'shen': s.shen = (s.shen || 0) + v; out.push('神识 +' + v); break;
        case 'dun': s.dun = (s.dun || 0) + v; out.push('遁速 +' + v); break;
        case 'atk': s.extraAtk += v; out.push('攻击 +' + v); break;
        case 'hpMax': s.hpMaxBonus = (s.hpMaxBonus || 0) + v; s.hp += v; out.push('气血上限 +' + v); break;
        case 'art': {
          const owned = s.arts.indexOf(v) >= 0 || (s.equip.treasure && s.equip.treasure.indexOf(v) >= 0);
          const isSpirit = !!(ARTIFACTS[v] && ARTIFACTS[v].spirit); // 灵物类法宝：文案说「灵物」
          if (!owned) {
            s.arts.push(v);
            out.push('获得' + (isSpirit ? '灵物' : '法宝') + '【' + ARTIFACTS[v].name + '】');
            if (equipTreasureAuto(s, v)) out.push('已自动装备');
          } else {
            out.push('已拥有' + (isSpirit ? '灵物' : '法宝') + '【' + ARTIFACTS[v].name + '】（重复授予已忽略）');
          }
          break;
        }
        case 'tech': if (s.techs.indexOf(v) < 0) { s.techs.push(v); out.push('习得功法【' + TECHNIQUES[v].name + '】'); } break;
        case 'elixirs': Object.keys(v).forEach(function (id) {
          const n = v[id];
          if (n >= 0) {
            s.elixirs[id] = (s.elixirs[id] || 0) + n;
            out.push('获得丹药【' + ELIXIRS[id].name + '】×' + n);
          } else {
            s.elixirs[id] = (s.elixirs[id] || 0) + n;
            if (s.elixirs[id] <= 0) delete s.elixirs[id];
            out.push('消耗丹药【' + ELIXIRS[id].name + '】×' + (-n));
          }
        }); break;
        case 'flags': Object.keys(v).forEach(function (f) { s.flags[f] = v[f]; }); break;
        case 'sect': s.sect = v; out.push('拜入【' + SECTS[v].name + '】'); logLife(s, 'sect', '拜入' + SECTS[v].name); break;
        case 'equip': out.push.apply(out, grantEquipChecked(s, v)); break;
        case 'inv': (Array.isArray(v) ? v : [v]).forEach(function (id) {
          out.push.apply(out, grantEquipChecked(s, id));
        }); break;
        // 渡劫加成：累积到独立字段 s.tribBonusExtra（breakInfo 读取）。
        // ⚠ 旧实现写 s.linggen.body.trib —— 现代存档 linggenTrait 只认 linggen.trait.effect，
        //   该字段永远读不到 → 所有「渡劫 +N%」的奖励静默失效（2026-09-13 修）。
        case 'trib': s.tribBonusExtra = (s.tribBonusExtra || 0) + v; out.push('渡劫 +' + Math.round(v * 100) + '%'); break;
        case 'dao': s.dao = (s.dao || 0) + v; out.push('道心 +' + v); break;
        case 'ling': s.ling = (s.ling || 0) + v; out.push('灵力 +' + v); break;
      }
    });
    refreshStats(s);
    return out;
  }

  /* ---------------- 装备管理 ---------------- */
  // 法宝槽位：初始 3 + 每大境界 +1；道心/神识 每 10 点再 +1（最多各 +3）；
  // 另受轮回阁天赋「先天灵宝」加成（每级 +1，最高 3 级）。
  function maxTreasure(s) {
    var n = 3 + bigIdxOf(s);                                   // 炼气3/筑基4/金丹5/元婴6
    n += Math.min(3, Math.floor((s.dao || 0) / 10));           // 道心 10/20/30 → +1/+2/+3
    n += Math.min(3, Math.floor((s.shen || 0) / 10));          // 神识 10/20/30 → +1/+2/+3
    n += (s.reinc && s.reinc.treasureSlot) || 0;               // 先天灵宝（轮回阁天赋）
    return n;
  }
  // 统一查找法宝（本命型 ARTIFACTS 或 装备型 EQUIPS.treasure），返回规整结构
  function treasureItem(id) {
    if (ARTIFACTS && ARTIFACTS[id]) {
      const a = ARTIFACTS[id];
      return { id: id, name: a.name, grade: a.grade, isArt: true, item: a };
    }
    const it = findEquip(id);
    if (it) return { id: id, name: it.name, tier: it.tier, isArt: false, item: it };
    return null;
  }
  // 自动装备法宝到空闲槽（满则留库存），返回是否成功装备
  function equipTreasureAuto(s, id) {
    if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
    if (s.equip.treasure.indexOf(id) >= 0) return true;
    if (s.equip.treasure.length >= maxTreasure(s)) return false;
    s.equip.treasure.push(id);
    if (s.arts) s.arts = s.arts.filter(function (x) { return x !== id; });
    if (s.inventory) s.inventory = s.inventory.filter(function (x) { return x !== id; });
    return true;
  }
  function unequipTreasure(s, id) {
    if (!Array.isArray(s.equip.treasure)) return false;
    const i = s.equip.treasure.indexOf(id);
    if (i < 0) return false;
    s.equip.treasure.splice(i, 1);
    // 卸下后统一回法宝囊(S.arts)：本命型法宝与装备型宝物(EQUIPS.treasure)都归法宝体系
    if (!s.arts) s.arts = [];
    if (s.arts.indexOf(id) < 0) s.arts.push(id);
    refreshStats(s); saveState(s);
    return true;
  }
  /* ---------------- 灵物类法宝（秘藏专属，2026-09-13 改制） ----------------
     旧版灵物是 s.spiritItems 里的独立道具（只能完美突破、不在法宝栏显示）。
     现全部并入 ARTIFACTS（`spirit: true`），与普通法宝同吃法宝囊/装备槽体系。
     来源只有两处：秘境 BOSS「秘藏二选一」的选项一、秘境深探掉落。 */
  function isSpiritArt(id) { return !!(ARTIFACTS[id] && ARTIFACTS[id].spirit); }
  function allSpiritArtIds() { return Object.keys(ARTIFACTS).filter(isSpiritArt); }
  // 持有（法宝囊或装备槽，二者都算「已得」——二选一判断的是「是否已得」而非「是否装备」）
  function ownsArt(s, id) {
    if (!id) return false;
    const bag = s.arts || [];
    const eq = (s.equip && s.equip.treasure) || [];
    return bag.indexOf(id) >= 0 || eq.indexOf(id) >= 0;
  }
  // 秘境阶位 → 该阶位秘藏的灵物法宝 id
  function spiritArtOf(s, advKey) {
    return (typeof SPIRIT_FOR_ADV !== 'undefined' && SPIRIT_FOR_ADV[advKey || s.advType || 'huang'])
      || 'shangpin_lingjing';
  }
  // 「每层（阶位）秘境最多出 N 件**普通**法宝」计数——存档持久、转世随 s.flags 清空。
  // ⚠️ 灵物类法宝**豁免**此上限（2026-09-13 用户定稿）：灵物永远能出，且不占用名额，
  //    否则玩家在同一阶位连选 3 件普通法宝后，选项一就再也见不到灵物了。
  function advArtCount(s, advKey) {
    if (!s.flags) s.flags = {};
    if (!s.flags.advArt) s.flags.advArt = {};
    return s.flags.advArt[advKey || s.advType || 'huang'] || 0;
  }
  function advArtCap() { return (typeof ADV_ART_CAP === 'number') ? ADV_ART_CAP : 3; }
  function advArtFull(s, advKey) { return advArtCount(s, advKey) >= advArtCap(); }
  /* 授予秘境法宝（唯一的秘境法宝入口）：
     - 已持有 → 返回 null（调用方降级）
     - 灵物 → **豁免上限**，直接授予、不计数
     - 普通法宝 → 受「每阶位 N 件」上限约束，授予后计数 +1 */
  function grantAdvArt(s, id, advKey) {
    const key = advKey || s.advType || 'huang';
    if (!ARTIFACTS[id]) return null;
    if (ownsArt(s, id)) return null;
    const spirit = isSpiritArt(id);
    if (!spirit && advArtFull(s, key)) return null;
    const out = applyOps(s, { art: id });
    if (!spirit) {
      if (!s.flags.advArt) s.flags.advArt = {};
      s.flags.advArt[key] = advArtCount(s, key) + 1;
    }
    return out;
  }
  // 从「本阶及以下、未持有」的灵物中随机取一件（秘境深探掉落用，与法宝产出分层同源）
  function pickSpiritArtId(s, gi) {
    const allow = allSpiritArtIds().filter(function (id) {
      return gradeIdxOf(ARTIFACTS[id].grade) <= gi && !ownsArt(s, id);
    });
    if (!allow.length) return null;
    const own = allow.filter(function (id) { return gradeIdxOf(ARTIFACTS[id].grade) === gi; });
    const pool = own.length ? allow.concat(own) : allow;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  /* 法宝结构化 effect → 可读中文说明（唯一权威口径，UI 与本文件同用）
     ⚠️ 历史 bug：pct() 自带「+」，调用处又写了一次「+'」，出现「灵矿产量++30%」。
     规则：pct() 负责带加号，所有调用处**不准**再补 '+'。 */
  function artEffectText(id) {
    const a = ARTIFACTS[id];
    if (!a || !a.effect) return '';
    const e = a.effect;
    const p = [];
    const pct = function (v) { return '+' + Math.round(v * 100) + '%'; };
    if (e.wu) p.push('悟性+' + e.wu);
    if (e.ti) p.push('体魄+' + e.ti);
    if (e.dun) p.push('遁速+' + e.dun);
    if (e.shen) p.push('神识+' + e.shen);
    if (e.dao) p.push('道心+' + e.dao);
    if (e.ling) p.push('灵力+' + e.ling);
    if (e.atk) p.push('攻击+' + e.atk);
    if (e.hpMax) p.push('气血上限+' + e.hpMax);
    if (e.def) p.push('防御+' + e.def);
    if (e.critPct) p.push('暴击' + pct(e.critPct));
    if (e.dodgePct) p.push('闪避' + pct(e.dodgePct));
    if (e.defPct) p.push('防御' + pct(e.defPct));
    if (e.atkPct) p.push('攻击' + pct(e.atkPct));
    if (e.cult) p.push('修炼' + pct(e.cult));
    if (e.stealPct) p.push('吸血' + pct(e.stealPct));
    if (e.tiHpBonus) p.push('体魄气血' + pct(e.tiHpBonus));
    if (e.duantiEff) p.push('锻体效率' + pct(e.duantiEff));
    if (e.duantiShenEff) p.push('淬神效率' + pct(e.duantiShenEff));
    if (e.atkSpd) p.push('攻速+' + e.atkSpd + '%');
    if (e.duantiMax) p.push('锻体上限+' + e.duantiMax);
    if (e.craftEff) p.push('百艺效率' + pct(e.craftEff));
    if (e.farmEff) p.push('灵田产量' + pct(e.farmEff));
    if (e.mineEff) p.push('灵矿产量' + pct(e.mineEff));
    if (e.stoneYearPct) p.push('每年灵石' + pct(e.stoneYearPct));
    if (e.cultTwice) p.push('每年可修炼2次');
    if (e.doubleCult) p.push('修炼时' + pct(e.doubleCult) + '几率修为翻倍');
    if (e.doubleDmg) p.push('出手时' + pct(e.doubleDmg) + '几率伤害翻倍');
    if (e.modeBonus) {
      if (e.modeBonus.normal) p.push('普通修炼' + pct(e.modeBonus.normal));
      if (e.modeBonus.focus) p.push('潜心修炼' + pct(e.modeBonus.focus));
      if (e.modeBonus.seclusion) p.push('闭关修炼' + pct(e.modeBonus.seclusion));
    }
    if (e.craftKind) {
      for (const k in e.craftKind) {
        const nm = { alchemy: '炼丹', forge: '炼器', talisman: '制符', array: '阵法' }[k] || k;
        p.push(nm + '经验+' + e.craftKind[k]);
      }
    }
    if (e.daoAtkPct) p.push('每点道心攻击' + pct(e.daoAtkPct) + '(上限' + pct(e.daoCap || 0.30) + ')');
    if (e.lowHpAtk) p.push('血越低攻击越高(上限' + pct(e.lowCap || 0.40) + ')');
    if (e.defToAtk) p.push('防御×' + e.defToAtk + '转攻击');
    if (e.scale) p.push('每' + e.scale.per + e.scale.res + '，' + (e.scale.stat === 'defPct' ? '防御' : '攻击') + pct(e.scale.perPoint) + '(上限' + pct(e.scale.cap || 1) + ')');
    if (a.stack) p.push('每击杀1敌+' + a.stack.per + '(上限+' + a.stack.cap + ')');
    return p.join('、');
  }
  /* 六维收益文案（面板展示口径）：当前有效值 × 每点系数 → 直接给「一共 +多少」。
     用户要求：不提「（基础+命格）」、不提「每点+多少」、不提栏位解锁，
     只说这一维最终给你加了多少战斗属性 / 修炼速度。 */
  function attrGainText(s, key) {
    const v = effAttr(s, key) + ((equipStats(s)[key] || 0));
    const n1 = function (x) { return Math.round(x * 10) / 10; };
    switch (key) {
      case 'wu':
        return '修炼速度 +' + Math.round(v * 10);
      case 'ti':
        return '气血上限 +' + Math.round(v * 50 * (1 + (artifactStats(s).tiHpBonus || 0)) * (talentApply(s, 'tiMul') || 1))
          + '、防御 +' + Math.round(v * 0.5 * getDestinyAttrMult(s, 'def'));
      case 'dun':
        return '闪避 +' + n1(v * 2 * (talentApply(s, 'dunMul') || 1)) + '%'
          + '、攻速 +' + n1(v * 1 * (talentApply(s, 'dunMul') || 1)) + '%';
      case 'dao':
        return '暴击 +' + n1(v * 2) + '%、渡劫 +' + n1(v * 1) + '%';
      case 'ling':
        return '攻击 +' + Math.round(v * 5) + '、灵量 +' + Math.round(v * 20);
      case 'shen':
        return '攻击 +' + Math.round(v * 5) + '、暴击 +' + n1(v * 1) + '%';
    }
    return '';
  }
  function findEquip(id) {
    for (const slot in EQUIPS) if (EQUIPS[slot][id]) return EQUIPS[slot][id];
    return null;
  }
  function slotOf(id) {
    for (const k in EQUIPS) if (EQUIPS[k][id]) return k;
    return null;
  }
  function gainEquip(s, idOrInst) {
    // 兼容：字符串 id（旧档/剧情给固定装备）→ 升格为无词条实例；对象 {id,aff} 为已滚动词条实例。
    const inst = equipInst(idOrInst);
    if (!inst) return [];
    const id = inst.id;
    const it = findEquip(id);
    if (!it) return [];
    const out = [];
    const isTreasure = slotOf(id) === 'treasure';
    if (isTreasure) {
      // 宝物（EQUIPS.treasure）属「法宝/珍宝」体系，统一入法宝囊(S.arts)而非储物袋，
      // 由玩家在法宝页手动装备，避免装备页无法展示法宝槽导致「装备凭空消失」。
      if (!Array.isArray(s.arts)) s.arts = [];
      if (s.arts.indexOf(id) < 0) s.arts.push(id);
      refreshStats(s);
      out.push('获得宝物【' + it.name + '】（收入法宝囊，可于法宝页穿戴）');
      return out;
    }
    if (!Array.isArray(s.inventory)) s.inventory = [];
    // 得到装备不再自动穿上：一律收入储物袋，由玩家在角色页手动穿戴（存完整实例含词条）
    s.inventory.push(inst);
    refreshStats(s);
    out.push('获得装备【' + it.name + '】（收入储物袋，可于角色页手动穿戴）');
    return out;
  }
  // 从储物袋移除「被穿戴的那一件」——按 id + 词条匹配，只删一件。
  // ⚠ 不能用 filter(x => x.id !== id) 全删：袋里有两件同名装备时，穿一件会把两件一起
  //   从袋里删掉（另一件凭空消失，2026-09-14 用户实测反馈「装备了同名装备后另一件自动消失」）。
  function removeOneFromInventory(s, inst) {
    if (!Array.isArray(s.inventory)) return;
    const id = inst.id;
    const want = JSON.stringify(inst.aff || []);
    let idx = s.inventory.findIndex(function (x) { const e = equipInst(x); return e && e.id === id && JSON.stringify(e.aff || []) === want; });
    if (idx < 0) idx = s.inventory.findIndex(function (x) { const e = equipInst(x); return e && e.id === id; });
    if (idx >= 0) s.inventory.splice(idx, 1);
  }
  function wearEquip(s, idOrInst) {
    const inst = equipInst(idOrInst);
    if (!inst) return false;
    const id = inst.id;
    const isArt = !!(ARTIFACTS && ARTIFACTS[id]);
    if (isArt) {
      // 本命型法宝（ARTIFACTS）：仅可装备到法宝槽
      if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
      if (s.equip.treasure.indexOf(id) >= 0) return true;
      const max = maxTreasure(s);
      if (s.equip.treasure.length >= max) {
        const old = s.equip.treasure.shift();
        if (ARTIFACTS && ARTIFACTS[old]) { if (!s.arts) s.arts = []; if (s.arts.indexOf(old) < 0) s.arts.push(old); }
        else s.inventory.push(old);
      }
      s.equip.treasure.push(id);
      if (s.arts) s.arts = s.arts.filter(function (x) { return x !== id; });
      refreshStats(s); saveState(s);
      return true;
    }
    const it = findEquip(id);
    if (!it) return false;
    const slot = slotOf(id);
    if (slot === 'treasure') {
      if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
      if (s.equip.treasure.indexOf(id) >= 0) return true;
      const max = maxTreasure(s);
      if (s.equip.treasure.length >= max) {
        const old = s.equip.treasure.shift();
        if (!s.arts) s.arts = [];
        if (s.arts.indexOf(old) < 0) s.arts.push(old);
      }
      s.equip.treasure.push(id);
      if (s.arts) s.arts = s.arts.filter(function (x) { return x !== id; });
      removeOneFromInventory(s, inst);
      refreshStats(s); saveState(s);
      return true;
    }
    // 常规装备槽：穿戴实例（保留词条），被替换的旧装备回储物袋
    const cur = equipInst(s.equip[slot]);
    if (cur && cur.id === id) return true;
    if (cur) s.inventory.push(cur);
    s.equip[slot] = inst;
    removeOneFromInventory(s, inst);
    refreshStats(s); saveState(s);
    return true;
  }
  function sellEquip(s, idOrInst) {
    // 只出售储物袋中的一件，绝不动已穿戴的装备（兼容实例对象）
    const inst = equipInst(idOrInst);
    if (!inst) return false;
    const id = inst.id;
    const it = findEquip(id);
    if (!it) return false;
    const i = s.inventory.findIndex(function (x) { const e = equipInst(x); return e && e.id === id; });
    if (i < 0) return false;
    s.inventory.splice(i, 1);
    const g = Math.round(it.price * 0.5);
    s.stone += g;
    refreshStats(s); saveState(s);
    return g;
  }
  function sellEquipAll(s, idOrInst) {
    // 出售储物袋中该装备的全部多余件（同样不动已穿戴）
    const inst = equipInst(idOrInst);
    if (!inst) return false;
    const id = inst.id;
    const it = findEquip(id);
    if (!it) return false;
    let n = 0;
    s.inventory = s.inventory.filter(function (x) { const e = equipInst(x); if (e && e.id === id) { n++; return false; } return true; });
    if (!n) return false;
    const g = Math.round(it.price * 0.5) * n;
    s.stone += g;
    refreshStats(s); saveState(s);
    return { count: n, gain: g };
  }
  // 掉落品质的深度偏置：越深越偏向「本阶上限」（黄级深处多出良品、天级深处多出仙品），但**永不越阶**。
  // 2026-09-13 三调（用户拍板公式）：高一品概率 bias = min(0.30, 深度 × 0.02)
  //     → 首层 2% / 第 10 层 20% / 第 15 层封顶 30%
  //   本阶品概率 = 1 − bias → 首层 98% / 第 10 层 80% / 第 15 层起 70%
  //   旧值 0.18 + 深度×0.02（封顶 0.55）、更旧 0.30 + 深度×0.03（封顶 0.90）——层层收紧。
  const RANGE_BIAS_PER_DEPTH = 0.02;
  const RANGE_BIAS_CAP = 0.30;
  // 装备总掉落率（2026-09-14 四调 · 用户拍板公式）：杂兵/精英 p = min(0.40, 有效深度 × 0.025)
  //   → 首层 2.5% / 第 10 层 25% / 第 16 层起封顶 40%；Boss 固定 0.60（本轮未动）。
  //   旧值 min(0.30, ed×0.02)、更旧 (0.06 + ed×0.02, 封顶 0.35)、最旧 (0.10 + ed×0.04, 封顶 0.55)。
  const EQUIP_DROP_PER_DEPTH = 0.025;
  const EQUIP_DROP_CAP = 0.40;
  const EQUIP_DROP_BOSS = 0.60;
  // 装备掉落率查询（供 UI 展示，与 randomEquip 同一套公式）
  //   杂兵/精英 p = min(EQUIP_DROP_CAP, 深度 × EQUIP_DROP_PER_DEPTH)
  //   Boss 固定 EQUIP_DROP_BOSS；品质偏置 min(RANGE_BIAS_CAP, 深度 × RANGE_BIAS_PER_DEPTH)
  function equipDropRate(depth, isBoss) {
    if (isBoss) return EQUIP_DROP_BOSS;
    return Math.min(EQUIP_DROP_CAP, (depth || 1) * EQUIP_DROP_PER_DEPTH);
  }
  function equipBiasRate(depth) {
    return Math.min(RANGE_BIAS_CAP, Math.max(0, depth || 1) * RANGE_BIAS_PER_DEPTH);
  }
  function randomEquip(bi, depth) {
    const range = realmTierRange(bi);
    // ⚠ 掉落品质**严格落在 realmTierRange(bi) 区间内**：黄级(0) → 凡品/良品，玄级(1) → 良品/上品，
    //   地级(2) → 上品/极品，天级(3) → 极品/仙品。
    //   旧版这里有一句 `if (rand < 0.18 && range[1] < 5) tier = range[1] + 1` 的**向上越阶**，
    //   会让黄级秘境掉出「上品」（玩家实测反馈「黄级掉上品太离谱」）——已删除。
    const span = range[1] - range[0];
    const bias = Math.min(RANGE_BIAS_CAP, Math.max(0, depth || 1) * RANGE_BIAS_PER_DEPTH);
    const tier = span <= 0 ? range[0]
      : (range[0] + (Math.random() < bias ? span : Math.floor(Math.random() * span)));
    const slots = ['weapon', 'head', 'body', 'accessory'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    // 掉落子类倾向：配方子类（剑/冠冕/道袍/玉佩）主要靠炼器获得，掉落权重低；
    //   掉落专属子类（刀锤印/头盔/盔甲/戒指项链）权重高，是秘境掉落的主力。
    const items = Object.keys(EQUIPS[slot]).map(function (id) { return EQUIPS[slot][id]; });
    const cand = items.filter(function (it) { return it.tier === tier; });
    if (!cand.length) return null;
    // 按子类分组后加权抽取：配方子类 1 权重，掉落专属子类 4 权重
    const subBuckets = {};
    cand.forEach(function (it) {
      (subBuckets[it.sub] = subBuckets[it.sub] || []).push(it);
    });
    const subEntries = Object.keys(subBuckets).map(function (sub) {
      const isRecipeSub = (sub === '剑' || sub === '冠冕' || sub === '道袍' || sub === '玉佩');
      return { sub: sub, w: isRecipeSub ? 1 : 4, list: subBuckets[sub] };
    });
    let tot = 0; subEntries.forEach(function (e) { tot += e.w; });
    let r = Math.random() * tot;
    let chosen = subEntries[0];
    for (let i = 0; i < subEntries.length; i++) { r -= subEntries[i].w; if (r <= 0) { chosen = subEntries[i]; break; } }
    const it = chosen.list[Math.floor(Math.random() * chosen.list.length)];
    let id = null;
    for (const key in EQUIPS[slot]) if (EQUIPS[slot][key] === it) { id = key; break; }
    if (!id) return null;
    // 实例化词条：主属性固定（模板 main），附加词条按 tier 区间随机滚动
    const aff = rollAffixes(slot, tier);
    return { id: id, aff: aff };
  }

  /* ---------------- 炼器产出（品质由炼器等级驱动） ---------------- */
  // 从指定槽位中，按「子类 + tier」定位装备模板 id
  function findEquipBySub(slot, sub, tier) {
    const bucket = EQUIPS[slot];
    if (!bucket) return null;
    for (const id in bucket) {
      const it = bucket[id];
      if (it.sub === sub && it.tier === tier) return id;
    }
    return null;
  }
  // 炼器等级 → 产出品质(tier)，含向上波动：
  //   lv1 → tier1~2；lv2 → tier2~3；lv3 → tier3~4；lv4 → tier4~5；lv5 → tier5（顶格稳定）
  function forgeTier(lv) {
    if (lv >= 5) return 5;
    // 50% 概率向上波动 1 级（不超过 5）
    return lv + (Math.random() < 0.5 ? 1 : 0);
  }
  // 品阶 → tier 范围（与 REALM_TIER_RANGE 对齐：黄[1,2] 玄[2,3] 地[3,4] 天[4,5]）
  const GRADE_TIER_RANGE = { '黄': [1, 2], '玄': [2, 3], '地': [3, 4], '天': [4, 5] };
  // 炼器成品 tier：由炼器等级驱动，clamp 到配方品阶的 tier 范围内
  function forgeResultTier(f, lv) {
    const range = GRADE_TIER_RANGE[f.grade] || [1, 5];
    const t = forgeTier(lv);
    return Math.max(range[0], Math.min(range[1], t));
  }
  // 炼器成功产出：从配方的 slot+sub 中按 tier 定位模板，滚动随机词条，生成实例
  function rollForge(f, lv) {
    const tier = forgeResultTier(f, lv);
    const id = findEquipBySub(f.slot, f.sub, tier);
    if (!id) return null;   // 该子类在该 tier 无模板（如冠冕无 tier1），理论上不会发生
    const aff = rollAffixes(f.slot, tier);
    return { id: id, aff: aff, tier: tier };
  }

  /* ---------------- 品质与境界匹配 ---------------- */
  const REALM_TIER_RANGE = [[1, 2], [2, 3], [3, 4], [4, 5]];
  function realmTierRange(bi) {
    const r = REALM_TIER_RANGE[Math.max(0, Math.min(3, bi))];
    return r;
  }
  function equipAllowed(s, id) {
    const it = findEquip(id);
    if (!it) return false;
    const range = realmTierRange(bigIdxOf(s));
    return it.tier >= range[0] && it.tier <= range[1];
  }
  function grantEquipChecked(s, idOrInst) {
    const inst = equipInst(idOrInst);
    if (!inst) return [];
    const it = findEquip(inst.id);
    if (!it) return [];
    return gainEquip(s, inst);
  }
  // 检查遗世仙踪是否可用（每10年出现一次）
  function isXianAdventureAvailable(s) {
    return s.year % 10 === 0 && bigIdxOf(s) >= 3;
  }

  /* ---------------- 回合制战斗 v2 ---------------- */
  // 战斗内固定系数（原先散落为魔法数字，集中于此便于平衡调整与「口径可查」）
  const GUARD_ACTION_MUL = 0.35;  // 「防御」动作：本回合受到伤害 ×0.35（即减伤 65%）
  const SLOW_MUL = 0.6;           // 减速 debuff 生效回合：敌方伤害 ×0.6（即减伤 40%）
  const SUPPRESS_CHANCE = 0.35;   // 心魔「扰神」：每回合概率使你心神失守、空过一次出手
  const SUPPRESS_MECH = 'suppress';
  /* ---- 五行新机制战斗系数（实装：眩晕/冻结 · 灼烧/中毒 · 伐灾）---- */
  const DOT_TICK_PCT = 0.10;       // 灼烧 / 中毒：每回合 1 层结算，扣除「当前」生命的 10%
  const DISASTER_TURNS = 3;        // 伐灾：每 1 层持续 3 回合
  const DISASTER_IMMUNE_COST = 3;  // 伐灾：每 3 层抵消一次眩晕 / 冻结（免控）
  // DoT / 伐灾 叠层硬上限按阶位：玄 2 / 地 4 / 天 8（每施法叠 玄1 / 地2 / 天3 层）
  function dotCapByGrade(g) { return g === '天' ? 8 : (g === '地' ? 4 : (g === '玄' ? 2 : 1)); }
  /* ---- 战斗内增益 / 减益 / 控制 / 持续伤害：唯一结算入口（buff·debuff·stun·DoT·disaster·heal 全走这里）----
     旧版「冰封 freeze」已随 寒冰刺/玄冰阵/冰封千里 一并删除，冻结改由概率 stun 承载（与眩晕同字段）。
     兼容旧存档：字段缺失按「无效果」处理，不会因老存档读不到而报错。 */
  function ensureBattleFx(b) {
    if (!b) return b;
    if (!b.fxAtkUp) b.fxAtkUp = { amt: 0, turns: 0 };    // 玩家攻击加成 %（火球术/烈焰斩）
    if (!b.fxDefUp) b.fxDefUp = { amt: 0, turns: 0 };    // 玩家受伤减免 %（岩甲术/金光护体/大地守护）
    if (!b.fxAtkDown) b.fxAtkDown = { amt: 0, turns: 0 }; // 敌方攻击削弱 %（藤蔓术/生机缠绕/山岳镇压）
    if (!b.fxCritUp) b.fxCritUp = { amt: 0, turns: 0 };  // 玩家暴击率加成 %（金刃术/剑气诀/雷音引，金系语义）
    if (typeof b.stunNext !== 'boolean') b.stunNext = false;      // 敌方下回合被控（土·眩晕 / 水·冻结）
    if (typeof b.pStunNext !== 'boolean') b.pStunNext = false;    // 玩家下回合被控（双向：敌方/boss 施加）
    if (typeof b.dotBurn !== 'number') b.dotBurn = 0;             // 敌方灼烧层数（火）
    if (typeof b.dotPoison !== 'number') b.dotPoison = 0;         // 敌方中毒层数（木）
    if (typeof b.pDotBurn !== 'number') b.pDotBurn = 0;           // 玩家灼烧层数（双向）
    if (typeof b.pDotPoison !== 'number') b.pDotPoison = 0;       // 玩家中毒层数（双向）
    if (typeof b.disasterStacks !== 'number') b.disasterStacks = 0; // 玩家伐灾层数（金：免控）
    if (typeof b.disasterTurns !== 'number') b.disasterTurns = 0;   // 伐灾剩余回合（每栈 3 回合）
    if (typeof b.suppressed !== 'boolean') b.suppressed = false;
    if (!b.fxBossDefUp) b.fxBossDefUp = { amt: 0, turns: 0 };      // BOSS 自身减伤 %（BOSS 使用岩甲术/金光护体时）
    if (typeof b.spellChance !== 'number') b.spellChance = 0;      // BOSS 每回合施法概率
    if (!b.spells) b.spells = [];                                  // BOSS 法术表 [{ id, w }]
    return b;                                                       // 注：element 未配置时保持 undefined = 不吃生克、不减伤（杂兵/测试敌人）
  }
  /* 玩家是否「免疫控制」——命格【万法不侵】effect.controlImmune */
  function isControlImmune(s) {
    let imm = false;
    (s.destinies || []).forEach(function (d) {
      const dest = DESTINIES[d];
      if (dest && dest.effect && dest.effect.controlImmune) imm = true;
    });
    return imm;
  }
  /* 施法成功后结算增益/减益/冰封。同名效果取「更高值 + 更长时长」，不叠加成爆炸。 */
  function applySpellFx(s, b, sp, out) {
    ensureBattleFx(b);
    if (sp.heal > 0) {
      const heal = Math.min(s.hpMax - s.hp, Math.round(s.hpMax * sp.heal));
      if (heal > 0) { s.hp += heal; out.push('灵光入体，气血 +' + heal + '。'); }
      else out.push('灵光入体，气血已满。');
    }
    if (sp.buff) {
      if (sp.buff.atkUp) {
        b.fxAtkUp = { amt: Math.max(b.fxAtkUp.amt, sp.buff.atkUp), turns: Math.max(b.fxAtkUp.turns, sp.buff.atkUpDur || sp.buff.duration || 1) };
        out.push('灵力涌动，你的攻击提升 ' + sp.buff.atkUp + '%。');
      }
      if (sp.buff.defUp) {
        b.fxDefUp = { amt: Math.max(b.fxDefUp.amt, sp.buff.defUp), turns: Math.max(b.fxDefUp.turns, sp.buff.defUpDur || sp.buff.duration || 1) };
        out.push('周身灵光凝聚，受到的伤害降低 ' + sp.buff.defUp + '%。');
      }
      if (sp.buff.critUp) {
        b.fxCritUp = { amt: Math.max(b.fxCritUp.amt, sp.buff.critUp), turns: Math.max(b.fxCritUp.turns, sp.buff.critUpDur || sp.buff.duration || 1) };
        out.push('金芒流转，你的暴击率提升 ' + sp.buff.critUp + '%。');
      }
    }
    if (sp.mpRestore > 0) {
      const gain = Math.min(s.mpMax - s.mp, Math.round(s.mpMax * sp.mpRestore));
      if (gain > 0) { s.mp += gain; out.push('灵泉涌动，灵力 +' + gain + '。'); }
      else out.push('灵泉涌动，灵力已满。');
    }
    if (sp.debuff && sp.debuff.atkDown) {
      b.fxAtkDown = { amt: Math.max(b.fxAtkDown.amt, sp.debuff.atkDown), turns: Math.max(b.fxAtkDown.turns, sp.debuff.duration || 1) };
      out.push('『' + b.name + '』气势受挫，攻击下降 ' + sp.debuff.atkDown + '%。');
    }
    /* ---- 眩晕（土）/ 冻结（水）：概率命中 → 目标下一回合无法行动（同 stun 字段，仅文案不同）---- */
    if (sp.stun > 0) {
      const isWater = sp.element === '水';
      const label = isWater ? '冻结' : '眩晕';
      if (Math.random() < sp.stun) {
        b.stunNext = true;
        out.push('『' + b.name + '』' + (isWater ? '被寒冰封住' : '身形猛地一滞') + '，' + label + '生效——下一回合无法行动。');
      } else {
        out.push('『' + b.name + '』稳住身形，未被' + label + '命中。');
      }
    }
    /* ---- 灼烧（火）/ 中毒（木）：叠层，每回合 1 层结算，扣当前生命 10%，随后 -1 层 ---- */
    if (sp.dotBurn > 0) {
      b.dotBurn = Math.min(dotCapByGrade(sp.grade), b.dotBurn + sp.dotBurn);
      out.push('烈焰缠上『' + b.name + '』，灼烧 ' + b.dotBurn + ' 层。');
    }
    if (sp.dotPoison > 0) {
      b.dotPoison = Math.min(dotCapByGrade(sp.grade), b.dotPoison + sp.dotPoison);
      out.push('剧毒侵入『' + b.name + '』，中毒 ' + b.dotPoison + ' 层。');
    }
    /* ---- 伐灾（金）：自身叠层（每栈 3 回合）；施法时净化自身灼烧·中毒 ---- */
    if (sp.disaster > 0) {
      b.disasterStacks = Math.min(dotCapByGrade(sp.grade), b.disasterStacks + sp.disaster);
      b.disasterTurns = DISASTER_TURNS;
      let cleaned = '';
      if (b.pDotBurn > 0 || b.pDotPoison > 0) {
        b.pDotBurn = 0; b.pDotPoison = 0;
        cleaned = '，并驱散了自身的灼烧与中毒';
      }
      out.push('金光伐灾，你身负灾厄 ' + b.disasterStacks + ' 层' + cleaned + '。');
    }
  }
  /* 持续伤害结算（回合开始调用）：灼烧（火）/ 中毒（木）。
     规则：每类 DoT 每回合仅 1 层生效 —— 扣除「当前」生命 10%，随后该层消失（-1 层）。
     灼烧与中毒互相独立，可同回合各扣一次，互不干扰、不叠加成 20% 一次性。
     双向：敌方与玩家各一套字段，boss 施加给玩家时走同一逻辑。 */
  function tickDot(s, b, out, fx) {
    ensureBattleFx(b);
    const list = [
      { key: 'dotBurn', name: '灼烧', player: false },
      { key: 'dotPoison', name: '中毒', player: false },
      { key: 'pDotBurn', name: '灼烧', player: true },
      { key: 'pDotPoison', name: '中毒', player: true }
    ];
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (b[it.key] <= 0) continue;
      const cur = it.player ? s.hp : b.hp;
      if (cur <= 0) continue;
      const tick = Math.max(1, Math.round(cur * DOT_TICK_PCT));
      if (it.player) {
        s.hp -= tick;
        if (s.adv && !s.adv.trial) s.advDmgThisRun = true;
        out.push('你身中' + it.name + '，生命流逝 ' + tick + '。');
        fx.push({ side: 'me', kind: 'dmg', amount: tick });
        if (s.hp <= 0) {
          s.hp = 1; b.done = true; b.lost = true;
          if (b.loseLoot) applyOps(s, b.loseLoot);
          out.push('你重伤坠地，勉强捡回一条命。');
        }
      } else {
        b.hp -= tick;
        out.push('『' + b.name + '』身中' + it.name + '，生命流逝 ' + tick + '。');
        fx.push({ side: 'enemy', kind: 'dmg', amount: tick });
        if (b.hp <= 0) { b.done = true; b.win = true; s.killCount = (s.killCount || 0) + 1; refreshStats(s); out.push('『' + b.name + '』轰然倒下。'); }
      }
      b[it.key]--;
    }
  }
  /* 外部（敌方 / boss）对玩家施加控制（眩晕 / 冻结）的唯一入口。
     概率判定命中后：玩家伐灾层数 ≥3 时消耗 3 层抵消这次控制（免控），否则玩家下回合被控。
     返回 true = 玩家被控。双向设计：boss 施控与玩家受控共用同一字段与判定。 */
  function applyPlayerControl(s, b, chance) {
    ensureBattleFx(b);
    if (!(chance > 0)) return false;
    if (Math.random() >= chance) return false;
    if (b.disasterStacks >= DISASTER_IMMUNE_COST) {
      b.disasterStacks -= DISASTER_IMMUNE_COST;
      if (b.disasterStacks <= 0) b.disasterTurns = 0;
      return false;
    }
    b.pStunNext = true;
    return true;
  }
  /* ---- BOSS 五行生克与 BOSS 施法（2026-09-13 实装） ----
     生克：克 ×1.2 / 同属 ×0.9 / 被克 ×0.8 / 无属性法术（青云剑宗）恒 ×1.0
     无属性 BOSS（魔 / 心魔 / 虚空 / 天道）：不参与生克，玩家任何伤害再乘 ×0.90。 */
  const ELEM_BEATS = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };
  const BOSS_SPELL_DMG_SCALE = 0.35;   // BOSS 法术伤害压缩系数（法术 dmg 系数按玩家攻击力设计）
  const NO_ELEM_BOSS_TAKEN = 0.90;     // 无属性 BOSS 全系减伤
  function elemCounterMul(spellEl, bossEl) {
    if (!bossEl || bossEl === '无' || !spellEl || spellEl === '无') return 1;
    if (spellEl === bossEl) return 0.9;
    if (ELEM_BEATS[spellEl] === bossEl) return 1.2;
    if (ELEM_BEATS[bossEl] === spellEl) return 0.8;
    return 1;
  }
  /* 玩家对 BOSS 的最终伤害倍率：生克 + 无属性 BOSS 减伤 + BOSS 自身护盾（岩甲术等 defUp） */
  function enemyTakenMul(b, spellEl) {
    let m = elemCounterMul(spellEl, b.element);
    if (b.element === '无') m *= NO_ELEM_BOSS_TAKEN;   // 仅「显式无属性」的 BOSS 全系减伤
    if (b.fxBossDefUp && b.fxBossDefUp.amt > 0) m *= (1 - Math.min(0.9, b.fxBossDefUp.amt / 100));
    return m;
  }
  /* 战斗开始：按 name 注入 BOSS / 强敌的五行与法术（查不到 = 无属性、不施法） */
  function applyBossElement(s, b) {
    const cfg = (typeof BOSS_ELEMENT !== 'undefined' && BOSS_ELEMENT[b.name]) ||
      (typeof EVENT_FOE_ELEMENT !== 'undefined' && EVENT_FOE_ELEMENT[b.name]) || null;
    if (cfg) {
      b.element = cfg.element || '无';
      b.spells = cfg.spells || [];
      b.spellChance = typeof cfg.spellChance === 'number' ? cfg.spellChance : 0;
      // 镜像属性：元素取玩家主灵根（仅镜像属性，不复制玩家法术）
      if (cfg.mirrorElement) {
        const aff = (s.linggen && s.linggen.affinity && s.linggen.affinity.length) ? s.linggen.affinity[0] : null;
        if (aff) b.element = aff;
      }
    } else {
      // 未配置的敌人（杂兵 / 事件小怪）：不设 element → 不吃生克、不受无属性减伤
      b.spells = b.spells || [];
      b.spellChance = typeof b.spellChance === 'number' ? b.spellChance : 0;
    }
    return b;
  }
  /* 按权重抽一个 BOSS 法术（过滤掉数据里已不存在的 id） */
  function pickBossSpell(b) {
    const list = (b.spells || []).filter(function (x) { return x && x.id && TECHNIQUES[x.id]; });
    if (!list.length) return null;
    let total = 0;
    for (let i = 0; i < list.length; i++) total += (list[i].w || 1);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= (list[i].w || 1); if (r <= 0) return TECHNIQUES[list[i].id]; }
    return TECHNIQUES[list[0].id];
  }
  /* BOSS 法术伤害走与普攻相同的玩家减伤通道（法术护盾 / 心法减伤 / 防御） */
  function bossSpellDmgTaken(s, b, d) {
    let x = d;
    const shield = (b.fxDefUp ? b.fxDefUp.amt : 0) / 100 + getXinfaReduceDmg(s) + getXinfaGuard(s);
    if (shield > 0) x = Math.round(x * (1 - Math.min(0.9, shield)));
    const defPct = getDefensePct(s);
    if (defPct > 0) x = Math.round(x * (1 - defPct));
    const defAbs = getDefense(s);
    if (defAbs > 0) x = Math.max(1, x - defAbs);
    const defDiv = getDefenseDiv(s);
    if (defDiv > 0) x = Math.max(1, Math.round(x / (1 + defDiv)));
    return Math.max(1, x);
  }
  /* BOSS 施放一个法术：伤害 / 控制 / DoT / 治疗（全额）/ 自身减伤护盾 */
  function bossCastSpell(s, b, sp, out, fx) {
    out.push('『' + b.name + '』施展【' + sp.name + '】！');
    let dealt = 0;
    if (sp.dmg > 0) {
      const raw = Math.max(1, Math.round(b.atk * sp.dmg * BOSS_SPELL_DMG_SCALE));
      const d = bossSpellDmgTaken(s, b, raw);
      const hpBefore = s.hp;
      s.hp -= d;
      dealt = hpBefore - s.hp;
      if (s.adv && !s.adv.trial) s.advDmgThisRun = true;
      b.hpLost += d;
      out.push('法术临身，你气血 -' + d + '。');
      fx.push({ side: 'me', kind: 'dmg', amount: d });
    }
    // 眩晕（土）/ 冻结（水）：复用 applyPlayerControl（内含金系伐灾 3 层免控）
    if (sp.stun > 0) {
      const before = b.disasterStacks;
      if (applyPlayerControl(s, b, sp.stun)) {
        out.push('你身形一滞，下一回合恐难出手。');
      } else if (before >= DISASTER_IMMUNE_COST) {
        out.push('金光伐灾自行消抵，这一控没能落在你身上（伐灾 -' + DISASTER_IMMUNE_COST + ' 层）。');
      }
    }
    // 灼烧 / 中毒（BOSS 施加给玩家，玩家侧字段 pDotBurn / pDotPoison）
    if (sp.dotBurn > 0) {
      b.pDotBurn = Math.min(dotCapByGrade(sp.grade), b.pDotBurn + sp.dotBurn);
      out.push('烈焰缠身，你身中【灼烧】' + b.pDotBurn + ' 层。');
    }
    if (sp.dotPoison > 0) {
      b.pDotPoison = Math.min(dotCapByGrade(sp.grade), b.pDotPoison + sp.dotPoison);
      out.push('毒气入体，你身中【中毒】' + b.pDotPoison + ' 层。');
    }
    // 吸血（木系生机缠绕等）：按本次伤害回血
    if (sp.lifesteal > 0 && dealt > 0) {
      const hl = Math.round(dealt * sp.lifesteal);
      b.hp = Math.min(b.hpMax, b.hp + hl);
      out.push('『' + b.name + '』借木灵生机回元，气血 +' + hl + '。');
    }
    // 治疗（全额，不折半）
    if (sp.heal > 0) {
      const hl = Math.round(b.hpMax * sp.heal);
      b.hp = Math.min(b.hpMax, b.hp + hl);
      out.push('『' + b.name + '』借法回元，气血 +' + hl + '。');
      fx.push({ side: 'enemy', kind: 'heal', amount: hl });
    }
    // 自身减伤护盾（岩甲术 / 金光护体等 defUp 由 BOSS 使用时 = BOSS 减伤）
    if (sp.buff && sp.buff.defUp) {
      b.fxBossDefUp = {
        amt: Math.max(b.fxBossDefUp.amt, sp.buff.defUp),
        turns: Math.max(b.fxBossDefUp.turns, sp.buff.defUpDur || sp.buff.duration || 1)
      };
      out.push('『' + b.name + '』周身灵光凝聚，受到的伤害降低 ' + sp.buff.defUp + '%。');
    }
    if (s.hp <= 0) {
      s.hp = 1;
      b.done = true; b.lost = true;
      if (b.loseLoot) applyOps(s, b.loseLoot);
      out.push('你重伤坠地，勉强捡回一条命。');
    }
    return true;
  }
  /* 敌方回合：先掷施法概率，命中则施法（替代普攻），否则走普通攻击。返回 true 表示已施法。 */
  function bossTryCast(s, b, out, fx) {
    ensureBattleFx(b);
    if (!(b.spellChance > 0) || !b.spells || !b.spells.length) return false;
    if (Math.random() >= b.spellChance) return false;
    const sp = pickBossSpell(b);
    if (!sp) return false;
    return bossCastSpell(s, b, sp, out, fx);
  }
  /* 回合结束：递减所有战斗增益/减益计时（归零即失效），并递减伐灾层数 */
  function tickBattleFx(b) {
    ensureBattleFx(b);
    ['fxAtkUp', 'fxDefUp', 'fxAtkDown', 'fxCritUp', 'fxBossDefUp'].forEach(function (k) {
      if (b[k].turns > 0) { b[k].turns--; if (b[k].turns <= 0) b[k].amt = 0; }
    });
    // 伐灾：每栈 3 回合，计时归零减 1 层（仍有层则重置计时）
    if (b.disasterStacks > 0) {
      b.disasterTurns--;
      if (b.disasterTurns <= 0) {
        b.disasterStacks = Math.max(0, b.disasterStacks - 1);
        b.disasterTurns = b.disasterStacks > 0 ? DISASTER_TURNS : 0;
      }
    }
  }
  // eslint-disable-next-line no-redeclare
  function combatStart(s, spec, opts) {
    refreshStats(s);
    opts = opts || {};
    // 战前恢复：气血 +10%、灵力 +75%（均为加法、封顶、绝不回扣）。
    // 多回复机制并存时取「最高值」：加法不会低于已有更高基线——例如年末已回满(100%)，
    // 战前再 +75% 仍封顶满蓝，绝不会被压回 75%。故年末回满不会被战前恢复覆盖。
    s.hp = Math.min(s.hpMax, s.hp + Math.round(s.hpMax * 0.10));
    s.mp = Math.min(s.mpMax, s.mp + Math.round(s.mpMax * 0.75));
    const d = getDunshu(s);
    const playerSpeed = s.dunSpeed || 1;
    const enemySpeed = spec.dunSpeed || (spec.bi || 0) + 1;
    const speedDiff = playerSpeed - enemySpeed;
    let flee = 0.3 + speedDiff * 0.12 + (d.flee || 0);
    flee = Math.max(0.15, Math.min(0.95, flee));
    if (spec.noFlee) flee = 0.05;
    const spells = equippedShufa(s);
    const spellList = spells.map(function (x) {
      for (const id in TECHNIQUES) if (TECHNIQUES[id] === x) return { id: id, name: x.name, grade: x.grade, cost: x.cost || 0 };
      return null;
    }).filter(Boolean);
    s.battle = {
      name: spec.name, line: spec.line || '', atk: spec.atk,
      hp: spec.hp, hpMax: spec.hp, loot: spec.loot || {}, loseLoot: spec.loseLoot || null,
      flee: flee, guard: d.guard, slow: false, guarded: false,
      spellUsed: false, noFlee: !!spec.noFlee, done: false, win: false, fled: false, lost: false,
      gains: [], hpLost: 0,
      spellList: spellList,
      spellOrder: [],
      spellName: spellList.length ? spellList[0].name : null,
      portraitEnemy: spec.portrait || 'foe',
      firstStrike: effAttr(s, 'dun') * 0.01 + getDestinyBonus(s, 'firstStrike'),
      mechanic: spec.mechanic || null,
      enraged: false,
      round: 0,
      fxAtkUp: { amt: 0, turns: 0 },
      fxDefUp: { amt: 0, turns: 0 },
      fxAtkDown: { amt: 0, turns: 0 },
      fxCritUp: { amt: 0, turns: 0 },
      stunNext: false,
      pStunNext: false,
      dotBurn: 0,
      dotPoison: 0,
      pDotBurn: 0,
      pDotPoison: 0,
      disasterStacks: 0,
      disasterTurns: 0,
      suppressed: false,
      fxBossDefUp: { amt: 0, turns: 0 },
      spells: [],
      spellChance: 0
    };
    // 注入 BOSS / 强敌的五行属性与法术表（按 name 查 BOSS_ELEMENT → EVENT_FOE_ELEMENT）
    applyBossElement(s, s.battle);
    saveState(s);
    return s.battle;
  }
  /* 统一处理一次出手（含暴击/斩杀/吸血/先手/额外攻击），供普攻与法术复用 */
  function playerHit(s, b, baseDmg, labelPrefix, allowExtra, fx, spLifesteal, extraCrit) {
    const out = [];
    fx = fx || [];
    ensureBattleFx(b);
    // 攻击增益（火球术/烈焰斩 atkUp）直接作用于出手伤害
    let dmg = b.fxAtkUp.amt > 0 ? Math.round(baseDmg * (1 + b.fxAtkUp.amt / 100)) : baseDmg;
    // 一剑封喉（旧命格 t_zhanmie execute 0.20）：敌人气血已低于阈值时直接斩杀
    const executeRate = talentApply(s, 'execute');
    if (executeRate > 0 && b.hp > 0 && b.hp <= b.hpMax * executeRate) {
      const fin = b.hp;
      b.hp = 0;
      out.push(labelPrefix + '一剑封喉，直取要害！');
      fx.push({ side: 'enemy', kind: 'crit', amount: fin });
      b.done = true; b.win = true; s.killCount = (s.killCount || 0) + 1;
      refreshStats(s);
      out.push('『' + b.name + '』轰然倒下。');
      return out;
    }
    // 暴击率无上限：整数=必定暴击次数，小数部分=额外暴击概率（如 200% → 每击必双倍暴击）
    // extraCrit：法术专属暴击加成（仙命【万剑归宗】对无属性/剑法 +50%）
    const critVal = getCritRate(s) + (b.fxCritUp.amt / 100) + (extraCrit || 0);
    let critCount = Math.floor(critVal);
    if (Math.random() < (critVal - critCount)) critCount++;
    if (critCount > 0) {
      // 暴击伤害：基础 200%，致命一击（critDmgBoost 1.0）提升至 300%；每多一次暴击再叠乘
      const critMul = 2 + talentApply(s, 'critDmgBoost');
      for (let ci = 0; ci < critCount; ci++) dmg = Math.round(dmg * critMul);
      out.push(critCount > 1 ? ('暴击连击 ' + critCount + ' 次，伤害狂飙！') : '暴击！伤害翻倍！');
      fx.push({ side: 'enemy', kind: 'crit', amount: dmg });
    } else {
      fx.push({ side: 'enemy', kind: 'dmg', amount: dmg });
    }
    const executeBonus = getDestinyBonus(s, 'executeBonus');
    if (executeBonus > 0 && b.hp < b.hpMax * 0.3) {
      dmg = Math.round(dmg * (1 + executeBonus));
      out.push('斩杀效果触发，伤害提升！');
    }
    // 【灵物·魔核碎片】双倍伤害：装备后按几率让本次出手（普攻/法术）伤害翻倍
    const ddChance = artifactStats(s).doubleDmg || 0;
    if (ddChance > 0 && Math.random() < ddChance) {
      dmg = Math.round(dmg * 2);
      out.push('魔核之力涌动，这一击伤害翻倍！');
      fx.push({ side: 'enemy', kind: 'crit', amount: dmg });
    }
    b.hp -= dmg;
    out.push(labelPrefix + '造成 ' + dmg + ' 点伤害！');
    // 法术吸血（藤蔓术 lifesteal）：按本次伤害回血。spLifesteal 仅主攻击带，额外追击不重复触发。
    if (spLifesteal > 0) {
      const heal = Math.min(s.hpMax - s.hp, Math.round(dmg * spLifesteal));
      if (heal > 0) { s.hp += heal; out.push('藤蔓吸噬，气血 +' + heal + '。'); fx.push({ side: 'me', kind: 'heal', amount: heal }); }
    }
    // 回复（吸血）汇总：体魄回复 + 命格 lifesteal + 法宝 stealPct，三者叠加为「造成伤害回血」
    const recover = getRecoverPct(s) + (artifactStats(s).stealPct || 0);
    if (recover > 0) {
      const heal = Math.round(dmg * recover);
      s.hp = Math.min(s.hpMax, s.hp + heal);
      out.push('回复触发，气血 +' + heal + '。');
      fx.push({ side: 'me', kind: 'heal', amount: heal });
    }
    if (b.round === 1 && b.firstStrike > 0) {
      const fd = Math.round(dmg * b.firstStrike);
      b.hp -= fd;
      out.push('先手突袭，额外造成 ' + fd + ' 点伤害。');
      fx.push({ side: 'enemy', kind: 'dmg', amount: fd });
    }
    if (b.hp <= 0) { b.done = true; b.win = true; s.killCount = (s.killCount || 0) + 1; refreshStats(s); out.push('『' + b.name + '』轰然倒下。'); }
    // 攻速（遁速×2%）：几率额外攻击一次（仅主攻击触发，避免无限连锁）
    if (!b.done && allowExtra) {
      const extraChance = getExtraAtkChance(s);
      if (extraChance > 0 && Math.random() < extraChance) {
        out.push('身形如电，你抓住破绽再次出手！');
        const ex = playerHit(s, b, Math.max(1, Math.round(baseDmg * 0.7)), '你趁隙追击，对『' + b.name + '』', false, fx);
        for (let i = 0; i < ex.length; i++) out.push(ex[i]);
      }
    }
    return out;
  }
  function combatAct(s, act, spellId) {
    const b = s.battle;
    const out = [];
    const fx = [];
    if (!b || b.done) return { done: true, lines: ['战斗已经结束。'], fx: fx };
    ensureBattleFx(b);
    b.round = (b.round || 0) + 1;
    // 回合开始：结算持续伤害（灼烧 / 中毒）——每类每回合仅 1 层生效，两类互不干扰
    tickDot(s, b, out, fx);
    // 召唤：每隔数回合 boss 自行疗伤
    if (b.mechanic === 'summon' && b.round > 1 && b.round % 3 === 0 && !b.done) {
      const hl = Math.round(b.hpMax * 0.08);
      b.hp = Math.min(b.hpMax, b.hp + hl);
      out.push('『' + b.name + '』召唤援军，自行疗伤，气血 +' + hl + '。');
    }
    const enemyAtkRoll = function () {
      // 敌方基础伤害 = 攻击力；先结算「削弱」类 debuff（藤蔓术/生机缠绕/山岳镇压）
      let d = b.atk;
      if (b.fxAtkDown.amt > 0) d = Math.round(d * (1 - b.fxAtkDown.amt / 100));
      if (b.slow) { d = Math.round(d * SLOW_MUL); b.slow = false; } // 减速当回合生效后移除
      if (b.guarded) d = Math.round(d * GUARD_ACTION_MUL);          // 「防御」动作：65% 减伤
      if (b.guard > 0) d = Math.round(d * (1 - b.guard));           // 遁术减伤（UI 显示于遁术列表）
      // 护盾类 buff（土气护体/金光护体/岩甲术/大地守护）+ 心法【玄武真经】reduceDmg + 心法 guard：同一通道累加，封顶 90%
      const shield = b.fxDefUp.amt / 100 + getXinfaReduceDmg(s) + getXinfaGuard(s);
      if (shield > 0) d = Math.round(d * (1 - Math.min(0.9, shield)));
      // 防御减伤：统一走 getDefensePct / getDefense / getDefenseDiv（= 面板显示的那份防御）
      const defPct = getDefensePct(s);
      if (defPct > 0) d = Math.round(d * (1 - defPct));
      const defAbs = getDefense(s);
      if (defAbs > 0) d = Math.max(1, d - defAbs);
      const defDiv = getDefenseDiv(s);
      if (defDiv > 0) d = Math.max(1, Math.round(d / (1 + defDiv)));
      return d;
    };
    const counter = function () {
      // 眩晕（土）/ 冻结（水）：敌方被控，本回合无法行动（概率命中，stun 字段）
      if (b.stunNext) {
        b.stunNext = false;
        out.push('『' + b.name + '』身形被控，动弹不得，这一击没能递出。');
        b.guarded = false;
        return;
      }
      // BOSS 施法：掷中 spellChance 则施放法术并跳过本回合普攻（multicast 连击不影响，施法只一次）
      if (bossTryCast(s, b, out, fx)) return;
      const hits = (b.mechanic === 'multicast') ? (2 + (Math.random() < 0.5 ? 1 : 0)) : 1;
      for (let hix = 0; hix < hits; hix++) {
        if (b.done) break;
        const d = enemyAtkRoll();
        // 闪避判定
        const dodgeRate = getDodgeRate(s);
        if (Math.random() < dodgeRate) {
          out.push('你身形灵动，闪避了『' + b.name + '』的攻击！');
          b.guarded = false;
          continue;
        }
        const hpBefore = s.hp;
        s.hp -= d;
        if (s.adv && !s.adv.trial) s.advDmgThisRun = true;
        b.hpLost += d;
        out.push('『' + b.name + '』' + (hits > 1 ? '连击·' + (hix + 1) + '，' : '') + '反手回击，你气血 -' + d + '。');
        fx.push({ side: 'me', kind: 'dmg', amount: hpBefore - s.hp });
        // 吸血魔化：boss 吸取所造成伤害的一半回复自身
        if (b.mechanic === 'lifesteal' && !b.done) {
          const hl = Math.max(1, Math.round(d * 0.5));
          b.hp = Math.min(b.hpMax, b.hp + hl);
          out.push('魔化吸血，『' + b.name + '』气血 +' + hl + '。');
        }
        // 反伤效果（玩家天赋）
        const thorns = getDestinyBonus(s, 'thorns');
        if (thorns > 0) {
          const thornDmg = Math.round(d * thorns);
          b.hp -= thornDmg;
          out.push('反伤效果触发，『' + b.name + '』受到 ' + thornDmg + ' 点反伤。');
          fx.push({ side: 'enemy', kind: 'dmg', amount: thornDmg });
          if (b.hp <= 0) { b.done = true; b.win = true; out.push('『' + b.name + '』被反伤致死。'); }
        }
        // 反击效果
        const counterRate = getCounterRate(s);
        if (Math.random() < counterRate && !b.done) {
          const counterDmg = Math.max(1, s.atk);
          b.hp -= counterDmg;
          out.push('你趁势反击，对『' + b.name + '』造成 ' + counterDmg + ' 点伤害。');
          fx.push({ side: 'enemy', kind: 'dmg', amount: counterDmg });
          if (b.hp <= 0) { b.done = true; b.win = true; out.push('『' + b.name + '』被反击致死。'); }
        }
        if (s.hp <= 0) {
          s.hp = 1;
          b.done = true; b.lost = true;
          if (b.loseLoot) applyOps(s, b.loseLoot);
          out.push('你重伤坠地，勉强捡回一条命。');
          break;
        }
        b.guarded = false;
      }
    };
    // 玩家出招后的 Boss 机制结算（反伤护盾 / 狂暴 / 心魔扰神）
    function applyBossPostStep(dealt) {
      if (!b.done && b.mechanic === 'thorns' && dealt > 0) {
        const rf = Math.max(1, Math.round(dealt * 0.15));
        s.hp -= rf;
        if (s.adv && !s.adv.trial) s.advDmgThisRun = true;
        out.push('反伤护盾震荡，你被弹回 ' + rf + ' 点伤害！');
        fx.push({ side: 'me', kind: 'dmg', amount: rf });
        if (s.hp <= 0) { s.hp = 1; b.done = true; b.lost = true; out.push('你重伤坠地，勉强捡回一条命。'); }
      }
      if (!b.done && b.mechanic === 'enrage' && !b.enraged && b.hp < b.hpMax * 0.5) {
        b.enraged = true;
        const na = Math.round(b.atk * 2);
        out.push('『' + b.name + '』仰天怒吼，气息暴涨，攻击力骤增！');
        b.atk = na;
      }
      // 心魔扰神：概率令你下一次出手落空；命格【万法不侵】controlImmune 完全免疫
      if (!b.done && b.mechanic === SUPPRESS_MECH && !b.suppressed) {
        if (isControlImmune(s)) {
          out.push('心魔低语钻入识海，却被你道心挡在门外。');
        } else if (Math.random() < SUPPRESS_CHANCE) {
          b.suppressed = true;
          out.push('心魔低语钻入识海，你的神智一阵恍惚……');
        }
      }
    }
    // 心魔扰神：上一回合心神被扰，本回合出手落空（先结算敌方回击，再递减增益计时）
    if (b.suppressed) {
      b.suppressed = false;
      out.push('你心神失守，这一击终究没能递出去。');
      if (!b.done) counter();
      tickBattleFx(b);
      refreshStats(s); saveState(s);
      return { done: b.done, win: b.win, lost: b.lost, fled: b.fled, lines: out, fx: fx };
    }
    // 玩家被控（外部施加的眩晕 / 冻结，双向字段）：本回合无法行动，仅招致敌方反击
    if (b.pStunNext) {
      b.pStunNext = false;
      out.push('你身形被控，这一击终究没能递出去。');
      if (!b.done) counter();
      tickBattleFx(b);
      refreshStats(s); saveState(s);
      return { done: b.done, win: b.win, lost: b.lost, fled: b.fled, lines: out, fx: fx };
    }
    if (act === 'flee') {
      if (Math.random() < b.flee) {
        b.done = true; b.fled = true;
        out.push('你身形一晃遁向来路，那『' + b.name + '』追了两步便放弃了。');
      } else {
        out.push('你转身欲走，却被『' + b.name + '』截住退路！');
        counter();
      }
    } else if (act === 'guard') {
      b.guarded = true;
      out.push('你凝神守御，气血护于周身。');
      counter();
    } else if (act === 'spell') {
      let sp = spellId ? TECHNIQUES[spellId] : null;
      if (!sp || sp.cls !== 'shufa') sp = getBestShufa(s);
      if (!sp) return { done: false, lines: ['你并未习得任何法术。'], fx: fx };
      const cost = sp.cost || 0;
      // 灵力不足：无法施展，不扣蓝、不造成伤害，仅招致敌方反击（实装真实法力消耗）
      if (s.mp < cost) {
        out.push('灵力不足，无法施展【' + sp.name + '】（需 ' + cost + ' 灵）。');
        counter();
        tickBattleFx(b);
        return { done: b.done, win: b.win, lost: b.lost, fled: b.fled, lines: out, fx: fx };
      }
      const mpBefore = s.mp;
      s.mp -= cost;
      fx.push({ side: 'me', kind: 'mp', amount: mpBefore - s.mp, el: sp.grade });
      const beforeHp = b.hp;
      // 先结算增益/减益/冰封/回血（土气护体等护盾当回合即可减免敌方回击）
      applySpellFx(s, b, sp, out);
      if (sp.dmg > 0) {
        fx.push({ side: 'enemy', kind: 'spell', el: sp.grade });
        // 仙命【万剑归宗】：无属性（青云剑宗剑法）法术伤害 +noElemSpellMul、暴击 +swordCritRate
        const isSword = (sp.element === '无');
        const noElemMul = isSword ? getDestinyBonus(s, 'noElemSpellMul') : 0;
        const swordCrit = isSword ? getDestinyBonus(s, 'swordCritRate') : 0;
        let dmg = Math.max(2, Math.round(s.atk * sp.dmg * linggenAffinityMul(s, sp.element) * (1 + getXinfaSpellMul(s)) * (1 + noElemMul) * enemyTakenMul(b, sp.element))); // 无随机
        const lines = playerHit(s, b, dmg, '你施展【' + sp.name + '】' + (sp.dmg >= 3 ? '声威震天' : '灵力激荡') + '，对『' + b.name + '』', true, fx, sp.lifesteal || 0, swordCrit);
        lines.forEach(function (l) { out.push(l); });
      } else if (!sp.heal) {
        out.push('你施展【' + sp.name + '】。');
      }
      if (!b.done) counter();
      if (!b.done) applyBossPostStep(b.hpMax === b.hp ? 0 : (beforeHp - b.hp));
    } else {
      const dmg = Math.max(1, Math.round(s.atk * enemyTakenMul(b, null))); // 无随机（普攻无元素，仅受无属性 BOSS 减伤与其护盾影响）
      const beforeHp = b.hp;
      const lines = playerHit(s, b, dmg, '你出手如电，对『' + b.name + '』', true, fx);
      lines.forEach(function (l) { out.push(l); });
      if (!b.done) counter();
      if (!b.done) applyBossPostStep(beforeHp - b.hp);
    }
    tickBattleFx(b);
    if (b.win) {
      const gains = [];
      if (b.loot.stone) {
        let ls = b.loot.stone;
        if (s.talents.indexOf('fuyuan') >= 0) ls = Math.round(ls * 1.10);
        s.stone += ls;
        gains.push('灵石 +' + ls);
      }
      if (b.loot.herb) { if (!s.materials) s.materials = {}; s.materials.herb_huang = (s.materials.herb_huang || 0) + b.loot.herb; gains.push('黄级灵草 +' + b.loot.herb); }
      if (b.loot.iron) { if (!s.materials) s.materials = {}; s.materials.iron_huang = (s.materials.iron_huang || 0) + b.loot.iron; gains.push('黄级灵铁 +' + b.loot.iron); }
      // 分级灵材掉落（loot.herb_xuan / iron_di 等按品级入库）
      if (!s.materials) s.materials = {};
      Object.keys(b.loot).forEach(function (k) {
        if (k === 'herb' || k === 'iron') return;
        if ((k.indexOf('herb_') === 0 || k.indexOf('iron_') === 0) && MATERIALS[k]) {
          s.materials[k] = (s.materials[k] || 0) + b.loot[k];
          gains.push(MATERIALS[k].name + ' +' + b.loot[k]);
        }
      });
      if (b.loot.elixirs) gains.push.apply(gains, applyOps(s, { elixirs: b.loot.elixirs }));
      if (b.loot.tech) gains.push.apply(gains, applyOps(s, { tech: b.loot.tech }));
      if (b.loot.equip) gains.push.apply(gains, applyOps(s, { equip: b.loot.equip }));
      if (b.loot.art) gains.push.apply(gains, applyOps(s, { art: b.loot.art }));
      // 灵物（已改为法宝）不再由战斗结算发放——统一走 advBossBonus 的「秘藏二选一」。
      const extra = {};
      ['atk', 'hpMax', 'wu', 'hp'].forEach(function (k) { if (b.loot[k]) extra[k] = b.loot[k]; });
      if (Object.keys(extra).length) gains.push.apply(gains, applyOps(s, extra));
      b.gains = gains;
      if (s.adv) {
        s.adv.gains.push.apply(s.adv.gains, gains);
        s.adv.gains.push('击破『' + b.name + '』');
        s.exploreKills = (s.exploreKills || 0) + 1; // 秘境探索击败敌人（逃跑不计入），结算时额外换算轮回点
      }
    }
    refreshStats(s);
    saveState(s);
    return { done: b.done, win: b.win, lost: b.lost, fled: b.fled, lines: out, fx: fx };
  }
  // ⚠ 游戏内「跳过战斗 / 自动战斗」功能已于 2026-09 移除（仅支持手动战斗）。
  //    下方 simBattle 仅作为无 UI 的 headless 解析器，供测试 / 调试脚本复用战斗逻辑，
  //    不参与任何游戏内流程。
  function simBattle(s) {
    const out = [];
    const order = (s.battle.spellOrder && s.battle.spellOrder.length)
      ? s.battle.spellOrder
      : (s.battle.spellList || []).map(function (x) { return x.id; });
    const act = function (a, id) {
      const rr = combatAct(s, a, id);
      out.push.apply(out, rr.lines);
      return rr;
    };
    let rr = { done: false, win: false, lost: false, fled: false };
    let i = 0, gi = 0, fleeTries = 0;
    while (!rr.done && gi < 80) {
      if (s.hp <= s.hpMax * 0.2 && fleeTries < 2) { fleeTries++; rr = act('flee'); continue; }
      // 依次尝试施放当前灵力足以支撑的法术
      let casted = false;
      while (i < order.length) {
        const sp = TECHNIQUES[order[i]];
        if (sp && sp.cls === 'shufa' && (sp.cost || 0) <= s.mp) { rr = act('spell', order[i]); i++; casted = true; break; }
        i++;
      }
      if (casted) { gi++; continue; }
      // 灵力不足以施放任何法术，交替守御/普攻
      rr = (gi % 2 === 0) ? act('guard') : act('atk');
      gi++;
    }
    return { done: rr.done, win: rr.win, lost: rr.lost, fled: rr.fled, rounds: Math.ceil(gi / 2), lines: out };
  }

  /* ---------------- 肉鸽冒险（轻肉鸽探索） ---------------- */
  // 秘境一(炼气-筑基): 黄玄级功法
  const TECH_DROPS_1 = ['shengong', 'yuhuo', 'hanshuang', 'xiaoyao', 'changchun', 'leiyin', 'yingdun'];
  // 秘境二(金丹-元婴): 地天级功法
  const TECH_DROPS_2 = ['taixuan', 'hundun', 'jianqi', 'wanjian', 'suodi', 'tiangang'];
  // 按境界索引的功法掉落池
  const TECH_DROPS = [TECH_DROPS_1, TECH_DROPS_1, TECH_DROPS_2, TECH_DROPS_2];
  
  // 获取秘境功法池（法术+心法+遁术）
  function getAdvTechPools(advType) {
    var spellPool = [];  // 法术
    var xinfaPool = [];  // 心法
    var dunshuPool = []; // 遁术
    
    if (advType === 'huang' || advType === 'xuan') {
      spellPool = ['jinren', 'tengman', 'shuidan', 'huoqiu', 'luoshi', 'yuhuo', 'hanshuang', 'leiyin', 'jianqi'];
      xinfaPool = ['jingang', 'qingmu', 'xuanshui', 'chihuo', 'houtu', 'tiangang', 'changchun', 'taiyin', 'chunyang', 'kunyuan'];
      dunshuPool = ['xiaoyao', 'yingdun'];
    } else if (advType === 'di') {
      spellPool = ['jinguang', 'muyuling', 'lieyan', 'luoyan', 'jinguanghu', 'shengji', 'shuilingshu', 'huodun', 'yanjia', 'lie_di', 'shuang_han', 'lie_huo', 'po_e', 'fu_du'];
      xinfaPool = ['gengjin', 'yimu', 'guishui', 'binghuo', 'wutu', 'taixuan'];
      dunshuPool = ['suodi'];
    } else {
      spellPool = ['wanjian', 'shengjiayang', 'tianhuo', 'shanyue', 'potian', 'wanmu', 'fantian', 'dadi', 'han_shan', 'han_yuan', 'fen_hun', 'dang_xie', 'bai_du', 'zhen_yue', 'wan_zai', 'jiu_you', 'fa_zai', 'wan_du'];
      xinfaPool = ['baihu', 'qinglong', 'xuanwu', 'zhuque', 'qilin', 'hundun'];
      dunshuPool = [];
    }
    
    return { spell: spellPool, xinfa: xinfaPool, dunshu: dunshuPool };
  }
  
  // 从功法池中随机获取一个功法。
  // 关键：必须按秘境阶位分层——黄级秘境只出黄阶功法，绝不掉玄阶心法/遁术。
  // （历史 bug：黄/玄共用一份池子，导致黄级匪寨能搜出玄阶的「天罡诀」「影遁术」。）
  function getRandomTechFromPools(advType, s, giOverride) {
    var gi = (giOverride == null) ? (ADVENTURE_GRADE[advType] || 0) : giOverride;
    var pools = getAdvTechPools(advType);
    var allPool = [];
    var push = function (t) {
      var T = TECHNIQUES[t];
      if (!T) return;
      if (s && s.techs && s.techs.indexOf(t) >= 0) return; // 已习得不重复
      if (gradeIdxOf(T.grade) > gi) return;                // 越阶功法不出
      allPool.push(t);
    };
    pools.spell.forEach(push);
    pools.xinfa.forEach(push);
    pools.dunshu.forEach(push);

    if (allPool.length === 0) return null;
    return allPool[Math.floor(Math.random() * allPool.length)];
  }
  /* 统一固定基线敌人生成（v4 模型，所有敌人共用）
     敌人属性 = ENEMY_REALM_BASE[tier].atk/.hp × atkMul/hpMul × JIE_DATA[jie].diff(叠劫)
     玩家自身 atk/hp 不参与缩放 → 命格/装备/天赋的数值优势可真实转化。
     - atkRef:'hp' 时 atk 取基线.hp（旧逻辑以 s.hpMax 为基准的场合）
     - hpRef:'atk' 时 hp 取基线.atk（旧逻辑以 s.atk 为基准的场合） */
  function enemyStats(tier, atkMul, hpMul, jieDiff, opts) {
    const base = (ENEMY_REALM_BASE && ENEMY_REALM_BASE[tier]) ? ENEMY_REALM_BASE[tier] : (ENEMY_REALM_BASE ? ENEMY_REALM_BASE[ENEMY_REALM_BASE.length - 1] : { atk: 10, hp: 180 });
    const jd = jieDiff || 1;
    const o = opts || {};
    const aBase = (o.atkRef === 'hp') ? base.hp : base.atk;
    const hBase = (o.hpRef === 'atk') ? base.atk : base.hp;
    return {
      atk: Math.max(1, Math.round(aBase * atkMul * jd)),
      hp: Math.max(1, Math.round(hBase * hpMul * jd))
    };
  }
  function enemyGen(s, tag, depth, advType) {
    // advType: 'huang', 'xuan', 'di', 'tian'
    const advKey = advType || s.advType || 'huang';
    const advConfig = ADVENTURE_CONFIG[advKey];
    const pool = advConfig.monsters;
    const m = pool[Math.floor(Math.random() * pool.length)];
    const elite = tag === 'elite', boss = tag === 'boss' || tag === 'final';
    const bi = ADVENTURE_GRADE[advKey] || 0;
    const jie = s.jie || 0;
    const jieDiff = JIE_DATA[jie] ? JIE_DATA[jie].diff : 1;
    // ⚠ 深度影响必须 clamp：地图扩到 50 层后，若让 depth 原样进入公式，深层敌人会彻底失控。
    //   故把「有效深度」封顶在 20 层——前 20 层按 0.04/层 的等差系数平缓爬升，更深处只加产出、不加数值压力。
    const ed = Math.min(Math.max(depth || 1, 1), 20);
    // ✅ 固定敌人属性：取自 ENEMY_REALM_BASE[秘境阶位]，按有效深度 + 精英/Boss 系数缩放，
    //    绝不挂钩玩家自身攻/血（旧版「atk←玩家hpMax / hp←玩家atk」被判定为设计失误，已移除）。
    //    深度系数：首层 0.25、每层 +0.04、第 20 层封顶 ≈1.01（0.25 + 19×0.04）—— 开荒到深层的成长更平缓、不陡增。
    const depthFactor = 0.25 + (ed - 1) * 0.04;
    const tierMul = elite ? 1.4 : 1;
    const bossMul = boss ? 2.2 : 1;
    const sc = enemyStats(bi, depthFactor * tierMul * bossMul, depthFactor * tierMul * bossMul, jieDiff);
    const hp = sc.hp, atk = sc.atk;
    const realmM = 1 + bi * 0.6;
    // 灵石掉落（2026-09 下调）：原式 (10 + ed*10) × realmM 在深层/高阶秘境单场可给 500+，
    //   远超同期其它系统（坊市丹药 40、宗门法宝 1000~8000、事件 120~260），把整条经济曲线砸穿。
    //   现改为「低基数 + 半斜率」：(5 + ed*5) × realmM —— 黄级首层 5、天级封顶 20 层 ≈146，
    //   精英 ×1.5 / Boss ×2 的层级关系保留不变。
    const loot = { stone: Math.round((5 + ed * 5) * realmM * (elite ? 1.5 : 1) * (boss ? 2 : 1)) };
    // 产出对应等级灵材
    const herbKey = advConfig.drops.herb;
    const ironKey = advConfig.drops.iron;
    if (Math.random() < 0.3 + ed * 0.08) loot[herbKey] = 1 + Math.floor(Math.random() * (1 + ed));
    if (Math.random() < 0.25 + ed * 0.06) loot[ironKey] = 1 + Math.floor(Math.random() * 2);
    // 功法掉落按秘境等级（从三池随机）
    if ((boss || tag === 'final') && Math.random() < 0.8) {
      const tech = getRandomTechFromPools(advKey, s);
      if (tech) loot.tech = tech;
    } else if (elite && Math.random() < 0.4) {
      const tech = getRandomTechFromPools(advKey, s);
      if (tech) loot.tech = tech;
    }
    // 装备掉落按秘境等级（总掉率见顶部 EQUIP_DROP_* 常量：杂兵 p=min(0.30, ed×0.02)，首层 2%→15 层封顶 30%，Boss 60%）
    if (Math.random() < (boss ? EQUIP_DROP_BOSS : Math.min(EQUIP_DROP_CAP, ed * EQUIP_DROP_PER_DEPTH))) loot.equip = randomEquip(bi, ed + (boss ? 2 : 0));
    // 灵物掉落（2026-09-13 改制：BOSS 不再自动掉灵物）
    //   旧版在这里给 Boss 白送一件灵物，玩家通关后再在「秘藏二选一」里选法宝，
    //   结果一屏同时蹦出「获得灵物【上品灵晶】」+「获得法宝【寻矿罗盘】」，白赚两件。
    //   现灵物即法宝，唯一入口是 advBossBonus() 的「秘藏二选一」选项一（未持有时必出）。
    const bname = (tag === 'final') ? advConfig.boss.name : (boss ? advConfig.boss.name : m.name);
    const bline = (tag === 'final') ? advConfig.boss.line : (boss ? advConfig.boss.line : m.line);
    // 敌人立绘：BOSS 走 boss_<阶位>；杂兵/精英按 ADVENTURE_CONFIG.foeArt 分层，缺省回落通用 'foe'
    const foeArt = (advConfig.foeArt && advConfig.foeArt[elite ? 'elite' : 'combat']) || null;
    const portrait = (boss || tag === 'final') ? ('boss_' + advKey) : (foeArt || 'foe');
    const mechanic = (boss || tag === 'final') ? (advConfig.boss.mechanic || null) : null;
    return { name: bname, line: bline, atk: atk, hp: hp, loot: loot, bi: bi, dunSpeed: bi + 1, portrait: portrait, mechanic: mechanic, noFlee: (boss || tag === 'final') };
  }
  /* 死劫敌人生成（v4 重做：固定境界基准 × 递增系数 × 叠劫难度，不再随玩家自身攻/血缩放）
     敌人属性 = ENEMY_REALM_BASE[DEATH_IDX_REALM[idx]] × DEATH_SCALES[idx] × JIE_DATA[s.jie].diff
     玩家自身 atk/hp 不参与缩放 → 命格/装备/天赋的数值优势可真实转化为通过率 */
  function deathEnemyGen(s, idx) {
    const sc = (DEATH_SCALES && DEATH_SCALES[idx]) ? DEATH_SCALES[idx] : (DEATH_SCALES ? DEATH_SCALES[DEATH_SCALES.length - 1] : { atkMul: 1, hpMul: 1 });
    const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
    return enemyStats(DEATH_IDX_REALM[idx], sc.atkMul, sc.hpMul, jd);
  }
  function getAdvItemCap(s) { return s.advCap || 2; }
  function moveItemsToAdv(s, items) {
    if (!s.adv.items) s.adv.items = [];
    const cap = getAdvItemCap(s);
    let total = s.adv.items.reduce(function (a, x) { return a + x.count; }, 0);
    (items || []).forEach(function (it) {
      if (total >= cap) return;
      const el = ELIXIRS[it.id];
      if (!el || !el.usableInAdv) return;
      const have = s.elixirs[it.id] || 0;
      const want = Math.min(have, it.count, cap - total);
      if (want <= 0) return;
      s.elixirs[it.id] -= want;
      if (s.elixirs[it.id] <= 0) delete s.elixirs[it.id];
      const ex = s.adv.items.find(function (x) { return x.id === it.id; });
      if (ex) ex.count += want; else s.adv.items.push({ id: it.id, count: want });
      total += want;
    });
  }
  function returnUnusedAdvItems(s) {
    if (!s.adv || !s.adv.items) return;
    s.adv.items.forEach(function (it) { s.elixirs[it.id] = (s.elixirs[it.id] || 0) + it.count; });
    s.adv.items = [];
  }
  /* ---------------- 秘境连锁解锁（境界 或 通关上一级） ---------------- */
  const ADV_ORDER = ['huang', 'xuan', 'di', 'tian', 'xian'];
  function advPrev(key) {
    const i = ADV_ORDER.indexOf(key);
    return (i > 0) ? ADV_ORDER[i - 1] : null;
  }
  // 通关记录持久于 s.flags.advClear[key]；随 flags 存档持久，转世重开清空（不随轮回保留）
  function advCleared(s, key) {
    return !!(s.flags && s.flags.advClear && s.flags.advClear[key]);
  }
  function markAdvClear(s, key, info) {
    if (!s.flags) s.flags = {};
    if (!s.flags.advClear) s.flags.advClear = {};
    s.flags.advClear[key] = true;
    // 秘境之主战绩追踪（仅正式秘境，试炼不计入）
    if (info) {
      if (!s.bossKills) s.bossKills = {};
      if (!s.bossMech) s.bossMech = {};
      s.bossKills[key] = true;
      if (info.mechanic) s.bossMech[key] = info.mechanic;
      if (typeof s.idx === 'number' && typeof info.bi === 'number' && s.idx < info.bi - 1) s.weakBossWin = true;
      // 无伤通关统计
      if (s.advDmgThisRun === false) s.advNoDmgCount = (s.advNoDmgCount || 0) + 1;
    }
    saveState(s);
    return true;
  }
  // 双通道：境界达标(realmReq) 或 上一级已通关。黄级 realmReq=0 恒开。
  function advUnlocked(s, key) {
    const cfg = ADVENTURE_CONFIG[key];
    if (!cfg) return false;
    if (bigIdxOf(s) >= cfg.realmReq) return true;
    const prev = advPrev(key);
    return !!prev && advCleared(s, prev);
  }
  // 已通关的下一级（供通关结算提示用）
  function advNextOf(key) {
    const i = ADV_ORDER.indexOf(key);
    return (i >= 0 && i < ADV_ORDER.length - 1) ? ADV_ORDER[i + 1] : null;
  }
  function startAdventure(s, advType, opts) {
    opts = opts || {};
    const ap = (opts.ap === 3) ? 3 : 2;
    if (s.adventuredYear === s.year) return { ok: false, msg: '天地灵机有限，一年只能入秘境一次。' };
    if (!canAction(s, ap)) return { ok: false, msg: '行动点不足' };
    // 秘境类型限制
    const advKey = advType || 'huang';
    const advConfig = ADVENTURE_CONFIG[advKey];
    if (!advConfig) return { ok: false, msg: '秘境不存在' };
    // 双通道解锁：境界达标 或 已通关上一级；仙级另须事件现身
    if (!advUnlocked(s, advKey)) {
      const prev = advPrev(advKey);
      const reason = prev ? ('需' + BIG_REALMS[advConfig.realmReq] + '以上，或先通关【' + ADVENTURE_CONFIG[prev].name + '】秘境') : ('修为不足，需要' + BIG_REALMS[advConfig.realmReq] + '以上方可进入。');
      return { ok: false, msg: reason };
    }
    if (advKey === 'xian' && !isXianAdventureAvailable(s)) return { ok: false, msg: '遗世仙踪须逢甲子之期方现世（每十年）。（须元婴 + 通关天级可直入）' };
    spend(s, ap);
    s.adventuredYear = s.year;
    s.advType = advKey;
    const map = genAdvMap(advKey);
    const settings = ADV_SETTINGS_MAP[advKey] || ADV_SETTINGS_HUANG;
    // 体力预算：地图 50 层（每步 5 体力），单次秘境绝无可能走到底——
    // 体力是「能探多深」的硬预算，剩余深度只能靠折寿强搜/强行前行去换。
    // 探索度满 100%（约 12 层）时秘境之主即现身，可在任意深度直取决战。
    const staminaMax = (ap === 3) ? 150 : 110;
    s.adv = {
      grade: advKey,
      depth: 1, maxDepth: map.normalCols,
      setting: settings[Math.floor(Math.random() * settings.length)],
      gains: [], status: 'running', caught: false, done: false,
      apSpent: ap, stamina: staminaMax, staminaMax: staminaMax,
      explore: 0, exploreMax: 100, // 探索度：满 100% 方可直面秘境之主
      forceN: 0, // 本秘境折寿强搜次数：代价等比递增 1/2/4/8 年
      map: map, nodeId: map.startId, items: [], itemsUsed: 0, cleared: false
    };
    if (map.byId[map.startId]) map.byId[map.startId].visited = true;
    // 进入秘境：灵力（法术资源）直接回满；气血沿用进入时的状态（每场战斗前 +10%，见 combatStart）
    //   —— 历史 bug：旧版「沿用进入时的灵力」，若在俗世把蓝耗掉再入秘境，首战前只 +75%，
    //      导致「初入秘境灵力条不满、法术开局放不出来」。灵力是战斗资源，跨场景不该带亏损。
    refreshStats(s);
    s.mp = s.mpMax;
    moveItemsToAdv(s, opts.items);
    saveState(s);
    return { ok: true };
  }
  /* ---------------- 试炼路线（入宗考验 / 死劫 复用秘境横版 DAG 逻辑） ----------------
   * 路线节点仅含【敌人 combat / 精英 elite / 静室 rest】，最终收束为大 BOSS。
   * kind: 'sect'（入宗考验，boss 按境界缩放） | 'death'（死劫，boss 按死劫缩放） */
  function startTrial(s, kind, opts) {
    opts = opts || {};
    if (kind === 'sect') { s.hp = s.hpMax; s.mp = s.mpMax; } // 入宗试炼前回满血蓝
    // 劫境主题：死劫 / 渡劫 / 隐藏线 各自提供 地图列数、节点池、环境文案
    let theme = null, title = opts.title || '';
    if (kind === 'death') {
      const ev = DEATH_EVENTS[opts.deathIdx || 0];
      theme = (ev && ev.trial) || null;
      if (!title) title = '死劫 · ' + ((theme && theme.name) || '试炼之路');
    } else if (kind === 'hidden') {
      theme = HIDDEN_BOSS.trial;
      if (!title) title = '轮回之外 · ' + (theme.name || '魔祖仙帝');
    } else if (kind === 'trib') {
      const t = TRIB_TRIALS[opts.trib] || null;
      theme = t ? { name: t.title, cols: t.cols, types: t.types, settings: (TRIB_STAGE_SETTINGS[opts.stage] || []) } : null;
      if (!title) title = (t ? t.title : '渡劫') + ' · ' + tribStageName(opts.stage);
    }
    const cols = (theme && theme.cols) || 5;
    const types = (theme && theme.types) || ['combat', 'elite', 'rest'];
    const map = genAdvMap('trial', { types: types, cols: cols });
    const settings = (theme && theme.settings && theme.settings.length) ? theme.settings : [
      '试炼之地，杀机暗藏，唯有向前。',
      '风声鹤唳，似有强敌环伺于前。',
      '道旁静室可暂歇，前方大敌已候多时。'
    ];
    const staminaMax = (theme && theme.stamina) || ((cols + 5) * 5);
    s.advType = 'trial';
    s.adv = {
      grade: 'trial', trial: kind,
      trialTitle: title || (kind === 'sect' ? '入宗试炼' : '试炼'),
      depth: 1, maxDepth: map.normalCols,
      setting: settings[Math.floor(Math.random() * settings.length)],
      gains: [], status: 'running', caught: false, done: false,
      apSpent: 0, stamina: staminaMax, staminaMax: staminaMax,
      explore: 0, exploreMax: 1, // 试炼：boss 始终可达，无需探索度门槛
      forceN: 0, // 本秘境折寿强搜次数：代价等比递增 1/2/4/8 年
      map: map, nodeId: map.startId, items: [], itemsUsed: 0, cleared: false,
      deathIdx: (opts.deathIdx != null ? opts.deathIdx : 0),
      trib: opts.trib || null, stage: opts.stage || null
    };
    if (map.byId[map.startId]) map.byId[map.startId].visited = true;
    if (kind === 'death') s.adv.trialBoss = trialBossDeath(s, s.adv.deathIdx);
    else if (kind === 'hidden') s.adv.trialBoss = trialBossHidden(s);
    else if (kind === 'trib') s.adv.trialBoss = trialBossTrib(s, opts.stage);
    else s.adv.trialBoss = trialBossSect(s);
    if (kind === 'death' && opts.dev) s.adv.trialDev = opts.dev;
    refreshStats(s); saveState(s);
    return { ok: true };
  }
  // 渡劫各段的环境文案
  const TRIB_STAGE_SETTINGS = {
    xinmo: [
      '你站在一片没有边际的水面上。水底下是你自己。',
      '四周都是你认得的人，他们说着你最怕听见的话。',
      '这里是你的识海。心魔不需要造场景，它翻一翻你的记忆就够了。'
    ],
    tianjie: [
      '劫云压到头顶，雷光在云层里来回攒动，像有什么东西正在成形。',
      '脚下的山石已经被雷火烤成了琉璃色。',
      '天劫不言语。它只是落下。'
    ],
    guard: [
      '白玉京的九重天阶在云中若隐若现，每一级台阶上都刻着一个飞升者的名字。',
      '天门前，一名执戟守卫站了不知多少万年。',
      '他拦下的，从来不是修为不够的人。'
    ],
    feisheng: [
      '天门开了。门后没有仙宫，没有霞光，只有一片沉默的黑影。',
      '你听见有人在问你一个问题——用的却是你自己的声音。',
      '最后一关。过去了，世上再无你的名字。'
    ]
  };
  function tribStageName(stage) {
    const b = TRIB_BOSSES[stage];
    return b ? b.name : '劫境';
  }
  function trialBossSect(s) {
    const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
    // 入宗考验：玩家约练气后期（攻60~130/血500~900），锚定炼气基线(0)。
    // 系数 0.5/0.8 → 攻86/血880：有挑战但可过（弱练气约5成、中强练气稳过）。
    const st = enemyStats(0, 0.5, 0.8, jd);
    return { name: '演武教头', line: '演武场上，一名须发皆白的老教头横矛而立：「入我门墙，先过老夫这关！」', atk: st.atk, hp: st.hp, loot: {}, bi: 0, dunSpeed: 1, portrait: 'foe', mechanic: null, noFlee: true };
  }
  function trialBossDeath(s, idx) {
    const ev = DEATH_EVENTS[idx] || {};
    const sc = (DEATH_SCALES && DEATH_SCALES[idx]) ? DEATH_SCALES[idx] : (DEATH_SCALES ? DEATH_SCALES[DEATH_SCALES.length - 1] : { atkMul: 1, hpMul: 1 });
    const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
    // 死劫BOSS 在原缩放基础上 ×1.15（旧模型的终局加成），其余与死劫杂兵同基线
    const st = enemyStats(DEATH_IDX_REALM[idx], sc.atkMul * 1.15, sc.hpMul * 1.15, jd);
    const b = ev.boss || {};
    const name = (b.name) || ((ev.fight && ev.fight.name) ? ev.fight.name : '死劫之主');
    const taunt = (b.taunt && b.taunt.length) ? b.taunt[Math.floor(Math.random() * b.taunt.length)] : '';
    return {
      name: name, title: b.title || '', portrait: b.portrait || 'boss',
      line: (b.intro ? (b.intro + '\n' + (b.line || '')) : (b.line || '生死一线，大劫当前，一道恐怖的身影自虚空中浮现。')),
      taunt: taunt, mechanic: b.mechanic || null,
      atk: st.atk, hp: st.hp, loot: {}, bi: 0, dunSpeed: 1, jieIdx: idx, noFlee: true
    };
  }
  // 隐藏线 BOSS：魔祖仙帝（解锁：难度系数 s.jie >= 6）
  function trialBossHidden(s) {
    const sc = (HIDDEN_BOSS && HIDDEN_BOSS.scale) || { realm: 3, atkMul: 1.9, hpMul: 6.5 };
    const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
    const st = enemyStats(sc.realm, sc.atkMul * 1.15, sc.hpMul * 1.15, jd);
    const b = HIDDEN_BOSS.boss || {};
    const taunt = (b.taunt && b.taunt.length) ? b.taunt[Math.floor(Math.random() * b.taunt.length)] : '';
    return {
      name: b.name || '魔祖仙帝', title: b.title || '', portrait: b.portrait || 'boss_xian',
      line: (b.intro ? (b.intro + '\n' + (b.line || '')) : (b.line || '轮回之外，唯一之敌。')),
      taunt: taunt, mechanic: b.mechanic || 'multicast',
      atk: st.atk, hp: st.hp, loot: {}, bi: 3, dunSpeed: 2, hidden: true, noFlee: true
    };
  }
  // 渡劫「劫身」角色卡（心魔 / 天劫 / 仙界守卫 / 飞升天劫）
  function trialBossTrib(s, stage) {
    const b = TRIB_BOSSES[stage] || TRIB_BOSSES.xinmo;
    let spec;
    if (stage === 'xinmo') spec = xinmoSpec(s);
    else if (stage === 'guard') {
      const bi = bigIdxOf(s);
      const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
      const st = enemyStats(bi, 1.15, 1.05, jd);
      spec = { name: b.name, line: b.line, atk: st.atk, hp: st.hp, loot: {}, bi: bi, dunSpeed: (s.dunSpeed || 1) + 1, noFlee: true };
    } else if (stage === 'feisheng') {
      const bi = bigIdxOf(s);
      const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
      const st = enemyStats(bi, 1.25, 1.10, jd);
      spec = { name: b.name, line: b.line, atk: st.atk, hp: st.hp, loot: {}, bi: bi, dunSpeed: (s.dunSpeed || 1) + 2, dujie: true, noFlee: true };
    } else spec = tianjieSpec(s, '元婴');
    const taunt = (b.taunt && b.taunt.length) ? b.taunt[Math.floor(Math.random() * b.taunt.length)] : '';
    return Object.assign({}, spec, {
      title: b.title || '', portrait: b.portrait || 'boss',
      taunt: taunt, mechanic: b.mechanic || null,
      name: b.name || spec.name, line: (b.intro ? (b.intro + '\n' + (b.line || spec.line)) : (b.line || spec.line)),
      tribStage: stage
    });
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function advGenLayer(s) {
    const d = s.adv.depth;
    if (d >= s.adv.maxDepth + 1) return { final: true };
    const pool = [];
    const add = function (t, n) { for (let i = 0; i < n; i++) pool.push(t); };
    add('combat', 5);
    add('treasure', 1);
    add('elite', d >= 2 ? 2 : 0);
    add('herb', 2);
    add('iron', 1);
    add('shop', 3);
    add('event', 1);
    shuffle(pool);
    const picks = [];
    pool.forEach(function (t) {
      if (picks.length >= 3) return;
      if (picks.indexOf(t) < 0) picks.push(t);
    });
    if (picks.length < 3) {
      ['combat', 'treasure', 'herb'].forEach(function (t) { if (picks.length < 3 && picks.indexOf(t) < 0) picks.push(t); });
    }
    if (picks.indexOf('iron') < 0 && picks.length > 0 && (d === 2 || Math.random() < 0.35)) picks[picks.length - 1] = 'iron';
    return { final: false, choices: picks.map(function (t) {
      return { type: t, name: ADV_NODES[t].name, icon: ADV_NODES[t].icon, desc: ADV_NODES[t].desc };
    }) };
  }
  function advResolve(s, node) {
    if (node && node.col != null) s.adv.depth = node.col + 1;
    // 经历节点即积累探索度（Boss 节点本身不计入）
    if (node && node.type && node.type !== 'final') {
      const eg = ADV_EXPLORE_GAIN[node.type] || 0;
      if (eg) addExplore(s, eg);
    }
    const d = s.adv.depth, bi = bigIdxOf(s), realmM = 1 + bi * 0.5;
    const advType = s.advType || 'huang';
    const gi = ADVENTURE_GRADE[advType] || 0; // 秘境等级决定灵材品级（与玩家境界无关）
    if (node.type === 'rest') return { type: 'rest' };
    if (node.type === 'explore') return { type: 'explore' };
    // —— 劫境专属节点 ——
    if (node.type === 'hazard') {
      const lines = [];
      if (Math.random() < 0.55) {
        const lose = Math.max(1, Math.round(s.hpMax * 0.08));
        s.hp = Math.max(1, s.hp - lose);
        const g = Math.round(requireNeed(s) * 0.05);
        s.qi = Math.min(requireNeed(s), s.qi + g);
        lines.push('暗处的机关擦着你的肋下划过——血是热的，痛是真的。');
        lines.push('（气血 -' + lose + '，修为 +' + g + '：险地砺心，痛过才长记性。）');
      } else {
        const g = Math.round(requireNeed(s) * 0.04);
        s.qi = Math.min(requireNeed(s), s.qi + g);
        lines.push('你提前半步听见了机括的响动，侧身让过。');
        lines.push('（修为 +' + g + '：这一劫境的凶险，你摸清了一分。）');
      }
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: lines };
    }
    if (node.type === 'altar') {
      const lines = ['一座不知年月的祭坛。坛面凹下去一块，像是专门等着放点什么进去。'];
      const roll = Math.random();
      if (roll < 0.34) {
        const lose = Math.max(1, Math.round(s.hpMax * 0.2));
        s.hp = Math.max(1, s.hp - lose);
        s.dao += 1; s.wu += 0.5;
        lines.push('你割开掌心，把血按在坛面上。');
        lines.push('（气血 -' + lose + '，道心 +1，悟性 +0.5：血祭换来的清明，最是刻骨。）');
      } else if (roll < 0.67 && (s.stone || 0) >= 80) {
        s.stone -= 80;
        s.hp = Math.min(s.hpMax, s.hp + Math.round(s.hpMax * 0.45));
        lines.push('你倾出八十灵石，灵石在坛上化为一蓬清光，沁入四肢百骸。');
        lines.push('（灵石 -80，气血大幅回复：钱能买命，买不了道。）');
      } else {
        s.lifeMax -= 2;
        s.hp = Math.min(s.hpMax, s.hp + Math.round(s.hpMax * 0.3));
        s.extraAtk = (s.extraAtk || 0) + 3;
        lines.push('你咬破舌尖，将两年寿元抹进坛中。');
        lines.push('（寿元 -2 年，攻击 +3，气血回复三成：这笔买卖，你自己都觉得疯。）');
      }
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: lines };
    }
    if (node.type === 'combat') {
      return { type: 'battle', spec: enemyGen(s, 'combat', d, advType), title: '遭遇战！' };
    }
    if (node.type === 'elite') {
      return { type: 'battle', spec: enemyGen(s, 'elite', d, advType), title: '精英拦路！', eliteReward: true };
    }
    if (node.type === 'final') {
      return { type: 'final', spec: enemyGen(s, 'final', Math.min(d + 1, 7), advType) };
    }
    if (node.type === 'treasure') {
      const g = [];
      const lines = ['宝箱缓缓开启，尘埃落定——'];
      // 装备/功法/灵材
      if (!s.materials) s.materials = {};
      const roll = Math.random();
      if (roll < 0.30) {
        // 装备
        const equipTier = advType === 'xian' ? 4 : bi;
        const equip = randomEquip(equipTier, d);
        if (equip) { g.push.apply(g, grantEquipChecked(s, equip)); }
        else { const s1 = Math.round((25 + d * 18) * realmM); s.stone += s1; g.push('灵石 +' + s1); }
      } else if (roll < 0.55) {
        // 功法（从三池随机）
        const tech = getRandomTechFromPools(advType, s);
        if (tech) {
          g.push.apply(g, applyOps(s, { tech: tech }));
        } else {
          const s1 = Math.round((25 + d * 18) * realmM); s.stone += s1; g.push('灵石 +' + s1);
        }
      } else if (roll < 0.75) {
        // 灵材（按秘境等级给品级，低级秘境可刷低级灵材）
        const matType = Math.random() < 0.5 ? 'herb' : 'iron';
        const matKey = matType === 'herb' ?
          ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'][gi] || 'herb_huang' :
          ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'][gi] || 'iron_huang';
        const amount = 5 + d * 3;
        s.materials[matKey] = (s.materials[matKey] || 0) + amount;
        g.push(MATERIALS[matKey].name + ' +' + amount);
      } else {
        // 灵石
        const s1 = Math.round((30 + d * 20) * realmM);
        s.stone += s1;
        g.push('灵石 +' + s1);
      }
      s.adv.gains.push.apply(s.adv.gains, g);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: lines.concat(g) };
    }
    if (node.type === 'herb') {
      if (!s.materials) s.materials = {};
      const h = 2 + d + Math.floor(Math.random() * (gi + 1));
      const herbGrades = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'];
      const herbKey = herbGrades[gi] || 'herb_huang';
      s.materials[herbKey] = (s.materials[herbKey] || 0) + h;
      s.adv.gains.push(MATERIALS[herbKey].name + ' +' + h);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: ['你小心拨开草叶，将年份最足的灵草一株株采下。', MATERIALS[herbKey].name + ' +' + h] };
    }
    if (node.type === 'iron') {
      if (!s.materials) s.materials = {};
      const i2 = 3 + d + (Math.random() < 0.25 ? 2 : 0);
      const ironGrades = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
      const ironKey = ironGrades[gi] || 'iron_huang';
      s.materials[ironKey] = (s.materials[ironKey] || 0) + i2;
      s.adv.gains.push(MATERIALS[ironKey].name + ' +' + i2);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: ['矿脉露出地表，半截石壁闪着金属光泽。你抡起矿镐，凿下一块块坚硬的灵铁。', MATERIALS[ironKey].name + ' +' + i2] };
    }
    if (node.type === 'shop') {
      return { type: 'shop', stock: shopStock(s) };
    }
    if (node.type === 'event') {
      // 遇到昔日修士残魂
      return genRemnantSoulEvent(s, d, bi, advType);
    }
    return { type: 'plain', lines: ['你环顾四周，空无一物——正好歇歇脚。'] };
  }
  
  // 残魂事件生成
  function genRemnantSoulEvent(s, d, bi, advType) {
    // 根据秘境等级选择可学习的功法
    var spellPool = [];  // 法术
    var xinfaPool = [];  // 心法
    var dunshuPool = []; // 遁术
    
    if (advType === 'huang' || advType === 'xuan') {
      spellPool = ['jinren', 'tengman', 'shuidan', 'huoqiu', 'luoshi', 'yuhuo', 'hanshuang', 'leiyin', 'jianqi'];
      xinfaPool = ['jingang', 'qingmu', 'xuanshui', 'chihuo', 'houtu', 'tiangang', 'changchun', 'taiyin', 'chunyang', 'kunyuan'];
      dunshuPool = ['xiaoyao', 'yingdun'];
    } else if (advType === 'di') {
      spellPool = ['jinguang', 'muyuling', 'lieyan', 'luoyan', 'jinguanghu', 'shengji', 'shuilingshu', 'huodun', 'yanjia', 'lie_di', 'shuang_han', 'lie_huo', 'po_e', 'fu_du'];
      xinfaPool = ['gengjin', 'yimu', 'guishui', 'binghuo', 'wutu', 'taixuan'];
      dunshuPool = ['suodi'];
    } else {
      spellPool = ['wanjian', 'shengjiayang', 'tianhuo', 'shanyue', 'potian', 'wanmu', 'fantian', 'dadi', 'han_shan', 'han_yuan', 'fen_hun', 'dang_xie', 'bai_du', 'zhen_yue', 'wan_zai', 'jiu_you', 'fa_zai', 'wan_du'];
      xinfaPool = ['baihu', 'qinglong', 'xuanwu', 'zhuque', 'qilin', 'hundun'];
      dunshuPool = [];
    }
    
    // 过滤掉玩家已有的功法
    spellPool = spellPool.filter(function(t) { return TECHNIQUES[t] && s.techs.indexOf(t) < 0; });
    xinfaPool = xinfaPool.filter(function(t) { return TECHNIQUES[t] && s.techs.indexOf(t) < 0; });
    dunshuPool = dunshuPool.filter(function(t) { return TECHNIQUES[t] && s.techs.indexOf(t) < 0; });
    
    // 合并所有可用功法
    var allPool = [];
    spellPool.forEach(function(t) { allPool.push({ id: t, type: '法术' }); });
    xinfaPool.forEach(function(t) { allPool.push({ id: t, type: '心法' }); });
    dunshuPool.forEach(function(t) { allPool.push({ id: t, type: '遁术' }); });
    
    if (allPool.length < 2) {
      return { type: 'plain', lines: ['迷雾散去，空无一物。你摇了摇头，继续前行。'] };
    }
    
    // 随机选择2个功法（不同类型优先）
    var shuffled = allPool.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    
    // 确保选择的两个功法类型不同
    var pick1 = shuffled[0];
    var pick2 = shuffled[1];
    for (var k = 2; k < shuffled.length; k++) {
      if (pick2.type === pick1.type) {
        pick2 = shuffled[k];
      } else {
        break;
      }
    }
    
    return {
      type: 'remnant_soul',
      spell1: pick1.id,
      spell2: pick2.id,
      lines: [
        '迷雾深处，一道虚幻的身影盘坐于石台之上。',
        '那是一位昔日修士的残魂，周身灵光黯淡，却仍保持着生前的威严。',
        '他缓缓睁开眼，望向你：',
        '"后来者……吾乃此间洞府旧主，坐化于此已有千年。"',
        '"吾生前精研法术，今将毕生所学留待有缘。"',
        '"你可择一功法修炼，若欲多学，便需通过吾之考验。"'
      ]
    };
  }
  
  // 残魂事件处理
  function advResolveRemnantSoul(spell1, spell2) {
    var t1 = TECHNIQUES[spell1];
    var t2 = TECHNIQUES[spell2];
    return showChapter('残魂传承', [
      '迷雾深处，一道虚幻的身影盘坐于石台之上。',
      '那是一位昔日修士的残魂，周身灵光黯淡，却仍保持着生前的威严。',
      '他缓缓睁开眼，望向你：',
      '"后来者……吾乃此间洞府旧主，坐化于此已有千年。"',
      '"吾生前精研法术，今将毕生所学留待有缘。"',
      '"你可择一法术修炼，若欲多学，便需通过吾之考验。"'
    ], {
      subtitle: '残魂传承',
      choices: [
        { t: '修炼【' + t1.name + '】\n' + t1.desc + '\n威力 ' + t1.dmg + '× 攻击', spell: spell1, lines: ['你盘膝而坐，静心感悟残魂传授的法诀。', '一道灵光自残魂指尖飞出，没入你的眉心——', '【' + t1.name + '】已习得！'] },
        { t: '修炼【' + t2.name + '】\n' + t2.desc + '\n威力 ' + t2.dmg + '× 攻击', spell: spell2, lines: ['你盘膝而坐，静心感悟残魂传授的法诀。', '一道灵光自残魂指尖飞出，没入你的眉心——', '【' + t2.name + '】已习得！'] },
        { t: '两种都想学\n挑战残魂的考验', fight: true, spell1: spell1, spell2: spell2, lines: ['残魂微微点头："贪心，但有胆识。"', '"那就让老夫试试，你是否有这个资格。"', '残魂缓缓站起，周身灵光骤然暴涨！'] },
        { t: '婉言谢绝\n继续前行', lines: ['你拱手一礼："前辈好意，晚辈心领。"', '残魂叹道："也罢，缘法不可强求。"', '身影渐渐消散于迷雾之中。'] }
      ]
    });
  }
  function advAdvance(s) {
    const a = s.adv;
    if (a && a.map && a.map.byId[a.nodeId]) a.depth = a.map.byId[a.nodeId].col + 1;
    saveState(s);
    return !!(a && a.done);
  }
  function advEnd(s, why) {
    // 随身丹药是「本次秘境」的消耗品：未用完的随此行消散，不带回储物袋。
    // （出发前已无「携带丹药」环节，丹药一律由秘境内的荒野坊市购得。）
    if (s.adv && s.adv.items) s.adv.items = [];
    s.adv.status = 'done';
    s.adv.done = true;
    if (why !== 'lost' && why !== 'forced') {
      // 非战败/非强行撤离时，不应残留上一次战败的 lostMsg，避免结算弹窗里误显扣减
      s.adv.lostMsg = '';
    }
    if (why === 'lost') {
      const ls = Math.floor(s.stone / 2);
      s.stone -= ls;
      const lostParts = ['灵石 -' + ls];
      if (!s.materials) s.materials = {};
      [['herb', ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'], '灵草'],
       ['iron', ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'], '灵铁']].forEach(function (pair) {
        var kind = pair[0], order = pair[1], cname = pair[2];
        var total = order.reduce(function (a, k) { return a + (s.materials[k] || 0); }, 0);
        var n = Math.floor(total / 3);
        var remaining = n;
        for (var i = 0; i < order.length && remaining > 0; i++) {
          var have = s.materials[order[i]] || 0;
          var deduct = Math.min(have, remaining);
          if (deduct > 0) { s.materials[order[i]] -= deduct; remaining -= deduct; }
        }
        if (n > 0) lostParts.push(cname + ' -' + n);
      });
      s.adv.lostMsg = '劫后余生：' + lostParts.join('，') + '。';
    } else if (why === 'forced') {
      // 【强行撤离】：仓促遁走，半数收获散落途中——灵石 / 灵草 / 灵铁各失 50%。
      // （仅「静室撤离」与「战败后胜BOSS」才是完整收货；其余中途撤离一律走此惩罚。）
      if (!s.materials) s.materials = {};
      const ls = Math.floor(s.stone / 2);
      s.stone -= ls;
      const lostParts = ['灵石 -' + ls];
      [['herb', ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'], '灵草'],
       ['iron', ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'], '灵铁']].forEach(function (pair) {
        var order = pair[1], cname = pair[2];
        var total = order.reduce(function (a, k) { return a + (s.materials[k] || 0); }, 0);
        var n = Math.floor(total / 2);
        var remaining = n;
        for (var i = 0; i < order.length && remaining > 0; i++) {
          var have = s.materials[order[i]] || 0;
          var deduct = Math.min(have, remaining);
          if (deduct > 0) { s.materials[order[i]] -= deduct; remaining -= deduct; }
        }
        if (n > 0) lostParts.push(cname + ' -' + n);
      });
      s.adv.lostMsg = '强行撤离：' + lostParts.join('，') + '（半数收获散落途中）。';
    }
    refreshStats(s); saveState(s);
  }
  /* ---------------- 秘境地图推进（横版路径） ---------------- */
  function advNextChoices(s) {
    const a = s.adv;
    if (!a || a.done) return [];
    const node = a.map && a.map.byId[a.nodeId];
    if (!node) return [];
    const out = node.next.map(function (id) {
      const n = a.map.byId[id];
      const meta = ADV_NODES[n.type] || { name: n.type, icon: '?', desc: '' };
      return { id: id, type: n.type, name: meta.name, icon: meta.icon, desc: meta.desc, col: n.col, isBoss: n.type === 'final' };
    });
    // 探索度满 100% → 秘境之主现身：此时不论身处第几层，都可直取决战。
    // （地图扩到 50 层后，Boss 若仍锁死在最后一层，会出现「探索度早已拉满、却还要再走三十层」的荒谬感。）
    if (!a.trial && a.nodeId !== 'boss' && advCanFightBoss(s)
        && !out.some(function (x) { return x.id === 'boss'; })) {
      out.push({
        id: 'boss', type: 'final', name: '洞天决战', icon: '☠',
        desc: '探索度已满，秘境之主的气息再无遮掩。', col: (a.map.normalCols || 99),
        isBoss: true, revealed: true
      });
    }
    return out;
  }
  // 是否是「探索度达标后现身的秘境之主」（Boss 不在当前节点 next 里也能直达）
  function advBossRevealed(s) {
    const a = s && s.adv;
    if (!a || a.trial) return false;
    return a.nodeId !== 'boss' && advCanFightBoss(s);
  }
  function advMove(s, nodeId) {
    const a = s.adv;
    if (!a || a.done) return { ok: false, msg: '秘境已结束' };
    const node = a.map && a.map.byId[nodeId];
    if (!node) return { ok: false, msg: '节点不存在' };
    const cur = a.map.byId[a.nodeId];
    const revealed = (nodeId === 'boss') && advBossRevealed(s);
    if (!revealed && (!cur || cur.next.indexOf(nodeId) < 0)) return { ok: false, msg: '此路不通' };
    const cost = (a.map && a.map.stepCost) || 5;
    if (a.stamina < cost) return { ok: false, msg: '秘境体力不支，无法再前进' };
    a.stamina -= cost;
    a.nodeId = nodeId;
    node.visited = true;
    a.depth = node.col + 1;
    saveState(s);
    return { ok: true, node: node, final: node.type === 'final', revealed: revealed };
  }
  function advCanMove(s) {
    const a = s.adv;
    if (!a || a.done) return false;
    const cost = (a.map && a.map.stepCost) || 5;
    if (a.stamina < cost) return false;
    const node = a.map && a.map.byId[a.nodeId];
    return !!(node && node.next && node.next.length);
  }
  function advRest(s, kind) {
    const lines = [];
    if (kind === 'hp' || kind === 'both') {
      const pct = kind === 'both' ? 0.30 : 0.60;
      const h = Math.round(s.hpMax * pct);
      s.hp = Math.min(s.hpMax, s.hp + h);
      lines.push((kind === 'both' ? '双修共参，气血 ' : '打坐吐纳，气血 ') + '+' + h);
    }
    if (kind === 'mp' || kind === 'both') {
      const pct = kind === 'both' ? 0.30 : 0.60;
      const m = Math.round(s.mpMax * pct);
      s.mp = Math.min(s.mpMax, s.mp + m);
      lines.push((kind === 'both' ? '双修共参，灵力 ' : '调息运功，灵力 ') + '+' + m);
    }
    if (kind === 'stamina') {
      const a = s.adv;
      const before = a.stamina;
      a.stamina = Math.min(a.staminaMax, a.stamina + 10);
      lines.push('养精蓄锐，秘境体力 +' + (a.stamina - before));
    }
    refreshStats(s); saveState(s);
    return lines;
  }
  function grantMaterial(s, gi, kind, amt) {
    const herbGrades = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'];
    const ironGrades = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
    const key = kind === 'herb' ? herbGrades[gi] : ironGrades[gi];
    if (!s.materials) s.materials = {};
    s.materials[key] = (s.materials[key] || 0) + amt;
    return [MATERIALS[key].name + ' +' + amt];
  }
  /* ---------------- 探索度（异世轮回录式：满 100% 方可直面秘境之主） ---------------- */
  // 经历节点即积累探索度：普通战斗 +10、精英敌人 +20、宝箱/灵草/灵铁 +5
  const ADV_EXPLORE_GAIN = {
    combat: 10, elite: 20, treasure: 5, herb: 5, iron: 5,
    explore: 10, rest: 5, event: 5, shop: 5
  };
  function addExplore(s, amount) {
    const a = s.adv;
    if (!a || !amount) return 0;
    if (a.exploreMax === undefined) a.exploreMax = 100;
    const before = a.explore || 0;
    a.explore = Math.min(a.exploreMax, before + amount);
    saveState(s);
    return a.explore - before;
  }
  // 体力不足时：以寿元强行探查（硬搜一处实打实的造化，产出加倍）
  // 注意：这是「拼命搜刮」而非「从容勘察」——只出具体收获，不计入探索度。
  // 探索度只来自亲身经历的节点（战斗/精英/宝箱灵草灵铁）与有余力时的细致探查。
  // 代价随同一秘境内的强搜次数等比递增：1 → 2 → 4 → 8 → 16 年（第 6 次起封顶 16 年）。
  const FORCE_LIFE_COSTS = [1, 2, 4, 8, 16];
  function forceLifeCost(n) {
    const i = Math.max(0, n | 0);
    return FORCE_LIFE_COSTS[Math.min(i, FORCE_LIFE_COSTS.length - 1)];
  }
  // 下一次折寿强搜的寿元消耗（供 UI 展示；不在秘境时按第 1 次计）
  function forceExploreCost(s) {
    const a = s && s.adv;
    return forceLifeCost(a ? (a.forceN || 0) : 0);
  }
  // 剩余寿元（还能活多少年）= 寿元上限 − 当前年龄
  function lifeLeft(s) {
    return Math.max(0, (s.lifeMax || 0) - (s.age || 0));
  }
  // 本次强搜的风险评估：剩余寿元不足时为 fatal，由 UI 弹「以命相搏」二次确认。
  // 这是玩家主动选择的一种结档方式（以命易物，尽入轮回——换完即寿元耗尽）。
  function forceExploreRisk(s) {
    const cost = forceExploreCost(s);
    const left = lifeLeft(s);
    return { cost: cost, left: left, lack: Math.max(0, cost - left), fatal: cost >= left };
  }
  function advForceExplore(s) {
    const a = s.adv;
    if (!a) return { ok: false, msg: '不在秘境之中', lines: [] };
    const cost = forceLifeCost(a.forceN || 0);
    a.forceN = (a.forceN || 0) + 1; // 本秘境内强搜次数：决定下一次的等比代价
    const next = forceLifeCost(a.forceN);
    const msg = loseLife(s, cost, 'force');
    const g = rollExploreLoot(s, 'deep', 2);
    a.gains.push.apply(a.gains, g);
    // 折寿后寿元已不足以支撑此身 → 此世就此终结。死亡状态与年末结算同源，
    // 由 UI 立刻送入死亡结算（这是一种玩家主动选择的结档方式）。
    const fatal = (s.age || 0) >= (s.lifeMax || 0);
    if (fatal) { s.dead = true; s.endReason = '寿元耗尽'; }
    refreshStats(s); saveState(s);
    return {
      ok: true, cost: cost, nextCost: next, times: a.forceN, fatal: fatal, lifeLeft: lifeLeft(s),
      lines: [msg, '你强提心神，在秘境中硬搜了一处——'].concat(g)
        .concat([fatal
          ? '（以命易物，尽入轮回——寿元已尽，此身油尽灯枯，此后再无来日）'
          : '（折寿强搜只出造化，不计探索度；再搜需 -' + next + ' 年寿元）']),
      explore: a.explore || 0, stamina: a.stamina
    };
  }
  // 体力不足时：以寿元强行前行（1 年 1 步）
  function advForceMove(s, nodeId) {
    const a = s.adv;
    if (!a || a.done) return { ok: false, msg: '秘境已结束' };
    const node = a.map && a.map.byId[nodeId];
    if (!node) return { ok: false, msg: '节点不存在' };
    const cur = a.map.byId[a.nodeId];
    const revealed = (nodeId === 'boss') && advBossRevealed(s);
    if (!revealed && (!cur || cur.next.indexOf(nodeId) < 0)) return { ok: false, msg: '此路不通' };
    const cost = (a.map && a.map.stepCost) || 5;
    if (a.stamina >= cost) return { ok: false, msg: '体力尚足，无需折寿。' };
    const msg = loseLife(s, 1, 'force');
    a.nodeId = nodeId;
    node.visited = true;
    a.depth = node.col + 1;
    saveState(s);
    return { ok: true, node: node, final: node.type === 'final', lines: [msg, '你咬牙折寿前行（强行前行 · 固定 -1 年 / 步），又深入了一步。'] };
  }
  // Boss 门槻：探索度未满 100% 不得直面秘境之主
  function advCanFightBoss(s) {
    const a = s.adv;
    if (!a) return false;
    if (a.trial) return true; // 试炼：大敌始终可达，无需探索度门槛
    return (a.explore || 0) >= (a.exploreMax || 100);
  }
  // 秘境当前「局面」：UI 据此决定是渲染可选节点，还是弹「前路已尽」兜底。
  // 关键：最后一层的唯一出口是 Boss，而探索度未满时 Boss 处于锁定态 —— 此时
  // 若不做兜底，玩家面前会没有任何可点节点（历史 P0 卡死）。
  function advSituation(s) {
    const a = s.adv;
    if (!a || a.done) return { choices: [], bossOnly: false, canBoss: false, atBoss: false, deadEnd: false };
    const choices = advNextChoices(s);
    const canBoss = advCanFightBoss(s);
    const bossOnly = choices.length > 0 && choices.every(function (c) { return c.id === 'boss'; });
    const atBoss = a.nodeId === 'boss';
    return {
      choices: choices,
      bossOnly: bossOnly,
      canBoss: canBoss,
      atBoss: atBoss,
      deadEnd: !atBoss && (choices.length === 0 || (bossOnly && !canBoss))
    };
  }

  /* 秘境产出分层：物品按「黄玄地天」定阶，秘境只出【本阶及以下】的内容。
   * 否则黄级匪寨能硬搜出元婴丹——越阶产出会直接砸穿数值曲线。
   * 本级内容在池中重复一次（权重 ×2），让高阶秘境的产出重心落在本阶。*/
  const LOOT_GRADES = ['黄', '玄', '地', '天'];
  function gradeIdxOf(g) {
    if (g === '仙') return LOOT_GRADES.length; // 仙阶高于天阶：只在天/仙级秘境出现
    const i = LOOT_GRADES.indexOf(g);
    return i < 0 ? 0 : i; // 未标注阶位者按黄阶处理
  }
  function pickLootKey(src, giTarget) {
    const all = Object.keys(src);
    if (!all.length) return null;
    const allow = all.filter(function (k) { return gradeIdxOf(src[k] && src[k].grade) <= giTarget; });
    // 本阶及以下一件都没有 → 返回 null，由调用方降级为灵石；绝不越阶兜底
    if (!allow.length) return null;
    const own = allow.filter(function (k) { return gradeIdxOf(src[k] && src[k].grade) === giTarget; });
    const pool = own.length ? allow.concat(own) : allow;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // 秘地探查：消耗秘境体力换取造化与探索度
  // （deep 耗8体力/探索度+10，shallow 耗3体力/探索度+5，skip 不耗）
  // rollExploreLoot 只负责「摇出具体内容」，供体力探查与折寿强搜共用（mult 为产出倍数）
  function rollExploreLoot(s, mode, mult) {
    const g = [];
    const advType = s.advType || 'huang';
    const gi = ADVENTURE_GRADE[advType] || 0;
    const k = mult || 1;
    if (mode === 'deep') {
      const roll = Math.random();
      if (roll < 0.35) {
        const tech = getRandomTechFromPools(advType, s);
        if (tech) g.push.apply(g, applyOps(s, { tech: tech }));
        else { const st = (40 + Math.floor(Math.random() * 40)) * k; s.stone += st; g.push('灵石 +' + st); }
      } else if (roll < 0.6) {
        for (let i = 0; i < k; i++) {
          const el = pickLootKey(ELIXIRS, gi); // 只出本阶及以下的丹药
          if (!el) break;
          g.push.apply(g, applyOps(s, { elixirs: { [el]: 1 } }));
        }
      } else if (roll < 0.8) {
        // 灵物（已是法宝，只出本阶及以下、未持有的；受「每阶位最多 3 件法宝」上限约束）
        const sp = pickSpiritArtId(s, gi);
        const got = sp ? grantAdvArt(s, sp) : null;
        if (got && got.length) g.push.apply(g, got);
        else { const st = (50 + Math.floor(Math.random() * 50)) * k; s.stone += st; g.push('灵石 +' + st); }
      } else {
        g.push.apply(g, grantMaterial(s, gi, Math.random() < 0.5 ? 'herb' : 'iron', (5 + Math.floor(Math.random() * 6)) * k));
      }
    } else {
      const st = (20 + Math.floor(Math.random() * 20)) * k;
      s.stone += st;
      g.push.apply(g, grantMaterial(s, gi, Math.random() < 0.5 ? 'herb' : 'iron', (2 + Math.floor(Math.random() * 3)) * k));
      g.push('灵石 +' + st);
    }
    return g;
  }
  // 体力探查：有余力时的从容勘察——既出具体内容，也增进对秘境的了解（探索度）
  function advExplore(s, mode) {
    const a = s.adv;
    if (!a) return { ok: false, msg: '不在秘境之中' };
    const cost = mode === 'deep' ? 8 : 3;
    if (a.stamina < cost) return { ok: false, msg: '秘境体力不足，无法探查。' };
    a.stamina -= cost;
    const g = rollExploreLoot(s, mode, 1);
    a.gains.push.apply(a.gains, g);
    const gotExp = addExplore(s, mode === 'deep' ? 10 : 5);
    if (gotExp > 0) g.push('探索度 +' + gotExp + '%（当前 ' + a.explore + '%）');
    refreshStats(s); saveState(s);
    return { ok: true, lines: g, stamina: a.stamina, explore: a.explore };
  }
  // 战败扣减寿命：秘境普通 -1 年、秘境 Boss -10 年、游历 -1 年
  function loseLife(s, years, reason) {
    const y = Math.max(1, years | 0);
    s.lifeMax = Math.max(1, (s.lifeMax || 0) - y);
    let msg;
    if (reason === 'boss') msg = '你被秘境之主轰碎护身法力，道基剧震，寿元 -' + y + '！';
    else if (reason === 'adv') msg = '你力战不敌，重伤遁走，寿元 -' + y + '。';
    else if (reason === 'explore') msg = '你在游历中力战不敌，负伤遁走，寿元 -' + y + '。';
    else if (reason === 'force') msg = '你强行动用本源，以命换力，寿元 -' + y + '。';
    else msg = '你负伤退走，寿元 -' + y + '。';
    // 死亡交由年末寿数结算（s.age >= s.lifeMax）统一处理，此处仅扣减上限
    saveState(s);
    return msg;
  }
  function useAdvElixir(s, id) {
    const a = s.adv;
    if (!a || !a.items) return { ok: false, msg: '不在秘境之中' };
    const slot = a.items.find(function (x) { return x.id === id; });
    if (!slot || slot.count <= 0) return { ok: false, msg: '没有该丹药' };
    const el = ELIXIRS[id];
    if (!el || !el.usableInAdv) return { ok: false, msg: '此丹药无法在秘境服用' };
    const eff = el.adv || {};
    const lines = [];
    if (eff.hpPct) {
      const h = Math.round(s.hpMax * eff.hpPct);
      s.hp = Math.min(s.hpMax, s.hp + h);
      lines.push('气血 +' + h);
    }
    if (eff.mpPct) {
      const m = Math.round(s.mpMax * eff.mpPct);
      s.mp = Math.min(s.mpMax, s.mp + m);
      lines.push('灵力 +' + m);
    }
    if (eff.cure && s.battle && s.battle.buffs) {
      s.battle.buffs = (s.battle.buffs || []).filter(function (bf) { return !bf.bad; });
      lines.push('负面状态已解除');
    }
    slot.count -= 1;
    if (slot.count <= 0) a.items = a.items.filter(function (x) { return x.id !== id; });
    a.itemsUsed = (a.itemsUsed || 0) + 1;
    refreshStats(s); saveState(s);
    return { ok: true, lines: lines };
  }
  /* 本阶位秘境「还能产出多少件法宝」——秘境入口 UI 显示「剩余法宝 N」用。
     口径与 advBossBonus 完全一致：灵物豁免上限（没拿到就永远算 1 件），
     普通法宝同时受「每阶 N 件」余额与「池内还没拿到的数量」两重约束。 */
  function advArtRemain(s, advKey) {
    const key = advKey || s.advType || 'huang';
    const band = (BOSS_TREASURE_BAND && BOSS_TREASURE_BAND[key]) || ['玄', '地'];
    const spirit = ownsArt(s, spiritArtOf(s, key)) ? 0 : 1;
    const room = Math.max(0, advArtCap() - advArtCount(s, key));
    const pool = Object.keys(ARTIFACTS).filter(function (id) {
      return !ARTIFACTS[id].spirit && band.indexOf(ARTIFACTS[id].grade) >= 0 && !ownsArt(s, id);
    }).length;
    const normal = Math.min(room, pool);
    return { spirit: spirit, normal: normal, total: spirit + normal };
  }

  /* 秘境 BOSS 通关奖励：「秘藏二选一」（2026-09-13 重做 · 当晚定稿）
     规则（用户定稿）：
     ① 二选一，只能拿一件——旧版 Boss 白送灵物 + 这里再送法宝 = 一次通关白赚两件，已修；
     ② 选项一 = 本阶位秘藏的灵物类法宝（未持有则必出）；
     ③ 若已持有该灵物 → 选项一换成「当前品阶池内随机的法宝」；
     ④ 每层（阶位）秘境最多产出 3 件**普通**法宝，跨多次通关累计；
        **灵物豁免此上限**（永远不占名额）——故「连选 3 件普通法宝后，选项一依然是灵物」；
     ⑤ **选项二无可取之物时留空**（用户定稿）：普通法宝取尽时若选项一是灵物，就只显示
        灵物一张卡，不再拿灵石充数；只有当**灵物也已持有 + 普通法宝取尽**时，
        才保留一个灵石兜底选项（否则弹窗一张卡都没有、无按钮可点，会卡死流程）。
     天/仙两级共用灵物「魔核碎片」——天级拿到后，仙级选项一即转为随机法宝。 */
  function advBossBonus(s) {
    const advKey = s.advType || 'huang';
    const spiritId = spiritArtOf(s, advKey);
    const band = (BOSS_TREASURE_BAND && BOSS_TREASURE_BAND[advKey]) || ['玄', '地'];
    const remain = advArtRemain(s, advKey);
    // 当前品阶池内随机一件法宝（排除灵物、排除已持有、可选排除）
    const rollArt = function (exclude) {
      const graded = Object.keys(ARTIFACTS).filter(function (id) {
        return !ARTIFACTS[id].spirit && band.indexOf(ARTIFACTS[id].grade) >= 0
          && id !== exclude && !ownsArt(s, id);
      });
      if (!graded.length) return null;
      const g = Math.random() < 0.8 ? band[1] : band[0];
      let sub = graded.filter(function (id) { return ARTIFACTS[id].grade === g; });
      if (!sub.length) sub = graded;
      return sub[Math.floor(Math.random() * sub.length)];
    };
    const artOpt = function (id) {
      if (!id) return null;
      const a = ARTIFACTS[id];
      const tag = a.spirit ? '灵物·' : '';
      return {
        label: a.spirit ? '夺·秘藏灵物' : '取·法宝',
        desc: tag + a.name + '（' + a.grade + '级·' + (a.type || '辅') + '）——' + artEffectText(id)
          + '｜' + a.desc,
        apply: function () { return grantAdvArt(s, id, advKey) || ['法宝囊已满，无法再纳入。']; }
      };
    };
    // 唯一兜底：本阶法宝（含灵物）真的取尽时才出现，保证弹窗至少有一个可点选项
    const stoneFallback = function () {
      const st = Math.round(120 * (1 + bigIdxOf(s) * 0.8));
      return { label: '取·灵石 ×' + st,
        desc: '此秘境的法宝（含灵物）已尽数取出，只余灵石。',
        apply: function () { s.stone += st; return ['洞天秘藏 · 灵石 +' + st]; } };
    };
    const out = [];
    if (!ownsArt(s, spiritId)) {
      // 灵物豁免上限：只要还没拿到，选项一永远是灵物（哪怕普通法宝已取满 3 件）
      out.push(artOpt(spiritId));
      if (remain.normal > 0) {
        const o2 = artOpt(rollArt(spiritId));
        if (o2) out.push(o2);            // 选项二：普通法宝（取尽则此位置留空）
      }
    } else if (remain.normal > 0) {
      const p1 = rollArt(null);
      const o1 = artOpt(p1);
      if (o1) {
        out.push(o1);
        if (remain.normal > 1) {
          const o2 = artOpt(rollArt(p1));
          if (o2) out.push(o2);
        }
      }
    }
    if (!out.length) out.push(stoneFallback());
    return out;
  }

  function advClearReward(s) {
    const bi = bigIdxOf(s), realmM = 1 + bi * 0.8;
    const gains = [];
    const s1 = Math.round((150 + 60 * bi) * realmM);
    s.stone += s1; gains.push('洞天秘藏 · 灵石 +' + s1);
    const h = 3 + Math.floor(Math.random() * (4 + bi)); gains.push.apply(gains, applyOps(s, { herb: h }));
    const i2 = 2 + Math.floor(Math.random() * 3); gains.push.apply(gains, applyOps(s, { iron: i2 }));
    const eid = randomEquip(bi, 4);
    if (eid) gains.push.apply(gains, grantEquipChecked(s, eid));
    const t = TECH_DROPS[bi][Math.floor(Math.random() * TECH_DROPS[bi].length)];
    if (s.techs.indexOf(t) < 0) gains.push.apply(gains, applyOps(s, { tech: t }));
    s.adv.gains.push.apply(s.adv.gains, gains);
    refreshStats(s); saveState(s);
    return gains;
  }

  /* ---------------- 坊市 ---------------- */
  const SELL_PRICE = { herb: 4, iron: 6 };
  function shopStock(s) {
    const d = (s.adv && s.adv.depth) || 1;
    const stock = [];
    const pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    // 灵材按秘境等级给品级（价格随品级上浮），保证任何境界都有买得起的实惠
    const gi = ADVENTURE_GRADE[s.advType || 'huang'] || 0;
    const herbKeys = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'];
    const ironKeys = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
    const hKey = herbKeys[gi] || 'herb_huang', iKey = ironKeys[gi] || 'iron_huang';
    const matPrice = 30 * (1 + gi);
    stock.push({ id: 'mat_herb', name: MATERIALS[hKey].name + ' ×5', price: matPrice, mat: { key: hKey, n: 5 } });
    stock.push({ id: 'mat_iron', name: MATERIALS[iKey].name + ' ×3', price: matPrice, mat: { key: iKey, n: 3 } });
    const danPool = SHOP_ITEMS.filter(function (i) {
      return i.give && i.give.elixirs && ['juling', 'zhuji', 'jiejin', 'zengshou'].indexOf(Object.keys(i.give.elixirs)[0]) >= 0;
    });
    const dmax = { juling: 0, zhuji: 0, jiejin: 1, zengshou: 1 };
    const okDan = danPool.filter(function (i) {
      const eid = Object.keys(i.give.elixirs)[0];
      return bigIdxOf(s) >= dmax[eid] && d >= (eid === 'jiejin' || eid === 'zengshou' ? 2 : 1);
    });
    stock.push(pick(okDan.length ? okDan : danPool));
    const techPool = SHOP_ITEMS.filter(function (i) {
      return i.tech && s.techs.indexOf(i.tech) < 0 && bigIdxOf(s) >= (i.price >= 300 ? 1 : 0);
    });
    if (techPool.length && Math.random() < 0.9) stock.push(pick(techPool));
    const eid = randomEquip(biOfSafe(s), d);
    if (eid) {
      const eq = findEquip(eid);
      if (eq && eq.price > 0) {
        stock.push({ id: 'EQUIP:' + eid, name: '装备·' + eq.name, price: eq.price, equip: eid });
      }
    }
    // 秘境坊市：增售可「当场服用、即时生效」的回复丹药（购买即生效，不入随身、不出现在本次收获）
    if (s.adv && s.adv.status === 'running') {
      stock.push({ id: 'adv_heal', name: '回春丹（气血 +40%·当场服用）', price: 40, adv: { hpPct: 0.40 } });
      stock.push({ id: 'adv_mp', name: '灵泉（灵力 +40%·当场服用）', price: 40, adv: { mpPct: 0.40 } });
    }
    // 游历流动商贩：从法宝池中随机抽取 3 件（非已拥有优先，已拥有仅在余量不足时上架并标记 owned）。
    // 判定必须用 ownsArt（背包 s.arts + 装备位 s.equip.treasure）——灵物改制后已拥有法宝多在装备位，
    // 旧写法只查 s.arts 会漏判，导致已拥有法宝仍以【购买】上架、可重复买。
    if (typeof ART_SHOP_ITEMS !== 'undefined' && ART_SHOP_ITEMS && ART_SHOP_ITEMS.length) {
      const bi = bigIdxOf(s);
      const cand = ART_SHOP_ITEMS.filter(function (it) {
        if ((it.minDepth || 0) > (s.adv && s.adv.depth || 1)) return false;
        if ((it.minBig || 0) > bi) return false;
        return true;
      });
      const fresh = cand.filter(function (it) { return !ownsArt(s, it.id); });
      const have = cand.filter(function (it) { return ownsArt(s, it.id); });
      // Fisher–Yates 随机抽 3 件：先洗未拥有的，不足 3 件再用已拥有的补位（补位的标 owned）
      const shuffle = function (arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      };
      shuffle(fresh); shuffle(have);
      fresh.concat(have).slice(0, 3).forEach(function (it) {
        const a = ARTIFACTS[it.id];
        if (!a) return;
        stock.push({ id: 'ART:' + it.id, name: '法宝·' + a.name, price: it.price, art: it.id, owned: ownsArt(s, it.id) });
      });
    }
    return stock;
  }
  function biOfSafe(s) { return bigIdxOf(s); }
  function buyStock(s, si) {
    if (si.sold) return { ok: false, msg: '此物已被买走。' };
    if (si.art && ownsArt(s, si.art)) return { ok: false, msg: '此法宝已在囊中，无须重金再购。' };
    if (s.stone < si.price) return { ok: false, msg: '灵石不足。' };
    s.stone -= si.price;
    si.sold = true;
    const out = ['支出灵石 ' + si.price];
    if (si.mat) {
      if (!s.materials) s.materials = {};
      s.materials[si.mat.key] = (s.materials[si.mat.key] || 0) + si.mat.n;
      out.push(MATERIALS[si.mat.key].name + ' +' + si.mat.n);
    }
    if (si.give) out.push.apply(out, applyOps(s, si.give));
    if (si.tech) out.push.apply(out, applyOps(s, { tech: si.tech }));
    if (si.equip) out.push.apply(out, gainEquip(s, si.equip));
    if (si.art) out.push.apply(out, applyOps(s, { art: si.art }));
    if (si.adv) {
      const eff = si.adv;
      if (eff.hpPct) { const h = Math.round(s.hpMax * eff.hpPct); s.hp = Math.min(s.hpMax, s.hp + h); out.push('气血 +' + h); }
      if (eff.mpPct) { const m = Math.round(s.mpMax * eff.mpPct); s.mp = Math.min(s.mpMax, s.mp + m); out.push('灵力 +' + m); }
    }
    // 本次收获只记录「所得之物」；当场生效的回复（气血/灵力）不入收获
    const gains = out.filter(function (l) { return !/^气血 \+/.test(l) && !/^灵力 \+/.test(l); });
    saveState(s);
    return { ok: true, lines: out, gains: gains };
  }
  function sellMaterial(s, kind, n) {
    if (!s.materials) s.materials = {};
    if (kind !== 'herb' && kind !== 'iron') return false;
    // 汇总所有分级材料
    var keys = Object.keys(s.materials).filter(function(k) { return k.startsWith(kind); });
    var total = keys.reduce(function(a, k) { return a + (s.materials[k] || 0); }, 0);
    if (total < n) return false;
    // 从最低级开始扣减
    var remaining = n;
    var gradeOrder = kind === 'herb' ? ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'] : ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
    for (var i = 0; i < gradeOrder.length && remaining > 0; i++) {
      var key = gradeOrder[i];
      var have = s.materials[key] || 0;
      var deduct = Math.min(have, remaining);
      if (deduct > 0) {
        s.materials[key] -= deduct;
        remaining -= deduct;
      }
    }
    const g = n * SELL_PRICE[kind];
    s.stone += g;
    refreshStats(s); saveState(s);
    return g;
  }

  /* ---------------- 行动 ---------------- */
  function spend(s, n) {
    s.actionsLeft -= n;
    s.yearActions = (s.yearActions || 0) + 1;
    refreshStats(s);
    saveState(s);
  }
  // 修炼三档（P2）：普通 1AP×1.0 / 潜心 2AP×1.8 / 闭关 3AP×2.4
  function cultModes(s) {
    const g = cultGain(s);
    const need = requireNeed(s);
    const room = Math.max(0, need - s.qi);
    const art = artifactStats(s);
    const mk = function (id, name, ap, mult) {
      return { id: id, name: name, ap: ap, mult: mult + (art.modeBonus[id] || 0), gain: Math.min(Math.round(g.gain * (mult + (art.modeBonus[id] || 0))), room) };
    };
    return [
      mk('normal', '普通修炼', 1, 1.0),
      mk('focus', '潜心修炼', 2, 1.8),
      mk('seclusion', '闭关修炼', 3, 2.4)
    ];
  }
  function cultivate(s, mode) {
    const modes = cultModes(s);
    const m = modes.filter(function (x) { return x.id === mode; })[0] || modes[0];
    const maxCult = s.cultMax || 1;
    if ((s.cultTimes || 0) >= maxCult) return '今年已修炼过' + (maxCult > 1 ? maxCult : '') + '次，明年再来吧。';
    if (!canAction(s, m.ap)) return '行动点不足（需 ' + m.ap + ' 点）';
    const need = requireNeed(s);
    if (s.qi >= need) return '修为已满，瓶颈隐隐颤动——该尝试突破了。';
    const r = cultGain(s);
    let mult = m.mult;
    // 【灵物·洞虚秘淬】修炼双倍：装备后按几率将本次修炼收益翻倍（被动，不再有完美突破）
    const dc = artifactStats(s).doubleCult || 0;
    const cultDoubled = dc > 0 && Math.random() < dc;
    if (cultDoubled) mult *= 2;
    const actual = Math.min(Math.round(r.gain * mult), need - s.qi);
    s.qi += actual;
    s.cultTimes = (s.cultTimes || 0) + 1;
    s.cultedThisYear = true;
    spend(s, m.ap);
    let note2 = '';
    const sheshengLv = (s.reinc && s.reinc.shesheng) || 0;
    if (sheshengLv > 0) {
      s.lifeMax -= 1;
      note2 += '（舍生：寿元 -1）';
    }
    if (s.qi >= need) note2 += '（修为已满，可尝试突破！）';
    if (cultDoubled) note2 += '（洞虚秘淬共鸣，修为翻倍！）';
    refreshStats(s);
    return '你' + m.name + '，引天地灵气入体，修为 +' + actual + '。' + (r.note ? r.note : '') + note2;
  }
  function canAction(s, n) { return s.actionsLeft >= n && !s.dead; }

  /* ---------------- 锻体（《锻体诀》：ml_5_t3 筑基后期剧情解锁） ---------------- */
  var DUANTI_MAX = 10;                            // 每个大境界，每种淬炼至多 10 次
  function duantiCap(s) { return DUANTI_MAX + (artifactStats(s).duantiMax || 0); }  // 九转金丹炉 +5
  var DUANTI_TYPES = [
    { key: 'ti',   name: '体魄', verb: '淬体魄', cost: 1, attr: 'ti'   },
    { key: 'dun',  name: '遁速', verb: '炼遁速', cost: 1, attr: 'dun'  }
    // 注：「神识」淬炼（凝神识）已移除——神识训练由宗门功业提供，避免双来源重复。
  ];
  function duantiState(s) {
    var bi = bigIdxOf(s);
    if (!s.duanti || s.duanti.realm !== bi) {
      s.duanti = { realm: bi, counts: { ti: 0, dun: 0, shen: 0 } };
    }
    return s.duanti;
  }
  function duantiInfo(s) {
    return {
      unlocked: !!(s.flags && s.flags.duanti),
      max: DUANTI_MAX,
      types: DUANTI_TYPES,
      realm: bigIdxOf(s),
      counts: duantiState(s).counts
    };
  }
  function doDuanti(s, type) {
    s.flags = s.flags || {};
    if (!s.flags.duanti) return { ok: false, msg: '你尚未习得《锻体诀》，无法锻体。' };
    var tp = null;
    for (var i = 0; i < DUANTI_TYPES.length; i++) if (DUANTI_TYPES[i].key === type) tp = DUANTI_TYPES[i];
    if (!tp) return { ok: false, msg: '无此淬炼之法。' };
    var st = duantiState(s);
    var cap = duantiCap(s);
    if (st.counts[type] >= cap) {
      return { ok: false, msg: tp.name + '已淬炼 ' + cap + ' 次，肉身至此境之限——待突破大境界后，方可再锻。' };
    }
    if (!canAction(s, tp.cost)) return { ok: false, msg: '行动点不足。' };
    const art = artifactStats(s);
    if (!art.duantiFree) spend(s, tp.cost);
    s[tp.attr] = (s[tp.attr] || 0) + 0.5 * (1 + (art.duantiEff || 0));
    st.counts[type]++;
    refreshStats(s); saveState(s);
    return {
      ok: true,
      msg: '你依《锻体诀》' + tp.verb + '，' + tp.name + ' +' + (0.5 * (1 + (art.duantiEff || 0))).toFixed(2) + '。（' + tp.name + ' ' + st.counts[type] + '/' + cap + '）',
      left: cap - st.counts[type]
    };
  }

  function explore(s) {
    if (!canAction(s, 2)) return false;
    const pool = EVENTS.mijing.filter(evOK(s, 2));
    if (!pool.length) return '此处的秘境机缘你已尽数探过，再无新路可寻。（未消耗行动点）';
    spend(s, 2);
    const ev = pickWeighted(pool);
    s.seen[ev.id] = 1;
    return ev;
  }
  function social(s) {
    // 市井机缘（游历）：始终从「游历池」(EVENTS.shejiao) 抽取 3 桩际遇，玩家 3 选 1
    if (!canAction(s, 1)) return false;
    const pool = EVENTS.shejiao.filter(evOK(s, 1));
    if (!pool.length) return '此世的市井机缘你已尽数遇过，再无可交集的人与事。（未消耗行动点）';
    spend(s, 1);
    const picks = shuffle(pool.slice()).slice(0, Math.min(3, pool.length));
    return { multi: true, events: picks };
  }
  function sectSocial(s) {
    // 宗门交游（行动点·1点）：消费 SECT_SOCIAL，剑峰习剑等 once 事件仅出现一次
    if (!s.sect) return '你尚未加入宗门。';
    if (!canAction(s, 1)) return false;
    const bi = bigIdxOf(s);
    const pool = (SECT_SOCIAL[s.sect] || []).filter(function (ev) {
      return ev.min <= bi && ev.max >= bi && (!ev.once || !s.seen[ev.id]);
    });
    if (!pool.length) return '同门诸事你已尽数经历，今日各自闭关。（未消耗行动点）';
    spend(s, 1);
    const ev = pickWeighted(pool);
    s.seen[ev.id] = 1;
    return ev;
  }
  function sectCombat(s) {
    if (!s.sect) return '你尚未加入宗门。';
    if (!canAction(s, 1)) return false;
    const bi = bigIdxOf(s);
    const pool = SECT_COMBAT[s.sect].filter(function (ev) {
      return ev.min <= bi && ev.max >= bi && (!ev.once || !s.seen[ev.id]);
    });
    if (!pool.length) return '宗门降妖之事你已尽数担过，今日暂无新务。（未消耗行动点）';
    spend(s, 1);
    const ev = pickWeighted(pool);
    s.seen[ev.id] = 1;
    const enemy = ev.enemy;
    return { id: ev.id, title: ev.title, chapter: true, lines: ev.lines,
      choices: [
        { t: '迎战！', fight: { name: enemy.name, line: enemy.line, atk: enemy.atk, hp: enemy.hp,
          loot: Object.assign({}, enemy.loot, ev.enemy.techChance && Math.random() < ev.enemy.techChance ? { tech: TECH_DROPS[bi][Math.floor(Math.random() * TECH_DROPS[bi].length)] } : {},
            ev.enemy.equipChance && Math.random() < ev.enemy.equipChance ? { equip: randomEquip(bi, 1) } : {}) },
          resultWin: '你收剑而立，此战大获全胜。', resultLose: '妖兽凶猛，你且战且退，总算保住了性命。' }
      ] };
  }
  function sectLecture(s) {
    if (!s.sect) return '你尚未加入宗门。';
    if (!canAction(s, 1)) return false;
    spend(s, 1);
    const bi = bigIdxOf(s);
    if (!s.sectLectureCount) s.sectLectureCount = 0;
    if (s.idx >= 10) {
      return { id: 'player_lecture', title: '道庭开讲', chapter: true,
        lines: ['你在道庭开讲，座下弟子满堂。你深吸一口气，开口论道。', '今日你可选讲的主题：'],
        choices: [
          { t: '讲气血运行之道', effect: { hp: 80 }, lines: ['你讲述气血运行之理，座下弟子频频点头。讲毕，你自觉气血充沛了不少。（气血 +80）'] },
          { t: '讲道心修炼之悟', effect: { wu: 0.3 }, lines: ['你分享道心修炼的感悟，座下弟子若有所思。讲毕，你对道的领悟又深了一层。（悟性 +0.3）'] },
          { t: '讲体魄淬炼之术', effect: { ti: 0.3 }, lines: ['你讲述体魄淬炼之术，弟子们摩拳擦掌。讲毕，你自觉体魄更加强韧。（体魄 +0.3）'] }
        ] };
    }
    s.sectLectureCount++;
    const qiGain = Math.round(requireNeed(s) * 0.08);
    const result = '你心有所悟，体内灵气流转顺畅了不少。';
    if (s.sectLectureCount >= 6 && !s.sectLectureTech) {
      const sectTechs = { qingyunjian: 'jianqi', dpxia: 'changchun', xuantian: 'leiyin' };
      const tid = sectTechs[s.sect];
      if (tid && s.techs.indexOf(tid) < 0) {
        s.techs.push(tid);
        s.sectLectureTech = true;
        refreshStats(s); saveState(s);
        return { id: 'dao_ting_tech', title: '道庭讲法·顿悟', chapter: true,
          lines: SECT_LECTURE.lines.concat(['今日讲法与往日不同——你听着听着，忽然心领神会，一缕灵光闪过脑海！']),
          effect: { qi: qiGain },
          result: '你领悟了宗门秘传【' + TECHNIQUES[tid].name + '】！' + result };
      }
    }
    refreshStats(s); saveState(s);
    return { id: 'dao_ting_jiang', title: SECT_LECTURE.title, chapter: true,
      lines: SECT_LECTURE.lines, effect: { qi: qiGain }, result: result };
  }
  function jiyuan(s) {
    if (!canAction(s, 1)) return false;
    let ev = (function () {
      const pool = EVENTS.jiyuan.filter(evOK(s, 1));
      if (!pool.length) return null;
      const picked = pickWeighted(pool);
      s.seen[picked.id] = 1;
      return picked;
    })();
    if (!ev) return '此世的机缘你已尽数遇过，巡山半日，再无所获。（未消耗行动点）';
    spend(s, 1);
    return ev;
  }
  // 游历：独立事件池（jiyuan 名山大川 + shejiao 市井机缘），用于「额外提升」，
  // 与 MAINLINE 境界主线【不互通】（主线由 checkYearEvents 单独触发）。
  // 每次游历消耗 1 行动点，呈「三桩际遇」由玩家择一；采用带权不放回抽 3 个，
  // 高权重（剧情/关键节点）事件优先冒头；每年上限 5 次，年末归零，达上限提示「机缘已尽」。
  const TRAVEL_CFG = { perYearMax: 5 };
  function travel(s) {
    if (!canAction(s, 1)) return false;
    if ((s.travelYearCount || 0) >= TRAVEL_CFG.perYearMax) {
      return '今年游历机缘已尽，你走遍九州却再难遇奇事。来日方长，待来年再寻。';
    }
    // ✅ 游历统一走仙缘池 XIANYUAN（jiyuan+shejiao 经 E() 汇入的精选、带奖励、可标记 once 不重复）。
    //    排除 tag:'npc' 的 NPC 缘法事件——它们由下方「已解锁 NPC」机制按解锁态动态并入，
    //    不应直接进入随机池（否则未解锁也会刷出林婉儿等主线缘法）。
    const pool = XIANYUAN.filter(function (ev) { return ev.tag !== 'npc'; }).filter(evOK(s, 1));
    // 追加「已解锁」的 NPC 游历缘法（林婉儿/白素/黑猫等，需先达成对应剧情才入池，避免提前误触）
    if (typeof NPCS !== 'undefined') {
      Object.keys(NPCS).forEach(function (k) {
        const n = NPCS[k];
        if (n.surface === 'travel' && n.event && npcUnlocked(s, n) && evOK(s, 1)(n.event)) pool.push(n.event);
      });
    }
    if (!pool.length) return '此世的机缘你已尽数遍历，走遍九州亦难再遇新事。（未消耗行动点）';
    spend(s, 1);
    const picks = pickWeightedN(pool, Math.min(3, pool.length));
    s.travelYearCount = (s.travelYearCount || 0) + 1;
    s.travelCount = (s.travelCount || 0) + 1;
    return { multi: true, events: picks };
  }
  // 山河探索（游历子选项）：独立事件池 EVENTS.shanhe，三桩际遇择一，每年上限 SHANHE_CFG.perYearMax 次
  const SHANHE_CFG = { perYearMax: 1 };
  function shanheExplore(s) {
    if (!canAction(s, 1)) return false;
    if ((s.shanheYearCount || 0) >= SHANHE_CFG.perYearMax) {
      return '今年山河已探遍，再无新的险地可寻。来日方长，待来年再往。';
    }
    const pool = (EVENTS.shanhe || []).filter(evOK(s, 1));
    if (!pool.length) return '这一带山河无可探之处（或你的境界还不足以踏入险地），此行未消耗行动点。';
    spend(s, 1);
    const picks = pickWeightedN(pool, Math.min(3, pool.length));
    s.shanheYearCount = (s.shanheYearCount || 0) + 1;
    s.shanheCount = (s.shanheCount || 0) + 1;
    return { multi: true, events: picks };
  }
  // 带权不放回抽样 n 个（高权重大概率先被抽中，且互不相同）
  function pickWeightedN(pool, n) {
    const bag = pool.slice();
    const out = [];
    while (out.length < n && bag.length) {
      let total = 0; bag.forEach(function (e) { total += (e.weight || 1); });
      let r = Math.random() * total, chosen = bag[bag.length - 1];
      for (let i = 0; i < bag.length; i++) { r -= (bag[i].weight || 1); if (r <= 0) { chosen = bag[i]; break; } }
      out.push(chosen);
      bag.splice(bag.indexOf(chosen), 1);
    }
    return out;
  }
  // —— 仙缘统一触发（替代旧 travel/social/jiyuan 三分裂）——
  // 每次游历按概率掷骰，命中则从统一池 XIANYUAN 加权单抽 1 个；未中不占「仙缘名额」，也不消耗事件。
  const XIANYUAN_CFG = { chance: 0.35, perYearMax: 3 };
  function rollXianyuan(s) {
    if ((s.xianyuanYearCount || 0) >= XIANYUAN_CFG.perYearMax) return null;   // 本年仙缘已达上限
    if (Math.random() > XIANYUAN_CFG.chance) return null;                     // 概率门未中
    const pool = XIANYUAN.filter(evOK(s, 1));                                 // min/max/once/req 门槛
    if (!pool.length) return null;
    const ev = pickWeighted(pool);                                           // weight 真正生效（修复旧 travel 用 shuffle 忽略权重）
    s.seen[ev.id] = 1;
    s.xianyuanYearCount = (s.xianyuanYearCount || 0) + 1;
    return ev;
  }
  /* 事件门槛：境界区间 + **本世不重复** + 前置条件。
     ⚠️ 2026-09-13 用户实测修复「仙缘的缘法可以无限刷」：
     旧实现只在 `ev.once` 为真时才排除已见事件，而 `XIANYUAN` 里有 29 个（山河池 13 个）事件
     漏标 `once` → 同一桩机缘可被反复抽中、反复发奖励（实测 60 年内「天降陨铁」触发 11 次）。
     现改为：**默认一次性**（本世仅触发一次），只有显式标 `repeat: true` 的才算日常可重复事件。
     想保留"每年都能去灵泉采药"这类日常，请在 data.js 给该事件补 `repeat: true`。 */
  function evOK(s, tag) {
    return function (ev) {
      if (ev.min > s.idx || ev.max < s.idx) return false;
      if (ev.id && !ev.repeat && s.seen[ev.id]) return false;   // 无 id 的事件不做去重（防御）
      return evReqOK(s, ev);
    };
  }
  function evReqOK(s, ev) {
    if (ev.req && ev.req.flags) {
      for (let f in ev.req.flags) if (!s.flags[f]) return false;
    }
    if (ev.req && ev.req.minAtk && s.atk < ev.req.minAtk) return false;
    return true;
  }
  function pickWeighted(pool) {
    let total = 0;
    pool.forEach(function (e) { total += e.weight; });
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  /* ---------------- 炼丹 / 炼器 ---------------- */
  function alchemyChoices(s) {
    if (!s.materials) s.materials = {};
    return FORMULAS.filter(function (f) { return f.type === '丹' && bigIdxOf(s) >= f.needRealm; });
  }
  function doAlchemy(s, f) {
    if (!s.materials) s.materials = {};
    // 获取配方需要的材料key
    var costKey = Object.keys(f.cost)[0];
    var costAmount = f.cost[costKey];
    if ((s.materials[costKey] || 0) < costAmount) {
      return { ok: false, msg: MATERIALS[costKey].name + '不足，需要 ' + costAmount + ' 株' };
    }
    s.materials[costKey] -= costAmount;
    const chance = Math.min(0.92, 0.7 + (s.wu - 5) * 0.01 + (s.sect === 'dpxia' ? 0.2 : 0));
    if (Math.random() < chance) {
      s.elixirs[f.out] = (s.elixirs[f.out] || 0) + 1;
      grantCraftExp(s, 'liandan', 1); // 炼丹制作成功即积累丹道心得（主升级路径之一）
      refreshStats(s); saveState(s);
      return { ok: true, msg: '丹成！你炼出【' + ELIXIRS[f.out].name + '】一枚。' };
    }
    saveState(s);
    return { ok: false, msg: '炸炉了……灵草化作飞灰，你心疼地捂了捂胸口。' };
  }
  function forgeChoices(s) {
    if (!s.materials) s.materials = {};
    return FORMULAS.filter(function (f) { return f.type === '装备' && bigIdxOf(s) >= f.needRealm; });
  }
  function doForge(s, f) {
    if (!s.materials) s.materials = {};
    const lv = (s.craft && s.craft.lianqi && s.craft.lianqi.lv) || 1;
    if (lv < f.needLv) {
      return { ok: false, msg: '炼器等级不足（需 Lv' + f.needLv + '），当前 Lv' + lv + '。' };
    }
    // 获取配方需要的材料key
    var costKey = Object.keys(f.cost)[0];
    var costAmount = f.cost[costKey];
    if ((s.materials[costKey] || 0) < costAmount) {
      return { ok: false, msg: MATERIALS[costKey].name + '不足，需要 ' + costAmount + ' 块' };
    }
    s.materials[costKey] -= costAmount;
    // 成功率：体魄 + 炼器等级加成（每级 +2%），不封顶
    const chance = Math.min(0.97, 0.85 + (s.ti - 5) * 0.01 + lv * 0.02);
    if (Math.random() < chance) {
      // 装备只可炼制，法宝仅能从剧情获得；产出品质由炼器等级驱动
      const inst = rollForge(f, lv);
      if (!inst) {
        // 该子类在当前品阶无模板（不应发生），退还材料
        s.materials[costKey] += costAmount;
        saveState(s);
        return { ok: false, msg: '此配方暂无可炼制的成品，材料已退还。' };
      }
      const out = gainEquip(s, inst);
      const it = findEquip(inst.id);
      grantCraftExp(s, 'lianqi', 1); // 炼器制作成功即积累匠道心得（主升级路径之一）
      refreshStats(s); saveState(s);
      return { ok: true, msg: '炉火纯青！炼成【' + EQUIP_TIERS[inst.tier].name + '·' + (it ? it.name : inst.id) + '】。' + out.join('') + '可在角色页装备栏穿戴。' };
    }
    saveState(s);
    return { ok: false, msg: '火候过了三分，灵铁化作废渣。你深吸一口气，下次再来。' };
  }

  /* ---------------- 突破 / 天劫 ---------------- */
  function pickupTech(s, pool) {
    const unowned = pool.filter(function (t) { return s.techs.indexOf(t) < 0; });
    if (!unowned.length) return null;
    return unowned[Math.floor(Math.random() * unowned.length)];
  }
  function pickTech(s, bi) {
    const pool = (TECH_DROPS[bi] || []).concat();
    return pickupTech(s, pool);
  }
  function canBreak(s) { return s.qi >= requireNeed(s) && !s.dead; }
  /* 渡劫成功率封顶：任何来源叠加后都不得超过 98%（留 2% 天机不可测） */
  const TRIB_CAP = 0.98;
  function breakInfo(s) {
    const st = STAGES[s.idx];
    const nxt = STAGES[s.idx + 1];
    let base = 0.8 + (s.wu - 5) * 0.01;
    let mode = 'small', trib = null, desc = '';
    // 渡劫加成：所有来源在此「一次汇总」，UI 与结算同读 info.base，避免口径分叉
    //   s.tribPct                      —— 灵根词条（recalcLinggenBonus 已 /100，如润泽 +8%）
    //   s.tribBonusExtra               —— 事件/主线 effect:{trib:N} 的累积加成（applyOps 的 trib op）
    //   talentApply(s,'trib')          —— 旧命格【天命之子】+25%
    //   getDestinyBonus(s,'tribBonus') —— 命格【天命之子/天道宠儿】+15%
    //   dujie 天赋 +10% / 玄天宗 +5% / 道心每点 +1%
    // ⚠ 历史 bug（2026-09-13 修）：applyOps 的 trib op 曾写进 `s.linggen.body.trib`，而现代存档的
    //   灵根读 `s.linggen.trait.effect`（linggenTrait 优先 trait）→ 一切「渡劫 +N%」的事件/主线奖励
    //   都是静默无效的（文案承诺了、实际不生效）。现统一累积到独立字段 s.tribBonusExtra；
    //   不能累加到 s.tribPct——它会被 recalcLinggenBonus 每次重算覆盖。
    const tribBonus = (s.tribPct || 0)
      + (s.tribBonusExtra || 0)
      + talentApply(s, 'trib')
      + getDestinyBonus(s, 'tribBonus')
      + ((s.talents && s.talents.indexOf('dujie') >= 0) ? 0.1 : 0)  // 旧档遗留命格「天劫不侵」（现版 TALENTS 已无此 id，仅兼容老存档）
      + (s.sect === 'xuantian' ? 0.05 : 0)                          // 玄天门师门护持
      + effAttr(s, 'dao') * 0.01;
    if (!nxt) {
      // 元婴后期（境界表最后一段）→ 飞升天劫
      mode = 'trib'; trib = '飞升';
      base = Math.min(0.45 + tribBonus, TRIB_CAP);
      desc = '元婴圆满，天劫将至——成则羽化登仙，败则身死道消！';
    } else if (nxt.realm === '筑基') {
      mode = 'small'; base = 0.72 + (s.wu - 5) * 0.015;
      base = Math.min(base, 0.9);
      desc = '筑基无天劫，唯需破开尘障。你凝神静气，尝试以灵力重铸凡躯……';
    } else if (nxt.realm !== st.realm) {
      mode = 'trib'; trib = nxt.realm;
      base = 0.55 + tribBonus;
      const eid = BREAK_ELIXIR[nxt.realm];
      if (eid && (s.elixirs[eid] || 0) > 0) { base += 0.25; desc = '你摸出一枚【' + ELIXIRS[eid].name + '】含入口中。'; }
      base = Math.min(base, TRIB_CAP);
      desc += '天地灵气涌聚，劫云自九天垂落……';
    } else {
      base = Math.min(base, 0.97);
      desc = '灵台清明，水到渠成。';
    }
    return { mode: mode, trib: trib, base: base, desc: desc, st: st, nxt: nxt };
  }
  function breakthrough(s) {
    if (!canBreak(s)) return { ok: false, msg: '修为尚未圆满。' };
    const info = breakInfo(s);
    // 完美突破机制已取消（2026-09-13）：灵物改制成法宝，不再参与突破结算，
    //   突破只有「服丹突破」与「裸突破」两条路，胜负由 breakInfo().base 决定
    //   （大境界另走劫境序列实战）。
    return {
      ok: false,
      needChoice: true,
      info: info,
      hasSpirit: false,
      spiritId: null,
      spiritName: null,
      hasElixir: hasAnyElixir(s),
      msg: '请选择突破方式'
    };
  }
  // 渡劫（劫境）前置：消耗所选丹药（若有）并返回渡劫信息，交由 UI 进入劫境序列
  function beginDujie(s, elixirId) {
    if (!canBreak(s)) return { ok: false, msg: '修为尚未圆满。' };
    const info = breakInfo(s);
    if (elixirId && (s.elixirs[elixirId] || 0) > 0) {
      s.elixirs[elixirId]--;
      if (s.elixirs[elixirId] <= 0) delete s.elixirs[elixirId];
      const grade = ELIXIRS[elixirId] ? (ELIXIRS[elixirId].grade || '黄') : '黄';
      s.hpMaxBonus = (s.hpMaxBonus || 0) + (ELIXIR_GRADE_HP[grade] || 50);
    }
    if (!s.trib) s.trib = { target: info.trib || (info.nxt ? info.nxt.realm : '飞升'), ren: false };
    s.trib.target = info.trib || (info.nxt ? info.nxt.realm : '飞升');
    refreshStats(s); saveState(s);
    return { ok: true, info: info, trib: s.trib.target };
  }
  // 检查是否有任意丹药
  function hasAnyElixir(s) {
    for (var id in s.elixirs) {
      if (s.elixirs[id] > 0) return true;
    }
    return false;
  }
  // 完美突破（使用灵物）—— 机制已取消（2026-09-13 灵物改制成法宝）。
  // 保留空壳函数仅为兼容旧调用点：永远返回失败，不再消耗任何东西。
  function perfectBreakthrough(s, spiritId) {
    return { ok: false, msg: '完美突破已取消——灵物已是法宝，请装备后享受其被动效果。' };
  }
  // 普通突破（使用丹药）
  function normalBreakthrough(s, elixirId) {
    if (!canBreak(s)) return { ok: false, msg: '修为尚未圆满。' };
    const info = breakInfo(s);
    // 消耗丹药
    if (elixirId && (s.elixirs[elixirId] || 0) > 0) {
      s.elixirs[elixirId]--;
      if (s.elixirs[elixirId] <= 0) delete s.elixirs[elixirId];
      // 丹药效果：增加气血上限
      const grade = ELIXIRS[elixirId] ? (ELIXIRS[elixirId].grade || '黄') : '黄';
      const hpBonus = ELIXIR_GRADE_HP[grade] || 50;
      s.hpMaxBonus = (s.hpMaxBonus || 0) + hpBonus;
    }
    // 执行突破
    return doBreakthrough(s, info, false);
  }
  // 执行突破
  function doBreakthrough(s, info, isPerfect) {
    const pass = isPerfect || Math.random() < info.base;
    if (pass) {
      s.qi = 0;
      let tech = null;
      if (!info.nxt) {
        tech = pickTech(s, 4);
        if (tech) s.techs.push(tech);
        s.idx = 15; s.realm = '仙';
        s.endReason = '飞升';
        logLife(s, 'feisheng', '渡劫飞升，得道成仙');
        refreshStats(s); saveState(s);
        return { ok: true, win: true, mode: info.mode, trib: info.trib, tech: tech, perfect: isPerfect, line: '天门已开，你于万丈雷光中踏出最后一步。' };
      }
      s.idx += 1;
      s.broken += 1;
      s.hp = calcHpMax(s);
      const oldLife = s.lifeMax;
      s.lifeMax = Math.max(oldLife, REALM_META[info.nxt.realm].life);
      s.realm = info.nxt.realm;
      if (s.idx >= 9 && info.st.bigRealm < 3) logLife(s, 'yuanying', '凝出元婴，阳神出窍');
      else if (s.idx >= 6 && info.st.bigRealm < 2) logLife(s, 'jiedan', '结成金丹');
      else if (s.idx >= 3 && info.st.bigRealm < 1) logLife(s, 'zhuji', '初次筑基');
      s.dunSpeed = 1 + bigIdxOf(s);
      const nb = bigIdxOf(s);
      if (nb > bigIdxOf(info.st)) {
        tech = pickTech(s, nb);
        if (tech) s.techs.push(tech);
      }
      refreshStats(s); saveState(s);
      return { ok: true, win: true, mode: info.mode, trib: info.trib, tech: tech };
    }
    if (!info.nxt) return tribFail(s, info, '飞升', true);
    if (info.mode === 'trib') return tribFail(s, info, info.trib, false);
    if (info.nxt.realm === '筑基') {
      s.qi = Math.round(s.qi * 0.6);
      s.hp = Math.max(1, Math.round(s.hpMax * 0.8));
      refreshStats(s); saveState(s);
      return { ok: true, win: false, mode: 'small', line: '尘障如铁，你冲击数次仍被拒之门外，灵力折损四成，还伤了些元气。看来还需沉淀些时日。' };
    }
    s.qi = Math.round(s.qi * 0.7);
    refreshStats(s); saveState(s);
    return { ok: true, win: false, mode: 'small', line: '瓶颈如铁，任你如何冲击都纹丝不动。你散去凝起的灵力，修为折损三成，看来还需时日。' };
  }
  function tribFail(s, info, trib, isFly) {
    const deathChance = isFly ? 1 : (trib === '元婴' ? 0.25 : (trib === '金丹' ? 0.15 : 0));
    let died = Math.random() < deathChance;
    if (died) {
      s.dead = true;
      s.endReason = '天劫陨落';
      refreshStats(s); saveState(s);
      return { ok: true, win: false, mode: 'trib', trib: trib, died: true };
    }
    const heavy = Math.random() < 0.6;
    s.qi = Math.round(s.qi * (heavy ? 0.4 : 0.7));
    s.hp = Math.max(1, Math.round(s.hpMax * (heavy ? 0.3 : 0.7)));
    if (heavy) s.lifeMax -= 60;
    refreshStats(s); saveState(s);
    return { ok: true, win: false, mode: 'trib', trib: trib,
      line: heavy ? '劫雷灌体，你重伤而退，道基受创，修为折损六成，寿元亦损。' : '劫雷擦肩，你堪堪扛过，虽留一身焦痕，好歹道基未毁。' };
  }

  /* ---------------- 渡劫：人劫（心魔/强敌） · 天劫（对战劫身） ---------------- */
  function xinmoSpec(s) {
    const bi = bigIdxOf(s);
    // 心魔：锚定玩家当前境界(bi)；旧: atk=s.atk*1.05 / hp=s.atk*(5+bi)*1.15 → hp 用基线.atk
    const st = enemyStats(bi, 1.05, (5 + bi) * 1.15, 1, { hpRef: 'atk' });
    return {
      name: '心魔 · 执念化形',
      line: '心魔借你记忆成形，招招都指向你心底最深的破绽。它不认得痛——它就是你的影子。',
      atk: st.atk,
      hp: st.hp,
      loot: {}, loseLoot: { hp: -0.3 }, bi: 0, xinmo: true,
      mechanic: SUPPRESS_MECH,
      dunSpeed: s.dunSpeed || 1
    };
  }
  function tianjieSpec(s, trib) {
    const bi = bigIdxOf(s);
    const isYuan = trib === '元婴';
    const name = isYuan ? '天劫化身 · 紫霄神霄双雷形' : '天劫化身 · 九天应元之形';
    // 天劫：锚定玩家当前境界(bi)；旧: atk=s.atk*(1.1/1.05) / hp=s.hpMax*(0.95/0.72)
    const atkMul = isYuan ? 1.1 : 1.05;
    const hpMul = isYuan ? 0.95 : 0.72;
    const st = enemyStats(bi, atkMul, hpMul, 1);
    return {
      name: name,
      line: '劫云滚滚而下，天雷凝作一具人形，掌中握着整片翻涌的雷霆。它无声地看着你——这一关，没有退路。',
      atk: st.atk,
      hp: st.hp,
      loot: {}, loseLoot: { stone: Math.round(s.stone * 0.2) }, bi: 0, dujie: true, noFlee: true,
      dunSpeed: (s.dunSpeed || 1) + 1
    };
  }
  function dujieWin(s) {
    const info = breakInfo(s);
    s.trib = null;
    s.qi = 0;
    if (!info.nxt) {
      s.idx = 15;
      s.realm = '仙';
      s.endReason = '飞升';
      s.broken += 1;
      s.tribPassed = (s.tribPassed || 0) + 1; // 飞升天劫：这是第 3 次渡劫
      s.hp = calcHpMax(s);
      s.dunSpeed = 1 + bigIdxOf(s);
      logLife(s, 'feisheng', '渡劫飞升，得道成仙');
      refreshStats(s); saveState(s);
      return { ok: true, trib: info.trib, win: true, tech: null };
    }
    s.idx += 1;
    s.broken += 1;
    s.tribPassed = (s.tribPassed || 0) + 1; // 渡过一次天劫（金丹劫 / 元婴劫）
    s.hp = calcHpMax(s);
    const oldLife = s.lifeMax;
    s.lifeMax = Math.max(oldLife, REALM_META[info.nxt.realm].life);
    s.realm = info.nxt.realm;
    if (s.idx >= 9 && info.st.bigRealm < 3) logLife(s, 'yuanying', '渡劫成功，凝出元婴');
    else if (s.idx >= 6 && info.st.bigRealm < 2) logLife(s, 'jiedan', '渡劫成功，结成金丹');
    s.dunSpeed = 1 + bigIdxOf(s);
    const nb = bigIdxOf(s);
    let tech = null;
    if (nb > info.st.bigRealm) {
      tech = pickTech(s, nb);
      if (tech) s.techs.push(tech);
    }
    refreshStats(s); saveState(s);
    return { ok: true, trib: info.trib, win: true, tech: tech };
  }
  /* 劫境序列（需要对战的渡劫：金丹 / 元婴 / 飞升）失败 = 身死道消，直接结档。
     旧实现走 tribFail(..., false)，按 金丹 15% / 元婴 25% 掷骰子决定是否陨落，
     其余情况只「道基受创、修为 -20%」→ 玩家可无限试错，渡劫没有任何份量。
     现在：在劫境里倒下（或中途退出劫境）就是这一世的终点。
     注意：UI 侧进入劫境前会先弹「建议先存档」确认（见 ui.js confirmDujieBeforeTrial）。 */
  function dujieFail(s, trib) {
    s.trib = null;
    s.dead = true;
    s.endReason = '天劫陨落';
    refreshStats(s); saveState(s);
    return { ok: true, win: false, mode: 'trib', trib: trib, died: true,
      line: '劫雷贯穿道基，神魂俱灭——你终究没能跨过这道坎。' };
  }
  function xinmoDone(s) {
    if (!s.trib) s.trib = { target: '金丹', ren: true };
    s.trib.ren = true;
    const gain = Math.round(requireNeed(s) * 0.08);
    s.qi = Math.min(requireNeed(s), s.qi + gain);
    refreshStats(s); saveState(s);
    return '斩却心魔，道心通明——人劫已渡，心神澄澈（修为 +' + gain + '）。';
  }

  /* ---------------- 百艺 · 灵田 / 灵矿 ---------------- */
  function fieldPlots(s) { return s.field || (s.field = []); }
  function fieldInfo(s, i) {
    const plots = fieldPlots(s);
    const p = plots[i];
    if (!p) return null;
    const sd = FIELD_SEEDS[p.seed];
    var growReduce = (s.reinc && s.reinc.herbGrowReduce) || 0;
    var needYears = Math.max(1, sd.years - growReduce);
    const years = Math.max(0, s.year - (p.planted || s.year));
    const done = years >= needYears;
    return { seed: p.seed, name: sd.name, years: years, needYears: needYears, done: done, desc: sd.desc };
  }
  function plantField(s, seedId, quantity, mode) {
    if (!s.materials) s.materials = {};
    const sd = FIELD_SEEDS[seedId];
    if (!sd) return '没有这种种子。';
    const plots = fieldPlots(s);
    // 检查灵田数量限制
    var maxFields = getMaxFields(s);
    var usedFields = plots.filter(function(p) { return p !== null; }).length;
    if (usedFields >= maxFields) return '灵田已满（最多' + maxFields + '亩），先采收再种吧。';
    var qty = quantity || 1;
    var mode2 = mode || 'buy'; // buy=灵石买苗(受境界限) / own=自备灵草下种(不限境界)
    // 档位门槛：仅「买苗」受 realmMin 限制；自备同等级灵草下种不受限
    var bi = bigIdxOf(s);
    if (mode2 === 'buy' && bi < sd.realmMin) return '修为不足——' + BIG_REALMS[sd.realmMin] + '方可去灵田买入【' + sd.name + '】之苗。（若你已有' + MATERIALS[FIELD_GRADE_MAP[sd.grade]].name + '，可自备下种）';
    var herbKey = FIELD_GRADE_MAP[sd.grade] || 'herb_huang';
    // 结算成本
    if (mode2 === 'buy') {
      var costStone = sd.stone * qty;
      if (s.stone < costStone) return '灵石不足，买' + qty + '株【' + sd.name + '】苗需 ' + costStone + ' 灵石。';
      s.stone -= costStone;
    } else {
      var costHerb = sd.herb * qty;
      if ((s.materials[herbKey] || 0) < costHerb) return MATERIALS[herbKey].name + '不足（自备下种需 ' + costHerb + ' 株）。';
      s.materials[herbKey] -= costHerb;
    }
    // 找到第一个空闲的灵田槽位
    var slotIndex = -1;
    for (var i = 0; i < plots.length; i++) {
      if (plots[i] === null) { slotIndex = i; break; }
    }
    if (slotIndex === -1) {
      plots.push({ seed: seedId, planted: s.year, quantity: qty });
    } else {
      plots[slotIndex] = { seed: seedId, planted: s.year, quantity: qty };
    }
    refreshStats(s); saveState(s);
    return '你翻土、下种、引灵泉灌溉，一亩【' + sd.name + '】（' + qty + '株）就此落成。' + (mode2 === 'own' ? '自备' + MATERIALS[herbKey].name + '作苗，省去灵石。' : '灵石' + sd.stone * qty + '买苗已付。');
  }
  // 该级种子是否可「买苗」（境界达标）；灵草是否够自备下种
  function fieldPlantable(s, seedId) {
    const sd = FIELD_SEEDS[seedId];
    if (!sd) return null;
    const herbKey = FIELD_GRADE_MAP[sd.grade] || 'herb_huang';
    const bi = bigIdxOf(s);
    return {
      grade: sd.grade, realmMin: sd.realmMin,
      canBuy: bi >= sd.realmMin,
      buyStone: sd.stone, buyStoneOk: s.stone >= sd.stone,
      canOwn: (s.materials && s.materials[herbKey] || 0) >= sd.herb,
      ownHerb: sd.herb, ownHerbKey: herbKey, herbName: MATERIALS[herbKey] ? MATERIALS[herbKey].name : '灵草',
      buyMsg: bi < sd.realmMin ? '需' + BIG_REALMS[sd.realmMin] : null
    };
  }
  function getMaxFields(s) {
    return 3; // 最多3块灵田
  }
  function unlockField(s) {
    var maxFields = getMaxFields(s);
    var currentFields = s.field ? s.field.length : 0;
    if (currentFields >= maxFields) return { ok: false, msg: '灵田已达上限。' };
    var cost = currentFields === 0 ? 100 : 200;
    if (s.stone < cost) return { ok: false, msg: '灵石不足，需要 ' + cost + ' 灵石。' };
    s.stone -= cost;
    s.field.push(null);
    refreshStats(s); saveState(s);
    return { ok: true, msg: '成功解锁新灵田！（消耗 ' + cost + ' 灵石）' };
  }
  function harvestField(s, i) {
    if (!s.materials) s.materials = {};
    const plots = fieldPlots(s);
    const p = plots[i];
    if (!p) return '这一亩田并不存在。';
    const sd = FIELD_SEEDS[p.seed];
    var growReduce = (s.reinc && s.reinc.herbGrowReduce) || 0;
    var needYears = Math.max(1, sd.years - growReduce);
    const years = s.year - (p.planted || s.year);
    if (years < needYears) return '这一亩【' + sd.name + '】还有 ' + (needYears - years) + ' 年才成熟。';
    var qty = p.quantity || 1;
    var totalGain = 0;
    for (var q = 0; q < qty; q++) {
      totalGain += sd.gain[0] + Math.floor(Math.random() * (sd.gain[1] - sd.gain[0] + 1));
    }
    totalGain = Math.round(totalGain * (1 + (artifactStats(s).farmEff || 0))); // 神农锄：灵田产量 +30%
    // 产出分级灵草
    var herbKey = FIELD_GRADE_MAP[sd.grade] || 'herb_huang';
    s.materials[herbKey] = (s.materials[herbKey] || 0) + totalGain;
    plots[i] = null; // 清空灵田槽位
    refreshStats(s); saveState(s);
    return '你挥锄采收【' + sd.name + '】（' + qty + '株），得' + MATERIALS[herbKey].name + ' ' + totalGain + ' 株';
  }
  // 挖矿：境界定档位(ironKey/伴生草/灵石)，depth(0→10) 深化提升保底与产出率。
  // rounds = 投入强度（连挖几锤）；消耗(行动点/气血)由调用方按轮次先行扣除。
  function digMine(s, rounds) {
    if (!s.materials) s.materials = {};
    if (!s.mine) s.mine = { depth: 0 };
    const bi = bigIdxOf(s);
    const grades = ['huang', 'xuan', 'di', 'tian'];
    const g = grades[bi] || 'huang';
    const ironKey = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'][bi] || 'iron_huang';
    const herbKey = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'][bi] || 'herb_huang';
    const R = Math.max(1, Math.floor(rounds || 1));
    let stoneGot = 0, herbGot = 0, ironGot = 0, depthUp = 0;
    const parts = [];
    for (let k = 0; k < R; k++) {
      const d = s.mine.depth || 0;
      const r = Math.random();
      if (r < 0.15) {
        const st = (8 + d * 2) * 10;
        s.stone += st; stoneGot += st;
      } else if (r < 0.30) {
        const h = (1 + Math.floor(Math.random() * 2)) * 10;
        s.materials[herbKey] = (s.materials[herbKey] || 0) + h; herbGot += h;
      } else {
        const n = Math.round((2 + Math.floor(d / 2) + Math.floor(Math.random() * (3 + Math.floor(d / 3)))) * 10 * (1 + (artifactStats(s).mineEff || 0))); // 寻矿罗盘：灵矿产量 +30%
        s.materials[ironKey] = (s.materials[ironKey] || 0) + n; ironGot += n;
      }
      if (Math.random() < 0.35 && s.mine.depth < 10) { s.mine.depth += 1; depthUp++; }
    }
    const bits = [];
    if (stoneGot) bits.push('灵石 +' + stoneGot);
    if (herbGot) bits.push(MATERIALS[herbKey].name + ' +' + herbGot);
    if (ironGot) bits.push(MATERIALS[ironKey].name + ' +' + ironGot);
    let msg = '你抡起卦锤连凿' + R + '下：' + (bits.length ? bits.join('、') : '只得些碎岩，聊胜于无。') + '。';
    if (depthUp) msg += ' 矿脉愈挖愈深（矿脉深度 +' + depthUp + '，现 ' + (s.mine.depth || 0) + '/10）。';
    refreshStats(s); saveState(s);
    return { ok: true, rounds: R, depth: s.mine.depth || 0, msg: msg, stone: stoneGot, herb: herbGot, iron: ironGot, grade: g };
  }
  // 矿脉信息（供 UI 展示当前档位/深度/已存材料）
  function mineInfo(s) {
    if (!s.mine) s.mine = { depth: 0 };
    const bi = bigIdxOf(s);
    const ironKey = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'][bi] || 'iron_huang';
    const herbKey = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'][bi] || 'herb_huang';
    return { grade: BIG_REALMS[bi], ironKey: ironKey, ironName: MATERIALS[ironKey].name, herbKey: herbKey, herbName: MATERIALS[herbKey].name, depth: s.mine.depth || 0 };
  }

  /* ---------------- 炼制队列系统 ---------------- */
  function startCraft(s, formulaId) {
    if (!s.craftQueue) s.craftQueue = [];
    if (!s.materials) s.materials = {};
    const formula = FORMULAS.find(function(f) { return f.id === formulaId; });
    if (!formula) return { ok: false, msg: '配方不存在' };
    for (var mat in formula.cost) {
      if ((s.materials[mat] || 0) < formula.cost[mat]) {
        return { ok: false, msg: '材料不足' };
      }
    }
    for (var mat in formula.cost) {
      s.materials[mat] -= formula.cost[mat];
    }
    // 计算炼制时间（丹心减少炼丹时间，器魂减少炼器时间，心法再减）
    var craftYears = formula.years;
    if (formula.type === '丹') {
      var timeReduce = (s.reinc && s.reinc.alchemyTimeReduce) || 0;
      craftYears = Math.max(0, craftYears - timeReduce);
    } else if (formula.type === '装备') {
      var forgeTimeReduce = (s.reinc && s.reinc.forgeTimeReduce) || 0;
      craftYears = Math.max(0, craftYears - forgeTimeReduce);
    }
    // 心法缩短炼制时间（丹道真解/九转丹典 craftTimeReduce，单位：年）
    craftYears = Math.max(0, craftYears - getXinfaCraftReduce(s, formula.type));
    // 如果时间为0，直接完成
    if (craftYears <= 0) {
      if (formula.type === '丹') {
        s.elixirs[formula.out] = (s.elixirs[formula.out] || 0) + 1;
        var instantMsg = '丹心通明，瞬间成丹！';
      } else {
        grantEquipChecked(s, formula.out);
        var instantMsg = '器魂觉醒，瞬间成器！';
      }
      refreshStats(s); saveState(s);
      return { ok: true, msg: instantMsg, instant: true };
    }
    s.craftQueue.push({
      formulaId: formulaId,
      startYear: s.year,
      endYear: s.year + craftYears,
      output: formula.out,
      type: formula.type
    });
    refreshStats(s); saveState(s);
    return { ok: true, msg: '开始炼制，需要' + craftYears + '年' };
  }
  function accelerateCraft(s, queueIndex) {
    if (!s.craftQueue || !s.craftQueue[queueIndex]) return { ok: false, msg: '炼制任务不存在' };
    var craft = s.craftQueue[queueIndex];
    var formula = FORMULAS.find(function(f) { return f.id === craft.formulaId; });
    if (!formula) return { ok: false, msg: '配方不存在' };
    var accelYears = { 0: 2, 1: 3, 2: 4, 3: 5 };
    var accel = accelYears[formula.needRealm] || 2;
    craft.endYear -= accel;
    var msg = '加速' + accel + '年';
    if (craft.endYear <= s.year) {
      msg += '，炼制完成！';
      if (craft.type === '丹') {
        s.elixirs[craft.output] = (s.elixirs[craft.output] || 0) + 1;
      } else {
        grantEquipChecked(s, craft.output);
      }
      s.craftQueue.splice(queueIndex, 1);
    }
    refreshStats(s); saveState(s);
    return { ok: true, msg: msg };
  }

  /* ---------------- 仙缘 NPC 缘法 · 好感系统 ----------------
   * NPC 缘法事件（NPCS）的「好感度分级 / 好感奖励 / 互动」统一在此实现：
   *   npcUnlocked  —— 是否达成解锁剧情
   *   favorTier    —— 当前好感分级（含奖励阈值）
   *   grantFavor   —— 加好感并结算越级奖励
   *   giveGift     —— 送礼（每年一次，扣灵石）
   *   talkNpc      —— 叙话（每年一次，+1）
   *   drawXianyuan —— 游历内独立的仙缘单抽入口
   */
  function npcById(id) { return (typeof NPCS !== 'undefined') ? NPCS[id] : null; }
  function npcUnlocked(s, n) { return !!(s.seen && n.unlock && s.seen[n.unlock.story]); }
  function favorOf(s, id) { if (!s.favor) s.favor = {}; return s.favor[id] || 0; }
  function favorTier(n, favor) {
    let cur = n.tiers[0];
    for (let i = 0; i < n.tiers.length; i++) if (favor >= n.tiers[i].min) cur = n.tiers[i];
    return cur;
  }
  function ensureFavorReward(s) { if (!s.favorReward) s.favorReward = {}; }
  // 跨过好感阈值时结算一次性奖励（避免重复发放）
  function crossTierRewards(s, n, before, after) {
    ensureFavorReward(s);
    const claimed = s.favorReward[n.id] || (s.favorReward[n.id] = []);
    const msgs = [];
    n.tiers.forEach(function (t, i) {
      if (t.reward && before < t.min && after >= t.min && claimed.indexOf(i) < 0) {
        claimed.push(i);
        applyOps(s, t.reward.effect);
        msgs.push(t.reward.text);
      }
    });
    return msgs;
  }
  function grantFavor(s, id, amt) {
    const n = npcById(id); if (!n) return { ok: false, msg: '对象不存在' };
    if (!s.favor) s.favor = {};
    const before = favorOf(s, id);
    const after = Math.min(n.maxFavor, before + amt);
    s.favor[id] = after;
    const rw = crossTierRewards(s, n, before, after);
    refreshStats(s); saveState(s);
    return { ok: true, before: before, after: after, rewards: rw };
  }
  function giveGift(s, id, giftType) {
    const n = npcById(id); if (!n) return { ok: false, msg: '对象不存在' };
    if (!n.gifts || !n.gifts[giftType]) return { ok: false, msg: '没有此礼物' };
    if (!npcUnlocked(s, n)) return { ok: false, msg: '尚未结识，无法赠礼' };
    if (!s.giftCooldown) s.giftCooldown = {};
    if ((s.giftCooldown[id] || 0) >= s.year) return { ok: false, msg: '今年已赠过礼' };
    const g = n.gifts[giftType];
    if ((s.stone || 0) < (g.cost || 0)) return { ok: false, msg: '灵石不足' };
    s.stone -= (g.cost || 0);
    s.giftCooldown[id] = s.year;
    const r = grantFavor(s, id, g.favor);
    return { ok: true, msg: '赠' + g.name + '，好感 +' + g.favor + (r.rewards.length ? '；' + r.rewards.join('、') : '') };
  }
  function talkNpc(s, id) {
    const n = npcById(id); if (!n) return { ok: false, msg: '对象不存在' };
    if (!npcUnlocked(s, n)) return { ok: false, msg: '尚未结识，无法叙话' };
    if (!s.talkCooldown) s.talkCooldown = {};
    if ((s.talkCooldown[id] || 0) >= s.year) return { ok: false, msg: '今年已叙话' };
    s.talkCooldown[id] = s.year;
    const r = grantFavor(s, id, 1);
    const line = (n.talk && n.talk.line) ? n.talk.line : ('你与' + n.name + '闲谈片刻，好感 +1');
    return { ok: true, msg: line + (r.rewards.length ? '；' + r.rewards.join('、') : '') };
  }
  // 游历内独立的仙缘单抽：从统一仙缘池 XIANYUAN 抽取（无概率门槛，但每年限 3 次），消耗 1 行动点
  const XIANYUAN_DRAW_CFG = { perYearMax: 3 };
  // 探寻仙缘：单独从已解锁的 NPC 游历缘法中抽 1 桩，1 行动点/年，与常规游历不冲突
  const NPC_TRAVEL_CFG = { perYearMax: 1 };
  function seekNpcXianyuan(s) {
    if (!canAction(s, 1)) return false;
    if ((s.npcTravelYearCount || 0) >= NPC_TRAVEL_CFG.perYearMax) return '今年已探寻过仙缘，来日方长。';
    const pool = [];
    if (typeof NPCS !== 'undefined') {
      Object.keys(NPCS).forEach(function (k) {
        const n = NPCS[k];
        if (n.surface === 'travel' && n.event && npcUnlocked(s, n) && evOK(s, 1)(n.event)) pool.push(n.event);
      });
    }
    // 尚无已解锁的仙缘之人：不扣点、不占本年次数，仅提示（避免前期反复「遍寻不见」刷屏）
    if (!pool.length) return '你尚无可寻访的仙缘之人。待主线结识故人后，再来探寻。';
    spend(s, 1);
    const ev = pickWeighted(pool);
    s.seen[ev.id] = 1;
    s.npcTravelYearCount = (s.npcTravelYearCount || 0) + 1;
    return ev;
  }
  function drawXianyuan(s) {
    if (!canAction(s, 1)) return '行动点不足，无法叩问仙缘。';
    if ((s.xianyuanYearCount || 0) >= XIANYUAN_DRAW_CFG.perYearMax) return '今年仙缘已尽，来日方长。';
    const pool = XIANYUAN.filter(evOK(s, 1));
    if (!pool.length) return '此世仙缘你已尽数叩问过，再叩亦是风声。（未消耗行动点）';
    const ev = pickWeighted(pool);
    spend(s, 1);
    s.seen[ev.id] = 1;
    s.xianyuanYearCount = (s.xianyuanYearCount || 0) + 1;
    return ev;
  }

  /* ---------------- 事件系统 ---------------- */
  function getAvailableEvents(s) {
    if (!s.completedEvents) s.completedEvents = {};
    var events = [];
    if (bigIdxOf(s) >= 1 && !s.completedEvents['main_zhuji']) {
      events.push({ id: 'main_zhuji', title: '筑基之路', desc: '修为达到筑基，可开启新篇章。' });
    }
    if (bigIdxOf(s) >= 2 && !s.completedEvents['main_jindan']) {
      events.push({ id: 'main_jindan', title: '金丹大道', desc: '修为达到金丹，天命显现。' });
    }
    if (bigIdxOf(s) >= 3 && !s.completedEvents['main_yuanying']) {
      events.push({ id: 'main_yuanying', title: '元婴之劫', desc: '修为达到元婴，心魔来袭。' });
    }
    return events;
  }
  function triggerEvent(s, eventId) {
    if (!s.completedEvents) s.completedEvents = {};
    s.completedEvents[eventId] = true;
    saveState(s);
    return { ok: true, msg: '事件完成' };
  }

  /* ---------------- 年末 / 岁月 ---------------- */
  function endYear(s) {
    s.age += 1;
    s.yearActions = 0;
    s.xianyuanYearCount = 0;      // 每年重置仙缘触发计数（配合 rollXianyuan 的 perYearMax 频率控制）
    s.travelYearCount = 0;        // 每年重置游历次数（配合 travel 的 TRAVEL_CFG.perYearMax 频率控制）
    s.shanheYearCount = 0;       // 每年重置山河探索次数（配合 SHANHE_CFG.perYearMax 频率控制）
    s.npcTravelYearCount = 0;     // 每年重置探寻仙缘次数
    const exceed = s.age >= s.lifeMax || s.hp <= 0;
    if (exceed) {
      s.dead = true;
      s.endReason = s.hp <= 0 ? '重伤陨落' : '寿元耗尽';
      refreshStats(s); saveState(s);
      return 'end';
    }
    if (s.age >= 200) return 'fate';
    if (s.idx >= 15) return 'end';
    s.year += 1;
    // —— 年度结算：聚灵阵年耗 + 阵法被动心得 + 宗门地位自动晋升（杂役筑基升内门 / 正式档按功业晋升）——
    julingYearEnd(s);
    zhenfaPassiveExp(s);   // 聚灵阵 / 五行阵布置着即逐年累积阵道心得
    const ru = sectYearPromote(s);
    if (ru) s.lastYearRankUp = ru.rank;
    // 命格年度效果
    applyDestinyYearly(s);
    // 命格灵石年度效果
    (s.destinies || []).forEach(function(d) {
      const dest = DESTINIES[d];
      if (dest && dest.effect && dest.effect.stonePerYear) {
        s.stone += dest.effect.stonePerYear;
      }
    });
    s.actionsLeft = actionPoints(s);
    refreshStats(s);              // 先刷新上限（灵力提升后 mpMax 可能增长）
    s.hp = s.hpMax;               // 年末：气血回满
    s.mp = s.mpMax;               // 年末：灵力同步回满
    s.cultedThisYear = false;
    s.cultTimes = 0;
    // 法宝：聚宝盆（每年得灵石 = 当前 ×5%）
    const artY = artifactStats(s);
    if (artY.stoneYearPct) { const add = Math.round(s.stone * artY.stoneYearPct); s.stone += add; s.lastYearStoneBonus = add; }
    let fenglu = null;
    if (s.sect && SECT_FENGLU[s.sect]) {
      const f = SECT_FENGLU[s.sect];
      const parts = [];
      if (f.stone) { s.stone += f.stone; parts.push('灵石 +' + f.stone); }
      if (f.herb) { var gh = applyOps(s, { herb: f.herb }); parts.push(gh[0] || ('灵草 +' + f.herb)); }
      if (f.iron) { var gi2 = applyOps(s, { iron: f.iron }); parts.push(gi2[0] || ('灵铁 +' + f.iron)); }
      fenglu = parts;
    }
    // 成长性命格：每年累积属性
    if (s.talents) {
      s.talents.forEach(function (tid) {
        var t = TALENTS.filter(function (x) { return x.id === tid; })[0];
        if (t && t.apply) {
          if (t.apply.growWu) { s.wu += t.apply.growWu; }
          if (t.apply.growTi) { s.ti += t.apply.growTi; }
          // 御风化影：每年遁速 +0.5（永久累积，用浮点累加后落整，避免被取整吃掉）
          if (t.apply.growDun) {
            s.dunGrowAcc = (s.dunGrowAcc || 0) + t.apply.growDun;
            var whole = Math.floor(s.dunGrowAcc);
            if (whole > 0) { s.dun += whole; s.dunGrowAcc -= whole; }
          }
        }
      });
    }
    refreshStats(s);
    // 年度自动存档：每年年初（s.year 已 +1）写一次自动存档位。
    // autoSaveYear 供 UI 提示玩家「已自动存档 · 第 N 年」，也用于中途退出后的续档校验。
    s.autoSaveYear = s.year;
    saveState(s);
    return fenglu ? 'ok|' + fenglu.join('、') : 'ok';
  }
  /* ---------------- 灾劫玉符（五劫主线串联） ----------------
   * 第 3 年坊市相遇（瞎眼算命老道硬塞玉符）→ 每年识海浮现黑字「死劫还剩 X 年」
   * → 每渡一劫玉符多一道裂纹 → 五劫尽渡显「飞升天劫 · 无期」
   * → 难度系数 s.jie >= 6 时玉符裂开，显「轮回之外……」，解锁隐藏线（魔祖仙帝）。
   */
  // 下一劫 = 第一道「尚未触发」的死劫（死劫按年份顺序强制触发，触发时写入 seen）
  function nextDeathEvent(s) {
    for (var i = 0; i < DEATH_EVENTS.length; i++) {
      if (s.seen && s.seen['death_' + DEATH_EVENTS[i].year]) continue;
      return DEATH_EVENTS[i];
    }
    return null;
  }
  function omenYearsLeft(s) {
    const nx = nextDeathEvent(s);
    return nx ? (nx.year - s.year) : -1;
  }
  function omenText(s) {
    if (!s.omen || !s.omen.got) return '';
    if (!s.omen.allPassed) {
      const n = omenYearsLeft(s);
      if (n < 0) return (OMEN_TALISMAN && OMEN_TALISMAN.afterAll) || '飞升天劫 · 无期';
      if (n <= 0) return (OMEN_TALISMAN && OMEN_TALISMAN.tickNow) || '就是今年';
      if (n <= 1) return ((OMEN_TALISMAN && OMEN_TALISMAN.tickNear) || '死劫还剩 {n} 年（近了）').replace('{n}', n);
      return ((OMEN_TALISMAN && OMEN_TALISMAN.tick) || '死劫还剩 {n} 年').replace('{n}', n);
    }
    if (s.omen.hiddenOpen) return (OMEN_TALISMAN && OMEN_TALISMAN.hiddenOpen) || '轮回之外……';
    if ((s.jie || 0) >= 6) return (OMEN_TALISMAN && OMEN_TALISMAN.hiddenOpen) || '轮回之外……';
    return (OMEN_TALISMAN && OMEN_TALISMAN.afterAll) || '飞升天劫 · 无期';
  }
  function grantOmen(s) {
    if (!s.omen) s.omen = {};
    s.omen.got = true;
    s.omen.gotYear = s.year;
    s.omen.cracks = 0;
    s.omen.allPassed = false;
    s.omen.hiddenOpen = false;
    saveState(s);
    return s.omen;
  }
  function omenOnDeathPassed(s, idx) {
    if (!s.omen) s.omen = { got: true, cracks: 0 };
    s.omen.cracks = Math.max(s.omen.cracks || 0, (idx || 0) + 1);
    if ((s.omen.cracks || 0) >= DEATH_EVENTS.length) s.omen.allPassed = true;
    saveState(s);
    return s.omen;
  }
  // 隐藏线解锁：五劫尽渡 + 难度系数 s.jie >= 6（劫数逐轮解锁，6 劫须至少通关 6 次）
  function omenHiddenReady(s) {
    return !!(s.omen && s.omen.allPassed && !s.omen.hiddenOpen && !s.omen.hiddenDone && (s.jie || 0) >= 6);
  }
  function openOmenHidden(s) {
    if (!s.omen) s.omen = { got: true };
    s.omen.hiddenOpen = true;
    saveState(s);
    return s.omen;
  }

  // 主线门禁（**唯一口径**）：checkYearEvents 与 moreMainline 共用，避免两处判定分叉。
  //   noSect        —— 已正式入宗则不再播（如 ml_2_0「仙门收徒」：都入门了不必再劝应考）
  //   needSect      —— 宗门向主线：未正式入宗则顺延挂起，不阻塞后续非宗门主线
  //   afterSectYear —— 入宗后的**下一年**才播（玩家定稿：初入宗门 / 百艺初窥）
  function mainlineGateOK(s, ml) {
    if (ml.noSect && sectPassed(s)) return false;
    if (ml.needSect && !sectPassed(s)) return false;
    if (ml.afterSectYear && s.sectJoinYear && (s.year || 1) <= s.sectJoinYear) return false;
    return true;
  }
  function checkYearEvents(s) {
    // 灾劫玉符：第 3 年坊市相遇（一次性，优先于其他年初事件）
    if (OMEN_TALISMAN && s.year >= (OMEN_TALISMAN.meetYear || 3) && !s.seen['omen_meet']) {
      s.pendingOmen = true;
      saveState(s);
      return 'omen';
    }
    // 隐藏线：五劫尽渡且 jie >= 6 → 下一年年初开启【轮回之外】
    if (omenHiddenReady(s)) {
      openOmenHidden(s);
      s.pendingHidden = true;
      saveState(s);
      return 'hidden_boss';
    }
    // 死劫检查（18 / 36 / 49 / 64 / 81 年）
    for (var di = 0; di < DEATH_EVENTS.length; di++) {
      if (s.year >= DEATH_EVENTS[di].year && !s.seen['death_' + DEATH_EVENTS[di].year]) {
        var dev = Object.assign({}, DEATH_EVENTS[di]);
        var dyn = deathEnemyGen(s, di);
        dev.fight = { name: DEATH_EVENTS[di].fight.name, atk: dyn.atk, hp: dyn.hp };
        dev.deathIdx = di;
        s.pendingDeathEvent = dev;
        saveState(s);
        return 'death_event';
      }
    }
    // 主线剧情触发检查（needSect 条目：须正式入宗才播，否则跳过挂起 → 顺延；杂役同样不满足 sectPassed）
    for (var mi = 0; mi < MAINLINE.length; mi++) {
      var ml = MAINLINE[mi];
      if (ml.fixYear && s.year < ml.fixYear) continue;    // 固定年份主线：未到指定年不触发（如聚灵珠固定第10年）
      if (ml.idx <= s.idx && !s.seen['ml_' + ml.id] && (!ml.req || evReqOK(s, ml))) {
        if (!mainlineGateOK(s, ml)) continue;   // 门禁：needSect / noSect / afterSectYear
        s.pendingMainline = ml;
        saveState(s);
        return 'mainline';
      }
    }
    // 宗门大比：每 intervalYears 年一次（外门及以上可参与）
    if (s.sect && s.sectRank && s.sectRank !== '杂役') {
      const iv = (SECT_DABI && SECT_DABI.intervalYears) || 3;
      if (iv > 0 && s.year % iv === 0 && s.lastDabiYear !== s.year) {
        s.pendingDabi = true;
        saveState(s);
        return 'dabi';
      }
    }
    return null;
  }
  // T4：mainline 年初连播辅助——当前主线播完后探测并取「下一条」未触发的满足主线。
  // 用途：同一新年可将已达 idx 的多条主线依次连播（不被逐年后延）。返回 true 并设 s.pendingMainline。
  function moreMainline(s) {
    for (var mi = 0; mi < MAINLINE.length; mi++) {
      var ml = MAINLINE[mi];
      if (ml.fixYear && s.year < ml.fixYear) continue;    // 固定年份主线：未到指定年不触发
      if (ml.idx <= s.idx && !s.seen['ml_' + ml.id] && (!ml.req || evReqOK(s, ml))) {
        if (!mainlineGateOK(s, ml)) continue;   // 同 checkYearEvents：口径同一函数
        s.pendingMainline = ml;
        saveState(s);
        return true;
      }
    }
    return false;
  }
  function fateBattle(s) {
    const winChance = { '炼气': 0.02, '筑基': 0.08, '金丹': 0.22, '元婴': 0.5 }[s.realm] || 0.02;
    const win = Math.random() < winChance;
    s.dead = true;
    s.endReason = win ? '飞升' : '天劫陨落';
    s.fateWin = win;
    if (win) logLife(s, 'feisheng', '渡劫飞升，证道成仙');
    refreshStats(s); saveState(s);
    return win;
  }

  /* ---------------- 生涯记录 ---------------- */
  function logLife(s, type, text, pts) {
    if (!s.lifeLog) s.lifeLog = [];
    s.lifeLog.push({ type: type, text: text, pts: pts || 0 });
  }
  function computeAdvPoints(s) {
    const TIER_PTS = { huang: 2, xuan: 4, di: 7, tian: 11, xian: 15 };
    const ORDER = ['huang', 'xuan', 'di', 'tian', 'xian'];
    const cleared = ORDER.filter(function (k) { return advCleared(s, k); });
    let pts = 0;
    cleared.forEach(function (k) { pts += TIER_PTS[k]; });
    const n = cleared.length;
    if (n >= 4) pts += 8; else if (n >= 3) pts += 4; else if (n >= 2) pts += 2;
    const tier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
    const cap = (tier[s.realm] || 2) * 2;
    pts = Math.min(pts, cap);
    // 额外：秘境探索期间击败的敌人（逃跑不计入），每击败 1 个 +0.05 轮回点，四舍五入
    const advKills = (s.exploreKills || 0);
    pts += Math.round(advKills * 0.05);
    return pts;
  }
  function settlePoints(s, meta) {
    var ach = earnPoints(s, meta);
    var realmTier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
    var realmPts = realmTier[s.realm] || 2;
    var breakPts = Math.min(10, (s.tribPassed || 0) * 3); // 每次成功渡劫 3 点（金丹劫 / 元婴劫 / 飞升劫）
    var deathPts = (s.deathPassed || 0) * 2;
    var advPts = computeAdvPoints(s);
    var achPts = 0;
    ach.forEach(function (a) { if (a.new) achPts += ACHIEVEMENTS[a.id].pts; });
    var top5 = [];
    if (s.endReason === '打破轮回' || s.hiddenWin) top5.push({ text: '击败魔祖仙帝，打破轮回', pts: 0, cls: 'gold' });
    if (s.flags && s.flags.daoLu) top5.push({ text: '感悟大道真意', pts: 0, cls: 'gold' });
    if (s.idx >= 9) top5.push({ text: '凝出元婴，阳神出窍', pts: 0, cls: 'realm' });
    if (s.idx >= 6) top5.push({ text: '结成金丹，踏入金丹大道', pts: 0, cls: 'realm' });
    if (s.sect) top5.push({ text: '拜入' + SECTS[s.sect].name, pts: 0, cls: 'sect' });
    if ((s.tribPassed || 0) >= 1) top5.push({ text: '一世渡劫' + s.tribPassed + '次而不陨', pts: 0, cls: 'realm' });
    if (s.idx >= 3 && s.idx < 6) top5.push({ text: '初次突破筑基', pts: 0, cls: 'realm' });
    top5.sort(function (a, b) { return b.pts - a.pts; });
    top5 = top5.slice(0, 5);
    return {
      total: s.earnedPoints || 0,
      breakdown: { realm: realmPts, trib: breakPts, death: deathPts, explore: advPts, ach: achPts },
      ach: ach,
      top5: top5
    };
  }

  /* ---------------- 结局结算 / 轮回 ---------------- */
  function earnPoints(s, meta) {
    const tier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
    const realmPts = tier[s.realm] || 2;
    const tribPts = Math.min(10, (s.tribPassed || 0) * 3); // 每次成功渡劫 3 点
    const deathPts = (s.deathPassed || 0) * 2;
    const advPts = computeAdvPoints(s);
    const ach = checkAchievements(s, meta);
    let achPts = 0;
    ach.forEach(function (a) { if (a.new) achPts += ACHIEVEMENTS[a.id].pts; });
    const base = realmPts + tribPts + deathPts + advPts + achPts;
    const jie = s.jie || 0;
    const K = 0.05;
    // 结局倍率：打破轮回 1.5（击败魔祖仙帝）> 飞升 1.2 > 寻常了此一生 1.0
    const endMul = (s.endReason === '打破轮回' || s.hiddenWin) ? 1.5
      : ((s.endReason === '飞升' || s.idx >= 15 || s.realm === '仙') ? 1.2 : 1.0);
    let pts = Math.round(base * endMul * (1 + jie * 0.2)) + Math.round(base * jie * K);
    s.earnedPoints = pts;
    return ach;
  }
  // 66 条成就判定核心（结算与实时共用）
  function achDefs(s, meta) {
    meta = meta || loadMeta();
    const techs = s.techs || [];
    const treasure = s.equip ? (s.equip.treasure || []) : [];
    const seen = s.seen || {};
    const seenDest = (meta.destinySeen) || {};
    const bossKills = s.bossKills || {};
    const bossMech = s.bossMech || {};
    const mechSet = {};
    Object.keys(bossMech).forEach(function (k) { if (bossMech[k]) mechSet[bossMech[k]] = 1; });
    const MECHS = ['thorns', 'enrage', 'summon', 'lifesteal', 'multicast'];
    const TIERS5 = ['huang', 'xuan', 'di', 'tian', 'xian'];
    // 功法类别
    const techCls = {};
    techs.forEach(function (t) { const x = TECHNIQUES[t]; if (x && x.cls) techCls[x.cls] = 1; });
    const clsCount = Object.keys(techCls).length;
    // 法宝阶位
    const treasureGrades = {};
    treasure.forEach(function (id) { const a = ARTIFACTS[id]; if (a) treasureGrades[a.grade] = 1; });
    const allArtifacts = Object.keys(ARTIFACTS);
    const allXian = allArtifacts.filter(function (id) { return ARTIFACTS[id].grade === '仙'; });
    // 灵物（秘藏专属法宝）四件：集齐即解锁隐藏成就「秘藏尽收」
    const allSpiritArts = allArtifacts.filter(function (id) { return ARTIFACTS[id].spirit; });
    const fabaoAll = allArtifacts.every(function (id) { return treasure.indexOf(id) >= 0; });
    const xianAll = allXian.every(function (id) { return treasure.indexOf(id) >= 0; });
    // 命格
    const seenDestKeys = Object.keys(seenDest);
    const allDest = Object.keys(DESTINIES);
    const destAll = allDest.every(function (id) { return seenDest[id]; });
    const hasGold = seenDestKeys.some(function (id) { return DESTINIES[id] && DESTINIES[id].grade === '金'; });
    // 游历事件见闻
    const travelEvIds = (typeof EVENTS !== 'undefined') ? EVENTS.jiyuan.concat(EVENTS.shejiao).map(function (e) { return e.id; }) : [];
    const travelAll = travelEvIds.length > 0 && travelEvIds.every(function (id) { return seen[id]; });
    // NPC
    const npcKeys = (typeof NPCS !== 'undefined') ? Object.keys(NPCS) : [];
    const maxFavor = function (k) { const n = NPCS[k]; return (n && n.maxFavor != null) ? n.maxFavor : (n && n.tiers ? n.tiers[n.tiers.length - 1].min : 10); };
    const anyNpcMet = npcKeys.some(function (k) { return npcUnlocked(s, NPCS[k]); });
    const allNpcMet = npcKeys.length > 0 && npcKeys.every(function (k) { return npcUnlocked(s, NPCS[k]); });
    const anyFavorMax = npcKeys.some(function (k) { return (favorOf(s, k) || 0) >= maxFavor(k); });
    const allFavorMax = npcKeys.length > 0 && npcKeys.every(function (k) { return (favorOf(s, k) || 0) >= maxFavor(k); });
    // 锻体
    const dc = (s.duanti && s.duanti.counts) ? s.duanti.counts : { ti: 0, dun: 0, shen: 0 };
    const duantiAny = dc.ti >= 1 || dc.dun >= 1 || dc.shen >= 1;
    const duantiAll = dc.ti >= 1 && dc.dun >= 1 && dc.shen >= 1;
    const duantiMax = dc.ti >= 10 && dc.dun >= 10 && dc.shen >= 10;
    // 百艺
    let maxCraftLv = 0;
    if (s.craft) Object.keys(s.craft).forEach(function (k) { const c = s.craft[k]; if (c && c.lv > maxCraftLv) maxCraftLv = c.lv; });
    const lianBoth = s.craft && s.craft.liandan && s.craft.liandan.lv >= 2 && s.craft.lianqi && s.craft.lianqi.lv >= 2;
    const fieldOk = s.mine && (s.mine.depth || 0) >= 5; // 矿脉深掘：深度≥5

    const d = {
      /* 修行 */
      // 境界类成就一律以「当前阶位索引 s.idx」判定（0 炼气前期 … 3 筑基前期 … 6 金丹前期 … 9 元婴前期 … 15 仙）。
      // 曾误用 s.broken（突破次数，每次小阶提升都 +1）→ 炼气前期一破中期就点亮了「筑基」成就。
      shou_zhuji: s.idx >= 3,
      shou_jiejin: s.idx >= 6,
      shou_yuanying: s.idx >= 9,
      feisheng: s.idx >= 15 || s.endReason === '飞升',
      sanjie: (s.tribPassed || 0) >= 3, // 渡劫三次而不陨（金丹劫 / 元婴劫 / 飞升劫），不是"突破三次"
      wudao: !!(s.flags && s.flags.daoLu) && s.endReason === '飞升',
      /* 秘境 */
      chu_tan: !!(s.flags && s.flags.advClear && Object.keys(s.flags.advClear).some(function (k) { return s.flags.advClear[k]; })),
      feizhai: !!(s.flags && s.flags.advClear && s.flags.advClear.huang),
      daheishan: !!(s.flags && s.flags.advClear && s.flags.advClear.xuan),
      dongtian: !!(s.flags && s.flags.advClear && s.flags.advClear.di),
      moya: !!(s.flags && s.flags.advClear && s.flags.advClear.tian),
      shou_cang: TIERS5.slice(0, 4).every(function (k) { return advCleared(s, k); }),
      yi_shi: !!(s.flags && s.flags.advClear && s.flags.advClear.xian),
      quanjing: TIERS5.every(function (k) { return advCleared(s, k); }),
      /* 战斗 */
      shousha: Object.keys(bossKills).length >= 1,
      wujie: TIERS5.every(function (k) { return bossKills[k]; }),
      jizhi: MECHS.every(function (m) { return mechSet[m]; }),
      ruoqiang: !!s.weakBossWin,
      wushang: (s.advNoDmgCount || 0) >= 1,
      busi: (s.advNoDmgCount || 0) >= 10,
      pingjie: (s.deathPassed || 0) >= 5,
      /* 收集 */
      ming_chu: seenDestKeys.length >= 1,
      shiming: seenDestKeys.length >= 10,
      sanshiming: seenDestKeys.length >= 30,
      jinse: hasGold,
      mingbo: destAll,
      chu_fabao: treasure.length >= 1,
      fabao_cang: treasure.length >= 15,
      fabao_da: fabaoAll,
      xianqi: !!treasureGrades['仙'],
      xianqi_man: xianAll,
      chu_dao: techs.length >= 1,
      bai_jia: clsCount >= 3,
      daofa_3k: techs.length >= 15,
      wanfa: techs.length >= 30,
      sanxiu_dao: techs.length >= 6 && clsCount >= 3,
      /* 成长 */
      lianti_chu: duantiAny,
      sanxi_xiu: duantiAll,
      lianti_yuan: duantiMax,
      chukan_baiyi: maxCraftLv >= 2,
      danqi: lianBoth,
      baiyi_tong: maxCraftLv >= 5,
      lingtian: fieldOk,
      /* 仙缘 */
      shanhe: (s.travelCount || 0) >= 50,
      bianli: travelAll,
      chu_yuan: anyNpcMet,
      zhongsheng: allNpcMet,
      qingshen: anyFavorMax,
      yuanding: allFavorMax,
      daolu: !!(s.flags && s.flags.daoLu),
      /* 轮回 */
      churu: (meta.lives || 0) >= 1,
      jingshi3: (meta.lives || 0) >= 3,
      wangu: (meta.lives || 0) >= 10,
      jishan: (meta.earnedTotal || 0) >= 100,
      fujia: (meta.earnedTotal || 0) >= 500,
      tianfu: REINCARNATION.every(function (r) { return (meta.reinc[r.id] || 0) >= r.max; }),
      /* 人生 */
      shou_zhong: s.endReason === '寿元耗尽',
      ai_renzi: s.age >= 200,
      chang_sheng: s.age >= 300,
      san_xiu: !s.sect && s.idx >= 6,
      dacheng: s.idx >= 15 && s.broken >= 3,
      /* 隐藏 */
      xianren: !!(s.flags && s.flags.ktPage),
      heimao: (favorOf(s, 'heimao') || 0) >= 8 && seen[NPCS.heimao.event.id],
      wanmei: allSpiritArts.length > 0 && allSpiritArts.every(function (id) { return ownsArt(s, id); }),
      lianti_zhen: !!((s.seen && s.seen['ml_0_5'])) && duantiMax,
      tiandao: Object.keys(ACHIEVEMENTS).filter(function (id) { return id !== 'tiandao' && meta.achievements[id]; }).length >= Object.keys(ACHIEVEMENTS).length - 1
    };
    return d;
  }
  // 结算判定：写入 meta.achievements 并返回新解锁（用于发点）
  function checkAchievements(s, meta) {
    meta = meta || loadMeta();
    const defs = achDefs(s, meta);
    const res = [];
    Object.keys(defs).forEach(function (id) {
      if (defs[id] && !meta.achievements[id]) {
        meta.achievements[id] = 1;
        res.push({ id: id, new: true });
      } else if (defs[id]) {
        res.push({ id: id, new: false });
      }
    });
    if (res.length) saveMeta(meta);
    return res;
  }
  // 实时判定：游玩中检测「当前已达成但尚未提示」的成就，仅标记 announcedAch，不写 meta（避免与结算重复发点）
  function checkAchievementsLive(s, meta) {
    meta = meta || loadMeta();
    const defs = achDefs(s, meta);
    if (!s.announcedAch) s.announcedAch = {};
    const out = [];
    Object.keys(defs).forEach(function (id) {
      if (defs[id] && !meta.achievements[id] && !s.announcedAch[id]) {
        s.announcedAch[id] = 1;
        out.push(id);
      }
    });
    if (out.length) saveState(s);
    return out;
  }

  /* ---------------- 图鉴（CODEX） ---------------- */
  // 把当前持有的法宝归档进「曾拥有」集合，保证卖出/替换后图鉴仍记已发现
  function syncTreasureSeen(s) {
    if (!s) return;
    if (!s.treasureSeen) s.treasureSeen = {};
    const tr = (s.equip && s.equip.treasure) ? s.equip.treasure : [];
    tr.forEach(function (id) { s.treasureSeen[id] = 1; });
    saveState(s);
  }
  // 各分类发现状态：{ 分类: { id: true/false } }
  function codexState(s, meta) {
    meta = meta || loadMeta();
    const out = {};
    const seenDest = meta.destinySeen || {};
    const treasure = (s && s.equip && s.equip.treasure) ? s.equip.treasure : [];
    const seenT = (s && s.treasureSeen) ? s.treasureSeen : {};
    const techs = (s && s.techs) ? s.techs : [];
    const seen = (s && s.seen) ? s.seen : {};
    // 法宝（当前持有 或 曾拥有）
    out.artifacts = {};
    Object.keys(ARTIFACTS).forEach(function (id) {
      out.artifacts[id] = (treasure.indexOf(id) >= 0) || !!seenT[id];
    });
    // 命格（跨世累计）
    out.destinies = {};
    Object.keys(DESTINIES).forEach(function (id) { out.destinies[id] = !!seenDest[id]; });
    // 仙命（金阶命格，全展示，不隐藏为 ???）
    out.xianming = {};
    Object.keys(DESTINIES).forEach(function (id) {
      if (DESTINIES[id].grade === '金') out.xianming[id] = true;
    });
    // 功法
    out.techs = {};
    Object.keys(TECHNIQUES).forEach(function (id) { out.techs[id] = techs.indexOf(id) >= 0; });
    // 仙缘 NPC（需达成剧情解锁）
    out.npcs = {};
    if (typeof NPCS !== 'undefined') {
      Object.keys(NPCS).forEach(function (k) { out.npcs[k] = npcUnlocked(s, NPCS[k]); });
    }
    // 秘境之主（通关即发现）
    out.bosses = {};
    ['huang', 'xuan', 'di', 'tian', 'xian'].forEach(function (k) {
      out.bosses[k] = !!(s && s.flags && s.flags.advClear && s.flags.advClear[k]);
    });
    // 游历奇遇（触发过即记录）
    out.events = {};
    if (typeof EVENTS !== 'undefined') {
      EVENTS.jiyuan.concat(EVENTS.shejiao).forEach(function (e) {
        if (e && e.id) out.events[e.id] = !!seen[e.id];
      });
    }
    return out;
  }

  function endLife(s) {
    const meta = loadMeta();
    const ach = earnPoints(s, meta);
    meta.points += s.earnedPoints || 0;
    meta.earnedTotal = (meta.earnedTotal || 0) + (s.earnedPoints || 0);
    if ((s.jie || 0) > (meta.maxJie || 0)) meta.maxJie = s.jie;
    saveMeta(meta);
    clearState();
    return { meta: meta, ach: ach };
  }

  /* ---------------- 事件 ---------------- */
  const TOKEN_LABEL = { stone: '灵石', herb: '灵草', iron: '灵铁', qi: '修为', hp: '气血', hpMax: '气血上限', wu: '悟性', ti: '体魄', atk: '攻击', life: '寿元', lifeMax: '寿元' };
  function fillTokens(ev) {
    const op = ev.effect || {};
    const fix = function (t) {
      if (typeof t !== 'string') return t;
      return t.replace(/#([a-z]+)#/g, function (m, k) {
        const v = op[k];
        if (v === undefined) return m;
        return TOKEN_LABEL[k] ? TOKEN_LABEL[k] + ' ' + (v > 0 ? '+' : '') + v : (v > 0 ? '+' : '') + v;
      });
    };
    if (typeof ev.lines === 'string') ev.lines = fix(ev.lines);
    else if (Array.isArray(ev.lines)) ev.lines = ev.lines.map(fix);
  }
  function runEvent(s, ev) {
    const gains = [];
    if (ev.setFlags) Object.keys(ev.setFlags).forEach(function (f) { s.flags[f] = ev.setFlags[f]; });
    if (ev.id) { if (!s.seen) s.seen = {}; s.seen[ev.id] = 1; } // 记录事件见闻（成就：遍历奇遇）
    if (ev.effect) gains.push.apply(gains, applyOps(s, ev.effect));
    fillTokens(ev);
    refreshStats(s); saveState(s);
    return gains;
  }

  /* ============================================================
     P1–P7 系统：开荒 / 聚灵阵 / 五行阵 / 功业 / 宗门 / 委托 / 大比
     ============================================================ */
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  const RANK_REALM_MAX = { '外门': 1, '内门': 2, '真传': 2, '核心': 3, '首席': 3 }; // 可承接委托的境界上限 idx

  // —— 开荒初始化写入（§3.5）——
  function finalizeNewLife(s) {
    const meta = loadMeta();
    applyReinc(s, meta);
    s.actionsLeft = actionPoints(s);
    refreshStats(s);
    s.hp = s.hpMax;
    s.mp = s.mpMax; // 开局灵力满值
    saveState(s);
    return s;
  }
  function applyInit(s, sel) {
    const lg = LINGGEN_POOL.filter(function (l) { return l.id === sel.linggenId; })[0] || LINGGEN_POOL[LINGGEN_POOL.length - 1];
    s.linggen = lg; s.linggenRaw = lg;
    if (lg.wuBonus) s.wu += lg.wuBonus;
    if (lg.lingBonus) s.ling += lg.lingBonus;
    s.craft = {};
    CRAFT_KINDS.forEach(function (k) { s.craft[k.id] = { lv: (sel.craft && sel.craft[k.id] != null ? sel.craft[k.id] : 1), exp: 0 }; });
    const bg = findBackground(sel.bgId) || BACKGROUNDS[0];
    s.bg = bg.id;
    const f = bg.flavor || {};
    if (f.ti) s.ti += f.ti; if (f.wu) s.wu += f.wu; if (f.dun) s.dun += f.dun;
    if (f.shen) s.shen += f.shen; if (f.dao) s.dao += f.dao; if (f.ling) s.ling += f.ling;
    if (f.stone) s.stone += f.stone; if (f.life) s.lifeMax += f.life;
    // 开荒点数分配（六维）
    if (sel.points) {
      ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'].forEach(function (k) { if (sel.points[k]) s[k] += sel.points[k]; });
    }
    s.initPoints = sel.initPoints || 0;
    s.gongye = 0; s.gongyeEarned = 0; s.sectRank = null;
    if (!s.array) s.array = { juling: { level: 0, paid: false }, wuxing: {} };
    if (!s.array.wuxing) s.array.wuxing = {};
    if (s.reincTalent === undefined) s.reincTalent = 1;
    if (s.reincPoints === undefined) s.reincPoints = 0;
    return finalizeNewLife(s);
  }
  function openPointsTotal(s) { return INIT_POINTS + reincTalentBonus(s.reincTalent || 1); }

  // —— 【开荒】天赋（REINC_TALENT，持久化于 meta.reincTalent，与轮回阁同池扣费）——
  //    等级存于 meta（跨世持久），startLife 时拷进 s.reincTalent 供本世开荒池使用。
  function reincTalentUpgrade() {
    const meta = loadMeta();
    const cur = meta.reincTalent || 1;
    const cost = reincTalentNextCost(cur);
    if (cost == null) return { ok: false, msg: '【开荒】已满级。' };
    if ((meta.points || 0) < cost) return { ok: false, msg: '轮回点不足（需 ' + cost + '）。' };
    meta.points -= cost; meta.reincTalent = cur + 1;
    saveMeta(meta);
    const gain = reincTalentBonus(meta.reincTalent) - reincTalentBonus(cur);
    return { ok: true, msg: '【开荒】提升至 Lv' + meta.reincTalent + '，开荒池 +' + gain + ' 点（现 ' + (INIT_POINTS + reincTalentBonus(meta.reincTalent)) + ' 点）。' };
  }

  // —— 聚灵阵（§5.1）——
  function julingSet(s, lv) {
    if (lv < 0 || lv > 3) return { ok: false, msg: '层数无效。' };
    if (!s.array) s.array = { juling: { level: 0, paid: false }, wuxing: {} };
    if (lv > 0) {
      const cost = JULING_ARRAY[lv].stonePerYear;
      if (s.stone < cost) return { ok: false, msg: '灵石不足，无法布置聚灵阵（年耗 ' + cost + '）。' };
      s.stone -= cost;
    }
    s.array.juling = { level: lv, paid: lv > 0 };
    refreshStats(s); saveState(s);
    return { ok: true, lv: lv, pct: JULING_ARRAY[lv].pct, msg: '聚灵阵设为 Lv' + lv + (lv > 0 ? '（年耗灵石 ' + JULING_ARRAY[lv].stonePerYear + '）' : '') };
  }
  function julingYearEnd(s) {
    if (!s.array || !s.array.juling || s.array.juling.level === 0) return;
    const lv = s.array.juling.level;
    const cost = JULING_ARRAY[lv].stonePerYear;
    if (s.stone < cost) { s.array.juling.level = 0; s.array.juling.paid = false; logLife(s, 'juling', '聚灵阵因灵石断供而失效。'); }
    else { s.stone -= cost; s.array.juling.paid = true; }
  }

  // —— 阵法被动经验：只要洞府聚灵阵布置着、或百艺页任一五行阵开启，便逐年累积阵道心得 ——
  //   挂于 endYear 年度结算（与聚灵阵年耗同处）。阵法 Lv5 化境后不再增长（grantCraftExp 内置上限）。
  //   速率：每累计 6 个「激活年」结算 1 点阵道心得；阵道累计 10 点臻化境（Lv5）。
  //   激活年/年 = 聚灵阵加权(Lv1=1 / Lv2=1.5 / Lv3=2) + 五行阵(任一开启=1)。
  //   故：聚灵单阵 Lv1≈60年 / Lv2≈40年 / Lv3≈30年；聚灵与任一五行阵并行再减半。
  function zhenfaPassiveExp(s) {
    if (!s.craft || !s.craft.zhenfa) return;
    if (!s.array) return;
    let active = 0;
    if (s.array.juling && s.array.juling.level > 0) {
      const jl = s.array.juling.level;
      active += jl >= 3 ? 2 : (jl >= 2 ? 1.5 : 1);   // 洞府·聚灵阵按等级加速：Lv1=1 / Lv2=1.5 / Lv3=2 激活年
    }
    if (s.array.wuxing && WUXING_ORDER.some(function (k) { return !!s.array.wuxing[k]; })) active += 1; // 百艺·五行阵（开启任一即计）
    if (active <= 0) return;
    const c = s.craft.zhenfa;
    c.passiveAcc = (c.passiveAcc || 0) + active;   // 累计运转的「激活年」，兼容旧档（无字段则懒初始化）
    let gained = 0;
    while (c.passiveAcc >= 6) {
      c.passiveAcc -= 6;
      gained += grantCraftExp(s, 'zhenfa', 1);
    }
    if (gained > 0) {
      logLife(s, 'zhenfa', '阵法运转不懈，阵道心得 +' + (Math.round(gained * 100) / 100) + (c.lv >= 5 ? '（已臻化境）' : '') + '。');
    }
  }

  // —— 五行阵（§5.2）——
  function wuxingToggle(s, key) {
    if (!WUXING_ARRAY[key]) return { ok: false, msg: '无此阵。' };
    if (!s.array) s.array = { juling: { level: 0, paid: false }, wuxing: {} };
    if (!s.array.wuxing) s.array.wuxing = {};
    s.array.wuxing[key] = !s.array.wuxing[key];
    refreshStats(s); saveState(s);
    return { ok: true, on: s.array.wuxing[key], name: WUXING_ARRAY[key].name };
  }

  // —— 功业货币 ——
  function addGongye(s, n) { s.gongye = (s.gongye || 0) + n; s.gongyeEarned = (s.gongyeEarned || 0) + n; }
  function spendGongye(s, n) { if ((s.gongye || 0) < n) return false; s.gongye -= n; return true; }

  // —— 百艺经验结算（制作 / 研习共用）：加经验并按阈值升级，返回本次获得的心得数 ——
  function grantCraftExp(s, kind, base) {
    if (!s.craft || !s.craft[kind]) return 0;
    const c = s.craft[kind];
    if (c.lv >= 5) return 0;            // 已臻化境（Lv5），经验不再增长
    const art = artifactStats(s);
    let gain = base || 1;
    if (art.craftEff) gain += art.craftEff;             // 百艺天书：全百艺效率 +20%
    if (art.craftKind && art.craftKind[kind]) gain += art.craftKind[kind]; // 丹道传承/匠神锤：特定种类 +1
    c.exp += gain;
    if (c.exp >= c.lv) { c.exp = 0; c.lv += 1; }
    return gain;
  }

  // —— 百艺研习（§5.3，消耗行动点提升百艺等级；制作亦可加经验，见 doAlchemy/doForge）——
  function craftStudy(s, kind) {
    if (!s.craft || !s.craft[kind]) return { ok: false, msg: '无此百艺。' };
    if (!canAction(s, 1)) return { ok: false, msg: '行动点不足。' };
    const c = s.craft[kind];
    if (c.lv >= 5) return { ok: false, msg: '已臻化境（Lv5），无须再研习。' };
    // 炼器境界门槛：Lv4 需金丹、Lv5 需元婴（研习路径限制；制作可不经此关）
    if (kind === 'lianqi') {
      const bi = bigIdxOf(s);
      if (c.lv + 1 >= 4 && bi < 2) return { ok: false, msg: '炼器臻至 Lv4 需金丹境界，当前境界尚浅。' };
      if (c.lv + 1 >= 5 && bi < 3) return { ok: false, msg: '炼器臻至 Lv5 需元婴境界，当前境界尚浅。' };
    }
    spend(s, 1);
    const before = c.lv;
    const gain = grantCraftExp(s, kind, 1);
    const leveled = c.lv > before;
    refreshStats(s); saveState(s);
    return { ok: true, leveled: leveled, lv: c.lv, msg: '研习百艺，心得 +' + (Math.round(gain * 100) / 100) + (leveled ? '，等级提升至 Lv' + c.lv + '！' : '') };
  }

  // —— 宗门地位模型（§6.4 / §6.6，2026-09-08 重构）——
  //   地位谱：杂役(-1) < 外门(0) < 内门(1) < 真传(2) < 核心(3) < 首席(4)
  //   s.sectRank = null      已择宗但未应考（仅可见入宗考验）
  //   s.sectRank = '杂役'    应考失败；每年可重考；到筑基自动升内门
  //   s.sectRank ∈ SECT_RANKS 正式弟子，享完整宗门功能
  // 门禁：sectPassed() 为真才算正式入宗，未过考验一律无法用商人/任务/晋升等。
  function sectPassed(s) {
    return !!(s.sect && s.sectRank && s.sectRank !== '杂役' && sectRankIndex(s.sectRank) >= 0);
  }
  function tryRankUp(s) {
    if (!s.sect || !s.sectRank || s.sectRank === '杂役') return null;
    const order = ['外门', '内门', '真传', '核心', '首席'];
    let cur = order.indexOf(s.sectRank);
    if (cur < 0) return null;
    while (cur < order.length - 1) {
      const nx = SECT_RANKS[cur + 1];
      const ri = realmIdx(nx.realm);
      if ((s.gongyeEarned || 0) >= nx.gongye && bigIdxOf(s) >= ri) {
        cur++; s.sectRank = nx.id;
        return { rank: nx.id, via: '功业', info: sectRankInfo(nx.id) };
      } else break;
    }
    return null;
  }
  // 年度宗门晋升（endYear 调用）：
  //   - 杂役：到筑基(bigIdx≥1)自动升内门（唯一出口，除非重考被评更高）
  //   - 正式档：按功业/境界自动晋升（tryRankUp）
  function sectYearPromote(s) {
    if (!s.sect || !s.sectRank) return null;
    if (s.sectRank === '杂役') {
      if (bigIdxOf(s) >= 1) { s.sectRank = '内门'; return { rank: '内门', via: '筑基', info: sectRankInfo('内门') }; }
      return null;
    }
    return tryRankUp(s);
  }
  function realmIdx(name) { return BIG_REALMS.indexOf(name); }

  // —— 入宗考验（§6.5）——
  // sectTrial：纯评分计算，返回 { rank, gift, A, B, C }（不写状态）
  function sectTrial(s, win) {
    const A = effAttr(s, 'wu') >= 8, B = effAttr(s, 'dao') >= 8, C = win;
    let rank, gift = 0;
    if (A && B && C) { rank = '真传'; gift = 100; }
    else if ((A && B) || (A && C) || (B && C)) { rank = '内门'; gift = 50; }
    else if (A || B || C) { rank = '外门'; gift = 0; }
    else { rank = '杂役'; gift = 0; }
    return { rank: rank, gift: gift, A: A, B: B, C: C };
  }
  // applySectTrial：执行入宗考验并写入地位。杂役/未考 → 按评分定级；已过更高档则不高更低降级。
  // 每年限应考 1 次：s.lastTrialYear 记录当年已考（无论成败），跨年 reset 由年份自然失效。
  function applySectTrial(s, win) {
    if (s.lastTrialYear === s.year) {
      return { ok: false, rank: s.sectRank || null, gift: 0, passed: sectPassed(s), changed: false, blocked: true, msg: '今年已应考过入宗考验，来年再来吧。' };
    }
    const r = sectTrial(s, win);
    const prevIdx = sectRankIndex(s.sectRank);           // 杂役/未考 = -1
    const newIdx = sectRankIndex(r.rank);
    if (prevIdx >= 0 && prevIdx > newIdx) {
      return { ok: true, rank: s.sectRank, gift: 0, passed: true, changed: false, msg: '你已是【' + s.sectRank + '】，无须再考。' };
    }
    s.lastTrialYear = s.year;                            // 无论成败，本年度已应考（杂役不可连续刷考）
    const firstJoin = !sectPassed(s) && sectRankIndex(r.rank) >= 0;   // 本次是否「首度正式入宗」
    s.sectRank = r.rank;
    // 记录入宗年份：主线门禁 afterSectYear（初入宗门 / 百艺初窥 = 入宗次年才播）依赖它
    if (firstJoin && !s.sectJoinYear) s.sectJoinYear = s.year;
    if (r.gift) addGongye(s, r.gift);
    ensureTechEquip(s); refreshStats(s); saveState(s);
    const passed = s.sectRank !== '杂役';
    return { ok: true, rank: r.rank, gift: r.gift, passed: passed, changed: true, msg: '入宗考验评定为【' + r.rank + '】' + (r.gift ? ('，功业 +' + r.gift) : '') + '。' };
  }

  // —— 委托框架（§6.2，宗门/游历共用）——
  const COMM_YEAR_MAX = 3;   // 每年至多接取 3 件宗门任务（2026-09-13 玩家定稿）
  // 本年剩余可接件数（跨年自然重置，不需要额外清理）
  function commissionYearLeft(s) {
    const rec = s.commYear;
    if (!rec || rec.y !== s.year) return COMM_YEAR_MAX;
    return Math.max(0, COMM_YEAR_MAX - (rec.n || 0));
  }
  // 委托守敌**唯一口径**：带 enemyBoss 的委托（秘境探勘）实时对标对应阶位秘境 BOSS，
  //   其余沿用 data 写死的低阶杂兵数值。UI 战斗与任何展示都必须调它，不得自己读 c.enemy.atk。
  function commissionEnemy(s, c) {
    const base = c.enemy || {};
    if (c.enemyBoss) {
      const g = enemyGen(s, c.enemyBoss.tag || 'boss', c.enemyBoss.depth || 10, c.enemyBoss.adv || 'huang');
      return { name: base.name || g.name, line: base.line || g.line, atk: g.atk, hp: g.hp, loot: {}, portrait: g.portrait, mechanic: g.mechanic };
    }
    return { name: base.name, line: base.line, atk: base.atk, hp: base.hp, loot: base.loot || {} };
  }
  function commissionAvailable(s) {
    if (!sectPassed(s)) return [];
    const maxR = RANK_REALM_MAX[s.sectRank] || 1;
    return COMMISSIONS.filter(function (c) { return realmIdx(c.realm) <= maxR; });
  }
  function commissionCanAccept(s, c) {
    if (!sectPassed(s)) return false;
    if (realmIdx(c.realm) > (RANK_REALM_MAX[s.sectRank] || 1)) return false;
    if (c.type === 'craft' && (!s.craft || !s.craft[c.craft] || s.craft[c.craft].lv < c.minLv)) return false;
    return true;
  }
  function commissionComplete(s, id) {
    const c = COMMISSIONS.filter(function (x) { return x.id === id; })[0];
    if (!c) return { ok: false, msg: '委托不存在。' };
    if (!commissionCanAccept(s, c)) return { ok: false, msg: '不满足承接条件（境界或百艺等级不足）。' };
    if (commissionYearLeft(s) <= 0) return { ok: false, msg: '本年宗门任务已接满（每年至多 ' + COMM_YEAR_MAX + ' 件），来年再来。' };
    if (c.check) {
      for (const k in c.check) if ((s[k] || 0) < c.check[k]) return { ok: false, msg: '属性不足：' + k + ' 需 ≥ ' + c.check[k] + '。' };
    }
    // 注：含敌人的委托，其战斗由 UI 通过手动战斗（openBattle）先行触发，
    //    胜利后再调用本函数结算奖励；此处不再自动开打（自动战斗功能已移除）。
    //    宗门任务全部设计为不消耗行动点（2026-09-13 调整）。
    // 接取计数（结算成功才计，跨年重置）
    const prevN = (s.commYear && s.commYear.y === s.year) ? (s.commYear.n || 0) : 0;
    s.commYear = { y: s.year, n: prevN + 1 };
    const st = rnd(c.stone[0], c.stone[1]);
    s.stone += st;
    let gy = 0;
    if (c.gongye) { gy = rnd(c.gongye[0], c.gongye[1]); addGongye(s, gy); }
    refreshStats(s); saveState(s);
    return { ok: true, stone: st, gongye: gy, msg: '委托完成：灵石 +' + st + (gy ? '，功业 +' + gy : '') + '。（本年剩余 ' + commissionYearLeft(s) + '/' + COMM_YEAR_MAX + '）' };
  }

  // —— 练神峰 / 聚灵潭（§6.8）——
  function sectTrain(s, type) {
    if (!s.sect) return { ok: false, msg: '尚未拜入宗门。' };
    if (type !== 'shen' && type !== 'ling') return { ok: false, msg: '类型无效。' };
    if (!canAction(s, 2)) return { ok: false, msg: '行动点不足（需 2）。' };
    if (!s.sectTrain) s.sectTrain = { shenByRealm: {}, lingByRealm: {} };
    const bi = bigIdxOf(s);
    const key = BIG_REALMS[bi];
    s.sectTrain[type + 'ByRealm'][key] = s.sectTrain[type + 'ByRealm'][key] || 0;
    if (s.sectTrain[type + 'ByRealm'][key] >= 10) return { ok: false, msg: '此大境界「' + (type === 'shen' ? '神识' : '灵力') + '」已锤炼至极限（10 次），需突破后方再进。' };
    spend(s, 2);
    const shenEff = artifactStats(s).duantiShenEff || 0;   // 淬神台：淬神效率（神识+灵力训练倍率）
    const gain = 1 * (1 + shenEff);
    if (type === 'shen') s.shen += gain; else s.ling += gain;
    s.sectTrain[type + 'ByRealm'][key]++;
    refreshStats(s); saveState(s);
    return { ok: true, msg: (type === 'shen' ? '神识' : '灵力') + ' +' + gain.toFixed(2) + '（本境已锤炼 ' + s.sectTrain[type + 'ByRealm'][key] + '/10）。' };
  }

  // —— 宗门大比（§6.6 秘境化连战 · 一条直线 5 场）——
  // 对手强度**唯一口径**：以玩家当前大境界的常规敌人基线 × 逐层系数（UI 与结算都调本函数）。
  function dabiFoe(s, i) {
    const mul = (SECT_DABI.layerMul && SECT_DABI.layerMul[i]) || 0.5;
    const jd = (JIE_DATA[s.jie] && JIE_DATA[s.jie].diff) ? JIE_DATA[s.jie].diff : 1;
    const sc = enemyStats(bigIdxOf(s), mul, mul, jd);
    return { name: (SECT_DABI.names && SECT_DABI.names[i]) || ('第 ' + (i + 1) + ' 场'), atk: sc.atk, hp: sc.hp, loot: {} };
  }
  function dabiLayerCount() { return SECT_DABI.layers || 5; }
  // 下次大比年份：固定在第 firstYear 年及此后每 intervalYears 年（10/20/30…），本届已参加则顺延一届
  function dabiNextYear(s) {
    const iv = SECT_DABI.intervalYears || 10;
    const first = SECT_DABI.firstYear || iv;
    let y = Math.max(first, Math.ceil((s.year || 1) / iv) * iv);
    if (y < first) y = first;
    if (s.lastDabiYear === y) y += iv;
    return y;
  }
  // 宗门大比状态（宗门页菜单显示「距离下次大比还有 X 年」＋ 开赛判定）
  function dabiStatus(s) {
    if (!sectPassed(s)) return { eligible: false, canEnter: false, nextYear: 0, inYears: 0, msg: '未入宗门，无缘大比。' };
    const next = dabiNextYear(s);
    const inYears = Math.max(0, next - (s.year || 1));
    return {
      eligible: true, nextYear: next, inYears: inYears, canEnter: inYears === 0,
      msg: inYears === 0 ? '本届宗门大比已开，速去应战！' : ('距离下次大比还有 ' + inYears + ' 年')
    };
  }
  function sectDabiStart(s) {
    const st = dabiStatus(s);
    if (!st.eligible) return { ok: false, msg: st.msg };
    if (!st.canEnter) return { ok: false, msg: st.msg + '（第 ' + st.nextYear + ' 年开赛）' };
    s.dabi = { idx: 0, full: false, done: false };
    s.lastDabiYear = s.year;
    return { ok: true, foe: dabiFoe(s, 0) };
  }
  function sectDabiStep(s, win) {
    if (!s.dabi || s.dabi.done) return { done: true };
    const fi = s.dabi.idx;
    const total = dabiLayerCount();
    if (!win) {
      const rw = SECT_DABI.reward[Math.max(1, fi)];
      s.dabi.done = true;
      s.stone += rw.stone; addGongye(s, rw.gongye);
      saveState(s);
      return { done: true, win: false, layer: fi + 1, gongye: rw.gongye, stone: rw.stone, msg: '止步第 ' + (fi + 1) + ' 层，功业 +' + rw.gongye + '，灵石 +' + rw.stone + '。' };
    }
    s.dabi.idx++;
    if (s.dabi.idx >= total) {
      const rw = SECT_DABI.reward[total];
      s.dabi.done = true; s.dabi.full = true;
      s.hp = s.hpMax; s.mp = s.mpMax; // 唯一回满机制
      s.stone += rw.stone; addGongye(s, rw.gongye);
      saveState(s);
      return { done: true, win: true, full: true, gongye: rw.gongye, stone: rw.stone, msg: '五层全胜！功业 +' + rw.gongye + '，灵石 +' + rw.stone + '，气血与灵力尽数回满！' };
    }
    return { done: false, win: true, foe: dabiFoe(s, s.dabi.idx), layer: s.dabi.idx + 1 };
  }

  // —— 宗门商人（§6.3 单货币按类型）——
  // 货币规则：tech/dun/art/equip → 灵石(stone)；elixir/mat → 功业(gongye)。每件仅一种货币。
  function sectGoodCoin(g) {
    if (g.coin) return g.coin;                       // data 显式声明优先
    if (g.kind === 'elixir' || g.kind === 'mat') return 'gongye';
    return 'stone';
  }
  function sectGoodCost(g) {
    return sectGoodCoin(g) === 'gongye'
      ? (g.gongye || 0)
      : (g.stoneFix || GRADE_STONE[g.grade] || 0);
  }
  function sectGoods(s) {
    if (!sectPassed(s)) return [];          // 未过考验/杂役一律无货
    const ri = sectRankIndex(s.sectRank);
    return SECT_GOODS.filter(function (g) {
      const gi = sectRankIndex(g.rankMin);
      return gi <= ri;
    });
  }
  function sectBuy(s, ref) {
    if (!sectPassed(s)) return { ok: false, msg: '尚未通过入宗考验，宗门商人不予接待。' };
    const g = SECT_GOODS.filter(function (x) { return x.ref === ref; })[0];
    if (!g) return { ok: false, msg: '商品不存在。' };
    if (sectRankIndex(g.rankMin) > sectRankIndex(s.sectRank || '外门')) return { ok: false, msg: '地位不足，无法购买。' };
    const coin = sectGoodCoin(g);
    const cost = sectGoodCost(g);
    if (coin === 'gongye') {
      if (!spendGongye(s, cost)) return { ok: false, msg: '功业不足（需 ' + cost + '）。' };
    } else {
      if (s.stone < cost) return { ok: false, msg: '灵石不足（需 ' + cost + '）。' };
      s.stone -= cost;
    }
    const qty = g.qty || 1;
    if (g.kind === 'art') {
      const owned = s.arts.indexOf(g.ref) >= 0 || (s.equip.treasure && s.equip.treasure.indexOf(g.ref) >= 0);
      if (!owned) {
        s.arts.push(g.ref);
        equipTreasureAuto(s, g.ref); // 自动装备到空闲槽，若满则留库存
      }
    } else if (g.kind === 'tech' || g.kind === 'dun') {
      if (s.techs.indexOf(g.ref) < 0) s.techs.push(g.ref);
    } else if (g.kind === 'elixir') {
      s.elixirs[g.ref] = (s.elixirs[g.ref] || 0) + qty;
    } else if (g.kind === 'mat') {
      if (!s.materials) s.materials = {};
      s.materials[g.ref] = (s.materials[g.ref] || 0) + qty;
    } else if (g.kind === 'equip') {
      grantEquipChecked(s, g.ref);
    }
    ensureTechEquip(s); refreshStats(s); saveState(s);
    let nm = g.ref;
    if (g.kind === 'art' && ARTIFACTS[g.ref]) nm = ARTIFACTS[g.ref].name;
    else if ((g.kind === 'tech' || g.kind === 'dun') && TECHNIQUES[g.ref]) nm = TECHNIQUES[g.ref].name;
    else if (g.kind === 'elixir' && ELIXIRS[g.ref]) nm = ELIXIRS[g.ref].name;
    else if (g.kind === 'mat' && MATERIALS[g.ref]) nm = MATERIALS[g.ref].name;
    else if (g.kind === 'equip') { const it = findEquip(g.ref); if (it) nm = it.name; }
    const cname = coin === 'gongye' ? '功业' : '灵石';
    return { ok: true, coin: coin, cost: cost, msg: '购得【' + nm + '】（' + cname + ' -' + cost + '）。' };
  }


    return {
    slotExists: slotExists, slotInfo: slotInfo, isUsableSave: isUsableSave,
    loadMeta: loadMeta, saveMeta: saveMeta, loadState: loadState, saveState: saveState, clearState: clearState,
    cleanupLegacySaves: cleanupLegacySaves, clearAllSaves: clearAllSaves, isLegacySave: isLegacySave, SAVE_VERSION: SAVE_VERSION,
    ensureTechEquip: ensureTechEquip, equippedShufa: equippedShufa, techMult: techMult,
    setXinfa: setXinfa, setDunshu: setDunshu, toggleShufa: toggleShufa,
    startLife: startLife, commitStart: commitStart, destinyCounts: destinyCounts,
    cultivate: cultivate, canAction: canAction, spend: spend,
    explore: explore, social: social, jiyuan: jiyuan, travel: travel, shanheExplore: shanheExplore, rollXianyuan: rollXianyuan,
    evEligible: function (s, ev) { return evOK(s, 1)(ev); },
    alchemyChoices: alchemyChoices, doAlchemy: doAlchemy,
    forgeChoices: forgeChoices, doForge: doForge,
    canBreak: canBreak, breakInfo: breakInfo, breakthrough: breakthrough,
    perfectBreakthrough: perfectBreakthrough, normalBreakthrough: normalBreakthrough,
    sectCombat: sectCombat, sectLecture: sectLecture, sectSocial: sectSocial,
    cultCost: cultCost, actionPoints: actionPoints,
    endYear: endYear, checkYearEvents: checkYearEvents, moreMainline: moreMainline, fateBattle: fateBattle,
    endLife: endLife, useElixir: useElixir,
    runEvent: runEvent, applyOps: applyOps,
    combatStart: combatStart, combatAct: combatAct, simBattle: simBattle,
    elemCounterMul: elemCounterMul, enemyTakenMul: enemyTakenMul,
    applyBossElement: applyBossElement, bossCastSpell: bossCastSpell, bossTryCast: bossTryCast,
    // —— 五行新机制导出（眩晕/冻结 · 灼烧/中毒 · 伐灾）——
    applySpellFx: applySpellFx, tickBattleFx: tickBattleFx, tickDot: tickDot,
    applyPlayerControl: applyPlayerControl, dotCapByGrade: dotCapByGrade,
    equipStats: equipStats, cultGain: cultGain, getBestShufa: getBestShufa, getDunshu: getDunshu,
    findEquip: findEquip, wearEquip: wearEquip, sellEquip: sellEquip, sellEquipAll: sellEquipAll, gainEquip: gainEquip,
    startAdventure: startAdventure, startTrial: startTrial, advGenLayer: advGenLayer, advResolve: advResolve,
    advAdvance: advAdvance, advEnd: advEnd, advClearReward: advClearReward,
    enemyGen: enemyGen, randomEquip: randomEquip,
    advNextChoices: advNextChoices, advMove: advMove, advCanMove: advCanMove,
    advRest: advRest, useAdvElixir: useAdvElixir, advBossBonus: advBossBonus,
    advExplore: advExplore, loseLife: loseLife, addExplore: addExplore,
    advForceExplore: advForceExplore, advForceMove: advForceMove, advCanFightBoss: advCanFightBoss, advSituation: advSituation,
    forceExploreCost: forceExploreCost, forceExploreRisk: forceExploreRisk, lifeLeft: lifeLeft,
    FORCE_LIFE_COSTS: FORCE_LIFE_COSTS, ELIXIRS: ELIXIRS,
    SPIRIT_FOR_ADV: SPIRIT_FOR_ADV, ADV_ART_CAP: ADV_ART_CAP,
    artEffectText: artEffectText, attrGainText: attrGainText,
    isSpiritArt: isSpiritArt, allSpiritArtIds: allSpiritArtIds, ownsArt: ownsArt,
    spiritArtOf: spiritArtOf, advArtCount: advArtCount, advArtFull: advArtFull, advArtCap: advArtCap,
    advArtRemain: advArtRemain,
    grantAdvArt: grantAdvArt,
    ADV_EXPLORE_GAIN: ADV_EXPLORE_GAIN,
    getAdvItemCap: getAdvItemCap, returnUnusedAdvItems: returnUnusedAdvItems,
    realmTierRange: realmTierRange, equipAllowed: equipAllowed,
    findEquipBySub: findEquipBySub, forgeTier: forgeTier, forgeResultTier: forgeResultTier, rollForge: rollForge,
    wearEquip: wearEquip, treasureItem: treasureItem, equipTreasureAuto: equipTreasureAuto, unequipTreasure: unequipTreasure, findEquip: findEquip,
    refreshStats: refreshStats, requireNeed: requireNeed, maxTreasure: maxTreasure, calcMpMax: calcMpMax,
    xinmoSpec: xinmoSpec, tianjieSpec: tianjieSpec,
    dujieWin: dujieWin, dujieFail: dujieFail, xinmoDone: xinmoDone,
    fieldInfo: fieldInfo, plantField: plantField, harvestField: harvestField, fieldPlantable: fieldPlantable, digMine: digMine, mineInfo: mineInfo,
    unlockField: unlockField, getMaxFields: getMaxFields, fieldPlots: fieldPlots,
    grantEquipChecked: grantEquipChecked,
    isXianAdventureAvailable: isXianAdventureAvailable,
    advUnlocked: advUnlocked, markAdvClear: markAdvClear, advNextOf: advNextOf,
    shopStock: shopStock, buyStock: buyStock, sellMaterial: sellMaterial,
    startCraft: startCraft, accelerateCraft: accelerateCraft,
    giveGift: giveGift, talkNpc: talkNpc, drawXianyuan: drawXianyuan, seekNpcXianyuan: seekNpcXianyuan,
    npcUnlocked: npcUnlocked, favorOf: favorOf, favorTier: favorTier,
    getAvailableEvents: getAvailableEvents, triggerEvent: triggerEvent,
    bigIdxOf: bigIdxOf,
    duantiInfo: duantiInfo, doDuanti: doDuanti,
    TECHNIQUES: TECHNIQUES, ARTIFACTS: ARTIFACTS, ELIXIRS: ELIXIRS,
    ACHIEVEMENTS: ACHIEVEMENTS, REINCARNATION: REINCARNATION,
    logLife: logLife, settlePoints: settlePoints, earnPoints: earnPoints, achDefs: achDefs,
    checkAchievements: checkAchievements, checkAchievementsLive: checkAchievementsLive,
    codexState: codexState, syncTreasureSeen: syncTreasureSeen,
    equipDropRate: equipDropRate, equipBiasRate: equipBiasRate,
    // —— 五劫主线 / 灾劫玉符 / 隐藏线 ——
    nextDeathEvent: nextDeathEvent, omenYearsLeft: omenYearsLeft, omenText: omenText,
    grantOmen: grantOmen, omenOnDeathPassed: omenOnDeathPassed,
    omenHiddenReady: omenHiddenReady, openOmenHidden: openOmenHidden,
    beginDujie: beginDujie, trialBossTrib: trialBossTrib, trialBossDeath: trialBossDeath, trialBossHidden: trialBossHidden,
    rollMingge: rollMingge,
    getDestinyBonus: getDestinyBonus, getDestinyAttrBonus: getDestinyAttrBonus,
    getDestinyAttrMult: getDestinyAttrMult, applyDestinyYearly: applyDestinyYearly,
    effAttr: effAttr, getCritRate: getCritRate, getDodgeRate: getDodgeRate, getExtraAtkChance: getExtraAtkChance, getRecoverPct: getRecoverPct, getCounterRate: getCounterRate,
    getDefense: getDefense, getDefensePct: getDefensePct, getDefenseDiv: getDefenseDiv,
    talentApply: talentApply, getTechTypeBonus: getTechTypeBonus,
    getXinfaReduceDmg: getXinfaReduceDmg, getXinfaCraftReduce: getXinfaCraftReduce,
    xinfaCur: xinfaCur, getXinfaAtkMul: getXinfaAtkMul, getXinfaSpellMul: getXinfaSpellMul,
    getXinfaGuard: getXinfaGuard, getXinfaHpMax: getXinfaHpMax,
    // —— P1–P7 新增导出 ——
    linggenTrait: linggenTrait, linggenAffinityMul: linggenAffinityMul,
    applyWuxing: applyWuxing, recalcLinggenBonus: recalcLinggenBonus,
    cultModes: cultModes,
    finalizeNewLife: finalizeNewLife, applyInit: applyInit,
    openPointsTotal: openPointsTotal, reincTalentUpgrade: reincTalentUpgrade,
    julingSet: julingSet, julingYearEnd: julingYearEnd, wuxingToggle: wuxingToggle,
    addGongye: addGongye, spendGongye: spendGongye,
    craftStudy: craftStudy,
    tryRankUp: tryRankUp, sectYearPromote: sectYearPromote, sectPassed: sectPassed, realmIdx: realmIdx,
    RANK_REALM_MAX: RANK_REALM_MAX,
    sectTrial: sectTrial, applySectTrial: applySectTrial,
    commissionAvailable: commissionAvailable, commissionCanAccept: commissionCanAccept, commissionComplete: commissionComplete,
    commissionEnemy: commissionEnemy, commissionYearLeft: commissionYearLeft,
    sectTrain: sectTrain, sectDabiStart: sectDabiStart, sectDabiStep: sectDabiStep,
    dabiFoe: dabiFoe, dabiStatus: dabiStatus, dabiNextYear: dabiNextYear, dabiLayerCount: dabiLayerCount,
    sectGoods: sectGoods, sectBuy: sectBuy, sectGoodCoin: sectGoodCoin, sectGoodCost: sectGoodCost,
    DESTINIES: DESTINIES
  };
})();