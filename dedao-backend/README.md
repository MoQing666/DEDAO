# DEDAO Backend — 排行榜 / 云存档服务

为修仙放置游戏 [DEDAO](..) 提供的 FastAPI 后端：玩家注册、分数上报、全服排行榜、云存档读写。

**技术栈**：FastAPI + SQLAlchemy 2.0 + SQLite（零外部依赖，单文件数据库，部署即跑）

## 快速启动

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

启动后访问交互式 API 文档：`http://127.0.0.1:8000/docs`（Swagger UI，自动生成）

## API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/players` | — | 注册玩家，返回 `api_key`（道号唯一） |
| POST | `/scores` | X-API-Key | 上报分数（保留历史，服务端存档） |
| GET | `/leaderboard?limit=50` | — | 全服排行榜（按个人最高分排序，带排名/境界） |
| GET | `/leaderboard/me` | X-API-Key | 查自己的排名与身前一人 |
| PUT | `/saves` | X-API-Key | 上传/覆盖云存档（支持乐观锁版本校验） |
| GET | `/saves/{slot}` | X-API-Key | 拉取云存档（换设备恢复进度） |
| GET | `/health` | — | 健康检查 |

## 设计要点（面试可讲）

- **依赖注入**：`get_db` 每请求独立 SQLAlchemy 会话，`get_current_player` 统一鉴权，路由函数零样板。
- **乐观锁**：云存档带 `version` 字段，多端并发上传时版本不一致返回 `409 Conflict`，防止后登录的设备覆盖新进度。
- **排行榜查询**：`GROUP BY player_id + MAX(score)` 子查询去重，O(log n) 排序取 Top N；另提供个人排名查询（`COUNT(DISTINCT) + 1`），不必拉全表。
- **数据模型**：分数只增不改（保留历史可做"历史最高/赛季"），存档覆盖式更新 + 版本号，读写模式分离。
- **Pydantic 校验**：道号长度、分数非负、JSON 存档结构均在请求边界自动校验，非法数据进不了业务层。
- **鉴权设计**：注册时用 `secrets.token_hex` 下发 API Key，`X-API-Key` 头携带；个人免费游戏场景下够用，升级路径是 JWT / 签名防篡改。

## 目录结构

```
dedao-backend/
├── app/
│   ├── main.py        # FastAPI 路由与业务逻辑
│   ├── models.py      # ORM 模型（Player / Score / Save）
│   ├── schemas.py     # Pydantic 请求/响应模型
│   ├── auth.py        # API Key 生成与鉴权依赖
│   └── database.py    # 引擎、会话、依赖注入
├── requirements.txt
└── README.md
```

## 前端接入（游戏侧）

游戏内通过 `js/backend-api.js`（`window.DedaoAPI`）访问本服务，已在 `index.html` / `index_pc.html` 引入：

```js
// 注册（已注册则复用本地身份）
DedaoAPI.register('道号').then(player => { ... });

// 飞升/结算时上报分数
DedaoAPI.submitScore(totalCultivation, '元婴期');

// 排行榜 / 个人排名
DedaoAPI.fetchLeaderboard(50);
DedaoAPI.fetchMyRank();

// 云存档：上传自动带乐观锁版本号；换设备后恢复
DedaoAPI.uploadSave(engineStateJSON);
DedaoAPI.downloadSave().then(save => { ... });
```

要点：所有方法失败时静默 resolve(null)（超时 5s），后端不可用不影响游戏运行；本地调试时后端跑在 `http://127.0.0.1:8000`（`js/backend-api.js` 中 CONFIG.BASE_URL 可改），上线建议同域反代后将 BASE_URL 置空走相对路径。

### 后端地址配置

`js/backend-api.js` 的 BASE_URL 优先级为 `window.DEDAO_API_BASE || ''`（相对路径）：

- **本地调试**：在 `index.html` / `index_pc.html` 中 `backend-api.js` 之前加一行
  `<script>window.DEDAO_API_BASE='http://127.0.0.1:8000'</script>`（DEDAO 已内置此行）
- **线上部署**：删掉该全局变量，由网关把 `/api/*` 反代到后端，客户端走同源相对路径，规避 WebView 跨域/被墙问题。

### 本地端到端验证

```bash
# 终端 A：起后端
python -m uvicorn app.main:app --port 8000
# 终端 B：起游戏（项目自带的静态服务）
node serve.js          # 默认 http://127.0.0.1:xxxx
```

打开游戏 → 创建道号一路玩到结局（或调试模式直达飞升）→ 结算页出现「天榜 · 万道争锋」；
读档菜单新增「云存档」行：**「上传云端」**把当前这一世主动推到云端（覆盖式，带乐观锁），**「从云端恢复」**换设备/清本地后把云端主存档拉回并落本地；
结算时也会自动上报分数并顺手留一份云存档，无需手动操作。

## 部署（上线）

FastAPI 后端与静态游戏分别托管，由网关同源反代（避免抖音/TAPTAP/华为 WebView 跨域）：

```nginx
# 反向代理示例（Nginx）：把 /api 转发给后端，其余交给游戏静态资源
location /api/ {
    proxy_pass         http://127.0.0.1:8000/;   # 后端 uvicorn
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
}
location / {
    root  /path/to/DEDAO;       # 游戏 dist 目录（PWA 静态资源）
    try_files $uri $uri/ /index.html;
}
```

上线要点：
1. 删除 `index.html`/`index_pc.html` 里的 `window.DEDAO_API_BASE` 那行，让客户端走 `/api` 相对路径。
2. `dedao.db` 为 SQLite 单文件，多实例需共享同一文件/目录；高并发可换 Postgres（改 `database.py` 的 `SQLALCHEMY_DATABASE_URL` 即可，模型无需改动）。
3. 鉴权当前用 `X-API-Key`（个人免费游戏够用）；若要防伪造改为 JWT / 签名，仅改 `app/auth.py` 与 `js/backend-api.js` 头部，路由不动。

