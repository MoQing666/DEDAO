/* DEDAO 新手引导系统（聚光灯分步高亮）
 * - 形式：半透明遮罩 + 目标元素金色高亮环 + 解说卡（上一步 / 下一步 / 跳过全部）
 * - 触发：新游戏首次自动（initGame 调 autoIfNew）；设置面板「新手引导」重看；标题页「新手引导」看标题页按键
 * - 可跳过：每步可「跳过引导」；看完或跳过后写 localStorage 标记，不再自动弹
 * - 导航：目标不在当前屏时，经 window.DedaoNav 切到对应屏幕再高亮（详见 ui.js 导出的 DedaoNav）
 */
(function () {
  'use strict';
  var TUT_KEY = 'dedao_tutorial_v1_done';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 步骤数据（group: 'title' | 'game'） ----------------
     target: 高亮的元素 id
     goto:   目标不在当前屏时调用的 DedaoNav 键（'char'/'bag'/'battle'/'adv'/'settings'/'game'/'title'）
     noSpot: true 时不高亮具体元素，仅居中显示解说卡（用于整屏说明）            */
  var STEPS = [
    /* ===== 标题页（仅从标题页「新手引导」触发） ===== */
    { group: 'title', target: 't-new', title: '开始轮回',
      body: '从零开启一局新游戏。点它会进入【天命抉择】开荒页：先选起始境界，再抽取灵根与命格，最后点「开始这一世」正式踏入凡尘。每一世都是新的开始。' },
    { group: 'title', target: 't-continue', title: '继续征途',
      body: '读取你最近一次存档，接着上一世结束的地方继续修行。适合中途退出后回来接着玩。' },
    { group: 'title', target: 't-load', title: '存档 · 读档',
      body: '打开多存档槽管理：可保存多个进度、读取指定存档，或删除旧档。重要节点建议手动存一份。' },
    { group: 'title', target: 't-rebirth', title: '轮回塔（天赋）',
      body: '消耗通关积累的【轮回点】解锁永久天赋，下一世开局即生效。这是「放置 / 轮回」养成的核心循环——一代代变强。' },
    { group: 'title', target: 't-settings', title: '设置',
      body: '调整背景音乐、音效、文字节奏与界面特效；也能在这里暂停修行或保存退出到主页。' },

    /* ===== 主界面 HUD ===== */
    { group: 'game', target: 'btn-ach-hud', title: '成就 · 轮回印记',
      body: '记录你历世达成的成就与【轮回印记】进度。每解锁一个印记都留下证明，是轮回养成的勋章墙。' },
    { group: 'game', target: 'btn-codex-hud', title: '图鉴',
      body: '自动收录你见过的敌人、BOSS、灵材与功法。初次遭遇的新事物会入册，方便回看。' },

    /* ===== 主界面行动栏 ===== */
    { group: 'game', target: 'btn-cult', title: '修炼',
      body: '消耗行动点闭关吐纳，增长修为。修为攒满后，右侧【突破】会亮起，点它破境提升境界——境界越高实力越强。' },
    { group: 'game', target: 'btn-explore', title: '秘境',
      body: '进入层层深入的秘境夺宝，途中可随时在【静室】或右下角【强行撤离】保住收获。是灵材与装备的主要来源。' },
    { group: 'game', target: 'btn-sect', title: '宗门',
      body: '接取宗门任务换取资源与声望；拜入宗门后还会开启【百艺】（炼丹 / 炼器 / 灵田 / 灵矿…）。' },
    { group: 'game', target: 'btn-arts', title: '锻体',
      body: '消耗行动点锤炼体魄，强化六维中的【体魄】等基础属性，直接提升气血与生存能力。' },
    { group: 'game', target: 'btn-social', title: '游历',
      body: '展开山河图四处游历，触发机缘事件与仙缘人物，是剧情与特殊奖励的主要来源。' },
    { group: 'game', target: 'btn-baiyi', title: '百艺（未解锁）',
      body: '炼丹、炼器、灵田、灵矿等生活技艺。需先拜入宗门才会解锁，开局是灰色的别急。' },
    { group: 'game', target: 'btn-break', title: '突破',
      body: '当修为攒满后亮起。点它冲击瓶颈、破境提升境界。突破有失败风险，但成功则属性大涨、上限更高。' },
    { group: 'game', target: 'btn-year', title: '下一年',
      body: '行动点用完时点它，推进一年、恢复行动点，并结算寿元与年度事件。寿元耗尽即这一世终结——时间不等人。' },

    /* ===== 角色页 ===== */
    { group: 'game', target: 'btn-char-bottom', goto: 'char', title: '角色页入口',
      body: '点底部【角色】打开角色页，查看六维、灵根与实时战斗属性；还能装备、看法宝与功法。下面几步带你认一遍里面的分页。' },
    { group: 'game', target: 'tab-attr', goto: 'char', title: '属性',
      body: '六维（力 / 体 / 神 / 悟 / 运 / 根）、灵根与当前战斗属性都在这里。装备、法宝的加成会实时反映。' },
    { group: 'game', target: 'tab-equip', goto: 'char', title: '装备',
      body: '在此穿戴武器、防具等装备。也可在【背包】里点装备穿上。装备后属性面板会同步刷新。' },
    { group: 'game', target: 'tab-treasure', goto: 'char', title: '法宝',
      body: '装备法宝（如【巨灵腰带】可增加体魄与气血）。装备 / 卸下后属性会即时更新。' },
    { group: 'game', target: 'tab-tech', goto: 'char', title: '功法',
      body: '研习与切换功法，影响战斗中的技能与各项加成。' },
    { group: 'game', target: 'char-back', goto: 'char', title: '返回修行',
      body: '关掉角色页，回到主修行界面。' },

    /* ===== 背包 ===== */
    { group: 'game', target: 'btn-bag-bottom', goto: 'bag', title: '背包入口',
      body: '点底部【背包】打开储物袋，管理丹药、灵材、装备。下面两步讲怎么变现与穿戴。' },
    { group: 'game', target: 'sell-herb', goto: 'bag', title: '卖灵草',
      body: '把多余的灵草换成灵石（基础货币），5 株换 20 灵石。积攒的灵石用于抽卡、购买等。' },
    { group: 'game', target: 'sell-iron', goto: 'bag', title: '卖灵铁',
      body: '灵铁换灵石，5 块换 30 灵石。和灵草一样是前期稳定的变现渠道。' },
    { group: 'game', target: 'crafts-gear', goto: 'bag', title: '装备',
      body: '在背包里选中装备后点【装备】穿到身上；也可在角色页【装备】分页操作。' },
    { group: 'game', target: 'bag-back', goto: 'bag', title: '返回修行',
      body: '关掉背包回到主界面。' },

    /* ===== 战斗（揭示战斗屏） ===== */
    { group: 'game', target: 'b-atk', goto: 'battle', title: '攻击',
      body: '普通攻击，稳定输出且不耗灵力，是多数战斗的默认起手。' },
    { group: 'game', target: 'b-spell', goto: 'battle', title: '法术',
      body: '释放功法法术，伤害更高但耗灵力；按灵根亲和与五行生克有加成或减伤。' },
    { group: 'game', target: 'b-guard', goto: 'battle', title: '防御',
      body: '本回合受到的伤害大幅降低（约 65%），适合回血或蓄势待发。' },
    { group: 'game', target: 'b-flee', goto: 'battle', title: '逃跑',
      body: '尝试脱离战斗；非必成功，但秘境小怪通常可以逃。' },
    { group: 'game', target: 'b-elixir', goto: 'battle', title: '服药',
      body: '战斗中吃丹药回血 / 回灵。背包里真有药时这个按钮才会出现。' },
    { group: 'game', target: 'b-order', goto: 'battle', title: '编排',
      body: '调整出战功法与施法顺序 / 优先级，让自动战斗更聪明。' },

    /* ===== 秘境地图（揭示秘境屏） ===== */
    { group: 'game', target: 'adv-info', goto: 'adv', title: '说明',
      body: '点开查看当前秘境的详细规则与掉落说明，新手必看，先懂规则再深入。' },
    { group: 'game', target: 'adv-retreat', goto: 'adv', title: '强行撤离',
      body: '仓促遁走，半数收获散落（灵石 / 草 / 铁各失 50%）。想保住全部收获，请在途中的【静室】选「撤离」。' },

    /* ===== 设置 · 暂停（整屏说明） ===== */
    { group: 'game', target: 'modal', goto: 'settings', noSpot: true, title: '暂停 · 存档 · 退出',
      body: '在【设置】里还能：① 暂停修行；② 存档·读档管理进度；③ 保存并退出到主页（进度会自动保存）。随时回来都能接着玩。\n\n到这里，新手引导就结束啦——祝道友早登仙途！' }
  ];

  var state = { mode: 'new', list: [], idx: 0 };
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
          '<button class="tut-skip" data-act="skip">跳过引导</button>' +
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

  function buildList(mode) {
    if (mode === 'title') return STEPS.filter(function (s) { return s.group === 'title'; });
    return STEPS.filter(function (s) { return s.group === 'game'; });
  }

  function start(mode) {
    mode = mode || 'new';
    ensureOverlay();
    if ($('modal')) $('modal').style.display = 'none'; // 若从设置中进入，先关设置弹窗
    state.mode = mode;
    state.list = buildList(mode);
    state.idx = 0;
    if (!state.list.length) return;
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderStep();
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
    if (step.noSpot) { spot.style.display = 'none'; centerCard(card); return; }
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
    try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {}
    if (state.mode === 'game' || state.mode === 'new') {
      if (window.DedaoNav) window.DedaoNav.game();
    }
    state.list = []; state.idx = 0;
  }

  window.Tutorial = {
    start: start,
    finish: finish,
    isDone: function () { try { return !!localStorage.getItem(TUT_KEY); } catch (e) { return false; } },
    autoIfNew: function () {
      if (window.Tutorial.isDone()) return false;
      window.Tutorial.start('new');
      return true;
    },
    _debugSteps: STEPS // 仅供自动化测试校验步骤完整性
  };
})();
