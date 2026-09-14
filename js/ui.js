/* ============================================================
   DEDAO 得道 —— 界面层（章节叙事 / 回合制战斗 / 冒险 / 装备 / 轮回塔）
   ============================================================ */
(function () {
  'use strict';

  let S = null;
  let M = Engine.loadMeta();

  /* ---------------- 设置（声音 / 节奏 / 特效） ---------------- */
  const CFG_KEY = 'dedao_cfg';
  let CFG = { sound: 1, vol: 0.5, bgm: 1, bgmVol: 0.5, fx: 1, pace: 1 };
  (function () {
    try {
      const c = JSON.parse(localStorage.getItem(CFG_KEY));
      if (c && typeof c === 'object') CFG = Object.assign(CFG, c);
    } catch (e) {}
  })();
  function saveCfg() {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); } catch (e) {}
    document.body.classList.toggle('fx-off', !CFG.fx);
    if (typeof AudioManager !== 'undefined') {
      AudioManager.enableBgm(!!CFG.bgm);
      AudioManager.enableSfx(!!CFG.sound);
      AudioManager.setBgmVolume(CFG.bgmVol || 0.5);
      AudioManager.setSfxVolume(CFG.vol || 0.5);
    }
  }
  function sfx(kind) {
    if (typeof AudioManager !== 'undefined') {
      // 确保音频已激活
      if (!AudioManager.isInitialized()) {
        AudioManager.activate();
      }
      AudioManager.playSfx(kind);
    }
  }

  const $ = function (id) { return document.getElementById(id); };

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function randName() {
    const surnames = ['李', '王', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '林', '何', '高', '罗', '郑', '梁', '谢', '宋', '唐', '韩', '曹', '许', '邓', '萧', '冯', '曾', '程', '蔡', '彭', '潘', '袁', '于', '董', '余', '苏', '叶', '吕', '魏', '蒋', '田', '杜', '丁', '沈', '姜', '范', '江', '傅', '钟', '卢', '汪', '戴', '崔', '任', '陆', '廖', '姚', '方', '金', '邱', '夏', '谭', '石', '贾', '邹', '熊', '孟', '秦', '阎', '薛', '侯', '段', '雷', '龙', '史', '陶', '贺', '顾', '毛', '郝', '龚', '邵', '万', '钱', '严', '覃', '武', '戚', '尚'];
    const chars = ['云', '风', '月', '星', '霜', '雪', '雨', '烟', '尘', '渊', '鸿', '鹤', '剑', '影', '林', '山', '水', '川', '海', '天', '寒', '孤', '墨', '青', '白', '玄', '无', '一', '九', '归', '逐', '问', '临', '落', '离', '止', '明', '衣', '微', '崖', '风', '雷', '电', '火', '冰', '玉', '琴', '棋', '书', '画', '诗', '酒', '花', '茶', '龙', '凤', '麟', '虎', '豹', '鲸'];
    return surnames[Math.floor(Math.random() * surnames.length)] + chars[Math.floor(Math.random() * chars.length)] + (Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : '');
  }
  const SENSITIVE_WORDS = ['他妈', '操你', '妈逼', '草泥马', 'fuck', 'shit', 'bitch', 'ass', 'damn', 'dick', 'pussy', 'cock', ' cunt', 'whore', 'slut', 'retard', 'idiot', 'stupid', '傻逼', '牛逼', '骚逼', '逼', '操', '日你', '干你', '滚蛋', '去死', '混蛋', '王八蛋', '龟儿子', '狗日', '畜生', '变态', '色情', '淫荡', '荡妇', '妓女', '嫖', '卖淫'];
  function checkSensitive(name) {
    const lower = name.toLowerCase();
    for (let i = 0; i < SENSITIVE_WORDS.length; i++) {
      if (lower.indexOf(SENSITIVE_WORDS[i]) >= 0) return SENSITIVE_WORDS[i];
    }
    return null;
  }
  function showScreen(name) {
    // 动态扫描所有 .screen，避免新增屏幕时漏配白名单（曾导致成就/图鉴点开即全屏空白）
    var screens = document.querySelectorAll('.screen');
    Array.prototype.forEach.call(screens, function (el) {
      var n = String(el.id || '').replace(/^screen-/, '');
      el.style.display = (n === name) ? 'flex' : 'none';
      // 首次进入该屏幕时才加载背景图（懒加载）
      if (n === name && el.dataset && el.dataset.bg && !el.dataset.bgLoaded) {
        el.style.backgroundImage = 'url(' + el.dataset.bg + ')';
        el.dataset.bgLoaded = '1';
      }
    });
    // 底部栏只在游戏页面显示
    var bottomBar = $('bottom-bar');
    if (bottomBar) {
      bottomBar.style.display = (name === 'game' || name === 'char') ? 'flex' : 'none';
    }
    // 根据屏幕切换BGM - 标题和游戏页面都播放同一个BGM
    if (typeof AudioManager !== 'undefined') {
      var bgmMap = {
        'title': 'title',
        'game': 'title',
        'rebirth': 'peaceful',
        'ending': 'ending',
        'gear': 'game',
        'settlement': 'ending',
        'tech': 'game',
        'favor': 'game',
        'crafts': 'game',
        'duanti': 'game',
        'enter': 'title',
        'create': 'title',
        'cultivate': 'game',
        'sect': 'game',
        'travel': 'game',
        'npc': 'game'
      };
      if (bgmMap[name]) {
        AudioManager.playBgm(bgmMap[name]);
      }
    }
  }

  /* ---------------- 日志（按年分块可折叠） ---------------- */
  let logYear = null;
  function newYearBlock(label) {
    const box = $('log');
    const sec = document.createElement('div');
    sec.className = 'log-year';
    const h = document.createElement('p');
    h.className = 'log-sec';
    h.textContent = '▾ ' + label;
    h.onclick = function () {
      sec.classList.toggle('collapsed');
      h.textContent = (sec.classList.contains('collapsed') ? '▸ ' : '▾ ') + label;
      box.scrollTop = box.scrollHeight;
    };
    const body = document.createElement('div');
    body.className = 'log-year-body';
    sec.appendChild(h);
    sec.appendChild(body);
    box.appendChild(sec);
    box.scrollTop = box.scrollHeight;
    logYear = body;
  }
  function log(text, cls) {
    if (!logYear) newYearBlock(S ? ('第 ' + S.year + ' 年 · ' + S.age + ' 岁') : '记录');
    const p = document.createElement('p');
    p.className = 'log-line ' + (cls || '');
    p.innerHTML = esc(text).replace(/\n/g, '<br>');
    logYear.appendChild(p);
    $('log').scrollTop = $('log').scrollHeight;
  }
  function logSection(title) { newYearBlock(title); }

  /* ---------------- 属性刷新 ---------------- */
  function refresh() {
    if (!S) return;
    const st = STAGES[S.idx];
    const ap = Engine.actionPoints(S);

    $('h-name').textContent = S.name;
    if ($('h-avatar')) {
      const fb = $('h-avatar').querySelector('.avatar-fb');
      if (fb) fb.textContent = (S.name || '修').slice(0, 1);
    }
    $('h-realm').textContent = st.sym + ' ' + st.realm + ' ' + st.sub;
    $('h-realm').style.color = st.color;
    $('h-realm').style.borderColor = st.color;

    // 行动/灵石显示
    if ($('h-stone')) $('h-stone').textContent = S.stone;
    if ($('h-actions-left')) $('h-actions-left').textContent = S.actionsLeft;
    // 年龄/寿元显示
    if ($('h-age-val')) $('h-age-val').textContent = S.age;
    if ($('h-life-val')) $('h-life-val').textContent = S.lifeMax;
    // 命格显示（HUD右侧，每个命格独立颜色框）
    const destinyEl = $('h-destiny');
    if (destinyEl) {
      destinyEl.innerHTML = '';
      if (S.destinies && S.destinies.length) {
        var gradeMap = { '白': 'white', '绿': 'green', '蓝': 'blue', '紫': 'purple', '金': 'gold' };
        S.destinies.forEach(function(d, i) {
          var dest = DESTINIES[d];
          if (!dest) return;
          if (i > 0) {
            var sep = document.createElement('span');
            sep.textContent = '、';
            sep.style.color = 'var(--dim)';
            destinyEl.appendChild(sep);
          }
          var span = document.createElement('span');
          span.className = 'destiny-tag';
          span.textContent = dest.name;
          if (dest.grade) {
            span.classList.add('grade-' + (gradeMap[dest.grade] || 'white'));
          }
          destinyEl.appendChild(span);
        });
      } else {
        destinyEl.textContent = '无命格';
      }
    }

    // 修为条
    const need = requireNeed(S);
    const qiPct = Math.max(0, Math.min(100, S.qi / need * 100));
    $('qi-val').textContent = S.qi + ' / ' + need;
    bar('bar-qi', qiPct, '#4ec9a0');

    // 六维属性（含基础+命格+法宝+装备，与角色面板口径一致）
    $('st-wu').textContent = Engine.effAttr(S, 'wu') + (Engine.equipStats(S).wu || 0);
    $('st-ti').textContent = Engine.effAttr(S, 'ti') + (Engine.equipStats(S).ti || 0);
    $('st-dun').textContent = Engine.effAttr(S, 'dun') + (Engine.equipStats(S).dun || 0);
    $('st-shen').textContent = Engine.effAttr(S, 'shen') + (Engine.equipStats(S).shen || 0);
    $('st-dao').textContent = Engine.effAttr(S, 'dao') + (Engine.equipStats(S).dao || 0);
    $('st-ling').textContent = Engine.effAttr(S, 'ling') + (Engine.equipStats(S).ling || 0);
    // 战斗属性
    $('st-atk').textContent = S.atk || 0;
    // 防御/暴击/闪避：全部走引擎统一口径，与属性面板、战斗结算一致
    $('st-def').textContent = Engine.getDefense(S);
    $('st-crit').textContent = Math.round(Engine.getCritRate(S) * 100) + '%';
    $('st-dodge').textContent = Math.round(Engine.getDodgeRate(S) * 100) + '%';
    $('st-hp').textContent = S.hp;
    if ($('st-mo')) $('st-mo').textContent = (S.mp || 0) + '/' + (S.mpMax || 0);

    const cultTimes = S.cultTimes || 0, cultMax = S.cultMax || 1;
    $('btn-cult-label').textContent = (cultTimes >= cultMax) ? '修炼（本年已修）' : '修炼';
    $('btn-cult').classList.toggle('disabled', (cultTimes >= cultMax) || !Engine.canAction(S, Engine.cultCost(S)) || S.qi >= Engine.requireNeed(S));
    $('btn-social').classList.toggle('disabled', !Engine.canAction(S, 1));
    // 锻体：进入页面不耗行动点；未解锁时按钮仍可点（给引导提示）
    const duantiOn = !!(S.flags && S.flags.duanti);
    $('btn-arts').disabled = false;
    $('btn-arts').classList.remove('disabled');
    $('btn-arts-label').textContent = duantiOn ? '锻体' : '锻体（未解锁）';
    $('btn-explore').classList.toggle('disabled', !Engine.canAction(S, 2));
    $('btn-social-label').textContent = '游历';
    // 宗门入口在行动栏（btn-sect），游历入口在行动栏（btn-social）；底部栏不再放宗门/游历
    // 百艺：加入宗门后解锁，消耗0；未解锁时按钮仍可点（给引导提示，同锻体）
    const baiyiUnlocked = !!S.sect;
    $('btn-baiyi').disabled = false;
    $('btn-baiyi').classList.toggle('disabled', !baiyiUnlocked);
    $('btn-baiyi-label').textContent = baiyiUnlocked ? '百艺' : '百艺（未解锁）';

    const canB = Engine.canBreak(S);
    $('btn-break').disabled = S.dead || !canB;
    $('btn-break').classList.toggle('ready', canB && !S.dead);
    const info = canB ? Engine.breakInfo(S) : null;
    // 按钮文案：小境界此前只写「破境突破」、不显示概率，玩家无从判断成功率。
    //   2026-09-14：补上成功率，并在「连续失败 2 次」保底生效时提示「下次必成」。
    let breakLabel;
    if (!canB) breakLabel = '突破（修为未满）';
    else if (info.trib) breakLabel = '渡劫·' + info.trib + '劫';
    else breakLabel = '破境突破 ' + Math.round(info.base * 100) + '%';
    if (canB && info && !info.trib && (S.breakFails || 0) >= 2) breakLabel += ' · 下次必成';
    $('btn-break-label').textContent = breakLabel;
  }
  function bar(id, pct, color) {
    const el = $(id);
    el.style.width = pct + '%';
    el.style.background = color;
  }

  /* ---------------- 章节叙事状态机 ---------------- */
  let cs = null;
  let storyLines = [];
  let suspended = false;
  function showChapter(title, lines, opts) {
    return new Promise(function (resolve) {
      if (suspended) {
        resolve({ ok: false, abort: true, lines: [], win: false, fled: false, lost: false });
        return;
      }
      opts = opts || {};
      storyLines = [];
      const ov = $('chapter');
      $('chapter-title').textContent = title;
      $('chapter-sub').textContent = opts.subtitle || '';
      const box = $('chapter-body');
      box.innerHTML = '';
      $('chapter-choices').innerHTML = '';
      ov.style.display = 'flex';
      cs = { resolve: resolve, opts: opts, lines: lines.slice(), i: 0 };
      $('chapter-actions').style.display = 'block';
      $('chapter-actions').textContent = '继续';
      $('chapter-actions').onclick = chapterNext;
      chapterNext();
    });
  }
  function chapterNext() {
    if (!cs) return;
    if (cs.i < cs.lines.length) {
      appendLine(cs.lines[cs.i]);
      cs.i++;
      const hasChoices = cs.opts.choices && cs.opts.choices.length;
      $('chapter-actions').textContent = (cs.i >= cs.lines.length && hasChoices) ? '下一步' : '继续';
    } else if (cs.opts.choices && cs.opts.choices.length) {
      showChoices(cs.opts.choices);
    } else {
      chapterClose();
    }
  }
  function appendLine(t, cls) {
    const p = document.createElement('p');
    p.className = 'chap-line ' + (cls || '');
    p.textContent = t;
    $('chapter-body').appendChild(p);
    $('chapter-body').scrollTop = $('chapter-body').scrollHeight;
    if (cs && cs.opts && cs.opts.toLog) storyLines.push({ t: t, cls: (cls === 'chap-result' ? 'gold' : '') });
  }
  function chapterClose(result) {
    const ov = $('chapter');
    ov.style.display = 'none';
    if (cs) { const r = cs.resolve; cs = null; r(result); }
  }
  function chapterAppend(lines, pickResult) {
    return new Promise(function (resolve) {
      (lines || []).forEach(function (l) { appendLine(l, 'chap-result'); });
      $('chapter-choices').innerHTML = '';
      $('chapter-actions').style.display = 'block';
      $('chapter-actions').textContent = '继续';
      $('chapter-actions').onclick = function () {
        chapterClose(pickResult);
        resolve();
      };
    });
  }
  function showChoices(choices) {
    $('chapter-actions').style.display = 'none';
    const wrap = $('chapter-choices');
    wrap.innerHTML = '';
    choices.forEach(function (c) {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      // 检查属性判定
      let reqMet = true;
      let failMsg = '';
      if (c.req) {
        const attrNames = { stone: '灵石', ti: '体魄', shen: '神识', dao: '道心', wu: '悟性', dun: '遁速', ling: '灵力', minAtk: '攻击' };
        for (var attr in c.req) {
          if (c.req.hasOwnProperty(attr)) {
            if (attr === 'flags') continue;
            var val = attr === 'stone' ? S.stone : (S[attr] || 0);
            if (val < c.req[attr]) {
              reqMet = false;
              var label = attrNames[attr] || attr;
              failMsg += (failMsg ? '、' : '') + label + '需' + c.req[attr] + '（当前' + val + '）';
            }
          }
        }
      }
      if (!reqMet) {
        b.className = 'choice-btn disabled';
        b.textContent = c.t + '（' + failMsg + '不满足）';
        b.onclick = function () {
          if (c.failLines) {
            chapterAppend(c.failLines);
          }
        };
      } else {
        b.textContent = c.t;
        b.onclick = function () {
          if (cs && cs.opts && cs.opts.toLog) storyLines.push({ t: '→ ' + c.t.split('\n')[0], cls: 'choice' });
          choose(c).then(function (r) {
            if (c.next && (!c.next.winOnly || r.win)) {
              cs.opts.subtitle = c.next.subtitle || cs.opts.subtitle;
              appendLines(r.lines, 'chap-result');
              appendLines(c.next.lines, 'chap-result');
              showChoices(c.next.choices);
            } else {
              chapterAppend(r.lines, r);
            }
          });
        };
      }
      wrap.appendChild(b);
    });
  }
  function appendLines(lines, cls) {
    (lines || []).forEach(function (l) { appendLine(l, cls); });
  }
  function choose(c) {
    return new Promise(function (resolve) {
      if (c.fight) {
        openBattle(c.fight, { title: '遭遇战' }).then(function (r) {
          const lines = (c.lines || []).slice();
          const b = S.battle;
          if (r.win) {
            lines.push(c.resultWin || '你赢得了这场战斗。');
            if (b && b.gains.length) lines.push.apply(lines, b.gains);
          } else if (r.lost) {
            lines.push(c.resultLose || '你负伤败退，踉跄而逃。');
            if (b && b.hpLost) lines.push('此战你气血 -' + b.hpLost + '。');
            lines.push(Engine.loseLife(S, 1, 'explore'));
          } else {
            lines.push('你见势不妙，抽身而退。');
          }
          if (c.effect) { const g = Engine.applyOps(S, c.effect); g.forEach(function (x) { lines.push(x); }); }
          resolve({ pick: c, win: r.win, lines: lines });
        });
        return;
      }
      if (c.special === 'dujie_xinmo') {
        const s = Engine.xinmoSpec(S);
        openBattle(s, { title: '人劫 · 心魔一战' }).then(function (r) {
          const lines = (c.lines || []).slice();
          if (r.win) {
            lines.push(Engine.xinmoDone(S));
          } else {
            lines.push(c.resultLose || '你没能斩却心魔，气血翻涌而退。');
          }
          resolve({ pick: c, win: r.win, lines: lines });
        });
        return;
      }
      if (c.special === 'dujie_qiangdi') {
        const s = {
          name: '因果强敌 · 夺道之仇',
          line: '因果缠身的强敌破空而至，专挑你最虚弱的时候发难。他认得你——你何尝不认得他？',
          atk: Math.max(22, Math.round(S.atk * 1.12)),
          hp: Math.round(Math.max(150, S.hpMax * 0.62)),
          loot: {}, loseLoot: { hp: -0.3 }, bi: 0, noFlee: true
        };
        openBattle(s, { title: '人劫 · 强敌拦路' }).then(function (r) {
          const lines = (c.lines || []).slice();
          if (r.win) {
            if (!S.trib) S.trib = { target: '金丹', ren: true };
            S.trib.ren = true;
            Engine.saveState(S);
            lines.push('斩却因果，强敌授首——人劫已渡。');
          } else {
            lines.push(c.resultLose || '你重伤退走，人劫暂避锋芒。');
          }
          resolve({ pick: c, win: r.win, lines: lines });
        });
        return;
      }
      if (c.special === 'adv_explore') {
        if (c.mode === 'skip') { resolve({ pick: c, win: true, lines: ['你未作停留，径自离去。'] }); return; }
        const r = Engine.advExplore(S, c.mode);
        resolve({ pick: c, win: true, lines: r.ok ? r.lines : [r.msg] });
        return;
      }
      if (c.sectAct) {
        resolve({ pick: c, win: true, lines: ['你决定' + (c.sectAct === 'combat' ? '降妖除魔' : '聆听道法') + '。'] });
        return;
      }
      const gains = c.effect ? Engine.applyOps(S, c.effect) : [];
      const lines = (c.lines || []).slice();
      gains.forEach(function (g) { lines.push(g); });
      resolve({ pick: c, win: true, lines: lines });
    });
  }

  /* ---------------- 回合制战斗 v2（名框 UI） ---------------- */
  function openBattle(spec, opts) {
    return new Promise(function (resolve) {
      opts = opts || {};
      const b = Engine.combatStart(S, spec);
      const ov = $('battle');
      $('battle-title').textContent = opts.title || '遭遇战';
      $('battle-sub').textContent = spec.line || '';
      $('battle-log').innerHTML = '';
      $('b-me-name').textContent = '『' + S.name + '』';
      $('b-enemy-name').textContent = '『' + b.name + '』';
      setPortrait('b-me-portrait', 'b-me-img', 'me');
      setPortrait('b-enemy-portrait', 'b-enemy-img', b.portraitEnemy || 'foe');
      ov.style.display = 'flex';
      // BGM：秘境内的战斗沿用「仙魔浩劫」（探索与战斗同氛围曲），俗世战斗走 battle
      const inAdv = !!(S.adv && !S.adv.done && !S.adv.trial);
      if (typeof AudioManager !== 'undefined') {
        AudioManager.playBgm(inAdv ? 'xianmo' : 'battle');
      }
      renderBattle();
      function finish(r) {
        ov.style.display = 'none';
        const sb = $('b-spellbar'); if (sb) sb.style.display = 'none';
        // 退出战斗：秘境中回到仙魔浩劫，俗世回到游戏 BGM
        if (typeof AudioManager !== 'undefined') {
          AudioManager.playBgm((S.adv && !S.adv.done && !S.adv.trial) ? 'xianmo' : 'game');
        }
        // 战斗结束后恢复状态；血蓝不再在此回满（战前灵力 +75%、气血 +10%，见 combatStart）
        Engine.refreshStats(S);
        Engine.saveState(S);
        resolve(r);
      }
      function doAct(act, spellId) {
        const sb = $('b-spellbar'); if (sb) sb.style.display = 'none';
        // 播放动作音效
        if (typeof AudioManager !== 'undefined') {
          var actSfx = { atk: 'attack', spell: 'spell', guard: 'heal', flee: 'miss' };
          if (actSfx[act]) AudioManager.playSfx(actSfx[act]);
        }
        const r = Engine.combatAct(S, act, spellId);
        r.lines.forEach(function (l) { bl(l); });
        if (r.fx) r.fx.forEach(applyFx);
        renderBattle();
        if (r.done) finish({ win: r.win, fled: r.fled, lost: r.lost });
      }
      function bl(t) {
        const p = document.createElement('p');
        p.className = 'bl';
        p.textContent = t;
        $('battle-log').appendChild(p);
        $('battle-log').scrollTop = $('battle-log').scrollHeight;
      }
      $('b-atk').onclick = function () { doAct('atk'); };
      $('b-spell').onclick = function () {
        renderSpellbar();
        $('b-spellbar').style.display = 'flex';
      };
      $('b-guard').onclick = function () { doAct('guard'); };
      $('b-flee').onclick = function () { doAct('flee'); };
      $('b-order').onclick = function () { openSpellOrder(); };
      // 秘境模式下显示「服药」按钮（消耗携带丹药）
      const elixirBtn = $('b-elixir');
      if (opts.adventure && S.adv && S.adv.items && S.adv.items.length) {
        elixirBtn.style.display = '';
        elixirBtn.onclick = function () { openElixirMenu(); };
      } else {
        elixirBtn.style.display = 'none';
      }
      function renderSpellbar() {
        const bar = $('b-spellbar');
        bar.innerHTML = '';
        const list = S.battle.spellList || [];
        if (!list.length) {
          bar.innerHTML = '<span class="dim" style="padding:6px 14px">无法术可用</span>';
          return;
        }
        list.forEach(function (sp) {
          const b = document.createElement('button');
          b.className = 'btn-small';
          b.style.color = GRADE_COLOR[sp.grade];
          const cost = sp.cost || 0;
          b.textContent = sp.name + '（' + cost + '灵）';
          b.disabled = cost > S.mp;
          b.title = cost > S.mp ? '灵力不足' : '';
          b.onclick = function () { doAct('spell', sp.id); };
          bar.appendChild(b);
        });
      }
      function renderBattle() {
        const bb = S.battle;
        const ep = Math.max(0, Math.min(100, bb.hp / bb.hpMax * 100));
        $('b-enemy-bar').style.width = ep + '%';
        $('b-enemy-num').textContent = bb.hp + ' / ' + bb.hpMax;
        const mp = Math.max(0, Math.min(100, S.hp / S.hpMax * 100));
        $('b-me-bar').style.width = mp + '%';
        $('b-me-num').textContent = S.hp + ' / ' + S.hpMax;
        const meMp = Math.max(0, Math.min(100, (S.mpMax ? S.mp / S.mpMax * 100 : 0)));
        $('b-me-mp-bar').style.width = meMp + '%';
        $('b-me-mp-num').textContent = (S.mp || 0) + ' / ' + (S.mpMax || 0) + ' 灵';
        /* 2026-09-14：徽章数据源改为 Engine.battleFxList(s, b) —— 现算的 { me, foe }。
           旧版两行都读 bb.buffs（bb === S.battle）→ 敌我同源，且 s.battle.buffs 全仓库从未被写入，
           徽章因此恒为空；现在由「唯一真源」的派生函数供数。 */
        const fxl = Engine.battleFxList(S, bb);
        renderBuffs('b-enemy-buffs', fxl.foe);
        renderBuffs('b-me-buffs', fxl.me);
        const list = bb.spellList || [];
        $('b-spell').disabled = !list.length;
        $('b-spell').textContent = '法术' + (bb.spellName ? '·' + bb.spellName + (list.length > 1 ? '（' + list.length + '）' : '') : '(无)');
        $('b-flee').textContent = bb.noFlee ? '本战斗不可逃跑' : '逃跑（' + Math.round(bb.flee * 100) + '% · 遁速' + (S.dunSpeed || 1) + '）';
      if (bb.noFlee) { $('b-flee').disabled = true; $('b-flee').style.opacity = '0.5'; }
      }
      /* 战斗状态徽章：图标 + 名称（+ 层数/回合），增益金黄 / 减益暗红。
         数据项：{ icon, label, bad, tip }，来自 Engine.battleFxList（纯派生，不落盘）。 */
      function renderBuffs(elId, list) {
        const el = $(elId); if (!el) return;
        el.innerHTML = '';
        (list || []).forEach(function (x) {
          const s = document.createElement('span');
          s.className = 'buff' + (x.bad ? ' bad' : '');
          const ic = document.createElement('i'); ic.className = 'bf-ic'; ic.textContent = x.icon;
          const tx = document.createElement('b'); tx.className = 'bf-tx'; tx.textContent = x.label;
          s.appendChild(ic); s.appendChild(tx);
          s.title = x.tip || x.label;
          el.appendChild(s);
        });
      }
      function openElixirMenu() {
        const ov = $('modal'); const box = $('modal-body');
        ov.style.display = 'flex'; ov.onclick = null; box.innerHTML = '';
        const title = document.createElement('h3'); title.textContent = '服用丹药';
        box.appendChild(title);
        const items = (S.adv && S.adv.items) || [];
        if (!items.length) {
          const p = document.createElement('p'); p.className = 'dim'; p.textContent = '未携带可用丹药。';
          box.appendChild(p);
        }
        items.forEach(function (it) {
          const el = ELIXIRS[it.id];
          const row = document.createElement('div'); row.className = 'adv-prep-elixir';
          const name = document.createElement('span'); name.className = 'ae-name';
          name.textContent = (el ? el.name : it.id) + ' ×' + it.count;
          const btn = document.createElement('button'); btn.className = 'btn-main'; btn.textContent = '服用';
          btn.onclick = function () {
            const r = Engine.useAdvElixir(S, it.id);
            if (!r.ok) { log(r.msg, 'bad'); return; }
            r.lines.forEach(function (l) { log(l, 'good'); });
            ov.style.display = 'none';
            renderBattle();
          };
          row.appendChild(name); row.appendChild(btn);
          box.appendChild(row);
        });
        const close = document.createElement('button'); close.className = 'btn-main ghost'; close.textContent = '关闭';
        close.onclick = function () { ov.style.display = 'none'; };
        box.appendChild(close);
      }
    });
  }

  /* ---------------- 战斗立绘 / 飘字 / 特效 / 法术序 ---------------- */
  const PORTRAIT = {
    me: 'assets/img/portrait/me.png',
    foe: 'assets/img/portrait/foe.png',
    boss_huang: 'assets/img/portrait/boss_huang.png',
    boss_xuan: 'assets/img/portrait/boss_xuan.png',
    boss_di: 'assets/img/portrait/boss_di.png',
    boss_tian: 'assets/img/portrait/boss_tian.png',
    boss_xian: 'assets/img/portrait/boss_xian.png'
  };
  function setPortrait(portraitId, imgId, key) {
    const box = $(portraitId); const img = $(imgId);
    if (!box || !img) return;
    // 未在映射表中的立绘（如五劫劫主、渡劫劫身、算命老道）按命名规则回退
    const src = PORTRAIT[key] || ('assets/img/portrait/' + key + '.png');
    if (src) {
      img.onerror = function () { box.classList.remove('has-img'); img.onerror = null; };
      img.src = src; box.classList.add('has-img');
    } else {
      box.classList.remove('has-img');
    }
  }
  function applyFx(ev) {
    if (!ev) return;
    const targetId = (ev.side === 'me') ? 'b-me-portrait' : 'b-enemy-portrait';
    const box = $(targetId); if (!box) return;
    // 飘字
    floatNum(ev);
    // 立绘动画
    if (ev.kind === 'spell') {
      const cls = 'fx-' + (elToElem(ev.el) || 'fire');
      box.classList.remove('fx-spell', 'fx-fire', 'fx-ice', 'fx-thunder', 'fx-wood', 'fx-earth', 'fx-gold');
      void box.offsetWidth;
      box.classList.add('fx-spell', cls);
      setTimeout(function () { box.classList.remove('fx-spell', cls); }, 460);
    } else if (ev.kind === 'dmg' || ev.kind === 'crit') {
      box.classList.remove('fx-hit'); void box.offsetWidth; box.classList.add('fx-hit');
      setTimeout(function () { box.classList.remove('fx-hit'); }, 320);
    } else if (ev.kind === 'heal') {
      box.classList.remove('fx-guard'); void box.offsetWidth; box.classList.add('fx-guard');
      setTimeout(function () { box.classList.remove('fx-guard'); }, 320);
    }
  }
  function elToElem(el) {
    // 功法 grade → 五行/特效色
    const map = { huang: 'gold', xuan: 'wood', di: 'earth', tian: 'thunder', xian: 'ice' };
    return map[el] || 'fire';
  }
  function floatNum(ev) {
    const layer = $('b-fx'); if (!layer) return;
    const d = document.createElement('div');
    let cls = 'dmg', txt = '';
    if (ev.kind === 'crit') { cls = 'crit'; txt = '-' + ev.amount; }
    else if (ev.kind === 'dmg') { cls = 'dmg'; txt = '-' + ev.amount; }
    else if (ev.kind === 'heal') { cls = 'heal'; txt = '+' + ev.amount; }
    else if (ev.kind === 'mp') { cls = 'mp'; txt = '-' + ev.amount + '灵'; }
    else if (ev.kind === 'shield') { cls = 'shield'; txt = ev.amount; }
    d.className = 'float-dmg ' + cls;
    d.textContent = txt;
    const left = (ev.side === 'me') ? (12 + Math.random() * 18) : (70 + Math.random() * 18);
    d.style.left = left + '%';
    d.style.top = (24 + Math.random() * 16) + '%';
    layer.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 950);
  }
  function openSpellOrder() {
    const b = S.battle; if (!b) return;
    const list = b.spellList || [];
    if (!list.length) { log('你尚未习得任何法术，无法编排。', 'bad'); return; }
    const ov = $('modal'); const box = $('modal-body');
    ov.style.display = 'flex'; ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';
    const title = document.createElement('h3'); title.textContent = '编排法术序（驱动自动战斗）';
    box.appendChild(title);
    const tip = document.createElement('p'); tip.className = 'dim';
    tip.textContent = '自动战斗将按此顺序施法，法力不足时跳过该法术。上下移动调整优先级。';
    box.appendChild(tip);
    if (!b.spellOrder || !b.spellOrder.length) b.spellOrder = list.map(function (x) { return x.id; });
    const render = function () {
      box.querySelectorAll('.order-row').forEach(function (n) { n.remove(); });
      b.spellOrder.forEach(function (id, idx) {
        const sp = list.filter(function (x) { return x.id === id; })[0] || { id: id, name: id, cost: 0 };
        const row = document.createElement('div');
        row.className = 'order-row formula-row';
        const info = document.createElement('div');
        info.innerHTML = '<b>' + (idx + 1) + '. ' + esc(sp.name) + '</b> <span class="dim">(' + (sp.cost || 0) + '灵)</span>';
        const ops = document.createElement('div'); ops.style.cssText = 'display:flex;gap:6px;';
        const up = document.createElement('button'); up.className = 'btn-small'; up.textContent = '↑'; up.disabled = idx === 0;
        up.onclick = function () { if (idx > 0) { const t = b.spellOrder[idx - 1]; b.spellOrder[idx - 1] = id; b.spellOrder[idx] = t; render(); } };
        const down = document.createElement('button'); down.className = 'btn-small'; down.textContent = '↓'; down.disabled = idx === b.spellOrder.length - 1;
        down.onclick = function () { if (idx < b.spellOrder.length - 1) { const t = b.spellOrder[idx + 1]; b.spellOrder[idx + 1] = id; b.spellOrder[idx] = t; render(); } };
        ops.appendChild(up); ops.appendChild(down);
        row.appendChild(info); row.appendChild(ops);
        box.appendChild(row);
      });
    };
    render();
    const close = document.createElement('button'); close.className = 'btn-main'; close.style.marginTop = '10px'; close.textContent = '完成';
    close.onclick = function () { ov.style.display = 'none'; closeModal(); };
    box.appendChild(close);
  }

  /* ---------------- 肉鸽冒险（轻肉鸽探索） ---------------- */
  /* ---------------- 秘境背景映射（按秘境等级） ---------------- */
  const MAIN_BG_PATH = 'assets/img/bg/bg_main.png';
  const ADV_BG_MAP = { huang: 'bg_mijing_huang', xuan: 'bg_mijing_xuan', di: 'bg_mijing_di', tian: 'bg_mijing_tian', xian: 'bg_mijing_xian' };
  function advBgPath(grade) {
    const f = ADV_BG_MAP[grade];
    return f ? ('assets/img/bg/' + f + '.png') : '';
  }
  function applyAdvBackground(grade) {
    const url = advBgPath(grade);
    const ov = $('adv-screen');
    const chap = $('chapter');
    // 秘境层独立背景：覆盖整个 overlay，不再改写主界面 screen-game，
    // 从而避免与洞府等其他界面的背景“串味”。（bg_mijing_* 美术图若缺失，暗色渐变仍保证不透明不漏底）
    if (url) {
      ov.style.background = 'linear-gradient(180deg, rgba(10,8,16,.84), rgba(18,13,28,.90)), url(' + url + ')';
      ov.style.backgroundSize = 'cover';
      ov.style.backgroundPosition = 'center';
      chap.style.background = 'linear-gradient(180deg, rgba(10,8,16,.82), rgba(20,15,30,.90)), url(' + url + ')';
      chap.style.backgroundSize = 'cover';
      chap.style.backgroundPosition = 'center';
    } else {
      // 无对应美术图（如试炼路线）时，使用暗色渐变兜底，保证不透明不漏底
      ov.style.background = 'linear-gradient(180deg, rgba(10,8,16,.92), rgba(18,13,28,.96))';
      ov.style.backgroundSize = 'cover';
      ov.style.backgroundPosition = 'center';
      chap.style.background = 'linear-gradient(180deg, rgba(10,8,16,.90), rgba(20,15,30,.95))';
      chap.style.backgroundSize = 'cover';
      chap.style.backgroundPosition = 'center';
    }
  }
  function resetAdvBackground() {
    const ov = $('adv-screen');
    const chap = $('chapter');
    const game = $('screen-game');
    ov.style.background = '';
    ov.style.backgroundSize = '';
    ov.style.backgroundPosition = '';
    chap.style.background = '';
    chap.style.backgroundSize = '';
    chap.style.backgroundPosition = '';
    // 退出秘境后，主界面恢复默认背景（无论进入前是主页还是洞府）
    game.dataset.bg = MAIN_BG_PATH;
    game.style.backgroundImage = 'url(' + MAIN_BG_PATH + ')';
  }

  function actExplore() {
    // 所有玩家都显示秘境选择界面
    openAdvSelect();
  }

  /* ---------------- 秘境选择扩展页面 ---------------- */
  function openAdvSelect() {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';

    const bi = Engine.bigIdxOf(S);
    const advConfigs = [
      { key: 'huang', name: '匪徒营寨', grade: '黄', color: '#c9a86a', realmReq: 0, realmName: '炼气', desc: '炼气期秘境，匪徒盘踞之地。', drops: '黄级功法、黄级装备、黄级灵材' },
      { key: 'xuan', name: '大黑山', grade: '玄', color: '#6ab8c9', realmReq: 1, realmName: '筑基', desc: '筑基期秘境，妖兽横行之地。', drops: '玄级功法、玄级装备、玄级灵材' },
      { key: 'di', name: '洞天福地', grade: '地', color: '#a06ac9', realmReq: 2, realmName: '金丹', desc: '金丹期秘境，上古洞天遗迹。', drops: '地级功法、地级装备、地级灵材' },
      { key: 'tian', name: '魔道祖地', grade: '天', color: '#e05a7a', realmReq: 3, realmName: '元婴', desc: '元婴期秘境，魔道势力盘踞之地。', drops: '天级功法、天级装备、天级灵材' }
    ];
    // 遗世仙踪每10年出现一次
    if (Engine.isXianAdventureAvailable(S)) {
      advConfigs.push({ key: 'xian', name: '遗世仙踪', grade: '仙', color: '#9adcff', realmReq: 3, realmName: '元婴', desc: '每十年一现的仙人遗迹，内藏仙品宝物。', drops: '仙级装备、天级功法、天级灵材' });
    }

    const title = document.createElement('h3');
    title.textContent = '选择秘境';
    title.style.marginBottom = '8px';
    box.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'dim';
    desc.textContent = '不同秘境产出不同品级的宝物与灵材——灵材品级随秘境等级而定，与你的境界无关；境界高了也可回头进低级秘境，刷取低级灵材。秘境一年只能进入一次。';
    desc.style.marginBottom = '16px';
    box.appendChild(desc);

    advConfigs.forEach(function(adv) {
      const canEnter = Engine.advUnlocked(S, adv.key);
      // 未解锁时的双通道理由
      let lockTxt = '';
      if (!canEnter) {
        const prevName = ({ xuan: '匪徒营寨', di: '大黑山', tian: '洞天福地', xian: '魔道祖地' })[adv.key] || '';
        lockTxt = '<b style="color:#e05a7a;"> 需' + adv.realmName + '以上，或通关【' + prevName + '】</b>';
      }
      // 「剩余法宝 N」：本阶位还能产出几件（灵物豁免上限，永远单独计 1 件）
      let artLine = '';
      if (canEnter) {
        const ar = Engine.advArtRemain(S, adv.key);
        artLine = '<div class="adv-art-remain">'
          + (ar.total > 0
              ? '剩余法宝 ' + ar.total + '（灵物 ' + ar.spirit + ' · 法宝 ' + ar.normal + '）'
              : '本阶秘藏已尽数取出')
          + '</div>';
      }
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #2e2942;background:rgba(0,0,0,.2);padding:12px;margin-bottom:12px;border-radius:8px;' + (canEnter ? '' : 'opacity:0.5;');
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<b style="color:' + adv.color + ';font-size:16px;">' + adv.grade + '级秘境 · ' + adv.name + '</b>' +
        '<span style="color:' + adv.color + ';font-size:12px;border:1px solid ' + adv.color + ';padding:2px 6px;border-radius:4px;">' + adv.grade + '级</span></div>' +
        '<p style="font-size:13px;color:#8a8a9a;margin-bottom:8px;">' + adv.desc + (canEnter ? '' : lockTxt) + '</p>' +
        '<div style="font-size:12px;color:#6a6a7a;">产出：' + adv.drops + '</div>' +
        // 掉落率数值不展示（用户要求）：只留定性提示
        '<div style="font-size:11px;color:#8a8a9a;margin-top:2px;">（越深越容易出高品装备）</div>' +
        artLine;
      const btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
      const mkBtn = function (label, ap) {
        const b = document.createElement('button');
        b.className = 'btn-main';
        b.textContent = label;
        b.style.borderColor = adv.color;
        b.disabled = !canEnter;
        b.onclick = function () {
          ov.style.display = 'none';
          // 不再有「携带丹药」整备页：战斗丹药改由秘境内的荒野坊市购买，选完行动点直接进入。
          doStartAdv(adv.key, ap);
        };
        return b;
      };
      btnWrap.appendChild(mkBtn('入秘境（2行动）', 2));
      btnWrap.appendChild(mkBtn('深探（3行动）', 3));
      card.appendChild(btnWrap);
      box.appendChild(card);
    });


  }

  let advIntroText = '';
  function advIntro() {
    const a = S.adv;
    const grade = a ? a.grade : null;
    applyAdvBackground(grade);
    $('chapter').classList.add('explore-mode');
    $('screen-game').classList.add('explore-active');
    // 详细规则收进右上【说明】按钮，开场只留一句极简提示，不再刷大段文字
    advIntroText = (a.setting || '')
      + '\n\n你放轻脚步，走入其中。传闻深处有洞天秘藏——但活着出去，才算赢。'
      + '\n· 秘境共 ' + ((a.maxDepth || 0) + 1) + ' 层，每层 3 条岔路，任选一条深入。每步消耗 5 点秘境体力。'
      + '\n· 探索度满 100% 时，秘境之主会在图上现身（一道血色虚线自你脚下直贯顶层），此时可在任意深度直接决战。'
      + '\n· 体力耗尽后：点前方节点可用寿元「强行前行」（固定 1 年 / 步）；也可「折寿强搜」直接硬搜一处造化，代价按次数递增 1 → 2 → 4 → 8 → 16 年封顶。'
      + '\n· 战斗丹药不再需要提前携带——秘境中的「荒野坊市」节点可直接购买，买下即为随身，战斗与歇脚时都能服用（未用完的会随此行消散）。';
    showChapter('秘境 · 轻身而入', [
      (a.setting || ''),
      '详细规则与注意事项，请点开右上角「说明」查看。'
    ], { subtitle: '秘境体力 ' + a.stamina + ' / ' + a.staminaMax + ' · 秘境共 ' + (a.maxDepth + 1) + ' 层，探索度满 100% 秘境之主方现' }).then(renderAdvMap);
  }
  const LAYER_FLAVOR = [
    null,
    { t: '第 1 层 · 山径岔口', l: '青石小径在前方分出数条岔路，每一条都通向不同的际遇。' },
    { t: '第 2 层 · 幽暗石室', l: '湿润的石壁渗着寒气，几扇石门虚掩，门缝里透出微光。' },
    { t: '第 3 层 · 迷雾洞窟', l: '雾霭深处隐约传来低鸣，三条甬道没入黑暗，辨不清尽头。' },
    { t: '第 4 层 · 妖气古林', l: '古木参天，妖气盘踞。脚下的落叶之下，似乎有什么在蠕动。' },
    { t: '第 5 层 · 洞天入口', l: '钟乳垂落如林，灵光若隐若现——洞天秘藏，就在前方。' },
    { t: '第 6 层 · 洞天深处', l: '石台之上那道身影缓缓睁眼。这不是岔路，而是终局。' }
  ];
  function advLayer() { renderAdvMap(); }
  /* ---------------- 秘境网格长卷地图 ---------------- */
  // 行高 / 节点高 / 可见行数：连线只走「层与层之间的空隙」，故 JS 与 CSS 的节点高度必须一致。
  //   这三个数字是**同一份口径**：JS 定义数值并写入 CSS 变量，style.css 的 .adv-map 只读变量算视口高度。
  //   （2026-09 手机端专项：行高 88→70、节点高 56→46；视口从 flex 自适应改为固定 4 行。）
  const ADV_ROW_H = 70;            // 行间距（像素）
  const ADV_NODE_H = 46;           // 节点高度（须与 CSS .adv-canvas .adv-node 的 height 相同）
  const ADV_PAD_TOP = 14;          // 画布顶部留白
  const ADV_VISIBLE_ROWS = 4;      // 地图视口固定露出的道路行数（其余靠滚动）——「只有 4 行」是设计口径
  // 把地图几何写进根节点 CSS 变量（幂等；每次渲染地图前调一次即可）
  function syncAdvMetrics() {
    const root = (typeof document !== 'undefined') && document.documentElement;
    if (!root || !root.style || !root.style.setProperty) return;
    root.style.setProperty('--adv-row-h', ADV_ROW_H + 'px');
    root.style.setProperty('--adv-node-h', ADV_NODE_H + 'px');
    root.style.setProperty('--adv-visible-rows', String(ADV_VISIBLE_ROWS));
  }
  const ADV_COL_X = [25, 50, 75];  // 每行 3 个节点的横向位置（%）
  let advLastMapRef = null;        // 上次渲染的地图引用
  let advLastCol = null;           // 上次渲染的当前层：仅当层变化时才重新定位视口
  function renderAdvMap() {
    const a = S.adv;
    if (!a || a.done) return;
    syncAdvMetrics();   // 行高 / 节点高 / 可见行数 → 根节点 CSS 变量（.adv-map 视口高度依赖它）
    const ov = $('adv-screen');
    ov.style.display = 'flex';
    const cfg = ADVENTURE_CONFIG[a.grade];
    $('adv-title').textContent = a.trialTitle || ((cfg ? cfg.name : '秘境') + ' · 探幽');
    $('adv-sub').textContent = '第 ' + Math.max(1, a.depth) + ' / ' + ((a.map.normalCols || 0) + 1) + ' 层 · 体力决定能走多远（已耗 ' + (a.staminaMax - a.stamina) + '）';
    // —— HUD 血条：气血 / 灵力实时显示，进坊市前一眼看清该不该买丹药 ——
    function fillBar(barId, numId, pct, text, color) {
      const b = $(barId);
      if (b) { b.style.width = Math.max(0, Math.min(100, pct || 0)) + '%'; if (color) b.style.background = color; }
      const n = $(numId);
      if (n) n.textContent = text;
    }
    const hpPct = S.hpMax ? S.hp / S.hpMax * 100 : 0;
    const mpPct = S.mpMax ? (S.mp || 0) / S.mpMax * 100 : 0;
    fillBar('adv-hp-bar', 'adv-hp-num', hpPct, S.hp + ' / ' + S.hpMax, hpPct < 35 ? '#c94a6a' : '#e0604a');
    fillBar('adv-mp-bar', 'adv-mp-num', mpPct, (S.mp || 0) + ' / ' + (S.mpMax || 0), '#5a8fe0');
    fillBar('adv-stamina-bar', 'adv-stamina-num', a.stamina / a.staminaMax * 100, a.stamina + ' / ' + a.staminaMax, '#8a6bff');
    // 探索度：满 100% 方可直面秘境之主
    const exNow = a.trial ? 100 : Math.min(100, a.explore || 0);
    fillBar('adv-explore-bar', 'adv-explore-num', exNow / (a.exploreMax || 100) * 100, exNow + '%', exNow >= 100 ? '#4ec9a0' : '#8a6bff');
    const itemsEl = $('adv-items');
    itemsEl.innerHTML = '';
    if (a.items && a.items.length) {
      a.items.forEach(function (it) {
        const el = ELIXIRS[it.id];
        const c = document.createElement('span');
        c.className = 'adv-item-chip';
        c.textContent = '随身 · ' + (el ? el.name : it.id) + ' ×' + it.count;
        itemsEl.appendChild(c);
      });
    } else {
      itemsEl.innerHTML = '<span class="dim" style="font-size:12px">随身丹药：无（可在坊市补给）</span>';
    }
    // ——— 秘境地图：网格长卷（每行固定 3 个选项）+ 贴边短线 ———
    // · 每层 3 个节点横排三等分，行行对齐，不再忽多忽少。
    // · 连线只走「上下两层之间的空隙」：从源节点顶边连到目标节点底边，
    //   因此永远不会横穿选项块（旧版从节点中心连，线是直接压着方块过去的）。
    // · 视口仅在「当前层发生变化」时重新定位，避免每次刷新都滑动一次（虚影来源）。
    const map = a.map;
    const mapEl = $('adv-map');
    const sit = Engine.advSituation(S);
    const choices = sit.choices;
    const sel = {};
    choices.forEach(function (c) { sel[c.id] = c; });
    const canBossNow = sit.canBoss;
    const NC = map.normalCols || 0;
    const CANVAS_H = ADV_PAD_TOP + (NC + 1) * ADV_ROW_H + ADV_NODE_H + 16;
    const curNode = map.byId[a.nodeId];
    const curCol = curNode ? curNode.col : 0;
    const bossY = yOf(NC);
    function yOf(col) { return ADV_PAD_TOP + (NC - col) * ADV_ROW_H; }
    function xOfNode(n) {
      if (!n || n.id === 'boss' || n.id === 'entry') return 50;
      return (ADV_COL_X[n.idx] != null) ? ADV_COL_X[n.idx] : 50;
    }
    function gapCurve(x1, y1, x2, y2) {
      const mid = (y1 + y2) / 2;
      return 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + mid + ' ' + x2 + ' ' + mid + ' ' + x2 + ' ' + y2;
    }
    // 连线：收集全图所有边（含入口边与 Boss 边）
    const links = [];
    [[map.entry]].concat(map.cols).forEach(function (col) {
      col.forEach(function (n) {
        (n.next || []).forEach(function (to) { links.push([n, map.byId[to] || map.boss]); });
      });
    });
    const paths = [];
    links.forEach(function (pr) {
      const from = pr[0], to = pr[1];
      const active = (from.id === a.nodeId) && !!sel[to.id];
      const walked = !!from.visited && !!to.visited;
      const cls = 'adv-link' + (active ? ' active' : (walked ? ' walked' : ''));
      paths.push('<path class="' + cls + '" d="'
        + gapCurve(xOfNode(from), yOf(from.col), xOfNode(to), yOf(to.col) + ADV_NODE_H) + '"/>');
    });
    // 探索度达标：一道血色虚线自脚下直贯秘境之主——「气息再无遮掩」（唯一允许跨行的线）
    if (canBossNow && !a.trial && a.nodeId !== 'boss' && curNode) {
      const ry = yOf(curNode.col), by = bossY + ADV_NODE_H;
      const c = Math.max(24, Math.abs(ry - by) * 0.4);
      paths.push('<path class="adv-link reveal" d="M' + xOfNode(curNode) + ' ' + ry
        + ' C' + xOfNode(curNode) + ' ' + (ry - c) + ' 50 ' + (by + c) + ' 50 ' + by + '"/>');
    }
    function nodeHtml(id) {
      const isBoss = (id === 'boss');
      const n = isBoss ? null : map.byId[id];
      const meta = n ? (ADV_NODES[n.type] || { name: n.type, icon: '?' }) : null;
      const isCur = (a.nodeId === id);
      const isSel = !!sel[id];
      const locked = isBoss && !canBossNow && !a.trial;
      let cls = 'adv-node ' + (isBoss ? 'boss' : n.type);
      if (n && n.visited) cls += ' visited';
      if (isCur) cls += ' current';
      if (isSel) cls += ' selectable';
      if (locked) cls += ' locked';
      const icon = isBoss ? '☠' : meta.icon;
      const name = isBoss ? (a.trial ? '大敌当前' : '洞天决战') : (n.type === 'entry' ? '入口' : meta.name);
      const badge = isSel ? '<div class="n-badge">可往</div>' : (locked ? '<div class="n-badge lock">未启</div>' : '');
      const px = xOfNode(isBoss ? null : n);
      const py = isBoss ? bossY : yOf(n.col);
      return '<div class="' + cls + '" data-nid="' + id + '" style="left:' + px + '%;top:' + py + 'px">'
        + '<div class="n-icon">' + icon + '</div><div class="n-name">' + name + '</div>' + badge + '</div>';
    }
    const nodesHtml = [[map.entry]].concat(map.cols).map(function (col) {
      return col.map(function (n) { return nodeHtml(n.id); }).join('');
    }).join('') + nodeHtml('boss');
    mapEl.innerHTML = '<div class="adv-canvas" style="height:' + CANVAS_H + 'px">'
      + '<svg class="adv-links" viewBox="0 0 100 ' + CANVAS_H + '" preserveAspectRatio="none">' + paths.join('') + '</svg>'
      + nodesHtml + '</div>';
    Array.prototype.forEach.call(mapEl.querySelectorAll('.adv-node.selectable'), function (el) {
      el.onclick = function () { onAdvNode(el.getAttribute('data-nid')); };
    });
    // 视口对准当前层（略偏下方，留出上方的路）——仅当换了地图或换了层时才动，杜绝「每次刷新都滑一下」
    if (advLastMapRef !== map || advLastCol !== curCol) {
      advLastMapRef = map;
      advLastCol = curCol;
      const target = Math.max(0, yOf(curCol) - mapEl.clientHeight * 0.55);
      mapEl.scrollTop = Math.min(target, Math.max(0, CANVAS_H - mapEl.clientHeight));
    }
    const hint = $('adv-hint');
    const exHint = Math.min(100, a.explore || 0);
    if (a.trial) {
      hint.textContent = '沿劫境之路择路而行（每步耗 ' + (map.stepCost || 5) + ' 体力）· 途遇敌人、精英、险地与祭坛，尽头为大敌。';
    } else if (!Engine.advCanMove(S) && a.nodeId !== 'boss') {
      hint.textContent = '体力已尽——点前方节点可用寿元「强行前行」（固定 1 年 / 步，不随次数递增；折寿搜刮走坊市旁的「强搜」）。';
    } else if (canBossNow && a.nodeId !== 'boss') {
      hint.textContent = '探索度已满 ' + exHint + '%——秘境之主已在图上现身（血色虚线），可继续搜刮，也可即刻直取决战。';
    } else {
      hint.textContent = '选择高亮节点继续深入（每步耗 ' + (map.stepCost || 5) + ' 体力）· 探索度 ' + exHint + '%，满 100% 秘境之主方才现身。';
    }
    // P0 兜底：地图保证每个节点至少 1 条出边，理论上不会「无可选节点」。
    // 若真发生（如地图异常），弹「撤退 / 折寿强搜 / 直面秘境之主」，杜绝卡死。
    // P0 兜底：地图保证每个节点至少 2 条出边，理论上不会「无可选节点」。
    // 但最后一层的唯一出口是 Boss——探索度未满时 Boss 是锁定态、点不动，
    // 此时必须按「前路已尽」处理（折寿强搜 / 撤退），否则玩家会直接卡死。
    if (sit.deadEnd) {
      if (a.trial) { openBossGate({ id: 'boss', type: 'final' }); return; }
      const opts = [];
      if (canBossNow) opts.push({ t: '直面秘境之主', special: 'adv_to_boss' });
      else opts.push({ t: forceChoiceText(false), special: 'adv_force_explore' });
      opts.push({ t: '【强行撤离】\n失去部分收获（灵石草铁 -50%）', special: 'adv_retreat' });
      showChapter('前路已尽', [
        '你面前再无可行之岔路，唯有迷雾深处那道压迫之意愈发明晰。',
        canBossNow ? '你对这片秘境已探明十成，秘境之主的气息再无遮掩。' : '若探索度未满，可折寿硬搜一处造化；或强行撤离（失五成收获）。'
      ], { choices: opts }).then(function (r) {
        const pick = r.pick || {};
        if (pick.special === 'adv_retreat') { advFinish('强行撤离'); return; }
        if (pick.special === 'adv_to_boss') { openBossGate({ id: 'boss', type: 'final' }); return; }
        forceExploreEntry(function () { return offerForceExploreLoop(true); },
          function () { return advFinish('强行撤离'); });
      });
      return;
    }
  }
  function onAdvNode(id) {
    const r = Engine.advMove(S, id);
    if (!r.ok) {
      // 体力不足：提供「以寿元强行前行」（1 年 1 步）
      const cost = (S.adv && S.adv.map && S.adv.map.stepCost) || 5;
      if (S.adv && S.adv.stamina < cost) { offerForceMove(id); return; }
      log(r.msg || '此路不通', 'bad'); return;
    }
    refresh();
    handleMovedNode(r.node);
  }
  // 体力耗尽时：以寿元强行前行（固定 1 年 1 步 —— 与「折寿强搜」是两套机制）
  function offerForceMove(id) {
    return showChapter('体力不支', [
      '你气力将尽，双腿如灌了铅。前方仍有路，只是再迈一步，怕是要拿寿元去换。',
      '（这是「强行前行」：固定 -1 年寿元换一步，不随次数递增。折寿搜刮是另一套——代价按次数 1→2→4→8→16 递增）'
    ], {
      choices: [
        { t: '以寿元强行前行\n固定 -1 年寿元，前进一步', special: 'adv_force_move', target: id },
        { t: '【强行撤离】\n失去部分收获（灵石草铁 -50%）', special: 'adv_retreat' }
      ]
    }).then(function (r) {
      const pick = r.pick || {};
      if (pick.special === 'adv_force_move') {
        const fr = Engine.advForceMove(S, pick.target);
        if (!fr.ok) { log(fr.msg, 'bad'); renderAdvMap(); return; }
        (fr.lines || []).forEach(function (l) { log(l, 'bad'); });
        refresh();
        handleMovedNode(fr.node);
        return;
      }
      advFinish('强行撤离');
    });
  }
  function handleMovedNode(node) {
    if (node.type === 'final') { openBossGate(node); return; }
    advResolveNode(node);
  }
  // 折寿强搜按钮文案：把「第几次 / 本次代价 / 下次代价」全部摊开写清，
  // 避免玩家误以为折寿搜刮永远是 -1 年（-1 年那条是「强行前行」，另一套机制）。
  function forceChoiceText(isContinue, suffix) {
    const r = Engine.forceExploreRisk(S);
    const n = (S.adv && S.adv.forceN) || 0;
    const LADDER = Engine.FORCE_LIFE_COSTS || [r.cost];
    const nextCost = LADDER[Math.min(n + 1, LADDER.length - 1)];
    const head = isContinue ? '继续以寿元强行探查' : '以寿元强行探查';
    if (r.fatal) {
      return head + '\n⚠ 以命易物，尽入轮回：本次为第 ' + (n + 1) + ' 次，需 ' + r.cost + ' 年，余寿仅 ' + r.left + ' 年（此搜后寿元耗尽，此世即终）';
    }
    return head + '\n第 ' + (n + 1) + ' 次 · -' + r.cost + ' 年寿元（下次 -' + nextCost + '；代价序列 1/2/4/8/16 封顶）' + (suffix || '（不计探索度）');
  }
  // 折寿强搜入口：这一搜若会耗尽寿元，先让玩家确认。
  // 「以命易物，尽入轮回」是一种主动的结档方式——寿元即刻枯竭，此世就此终结。
  // onGo：确认以命相搏后继续；onStop：收手时的分支（撤退 / 继续前行）。
  function forceExploreEntry(onGo, onStop) {
    const r = Engine.forceExploreRisk(S);
    if (!r.fatal) return onGo();
    return showChapter('寿元将尽', [
      '再搜这一处，需折寿 ' + r.cost + ' 年；而你此生只余 ' + r.left + ' 年阳寿。',
      '搜完这处，寿元即刻枯竭——你这一世，便到此为止了。',
      '以命易物，尽入轮回：这是一种结档方式，身死道消，所得尽数归入轮回。'
    ], {
      choices: [
        { t: '以命相搏\n换最后一处造化，此世即终', special: 'force_fatal_go' },
        { t: '收手\n保住已有收获，不折此寿', special: 'force_fatal_stop' }
      ]
    }).then(function (res) {
      if ((res.pick || {}).special === 'force_fatal_go') return onGo();
      return onStop ? onStop() : undefined;
    });
  }
  // 执行一次折寿强搜；若因此寿元耗尽，直接送死亡结算（返回 null，调用方不得再渲染）
  function runForceExplore() {
    const fr = Engine.advForceExplore(S);
    const got = fr.ok ? (fr.lines || []) : [fr.msg];
    got.forEach(function (l) { log(l, 'bad'); });
    refresh();
    if (fr.ok && fr.fatal) { endLifeFlow(); return null; }
    return { fr: fr, lines: got };
  }
  // 折寿强搜循环：强搜一次后弹出结果与后续选择，避免直接回到原页面造成「无限循环」
  function offerForceExploreLoop(deadEnd, bossNode, carryLines) {
    const R = runForceExplore();
    if (!R) return; // 寿元已尽 → 已进入死亡结算
    const fr = R.fr;
    const fl = (carryLines || []).concat(R.lines);
    if (!deadEnd && bossNode && Engine.advCanFightBoss(S)) {
      showChapter('秘境 · 水落石出', fl.concat([
        '探索度已达 100%，秘境之主的气息再无遮掩。'
      ]), {
        choices: [
          { t: '直面秘境之主', special: 'adv_fight_boss' },
          { t: '【强行撤离】\n失去部分收获（灵石草铁 -50%）', special: 'adv_retreat' }
        ]
      }).then(function (r2) {
        const p = r2.pick || {};
        if (p.special === 'adv_fight_boss') fightBoss(bossNode);
        else advFinish('强行撤离');
      });
      return;
    }
    const choices = [
      { t: forceChoiceText(true), special: 'adv_force_explore' },
      { t: '【强行撤离】\n失去部分收获（灵石草铁 -50%）', special: 'adv_retreat' }
    ];
    const title = deadEnd ? '前路已尽 · 强搜所得' : '秘境 · 未明之地';
    const lines = deadEnd
      ? fl.concat(['此处已无去路，你只能选择继续硬搜，或带着收获撤退。'])
      : fl.concat(['探索度仍未满，你可以继续强搜，或就此退去。']);
    showChapter(title, lines, { choices: choices }).then(function (r) {
      const p = r.pick || {};
      if (p.special === 'adv_retreat') { advFinish('强行撤离'); return; }
      forceExploreEntry(function () { return offerForceExploreLoop(deadEnd, bossNode); },
        function () { return advFinish('强行撤离'); });
    });
  }
  // 探索度未满 100% 不得直面秘境之主：可折寿强行探查，或撤退
  function openBossGate(bossNode, extra) {
    const a = S.adv;
    const pct = Math.min(100, a.explore || 0);
    if (Engine.advCanFightBoss(S)) { fightBoss(bossNode); return; }
    const lines = (extra || []).concat([
      '秘境深处，一股压迫感如潮水般涌来——秘境之主，就在那里。',
      '可你对这片秘境只探明了 ' + pct + '%，冒然闯入，只怕连它的真容都看不真切。',
      '（探索度须满 100% 方可直面秘境之主。探索度只由亲身经历的节点累积，折寿强搜换不来）'
    ]);
    const choices = [
      { t: forceChoiceText(false, '（产出加倍，不计探索度）'), special: 'adv_force_explore' },
      { t: '【强行撤离】\n失去部分收获（灵石草铁 -50%）', special: 'adv_retreat' }
    ];
    return showChapter('秘境 · 未明之地', lines, { choices: choices }).then(function (r) {
      const pick = r.pick || {};
      if (pick.special === 'adv_retreat') { advFinish('强行撤离'); return; }
      forceExploreEntry(
        function () { return offerForceExploreLoop(false, bossNode, (r.lines || [])); },
        function () { return advFinish('强行撤离'); }
      );
    });
  }
  function fightBoss(bossNode) {
    const a = S.adv;
    if (a && a.trial) { fightTrialBoss(bossNode); return; }
    const res = Engine.advResolve(S, bossNode);
    S.advDmgThisRun = false; // 重置本场无伤标记
    openBattle(res.spec, { title: '决战 · ' + res.spec.name, adventure: true }).then(function (br) {
      if (br.win) {
        S.adv.cleared = true;
        const advKey = S.advType || 'huang';
        Engine.markAdvClear(S, advKey, { bi: res.spec.bi, mechanic: res.spec.mechanic });
        const nxt = Engine.advNextOf(advKey);
        let extra = Engine.advClearReward(S);
        if (nxt) {
          const ncfg = { xuan: ['大黑山', '筑基'], di: ['洞天福地', '金丹'], tian: ['魔道祖地', '元婴'], xian: ['遗世仙踪', '元婴'] }[nxt];
          if (ncfg) extra = extra.concat(['—— 你已通关' + ({ huang: '黄', xuan: '玄', di: '地', tian: '天' })[advKey] + '级秘境，【' + ncfg[0] + '】已向有缘人敞开（可无视境界直入）。']);
        }
        showBossChoice(extra);
      } else if (br.lost) { advFinish('战败', { boss: true }); }
      else { advFinish('强行撤离'); }
    });
  }
  // —— 试炼路线启动（入宗考验 / 死劫 复用秘境横版地图 UI）——
  function startTrialFlow(kind, opts) {
    opts = opts || {};
    const res = Engine.startTrial(S, kind, opts);
    if (!res || !res.ok) { log((res && res.msg) || '无法开始试炼', 'bad'); return; }
    $('modal').style.display = 'none'; // 关闭可能打开的面板（如入宗考验）
    if (typeof AudioManager !== 'undefined') AudioManager.playSfx('explore');
    const a = S.adv;
    applyAdvBackground(a.grade);
    $('chapter').classList.add('explore-mode');
    $('screen-game').classList.add('explore-active');
    // 劫境引导文案按类型区分（死劫 / 渡劫 / 轮回之外）
    let guide = ['沿试炼之路择路而行——途中所遇，唯有【敌人】、【精英】与【静室】三类。', '一路向前，尽头是大敌当前。胜之，方见分晓。'];
    if (a.trial === 'death') {
      const ev = DEATH_EVENTS[a.deathIdx || 0] || {};
      guide = ['这里是【' + ((ev.trial && ev.trial.name) || '劫境') + '】。',
        '沿路只有【敌人】、【精英】、【险地凶机】与【静室】——岔路越多，离那位劫主越近。',
        '尽头站着' + ((ev.boss && ev.boss.name) || '劫主') + '。胜之，方见分晓。'];
    } else if (a.trial === 'trib') {
      guide = ['劫境之中：或遇【险地凶机】，或见【古老祭坛】，或得一间【静室】调息。',
        '每一处都是一次取舍——带着多少气血站到劫身面前，全看你自己。',
        '尽头即是' + (a.trialBoss ? a.trialBoss.name : '劫身') + '。'];
    } else if (a.trial === 'hidden') {
      guide = ['这里没有上下之分，也没有回头路。',
        '【险地凶机】与【古老祭坛】交替出现，【静室】是你唯一能喘口气的地方。',
        '王座就在前面。它一直都在前面。'];
    }
    showChapter(a.trialTitle || '试炼', [(a.setting || '')].concat(guide), { subtitle: '试炼体力 ' + a.stamina + ' / ' + a.staminaMax }).then(renderAdvMap);
  }
  // —— 试炼 BOSS 战（入宗考验 / 死劫 共用的决战结算）——
  function fightTrialBoss(bossNode) {
    const a = S.adv;
    const kind = a.trial;
    const spec = a.trialBoss || (function () { const r = Engine.advResolve(S, bossNode); return r.spec; })();
    openBattle(spec, { title: '决战 · ' + spec.name, adventure: true }).then(function (br) {
      $('adv-screen').style.display = 'none';
      Engine.advEnd(S, br.win ? 'done' : 'lost');
      resetAdvBackground();
      $('chapter').classList.remove('explore-mode');
      $('screen-game').classList.remove('explore-active');
      if (typeof AudioManager !== 'undefined') AudioManager.playBgm('game');
      if (br.win) {
        if (kind === 'sect') {
          const r = Engine.applySectTrial(S, true);
          Engine.saveState(S);
          showChapter('入宗试炼 · 功成', [
            '演武教头收矛大笑：「好小子，有种！入我门墙，当得起。」',
            '三关观人——武骨（悟性 ' + Math.round(Engine.effAttr(S, 'wu')) + '）、道心（道心 ' + Math.round(Engine.effAttr(S, 'dao')) + '）、实战（胜），评定身份：【' + r.rank + '】' + (r.gift ? ('，功业 +' + r.gift) : '') + '。'
          ]).then(function () {
            log('入宗试炼通过，身份定为【' + r.rank + '】', 'good');
            refresh(); renderSect();
          });
        } else if (kind === 'hidden') {
          // 隐藏线通关：打破轮回（轮回点 ×1.5）
          S.hiddenWin = true;
          S.endReason = '打破轮回';
          Engine.saveState(S);
          const hb = HIDDEN_BOSS;
          showChapter('打破轮回', [(hb.resultWin || '你击败了轮回之外的唯一之敌。')].concat(br.gains || []), { subtitle: '轮回之外 · 终' }).then(function () {
            logSection('【打破轮回】');
            log('你击败了魔祖仙帝。轮回之外，再无人等你。（轮回点 ×1.5）', 'gold');
            endLifeFlow();
          });
        } else if (kind === 'trib') {
          // 渡劫 · 单段劫身已破 → 交回 dujieTrialFlow 继续下一段
          tribStageWin();
        } else {
          S.deathPassed = (S.deathPassed || 0) + 1;
          const dIdx = a.deathIdx || 0;
          Engine.omenOnDeathPassed(S, dIdx);
          Engine.saveState(S);
          const dev = a.trialDev || {};
          const crack = (DEATH_EVENTS[dIdx] && DEATH_EVENTS[dIdx].omenCrack) ? DEATH_EVENTS[dIdx].omenCrack : '';
          const wl = [(dev.resultWin || '你从死劫中挣出一条生路。')];
          if (crack) wl.push('—— ' + crack);
          const oline = Engine.omenText(S);
          if (oline) wl.push('玉上的字变了：「' + oline + '」');
          showChapter('劫后余生', wl.concat(br.gains || [])).then(function () {
            logSection('【' + (dev.title || '死劫') + '】');
            log('你从死劫中挣出一条生路。', 'good');
            if (oline) log('【灾劫玉符】' + oline, 'omen');
            afterAction();
          });
        }
      } else {
        if (kind === 'sect') {
          Engine.applySectTrial(S, false);
          Engine.saveState(S);
          showChapter('入宗试炼 · 受挫', [
            '演武教头摇了摇头：「火候未到，回去再练练吧。」',
            '实战不敌，此次试炼未过（身份维持【' + (S.sectRank || '杂役') + '】），来年可再来。'
          ]).then(function () {
            log('入宗试炼实战未过，维持【' + (S.sectRank || '杂役') + '】', 'bad');
            refresh(); renderSect();
          });
        } else if (kind === 'hidden') {
          S.dead = true;
          S.endReason = '轮回之外陨落';
          Engine.saveState(S);
          const hb = HIDDEN_BOSS;
          showChapter('轮回之外', [(hb.resultLose || '王座下多了一具骨头。')], { subtitle: '你没能走出去' }).then(function () {
            endLifeFlow();
          });
        } else if (kind === 'trib') {
          tribStageLose();
        } else {
          S.dead = true;
          S.endReason = (a.trialDev ? a.trialDev.title : '死劫') + '陨落';
          Engine.saveState(S);
          endLifeFlow();
        }
      }
    });
  }
  /* ---------------- 渡劫 · 劫境序列（按突破档位映射） ----------------
   * 练气→筑基：无劫；筑基→金丹：心魔劫境；金丹→元婴：心魔 + 天劫；元婴→飞升：心魔 + 仙界守卫 + 飞升天劫。
   * 每一段都是一张短劫境地图（险地 / 静室 / 祭坛），尽头是一位「劫身」。
   */
  let tribCtx = null;   // { trib, stages:[], idx:0, before:{} }
  function dujieTrialFlow(trib, before) {
    const cfg = TRIB_TRIALS[trib];
    if (!cfg) { executeBreakthroughFallback(trib, before); return; }
    tribCtx = { trib: trib, stages: cfg.stages.slice(), idx: 0, before: before || statSheet(S) };
    logSection('【' + trib + '之劫 · 劫境】');
    showChapter(cfg.title + ' · 开启', cfg.openLines || ['劫云四合，你的道心开始发烫。'], { subtitle: trib + '之劫' }).then(function () {
      runTribStage();
    });
  }
  function runTribStage() {
    if (!tribCtx) return;
    const stage = tribCtx.stages[tribCtx.idx];
    if (!stage) { tribAllWin(); return; }
    const card = TRIB_BOSSES[stage] || {};
    const lines = [];
    if (card.line) lines.push(card.line);
    if (card.taunt && card.taunt.length) lines.push(card.taunt[Math.floor(Math.random() * card.taunt.length)]);
    showChapter((card.title || '劫境') + ' · ' + (card.name || ''), lines, {
      subtitle: tribCtx.trib + '之劫 · 第 ' + (tribCtx.idx + 1) + ' / ' + tribCtx.stages.length + ' 重'
    }).then(function () {
      startTrialFlow('trib', { trib: tribCtx.trib, stage: stage, title: (card.title || '劫境') });
    });
  }
  function tribStageWin() {
    if (!tribCtx) return;
    tribCtx.idx++;
    if (tribCtx.idx >= tribCtx.stages.length) { tribAllWin(); return; }
    showChapter('一重已过', ['这一段劫境散去了。可天还没亮——还有下一重。'], { subtitle: tribCtx.trib + '之劫' }).then(runTribStage);
  }
  function tribStageLose() {
    const ctx = tribCtx; tribCtx = null;
    const trib = ctx ? ctx.trib : (S.trib && S.trib.target) || '渡劫';
    const res = Engine.dujieFail(S, trib);
    if (res.died) {
      showChapter('渡劫 · 陨落', [
        (TRIBULATION_TEXTS[trib] || {}).resultLose || '天劫之下，没有人是无辜的。',
        '你无力回天——'
      ], { subtitle: trib + '之劫 · 身死道消' }).then(function () {
        logSection('【' + trib + '劫·陨落】');
        log('渡劫失败，身死道消。', 'bad');
        endLifeFlow();
      });
      return;
    }
    showChapter('渡劫 · 败落', [
      (TRIBULATION_TEXTS[trib] || {}).resultLose || '天劫之下，没有人是无辜的。',
      res.line || ''
    ], { subtitle: trib + '之劫 · 道基受创' }).then(function () {
      logSection('【' + trib + '劫·败】');
      log(res.line || '渡劫失败。', 'bad');
      afterAction();
    });
  }
  function tribAllWin() {
    const ctx = tribCtx; tribCtx = null;
    const before = (ctx && ctx.before) || statSheet(S);
    const trib = ctx ? ctx.trib : (S.trib && S.trib.target);
    const res = Engine.dujieWin(S);
    const resLines = [];
    if (res.ok) {
      resLines.push((TRIBULATION_TEXTS[trib] || {}).resultWin || '雷散云消，你跨入了全新的境界。');
      if (res.tech) resLines.push('大道玄音入耳，你心领神会，习得新功法【《' + TECHNIQUES[res.tech].name + '》·' + TECHNIQUES[res.tech].grade + '阶】。');
    } else {
      resLines.push('雷散云消，你终究还是跨不进去。');
    }
    showChapter('渡劫 · 结算', resLines.concat(['—— —— —— ——', '渡劫之战，毕其功于一役。']), { subtitle: res.ok ? '劫尽功成' : '功亏一篑' }).then(function () {
      const settle = diffLines(before, S);
      return showChapter('渡劫 · 结算明细', settle, { subtitle: '当前实力一览' }).then(function () {
        logSection('【' + trib + '劫】');
        resLines.forEach(function (l) { log(l, res.ok ? 'gold' : 'bad'); });
        settle.forEach(function (l) { log(l, res.ok ? 'good' : 'dim'); });
        if (res.ok && S.realm === '筑基' && !S.sect) {
          sectJoinFlow().then(function () { afterAction(); });
        } else {
          afterAction();
        }
      });
    });
  }
  // 兜底：未配置劫境的档位沿用旧的概率突破
  function executeBreakthroughFallback(trib, before) {
    const r = Engine.normalBreakthrough(S, null);
    const resLines = [];
    if (r.ok && r.win) resLines.push((TRIBULATION_TEXTS[r.trib] || {}).resultWin || '你跨入了全新的境界。');
    else { resLines.push((TRIBULATION_TEXTS[r.trib] || {}).resultLose || '你没能跨过去。'); resLines.push(r.line || ''); }
    showChapter('突破 · 结算', resLines, { subtitle: r.ok && r.win ? '破关成功' : '未能破关' }).then(function () {
      const settle = diffLines(before || statSheet(S), S);
      logSection('【' + (r.trib || '破境') + '】');
      resLines.forEach(function (l) { log(l, r.ok && r.win ? 'gold' : 'bad'); });
      settle.forEach(function (l) { log(l, 'good'); });
      if (r.died) { endLifeFlow(); return; }
      afterAction();
    });
  }
  // 试炼中途退出处理
  function handleTrialAbort(a) {
    $('adv-screen').style.display = 'none';
    Engine.advEnd(S, 'done');
    resetAdvBackground();
    $('chapter').classList.remove('explore-mode');
    $('screen-game').classList.remove('explore-active');
    if (typeof AudioManager !== 'undefined') AudioManager.playBgm('game');
    if (a.trial === 'sect') {
      log('你中途退出了入宗试炼。', 'bad');
      refresh(); renderSect();
    } else if (a.trial === 'trib') {
      tribStageLose();   // 中途退出劫境 = 渡劫失败
    } else if (a.trial === 'hidden') {
      S.dead = true; // 轮回之外不可退
      S.endReason = '轮回之外陨落';
      Engine.saveState(S);
      endLifeFlow();
    } else {
      S.dead = true; // 死劫不可退：视为陨落
      S.endReason = (a.trialDev ? a.trialDev.title : '死劫') + '陨落';
      Engine.saveState(S);
      endLifeFlow();
    }
  }
  function advAdvanceToMap() {
    Engine.advAdvance(S);
    const a = S.adv;
    if (a.done) return;
    // 体力耗尽不再强制结束：玩家可选择以 1 年寿元强行前行，或自行撤退
    renderAdvMap();
  }
  function openRestScreen() {
    const ov = $('modal'); const box = $('modal-body');
    ov.style.display = 'flex'; ov.onclick = null;
    box.innerHTML = '';
    const title = document.createElement('h3'); title.textContent = '静室歇脚';
    box.appendChild(title);
    const tip = document.createElement('p'); tip.className = 'dim';
    tip.textContent = '当前：气血 ' + S.hp + '/' + S.hpMax + '，灵力 ' + (S.mp || 0) + '/' + (S.mpMax || 0) + '，秘境体力 ' + (S.adv ? S.adv.stamina : 0) + '。可回复气血/灵力 60%（双修各 30%），或恢复秘境体力 10。';
    box.appendChild(tip);
    const mk = function (label, kind) {
      const btn = document.createElement('button'); btn.className = 'btn-main'; btn.textContent = label;
      btn.onclick = function () {
        Engine.advRest(S, kind).forEach(function (l) { log(l, 'good'); });
        ov.style.display = 'none';
        refresh();
        advAdvanceToMap();
      };
      box.appendChild(btn);
    };
    mk('打坐（回血 60%）', 'hp');
    mk('调息（回蓝 60%）', 'mp');
    mk('双修（气血灵力各 30%）', 'both');
    mk('养精蓄锐（秘境体力 +10）', 'stamina');
    // 「不再停留」已删除（用户 2026-09-14 要求）：它的作用与右上【关闭】完全等价——
    //   advMove 早已把玩家移到该节点，advAdvanceToMap 只是刷回地图，留两个出口纯属冗余。
    // 原位置改为静室专属的【撤离（保住收获）】：静室是秘境中唯一可完整收货的撤退点
    //   （其余中途撤离一律走右下角【强行撤离（失五成收获）】）。
    const retreat = document.createElement('button'); retreat.className = 'btn-main ghost adv-retreat'; retreat.textContent = '撤离（保住收获）';
    retreat.onclick = function () { ov.style.display = 'none'; advFinish('撤离'); };
    box.appendChild(retreat);
  }
  function showBossChoice(extra) {
    showChapter('秘境通关', ['洞天秘藏尽数显现！'].concat(extra || []), { subtitle: '通关秘藏' }).then(function () {
      const opts = Engine.advBossBonus(S);
      const ov = $('modal'); const box = $('modal-body');
      ov.style.display = 'flex'; ov.onclick = null; box.innerHTML = '';
      const title = document.createElement('h3');
      // 二选一 / 唯一之选：法宝取尽时选项二留空，标题与提示随之收口
      title.textContent = opts.length > 1 ? '秘藏二选一' : '秘藏 · 唯一之选';
      box.appendChild(title);
      const tip = document.createElement('p'); tip.className = 'dim';
      tip.textContent = opts.length > 1 ? '择其一纳入囊中。' : '此间只余这一件。';
      box.appendChild(tip);
      opts.forEach(function (ch) {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid #2e2942;padding:10px;margin-bottom:10px;border-radius:8px;';
        card.innerHTML = '<b style="color:var(--gold)">' + ch.label + '</b><br><span class="dim">' + ch.desc + '</span>';
        const btn = document.createElement('button'); btn.className = 'btn-main'; btn.textContent = '选取';
        btn.onclick = function () {
          ch.apply().forEach(function (l) { log(l, 'good'); if (S.adv) S.adv.gains.push(l); });
          ov.style.display = 'none';
          advFinish('通关');
        };
        card.appendChild(btn);
        box.appendChild(card);
      });
    });
  }
  function doStartAdv(advKey, ap) {
    const res = Engine.startAdventure(S, advKey, { ap: ap, items: [] });
    if (res.ok === false) {
      log(res.msg || '行动点不足', 'bad');
      // 在弹窗内直接显示失败原因，避免用户以为点击无反应
      const box = $('modal-body');
      var hint = box.querySelector('.adv-enter-hint');
      if (!hint) {
        hint = document.createElement('p');
        hint.className = 'adv-enter-hint';
        hint.style.cssText = 'color:#e05a7a;text-align:center;margin-top:10px;font-size:13px;';
        box.appendChild(hint);
      }
      hint.textContent = res.msg || '行动点不足';
      afterAction();
      return;
    }
    // 清除可能存在的失败提示
    const mb = $('modal-body');
    const oldHint = mb ? mb.querySelector('.adv-enter-hint') : null;
    if (oldHint) oldHint.remove();
    $('modal').style.display = 'none';
    if (typeof AudioManager !== 'undefined') {
      // 秘境氛围曲「仙魔浩劫」：探索、事件、战斗全程沿用同一首，出秘境才回主界面 BGM
      AudioManager.playBgm('xianmo');
      AudioManager.playSfx('explore');
    }
    advIntro();
  }
  function generateTreasureReward() {
    if (!S.materials) S.materials = {};
    const bi = Engine.bigIdxOf(S);
    const d = S.adv ? S.adv.depth || 1 : 1;
    const g = [];
    const roll = Math.random();
    if (roll < 0.33) {
      const equip = Engine.randomEquip(bi, d);
      if (equip) { g.push.apply(g, Engine.grantEquipChecked(S, equip)); }
      else { S.stone += 50; g.push('灵石 +50'); }
    } else if (roll < 0.66) {
      const techPool = TECH_DROPS_MAP[S.advType || 'huang'] || TECH_DROPS_MAP.huang;
      const t = techPool[Math.floor(Math.random() * techPool.length)];
      g.push.apply(g, Engine.applyOps(S, { tech: t }));
    } else {
      const matType = Math.random() < 0.5 ? 'herb' : 'iron';
      const matKey = matType === 'herb' ?
        ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian'][bi] || 'herb_huang' :
        ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'][bi] || 'iron_huang';
      const amount = 5 + d * 3;
      S.materials[matKey] = (S.materials[matKey] || 0) + amount;
      g.push(MATERIALS[matKey].name + ' +' + amount);
    }
    return g;
  }
  // 秘地探查：可反复探查（消耗体力换取造化与探索度），直至体力耗尽或主动离开
  function openExplore(extra) {
    const a = S.adv;
    const pct = Math.min(100, a.explore || 0);
    const choices = [];
    if (a.stamina >= 8) choices.push({ t: '深入探查（消耗 8 体力 · 造化更丰 · 探索度 +10%）', special: 'adv_explore', mode: 'deep' });
    if (a.stamina >= 3) choices.push({ t: '粗略搜刮（消耗 3 体力 · 探索度 +5%）', special: 'adv_explore', mode: 'shallow' });
    choices.push({ t: '不作停留，继续前行', special: 'adv_explore', mode: 'skip' });
    const head = [
      '一处灵气氤氲的秘地出现在眼前，石壁苔痕斑驳，深处似有造化流转。',
      '当前探索度 ' + pct + '% · 秘境体力 ' + a.stamina + '。'
    ];
    return showChapter('秘地探查', (extra || []).concat(head), { choices: choices }).then(function (r) {
      const mode = (r.pick || {}).mode;
      const lines = (r.lines || []).slice();
      if (mode === 'skip' || !mode) return lines;
      if (a.stamina >= 3) return openExplore(lines);
      // 体力已不足以再探查：可折寿硬搜一处（只出造化，不计探索度），或就此作罢
      return showChapter('心力已尽', lines.concat(['你心力已尽，再也探不动了。']), {
        choices: [
          { t: forceChoiceText(false, '（产出加倍，不计探索度）'), special: 'adv_force_explore' },
          { t: '就此作罢，继续前行', special: 'adv_force_explore_stop' }
        ]
      }).then(function (r2) {
        const pick = r2.pick || {};
        const base = r2.lines || lines;
        if (pick.special !== 'adv_force_explore') return base.concat(['你不再留恋，转身继续前行。']);
        return forceExploreEntry(function () {
          const R = runForceExplore();
          if (!R) return undefined;                 // 寿元已尽 → 已进入死亡结算
          return openExplore(base.concat(R.lines));
        }, function () { return openExplore(base.concat(['你不再留恋，转身继续前行。'])); });
      });
    });
  }
  function advResolveNode(node) {
    const a = S.adv;
    if (!a || a.done || a.status !== 'running') return;
    const res = Engine.advResolve(S, node);
    // 保留原始节点类型用于显示
    res.originalType = node.type;
    if (res.type === 'battle') {
      openBattle(res.spec, { title: res.title, adventure: true }).then(function (r) {
        const b = S.battle;
        if (r.win) {
          // 精英战斗胜利后给予宝箱奖励
          if (res.eliteReward) {
            const eliteLoot = generateTreasureReward();
            showChapter('精英击败', ['你收剑而立，从精英身上搜出宝物——'].concat(b ? b.gains : []).concat(eliteLoot)).then(advAdvanceToMap);
          } else {
            showChapter('胜', ['你收剑而立，清点战利品。'].concat(b ? b.gains : [])).then(advAdvanceToMap);
          }
        } else if (r.lost) {
          advFinish('战败');
        } else {
          showChapter('脱身', ['你及时抽身，绕开了这一处凶险。']).then(advAdvanceToMap);
        }
      });
      return;
    }
    if (res.type === 'rest') { openRestScreen(); return; }
    if (res.type === 'explore') { openExplore().then(advAdvanceToMap); return; }
    if (res.type === 'shop') { advShop(res.stock); return; }
    if (res.type === 'remnant_soul') {
      advResolveRemnantSoul(res.spell1, res.spell2);
      return;
    }
    if (res.type === 'event') {
      if (res.ev) {
        runEvent(res.ev).then(advAdvanceToMap);
      } else {
        showChapter('雾散', ['迷雾散去，空无一物。你摇了摇头，继续前行。']).then(advAdvanceToMap);
      }
      return;
    }
    if (res.type === 'final') {
      openBattle(res.spec, { title: '决战 · ' + res.spec.name, adventure: true }).then(function (r) {
        if (r.win) {
          S.adv.cleared = true;
          const extra = Engine.advClearReward(S);
          showBossChoice(extra);
        } else if (r.lost) {
          advFinish('战败', { boss: true });
        } else {
          showChapter('秘境撤退', ['你终究没敢直面' + res.spec.name + '，转身退了出来。']).then(function () { advFinish('强行撤离'); });
        }
      });
      return;
    }
    // 根据原始节点类型设置标题
    var chapterTitle = '前行';
    var chapterSubtitle = '';
    if (res.originalType === 'treasure') {
      chapterTitle = '宝箱';
      chapterSubtitle = '宝箱开启';
    } else if (res.originalType === 'herb') {
      chapterTitle = '灵草';
    } else if (res.originalType === 'iron') {
      chapterTitle = '灵矿';
    }
    showChapter(chapterTitle, res.lines, { subtitle: chapterSubtitle }).then(advAdvanceToMap);
  }

  /* ---- 残魂传承事件 ---- */
  function advResolveRemnantSoul(spell1, spell2) {
    var t1 = TECHNIQUES[spell1];
    var t2 = TECHNIQUES[spell2];
    var type1 = t1.cls === 'xinfa' ? '心法' : t1.cls === 'dunshu' ? '遁术' : '法术';
    var type2 = t2.cls === 'xinfa' ? '心法' : t2.cls === 'dunshu' ? '遁术' : '法术';
    var desc1 = t1.cls === 'xinfa' ? '修炼 +' + Math.round((t1.mult - 1) * 100) + '%' : t1.cls === 'dunshu' ? '逃脱 ' + Math.round((t1.flee || 0) * 100) + '%' : '威力 ' + t1.dmg + '× 攻击';
    var desc2 = t2.cls === 'xinfa' ? '修炼 +' + Math.round((t2.mult - 1) * 100) + '%' : t2.cls === 'dunshu' ? '逃脱 ' + Math.round((t2.flee || 0) * 100) + '%' : '威力 ' + t2.dmg + '× 攻击';
    
    // 残魂考验 = 精英战难度：走统一敌人生成器（固定基线 × 深度 × 精英系数 1.4），
    //   不再用旧版「玩家 atk×0.8 / 玩家 hpmax×0.6」的挂玩家缩放（那套会随玩家变强而水涨船高）。
    const remnantSpec = (function () {
      const sp = Engine.enemyGen(S, 'elite', (S.adv && S.adv.depth) || 1);
      sp.name = '残魂考验';
      sp.line = '残魂的虚影缓缓起身，周身灵光骤然一凝——';
      sp.loot = {};   // 奖励是两个功法本身，不再叠掉落
      sp.mechanic = null;
      return sp;
    })();
    showChapter('残魂传承', [
      '迷雾深处，一道虚幻的身影盘坐于石台之上。',
      '那是一位昔日修士的残魂，周身灵光黯淡，却仍保持着生前的威严。',
      '他缓缓睁开眼，望向你：',
      '"后来者……吾乃此间洞府旧主，坐化于此已有千年。"',
      '"吾生前精研法术，今将毕生所学留待有缘。"',
      '"你可择一功法修炼，若欲多学，便需通过吾之考验。"'
    ], {
      subtitle: '残魂传承',
      choices: [
        { t: '修炼【' + t1.name + '】\n[' + type1 + '] ' + t1.desc + '\n' + desc1, lines: ['你盘膝而坐，静心感悟残魂传授的法诀。', '一道灵光自残魂指尖飞出，没入你的眉心——', '【' + t1.name + '】已习得！'], effect: { tech: spell1 } },
        { t: '修炼【' + t2.name + '】\n[' + type2 + '] ' + t2.desc + '\n' + desc2, lines: ['你盘膝而坐，静心感悟残魂传授的法诀。', '一道灵光自残魂指尖飞出，没入你的眉心——', '【' + t2.name + '】已习得！'], effect: { tech: spell2 } },
        { t: '两种都想学\n挑战残魂的考验', fight: remnantSpec, resultWin: '残魂散去前微微点头："你有这个资格。"', resultLose: '你未能通过考验，残魂叹道："缘分未到。"' },
        { t: '婉言谢绝\n继续前行', lines: ['你拱手一礼："前辈好意，晚辈心领。"', '残魂叹道："也罢，缘法不可强求。"', '身影渐渐消散于迷雾之中。'] }
      ]
    }).then(function (r) {
      if (r && r.pick && r.pick.fight) {
        if (r.win) {
          // 战斗胜利，获得两个功法
          if (S.techs.indexOf(spell1) < 0) S.techs.push(spell1);
          if (S.techs.indexOf(spell2) < 0) S.techs.push(spell2);
          Engine.ensureTechEquip(S);
          Engine.saveState(S);
          showChapter('残魂考验', ['残魂散去前微微点头："你有这个资格。"', '两道灵光同时飞入你的眉心——', '【' + t1.name + '】和【' + t2.name + '】已习得！'], { subtitle: '考验通过' }).then(advAdvanceToMap);
        } else {
          // 战斗失败，只获得第一个功法
          if (S.techs.indexOf(spell1) < 0) S.techs.push(spell1);
          Engine.ensureTechEquip(S);
          Engine.saveState(S);
          showChapter('残魂考验', ['你未能通过考验，残魂叹道："缘分未到。"', '但先前传授的功法已然铭记于心。', '【' + t1.name + '】已习得！'], { subtitle: '考验未通过' }).then(advAdvanceToMap);
        }
      } else {
        advAdvanceToMap();
      }
    });
  }

  function advShop(stock) {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = null;  // 本次坊市由"转身离开"退出，避免误触遮罩关闭卡死
    const prevClose = $('modal-close').onclick;
    box.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = '荒野坊市';
    box.appendChild(title);
    const tip = document.createElement('p');
    tip.className = 'dim';
    tip.textContent = '灵石可用：' + S.stone;
    box.appendChild(tip);
    const rows = [];
    const syncRows = function () {
      tip.textContent = '灵石可用：' + S.stone;
      rows.forEach(function (x) {
        const btn = x.btn;
        if (x.si.sold) { btn.disabled = true; btn.textContent = '已售'; return; }
        if (x.si.owned) { btn.disabled = true; btn.textContent = '已拥有'; return; }
        btn.disabled = S.stone < x.si.price;
        btn.textContent = S.stone >= x.si.price ? '购买' : '灵石不足';
      });
    };
    const closeShop = function () {
      ov.style.display = 'none';
      $('modal-close').onclick = prevClose;
      advAdvanceToMap();
    };
    stock.forEach(function (si) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      const info = document.createElement('div');
      info.innerHTML = '<b>' + esc(si.name) + '</b><br><span class="dim">' + si.price + ' 灵石</span>';
      const btn = document.createElement('button');
      btn.textContent = si.owned ? '已拥有' : (S.stone >= si.price ? '购买' : '灵石不足');
      btn.disabled = si.owned || S.stone < si.price;
      btn.onclick = function () {
        if (si.sold) return;
        const r = Engine.buyStock(S, si);
        if (!r.ok) { log(r.msg, 'bad'); return; }
        r.lines.forEach(function (l) { log(l, 'good'); });
        if (S.adv) S.adv.gains.push.apply(S.adv.gains, r.gains || r.lines);
        syncRows();
        refresh();
      };
      row.appendChild(info);
      row.appendChild(btn);
      box.appendChild(row);
      rows.push({ si: si, btn: btn });
    });
    const leave = document.createElement('button');
    leave.className = 'btn-main';
    leave.textContent = '转身离开（继续前行）';
    leave.onclick = closeShop;
    box.appendChild(leave);
    $('modal-close').onclick = closeShop;
  }
  function advAdvance() {
    const a = S.adv;
    if (!a || a.done || a.status !== 'running') return;
    Engine.advAdvance(S);
    refresh();
    if (S.adv.done || S.adv.status !== 'running') return;
    advLayer();
  }
  function advFinal() {
    const a = S.adv;
    showChapter('洞天 · 终局', [
      '穿过重重幽暗，你终于站在了秘境最深处。',
      '那一道身影端坐于石台之上，缓缓睁开了眼。',
      '它看着你，像看一件终于等到的祭品。'
    ], { subtitle: '最终之战 · ' + (a.depth + 1) + ' 层深处' }).then(function () {
      const spec = Engine.enemyGen(S, 'final', Math.min(a.depth + 1, 7));
      advResolveNode({ type: 'final' });
    });
  }
  function advFinish(why, opts) {
    const a = S.adv;
    if (a && a.trial) { handleTrialAbort(a); return; }
    $('adv-screen').style.display = 'none';
    // 战败 → lost（劫后余生扣减）；强行撤离 → forced（失五成收获）；其余（通关 / 静室撤离）→ done（完整收货）
    const whyEngine = (why === '战败') ? 'lost' : (why === '强行撤离') ? 'forced' : 'done';
    Engine.advEnd(S, whyEngine);
    // 还原主界面背景与秘境层样式
    resetAdvBackground();
    $('chapter').classList.remove('explore-mode');
    $('screen-game').classList.remove('explore-active');
    // 恢复游戏BGM
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playBgm('game');
      AudioManager.playSfx(why === '战败' ? 'bad' : 'good');
    }
    const lines = [];
    if (why === '战败') {
      const boss = !!(opts && opts.boss);
      const years = boss ? 10 : 1;
      lines.push(boss ? '你被秘境之主轰碎护身法力，道基剧震，溃败而逃。' : '你重伤倒地，意识模糊前只想着一个念头——活着回去。');
      lines.push('你带着残存的气力，跌跌撞撞离开了秘境。');
      lines.push(Engine.loseLife(S, years, boss ? 'boss' : 'adv'));
    } else if (why === '通关') {
      lines.push('你走出秘境，身后轰然一响，洞天关闭。');
    } else if (why === '强行撤离') {
      lines.push('你强行抽身，仓促撤离秘境——半数收获散落途中。');
    } else if (why === '撤离') {
      lines.push('你于静室整束行装，安然撤离，所得尽数带回。');
    } else {
      lines.push('你转身离开，身后传来秘境幽幽的回响。');
    }
    lines.push('—— 本次收获 ——');
    lines.push.apply(lines, summarizeGains(a.gains));
    if (a.lostMsg) lines.push(a.lostMsg);
    $('chapter').classList.remove('explore-mode');
    $('screen-game').classList.remove('explore-active');
    showChapter('秘境 · 归途', lines).then(function () {
      log('【秘境探索】', 'evtitle');
      lines.forEach(function (g) { log(g, a.lostMsg && g === a.lostMsg ? 'bad' : 'good'); });
      afterAction();
    });
  }
  function summarizeGains(gains) {
    if (!gains || !gains.length) return ['一无所获'];
    const sum = { stone: 0, herb: 0, iron: 0, elixirs: {}, equips: [] };
    let kills = 0;
    const misc = [];
    gains.forEach(function (g) {
      let m;
      if ((m = g.match(/灵石 \+(\d+)/))) sum.stone += parseInt(m[1], 10);
      else if ((m = g.match(/灵草 \+(\d+)/))) sum.herb += parseInt(m[1], 10);
      else if ((m = g.match(/灵铁 \+(\d+)/))) sum.iron += parseInt(m[1], 10);
      else if ((m = g.match(/丹药【(.+?)】×(\d+)/))) sum.elixirs[m[1]] = (sum.elixirs[m[1]] || 0) + parseInt(m[2], 10);
      else if ((m = g.match(/装备【(.+?)】/))) sum.equips.push(m[1]);
      else if (g.indexOf('击破') >= 0) kills++;
      else if (g.indexOf('支出') < 0) misc.push(g);
    });
    const out = [];
    if (sum.stone) out.push('· 灵石 +' + sum.stone + '（合计）');
    if (sum.herb) out.push('· 灵草 +' + sum.herb + '（合计）');
    if (sum.iron) out.push('· 灵铁 +' + sum.iron + '（合计）');
    Object.keys(sum.elixirs).forEach(function (n) { out.push('· 丹药：' + n + '×' + sum.elixirs[n]); });
    sum.equips.forEach(function (n) { out.push('· 装备：' + n); });
    if (kills) out.push('· 击破妖兽 ×' + kills);
    misc.forEach(function (g) { out.push('· ' + g); });
    if (!out.length) out.push('一无所获');
    return out;
  }

  /* ---------------- 随机事件（全文入日志） ---------------- */
  function runEvent(ev) {
    if (!ev || typeof ev === 'string') {
      if (ev) log(ev);
      return Promise.resolve();
    }
    const gains = Engine.runEvent(S, ev);
    const lines = ev.lines.slice();
    // 有收益时播放音效
    if (gains.length > 0 && typeof AudioManager !== 'undefined') {
      var hasEquip = gains.some(function(g) { return g.indexOf('装备') >= 0; });
      var hasMoney = gains.some(function(g) { return g.indexOf('灵石') >= 0; });
      if (hasEquip) AudioManager.playSfx('item');
      else if (hasMoney) AudioManager.playSfx('money');
      else AudioManager.playSfx('good');
    }
    // ⚠ 带选项的事件一律走章节层，不能只看 ev.chapter。
    //   「山河探索」的 13 个事件里有 7 个是 chapter:false 但带 choices（且没有顶层 effect）：
    //   旧逻辑会跳过章节层 → 选项永不展示、choices[].effect 永不结算，
    //   玩家端表现为「文案和结果都不出现，且拿不到任何属性」。
    const hasChoices = !!(ev.choices && ev.choices.length);
    if (ev.chapter || hasChoices) {
      return showChapter(ev.title, lines, {
        choices: ev.choices,
        toLog: true,
        subtitle: ev.tag === 'shanhe' ? '山河 · 探幽' : (ev.tag === 'mijing' ? '秘境 · 一步一机缘' : ('—— ' + ev.tag + ' ——'))
      }).then(function () {
        log('【' + ev.title + '】', 'evtitle');
        storyLines.forEach(function (l) { log(l.t, l.cls); });
        afterAction();
      });
    }
    log('【' + ev.title + '】', 'evtitle');
    lines.forEach(function (l) { log(l); });
    gains.forEach(function (g) { log(g, 'good'); });
    afterAction();
    return Promise.resolve();
  }
  function afterAction() {
    refresh();
    liveAchCheck();
    if (S.adv && S.adv.status === 'running') return;
    if (S.dead || S.endReason || S.idx >= 15) { endLifeFlow(); return; }
    if (S.actionsLeft <= 0) {
      logSection('【第' + S.year + '年终】');
      log('岁月不等人。你收拾好这一年的际遇，窗前烛火将尽，新的一年静待开启。', 'dim');
      refresh();
    }
  }

  /* ---------------- 行动 ---------------- */
  function actCultivate() {
    const r = Engine.cultivate(S);
    if (typeof r === 'string') { 
      log(r); 
      // 修炼成功时播放音效
      if (r.indexOf('今年已修炼过') === -1 && r.indexOf('行动点不足') === -1 && r.indexOf('修为已满') === -1) {
        if (typeof AudioManager !== 'undefined') AudioManager.playSfx('good');
      }
      afterAction(); 
    }
  }
  function actExplore2() { actExplore(); }
  function actSocial() {
    const r = Engine.social(S);
    if (typeof r === 'string') { log(r); afterAction(); return; }
    if (r && r.multi) { openEventChoice(r.events); return; }
    runEvent(r);
  }
  function actTravel() {
    if (!Engine.canAction(S, 1)) { log('行动点不足，无法游历。'); return; }
    const res = Engine.travel(S);        // 游历独立池：三桩际遇择一，每年上限 5 次
    if (typeof res === 'string') { log(res); afterAction(); return; }
    if (res && res.multi) { openEventChoice(res.events); return; }
    if (res) { runEvent(res); return; }
    afterAction();
  }
  function openEventChoice(events) {
    // 择一而往的弹窗、随后的章节层与结算日志统一在主界面展示：
    //   游历页（#screen-travel）是静态地图、没有日志区，从那里触发时文案/结果会全部落在离屏的主日志里。
    //   与「游历 / 仙缘 / 探寻仙缘」入口保持一致（它们都先 showScreen('game') 再触发）。
    showScreen('game');
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    box.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = '游历 · 何去何从';
    title.style.marginBottom = '8px';
    box.appendChild(title);
    const desc = document.createElement('p');
    desc.className = 'dim';
    desc.textContent = '你游历四方，眼前浮现三桩际遇。择其一而往——其余擦肩而过。';
    desc.style.marginBottom = '16px';
    box.appendChild(desc);
    const tagName = '游历';
    events.forEach(function (ev) {
      const tag = tagName;
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #2e2942;background:rgba(0,0,0,.2);padding:12px;margin-bottom:12px;border-radius:8px;cursor:pointer;transition:border-color .15s;';
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
      const b = document.createElement('b'); b.style.fontSize = '16px'; b.textContent = ev.title;
      const span = document.createElement('span');
      span.style.cssText = 'font-size:12px;border:1px solid #6a6a7a;padding:2px 6px;border-radius:4px;color:#aaa;';
      span.textContent = tag;
      head.appendChild(b); head.appendChild(span);
      const p = document.createElement('p');
      p.style.cssText = 'font-size:13px;color:#8a8a9a;margin:0;';
      p.textContent = ev.desc || (ev.lines && ev.lines[0]) || '未知的际遇。';
      card.appendChild(head); card.appendChild(p);
      card.onmouseenter = function () { card.style.borderColor = '#6ab8c9'; };
      card.onmouseleave = function () { card.style.borderColor = '#2e2942'; };
      card.onclick = function () {
        ov.style.display = 'none';
        S.seen[ev.id] = 1;
        runEvent(ev);
      };
      box.appendChild(card);
    });
    // 已消耗行动点，必须择一而往；点击遮罩不关闭弹窗
    ov.onclick = function (e) { if (e.target === ov) { /* 必须择一，不关闭 */ } };
  }
  function actJiyuan() {
    const r = Engine.jiyuan(S);
    if (typeof r === 'string') { log(r); afterAction(); }
    else runEvent(r);
  }
  function actSect() {
    if (!S.sect) { log('你尚未加入宗门，无法参加宗门活动。'); return; }
    showChapter(SECTS[S.sect].name, ['宗门之内，诸事待举。今日你想做些什么？'], {
      subtitle: '宗门活动',
      choices: [
        { t: '降妖除魔\n下山斩妖，护宗安民', sectAct: 'combat' },
        { t: '道庭讲法\n聆听长老论道，或亲讲大道', sectAct: 'lecture' },
        { t: '同门交游\n与师兄弟切磋论道、剑峰习剑', sectAct: 'social' }
      ]
    }).then(function (r) {
      if (!r || !r.pick) return;
      if (r.pick.sectAct === 'combat') {
        const res = Engine.sectCombat(S);
        if (typeof res === 'string') { log(res); afterAction(); return; }
        runEvent(res);
      } else if (r.pick.sectAct === 'lecture') {
        const res = Engine.sectLecture(S);
        if (typeof res === 'string') { log(res); afterAction(); return; }
        runEvent(res);
      } else if (r.pick.sectAct === 'social') {
        const res = Engine.sectSocial(S);
        if (typeof res === 'string') { log(res); afterAction(); return; }
        runEvent(res);
      }
    });
  }
  function actAlchemy() { openModal('alchemy'); }
  function actForge() { openModal('forge'); }
  function actBreak() { breakthroughFlow(); }
  function actArts() {
    if (!S || S.dead) return;
    if (!(S.flags && S.flags.duanti)) {
      showChapter('锻体 · 未解之法', [
        '你尚未习得《锻体诀》，无从锻体。',
        '传闻城隍庙前那位蜷在墙角的老乞丐，便是一身炼体门道的传人——先去结识他，自有传承。'
      ], { subtitle: '未解之法', choices: [{ t: '且修前行，静待机缘' }] });
      return;
    }
    renderDuantiPage();
  }
  /* ---------------- 锻体页（《锻体诀》习得后开放；进入不耗行动点） ---------------- */
  function renderDuantiPage() {
    showScreen('duanti');
    const body = $('duanti-body');
    body.innerHTML = '';
    const info = Engine.duantiInfo(S);
    const st = STAGES[S.idx] || { realm: S.realm, sub: '' };

    const head = document.createElement('h4');
    head.textContent = '《锻体诀》 · ' + st.realm + (st.sub ? ' · ' + st.sub : '');
    body.appendChild(head);

    const note = document.createElement('p');
    note.className = 'dim';
    note.textContent = '进入锻体不耗行动点。每一大境界，每种淬炼至多 ' + info.max +
      ' 次，突破大境界后重置。当前行动点：' + S.actionsLeft;
    body.appendChild(note);

    const list = document.createElement('div');
    info.types.forEach(function (tp) {
      const used = info.counts[tp.key] || 0;
      const left = info.max - used;
      const maxed = left <= 0;
      const rowEl = document.createElement('div');
      rowEl.className = 'formula-row';
      rowEl.innerHTML = '<div><b>[' + tp.verb + ']</b><br><span class="dim">' +
        tp.cost + ' 行动点 → ' + tp.name + ' +0.5　|　本境界已淬 ' + used + '/' + info.max +
        (maxed ? '（已至极限）' : '') + '</span></div><button>' + (maxed ? '已至极限' : '淬炼') + '</button>';
      const btn = rowEl.querySelector('button');
      btn.disabled = maxed || !Engine.canAction(S, tp.cost);
      btn.onclick = function () {
        const r = Engine.doDuanti(S, tp.key);
        log(r.msg, r.ok ? 'good' : 'bad');
        renderDuantiPage();
        refresh();
      };
      list.appendChild(rowEl);
    });
    body.appendChild(list);
    refresh();
  }

  /* ---------------- 突破 / 渡劫（人劫 · 天劫） ---------------- */
  function statSheet(s) {
    const st = STAGES[s.idx] || { realm: '仙', sub: '', color: '#e8c15a', sym: 'Ⅵ', bigRealm: 4 };
    return { realm: st.realm, sub: st.sub, lifeMax: s.lifeMax, hpMax: s.hpMax, atk: s.atk, ap: Engine.actionPoints(s), broken: s.broken };
  }
  function diffLines(from, s) {
    const st = STAGES[s.idx];
    const f = [];
    const toRealm = st ? (st.realm + ' · ' + st.sub) : '仙 · 飞升';
    if (!st || !(from.realm === st.realm && from.sub === st.sub)) f.push('境界：' + from.realm + ' · ' + from.sub + ' → ' + toRealm);
    else f.push('境界：' + st.realm + ' · ' + st.sub + '（未变）');
    if (s.lifeMax !== from.lifeMax) f.push('寿元上限：' + from.lifeMax + ' → ' + s.lifeMax + ' 岁');
    if (s.hpMax !== from.hpMax) f.push('气血上限：' + from.hpMax + ' → ' + s.hpMax);
    if (s.atk !== from.atk) f.push('攻击：' + from.atk + ' → ' + s.atk);
    const apNow = Engine.actionPoints(s);
    if (apNow !== from.ap) f.push('行动点：' + from.ap + ' → ' + apNow + '（突破不耗行动点）');
    if (s.broken !== from.broken) f.push('生涯突破：' + from.broken + ' → ' + s.broken + ' 次');
    if (s.qi === 0) f.push('修为：全部化作瓶颈之下厚积的底蕴');
    return f;
  }
  /* ---------------- 战斗（渡劫专用 · 必败/必胜节点封装） ---------------- */
  function breachBattleFlow(lines, spec, title, subtitle, onWin, onLose) {
    return showChapter(title, lines, { subtitle: subtitle }).then(function () {
      return openBattle(spec, { title: title }).then(function (r) {
        if (r.win) return onWin(r);
        return onLose(r);
      });
    });
  }
  function dujieFlow(trib) {
    if (!S.trib) S.trib = { target: trib, ren: false };
    if (!S.trib.ren) {
      return showChapter('渡劫 · 人劫', [
        '天地感应已至，冥冥中你与那道大境界之间，横着一场劫数。',
        '人劫在心——你心里压着的旧事，此刻都会翻涌上来。',
        '要么斩却执念，直面心魔；要么强压心绪，硬撼因果之敌。'
      ], { subtitle: '金丹之劫 · 第一重 · 心魔/强敌', choices: [
        { t: '入定直面心魔（战中战心魔）', special: 'dujie_xinmo' },
        { t: '以杀止念，挑战强敌（战中战强敌）', special: 'dujie_qiangdi' }
      ] }).then(function () {
        return dujieFlow(trib);
      });
    }
    const spec = Engine.tianjieSpec(S, trib);
    return breachBattleFlow([
      '人劫已渡，天劫方至。劫云四合，雷光灌顶而下——',
      spec.line
    ], spec, '渡劫 · 天劫', trib + '之劫 · 第二重 · 对战天劫化身', function (r) {
      const res = Engine.dujieWin(S);
      const resLines = [];
      if (res.ok) {
        resLines.push((TRIBULATION_TEXTS[trib] || {}).resultWin || '雷散云消，你跨入了全新的境界。');
        if (res.tech) resLines.push('大道玄音入耳，你心领神会，习得新功法【《' + TECHNIQUES[res.tech].name + '》·' + TECHNIQUES[res.tech].grade + '阶】。');
      } else {
        resLines.push('雷散云消，你终究还是跨不进去。');
      }
      return showChapter('渡劫 · 结算', resLines.concat([
        '—— —— —— ——',
        '渡劫之战，毕其功于一役。'
      ]), { subtitle: res.ok ? '劫尽功成' : '功亏一篑' }).then(function () {
        logSection('【' + trib + '劫】');
        resLines.forEach(function (l) { log(l, res.ok ? 'gold' : 'bad'); });
        afterAction();
      });
    }, function (r) {
      const res = Engine.dujieFail(S, trib);
      return showChapter('渡劫 · 败落', [
        (TRIBULATION_TEXTS[trib] || {}).resultLose || '天劫之下，没有人是无辜的。',
        res.line
      ], { subtitle: trib + '之劫 · 道基受创' }).then(function () {
        logSection('【' + trib + '劫·败】');
        log(res.line, 'bad');
        afterAction();
      });
    });
  }
  function breakthroughFlow() {
    if (!Engine.canBreak(S)) return;
    const result = Engine.breakthrough(S);
    if (!result.needChoice) return;
    const info = result.info;

    // 小境界直接突破，不弹选择界面
    if (info.mode === 'small') {
      executeBreakthrough('direct', null);
      return;
    }

    // 大境界/渡劫显示突破选择界面
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = info.trib ? '渡劫 · ' + info.trib + '劫' : '破境突破';
    box.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'dim';
    desc.textContent = info.desc;
    box.appendChild(desc);
    // 渡劫：提示将进入几重劫境（心魔 / 天劫 / 仙界守卫 / 飞升天劫）
    if (info.mode === 'trib' && TRIB_TRIALS[info.trib]) {
      const tc = TRIB_TRIALS[info.trib];
      const tip = document.createElement('p');
      tip.className = 'dim';
      tip.style.color = '#c07';
      tip.textContent = '此劫共 ' + tc.stages.length + ' 重：' + tc.stages.map(function (k) {
        return (TRIB_BOSSES[k] ? TRIB_BOSSES[k].name : k);
      }).join(' → ') + '。每一重都是一座劫境，败则身死道消、直接结档（渡劫前会提醒你先存档）。';
      box.appendChild(tip);
    }
    // 突破按钮上的概率文案：大境界渡劫以「劫境序列」实战决胜，
    // 概率数字（道心/灵根/命格/丹药汇总）只作为「渡劫成功率」这个属性展示，
    // 不再让玩家误以为掷一次骰子就能过关。
    const passLine = (info.mode === 'trib' && TRIB_TRIALS[info.trib])
      ? '渡劫成功率：' + Math.round(info.base * 100) + '%（此劫以实战决胜负，须连胜 '
        + TRIB_TRIALS[info.trib].stages.length + ' 重劫身）'
      : '成功率：' + Math.round(info.base * 100) + '%';

    // 灵物突破选项已于 2026-09-13 移除：灵物本质改为法宝（装备后被动生效），
    //   「完美突破」机制取消，突破只剩「服丹」与「裸突破」两条路。

    // 丹药突破选项
    if (result.hasElixir) {
      const elixirCard = document.createElement('div');
      elixirCard.style.cssText = 'border:1px solid #6ab8c9;background:rgba(106,184,201,0.1);padding:12px;margin-bottom:12px;border-radius:8px;';
      elixirCard.innerHTML = '<h4 style="color:#6ab8c9;">普通突破 · 使用丹药</h4>' +
        '<p class="desc">消耗一枚丹药，增加气血上限（黄级+50，玄级+100，地级+300，天级+500）</p>' +
        '<p class="desc">' + passLine + '</p>';
      // 列出可用丹药
      const elixirList = document.createElement('div');
      elixirList.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;';
      Object.keys(S.elixirs).forEach(function(id) {
        if (S.elixirs[id] > 0) {
          const elixir = ELIXIRS[id];
          const btn = document.createElement('button');
          btn.className = 'btn-small';
          btn.textContent = elixir.name + ' ×' + S.elixirs[id];
          btn.onclick = function () {
            ov.style.display = 'none';
            executeBreakthrough('normal', id);
          };
          elixirList.appendChild(btn);
        }
      });
      elixirCard.appendChild(elixirList);
      box.appendChild(elixirCard);
    }

    // 无丹药直接突破
    const directCard = document.createElement('div');
    directCard.style.cssText = 'border:1px solid #2e2942;background:rgba(0,0,0,.2);padding:12px;margin-bottom:12px;border-radius:8px;';
    directCard.innerHTML = '<h4>直接突破</h4>' +
      '<p class="desc">不使用任何道具，直接尝试突破</p>' +
      '<p class="desc">' + passLine + '</p>';
    const directBtn = document.createElement('button');
    directBtn.className = 'btn-main';
    directBtn.textContent = '直接突破';
    directBtn.style.marginTop = '8px';
    directBtn.onclick = function () {
      ov.style.display = 'none';
      executeBreakthrough('direct', null);
    };
    directCard.appendChild(directBtn);
    box.appendChild(directCard);


  }

  /* 渡劫前提醒存档：劫境序列败则身死道消（直接结档），给玩家一次「先去存档」的机会。
     返回 true = 立即渡劫；false = 玩家选择先去存档（调用方应中止并打开存档面板）。 */
  function confirmDujieBeforeTrial(info) {
    const tc = TRIB_TRIALS[info.trib];
    const n = tc ? tc.stages.length : 1;
    const msg = [
      '【渡劫 · ' + info.trib + '劫】',
      '此劫共 ' + n + ' 重劫境，须以实战连胜 —— 败则身死道消，直接结档。',
      '此战不可重来，建议道友做好准备：'
    ].join('\n');
    return uiConfirm(msg, { ok: '立即渡劫', cancel: '先去存档', okDanger: true });
  }

  async function executeBreakthrough(type, itemId) {
    const before = statSheet(S);
    // 大境界渡劫 → 劫境序列（练气→筑基无劫，沿用概率突破）
    if (type !== 'perfect') {
      const info = Engine.breakInfo(S);
      if (info && info.mode === 'trib' && TRIB_TRIALS[info.trib]) {
        const go = await confirmDujieBeforeTrial(info);
        if (!go) {
          log('你先退回洞府，把这一世的光景细细记下。', 'dim');
          openSaveModal(true);
          return;
        }
        const pre = Engine.beginDujie(S, type === 'normal' ? itemId : null);
        if (pre && pre.ok) { dujieTrialFlow(pre.trib || info.trib, before); return; }
      }
    }
    let r;
    if (type === 'normal') {
      r = Engine.normalBreakthrough(S, itemId);
    } else {
      r = Engine.normalBreakthrough(S, null);
    }
    const resLines = [];
    if (r.ok && r.win) {
      if (r.trib) {
        resLines.push(TRIBULATION_TEXTS[r.trib].resultWin);
      } else {
        resLines.push('灵台轰鸣一声，你踏入了全新的境界。');
      }
      if (r.tech) resLines.push('大道玄音入耳，你心领神会，习得新功法【《' + TECHNIQUES[r.tech].name + '》·' + TECHNIQUES[r.tech].grade + '阶】。');
    } else {
      if (r.trib) resLines.push(TRIBULATION_TEXTS[r.trib].resultLose);
      resLines.push(r.line);
      if (r.died) resLines.push('你无力回天——');
    }
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx(r.ok && r.win ? 'break' : 'bad');
    }
    showChapter('突破 · 结算', resLines.concat([
      '—— —— —— ——',
      '往日旧身已随雷火散去，这一世的前路，从此不同。'
    ]), { subtitle: r.ok && r.win ? '破关成功' : '未能破关' }).then(function () {
      const settle = diffLines(before, S);
      return showChapter('突破 · 结算明细', settle, { subtitle: '当前实力一览' }).then(function () {
        logSection('【' + (r.trib || '破境') + '】');
        resLines.forEach(function (l) { log(l, r.ok && r.win ? 'gold' : 'bad'); });
        settle.forEach(function (l) { log(l, r.ok && r.win ? 'good' : 'dim'); });
        if (r.ok && r.win && S.realm === '筑基' && !S.sect) {
          sectJoinFlow().then(function () { afterAction(); });
        } else {
          afterAction();
        }
      });
    });
  }

  /* ---------------- 宗门加入剧情（突破筑基后触发，收束为「择门应考」） ----------------
     2026-09-08 收束：筑基散修择宗仅作"意属"，不再直接入宗。
     入宗唯一途径 = 过【入宗考验】；选择后 sectRank 保持 null → 宗门页显示"待考"态，玩家前往应考。 */
  function sectJoinFlow() {
    return showChapter('仙门开山 · 择门应考', [
      '筑基功成，灵压外溢——三座仙门的飞行舟同时降临城头。',
      '青云剑宗的弟子踏剑而行，剑气纵横；丹霞谷的长老袖中飞出万千灵草；玄天门的山门化作金光巨罩，罩住半座城。',
      '碑上规矩依旧：入我门者，先过【入宗考验】。你筑基之身，即便投奔，亦须应考方录为正式弟子。',
      '（若愿投奔，且观你想入哪一门——应考须往宗门页。）'
    ], {
      subtitle: '筑基之后 · 机缘降临',
      choices: [
        { t: '意属【青云剑宗】：不求长生，只求一剑破万法', effect: { sect: 'qingyunjian' },
          lines: ['你踏剑舟而上，舟上老剑修睨你一眼："剑心尚可，就是穷。先去演武场，过了考验再说。"（你已意属青云，可往【宗门】应考。）'] },
        { t: '意属【丹霞谷】：丹成九转，天上人间', effect: { sect: 'dpxia' },
          lines: ['袖中藏炉的长老领你入谷，满谷药香，药童作揖。"欲修丹道，先过考验，考过了我亲自教你。"（你已意属丹霞，可往【宗门】应考。）'] },
        { t: '意属【玄天门】：稳扎稳打，守得云开见月明', effect: { sect: 'xuantian' },
          lines: ['金光巨罩裂开一道门户，门中洪钟般的声音道："入我门者先守十年山——也要先应考。"（你已意属玄天，可往【宗门】应考。）'] },
        { t: '婉拒：独来独往，方是自在', effect: {},
          lines: ['你遥遥一礼，转身走入人潮。三座飞行舟的阴影掠过城头——自由，也是要自己扛的。'] }
      ]
    }).then(function (r) {
      if (r && r.pick && r.pick.effect && r.pick.effect.sect) {
        S.sect = r.pick.effect.sect;
        Engine.saveState(S);
        log('你意属【' + SECTS[S.sect].name + '】，尚待入宗考验。', 'gold');
      }
    });
  }

  /* ---------------- 年末 ---------------- */
  function runSectYearEvent(ev) {
    S.seen['se_' + ev.id] = 1;
    if (ev.chapter) {
      return showChapter(ev.title, ev.lines, {
        choices: ev.choices,
        toLog: true,
        subtitle: SECTS[S.sect].name + ' · 年景'
      }).then(function () {
        log('【' + ev.title + '】', 'evtitle');
        storyLines.forEach(function (l) { log(l.t, l.cls); });
        afterAction();
      });
    }
    log('【' + ev.title + '】' + ev.lines, 'sect');
    Engine.applyOps(S, ev.effect);
    afterAction();
  }
  function actYearEnd() {
    // 如果还有行动点，弹出游戏内确认
    if (S.actionsLeft > 0 && !S.dead) {
      showChapter('岁月将尽', [
        '你还有 ' + S.actionsLeft + ' 个行动点未消耗。',
        '是继续修行，还是辞旧迎新？'
      ], {
        subtitle: '第' + S.year + '年 · ' + S.age + '岁',
        choices: [
          { t: '继续修行\n把剩余行动点用完', effect: {}, lines: ['你决定再看看，这一年还没过完。'] },
          { t: '辞旧迎新\n进入下一年（气血与灵力尽复）', effect: {}, lines: ['你收拾好这一年的际遇，静待新岁。'] }
        ]
      }).then(function (r) {
        if (r && r.pick && r.pick.t.indexOf('辞旧迎新') >= 0) {
          doYearEnd();
        }
      });
      return;
    }
    doYearEnd();
  }
  function doYearEnd() {
    const r = Engine.endYear(S);
    if (r === 'end') { endLifeFlow(); return; }
    if (r === 'fate') { fateFlow(); return; }
    // 年初检查：灾劫玉符 / 隐藏线 / 死劫 / 主线剧情
    const yr = Engine.checkYearEvents(S);
    if (yr === 'omen') { omenMeetFlow(); return; }
    if (yr === 'hidden_boss') { hiddenBossFlow(); return; }
    if (yr === 'death_event') {
      var dev = S.pendingDeathEvent;
      S.seen['death_' + dev.year] = 1;
      delete S.pendingDeathEvent;
      var bossCard = (dev.boss || {});
      var devLines = (dev.lines || []).slice();
      if (bossCard.intro) devLines = devLines.concat([bossCard.intro]);
      var omenTip = Engine.omenText(S);
      if (omenTip) devLines = devLines.concat(['（识海里的那行字，昨夜变成了：「' + omenTip + '」）']);
      showChapter(dev.title, devLines, { subtitle: '第 ' + S.year + ' 年 · ' + S.age + ' 岁 · 生死之战' }).then(function () {
        // 死劫 = 专属劫境：独立地图（列数/节点池/环境文案）+ 一位有名字的劫主
        startTrialFlow('death', { deathIdx: dev.deathIdx != null ? dev.deathIdx : 0, dev: dev, title: dev.title });
      });
      return;
    }
    if (yr === 'mainline') {
      playMainlineChain();   // T4：年初多条主线连播
      return;
    }
    if (yr === 'dabi') {
      delete S.pendingDabi;
      openSect();
      sectDoDabi();
      return;
    }
    // 正常年初
    logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
    log('爆竹声中，旧岁翻篇。你长身而起，新一年的风已经吹进门来。');
    log('（一岁一枯荣：气血与灵力已随新岁尽数复原）', 'good');
    log('（进度已自动存档 · 第 ' + S.year + ' 年）', 'dim');
    // 灾劫玉符：每年识海浮现的黑字（死劫倒计时）
    if (S.omen && S.omen.got && typeof Engine.omenText === 'function') {
      const ot = Engine.omenText(S);
      if (ot) log('【灾劫玉符】识海深处，那行黑字又浮了上来——「' + ot + '」', 'omen');
    }
    // 遗世仙踪每10年出现一次
    if (Engine.isXianAdventureAvailable(S)) {
      log('【遗世仙踪】仙光乍现，遗世仙踪秘境降临！速往秘境入口探索。', 'gold');
    }
    if (typeof r === 'string' && r.indexOf('ok|') === 0) {
      const f = r.slice(3).split('、');
      log('宗门俸禄：' + f.join('、'), 'sect');
    }
    if (S.sect && Math.random() < 0.25) {
      const bi = bigIdxOf(S);
      const pool = SECT_EVENTS[S.sect].filter(function (ev) {
        return ev.min <= bi && ev.max >= bi && (!ev.once || !S.seen['se_' + ev.id]);
      });
      if (pool.length) {
        runSectYearEvent(pool[Math.floor(Math.random() * pool.length)]);
        return;
      }
    }
    if (Math.random() < 0.25) {
      const pool = EVENTS.year;
      const ev = pool[Math.floor(Math.random() * pool.length)];
      log('【' + ev.title + '】' + (typeof ev.lines === 'string' ? ev.lines : ev.lines[0]), 'year');
      if (ev.effect) Engine.applyOps(S, ev.effect);
    }
    refresh();
  }

  // T4：年初主线连播。当前主线播完后用 Engine.moreMainline 探测下一条，
  // 使同一新年内已达 idx 的多条主线可依次连播（死劫/大比后仍能触发，不互相挤占）。
  function playMainlineChain() {
    const ml = S.pendingMainline;
    if (!ml) { afterAction(); return; }
    S.seen['ml_' + ml.id] = 1;
    S.seen[ml.id] = 1;   // 主线事件若即某 NPC 缘法（如老乞丐），同步标记其缘法 id 已达成
    delete S.pendingMainline;
    const done = function () {
      if (Engine.moreMainline(S)) playMainlineChain();
      else afterAction();
    };
    if (ml.fight) {
      showChapter(ml.title, ml.lines, { subtitle: '主线剧情' }).then(function () {
        return openBattle(ml.fight, { title: ml.title });
      }).then(function (br) {
        if (br.win) {
          showChapter(ml.title + '·胜', [ml.resultWin].concat(br.gains || [])).then(function () {
            if (ml.effect) Engine.applyOps(S, ml.effect);
            Engine.saveState(S); done();
          });
        } else {
          showChapter(ml.title + '·败', [ml.resultLose || '你重伤退走。']).then(function () {
            Engine.saveState(S); done();
          });
        }
      });
    } else if (ml.choices) {
      // 注意：choose() 已完整处理「选项级 effect 施加 / 文案续播(chapterAppend) / 内嵌战斗(openBattle)与原地结算」。
      // 此处绝不能再 applyOps / showChapter('结果') / 再开 battle，否则会导致：效果重复施加、选项文案播放两遍、
      // 带 fight 的选项打两场，以及「结果」以独立弹窗【单独再跑一次】。
      // 顶层 ml.effect（与选项无关的剧情奖励）仅在此施加一次。
      if (ml.effect) Engine.applyOps(S, ml.effect);
      showChapter(ml.title, ml.lines, { subtitle: '主线剧情', choices: ml.choices }).then(function () {
        Engine.saveState(S); done();
      });
    } else {
      if (ml.effect) Engine.applyOps(S, ml.effect);
      showChapter(ml.title, ml.lines, { subtitle: '主线剧情' }).then(function () {
        Engine.saveState(S); done();
      });
    }
  }

  /* ---------------- 灾劫玉符（五劫主线） ---------------- */
  // 第 3 年：坊市 · 笑眯眯的算命老道硬塞玉符（玩家指定文案，两幕线性）
  function omenMeetFlow() {
    delete S.pendingOmen;
    S.seen['omen_meet'] = 1;
    const om = OMEN_TALISMAN;
    showChapter(om.meet.title, om.meet.lines, { subtitle: om.meet.subtitle }).then(function () {
      Engine.grantOmen(S);
      const txt = Engine.omenText(S);
      const aft = om.meet.after || {};
      // {omen} 占位替换为按玩家寿元与触发时间实时算出的识海黑字
      const lines = (aft.lines || []).map(function (t) { return t.replace('{omen}', txt); });
      return showChapter(aft.title || '灾劫玉符', lines, { subtitle: '第 ' + S.year + ' 年 · ' + S.age + ' 岁' }).then(function () {
        logSection('【灾劫玉符】');
        log('坊市游历，一个笑眯眯的算命老道硬塞给你一块玉符，只说「天机不可泄露」。', 'omen');
        log('玉符盘踞神台识海，浮出一行散着黑气的字：「' + txt + '」', 'omen');
        afterAction();
      });
    });
  }
  /* ---------------- 资料页（玉符 / 成就 / 图鉴）通用 ---------------- */
  // 标题页打开资料页时还没有局内状态，这里给出一份「可读状态」：
  // 局内 S 优先 → 磁盘存档 → 最后的空壳（成就/图鉴仍可看跨世部分，玉符提示「尚未获得」）。
  const EMPTY_VIEW_STATE = { seen: {}, year: 0, age: 0, equip: {}, techs: [], treasureSeen: {}, flags: {} };
  function pageState() {
    if (S) return S;
    const saved = Engine.loadState();
    return validSave(saved) ? saved : EMPTY_VIEW_STATE;
  }
  // 资料页由哪个屏幕打开的（标题页 / 主界面），返回时回到原处
  let pageReturnTo = 'game';
  function visibleScreenName() {
    const els = document.querySelectorAll('.screen');
    for (let i = 0; i < els.length; i++) {
      if (els[i].style.display === 'flex') return String(els[i].id || '').replace(/^screen-/, '');
    }
    return 'game';
  }
  function backFromPage() {
    const to = pageReturnTo;
    showScreen(to);
    if (to === 'game') refresh();
    else if (to === 'title') renderTitle();
  }
  // 玉符详情（标题页 / PC 侧栏「玉符」入口）
  function openOmen() {
    const s = pageState();
    if (!s.omen || !s.omen.got) {
      showChapter('灾劫玉符', [
        '你探了探神台识海——空空如也。',
        '你还没见过那块玉，也没遇见过那个老道。',
        '（据说有人在第 3 年的坊市里，被一个笑眯眯的算命老道拦住了。）'
      ], { subtitle: '尚未获得' });
      return;
    }
    const om = OMEN_TALISMAN;
    const txt = Engine.omenText(s);
    const cracks = s.omen.cracks || 0;
    const lines = om.desc.slice();
    lines.push('—— —— —— ——');
    lines.push('玉上此刻写着：「' + txt + '」');
    if (cracks > 0) {
      lines.push('玉符上有 ' + cracks + ' 道裂纹。每一道，都是你从一场死劫里活着走出来的证明。');
      for (let i = 0; i < cracks && i < DEATH_EVENTS.length; i++) {
        if (DEATH_EVENTS[i].omenCrack) lines.push('· 第 ' + (i + 1) + ' 道：' + DEATH_EVENTS[i].omenCrack);
      }
    } else {
      lines.push('玉符完好无损——因为你还没遇上一场真正的死劫。');
    }
    // —— 已战胜的死劫记录（死劫倒计时之外的战绩陈列）——
    lines.push('—— —— —— ——');
    lines.push('【已战胜的死劫记录】');
    for (let i = 0; i < DEATH_EVENTS.length; i++) {
      const ev = DEATH_EVENTS[i];
      const idx = i + 1;
      if (i < cracks) {
        // 已胜：完整信息
        const boss = ev.boss && ev.boss.name ? ev.boss.name : '';
        lines.push('✓ 第 ' + idx + ' 劫 · ' + ev.title + '（第 ' + ev.year + ' 年' + (boss ? ' · ' + boss : '') + '） — 已胜');
      } else if (i === cracks) {
        // 下一劫：只知道地方，BOSS 与年份未知
        lines.push('○ 第 ' + idx + ' 劫 · ' + ev.title + ' — 未知');
      } else {
        // 更远的未来：连地方都未知
        lines.push('○ 第 ' + idx + ' 劫 · 未知');
      }
    }
    if (s.omen.allPassed) {
      lines.push('五劫已尽。玉上的字换了，可你一点也不觉得轻松。');
      if ((s.jie || 0) >= 6) lines.push('更糟的是：玉符正在从里面裂开，裂缝里透出来的不是光。');
    }
    showChapter('灾劫玉符', lines, { subtitle: '第 ' + s.year + ' 年 · ' + s.age + ' 岁' });
  }
  /* ---------------- 隐藏线 · 轮回之外（魔祖仙帝 / s.jie >= 6） ---------------- */
  function hiddenBossFlow() {
    delete S.pendingHidden;
    const hb = HIDDEN_BOSS;
    logSection('【轮回之外】');
    log('玉符碎了。碎片拼起来，是一扇门。', 'omen');
    showChapter(hb.title, hb.lines, { subtitle: '隐藏之敌 · 唯一之敌' }).then(function () {
      startTrialFlow('hidden', { title: '轮回之外 · ' + (hb.trial && hb.trial.name ? hb.trial.name : '魔祖仙帝') });
    });
  }

  /* ---------------- 百年之约 · 魔渊 ---------------- */
  function fateFlow() {
    showChapter(FATE_EVENT.title, FATE_EVENT.lines, {
      subtitle: '百年之约 · 魔渊将开',
      choices: [{ t: '义无反顾，踏入魔渊' }]
    }).then(function () {
      const win = Engine.fateBattle(S);
      log('【' + FATE_EVENT.title + '】', 'evtitle');
      log('→ 义无反顾，踏入魔渊', 'choice');
      logSection('【镇魔英雄】');
      (win ? FATE_EVENT.winLines : FATE_EVENT.loseLines).forEach(function (l) { log(l, win ? 'gold' : 'bad'); });
      endLifeFlow();
    });
  }

  /* ---------------- 结局 / 结算 ---------------- */
  function endLifeFlow() {
    // 播放结局BGM
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playBgm('ending');
      AudioManager.playSfx(S.endReason === '飞升' ? 'win' : 'bad');
    }
    const meta = Engine.loadMeta();
    const ach = Engine.earnPoints(S, meta);
    meta.points += S.earnedPoints || 0;
    Engine.saveMeta(meta);
    M = meta;
    reportToCloud();
    renderSettlement({ meta: meta, ach: ach });
  }

  /* ---------------- 云端：排行榜 / 云存档（失败静默，不影响结算） ---------------- */
  function reportToCloud() {
    if (!window.DedaoAPI) return;
    try {
      const api = window.DedaoAPI;
      // 排行分 = 本世所得轮回点（与结算页合计一致）；按道号注册，已注册则复用身份
      api.register(S.name || '无名道人').then(function (p) {
        if (!p) return; // 后端不可用 → 静默跳过
        api.submitScore(S.earnedPoints || 0, S.realm || '');
        api.uploadSave(JSON.parse(JSON.stringify(S)), 'main'); // 顺势留一份云存档
      });
    } catch (e) { /* 云端异常绝不阻塞游戏 */ }
  }
  function appendLeaderboardSection(wrap) {
    const sec = document.createElement('div');
    sec.className = 'settle-section';
    sec.innerHTML = '<h4>天榜 · 万道争锋</h4><div class="dim">正在叩问天榜……</div>';
    wrap.appendChild(sec);
    const tip = sec.querySelector('.dim');
    if (!window.DedaoAPI) { tip.textContent = '（云端未接入）'; return; }
    window.DedaoAPI.fetchLeaderboard(10).then(function (rows) {
      if (!rows || !rows.length) { tip.textContent = '天榜寂寥，尚无人留名。（无法连接云端）'; return; }
      tip.remove();
      const myName = window.DedaoAPI.getPlayerName();
      rows.forEach(function (r) {
        const row = document.createElement('div');
        row.className = 'settle-row';
        const isMe = myName && r.name === myName;
        row.innerHTML = '<span>' + r.rank + '. ' + esc(r.name) + (isMe ? '<b>（你）</b>' : '') +
          ' · ' + esc(r.stage || '') + '</span><span class="gold">' + r.score + '</span>';
        if (isMe) row.style.color = '#e8c15a';
        sec.appendChild(row);
      });
    });
  }
  function renderSettlement(res) {
    const st = STAGES[S.idx] || { realm: '仙', sub: '', color: '#e8c15a', sym: 'Ⅵ', bigRealm: 4 };
    const sp = Engine.settlePoints(S, M);
    const bd = sp.breakdown;
    const isWin = S.endReason === '飞升' || S.endReason === '镇魔渊' || S.endReason === '打破轮回';
    const title = S.endReason === '打破轮回' ? '打破轮回' :
      S.endReason === '飞升' ? '羽化登仙' :
      S.endReason === '镇魔渊' ? '镇魔渊 · 舍身成仁' :
      S.endReason === '渡劫陨落' ? '渡劫陨落' :
      S.endReason === '寿元耗尽' ? '寿元耗尽' : '身死道消';
    const wrap = $('settle-body');
    wrap.innerHTML = '';
    // 结局倍率：打破轮回 1.5 > 飞升 1.2 > 寻常 1.0
    const endMul = (S.endReason === '打破轮回' || S.hiddenWin) ? 1.5
      : ((S.endReason === '飞升' || S.idx >= 15 || S.realm === '仙') ? 1.2 : 1);
    const endLabel = endMul === 1.5 ? '打破轮回' : (endMul === 1.2 ? '羽化登仙' : '');
    const head = document.createElement('div');
    head.className = 'settle-head';
    head.innerHTML = '<h2 style="color:' + (isWin ? '#e8c15a' : '#c8c8c8') + '">' + title + '</h2>' +
      '<p>这一世画上句号，<b>' + esc(S.name) + '</b>活到了 ' + S.age + ' 岁。</p>' +
      '<p>最终境界：<b style="color:' + st.color + '">' + st.realm + ' ' + st.sub + '</b>，一生突破 ' + S.broken + ' 次</p>' +
      '<p>' + (S.flags.daoLu ? '你已感悟【道】之真意。' : '你终究未能悟道。') + '</p>';
    wrap.appendChild(head);
    const achLines = res.ach.filter(function (a) { return a.new; });
    if (achLines.length) {
      const achBox = document.createElement('div');
      achBox.className = 'settle-ach';
      achBox.innerHTML = '<h4>成就解锁</h4>';
      achLines.forEach(function (a) {
        const d = document.createElement('div');
        d.className = 'settle-ach-line';
        d.innerHTML = '★ ' + ACHIEVEMENTS[a.id].name + ' <span class="gold">+' + ACHIEVEMENTS[a.id].pts + '</span>';
        achBox.appendChild(d);
      });
      wrap.appendChild(achBox);
    }
    const secTop = document.createElement('div');
    secTop.className = 'settle-section';
    secTop.innerHTML = '<h4>此生大事</h4>';
    if (sp.top5.length) {
      sp.top5.forEach(function (ev) {
        const row = document.createElement('div');
        row.className = 'settle-event' + (ev.cls ? ' ' + ev.cls : '');
        row.innerHTML = '▸ ' + ev.text + (ev.pts ? ' <span class="gold">+' + ev.pts + '</span>' : '');
        secTop.appendChild(row);
      });
    } else {
      const d = document.createElement('div');
      d.className = 'dim';
      d.textContent = '此生平淡，无甚大事。';
      secTop.appendChild(d);
    }
    wrap.appendChild(secTop);
    const secPts = document.createElement('div');
    secPts.className = 'settle-section';
    secPts.innerHTML = '<h4>轮回点明细</h4>' +
      '<div class="settle-row"><span>境界（' + S.realm + '）</span><span class="gold">+' + bd.realm + '</span></div>' +
      '<div class="settle-row"><span>渡劫（' + (S.tribPassed || 0) + ' 次）</span><span class="gold">+' + bd.trib + '</span></div>' +
      '<div class="settle-row"><span>死劫（' + (S.deathPassed || 0) + ' 次通过）</span><span class="gold">+' + bd.death + '</span></div>' +
      '<div class="settle-row"><span>秘境探索</span><span class="gold">+' + bd.explore + '</span></div>' +
      (bd.ach ? '<div class="settle-row"><span>新成就</span><span class="gold">+' + bd.ach + '</span></div>' : '') +
      (endMul > 1 ? '<div class="settle-row"><span>结局倍率（' + endLabel + '）</span><span class="gold">×' + endMul + '</span></div>' : '') +
      '<div class="settle-total"><span>合计</span><span class="gold">' + sp.total + '</span></div>';
    wrap.appendChild(secPts);
    const currentJie = S.jie || 0;
    const maxJie = M.maxJie || 0;
    const jieData = JIE_DATA[currentJie] || JIE_DATA[0];
    const secJie = document.createElement('div');
    secJie.className = 'settle-section';
    secJie.innerHTML = '<h4>劫轮回</h4>' +
      '<div class="settle-row"><span>当前劫数</span><span class="gold">' + jieData.name + '（' + currentJie + '劫）</span></div>' +
      '<div class="settle-row"><span>难度倍率</span><span>' + jieData.diff + 'x</span></div>' +
      '<div class="settle-row"><span>历史最高</span><span class="gold">' + maxJie + '劫</span></div>';
    wrap.appendChild(secJie);
    appendLeaderboardSection(wrap);
    showScreen('settlement');
    const nextJie = Math.min(9, currentJie + 1);
    const nextJieData = JIE_DATA[nextJie];
    const hasFeisheng = !!(M.achievements && M.achievements.feisheng);
    const hasDaolu = !!(M.achievements && M.achievements.daolu);
    const canJie = nextJie > currentJie && (hasFeisheng || hasDaolu);
    const jieDisabledReason = !canJie ? (hasFeisheng || hasDaolu ? '已达九劫' : '需要达成飞升或道之路结局') : '';
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:12px;';
    const btnReborn = document.createElement('button');
    btnReborn.className = 'btn-main';
    btnReborn.textContent = '重入轮回';
    btnReborn.onclick = function () { Engine.clearState(); showScreen('game'); startNewLife(); };
    const btnJie = document.createElement('button');
    btnJie.className = 'btn-main' + (canJie ? '' : ' ghost');
    btnJie.textContent = canJie ? '应劫轮回（' + nextJie + '劫）' : (hasFeisheng || hasDaolu ? '已达九劫' : '应劫轮回（需达成结局）');
    btnJie.disabled = !canJie;
    btnJie.title = jieDisabledReason;
    btnJie.onclick = function () {
      var m = Engine.loadMeta();
      m.nextJie = nextJie;
      Engine.saveMeta(m);
      Engine.clearState();
      showScreen('game');
      startNewLife();
    };
    const btnTitle = document.createElement('button');
    btnTitle.className = 'btn-main ghost';
    btnTitle.textContent = '返回标题';
    btnTitle.onclick = function () { Engine.clearState(); renderTitle(); showScreen('title'); };
    btnRow.appendChild(btnReborn);
    btnRow.appendChild(btnJie);
    btnRow.appendChild(btnTitle);
    wrap.appendChild(btnRow);
  }
  function actReborn() {
    showScreen('game');
    startNewLife();
  }

  /* ---------------- 起名弹窗 ---------------- */
  function showNameModal(onDone) {
    const ov = $('name-modal');
    $('name-input').value = randName();
    ov.style.display = 'flex';
    $('name-input').focus();
    $('name-input').select();
    function confirmName() {
      ov.style.display = 'none';
      onDone($('name-input').value);
    }
    $('name-ok').onclick = confirmName;
    $('name-random').onclick = function () {
      $('name-input').value = randName();
      $('name-input').focus();
      $('name-input').select();
    };
    $('name-cancel').onclick = function () {
      ov.style.display = 'none';
      onDone(null);
    };
    $('name-input').onkeydown = function (e) {
      if (e.key === 'Enter') confirmName();
    };
  }

  /* ---------------- 新一世 ---------------- */
  function startNewLife() {
    showEnterPage();
  }

  function destinySelect() {
    return new Promise(function (resolve) {
      const slotCount = S.destinySlots || 1;
      const pickCount = 3;   // 固定 3（原「大千命格」天赋已删除）
      const allKeys = Object.keys(DESTINIES);
      const gradeWeights = { '白': 50, '绿': 30, '蓝': 15, '紫': 4, '金': 1 };
      function rollPool() {
        const pool = [];
        const used = {};
        while (pool.length < pickCount && pool.length < allKeys.length) {
          let totalW = 0;
          allKeys.forEach(function (k) { totalW += (gradeWeights[DESTINIES[k].grade] || 10); });
          let r = Math.random() * totalW;
          for (let i = 0; i < allKeys.length; i++) {
            const k = allKeys[i];
            if (used[k]) continue;
            r -= (gradeWeights[DESTINIES[k].grade] || 10);
            if (r <= 0) {
              used[k] = true;
              pool.push(k);
              break;
            }
          }
        }
        return pool;
      }
      let pool = rollPool();
      let selected = [];
      function render() {
        const ov = $('modal');
        const box = $('modal-body');
        ov.style.display = 'flex';
        box.innerHTML = '';
        const h = document.createElement('h3');
        h.textContent = '命格选择（初始命运）';
        box.appendChild(h);
        const tip = document.createElement('p');
        tip.className = 'dim';
        tip.textContent = '选择 ' + slotCount + ' 个命格赋予你的命运。已选 ' + selected.length + '/' + slotCount;
        box.appendChild(tip);
        pool.forEach(function (k) {
          const dest = DESTINIES[k];
          const isSelected = selected.indexOf(k) >= 0;
          const row = document.createElement('div');
          row.className = 'rb-card' + (isSelected ? ' selected' : '');
          row.style.cursor = 'pointer';
          row.style.marginBottom = '6px';
          const gradeColor = { '白': '#b0b0bc', '绿': '#4ec9a0', '蓝': '#5ac8fa', '紫': '#b26de0', '金': '#e8c15a' }[dest.grade] || '#b0b0bc';
          let detailHtml = '';
          if (dest.attr) {
            const attrParts = [];
            if (dest.attr.wu) attrParts.push('悟性+' + dest.attr.wu);
            if (dest.attr.ti) attrParts.push('体魄+' + dest.attr.ti);
            if (dest.attr.dun) attrParts.push('遁速+' + dest.attr.dun);
            if (dest.attr.shen) attrParts.push('神识+' + dest.attr.shen);
            if (dest.attr.dao) attrParts.push('道心+' + dest.attr.dao);
            if (dest.attr.ling) attrParts.push('灵力+' + dest.attr.ling);
            if (attrParts.length) detailHtml += '<div style="color:#4ec9a0;font-size:12px;">属性：' + attrParts.join('、') + '</div>';
          }
          if (dest.effect) {
            const effParts = [];
            if (dest.effect.atkMul) effParts.push('攻击+' + Math.round(dest.effect.atkMul * 100) + '%');
            if (dest.effect.defMul) effParts.push('防御+' + Math.round(dest.effect.defMul * 100) + '%');
            if (dest.effect.critRate) effParts.push('暴击+' + Math.round(dest.effect.critRate * 100) + '%');
            if (dest.effect.dodgeRate) effParts.push('闪避+' + Math.round(dest.effect.dodgeRate * 100) + '%');
            if (dest.effect.lifesteal) effParts.push('吸血+' + Math.round(dest.effect.lifesteal * 100) + '%');
            if (dest.effect.thorns) effParts.push('反伤+' + Math.round(dest.effect.thorns * 100) + '%');
            if (dest.effect.stonePerYear) effParts.push('每年灵石+' + dest.effect.stonePerYear);
            if (effParts.length) detailHtml += '<div style="color:#5ac8fa;font-size:12px;">特效：' + effParts.join('、') + '</div>';
          }
          row.innerHTML = '<h4 style="color:' + gradeColor + '">【' + dest.grade + '】' + dest.name + '</h4>' +
            '<div class="desc">' + dest.desc + '</div>' +
            detailHtml;
          row.onclick = function () {
            if (isSelected) {
              selected = selected.filter(function (x) { return x !== k; });
            } else if (selected.length < slotCount) {
              selected.push(k);
            }
            render();
          };
          box.appendChild(row);
        });
        const btnRefresh = document.createElement('button');
        btnRefresh.className = 'btn-small';
        btnRefresh.textContent = '刷新命格池';
        btnRefresh.style.marginTop = '8px';
        btnRefresh.onclick = function () {
          pool = rollPool();
          selected = [];
          render();
        };
        box.appendChild(btnRefresh);
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn-main';
        btnConfirm.textContent = '确认选择';
        btnConfirm.disabled = selected.length === 0;
        btnConfirm.style.marginTop = '8px';
        btnConfirm.onclick = function () {
          S.destinies = selected.slice();
          Engine.saveState(S);
          ov.style.display = 'none';
          showScreen('game');
          initGame();
          resolve();
        };
        box.appendChild(btnConfirm);
      }
      render();
    });
  }

  /* ---------------- 进入页面（命格抽取+轮回选择） ---------------- */
  let enterState = {
    jie: 0,
    pool: [],
    selected: [],
    locked: [],
    lockedSlots: 0,
    pickCount: 3,
    slotCount: 1,
    destinyWarned: false   // 命格未选满的提醒是否已弹过（换劫/重抽/改选都重置）
  };

  function showEnterPage() {
    const m = Engine.loadMeta();
    // 劫数自由选择（2026-09-13 用户定稿）：开局即可选 0–9 劫，不再受「历史最高劫数」封顶。
    // maxJie（历史最高）仍保留在结算页作为成就展示；JIE_DATA 难度、命格金池、隐藏线（6劫+）等
    // 均按玩家所选劫数生效，选高劫=主动提升难度。
    const maxJie = 9;
    // 「应劫轮回（X劫）」预设：结算页应劫写入 meta.nextJie 后，进入页默认落在该劫（仍可自由改）。
    enterState.jie = Math.min(maxJie, m.nextJie || 0);
    enterState.selected = [];
    enterState.locked = [];
    enterState.lockedSlots = 0;

    showScreen('enter');
    $('enter-name-input').value = randName();
    renderEnterPage(maxJie);

    $('enter-jie-minus').onclick = function () {
      if (enterState.jie > 0) {
        enterState.jie--;
        enterState.selected = [];
        enterState.locked = [];
        enterState.pool = [];
        renderEnterPage(maxJie);
      }
    };
    $('enter-jie-plus').onclick = function () {
      if (enterState.jie < maxJie) {
        enterState.jie++;
        enterState.selected = [];
        enterState.locked = [];
        enterState.pool = [];
        renderEnterPage(maxJie);
      }
    };
    $('enter-reroll').onclick = function () {
      rerollDestiny(maxJie);
    };
    $('enter-xianming').onclick = function () {
      rerollXianming(maxJie);
    };
    $('enter-start').onclick = function () {
      confirmEnterPage();
    };
    $('enter-back').onclick = function () {
      showScreen('title');
    };
    $('enter-name-random').onclick = function () {
      $('enter-name-input').value = randName();
      $('enter-name-hint').textContent = '';
    };
    $('enter-name-input').oninput = function () {
      $('enter-name-hint').textContent = '';
    };
  }

  function renderEnterPage(maxJie) {
    const jie = enterState.jie;
    const jieName = JIE_DATA[jie] ? JIE_DATA[jie].name : '凡尘';

    // 轮回信息
    $('enter-jie-name').textContent = jieName + '（' + jie + '劫）';
    $('enter-jie-minus').disabled = (jie <= 0);
    $('enter-jie-plus').disabled = (jie >= maxJie);

    // 解锁内容
    const unlockParts = [];
    // 2026-09-14：3 劫起开局六维由 1 提到 2（与「我命由我」同阈值，见 Engine.startLife）
    if (jie >= 3) unlockParts.push('3劫起开局六维 +1、解锁「我命由我」命格栏+1');
    if (jie >= 6) unlockParts.push('+1锁定槽');
    $('enter-jie-status').textContent = unlockParts.length ? unlockParts.join('、') : '无额外解锁';

    // 轮回点奖励
    const rpGain = jie * 3 + (jie >= 3 ? 1 : 0) + (jie >= 6 ? 2 : 0);
    $('enter-jie-reward').textContent = '轮回点 +' + rpGain;

    // 计算抽取/选择数量（唯一口径 = Engine.destinyCounts，与《进入页面重做方案》§1.2 一致）
    // 抽取固定 3（原「大千命格」已删除）；可选 = 1 + 我命由我 + 劫数加成（3劫+ 额外 +1）
    const meta = Engine.loadMeta();
    const reinc = meta.reinc || {};
    const counts = Engine.destinyCounts(jie);
    enterState.pickCount = counts.pick;
    enterState.slotCount = counts.slot;
    enterState.lockedSlots = reinc.destiny_lock || 0;

    // 仙命觉醒按钮：仅 3 劫+(硬核) 可见
    const xmBtn = $('enter-xianming');
    if (xmBtn) xmBtn.style.display = (jie >= 3) ? '' : 'none';

    // 抽取命格池
    if (enterState.pool.length === 0) {
      enterState.pool = rollDestinyPool(enterState.pickCount, jie);
    }

    renderDestinyPool();
    updateDestinyTitle();
  }

  function rollDestinyPool(count, jie, forceGold) {
    // 仙命觉醒：直接抽取 count 个仙命(金)组成命格池
    if (forceGold) {
      const golds = Object.keys(DESTINIES).filter(function (k) { return DESTINIES[k].grade === '金'; });
      for (let i = golds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = golds[i]; golds[i] = golds[j]; golds[j] = t;
      }
      return golds.slice(0, Math.min(count, golds.length));
    }
    const allKeys = Object.keys(DESTINIES);
    // 根据劫数过滤命格池
    let poolKeys;
    if (jie >= 3) {
      poolKeys = allKeys; // 3劫+：白~金
    } else {
      poolKeys = allKeys.filter(function (k) { return DESTINIES[k].grade !== '金'; }); // 凡尘/1-2劫：白~紫
    }

    const gradeWeights = {};
    if (jie >= 3) {
      gradeWeights['白'] = 40; gradeWeights['绿'] = 30; gradeWeights['蓝'] = 20; gradeWeights['紫'] = 8; gradeWeights['金'] = 2;
    } else {
      gradeWeights['白'] = 50; gradeWeights['绿'] = 30; gradeWeights['蓝'] = 15; gradeWeights['紫'] = 5;
    }

    const pool = [];
    const used = {};
    while (pool.length < count && pool.length < poolKeys.length) {
      let totalW = 0;
      poolKeys.forEach(function (k) { totalW += (gradeWeights[DESTINIES[k].grade] || 10); });
      let r = Math.random() * totalW;
      for (let i = 0; i < poolKeys.length; i++) {
        const k = poolKeys[i];
        if (used[k]) continue;
        r -= (gradeWeights[DESTINIES[k].grade] || 10);
        if (r <= 0) {
          used[k] = true;
          pool.push(k);
          break;
        }
      }
    }
    return pool;
  }

  function renderDestinyPool() {
    const poolEl = $('enter-destiny-pool');
    poolEl.innerHTML = '';
    const pool = enterState.pool;
    const selected = enterState.selected;
    const locked = enterState.locked;
    const slotCount = enterState.slotCount;
    const gradeNameMap = { '白': '凡命', '绿': '本命', '蓝': '奇命', '紫': '极命', '金': '仙命' };

    // 构建索引列表，锁定的排在前面
    var indices = [];
    for (var i = 0; i < pool.length; i++) indices.push(i);
    indices.sort(function (a, b) {
      var la = locked.indexOf(a) >= 0 ? 0 : 1;
      var lb = locked.indexOf(b) >= 0 ? 0 : 1;
      return la - lb;
    });

    indices.forEach(function (idx) {
      var k = pool[idx];
      const dest = DESTINIES[k];
      const isSelected = selected.indexOf(k) >= 0;
      const isLocked = locked.indexOf(idx) >= 0;
      const gradeClass = { '白': 'grade-white', '绿': 'grade-green', '蓝': 'grade-blue', '紫': 'grade-purple', '金': 'grade-gold' }[dest.grade] || 'grade-white';
      const gradeColor = { '白': '#aaa', '绿': '#4ec9a0', '蓝': '#5ac8fa', '紫': '#9b59b6', '金': '#e8c15a' }[dest.grade] || '#aaa';
      const gradeName = gradeNameMap[dest.grade] || '凡命';

      const card = document.createElement('div');
      card.className = 'destiny-card ' + gradeClass + (isSelected ? ' selected' : '') + (isLocked ? ' locked' : '');

      let detailHtml = '';
      if (dest.attr) {
        const attrParts = [];
        if (dest.attr.wu) attrParts.push('悟性+' + dest.attr.wu);
        if (dest.attr.ti) attrParts.push('体魄+' + dest.attr.ti);
        if (dest.attr.dun) attrParts.push('遁速+' + dest.attr.dun);
        if (dest.attr.shen) attrParts.push('神识+' + dest.attr.shen);
        if (dest.attr.dao) attrParts.push('道心+' + dest.attr.dao);
        if (dest.attr.ling) attrParts.push('灵力+' + dest.attr.ling);
        if (attrParts.length) detailHtml += '<div class="destiny-detail">' + attrParts.join('、') + '</div>';
      }
      if (dest.effect) {
        const effParts = [];
        if (dest.effect.atkMul) effParts.push('攻击+' + Math.round(dest.effect.atkMul * 100) + '%');
        if (dest.effect.defMul) effParts.push('防御+' + Math.round(dest.effect.defMul * 100) + '%');
        if (dest.effect.critRate) effParts.push('暴击+' + Math.round(dest.effect.critRate * 100) + '%');
        if (dest.effect.dodgeRate) effParts.push('闪避+' + Math.round(dest.effect.dodgeRate * 100) + '%');
        if (dest.effect.lifesteal) effParts.push('吸血+' + Math.round(dest.effect.lifesteal * 100) + '%');
        if (dest.effect.thorns) effParts.push('反伤+' + Math.round(dest.effect.thorns * 100) + '%');
        if (dest.effect.stonePerYear) effParts.push('每年灵石+' + dest.effect.stonePerYear);
        if (effParts.length) detailHtml += '<div class="destiny-detail">' + effParts.join('、') + '</div>';
      }

      const lockHtml = '<div class="destiny-lock' + (isLocked ? ' locked' : '') + (enterState.lockedSlots > 0 ? ' available' : '') + '" data-idx="' + idx + '">' + (isLocked ? '🔒' : '🔓') + '</div>';

      card.innerHTML = '<span class="destiny-grade">' + gradeName + '</span>' +
        '<div class="destiny-body">' +
          '<div class="destiny-name" style="color:' + gradeColor + '">' + dest.name + '</div>' +
          '<div class="destiny-desc">' + dest.desc + '</div>' +
          detailHtml +
        '</div>' +
        lockHtml;

      // 锁定按钮点击（阻止冒泡）
      const lockBtn = card.querySelector('.destiny-lock');
      if (lockBtn) {
        lockBtn.onclick = function (e) {
          e.stopPropagation();
          if (enterState.lockedSlots <= 0) return;
          const lockIdx = parseInt(this.getAttribute('data-idx'));
          if (enterState.locked.indexOf(lockIdx) >= 0) {
            enterState.locked = enterState.locked.filter(function (x) { return x !== lockIdx; });
          } else if (enterState.locked.length < enterState.lockedSlots) {
            enterState.locked.push(lockIdx);
          }
          renderDestinyPool();
        };
      }

      // 卡片点击（选择/取消选择）
      card.onclick = function () {
        if (isLocked) return; // 锁定的不能点
        if (isSelected) {
          enterState.selected = selected.filter(function (x) { return x !== k; });
        } else if (selected.length < slotCount) {
          enterState.selected.push(k);
        }
        renderDestinyPool();
      };
      poolEl.appendChild(card);
    });

    // 未选择任何命格时禁用“开始这一世”，避免出现无命格的虚假存档
    const startBtn = $('enter-start');
    if (startBtn) startBtn.disabled = (enterState.selected || []).length === 0;
    // 选择有变化 → 重置「命格未选满」提醒（含按钮文案与提示语）
    enterState.destinyWarned = false;
    if (startBtn) startBtn.textContent = '开始这一世';
    updateDestinyTitle();
  }

  function rerollXianming(maxJie) {
    // 命格觉醒免费：不再消耗轮回点，直接觉醒为仙命（满池金命格）
    enterState.pool = rollDestinyPool(enterState.pickCount, enterState.jie, true);
    // 仙命自动选定：受「可选数」上限约束（如 3劫无天赋为 3选2，不能自动拿 3 个）
    enterState.selected = enterState.pool.slice(0, enterState.slotCount);
    enterState.locked = [];
    renderDestinyPool();
    updateDestinyTitle();
    log('命格觉醒！你觉醒了满池仙命，已按可选数自动择取。', 'legend');
  }

  function rerollDestiny(maxJie) {
    // 抽取命格免费：不再消耗轮回点，可反复重抽
    // 保留锁定的命格
    const lockedKeys = enterState.locked.map(function (idx) { return enterState.pool[idx]; });
    const newPool = rollDestinyPool(enterState.pickCount, enterState.jie);
    
    // 用锁定的命格替换新池中的对应位置，然后把锁定的放到最前面
    const result = [];
    const used = {};
    // 先放锁定的
    lockedKeys.forEach(function (k) {
      if (k) {
        result.push(k);
        used[k] = true;
      }
    });
    // 再放新的（跳过已锁定的）
    newPool.forEach(function (k) {
      if (!used[k] && result.length < enterState.pickCount) {
        result.push(k);
      }
    });
    
    enterState.pool = result;
    enterState.selected = [];
    // 重建locked索引（锁定的在最前面）
    enterState.locked = [];
    for (var i = 0; i < lockedKeys.length; i++) {
      enterState.locked.push(i);
    }
    renderDestinyPool();
  }

  function updateDestinyTitle() {
    const sel = (enterState.selected && enterState.selected.length) || 0;
    const left = Math.max(0, enterState.slotCount - sel);
    // 未选满时给出常驻提醒（玩家可选命格数 > 已选命格数）
    const title = '天命抉择 ' + enterState.pickCount + '选' + enterState.slotCount + '（可上下滑动）'
      + '　已选 ' + sel + '/' + enterState.slotCount
      + (left > 0 ? '　·　还可再选 ' + left + ' 个' : '　·　已选满');
    $('enter-destiny-title').textContent = title;
  }

  function confirmEnterPage() {
    const nameInput = $('enter-name-input');
    const name = nameInput.value.trim() || randName();
    // 名字长度检查：最多6个字符
    if (name.length > 6) {
      $('enter-name-hint').textContent = '名字不能超过6个字符';
      $('enter-name-hint').style.color = '#e74c3c';
      return;
    }
    const badWord = checkSensitive(name);
    if (badWord) {
      $('enter-name-hint').textContent = '包含敏感词「' + badWord + '」，请更换';
      $('enter-name-hint').style.color = '#e74c3c';
      return;
    }
    // 命格未选满：首次点「开始」只提醒，再点一次才真的踏入仙途（避免漏选后开局）
    // 口径与标题一致：可再选数 = slotCount - 已选数
    const selCount = (enterState.selected && enterState.selected.length) || 0;
    const left = Math.max(0, enterState.slotCount - selCount);
    if (left > 0 && !enterState.destinyWarned) {
      enterState.destinyWarned = true;
      const hint = $('enter-name-hint');
      if (hint) {
        hint.textContent = '还有 ' + left + ' 个命格可选（已选 ' + selCount + '/' + enterState.slotCount
          + '）。确认不再选，就再点一次「开始这一世」。';
        hint.style.color = '#e8c15a';
      }
      const startBtn = $('enter-start');
      if (startBtn) startBtn.textContent = '仍要开始（还剩 ' + left + ' 个未选）';
      return;
    }
    S = Engine.startLife(name);
    S.year = 1;
    S.jie = enterState.jie;
    // 兜底：未选择任何命格时自动选取第一个候选项，避免出现“无命格”的虚假(phantom)存档
    if (!enterState.selected || !enterState.selected.length) {
      enterState.selected = (enterState.pool && enterState.pool.length) ? [enterState.pool[0]] : [];
    }
    S.destinies = enterState.selected.slice();
    // 提交开局：应用命格/彩蛋/轮回天赋加成
    S.bg = null; // 出身加成改由开荒页 applyInit 统一计入，避免重复
    Engine.commitStart(S, null);
    // 命格栏数量与进入页「可选数」同一口径：commitStart 内 applyReinc 会按天赋叠加，故在其后统一覆盖，
    // 避免「我命由我」被算两次（进入页公式 + applyReinc 各一次）。
    S.destinySlots = Engine.destinyCounts(S.jie).slot;
    Engine.saveState(S);
    suspended = false;

    // 开荒：玩家自选灵根 / 出身 / 分配点数 / 百艺，再踏入仙途
    showCreatePage();
  }

  function minggeSelect() {
    const jie = S.jie || 0;
    const pickCount = jie >= 6 ? 3 : (jie >= 3 ? 2 : 1);
    const lockMax = jie >= 9 ? 2 : (jie >= 3 ? 1 : 0);
    const jieName = (JIE_DATA[jie] || JIE_DATA[0]).name;
    let pool = S.talentRoll;
    let selected = [];
    let locked = [];
    function render() {
      const ov = $('modal');
      const box = $('modal-body');
      ov.style.display = 'flex';
      box.innerHTML = '';
      const h = document.createElement('h3');
      h.textContent = '命格选择 · ' + jieName + '（' + jie + '劫）';
      box.appendChild(h);
      const tip = document.createElement('p');
      tip.className = 'dim';
      tip.textContent = '可选 ' + pickCount + ' 个' + (lockMax > 0 ? '，可锁 ' + lockMax + ' 个' : '') + '。已选 ' + selected.length + '/' + pickCount;
      box.appendChild(tip);
      pool.forEach(function (t, idx) {
        const tierName = TIER_NAMES[t.tier] || '凡命';
        const tierColor = TIER_COLORS[t.tier] || '#b0b0bc';
        const isLocked = locked.indexOf(idx) >= 0;
        const isSelected = selected.indexOf(idx) >= 0;
        const row = document.createElement('div');
        row.style.cssText = 'padding:8px;margin:4px 0;border:1px solid ' + (isSelected ? '#e8c15a' : isLocked ? '#5ac8fa' : '#3a3450') + ';border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;';
        if (isSelected) row.style.background = 'rgba(232,193,90,0.15)';
        if (isLocked) row.style.background = 'rgba(90,200,250,0.1)';
        const badge = document.createElement('span');
        badge.style.cssText = 'color:' + tierColor + ';font-size:12px;min-width:36px;';
        badge.textContent = '【' + tierName + '】';
        const name = document.createElement('b');
        name.style.color = tierColor;
        name.textContent = t.name;
        const desc = document.createElement('span');
        desc.className = 'dim';
        desc.style.fontSize = '12px';
        desc.textContent = t.desc;
        row.appendChild(badge);
        row.appendChild(name);
        row.appendChild(desc);
        if (isLocked) {
          const lk = document.createElement('span');
          lk.style.cssText = 'margin-left:auto;color:#5ac8fa;font-size:11px;';
          lk.textContent = '[锁定]';
          row.appendChild(lk);
        }
        row.onclick = function () {
          if (isLocked) {
            locked = locked.filter(function (i) { return i !== idx; });
          } else if (isSelected) {
            selected = selected.filter(function (i) { return i !== idx; });
          } else if (selected.length < pickCount) {
            selected.push(idx);
          }
          render();
        };
        if (lockMax > 0 && !isSelected) {
          const lockBtn = document.createElement('button');
          lockBtn.className = 'btn-main ghost';
          lockBtn.style.cssText = 'margin-left:auto;padding:2px 8px;font-size:11px;';
          lockBtn.textContent = isLocked ? '解锁' : '锁定';
          lockBtn.onclick = function (e) {
            e.stopPropagation();
            if (isLocked) {
              locked = locked.filter(function (i) { return i !== idx; });
            } else if (locked.length < lockMax) {
              locked.push(idx);
            }
            render();
          };
          row.appendChild(lockBtn);
        }
        box.appendChild(row);
      });
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin-top:12px;justify-content:center;';
      const btnRefresh = document.createElement('button');
      btnRefresh.className = 'btn-main ghost';
      btnRefresh.textContent = '重新抽签';
      btnRefresh.onclick = function () {
        const lockedTalents = locked.map(function (i) { return pool[i]; });
        const newPool = Engine.rollMingge(5 - lockedTalents.length, jie);
        const finalPool = lockedTalents.concat(newPool);
        pool = finalPool;
        S.talentRoll = finalPool;
        selected = [];
        var newLocked = [];
        locked.forEach(function (oldIdx) {
          var oldT = pool[locked.indexOf(oldIdx)];
          for (var i = 0; i < pool.length; i++) {
            if (pool[i] === oldT && newLocked.indexOf(i) < 0) { newLocked.push(i); break; }
          }
        });
        locked = newLocked;
        render();
      };
      const btnConfirm = document.createElement('button');
      btnConfirm.className = 'btn-main';
      btnConfirm.textContent = '确认选择';
      btnConfirm.disabled = selected.length === 0;
      btnConfirm.onclick = function () {
        const chosenIds = selected.map(function (i) { return pool[i].id; });
        Engine.commitStart(S, chosenIds[0]);
        for (var k = 1; k < chosenIds.length; k++) {
          S.talents.push(chosenIds[k]);
          var t2 = TALENTS.filter(function (x) { return x.id === chosenIds[k]; })[0];
          if (t2 && t2.apply) {
            if (t2.apply.wu) S.wu += t2.apply.wu;
            if (t2.apply.ti) S.ti += t2.apply.ti;
            if (t2.apply.life) S.lifeMax += t2.apply.life;
            if (t2.apply.stone) S.stone += t2.apply.stone;
            if (t2.apply.atk) S.extraAtk += t2.apply.atk;
            if (t2.apply.hpMax) S.hpMaxBonus = (S.hpMaxBonus || 0) + t2.apply.hpMax;
          }
        }
        Engine.refreshStats(S);
        Engine.saveState(S);
        ov.style.display = 'none';
        showScreen('game');
        initGame();
      };
      btnRow.appendChild(btnRefresh);
      btnRow.appendChild(btnConfirm);
      box.appendChild(btnRow);
      $('modal-close').onclick = function () {};
    }
    render();
  }
  function rollLinggenPreview(S) {
    if (S.linggenRaw) return S.linggenRaw;
    let total = 0;
    LINGGEN_POOL.forEach(function (l) { total += l.w; });
    let r = Math.random() * total;
    for (let i = 0; i < LINGGEN_POOL.length; i++) { r -= LINGGEN_POOL[i].w; if (r <= 0) return LINGGEN_POOL[i]; }
    return LINGGEN_POOL[0];
  }
  function initGame() {
    logSection('第 1 年 · ' + S.age + ' 岁');
    log('凡尘一梦，漫漫仙途，从此开始了。');
    log('你每轮有 ' + Engine.actionPoints(S) + ' 个行动点，寿元上限 ' + S.lifeMax + ' 岁。修炼、历练、机缘……成道之路，由你自己选择。', 'dim');
    refresh();
  }

  /* ---------------- 灵根效果文案（唯一口径） ----------------
     ⚠️ 旧实现读 S.linggen.body（已废弃的旧档结构），导致现代存档的灵根战斗加成
     （金锐暴击+5%、润泽渡劫+8%、炽烈攻击+15%…）在面板上一个都不显示。
     现统一走 `Engine.linggenTrait(s)`（trait.effect 为主、body 为旧档兜底），与战斗实算同源。 */
  const LINGGEN_EFF_LABEL = { atk: '攻击', hpMax: '气血', mpMax: '灵力上限', def: '防御', critPct: '暴击', dodgePct: '闪避', tribPct: '渡劫', trib: '渡劫' };
  function linggenEffectParts(s) {
    const lg = s && s.linggen;
    if (!lg) return [];
    const out = [];
    if (lg.qiMul && lg.qiMul !== 1) out.push('修炼速度 +' + Math.round((lg.qiMul - 1) * 100) + '%');
    const eff = (typeof Engine.linggenTrait === 'function' ? Engine.linggenTrait(s) : null) || {};
    ['atk', 'hpMax', 'mpMax', 'def', 'critPct', 'dodgePct', 'tribPct', 'trib'].forEach(function (k) {
      if (!eff[k]) return;
      // 新结构 critPct/dodgePct/tribPct 为百分数；旧档 body.trib 为小数
      const isFrac = (k === 'trib');
      const val = Math.round(eff[k] * (isFrac ? 100 : 1));
      const pct = (k === 'critPct' || k === 'dodgePct' || k === 'tribPct' || isFrac) ? '%' : '';
      out.push((LINGGEN_EFF_LABEL[k] || k) + '+' + val + pct);
    });
    if (lg.trait && lg.trait.name) out.push('特质【' + lg.trait.name + '】');
    const aff = lg.affinity || [];
    if (aff.length && lg.affinityBonus) {
      out.push((aff.length >= 5 ? '全系' : aff.join('/') + '系') + '功法/法术伤害 +' + lg.affinityBonus + '%');
    }
    return out;
  }

  /* ---------------- 属性面板 ---------------- */
  function openAttrs() {
    if (!S) return;
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'attr-panel';

    // 境界 + 基础信息
    const st = safeStage(S);
    const es = Engine.equipStats(S);
    const cultR = Engine.cultGain(S);
    const destAttrBonus = { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0 };
    (S.destinies || []).forEach(function (d) {
      const dest = DESTINIES[d];
      if (dest && dest.attr) {
        Object.keys(dest.attr).forEach(function (k) { if (destAttrBonus[k] !== undefined) destAttrBonus[k] += dest.attr[k]; });
      }
    });

    // === 境界信息条 ===
    const realmBar = document.createElement('div');
    realmBar.className = 'attr-realm-bar';
    realmBar.innerHTML = '<span class="realm-name" style="color:' + st.color + '">' + st.sym + ' ' + st.realm + ' · ' + st.sub + '</span>' +
      '<span class="dim">（第' + S.idx + '阶）</span>';
    wrap.appendChild(realmBar);

    // === 六维属性大格子 ===
    const h1 = document.createElement('h4');
    h1.textContent = '六维属性';
    h1.style.color = 'var(--gold)';
    wrap.appendChild(h1);

    const sixGrid = document.createElement('div');
    sixGrid.className = 'attr-six-grid';

    // 六维说明文案由引擎 attrGainText 统一给出：只说「一共加了多少战斗属性 / 修炼速度」，
    //   不写「（基础+命格）」、不写「每点+多少」、不写栏位解锁（用户 2026-09-13 定稿）。
    const sixDims = [
      { key: 'wu', name: '悟性', icon: '📖', color: '#5ac8fa' },
      { key: 'ti', name: '体魄', icon: '💪', color: '#e0604a' },
      { key: 'dun', name: '遁速', icon: '💨', color: '#4ec9a0' },
      { key: 'dao', name: '道心', icon: '☯', color: '#e8c15a' },
      { key: 'ling', name: '灵力', icon: '🔮', color: '#6ad1ff' },
      { key: 'shen', name: '神识', icon: '👁', color: '#c06ae0' }
    ];

    // 六维 + 年/寿 共 8 格，4×2 布局（悟性·体魄·遁速·年 / 道心·灵力·神识·寿）
    const sixCells = [];
    sixDims.forEach(function (dim, i) {
      sixCells.push({ type: 'dim', dim: dim });
      // 第 3 位（索引2）后插「年龄」，第 6 位（索引5，即最后）后插「寿元」
      if (i === 2) sixCells.push({ type: 'age' });
      if (i === 5) sixCells.push({ type: 'life' });
    });

    sixCells.forEach(function (cell) {
      if (cell.type === 'age') {
        const card = document.createElement('div');
        card.className = 'attr-six-card';
        card.style.borderColor = '#b0b0bc';
        card.innerHTML = '<div class="attr-six-header"><span class="attr-six-icon">🎂</span><span class="attr-six-name" style="color:#b0b0bc">年龄</span></div>' +
          '<div class="attr-six-val"><b>' + (S.age || 0) + '</b></div>' +
          '<div class="attr-six-affect dim">当前年龄（每过一年 +1）</div>';
        sixGrid.appendChild(card);
        return;
      }
      if (cell.type === 'life') {
        const card = document.createElement('div');
        card.className = 'attr-six-card';
        card.style.borderColor = '#e8c15a';
        card.innerHTML = '<div class="attr-six-header"><span class="attr-six-icon">⏳</span><span class="attr-six-name" style="color:#e8c15a">寿元</span></div>' +
          '<div class="attr-six-val"><b>' + (S.lifeMax || 0) + '</b></div>' +
          '<div class="attr-six-affect dim">寿元上限，年龄达到即坐化</div>';
        sixGrid.appendChild(card);
        return;
      }
      const dim = cell.dim;
      const es2 = es[dim.key] || 0;
      // 展示值 = 引擎有效值（基础 + 命格 + 法宝 + 装备），与战斗实算同源
      const total = Engine.effAttr(S, dim.key) + es2;

      const card = document.createElement('div');
      card.className = 'attr-six-card';
      card.style.borderColor = dim.color;

      const header = document.createElement('div');
      header.className = 'attr-six-header';
      header.innerHTML = '<span class="attr-six-icon">' + dim.icon + '</span>' +
        '<span class="attr-six-name" style="color:' + dim.color + '">' + dim.name + '</span>';
      card.appendChild(header);

      const valRow = document.createElement('div');
      valRow.className = 'attr-six-val';
      valRow.innerHTML = '<b>' + total + '</b>';
      card.appendChild(valRow);

      const affect = document.createElement('div');
      affect.className = 'attr-six-affect dim';
      affect.textContent = Engine.attrGainText(S, dim.key);
      card.appendChild(affect);

      sixGrid.appendChild(card);
    });
    wrap.appendChild(sixGrid);

    // === 战斗属性 ===
    const hCombat = document.createElement('h4');
    hCombat.textContent = '战斗属性';
    hCombat.style.color = 'var(--gold)';
    wrap.appendChild(hCombat);

    const combatGrid = document.createElement('div');
    combatGrid.className = 'attr-combat-grid';

    const atkMul = Engine.getDestinyAttrMult(S, 'atk');
    // 防御走引擎统一口径（体魄有效值×0.5×命格倍率 + 装备/法宝/灵根防御），面板=战斗实算
    const defTotal = Engine.getDefense(S);
    const critBase = Math.round(Engine.getCritRate(S) * 100);
    const dodgeBase = Math.round(Engine.getDodgeRate(S) * 100);
    const extraAtkBase = Math.round(Engine.getExtraAtkChance(S) * 100);
    const recoverBase = Math.round(Engine.getRecoverPct(S) * 100);

    // 战斗属性 4×2（8 词条，上下对齐）
    const combatStats = [
      { name: '攻击', val: Math.round(S.atk * atkMul), color: '#ff9080', desc: '基础10+境界 + 神识×5 + 灵力×5 + 装备' },
      { name: '防御', val: defTotal, color: '#90e8b0', desc: '体魄×0.5 + 装备/法宝/灵根防御 + 命格（土阵%、金缕衣减伤另计）' },
      { name: '暴击', val: critBase + '%', color: '#e8c15a', desc: '神识×1% + 道心×2% + 装备 + 命格' },
      { name: '血量', val: S.hp + ' / ' + S.hpMax, color: '#ff9080', desc: '80 + 体魄×50 + 境界 + 装备血量上限%' },
      { name: '攻速', val: extraAtkBase + '%', color: '#ffb84d', desc: '遁速×1% + 装备：几率额外攻击一次' },
      { name: '回复', val: recoverBase + '%', color: '#4ec9a0', desc: '体魄×1% + 装备：造成伤害的吸血比例' },
      { name: '闪避', val: dodgeBase + '%', color: '#4ec9a0', desc: '遁速×2% + 装备 + 命格' },
      { name: '灵量', val: (S.mp || 0) + ' / ' + (S.mpMax || 0), color: '#6ad1ff', desc: '灵力上限（灵力×20）+ 装备灵力上限%' }
    ];

    combatStats.forEach(function (cs) {
      const cell = document.createElement('div');
      cell.className = 'attr-combat-cell';
      cell.innerHTML = '<div class="attr-combat-label">' + cs.name + '</div>' +
        '<div class="attr-combat-val" style="color:' + cs.color + '">' + cs.val + '</div>';
      combatGrid.appendChild(cell);
    });
    wrap.appendChild(combatGrid);

    // === 灵根 ===
    const h2 = document.createElement('h4');
    h2.textContent = '灵根';
    h2.style.color = 'var(--gold)';
    wrap.appendChild(h2);
    const lg = document.createElement('div');
    lg.className = 'attr-section';
    if (S.linggen) {
      lg.innerHTML = '<b style="color:#e8c15a">' + S.linggen.name + '</b><span class="dim"> — ' + S.linggen.desc + '</span>';
      const parts = linggenEffectParts(S);
      if (parts.length) lg.innerHTML += '<br><span class="dim" style="margin-left:8px">效果：' + parts.join('，') + '</span>';
    } else {
      lg.innerHTML = '<span class="dim">未觉醒</span>';
    }
    wrap.appendChild(lg);

    // === 命格（命运） ===
    const h3b = document.createElement('h4');
    h3b.textContent = '命格';
    h3b.style.color = 'var(--gold)';
    wrap.appendChild(h3b);
    if (S.destinies && S.destinies.length) {
      S.destinies.forEach(function (d) {
        const dest = DESTINIES[d];
        if (!dest) return;
        const p = document.createElement('div');
        p.className = 'attr-destiny-card';
        const gradeColor = { '白': '#b0b0bc', '绿': '#4ec9a0', '蓝': '#5ac8fa', '紫': '#b26de0', '金': '#e8c15a' }[dest.grade] || '#b0b0bc';

        // 属性加成
        const attrParts = [];
        if (dest.attr) {
          const attrNames = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', ling: '灵力' };
          Object.keys(dest.attr).forEach(function (k) {
            if (attrNames[k]) attrParts.push(attrNames[k] + '+' + dest.attr[k]);
          });
        }

        // 战斗加成
        const effectParts = [];
        if (dest.effect) {
          const effectNames = { atkMul: '攻击', defMul: '防御', critRate: '暴击率', dodgeRate: '闪避率',
            lifesteal: '吸血', thorns: '反伤', firstStrike: '先手', counterRate: '反击率',
            stonePerYear: '灵石/年', wuPerYear: '悟性/年', tiPerYear: '体魄/年',
            tribBonus: '渡劫', executeBonus: '斩杀' };
          Object.keys(dest.effect).forEach(function (k) {
            if (k === 'controlImmune') { effectParts.push('控制免疫'); return; }
            if (k === 'techTypeBonus') {
              Object.keys(dest.effect[k]).forEach(function (tk) {
                effectParts.push((tk === 'xinfa' ? '心法' : tk) + '伤害+' + Math.round(dest.effect[k][tk] * 100) + '%');
              });
              return;
            }
            const name = effectNames[k];
            if (!name) return;
            const val = dest.effect[k];
            if (typeof val === 'boolean') { effectParts.push(name); return; }
            if (k.indexOf('Mul') >= 0 || k.indexOf('Rate') >= 0 || k.indexOf('Bonus') >= 0 || k.indexOf('steal') >= 0 || k.indexOf('thorns') >= 0 || k.indexOf('Strike') >= 0 || k.indexOf('counter') >= 0 || k.indexOf('execute') >= 0) {
              effectParts.push(name + '+' + Math.round(val * 100) + '%');
            } else {
              effectParts.push(name + '+' + val);
            }
          });
        }

        const allParts = attrParts.concat(effectParts);
        p.innerHTML = '<div class="attr-destiny-header"><span class="attr-destiny-grade" style="color:' + gradeColor + '">【' + dest.grade + '】</span>' +
          '<span class="attr-destiny-name" style="color:' + gradeColor + '">' + dest.name + '</span></div>' +
          '<div class="attr-destiny-desc dim">' + dest.desc + '</div>' +
          (allParts.length ? '<div class="attr-destiny-bonus">加成：' + allParts.join('，') + '</div>' : '');
        wrap.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '无命格（栏位：' + (S.destinySlots || 1) + '）';
      wrap.appendChild(p);
    }

    // === 宗门 ===
    const h4 = document.createElement('h4');
    h4.textContent = '宗门';
    h4.style.color = 'var(--gold)';
    wrap.appendChild(h4);
    const sectDiv = document.createElement('div');
    sectDiv.className = 'attr-section';
    if (S.sect) {
      const sc = SECTS[S.sect];
      sectDiv.innerHTML = '<b style="color:#e8c15a">' + sc.name + '</b><span class="dim"> — ' + sc.desc + '</span>';
    } else {
      sectDiv.innerHTML = '<span class="dim">散修（未加入宗门）</span>';
    }
    wrap.appendChild(sectDiv);

    // === 装备加成 ===
    const h5 = document.createElement('h4');
    h5.textContent = '装备加成';
    h5.style.color = 'var(--gold)';
    wrap.appendChild(h5);
    const eqDiv = document.createElement('div');
    eqDiv.className = 'attr-section';
    const eqParts = [];
    if (es.hpMax) eqParts.push('气血上限+' + es.hpMax);
    if (es.atk) eqParts.push('攻击+' + es.atk);
    if (es.wu) eqParts.push('悟性+' + es.wu);
    if (es.ti) eqParts.push('体魄+' + es.ti);
    if (es.cult) eqParts.push('修炼+' + Math.round(es.cult * 100) + '%');
    eqDiv.innerHTML = eqParts.length ? '<span class="dim">' + eqParts.join('，') + '</span>' : '<span class="dim">无装备加成</span>';
    wrap.appendChild(eqDiv);

    // === 功法 ===
    const h6 = document.createElement('h4');
    h6.textContent = '功法';
    h6.style.color = 'var(--gold)';
    wrap.appendChild(h6);
    const xf = S.techEquip && S.techEquip.xinfa && TECHNIQUES[S.techEquip.xinfa];
    const dun = S.techEquip && S.techEquip.dunshu && TECHNIQUES[S.techEquip.dunshu];
    const spells = (S.techEquip && S.techEquip.shufa || []).map(function (t) { return TECHNIQUES[t]; });
    const techDiv = document.createElement('div');
    techDiv.className = 'attr-section';
    const techParts = [];
    if (xf) techParts.push('心法：[' + xf.name + '] 修炼+' + Math.round((xf.mult - 1) * 100) + '%');
    if (dun) techParts.push('遁术：[' + dun.name + ']');
    if (spells.length) techParts.push('法术：' + spells.map(function (s) { return s.name; }).join('、'));
    techDiv.innerHTML = techParts.length ? '<span class="dim">' + techParts.join('。') + '</span>' : '<span class="dim">无功法</span>';
    wrap.appendChild(techDiv);

    box.appendChild(wrap);
  }

  /* ---------------- 储物袋页 ---------------- */
  function openBag() {
    showScreen('bag');
    renderBagPage();
  }
  // 将法宝的结构化 effect 渲染为可读中文说明
  // 法宝效果文案：唯一权威实现已收敛到引擎（engine.artEffectText），UI 只做转发。
  // 历史 bug：UI 侧自带一份 pct() 且调用处又补了一次「+」，出现「灵矿产量++30%」。
  function artEffectText(id) {
    return Engine.artEffectText(id);
  }
  function renderBagPage() {
    const body = $('bag-body');
    body.innerHTML = '';
    if (!S.materials) S.materials = {};

    // 灵材部分
    const matTitle = document.createElement('h4');
    matTitle.textContent = '灵材';
    body.appendChild(matTitle);
    const matGrid = document.createElement('div');
    matGrid.className = 'bag-grid';
    const matKeys = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian', 'iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
    const sellPrices = { herb_huang: 4, herb_xuan: 8, herb_di: 15, herb_tian: 30, iron_huang: 6, iron_xuan: 12, iron_di: 22, iron_tian: 45 };
    matKeys.forEach(function (key) {
      var n = S.materials[key] || 0;
      if (!n) return;
      var d = document.createElement('div');
      d.className = 'bag-item';
      d.innerHTML = '<b>' + MATERIALS[key].name + '</b> ×' + n + '<br><span class="dim">售价 ' + sellPrices[key] + ' 灵石/个</span><br><button>卖出1个</button><button>卖出全部</button>';
      var btns = d.querySelectorAll('button');
      btns[0].onclick = function () {
        if (S.materials[key] < 1) return;
        S.materials[key]--;
        S.stone += sellPrices[key];
        Engine.refreshStats(S); Engine.saveState(S);
        log('卖出' + MATERIALS[key].name + ' ×1，得灵石 ' + sellPrices[key] + '。', 'good');
        renderBagPage();
      };
      btns[1].onclick = function () {
        var amount = S.materials[key] || 0;
        if (amount < 1) return;
        S.materials[key] = 0;
        S.stone += amount * sellPrices[key];
        Engine.refreshStats(S); Engine.saveState(S);
        log('卖出' + MATERIALS[key].name + ' ×' + amount + '，得灵石 ' + (amount * sellPrices[key]) + '。', 'good');
        renderBagPage();
      };
      matGrid.appendChild(d);
    });
    // 灵石显示
    var stoneD = document.createElement('div');
    stoneD.className = 'bag-item';
    stoneD.innerHTML = '<b>灵石</b> ×' + (S.stone || 0);
    matGrid.appendChild(stoneD);
    if (!matGrid.children.length) matGrid.innerHTML = '<p class="dim">无灵材</p>';
    body.appendChild(matGrid);

    // 丹药部分
    const elixirTitle = document.createElement('h4');
    elixirTitle.textContent = '丹药';
    body.appendChild(elixirTitle);
    const elixirGrid = document.createElement('div');
    elixirGrid.className = 'bag-grid';
    const elixirPrices = { juling: 30, zhuji: 80, jiejin: 200, yuanying: 350, zengshou: 150, wudao: 400 };
    Object.keys(ELIXIRS).forEach(function (id) {
      const n = S.elixirs[id] || 0;
      if (!n) return;
      const d = document.createElement('div');
      d.className = 'bag-item';
      const price = elixirPrices[id] || 50;
      d.innerHTML = '<b>' + ELIXIRS[id].name + '</b> ×' + n + '<br><span class="dim">' + ELIXIRS[id].desc + '</span><br><span class="dim">售价 ' + price + ' 灵石</span>';
      if (id === 'zengshou' || id === 'wudao') {
        var useBtn = document.createElement('button');
        useBtn.textContent = '服用';
        useBtn.onclick = function () {
          Engine.useElixir(S, id);
          log('服用【' + ELIXIRS[id].name + '】，药力化开。', 'good');
          renderBagPage();
        };
        d.appendChild(useBtn);
      }
      var sellBtn = document.createElement('button');
      sellBtn.textContent = '卖出1个';
      sellBtn.style.marginLeft = '4px';
      sellBtn.onclick = function () {
        if ((S.elixirs[id] || 0) < 1) return;
        S.elixirs[id]--;
        if (S.elixirs[id] <= 0) delete S.elixirs[id];
        S.stone += price;
        Engine.refreshStats(S); Engine.saveState(S);
        log('卖出【' + ELIXIRS[id].name + '】×1，得灵石 ' + price + '。', 'good');
        renderBagPage();
      };
      d.appendChild(sellBtn);
      elixirGrid.appendChild(d);
    });
    if (!elixirGrid.children.length) elixirGrid.innerHTML = '<p class="dim">无丹药</p>';
    body.appendChild(elixirGrid);

    // 装备部分
    if (S.inventory && S.inventory.length > 0) {
      const equipTitle = document.createElement('h4');
      equipTitle.textContent = '装备';
      body.appendChild(equipTitle);
      const equipGrid = document.createElement('div');
      equipGrid.className = 'bag-grid';
      S.inventory.forEach(function (id, idx) {
        const it = Engine.findEquip(id);
        if (!it) return;
        const d = document.createElement('div');
        d.className = 'bag-item';
        const sellPrice = Math.floor((it.price || 50) * 0.5);
        d.innerHTML = '<b>' + it.name + '</b><br><span class="dim">' + (it.desc || '') + '</span><br><span class="dim">售价 ' + sellPrice + ' 灵石</span>';
        var sellBtn = document.createElement('button');
        sellBtn.textContent = '卖出';
        sellBtn.onclick = function () {
          S.inventory.splice(idx, 1);
          S.stone += sellPrice;
          Engine.refreshStats(S); Engine.saveState(S);
          log('卖出【' + it.name + '】，得灵石 ' + sellPrice + '。', 'good');
          renderBagPage();
        };
        d.appendChild(sellBtn);
        equipGrid.appendChild(d);
      });
      body.appendChild(equipGrid);
    }

    // 功法和法宝
    const gear = document.createElement('div');
    gear.innerHTML = '<h4>功法</h4>' + (S.techs.length ? S.techs.map(function (t) {
      if (!TECHNIQUES[t]) return '';
      const g = TECHNIQUES[t].grade;
      return '<p><b style="color:' + GRADE_COLOR[g] + '">' + TECHNIQUES[t].name + '</b><span class="dim"> · ' + TECHNIQUES[t].desc + '</span></p>';
    }).join('') : '<p class="dim">无</p>') +
      '<h4>法宝</h4>' + (function () {
        var all = [];
        (S.equip.treasure || []).forEach(function (id) { if (all.indexOf(id) < 0) all.push(id); });
        (S.arts || []).forEach(function (id) { if (all.indexOf(id) < 0) all.push(id); });
        if (!all.length) return '<p class="dim">无</p>';
        return all.map(function (a) {
          if (!ARTIFACTS[a]) return '';
          var on = (S.equip.treasure || []).indexOf(a) >= 0;
          return '<p><b>' + (ARTIFACTS[a].spirit ? '［灵物］' : '') + ARTIFACTS[a].name + '</b>' + (on ? '<span style="color:#4ec9a0"> · 已装备</span>' : '<span class="dim"> · 未装备</span>') + '<span class="dim"> · ' + artEffectText(a) + '</span></p>';
        }).join('');
      })();
    body.appendChild(gear);

    $('bag-back').onclick = function () { showScreen('game'); refresh(); };
  }

  /* ---------------- 装备页 ---------------- */
  function openGear() {
    showScreen('gear');
    renderGear();
  }

  /* ---------------- 结缘系统UI ---------------- */
  function openFavor() {
    showScreen('favor');
    renderFavorPage();
  }
  function renderFavorPage() {
    const body = $('favor-body');
    body.innerHTML = '';
    if (typeof FAVOR_SYSTEM === 'undefined' || !FAVOR_SYSTEM) {
      body.appendChild(Object.assign(document.createElement('p'), { className: 'dim', textContent: '（结缘系统暂未开放，仙缘众生尽在「仙缘」页。）' }));
      return;
    }

    // 道侣部分
    if (S.flags && S.flags.daoLu) {
      body.appendChild(createFavorSection('daolu'));
    } else if (S.flags && S.flags.lin) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '与林婉儿的缘分未满，暂无法结缘。';
      body.appendChild(p);
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '尚未结识有缘人。';
      body.appendChild(p);
    }

    // 宠物部分
    if (S.flags && S.flags.pet) {
      body.appendChild(createFavorSection('pet'));
    }

    $('favor-back').onclick = function () { showScreen('game'); refresh(); };
  }

  function createFavorSection(targetId) {
    const target = FAVOR_SYSTEM[targetId];
    const favor = (S.favor && S.favor[targetId]) || 0;
    const section = document.createElement('div');
    section.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:12px;';

    const header = document.createElement('h4');
    header.style.color = '#e8c15a';
    header.textContent = target.name;
    section.appendChild(header);

    const desc = document.createElement('p');
    desc.className = 'dim';
    desc.textContent = target.desc;
    section.appendChild(desc);

    // 好感度星星
    const stars = document.createElement('div');
    stars.style.cssText = 'display:flex;gap:4px;margin:8px 0;';
    for (let i = 0; i < target.maxFavor; i++) {
      const star = document.createElement('span');
      star.style.cssText = 'font-size:20px;color:' + (i < Math.floor(favor) ? '#e8c15a' : '#3a3450');
      star.textContent = '★';
      stars.appendChild(star);
    }
    const favorText = document.createElement('span');
    favorText.style.cssText = 'margin-left:8px;color:#8a8394;font-size:12px;';
    favorText.textContent = '(' + favor.toFixed(1) + '/' + target.maxFavor + ')';
    stars.appendChild(favorText);
    section.appendChild(stars);

    // 赠送礼物
    const giftTitle = document.createElement('p');
    giftTitle.style.cssText = 'margin-top:8px;color:#c9a86a;font-size:13px;';
    giftTitle.textContent = '赠送礼物（每年一次）：';
    section.appendChild(giftTitle);

    const giftBtns = document.createElement('div');
    giftBtns.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';
    for (const giftType in target.gifts) {
      const gift = target.gifts[giftType];
      const btn = document.createElement('button');
      btn.className = 'btn-small';
      btn.textContent = gift.name + '(+' + gift.favor + ')';
      btn.onclick = function() {
        const result = Engine.giveGift(S, targetId, giftType);
        if (result.ok) {
          log(result.msg, 'good');
          openFavor();
          refresh();
        } else {
          log(result.msg, 'bad');
        }
      };
      giftBtns.appendChild(btn);
    }
    section.appendChild(giftBtns);
    return section;
  }

  /* ---------------- 修仙百艺UI（炼丹/炼器） ---------------- */
  function openCraftQueue() {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '修仙百艺';
    box.appendChild(title);

    // 炼制队列
    if (S.craftQueue && S.craftQueue.length > 0) {
      const queueDiv = document.createElement('div');
      queueDiv.style.cssText = 'background:rgba(232,193,90,0.08);border:1px solid rgba(232,193,90,0.3);border-radius:8px;padding:12px;margin-bottom:12px;';
      queueDiv.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">炼制队列</h4>';
      S.craftQueue.forEach(function(craft, index) {
        const formula = FORMULAS.find(function(f) { return f.id === craft.formulaId; });
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);';
        const name = formulaItem(formula).name;
        const yearsLeft = craft.endYear - S.year;
        item.innerHTML = '<span>' + name + '</span><span>' + (yearsLeft > 0 ? '还需' + yearsLeft + '年' : '可完成') + '</span>';
        if (yearsLeft > 0) {
          const accelBtn = document.createElement('button');
          accelBtn.className = 'btn-small';
          accelBtn.textContent = '加速';
          accelBtn.onclick = function() {
            const result = Engine.accelerateCraft(S, index);
            if (result.ok) {
              log(result.msg, 'good');
              openCraftQueue();
              refresh();
            }
          };
          item.appendChild(accelBtn);
        }
        queueDiv.appendChild(item);
      });
      box.appendChild(queueDiv);
    }

    const bi = Engine.bigIdxOf(S);
    const availableFormulas = FORMULAS.filter(function(f) { return f.needRealm <= bi; });

    // 炼丹部分
    const alchemyTitle = document.createElement('h4');
    alchemyTitle.style.cssText = 'color:#4ec9a0;margin-top:16px;margin-bottom:8px;';
    alchemyTitle.textContent = '── 炼丹 ──';
    box.appendChild(alchemyTitle);

    const alchemyFormulas = availableFormulas.filter(function(f) { return f.type === '丹'; });
    if (alchemyFormulas.length === 0) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用丹方';
      box.appendChild(p);
    } else {
      const timeReduce = (S.reinc && S.reinc.alchemyTimeReduce) || 0;
      alchemyFormulas.forEach(function(formula) {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
        const elixir = ELIXIRS[formula.out];
        const costStr = Object.keys(formula.cost).map(function(mat) {
          return MATERIALS[mat].name + '×' + formula.cost[mat];
        }).join('、');
        const actualYears = Math.max(0, formula.years - timeReduce);
        const yearsText = actualYears <= 0 ? '瞬间成丹' : '需' + actualYears + '年';
        card.innerHTML = '<h4>' + elixir.name + '</h4>' +
          '<p class="desc" style="color:#4ec9a0;">' + elixir.desc + '</p>' +
          '<p class="desc">' + formula.grade + '级 · ' + yearsText + (timeReduce > 0 ? '（丹心-' + timeReduce + '年）' : '') + '</p>' +
          '<p class="desc">材料：' + costStr + '</p>';
        const craftBtn = document.createElement('button');
        craftBtn.className = 'btn-small';
        craftBtn.textContent = '开始炼丹';
        craftBtn.onclick = function() {
          const result = Engine.startCraft(S, formula.id);
          if (result.ok) {
            log(result.msg, 'good');
            openCraftQueue();
            refresh();
          } else {
            log(result.msg, 'bad');
          }
        };
        card.appendChild(craftBtn);
        box.appendChild(card);
      });
    }

    // 炼器部分
    const forgeTitle = document.createElement('h4');
    forgeTitle.style.cssText = 'color:#b26de0;margin-top:16px;margin-bottom:8px;';
    forgeTitle.textContent = '── 炼器 ──';
    box.appendChild(forgeTitle);

    const forgeFormulas = availableFormulas.filter(function(f) { return f.type === '装备'; });
    if (forgeFormulas.length === 0) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用配方';
      box.appendChild(p);
    } else {
      const forgeTimeReduce = (S.reinc && S.reinc.forgeTimeReduce) || 0;
      forgeFormulas.forEach(function(formula) {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
        const artifact = formulaItem(formula);
        const costStr = Object.keys(formula.cost).map(function(mat) {
          return MATERIALS[mat].name + '×' + formula.cost[mat];
        }).join('、');
        const actualYears = Math.max(0, formula.years - forgeTimeReduce);
        const yearsText = actualYears <= 0 ? '瞬间成器' : '需' + actualYears + '年';
        card.innerHTML = '<h4>' + artifact.name + '</h4>' +
          '<p class="desc" style="color:#b26de0;">' + artifact.desc + '</p>' +
          '<p class="desc">效果：' + artifact.effect + '</p>' +
          '<p class="desc">' + formula.grade + '级 · ' + yearsText + (forgeTimeReduce > 0 ? '（器魂-' + forgeTimeReduce + '年）' : '') + '</p>' +
          '<p class="desc">材料：' + costStr + '</p>';
        const craftBtn = document.createElement('button');
        craftBtn.className = 'btn-small';
        craftBtn.textContent = '开始炼器';
        craftBtn.onclick = function() {
          const result = Engine.startCraft(S, formula.id);
          if (result.ok) {
            log(result.msg, 'good');
            openCraftQueue();
            refresh();
          } else {
            log(result.msg, 'bad');
          }
        };
        card.appendChild(craftBtn);
        box.appendChild(card);
      });
    }

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-small';
    closeBtn.textContent = '关闭';
    closeBtn.style.marginTop = '12px';
    closeBtn.onclick = function() { closeModal(); };
    box.appendChild(closeBtn);
  }

  /* ---------------- 事件系统UI ---------------- */
  function openEvents() {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '事件';
    box.appendChild(title);

    const events = Engine.getAvailableEvents(S);

    if (events.length === 0) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用事件';
      box.appendChild(p);
    } else {
      events.forEach(function(event) {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
        card.innerHTML = '<h4>' + event.title + '</h4><p class="desc">' + event.desc + '</p>';
        const completeBtn = document.createElement('button');
        completeBtn.className = 'btn-small';
        completeBtn.textContent = '完成事件';
        completeBtn.onclick = function() {
          const result = Engine.triggerEvent(S, event.id);
          if (result.ok) {
            log('完成事件：' + event.title, 'good');
            openEvents();
            refresh();
          }
        };
        card.appendChild(completeBtn);
        box.appendChild(card);
      });
    }

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-small';
    closeBtn.textContent = '关闭';
    closeBtn.style.marginTop = '12px';
    closeBtn.onclick = function() { closeModal(); };
    box.appendChild(closeBtn);
  }

  function advGearModal() {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';
    const prevClose = $('modal-close').onclick;
    const repaint = function () {
      $('modal-close').onclick = prevClose;
      advGearModal();
    };
    const title = document.createElement('h3');
    title.textContent = '随身行装';
    box.appendChild(title);
    const slotsBox = document.createElement('div');
    slotsBox.style.display = 'flex';
    slotsBox.style.flexWrap = 'wrap';
    slotsBox.style.gap = '6px';
    slotsBox.style.marginBottom = '8px';
    ['weapon', 'head', 'body', 'accessory'].forEach(function (slot) {
      const card = document.createElement('div');
      card.style.flex = '1 1 45%';
      card.style.border = '1px solid #2e2942';
      card.style.background = 'rgba(0,0,0,.2)';
      card.style.padding = '6px 8px';
      card.style.fontSize = '12px';
      const inst = S.equip[slot];
      const instObj = (inst && typeof inst === 'object') ? inst : (inst ? { id: inst, aff: [] } : null);
      const id = instObj ? instObj.id : null;
      if (id) {
        const it = Engine.findEquip(id);
        const tc = it ? EQUIP_TIERS[it.tier].color : '#fff';
        card.innerHTML = '<b>' + EQUIP_SLOTS[slot].name + '</b><br>' +
          '<span style="color:' + tc + '">[' + (it ? EQUIP_TIERS[it.tier].name : '') + ']' + esc(it ? it.name : '') + '</span><br>' +
          '<span class="dim">' + (it ? equipStatStr(instObj) : '') + '</span>';
      } else {
        card.innerHTML = '<b>' + EQUIP_SLOTS[slot].name + '</b><br><span class="dim">未装备</span>';
      }
      slotsBox.appendChild(card);
    });
    const maxT = Engine.maxTreasure(S);
    const treasures = Array.isArray(S.equip.treasure) ? S.equip.treasure : [];
    for (let ti = 0; ti < maxT; ti++) {
      const card = document.createElement('div');
      card.style.flex = '1 1 45%';
      card.style.border = '1px solid #2e2942';
      card.style.background = 'rgba(0,0,0,.2)';
      card.style.padding = '6px 8px';
      card.style.fontSize = '12px';
      const id = treasures[ti];
      if (id) {
        const v = Engine.treasureItem(id);
        if (v) {
          const tc = v.isArt ? ((GRADE_COLOR && GRADE_COLOR[v.grade]) || 'var(--gold)')
                             : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].color) || 'var(--gold)');
          const tierTxt = v.isArt ? v.grade : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].name) || v.tier);
          const statTxt = v.isArt ? artEffectText(id) : equipStatStr(v.item);
          card.innerHTML = '<b>法宝' + (ti + 1) + '</b><br>' +
            '<span style="color:' + tc + '">[' + tierTxt + ']' + esc(v.name) + '</span><br>' +
            '<span class="dim">' + statTxt + '</span>';
        }
      } else {
        card.innerHTML = '<b>法宝' + (ti + 1) + '</b><br><span class="dim">未装备</span>';
      }
      slotsBox.appendChild(card);
    }
    box.appendChild(slotsBox);
    if (!S.inventory.length) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '袋中无多余装备。';
      box.appendChild(p);
    }
    S.inventory.slice().forEach(function (id) {
      const it = Engine.findEquip(id);
      if (!it) return;
      const row = document.createElement('div');
      row.className = 'formula-row';
      const tc = EQUIP_TIERS[it.tier].color;
      const info = document.createElement('div');
      info.innerHTML = '<span style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</span><br>' +
        '<span class="dim" style="font-size:12px">' + equipStatStr(it) + '</span>';
      row.appendChild(info);
      const wear = document.createElement('button');
      wear.textContent = '穿戴';
      wear.className = 'btn-small';
      wear.onclick = function () {
        Engine.wearEquip(S, id);
        log('你换上了【' + it.name + '】。', 'good');
        repaint();
      };
      row.appendChild(wear);
      const sell = document.createElement('button');
      sell.textContent = '出售 ' + Math.round(it.price * 0.5);
      sell.className = 'btn-small';
      sell.onclick = function () {
        const g = Engine.sellEquip(S, id);
        log('你卖掉了【' + it.name + '】，得灵石 ' + g + '。', 'good');
        repaint();
      };
      row.appendChild(sell);
      box.appendChild(row);
    });
    // 法宝库存（S.arts）：需装备后生效
    var artInv2 = (S.arts || []).filter(function (id) {
      return Array.isArray(S.equip.treasure) && S.equip.treasure.indexOf(id) < 0;
    });
    if (artInv2.length) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '储物袋法宝（装备后生效）：';
      box.appendChild(p);
      var maxT3 = Engine.maxTreasure(S);
      var full3 = (S.equip.treasure || []).length >= maxT3;
      artInv2.forEach(function (id) {
        const v = Engine.treasureItem(id);
        if (!v) return;
        const tc = v.isArt ? ((GRADE_COLOR && GRADE_COLOR[v.grade]) || 'var(--gold)')
                           : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].color) || 'var(--gold)');
        const tierTxt = v.isArt ? v.grade : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].name) || v.tier);
        const statTxt = v.isArt ? artEffectText(id) : equipStatStr(v.item);
        const row = document.createElement('div');
        row.className = 'formula-row';
        const info = document.createElement('div');
        info.innerHTML = '<span style="color:' + tc + '">[法宝·' + tierTxt + ']' + esc(v.name) + '</span><br>' +
          '<span class="dim" style="font-size:12px">' + statTxt + '</span>';
        row.appendChild(info);
        const wear = document.createElement('button');
        wear.textContent = '装备';
        wear.className = 'btn-small';
        wear.disabled = full3;
        wear.onclick = function () {
          Engine.equipTreasureAuto(S, id);
          Engine.refreshStats(S); Engine.saveState(S);
          log('你装备了【' + v.name + '】。', 'good');
          repaint();
        };
        row.appendChild(wear);
        box.appendChild(row);
      });
    }
  }
  // 装备实例属性文案：主属性(固定) + 附加词条(随机)。inst 为 {id, aff:[{key,val}]} 或字符串 id。
  function equipStatStr(instOrIt, inst) {
    // 兼容两种调用：equipStatStr(模板) 旧用法 / equipStatStr(实例对象) 新用法
    const instObj = (instOrIt && typeof instOrIt === 'object' && instOrIt.aff !== undefined) ? instOrIt : (inst || null);
    const it = (instOrIt && instOrIt.name) ? instOrIt : (instObj ? Engine.findEquip(instObj.id) : instOrIt);
    if (!it) return '无属性加成';
    const out = [];
    // 主属性（固定）
    if (it.main) {
      const m = it.main;
      if (m.atk) out.push('攻击 +' + m.atk);
      if (m.atk2) out.push('攻击 +' + m.atk2);
      if (m.def) out.push('防御 +' + m.def);
      if (m.critPct) out.push('暴击 +' + m.critPct + '%');
      if (m.atkSpd) out.push('攻速 +' + m.atkSpd + '%');
      if (m.recover) out.push('回复 +' + m.recover + '%');
      if (m.mpPct) out.push('灵力上限 +' + m.mpPct + '%');
      if (m.hpPct) out.push('血量上限 +' + m.hpPct + '%');
    }
    // 旧式平铺属性（向后兼容法宝/剧情装备）
    if (it.hpMax) out.push('气血 +' + it.hpMax);
    if (it.atk) out.push('攻击 +' + it.atk);
    if (it.wu) out.push('悟性 +' + it.wu);
    if (it.ti) out.push('体魄 +' + it.ti);
    if (it.cult) out.push('修炼 +' + Math.round(it.cult * 100) + '%');
    // 附加词条（随机，黄色标识）
    if (instObj && Array.isArray(instObj.aff)) {
      instObj.aff.forEach(function (a) {
        const lbl = { atk: '攻击', def: '防御', critPct: '暴击', atkSpd: '攻速', recover: '回复', mpPct: '灵力上限', hpPct: '血量上限' }[a.key];
        const pct = ['critPct', 'atkSpd', 'recover', 'mpPct', 'hpPct'].indexOf(a.key) >= 0 ? '%' : '';
        if (lbl) out.push('[附]' + lbl + ' +' + a.val + pct);
      });
    }
    return out.join('，') || '无属性加成';
  }
  function renderGear() {
    const slotsBox = $('gear-slots');
    slotsBox.innerHTML = '';
    ['weapon', 'head', 'body', 'accessory'].forEach(function (slot) {
      const card = document.createElement('div');
      card.className = 'gear-slot';
      const inst = S.equip[slot];
      const instObj = (inst && typeof inst === 'object') ? inst : (inst ? { id: inst, aff: [] } : null);
      const id = instObj ? instObj.id : null;
      const it = id ? Engine.findEquip(id) : null;
      if (it) {
        const tc = EQUIP_TIERS[it.tier].color;
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5>' +
          '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
          '<div class="item-stat">' + equipStatStr(instObj) + '</div>' +
          '<div class="g-actions"><button class="btn-small">卸下</button></div>';
        card.querySelector('button').onclick = function () {
          S.equip[slot] = null;
          S.inventory.push(instObj);
          Engine.refreshStats(S); Engine.saveState(S);
          log('你卸下了【' + it.name + '】。', 'dim');
          renderGear();
        };
      } else {
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5><div class="empty">未装备</div>';
      }
      slotsBox.appendChild(card);
    });
    const maxT = Engine.maxTreasure(S);
    const treasures = Array.isArray(S.equip.treasure) ? S.equip.treasure : [];
    for (let ti = 0; ti < maxT; ti++) {
      const card = document.createElement('div');
      card.className = 'gear-slot';
      const id = treasures[ti];
      if (id) {
        const v = Engine.treasureItem(id);
        if (v) {
          const tc = v.isArt ? ((GRADE_COLOR && GRADE_COLOR[v.grade]) || 'var(--gold)')
                             : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].color) || 'var(--gold)');
          const tierTxt = v.isArt ? v.grade : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].name) || v.tier);
          const statTxt = v.isArt ? artEffectText(id) : equipStatStr(v.item);
          card.innerHTML = '<h5>法宝' + (ti + 1) + '</h5>' +
            '<div class="item-name" style="color:' + tc + '">[' + tierTxt + ']' + esc(v.name) + '</div>' +
            '<div class="item-stat">' + statTxt + '</div>' +
            '<div class="g-actions"><button class="btn-small">卸下</button></div>';
          card.querySelector('button').onclick = function () {
            Engine.unequipTreasure(S, id);
            log('你卸下了【' + v.name + '】。', 'dim');
            renderGear();
          };
        }
      } else {
        card.innerHTML = '<h5>法宝' + (ti + 1) + '</h5><div class="empty">未装备</div>';
      }
      slotsBox.appendChild(card);
    }
    const inv = $('gear-inv');
    inv.innerHTML = '';
    if (!S.inventory.length) {
      inv.innerHTML = '<p class="dim">袋中无多余装备。</p>';
    }
    // 按部位分组：武器/头/身/饰物/法宝，组内按品级从高到低
    var INV_SLOT_META = {
      weapon: { name: '武器', icon: '⚔' },
      head: { name: '头部', icon: '⛑' },
      body: { name: '身体', icon: '🥋' },
      accessory: { name: '饰物', icon: '💍' },
      treasure: { name: '法宝', icon: '🔮' }
    };
    var groups = {};
    S.inventory.forEach(function (inst) {
      const instObj = (inst && typeof inst === 'object') ? inst : { id: inst, aff: [] };
      const it = Engine.findEquip(instObj.id);
      if (!it) return;
      var slot = 'treasure';
      Object.keys(EQUIPS).some(function (sk) {
        if (EQUIPS[sk][instObj.id]) { slot = sk; return true; }
        return false;
      });
      if (!groups[slot]) groups[slot] = [];
      groups[slot].push({ inst: instObj, it: it });
    });
    ['weapon', 'head', 'body', 'accessory', 'treasure'].forEach(function (slot) {
      var items = groups[slot];
      if (!items || !items.length) return;
      items.sort(function (a, b) { return (b.it.tier || 0) - (a.it.tier || 0); });
      var head = document.createElement('h5');
      head.style.cssText = 'margin:10px 0 4px;color:#c9a86a;letter-spacing:2px;';
      head.textContent = '── ' + INV_SLOT_META[slot].name + '（' + items.length + '）──';
      inv.appendChild(head);
      // 同名合并显示：×n
      var merged = [];
      items.forEach(function (x) {
        var last = merged[merged.length - 1];
        if (last && last.id === x.inst.id) last.n++;
        else merged.push({ id: x.inst.id, inst: x.inst, it: x.it, n: 1 });
      });
      merged.forEach(function (x) {
        const it = x.it;
        const tc = EQUIP_TIERS[it.tier].color;
        const d = document.createElement('div');
        d.className = 'gear-item';
        d.innerHTML = '<div style="color:' + tc + '">[' + INV_SLOT_META[slot].name + '·' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + (x.n > 1 ? ' ×' + x.n : '') + '</div>' +
          '<div class="dim" style="font-size:12px">' + equipStatStr(x.inst) + '</div>' +
          '<div class="g-actions">' +
          '<button>穿戴</button><button>出售一件 ' + Math.round(it.price * 0.5) + ' 灵石</button>' +
          (x.n > 1 ? '<button class="ghost">全部出售 ' + x.n + '件→' + Math.round(it.price * 0.5) * x.n + '</button>' : '') +
          '</div>';
        const btns = d.querySelectorAll('button');
        btns[0].onclick = function () {
          Engine.wearEquip(S, x.inst);
          log('你换上了【' + it.name + '】。', 'good');
          renderGear();
        };
        btns[1].onclick = function () {
          const g = Engine.sellEquip(S, x.inst);
          if (g === false) { log('没有可出售的【' + it.name + '】。', 'bad'); return; }
          log('你卖掉了一件【' + it.name + '】，得灵石 ' + g + '。（已穿戴的不受影响）', 'good');
          renderGear();
        };
        if (btns[2]) {
          btns[2].onclick = function () {
            const r = Engine.sellEquipAll(S, x.inst);
            if (!r) { log('没有可出售的【' + it.name + '】。', 'bad'); return; }
            log('你卖掉了 ' + r.count + ' 件【' + it.name + '】，共得灵石 ' + r.gain + '。（已穿戴的不受影响）', 'good');
            renderGear();
          };
        }
        inv.appendChild(d);
      });
    });
    // 法宝库存（S.arts）：统一为装备型，需装备后生效
    var artInv = (S.arts || []).filter(function (id) {
      return Array.isArray(S.equip.treasure) && S.equip.treasure.indexOf(id) < 0;
    });
    if (artInv.length) {
      var ahead = document.createElement('h5');
      ahead.style.cssText = 'margin:10px 0 4px;color:#c9a86a;letter-spacing:2px;';
      ahead.textContent = '── 法宝（' + artInv.length + '，装备后生效）──';
      inv.appendChild(ahead);
      var maxT2 = Engine.maxTreasure(S);
      var full2 = (S.equip.treasure || []).length >= maxT2;
      artInv.forEach(function (id) {
        const v = Engine.treasureItem(id);
        if (!v) return;
        const tc = v.isArt ? ((GRADE_COLOR && GRADE_COLOR[v.grade]) || 'var(--gold)')
                           : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].color) || 'var(--gold)');
        const tierTxt = v.isArt ? v.grade : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].name) || v.tier);
        const statTxt = v.isArt ? artEffectText(id) : equipStatStr(v.item);
        const d = document.createElement('div');
        d.className = 'gear-item';
        d.innerHTML = '<div style="color:' + tc + '">[法宝·' + tierTxt + ']' + esc(v.name) + '</div>' +
          '<div class="dim" style="font-size:12px">' + statTxt + '</div>' +
          '<div class="g-actions"><button' + (full2 ? ' disabled' : '') + '>装备</button></div>';
        if (!full2) d.querySelector('button').onclick = function () {
          Engine.equipTreasureAuto(S, id);
          Engine.refreshStats(S); Engine.saveState(S);
          log('你装备了【' + v.name + '】。', 'good');
          renderGear();
        };
        inv.appendChild(d);
      });
    }
    const hb = $('sell-herb');
    const ib = $('sell-iron');
    // 汇总灵草灵铁
    var totalHerb = Object.keys(S.materials || {}).filter(function(k) { return k.startsWith('herb'); }).reduce(function(a, k) { return a + (S.materials[k] || 0); }, 0);
    var totalIron = Object.keys(S.materials || {}).filter(function(k) { return k.startsWith('iron'); }).reduce(function(a, k) { return a + (S.materials[k] || 0); }, 0);
    hb.textContent = '灵草 5株 → 20灵石（现有 ' + totalHerb + '）';
    ib.textContent = '灵铁 5块 → 30灵石（现有 ' + totalIron + '）';
    hb.disabled = totalHerb < 5;
    ib.disabled = totalIron < 5;
    hb.onclick = function () {
      const g = Engine.sellMaterial(S, 'herb', 5);
      log('你出售了 5 株灵草，得灵石 ' + g + '。', 'good');
      renderGear();
    };
    ib.onclick = function () {
      const g = Engine.sellMaterial(S, 'iron', 5);
      log('你出售了 5 块灵铁，得灵石 ' + g + '。', 'good');
      renderGear();
    };
    $('gear-back').onclick = function () { showScreen('game'); refresh(); };
  }

  /* ---------------- 炼丹 / 炼器 / 储物袋 ---------------- */
  function craftBatch(f, kind) {
    const run = kind === 'alchemy' ? function () { return Engine.doAlchemy(S, f); } : function () { return Engine.doForge(S, f); };
    var costKey = Object.keys(f.cost)[0];
    const hasMat = function () { return (S.materials[costKey] || 0) >= f.cost[costKey]; };
    let n = 0, okN = 0;
    while (hasMat()) {
      const r = run();
      n++;
      if (r.ok) { okN++; sfx('good'); }
      log(r.msg, r.ok ? 'good' : 'bad');
    }
    if (n) {
      log('连炼 ' + n + ' 炉：成 ' + okN + ' 炉，材料耗尽，你收了炉火。', 'dim');
      refresh();
    } else {
      log('火候未温，材料已见了底。', 'bad');
    }
  }
  function equipById(id) {
    for (const slot in EQUIPS) if (EQUIPS[slot][id]) return EQUIPS[slot][id];
    return null;
  }
  function formulaItem(f) {
    if (f.type === '丹') return { name: ELIXIRS[f.out].name, desc: ELIXIRS[f.out].desc, effect: '' };
    // 装备配方（slot+sub 结构）：展示子类名 + 主属性说明
    if (f.slot && f.sub) {
      const slotName = (EQUIP_SLOTS[f.slot] && EQUIP_SLOTS[f.slot].name) || f.slot;
      let effect = '';
      // 从该 slot+sub 取一个代表性模板，展示主属性
      const rep = (function () {
        const bucket = EQUIPS[f.slot]; if (!bucket) return null;
        for (const id in bucket) { if (bucket[id].sub === f.sub) return bucket[id]; }
        return null;
      })();
      if (rep && rep.main) {
        const parts = [];
        if (rep.main.atk) parts.push('攻击+' + rep.main.atk);
        if (rep.main.atk2) parts.push('攻击+' + rep.main.atk2);
        if (rep.main.def) parts.push('防御+' + rep.main.def);
        if (rep.main.critPct) parts.push('暴击+' + rep.main.critPct + '%');
        if (rep.main.atkSpd) parts.push('攻速+' + rep.main.atkSpd + '%');
        if (rep.main.recover) parts.push('回复+' + rep.main.recover + '%');
        if (rep.main.hpPct) parts.push('血量上限+' + rep.main.hpPct + '%');
        if (rep.main.mpPct) parts.push('灵力上限+' + rep.main.mpPct + '%');
        effect = parts.join('、');
      }
      return { name: f.sub + '（' + slotName + '·' + f.grade + '）', desc: '主属性：' + (effect || '无') + '｜附加词条随机', effect: effect };
    }
    const eq = equipById(f.out);
    if (eq) {
      let effect = '';
      if (eq.atk) effect += '攻击 +' + eq.atk + '；';
      if (eq.hpMax) effect += '气血 +' + eq.hpMax + '；';
      if (eq.cult) effect += '修炼 +' + Math.round(eq.cult * 100) + '%';
      if (eq.stoneDef) effect += '每100灵石防御+1%，上限300%';
      return { name: eq.name, desc: eq.desc, effect: effect };
    }
    if (ARTIFACTS[f.out]) return { name: ARTIFACTS[f.out].name, desc: ARTIFACTS[f.out].desc, effect: ARTIFACTS[f.out].effect };
    return { name: f.out, desc: '', effect: '' };
  }
  function openModal(kind) {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';
    if (kind === 'alchemy') {
      const title = document.createElement('h3');
      title.textContent = '鼎炉 · 以灵草成丹';
      box.appendChild(title);
      Engine.alchemyChoices(S).forEach(function (f) {
        const row = document.createElement('div');
        row.className = 'formula-row';
        row.innerHTML = '<div><b>[' + ELIXIRS[f.out].name + ']</b><br><span class="dim">' + ELIXIRS[f.out].desc + '</span></div>' +
          '<button>灵草' + f.cost.herb + ' → 炼</button>' +
          '<button class="ghost">连炼至材尽</button>';
        const btns = row.querySelectorAll('button');
        btns[0].onclick = function () {
          const r = Engine.doAlchemy(S, f);
          log(r.msg, r.ok ? 'good' : 'bad');
          refresh();
        };
        btns[1].onclick = function () {
          if (S.herb < f.cost.herb) { log('灵草不足，炼不得。', 'bad'); return; }
          craftBatch(f, 'alchemy');
        };
        box.appendChild(row);
      });
    } else if (kind === 'forge') {
      const title = document.createElement('h3');
      title.textContent = '铸炉 · 以灵铁炼器';
      box.appendChild(title);
      Engine.forgeChoices(S).forEach(function (f) {
        const row = document.createElement('div');
        row.className = 'formula-row';
        const costKey = Object.keys(f.cost)[0];
        const matName = MATERIALS[costKey] ? MATERIALS[costKey].name : costKey;
        row.innerHTML = '<div><b>[' + formulaItem(f).name + ']</b><br><span class="dim">' + formulaItem(f).desc + '｜' + formulaItem(f).effect + '</span></div>' +
          '<button>' + matName + f.cost[costKey] + ' → 炼</button>' +
          '<button class="ghost">连炼至材尽</button>';
        const btns = row.querySelectorAll('button');
        btns[0].onclick = function () {
          const r = Engine.doForge(S, f);
          log(r.msg, r.ok ? 'good' : 'bad');
          refresh();
        };
        btns[1].onclick = function () {
          if ((S.materials[costKey] || 0) < f.cost[costKey]) { log(matName + '不足，炼不得。', 'bad'); return; }
          craftBatch(f, 'forge');
        };
        box.appendChild(row);
      });
    } else if (kind === 'arts') {
      const title = document.createElement('h3');
      title.textContent = '修仙百艺 · 业精于勤';
      box.appendChild(title);
      box.appendChild(artTabs('modal-arts'));
      const body = document.createElement('div');
      body.id = 'modal-arts-body';
      box.appendChild(body);
      renderArtsTab('alchemy', body);
    } else if (kind === 'bag') {
      if (!S.materials) S.materials = {};
      const title = document.createElement('h3');
      title.textContent = '储物袋';
      box.appendChild(title);

      // 灵材部分
      const matTitle = document.createElement('h4');
      matTitle.textContent = '灵材';
      box.appendChild(matTitle);
      const matGrid = document.createElement('div');
      matGrid.className = 'bag-grid';
      const matKeys = ['herb_huang', 'herb_xuan', 'herb_di', 'herb_tian', 'iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
      const sellPrices = { herb_huang: 4, herb_xuan: 8, herb_di: 15, herb_tian: 30, iron_huang: 6, iron_xuan: 12, iron_di: 22, iron_tian: 45 };
      matKeys.forEach(function (key) {
        var n = S.materials[key] || 0;
        if (!n) return;
        var d = document.createElement('div');
        d.className = 'bag-item';
        d.innerHTML = '<b>' + MATERIALS[key].name + '</b> ×' + n + '<br><span class="dim">售价 ' + sellPrices[key] + ' 灵石/个</span><br><button>卖出1个</button><button>卖出全部</button>';
        var btns = d.querySelectorAll('button');
        btns[0].onclick = function () {
          if (S.materials[key] < 1) return;
          S.materials[key]--;
          S.stone += sellPrices[key];
          Engine.refreshStats(S); Engine.saveState(S);
          log('卖出' + MATERIALS[key].name + ' ×1，得灵石 ' + sellPrices[key] + '。', 'good');
          openModal('bag'); refresh();
        };
        btns[1].onclick = function () {
          var amount = S.materials[key] || 0;
          if (amount < 1) return;
          S.materials[key] = 0;
          S.stone += amount * sellPrices[key];
          Engine.refreshStats(S); Engine.saveState(S);
          log('卖出' + MATERIALS[key].name + ' ×' + amount + '，得灵石 ' + (amount * sellPrices[key]) + '。', 'good');
          openModal('bag'); refresh();
        };
        matGrid.appendChild(d);
      });
      // 灵石显示
      var stoneD = document.createElement('div');
      stoneD.className = 'bag-item';
      stoneD.innerHTML = '<b>灵石</b> ×' + (S.stone || 0);
      matGrid.appendChild(stoneD);
      if (!matGrid.children.length) matGrid.innerHTML = '<p class="dim">无灵材</p>';
      box.appendChild(matGrid);

      // 丹药部分
      const elixirTitle = document.createElement('h4');
      elixirTitle.textContent = '丹药';
      box.appendChild(elixirTitle);
      const bag = document.createElement('div');
      bag.className = 'bag-grid';
      const elixirPrices = { juling: 30, zhuji: 80, jiejin: 200, yuanying: 350, zengshou: 150, wudao: 400 };
      Object.keys(ELIXIRS).forEach(function (id) {
        const n = S.elixirs[id] || 0;
        if (!n) return;
        const d = document.createElement('div');
        d.className = 'bag-item';
        const price = elixirPrices[id] || 50;
        d.innerHTML = '<b>' + ELIXIRS[id].name + '</b> ×' + n + '<br><span class="dim">' + ELIXIRS[id].desc + '</span><br><span class="dim">售价 ' + price + ' 灵石</span>';
        // 服用按钮
        if (id === 'zengshou' || id === 'wudao') {
          var useBtn = document.createElement('button');
          useBtn.textContent = '服用';
          useBtn.onclick = function () {
            Engine.useElixir(S, id);
            log('服用【' + ELIXIRS[id].name + '】，药力化开。', 'good');
            openModal('bag'); refresh();
          };
          d.appendChild(useBtn);
        }
        // 卖出按钮
        var sellBtn = document.createElement('button');
        sellBtn.textContent = '卖出1个';
        sellBtn.style.marginLeft = '4px';
        sellBtn.onclick = function () {
          if ((S.elixirs[id] || 0) < 1) return;
          S.elixirs[id]--;
          if (S.elixirs[id] <= 0) delete S.elixirs[id];
          S.stone += price;
          Engine.refreshStats(S); Engine.saveState(S);
          log('卖出【' + ELIXIRS[id].name + '】×1，得灵石 ' + price + '。', 'good');
          openModal('bag'); refresh();
        };
        d.appendChild(sellBtn);
        bag.appendChild(d);
      });
      if (!bag.children.length) bag.innerHTML = '<p class="dim">无丹药</p>';
      box.appendChild(bag);

      // 装备部分
      if (S.inventory && S.inventory.length > 0) {
        const equipTitle = document.createElement('h4');
        equipTitle.textContent = '装备';
        box.appendChild(equipTitle);
        const equipGrid = document.createElement('div');
        equipGrid.className = 'bag-grid';
        S.inventory.forEach(function (id, idx) {
          const it = Engine.findEquip(id);
          if (!it) return;
          const d = document.createElement('div');
          d.className = 'bag-item';
          const sellPrice = Math.floor((it.price || 50) * 0.5);
          d.innerHTML = '<b>' + it.name + '</b><br><span class="dim">' + (it.desc || '') + '</span><br><span class="dim">售价 ' + sellPrice + ' 灵石</span>';
          var sellBtn = document.createElement('button');
          sellBtn.textContent = '卖出';
          sellBtn.onclick = function () {
            S.inventory.splice(idx, 1);
            S.stone += sellPrice;
            Engine.refreshStats(S); Engine.saveState(S);
            log('卖出【' + it.name + '】，得灵石 ' + sellPrice + '。', 'good');
            openModal('bag'); refresh();
          };
          d.appendChild(sellBtn);
          equipGrid.appendChild(d);
        });
        box.appendChild(equipGrid);
      }

      // 功法和法宝
      const gear = document.createElement('div');
      gear.innerHTML = '<h4>功法</h4>' + (S.techs.length ? S.techs.map(function (t) {
        if (!TECHNIQUES[t]) return '';
        const g = TECHNIQUES[t].grade;
        return '<p><b style="color:' + GRADE_COLOR[g] + '">' + TECHNIQUES[t].name + '</b><span class="dim"> · ' + TECHNIQUES[t].desc + '</span></p>';
      }).join('') : '<p class="dim">无</p>') +
        '<h4>法宝</h4>' + (function () {
          var all = [];
          (S.equip.treasure || []).forEach(function (id) { if (all.indexOf(id) < 0) all.push(id); });
          (S.arts || []).forEach(function (id) { if (all.indexOf(id) < 0) all.push(id); });
          if (!all.length) return '<p class="dim">无</p>';
          return all.map(function (a) {
            if (!ARTIFACTS[a]) return '';
            var on = (S.equip.treasure || []).indexOf(a) >= 0;
            return '<p><b>' + (ARTIFACTS[a].spirit ? '［灵物］' : '') + ARTIFACTS[a].name + '</b>' + (on ? '<span style="color:#4ec9a0"> · 已装备</span>' : '<span class="dim"> · 未装备</span>') + '<span class="dim"> · ' + artEffectText(a) + '</span></p>';
          }).join('');
        })();
      box.appendChild(gear);
    }
  }
  function closeModal() {
    $('modal').style.display = 'none';
    if (S && S.inArts) {
      S.inArts = false;
      afterAction();
    }
  }

  /* ---------------- 修仙百艺（炼丹/炼器/灵田/灵矿） ---------------- */
  const ART_TABS = [['alchemy', '炼丹'], ['forge', '炼器'], ['land', '灵田'], ['mine', '灵矿']];
  function artTabs(id) {
    const wrap = document.createElement('div');
    wrap.className = 'arts-tabs';
    ART_TABS.forEach(function (t) {
      const b = document.createElement('button');
      b.textContent = t[1];
      b.className = 'tab';
      b.onclick = function () {
        renderArtsTab(t[0], $(id + '-body'));
        wrap.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
      wrap.appendChild(b);
    });
    return wrap;
  }
  function renderArtsTab(kind, body) {
    body.innerHTML = '';
    if (kind === 'alchemy') {
      if (!S.materials) S.materials = {};
      const t = document.createElement('h4');
      t.textContent = '鼎炉 · 以灵草成丹';
      body.appendChild(t);
      const list = document.createElement('div');
      Engine.alchemyChoices(S).forEach(function (f) {
        const rowEl = document.createElement('div');
        rowEl.className = 'formula-row';
        rowEl.innerHTML = '<div><b>[' + ELIXIRS[f.out].name + ']</b><br><span class="dim">' + ELIXIRS[f.out].desc + '</span></div>' +
          '<button>' + costStr(f.cost) + ' → 炼</button>' +
          '<button class="ghost">连炼至材尽</button>';
        const btns = rowEl.querySelectorAll('button');
        btns[0].onclick = function () {
          const r = Engine.doAlchemy(S, f);
          log(r.msg, r.ok ? 'good' : 'bad');
          refresh();
        };
        btns[1].onclick = function () {
          var costKey = Object.keys(f.cost)[0];
          if ((S.materials[costKey] || 0) < f.cost[costKey]) { log(MATERIALS[costKey].name + '不足，炼不得。', 'bad'); return; }
          craftBatch(f, 'alchemy');
        };
        list.appendChild(rowEl);
      });
      body.appendChild(list);
      return;
    }
    if (kind === 'forge') {
      if (!S.materials) S.materials = {};
      const t = document.createElement('h4');
      t.textContent = '铸炉 · 以灵铁炼器';
      body.appendChild(t);
      const list = document.createElement('div');
      Engine.forgeChoices(S).forEach(function (f) {
        const rowEl = document.createElement('div');
        rowEl.className = 'formula-row';
        rowEl.innerHTML = '<div><b>[' + formulaItem(f).name + ']</b><br><span class="dim">' + formulaItem(f).desc + '｜' + formulaItem(f).effect + '</span></div>' +
          '<button>' + costStr(f.cost) + ' → 炼</button>' +
          '<button class="ghost">连炼至材尽</button>';
        const btns = rowEl.querySelectorAll('button');
        btns[0].onclick = function () {
          const r = Engine.doForge(S, f);
          log(r.msg, r.ok ? 'good' : 'bad');
          refresh();
        };
        btns[1].onclick = function () {
          var costKey = Object.keys(f.cost)[0];
          if ((S.materials[costKey] || 0) < f.cost[costKey]) { log(MATERIALS[costKey].name + '不足，炼不得。', 'bad'); return; }
          craftBatch(f, 'forge');
        };
        list.appendChild(rowEl);
      });
      body.appendChild(list);
      return;
    }
    if (kind === 'land') {
      if (!S.materials) S.materials = {};
      const plots = fieldPlots(S);
      const usedFields = plots.filter(function(p) { return p !== null; }).length;
      const maxFields = Engine.getMaxFields(S);
      const t = document.createElement('h4');
      t.textContent = '灵田 · 已用 ' + usedFields + '/' + maxFields + ' 亩';
      body.appendChild(t);

      // 显示已有灵田
      if (plots.length > 0) {
        const plotsDiv = document.createElement('div');
        plots.forEach(function (p, i) {
          if (p === null) {
            // 空闲灵田槽位
            const emptyEl = document.createElement('div');
            emptyEl.className = 'formula-row';
            emptyEl.innerHTML = '<div><b>[空闲灵田]</b><br><span class="dim">可在此播种</span></div>';
            plotsDiv.appendChild(emptyEl);
          } else {
            const fi = Engine.fieldInfo(S, i);
            const rowEl = document.createElement('div');
            rowEl.className = 'formula-row';
            rowEl.innerHTML = '<div><b>[' + fi.name + ']</b><br><span class="dim">' + fi.desc + '<br>已种 ' + fi.years + '/' + fi.needYears + ' 年（' + (p.quantity || 1) + '株）' + (fi.done ? ' · 可采收' : '') + '</span></div>' +
              (fi.done ? '<button>采收</button>' : '<button disabled>未成熟</button>');
            rowEl.querySelector('button').onclick = function () {
              const r = Engine.harvestField(S, i);
              log(r, 'good');
              renderArtsTab('land', body);
              refresh();
            };
            plotsDiv.appendChild(rowEl);
          }
        });
        body.appendChild(plotsDiv);
      }

      // 解锁灵田按钮
      if (plots.length < maxFields) {
        const unlockDiv = document.createElement('div');
        unlockDiv.style.cssText = 'margin: 12px 0; padding: 8px; background: rgba(232,193,90,0.1); border: 1px solid rgba(232,193,90,0.3); border-radius: 4px;';
        var unlockCost = plots.length === 0 ? 100 : 200;
        unlockDiv.innerHTML = '<span style="color: #e8c15a;">解锁新灵田</span> <span class="dim">（' + unlockCost + ' 灵石）</span>';
        const unlockBtn = document.createElement('button');
        unlockBtn.className = 'btn-small';
        unlockBtn.textContent = '解锁';
        unlockBtn.disabled = S.stone < unlockCost;
        unlockBtn.onclick = function() {
          const r = Engine.unlockField(S);
          log(r.msg, r.ok ? 'good' : 'bad');
          renderArtsTab('land', body);
          refresh();
        };
        unlockDiv.appendChild(unlockBtn);
        body.appendChild(unlockDiv);
      }

      // 播种区域（买苗：须境界达标；自备下种见主百艺页）
      const h5 = document.createElement('h4');
      h5.textContent = '播种（灵石买苗）';
      body.appendChild(h5);
      const seeds = document.createElement('div');
      Object.keys(FIELD_SEEDS).forEach(function (id) {
        const sd = FIELD_SEEDS[id];
        const fb = Engine.fieldPlantable(S, id);
        const rowEl = document.createElement('div');
        rowEl.className = 'formula-row';
        rowEl.innerHTML = '<div><b>[' + sd.name + ']</b><br><span class="dim">' + sd.desc + '</span></div>';
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 4px;';
        const mkB = function (q) {
          const b = document.createElement('button');
          b.className = 'btn-small';
          const need = sd.stone * q;
          b.textContent = '买' + q + '株·' + need + '灵石';
          b.disabled = !fb.canBuy || S.stone < need;
          b.onclick = function () {
            const r = Engine.plantField(S, id, q, 'buy');
            log(r, (typeof r === 'string' && r.indexOf('你翻土') === 0) ? 'good' : 'bad');
            renderArtsTab('land', body);
            refresh();
          };
          btnGroup.appendChild(b);
        };
        mkB(1); mkB(3); mkB(6);
        rowEl.appendChild(btnGroup);
        seeds.appendChild(rowEl);
      });
      body.appendChild(seeds);
      return;
    }
    if (kind === 'mine') {
      if (!S.materials) S.materials = {};
      const bi = Engine.bigIdxOf(S);
      const ironGrades = ['黄', '玄', '地', '天'];
      const ironKeys = ['iron_huang', 'iron_xuan', 'iron_di', 'iron_tian'];
      const ironKey = ironKeys[bi] || 'iron_huang';
      const ironGrade = ironGrades[bi] || '黄';
      const ironName = MATERIALS[ironKey] ? MATERIALS[ironKey].name : '黄级灵铁';

      const t = document.createElement('h4');
      t.textContent = '灵矿 · ' + ironGrade + '级矿脉';
      body.appendChild(t);
      const list = document.createElement('div');

      // 挖矿三日
      const row1 = document.createElement('div');
      row1.className = 'formula-row';
      row1.innerHTML = '<div><b>[挖矿三日]</b><br><span class="dim">抡锤三日，换取灵铁。气血 -100</span></div><button>' + ironName + ' ×10</button>';
      row1.querySelector('button').onclick = function () {
        if (!Engine.canAction(S, 1)) { log('行动点不足。'); return; }
        if (S.hp <= 100) { log('气血不足，无法挖矿。'); return; }
        Engine.spend(S, 1);
        S.hp -= 100;
        S.materials[ironKey] = (S.materials[ironKey] || 0) + 10;
        Engine.refreshStats(S);
        Engine.saveState(S);
        log('你挖矿三日，得' + ironName + ' ×10，气血 -100。', 'good');
        renderArtsTab('mine', body);
        refresh();
      };
      list.appendChild(row1);

      // 挖矿到极限
      const row2 = document.createElement('div');
      row2.className = 'formula-row';
      row2.innerHTML = '<div><b>[挖矿到极限]</b><br><span class="dim">拼命挖掘，榨干每一分气血。每100气血换10灵铁</span></div><button>极限开采</button>';
      row2.querySelector('button').onclick = function () {
        if (!Engine.canAction(S, 1)) { log('行动点不足。'); return; }
        if (S.hp <= 100) { log('气血不足，无法挖矿。'); return; }
        Engine.spend(S, 1);
        const maxIron = Math.floor((S.hp - 1) / 100) * 10;
        const hpCost = Math.floor(maxIron / 10) * 100;
        S.hp -= hpCost;
        S.materials[ironKey] = (S.materials[ironKey] || 0) + maxIron;
        Engine.refreshStats(S);
        Engine.saveState(S);
        log('你挖矿到极限，得' + ironName + ' ×' + maxIron + '，气血 -' + hpCost + '。', 'good');
        renderArtsTab('mine', body);
        refresh();
      };
      list.appendChild(row2);

      body.appendChild(list);
      return;
    }
  }
  function fieldList(S) {
    const out = [];
    (S.field || []).forEach(function (p, i) {
      if (p === null) return; // 跳过空闲槽位
      const fi = Engine.fieldInfo(S, i);
      if (fi) out.push(fi);
    });
    return out;
  }
  function fieldPlots(S) {
    return S.field || (S.field = []);
  }
  function costStr(c) {
    const out = [];
    for (var key in c) {
      if (key === 'stone') out.push('灵石' + c[key]);
      else if (MATERIALS[key]) out.push(MATERIALS[key].name + c[key]);
      else if (key === 'herb') out.push('灵草' + c[key]);
      else if (key === 'iron') out.push('灵铁' + c[key]);
    }
    return out.join('+');
  }
  function renderCraftsPage() {
    showScreen('crafts');
    const body = $('crafts-body');
    body.innerHTML = '';
    body.appendChild(artTabs('crafts-tab'));
    const pad = document.createElement('div');
    pad.id = 'crafts-tab-body';
    pad.className = 'crafts-body';
    body.appendChild(pad);
    renderArtsTab('alchemy', pad);
    $('crafts-back') && ($('crafts-back').onclick = function () { showScreen('game'); refresh(); });
    refresh();
  }
  function closeAllOverlays() {
    $('modal').style.display = 'none';
    $('pause').style.display = 'none';
  }

  /* ---------------- 锻体系统UI（未实装） ---------------- */
  function showPlantSelect(fieldIdx) {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    ov.onclick = function (e) { if (e.target === ov) closeModal(); };
    box.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '灵田' + (fieldIdx + 1) + ' · 选苗下种';
    box.appendChild(title);
    const tip = document.createElement('p');
    tip.className = 'dim';
    tip.textContent = '灵石买苗（须境界达标）或自备同等级灵草下种（不限境界）。株数 1/3/6。';
    tip.style.marginBottom = '12px';
    box.appendChild(tip);

    Object.keys(FIELD_SEEDS).forEach(function(id) {
      const sd = FIELD_SEEDS[id];
      const fb = Engine.fieldPlantable(S, id);
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
      card.innerHTML = '<h4 style="color:#90e8b0;">' + sd.name + '</h4>' +
        '<p class="desc">' + sd.desc + '</p>' +
        '<p class="desc">' + (fb.canBuy ? '' : '<span style="color:#e05a7a;">灵石买苗需' + fb.buyMsg + '以上　</span>') +
        '自备' + fb.herbName + '×' + sd.herb + '/株可下种</p>';
      const QS = [1, 3, 6];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';
      // 灵石买苗按钮（境界达标才可）
      QS.forEach(function (q) {
        const b = document.createElement('button');
        b.className = 'btn-small';
        const need = sd.stone * q;
        b.textContent = '买' + q + '株·' + need + '灵石';
        b.disabled = !fb.canBuy || S.stone < need;
        b.onclick = function () {
          const r = Engine.plantField(S, id, q, 'buy');
          log(r, (typeof r === 'string' && r.indexOf('你翻土') === 0) ? 'good' : 'bad');
          closeModal(); renderBaiyiPage('land'); refresh();
        };
        row.appendChild(b);
      });
      // 自备下种按钮
      QS.forEach(function (q) {
        const b = document.createElement('button');
        b.className = 'btn-small ghost';
        const need = sd.herb * q;
        b.textContent = '自备种' + q + '株·' + fb.herbName + '×' + need;
        b.disabled = (S.materials[fb.ownHerbKey] || 0) < need;
        b.onclick = function () {
          const r = Engine.plantField(S, id, q, 'own');
          log(r, (typeof r === 'string' && r.indexOf('你翻土') === 0) ? 'good' : 'bad');
          closeModal(); renderBaiyiPage('land'); refresh();
        };
        row.appendChild(b);
      });
      card.appendChild(row);
      box.appendChild(card);
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-small';
    closeBtn.textContent = '取消';
    closeBtn.style.marginTop = '12px';
    closeBtn.onclick = function() { closeModal(); };
    box.appendChild(closeBtn);
  }

  function showBaiyi() {
    showScreen('crafts');
    renderBaiyiPage();
  }
  function renderBaiyiPage(initialTab) {
    const body = $('crafts-body');
    if (!body) return;
    body.innerHTML = '';
    initialTab = initialTab || 'alchemy';

    // 炼制队列（页头，炼丹/炼器共享，跨板块可见）
    if (S.craftQueue && S.craftQueue.length > 0) {
      const queueDiv = document.createElement('div');
      queueDiv.style.cssText = 'background:rgba(232,193,90,0.08);border:1px solid rgba(232,193,90,0.3);border-radius:8px;padding:12px;margin-bottom:12px;';
      queueDiv.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">炼制队列</h4>';
      S.craftQueue.forEach(function(craft, index) {
        const formula = FORMULAS.find(function(f) { return f.id === craft.formulaId; });
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);';
        const name = formulaItem(formula).name;
        const yearsLeft = craft.endYear - S.year;
        item.innerHTML = '<span>' + name + '</span><span>' + (yearsLeft > 0 ? '还需' + yearsLeft + '年' : '可完成') + '</span>';
        if (yearsLeft > 0) {
          const accelBtn = document.createElement('button');
          accelBtn.className = 'btn-small';
          accelBtn.textContent = '加速';
          accelBtn.onclick = function() {
            const result = Engine.accelerateCraft(S, index);
            if (result.ok) {
              log(result.msg, 'good');
              renderBaiyiPage();
              refresh();
            }
          };
          item.appendChild(accelBtn);
        }
        queueDiv.appendChild(item);
      });
      body.appendChild(queueDiv);
    }

    // 分板块 tab（炼丹 / 炼器 / 灵田 / 灵矿 / 研习）
    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'arts-tabs';
    const TABS = [['alchemy', '炼丹'], ['forge', '炼器'], ['land', '灵田'], ['mine', '灵矿'], ['study', '阵法']];
    TABS.forEach(function (t, i) {
      const b = document.createElement('button');
      b.textContent = t[1];
      b.className = 'tab' + (t[0] === initialTab ? ' on' : '');
      b.onclick = function () {
        tabsWrap.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        renderBaiyiTab(t[0], pad);
        // 切换板块后把整屏滚回顶部：各板块内容高矮不一，若不归零，
        // 浏览器会把视口夹到新内容的底部 → 玩家看到的就是「内容先下拉、再冒出来」（用户反馈的错误交互）。
        const sc = $('screen-crafts');
        if (sc) sc.scrollTop = 0;
      };
      tabsWrap.appendChild(b);
    });
    body.appendChild(tabsWrap);

    const pad = document.createElement('div');
    pad.id = 'crafts-tab-body';   // ⚠ 不要再套一层 .crafts-body：同名 class 嵌套会叠加样式与内滚行为
    body.appendChild(pad);
    renderBaiyiTab(initialTab, pad);

    $('crafts-back').onclick = function () { showScreen('game'); refresh(); };
  }

  /* 各板块渲染：炼丹 / 炼器 / 灵田 / 灵矿 / 阵法 */
  function renderBaiyiTab(kind, body) {
    body.innerHTML = '';
    if (kind === 'alchemy') { renderBaiyiAlchemy(body); }
    else if (kind === 'forge') { renderBaiyiForge(body); }
    else if (kind === 'land') { renderBaiyiLand(body); return; }
    else if (kind === 'mine') { renderBaiyiMine(body); return; }
    else if (kind === 'study') { renderBaiyiStudy(body); return; }
    // 炼丹 / 炼器板块末尾各附本艺研习（阵法研习放在「阵法」板块内）
    const kid = ({ alchemy: 'liandan', forge: 'lianqi' })[kind];
    if (kid) {
      const kinds = CRAFT_KINDS.filter(function (k) { return k.id === kid; });
      if (kinds.length) {
        const sec = document.createElement('div');
        sec.style.cssText = 'margin-top:18px;';
        sec.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">' + kinds[0].name + '研习（耗 1 行动点提升等级）</h4>';
        body.appendChild(sec);
        renderCraftStudyRows(sec, kinds, function () { renderBaiyiTab(kind, body); });
      }
    }
  }

  /* 研习行（炼丹 / 炼器 / 阵法共用）：耗 1 行动点提升该艺等级 */
  function renderCraftStudyRows(container, kinds, onDone) {
    const cg = document.createElement('div');
    cg.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
    kinds.forEach(function (k) {
      const c = S.craft && S.craft[k.id]; const lv = c ? c.lv : 1; const xp = c ? c.exp : 0;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:6px;';
      row.innerHTML = '<span>' + k.name + '　' + (lv === 0 ? '未习得' : ('Lv' + lv + '　心得 ' + xp + '/' + lv)) + '</span>';
      const b = document.createElement('button'); b.className = 'btn-small';
      b.textContent = lv >= 5 ? '已满' : '研习';
      b.disabled = lv >= 5 || !Engine.canAction(S, 1);
      b.onclick = function () { const r = Engine.craftStudy(S, k.id); log(r.msg, r.ok ? 'good' : 'bad'); refresh(); onDone(); };
      row.appendChild(b); cg.appendChild(row);
    });
    container.appendChild(cg);
  }

  /* —— 炼丹板块：以灵草成丹（立即炼，成功率 悟性+丹心） —— */
  function renderBaiyiAlchemy(body) {
    const h = document.createElement('h4');
    h.style.color = '#4ec9a0';
    h.textContent = '鼎炉 · 以灵草成丹';
    body.appendChild(h);
    const list = Engine.alchemyChoices(S);
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用丹方（或境界未达）。';
      body.appendChild(p);
      return;
    }
    list.forEach(function (f) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      row.innerHTML = '<div><b>[' + ELIXIRS[f.out].name + ']</b><br><span class="dim">' + ELIXIRS[f.out].desc + '</span></div>' +
        '<button>' + costStr(f.cost) + ' → 炼</button>' +
        '<button class="ghost">连炼至材尽</button>';
      const btns = row.querySelectorAll('button');
      btns[0].onclick = function () {
        const r = Engine.doAlchemy(S, f);
        log(r.msg, r.ok ? 'good' : 'bad');
        renderBaiyiAlchemy(body); refresh();
      };
      btns[1].onclick = function () {
        var costKey = Object.keys(f.cost)[0];
        if ((S.materials[costKey] || 0) < f.cost[costKey]) { log(MATERIALS[costKey].name + '不足，炼不得。', 'bad'); return; }
        craftBatch(f, 'alchemy');
        renderBaiyiAlchemy(body);
      };
      body.appendChild(row);
    });
  }

  /* —— 炼器板块：以灵铁炼器（立即炼，品质随炼器等级波动） —— */
  function renderBaiyiForge(body) {
    const h = document.createElement('h4');
    h.style.color = '#b26de0';
    h.textContent = '铸炉 · 以灵铁炼器';
    body.appendChild(h);
    const list = Engine.forgeChoices(S);
    if (!list.length) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用配方（或境界未达）。';
      body.appendChild(p);
      return;
    }
    list.forEach(function (f) {
      const fi = formulaItem(f);
      const row = document.createElement('div');
      row.className = 'formula-row';
      row.innerHTML = '<div><b>[' + fi.name + ']</b><br><span class="dim">' + fi.desc + '｜' + fi.effect + '</span></div>' +
        '<button>' + costStr(f.cost) + ' → 炼</button>' +
        '<button class="ghost">连炼至材尽</button>';
      const btns = row.querySelectorAll('button');
      btns[0].onclick = function () {
        const r = Engine.doForge(S, f);
        log(r.msg, r.ok ? 'good' : 'bad');
        renderBaiyiForge(body); refresh();
      };
      btns[1].onclick = function () {
        var costKey = Object.keys(f.cost)[0];
        if ((S.materials[costKey] || 0) < f.cost[costKey]) { log(MATERIALS[costKey].name + '不足，炼不得。', 'bad'); return; }
        craftBatch(f, 'forge');
        renderBaiyiForge(body);
      };
      body.appendChild(row);
    });
  }

  /* —— 灵田板块：播种 / 采收 / 解锁 —— */
  function renderBaiyiLand(body) {
    const plots = fieldPlots(S);
    const usedFields = plots.filter(function(p) { return p !== null; }).length;
    const maxFields = Engine.getMaxFields(S);
    const h = document.createElement('h4');
    h.style.color = '#90e8b0';
    h.textContent = '灵田 · 已用 ' + usedFields + '/' + maxFields + ' 亩';
    body.appendChild(h);

    // 已有灵田
    if (plots.length > 0) {
      plots.forEach(function (p, i) {
        const row = document.createElement('div');
        row.className = 'formula-row';
        if (p === null) {
          row.innerHTML = '<div><b>[空闲灵田]</b><br><span class="dim">可在此播种</span></div><button>种植</button>';
          row.querySelector('button').onclick = function () { showPlantSelect(i); };
        } else {
          const fi = Engine.fieldInfo(S, i);
          const qty = p.quantity || 1;
          row.innerHTML = '<div><b>[' + fi.name + ']</b><br><span class="dim">' + fi.desc + '<br>已种 ' + fi.years + '/' + fi.needYears + ' 年（' + qty + '株）' + (fi.done ? ' · 可采收' : '') + '</span></div>' +
            (fi.done ? '<button>采收</button>' : '<button disabled>未成熟</button>');
          if (fi.done) {
            row.querySelector('button').onclick = function () {
              const r = Engine.harvestField(S, i);
              log(r, 'good');
              renderBaiyiLand(body); refresh();
            };
          }
        }
        body.appendChild(row);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无灵田';
      body.appendChild(p);
    }

    // 解锁新灵田
    if (plots.length < maxFields) {
      const unlockCost = plots.length === 0 ? 100 : 200;
      const uRow = document.createElement('div');
      uRow.style.cssText = 'background:rgba(232,193,90,0.1);border:1px solid rgba(232,193,90,0.3);border-radius:4px;padding:8px 12px;margin-top:4px;display:flex;align-items:center;justify-content:space-between;';
      uRow.innerHTML = '<span style="color:#e8c15a;">解锁新灵田</span><span class="dim">（' + unlockCost + ' 灵石）</span>';
      const ub = document.createElement('button');
      ub.className = 'btn-small';
      ub.textContent = '解锁';
      ub.disabled = S.stone < unlockCost;
      ub.onclick = function () {
        const r = Engine.unlockField(S);
        log(r.msg, r.ok ? 'good' : 'bad');
        renderBaiyiLand(body); refresh();
      };
      uRow.appendChild(ub);
      body.appendChild(uRow);
    }

    // 播种说明（选苗走 showPlantSelect 弹窗）
    const tip = document.createElement('p');
    tip.className = 'dim';
    tip.style.cssText = 'margin-top:10px;font-size:12px;';
    tip.textContent = '点击「种植」选苗下种：灵石买苗（须境界达标）或自备同等级灵草下种。株数 1/3/6。';
    body.appendChild(tip);
  }

  /* —— 灵矿板块：挖矿（境界定档位 · 深度成长） —— */
  function renderBaiyiMine(body) {
    if (!S.materials) S.materials = {};
    const mi = Engine.mineInfo(S);
    const h = document.createElement('h4');
    h.style.color = '#b8a86a';
    h.textContent = '灵矿 · ' + mi.grade + '级矿脉';
    body.appendChild(h);
    const tip = document.createElement('p');
    tip.className = 'dim';
    tip.style.marginBottom = '8px';
    tip.textContent = '现采 ' + mi.ironName + ' · 矿脉深度 ' + mi.depth + '/10（越深越丰）。挖矿耗行动点与气血。';
    body.appendChild(tip);

    const mkDig = function (label, ap, hpCost, rounds, hint) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      row.innerHTML = '<div><b>[' + label + ']</b><br><span class="dim">' + hint + '</span></div>';
      const b = document.createElement('button');
      b.textContent = '开挖';
      b.disabled = !Engine.canAction(S, ap) || S.hp <= hpCost;
      b.onclick = function () {
        Engine.spend(S, ap);
        S.hp -= hpCost;
        Engine.refreshStats(S);
        Engine.saveState(S);
        const r = Engine.digMine(S, rounds);
        log(r.msg, 'good');
        renderBaiyiMine(body); refresh();
      };
      row.appendChild(b);
      body.appendChild(row);
    };
    mkDig('挖掘', 1, 100, 1, '抡锤一番，气血 -100（耗1行动点）。');
    mkDig('奋力连挖', 1, 400, 4, '榨干气血连挖四锤，气血 -400（耗1行动点）。');
  }

  /* —— 阵法板块：五行阵 + 阵法研习 —— */
  function renderBaiyiStudy(body) {
    body.innerHTML = '';   // 关键：重渲染前先清空，否则每次点击会把整段重复 append（页面越点越长、往下弹出重复内容）
    const zhenfaLv = (S.craft && S.craft.zhenfa && S.craft.zhenfa.lv) || 1;
    const sec = document.createElement('div');
    sec.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">五行阵（战斗光环，随阵法等级缩放）</h4>'
      + '<p class="dim" style="margin:0 0 8px;">阵法 Lv' + zhenfaLv + '。开启后于战斗中持续生效。</p>';
    const wg = document.createElement('div'); wg.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
    WUXING_ORDER.forEach(function (key) {
      const w = WUXING_ARRAY[key];
      const on = !!(S.array && S.array.wuxing && S.array.wuxing[key]);
      const pct = Math.round((w.pctByLv[zhenfaLv] || 0) * 100);
      const b = document.createElement('button'); b.className = 'btn-small' + (on ? ' ghost' : '');
      b.textContent = w.name + '（' + (on ? '开' : '关') + ' +' + pct + '% ' + w.cn + '）';
      b.onclick = function () { const r = Engine.wuxingToggle(S, key); log((r.ok ? (r.on ? '开启' : '关闭') : r.msg), r.ok ? 'good' : 'bad'); refresh(); renderBaiyiStudy(body); };
      wg.appendChild(b);
    });
    sec.appendChild(wg);
    const zfTip = document.createElement('p');
    zfTip.className = 'dim';
    zfTip.style.cssText = 'margin:8px 0 0;font-size:12px;';
    zfTip.textContent = '阵法布置着（洞府·聚灵阵 / 本页五行阵开启任一）将于每年岁末自动累积阵道心得：单阵约 60 年臻化境（Lv5），聚灵阵与五行阵并行约 30 年。';
    sec.appendChild(zfTip);
    body.appendChild(sec);

    // 阵法研习（炼丹 / 炼器的研习已各自归入对应板块）
    const sec2 = document.createElement('div');
    sec2.style.cssText = 'margin-top:18px;';
    sec2.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">阵法研习（耗 1 行动点提升等级）</h4>';
    body.appendChild(sec2);
    renderCraftStudyRows(sec2, CRAFT_KINDS.filter(function (k) { return k.id === 'zhenfa'; }),
      function () { renderBaiyiStudy(body); });
  }

  /* ---------------- 功法管理 ---------------- */
  function openTech() {
    showScreen('tech');
    renderTechPage();
  }
  function renderTechPage() {
    const body = $('tech-body');
    body.innerHTML = '';
    const wrap = document.createElement('div');
    const ap = Engine.actionPoints(S);
    const eq = S.techEquip || (S.techEquip = { xinfa: null, shufa: [], dunshu: null });
    const mkRow = function (x, statStr) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      const info = document.createElement('div');
      info.innerHTML = '<b style="color:' + GRADE_COLOR[x.grade] + '">[' + x.name + ']</b> <span class="dim">' + statStr + '</span>' +
        '<br><span class="dim">' + esc(x.desc) + '</span>';
      row.appendChild(info);
      return row;
    };
    const mkBtn = function (txt, cls, fn) {
      const b = document.createElement('button');
      b.textContent = txt;
      b.className = cls || 'btn-small';
      b.onclick = fn;
      return b;
    };

    const h1 = document.createElement('h4');
    h1.textContent = '心法（修炼倍率）';
    wrap.appendChild(h1);
    
    // 显示当前装备的心法
    const currentXinfa = eq.xinfa && TECHNIQUES[eq.xinfa] ? TECHNIQUES[eq.xinfa] : null;
    if (currentXinfa) {
      const currentRow = document.createElement('div');
      currentRow.className = 'formula-row';
      currentRow.style.borderColor = '#e8c15a';
      currentRow.innerHTML = '<div><b style="color:#e8c15a">[当前]</b> <b style="color:' + GRADE_COLOR[currentXinfa.grade] + '">[' + currentXinfa.name + ']</b> <span class="dim">修炼 +' + Math.round((currentXinfa.mult - 1) * 100) + '%</span>' +
        '<br><span class="dim">' + esc(currentXinfa.desc) + '</span></div>';
      wrap.appendChild(currentRow);
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备心法</div>';
      wrap.appendChild(emptyRow);
    }
    
    // 显示其他可用心法
    const xinfa = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'xinfa' && t !== eq.xinfa; });
    if (xinfa.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可切换心法：';
      switchTitle.style.marginTop = '8px';
      wrap.appendChild(switchTitle);
      
      xinfa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, '修炼 +' + Math.round((x.mult - 1) * 100) + '%');
        const b = mkBtn('切换', 'btn-small', function () {
          Engine.setXinfa(S, t);
          sfx('good');
          log('你改修【' + x.name + '】，从此专精此道。', 'good');
          renderTechPage();
        });
        row.appendChild(b);
        wrap.appendChild(row);
      });
    }

    const h2 = document.createElement('h4');
    const usedN = (eq.shufa || []).length;
    h2.textContent = '法术（法术位 ' + usedN + '/' + ap + '）';
    wrap.appendChild(h2);
    
    // 显示已装备的法术
    const equippedShufa = (eq.shufa || []).filter(function(t) { return TECHNIQUES[t]; });
    if (equippedShufa.length) {
      equippedShufa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = document.createElement('div');
        row.className = 'formula-row';
        row.style.borderColor = '#e8c15a';
        row.innerHTML = '<div><b style="color:#e8c15a">[已装备]</b> <b style="color:' + GRADE_COLOR[x.grade] + '">[' + x.name + ']</b> <span class="dim">威力 ' + x.dmg + '× 攻击 · 耗灵 ' + (x.cost || 0) + '</span>' +
          '<br><span class="dim">' + esc(x.desc) + '</span></div>';
        const b = mkBtn('卸下', 'btn-small', function () {
          Engine.toggleShufa(S, t);
          sfx('click');
          log('你撤下了【' + x.name + '】。', 'good');
          renderTechPage();
        });
        row.appendChild(b);
        wrap.appendChild(row);
      });
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备法术</div>';
      wrap.appendChild(emptyRow);
    }
    
    // 显示可用法术
    const shufa = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'shufa' && (eq.shufa || []).indexOf(t) < 0; });
    if (shufa.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可装备法术：';
      switchTitle.style.marginTop = '8px';
      wrap.appendChild(switchTitle);
      
      shufa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, (x.slow ? '缚敌之霜' : '威力 ' + x.dmg + '× 攻击') + ' · 耗灵 ' + (x.cost || 0));
        const b = mkBtn('装备', 'btn-small', function () {
          const ok = Engine.toggleShufa(S, t);
          if (!ok) {
            log('法术位已满，请先卸下一门法术。', 'bad');
            return;
          }
          sfx('click');
          log('你把【' + x.name + '】纳入法术位。', 'good');
          renderTechPage();
        });
        row.appendChild(b);
        wrap.appendChild(row);
      });
    }

    const h3 = document.createElement('h4');
    h3.textContent = '遁术（身法）';
    wrap.appendChild(h3);
    
    // 显示当前装备的遁术
    const currentDunshu = eq.dunshu && TECHNIQUES[eq.dunshu] ? TECHNIQUES[eq.dunshu] : null;
    if (currentDunshu) {
      const currentRow = document.createElement('div');
      currentRow.className = 'formula-row';
      currentRow.style.borderColor = '#e8c15a';
      currentRow.innerHTML = '<div><b style="color:#e8c15a">[当前]</b> <b style="color:' + GRADE_COLOR[currentDunshu.grade] + '">[' + currentDunshu.name + ']</b> <span class="dim">逃脱 ' + Math.round((currentDunshu.flee || 0) * 100) + '% · 减伤 ' + Math.round((currentDunshu.guard || 0) * 100) + '%</span>' +
        '<br><span class="dim">' + esc(currentDunshu.desc) + '</span></div>';
      wrap.appendChild(currentRow);
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备遁术</div>';
      wrap.appendChild(emptyRow);
    }
    
    // 显示可用遁术
    const dunshu = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'dunshu' && t !== eq.dunshu; });
    if (dunshu.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可切换遁术：';
      switchTitle.style.marginTop = '8px';
      wrap.appendChild(switchTitle);
      
      dunshu.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, '逃脱 ' + Math.round((x.flee || 0) * 100) + '% · 减伤 ' + Math.round((x.guard || 0) * 100) + '%');
        const b = mkBtn('切换', 'btn-small', function () {
          Engine.setDunshu(S, t);
          sfx('good');
          log('你身法焕然一新，习演【' + x.name + '】。', 'good');
          renderTechPage();
        });
        row.appendChild(b);
        wrap.appendChild(row);
      });
    }
    body.appendChild(wrap);
    $('tech-back').onclick = function () { showScreen('game'); refresh(); };
  }

  /* ---------------- 设置 ---------------- */
  function openSettings() {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'set-wrap';
    const rowLine = function (label, ctl) {
      const r = document.createElement('div');
      r.className = 'set-row';
      const l = document.createElement('span');
      l.textContent = label;
      r.appendChild(l);
      r.appendChild(ctl);
      return r;
    };
    const onBgm = document.createElement('input');
    onBgm.type = 'checkbox';
    onBgm.checked = !!CFG.bgm;
    onBgm.onchange = function () { 
      CFG.bgm = onBgm.checked ? 1 : 0; 
      saveCfg(); 
      if (CFG.bgm) {
        AudioManager.playBgm((S && S.adv && !S.adv.done && !S.adv.trial) ? 'xianmo' : 'game');
      }
    };
    wrap.appendChild(rowLine('背景音乐', onBgm));
    const bgmVol = document.createElement('input');
    bgmVol.type = 'range';
    bgmVol.min = 0; bgmVol.max = 100; bgmVol.value = Math.round((CFG.bgmVol || 0.5) * 100);
    bgmVol.oninput = function () { CFG.bgmVol = bgmVol.value / 100; saveCfg(); };
    wrap.appendChild(rowLine('音乐音量', bgmVol));
    const onSound = document.createElement('input');
    onSound.type = 'checkbox';
    onSound.checked = !!CFG.sound;
    onSound.onchange = function () { CFG.sound = onSound.checked ? 1 : 0; saveCfg(); if (CFG.sound) sfx('click'); };
    wrap.appendChild(rowLine('音效', onSound));
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.min = 0; vol.max = 100; vol.value = Math.round(CFG.vol * 100);
    vol.oninput = function () { CFG.vol = vol.value / 100; saveCfg(); sfx('click'); };
    wrap.appendChild(rowLine('音效音量', vol));
    const pace = document.createElement('select');
    [['快', 0], ['标准', 1], ['慢（逐字打字）', 2]].forEach(function (o) {
      const op = document.createElement('option');
      op.value = o[1];
      op.textContent = o[0];
      pace.appendChild(op);
    });
    pace.value = CFG.pace;
    pace.onchange = function () { CFG.pace = parseInt(pace.value, 10); saveCfg(); };
    wrap.appendChild(rowLine('章节文字节奏', pace));
    const onFx = document.createElement('input');
    onFx.type = 'checkbox';
    onFx.checked = !!CFG.fx;
    onFx.onchange = function () { CFG.fx = onFx.checked ? 1 : 0; saveCfg(); };
    wrap.appendChild(rowLine('界面特效', onFx));
    const actions = document.createElement('div');
    actions.className = 'set-actions';
    const bPause = document.createElement('button');
    bPause.className = 'btn-main';
    bPause.textContent = '暂停修行';
    bPause.onclick = function () { openPause(); };
    actions.appendChild(bPause);
    const bSave = document.createElement('button');
    bSave.className = 'btn-main ghost';
    bSave.textContent = '存档 · 读档';
    bSave.onclick = function () { openSaveModal(true); };
    actions.appendChild(bSave);
    const bExit = document.createElement('button');
    bExit.className = 'btn-main ghost';
    bExit.textContent = '保存并退出到主页';
    bExit.onclick = function () {
      if (S) { Engine.saveState(S); log('进度已妥善保存。', 'dim'); }
      suspended = true;
      closeAllOverlays();
      $('chapter').style.display = 'none';
      $('battle').style.display = 'none';
      showScreen('title');
      renderTitle();
    };
    actions.appendChild(bExit);
    
    // 清除存档按钮
    const bClear = document.createElement('button');
    bClear.className = 'btn-main ghost';
    bClear.textContent = '清除所有存档';
    bClear.style.color = '#e0604a';
    bClear.style.borderColor = '#e0604a';
    bClear.onclick = async function() {
      if (await uiConfirm('确定要清除所有存档吗？此操作不可恢复！')) {
        if (await uiConfirm('再次确认：清除所有存档数据？')) {
          localStorage.removeItem('dedao_save');
          localStorage.removeItem('dedao_slot0');
          localStorage.removeItem('dedao_slot1');
          localStorage.removeItem('dedao_slot2');
          localStorage.removeItem('dedao_meta');
          S = null;
          suspended = true;
          closeAllOverlays();
          $('chapter').style.display = 'none';
          $('battle').style.display = 'none';
          showScreen('title');
          renderTitle();
          await uiAlert('存档已清除，请刷新页面。');
          location.reload();
        }
      }
    };
    actions.appendChild(bClear);
    
    wrap.appendChild(actions);
    box.appendChild(wrap);
  }
  function openPause() {
    closeAllOverlays();
    $('pause-info').textContent = S
      ? '第 ' + S.year + ' 年 · ' + S.name + ' · ' + safeStage(S).realm + safeStage(S).sub + ' · 行动点 ' + S.actionsLeft + '/' + Engine.actionPoints(S)
      : '岁月停驻于此。';
    $('pause').style.display = 'flex';
  }

  /* ---------------- 存档 · 读档 ---------------- */
  const SLOT_LABELS = ['自动存档', '存档一', '存档二', '存档三'];
  function slotMetaStr(info) {
    if (!info) return null;
    return info.name + ' · ' + info.realm + (info.sect ? ' · ' + info.sect : '') + ' · 第' + info.year + '年 · ' + info.age + '岁' +
      (info.dead ? ' · <span style="color:#e0604a">已故</span>' : '');
  }
  async function doLoadSlot(slotIdx) {
    if (S && S.name && !S.dead) {
      const ok = await uiConfirm('读档将覆盖当前这一世，确定？');
      if (!ok) return;
    }
    const s = Engine.loadState(slotIdx);
    if (!s || !validSave(s)) {
      log('该存档已失效。', 'bad');
      return;
    }
    S = s;
    suspended = false;
    Engine.ensureTechEquip(S);
    closeAllOverlays();
    showScreen('game');
    // 读档后清空上一世日志，按当前存档实情重写开场
    $('log').innerHTML = '';
    logYear = null;
    const stLoaded = STAGES[S.idx];
    logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
    log('你自旧日的一缕光阴中苏醒，行囊未动，前路未断。');
    log('（当前：' + S.name + ' · ' + (stLoaded ? (stLoaded.sym + ' ' + stLoaded.realm + ' ' + stLoaded.sub) : '') + (S.sect ? ' · ' + S.sect : '') + '）', 'dim');
    refresh();
    if (S.adv && S.adv.status === 'running') {
      log('（秘境中的冒险随这一世一同定格，你平安撤回。）', 'dim');
      S.adv.status = 'done';
      S.adv.done = true;
      Engine.saveState(S);
    }
    if (S.dead || S.endReason) {
      log('—— 此生已终，道途已尽 ——', 'gold');
      log('你可查看此生结算，或从此处重新开始。');
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;margin:8px 0';
      const bSettle = document.createElement('button');
      bSettle.className = 'btn-small';
      bSettle.textContent = '查看结算';
      bSettle.onclick = function () { endLifeFlow(); };
      const bRestart = document.createElement('button');
      bRestart.className = 'btn-small';
      bRestart.textContent = '重入轮回';
      bRestart.onclick = function () { showScreen('game'); startNewLife(); };
      btnRow.appendChild(bSettle);
      btnRow.appendChild(bRestart);
      logYear.appendChild(btnRow);
      $('log').scrollTop = $('log').scrollHeight;
    }
  }
  /* ---------------- 云端存档 ---------------- */
  async function doUploadToCloud() {
    if (!window.DedaoAPI) { log('云端存档未接入。', 'bad'); return; }
    if (!S || !S.name) { log('尚无可以上传的存档。', 'bad'); return; }
    const ok = await uiConfirm('将当前这一世上传到云端（覆盖云端主存档）？');
    if (!ok) return;
    log('正在上传云端……', 'dim');
    const p = await DedaoAPI.register(S.name);
    if (!p) { log('无法连接云端，上传失败。', 'bad'); return; }
    const save = await DedaoAPI.uploadSave(JSON.parse(JSON.stringify(S)), 'main');
    if (!save) { log('上传失败（无法连接云端）。', 'bad'); return; }
    log('已上传至云端，他日可自云端归来。', 'good');
    sfx('good');
  }

  async function doRestoreFromCloud() {
    if (!window.DedaoAPI) { log('云端存档未接入。', 'bad'); return; }
    if (S && S.name && !S.dead) {
      const ok = await uiConfirm('从云端恢复将覆盖当前这一世，确定？');
      if (!ok) return;
    }
    const save = await DedaoAPI.downloadSave('main');
    if (!save || !save.data) { log('云端暂无可恢复的存档（或无法连接云端）。', 'bad'); return; }
    const s = save.data;
    if (!validSave(s)) { log('云端存档已失效。', 'bad'); return; }
    S = s;
    suspended = false;
    Engine.ensureTechEquip(S);
    Engine.saveState(S); // 落本地，避免下次还需联网
    closeAllOverlays();
    showScreen('game');
    logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
    log('你自云端归来，前缘未断，旧梦重温。');
    refresh();
    if (S.dead || S.endReason) {
      log('—— 此生已终，道途已尽 ——', 'gold');
      log('你可查看此生结算，或从此处重新开始。');
    }
  }

  /* ---------------- 自定义弹窗（替代原生 alert/confirm，避免 WebView 内嵌时阻塞宿主线程） ---------------- */
  let _dlgOv = null, _dlgCard = null;
  function ensureDialogOverlay() {
    if (_dlgOv) return _dlgOv;
    const ov = document.createElement('div');
    ov.id = 'dialog-overlay';
    ov.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:10000;';
    const card = document.createElement('div');
    card.id = 'dialog-card';
    card.style.cssText = 'min-width:240px;max-width:80%;background:#1c1726;color:#e8e1d4;border:1px solid #4a3d5c;border-radius:12px;padding:18px 20px;box-shadow:0 8px 30px rgba(0,0,0,.5);font-family:inherit;';
    ov.appendChild(card);
    document.body.appendChild(ov);
    _dlgOv = ov; _dlgCard = card;
    return ov;
  }
  function uiAlert(msg) {
    return new Promise(function (resolve) {
      const ov = ensureDialogOverlay();
      const card = _dlgCard;
      card.innerHTML = '';
      const p = document.createElement('div');
      p.style.cssText = 'margin-bottom:14px;line-height:1.5;white-space:pre-wrap;';
      p.textContent = msg;
      const btn = document.createElement('button');
      btn.className = 'btn-main';
      btn.textContent = '确定';
      btn.style.cssText = 'display:block;margin-left:auto;';
      btn.onclick = function () { ov.style.display = 'none'; resolve(); };
      card.appendChild(p);
      card.appendChild(btn);
      ov.style.display = 'flex';
    });
  }
  /* 自定义确认框：opts = { ok: '确定', cancel: '取消', okDanger: true } */
  function uiConfirm(msg, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const ov = ensureDialogOverlay();
      const card = _dlgCard;
      card.innerHTML = '';
      const p = document.createElement('div');
      p.style.cssText = 'margin-bottom:14px;line-height:1.5;white-space:pre-wrap;';
      p.textContent = msg;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
      const yes = document.createElement('button');
      yes.className = 'btn-main';
      yes.textContent = opts.ok || '确定';
      if (opts.okDanger) yes.style.cssText = 'color:#fff;background:#b23a2e;border-color:#b23a2e;';
      yes.onclick = function () { ov.style.display = 'none'; resolve(true); };
      const no = document.createElement('button');
      no.className = 'btn-main ghost';
      no.textContent = opts.cancel || '取消';
      no.onclick = function () { ov.style.display = 'none'; resolve(false); };
      row.appendChild(yes); row.appendChild(no); // 确认置于取消之上
      card.appendChild(p); card.appendChild(row);
      ov.style.display = 'flex';
    });
  }

  function openSaveModal(fromGame) {
    const ov = $('modal');
    const box = $('modal-body');
    ov.style.display = 'flex';
    box.innerHTML = '';
    const wrap = document.createElement('div');
    for (let i = -1; i < 3; i++) {
      const slotIdx = i < 0 ? null : i;
      const info = Engine.slotInfo(slotIdx);
      const row = document.createElement('div');
      row.className = 'formula-row';
      const infoEl = document.createElement('div');
      const meta = slotMetaStr(info);
      infoEl.innerHTML = '<b>' + SLOT_LABELS[i + 1] + '</b><br><span class="dim">' + (meta ? meta : '— 空 —') + '</span>';
      row.appendChild(infoEl);
      const bLoad = document.createElement('button');
      bLoad.textContent = '读档';
      bLoad.className = 'btn-small';
      bLoad.disabled = !info;
      bLoad.onclick = function () { doLoadSlot(slotIdx); };
      row.appendChild(bLoad);
      if (fromGame && S && S.name && !S.dead) {
        const bSave = document.createElement('button');
        bSave.textContent = '覆盖存档';
        bSave.className = 'btn-small';
        bSave.onclick = async function () {
          if (info) {
            const ok = await uiConfirm('覆盖 ' + SLOT_LABELS[i + 1] + ' 的旧档？');
            if (!ok) return;
          }
          Engine.saveState(S, slotIdx == null ? 0 : slotIdx);
          log('已写入' + SLOT_LABELS[i + 1] + '。', 'good');
          sfx('good');
          openSaveModal(true);
        };
        row.appendChild(bSave);
      }
      wrap.appendChild(row);
    }
    // 云存档入口：主动上传 + 跨设备恢复（后端不可用时不报错，静默）
    const cloudRow = document.createElement('div');
    cloudRow.className = 'formula-row';
    cloudRow.innerHTML = '<div><b>云存档</b><br><span class="dim">上传当前进度到云端，或换设备时恢复</span></div>';
    const bUpload = document.createElement('button');
    bUpload.className = 'btn-small';
    bUpload.textContent = '上传云端';
    bUpload.disabled = !window.DedaoAPI || !(S && S.name);
    bUpload.title = (S && S.name) ? '' : '尚无可以上传的存档';
    bUpload.onclick = function () { doUploadToCloud(); };
    cloudRow.appendChild(bUpload);
    const bCloud = document.createElement('button');
    bCloud.className = 'btn-small';
    bCloud.textContent = '从云端恢复';
    bCloud.disabled = !window.DedaoAPI;
    bCloud.onclick = function () { doRestoreFromCloud(); };
    cloudRow.appendChild(bCloud);
    wrap.appendChild(cloudRow);
    const tip = document.createElement('p');
    tip.className = 'dim';
    tip.textContent = '游戏会自动保存在【自动存档】位；手动存档位共三个，散落于修仙路的不同岔口。';
    wrap.appendChild(tip);
    box.appendChild(wrap);
  }

  /* ---------------- 轮回塔 ---------------- */
  function renderRebirth() {
    M = Engine.loadMeta();
    $('rb-points').textContent = M.points;
    const wrap = $('rb-list');
    wrap.innerHTML = '';

    // —— 【开荒】天赋（REINC_TALENT）：持久化于 meta.reincTalent，与轮回阁同池扣费 ——
    (function () {
      const lv = M.reincTalent || 1;
      const maxLv = REINC_TALENT[REINC_TALENT.length - 1].lv;
      const full = lv >= maxLv;
      const nextCost = reincTalentNextCost(lv);
      const card = document.createElement('div');
      card.className = 'rb-card rb-special';
      const stars = [];
      for (let i = 1; i <= maxLv; i++) stars.push('<span class="lvl' + (i <= lv ? ' on' : '') + '">' + (i <= lv ? '★' : '☆') + '</span>');
      const btnAdd = document.createElement('button');
      btnAdd.textContent = full ? '—' : '+';
      btnAdd.title = full ? '已满' : '增加（' + nextCost + '点）';
      btnAdd.className = 'rb-step' + (full ? ' maxed' : '');
      btnAdd.disabled = full || M.points < nextCost;
      btnAdd.onclick = function () {
        if (full || M.points < nextCost) return;
        const r = Engine.reincTalentUpgrade();
        if (r && !r.ok) { log(r.msg, 'bad'); return; }
        renderRebirth();
      };
      const btnSub = document.createElement('button');
      const canSub = lv > 1;
      btnSub.textContent = canSub ? '−' : '—';
      btnSub.title = canSub ? '减少（返还' + ((REINC_TALENT.filter(function (x) { return x.lv === lv; })[0] || {}).cost || 0) + '点）' : '不可减少';
      btnSub.className = 'rb-step' + (canSub ? '' : ' maxed');
      btnSub.disabled = !canSub;
      btnSub.onclick = function () {
        if (!canSub) return;
        const cur = M.reincTalent || 1;
        const refund = (REINC_TALENT.filter(function (x) { return x.lv === cur; })[0] || {}).cost || 0;
        M.points += refund; M.reincTalent = cur - 1; Engine.saveMeta(M);
        renderRebirth();
      };
      const head = document.createElement('div');
      head.className = 'rb-head';
      const h4 = document.createElement('h4');
      h4.textContent = '开荒';
      head.appendChild(h4);
      const btns = document.createElement('div');
      btns.className = 'rb-head-btns';
      btns.appendChild(btnSub);
      btns.appendChild(btnAdd);
      head.appendChild(btns);
      card.appendChild(head);
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = '开荒池永久 +' + reincTalentBonus(lv) + ' 点（当前开荒池 ' + (INIT_POINTS + reincTalentBonus(lv)) + ' 点）';
      card.appendChild(desc);
      const lvlRow = document.createElement('div');
      lvlRow.className = 'lvl';
      lvlRow.innerHTML = stars.join('') + ' <span class="cost">' + (full ? '满级' : nextCost + '点') + '</span>';
      card.appendChild(lvlRow);
      wrap.appendChild(card);
    })();

    Engine.REINCARNATION.forEach(function (r) {
      const bought = Math.min(M.reinc[r.id] || 0, r.max);
      const full = bought >= r.max;
      const isEmpty = bought === 0;
      const currentCost = r.cost * (bought + 1);
      const card = document.createElement('div');
      card.className = 'rb-card';
      const stars = [];
      for (let i = 0; i < r.max; i++) {
        stars.push('<span class="lvl' + (i < bought ? ' on' : '') + '">' + (i < bought ? '★' : '☆') + '</span>');
      }
      
      // 增加按钮
      const btnAdd = document.createElement('button');
      btnAdd.textContent = full ? '—' : '+';
      btnAdd.title = full ? '已满' : '增加（' + currentCost + '点）';
      btnAdd.className = 'rb-step' + (full ? ' maxed' : '');
      btnAdd.disabled = full || M.points < currentCost;
      btnAdd.onclick = function () {
        if (full || M.points < currentCost) return;
        M.points -= currentCost;
        M.reinc[r.id] = (M.reinc[r.id] || 0) + 1;
        Engine.saveMeta(M);
        renderRebirth();
      };

      // 减少按钮
      const btnSub = document.createElement('button');
      btnSub.textContent = isEmpty ? '—' : '−';
      btnSub.title = isEmpty ? '不可减少' : '减少（返还' + (r.cost * bought) + '点）';
      btnSub.className = 'rb-step' + (isEmpty ? ' maxed' : '');
      btnSub.disabled = isEmpty;
      btnSub.onclick = function () {
        if (isEmpty) return;
        const refund = r.cost * bought;
        M.points += refund;
        M.reinc[r.id] = (M.reinc[r.id] || 0) - 1;
        Engine.saveMeta(M);
        renderRebirth();
      };

      const head = document.createElement('div');
      head.className = 'rb-head';
      const h4 = document.createElement('h4');
      h4.textContent = r.name;
      head.appendChild(h4);
      const btns = document.createElement('div');
      btns.className = 'rb-head-btns';
      btns.appendChild(btnSub);
      btns.appendChild(btnAdd);
      head.appendChild(btns);
      card.appendChild(head);
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = r.desc;
      card.appendChild(desc);
      const lvlRow = document.createElement('div');
      lvlRow.className = 'lvl';
      lvlRow.innerHTML = stars.join('') + ' <span class="cost">' + (full ? '满级' : currentCost + '点') + '</span>';
      card.appendChild(lvlRow);

      wrap.appendChild(card);
    });
  }

  /* ---------------- 标题 / 继续 ---------------- */
  function validSave(S) {
    // 统一交给引擎判定：避免“读档菜单显示存在、点开却报已失效”的虚假(phantom)存档
    return Engine.isUsableSave(S);
  }
  function renderTitle() {
    M = Engine.loadMeta();
    const hasSave = !!validSave(Engine.loadState());
    $('t-continue').style.display = hasSave ? 'inline-block' : 'none';
    const nextJie = M.nextJie || 0;
    const maxJie = M.maxJie || 0;
    const jieInfo = nextJie > 0 ? ' · ' + nextJie + '劫轮回' : '';
    $('t-points').textContent = M.points ? '轮回点累计 ' + M.points + jieInfo : (jieInfo ? jieInfo.slice(3) : '');
  }
  function actContinue(opts) {
    opts = opts || {};
    S = Engine.loadState();
    if (!validSave(S)) {
      Engine.clearState();
      S = null;
    }
    if (S) {
      suspended = false;
      showScreen('game');
      logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
      if (opts.auto) log('已自动读取上次的自动存档（第 ' + S.year + ' 年），继续未尽的征途。', 'dim');
      else log('远行的路还在脚下。你整理衣冠，重拾剑与梦。');
      refresh();
      if (S.adv && S.adv.status === 'running') {
        log('（你在秘境中的冒险尚未结束，虚惊一场，平安撤回。）', 'dim');
        S.adv.status = 'done';
        S.adv.done = true;
        Engine.saveState(S);
      }
      if (S.dead || S.endReason) {
        log('—— 此生已终，道途已尽 ——', 'gold');
        log('你可查看此生结算，或从此处重新开始。');
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;margin:8px 0';
        const bSettle = document.createElement('button');
        bSettle.className = 'btn-small';
        bSettle.textContent = '查看结算';
        bSettle.onclick = function () { endLifeFlow(); };
        const bRestart = document.createElement('button');
        bRestart.className = 'btn-small';
        bRestart.textContent = '重入轮回';
        bRestart.onclick = function () { showScreen('game'); startNewLife(); };
        btnRow.appendChild(bSettle);
        btnRow.appendChild(bRestart);
        logYear.appendChild(btnRow);
        $('log').scrollTop = $('log').scrollHeight;
      }
    }
    return !!S;
  }

  /* ---------------- 开机 ---------------- */
  function boot() {
    M = Engine.loadMeta();
    // —— 旧版存档清理：新版本开机时清掉旧结构存档，强制以新版本重开 ——
    const clearedSaves = Engine.cleanupLegacySaves();
    if (clearedSaves > 0) showCleanupToast(clearedSaves);
    if (!M._bonus20) { M.points = (M.points || 0) + 100; M._bonus20 = true; Engine.saveMeta(M); }
    
    // 初始化音频配置
    if (typeof AudioManager !== 'undefined') {
      AudioManager.init({
        bgmEnabled: !!CFG.bgm,
        sfxEnabled: !!CFG.sound,
        bgmVolume: CFG.bgmVol || 0.5,
        sfxVolume: CFG.vol || 0.5
      });
    }
    
    showScreen('title');
    renderTitle();
    
    // 自动激活音频
    if (typeof AudioManager !== 'undefined') {
      AudioManager.activate();
    }
    // 用户交互时重试激活（应对浏览器自动播放限制）
    function onFirstInteract() {
      if (typeof AudioManager !== 'undefined' && !AudioManager.isInitialized()) {
        AudioManager.activate();
      }
      document.removeEventListener('click', onFirstInteract);
      document.removeEventListener('touchstart', onFirstInteract);
    }
    document.addEventListener('click', onFirstInteract);
    document.addEventListener('touchstart', onFirstInteract);
    
    // 绑定按钮事件
    $('t-new').onclick = function () { sfx('click'); startNewLife(); };
    $('t-continue').onclick = function () { sfx('click'); actContinue(); };
    $('t-rebirth').onclick = function () { sfx('click'); renderRebirth(); showScreen('rebirth'); };
    $('rb-back').onclick = function () { sfx('click'); renderTitle(); showScreen('title'); };
    $('btn-reborn').onclick = function () { sfx('click'); actReborn(); };
    $('btn-end-title').onclick = function () { sfx('click'); renderTitle(); showScreen('title'); };
    $('btn-cult').onclick = function () { sfx('click'); openCultivate(); };
    $('btn-explore').onclick = function () { sfx('click'); actExplore2(); };
    $('btn-social').onclick = function () { if (!S) return; sfx('click'); openTravel(); };
    $('btn-baiyi').onclick = function () {
      if (!S || S.dead) return;
      if (!S.sect) {
        showChapter('百艺 · 未启之艺', [
          '你尚未拜入宗门，山野之间无百工之传，百艺无从修习。',
          '传闻稍有所成、得入宗门之后，炼丹、炼器、灵田、灵矿诸般技艺方能开启。'
        ], { subtitle: '未启之艺', choices: [{ t: '且先入世，静待缘法' }] });
        return;
      }
      sfx('click');
      showBaiyi();
    };
    if ($('btn-break')) $('btn-break').onclick = function () { sfx('click'); actBreak(); };
    $('btn-year').onclick = function () { sfx('click'); actYearEnd(); };
    $('btn-arts').onclick = function () {
      if (!S || S.dead) return;
      sfx('click');
      actArts();
    };
    $('crafts-gear').onclick = function () { sfx('click'); openGear(); };
    $('crafts-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('duanti-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('tech-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('favor-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('modal-close').onclick = function () { sfx('click'); closeModal(); };
    $('modal').onclick = function (e) { if (e.target === $('modal')) { sfx('click'); closeModal(); } };
    $('t-load').onclick = function () { sfx('click'); openSaveModal(false); };
    $('t-settings').onclick = function () { sfx('click'); openSettings(); };

    // 底部栏按钮事件
    $('btn-char-bottom').onclick = function () { if (!S) return; sfx('click'); openChar(); };
    $('btn-bag-bottom').onclick = function () { sfx('click'); openBag(); };
    // 设置：2026-09-14 由底部栏上移到 HUD 右侧功能列（#hud-settings，文字【设置】，
    //   原先为 ⚙ 齿轮图标，用户要求「还原回【设置】」）。其上方同时放入【成就】。
    //   绑定必须判空（PC 版 index_pc.html 无 #hud-settings，属另一独立序列）。
    if ($('hud-settings')) $('hud-settings').onclick = function () { sfx('click'); openSettings(); };
    if ($('btn-settings-bottom')) $('btn-settings-bottom').onclick = function () { sfx('click'); openSettings(); };

    // 新场景底部导航（宗门/游历已移除底部栏，入口在行动栏：btn-sect / btn-social）
    if ($('btn-sect')) $('btn-sect').onclick = function () { if (!S) return; sfx('click'); openSect(); };
    $('btn-npc-bottom').onclick = function () { if (!S) return; sfx('click'); openNpc(); };
    // 成就 / 图鉴「返回」：回到打开它的那个屏幕（标题页 or 主界面），而非一律回主界面
    if ($('ach-back')) $('ach-back').onclick = function () { sfx('click'); backFromPage(); };
    if ($('codex-back')) $('codex-back').onclick = function () { sfx('click'); backFromPage(); };
    // 资料页入口：玉符 / 成就 / 图鉴 已从底部栏挪到标题页（*-title）。
    // 标题页没有局内状态，open* 内部会用 pageState() 回落到存档，故此处不再拦截 !S。
    // 兼容保留 *-bottom 靶点 —— PC 版右上角文字入口（js/ui_pc.js）仍以隐藏按钮代理触发。
    function bindNav(ids, open) {
      ids.forEach(function (id) {
        if ($(id)) $(id).onclick = function () { sfx('click'); open(); };
      });
    }
    bindNav(['btn-omen-title', 'btn-omen-bottom'], openOmen);
    // 2026-09-14：成就 / 图鉴 的局内入口 = HUD 右侧功能列（btn-ach-hud / btn-codex-hud），
    //   与【设置】同簇（用户要求「成就和图鉴放回主页面、放在设置附近」）。
    //   两者在标题页的入口已撤（btn-ach-title / btn-codex-title 仅作 PC 代理靶点兼容）。
    bindNav(['btn-ach-title', 'btn-ach-bottom', 'btn-ach-hud'], openAchievements);
    bindNav(['btn-codex-title', 'btn-codex-bottom', 'btn-codex-hud'], openCodex);
    // 秘境【说明】按钮：点开详细规则（原来进场就弹的长文改为可点开）
    if ($('adv-info')) $('adv-info').onclick = function () {
      if (!advIntroText) return;
      openPanel('<h3>秘境 · 说明</h3><p class="dim" style="white-space:pre-line;line-height:1.6;">' + advIntroText + '</p><div style="margin-top:12px;"><button class="btn-main" data-close="1">知道了</button></div>');
    };
    // 秘境右下角【强行撤离】按钮：仓促遁走，半数收获散落（灵石/草/铁各失 50%）。
    // 此前该按钮无 onclick（点击无反应）——现在补上接线。仅在本行秘境进行中可触发。
    if ($('adv-retreat')) $('adv-retreat').onclick = function () {
      if (!S || !S.adv || S.adv.done || S.adv.status !== 'running') return;
      if (S.adv.trial) return; // 试炼（死劫/渡劫/隐藏线）不受此按钮影响，避免误触触发陨落
      if ($('adv-screen').style.display === 'none') return;
      // 二次确认，避免误触损失半数收获
      showChapter('强行撤离？', [
        '你确定要就此强行撤离秘境吗？',
        '仓促遁走，半数收获将散落途中（灵石 / 灵草 / 灵铁各失 50%）。',
        '若想保住全部收获，可在途中的【静室】选择「撤离」。'
      ], {
        choices: [
          { t: '强行撤离\n失五成收货', special: 'adv_force_retreat_confirm' },
          { t: '再想想\n继续探索', special: 'adv_force_retreat_cancel' }
        ]
      }).then(function (r) {
        if ((r.pick || {}).special === 'adv_force_retreat_confirm') advFinish('强行撤离');
      });
    };

    $('pause-resume').onclick = function () { sfx('click'); $('pause').style.display = 'none'; };
    $('pause-exit').onclick = function () {
      sfx('click');
      if (S) { Engine.saveState(S); }
      suspended = true;
      $('pause').style.display = 'none';
      closeModal();
      $('chapter').style.display = 'none';
      $('battle').style.display = 'none';
      renderTitle();
      showScreen('title');
    };
    saveCfg();

    // Service Worker更新提示
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          showUpdateToast();
        }
      });
    }

    // —— 中途退出兜底存档：切后台 / 关页面 / 刷新 时再写一次自动存档位（幂等，不改游戏状态）——
    function flushAutoSave() {
      if (S && S.name && !S.dead) { try { Engine.saveState(S); } catch (e) {} }
    }
    window.addEventListener('pagehide', flushAutoSave);
    window.addEventListener('beforeunload', flushAutoSave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushAutoSave();
    });

    // —— 开机完成：停在标题页，由玩家点击【继续征途】手动读取存档（自动续档已移除）——
  }

  function showUpdateToast() {
    var toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = '<span>发现新版本</span><button onclick="location.reload()">点击更新</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 100);
  }
  function showCleanupToast(n) {
    var toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = '<span>检测到 ' + n + ' 份旧版本存档，已清理并以新版本开始（轮回点 / 成就保留）</span>' +
      '<button onclick="this.parentNode.remove()">知道了</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 100);
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 8000);
  }

  /* ---------------- 角色页 ---------------- */
  function openChar() {
    showScreen('char');
    renderCharPage();
  }
  function renderCharPage() {
    if (!S) return;
    const st = STAGES[S.idx];
    
    // 更新头部信息
    $('char-name').textContent = S.name;
    $('char-realm').textContent = st.sym + ' ' + st.realm + ' ' + st.sub;
    $('char-realm').style.color = st.color;
    $('char-age').textContent = S.age + '岁 / ' + S.lifeMax + '寿';
    
    // 命格显示
    const destinyEl = $('char-destiny-list');
    if (S.destinies && S.destinies.length) {
      const destinyNames = S.destinies.map(function(d) {
        const dest = DESTINIES[d];
        return dest ? dest.name : d;
      });
      destinyEl.textContent = destinyNames.join('、');
    } else {
      destinyEl.textContent = '无';
    }
    
    // 属性分页
    renderCharAttr();
    // 装备分页
    renderCharEquip();
    // 法宝分页
    renderCharTreasure();
    // 功法分页
    renderCharTech();
    
    // Tab切换
    const tabs = document.querySelectorAll('.char-tab');
    tabs.forEach(function(tab) {
      tab.onclick = function() {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.char-tab-content').forEach(function(c) {
          c.classList.remove('active');
        });
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      };
    });
    
    $('char-back').onclick = function () { showScreen('game'); refresh(); };
  }

  function renderCharAttr() {
    const box = $('char-attr-content');
    if (!box) return;
    box.innerHTML = '';
    // 灵根展示（P1：角色页展示灵根与特质）
    if (S.linggen) {
      const lg = S.linggen;
      const tr = (lg.trait && lg.trait.name) ? lg.trait.name : '';
      const head = document.createElement('div');
      head.className = 'char-linggen';
      head.innerHTML = '灵根：<b>' + esc(lg.name) + '</b>（灵气效率 ' + Math.round(lg.qiMul * 100) + '%'
        + (lg.affinityBonus ? '，法术亲和 +' + lg.affinityBonus + '%' : '') + '）'
        + (tr ? '　特质：' + esc(tr) : '');
      box.appendChild(head);
    }
    const st = safeStage(S);
    const es = Engine.equipStats(S);
    const cultR = Engine.cultGain(S);
    const tiMulti = [20, 25, 30, 35][Engine.bigIdxOf(S)] || 20;

    // 命格加成汇总
    const destAttrBonus = { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0 };
    (S.destinies || []).forEach(function (d) {
      const dest = DESTINIES[d];
      if (dest && dest.attr) {
        Object.keys(dest.attr).forEach(function (k) { if (destAttrBonus[k] !== undefined) destAttrBonus[k] += dest.attr[k]; });
      }
    });

    // === 六维属性（主页面风格） ===
    const h1 = document.createElement('h4');
    h1.textContent = '六维属性';
    h1.style.color = 'var(--gold)';
    box.appendChild(h1);

    const sixGrid = document.createElement('div');
    sixGrid.className = 'attr-six-grid';

    // 六维说明文案由引擎 attrGainText 统一给出（只说「一共加了多少战斗属性 / 修炼速度」），
    //   不再展示「（基础+命格）」「每点+多少」「法宝栏解锁」——用户 2026-09-13 定稿。
    const sixDims = [
      { key: 'wu', name: '悟性', icon: '📖', color: '#5ac8fa' },
      { key: 'ti', name: '体魄', icon: '💪', color: '#e0604a' },
      { key: 'dun', name: '遁速', icon: '💨', color: '#4ec9a0' },
      { key: 'shen', name: '神识', icon: '👁', color: '#c06ae0' },
      { key: 'dao', name: '道心', icon: '☯', color: '#e8c15a' },
      { key: 'ling', name: '灵力', icon: '🔮', color: '#6ad1ff' }
    ];

    sixDims.forEach(function (dim) {
      const total = Engine.effAttr(S, dim.key) + (es[dim.key] || 0);
      const card = document.createElement('div');
      card.className = 'attr-six-card';
      card.style.borderColor = dim.color;

      const header = document.createElement('div');
      header.className = 'attr-six-header';
      header.innerHTML = '<span class="attr-six-icon">' + dim.icon + '</span>' +
        '<span class="attr-six-name" style="color:' + dim.color + '">' + dim.name + '</span>';
      card.appendChild(header);

      const valRow = document.createElement('div');
      valRow.className = 'attr-six-val';
      valRow.innerHTML = '<b>' + total + '</b>';
      card.appendChild(valRow);

      const affect = document.createElement('div');
      affect.className = 'attr-six-affect dim';
      affect.textContent = Engine.attrGainText(S, dim.key);
      card.appendChild(affect);

      sixGrid.appendChild(card);
    });
    box.appendChild(sixGrid);

    // === 战斗属性 ===
    const hCombat = document.createElement('h4');
    hCombat.textContent = '战斗属性';
    hCombat.style.color = 'var(--gold)';
    box.appendChild(hCombat);

    const combatGrid = document.createElement('div');
    combatGrid.className = 'attr-combat-grid';

    const atkMul = Engine.getDestinyAttrMult(S, 'atk');
    // 防御走引擎统一口径（体魄有效值×0.5×命格倍率 + 装备/法宝/灵根防御），面板=战斗实算
    const defTotal = Engine.getDefense(S);
    const critBase = Math.round(Engine.getCritRate(S) * 100);
    const dodgeBase = Math.round(Engine.getDodgeRate(S) * 100);
    const extraAtkBase = Math.round(Engine.getExtraAtkChance(S) * 100);

    const combatStats = [
      { name: '攻击', val: Math.round(S.atk * atkMul), color: '#ff9080', desc: '基础10+境界 + 神识×5 + 灵力×5 + 装备' },
      { name: '防御', val: defTotal, color: '#90e8b0', desc: '体魄×0.5 + 装备/法宝/灵根防御 + 命格（土阵%、金缕衣减伤另计）' },
      { name: '气血', val: S.hp + ' / ' + S.hpMax, color: '#ff9080', desc: '80+体魄×50+境界' },
      { name: '暴击', val: critBase + '%', color: '#e8c15a', desc: '神识×1% + 道心×2% + 装备 + 命格' },
      { name: '闪避', val: dodgeBase + '%', color: '#4ec9a0', desc: '遁速×2% + 装备 + 命格' },
      { name: '攻速', val: extraAtkBase + '%', color: '#ffb84d', desc: '遁速×1% + 装备：几率额外攻击一次' },
      { name: '灵力', val: (S.mp || 0) + ' / ' + (S.mpMax || 0), color: '#6ad1ff', desc: '战斗前补满，法术消耗灵力（灵力上限：灵力1时=20，此后每点+20）' },
      { name: '修为', val: S.qi + ' / ' + Engine.requireNeed(S), color: '#5ac8fa', desc: '修炼积累，满则突破' },
      { name: '修炼', val: '+' + cultR.gain, color: '#4ec9a0', desc: '(60+悟性×10)×境界' }
    ];

    // 战斗属性：只留「名称 + 数值」，不再挂任何说明文字（用户 2026-09-13 定稿）
    combatStats.forEach(function (cs) {
      const cell = document.createElement('div');
      cell.className = 'attr-combat-cell';
      cell.innerHTML = '<div class="attr-combat-label">' + cs.name + '</div>' +
        '<div class="attr-combat-val" style="color:' + cs.color + '">' + cs.val + '</div>';
      combatGrid.appendChild(cell);
    });
    box.appendChild(combatGrid);

    // === 灵根 ===
    const h2 = document.createElement('h4');
    h2.textContent = '灵根';
    h2.style.color = 'var(--gold)';
    box.appendChild(h2);
    const lg = document.createElement('div');
    lg.className = 'attr-section';
    if (S.linggen) {
      lg.innerHTML = '<b style="color:#e8c15a">' + S.linggen.name + '</b><span class="dim"> — ' + S.linggen.desc + '</span>';
      const parts = linggenEffectParts(S);
      if (parts.length) lg.innerHTML += '<br><span class="dim" style="margin-left:8px">效果：' + parts.join('，') + '</span>';
    } else {
      lg.innerHTML = '<span class="dim">未觉醒</span>';
    }
    box.appendChild(lg);

    // === 命格（新系统）===
    const h3b = document.createElement('h4');
    h3b.textContent = '命格';
    h3b.style.color = 'var(--gold)';
    box.appendChild(h3b);
    if (S.destinies && S.destinies.length) {
      S.destinies.forEach(function (d) {
        const dest = DESTINIES[d];
        if (!dest) return;
        const p = document.createElement('div');
        p.className = 'attr-destiny-card';
        const gradeColor = { '白': '#b0b0bc', '绿': '#4ec9a0', '蓝': '#5ac8fa', '紫': '#b26de0', '金': '#e8c15a' }[dest.grade] || '#b0b0bc';

        // 属性加成
        const attrParts = [];
        if (dest.attr) {
          const attrNames = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', ling: '灵力' };
          Object.keys(dest.attr).forEach(function (k) {
            if (attrNames[k]) attrParts.push(attrNames[k] + '+' + dest.attr[k]);
          });
        }

        // 战斗加成
        const effectParts = [];
        if (dest.effect) {
          const effectNames = { atkMul: '攻击', defMul: '防御', critRate: '暴击率', dodgeRate: '闪避率',
            lifesteal: '吸血', thorns: '反伤', firstStrike: '先手', counterRate: '反击率',
            stonePerYear: '灵石/年', wuPerYear: '悟性/年', tiPerYear: '体魄/年',
            tribBonus: '渡劫', executeBonus: '斩杀' };
          Object.keys(dest.effect).forEach(function (k) {
            if (k === 'controlImmune') { effectParts.push('控制免疫'); return; }
            if (k === 'techTypeBonus') {
              Object.keys(dest.effect[k]).forEach(function (tk) {
                effectParts.push((tk === 'xinfa' ? '心法' : tk) + '伤害+' + Math.round(dest.effect[k][tk] * 100) + '%');
              });
              return;
            }
            const name = effectNames[k];
            if (!name) return;
            const val = dest.effect[k];
            if (typeof val === 'boolean') { effectParts.push(name); return; }
            if (k.indexOf('Mul') >= 0 || k.indexOf('Rate') >= 0 || k.indexOf('Bonus') >= 0 || k.indexOf('steal') >= 0 || k.indexOf('thorns') >= 0 || k.indexOf('Strike') >= 0 || k.indexOf('counter') >= 0 || k.indexOf('execute') >= 0) {
              effectParts.push(name + '+' + Math.round(val * 100) + '%');
            } else {
              effectParts.push(name + '+' + val);
            }
          });
        }

        const allParts = attrParts.concat(effectParts);
        p.innerHTML = '<div class="attr-destiny-header"><span class="attr-destiny-grade" style="color:' + gradeColor + '">【' + dest.grade + '】</span>' +
          '<span class="attr-destiny-name" style="color:' + gradeColor + '">' + dest.name + '</span></div>' +
          '<div class="attr-destiny-desc dim">' + dest.desc + '</div>' +
          (allParts.length ? '<div class="attr-destiny-bonus">加成：' + allParts.join('，') + '</div>' : '');
        box.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '无命格（栏位：' + (S.destinySlots || 1) + '）';
      box.appendChild(p);
    }

    // === 宗门 ===
    const h4 = document.createElement('h4');
    h4.textContent = '宗门';
    h4.style.color = 'var(--gold)';
    box.appendChild(h4);
    const sectDiv = document.createElement('div');
    sectDiv.className = 'attr-section';
    if (S.sect) {
      const sc = SECTS[S.sect];
      sectDiv.innerHTML = '<b style="color:#e8c15a">' + sc.name + '</b><span class="dim"> — ' + sc.desc + '</span>';
    } else {
      sectDiv.innerHTML = '<span class="dim">散修（未加入宗门）</span>';
    }
    box.appendChild(sectDiv);

    // === 装备加成 ===
    const h5 = document.createElement('h4');
    h5.textContent = '装备加成';
    h5.style.color = 'var(--gold)';
    box.appendChild(h5);
    const eqDiv = document.createElement('div');
    eqDiv.className = 'attr-section';
    const eqParts = [];
    if (es.hpMax) eqParts.push('气血上限+' + es.hpMax);
    if (es.atk) eqParts.push('攻击+' + es.atk);
    if (es.wu) eqParts.push('悟性+' + es.wu);
    if (es.ti) eqParts.push('体魄+' + es.ti);
    if (es.cult) eqParts.push('修炼+' + Math.round(es.cult * 100) + '%');
    eqDiv.innerHTML = eqParts.length ? '<span class="dim">' + eqParts.join('，') + '</span>' : '<span class="dim">无装备加成</span>';
    box.appendChild(eqDiv);
  }
  
  function renderCharEquip() {
    const slotsBox = $('char-equip-slots');
    slotsBox.innerHTML = '';
    ['weapon', 'head', 'body', 'accessory'].forEach(function (slot) {
      const card = document.createElement('div');
      card.className = 'equip-slot';
      const inst = S.equip[slot];
      const instObj = (inst && typeof inst === 'object') ? inst : (inst ? { id: inst, aff: [] } : null);
      const id = instObj ? instObj.id : null;
      const it = id ? Engine.findEquip(id) : null;
      if (it) {
        const tc = EQUIP_TIERS[it.tier].color;
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5>' +
          '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
          '<div class="item-stat">' + equipStatStr(instObj) + '</div>' +
          '<div class="g-actions"><button class="btn-small">卸下</button></div>';
        card.querySelector('button').onclick = function () {
          S.equip[slot] = null;
          S.inventory.push(instObj);
          Engine.refreshStats(S); Engine.saveState(S);
          log('你卸下了【' + it.name + '】。', 'dim');
          refresh(); renderCharAttr(); renderCharEquip();
        };
      } else {
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5><div class="empty">未装备</div>';
      }
      slotsBox.appendChild(card);
    });
    // 储物袋装备
    const inv = $('char-equip-inv');
    inv.innerHTML = '';
    if (!S.inventory.length) {
      inv.innerHTML = '<p class="dim">袋中无多余装备。</p>';
    }
    S.inventory.forEach(function (inst, idx) {
      const instObj = (inst && typeof inst === 'object') ? inst : { id: inst, aff: [] };
      const it = Engine.findEquip(instObj.id);
      if (!it) return;
      // 宝物(EQUIPS.treasure)归法宝页，装备页只展示常规装备
      if (EQUIPS.treasure && EQUIPS.treasure[instObj.id]) return;
      const tc = EQUIP_TIERS[it.tier].color;
      const d = document.createElement('div');
      d.className = 'gear-item';
      d.innerHTML = '<div style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
        '<div class="dim" style="font-size:12px">' + equipStatStr(instObj) + '</div>' +
        '<div class="g-actions">' +
        '<button>穿戴</button><button>出售 ' + Math.round(it.price * 0.5) + ' 灵石</button>' +
        '</div>';
      const btns = d.querySelectorAll('button');
      btns[0].onclick = function () {
        Engine.wearEquip(S, instObj);
        log('你换上了【' + it.name + '】。', 'good');
        refresh(); renderCharAttr(); renderCharEquip();
      };
      btns[1].onclick = function () {
        const g = Engine.sellEquip(S, instObj);
        log('你卖掉了【' + it.name + '】，得灵石 ' + g + '。', 'good');
        renderCharEquip();
      };
      inv.appendChild(d);
    });
  }
  
  // 法宝栏未解锁条件（用于展示「🔒 未解锁栏位」）
  function treasureSlotUnlockText(s) {
    const hints = [];
    const realmNames = ['炼气', '筑基', '金丹', '元婴', '化神', '合体', '大乘', '渡劫', '仙'];
    const bi = Math.floor((s.idx || 0) / 3);
    const daoBonus = Math.min(3, Math.floor((s.dao || 0) / 10));
    const shenBonus = Math.min(3, Math.floor((s.shen || 0) / 10));
    const reincBonus = (s.reinc && s.reinc.treasureSlot) || 0;
    if (bi < 15) hints.push('突破至「' + (realmNames[bi + 1] || '更高') + '」境界（+1 栏位）');
    if (daoBonus < 3) hints.push('道心达 ' + ((daoBonus + 1) * 10) + '（+1 栏位）');
    if (shenBonus < 3) hints.push('神识达 ' + ((shenBonus + 1) * 10) + '（+1 栏位）');
    if (reincBonus < 3) hints.push('轮回天赋【先天灵宝·' + (reincBonus + 1) + '级】（+1 栏位）');
    return hints;
  }
  function treasureCard(v, kind, locked) {
    const card = document.createElement('div');
    card.className = 'treasure-slot' + (locked ? ' locked' : '');
    const tc = v.isArt ? ((GRADE_COLOR && GRADE_COLOR[v.grade]) || 'var(--gold)')
                       : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].color) || 'var(--gold)');
    // 灵物类法宝：让玩家一眼看出它的本质是灵物（grade 后带「·灵物」，卡片标题也改写）
    const isSpiritArt = v.isArt && v.item && v.item.spirit;
    const tierTxt = v.isArt ? (v.grade + (isSpiritArt ? '·灵物' : '')) : ((EQUIP_TIERS[v.tier] && EQUIP_TIERS[v.tier].name) || v.tier);
    const statTxt = v.isArt ? artEffectText(v.id) : equipStatStr(v.item);
    let action = '';
    if (kind === 'equipped') {
      action = '<div class="g-actions"><button class="btn-small">卸下</button></div>';
    } else if (kind === 'bag') {
      action = '<div class="g-actions"><button class="btn-small">装备</button></div>';
    }
    card.innerHTML = '<h5>' + (isSpiritArt ? '灵物' : '法宝') + (kind === 'equipped' ? ' · 已装备' : ' · 未装备') + '</h5>' +
      '<div class="item-name" style="color:' + tc + '">[' + tierTxt + ']' + esc(v.name) + '</div>' +
      '<div class="item-stat">' + statTxt + '</div>' + action;
    if (kind === 'equipped') {
      card.querySelector('button').onclick = function () {
        Engine.unequipTreasure(S, v.id);
        log('你卸下了【' + v.name + '】。', 'dim');
        refresh(); renderCharAttr(); renderCharTreasure();
      };
    } else if (kind === 'bag' && !locked) {
      card.querySelector('button').onclick = function () {
        Engine.equipTreasureAuto(S, v.id);
        Engine.refreshStats(S); Engine.saveState(S);
        log('你装备了【' + v.name + '】。', 'good');
        refresh(); renderCharAttr(); renderCharTreasure();
      };
    }
    return card;
  }
  function treasureEmptySlot(title, sub, locked) {
    const card = document.createElement('div');
    card.className = 'treasure-slot' + (locked ? ' locked' : '');
    card.innerHTML = '<h5>' + (locked ? '🔒 ' : '') + title + '</h5>' +
      '<div class="item-stat dim">' + sub + '</div>';
    return card;
  }
  function renderCharTreasure() {
    const slotsBox = $('char-treasure-slots');
    if (!slotsBox) return;
    slotsBox.innerHTML = '';
    const maxT = Engine.maxTreasure(S);
    const equipped = Array.isArray(S.equip.treasure) ? S.equip.treasure : [];
    const inv = (S.arts || []).filter(function (id) { return equipped.indexOf(id) < 0; });
    // 栏位标题：无法宝时照常渲染，让玩家看到「空的法宝槽」（不再用一句提示顶掉整个面板）
    const title = document.createElement('p');
    title.className = 'treasure-sec-title';
    title.textContent = '法宝栏 ' + equipped.length + ' / ' + maxT + ' 已用';
    slotsBox.appendChild(title);
    // 无法宝：给一行说明即可，口径为「法宝在本页装佩」（勿再指向别的页面）
    if (!equipped.length && !inv.length) {
      const tip = document.createElement('p');
      tip.className = 'dim';
      tip.textContent = '你尚未获得任何法宝 —— 法宝在本页（法宝栏）装佩后即生效。';
      slotsBox.appendChild(tip);
    }
    // ① 已装备（生效中）
    if (equipped.length) {
      const head = document.createElement('p');
      head.className = 'treasure-sec-title';
      head.textContent = '已装备 · 生效中';
      slotsBox.appendChild(head);
      equipped.forEach(function (id) {
        const v = Engine.treasureItem(id);
        if (v) slotsBox.appendChild(treasureCard(v, 'equipped'));
      });
    }
    // ② 空栏位 + 未解锁栏位（🔒 + 解锁条件）
    const emptySlots = Math.max(0, maxT - equipped.length);
    const emptySub = inv.length ? '可在下方「储物袋法宝」中装备' : '尚未获得法宝';
    for (let i = 0; i < emptySlots; i++) {
      slotsBox.appendChild(treasureEmptySlot('空栏位', emptySub, false));
    }
    const lockedHints = treasureSlotUnlockText(S);
    if (lockedHints.length) {
      const lh = document.createElement('p');
      lh.className = 'treasure-sec-title';
      lh.textContent = '未解锁栏位（达条件后扩展）';
      slotsBox.appendChild(lh);
      lockedHints.slice(0, 3).forEach(function (txt) {
        slotsBox.appendChild(treasureEmptySlot('未解锁栏位', txt, true));
      });
    }
    // ③ 储物袋法宝（未穿戴，另一栏目）
    if (inv.length) {
      const head = document.createElement('p');
      head.className = 'treasure-sec-title';
      head.textContent = '储物袋法宝 · 未穿戴（装备后生效）';
      slotsBox.appendChild(head);
      const full = equipped.length >= maxT;
      inv.forEach(function (id) {
        const v = Engine.treasureItem(id);
        if (v) slotsBox.appendChild(treasureCard(v, 'bag', full));
      });
    }
  }
  
  function renderCharTech() {
    const techList = $('char-tech-list');
    techList.innerHTML = '';
    const eq = S.techEquip || (S.techEquip = { xinfa: null, shufa: [], dunshu: null });
    const ap = Engine.actionPoints(S);
    
    const mkRow = function (x, statStr) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      const info = document.createElement('div');
      info.innerHTML = '<b style="color:' + GRADE_COLOR[x.grade] + '">[' + x.name + ']</b> <span class="dim">' + statStr + '</span>' +
        '<br><span class="dim">' + esc(x.desc) + '</span>';
      row.appendChild(info);
      return row;
    };
    const mkBtn = function (txt, cls, fn) {
      const b = document.createElement('button');
      b.textContent = txt;
      b.className = cls || 'btn-small';
      b.onclick = fn;
      return b;
    };

    // 心法
    const h1 = document.createElement('h4');
    h1.textContent = '心法（修炼倍率）';
    h1.style.color = 'var(--gold)';
    techList.appendChild(h1);
    
    const currentXinfa = eq.xinfa && TECHNIQUES[eq.xinfa] ? TECHNIQUES[eq.xinfa] : null;
    if (currentXinfa) {
      const currentRow = document.createElement('div');
      currentRow.className = 'formula-row';
      currentRow.style.borderColor = '#e8c15a';
      currentRow.innerHTML = '<div><b style="color:#e8c15a">[当前]</b> <b style="color:' + GRADE_COLOR[currentXinfa.grade] + '">[' + currentXinfa.name + ']</b> <span class="dim">修炼 +' + Math.round((currentXinfa.mult - 1) * 100) + '%</span>' +
        '<br><span class="dim">' + esc(currentXinfa.desc) + '</span></div>';
      techList.appendChild(currentRow);
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备心法</div>';
      techList.appendChild(emptyRow);
    }
    
    const xinfa = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'xinfa' && t !== eq.xinfa; });
    if (xinfa.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可切换心法：';
      switchTitle.style.marginTop = '8px';
      techList.appendChild(switchTitle);
      
      xinfa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, '修炼 +' + Math.round((x.mult - 1) * 100) + '%');
        const b = mkBtn('切换', 'btn-small', function () {
          Engine.setXinfa(S, t);
          sfx('good');
          log('你改修【' + x.name + '】，从此专精此道。', 'good');
          renderCharTech();
        });
        row.appendChild(b);
        techList.appendChild(row);
      });
    }

    // 法术
    const h2 = document.createElement('h4');
    const usedN = (eq.shufa || []).length;
    h2.textContent = '法术（法术位 ' + usedN + '/' + ap + '）';
    h2.style.color = 'var(--gold)';
    techList.appendChild(h2);
    
    const equippedShufa = (eq.shufa || []).filter(function(t) { return TECHNIQUES[t]; });
    if (equippedShufa.length) {
      equippedShufa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = document.createElement('div');
        row.className = 'formula-row';
        row.style.borderColor = '#e8c15a';
        row.innerHTML = '<div><b style="color:#e8c15a">[已装备]</b> <b style="color:' + GRADE_COLOR[x.grade] + '">[' + x.name + ']</b> <span class="dim">威力 ' + x.dmg + '× 攻击 · 耗灵 ' + (x.cost || 0) + '</span>' +
          '<br><span class="dim">' + esc(x.desc) + '</span></div>';
        const b = mkBtn('卸下', 'btn-small', function () {
          Engine.toggleShufa(S, t);
          sfx('click');
          log('你撤下了【' + x.name + '】。', 'good');
          renderCharTech();
        });
        row.appendChild(b);
        techList.appendChild(row);
      });
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备法术</div>';
      techList.appendChild(emptyRow);
    }
    
    const shufa = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'shufa' && (eq.shufa || []).indexOf(t) < 0; });
    if (shufa.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可装备法术：';
      switchTitle.style.marginTop = '8px';
      techList.appendChild(switchTitle);
      
      shufa.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, (x.slow ? '缚敌之霜' : '威力 ' + x.dmg + '× 攻击') + ' · 耗灵 ' + (x.cost || 0));
        const b = mkBtn('装备', 'btn-small', function () {
          const ok = Engine.toggleShufa(S, t);
          if (!ok) {
            log('法术位已满，请先卸下一门法术。', 'bad');
            return;
          }
          sfx('click');
          log('你把【' + x.name + '】纳入法术位。', 'good');
          renderCharTech();
        });
        row.appendChild(b);
        techList.appendChild(row);
      });
    }

    // 遁术
    const h3 = document.createElement('h4');
    h3.textContent = '遁术（身法）';
    h3.style.color = 'var(--gold)';
    techList.appendChild(h3);
    
    const currentDunshu = eq.dunshu && TECHNIQUES[eq.dunshu] ? TECHNIQUES[eq.dunshu] : null;
    if (currentDunshu) {
      const currentRow = document.createElement('div');
      currentRow.className = 'formula-row';
      currentRow.style.borderColor = '#e8c15a';
      currentRow.innerHTML = '<div><b style="color:#e8c15a">[当前]</b> <b style="color:' + GRADE_COLOR[currentDunshu.grade] + '">[' + currentDunshu.name + ']</b> <span class="dim">逃脱 ' + Math.round((currentDunshu.flee || 0) * 100) + '% · 减伤 ' + Math.round((currentDunshu.guard || 0) * 100) + '%</span>' +
        '<br><span class="dim">' + esc(currentDunshu.desc) + '</span></div>';
      techList.appendChild(currentRow);
    } else {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'formula-row';
      emptyRow.innerHTML = '<div class="dim">[空槽位] 尚未装备遁术</div>';
      techList.appendChild(emptyRow);
    }
    
    const dunshu = S.techs.filter(function (t) { return TECHNIQUES[t] && TECHNIQUES[t].cls === 'dunshu' && t !== eq.dunshu; });
    if (dunshu.length) {
      const switchTitle = document.createElement('p');
      switchTitle.className = 'dim';
      switchTitle.textContent = '可切换遁术：';
      switchTitle.style.marginTop = '8px';
      techList.appendChild(switchTitle);
      
      dunshu.forEach(function (t) {
        const x = TECHNIQUES[t];
        const row = mkRow(x, '逃脱 ' + Math.round((x.flee || 0) * 100) + '% · 减伤 ' + Math.round((x.guard || 0) * 100) + '%');
        const b = mkBtn('切换', 'btn-small', function () {
          Engine.setDunshu(S, t);
          sfx('good');
          log('你改习【' + x.name + '】，身法大进。', 'good');
          renderCharTech();
        });
        row.appendChild(b);
        techList.appendChild(row);
      });
    }
  }

  /* ============================================================
     P1–P7 新界面：开荒 / 洞府 / 百艺·五行阵 / 宗门 / 游历 / 仙缘
     ============================================================ */
  function openPanel(html) {
    const ov = $('modal'); const box = $('modal-body');
    ov.style.display = 'flex'; box.innerHTML = html;
    box.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
    return box;
  }
  // ⚠ 自动战斗（autoFight）已移除：宗门大比 / 委托敌人一律走手动战斗（openBattle）。

  /* ---------- P1 开荒初始化 ---------- */
  let createSel = null;
  let createStep = 1;
  function showCreatePage() {
    createSel = { linggenId: null, bgId: null, points: { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, ling: 0 }, craft: {}, exp: [] };
    createStep = 1;
    CRAFT_KINDS.forEach(function (k) { createSel.craft[k.id] = 0; });
    showScreen('create');
    renderCreatePage();
  }
  function createSpent() {
    let spent = 0;
    if (createSel.linggenId) spent += (LINGGEN_POINTS[createSel.linggenId] || 0);
    if (createSel.bgId) { const bg = findBackground(createSel.bgId); spent += (bg.point || 0); }
    CRAFT_KINDS.forEach(function (k) { spent += (CRAFT_POINTS[createSel.craft[k.id]] || 0); });
    ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'].forEach(function (k) { spent += (createSel.points[k] || 0); });
    // 经历：口径在引擎（Engine.initExpCost），UI 不自算。【早夭】为负 → 抵消其他花费
    spent += Engine.initExpCost(createSel);
    return spent;
  }
  const CT_STAT_NAMES = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', ling: '灵力' };
  const CT_RES_NAMES = { stone: '灵石', iron: '铁', herb: '药', life: '寿元', qi: '修为', elixir: '丹药', beast: '灵兽', jade: '玉' };
  function traitEffectText(e) {
    if (!e) return '';
    const map = { critPct: '暴击', hpMax: '气血', mpMax: '灵力上限', tribPct: '渡劫', atk: '攻击', def: '防御', dodgePct: '闪避' };
    const parts = [];
    for (const k in e) {
      if (map[k]) parts.push(map[k] + '+' + e[k] + (k === 'critPct' || k === 'tribPct' || k === 'dodgePct' ? '%' : ''));
      else if (CT_STAT_NAMES[k]) parts.push(CT_STAT_NAMES[k] + '+' + e[k]);
    }
    return parts.join('·');
  }
  function linggenBonusText(l) {
    const parts = [];
    if (l.wuBonus) parts.push('悟+' + l.wuBonus);
    if (l.lingBonus) parts.push('灵+' + l.lingBonus);
    const te = traitEffectText(l.trait && l.trait.effect);
    if (te) parts.push(te);
    return parts.join('·');
  }
  function flavorBonusText(flavor) {
    if (!flavor) return '';
    const parts = [];
    ['wu', 'ti', 'dun', 'shen', 'dao', 'ling'].forEach(function (k) { if (flavor[k]) parts.push(CT_STAT_NAMES[k] + (flavor[k] > 0 ? '+' : '') + flavor[k]); });
    for (const k in flavor) {
      if (['wu', 'ti', 'dun', 'shen', 'dao', 'ling'].indexOf(k) >= 0) continue;
      if (CT_RES_NAMES[k] && flavor[k]) parts.push(CT_RES_NAMES[k] + (flavor[k] > 0 ? '+' : '') + flavor[k]);
    }
    return parts.join('·');
  }
  function renderCreatePage() {
    const body = $('create-body'); if (!body) return;
    const budget = Engine.openPointsTotal(S);
    const spent = createSpent();
    const remain = budget - spent;
    const step = createStep || 1;
    let h = '';
    h += '<div class="create-budget">开荒点数：<b class="' + (remain < 0 ? 'bad' : 'good') + '">' + remain + '</b> / ' + budget + '</div>';
    if (step === 1) {
      h += '<h3 class="ct-sec">一 · 择灵根</h3><div class="ct-grid ct-grid2 ct-scroll3">';
      LINGGEN_POOL.forEach(function (l) {
        const cost = LINGGEN_POINTS[l.id] || 0;
        const sel = createSel.linggenId === l.id ? ' selected' : '';
        h += '<div class="ct-card' + sel + '" data-lg="' + l.id + '">'
          + '<div class="ct-card-h"><b>' + l.name + '</b><span class="ct-point">' + cost + '点</span></div>'
          + '<div class="ct-bonus">' + linggenBonusText(l) + '</div></div>';
      });
      h += '</div>';
      h += '<h3 class="ct-sec">二 · 定出身</h3><div class="ct-grid ct-grid2">';
      BACKGROUNDS.forEach(function (b) {
        const sel = createSel.bgId === b.id ? ' selected' : '';
        h += '<div class="ct-card' + sel + '" data-bg="' + b.id + '">'
          + '<div class="ct-card-h"><b>' + b.title + '</b><span class="ct-point">' + b.point + '点</span></div>'
          + '<div class="ct-bonus">' + flavorBonusText(b.flavor) + '</div></div>';
      });
      h += '</div>';
      h += '<h3 class="ct-sec">三 · 经历</h3><div class="ct-grid ct-grid2">';
      (Engine.INIT_EXP || []).forEach(function (e) {
        const on = createSel.exp.indexOf(e.id) >= 0;
        h += '<div class="ct-card' + (on ? ' selected' : '') + '" data-exp="' + e.id + '">'
          + '<div class="ct-card-h"><b>' + e.name + '</b><span class="ct-point' + (e.cost < 0 ? ' good' : '') + '">' + e.cost + '点</span></div>'
          + '<div class="ct-bonus">' + e.desc + '</div></div>';
      });
      h += '</div>';
      h += '<h3 class="ct-sec">四 · 百艺</h3><div class="ct-craft">';
      CRAFT_KINDS.forEach(function (k) {
        const lv = createSel.craft[k.id];
        let opts = '';
        [0, 1, 2, 3].forEach(function (n) { opts += '<button class="ct-lv' + (lv === n ? ' on' : '') + '" data-ck="' + k.id + '" data-cl="' + n + '">Lv' + n + '</button>'; });
        h += '<div class="ct-craft-row"><span>' + k.name + '</span><div class="ct-lv-row">' + opts + '</div></div>';
      });
      h += '</div>';
      body.innerHTML = h;
      const canOk = createSel.linggenId && createSel.bgId && remain >= 0;
      const footer = $('create-footer');
      footer.innerHTML = '<button class="btn-small" id="ct-back-enter">← 返回命格</button>'
        + '<button class="btn-main wide" id="ct-next"' + (canOk ? '' : ' disabled') + '>预览命数 · 下一页</button>';
      body.querySelectorAll('[data-lg]').forEach(function (c) { c.onclick = function () { createSel.linggenId = c.getAttribute('data-lg'); renderCreatePage(); }; });
      body.querySelectorAll('[data-bg]').forEach(function (c) { c.onclick = function () { createSel.bgId = c.getAttribute('data-bg'); renderCreatePage(); }; });
      // 经历：多选 toggle（取 / 不取），点第二次即取消；【早夭】cost 为负，选中反而增加预算
      body.querySelectorAll('[data-exp]').forEach(function (c) {
        c.onclick = function () {
          const id = c.getAttribute('data-exp');
          const i = createSel.exp.indexOf(id);
          if (i >= 0) createSel.exp.splice(i, 1); else createSel.exp.push(id);
          renderCreatePage();
        };
      });
      body.querySelectorAll('.ct-lv').forEach(function (b) { b.onclick = function () { createSel.craft[b.getAttribute('data-ck')] = +b.getAttribute('data-cl'); renderCreatePage(); }; });
      $('ct-next').onclick = function () { createStep = 2; renderCreatePage(); };
      $('ct-back-enter').onclick = function () { showEnterPage(); };
    } else {
      h += '<h3 class="ct-sec">命数总览</h3><div class="ct-preview" id="ct-preview"></div>';
      body.innerHTML = h;
      const canOk = createSel.linggenId && createSel.bgId && remain >= 0;
      const footer = $('create-footer');
      footer.innerHTML = '<button class="btn-small" id="ct-back">← 返回</button>'
        + '<button class="btn-main wide" id="ct-confirm"' + (canOk ? '' : ' disabled') + '>落定命数 · 踏入仙途</button>';
      updateCreatePreview();
      $('ct-back').onclick = function () { createStep = 1; renderCreatePage(); };
      $('ct-confirm').onclick = function () {
        if (!createSel.linggenId || !createSel.bgId || createSpent() > budget) { log('请先择灵根、定出身，且点数不可超支。', 'bad'); return; }
        const sel = { linggenId: createSel.linggenId, bgId: createSel.bgId, points: createSel.points, craft: createSel.craft, exp: createSel.exp.slice(), initPoints: budget - createSpent() };
        Engine.applyInit(S, sel);
        const bg = findBackground(S.bg);
        showChapter('第 一 章 · ' + bg.title, bg.lines, { subtitle: '凡尘旧事' }).then(function () { showScreen('game'); initGame(); });
      };
    }
  }
  function updateCreatePreview() {
    const pv = $('ct-preview'); if (!pv) return;
    const lg = createSel.linggenId ? LINGGEN_POOL.filter(function (l) { return l.id === createSel.linggenId; })[0] : null;
    const bg = createSel.bgId ? findBackground(createSel.bgId) : null;
    const f = bg && bg.flavor ? bg.flavor : {};
    const wu = S.wu + (lg && lg.wuBonus ? lg.wuBonus : 0) + (f.wu || 0) + (createSel.points.wu || 0);
    const ti = S.ti + (f.ti || 0) + (createSel.points.ti || 0);
    const dun = S.dun + (f.dun || 0) + (createSel.points.dun || 0);
    const shen = S.shen + (f.shen || 0) + (createSel.points.shen || 0);
    const dao = S.dao + (f.dao || 0) + (createSel.points.dao || 0);
    const ling = S.ling + (lg && lg.lingBonus ? lg.lingBonus : 0) + (f.ling || 0) + (createSel.points.ling || 0);
    let s = '灵根：' + (lg ? lg.name + '（灵气效率 ' + Math.round(lg.qiMul * 100) + '%）' : '（未选）') + '<br>';
    if (lg && lg.desc) s += '<span class="ct-story">灵根·' + lg.desc + '</span><br>';
    s += '出身：' + (bg ? bg.title : '（未选）') + '<br>';
    if (bg && bg.story) s += '<span class="ct-story">出身·' + bg.story + '</span><br>';
    s += '六维（含出身/灵根/分配）：悟 ' + wu + '　体 ' + ti + '　遁 ' + dun + '　神 ' + shen + '　道 ' + dao + '　灵 ' + ling + '<br>';
    // 经历：只列已选；早夭会把寿元压到 50（70-20），此处显式提示
    const expNames = (Engine.INIT_EXP || []).filter(function (e) { return createSel.exp.indexOf(e.id) >= 0; });
    s += '经历：' + (expNames.length ? expNames.map(function (e) { return e.name + '（' + e.cost + '点）'; }).join('、') : '（未选）') + '<br>';
    s += '寿元：' + (S.lifeMax + (f.life || 0) + (createSel.exp.indexOf('life20') >= 0 ? 20 : 0) + (createSel.exp.indexOf('zaoyao') >= 0 ? -20 : 0)) + ' 年<br>';
    s += '百艺：' + CRAFT_KINDS.map(function (k) { return k.name + ' Lv' + createSel.craft[k.id]; }).join('、');
    pv.innerHTML = s;
  }

  /* ---------- P2 洞府：三档修炼 + 聚灵阵 ---------- */
  function openCultivate() {
    if (!S || S.dead) return;
    showScreen('cultivate');
    renderCultivate();
    $('cultivate-back').onclick = function () { showScreen('game'); refresh(); };
  }
  function renderCultivate() {
    const body = $('cultivate-body'); if (!body) return;
    const need = Engine.requireNeed(S);
    const modes = Engine.cultModes(S);
    const cultTimes = S.cultTimes || 0, cultMax = S.cultMax || 1;
    let h = '<div class="stat-row"><label>修为</label><div class="bar-box"><div class="bar-fill" style="width:' + Math.min(100, S.qi / need * 100) + '%"></div></div><span class="num">' + S.qi + ' / ' + need + '</span></div>';
    h += '<h3 class="ct-sec">修炼（每年 ' + cultMax + ' 次）</h3><div class="ct-grid">';
    modes.forEach(function (m) {
      const dis = ((cultTimes >= cultMax) || !Engine.canAction(S, m.ap) || S.qi >= need) ? ' disabled' : '';
      h += '<button class="ct-card act-card" data-mode="' + m.id + '"' + dis + '>'
        + '<div class="ct-card-h"><b>' + m.name + '</b><span class="ct-tier">' + m.ap + ' 点</span></div>'
        + '<div class="ct-sub">效率 ×' + m.mult + '</div>'
        + '<div class="ct-desc">本次修为 +' + (m.gain > 0 ? m.gain : 0) + '</div></button>';
    });
    h += '</div>';
    if (cultTimes >= cultMax) h += '<div class="dim">今年已修炼 ' + cultTimes + ' 次，明年再来。</div>';
    h += '<h3 class="ct-sec">聚灵阵（年耗灵石，修炼灵气 +%）</h3><div class="ct-grid">';
    JULING_ARRAY.forEach(function (j) {
      const cur = (S.array && S.array.juling && S.array.juling.level === j.lv);
      h += '<button class="ct-card' + (cur ? ' selected' : '') + '" data-jl="' + j.lv + '">'
        + '<div class="ct-card-h"><b>' + (j.lv === 0 ? '未布置' : 'Lv' + j.lv) + '</b><span class="ct-tier">+' + (j.pct * 100) + '%</span></div>'
        + '<div class="ct-desc">' + (j.lv === 0 ? '无消耗' : ('年耗灵石 ' + j.stonePerYear)) + '</div></button>';
    });
    h += '</div>';
    h += '<p class="dim" style="margin:8px 0 0;font-size:12px;">布置聚灵阵亦于每年岁末自动累积阵道心得，助「阵法」百艺升阶（单阵约 60 年臻化境，与五行阵并行约 30 年）。</p>';
    body.innerHTML = h;
    body.querySelectorAll('[data-mode]').forEach(function (b) {
      b.onclick = function () {
        if (b.hasAttribute('disabled')) return;
        const r = Engine.cultivate(S, b.getAttribute('data-mode'));
        log(r, (r.indexOf('不足') >= 0 || r.indexOf('已满') >= 0) ? 'bad' : 'good');
        refresh(); renderCultivate();
      };
    });
    body.querySelectorAll('[data-jl]').forEach(function (b) {
      b.onclick = function () {
        const lv = +b.getAttribute('data-jl');
        const j = JULING_ARRAY[lv];
        const txt = (lv === 0)
          ? '确定撤去聚灵阵，恢复为「未布置」？'
          : ('确定将聚灵阵设为 <b>Lv' + lv + '</b>' + (j.stonePerYear ? ('（年耗灵石 ' + j.stonePerYear + '）') : '') + '？');
        openPanel('<h3>布置聚灵阵</h3><p class="dim">' + txt + '</p>'
          + '<div style="display:flex;gap:8px;margin-top:12px;">'
          + '<button class="btn-main" id="jl-ok">确定</button>'
          + '<button class="btn-small" id="jl-cancel">取消</button></div>');
        $('jl-ok').onclick = function () {
          const r = Engine.julingSet(S, lv);
          log(r.msg, r.ok ? 'good' : 'bad');
          closeModal(); refresh(); renderCultivate();
        };
        $('jl-cancel').onclick = function () { closeModal(); };
      };
    });
  }

  /* ---------- 境界解释文案 ---------- */
  const REALM_DESC = {
    '炼气': '引气入体，吐纳炼气，初窥仙途门径。',
    '筑基': '筑基立道，根基已成，可御使法宝、拜入宗门。',
    '金丹': '金丹凝结，寿元大增，神通渐显。',
    '元婴': '元婴出窍，可夺舍重生，威能莫测。',
    '化神': '炼神返虚，与天地共鸣。',
    '飞升': '渡劫功成，白日飞升，超脱轮回。'
  };
  /* ---------- P4 宗门 ---------- */
  function openSect() {
    if (!S || S.dead) return;
    showScreen('sect');
    renderSect();
    $('sect-back').onclick = function () { showScreen('game'); refresh(); };
  }
  function sectRankNext(rank) {
    const order = ['杂役', '外门', '内门', '真传', '核心', '首席'];
    const idx = order.indexOf(rank);
    if (idx < 0 || idx >= order.length - 1) return null;
    return SECT_RANKS.filter(function (r) { return r.id === order[idx + 1]; })[0];
  }
  function renderSect() {
    const body = $('sect-body'); if (!body) return;
    const st = STAGES[S.idx] || { sym: '', realm: S.realm || '炼气', sub: '', color: '#e8c15a' };
    const realmText = (st.sym ? st.sym + ' ' : '') + st.realm + (st.sub ? ' · ' + st.sub : '');
    const rd = REALM_DESC[st.realm] || '';
    const banner = '<div class="realm-note">境界：<b style="color:' + (st.color || '#e8c15a') + '">' + realmText + '</b>　<span class="dim">' + rd + '</span></div>';
    // —— 态A：未正式入宗（散修 或 已择宗但未过考验 / 杂役）→ 仅「入宗考验」受限界面 ——
    if (!Engine.sectPassed(S)) {
      if (!S.sect) {
        let h = '<p class="dim">你尚是散修。择一仙门拜入，须先过【入宗考验】方得正式地位——不考验，无法入宗。</p><div class="ct-grid">';
        Object.keys(SECTS).forEach(function (id) {
          const sc = SECTS[id];
          h += '<div class="ct-card" data-sect="' + id + '"><div class="ct-card-h"><b>' + sc.name + '</b></div><div class="ct-desc">' + (sc.desc || '') + '</div></div>';
        });
        h += '</div>';
        body.innerHTML = banner + h;
        body.querySelectorAll('[data-sect]').forEach(function (c) {
          c.onclick = function () {
            S.sect = c.getAttribute('data-sect'); S.sectRank = null;   // 择宗，仍未过考验
            Engine.saveState(S);
            log('你意属【' + SECTS[S.sect].name + '】，执事弟子引你至演武场应考。', 'good');
            refresh(); renderSect();
          };
        });
        return;
      }
      const sc = SECTS[S.sect];
      const isServant = S.sectRank === '杂役';
      let h = '<div class="sect-head">宗门：<b>' + sc.name + '</b>　身份：<b>' + (isServant ? '杂役' : '待考') + '</b></div>';
      if (isServant) h += '<p class="dim">你未通过入宗考验，暂为杂役，宗门诸多便利皆未对你开放。可每年再赴考验；或待你筑基，宗门自会提你为内门弟子。</p>';
      else h += '<p class="dim">你已意属' + sc.name + '，尚在候考。通过【入宗考验】方为正式弟子（不考验，无法入宗）。</p>';
      h += '<div class="ct-grid sect-menu">'
        + '<button class="ct-card act-card" data-act="sect-trial"><div class="ct-card-h"><b>入宗考验</b></div>'
        + '<div class="ct-desc">武骨（悟性≥8）· 道心（道心≥8）· 实战（胜一场）</div></button></div>';
      body.innerHTML = banner + h;
      body.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { sectAction(b.getAttribute('data-act')); }; });
      return;
    }
    const sc = SECTS[S.sect];
    const rank = S.sectRank;
    let h = '<div class="sect-head">宗门：<b>' + sc.name + '</b>　地位：<b>' + rank + '</b>　功业：<b>' + (S.gongyeEarned || 0) + '</b>（可用 ' + (S.gongye || 0) + '）</div>';
    const nx = sectRankNext(rank);
    if (nx) {
      const ri = Engine.realmIdx(nx.realm);
      const realmOk = nx.realm === null || Engine.bigIdxOf(S) >= ri;
      h += '<div class="dim">下阶【' + nx.id + '】需功业 ' + nx.gongye + '（已得 ' + (S.gongyeEarned || 0) + '）'
        + (nx.realm ? ' 且境界 ' + nx.realm + (realmOk ? '（已满足）' : '（未达）') : '') + '</div>';
    }
    h += '<div class="ct-grid sect-menu">';
    const dabiSt = Engine.dabiStatus(S);
    const commLeft = Engine.commissionYearLeft(S);
    const items = [
      ['sect-promote', '申请晋升', ''],
      ['sect-comm', '宗门任务', '本年剩余 ' + commLeft + '/3 件'],
      ['sect-dabi', '宗门大比', dabiSt.msg],
      ['sect-train', '练神峰·聚灵潭', ''],
      ['sect-shop', '宗门商人', ''],
      ['sect-master', '师父传功', ''],
      ['sect-fight', '切磋演武（未开放）', '']
    ];
    items.forEach(function (it) {
      h += '<button class="ct-card act-card" data-act="' + it[0] + '"><div class="ct-card-h"><b>' + it[1] + '</b></div>'
        + (it[2] ? '<div class="ct-sub">' + it[2] + '</div>' : '') + '</button>';
    });
    h += '</div>';
    body.innerHTML = banner + h;
    body.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { sectAction(b.getAttribute('data-act')); }; });
  }
  function sectAction(act) {
    if (act === 'sect-trial') return sectDoTrial();
    if (act === 'sect-promote') return sectDoPromote();
    if (act === 'sect-comm') return sectDoCommission();
    if (act === 'sect-dabi') return sectDoDabi();
    if (act === 'sect-train') return sectDoTrain();
    if (act === 'sect-shop') return sectDoShop();
    if (act === 'sect-master') return sectDoMaster();
    if (act === 'sect-fight') return sectDoFight();
  }
  function sectDoTrial() {
    // 每年限应考 1 次：今年已考过（杂役重考）→ 拦截提示
    if (S.lastTrialYear === S.year) {
      uiAlert('今年已应考过入宗考验，来年再来吧。');
      return;
    }
    const isServant = S.sectRank === '杂役';
    const critHtml = function (win) {
      const wuEff = Engine.effAttr(S, 'wu'), daoEff = Engine.effAttr(S, 'dao');
      const A = wuEff >= 8, B = daoEff >= 8;
      const mk = function (ok) { return ok ? '<span class="tc-mark ok">✓</span>' : '<span class="tc-mark no">✗</span>'; };
      const wMark = win === undefined ? '<span class="tc-mark">·</span>'
        : (win ? '<span class="tc-mark ok">✓</span>' : '<span class="tc-mark no">✗</span>');
      const wVal = win === undefined ? '待考' : (win ? '胜' : '败');
      return '<div class="trial-crit">'
        + '<div class="tc-row"><span class="tc-name">武骨</span><span class="tc-req">悟性 ≥ 8</span><span class="tc-val">当前 ' + Math.round(wuEff) + '</span>' + mk(A) + '</div>'
        + '<div class="tc-row"><span class="tc-name">道心</span><span class="tc-req">道心 ≥ 8</span><span class="tc-val">当前 ' + Math.round(daoEff) + '</span>' + mk(B) + '</div>'
        + '<div class="tc-row"><span class="tc-name">实战</span><span class="tc-req">胜一场</span><span class="tc-val">' + wVal + '</span>' + wMark + '</div>'
        + '</div>';
    };
    const renderPanel = function () {
      if (!S.sect) {
        // 未选宗门：面板内先自选
        let h = '<h3>入宗考验</h3><p class="dim">请先择一仙门——过【入宗考验】方录入籍。三关：武骨（悟性≥8）、道心（道心≥8）、实战（胜一场）；三关皆过为【真传】，过两关【内门】，过一关【外门】，皆不过【杂役】。</p>'
          + '<div class="ct-grid sect-pick">';
        Object.keys(SECTS).forEach(function (id) {
          const sc = SECTS[id];
          h += '<div class="ct-card" data-sect="' + id + '"><div class="ct-card-h"><b>' + sc.name + '</b></div><div class="ct-desc">' + (sc.desc || '') + '</div></div>';
        });
        h += '</div><div id="trial-result"></div>';
        const box = openPanel(h);
        box.querySelectorAll('[data-sect]').forEach(function (c) {
          c.onclick = function () {
            S.sect = c.getAttribute('data-sect'); S.sectRank = null;
            Engine.saveState(S);
            log('你意属【' + SECTS[S.sect].name + '】，执事弟子引你至演武场应考。', 'good');
            refresh(); renderSect(); renderPanel();
          };
        });
        return;
      }
      const sc = SECTS[S.sect];
      let h = '<h3>入宗考验 · ' + sc.name + '</h3>'
        + '<p class="dim">' + (isServant ? '你身为杂役，宗门允你再来一试，评得更高身份便当授之。' : '宗门以三项观人，过对应关数定身份。') + '</p>'
        + critHtml(undefined)
        + '<div id="trial-result"></div>'
        + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">'
        + '<button class="btn-small" id="trial-repick">重选宗门</button>'
        + '<button class="btn-main" id="trial-go">接受考验（实战）</button>'
        + '<button class="btn-small" id="trial-done" data-close="1" style="display:none;">踏入宗门</button></div>';
      const box = openPanel(h);
      box.querySelector('#trial-repick').onclick = function () { S.sect = null; renderPanel(); };
      box.querySelector('#trial-go').onclick = function () {
        if (!S.sect) { uiAlert('请先择一仙门。'); return; }
        closeModal(); // 关闭入宗考验面板，转入试炼之路（复用秘境横版路线：敌人/精英/静室→大BOSS）
        startTrialFlow('sect', { title: '入宗试炼 · ' + (SECTS[S.sect] ? SECTS[S.sect].name : '') });
      };
    };
    renderPanel();
  }
  function sectDoPromote() {
    const before = S.sectRank;
    const r = Engine.tryRankUp(S);
    Engine.saveState(S);
    openPanel('<h3>申请晋升</h3><p>' + (r ? ('晋升成功！地位升至【' + r.rank + '】') : ('条件未足，暂未晋升（当前【' + before + '】）。')) + '</p>'
      + '<div style="margin-top:10px;"><button class="btn-main" data-close="1">返回</button></div>');
    refresh();
  }
  function sectDoCommission() {
    const list = Engine.commissionAvailable(S);
    const left = Engine.commissionYearLeft(S);
    let h = '<h3>宗门任务</h3><p class="dim">每年至多接取 <b>3</b> 件（本年剩余 <b>' + left + '/3</b>）。办妥可得灵石与功业。</p>';
    if (!list.length) h += '<p class="dim">当前地位无可承接之任务。</p>';
    else {
      h += '<div class="ct-grid">';
      list.forEach(function (c) {
        const okBase = Engine.commissionCanAccept(S, c);
        const can = okBase && left > 0;
        let req = '境界 ' + c.realm;
        if (c.check) req += '｜' + Object.keys(c.check).map(function (k) { return ({ wu: '悟', ti: '体', dun: '遁', shen: '神', dao: '道', ling: '灵' }[k] || k) + '≥' + c.check[k]; }).join(' ');
        if (c.craft) { const ck = CRAFT_KINDS.filter(function (k) { return k.id === c.craft; })[0]; req += '｜百艺 ' + (ck ? ck.name : c.craft) + ' Lv' + c.minLv; }
        // 守敌数值与实战同一口径（Engine.commissionEnemy），不在 UI 里另算
        if (c.enemy) { const foe = Engine.commissionEnemy(S, c); req += '｜守敌 攻 ' + foe.atk + ' 血 ' + foe.hp; }
        const rw = '灵石 ' + c.stone[0] + '~' + c.stone[1] + (c.gongye ? ('　功业 ' + c.gongye[0] + '~' + c.gongye[1]) : '');
        h += '<div class="ct-card"><div class="ct-card-h"><b>' + c.name + '</b><span class="ct-tier">免行动点</span></div>'
          + '<div class="ct-sub">' + req + '</div><div class="ct-desc">奖励：' + rw + '</div>'
          + '<button class="btn-small comm-do" data-c="' + c.id + '"' + (can ? '' : ' disabled') + '>' + (can ? '接取' : (okBase ? '本年已满' : '未达')) + '</button></div>';
      });
      h += '</div>';
    }
    const box = openPanel(h);
    box.querySelectorAll('.comm-do').forEach(function (b) {
      b.onclick = function () {
        const id = b.getAttribute('data-c');
        const c = Engine.commissionAvailable(S).filter(function (x) { return x.id === id; })[0];
        if (!c) return;
        if (Engine.commissionYearLeft(S) <= 0) { log('本年宗门任务已接满（每年至多 3 件），来年再来。', 'bad'); return; }
        if (c.enemy) {
          // 含守敌的委托：先手动战斗，胜则结算奖励；败则消耗次数但不扣寿元、不耗行动点、不结算奖励。
          const foe = Engine.commissionEnemy(S, c);
          openBattle({ name: foe.name, line: foe.line || '', atk: foe.atk, hp: foe.hp, loot: {}, portrait: foe.portrait, noFlee: true }, { title: '宗门任务 · ' + c.name }).then(function (r) {
            if (r.lost) {
              // 战斗任务失败：消耗本年次数，但不扣寿元、不消耗行动点、不结算奖励
              const prevN = (S.commYear && S.commYear.y === S.year) ? (S.commYear.n || 0) : 0;
              S.commYear = { y: S.year, n: prevN + 1 };
              Engine.saveState(S);
              log('临阵不敌，委托未能完成，但已记入本年宗门任务（剩余 ' + Engine.commissionYearLeft(S) + ' 件）。', 'bad');
              refresh(); sectDoCommission(); return;
            }
            finishCommission(id);
          });
        } else {
          finishCommission(id);
        }
        function finishCommission(id) {
          const r = Engine.commissionComplete(S, id);
          log(r.msg, r.ok ? 'good' : 'bad'); refresh(); sectDoCommission();
        }
      };
    });
  }
  function sectDoDabi() {
    const st = Engine.dabiStatus(S);
    const back = '<div style="margin-top:10px;"><button class="btn-main" data-close="1">返回</button></div>';
    if (!st.eligible) { openPanel('<h3>宗门大比</h3><p class="dim">' + st.msg + '</p>' + back); return; }
    if (!st.canEnter) {
      openPanel('<h3>宗门大比</h3><p class="dim">' + st.msg + '（第 ' + st.nextYear + ' 年开赛）</p>'
        + '<p class="dim" style="font-size:12px;">每十载一届，一条直线连战五层；全胜者气血与灵力尽数回满。</p>' + back);
      return;
    }
    if (!(S.dabi && !S.dabi.done)) {
      const r = Engine.sectDabiStart(S);
      if (!r.ok) { openPanel('<h3>宗门大比</h3><p class="dim">' + r.msg + '</p>' + back); return; }
    }
    Engine.saveState(S);
    dabiStep();
  }
  // 宗门大比 · 秘境化连战：5 层排成**一条直线**依次闯过，全胜为唯一回满之机。
  function dabiStep() {
    const total = Engine.dabiLayerCount();
    if (!S.dabi || S.dabi.done) { openPanel('<h3>宗门大比</h3><p>' + (S.lastDabiMsg || '本届大比已结束。') + '</p><div style="margin-top:10px;"><button class="btn-main" data-close="1">返回</button></div>'); return; }
    const fi = S.dabi.idx;
    let h = '<h3>宗门大比 · 第 ' + (fi + 1) + '/' + total + ' 层</h3>'
      + '<p class="dim">一条直线连战五层，连胜方为全胜（唯一回满之机）。当前气血 ' + S.hp + '/' + S.hpMax + '</p>'
      + '<div class="dabi-ladder">';
    for (let i = 0; i < total; i++) {
      const lf = Engine.dabiFoe(S, i);
      const cls = i < fi ? 'done' : (i === fi ? 'cur' : 'future');
      const mark = i < fi ? '已胜' : (i === fi ? '应战中' : '未启');
      h += '<div class="dabi-node ' + cls + '"><span class="dabi-node-n">第 ' + (i + 1) + ' 层 · ' + lf.name + '</span>'
        + '<span class="dabi-node-s">攻 ' + lf.atk + '　血 ' + lf.hp + '　' + mark + '</span></div>';
    }
    h += '</div>'
      + '<div style="margin-top:10px;"><button class="btn-main" id="dabi-go">出战</button></div>'
      + '<div id="dabi-r" style="margin-top:8px;"></div>';
    const box = openPanel(h);
    box.querySelector('#dabi-go').onclick = function () {
      const foe = Engine.dabiFoe(S, fi);
      openBattle({ name: foe.name, line: '', atk: foe.atk, hp: foe.hp, loot: {} }, { title: '宗门大比 · 第 ' + (fi + 1) + ' 层' }).then(function (r) {
        const win = !r.lost;
        const rr = Engine.sectDabiStep(S, win);
        S.lastDabiMsg = rr.msg;
        Engine.saveState(S);
        log('大比第 ' + (fi + 1) + ' 层' + (win ? '胜' : '败') + '：' + rr.msg, win ? 'good' : 'bad');
        refresh();
        if (rr.done) openPanel('<h3>宗门大比</h3><p>' + rr.msg + '</p><div style="margin-top:10px;"><button class="btn-main" data-close="1">返回</button></div>');
        else dabiStep();
      });
    };
  }
  function sectDoTrain() {
    const bi = Engine.bigIdxOf(S);
    const realm = BIG_REALMS[bi];
    const shenN = (S.sectTrain && S.sectTrain.shenByRealm && S.sectTrain.shenByRealm[realm]) || 0;
    const lingN = (S.sectTrain && S.sectTrain.lingByRealm && S.sectTrain.lingByRealm[realm]) || 0;
    const box = openPanel('<h3>练神峰 · 聚灵潭</h3>'
      + '<p class="dim">每境神识、灵力各可锤炼 10 次（耗 2 行动点/次）。当前【' + realm + '】神识 ' + shenN + '/10，灵力 ' + lingN + '/10。</p>'
      + '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-small" id="tr-shen">练神（+神识）</button><button class="btn-small" id="tr-ling">聚灵（+灵力）</button></div>'
      + '<div id="tr-r" style="margin-top:8px;"></div>');
    $('tr-shen').onclick = function () { const r = Engine.sectTrain(S, 'shen'); $('tr-r').textContent = r.msg; log(r.msg, r.ok ? 'good' : 'bad'); refresh(); sectDoTrain(); };
    $('tr-ling').onclick = function () { const r = Engine.sectTrain(S, 'ling'); $('tr-r').textContent = r.msg; log(r.msg, r.ok ? 'good' : 'bad'); refresh(); sectDoTrain(); };
  }
  function equipNameUI(ref) {
    for (const slot in EQUIPS) if (EQUIPS[slot][ref]) return EQUIPS[slot][ref].name;
    return ref;
  }
  function equipEffUI(ref) {
    for (const slot in EQUIPS) if (EQUIPS[slot][ref]) {
      const it = EQUIPS[slot][ref]; const p = [];
      if (it.hpMax) p.push('气血+' + it.hpMax);
      if (it.atk) p.push('攻击+' + it.atk);
      if (it.wu) p.push('武+' + it.wu);
      if (it.ti) p.push('体+' + it.ti);
      if (it.dun) p.push('遁+' + it.dun);
      return p.join('　');
    }
    return '';
  }
  function sectDoShop() {
    const list = Engine.sectGoods(S);
    let h = '<h3>宗门商人</h3>'
      + '<p class="dim" style="margin:2px 0 10px">当前可用灵石：<b style="color:var(--gold)">' + (S.stone || 0) + '</b> 枚</p>'
      + '<div class="ct-grid">';
    list.forEach(function (g) {
      let nm = g.ref;
      if (g.kind === 'art' && ARTIFACTS[g.ref]) nm = ARTIFACTS[g.ref].name;
      else if ((g.kind === 'tech' || g.kind === 'dun') && TECHNIQUES[g.ref]) nm = TECHNIQUES[g.ref].name;
      else if (g.kind === 'elixir' && ELIXIRS[g.ref]) nm = ELIXIRS[g.ref].name;
      else if (g.kind === 'mat' && MATERIALS[g.ref]) nm = MATERIALS[g.ref].name;
      else if (g.kind === 'equip') nm = equipNameUI(g.ref);
      const coin = Engine.sectGoodCoin(g);
      const cost = Engine.sectGoodCost(g);
      const owned = (g.kind === 'elixir' || g.kind === 'mat') ? false
        : (g.kind === 'art') ? ((S.arts.indexOf(g.ref) >= 0) || (Array.isArray(S.equip.treasure) && S.equip.treasure.indexOf(g.ref) >= 0))
        : (g.kind === 'tech' || g.kind === 'dun') ? (S.techs.indexOf(g.ref) >= 0)
        : (g.kind === 'equip') ? (Array.isArray(S.inventory) && S.inventory.indexOf(g.ref) >= 0)
        : false;
      const effTxt = (g.kind === 'art' && ARTIFACTS[g.ref]) ? ('<div class="ct-desc">' + artEffectText(g.ref) + '</div>')
        : (g.kind === 'elixir' && ELIXIRS[g.ref]) ? ('<div class="ct-desc">' + ELIXIRS[g.ref].desc + '</div>')
        : (g.kind === 'mat' && MATERIALS[g.ref]) ? ('<div class="ct-desc">' + MATERIALS[g.ref].name + ' ×' + (g.qty || 1) + '</div>')
        : (g.kind === 'equip') ? ('<div class="ct-desc">' + equipEffUI(g.ref) + '</div>')
        : '';
      const tag = (coin === 'gongye') ? '功业' : (g.grade || '');
      const priceTxt = (coin === 'gongye') ? ('功业 ' + cost) : ('灵石 ' + cost);
      h += '<div class="ct-card"><div class="ct-card-h"><b>' + nm + '</b><span class="ct-tier">' + tag + '</span></div>'
        + '<div class="ct-desc">' + priceTxt + '</div>' + effTxt
        + '<button class="btn-small shop-buy" data-ref="' + g.ref + '"' + (owned ? ' disabled' : '') + '>' + (owned ? '已得' : '兑换') + '</button></div>';
    });
    h += '</div>';
    const box = openPanel(h);
    box.querySelectorAll('.shop-buy').forEach(function (b) {
      b.onclick = function () { const r = Engine.sectBuy(S, b.getAttribute('data-ref')); log(r.msg, r.ok ? 'good' : 'bad'); refresh(); sectDoShop(); };
    });
  }
  function sectDoMaster() {
    const box = openPanel('<h3>师父传功</h3><p class="dim">可听道庭讲法增益修为，或与同门切磋演武。</p>'
      + '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-small" id="m-lecture">听讲（道庭讲法）</button><button class="btn-small" id="m-fight" disabled>切磋演武（未开放）</button></div>'
      + '<div id="m-r" style="margin-top:8px;"></div>');
    $('m-lecture').onclick = function () { const res = Engine.sectLecture(S); if (typeof res === 'string') { log(res, 'bad'); return; } runEvent(res); };
    $('m-fight').onclick = function () { uiAlert('切磋演武尚未开放，敬请期待。'); };
  }
  // 切磋演武：**未开放**，入口保留占位并给出明确提示（原先点了无反应，玩家反馈「不可交互、无效」）
  function sectDoFight() {
    uiAlert('切磋演武尚未开放，敬请期待。');
  }

  /* ---------- P5 游历地图 ---------- */
  function openTravel() {
    if (!S || S.dead) return;
    showScreen('travel');
    renderTravel();
    travelMsgClear();
    $('travel-back').onclick = function () { showScreen('game'); refresh(); };
  }
  /* 游历页内反馈：写在页内 #travel-msg（同时补一条主界面日志留痕）。
     ⚠ 游历页（#screen-travel）是静态地图、**没有日志区**，从本页触发的任何提示
     若只走 log() 就等于石沉大海 —— 玩家端表现是「点了没反应」（2026-09-14 用户反馈
     「游历的探寻仙缘，点击无反应」：炼气期尚无已解锁的仙缘之人，返回的那句提示
     只写进了离屏的主界面日志）。凡本页触发的字符串提示都必须走这个函数。 */
  function travelMsg(text, kind) {
    const el = $('travel-msg');
    if (el) {
      el.textContent = text;
      el.className = 'travel-msg' + (kind && kind !== 'dim' ? ' ' + kind : '');
      el.style.display = 'block';
    }
    log(text, kind || 'dim');
  }
  function travelMsgClear() {
    const el = $('travel-msg');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }
  function renderTravel() {
    const body = $('travel-body'); if (!body) return;
    let h = '<p class="dim">山河辽阔，择一处而往。游历消耗行动点，机缘自在其中。</p><div class="travel-map">';
    const nodes = [
      { id: 'shang', name: '流动商贩', icon: '🛒', desc: '仅以灵石交易的行商，或有奇货。', act: 'shop' },
      { id: 'youli', name: '游历', icon: '🧭', desc: '访名山、入市井，山野与人间机缘尽汇于此（耗 1 点，每年至多 5 次）。', act: 'travel' },
      { id: 'xianyuan', name: '仙缘', icon: '🍀', desc: '叩问机缘，或遇一段尘缘（耗 1 点，每年至多 3 次）。', act: 'xianyuan' },
      { id: 'xunxian', name: '探寻仙缘', icon: '🐾', desc: '寻访已结识的仙缘之人，单独触发 NPC 缘法（耗 1 点，每年限 1 次）。', act: 'xunxian' },
      { id: 'shanhe', name: '山河探索', icon: '⛰️', desc: '深入山河险地，触发各类战斗际遇，亦有机缘可探（耗 1 点，每年限 1 次）。', act: 'shanhe' }
    ];
    nodes.forEach(function (n) {
      h += '<div class="travel-node" data-act="' + n.act + '"><div class="tn-icon">' + n.icon + '</div><div class="tn-name">' + n.name + '</div><div class="tn-desc">' + n.desc + '</div></div>';
    });
    h += '</div>';
    body.innerHTML = h;
    body.querySelectorAll('[data-act]').forEach(function (b) {
      b.onclick = function () {
        const a = b.getAttribute('data-act');
        travelMsgClear();   // 每次点击先清掉上一次的页内提示，避免旧提示误导
        if (a === 'shop') return travelShop();
        if (a === 'travel') { showScreen('game'); actTravel(); return; }
        if (a === 'xianyuan') {
          if (!Engine.canAction(S, 1)) { travelMsg('行动点不足，无法叩问仙缘。', 'bad'); return; }
          const r = Engine.drawXianyuan(S);
          if (typeof r === 'string') { travelMsg(r); refresh(); return; }
          if (r && r.multi) { openEventChoice(r.events); return; }
          if (r) { showScreen('game'); runEvent(r); }
        }
        if (a === 'xunxian') {
          if (!Engine.canAction(S, 1)) { travelMsg('行动点不足，无法探寻仙缘。', 'bad'); return; }
          const r = Engine.seekNpcXianyuan(S);
          if (typeof r === 'string') { travelMsg(r); refresh(); return; }
          if (r) { showScreen('game'); runEvent(r); }
        }
        if (a === 'shanhe') {
          if (!Engine.canAction(S, 1)) { travelMsg('行动点不足，无法山河探索。', 'bad'); return; }
          const r = Engine.shanheExplore(S);
          if (typeof r === 'string') { travelMsg(r); refresh(); return; }
          if (r && r.multi) { openEventChoice(r.events); return; }
          if (r) { showScreen('game'); runEvent(r); }
        }
      };
    });
  }
  /* 供 PC 端“探寻仙缘”地图热点调用（与游历内 xunxian 节点同逻辑） */
  window.actSeekXianyuan = function () {
    if (!S || S.dead) return;
    if (!Engine.canAction(S, 1)) { travelMsg('行动点不足，无法探寻仙缘。', 'bad'); return; }
    const r = Engine.seekNpcXianyuan(S);
    if (typeof r === 'string') { travelMsg(r); refresh(); return; }
    if (r) { showScreen('game'); runEvent(r); }
  };
  function travelShop() {
    const stock = Engine.shopStock(S);
    if (!stock || !stock.length) { openPanel('<h3>流动商贩</h3><p class="dim">货担空空，下次再来吧。</p><div style="margin-top:10px;"><button class="btn-main" data-close="1">返回</button></div>'); return; }
    let h = '<h3>流动商贩</h3><div class="ct-grid">';
    stock.forEach(function (it, i) {
      const price = it.price;
      const owned = !!it.owned;
      const btnTxt = owned ? '已拥有' : (S.stone < price ? '灵石不足' : '购买');
      h += '<div class="ct-card"><div class="ct-card-h"><b>' + it.name + '</b></div>'
        + '<div class="ct-desc">' + (it.desc || '灵材') + '　售价 ' + price + ' 灵石</div>'
        + '<button class="btn-small buy-stock" data-i="' + i + '"' + ((owned || S.stone < price) ? ' disabled' : '') + '>' + btnTxt + '</button></div>';
    });
    h += '</div>';
    const box = openPanel(h);
    box.querySelectorAll('.buy-stock').forEach(function (b) {
      b.onclick = function () { const r = Engine.buyStock(S, +b.getAttribute('data-i')); log(r.msg, r.ok ? 'good' : 'bad'); refresh(); travelShop(); };
    });
  }

  /* ---------- 成就系统 ---------- */
  function openAchievements() {
    pageReturnTo = visibleScreenName(); // 记录来源屏（标题页 / 主界面），返回时回到原处
    const meta = Engine.loadMeta();
    const A = ACHIEVEMENTS;
    const order = ['修行', '秘境', '战斗', '收集', '成长', '仙缘', '轮回', '人生', '隐藏'];
    const byCat = {};
    Object.keys(A).forEach(function (id) {
      const c = A[id].cat || '其他';
      (byCat[c] = byCat[c] || []).push(id);
    });
    let earned = 0, total = Object.keys(A).length;
    let html = '';
    order.forEach(function (cat) {
      const ids = byCat[cat]; if (!ids) return;
      html += '<div class="ach-cat">' + cat + '</div><div class="ach-grid">';
      ids.forEach(function (id) {
        const a = A[id];
        const got = !!(meta.achievements[id]);
        // 隐藏成就未解锁时遮名
        const name = (a.hidden && !got) ? '？？？' : a.name;
        const desc = (a.hidden && !got) ? '尚未达成的隐秘成就。' : a.desc;
        earned += got ? 1 : 0;
        html += '<div class="ach-card' + (got ? ' got' : (a.hidden ? ' hidden' : '')) + '">' +
          '<div class="ach-ico">' + (got ? '🏆' : '🔒') + '</div>' +
          '<div class="ach-info"><div class="ach-name">' + name + '</div>' +
          '<div class="ach-desc">' + desc + '</div></div>' +
          '<div class="ach-pts">+' + a.pts + '</div></div>';
      });
      html += '</div>';
    });
    $('ach-summary').textContent = '已达成 ' + earned + ' / ' + total + ' 项 · 轮回点将于飞升或陨落结算时发放';
    $('ach-body').innerHTML = html;
    showScreen('achievements');
  }
  function liveAchCheck() {
    if (!S || S.dead) return;
    const meta = Engine.loadMeta();
    const newly = Engine.checkAchievementsLive(S, meta);
    if (newly && newly.length) {
      newly.forEach(function (id) {
        const a = ACHIEVEMENTS[id];
        if (a) showAchToast(a.name, a.pts);
      });
    }
  }
  function showAchToast(name, pts) {
    let box = document.querySelector('.ach-toast-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'ach-toast-box';
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'ach-toast';
    t.innerHTML = '<span class="ach-toast-ico">🏆</span><div class="ach-toast-txt"><b>达成成就</b><br>' + name + ' <span class="dim">(+' + pts + ' 轮回点·结算)</span></div>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () { t.classList.remove('show'); }, 3600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4200);
  }

  /* ---------- 图鉴（CODEX） ---------- */
  const CODEX_TABS = [
    { key: 'artifacts', name: '法宝', ico: '⚔️' },
    { key: 'destinies', name: '命格', ico: '☯️' },
    { key: 'xianming',  name: '仙命', ico: '🌟' },
    { key: 'techs',     name: '功法', ico: '📜' },
    { key: 'npcs',      name: '仙缘', ico: '💞' },
    { key: 'bosses',    name: '秘境之主', ico: '👹' },
    { key: 'events',    name: '游历奇遇', ico: '🗺️' }
  ];
  const TECH_CLS = { xinfa: '心法', shufa: '术法', dunshu: '遁术', shu: '术法', dun: '遁术' };
  const EFF_LABEL = {
    wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', ling: '灵力',
    atk: '攻击', def: '防御', hpMax: '气血上限', critPct: '暴击', dodgePct: '闪避',
    stealPct: '吸血', cult: '修炼速度', atkPct: '攻击', defToAtk: '防转攻',
    lowHpAtk: '残血攻击', stonePerYear: '年度灵石', wuPerYear: '年度悟性',
    tiPerYear: '年度体魄', tribBonus: '渡劫加成', trib: '渡劫加成', thorns: '反伤', lifesteal: '吸血',
    counterRate: '反击', firstStrike: '先手', executeBonus: '斩杀', controlImmune: '免疫控制',
    atkMul: '攻击', defMul: '防御', critRate: '暴击',
    recoverPct: '回复', noElemSpellMul: '无属性法术伤害', swordCritRate: '剑法暴击',
    growWu: '年度悟性', growTi: '年度体魄', growDun: '年度遁速'
  };
  // 命格可同时带 attr（六维）与 effect（战斗/被动），之前 `attr || effect` 只取其一 → 丢掉后半段效果
  function mergeEff(a, b) {
    if (!a) return b; if (!b) return a;
    const o = {};
    Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    return o;
  }
  const TECH_TYPE_LABEL = { xinfa: '心法', shufa: '术法', dunshu: '遁术', shu: '术法', dun: '遁术' };
  // 数值 → 显示串：|v|<1 视为百分比；支持负值（如仙命【九天玄体】体魄-1）
  function effNum(v) {
    const isPct = v !== 0 && Math.abs(v) < 1;
    const shown = isPct ? (Math.round(Math.abs(v) * 100) + '%') : String(Math.abs(v));
    return (v < 0 ? '-' : '+') + shown;
  }
  function effText(eff) {
    if (!eff) return '';
    const parts = [];
    Object.keys(eff).forEach(function (k) {
      const v = eff[k];
      if (typeof v === 'function') return;
      if (/Cap$/.test(k)) return;                    // *PerYearCap 等封顶字段只作机制参数，不展示
      const lb = EFF_LABEL[k] || k;
      if (v && typeof v === 'object') {
        // 对象型效果（如 techTypeBonus:{xinfa:0.25}）展开为「心法+25%」
        Object.keys(v).forEach(function (sk) {
          const sb = TECH_TYPE_LABEL[sk] || EFF_LABEL[sk] || sk;
          const sv = v[sk];
          if (typeof sv === 'number') parts.push(sb + effNum(sv));
        });
      }
      else if (typeof v === 'boolean') { if (v) parts.push(lb); }
      else if (typeof v === 'number') {
        // 逐年成长：若带 *PerYearCap（如仙命【道心渐明】前6年每年悟性+1），
        // 展示为「前6年每年悟性+1」，把封顶年限讲清楚，避免玩家误以为终身叠加。
        if (/PerYear$/.test(k) && typeof eff[k + 'Cap'] === 'number') {
          parts.push('前' + eff[k + 'Cap'] + '年每年' + lb.replace(/^年度/, '') + effNum(v));
        } else {
          parts.push(lb + effNum(v));
        }
      }
    });
    return parts.filter(Boolean).join(' · ');
  }
  function codexInfo(type, id) {
    if (type === 'artifacts') {
      const a = ARTIFACTS[id]; if (!a) return null;
      return { ico: '⚔️', name: a.name, grade: a.grade, meta: a.type + '法宝', desc: a.desc, eff: effText(a.effect) };
    }
    if (type === 'destinies') {
      const d = DESTINIES[id]; if (!d) return null;
      return { ico: '☯️', name: d.name, grade: d.grade, meta: d.grade + '阶命格', desc: d.desc, eff: effText(mergeEff(d.attr, d.effect)) };
    }
    if (type === 'xianming') {
      const d = DESTINIES[id]; if (!d) return null;
      return { ico: '🌟', name: d.name, grade: d.grade, meta: '仙命 · 金阶命格', desc: d.desc, eff: effText(mergeEff(d.attr, d.effect)) };
    }
    if (type === 'techs') {
      const t = TECHNIQUES[id]; if (!t) return null;
      const cls = TECH_CLS[t.cls] || t.cls || '功法';
      return { ico: '📜', name: t.name, grade: t.grade, meta: cls + (t.element ? ' · ' + t.element : ''), desc: t.desc, eff: t.mult ? ('修炼 ×' + t.mult) : '' };
    }
    if (type === 'npcs') {
      const n = NPCS[id]; if (!n) return null;
      return { ico: '💞', name: n.name, grade: '', meta: (n.role || '') + (n.loc ? ' · ' + n.loc : ''), desc: n.intro || '', eff: '好感上限 ' + (n.maxFavor || 10) };
    }
    if (type === 'bosses') {
      const c = ADVENTURE_CONFIG[id]; if (!c) return null;
      const b = c.boss || {};
      return { ico: '👹', name: b.name || c.name, grade: c.grade, meta: c.name + ' · ' + c.grade + '阶', desc: b.line || c.desc || '', eff: '机制：' + (b.mechanic || '未知') };
    }
    if (type === 'events') {
      let ev = null;
      if (typeof EVENTS !== 'undefined') {
        const all = EVENTS.jiyuan.concat(EVENTS.shejiao);
        for (let i = 0; i < all.length; i++) { if (all[i].id === id) { ev = all[i]; break; } }
      }
      if (!ev) return null;
      const lines = ev.lines || [];
      return { ico: '🗺️', name: ev.title || id, grade: '', meta: '游历机缘', desc: lines[0] || ev.result || '', eff: '' };
    }
    return null;
  }
  let codexTab = 'artifacts';
  function openCodex() {
    pageReturnTo = visibleScreenName(); // 记录来源屏（标题页 / 主界面），返回时回到原处
    // 只在局内回写「已见法宝」：标题页用的是存档副本/空壳，回写会覆盖存档
    if (S && Engine.syncTreasureSeen) Engine.syncTreasureSeen(S);
    renderCodex();
    showScreen('codex');
  }
  function renderCodex() {
    const meta = Engine.loadMeta();
    const st = Engine.codexState(pageState(), meta);
    const tabsBox = $('codex-tabs');
    if (tabsBox) {
      tabsBox.innerHTML = CODEX_TABS.map(function (t) {
        const m = st[t.key] || {};
        const ids = Object.keys(m);
        const found = ids.filter(function (i) { return m[i]; }).length;
        return '<button class="codex-tab' + (t.key === codexTab ? ' active' : '') + '" data-tab="' + t.key + '">' +
               t.ico + ' ' + t.name + ' ' + found + '/' + ids.length + '</button>';
      }).join('');
      Array.prototype.forEach.call(tabsBox.querySelectorAll('.codex-tab'), function (b) {
        b.onclick = function () { codexTab = b.getAttribute('data-tab'); sfx('click'); renderCodex(); };
      });
    }
    // 「仙命」是**命格（DESTINIES）金阶子集**的展示视图，不是独立收藏集。
    //   计入总数会把那 10 条**重复统计**一次（既在「命格 47」内、又在「仙命 10」内）：
    //   分母虚高 10（274 → 真实唯一项 264），且玩家抽到金阶命格后分子也重复 +1。
    //   故仅排除全局统计，tab 上的「仙命 10/10」徽标保留（那是"本卷展示条数"，本身就该是 10/10）。
    const TALLY_SKIP = { xianming: 1 };
    let tot = 0, got = 0;
    CODEX_TABS.forEach(function (t) {
      if (TALLY_SKIP[t.key]) return;
      const m = st[t.key] || {};
      Object.keys(m).forEach(function (i) { tot++; if (m[i]) got++; });
    });
    const sum = $('codex-summary');
    if (sum) sum.textContent = '已发现 ' + got + ' / ' + tot + ' 项 · 未遇之物以「？？？」示之';
    const m = st[codexTab] || {};
    const ids = Object.keys(m);
    if (!ids.length) { $('codex-body').innerHTML = '<p class="dim">此卷尚无记载。</p>'; return; }
    let html = '<div class="codex-grid">';
    ids.forEach(function (id) {
      const found = !!m[id];
      const info = codexInfo(codexTab, id);
      if (!info) return;
      if (found) {
        html += '<div class="codex-card">' +
          '<div class="codex-ico">' + info.ico + '</div>' +
          '<div class="codex-info">' +
            '<div class="codex-name">' + info.name +
              (info.grade ? '<span class="codex-grade g-' + info.grade + '">' + info.grade + '</span>' : '') +
            '</div>' +
            (info.meta ? '<div class="codex-meta">' + info.meta + '</div>' : '') +
            (info.desc ? '<div class="codex-desc">' + info.desc + '</div>' : '') +
            (info.eff ? '<div class="codex-eff">' + info.eff + '</div>' : '') +
          '</div></div>';
      } else {
        html += '<div class="codex-card locked">' +
          '<div class="codex-ico">❔</div>' +
          '<div class="codex-info">' +
            '<div class="codex-name">？？？</div>' +
            '<div class="codex-desc">尚未遇见，无从记载。</div>' +
          '</div></div>';
      }
    });
    html += '</div>';
    $('codex-body').innerHTML = html;
  }

  /* ---------- P6 仙缘 NPC ---------- */
  function openNpc() {
    if (!S || S.dead) return;
    showScreen('npc');
    renderNpc();
    $('npc-back').onclick = function () { showScreen('game'); refresh(); };
  }
  function renderNpc() {
    const body = $('npc-body'); if (!body) return;
    if (typeof NPCS === 'undefined' || !Object.keys(NPCS).length) {
      body.innerHTML = '<p class="dim">此际红尘，暂无可结之缘。</p>'; return;
    }
    let h = '<p class="dim">仙缘众生，皆有定数。需先达成相应剧情方得结识；既识之后，可赠礼、叙话以厚其缘，缘深则有回报。</p>';
    Object.keys(NPCS).forEach(function (id) {
      const n = NPCS[id];
      const unlocked = Engine.npcUnlocked(S, n);
      const portrait = 'assets/img/portrait/' + (n.portrait || ('npc_' + id)) + '.png';
      h += '<div class="npc-card' + (unlocked ? '' : ' npc-locked') + '">';
      h += '<div class="npc-portrait">'
        + '<img src="' + portrait + '" alt="' + n.name + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">'
        + '<span class="npc-avatar-fallback" style="display:none">' + n.name.charAt(0) + '</span></div>';
      h += '<div class="npc-main">';
      h += '<div class="npc-head"><b>' + n.name + '</b><span class="ct-tier">' + (n.loc || '') + '</span></div>';
      h += '<div class="ct-sub">' + (n.role || '') + '</div>';
      if (!unlocked) {
        h += '<p class="ct-desc">未解锁：需先达成【' + n.unlock.label + '】剧情。</p>';
      } else {
        const fav = Engine.favorOf(S, id);
        const tier = Engine.favorTier(n, fav);
        let stars = '';
        for (let i = 0; i < n.maxFavor; i++) stars += '<span style="color:' + (i < fav ? '#e8c15a' : '#3a3450') + '">★</span>';
        h += '<div class="npc-favor">' + stars + ' <span class="npc-grade">(' + fav + '/' + n.maxFavor + ') ' + tier.grade + '·' + tier.note + '</span></div>';
        h += '<div class="npc-tiers">';
        n.tiers.forEach(function (t) {
          const reached = fav >= t.min;
          h += '<div class="npc-tier' + (reached ? ' reached' : '') + '">' + (reached ? '✓ ' : '· ') + t.grade + (t.reward ? ('：' + t.reward.text) : '') + '</div>';
        });
        h += '</div>';
        h += '<div class="npc-actions">';
        if (n.gifts) Object.keys(n.gifts).forEach(function (gk) {
          const g = n.gifts[gk];
          h += '<button class="btn-small npc-gift" data-npc="' + id + '" data-gift="' + gk + '">赠' + g.name + '（' + g.cost + '灵石 +' + g.favor + '）</button>';
        });
        h += '<button class="btn-small npc-talk" data-npc="' + id + '">叙话（+1）</button>';
        if (n.event && !(S.seen[n.event.id] || S.seen['ml_' + n.event.id])) {
          h += '<button class="btn-small npc-event" data-npc="' + id + '">缘法</button>';
        }
        h += '</div>';
      }
      h += '</div></div>';
    });
    body.innerHTML = h;
    body.querySelectorAll('.npc-gift').forEach(function (b) {
      b.onclick = function () {
        const r = Engine.giveGift(S, b.getAttribute('data-npc'), b.getAttribute('data-gift'));
        log(r.msg, r.ok ? 'good' : 'bad'); renderNpc(); refresh();
      };
    });
    body.querySelectorAll('.npc-talk').forEach(function (b) {
      b.onclick = function () {
        const r = Engine.talkNpc(S, b.getAttribute('data-npc'));
        log(r.msg, r.ok ? 'good' : 'bad'); renderNpc(); refresh();
      };
    });
    body.querySelectorAll('.npc-event').forEach(function (b) {
      b.onclick = function () {
        const n = NPCS[b.getAttribute('data-npc')];
        if (!n.event) return;
        // 缘法一次性：先落 seen 再重渲染（消除任何"按钮还没消失就再点一次"的窗口）
        S.seen[n.event.id] = 1; Engine.saveState(S); renderNpc(); closeModal(); runEvent(n.event);
      };
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();