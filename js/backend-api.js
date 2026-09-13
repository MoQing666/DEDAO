/**
 * DEDAO Backend API Client —— 排行榜 / 云存档前端接入模块
 *
 * 对接 dedao-backend（FastAPI）：
 *   POST /players          注册，返回 api_key
 *   POST /scores           上报分数
 *   GET  /leaderboard      全服排行榜
 *   GET  /leaderboard/me   个人排名
 *   PUT  /saves            上传云存档（乐观锁）
 *   GET  /saves/{slot}     拉取云存档
 *
 * 设计原则：
 *   1. 后端不可用 / 请求失败时全部静默降级（resolve 为 null），绝不阻塞游戏主流程——
 *      兼容抖音 / TAPTAP / 华为 WebView 内可能无网络或接口被墙的场景。
 *   2. 玩家身份（api_key）持久化在 localStorage，与游戏存档同一套 WebView 降级策略。
 *   3. 云存档记录本地 version，上传带上 version 实现乐观锁，防多端覆盖。
 *
 * 游戏侧接入示例（engine.js 存档 / 飞升结算处调用）：
 *   DedaoAPI.register(playerName).then(...)
 *   DedaoAPI.submitScore(totalCultivation, realmName);
 *   DedaoAPI.uploadSave(engineStateJSON);
 *   DedaoAPI.downloadSave().then(save => { ... });
 */
(function () {
  'use strict';

  var CONFIG = {
    // 后端地址：优先读全局配置 window.DEDAO_API_BASE，否则默认相对路径 ''（同域反代场景）。
    // 本地调试：在 index.html 里加 <script>window.DEDAO_API_BASE='http://127.0.0.1:8000'<\/script> 即可。
    BASE_URL: window.DEDAO_API_BASE || '',
    TIMEOUT_MS: 5000,
    DEFAULT_SLOT: 'main',
  };

  // ---- WebView 兼容的 storage（与 index.html 主存档同一策略）----
  var storage = (function () {
    try {
      var t = '__dedao_api_test__';
      window.localStorage.setItem(t, '1');
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      var mem = {};
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; },
      };
    }
  })();

  var LS_KEY_ID = 'dedao_api_identity'; // { id, name, apiKey }

  function getIdentity() {
    try {
      var raw = storage.getItem(LS_KEY_ID);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveIdentity(identity) {
    try {
      storage.setItem(LS_KEY_ID, JSON.stringify(identity));
    } catch (e) { /* 存储不可用时身份仅在本次会话内有效 */ }
  }

  /**
   * 统一请求封装：超时 + 静默降级。
   * 所有公开方法失败时 resolve(null)，调用方无需 try/catch。
   */
  function request(method, path, body, apiKey) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () { controller.abort(); }, CONFIG.TIMEOUT_MS)
      : null;

    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    return fetch(CONFIG.BASE_URL + path, {
      method: method,
      headers: headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (res.status === 409) {
          // 版本冲突等业务冲突：抛给上层区分处理（这里按降级策略返回 null 并由调用方感知）
          var conflictErr = new Error('conflict');
          conflictErr.isConflict = true;
          conflictErr.status = 409;
          throw conflictErr;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.status === 204 ? null : res.json();
      })
      .catch(function (err) {
        console.warn('[DedaoAPI] ' + method + ' ' + path + ' 失败：', err && err.message);
        return null;
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  var DedaoAPI = {

    /** 是否已注册（本地判断，不发请求） */
    isRegistered: function () {
      return !!getIdentity();
    },

    /** 当前玩家道号（未注册返回 null） */
    getPlayerName: function () {
      var id = getIdentity();
      return id ? id.name : null;
    },

    /**
     * 注册玩家。已注册则直接返回本地身份，不重复注册。
     * @returns {Promise<{id:number,name:string,api_key:string}|null>}
     */
    register: function (name) {
      var existing = getIdentity();
      if (existing) return Promise.resolve(existing);

      return request('POST', '/players', { name: name }).then(function (player) {
        if (player && player.api_key) {
          saveIdentity({ id: player.id, name: player.name, apiKey: player.api_key });
        }
        return player;
      });
    },

    /** 上报分数（排行值建议用总修为/飞升结算值） */
    submitScore: function (score, stage) {
      var id = getIdentity();
      if (!id) return Promise.resolve(null);
      return request('POST', '/scores', { score: score, stage: stage || '' }, id.apiKey);
    },

    /**
     * 全服排行榜
     * @returns {Promise<Array<{rank,name,score,stage,achieved_at}>|null>}
     */
    fetchLeaderboard: function (limit) {
      return request('GET', '/leaderboard?limit=' + (limit || 50));
    },

    /** 个人排名：{ rank, score } */
    fetchMyRank: function () {
      var id = getIdentity();
      if (!id) return Promise.resolve(null);
      return request('GET', '/leaderboard/me', undefined, id.apiKey);
    },

    /**
     * 上传云存档。自动带上本地记录的 version 实现乐观锁。
     * 409 冲突时 resolve(null)——调用方可提示"多设备冲突"或强制带最新 version 重传。
     */
    uploadSave: function (data, slot) {
      var id = getIdentity();
      if (!id) return Promise.resolve(null);
      var slotName = slot || CONFIG.DEFAULT_SLOT;
      var localVersion;
      try {
        localVersion = parseInt(storage.getItem('dedao_save_version_' + slotName), 10) || null;
      } catch (e) { localVersion = null; }

      var payload = { slot: slotName, data: data };
      if (localVersion) payload.version = localVersion;

      return request('PUT', '/saves', payload, id.apiKey).then(function (save) {
        if (save && save.version) {
          try { storage.setItem('dedao_save_version_' + slotName, String(save.version)); } catch (e) {}
        }
        return save;
      });
    },

    /** 拉取云存档：{ slot, data, version, updated_at } */
    downloadSave: function (slot) {
      var id = getIdentity();
      if (!id) return Promise.resolve(null);
      var slotName = slot || CONFIG.DEFAULT_SLOT;
      return request('GET', '/saves/' + slotName, undefined, id.apiKey).then(function (save) {
        if (save && save.version) {
          try { storage.setItem('dedao_save_version_' + slotName, String(save.version)); } catch (e) {}
        }
        return save;
      });
    },
  };

  window.DedaoAPI = DedaoAPI;
})();
