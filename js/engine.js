/* ============================================================
   DEDAO 得道 —— 引擎（行动 / 突破 / 天劫 / 战斗 / 轮回）
   ============================================================ */
const Engine = (function () {

  const LS_SAVE = 'dedao_save';
  const LS_META = 'dedao_meta';
  const LS_SLOTS = ['dedao_slot0', 'dedao_slot1', 'dedao_slot2'];

  /* ---------------- 档案 ---------------- */
  function defaultMeta() {
    return { points: 0, lives: 0, reinc: {}, achievements: {}, flown: false };
  }
  function loadMeta() {
    try {
      const m = JSON.parse(localStorage.getItem(LS_META));
      if (m && m.achievements) return m;
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
      ensureTechEquip(s);
      return s;
    } catch (e) {}
    return null;
  }
  function saveState(s, slot) {
    try { localStorage.setItem(slotKey(slot), JSON.stringify(s)); } catch (e) {}
    if (slot != null) { try { localStorage.setItem(LS_SAVE, JSON.stringify(s)); } catch (e) {} }
  }
  function clearState() {
    try { localStorage.removeItem(LS_SAVE); } catch (e) {}
  }
  function slotExists(slot) {
    try { return !!localStorage.getItem(slotKey(slot)); } catch (e) { return false; }
  }
  function slotInfo(slot) {
    const s = loadState(slot);
    if (!s || !s.name || !s.techs) return null;
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
    const x = s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa];
    if (x && x.mult) return x.mult;
    if (!s.techs.length) return 1;
    let m = 1;
    s.techs.forEach(function (t) {
      const y = TECHNIQUES[t];
      if (y && y.mult > m) m = y.mult;
    });
    return m;
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

  function equipStats(s) {
    const st = { hpMax: 0, atk: 0, wu: 0, ti: 0, cult: 0 };
    ['head', 'body', 'leg'].forEach(function (slot) {
      const id = s.equip && s.equip[slot];
      if (!id || !EQUIPS[slot] || !EQUIPS[slot][id]) return;
      const it = EQUIPS[slot][id];
      st.hpMax += it.hpMax || 0;
      st.atk += it.atk || 0;
      st.wu += it.wu || 0;
      st.ti += it.ti || 0;
      st.cult += it.cult || 0;
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
  function calcHpMax(s) {
    const tiMulti = [20, 25, 30, 35][bigIdxOf(s)] || 20;
    let m = 80 + s.ti * tiMulti + bigIdxOf(s) * 80;
    if (s.linggen && s.linggen.body && s.linggen.body.hpMax) m += s.linggen.body.hpMax;
    if (s.arts.indexOf('xuantie') >= 0) m += 150;
    if (s.sect && SECTS[s.sect].effect.hpMax) m += SECTS[s.sect].effect.hpMax;
    m += s.hpMaxBonus || 0;
    m += equipStats(s).hpMax;
    return m;
  }
  function calcAtk(s) {
    let a = 10 + bigIdxOf(s) * 15;
    if (s.talents.indexOf('kejian') >= 0) a *= 1.2;
    if (s.linggen && s.linggen.body && s.linggen.body.atk) a += s.linggen.body.atk;
    if (s.arts.indexOf('qingfeng') >= 0) a += 20;
    if (s.sect && SECTS[s.sect].effect.atkMul) a *= (1 + SECTS[s.sect].effect.atkMul);
    a += s.extraAtk || 0;
    a += equipStats(s).atk;
    return Math.round(a);
  }
  function cultGain(s) {
    let g = (60 + s.wu * 10) * (1 + 0.3 * bigIdxOf(s));
    if (s.wu >= 10) g *= 1.1;
    g *= techMult(s);
    if (s.linggen) g *= (s.linggen.qiMul || 1);
    if (s.talents.indexOf('daoti') >= 0) g *= 1.1;
    if (s.arts.indexOf('juling') >= 0) g *= 1.15;
    if (s.flags.daoLu) g *= 1.1;
    if (s.flags.petGrown) g *= 1.15;
    else if (s.flags.pet) g *= 1.05;
    g *= 1 + ((s.reinc && s.reinc.cult) || 0) * 0.10;
    g *= 1 + ((s.reinc && s.reinc.shesheng) || 0) * 0.10;
    g *= 1 + equipStats(s).cult;
    if (s.sect && SECTS[s.sect].effect.cultMul) g *= (1 + SECTS[s.sect].effect.cultMul);
    let note = '';
    if ((s.elixirs.juling || 0) > 0) {
      s.elixirs.juling--;
      if (s.elixirs.juling <= 0) delete s.elixirs.juling;
      g *= 2;
      note = '【聚气丹】';
    }
    return { gain: Math.round(g), note: note };
  }
  function actionPoints(s) {
    let n = 3;
    if (s.idx >= 3) n++;
    if (s.idx >= 6) n++;
    if (s.idx >= 9) n++;
    return n;
  }
  function cultCost(s) { return s.idx >= 3 ? 2 : 1; }

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
  function calcMoMax(s) {
    let m = 30 + bigIdxOf(s) * 50 + s.wu * 4;
    const lg = s.linggen && s.linggen.body;
    if (lg && lg.mo) m += lg.mo;
    const xf = s.techEquip && s.techEquip.xinfa && TECHNIQUES[s.techEquip.xinfa];
    if (xf && xf.mo) m += xf.mo;
    m += s.moMaxBonus || 0;
    return Math.max(12, m);
  }
  function moGain(s, pct) {
    const g = Math.max(1, Math.round(calcMoMax(s) * pct));
    s.mo = Math.min(calcMoMax(s), s.mo + g);
    return g;
  }
  function refreshStats(s) {
    const m = calcHpMax(s);
    s.hpMax = m;
    s.atk = calcAtk(s);
    const mm = calcMoMax(s);
    s.moMax = mm;
    if (s.mo > mm) s.mo = mm;
    if (s.hp > m) s.hp = m;
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
  function applyReinc(s, meta) {
    s.reinc.cult = meta.reinc.cult || 0;
    s.reinc.alchemy = meta.reinc.alchemy || 0;
    s.reinc.alchemyDouble = meta.reinc.alchemyDouble || 0;
    s.reinc.shesheng = meta.reinc.shesheng || 0;
    const list = REINCARNATION;
    list.forEach(function (r) {
      const n = meta.reinc[r.id] || 0;
      if (!n) return;
      for (let i = 0; i < n; i++) {
        if (r.id === 'wu') s.wu++;
        else if (r.id === 'ti') s.ti++;
        else if (r.id === 'stone') s.stone += 1000;
        else if (r.id === 'juling0') s.elixirs.juling = (s.elixirs.juling || 0) + 6;
        else if (r.id === 'tech0') { if (s.techs.indexOf('shengong') < 0) s.techs.push('shengong'); }
        else if (r.id === 'life20') s.lifeMax += 20;
      }
    });
  }
  function startLife(name) {
    const meta = loadMeta();
    const s = {
      name: name, bgIdx: 0, age: 16,
      linggen: null, talents: [],
      realm: '炼气', idx: 0, qi: 0,
      hp: 100, hpMax: 100, atk: 10, hpMaxBonus: 0,
      mo: 40, moMax: 40, moMaxBonus: 0,
      dunSpeed: 1,
      wu: 2 + Math.floor(Math.random() * 5), wuAcc: 0,
      ti: 2 + Math.floor(Math.random() * 5),
      stone: 50, herb: 3, iron: 0,
      elixirs: {}, techs: ['tunai'], arts: [], extraAtk: 0,
      techEquip: { xinfa: 'tunai', shufa: [], dunshu: null },
      sect: null, broken: 0, actionsLeft: 3,
      year: 1, flags: {}, seen: {}, log: [], lifeLog: [], dead: false,
      endReason: null, lifeMax: 70, reinc: {},
      equip: { head: null, body: null, leg: null, treasure: [] },
      trib: null, field: [], mine: { depth: 0 },
      inventory: [], battle: null, adv: null
    };
    meta.lives++;
    const egg = (s.name && s.name.trim()) ? EASTER_EGGS[s.name.trim()] : null;
    const talentRolled = rollTalents(egg && egg.effect.linggen ? 2 : 3);
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
    s.talents = [talentId];
    if (egg) {
      s.talents.push('fuyuan');
      if (egg.effect.wu) s.wu += egg.effect.wu;
      if (egg.effect.ti) s.ti += egg.effect.ti;
      if (egg.effect.atk) s.extraAtk += egg.effect.atk;
      if (egg.effect.life) s.lifeMax += egg.effect.life;
    }
    const t = TALENTS.filter(function (x) { return x.id === talentId; })[0];
    if (t && t.apply) {
      if (t.apply.wu) s.wu += t.apply.wu;
      if (t.apply.ti) s.ti += t.apply.ti;
      if (t.apply.life) s.lifeMax += t.apply.life;
    }
    if (s.bg && s.bg.flavor.stone) s.stone += s.bg.flavor.stone;
    if (s.bg && s.bg.flavor.wu) s.wu += s.bg.flavor.wu;
    if (s.bg && s.bg.flavor.life) s.lifeMax += s.bg.flavor.life;
    applyReinc(s, meta);
    s.actionsLeft = actionPoints(s);
    refreshStats(s);
    s.hp = s.hpMax;
    saveState(s);
    return s;
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
    ['qi', 'hp', 'stone', 'herb', 'iron', 'life', 'wu', 'ti', 'atk', 'art', 'tech', 'elixirs', 'flags', 'sect', 'hpMax', 'equip', 'inv'].forEach(function (k) {
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
        case 'herb': s.herb += v; out.push('灵草 ' + (v > 0 ? '+' : '') + v); break;
        case 'iron': s.iron += v; out.push('灵铁 ' + (v > 0 ? '+' : '') + v); break;
        case 'life': s.lifeMax += v; out.push('寿元 ' + (v > 0 ? '+' : '') + v); break;
        case 'wu': gainWu(s, v); out.push('悟性 +' + v); break;
        case 'ti': s.ti += v; out.push('体魄 +' + v); break;
        case 'atk': s.extraAtk += v; out.push('攻击 +' + v); break;
        case 'hpMax': s.hpMaxBonus = (s.hpMaxBonus || 0) + v; s.hp += v; out.push('气血上限 +' + v); break;
        case 'art': if (s.arts.indexOf(v) < 0) { s.arts.push(v); out.push('获得法宝【' + ARTIFACTS[v].name + '】'); } break;
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
      }
    });
    refreshStats(s);
    return out;
  }

  /* ---------------- 装备管理 ---------------- */
  function maxTreasure(s) { return Math.min(4, bigIdxOf(s) + 1); }
  function findEquip(id) {
    for (const slot in EQUIPS) if (EQUIPS[slot][id]) return EQUIPS[slot][id];
    return null;
  }
  function slotOf(id) {
    for (const k in EQUIPS) if (EQUIPS[k][id]) return k;
    return null;
  }
  function gainEquip(s, id) {
    const it = findEquip(id);
    if (!it) return [];
    const slot = slotOf(id);
    const out = [];
    if (slot === 'treasure') {
      if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
      if (s.equip.treasure.length < maxTreasure(s)) {
        s.equip.treasure.push(id);
        refreshStats(s);
        out.push('装备【' + it.name + '】已上身（' + EQUIP_SLOTS[slot].name + '）');
      } else {
        s.inventory.push(id);
        out.push('获得装备【' + it.name + '】（收入储物袋）');
      }
      return out;
    }
    if (!s.equip[slot]) {
      s.equip[slot] = id;
      refreshStats(s);
      out.push('装备【' + it.name + '】已上身（' + EQUIP_SLOTS[slot].name + '）');
    } else {
      s.inventory.push(id);
      out.push('获得装备【' + it.name + '】（收入储物袋）');
    }
    return out;
  }
  function wearEquip(s, id) {
    const it = findEquip(id);
    if (!it) return false;
    const slot = slotOf(id);
    if (slot === 'treasure') {
      if (!Array.isArray(s.equip.treasure)) s.equip.treasure = [];
      if (s.equip.treasure.indexOf(id) >= 0) return true;
      const max = maxTreasure(s);
      if (s.equip.treasure.length >= max) {
        const old = s.equip.treasure.shift();
        s.inventory.push(old);
      }
      s.equip.treasure.push(id);
      s.inventory = s.inventory.filter(function (x) { return x !== id; });
      refreshStats(s); saveState(s);
      return true;
    }
    if (s.equip[slot] && s.equip[slot] !== id) {
      const old = s.equip[slot];
      s.inventory.push(old);
    }
    if (s.equip[slot] === id) return true;
    s.equip[slot] = id;
    s.inventory = s.inventory.filter(function (x) { return x !== id; });
    refreshStats(s); saveState(s);
    return true;
  }
  function sellEquip(s, id) {
    const it = findEquip(id);
    if (!it) return false;
    if (Array.isArray(s.equip.treasure)) {
      const ti = s.equip.treasure.indexOf(id);
      if (ti >= 0) {
        s.equip.treasure.splice(ti, 1);
      }
    }
    s.inventory = s.inventory.filter(function (x) { return x !== id; });
    const g = Math.round(it.price * 0.5);
    s.stone += g;
    refreshStats(s); saveState(s);
    return g;
  }
  function randomEquip(bi, depth) {
    const range = realmTierRange(bi);
    let tier = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
    if (Math.random() < 0.18 && range[1] < 5) tier = range[1] + 1;
    const slots = ['head', 'body', 'leg', 'treasure'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const items = Object.keys(EQUIPS[slot]).map(function (id) { return EQUIPS[slot][id]; });
    const cand = items.filter(function (it) { return it.tier === tier; });
    const it = cand[Math.floor(Math.random() * cand.length)];
    for (const id in EQUIPS[slot]) if (EQUIPS[slot][id] === it) return id;
    return null;
  }

  /* ---------------- 品质与境界匹配（夺宝） ---------------- */
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
  function grantEquipChecked(s, id) {
    const it = findEquip(id);
    if (!it) return [];
    if (equipAllowed(s, id)) return gainEquip(s, id);
    if (!s.pendingDuobao) s.pendingDuobao = [];
    if (s.pendingDuobao.indexOf(id) < 0) s.pendingDuobao.push(id);
    return ['【' + it.name + '】宝光冲天而起，竟引得暗处强者窥伺——此物，怕是没有那么容易拿稳。'];
  }
  function pendingDuobao(s) {
    return s.pendingDuobao && s.pendingDuobao.length ? s.pendingDuobao.slice() : null;
  }
  function duobaoSpec(s) {
    const bi = Math.min(bigIdxOf(s), 3);
    const nbi = Math.min(bi + 1, 3);
    const pool = MONSTER_POOL[['lianqi', 'zhuji', 'jindan', 'yuanying'][nbi]];
    const m = pool[Math.floor(Math.random() * pool.length)];
    const fate = 0.95 + nbi * 0.3;
    return {
      name: '夺宝客·' + m.name,
      line: '一道遁光落下，' + (nbi >= 2 ? '衣袍猎猎，灵压如山。' : '来人目光灼灼，直奔你怀中宝光而去。') + '“此物与你有缘，与本座更有缘！”',
      atk: Math.max(1, Math.round(s.hpMax / 6.5 * (nbi >= 2 ? 1.3 : 1.1))),
      hp: Math.round(s.atk * (5.5 + nbi) * fate),
      loot: {},
      loseLoot: { stone: Math.round(s.stone * 0.15) },
      bi: nbi,
      duobao: true,
      dunSpeed: nbi + 1
    };
  }
  function grantPendingEquip(s) {
    const list = pendingDuobao(s);
    if (!list) return [];
    const out = [];
    list.forEach(function (id) {
      out.push.apply(out, gainEquip(s, id));
    });
    delete s.pendingDuobao;
    refreshStats(s); saveState(s);
    return out;
  }
  function dropPendingEquip(s) {
    delete s.pendingDuobao;
    saveState(s);
  }

  /* ---------------- 回合制战斗 v2 ---------------- */
  // eslint-disable-next-line no-redeclare
  function combatStart(s, spec) {
    refreshStats(s);
    const d = getDunshu(s);
    const playerSpeed = s.dunSpeed || 1;
    const enemySpeed = spec.dunSpeed || (spec.bi || 0) + 1;
    const speedDiff = playerSpeed - enemySpeed;
    let flee = 0.3 + speedDiff * 0.12 + (d.flee || 0);
    flee = Math.max(0.15, Math.min(0.95, flee));
    if (spec.noFlee) flee = 0.05;
    const spells = equippedShufa(s);
    const spellList = spells.map(function (x) {
      for (const id in TECHNIQUES) if (TECHNIQUES[id] === x) return { id: id, name: x.name, grade: x.grade };
      return null;
    }).filter(Boolean);
    s.battle = {
      name: spec.name, line: spec.line || '', atk: spec.atk,
      hp: spec.hp, hpMax: spec.hp, loot: spec.loot || {}, loseLoot: spec.loseLoot || null,
      flee: flee, guard: d.guard, slow: false, guarded: false,
      spellUsed: false, noFlee: !!spec.noFlee, done: false, win: false, fled: false, lost: false,
      gains: [], hpLost: 0,
      spellList: spellList,
      spellName: spellList.length ? spellList[0].name : null
    };
    saveState(s);
    return s.battle;
  }
  function combatAct(s, act, spellId) {
    const b = s.battle;
    const out = [];
    if (!b || b.done) return { done: true, lines: ['战斗已经结束。'] };
    const enemyAtkRoll = function () {
      let d = Math.max(1, Math.round(b.atk * (0.8 + Math.random() * 0.3)));
      if (b.slow) d = Math.round(d * 0.6);
      if (b.guarded) d = Math.round(d * 0.35);
      if (b.guard > 0) d = Math.round(d * (1 - b.guard));
      return d;
    };
    const counter = function () {
      const d = enemyAtkRoll();
      s.hp -= d;
      b.hpLost += d;
      out.push('『' + b.name + '』反手回击，你气血 -' + d + '。');
      if (s.hp <= 0) {
        s.hp = 1;
        b.done = true; b.lost = true;
        if (b.loseLoot) applyOps(s, b.loseLoot);
        out.push('你重伤坠地，勉强捡回一条命。');
      }
      b.guarded = false;
    };
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
      const mg = moGain(s, 0.08);
      out.push('你凝神守御，灵力尽数护于周身（灵力 +' + mg + '）。');
      counter();
    } else if (act === 'spell') {
      let sp = spellId ? TECHNIQUES[spellId] : null;
      if (!sp || sp.cls !== 'shufa') sp = getBestShufa(s);
      if (!sp) return { done: false, lines: ['你并未习得任何法术。'] };
      const cost = sp.cost || 0;
      if (s.mo < cost) return { done: false, lines: ['灵力不足（' + s.mo + '/' + s.moMax + '），术法难以催动。'] };
      s.mo -= cost;
      const dmg = Math.max(2, Math.round(s.atk * sp.dmg * (0.9 + Math.random() * 0.2)));
      b.hp -= dmg;
      out.push('你施展【' + sp.name + '】，' + (sp.dmg >= 3 ? '声威震天' : '灵力激荡') + '，对『' + b.name + '』造成 ' + dmg + ' 点伤害！');
      if (sp.slow) { b.slow = true; out.push('霜气渗入，『' + b.name + '』的攻势为之一滞。'); }
      if (b.hp <= 0) { b.done = true; b.win = true; out.push('『' + b.name + '』轰然倒下。'); }
      else counter();
    } else {
      const dmg = Math.max(1, Math.round(s.atk * (0.85 + Math.random() * 0.3)));
      b.hp -= dmg;
      out.push('你出手如电，对『' + b.name + '』造成 ' + dmg + ' 点伤害。');
      if (b.hp <= 0) { b.done = true; b.win = true; out.push('『' + b.name + '』轰然倒下。'); }
      else counter();
    }
    if (b.win) {
      const gains = [];
      if (b.loot.stone) {
        let ls = b.loot.stone;
        if (s.talents.indexOf('fuyuan') >= 0) ls = Math.round(ls * 1.10);
        s.stone += ls;
        gains.push('灵石 +' + ls);
      }
      if (b.loot.herb) { s.herb += b.loot.herb; gains.push('灵草 +' + b.loot.herb); }
      if (b.loot.iron) { s.iron += b.loot.iron; gains.push('灵铁 +' + b.loot.iron); }
      if (b.loot.elixirs) gains.push.apply(gains, applyOps(s, { elixirs: b.loot.elixirs }));
      if (b.loot.tech) gains.push.apply(gains, applyOps(s, { tech: b.loot.tech }));
      if (b.loot.equip) gains.push.apply(gains, applyOps(s, { equip: b.loot.equip }));
      const extra = {};
      ['atk', 'hpMax', 'wu', 'hp'].forEach(function (k) { if (b.loot[k]) extra[k] = b.loot[k]; });
      if (Object.keys(extra).length) gains.push.apply(gains, applyOps(s, extra));
      b.gains = gains;
      if (s.adv) {
        s.adv.gains.push.apply(s.adv.gains, gains);
        s.adv.gains.push('击破『' + b.name + '』');
      }
    }
    refreshStats(s);
    saveState(s);
    return { done: b.done, win: b.win, lost: b.lost, fled: b.fled, lines: out };
  }
  function combatAuto(s) {
    const out = [];
    const act = function (a) {
      const rr = combatAct(s, a);
      out.push.apply(out, rr.lines);
      return rr;
    };
    let rr = act('spell');
    let i = 0, fleeTries = 0;
    while (!rr.done && i < 80) {
      if (s.hp <= s.hpMax * 0.2 && fleeTries < 2) { fleeTries++; rr = act('flee'); continue; }
      rr = (i % 2 === 0) ? act('guard') : act('atk');
      i++;
    }
    return { done: rr.done, win: rr.win, lost: rr.lost, fled: rr.fled, rounds: Math.ceil(i / 2), lines: out };
  }

  /* ---------------- 肉鸽冒险（轻肉鸽探索） ---------------- */
  // 秘境一(炼气-筑基): 黄玄级功法
  const TECH_DROPS_1 = ['shengong', 'yuhuo', 'hanshuang', 'xiaoyao', 'changchun', 'leiyin', 'yingdun'];
  // 秘境二(金丹-元婴): 地天级功法
  const TECH_DROPS_2 = ['taixuan', 'hundun', 'jianqi', 'wanjian', 'suodi', 'tiangang'];
  // 按境界索引的功法掉落池
  const TECH_DROPS = [TECH_DROPS_1, TECH_DROPS_1, TECH_DROPS_2, TECH_DROPS_2];
  function enemyGen(s, tag, depth, advType) {
    // advType: 1=秘境一(炼气-筑基), 2=秘境二(金丹-元婴)
    const type = advType || s.advType || 1;
    const maxBi = type === 1 ? 1 : 3; // 秘境一最高筑基, 秘境二最高元婴
    const bi = Math.min(bigIdxOf(s), maxBi);
    const pool = MONSTER_POOL[['lianqi', 'zhuji', 'jindan', 'yuanying'][bi]];
    const m = pool[Math.floor(Math.random() * pool.length)];
    const elite = tag === 'elite', boss = tag === 'boss' || tag === 'final';
    const hits = (elite ? 4.5 : 3.2) + depth * 0.4;
    const hp = Math.round(s.atk * hits * (boss ? 1.7 : 1));
    const atk = Math.max(1, Math.round(s.hpMax / (boss ? 11 : (6 + depth * 0.5)) * (elite ? 1.25 : 1)));
    const realmM = 1 + bi * 0.6;
    const loot = { stone: Math.round((30 + depth * 25) * realmM * (elite ? 1.6 : 1) * (boss ? 3 : 1)) };
    if (Math.random() < 0.3 + depth * 0.08) loot.herb = 1 + Math.floor(Math.random() * (1 + depth));
    if (Math.random() < 0.25 + depth * 0.06) loot.iron = 1 + Math.floor(Math.random() * 2);
    // 功法掉落按秘境类型分层
    if ((boss || tag === 'final') && Math.random() < 0.8) {
      const techPool = type === 1 ? TECH_DROPS_1 : TECH_DROPS_2;
      loot.tech = techPool[Math.floor(Math.random() * techPool.length)];
    }
    // 装备掉落按秘境类型分层
    const equipBi = type === 1 ? Math.min(bi, 1) : Math.max(bi, 2);
    if (Math.random() < (boss ? 1 : 0.15 + depth * 0.06)) loot.equip = randomEquip(equipBi, depth + (boss ? 2 : 0));
    const bname = (tag === 'final') ? '洞天之主' : (boss ? MONSTER_POOL.boss[Math.floor(Math.random() * MONSTER_POOL.boss.length)].name : m.name);
    const bline = (tag === 'final') ? '他端坐于秘境最深处，仿佛早已等你多时。' :
      (boss ? MONSTER_POOL.boss.filter(function (x) { return x.name === bname; })[0].line : m.line);
    return { name: bname, line: bline, atk: atk, hp: hp, loot: loot, bi: bi, dunSpeed: bi + 1 };
  }
  function startAdventure(s, advType) {
    if (s.adventuredYear === s.year) return { ok: false, msg: '天地灵机有限，一年只能入秘境一次。' };
    if (!canAction(s, 2)) return { ok: false, msg: '行动点不足' };
    // 秘境类型限制：筑基前只能进秘境一
    const type = advType || 1;
    if (type === 2 && bigIdxOf(s) < 1) return { ok: false, msg: '修为不足，秘境二需要筑基以上方可进入。' };
    spend(s, 2);
    s.adventuredYear = s.year;
    s.advType = type;
    s.adv = {
      depth: 1, maxDepth: 5,
      setting: (type === 1 ? ADV_SETTINGS_1 : ADV_SETTINGS_2)[Math.floor(Math.random() * (type === 1 ? ADV_SETTINGS_1.length : ADV_SETTINGS_2.length))],
      gains: [], status: 'running', caught: false, done: false
    };
    refreshStats(s); saveState(s);
    return { ok: true };
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
    add('combat', 3 + Math.floor(Math.random() * 2));
    add('treasure', 2);
    add('elite', d >= 2 ? 2 : 0);
    add('herb', 2);
    add('iron', 1);
    add('shop', 1);
    add('event', 1);
    add('trap', d >= 3 ? 1 : 0);
    add('rest', 2);
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
    const d = s.adv.depth, bi = bigIdxOf(s), realmM = 1 + bi * 0.5;
    const advType = s.advType || 1;
    if (node.type === 'combat' || node.type === 'elite') {
      return { type: 'battle', spec: enemyGen(s, node.type, d, advType), title: node.type === 'elite' ? '精英拦路！' : '遭遇战！' };
    }
    if (node.type === 'final') {
      return { type: 'final', spec: enemyGen(s, 'final', Math.min(d + 1, 7), advType) };
    }
    if (node.type === 'treasure') {
      const g = [];
      const lines = ['宝箱缓缓开启，尘埃落定——'];
      const s1 = Math.round((25 + d * 18) * realmM);
      s.stone += s1; g.push('灵石 +' + s1);
      if (Math.random() < 0.35 + d * 0.08) { const h = 1 + Math.floor(Math.random() * 2); s.herb += h; g.push('灵草 +' + h); }
      if (Math.random() < 0.2 + d * 0.05) { const i2 = 1 + Math.floor(Math.random() * 3); s.iron += i2; g.push('灵铁 +' + i2); }
      if (Math.random() < 0.25 + d * 0.07) {
        const ids = ['juling', 'zengshou'];
        const e = ids[Math.floor(Math.random() * ids.length)];
        s.elixirs[e] = (s.elixirs[e] || 0) + 1; g.push('丹药【' + ELIXIRS[e].name + '】×1');
      }
      if (Math.random() < 0.18 + d * 0.06) {
        g.push.apply(g, grantEquipChecked(s, randomEquip(bi, d)));
      }
      if (Math.random() < 0.1) {
        const t = TECH_DROPS[bi][Math.floor(Math.random() * TECH_DROPS[bi].length)];
        g.push.apply(g, applyOps(s, { tech: t }));
      }
      s.adv.gains.push.apply(s.adv.gains, g);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: lines.concat(g) };
    }
    if (node.type === 'herb') {
      const h = 2 + d + Math.floor(Math.random() * bi);
      s.herb += h;
      s.adv.gains.push('灵草 +' + h);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: ['你小心拨开草叶，将年份最足的灵草一株株采下。', '灵草 +' + h] };
    }
    if (node.type === 'iron') {
      const i2 = 3 + d + (Math.random() < 0.25 ? 2 : 0);
      s.iron += i2;
      s.adv.gains.push('灵铁 +' + i2);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: ['矿脉露出地表，半截石壁闪着金属光泽。你抡起矿镐，凿下一块块坚硬的灵铁。', '灵铁 +' + i2] };
    }
    if (node.type === 'shop') {
      return { type: 'shop', stock: shopStock(s) };
    }
    if (node.type === 'event') {
      const pool = EVENTS.mijing.filter(function (ev) {
        return ev.min <= s.idx && ev.max >= s.idx && (!ev.once || !s.seen[ev.id]);
      });
      const ev = pool.length ? pickWeighted(pool) : null;
      if (ev && !s.seen[ev.id]) s.seen[ev.id] = 1;
      return { type: 'event', ev: ev };
    }
    if (node.type === 'trap') {
      const r = Math.random();
      if (r < 0.5) {
        const dmg = Math.round(s.hpMax * 0.12);
        s.hp -= dmg; refreshStats(s); saveState(s);
        return { type: 'plain', lines: ['脚下石板突然塌陷，你跌入陷阱，气血 -' + dmg + '。', '此地不宜久留。'] };
      }
      if (r < 0.8) {
        const lose = Math.min(s.stone, Math.round(15 + d * 10));
        s.stone -= lose; refreshStats(s); saveState(s);
        return { type: 'plain', lines: ['一只鬼手卷走你的钱袋，你追了两步，它已没入黑暗。', '灵石 -' + lose] };
      }
      return { type: 'plain', lines: ['你听到窸窣声，屏息凝神等了半晌——只是一只大老鼠。虚惊一场。'] };
    }
    if (node.type === 'rest') {
      const heal = Math.round(s.hpMax * 0.55) + 25;
      s.hp = Math.min(s.hpMax, s.hp + heal);
      const mg = moGain(s, 0.8);
      refreshStats(s); saveState(s);
      return { type: 'plain', lines: ['你靠着岩壁坐下，生火取暖，气血恢复 ' + heal + '，灵力回复 ' + mg + '。'] };
    }
    return { type: 'plain', lines: ['你环顾四周，空无一物——正好歇歇脚。'] };
  }
  function advAdvance(s) {
    s.adv.depth += 1;
    saveState(s);
    return s.adv.depth >= s.adv.maxDepth + 1;
  }
  function advEnd(s, why) {
    s.adv.status = 'done';
    s.adv.done = true;
    if (why === 'lost') {
      const ls = Math.floor(s.stone / 2), lh = Math.floor(s.herb / 3), li = Math.floor(s.iron / 3);
      s.stone -= ls; s.herb -= lh; s.iron -= li;
      s.adv.lostMsg = '劫后余生：灵石 -' + ls + '，灵草 -' + lh + '，灵铁 -' + li + '。';
    }
    refreshStats(s); saveState(s);
  }
  function advClearReward(s) {
    const bi = bigIdxOf(s), realmM = 1 + bi * 0.8;
    const gains = [];
    const s1 = Math.round((150 + 60 * bi) * realmM);
    s.stone += s1; gains.push('洞天秘藏 · 灵石 +' + s1);
    const h = 3 + Math.floor(Math.random() * (4 + bi)); s.herb += h; gains.push('灵草 +' + h);
    const i2 = 2 + Math.floor(Math.random() * 3); s.iron += i2; gains.push('灵铁 +' + i2);
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
    const mats = SHOP_ITEMS.filter(function (i) { return i.id === 'herb5' || i.id === 'iron3'; });
    stock.push(pick(mats));
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
    if (eid) stock.push({ id: 'EQUIP:' + eid, name: '装备·' + findEquip(eid).name, price: findEquip(eid).price, equip: eid });
    return stock;
  }
  function biOfSafe(s) { return bigIdxOf(s); }
  function buyStock(s, si) {
    if (si.sold) return { ok: false, msg: '此物已被买走。' };
    if (s.stone < si.price) return { ok: false, msg: '灵石不足。' };
    s.stone -= si.price;
    si.sold = true;
    const out = ['支出灵石 ' + si.price];
    if (si.give) out.push.apply(out, applyOps(s, si.give));
    if (si.tech) out.push.apply(out, applyOps(s, { tech: si.tech }));
    if (si.equip) out.push.apply(out, gainEquip(s, si.equip));
    saveState(s);
    return { ok: true, lines: out };
  }
  function sellMaterial(s, kind, n) {
    if (kind !== 'herb' && kind !== 'iron') return false;
    const have = kind === 'herb' ? s.herb : s.iron;
    if (have < n) return false;
    if (kind === 'herb') s.herb -= n; else s.iron -= n;
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
  function cultivate(s) {
    if (s.cultedThisYear) return '今年已修炼过，明年再来吧。';
    if (!canAction(s, cultCost(s))) return '行动点不足';
    const need = requireNeed(s);
    if (s.qi >= need) return '修为已满，瓶颈隐隐颤动——该尝试突破了。';
    const r = cultGain(s);
    const actual = Math.min(r.gain, need - s.qi);
    s.qi += actual;
    const mg = moGain(s, 0.25);
    s.cultedThisYear = true;
    spend(s, cultCost(s));
    let note2 = '';
    const sheshengLv = (s.reinc && s.reinc.shesheng) || 0;
    if (sheshengLv > 0) {
      s.lifeMax -= 1;
      note2 += '（舍生：寿元 -1）';
    }
    if (s.qi >= need) note2 += '（修为已满，可尝试突破！）';
    refreshStats(s);
    return '你闭目吐纳，引天地灵气入体，修为 +' + actual + '，灵力 +' + mg + '。' + (r.note ? r.note : '') + note2;
  }
  function canAction(s, n) { return s.actionsLeft >= n && !s.dead; }

  function explore(s) {
    if (!canAction(s, 2)) return false;
    const pool = EVENTS.mijing.filter(evOK(s, 2));
    if (!pool.length) { spend(s, 2); return '秘境深处再无新路，你空手而归。（消耗2行动点）'; }
    spend(s, 2);
    const ev = pickWeighted(pool);
    s.seen[ev.id] = 1;
    return ev;
  }
  function social(s) {
    if (!canAction(s, 1)) return false;
    if (s.sect) {
      const bi = bigIdxOf(s);
      const pool = SECT_SOCIAL[s.sect].filter(function (ev) {
        return ev.min <= bi && ev.max >= bi && (!ev.once || !s.seen[ev.id]);
      });
      if (!pool.length) { spend(s, 1); return '你走遍宗门各处，今日并无合宜的活动，只得回洞府清修半日。'; }
      spend(s, 1);
      const ev = pickWeighted(pool);
      s.seen[ev.id] = 1;
      return ev;
    }
    const pool = EVENTS.shejiao.concat(EVENTS.mijing).filter(evOK(s, 1));
    if (!pool.length) { spend(s, 1); return '这一带没有值得交谈的人，你独自练剑半日。'; }
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
    if (!pool.length) { spend(s, 1); return '今日暂无降妖任务，你在宗门待命半日。'; }
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
          { t: '讲灵力凝聚之法', effect: { mo: Math.round(calcMoMax(s) * 0.1) }, lines: ['你阐述灵力凝聚之法，声音回荡在道庭之中。讲毕，你灵力恢复了不少。'] },
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
    if (!ev) { spend(s, 1); return '你巡山半日，一无所获。'; }
    spend(s, 1);
    return ev;
  }
  function evOK(s, tag) {
    return function (ev) {
      if (ev.min > s.idx || ev.max < s.idx) return false;
      if (ev.once && s.seen[ev.id]) return false;
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
    return FORMULAS.filter(function (f) { return f.type === '丹' && bigIdxOf(s) >= f.needRealm; });
  }
  function doAlchemy(s, f) {
    if (s.herb < f.cost.herb) return { ok: false, msg: '灵草不足，需要 ' + f.cost.herb + ' 株' };
    s.herb -= f.cost.herb;
    const chance = Math.min(0.92, 0.7 + (s.wu - 5) * 0.01 + (s.talents.indexOf('liancai') >= 0 ? 0.2 : 0) + (s.reinc.alchemy || 0) * 0.10 + (s.sect === 'dpxia' ? 0.2 : 0));
    if (Math.random() < chance) {
      let qty = 1;
      const doubleChance = ((s.reinc && s.reinc.alchemyDouble) || 0) * 0.10;
      if (doubleChance > 0 && Math.random() < doubleChance) qty = 2;
      s.elixirs[f.out] = (s.elixirs[f.out] || 0) + qty;
      refreshStats(s); saveState(s);
      return { ok: true, msg: '丹成！你炼出【' + ELIXIRS[f.out].name + '】' + (qty > 1 ? '×' + qty : '一枚') + '。' + (qty > 1 ? '（双倍产出！）' : '') };
    }
    saveState(s);
    return { ok: false, msg: '炸炉了……灵草化作飞灰，你心疼地捂了捂胸口。' };
  }
  function forgeChoices(s) {
    return FORMULAS.filter(function (f) { return f.type === '法宝' && bigIdxOf(s) >= f.needRealm; });
  }
  function doForge(s, f) {
    if (s.iron < f.cost.iron) return { ok: false, msg: '灵铁不足，需要 ' + f.cost.iron + ' 块' };
    s.iron -= f.cost.iron;
    const chance = Math.min(0.9, 0.75 + (s.ti - 5) * 0.01);
    if (Math.random() < chance) {
      if (s.arts.indexOf(f.out) < 0) s.arts.push(f.out);
      refreshStats(s); saveState(s);
      return { ok: true, msg: '宝光一闪！【' + ARTIFACTS[f.out].name + '】炼成了。' };
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
  function breakInfo(s) {
    const st = STAGES[s.idx];
    const nxt = STAGES[s.idx + 1];
    let base = 0.8 + (s.wu - 5) * 0.01;
    let mode = 'small', trib = null, desc = '';
    if (st.realm === '元婴' && st.sub === '中期') {
      mode = 'trib'; trib = '飞升'; base = 0.45;
      desc = '元婴圆满，天劫将至——成则羽化登仙，败则身死道消！';
    } else if (!nxt) {
      mode = 'trib'; trib = '飞升'; base = 0.45;
      desc = '元婴圆满，天劫将至——成则羽化登仙，败则身死道消！';
    } else if (nxt.realm === '筑基') {
      mode = 'small'; base = 0.72 + (s.wu - 5) * 0.015;
      base = Math.min(base, 0.9);
      desc = '筑基无天劫，唯需破开尘障。你凝神静气，尝试以灵力重铸凡躯……';
    } else if (nxt.realm !== st.realm) {
      mode = 'trib'; trib = nxt.realm;
      base = 0.55;
      let body = s.linggen.body || {};
      base += (body.trib || 0) + (s.sect === 'xuantian' ? 0.05 : 0) + (s.arts.indexOf('jinylv') >= 0 ? 0.1 : 0);
      const eid = BREAK_ELIXIR[nxt.realm];
      if (eid && (s.elixirs[eid] || 0) > 0) { base += 0.25; desc = '你摸出一枚【' + ELIXIRS[eid].name + '】含入口中。'; }
      if (trib === '金丹') base = Math.min(base, 0.9);
      if (trib === '元婴') base = Math.min(base, 0.85);
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
    if (info.mode === 'trib' && info.trib !== '飞升') {
      if (!s.trib || s.trib.target !== info.trib) s.trib = { target: info.trib, ren: false };
      if (!s.trib.ren) {
        saveState(s);
        return { ok: false, needTrib: true, trib: info.trib, ren: false, phase: 'ren' };
      }
      saveState(s);
      return { ok: false, needTrib: true, trib: info.trib, ren: true, phase: 'tianjie' };
    }
    if (info.mode === 'trib' && info.trib === '飞升') {
      if (!s.trib || s.trib.target !== '飞升') s.trib = { target: '飞升', ren: false };
      if (!s.trib.ren) {
        saveState(s);
        return { ok: false, needTrib: true, trib: '飞升', ren: false, phase: 'ren' };
      }
      saveState(s);
      return { ok: false, needTrib: true, trib: '飞升', ren: true, phase: 'tianjie' };
    }
    const roll = Math.random();
    const pass = roll < info.base;
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
        return { ok: true, win: true, mode: info.mode, trib: info.trib, tech: tech, line: '天门已开，你于万丈雷光中踏出最后一步。' };
      }
      s.idx += 1;
      s.broken += 1;
      s.hp = calcHpMax(s);
      s.mo = calcMoMax(s);
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
    let poefu = s.arts.indexOf('poefu') >= 0;
    const deathChance = isFly ? 1 : (trib === '元婴' ? 0.25 : (trib === '金丹' ? 0.15 : 0));
    let died = Math.random() < deathChance;
    if (died && poefu) {
      died = false;
      poefu = false;
      s.arts = s.arts.filter(function (a) { return a !== 'poefu'; });
      s.qi = Math.round(s.qi * 0.4);
      s.hp = Math.max(1, Math.round(s.hpMax * 0.3));
      s.lifeMax -= 40;
      refreshStats(s); saveState(s);
      return { ok: true, win: false, mode: 'trib', trib: trib, saved: true,
        line: '天劫轰然压顶，你道体将碎——怀中【破厄符】无风自燃，替你挡下致命一击！\n你重伤跌落山涧，道基折损，寿元削减四十载。活下去，就是赢。' };
    }
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
    return {
      name: '心魔 · 执念化形',
      line: '心魔借你记忆成形，招招都指向你心底最深的破绽。它不认得痛——它就是你的影子。',
      atk: Math.max(18, Math.round(s.atk * 1.05)),
      hp: Math.round(Math.max(120, s.atk * (5 + bi) * 1.15)),
      loot: {}, loseLoot: { hp: -0.3 }, bi: 0, xinmo: true,
      dunSpeed: s.dunSpeed || 1
    };
  }
  function tianjieSpec(s, trib) {
    const bi = bigIdxOf(s);
    const isYuan = trib === '元婴';
    const name = isYuan ? '天劫化身 · 紫霄神霄双雷形' : '天劫化身 · 九天应元之形';
    const atk = Math.max(18, Math.round(s.atk * (isYuan ? 1.1 : 1.05)));
    return {
      name: name,
      line: '劫云滚滚而下，天雷凝作一具人形，掌中握着整片翻涌的雷霆。它无声地看着你——这一关，没有退路。',
      atk: atk,
      hp: Math.round(s.hpMax * (isYuan ? 0.95 : 0.72)),
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
      s.hp = calcHpMax(s);
      s.mo = calcMoMax(s);
      s.dunSpeed = 1 + bigIdxOf(s);
      logLife(s, 'feisheng', '渡劫飞升，得道成仙');
      refreshStats(s); saveState(s);
      return { ok: true, trib: info.trib, win: true, tech: null };
    }
    s.idx += 1;
    s.broken += 1;
    s.hp = calcHpMax(s);
    s.mo = calcMoMax(s);
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
  function dujieFail(s, trib) {
    const res = tribFail(s, breakInfo(s), trib, false);
    if (!res.died) {
      s.trib = null;
      const loss = Math.round(requireNeed(s) * 0.2);
      s.qi = Math.max(0, s.qi - loss);
      res.line += '（修为 -' + loss + '）';
      refreshStats(s); saveState(s);
    }
    return res;
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
    const years = Math.max(0, s.year - (p.planted || s.year));
    const done = years >= sd.years;
    return { seed: p.seed, name: sd.name, years: years, needYears: sd.years, done: done, desc: sd.desc };
  }
  function plantField(s, seedId) {
    const sd = FIELD_SEEDS[seedId];
    if (!sd) return '没有这种种子。';
    const plots = fieldPlots(s);
    if (plots.length >= 6) return '灵田已满（最多六亩），先采收再种吧。';
    if (s.herb < sd.cost) return '灵草不足（播种需 ' + sd.cost + ' 株）。';
    s.herb -= sd.cost;
    plots.push({ seed: seedId, planted: s.year });
    refreshStats(s); saveState(s);
    return '你翻土、下种、引灵泉灌溉，一亩【' + sd.name + '】就此落成。' + sd.desc;
  }
  function harvestField(s, i) {
    const plots = fieldPlots(s);
    const p = plots[i];
    if (!p) return '这一亩田并不存在。';
    const sd = FIELD_SEEDS[p.seed];
    const years = s.year - (p.planted || s.year);
    if (years < sd.years) return '这一亩【' + sd.name + '】还有 ' + (sd.years - years) + ' 年才成熟。';
    let n = sd.gain[0] + Math.floor(Math.random() * (sd.gain[1] - sd.gain[0] + 1));
    s.herb += n;
    let extra = '';
    if (p.seed === 'lingshen_big' && Math.random() < 0.25) { s.herb += 6; extra = '，并掘出一株野参王（额外灵草 +6）'; }
    plots.splice(i, 1);
    refreshStats(s); saveState(s);
    return '你挥锄采收【' + sd.name + '】，得灵草 ' + n + ' 株' + extra;
  }
  function digMine(s) {
    if (!s.mine) s.mine = { depth: 0 };
    const d = s.mine.depth || 0;
    const r = Math.random();
    let msg;
    if (r < 0.15) { const st = (8 + d * 2) * 10; s.stone += st; msg = '矿脉深处竟嵌着几条灵石原矿（灵石 +' + st + '）。'; }
    else if (r < 0.3) { const h = (1 + Math.floor(Math.random() * 2)) * 10; s.herb += h; msg = '你在岩缝里寻到几株伴生灵草（灵草 +' + h + '）。'; }
    else {
      const n = (2 + Math.floor(d / 2) + Math.floor(Math.random() * (3 + Math.floor(d / 3)))) * 10;
      s.iron += n; msg = '你抡起卦锤一凿一凿，挖出灵铁 ' + n + ' 块。';
    }
    if (Math.random() < 0.35 && d < 10) { s.mine.depth = d + 1; msg += ' 矿脉愈挖愈深，灵气渐盛（矿脉深度 +1）。'; }
    refreshStats(s); saveState(s);
    return msg;
  }

  /* ---------------- 炼制队列系统 ---------------- */
  function startCraft(s, formulaId) {
    if (!s.craftQueue) s.craftQueue = [];
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
    s.craftQueue.push({
      formulaId: formulaId,
      startYear: s.year,
      endYear: s.year + formula.years,
      output: formula.out,
      type: formula.type
    });
    refreshStats(s); saveState(s);
    return { ok: true, msg: '开始炼制，需要' + formula.years + '年' };
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

  /* ---------------- 结缘系统 ---------------- */
  function giveGift(s, targetId, giftType) {
    if (!s.favor) s.favor = {};
    if (!s.giftCooldown) s.giftCooldown = {};
    var target = FAVOR_SYSTEM[targetId];
    if (!target) return { ok: false, msg: '目标不存在' };
    var gift = target.gifts[giftType];
    if (!gift) return { ok: false, msg: '礼物不存在' };
    if (s.giftCooldown[targetId] >= s.year) return { ok: false, msg: '今年已赠送过礼物' };
    if ((s.materials[giftType] || 0) <= 0) return { ok: false, msg: '材料不足' };
    s.materials[giftType]--;
    s.favor[targetId] = Math.min(target.maxFavor, (s.favor[targetId] || 0) + gift.favor);
    s.giftCooldown[targetId] = s.year;
    refreshStats(s); saveState(s);
    return { ok: true, msg: '赠送' + gift.name + '，好感度+' + gift.favor };
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
    s.actionsLeft = actionPoints(s);
    s.hp = s.hpMax;
    s.cultedThisYear = false;
    s.mo = calcMoMax(s);
    let fenglu = null;
    if (s.sect && SECT_FENGLU[s.sect]) {
      const f = SECT_FENGLU[s.sect];
      const parts = [];
      if (f.stone) { s.stone += f.stone; parts.push('灵石 +' + f.stone); }
      if (f.herb) { s.herb += f.herb; parts.push('灵草 +' + f.herb); }
      if (f.iron) { s.iron += f.iron; parts.push('灵铁 +' + f.iron); }
      fenglu = parts;
    }
    refreshStats(s); saveState(s);
    return fenglu ? 'ok|' + fenglu.join('、') : 'ok';
  }
  function fateBattle(s) {
    const winChance = { '炼气': 0.02, '筑基': 0.08, '金丹': 0.22, '元婴': 0.5 }[s.realm] || 0.02;
    const win = Math.random() < winChance;
    s.dead = true;
    s.endReason = win ? '镇魔渊' : '魔渊之战陨落';
    s.fateWin = win;
    if (win) logLife(s, 'moyuan', '以身镇魔渊，舍身成仁');
    refreshStats(s); saveState(s);
    return win;
  }

  /* ---------------- 生涯记录 ---------------- */
  function logLife(s, type, text, pts) {
    if (!s.lifeLog) s.lifeLog = [];
    s.lifeLog.push({ type: type, text: text, pts: pts || 0 });
  }
  function settlePoints(s, meta) {
    var ach = earnPoints(s, meta);
    var realmTier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
    var realmPts = realmTier[s.realm] || 2;
    var breakPts = Math.min(10, Math.floor(s.broken / 3));
    var agePts = s.age >= 200 ? 2 : 0;
    var specPts = 0;
    if (s.endReason === '飞升') specPts = 10;
    else if (s.endReason === '镇魔渊') specPts = 8;
    var achPts = 0;
    ach.forEach(function (a) { if (a.new) achPts += ACHIEVEMENTS[a.id].pts; });
    var top5 = [];
    if (s.endReason === '飞升') top5.push({ text: '渡劫飞升，得道成仙', pts: 10, cls: 'gold' });
    if (s.endReason === '镇魔渊') top5.push({ text: '以身镇魔渊，舍身成仁', pts: 8, cls: 'gold' });
    if (s.flags.daoLu) top5.push({ text: '感悟大道真意', pts: 0, cls: 'gold' });
    if (s.idx >= 9) top5.push({ text: '凝出元婴，阳神出窍', pts: 0, cls: 'realm' });
    if (s.idx >= 6) top5.push({ text: '结成金丹，踏入金丹大道', pts: 0, cls: 'realm' });
    if (s.sect) top5.push({ text: '拜入' + SECTS[s.sect].name, pts: 0, cls: 'sect' });
    if (s.broken >= 3) top5.push({ text: '一生渡劫' + s.broken + '次而不陨', pts: 0, cls: 'realm' });
    if (s.broken >= 1 && s.idx < 6) top5.push({ text: '初次突破筑基', pts: 0, cls: 'realm' });
    if (s.age >= 200) top5.push({ text: '活过二百岁', pts: 2, cls: 'dim' });
    top5.sort(function (a, b) { return b.pts - a.pts; });
    top5 = top5.slice(0, 5);
    return {
      total: s.earnedPoints || 0,
      breakdown: { realm: realmPts, break: breakPts, age: agePts, spec: specPts, ach: achPts },
      ach: ach,
      top5: top5
    };
  }

  /* ---------------- 结局结算 / 轮回 ---------------- */
  function earnPoints(s, meta) {
    const tier = { '炼气': 2, '筑基': 4, '金丹': 7, '元婴': 11, '仙': 25 };
    let pts = tier[s.realm] || 2;
    pts += Math.min(10, Math.floor(s.broken / 3));
    const ach = checkAchievements(s, meta);
    ach.forEach(function (a) { if (a.new) pts += ACHIEVEMENTS[a.id].pts; });
    s.earnedPoints = pts;
    return ach;
  }
  function checkAchievements(s, meta) {
    const res = [];
    const defs = {
      shou_zhuji: s.broken >= 1 || s.idx >= 3,
      shou_jiejin: s.idx >= 6,
      shou_yuanying: s.idx >= 9,
      feisheng: s.idx >= 15 || s.endReason === '飞升',
      daolu: !!s.flags.daoLu,
      shou_zhong: s.endReason === '寿元耗尽',
      mo_yuan: s.endReason === '镇魔渊',
      binjie_3: s.broken >= 3,
      ai_renzi: s.age >= 200
    };
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
  function endLife(s) {
    const meta = loadMeta();
    const ach = earnPoints(s, meta);
    meta.points += s.earnedPoints || 0;
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
    if (ev.effect) gains.push.apply(gains, applyOps(s, ev.effect));
    fillTokens(ev);
    refreshStats(s); saveState(s);
    return gains;
  }

  return {
    loadMeta: loadMeta, saveMeta: saveMeta, loadState: loadState, saveState: saveState, clearState: clearState,
    slotExists: slotExists, slotInfo: slotInfo,
    ensureTechEquip: ensureTechEquip, equippedShufa: equippedShufa,
    setXinfa: setXinfa, setDunshu: setDunshu, toggleShufa: toggleShufa,
    startLife: startLife, commitStart: commitStart,
    cultivate: cultivate, canAction: canAction, spend: spend,
    explore: explore, social: social, jiyuan: jiyuan,
    alchemyChoices: alchemyChoices, doAlchemy: doAlchemy,
    forgeChoices: forgeChoices, doForge: doForge,
    canBreak: canBreak, breakInfo: breakInfo, breakthrough: breakthrough,
    sectCombat: sectCombat, sectLecture: sectLecture,
    cultCost: cultCost, actionPoints: actionPoints,
    endYear: endYear, fateBattle: fateBattle,
    endLife: endLife, useElixir: useElixir,
    runEvent: runEvent, applyOps: applyOps,
    combatStart: combatStart, combatAct: combatAct, combatAuto: combatAuto,
    equipStats: equipStats, cultGain: cultGain, getBestShufa: getBestShufa, getDunshu: getDunshu,
    findEquip: findEquip, wearEquip: wearEquip, sellEquip: sellEquip, gainEquip: gainEquip,
    startAdventure: startAdventure, advGenLayer: advGenLayer, advResolve: advResolve,
    advAdvance: advAdvance, advEnd: advEnd, advClearReward: advClearReward,
    enemyGen: enemyGen, randomEquip: randomEquip,
    realmTierRange: realmTierRange, equipAllowed: equipAllowed,
    calcMoMax: calcMoMax, moGain: moGain, refreshStats: refreshStats, requireNeed: requireNeed, maxTreasure: maxTreasure,
    xinmoSpec: xinmoSpec, tianjieSpec: tianjieSpec,
    dujieWin: dujieWin, dujieFail: dujieFail, xinmoDone: xinmoDone,
    fieldInfo: fieldInfo, plantField: plantField, harvestField: harvestField, digMine: digMine,
    grantEquipChecked: grantEquipChecked, pendingDuobao: pendingDuobao,
    duobaoSpec: duobaoSpec, grantPendingEquip: grantPendingEquip, dropPendingEquip: dropPendingEquip,
    shopStock: shopStock, buyStock: buyStock, sellMaterial: sellMaterial,
    startCraft: startCraft, accelerateCraft: accelerateCraft,
    giveGift: giveGift, getAvailableEvents: getAvailableEvents, triggerEvent: triggerEvent,
    bigIdxOf: bigIdxOf,
    TECHNIQUES: TECHNIQUES, ARTIFACTS: ARTIFACTS, ELIXIRS: ELIXIRS,
    ACHIEVEMENTS: ACHIEVEMENTS, REINCARNATION: REINCARNATION,
    logLife: logLife, settlePoints: settlePoints, earnPoints: earnPoints, checkAchievements: checkAchievements
  };
})();