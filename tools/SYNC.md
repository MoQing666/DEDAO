# DEDAO 双仓同步约定

> 2026-09-25 建立。目的：让「改测试 / 改 CI」不再污染游戏代码，同时保证两侧不跑偏。

## 三个目录

| 目录 | 角色 | 说明 |
|---|---|---|
| `D:/opencode/dedaO` | **主仓（真源）** | 游戏代码、数值、文案、设计稿。日常开发在这里。 |
| `D:/opencode/DEDAO_ci` | **隔离测试仓** | 改测试套件、改 CI 配置、改 `tools/` 脚本的地方。有独立 git。 |
| `D:/opencode/DEDAO_backup_20260925` | **备份** | 建立双仓前的全量快照（含 `.git`，254M / 1790 文件）。只读，不要在里面改。 |

## 日常命令

```bash
cd D:/opencode/DEDAO_ci

node tools/sync_ci.js status          # 只看差异，不动文件
node tools/sync_ci.js pull            # 主仓 → 隔离仓（游戏代码更新后先做这步）
node tools/sync_ci.js push            # 隔离仓 → 主仓（预演，不写盘）
node tools/sync_ci.js push --yes      # 隔离仓 → 主仓（真正回灌）
```

`npm run sync:pull` / `sync:push` / `sync:status` 是等价别名（见 `package.json`）。

路径可用环境变量覆盖：`DEDAO_MAIN` / `DEDAO_CI`。

## 规则（写进脚本，不是口头约定）

1. **只复制，从不删除。** 任一侧的新增文件都不会被抹掉。
2. **冲突 = 两边内容不同，谁新谁赢（按 mtime）。** 旧的一侧被跳过并列出，需人工决定：要么反向 push，要么 `pull --force`。
3. **push 默认只回灌工程配置**：`test/`、`tools/`、`package.json`、`.github/`、`.gitignore`。
   防止误把游戏代码反向覆盖主仓。确需放开加 `--all`。
4. **恒定跳过**：`.git`、`node_modules`、`dist`、`.workbuddy`、`test/reports`、`__pycache__`。

## 推荐工作流

1. 主仓改游戏代码 → 隔离仓 `sync:pull`。
2. 隔离仓改测试 / CI → 跑 `npm test` 验证。
3. 验证通过 → `sync:push`（先看预演）→ `sync:push --yes` 回灌主仓。
4. 回灌后再 `sync:pull` 一次，两侧应回到一致（status 无差异）。

## 后续所有更新都要同步

新增 / 修改任何一侧的文件后，**不要只在单侧提交**。
改完跑一次 `node tools/sync_ci.js status`，确认「内容不同」为 0 再收工。
