/* DEDAO 新手引导系统（分阶段 · 聚光灯分步高亮）
 * 设计：引导按「游戏进度」分阶段，避免开局一次性全介绍把玩家劝退。
 *   - title   开局（标题页）只讲【开始】+【轮回阁】，引导玩家进入游戏
 *   - basics  进入游戏后只讲【修炼】【角色】【游历】（游历末附「秘境/宗门/百艺逐步敞开」提示）
 *   - secret  第 2 年自动解锁秘境时，单独介绍【秘境】
 *   - sect    第 5 年单独介绍【宗门】【百艺】
 * 触发：
 *   - 新玩家首见标题页：boot() 调 autoTitle() → 自动播放 title 阶段
 *   - 进入游戏首世：initGame() 调 onEnterGame() → 自动播放 basics 阶段
 *   - 年末推进：doYearEnd() 调 onYear(year) → 第 2 年 secret / 第 5 年 sect（在主线剧情跑完后触发）
 *   - 设置「新手引导」重看 / 标题页「新手引导」：start('replay') / start('title')
 * 可跳过：每步可「跳过引导」；看完或跳过后写 localStorage 阶段标记，不再自动弹。
 * 导航：目标不在当前屏时，经 window.DedaoNav 切到对应屏幕再高亮。
 */
(function () {
  'use strict';
  var PREFIX = 'dedao_tut_';           // 各阶段独立标记：dedao_tut_title / _basics / _secret / _sect
  var $ = function (id) { return document.getElementById(id); };

  /* 分阶段步骤数据
     target: 高亮元素 id（null 配合 noSpot 表示整屏说明）
     goto:   目标不在当前屏时调用的 DedaoNav 键
     noSpot: true 不高亮具体元素，仅居中显示解说卡 */
  var STAGES = {
    title: [
      { target: 't-new', title: '开始轮回',
        body: '从零开启一局新游戏。点击会进入【天命抉择】可以选取命格（局内天赋），开荒页可以选择出生，灵根，其他局内技能，每一世都是新的开始。' },
      { target: 't-rebirth', title: '轮回阁 · 天赋',
        body: '这里消耗通关积累的【轮回点】解锁局外永久天赋，其中命格相关的天赋可以在【天命抉择】就帮到你。' }
    ],
    basics: [
      { target: 'btn-cult', title: '修炼',
        body: '消耗行动点闭关吐纳，分为三档，分别消耗1,2,3点行动。修为攒满后，下一年左侧【突破】面对劫难，破劫飞升。' },
      { target: 'btn-char-bottom', goto: 'char', title: '角色',
        body: '点底部【角色】查看六维、灵根与战斗属性，获得后别忘了装上装备，法宝和功法' },
      { target: 'btn-social', goto: 'game', title: '游历',
        body: '展开山河图四处游历，触发机缘事件与仙缘人物，是解锁剧情与人物互动的主要来源。\n\n秘境、宗门、百艺会随年份逐步向你敞开，先把前面这几步走熟。' }
    ],
    secret: [
      { target: 'btn-explore', title: '秘境 · 第 2 年开启',
        body: '第 2 年到了，秘境就此向你敞开！进入层层深入的秘境夺宝，是灵材法术与装备的主要来源。一年可进入一次，途中可随时在【静室】安全撤离（全收获）或右下角【强行撤离】保住一半收获。' }
    ],
    // 仙门赶考（2026-09-23）：主线【仙门收徒】播完后立刻弹，聚光灯指向行动栏【宗门】。
    // 与主线的挂载见 data.js 的 ml_2_0.tutorial / ui.js playMainlineChain 的 done()。
    // 玩家点「结束引导」（或看完最后一步）→ finish() 写标记 → 永久不再提示。
    exam: [
      { target: 'btn-sect', goto: 'game', title: '仙门赶考 · 赴考之路',
        body: '三座仙门同开收徒大典，就在眼前——点这里【宗门】择一门派赴考。\n\n入宗考验三关：武骨（悟性）、道心、实战。实战为硬门槛，败则今年不录，来年仍可再考，不必急于一时。' }
    ],
    sect: [
      { target: 'btn-sect', goto: 'sect', title: '宗门 · 第 5 年接触',
        body: '第 5 年，是时候接触宗门了，先通过属性和战斗的入宗试炼，之后可以点这里接取宗门任务换取资源与声望；拜入宗门后还会开启【百艺】。' },
      { target: 'btn-baiyi', title: '百艺',
        body: '炼丹、炼器、灵田、灵矿等生活技艺。需先拜入宗门才会解锁——拜入门派后，这里便能研习诸艺，且不耗行动点。' }
    ]
  };

  var state = { stage: null, list: [], idx: 0 };
  var ov = null;

  function ensureOverlay() {
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'tutorial-overlay';
    ov.innerHTML =
      '<div class="tut-dim"></div>' +
      '<div class="tut-spot"></div>' +
      '<div class="tut-card">' +
        '<div class="tut-progress"></div>' +
        '<div class="tut-title"></div>' +
        '<div class="tut-body"></div>' +
        '<div class="tut-actions">' +
          '<button class="tut-skip" data-act="skip">结束引导</button>' +
          '<span class="tut-spacer"></span>' +
          '<button class="tut-prev" data-act="prev">上一步</button>' +
          '<button class="tut-next" data-act="next">下一步</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      var t = e.target;
      var act = t && t.getAttribute ? t.getAttribute('data-act') : null;
      if (act === 'next') next();
      else if (act === 'prev') prev();
      else if (act === 'skip') finish();
    });
    return ov;
  }

  function done(stage) {
    try { return !!localStorage.getItem(PREFIX + stage); } catch (e) { return false; }
  }
  function markDone(stage) {
    try { localStorage.setItem(PREFIX + stage, '1'); } catch (e) {}
  }

  function buildList(stage) {
    const list = (STAGES[stage] || []).slice();
    // 「仙门赶考」引导已播过 → 第 5 年宗门引导不再重复高亮宗门入口，只留百艺步
    if (stage === 'sect' && done('exam')) {
      return list.filter(function (st) { return st.target !== 'btn-sect'; });
    }
    return list;
  }

  function start(stage, force) {
    stage = stage || 'basics';
    if (stage === 'replay') stage = 'basics';   // 重看 = 复习核心循环（强制播放）
    if (!STAGES[stage]) return false;
    if (!force && done(stage)) return false;     // 已看过则不重复自动弹
    ensureOverlay();
    if ($('modal')) $('modal').style.display = 'none'; // 若从设置中进入，先关设置弹窗
    state.stage = stage;
    state.list = buildList(stage);
    state.idx = 0;
    if (!state.list.length) return false;
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderStep();
    return true;
  }

  function renderStep() {
    var step = state.list[state.idx];
    if (!step) return finish();
    // 切到目标所在屏幕
    if (step.goto && window.DedaoNav && window.DedaoNav[step.goto]) {
      window.DedaoNav[step.goto]();
    }
    requestAnimationFrame(function () {
      var card = ov.querySelector('.tut-card');
      ov.querySelector('.tut-title').textContent = step.title;
      ov.querySelector('.tut-body').textContent = step.body;
      ov.querySelector('.tut-progress').textContent = '（' + (state.idx + 1) + ' / ' + state.list.length + '）';
      ov.querySelector('.tut-prev').style.visibility = (state.idx === 0) ? 'hidden' : 'visible';
      ov.querySelector('.tut-next').textContent = (state.idx === state.list.length - 1) ? '完成' : '下一步';
      positionSpot(step, card);
    });
  }

  function positionSpot(step, card) {
    var spot = ov.querySelector('.tut-spot');
    if (step.noSpot || !step.target) { spot.style.display = 'none'; centerCard(card); return; }
    var el = $(step.target);
    if (!el) { spot.style.display = 'none'; centerCard(card); return; }
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { spot.style.display = 'none'; centerCard(card); return; }
    var pad = 8;
    spot.style.display = 'block';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.width = (r.width + pad * 2) + 'px';
    spot.style.height = (r.height + pad * 2) + 'px';
    placeCard(card, r);
  }

  function placeCard(card, r) {
    card.style.transform = 'none';
    var ch = card.offsetHeight || 160;
    var cw = card.offsetWidth || 300;
    var top = r.bottom + 12;
    if (top + ch > window.innerHeight - 8) top = r.top - ch - 12;
    if (top < 8) top = 8;
    var left = r.left + r.width / 2 - cw / 2;
    if (left < 8) left = 8;
    if (left + cw > window.innerWidth - 8) left = window.innerWidth - cw - 8;
    card.style.top = top + 'px';
    card.style.left = left + 'px';
  }

  function centerCard(card) {
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  function next() {
    if (state.idx >= state.list.length - 1) return finish();
    state.idx++;
    renderStep();
  }
  function prev() {
    if (state.idx <= 0) return;
    state.idx--;
    renderStep();
  }
  function finish() {
    if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
    if (state.stage) markDone(state.stage);
    // 非标题阶段结束：回到主修行界面（标题阶段结束则停留在标题页）
    if (state.stage && state.stage !== 'title' && window.DedaoNav) window.DedaoNav.game();
    state.stage = null; state.list = []; state.idx = 0;
  }

  function _maybeStart(stage) {
    if (done(stage)) return false;
    return start(stage, false);
  }

  // _debugSteps：扁平化全部阶段步骤，供自动化测试校验步骤完整性
  var ALL = [];
  STAGES.title.forEach(function (s) { var o = {}; for (var k in s) o[k] = s[k]; o.group = 'title'; ALL.push(o); });
  ['basics', 'secret', 'exam', 'sect'].forEach(function (g) {
    STAGES[g].forEach(function (s) { var o = {}; for (var k in s) o[k] = s[k]; o.group = 'game'; ALL.push(o); });
  });

  window.Tutorial = {
    start: start,
    finish: finish,
    isDone: function (stage) { return stage ? done(stage) : (done('title') && done('basics')); },
    done: done,
    // 首见标题页：只播 title 阶段
    autoTitle: function () { if (done('title')) return false; return start('title', false); },
    // 进入游戏首世：只播 basics 阶段
    onEnterGame: function () { return _maybeStart('basics'); },
    // 年末推进：按年份触发 secret(3) / sect(5)
    onYear: function (year) {
      if (year === 2) return _maybeStart('secret');
      if (year === 5) return _maybeStart('sect');
      return false;
    },
    // 兼容旧调用：autoIfNew 现等价于「进入游戏首世」触发
    autoIfNew: function () { return window.Tutorial.onEnterGame(); },
    _debugSteps: ALL
  };
})();
