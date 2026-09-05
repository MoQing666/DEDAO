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
    ['title', 'game', 'rebirth', 'ending', 'gear', 'settlement', 'tech', 'favor', 'crafts', 'bag', 'char', 'enter'].forEach(function (n) {
      $('screen-' + n).style.display = (n === name) ? 'flex' : 'none';
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
        'enter': 'title'
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

    // 六维属性
    $('st-wu').textContent = S.wu || 0;
    $('st-ti').textContent = S.ti || 0;
    $('st-dun').textContent = S.dun || 0;
    $('st-shen').textContent = S.shen || 0;
    $('st-dao').textContent = S.dao || 0;
    $('st-fu').textContent = S.fu || 0;
    // 战斗属性
    $('st-atk').textContent = S.atk || 0;
    const defVal = Math.round((S.ti || 0) * 0.5);
    $('st-def').textContent = defVal;
    const critVal = Math.round(((S.shen || 0) * 0.01 + (Engine.getDestinyBonus ? Engine.getDestinyBonus(S, 'critRate') : 0)) * 100);
    $('st-crit').textContent = critVal + '%';
    const dodgeVal = Math.round(((S.dun || 0) * 0.005 + (Engine.getDestinyBonus ? Engine.getDestinyBonus(S, 'dodgeRate') : 0)) * 100);
    $('st-dodge').textContent = dodgeVal + '%';
    $('st-hp').textContent = S.hp;
    if ($('st-mo')) $('st-mo').textContent = S.qi || 0;

    $('btn-cult-label').textContent = S.cultedThisYear ? '修炼（今年已修炼）' : '修炼（' + Engine.cultCost(S) + '点）';
    $('btn-cult').classList.toggle('disabled', S.cultedThisYear || !Engine.canAction(S, Engine.cultCost(S)) || S.qi >= Engine.requireNeed(S));
    ['btn-arts', 'btn-social'].forEach(function (id) {
      $(id).classList.toggle('disabled', !Engine.canAction(S, 1));
    });
    $('btn-explore').classList.toggle('disabled', !Engine.canAction(S, 2));
    $('btn-social-label').textContent = '游历（1点）';
    const hasSect = !!S.sect;
    $('btn-sect').disabled = !hasSect || !Engine.canAction(S, 1);
    $('btn-sect').classList.toggle('disabled', !hasSect || !Engine.canAction(S, 1));
    $('btn-sect-label').textContent = hasSect ? '宗门（1点）' : '宗门（未加入）';
    // 百艺：加入宗门后解锁，消耗0
    const baiyiUnlocked = !!S.sect;
    $('btn-baiyi').disabled = !baiyiUnlocked;
    $('btn-baiyi').classList.toggle('disabled', !baiyiUnlocked);
    $('btn-baiyi-label').textContent = baiyiUnlocked ? '百艺（0点）' : '百艺（未解锁）';

    const canB = Engine.canBreak(S);
    $('btn-break').disabled = S.dead || !canB;
    $('btn-break').classList.toggle('ready', canB && !S.dead);
    const info = canB ? Engine.breakInfo(S) : null;
    $('btn-break-label').textContent = canB
      ? (info.trib ? '渡劫·' + info.trib + '劫' : '破境突破')
      : '突破（修为未满）';
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
        const attrNames = { stone: '灵石', ti: '体魄', shen: '神识', dao: '道心', wu: '悟性', dun: '遁速', fu: '福源', minAtk: '攻击' };
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
          } else {
            lines.push('你见势不妙，抽身而退。');
          }
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
      ov.style.display = 'flex';
      // 进入战斗播放战斗BGM
      if (typeof AudioManager !== 'undefined') {
        AudioManager.playBgm('battle');
      }
      renderBattle();
      function finish(r) {
        ov.style.display = 'none';
        const sb = $('b-spellbar'); if (sb) sb.style.display = 'none';
        // 退出战斗恢复游戏BGM
        if (typeof AudioManager !== 'undefined') {
          AudioManager.playBgm('game');
        }
        // 战斗结束后恢复血量为满
        Engine.refreshStats(S);
        S.hp = S.hpMax;
        Engine.saveState(S);
        console.log('[Battle] HP restored to', S.hp);
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
      $('b-auto').onclick = function () {
        const sb = $('b-spellbar'); if (sb) sb.style.display = 'none';
        const r = Engine.combatAuto(S);
        r.lines.forEach(function (l) { bl(l); });
        renderBattle();
        finish({ win: r.win, fled: r.fled, lost: r.lost });
      };
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
          b.textContent = sp.name;
          b.disabled = false;
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
        const list = bb.spellList || [];
        $('b-spell').disabled = !list.length;
        $('b-spell').textContent = '法术' + (bb.spellName ? '·' + bb.spellName + (list.length > 1 ? '（' + list.length + '）' : '') : '(无)');
        $('b-flee').textContent = bb.noFlee ? '本战斗不可逃跑' : '逃跑（' + Math.round(bb.flee * 100) + '% · 遁速' + (S.dunSpeed || 1) + '）';
      }
    });
  }

  /* ---------------- 肉鸽冒险（轻肉鸽探索） ---------------- */
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
    desc.textContent = '不同秘境产出不同品级的宝物。秘境一年只能进入一次。';
    desc.style.marginBottom = '16px';
    box.appendChild(desc);

    advConfigs.forEach(function(adv) {
      const canEnter = bi >= adv.realmReq;
      const card = document.createElement('div');
      card.style.cssText = 'border:1px solid #2e2942;background:rgba(0,0,0,.2);padding:12px;margin-bottom:12px;border-radius:8px;' + (canEnter ? '' : 'opacity:0.5;');
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<b style="color:' + adv.color + ';font-size:16px;">' + adv.grade + '级秘境 · ' + adv.name + '</b>' +
        '<span style="color:' + adv.color + ';font-size:12px;border:1px solid ' + adv.color + ';padding:2px 6px;border-radius:4px;">' + adv.grade + '级</span></div>' +
        '<p style="font-size:13px;color:#8a8a9a;margin-bottom:8px;">' + adv.desc + (canEnter ? '' : '<b style="color:#e05a7a;"> 需要' + adv.realmName + '以上方可进入</b>') + '</p>' +
        '<div style="font-size:12px;color:#6a6a7a;">产出：' + adv.drops + '</div>';
      const btn = document.createElement('button');
      btn.className = 'btn-main';
      btn.textContent = canEnter ? '进入' + adv.name : '境界不足';
      btn.style.marginTop = '8px';
      btn.style.borderColor = adv.color;
      btn.disabled = !canEnter;
      btn.onclick = function () {
        ov.style.display = 'none';
        const res = Engine.startAdventure(S, adv.key);
        if (res.ok === false) { log(res.msg || '行动点不足'); afterAction(); return; }
        if (typeof AudioManager !== 'undefined') {
          AudioManager.playSfx('explore');
        }
        advIntro();
      };
      card.appendChild(btn);
      box.appendChild(card);
    });


  }

  function advIntro() {
    const a = S.adv;
    $('chapter').classList.add('explore-mode');
    $('screen-game').classList.add('explore-active');
    showChapter('秘境 · 轻身而入', [
      a.setting,
      '你放轻脚步，走入其中。传闻深处有洞天秘藏——但活着出去，才算赢。',
      '每层三选一，随时可撤退，已有收获尽归己有。'
    ], { subtitle: '第 1 层 · 深入 ' + a.maxDepth + ' 层可见洞天' }).then(advLayer);
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
  function advLayer() {
    const a = S.adv;
    if (!a || a.done || a.status !== 'running') return;
    const layer = Engine.advGenLayer(S);
    if (layer.final) { advFinal(); return; }
    const f = LAYER_FLAVOR[a.depth] || LAYER_FLAVOR[5];
    const choices = layer.choices.map(function (c) {
      return { t: c.icon + ' ' + c.name + '\n' + c.desc, node: c };
    });
    choices.push({ t: '← 撤退（保住既有收获）', node: { type: 'retreat' } });
    showChapter(f.t, [f.l], {
      subtitle: '已收获：' + (a.gains.length ? a.gains.join('、') : '空空如也'),
      choices: choices
    }).then(function (r) {
      const node = (r && r.pick && r.pick.node) || { type: 'retreat' };
      if (node.type === 'retreat') { advFinish('撤退'); return; }
      advResolveNode(node);
    });
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
  function advResolveNode(node) {
    const a = S.adv;
    if (!a || a.done || a.status !== 'running') return;
    const res = Engine.advResolve(S, node);
    // 保留原始节点类型用于显示
    res.originalType = node.type;
    if (res.type === 'battle') {
      openBattle(res.spec, { title: res.title }).then(function (r) {
        const b = S.battle;
        if (r.win) {
          // 精英战斗胜利后给予宝箱奖励
          if (res.eliteReward) {
            const eliteLoot = generateTreasureReward();
            showChapter('精英击败', ['你收剑而立，从精英身上搜出宝物——'].concat(b ? b.gains : []).concat(eliteLoot)).then(advAdvance);
          } else {
            showChapter('胜', ['你收剑而立，清点战利品。'].concat(b ? b.gains : [])).then(advAdvance);
          }
        } else if (r.lost) {
          advFinish('战败');
        } else {
          showChapter('脱身', ['你及时抽身，绕开了这一处凶险。']).then(advAdvance);
        }
      });
      return;
    }
    if (res.type === 'shop') { advShop(res.stock); return; }
    if (res.type === 'remnant_soul') {
      advResolveRemnantSoul(res.spell1, res.spell2);
      return;
    }
    if (res.type === 'event') {
      if (res.ev) {
        runEvent(res.ev).then(advAdvance);
      } else {
        showChapter('雾散', ['迷雾散去，空无一物。你摇了摇头，继续前行。']).then(advAdvance);
      }
      return;
    }
    if (res.type === 'final') {
      openBattle(res.spec, { title: '决战 · ' + res.spec.name }).then(function (r) {
        const b = S.battle;
        if (r.win) {
          const extra = Engine.advClearReward(S);
          showChapter('秘境通关', [res.spec.name + '化作流光消散，藏于深处的秘藏尽数显现！']
            .concat(extra), { subtitle: '通关秘藏' }).then(function () {
              advFinish('通关');
            });
        } else if (r.lost) {
          advFinish('战败');
        } else {
          showChapter('秘境撤退', ['你终究没敢直面' + res.spec.name + '，转身退了出来。']).then(function () { advFinish('撤退'); });
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
    showChapter(chapterTitle, res.lines, { subtitle: chapterSubtitle }).then(advAdvance);
  }

  /* ---- 残魂传承事件 ---- */
  function advResolveRemnantSoul(spell1, spell2) {
    var t1 = TECHNIQUES[spell1];
    var t2 = TECHNIQUES[spell2];
    var type1 = t1.cls === 'xinfa' ? '心法' : t1.cls === 'dunshu' ? '遁术' : '法术';
    var type2 = t2.cls === 'xinfa' ? '心法' : t2.cls === 'dunshu' ? '遁术' : '法术';
    var desc1 = t1.cls === 'xinfa' ? '修炼 +' + Math.round((t1.mult - 1) * 100) + '%' : t1.cls === 'dunshu' ? '逃脱 ' + Math.round((t1.flee || 0) * 100) + '%' : '威力 ' + t1.dmg + '× 攻击';
    var desc2 = t2.cls === 'xinfa' ? '修炼 +' + Math.round((t2.mult - 1) * 100) + '%' : t2.cls === 'dunshu' ? '逃脱 ' + Math.round((t2.flee || 0) * 100) + '%' : '威力 ' + t2.dmg + '× 攻击';
    
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
        { t: '两种都想学\n挑战残魂的考验', fight: { name: '残魂考验', atk: Math.round(S.atk * 0.8), hp: Math.round(S.hpMax * 0.6), loot: {} }, resultWin: '残魂散去前微微点头："你有这个资格。"', resultLose: '你未能通过考验，残魂叹道："缘分未到。"' },
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
          showChapter('残魂考验', ['残魂散去前微微点头："你有这个资格。"', '两道灵光同时飞入你的眉心——', '【' + t1.name + '】和【' + t2.name + '】已习得！'], { subtitle: '考验通过' }).then(advAdvance);
        } else {
          // 战斗失败，只获得第一个功法
          if (S.techs.indexOf(spell1) < 0) S.techs.push(spell1);
          Engine.ensureTechEquip(S);
          Engine.saveState(S);
          showChapter('残魂考验', ['你未能通过考验，残魂叹道："缘分未到。"', '但先前传授的功法已然铭记于心。', '【' + t1.name + '】已习得！'], { subtitle: '考验未通过' }).then(advAdvance);
        }
      } else {
        advAdvance();
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
        btn.disabled = S.stone < x.si.price;
        btn.textContent = S.stone >= x.si.price ? '购买' : '灵石不足';
      });
    };
    const closeShop = function () {
      ov.style.display = 'none';
      $('modal-close').onclick = prevClose;
      advAdvance();
    };
    stock.forEach(function (si) {
      const row = document.createElement('div');
      row.className = 'formula-row';
      const info = document.createElement('div');
      info.innerHTML = '<b>' + esc(si.name) + '</b><br><span class="dim">' + si.price + ' 灵石</span>';
      const btn = document.createElement('button');
      btn.textContent = S.stone >= si.price ? '购买' : '灵石不足';
      btn.disabled = S.stone < si.price;
      btn.onclick = function () {
        if (si.sold) return;
        const r = Engine.buyStock(S, si);
        if (!r.ok) { log(r.msg, 'bad'); return; }
        r.lines.forEach(function (l) { log(l, 'good'); });
        if (S.adv) S.adv.gains.push.apply(S.adv.gains, r.lines);
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
    ], { subtitle: '最终之战 · ' + (a.maxDepth + 1) + ' 层' }).then(function () {
      const spec = Engine.enemyGen(S, 'final', Math.min(a.depth + 1, 7));
      advResolveNode({ type: 'final' });
    });
  }
  function advFinish(why) {
    const a = S.adv;
    Engine.advEnd(S, why === '战败' ? 'lost' : 'done');
    // 恢复游戏BGM
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playBgm('game');
      AudioManager.playSfx(why === '战败' ? 'bad' : 'good');
    }
    const lines = [];
    if (why === '战败') {
      lines.push('你重伤倒地，意识模糊前只想着一个念头——活着回去。');
      lines.push('你带着残存的气力，跌跌撞撞离开了秘境。');
    } else if (why === '通关') {
      lines.push('你走出秘境，身后轰然一响，洞天关闭。');
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
      lines.forEach(function (g) { log(g, 'good'); });
      if (a.lostMsg) log(a.lostMsg, 'bad');
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
    if (ev.chapter) {
      return showChapter(ev.title, lines, {
        choices: ev.choices,
        toLog: true,
        subtitle: ev.tag === 'mijing' ? '秘境 · 一步一机缘' : ('—— ' + ev.tag + ' ——')
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
    if (typeof r === 'string') { log(r); afterAction(); }
    else runEvent(r);
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
        { t: '道庭讲法\n聆听长老论道，或亲讲大道', sectAct: 'lecture' }
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
      }
    });
  }
  function actAlchemy() { openModal('alchemy'); }
  function actForge() { openModal('forge'); }
  function actBreak() { breakthroughFlow(); }
  function actArts() {
    if (!S || S.dead) return;
    if (!Engine.canAction(S, 1)) { log('行动点不足。'); return; }
    Engine.spend(S, 1);
    S.ti = (S.ti || 0) + 0.5;
    Engine.refreshStats(S);
    Engine.saveState(S);
    log('你苦修锻体，体魄 +0.5。', 'good');
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

    // 灵物突破选项
    if (result.hasSpirit) {
      const spiritCard = document.createElement('div');
      spiritCard.style.cssText = 'border:1px solid #e8c15a;background:rgba(232,193,90,0.1);padding:12px;margin-bottom:12px;border-radius:8px;';
      const spirit = SPIRIT_ITEMS[result.spiritId];
      spiritCard.innerHTML = '<h4 style="color:#e8c15a;">完美突破 · 使用【' + spirit.name + '】</h4>' +
        '<p class="desc">' + spirit.desc + '</p>' +
        '<p style="color:#4ec9a0;">效果：' + spirit.effect + '</p>' +
        '<p class="desc">必然成功，无失败风险</p>';
      const spiritBtn = document.createElement('button');
      spiritBtn.className = 'btn-main';
      spiritBtn.textContent = '使用' + spirit.name + '突破';
      spiritBtn.style.marginTop = '8px';
      spiritBtn.onclick = function () {
        ov.style.display = 'none';
        executeBreakthrough('perfect', result.spiritId);
      };
      spiritCard.appendChild(spiritBtn);
      box.appendChild(spiritCard);
    }

    // 丹药突破选项
    if (result.hasElixir) {
      const elixirCard = document.createElement('div');
      elixirCard.style.cssText = 'border:1px solid #6ab8c9;background:rgba(106,184,201,0.1);padding:12px;margin-bottom:12px;border-radius:8px;';
      elixirCard.innerHTML = '<h4 style="color:#6ab8c9;">普通突破 · 使用丹药</h4>' +
        '<p class="desc">消耗一枚丹药，增加气血上限（黄级+50，玄级+100，地级+300，天级+500）</p>' +
        '<p class="desc">成功率：' + Math.round(info.base * 100) + '%</p>';
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
      '<p class="desc">成功率：' + Math.round(info.base * 100) + '%</p>';
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

  function executeBreakthrough(type, itemId) {
    const before = statSheet(S);
    let r;
    if (type === 'perfect') {
      r = Engine.perfectBreakthrough(S, itemId);
    } else if (type === 'normal') {
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
      if (r.perfect) {
        const spirit = SPIRIT_ITEMS[itemId];
        resLines.push('【' + spirit.name + '】之力融入你的道基，完美突破！');
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

  /* ---------------- 宗门加入剧情（突破筑基后触发） ---------------- */
  function sectJoinFlow() {
    return showChapter('仙门开山 · 拜入宗门', [
      '筑基成功，灵压外溢——三座仙门的飞行舟同时降临。',
      '青云剑宗的弟子踏剑而行，剑气纵横；丹霞谷的长老袖中飞出万千灵草；玄天门的山门化作金光巨罩，罩住半座城。',
      '三碑齐立，但凡筑基以上散修，皆可择一门而入。'
    ], {
      subtitle: '筑基之后 · 机缘降临',
      choices: [
        { t: '入【青云剑宗】：不求长生，只求一剑破万法', effect: { sect: 'qingyunjian' },
          lines: ['你踏上剑舟。舟上老剑修只看了你一眼："剑心尚可，就是穷。"你：……'] },
        { t: '入【丹霞谷】：丹成九转，天上人间', effect: { sect: 'dpxia' },
          lines: ['你被一位袖中藏丹炉的长老领进谷中，满谷灵药飘香，药童们朝你作揖。'] },
        { t: '入【玄天门】：稳扎稳打，守得云开见月明', effect: { sect: 'xuantian' },
          lines: ['金光巨罩裂开一道门户，门中传来洪钟般的声音："入我门者，先守十年山。"你行礼入门。'] },
        { t: '婉拒：独来独往，方是自在', effect: {},
          lines: ['你遥遥一礼，转身走入人潮。那三座飞行舟的阴影掠过城头——自由，也是要自己扛的。'] }
      ]
    }).then(function (r) {
      if (r && r.pick && r.pick.effect && r.pick.effect.sect) {
        S.sect = r.pick.effect.sect;
        Engine.saveState(S);
        log('拜入【' + SECTS[S.sect].name + '】', 'gold');
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
          { t: '辞旧迎新\n进入下一年', effect: {}, lines: ['你收拾好这一年的际遇，静待新岁。'] }
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
    // 年初检查：死劫/主线剧情
    const yr = Engine.checkYearEvents(S);
    if (yr === 'death_event') {
      var dev = S.pendingDeathEvent;
      S.seen['death_' + dev.year] = 1;
      delete S.pendingDeathEvent;
      showChapter(dev.title, dev.lines, { subtitle: '生死之战' }).then(function () {
        return openBattle(dev.fight, { title: dev.title });
      }).then(function (br) {
        if (br.win) {
          showChapter('劫后余生', [dev.resultWin].concat(br.gains || [])).then(function () {
            Engine.saveState(S);
            afterAction();
          });
        } else {
          S.dead = true;
          S.endReason = dev.title + '陨落';
          Engine.saveState(S);
          endLifeFlow();
        }
      });
      return;
    }
    if (yr === 'mainline') {
      var ml = S.pendingMainline;
      S.seen['ml_' + ml.id] = 1;
      delete S.pendingMainline;
      function showMainline() {
        if (ml.fight) {
          showChapter(ml.title, ml.lines, { subtitle: '主线剧情' }).then(function () {
            return openBattle(ml.fight, { title: ml.title });
          }).then(function (br) {
            if (br.win) {
              showChapter(ml.title + '·胜', [ml.resultWin].concat(br.gains || [])).then(function () {
                if (ml.effect) Engine.applyOps(S, ml.effect);
                Engine.saveState(S);
                afterAction();
              });
            } else {
              showChapter(ml.title + '·败', [ml.resultLose || '你重伤退走。']).then(function () {
                Engine.saveState(S);
                afterAction();
              });
            }
          });
        } else if (ml.choices) {
          showChapter(ml.title, ml.lines, { subtitle: '主线剧情', choices: ml.choices }).then(function (cr) {
            if (cr && cr.pick) {
              if (cr.pick.effect) Engine.applyOps(S, cr.pick.effect);
              if (cr.pick.fight) {
                openBattle(cr.pick.fight, { title: ml.title }).then(function (br) {
                  if (br.win) {
                    showChapter('胜', [cr.pick.resultWin || '你技高一筹。'].concat(br.gains || [])).then(function () {
                      Engine.saveState(S);
                      afterAction();
                    });
                  } else {
                    showChapter('败', [cr.pick.resultLose || '你败了。']).then(function () {
                      Engine.saveState(S);
                      afterAction();
                    });
                  }
                });
              } else {
                if (cr.pick.lines) {
                  showChapter('结果', cr.pick.lines).then(function () {
                    Engine.saveState(S);
                    afterAction();
                  });
                } else {
                  Engine.saveState(S);
                  afterAction();
                }
              }
            } else {
              Engine.saveState(S);
              afterAction();
            }
          });
        } else {
          if (ml.effect) Engine.applyOps(S, ml.effect);
          showChapter(ml.title, ml.lines, { subtitle: '主线剧情' }).then(function () {
            Engine.saveState(S);
            afterAction();
          });
        }
      }
      showMainline();
      return;
    }
    // 正常年初
    logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
    log('爆竹声中，旧岁翻篇。你长身而起，新一年的风已经吹进门来。');
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
    renderSettlement({ meta: meta, ach: ach });
  }
  function renderSettlement(res) {
    const st = STAGES[S.idx] || { realm: '仙', sub: '', color: '#e8c15a', sym: 'Ⅵ', bigRealm: 4 };
    const sp = Engine.settlePoints(S, M);
    const bd = sp.breakdown;
    const isWin = S.endReason === '飞升' || S.endReason === '镇魔渊';
    const title = S.endReason === '飞升' ? '羽化登仙' :
      S.endReason === '镇魔渊' ? '镇魔渊 · 舍身成仁' :
      S.endReason === '渡劫陨落' ? '渡劫陨落' :
      S.endReason === '寿元耗尽' ? '寿元耗尽' : '身死道消';
    const wrap = $('settle-body');
    wrap.innerHTML = '';
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
      '<div class="settle-row"><span>最终境界（' + S.realm + '）</span><span class="gold">+' + bd.realm + '</span></div>' +
      '<div class="settle-row"><span>渡劫次数（' + S.broken + '）</span><span class="gold">+' + bd.break + '</span></div>' +
      (bd.age ? '<div class="settle-row"><span>长寿</span><span class="gold">+' + bd.age + '</span></div>' : '') +
      (bd.spec ? '<div class="settle-row"><span>特殊壮举</span><span class="gold">+' + bd.spec + '</span></div>' : '') +
      (bd.ach ? '<div class="settle-row"><span>新解锁成就</span><span class="gold">+' + bd.ach + '</span></div>' : '') +
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
    btnReborn.textContent = '再入轮回';
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
    function confirm() {
      ov.style.display = 'none';
      onDone($('name-input').value);
    }
    $('name-ok').onclick = confirm;
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
      if (e.key === 'Enter') confirm();
    };
  }

  /* ---------------- 新一世 ---------------- */
  function startNewLife() {
    showEnterPage();
  }

  function destinySelect() {
    return new Promise(function (resolve) {
      const slotCount = S.destinySlots || 1;
      const extraDestiny = S.extraDestiny || 0;
      const pickCount = 3 + extraDestiny;
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
            if (dest.attr.fu) attrParts.push('福源+' + dest.attr.fu);
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
    slotCount: 1
  };

  function showEnterPage() {
    const m = Engine.loadMeta();
    const maxJie = m.maxJie || 0;
    enterState.jie = 0;
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
        renderEnterPage(maxJie);
      }
    };
    $('enter-jie-plus').onclick = function () {
      if (enterState.jie < maxJie) {
        enterState.jie++;
        enterState.selected = [];
        enterState.locked = [];
        renderEnterPage(maxJie);
      }
    };
    $('enter-reroll').onclick = function () {
      rerollDestiny(maxJie);
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
    if (jie >= 3) unlockParts.push('+1额外选择');
    if (jie >= 6) unlockParts.push('+1锁定槽');
    $('enter-jie-status').textContent = unlockParts.length ? unlockParts.join('、') : '无额外解锁';

    // 轮回点奖励
    const rpGain = jie * 3 + (jie >= 3 ? 1 : 0) + (jie >= 6 ? 2 : 0);
    $('enter-jie-reward').textContent = '轮回点 +' + rpGain;

    // 计算选择数量
    const meta = Engine.loadMeta();
    const reinc = meta.reinc || {};
    const extraDestiny = reinc.extra_destiny || 0;
    const destinySlot = reinc.destiny_slot || 0;
    enterState.pickCount = 3 + extraDestiny;
    enterState.slotCount = 1 + destinySlot + (jie >= 3 ? 1 : 0);
    enterState.lockedSlots = reinc.destiny_lock || 0;

    // 抽取命格池
    if (enterState.pool.length === 0) {
      enterState.pool = rollDestinyPool(enterState.pickCount, jie);
    }

    renderDestinyPool();
    updateDestinyTitle();
  }

  function rollDestinyPool(count, jie) {
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
        if (dest.attr.fu) attrParts.push('福源+' + dest.attr.fu);
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

  }

  function rerollDestiny(maxJie) {
    const meta = Engine.loadMeta();
    if (meta.points < 1) {
      alert('轮回点不足！');
      return;
    }
    // 消耗1轮回点
    meta.points -= 1;
    Engine.saveMeta(meta);
    
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
    const title = '天命抉择 ' + enterState.pickCount + '选' + enterState.slotCount + '（可上下滑动）';
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
    S = Engine.startLife(name);
    S.year = 1;
    S.jie = enterState.jie;
    S.destinies = enterState.selected.slice();
    Engine.saveState(S);
    suspended = false;

    const bg = S.bg;
    showChapter('第 一 章 · ' + bg.title, bg.lines, { subtitle: '凡尘旧事' }).then(function () {
      const eggLines = S.easterEgg ? ['宿缘应验——你隐约想起了一些不该属于这一世的记忆。', S.easterEgg.text] : [];
      const lg = rollLinggenPreview(S);
      const lines = eggLines.concat([
        '你闭目感应，发现自己体内的灵根是【' + lg.name + '】。',
        '相传此根' + (lg.id === 'hundun' || lg.id === 'lei' ? '千年不遇，是天骄之资。' : '平平无奇，未必不能登天。')
      ]);
      return showChapter('第 一 章 · 灵根天成', lines, { subtitle: '天机垂询' });
    }).then(function () {
      showScreen('game');
      initGame();
    });
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
    const destAttrBonus = { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, fu: 0 };
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

    const sixDims = [
      { key: 'wu', name: '悟性', icon: '📖', color: '#5ac8fa',
        affect: '影响修炼速度，越高修为增长越快' },
      { key: 'ti', name: '体魄', icon: '💪', color: '#e0604a',
        affect: '影响防御力与气血上限，体魄越高越耐打' },
      { key: 'dun', name: '遁速', icon: '💨', color: '#4ec9a0',
        affect: '影响闪避率与逃跑成功率，遁速越高越灵活' },
      { key: 'shen', name: '神识', icon: '👁', color: '#c06ae0',
        affect: '影响暴击率与法术命中，神识越高攻击越精准' },
      { key: 'dao', name: '道心', icon: '☯', color: '#e8c15a',
        affect: '影响渡劫成功率与心境稳定，道心越高劫难越轻' },
      { key: 'fu', name: '福源', icon: '🍀', color: '#90e8b0',
        affect: '影响机缘触发与物品掉落，福源越高运气越好' }
    ];

    sixDims.forEach(function (dim) {
      const baseVal = S[dim.key] || 0;
      const eqBonus = es[dim.key] || 0;
      const destBonus = destAttrBonus[dim.key] || 0;
      const total = baseVal + eqBonus + destBonus;

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
      let valStr = '<b>' + total + '</b>';
      if (eqBonus || destBonus) {
        const parts = [];
        if (baseVal) parts.push('基础' + baseVal);
        if (eqBonus) parts.push('装备+' + eqBonus);
        if (destBonus) parts.push('命格+' + destBonus);
        valStr += '<span class="dim">（' + parts.join(' + ') + '）</span>';
      }
      valRow.innerHTML = valStr;
      card.appendChild(valRow);

      const affect = document.createElement('div');
      affect.className = 'attr-six-affect dim';
      affect.textContent = dim.affect;
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
    const defMul = Engine.getDestinyAttrMult(S, 'def');
    const critBonus = Engine.getDestinyBonus(S, 'critRate');
    const dodgeBonus = Engine.getDestinyBonus(S, 'dodgeRate');
    const defBase = Math.round((S.ti || 0) * 0.5);
    const defTotal = Math.round(defBase * defMul);
    const critBase = Math.round(((S.shen || 0) * 0.01 + (Engine.getDestinyBonus ? Engine.getDestinyBonus(S, 'critRate') : 0)) * 100);
    const dodgeBase = Math.round(((S.dun || 0) * 0.005 + (Engine.getDestinyBonus ? Engine.getDestinyBonus(S, 'dodgeRate') : 0)) * 100);

    const combatStats = [
      { name: '攻击', val: Math.round(S.atk * atkMul), color: '#ff9080', desc: '悟性×技能倍率 + 装备' },
      { name: '防御', val: defTotal, color: '#90e8b0', desc: '体魄×0.5 + 命格加成' },
      { name: '气血', val: S.hp + ' / ' + S.hpMax, color: '#ff9080', desc: '基础100 + 体魄加成' },
      { name: '暴击', val: critBase + '%', color: '#e8c15a', desc: '神识×1% + 命格加成' },
      { name: '闪避', val: dodgeBase + '%', color: '#4ec9a0', desc: '遁速×0.5% + 命格加成' },
      { name: '寿元', val: S.age + ' / ' + S.lifeMax, color: '#c06ae0', desc: '每突破增加上限' },
      { name: '修为', val: S.qi + ' / ' + Engine.requireNeed(S), color: '#5ac8fa', desc: '修炼积累，满则突破' },
      { name: '遁速', val: S.dunSpeed || 1, color: '#4ec9a0', desc: '影响逃跑成功率' }
    ];

    combatStats.forEach(function (cs) {
      const cell = document.createElement('div');
      cell.className = 'attr-combat-cell';
      cell.innerHTML = '<div class="attr-combat-label">' + cs.name + '</div>' +
        '<div class="attr-combat-val" style="color:' + cs.color + '">' + cs.val + '</div>' +
        '<div class="attr-combat-desc dim">' + cs.desc + '</div>';
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
      if (S.linggen.body) {
        const parts = [];
        if (S.linggen.body.atk) parts.push('攻击+' + S.linggen.body.atk);
        if (S.linggen.body.hpMax) parts.push('气血上限+' + S.linggen.body.hpMax);
        if (S.linggen.body.trib) parts.push('渡劫+' + Math.round(S.linggen.body.trib * 100) + '%');
        if (parts.length) lg.innerHTML += '<br><span class="dim" style="margin-left:8px">加成：' + parts.join('，') + '</span>';
      }
    } else {
      lg.innerHTML = '<span class="dim">未觉醒</span>';
    }
    wrap.appendChild(lg);

    // === 命格（天赋） ===
    const h3 = document.createElement('h4');
    h3.textContent = '天赋';
    h3.style.color = 'var(--gold)';
    wrap.appendChild(h3);
    if (S.talents.length) {
      S.talents.forEach(function (t) {
        const x = TALENTS.filter(function (y) { return y.id === t; })[0];
        if (!x) return;
        const p = document.createElement('div');
        p.className = 'attr-destiny-card';
        const tierName = TIER_NAMES[x.tier] || '凡命';
        const tierColor = TIER_COLORS[x.tier] || '#b0b0bc';
        p.innerHTML = '<div class="attr-destiny-header"><span class="attr-destiny-tier" style="color:' + tierColor + '">【' + tierName + '】</span>' +
          '<span class="attr-destiny-name" style="color:' + tierColor + '">' + x.name + '</span></div>' +
          '<div class="attr-destiny-desc dim">' + x.desc + '</div>';
        wrap.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '无天赋';
      wrap.appendChild(p);
    }

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
          const attrNames = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', fu: '福源' };
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

    // === 轮回加成 ===
    const h7 = document.createElement('h4');
    h7.textContent = '轮回加成';
    h7.style.color = 'var(--gold)';
    wrap.appendChild(h7);
    const reincDiv = document.createElement('div');
    reincDiv.className = 'attr-section';
    const reincParts = [];
    if ((S.reinc.cult || 0) > 0) reincParts.push('道种：修炼+' + (S.reinc.cult * 10) + '%');
    if ((S.reinc.alchemyTimeReduce || 0) > 0) reincParts.push('丹心：炼丹时间-' + S.reinc.alchemyTimeReduce + '年');
    if ((S.reinc.forgeTimeReduce || 0) > 0) reincParts.push('器魂：炼器时间-' + S.reinc.forgeTimeReduce + '年');
    if ((S.reinc.shesheng || 0) > 0) reincParts.push('舍生：修炼+' + (S.reinc.shesheng * 10) + '%，-1寿元/次');
    reincDiv.innerHTML = reincParts.length ? '<span class="dim">' + reincParts.join('。') + '</span>' : '<span class="dim">无轮回加成</span>';
    wrap.appendChild(reincDiv);

    box.appendChild(wrap);
  }

  /* ---------------- 储物袋页 ---------------- */
  function openBag() {
    showScreen('bag');
    renderBagPage();
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
      '<h4>法宝</h4>' + (S.arts.length ? S.arts.map(function (a) {
        if (!ARTIFACTS[a]) return '';
        return '<p><b>' + ARTIFACTS[a].name + '</b><span class="dim"> · ' + ARTIFACTS[a].effect + '</span></p>';
      }).join('') : '<p class="dim">无</p>');
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
        const name = craft.type === '丹' ? ELIXIRS[craft.output].name : ARTIFACTS[craft.output].name;
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

    const forgeFormulas = availableFormulas.filter(function(f) { return f.type === '法宝'; });
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
        const artifact = ARTIFACTS[formula.out];
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
    ['head', 'body', 'leg'].forEach(function (slot) {
      const card = document.createElement('div');
      card.style.flex = '1 1 45%';
      card.style.border = '1px solid #2e2942';
      card.style.background = 'rgba(0,0,0,.2)';
      card.style.padding = '6px 8px';
      card.style.fontSize = '12px';
      const id = S.equip[slot];
      if (id && EQUIPS[slot][id]) {
        const it = EQUIPS[slot][id];
        const tc = EQUIP_TIERS[it.tier].color;
        card.innerHTML = '<b>' + EQUIP_SLOTS[slot].name + '</b><br>' +
          '<span style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</span><br>' +
          '<span class="dim">' + equipStatStr(it) + '</span>';
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
        const it = Engine.findEquip(id);
        if (it) {
          const tc = EQUIP_TIERS[it.tier].color;
          card.innerHTML = '<b>法宝' + (ti + 1) + '</b><br>' +
            '<span style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</span><br>' +
            '<span class="dim">' + equipStatStr(it) + '</span>';
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
  }
  function equipStatStr(it) {
    const out = [];
    if (it.hpMax) out.push('气血 +' + it.hpMax);
    if (it.atk) out.push('攻击 +' + it.atk);
    if (it.wu) out.push('悟性 +' + it.wu);
    if (it.ti) out.push('体魄 +' + it.ti);
    if (it.cult) out.push('修炼 +' + Math.round(it.cult * 100) + '%');
    return out.join('，') || '无属性加成';
  }
  function renderGear() {
    const slotsBox = $('gear-slots');
    slotsBox.innerHTML = '';
    ['head', 'body', 'leg'].forEach(function (slot) {
      const card = document.createElement('div');
      card.className = 'gear-slot';
      const id = S.equip[slot];
      if (id) {
        const it = EQUIPS[slot][id];
        const tc = EQUIP_TIERS[it.tier].color;
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5>' +
          '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
          '<div class="item-stat">' + equipStatStr(it) + '</div>';
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
        const it = Engine.findEquip(id);
        if (it) {
          const tc = EQUIP_TIERS[it.tier].color;
          card.innerHTML = '<h5>法宝' + (ti + 1) + '</h5>' +
            '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
            '<div class="item-stat">' + equipStatStr(it) + '</div>' +
            '<div class="g-actions"><button class="btn-small">卸下</button></div>';
          card.querySelector('button').onclick = function () {
            S.equip.treasure.splice(ti, 1);
            S.wu -= it.wu || 0;
            S.ti -= it.ti || 0;
            S.inventory.push(id);
            Engine.refreshStats(S); Engine.saveState(S);
            log('你卸下了【' + it.name + '】。', 'dim');
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
    S.inventory.forEach(function (id) {
      const it = Engine.findEquip(id);
      if (!it) return;
      const tc = EQUIP_TIERS[it.tier].color;
      const d = document.createElement('div');
      d.className = 'gear-item';
      d.innerHTML = '<div style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
        '<div class="dim" style="font-size:12px">' + equipStatStr(it) + '</div>' +
        '<div class="g-actions">' +
        '<button>穿戴</button><button>出售 ' + Math.round(it.price * 0.5) + ' 灵石</button>' +
        '</div>';
      const btns = d.querySelectorAll('button');
      btns[0].onclick = function () {
        Engine.wearEquip(S, id);
        log('你换上了【' + it.name + '】。', 'good');
        renderGear();
      };
      btns[1].onclick = function () {
        const g = Engine.sellEquip(S, id);
        log('你卖掉了【' + it.name + '】，得灵石 ' + g + '。', 'good');
        renderGear();
      };
      inv.appendChild(d);
    });
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
        row.innerHTML = '<div><b>[' + ARTIFACTS[f.out].name + ']</b><br><span class="dim">' + ARTIFACTS[f.out].desc + '｜' + ARTIFACTS[f.out].effect + '</span></div>' +
          '<button>灵铁' + f.cost.iron + ' → 炼</button>' +
          '<button class="ghost">连炼至材尽</button>';
        const btns = row.querySelectorAll('button');
        btns[0].onclick = function () {
          const r = Engine.doForge(S, f);
          log(r.msg, r.ok ? 'good' : 'bad');
          refresh();
        };
        btns[1].onclick = function () {
          if (S.iron < f.cost.iron) { log('灵铁不足，炼不得。', 'bad'); return; }
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
        '<h4>法宝</h4>' + (S.arts.length ? S.arts.map(function (a) {
          if (!ARTIFACTS[a]) return '';
          return '<p><b>' + ARTIFACTS[a].name + '</b><span class="dim"> · ' + ARTIFACTS[a].effect + '</span></p>';
        }).join('') : '<p class="dim">无</p>');
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
        rowEl.innerHTML = '<div><b>[' + ARTIFACTS[f.out].name + ']</b><br><span class="dim">' + ARTIFACTS[f.out].desc + '｜' + ARTIFACTS[f.out].effect + '</span></div>' +
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

      // 播种区域
      const h5 = document.createElement('h4');
      h5.textContent = '播种';
      body.appendChild(h5);
      const seeds = document.createElement('div');
      Object.keys(FIELD_SEEDS).forEach(function (id) {
        const sd = FIELD_SEEDS[id];
        var herbKey = FIELD_GRADE_MAP[sd.grade] || 'herb_huang';
        var herbName = MATERIALS[herbKey] ? MATERIALS[herbKey].name : '灵草';
        const rowEl = document.createElement('div');
        rowEl.className = 'formula-row';
        rowEl.innerHTML = '<div><b>[' + sd.name + ']</b><br><span class="dim">' + sd.desc + '</span></div>';
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 4px;';
        // 播种1株按钮
        const btn1 = document.createElement('button');
        btn1.className = 'btn-small';
        btn1.textContent = herbName + ' ×' + sd.cost + ' → 种1株';
        btn1.disabled = (S.materials[herbKey] || 0) < sd.cost;
        btn1.onclick = function () {
          const r = Engine.plantField(S, id, 1);
          log(r, r.indexOf('你翻土') === 0 ? 'good' : 'bad');
          renderArtsTab('land', body);
          refresh();
        };
        btnGroup.appendChild(btn1);
        // 播种3株按钮
        const btn3 = document.createElement('button');
        btn3.className = 'btn-small';
        btn3.textContent = '种3株（' + (sd.cost * 3) + '）';
        btn3.disabled = (S.materials[herbKey] || 0) < sd.cost * 3;
        btn3.onclick = function () {
          const r = Engine.plantField(S, id, 3);
          log(r, r.indexOf('你翻土') === 0 ? 'good' : 'bad');
          renderArtsTab('land', body);
          refresh();
        };
        btnGroup.appendChild(btn3);
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

      // 锻体
      const row3 = document.createElement('div');
      row3.className = 'formula-row';
      row3.innerHTML = '<div><b>[锻体]</b><br><span class="dim">以矿为炉，锤炼肉身。体魄 +0.5</span></div><button>锻体</button>';
      row3.querySelector('button').onclick = function () {
        if (!Engine.canAction(S, 1)) { log('行动点不足。'); return; }
        Engine.spend(S, 1);
        S.ti = (S.ti || 0) + 0.5;
        Engine.refreshStats(S);
        Engine.saveState(S);
        log('你苦修锻体，体魄 +0.5。', 'good');
        renderArtsTab('mine', body);
        refresh();
      };
      list.appendChild(row3);

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
    box.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = '选择种子';
    box.appendChild(title);

    Object.keys(FIELD_SEEDS).forEach(function(id) {
      const sd = FIELD_SEEDS[id];
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;';
      card.innerHTML = '<h4 style="color:#90e8b0;">' + sd.name + '</h4>' +
        '<p class="desc">' + sd.desc + '</p>' +
        '<p class="desc">成长时间：' + sd.years + '年</p>';
      card.onclick = function() {
        const result = Engine.plantField(S, id, 1);
        if (result.ok) {
          log(result.msg, 'good');
          closeModal();
          renderBaiyiPage();
          refresh();
        } else {
          log(result.msg, 'bad');
        }
      };
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
  function renderBaiyiPage() {
    const body = $('crafts-body');
    body.innerHTML = '';
    
    const title = document.createElement('h3');
    title.textContent = '修仙百艺';
    title.style.color = 'var(--gold)';
    body.appendChild(title);
    
    const desc = document.createElement('p');
    desc.className = 'dim';
    desc.textContent = '炼丹、炼器、灵田、灵矿——万般皆是道，百艺可通玄。';
    body.appendChild(desc);

    // 炼制队列
    if (S.craftQueue && S.craftQueue.length > 0) {
      const queueDiv = document.createElement('div');
      queueDiv.style.cssText = 'background:rgba(232,193,90,0.08);border:1px solid rgba(232,193,90,0.3);border-radius:8px;padding:12px;margin-bottom:12px;';
      queueDiv.innerHTML = '<h4 style="color:#e8c15a;margin-bottom:8px;">炼制队列</h4>';
      S.craftQueue.forEach(function(craft, index) {
        const formula = FORMULAS.find(function(f) { return f.id === craft.formulaId; });
        const item = document.createElement('div');
        item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--line);';
        const name = craft.type === '丹' ? ELIXIRS[craft.output].name : ARTIFACTS[craft.output].name;
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

    const bi = Engine.bigIdxOf(S);
    const availableFormulas = FORMULAS.filter(function(f) { return f.needRealm <= bi; });

    // 炼丹部分
    const alchemyTitle = document.createElement('h4');
    alchemyTitle.style.cssText = 'color:#4ec9a0;margin-top:16px;margin-bottom:8px;';
    alchemyTitle.textContent = '── 炼丹 ──';
    body.appendChild(alchemyTitle);

    const alchemyFormulas = availableFormulas.filter(function(f) { return f.type === '丹'; });
    if (alchemyFormulas.length === 0) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用丹方';
      body.appendChild(p);
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
            renderBaiyiPage();
            refresh();
          } else {
            log(result.msg, 'bad');
          }
        };
        card.appendChild(craftBtn);
        body.appendChild(card);
      });
    }

    // 炼器部分
    const forgeTitle = document.createElement('h4');
    forgeTitle.style.cssText = 'color:#b26de0;margin-top:16px;margin-bottom:8px;';
    forgeTitle.textContent = '── 炼器 ──';
    body.appendChild(forgeTitle);

    const forgeFormulas = availableFormulas.filter(function(f) { return f.type === '法宝'; });
    if (forgeFormulas.length === 0) {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无可用配方';
      body.appendChild(p);
    } else {
      const forgeTimeReduce = (S.reinc && S.reinc.forgeTimeReduce) || 0;
      forgeFormulas.forEach(function(formula) {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
        const artifact = ARTIFACTS[formula.out];
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
            renderBaiyiPage();
            refresh();
          } else {
            log(result.msg, 'bad');
          }
        };
        card.appendChild(craftBtn);
        body.appendChild(card);
      });
    }

    // 灵田部分
    const fieldTitle = document.createElement('h4');
    fieldTitle.style.cssText = 'color:#90e8b0;margin-top:16px;margin-bottom:8px;';
    fieldTitle.textContent = '── 灵田 ──';
    body.appendChild(fieldTitle);

    if (S.field && S.field.length > 0) {
      S.field.forEach(function(plot, idx) {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:8px;';
        if (plot) {
          const seed = FIELD_SEEDS[plot.seed];
          const yearsLeft = plot.endYear - S.year;
          card.innerHTML = '<h4>灵田' + (idx + 1) + '</h4>' +
            '<p class="desc" style="color:#90e8b0;">' + (seed ? seed.name : plot.seed) + '</p>' +
            '<p class="desc">' + (yearsLeft > 0 ? '还需' + yearsLeft + '年' : '可收获') + '</p>';
          if (yearsLeft <= 0) {
            const harvestBtn = document.createElement('button');
            harvestBtn.className = 'btn-small';
            harvestBtn.textContent = '收获';
            harvestBtn.onclick = function() {
              const result = Engine.harvestField(S, idx);
              if (result.ok) {
                log(result.msg, 'good');
                renderBaiyiPage();
                refresh();
              }
            };
            card.appendChild(harvestBtn);
          }
        } else {
          card.innerHTML = '<h4>灵田' + (idx + 1) + '</h4><p class="dim">空闲</p>';
          const plantBtn = document.createElement('button');
          plantBtn.className = 'btn-small';
          plantBtn.textContent = '种植';
          plantBtn.onclick = function() {
            showPlantSelect(idx);
          };
          card.appendChild(plantBtn);
        }
        body.appendChild(card);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '暂无灵田';
      body.appendChild(p);
    }

    $('crafts-back').onclick = function () { showScreen('game'); refresh(); };
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
        AudioManager.playBgm('game');
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
    bClear.onclick = function() {
      if (confirm('确定要清除所有存档吗？此操作不可恢复！')) {
        if (confirm('再次确认：清除所有存档数据？')) {
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
          alert('存档已清除，请刷新页面。');
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
  function doLoadSlot(slotIdx) {
    if (S && S.name && !S.dead && typeof confirm === 'function' && !confirm('读档将覆盖当前这一世，确定？')) return;
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
    logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
    log('你自旧日的一缕光阴中苏醒，行囊未动，前路未断。');
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
        bSave.onclick = function () {
          if (info && typeof confirm === 'function' && !confirm('覆盖 ' + SLOT_LABELS[i + 1] + ' 的旧档？')) return;
          Engine.saveState(S, slotIdx == null ? 0 : slotIdx);
          log('已写入' + SLOT_LABELS[i + 1] + '。', 'good');
          sfx('good');
          openSaveModal(true);
        };
        row.appendChild(bSave);
      }
      wrap.appendChild(row);
    }
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
      btnAdd.textContent = full ? '已满' : '增加';
      btnAdd.className = full ? 'maxed' : '';
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
      btnSub.textContent = isEmpty ? '无' : '减少';
      btnSub.className = 'maxed';
      btnSub.disabled = isEmpty;
      btnSub.onclick = function () {
        if (isEmpty) return;
        const refund = r.cost * bought;
        M.points += refund;
        M.reinc[r.id] = (M.reinc[r.id] || 0) - 1;
        Engine.saveMeta(M);
        renderRebirth();
      };
      
      card.innerHTML = '<h4>' + r.name + '</h4>' +
        '<div class="desc">' + r.desc + '</div>' +
        '<div class="lvl">' + stars.join('') + ' <span class="cost">' + (full ? '满级' : currentCost + '点') + '</span></div>';
      
      const btnRow = document.createElement('div');
      btnRow.className = 'rb-btn-row';
      btnRow.appendChild(btnSub);
      btnRow.appendChild(btnAdd);
      card.appendChild(btnRow);
      
      wrap.appendChild(card);
    });
  }

  /* ---------------- 标题 / 继续 ---------------- */
  function validSave(S) {
    if (!S || !S.linggen || !S.name || !S.talents || !S.talents.length) return false;
    if (S.dead || S.endReason) return true;
    const st = STAGES[S.idx];
    if (!st || st.realm !== S.realm) return false;
    return true;
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
  function actContinue() {
    S = Engine.loadState();
    if (!validSave(S)) {
      Engine.clearState();
      S = null;
    }
    if (S) {
      suspended = false;
      showScreen('game');
      logSection('第 ' + S.year + ' 年 · ' + S.age + ' 岁');
      log('远行的路还在脚下。你整理衣冠，重拾剑与梦。');
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
  }

  /* ---------------- 开机 ---------------- */
  function boot() {
    M = Engine.loadMeta();
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
    $('btn-cult').onclick = function () { sfx('click'); actCultivate(); };
    $('btn-explore').onclick = function () { sfx('click'); actExplore2(); };
    $('btn-social').onclick = function () { sfx('click'); actSocial(); };
    $('btn-baiyi').onclick = function () {
      if (!S || S.dead || !S.sect) return;
      sfx('click');
      showBaiyi();
    };
    $('btn-sect').onclick = function () { sfx('click'); actSect(); };
    $('btn-break').onclick = function () { sfx('click'); actBreak(); };
    $('btn-year').onclick = function () { sfx('click'); actYearEnd(); };
    if ($('btn-bag')) $('btn-bag').onclick = function () { sfx('click'); openBag(); };
    if ($('btn-gear')) $('btn-gear').onclick = function () { sfx('click'); openGear(); };
    $('btn-arts').onclick = function () {
      if (!S || S.dead) return;
      sfx('click');
      actArts();
    };
    $('crafts-gear').onclick = function () { sfx('click'); openGear(); };
    $('crafts-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('tech-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('favor-back').onclick = function () { sfx('click'); showScreen('game'); refresh(); };
    $('modal-close').onclick = function () { sfx('click'); closeModal(); };
    $('modal').onclick = function (e) { if (e.target === $('modal')) { sfx('click'); closeModal(); } };
    $('t-load').onclick = function () { sfx('click'); openSaveModal(false); };
    $('t-settings').onclick = function () { sfx('click'); openSettings(); };
    if ($('btn-settings')) $('btn-settings').onclick = function () { sfx('click'); openSettings(); };

    // 底部栏按钮事件
    $('btn-char-bottom').onclick = function () { if (!S) return; sfx('click'); openChar(); };
    $('btn-bag-bottom').onclick = function () { sfx('click'); openBag(); };
    $('btn-favor').onclick = function () { if (!S) return; sfx('click'); openFavor(); };
    $('btn-craft-bottom').onclick = function () {
      if (!S || S.dead) return;
      sfx('click');
      openModal('arts');
    };
    $('btn-events').onclick = function () { if (!S) return; sfx('click'); openEvents(); };
    $('btn-settings-bottom').onclick = function () { sfx('click'); openSettings(); };

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
  }

  function showUpdateToast() {
    var toast = document.createElement('div');
    toast.className = 'update-toast';
    toast.innerHTML = '<span>发现新版本</span><button onclick="location.reload()">点击更新</button>';
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('show'); }, 100);
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
    const st = safeStage(S);
    const es = Engine.equipStats(S);
    const cultR = Engine.cultGain(S);
    const tiMulti = [20, 25, 30, 35][Engine.bigIdxOf(S)] || 20;

    // 命格加成汇总
    const destAttrBonus = { wu: 0, ti: 0, dun: 0, shen: 0, dao: 0, fu: 0 };
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

    const sixDims = [
      { key: 'wu', name: '悟性', icon: '📖', color: '#5ac8fa',
        base: S.wu || 0, eqBonus: es.wu || 0, destBonus: destAttrBonus.wu || 0,
        affect: '修炼速度', formula: '每点+10修为基础值' },
      { key: 'ti', name: '体魄', icon: '💪', color: '#e0604a',
        base: S.ti || 0, eqBonus: es.ti || 0, destBonus: destAttrBonus.ti || 0,
        affect: '气血上限', formula: '每点+' + tiMulti + '气血' },
      { key: 'dun', name: '遁速', icon: '💨', color: '#4ec9a0',
        base: S.dun || 0, eqBonus: 0, destBonus: destAttrBonus.dun || 0,
        affect: '闪避率', formula: '每点+0.5%闪避' },
      { key: 'shen', name: '神识', icon: '👁', color: '#c06ae0',
        base: S.shen || 0, eqBonus: 0, destBonus: destAttrBonus.shen || 0,
        affect: '暴击率', formula: '每点+1%暴击' },
      { key: 'dao', name: '道心', icon: '☯', color: '#e8c15a',
        base: S.dao || 0, eqBonus: 0, destBonus: destAttrBonus.dao || 0,
        affect: '渡劫成功率', formula: '道心越高劫难越轻' },
      { key: 'fu', name: '福源', icon: '🍀', color: '#90e8b0',
        base: S.fu || 0, eqBonus: 0, destBonus: destAttrBonus.fu || 0,
        affect: '机缘触发', formula: '福源越高运气越好' }
    ];

    sixDims.forEach(function (dim) {
      const total = dim.base + dim.eqBonus + dim.destBonus;
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
      let valStr = '<b>' + total + '</b>';
      if (dim.eqBonus || dim.destBonus) {
        const parts = [];
        if (dim.base) parts.push('基础' + dim.base);
        if (dim.eqBonus) parts.push('装备+' + dim.eqBonus);
        if (dim.destBonus) parts.push('命格+' + dim.destBonus);
        valStr += '<span class="dim">（' + parts.join(' + ') + '）</span>';
      }
      valRow.innerHTML = valStr;
      card.appendChild(valRow);

      const affect = document.createElement('div');
      affect.className = 'attr-six-affect dim';
      affect.textContent = dim.affect + '：' + dim.formula;
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
    const defMul = Engine.getDestinyAttrMult(S, 'def');
    const defBase = Math.round((S.ti || 0) * 0.5);
    const defTotal = Math.round(defBase * defMul);
    const critBase = Math.round(((S.shen || 0) * 0.01 + Engine.getDestinyBonus(S, 'critRate')) * 100);
    const dodgeBase = Math.round(((S.dun || 0) * 0.005 + Engine.getDestinyBonus(S, 'dodgeRate')) * 100);

    const combatStats = [
      { name: '攻击', val: Math.round(S.atk * atkMul), color: '#ff9080', desc: '基础10+境界加成' },
      { name: '防御', val: defTotal, color: '#90e8b0', desc: '体魄×0.5×命格倍率' },
      { name: '气血', val: S.hp + ' / ' + S.hpMax, color: '#ff9080', desc: '80+体魄×' + tiMulti + '+境界' },
      { name: '暴击', val: critBase + '%', color: '#e8c15a', desc: '神识×1%+命格' },
      { name: '闪避', val: dodgeBase + '%', color: '#4ec9a0', desc: '遁速×0.5%+命格' },
      { name: '寿元', val: S.age + ' / ' + S.lifeMax, color: '#c06ae0', desc: '每突破增加上限' },
      { name: '修为', val: S.qi + ' / ' + Engine.requireNeed(S), color: '#5ac8fa', desc: '修炼积累，满则突破' },
      { name: '修炼', val: '+' + cultR.gain, color: '#4ec9a0', desc: '(60+悟性×10)×境界' }
    ];

    combatStats.forEach(function (cs) {
      const cell = document.createElement('div');
      cell.className = 'attr-combat-cell';
      cell.innerHTML = '<div class="attr-combat-label">' + cs.name + '</div>' +
        '<div class="attr-combat-val" style="color:' + cs.color + '">' + cs.val + '</div>' +
        '<div class="attr-combat-desc dim">' + cs.desc + '</div>';
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
      if (S.linggen.body) {
        const parts = [];
        if (S.linggen.body.atk) parts.push('攻击+' + S.linggen.body.atk);
        if (S.linggen.body.hpMax) parts.push('气血上限+' + S.linggen.body.hpMax);
        if (S.linggen.body.trib) parts.push('渡劫+' + Math.round(S.linggen.body.trib * 100) + '%');
        if (parts.length) lg.innerHTML += '<br><span class="dim" style="margin-left:8px">加成：' + parts.join('，') + '</span>';
      }
    } else {
      lg.innerHTML = '<span class="dim">未觉醒</span>';
    }
    box.appendChild(lg);

    // === 天赋（旧命格系统） ===
    const h3 = document.createElement('h4');
    h3.textContent = '天赋';
    h3.style.color = 'var(--gold)';
    box.appendChild(h3);
    if (S.talents.length) {
      S.talents.forEach(function (t) {
        const x = TALENTS.filter(function (y) { return y.id === t; })[0];
        if (!x) return;
        const p = document.createElement('div');
        p.className = 'attr-destiny-card';
        const tierName = TIER_NAMES[x.tier] || '凡命';
        const tierColor = TIER_COLORS[x.tier] || '#b0b0bc';
        p.innerHTML = '<div class="attr-destiny-header"><span class="attr-destiny-tier" style="color:' + tierColor + '">【' + tierName + '】</span>' +
          '<span class="attr-destiny-name" style="color:' + tierColor + '">' + x.name + '</span></div>' +
          '<div class="attr-destiny-desc dim">' + x.desc + '</div>';
        box.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = '无天赋';
      box.appendChild(p);
    }

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
          const attrNames = { wu: '悟性', ti: '体魄', dun: '遁速', shen: '神识', dao: '道心', fu: '福源' };
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

    // === 轮回加成 ===
    const h7 = document.createElement('h4');
    h7.textContent = '轮回加成';
    h7.style.color = 'var(--gold)';
    box.appendChild(h7);
    const reincDiv = document.createElement('div');
    reincDiv.className = 'attr-section';
    const reincParts = [];
    if ((S.reinc.cult || 0) > 0) reincParts.push('道种：修炼+' + (S.reinc.cult * 10) + '%');
    if ((S.reinc.alchemyTimeReduce || 0) > 0) reincParts.push('丹心：炼丹时间-' + S.reinc.alchemyTimeReduce + '年');
    if ((S.reinc.forgeTimeReduce || 0) > 0) reincParts.push('器魂：炼器时间-' + S.reinc.forgeTimeReduce + '年');
    if ((S.reinc.shesheng || 0) > 0) reincParts.push('舍生：修炼+' + (S.reinc.shesheng * 10) + '%，-1寿元/次');
    reincDiv.innerHTML = reincParts.length ? '<span class="dim">' + reincParts.join('。') + '</span>' : '<span class="dim">无轮回加成</span>';
    box.appendChild(reincDiv);
  }
  
  function renderCharEquip() {
    const slotsBox = $('char-equip-slots');
    slotsBox.innerHTML = '';
    ['weapon', 'head', 'body', 'leg', 'accessory'].forEach(function (slot) {
      const card = document.createElement('div');
      card.className = 'equip-slot';
      const id = S.equip[slot];
      if (id) {
        const it = Engine.findEquip(id);
        if (it) {
          const tc = EQUIP_TIERS[it.tier].color;
          card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5>' +
            '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
            '<div class="item-stat">' + equipStatStr(it) + '</div>' +
            '<div class="g-actions"><button class="btn-small">卸下</button></div>';
          card.querySelector('button').onclick = function () {
            S.equip[slot] = null;
            S.inventory.push(id);
            Engine.refreshStats(S); Engine.saveState(S);
            log('你卸下了【' + it.name + '】。', 'dim');
            renderCharEquip();
          };
        } else {
          card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5><div class="empty">未装备</div>';
        }
      } else {
        card.innerHTML = '<h5>' + EQUIP_SLOTS[slot].name + '</h5><div class="empty">未装备</div>';
      }
      slotsBox.appendChild(card);
    });
    // 灵兵槽位（未解锁）
    const lockedCard = document.createElement('div');
    lockedCard.className = 'equip-slot locked';
    lockedCard.innerHTML = '<h5>灵兵</h5><div class="empty" style="color:#5a5270;">未解锁</div>';
    slotsBox.appendChild(lockedCard);
    // 储物袋装备
    const inv = $('char-equip-inv');
    inv.innerHTML = '';
    if (!S.inventory.length) {
      inv.innerHTML = '<p class="dim">袋中无多余装备。</p>';
    }
    S.inventory.forEach(function (id, idx) {
      const it = Engine.findEquip(id);
      if (!it) return;
      const tc = EQUIP_TIERS[it.tier].color;
      const d = document.createElement('div');
      d.className = 'gear-item';
      d.innerHTML = '<div style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
        '<div class="dim" style="font-size:12px">' + equipStatStr(it) + '</div>' +
        '<div class="g-actions">' +
        '<button>穿戴</button><button>出售 ' + Math.round(it.price * 0.5) + ' 灵石</button>' +
        '</div>';
      const btns = d.querySelectorAll('button');
      btns[0].onclick = function () {
        Engine.wearEquip(S, id);
        log('你换上了【' + it.name + '】。', 'good');
        renderCharEquip();
      };
      btns[1].onclick = function () {
        const g = Engine.sellEquip(S, id);
        log('你卖掉了【' + it.name + '】，得灵石 ' + g + '。', 'good');
        renderCharEquip();
      };
      inv.appendChild(d);
    });
  }
  
  function renderCharTreasure() {
    const slotsBox = $('char-treasure-slots');
    slotsBox.innerHTML = '';
    const maxT = Engine.maxTreasure(S);
    const treasures = Array.isArray(S.equip.treasure) ? S.equip.treasure : [];
    for (let ti = 0; ti < maxT; ti++) {
      const card = document.createElement('div');
      card.className = 'treasure-slot';
      const id = treasures[ti];
      if (id) {
        const it = Engine.findEquip(id);
        if (it) {
          const tc = EQUIP_TIERS[it.tier].color;
          card.innerHTML = '<h5>法宝' + (ti + 1) + '</h5>' +
            '<div class="item-name" style="color:' + tc + '">[' + EQUIP_TIERS[it.tier].name + ']' + esc(it.name) + '</div>' +
            '<div class="item-stat">' + equipStatStr(it) + '</div>';
        }
      } else {
        card.innerHTML = '<h5>法宝' + (ti + 1) + '</h5><div class="empty">未装备</div>';
      }
      slotsBox.appendChild(card);
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

  document.addEventListener('DOMContentLoaded', boot);
})();