/* ============================================================
   DEDAO 得道 · PC 端 UI（异世轮回录风格重设计 / 测试性）
   仅做「主界面交互结构」重设计，不改动任何游戏逻辑：
   - 中央唯一场景图（bg_main） + 地点热点（修炼/秘境/宗门/锻体/游历/百艺/仙缘）
   - 顶部状态条：道号/境界/命格 + 年龄·寿元 + 气血 + 修为 + 六维 + 行动/灵石 + 轮回点 + 角色/仙缘/设置
   - 右侧面板：常驻属性（六维/战力/修为）+ 事件日志
   - 底部「时间流逝」：突破 / 下一年
   所有热点都通过 .click() 触发 ui.js 已有的按钮处理器（openCultivate 等），
   复用 100% 现有渲染与逻辑；原底部 6 个行动按钮隐藏（仍保留作点击目标）。
   ============================================================ */
(function () {
  function $(id) { return document.getElementById(id); }

  function boot() {
    var game = $('screen-game');
    if (!game) return;

    // 1) 中央场景图 + 地图散布的地点热点
    if (!$('pc-scene')) {
      var scene = document.createElement('div');
      scene.id = 'pc-scene';
      scene.className = 'pc-scene';
      scene.innerHTML =
        '<div class="pc-scene-img"></div>' +
        '<div class="pc-scene-hint">修仙山河图 · 点击地点开始这一世的修行</div>' +
        '<div class="pc-scene-nodes" id="pc-nodes"></div>';
      game.appendChild(scene);
    }

    // 2) 右侧面板：只放日志（属性面板已上移到顶部状态条）
    if (!$('pc-side')) {
      var side = document.createElement('div');
      side.id = 'pc-side';
      side.className = 'pc-side';
      var log = $('log');
      if (log) side.appendChild(log);
      game.appendChild(side);
    }

    // 3) 隐藏原底部 6 个行动按钮（改用场景热点），保留 时间流逝(year-row)
    var actGrid = game.querySelector('.act-grid');
    if (actGrid) actGrid.style.display = 'none';

    // 4) 顶部状态条增强（头像 + ID/命格 + 属性填满 + 右上角 仙缘/设置）
    augmentHud();
    // 5) 场景热点（地图散布方框卡片）
    buildNodes();
  }

  /* ---------------- 顶部状态条 ---------------- */
  function augmentHud() {
    var hud = $('screen-game').querySelector('.hud');
    if (!$('pc-portrait') && hud) {
      // 1) 头像（左上角，点击 = 角色）
      var porta = document.createElement('div');
      porta.id = 'pc-portrait'; porta.className = 'pc-portrait'; porta.title = '角色';
      porta.innerHTML = '<img src="assets/img/portrait/me.png" alt="道号" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><span class="pc-portrait-fb" style="display:none">道</span>';
      porta.onclick = function () { clickBtn('btn-char-bottom'); };
      hud.appendChild(porta);

      // 2) 信息列：把 身份(hud-top) 与 属性(.stats) 收进右侧，填满头像右边
      var info = document.createElement('div');
      info.id = 'pc-info-col'; info.className = 'pc-info-col';
      hud.appendChild(info);
      var hudTop = hud.querySelector('.hud-top');
      if (hudTop) info.appendChild(hudTop);
      var stats = $('screen-game').querySelector('.stats');
      if (stats) info.appendChild(stats);

      // 3) ID 标签
      var nameEl = hud.querySelector('.hud-name');
      if (nameEl && !$('pc-id-tag')) {
        var tag = document.createElement('span');
        tag.id = 'pc-id-tag'; tag.className = 'pc-id-tag'; tag.textContent = '道号';
        nameEl.insertBefore(tag, nameEl.firstChild);
      }

      // 4) 右上角：仙缘 + 设置（纯文字）
      var corner = document.createElement('div');
      corner.id = 'pc-corner'; corner.className = 'pc-corner';
      corner.innerHTML =
        '<button class="pc-corner-btn" id="pc-xianyuan" title="仙缘·众生相">仙缘</button>' +
        '<button class="pc-corner-btn" id="pc-ach" title="成就·轮回印记">成就</button>' +
        '<button class="pc-corner-btn" id="pc-omen" title="灾劫玉符·死劫倒计时">玉符</button>' +
        '<button class="pc-corner-btn" id="pc-codex" title="图鉴·万象录">图鉴</button>' +
        '<button class="pc-corner-btn" id="pc-set" title="设置">设置</button>';
      hud.appendChild(corner);
      $('pc-xianyuan').onclick = function () { clickBtn('btn-npc-bottom'); };
      $('pc-ach').onclick = function () { clickBtn('btn-ach-bottom'); };
      $('pc-omen').onclick = function () { clickBtn('btn-omen-bottom'); };
      $('pc-codex').onclick = function () { clickBtn('btn-codex-bottom'); };
      $('pc-set').onclick = function () { clickBtn('btn-settings-bottom'); };
    }
  }

  /* ---------------- 场景热点（地图不同位置散布的方框卡片） ---------------- */
  function buildNodes() {
    var box = $('pc-nodes');
    if (!box) return;
    var nodes = [
      { name: '洞府·修炼', icon: '🏮', x: 50, y: 60, act: 'btn-cult' },
      { name: '秘境·探幽', icon: '⛰️', x: 28, y: 28, act: 'btn-explore' },
      { name: '宗门', icon: '🏯', x: 15, y: 52, act: 'btn-sect' },
      { name: '锻体', icon: '🛡️', x: 72, y: 38, act: 'btn-arts' },
      { name: '游历·山河', icon: '🗺️', x: 60, y: 78, act: 'btn-social' },
      { name: '百艺', icon: '⚒️', x: 86, y: 60, act: 'btn-baiyi' },
      { name: '探寻仙缘', icon: '🐾', x: 38, y: 84, act: '__seek' }
    ];
    box.innerHTML = nodes.map(function (n) {
      return '<button class="pc-node" data-act="' + n.act + '" style="left:' + n.x + '%;top:' + n.y + '%" title="' + n.name + '">' +
             '<span class="pc-node-ico">' + n.icon + '</span><span class="pc-node-label">' + n.name + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.pc-node'), function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === '__seek') { if (window.actSeekXianyuan) window.actSeekXianyuan(); return; }
        clickBtn(a);
      });
    });
  }

  function clickBtn(id) {
    var b = $(id);
    if (b) b.click();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
