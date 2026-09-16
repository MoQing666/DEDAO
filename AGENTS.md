# DEDAO 得道 — Agent 指南（项目宪法）

> 最后更新：2026-09-15（变更日志 #75）。本文档是项目的事实来源（source of truth），每次大规模改动后必须刷新。
> **体例**：§一~§十八为「稳定规则」，改完直接改正文；§十九为「变更日志」，只追加不重写。

## 零、文件导航（去哪找什么）

根目录有 **40+ 份 md**，改需求前先定位，别凭印象开写。

### 运行时（改动需 bump 版本 + 同步 dist）

| 路径 | 说明 |
|---|---|
| `js/data.js` / `js/engine.js` / `js/ui.js` | 数据 / 逻辑 / 渲染三件套 |
| `js/audio.js` / `js/backend-api.js` | 音频 / 后端接口 |
| `index.html` + `css/style.css` + `sw.js` + `manifest.json` | 移动端入口（**发布包内容**） |
| `index_pc.html` + `css/style_pc.css` + `js/ui_pc.js` | PC 副本，**独立版本序列，不进发布包** |
| `dist/DEDAO_release/` `dist/taptap/dedao/` | 两份交付副本，`dist/` 在 `.gitignore` 中，**必须手动 cp 同步** |

### 测试与工具（改动不 bump 版本，但测试要跑）

| 路径 | 说明 |
|---|---|
| `test/automated/run.js` + `01~14-*.test.js` | 自动套件（274 例），新套件须登记 `MODULES` |
| `test/automated/_harness.js` | node `vm` 沙箱，`createGameContext()` → `G.get('Engine')` |
| `test/reports/` | 测试报告（固定写本仓库，不进发布包） |
| `tools/player_sim.js` | 经 `tools/_engine_loader` 真加载 `Engine.*`（#60 起不再手抄镜像）；敌人基线 `enemyStats` 亦已改走引擎（#75）。改引擎公式时模拟器自动跟随，无需手抄同步 |
| `tools/gen_softcopy_*.py` / `gen_manual_*.py` / `softcopy_common.py` | 软著源程序与说明书生成 |
| `tools/verify_softcopy.py` | 软著材料自检（PDF/Word 页数行数） |

### 文档（按性质分三类）

| 性质 | 文件 | 何时看 |
|---|---|---|
| **现状手册** | `DEDAO_法术效果全等级大表.md`、`DEDAO_秘境功法法术池映射.md`、`DEDAO_装备属性与装池完整表.md`、`DEDAO_数值模型_设计稿.md`、`DEDAO_玩家全量测试报告.md`、`DEDAO_内容盘点_2026-09-07.md`、`DEDAO_项目简介.md` | 查当前数值/配置 |
| **方案（有的已实装、有的待做）** | `DEDAO_BOSS五行与法术适配方案.md`（✅已实装）、`DEDAO_法术新机制方案.md`、`DEDAO_法术效果重写方案.md`（✅已实装）、`DEDAO_轮回结算重做_方案.md`、`DEDAO_宗门商人重做方案.md`、`DEDAO_法宝系统设计_2026-09-08.md`、`DEDAO_法宝获取剧情_2026-09-08.md` | 动手前先读，注意文档头部状态 |
| **剧情 / 历史 PLAN** | `主线剧情.md`、`剧情梳理.md`、`剧情文案完整版.md`、`剧情命格扩充计划.md`、`命格索引.md`、`游历.md`、`游历池子.md`、`PLAN_2026-09-07.md`、`PLAN_宗门入宗考验改造_2026-09-08.md`、`PLAN_百艺挖矿种植分化_2026-09-09.md`、`T1.5更新计划.md`、`数值重做方案.md`、`系统重做计划.md` | 查设定与历史决策，**不代表当前实现** |
| **美术** | `AI_IMAGE_WORKFLOW.md`、`AI图片生成需求.md`、`AI配图实施计划.md` | 出图规范（画风锚点、尺寸、水印裁切） |
| **上架 / 软著** | `dist/taptap/*.md|docx|pdf` | TapTap 填表与软著材料 |

### 项目技能
`.workbuddy/skills/dedao-change-delivery/SKILL.md` —— 改运行时代码后的「交付五步」+ 两大 bug 类审计手法（口径分叉 / 死配置）。**动 `js/` `css/` `index*.html` 前先读它。**

## 一、项目概述
- **类型**：修仙题材放置 / 养成类**纯文字浏览器游戏**（auto-battler + 文字剧情）。
- **技术栈**：原生 JS / HTML / CSS + PWA（Service Worker 离线缓存），**无框架、无打包器、无 npm 依赖**。
- **商业模式**：纯免费，**不接任何内购付费点**。
- **发布渠道**：静态 PWA，通过 WebView 嵌入运行于 **抖音小游戏 / TAPTAP / 华为小游戏**；亦可 GitHub Pages 等任意静态托管。
- **代码规模（2026-09-13 统计）**：JS 共 **17203 行**（物理）/ **有效代码 15512 行**（剔除空行与纯注释行 1691 行）。
  | 文件 | 物理 | 有效 | 职责 |
  |---|---:|---:|---|
  | `js/data.js` | 3906 | 3502 | 全量游戏数据常量 |
  | `js/engine.js` | 4958 | 4436 | 全量游戏逻辑 |
  | `js/ui.js` | 7656 | 7050 | DOM 渲染 |
  | `js/audio.js` | 354 | 290 | 音频管理 |
  | `js/backend-api.js` | 199 | 129 | 后端接口封装 |
  | `js/ui_pc.js` | 130 | 105 | PC 端专属 UI（**不进发布包**） |
  其他：`index.html` 586 行 / `index_pc.html` 563 行 / `css/style.css` 1331 行 / `css/style_pc.css` 257 行 / `sw.js` 50 行 / `manifest.json` 19 行。
  文件体积：`data.js` ~300KB / `engine.js` ~230KB / `ui.js` ~360KB / `style.css` ~55KB（量级参考，以实际为准）。
  > ⚠️ 软著材料填报的源程序量用**本节的物理行数口径**（当前 17203），与 `tools/gen_softcopy_pdf.py` 输出的 `原始总行数` 一致；改完源码需同步刷新软著材料（见 §十九 第 14 条）。

## 二、架构与加载顺序
所有文件**共享全局作用域**，加载顺序即依赖顺序：
1. `js/data.js` — 全部游戏数据常量。关键全局：`STAGES`, `SECTS`, `EVENTS`(含 `shejiao`/`jiyuan`/`mijing`/`shanhe` 等分池), `TECHNIQUES`, `EQUIPS`, `ARTIFACTS`, `ELIXIRS`, `MATERIALS`, `SECT_GOODS`, `NPCS`, `SECT_SOCIAL`, `ADVENTURE_CONFIG`, `ADVENTURE_GRADE`, `ELEMENT_COUNTER`, `FORMULAS`, `REINCARNATION`, `FIELD_SEEDS`, `DESTINIES`, `BOSS_ELEMENT`/`EVENT_FOE_ELEMENT`(BOSS 五行与法术，见 §6.1)。事件注册统一用 `E(tag, ev)`。
2. `js/engine.js` — 全部游戏逻辑。IIFE 暴露单一 `Engine` 全局（~85 个函数）。关键：`startLife`, `commitStart`, `combatStart`, `startAdventure`, `cultivate`, `endYear`, `breakthrough`, `perfectBreakthrough`, `normalBreakthrough`, `social`, `sectSocial`, `sectBuy`, `calcMpMax`, `artifactStats`, `advNextChoices`, `advCanFightBoss`, `enemyTakenMul`, `bossTryCast`。
3. `js/audio.js` — 音频管理器 `AudioManager`（真实音频文件 + Web Audio 合成兜底）。
4. `js/backend-api.js` — 后端接口封装（可缺席，UI 侧按存在性调用）。
5. `js/ui.js` — 全部 DOM 渲染。IIFE，`DOMContentLoaded` 启动。`S` = 当前游戏状态对象。
6. `index.html` — 所有 screen / overlay / modal 的单一容器。
7. `css/style.css` — 单一样式表。字体统一 `'YuYang'`。
8. **PC 专属（独立序列，不进发布包）**：`index_pc.html` + `css/style_pc.css` + `js/ui_pc.js`。

## 三、运行 / 调试 / 构建
```bash
# 本地开发（二选一）
node serve.js                         # 内置静态服务器，端口 8000
python -m http.server 8080 --bind 127.0.0.1   # 端口 8080（常用）

# 发布包构建：产物在 dist/DEDAO_release/
```
**缓存失效（改 UI/数据后必做）**：
- `sw.js` 顶部 `const CACHE = 'dedao-v147';（示例，以文件实际值为准）` 自增（**当前值**）。
- `index.html` / `index_pc.html` 内 `css/style.css?v=109`、`js/*.js?v=109` 自增（**当前值**）；PC 专属 `css/style_pc.css` / `js/ui_pc.js` 走独立序列（当前 `?v=10`，改了才动）。强刷 Ctrl+Shift+R 才生效。
- 完整交付流程（bump → 同步两份 dist → 回归复跑）见项目技能 `.workbuddy/skills/dedao-change-delivery/SKILL.md`。

## 四、测试
存在**自动化测试套件**（非"无框架"，旧文档已过时）：
```bash
node test/automated/run.js     # 依次跑 01~14，当前 274/274 全过
```
> **表的「例数」与上面这行总数都由 `01-static-data.test.js` 的
> 「AGENTS.md 测试模块表用例数与实际一致」用例自动对账** —— 改测试不同步此表会直接报红。
> 2026-09-15 实测曾有 **7 个**模块的数字是错的（03 写 32 实为 44、11 写 24 实为 36…），
> 这类「手工维护的计数」与成就文案里的「四十七件」是同一类漂移源。
| 文件 | 例数 | 覆盖 |
|---|---:|---|
| `01-static-data.test.js` | 30 | 静态数据一致性 & 引用完整性（含宗门商品单货币结构、法宝文案「++」守卫、六维面板文案守卫、**事件 effect 键 ⊆ applyOps 白名单**守卫、**手机端滚动适配在位性**守卫、**AGENTS.md 模块表计数对账**守卫、**DEDAO_项目简介.md 对外口径对账**守卫、**已删字段「突破次数」不得复活**守卫、**法术大表 dmg/cost 与 data.js 逐条对账**守卫、**好感度星星空心/金色两处渲染一致**守卫） |
| `02-engine-sim.test.js` | 55 | 引擎单元 & 长时模拟（宗门商人单货币、入宗考验门禁、杂役筑基、百艺播种/挖矿、秘境双通道解锁、法宝效率分离、踏风履攻速、山河探索池/每年上限、**宗门任务年上限**、**大比十年一届/五层/境界缩放**、**主线门禁 noSect/afterSectYear**、**effect.trib 真正计入渡劫率**、**阵法被动心得速率与阈值**） |
| `03-ui.test.js` | 45 | UI / DOM 层（jsdom；灵力上限 10/50/30、宗门禁 UI、秘境地图几何、**宗门页菜单三项副标题**、**百艺「阵法」板块**、**进入页劫数自由选择 0–9 劫**、**轮回塔 +/- 步进按钮真实可点且可返还**、**秘境第 1 年未解锁/第 2 年自动开放**守卫） |
| `04-adventure.test.js` | 36 | 秘境重构（50 层×每层 3 节点 / 保底 2 出边 / 无交叉线 / 隐藏滚动条 / 地图视口固定 4 行 / 体力 110·150 / 探索度达标任意深度直达 Boss / 死路兜底 / 产出分层 / 坊市购丹 / 折寿强搜 / 初入秘境灵力回满 / 残魂考验=精英战 / 灵石掉落量级 / 装备掉落不越阶 / **秘境装备掉落率三调** / 仙魔浩劫 BGM 指向 / **秘藏二选一全规则** / 灵物不进随机法宝池 / **秘境「剩余法宝 N」口径与选项数**） |
| `05-xianyuan.test.js` | 10 | 仙缘 NPC 缘法（解锁门槛 / 好感分级 / 冷却 / 上限 / 机缘本世一次性 / 池空不扣行动点 / **日常小事白名单**） |
| `06-travel.test.js` | 3 | 游历 3 选 1（三桩际遇 / 每年上限 / 年末归零） |
| `07-favor.test.js` | 10 | 缘法系统（NPCS 分流 / 送礼叙话 / 单抽与探寻入口） |
| `08-death-omen.test.js` | 11 | 五劫主线（年表 / 劫主角色卡 / 立绘占位 / 噩兆玉符倒计时与裂纹 / 渡劫档位 / 隐藏线） |
| `09-achievements.test.js` | 8 | 成就判定（境界用 `s.idx` / 渡劫用 `s.tribPassed` / **文案「总数」与数据表动态对账** / **文案「阈值」与引擎开关点双侧夹逼**） |
| `10-year-end.test.js` | 4 | 年末结算（气血与灵力回满 / 岁增 / 行动点重置） |
| `11-dead-config.test.js` | 37 | 死配置实装（命格 / 心法 / 法术字段必须被引擎消费） |
| `12-boss-element.test.js` | 17 | BOSS 五行与法术适配（生克四档 / 无属性减伤 / 镜像属性 / 施毒施控 / 伐灾免控 / 治疗全额 / 护盾递减 / DoT 封顶） |
| `13-tools-reinc.test.js` | 2 |
| `14-tutorial.test.js` | 6 | 新手引导系统（聚光灯分步高亮 / 可跳过 / **分阶段**：标题阶段 2 步[开始+轮回阁] 自动播 · 进入游戏 basics 4 步[修炼·角色·游历·引导下一步] · 第 2 年 secret[秘境] · 第 5 年 sect[宗门·百艺]；步骤完整性 / 上下步 / 跳过写阶段标记 / autoTitle+onEnterGame / onYear(2,5)+非 2/5 年不触发 / replay） | **镜像工具回归 + `tools/` 陈旧写法静态扫描**（`tools/reinc_validate.js` 必须 exit 0：引擎公式对齐 + 读 `DEDAO_轮回结算重做_方案.md` 断言表内数字。该脚本曾把 `s.broken` 当渡劫次数、漏 `endMul`，整列算偏且自己的过期断言长期报 ❌ 无人看） |

**沙箱要点**：引擎跑在 node `vm` 里且用 `fakeMath = Object.create(Math)`，测试中钉死随机必须改 `G.sandbox.Math.random`（改 Node 侧 `Math.random` **无效**）；新测试文件必须以 `return S;` 结尾，并在 `run.js` 的 `MODULES` 登记，否则报 `Cannot read properties of undefined (reading 'run')`。
- 旧 `test/dedao_*.js` 为历史脚本，**不在自动套件内**（部分因中文标签损坏无法运行），改动时不要依赖它们。
- 测试路径硬编码 `D:/opencode/DEDAO/js/`；用 `_harness.js` 暴露 `ROOT`。测 dist 副本须传 `DEDAO_ROOT='D:/opencode/DEDAO/dist/DEDAO_release'`（**Windows 风格绝对路径**，写 `/d/...` 会拼成 `D:\d\...` 全部 ENOENT）。

### 4.1 检测池命令（装备池 / 法宝池体检）
```bash
node tools/pool-audit.js           # 控制台输出，有错误则 exit 1
node tools/pool-audit.js --md      # 额外输出 test/reports/pool-audit-YYYY-MM-DD.md
```
改了 `EQUIPS` / `ARTIFACTS` / `FORMULAS` / 商店表 / 剧情掉落 **后必跑**。检测项：
| 段 | 内容 |
|---|---|
| A 装备池 | 字段完整性（name/tier/sub/main/price/desc）、品质分布、**子类 tier 连续性 1–5**、同子类数值梯度倒挂、**全局重名** |
| B 炼器可达 | 每条 `FORMULAS` 装备配方的 `slot+sub` 在其品阶 tier 区间内是否都有模板（缺失 → `rollForge` 返回 null，炼器空转） |
| C 掉落可达 | 每个秘境阶位的 tier 区间内 4 个槽位是否都有候选（缺失 → `randomEquip` 返回 null） |
| D 法宝池 | 品阶分布、effect 是否含生效键、**孤儿检测（无任何字面引用 = 玩家永远拿不到）**、重名 |
| E 交叉引用 | `SECT_GOODS` / `ART_SHOP_ITEMS` 引用的 id 是否悬空 |
| F 剧情实装 | 所有 `equip:'id'` / `art:'id'` 引用的装备法宝是否真实存在（**蚕丝甲 bug 的守卫**：文案承诺发放但 `EQUIPS` 无此 id → 玩家点了什么也拿不到） |

> ⚠️ 孤儿判定口径：对象定义处是**不带引号的键**（`dashen_bian: {...}`），脚本统计的是**带引号的字面引用**次数，故 `refs === 0` 才是孤儿。勿改成 `<= 1`，否则几十件法宝会全被误报。
>
> ⚠️ 孤儿**豁免两类**：① 灵物（`spirit:true`，由 `spiritArtOf` 按阶位发放）；② **非灵物且 `grade` 落在任一 `BOSS_TREASURE_BAND` 区间内**——这类法宝能被 `advBossBonus` 的随机池抽中（秘境 BOSS「秘藏二选一」），本就不需要字面引用。判孤儿必须同时满足「无字面引用 **且** grade 不在任何 band 内」。

> #### ⚠️ 法宝 vs 装备型宝物：两条完全不同的投放管道（2026-09-14 血泪）
> | | `ARTIFACTS`（法宝） | `EQUIPS.treasure`（装备型宝物） |
> |---|---|---|
> | 秘境能掉吗 | **能**。`advBossBonus` / `rollArt` 只遍历 `ARTIFACTS`，按 `grade` 匹配 `BOSS_TREASURE_BAND`，**每层（阶位）最多 3 件普通法宝**（灵物豁免上限） | **永远不能**。`randomEquip()` 只滚 weapon/head/body/**accessory** 四槽 |
> | 属性字段 | `effect{}`，支持 30+ 键（含 `hpMax`/`atk`/`wu`/`def`/`critPct`…），走 `artifactStats()` | 只认 **5 个平铺键**：`hpMax`/`atk`/`wu`/`ti`/`cult`，走 `equipStats()` |
> | 常见投放 | 秘境随机掉落、剧情 `art:'id'`、商店 `kind:'art'` | 剧情/商店以 `equip:'id'` 发放固定装备 |
>
> **想让一件东西被秘境掉出来，就必须挂 `ARTIFACTS`。** 古檀平安牌/镇魂墨玉/金刚降魔印曾挂在 `EQUIPS.treasure`，定义了却永远拿不到——v151 已迁入 `ARTIFACTS`（J 组·护身类）。

> 已修（v150）：`EQUIPS.treasure.qingfeng` 法宝版青锋剑**已删除**，只保留 `EQUIPS.weapon.qingfeng_jian`；宗门商店 `SECT_GOODS` 与剧情 `jianseng_zengjian` 的引用已同步改成 `qingfeng_jian`，现走武器槽（`s.inventory` / `s.equip.weapon`）。
>
> 已修（v151）：`taiji_baguapei`（太极八卦佩）**按需求删除**；古檀平安牌/镇魂墨玉/金刚降魔印由 `EQUIPS.treasure` 迁入 `ARTIFACTS`，成为秘境 BOSS 随机掉落（黄/玄/地）。`EQUIPS.treasure` 现只剩 `xuantie`（玄铁甲）与 `jinylv`（金缕衣）两件有明确发放口的装备型宝物。

## 五、六维 & 战斗公式
### 核心属性
| 属性 | Key | 影响 |
|---|---|---|
| 悟性 | `wu` | 修炼速度 |
| 体魄 | `ti` | 气血上限、防御 |
| 遁速 | `dun` | 闪避率 |
| 神识 | `shen` | 暴击率 |
| 道心 | `dao` | 渡劫成功率 |
| 福源 | `fu` | 事件触发、掉落 |

### 灵力（法力）— 2026-09-08 修订
- **上限**：`mpMax = 10 + max(0, 有效灵力−1) × 20`（灵力=1 → 10；每点 +20；另加灵根词条 `mpMax` 与五行阵加成）。
- **初始**：`mpMax = 10, mp = 1`。
- 战斗前**恢复 10%** 上限（非补满）；法术消耗灵力。

### 气血 / 灵力恢复机制（2026-09-08）
- **上限**：气血 `hpMax = 80 + 体魄×[50×(1+tiHpBonus法宝)] + 大境界idx×80 + …`；灵力见上。
- **每年年末 `endYear`**：`refreshStats` 后 **气血与灵力均回满**（`hp=hpMax; mp=mpMax`）。
- **突破/渡劫成功**：气血回满（`hp=calcHpMax`）。
- **宗门大比 五层全胜**：血灵双回满。
- **每场战斗开始前**：气血 +10% 上限、灵力 +75% 上限（均为**加法**、封顶上限、绝不回扣；多回复机制取最高值，故年末已回满的满蓝不会被压低）。
- **战斗内**：吸血（命格）/ 神兵饮血（法宝 steal）。
- **秘境**：休息节点单复60%·双修各30%；回春/凝灵/九转丹仅秘境内可用（`usableInAdv`）；坊市即时丹。
- 回春丹/凝灵丹/九转丹等回血回灵丹**仅限秘境**携带使用。

### 战斗属性（面板显示 = 战斗实算，统一口径，2026-09-12）
- 攻击：`(10 + bigRealm*15 + 神识×5 + 灵力×5) * talentMult * linggenMult * destMult * allMult + extraAtk + equipAtk + 法宝atk(含棘鳞甲 防御×0.2 转攻)`
- 防御：`getDefense() = round(round(effAttr(ti) × 0.5) × destDefMul) + 装备def + 法宝def + 灵根土def`
  战斗减伤顺序：`百分比(土阵% + 法宝defPct，封顶90%) → 绝对(getDefense()) → 除算(÷(1+金缕衣))`
- 气血上限：含 `ti / bigRealm / linggenHp / artHp / sectHp / 装备 / 命格` 多项
- 暴击：`getCritRate() = effAttr(shen)*0.01*talentApply(shenMul) + effAttr(dao)*0.02 + destCritRate + 灵根/五行暴击 + 法宝暴击 + 装备暴击%`
- 闪避：`getDodgeRate() = effAttr(dun)*0.02*talentApply(dunMul) + destDodgeRate + 灵根/五行闪避 + 法宝闪避`
- 攻速：`getExtraAtkChance() = effAttr(dun)*0.01*talentApply(dunMul) + destExtraAttack + 装备攻速% + talentApply(doubleHit)`（几率额外攻击一次）
- 回复：`getRecoverPct() = effAttr(ti)*0.01 + destLifesteal + 装备回复%`（造成伤害的吸血比例）
- 反击率：`getCounterRate() = effAttr(dun)*0.01 + destCounterRate`（与闪避/攻速同族；曾用基础 `s.dun` 漏加成）
- 双倍修为（灵物·洞虚秘淬）：`cultivate()` 内 `mult *= 2`（几率＝`artifactStats(s).doubleCult`），**不放进 `cultGain()`**——`cultGain` 还被面板预览调用，放里面会凭空掷骰、预览值与实得值分叉。
- 双倍伤害（灵物·魔核碎片）：`playerHit()` 在暴击/斩杀加成之后、扣血之前掷 `artifactStats(s).doubleDmg`，命中则本次伤害 ×2（普攻与法术共用同一入口）。
- **效果文案唯一口径**：`Engine.artEffectText(id)` 是法宝效果文案的**唯一实现**，`ui.js` 的 `artEffectText` 只做转发。历史 bug：UI 侧自带一份 `pct()`（自带「+」）而调用处又补了一个「+」→「灵矿产量++30%」；同理 `Engine.attrGainText(s,key)` 是六维收益文案的唯一实现。

### 面板文案定稿（2026-09-13，用户拍板）
- **六维卡片**：只显示「有效值」+「一共加了多少」。禁止出现 ①「（基础6.5 + 命格+1）」这类拆分；②「每点+50气血」这类单位说明；③「每 10 点 +1 法宝栏」这类栏位解锁说明。文案由 `Engine.attrGainText` 统一产出，样例：体魄「气血上限 +375、防御 +4」/ 遁速「闪避 +16%、攻速 +8%」/ 道心「暴击 +14%、渡劫 +7%」/ 灵力「攻击 +35、灵量 +140」。
- **战斗属性**：只留「名称 + 数值」两行，**不再挂任何说明文字**（`.attr-combat-desc` 已停用）。
- 六维展示值 = `Engine.effAttr(s,key) + equipStats(s)[key]`（基础+命格+法宝+装备），与战斗实算同源。
- 战斗内固定系数（`js/engine.js` 顶部集中定义，不再散落魔法数字）：`GUARD_ACTION_MUL = 0.35`（「防御」动作本回合伤害 ×0.35，即减伤 65%，UI 按钮有 title 提示）、`SLOW_MUL = 0.6`（减速 debuff 生效回合敌方伤害 ×0.6）
- 修炼收益：`(60 + wu*10) * realmMult * techMult * linggenMult * talentMult * reincMult * equipMult * destMult`（聚气丹现 +20%）
- 战斗**无随机乘数**：`伤害 = atk * 法术系数`。

#### 战斗内增益/减益/控制/持续伤害（法术 buff / debuff / stun / DoT / disaster / heal，2026-09-13 实装）
此前 `TECHNIQUES` 的 `buff` / `debuff` / `heal` 与 `TALENTS.apply` 的八项只写在 data 里、引擎从不读取（死配置）；**现已全部打通**，并新增 `stun`（眩晕/冻结）/ `dotBurn`（灼烧）/ `dotPoison`（中毒）/ `disaster`（伐灾）四大机制。唯一结算入口是 `ensureBattleFx` / `applySpellFx` / `tickDot` / `tickBattleFx`：

| 字段 | 含义 | 结算位置 | 消费者 |
|---|---|---|---|
| `sp.heal` | 回复气血上限的百分比（**已减半**） | `applySpellFx` | 木灵治愈 0.15 / 水灵术 0.125 / 生机盎然 0.25 / 万木回春 0.40 |
| `sp.buff.atkUp` | 自身攻击 +N%（`duration` 回合，`atkUpDur` 可单指定） | `applySpellFx` → `playerHit` 乘算 | 火球术/御火诀（黄 +12%/3）·烈焰斩（玄 +18%）·天火焚城（地 +25%）·焚天灭地（天 +35%） |
| `sp.buff.critUp` | 自身暴击率 +N%（`duration` 或 `critUpDur`） | `applySpellFx` → `playerHit` 的 `critRate + fxCritUp.amt/100` | 金刃术/雷音引（金·黄 +8%/2）·**剑气诀（无属性）**·金光剑（玄 +12%）·**万剑归宗（无属性·地 +18%）**·**破天一击（无属性·天 +25%）** |
| `sp.mpRestore` | 立即回复灵力上限的 N% | `applySpellFx` | 水弹术/凝霜诀（黄 10%）·水灵术（玄 15%） |
| `sp.lifesteal` | 本次伤害的 N% 转气血（仅主攻击触发） | `applySpellFx` 标记 → `playerHit` 内回血 | 藤蔓术（黄 30%）·生机缠绕（玄 40%，`dmg` 已补 2.0） |
| `sp.buff.defUp` | 自身受伤 -N%（当回合即生效，`defUpDur` 可单指定） | `applySpellFx` → `enemyAtkRoll` 的护盾通道 | 落石术（黄 -12%）·金光护体·火盾术·岩甲术·大地守护·落岩术·山岳镇压 |
| `sp.debuff.atkDown` | 敌方攻击 -N% | `applySpellFx` → `enemyAtkRoll` | 生机缠绕·山岳镇压 |
| `sp.stun` | **眩晕（土）/ 冻结（水）**：概率命中 → 目标下回合无法行动 | `applySpellFx` 掷骰 → `b.stunNext`；`counter()` 开头短路 | 裂地诀/撼山印/镇岳神雷（土 20/40/80%）·霜寒禁锢/寒渊冰狱/万载玄冰（水 20/40/80%） |
| `sp.dotBurn` | **灼烧**：目标叠层，每回合 1 层 = 扣当前生命 10%，随后 -1 层 | `applySpellFx` 叠层 → 回合开始 `tickDot` | 烈火焚（玄 +1/上限2）·焚魂业火（地 +2/上限4）·九幽红莲（天 +3/上限8） |
| `sp.dotPoison` | **中毒**：同灼烧，与灼烧独立、互不干扰 | 同上（`b.dotPoison`） | 腐毒刺/百毒噬心/万毒归宗（+1/+2/+3，上限 2/4/8） |
| `sp.disaster` | **伐灾**：自身叠层（每栈 3 回合）；施法净化自身毒·灼；每 3 层**免控**一次 | `applySpellFx` 叠层 → `tickBattleFx` 计时 → `applyPlayerControl` 消耗 3 层 | 破厄诀/荡邪金光/伐灾神咒（+1/+2/+3，上限 2/4/8） |

> **已删除**：旧固定冰封 `sp.freeze` 与 `寒冰刺 / 玄冰阵 / 冰封千里` —— 冻结改为概率 `stun`（与眩晕同字段，仅文案不同）。
> **无属性·青云剑宗**：`剑气诀 / 万剑归宗 / 破天一击` 由金系移出，`element:'无'` + `sect:'qingyunjian'`，保留暴击率效果，不参与五行生克与灵根亲和缩放。
> **双向**：`b.stunNext / dotBurn / dotPoison`（施加于敌方）与 `b.pStunNext / pDotBurn / pDotPoison`（施加于玩家）成对存在；boss 机制复用同一套字段与 `applyPlayerControl(s, b, chance)`。
> **DoT 口径**：同类每回合仅 1 层生效（非全部层数一起结算）；灼烧与中毒各自独立，可同回合各扣一次，不叠加成 20% 一次性。
| `xinfa.reduceDmg` | 心法常驻受伤 -N% | `enemyAtkRoll` 与护盾**同一通道**累加（封顶 90%） | 玄武真经 |
| `xinfa.guard` | 心法常驻受伤 -N% | 同上（玄天门系） | 玄天心法 5% / 护山心经 10% / 天罡心法 15% / 玄武真经 20% |
| `xinfa.atkMul` | 心法攻击 +N% | `calcAtk` 末尾乘算 | 青云剑诀 +5% … 太虚剑典 +20%（7 本宗门心法） |
| `xinfa.spellMul` | 法术伤害 +N% | 施法伤害乘算 | 剑魂心经 +5% / 太虚剑典 +10% |
| `xinfa.hpMax` | 固定气血 +N | `calcHpMax` | 护山心经 +50 / 天罡心法 +100 / 玄武真经 +150 |
| `xinfa.craftTimeReduce` | 缩短炼丹年数 | `startCraft` | 丹道真解/九转丹典 |

> **心法附加效果只认「已装备的那一本」**（`xinfaCur(s)` = `s.techEquip.xinfa`），与 `techMult` 同源。曾全部是死配置，而 `DEDAO_秘境功法法术池映射.md` 已明文宣传这些效果。

- 同名字段取「更高值 + 更长时长」，不做乘算叠加，避免数值爆炸；`tickBattleFx` 在每次出手末尾统一递减计时。
- **敌方受伤 → 玩家受伤** 的结算顺序固定为：`敌方debuff(攻↓) → 减速 → 「防御」动作×0.35 → 遁术guard → 护盾buff+心法reduceDmg → 防御百分比 → 绝对防御 → 金缕衣除算`。

#### 旧命格 `TALENTS.apply` 八项实装（2026-09-12）
`talentApply(s, key)` 汇总已选旧命格的 `apply` 值。此前下列八项**抽到即空转**：

| key | 命格 | 效果 | 接入点 |
|---|---|---|---|
| `tiMul` | 金刚不坏 | 体魄对气血的影响翻倍 | `calcHpMax` 的 `tiCoeff` |
| `shenMul` | 天眼通 | 神识对暴击率的影响翻倍 | `getCritRate` |
| `dunMul` | 风驰电掣 | 遁速对闪避/额外攻击的影响翻倍 | `getDodgeRate` / `getExtraAtkChance` |
| `doubleHit` | 疾风连击 | 攻击时 +15% 追加一次攻击 | `getExtraAtkChance` |
| `execute` | 一剑封喉 | 敌方气血 ≤20% 时直接斩杀 | `playerHit` 开头（与命格 `executeBonus` 的「残血增伤」区分） |
| `critDmgBoost` | 致命一击 | 暴击伤害 200% → 300% | `playerHit` 暴击分支 |
| `growDun` | 御风化影 | 每年遁速 +0.5（浮点暂存 `s.dunGrowAcc`，满 1 落整，绝不因取整丢失） | `endYear` 成长块 |
| `trib` | 天命之子 | 渡劫成功率 +25% | `breakInfo` 渡劫段 |

#### 命格 `DESTINIES.effect` 实装注意
- `getDestinyBonus(s, type)` **不再限定 `type === 'combat'`**——`tribBonus` 挂在属性类金命（`tianming2` / `tiandao`，`type:'attr'`）上，旧写法导致它永远读不到。该函数只累加 **number** 类型字段（`controlImmune: true`、`techTypeBonus: {}` 不会串味）。
- `techTypeBonus`（万剑归宗 `{xinfa:0.25}`）：由 `getTechTypeBonus` 读对象，`techMult` 乘 `1 + bonus`；**无心法时不生效**（避免白送）。
- `controlImmune`（万法不侵）：`isControlImmune(s)` 判定，完全免疫心魔「扰神」。

#### 心魔 · 人劫机制（`suppress`，2026-09-12）
心魔此前 `mechanic: null`（纯 DPS 检定）。现由 `xinmoSpec` 独家注入 `mechanic: 'suppress'`：
- 每次出手后 `SUPPRESS_CHANCE = 0.35` 概率使你「心神失守」，下一次出手落空（`b.suppressed`，被消耗时只结算敌方回击）。
- 命格【万法不侵】`controlImmune` 完全免疫，并回显「道心挡在门外」。
- ⚠️ `TRIB_BOSSES.xinmo.mechanic` 必须保持 `null`（有测试守卫）：心魔数值与机制**只由 `xinmoSpec` 生成**，角色卡表仅是文案/立绘来源。
- 常量集中在 `js/engine.js` 战斗段顶部：`SUPPRESS_CHANCE` / `SUPPRESS_MECH`，便于平衡调参；`suppress` **不计入**秘境机制成就 `MECHS`（该成就仍为 5 种秘境机制）。

## 六、五行系统
相克：`金 → 木 → 土 → 水 → 火 → 金`。克制 ×1.5 / 被克 ×0.7 / 无关 ×1.0。每个法术有 `element`，每门心法有 `element` 或 `sect`。

### 6.1 BOSS 五行生克与 BOSS 施法（2026-09-13 实装，口径不同于上）
> 上文的 ×1.5 / ×0.7 是**五行阵 / 心法**那套系数；BOSS 侧另用一套更温和的档位，勿混用。

| 项 | 规则 |
|---|---|
| 生克系数 | 克 ×**1.2** / 同属 ×**0.9** / 被克 ×**0.8** / 无属性法术（青云剑宗）恒 ×1.0 |
| 无属性 BOSS | `element:'无'`（魔 / 心魔 / 虚空 / 天道）：**不吃生克**，玩家任何伤害再乘 ×**0.90** |
| 未配置敌人 | `element` 为 undefined（杂兵 / 测试木桩）：**不吃生克、不受 0.9 减伤**——否则会误伤全部既有战斗数值 |
| 镜像属性 | 试炼之主 / 心魔：`mirrorElement:true` → 元素取 `s.linggen.affinity[0]`，**不复制玩家法术** |
| BOSS 施法 | 敌方回合先掷 `b.spellChance`（黄 0.15 → 帝渊 0.60），命中则 `bossTryCast` 施法并**跳过普攻** |
| BOSS 法术伤害 | `round(b.atk × sp.dmg × 0.35)`，再过玩家防御/护盾通道（0.35 是防秒杀压缩系数） |
| BOSS 施加控制 | `sp.stun` → **复用 `applyPlayerControl`**（内含金系伐灾 3 层免控） |
| BOSS 治疗 | `sp.heal` **全额**（不折半） |
| BOSS 自身减伤 | BOSS 使用 `defUp` 法术 → `b.fxBossDefUp`（玩家对它的伤害 ×(1-amt%)），随 `tickBattleFx` 递减 |
| BOSS 不用 | `disaster`（伐灾）为玩家专属免控，**BOSS 不使用**；`critUp` 等玩家侧增益在 `bossCastSpell` 中被忽略 |
| 数据源 | `data.js`：`BOSS_ELEMENT`（17 个，按 name 索引）+ `EVENT_FOE_ELEMENT`（28 个剧情强敌） |
| 注入时机 | `combatStart` 末尾 `applyBossElement(s, s.battle)`（所有战斗的唯一入口） |


## 七、行动系统（行动点）
- 基础 **3 点 / 年**；realm idx ≥3(筑基) +1、≥7(金丹) +1、≥11(元婴) +1。
- **秘境**：2 点。**游历**：1 点。**锻体/突破**：消耗行动（突破需修为满）。
- **百艺**：0 点，入宗后解锁。
- **宗门**：行动栏跳转入口（不单独消耗点数）。
- 修炼每年一次（`cultedThisYear` 标记，`endYear` 重置）。

## 八、秘境系统（核心重构于 2026-09-08）
4 档 + 1 特殊：
| Key | 名 | 境界 | 掉落 |
|---|---|---|---|
| huang | 匪徒营寨 | 炼气 | 黄级 |
| xuan | 大黑山 | 筑基 | 玄级 |
| di | 洞天福地 | 金丹 | 地级 |
| tian | 魔道祖地 | 元婴 | 天级 |
| xian | 遗世仙踪 | 元婴 | 仙级（每 10 年） |

- **秘境网格长卷地图（2026-09-11 二次重做）**：`genAdvMap()` 生成 **50 层** DAG，**每层固定 3 个节点**（`PER = 3`，横排三等分 25%/50%/75%，行行对齐）；另设**虚拟入口节点** `entry`（`col = -1`，`startId = 'entry'`）指向第 1 层全部 3 个节点，使首行同样是 3 个真选项。总行数 = 入口 + 50 层 + Boss = 52 行。
  - **连线只走层间空隙**：`yOf(col) + ADV_NODE_H` 是源节点**底边**、`yOf(to.col)` 是目标节点**顶边**，连线从「源底边」到「目标顶边」——纵向跨度恒为 `ADV_ROW_H − ADV_NODE_H = 24px`，**永远不会压到选项块上**。旧版从节点中心连、跨度为 144px，线直接穿过方块（用户反馈"直接穿过了选项块"）。
  - ⚠ **四个数字必须同步**：`js/ui.js` 的 `ADV_ROW_H(70)` / `ADV_NODE_H(46)` / `ADV_VISIBLE_ROWS(4)` 与 CSS `.adv-canvas .adv-node { height: 46px }`。**行高/节点高/可见行数由 ui.js 经 CSS 变量 `--adv-row-h / --adv-node-h / --adv-visible-rows` 写入根节点**，`.adv-map` 只读变量用 `calc()` 算视口高度。任一处单独改动而不同步，连线就会重新压回方块上——已加自动化守卫（04 套件「地图样式守卫」）。
  - ⚠ **连边改为「主边直线 + 同层单向斜边」**：
    - 每个节点先连一条**同索引直线**到下一层（主干路）。
    - 每层按风格掷骰：**直**（所有节点只有直线） / **左斜**（节点 i>0 额外连 i-1） / **右斜**（节点 i<2 额外连 i+1）。
    - **直风格层数 ≥ 1/3**，保证至少 1/3 格子只能垂直向上。
    - 同层内所有次边方向一致，因此**同层连线永不交叉**；斜边仅占总数约 30%（≤40%）。
    - 旧版强制「每节点保底 2 条出边」导致蛛网式交叉（用户反馈"右侧和中间可以随意在三列中切换，交叉线过多"）。
  - **UI 侧**：`left(%) + top(px)` 绝对定位节点 + 一层 `svg.adv-links` 贝塞尔连线（`viewBox 0 0 100 H` + `preserveAspectRatio="none"` + `vector-effect: non-scaling-stroke`）。
  - ⚠ **视觉禁忌（都踩过坑）**：①`.adv-map` **必须隐藏滚动条**（`scrollbar-width:none` + `::-webkit-scrollbar`），右侧滚动条"非常出戏"；②`.adv-node` **不得对 `transform` 做过渡**（位移过渡与滚动重绘打架 = "滑动 + 虚影"）；③**视口只在「当前层变化」时重定位**（`advLastMapRef/advLastCol`），否则每次刷新都滑一下。
  - **死路兜底（P0）**：末层的唯一出口是 Boss，探索度未满时 Boss 被锁 → 必须走「前路已尽」。判定统一收在 `Engine.advSituation(s) → {choices, bossOnly, canBoss, atBoss, deadEnd}`，UI 只看 `sit.deadEnd`（旧版 UI 内联判断，重写地图时曾漏掉，会导致地图上没有任何可点节点而卡死）。
  - ⚠ **深度系数必须 clamp**：`enemyGen()` 内 `ed = min(max(depth,1),20)`，所有 `hits / atk / loot` 公式一律用 `ed`。否则第 50 层敌人血量 = 玩家攻击 ×29（原 9 层上限 8.5），战斗沦为打不死的沙包。**深度封顶 20 层**：前 20 层系数 `0.25 + (ed-1)×0.04` 平缓爬升，更深处只加产出、不加数值压力。
  - **敌人灵石掉落（2026-09 下调）**：`loot.stone = round((5 + ed×5) × (1 + bi×0.6) × (精英?1.5:1) × (Boss?2:1))`。旧式 `(10 + ed×10) × realmM` 在深层/高阶秘境单场给 500+，远超同期其它系统（坊市丹药 40 / 事件 120~260 / 宗门法宝 1000~8000），会把整条经济曲线砸穿；现整体减半，**精英×1.5 / Boss×2 / 高阶更肥的层级关系保留**。
  - **初入秘境灵力回满（2026-09-13 修）**：`startAdventure()` 在 `refreshStats()` 后置 `s.mp = s.mpMax`。历史 bug：入口「沿用俗世残蓝」+ `combatStart` 只 +75% 灵力（封顶），玩家在俗世耗空蓝再入秘境会带着残蓝开打、开局放不出法术。**气血不回满**（沿用进入时状态）——秘境内的气血消耗是设计内容。
  - **地图视口固定 4 行（2026-09-13 定稿）**：`.adv-map` 由「`flex:1` 自适应高度」改为**固定 `calc(var(--adv-visible-rows) × var(--adv-row-h) + var(--adv-node-h) + 10px)`**（默认 4×70+46+10 = **336px**），另加 `max-height:62vh` 兜底（视口矮于 ~542px 时才收缩）。原因：`flex:1` 会让长屏一次露出 **9 行**道路（玩家实测反馈），与"只露 4 行"的设计不符。实测：视口 ≥542px 高时恒为 336px = 4.00 行，`chapter-inner` 不溢出、说明/撤离按钮在视口内。
  - **地图行高/节点高（2026-09-13 手机端）**：`ADV_ROW_H = 70` / `ADV_NODE_H = 46`（CSS `.adv-canvas .adv-node { height:46px }` 必须同步；`04` 有守卫断言 `ROW > NODE` 且差值 ≤40）。`.adv-hud` 另配合 `style.css` 的 `@media (max-width:520px)` 压缩。**窄屏根因**：`.adv-vitals / .adv-right` 的 `min-width:200px` 在 360~414px 会触发换行，把 HUD 从 2 行撑成 4 行、吃掉半个屏幕——该断点内必须把 `min-width` 归零。
  - **秘境 BGM「仙魔浩劫」（2026-09-13 定稿）＝ `bgm_battle.mp3`**：本项目「仙魔浩劫」与战斗曲**是同一首**，`BGM_FILES.xianmo = 'assets/audio/bgm/bgm_battle.mp3'`；**不要再指向不存在的 `bgm_xianmo.mp3`**（曾靠 `BGM_FALLBACK` 绕一圈回落）。探索、事件、战斗全程同一首：`doStartAdv` 进秘境即播 `xianmo`，`openBattle` 在 `S.adv && !S.adv.done && !S.adv.trial` 时用 `xianmo` 而非 `battle`，出秘境/试炼仍回 `game`。`04` 有守卫断言其指向真实存在的文件。
  - **残魂考验 = 精英战难度（2026-09-13）**：`advResolveRemnantSoul` 的「两种都想学」选项改走 `Engine.enemyGen(S,'elite',S.adv.depth)`（固定基线 × 深度 × 精英系数 1.4，`loot` 清空），**废弃**旧式「玩家 `atk×0.8` / 玩家 `hpMax×0.6`」的挂玩家缩放（那套会让考验随玩家变强而水涨船高，且与秘境其余敌人不同源）。
- **体力预算**：每步 5 体力；**2 行动 = 110（22 步）、3 行动 = 150（30 步）**。51 步（入口 + 50 层）最短通关需 **255 体力**——单次秘境**永远走不完**，"能探多深"才是取舍点（内容量必须大于体力，否则体力永远花不掉）。
- **探索度机制**：经历节点累计探索度（普通战斗 +10 / 精英 +20 / 宝箱·灵草·灵铁 +5 / 探查·事件·商贩·静室 +5），满 **100%** 方可直面 Boss。
- **Boss 现身规则（2026-09-11 改）**：`advNextChoices()` 在 `advCanFightBoss()`（探索度满）为真时，**不论身处第几层都追加 `{id:'boss', revealed:true}`**，`advMove/advForceMove` 同步放行（`advBossRevealed`）。地图上 Boss 节点**恒渲染**（顶部中心），未达标时加 `.locked` 灰显。探索度达标后另画一道**血色虚线**（`.adv-link.reveal`，唯一允许跨行的线）自脚下直贯顶层——**这条线是刻意保留的视觉反馈，勿删**。
- **秘境丹药来源（2026-09-11 变更）**：**删除「出发前携带丹药」整备页**（`openAdvPrep` 已移除；选完行动点直接 `doStartAdv(key, ap)` → `startAdventure`，不再经过整备页）。战斗丹药改由**秘境内的荒野坊市**购买：`shopStock()` 随 `s.adv.status === 'running'` 上架 2 种战斗丹药（回春丹 55 / 凝灵丹 55 / 九转丹 90 / 解毒丹 35），`buyStock()` 识别 `si.advItem` 后直接推入 `s.adv.items`（**随身**，战斗与歇脚可服）。`advEnd()` 不再 `returnUnusedAdvItems`——随身丹药是**本次秘境资源**，未用完的随此行消散（防止"局内买入、局外留存"）。秘境 HUD 新增**实时气血 / 灵力条**（`adv-hp-bar` / `adv-mp-bar`）替代原「说明」按钮位置，供玩家判断该不该买丹药；「说明」按钮移到页脚。
- **功法产出分层（2026-09-11 修复）**：`getRandomTechFromPools(advType, s, gi)` 按 `gradeIdxOf(TECHNIQUES[t].grade) <= gi` 过滤。旧版黄/玄共用一份池子，黄级匪寨能直接搜出**玄阶心法**（天罡诀/长春功/纯阳功/太阴诀/坤元诀）与**玄阶遁术影遁术**。同时修正 `gradeIdxOf('仙')` 曾回落为 0（会让仙阶功法在黄级现身）与 `pickLootKey` 的越阶兜底（改为返回 `null`，由调用方降级为灵石）。
  - **折寿强搜代价（2026-09-11 改）**：`advForceExplore()` 的寿元代价随**同一秘境内**强搜次数**等比递增 1 → 2 → 4 → 8 → 16 年**（第 6 次起封顶 16 年），计数存于 `s.adv.forceN`（入秘境/入试炼时归零）。产出机制不变（`rollExploreLoot(s,'deep',2)` 产出加倍、**不计探索度**）。
    - ⚠ **「-1 年」是另一套机制**：`advForceMove()`（折寿**强行前行**）固定 1 年 1 步、**不随次数递增**；强度搜代价才递增。两者文案必须显式区分，按钮文案一律走 `forceChoiceText()`，其中**明写「第 N 次 · -X 年（下次 -Y；代价序列 1/2/4/8/16 封顶）」**——否则玩家会以为强搜永远 -1 年（历史反馈）。
    - ⚠ 不要用 `Engine.forceExploreCost` 单独拼文案（已统一进 `forceChoiceText`，内含余寿 fatal 判定）。
  - **战败结算不重复扣减（2026-09-11 修复）**：`advEnd(s, 'lost')` 生成 `s.adv.lostMsg`；`advFinish` 把它 push 进弹窗 `lines`，`.then` 里只 `lines.forEach(log)` 一次。**历史 bug** 是弹窗 + 日志各显一次，玩家看到连续两条「劫后余生」。修复：① `advEnd('done')` 非战败时清空旧 `s.adv.lostMsg`（防止撤退时残留上一次的扣减文案）；② 删除 `advFinish` 里单独的 `log(a.lostMsg, 'bad')`，改为按 lines 统一输出。已加回归测试：弹窗 lines 中「劫后余生」只出现一次、撤退后 `lostMsg` 清空。
  - **寿元不足 → 以命易物，尽入轮回（2026-09-11 新增；文案同此定稿）**：`Engine.forceExploreRisk(s)` 返回 `{cost, left, lack, fatal}`，`left = lifeMax - age`（余寿）。`fatal` 即"这一搜会耗尽寿元"。UI 侧所有强搜按钮统一走 `forceChoiceText()`，fatal 时改为警示文案（**「⚠ 以命易物，尽入轮回：需 N 年，余寿仅 M 年」**）；`forceExploreEntry(onGo, onStop)` 弹「以命相搏 / 收手」二次确认，正文写明**「以命易物，尽入轮回：这是一种结档方式，身死道消，所得尽数归入轮回」**。确认后照常出货，`advForceExplore()` 返回 `fatal: true` 并写入 `s.dead / s.endReason = '寿元耗尽'`，UI 的 `runForceExplore()` 随即调用 `endLifeFlow()` 直接结档。**这是一种玩家可主动选择的结档方式。**
  - **产出分层（2026-09-11 新增）**：`ELIXIRS` 每项加 `grade`（黄/玄/地/天），取「玩家最需要它的时期」——筑基丹=黄、结金丹=玄、元婴丹=地。`rollExploreLoot()` 经 `pickLootKey(src, gi)` 取物，只出**本阶及以下**（本级权重 ×2）。修复前黄级匪寨能硬搜出元婴丹（实测 400 次掉 26 枚）。灵物（`ARTIFACTS` 中 `spirit:true` 者）同样有 `grade`，由 `pickSpiritArtId(s, gi)` 按「本阶及以下」过滤（黄级秘境只能出【上品灵晶】）。
- **节点类型**：`combat / elite / treasure / herb / iron / rest / event / shop`。原"秘地探查(explore)"节点已**全部改为遭遇战(combat)**（"谜底探查"需求）。
- **连锁解锁（2026-09-09，双通道）**：进入门槛由\"仅境界\"改为 **`advUnlocked(s,key)` = 境界达标(realmReq) 或 已通关上一级秘境**。通关记录持久于 `s.flags.advClear[key]`（同世持久、**转世清空**）。链：黄(恒开)→玄(筑基 or 通黄)→地(金丹 or 通玄)→天(元婴 or 通地)→仙(元婴 or 通天)。**仙级另须事件现身**(每10年)。API：`markAdvClear`(Boss 胜时写)/`advUnlocked`/`advNextOf`。只放开入口，**不动**\"一年一次/行动点\"。

## 九、突破系统
两种模式：`normalBreakthrough(s, 丹药id)`（服丹，丹药给 `hpMaxBonus`，是否成功仍看 `breakInfo().base`）、`normalBreakthrough(s, null)`（裸突破，基础率）。
- ⚠ **「完美突破」已于 2026-09-13 取消**：灵物的本质改制为法宝（见十一节），不再参与突破结算。`Engine.perfectBreakthrough()` 保留为空壳（永远返回失败），仅为兼容旧调用点；`breakthrough()` 恒返回 `hasSpirit:false`。
- **渡劫成功率**（`breakInfo`，UI 直接读 `info.base`，面板=实算）：所有渡劫共用一个加成包 `tribBonus`，**只在 `breakInfo` 里汇总一次**：
  ```
  tribBonus = s.tribPct          （灵根词条 /100 后的比例，如润泽 +8%）
            + talentApply('trib')（旧命格【天命之子】+25%）
            + getDestinyBonus('tribBonus')（命格【天命之子/天道宠儿】+15%）
            + dujie 天赋 +10% + 玄天宗 +5%
            + effAttr(s,'dao') × 1%   （道心每点 +1%）
  ```
  破大境：`base = 0.55 + tribBonus + 对应突破丹 0.25`；飞升劫：`base = 0.45 + tribBonus`；统一 **封顶 0.98**（`TRIB_CAP`，留 2% 天机不可测）。炼气→筑基为 `small` 模式：`0.72 + (悟性-5)×1.5%`，封顶 0.90（不走 tribBonus）。
  - ⚠️ 旧版 **金丹劫封顶 0.90 / 元婴劫封顶 0.85**，飞升劫 `base` 固定 0.45 且不吃任何加成；2026-09-12 按设计定稿统一为 0.98 封顶 + 道心每点 +1%。
  - ⚠️ 更早曾写成 `base += eff.tribPct`（原始词条值 8，未 /100），被 clamp 掩盖成「带润泽即恒定满概率」；已统一为 `s.tribPct` 比例口径。
  - ⚠️ **大境界渡劫（金丹/元婴/飞升）以「劫境序列」实战决胜负**（`TRIB_TRIALS` + `dujieWin`），`info.base` 只作为「渡劫成功率」属性展示；突破弹窗文案已改为「渡劫成功率：X%（此劫以实战决胜负，须连胜 N 重劫身）」，不再让玩家误以为掷一次骰子即可过关。
  - ☠️ **劫境战败 = 直接身死道消结档（2026-09-12 定稿）**：`dujieFail(s, trib)` 不再走 `tribFail(..., false)` 的概率陨落（旧：金丹 15% / 元婴 25%，其余只「道基受创、修为 -20%」→ 可无限试错），改为**无条件** `s.dead = true; s.endReason = '天劫陨落'`。中途退出劫境（`handleTrialAbort('trib')`）同样按失败处理。
  - 💾 **渡劫前必须先弹存档提醒**（`ui.js confirmDujieBeforeTrial`）：进入劫境序列**之前**（且在 `beginDujie` 消耗突破丹之前）弹确认框，文案固定为「【渡劫 · X劫】/ 此劫共 N 重劫境，须以实战连胜 —— 败则身死道消，直接结档。/ 此战不可重来，建议道友做好准备：」，按钮为【立即渡劫】（红）与【先去存档】；选后者则中止渡劫并直接打开存档面板（`openSaveModal(true)`）。突破弹窗内的提示文案同步改为「败则身死道消、直接结档」。
    - ⚠️ 弹窗**不再展示「渡劫成功率 X%」**：大境界渡劫以劫境序列实战决胜负，`info.base` 不参与判定，展示它会让玩家误以为能靠概率过关（诚实口径）。

  - ⚠️ **元婴中期重复触发飞升（2026-09-12 修复）**：旧 `breakInfo` 有 `st.realm==='元婴' && st.sub==='中期'` 分支，与 `!nxt`（元婴后期）重复 → 元婴中期就打一次飞升劫境，却只升到元婴后期，**飞升劫境要打两遍**。已删除该分支：元婴中期→后期走常规小破境，仅元婴后期（`!nxt`）触发飞升。

## 十、存档与续档

| 机制 | 实装点 | 说明 |
|---|---|---|
| 自动存档位 | `dedao_save`（`saveState(s)` 不传 slot 即写这里） | 每次游戏内操作都会刷新，是「最新进度」 |
| **年度自动存档** | `engine.endYear` 末尾 `s.autoSaveYear = s.year; saveState(s)` | 每年年初（`s.year` 已 +1）写一次；`autoSaveYear` 供 UI 提示与续档校验。UI 年初日志输出「（进度已自动存档 · 第 N 年）」 |
| **中途退出兜底存档** | `ui.js boot` 内 `pagehide` / `beforeunload` / `visibilitychange(hidden)` → `flushAutoSave()` | 切后台 / 关页面 / 刷新时再写一次自动存档位（幂等，不改游戏状态） |
| 中途退出自动续档 | **已移除**（2026-09-12 用户拍板删除 `autoResumeSave` 及其 boot 调用） | 开机一律停在标题页，由玩家手动点【继续征途】读取 `dedao_save`；年度自动存档 / 中途退出兜底存档（`flushAutoSave`）仍保留 |
| 不自动续档的情形 | — | 移除后无需 `autoResumeSave` 判活；已结档存档玩家进标题看结算与轮回入口 |
| 手动回标题 | 暂停菜单【保存并退出到主页】、设置页【保存并退出到主页】 | 都会先 `saveState` 再回标题，**不清档**；死亡结算页的【返回标题】才 `clearState` |

## 十一、法宝系统
- 法宝定义于 `ARTIFACTS`；获得后由 `applyOps`→`equipTreasureAuto` **自动装备**进 `s.equip.treasure` 并生效（容量见下）；`s.arts` 仅未装备库存（**不生效**）。
- **角色页法宝栏**（`renderCharTreasure`）展示 `s.equip.treasure`（已装备·生效中）+ `s.arts`（库存·未装备）；法宝栏须读 `s.equip.treasure` 才见生效中的法宝（旧版误读恒空导致空栏，已修复）。
- 宗门商店亦售法宝（4 件），**灵石价走同级中值（不翻倍），功业价翻倍**。
- 法宝存 `s.equip.treasure`（数组，**自动装备生效**；容量 = `3 + bigIdx + min(3,⌊道心/10⌋) + min(3,⌊神识/10⌋) + 轮回阁·先天灵宝`，即 炼气3 / 筑基4 / 金丹5 / 元婴6，最大 6+3=9）。
- **灵物类法宝（2026-09-13 改制，共 4 件）**：`ARTIFACTS` 中带 `spirit:true` 的 4 件（上品灵晶·黄 / 上品妖丹·玄 / 洞虚秘淬·地 / 魔核碎片·天，`type:'灵'`）。
  - **旧版**：灵物是 `s.spiritItems` 里的独立道具，只能用于完美突破，**不在法宝栏显示**——玩家拿到手在储物袋里根本找不到（用户实测反馈）。
  - **现版**：本质即法宝，与普通法宝同吃「法宝囊 `s.arts` → 装备槽 `s.equip.treasure`」体系，装备后被动生效（`hpMax` / `doubleCult` / `doubleDmg`，见 §137 战斗口径）。`loadState` 会把旧档 `s.spiritItems` 迁入 `s.arts` 并删除该字段与 `s.perfectBreaks`。
  - **唯一来源＝秘境**：① BOSS 通关「秘藏二选一」的选项一（未持有时必出）；② 秘境深探（`rollExploreLoot` 的 20% 灵物支）。二者都走 `grantAdvArt()`，**一律受「每层（阶位）秘境最多 3 件法宝」上限约束**。
  - **不得进随机法宝池**：`advBossBonus` 的随机池、`ART_SHOP_ITEMS`（游历流动商贩）、`SECT_GOODS`（宗门商店）都必须排除 `spirit:true`。守卫见 `04` 套件「灵物类法宝不进随机法宝池（秘藏专属）」。
  - 隐藏成就 `wanmei`「秘藏尽收」＝单轮内集齐四件灵物（旧条件「完美突破三次大劫」已废）。
- **秘境 BOSS 通关奖励「秘藏二选一」（2026-09-13 重做，`advBossBonus`）**：
  | 规则 | 说明 |
  |------|------|
  | 二选一，只拿一件 | 旧版 Boss 战利品白送灵物 + 这里再选法宝 = 一次通关白赚两件；**已删除 `enemyGen` 里 Boss 的 `loot.spirit`** |
  | 选项一 | 本阶位秘藏的灵物法宝（`SPIRIT_FOR_ADV`：黄→上品灵晶、玄→上品妖丹、地→洞虚秘淬、天/仙→魔核碎片）；**未持有时必出** |
  | 选项一（已持有该灵物） | 换成「当前品阶池（`BOSS_TREASURE_BAND`）内随机的法宝」 |
  | 选项二 | 当前品阶池内随机的法宝（排除灵物、排除已持有，且与选项一不同）；**无可取之物时留空**（2026-09-13 定稿：普通法宝取尽时不再拿灵石充数，弹窗只显示灵物一张卡） |
  | 秘境入口「剩余法宝 N」 | `advArtRemain(s,阶位)` 给出 `{灵物, 普通, 合计}`，在 `openAdvEnter` 的秘境卡片上显示「剩余法宝 4（灵物 1 · 法宝 3）」；取尽则显示「本阶秘藏已尽数取出」。口径与 `advBossBonus` 同源——普通法宝＝`min(每阶余额, 池内未持有数)`，灵物＝未持有即 1 |
  | 每层秘境上限 | `ADV_ART_CAP = 3` 件**普通**法宝，计数存 `s.flags.advArt[阶位]`，**跨多次通关累计、随转世清空** |
  | **灵物豁免上限**（2026-09-13 用户定稿） | 灵物**不占用**这 3 个名额（`grantAdvArt` 内 `isSpiritArt(id)` 时不计数），因此「连选 3 件普通法宝后，选项一依然是灵物」；真取尽（灵物已持有 + 普通法宝取满）时**只保留一个灵石兜底选项**——否则弹窗一张卡都没有、无按钮可点会卡死流程 |

## 十二、灵材 / 丹药 / 装备
- 灵材：`herb_*` / `iron_*`（黄/玄/地/天），统一存 `s.materials`。
- 丹药：`s.elixirs`，聚气丹（修炼 +20%）、筑基丹、结金丹、元婴丹、悟道丹等。
- 装备：`s.inventory`（`EQUIPS`），攻防/气血加成经 `equipStats` 统一计算。

### 百艺 · 灵田 / 灵矿（分化设计 2026-09-09）
入口：百艺页 `renderBaiyiPage`（`btn-baiyi`→`showBaiyi`，含炼丹/炼器/**灵田**/**灵矿** + 五艺研习）。
- **灵田播种** `FIELD_SEEDS`（黄玄地天）：每档 `realmMin`(买苗境界下限)、`stone`(灵石买 1 苗)、`herb`(自备 1 苗所需同等级灵草)。**两通道**：
  - 买苗（`plantField(s,id,q,'buy')`）：受 `realmMin` 门禁，付灵石。
  - 自备下种（`...'own'`）：用已有同等级灵草作苗，**无视境界**。
  - 单亩可选株数 **1/3/6**；成熟产出 = `Σ(gain) × qty × farmEff`。田存储 `plot={seed, planted, quantity}`（**弃用 endYear**）。`harvestField` 产同档灵草。
- **灵矿挖矿** `digMine(s, rounds)`：境界定档位(铁/伴生草/灵石按黄玄地天)，`rounds`=投入轮次，`s.mine.depth`(0→10) 深化提升保底与产出率；`mineEff`(寻矿罗盘)乘入铁产。UI 提供「挖掘(1行动·-100血·1锤) / 奋力连挖(1行动·-400血·4锤)」。
- 旧 artTabs/renderArtsTab 4-tab 遗留入口已不接主流程（保留但改对齐 schema），主流程统一走 `renderBaiyiPage`。

## 十三、宗门系统
- **入宗门禁（2026-09-08 重构）**：不考验，无法入宗。
  - `sectPassed(s)` = 已正式入宗（`sect` 非空且 `sectRank` 为 SECT_RANKS 正式五档之一，非杂役）。
  - 地位谱：`杂役(-1) < 外门 < 内门 < 真传 < 核心 < 首席`。「杂役」不在 `SECT_RANKS`，`sectRankIndex` 对未知名(含杂役)返回 -1 → 商人/任务天然拒绝。
  - 宗门页两态：未过考验仅「择宗 + 入宗考验」受限界面；通过后 7 项完整菜单（商人/晋升/任务/大比/练神/传功/切磋，无入宗考验项）。
  - 考验 `Engine.applySectTrial(s, win)`：武骨(悟性≥8)/道心(道心≥8)/实战三项 → 真传/内门/外门；全败 → **杂役**（每年可重考，评得更高即升）；杂役筑基(`bigIdx≥1`)由年度 `sectYearPromote` 自动升**内门**。
  - **每年限应考 1 次**：`applySectTrial` 记录 `s.lastTrialYear`，同一年重复应考返回 `{blocked:true}`（防杂役连续刷考）；UI 入口 `sectDoTrial` 同判拦截提示。跨年自然失效。
  - **宗门向主线门禁（2026-09-13 收敛为 `mainlineGateOK(s, ml)` 单一实现）**：`checkYearEvents` 与 `moreMainline` **共用同一函数**，三个字段：
    | 字段 | 语义 | 用例 |
    |---|---|---|
    | `needSect` | 仅已正式入宗才播 | ml_2_1 初入宗门 / ml_2_g1 百艺初窥 / ml_2_2 藏剑阁 / ml_2_3 宗门任务 / ml_3_0 秘境探索 / ml_3_1 宗门大比 / ml_3_2 大比后重逢 |
    | `noSect` | **已加入宗门则不显示** | ml_2_0 仙门考验（入宗引导）——已入宗玩家不再看到"仙门收徒" |
    | `afterSectYear` | **入宗的下一年**才播（`s.sectJoinYear && s.year <= s.sectJoinYear` → 挂起） | ml_2_1、ml_2_g1 |
    散修/杂役一律跳过挂起 → 入宗后顺延连播，不阻塞后续非宗门主线。`s.sectJoinYear` 由 `applySectTrial` 在**首次正式入宗**时写入（`!sectPassed(s) && sectRankIndex(rank) >= 0`）；⚠ 旧档无该字段时**兜底放行**（不得永久挂起）。
  - **ml_2_3 宗门任务是「机制教学」不是战斗**：旧版是 `fight` 打一场，现改为引导文案 + `effect: { stone: 120 }`，目的是**让玩家自己点开宗门任务入口**（含年度次数提示）。
  - 触发：主线 `ml_2_0`「仙门收徒」(idx2 炼气后期) 引导；突破筑基散修走 `sectJoinFlow`(仅意属择宗、须应考)。年末 `sectYearPromote` 统一处理杂役筑基 / 正式档自动晋升。
- **宗门商人 `SECT_GOODS`（2026-09-08 改单货币按类型）**：**丹药(elixir)/灵材(mat) 只用功业**；**功法(tech)/遁术(dun)/法宝(art)/装备(equip) 只用灵石**。每件 `coin: 'stone'|'gongye'`。阵法(array)商品已移除——有效阵法属洞府(聚灵阵)与百艺页(五行阵)。
- **宗门活动 `actSect`**：降妖除魔(combat) / 道庭讲法(lecture) / **同门交游(sectSocial)** —— `sectSocial` 从 `SECT_SOCIAL` 取事件（含「青云·剑峰习剑」，已设 `once:true` 仅一次）。
- 宗门任务、宗门大比、师父传功、练神峰等各自独立入口。
- **宗门任务（2026-09-13 改）**：`COMMISSIONS` 每件带 `realm` / `type` / `check` / `ap` / `stone` / `gongye`。
  - **每年至多接取 3 件**（`COMM_YEAR_MAX = 3`）：`commissionYearLeft(s) = 3 − s.commYear.n`（`s.commYear = {y, n}`，跨年自动归零）；`commissionComplete` 在年额度耗尽时直接拦截，UI 菜单副标题显示「本年剩余 N/3 件」。
  - **守敌口径唯一**：`Engine.commissionEnemy(s, c)` 一处产出。若该任务声明 `enemyBoss: { adv, tag, depth }` 则改走 `enemyGen` 取**该阶位 BOSS 的真实属性**，否则用 `c.enemy` 的静态数值。
  - **`tancha` 秘境探勘已对标地级秘境 BOSS**（`enemyBoss: { adv:'di', tag:'boss', depth:10 }`）：旧版静态 `atk 15/hp 60`，玩家反馈「敌人太弱」（用户原话），现与地秘境第 10 层 BOSS 同源。
- **宗门大比 `SECT_DABI`（2026-09-13 重做）**：秘境式**一条直线连续 5 场**战斗。
  | 项 | 值 |
  |---|---|
  | 届期 | `intervalYears = 10`、`firstYear = 10`（按**游戏时间**，第 10 年首赛） |
  | 层数 | `layers = 5`，`layerMul = [0.45, 0.65, 0.85, 1.05, 1.30]` |
  | 对手 | 外门散修 / 内门弟子 / 真传精锐 / 宗门护法 / 首席弟子（**按境界实时生成，不再写死 atk/hp**） |
  | 奖励 | 逐层递增，第 5 层 `{gongye:300, stone:700, full:true}` |
  - **数值口径唯一**：`Engine.dabiFoe(s, i)` = `enemyStats(bigIdxOf(s), mul, mul, jd)`（`mul = layerMul[i]`）——UI 面板与战斗结算同源。
  - **状态口径唯一**：`Engine.dabiStatus(s)` → `{eligible, canEnter, nextYear, inYears, msg}`，`msg = '距离下次大比还有 X 年'`（`dabiNextYear(s)` 从 `firstYear` 起每 10 年推一届）。UI 菜单副标题直接用 `msg`。
  - UI 为 `.dabi-ladder` **一条直线 5 节点**（已胜 / 应战中 / 未启），非分支地图。
- **切磋演武（2026-09-13）**：不可交互，改为**「切磋演武（未开放）」**——菜单项文案带「（未开放）」，`sectDoMaster` 里按钮 `disabled`，`sectDoFight` 兜底 `uiAlert('切磋演武尚未开放，敬请期待。')`。

## 十四、游历系统（2026-09-08 重构）
主页面【游历】→ `openTravel()`，节点：
| 节点 | 接取逻辑 |
|---|---|
| 流动商贩 | `travelShop`（游历专属行商，仅灵石） |
| 市井机缘 | `social()` → **始终只从 `EVENTS.shejiao` 抽 3 个、玩家 3 选 1**（修复：曾误用 `SECT_SOCIAL` 导致与「青云·剑峰习剑」等价） |
| 名山大川 | `actJiyuan` → `Engine.jiyuan`（天地机缘独立入口） |
| 山河探索 | `Engine.shanheExplore` → 从 `EVENTS.shanhe` 抽 3 桩际遇（含战斗/非战斗）玩家 3 选 1，**每年上限 1 次**（`SHANHE_CFG.perYearMax=1`）。**超限 或 池内无可触发事件（如炼气期：shanhe 事件 min 全 ≥1）都只提示、不扣行动点**——旧版池空时白扣 1 点只回一句「无所遇」（用户反馈「实际效果空」）；池内 **13 件**（战斗 6：原「秘境探索」孤儿战斗事件 守墓尸傀/冰蛟/守灯尸修/雷池元灵/荒神残念 + 踏风履·风灵兽；非战斗 7：灵泉淬体/古观访道/古洞奇珍/散修遗泽/灵药幽谷/残碑参悟/山民相助） |

- 删除了原"秘境探幽 / 宗门信符 / 仙缘寻访"三节点（避免与主页秘境、宗门页、仙缘页重复开口）。

## 十五、仙缘系统（提纯）
仙缘页（底部栏「仙缘」`openNpc`）**只保留 4 个纯仙缘角色**，各配真实缘法事件（点击 `runEvent(n.event)` 触发，非跳转，`once` 防刷）：
- **老乞丐**（炼体传承）、**林婉儿**（结缘线）、**白素**（狐仙报恩）、**神秘黑猫**（引路教学）。
- 功能型 NPC（商贩/长老/师父/师兄/师姐）已移出仙缘页，回归游历/宗门原入口。

### 机缘「本世一次性」铁律（2026-09-13 用户实测修复）
`evOK(s, tag)`（导出为 `Engine.evEligible`）的判据是 —— **默认本世仅触发一次**：
```js
if (ev.id && !ev.repeat && s.seen[ev.id]) return false;   // 无 id 的事件不参与去重（防御）
```
- **旧实现**：只在 `ev.once` 为真时才去重 → `XIANYUAN` 72 件里有 **29 件漏标 `once`**（山河池 13 件**全部**漏标），同一桩机缘可被反复抽中、反复发奖励（实测 60 年内「天降陨铁」触发 **11 次**、山涧灵泉 9 次 = 灵草 +18 / 灵石 +180）——用户原话「仙缘的缘法可以无限刷！！！意味着无限奖励！！！」。
- **现语义**：想做成"每年都能去的日常小事"，必须在 data.js 显式写 `repeat: true`。
- **日常小事白名单（2026-09-13 用户定稿，B 档以下取 A 档）**：仅 **6 件纯资源小事件**标 `repeat: true`——
  | 事件 | id | 效果 |
  |---|---|---|
  | 山涧灵泉 | `lingquan` | 灵草 +2、灵石 +20 |
  | 天降陨铁 | `tianjiang_yuntie` | 铁 +5（**由 +10 下调**，避免重复刷铁矿） |
  | 仙鹤衔药 | `xianhe_songyao` | 灵草 +5 |
  | 巧遇散修 | `qiaoyu_sansan` | 灵石 +15 |
  | 市井烟火 | `women_zhi` | 气血 +25（回复类） |
  | 野岭采药 | `yeling_caiyao` | 灵草 +5 |
  **铁律**：repeat 事件**不得**含 `art / tech / equip / life / trib / hpMax / qi / 六维点 / elixirs / flags / sect` 任何成长类字段——否则等于无限刷数值。守卫见 `05`「日常小事（repeat）仅限白名单，且收益不得含成长类资源」（白名单 + 收益字段黑名单双重断言）。
- 覆盖范围：`EVENTS.jiyuan` / `EVENTS.shejiao` / `EVENTS.shanhe` / `XIANYUAN`（含 NPC 缘法）/ `NPCS[*].event`。宗门 `SECT_SOCIAL` / `SECT_COMBAT` 用各自的内联过滤（`!ev.once || !s.seen[ev.id]`），数据侧已全标 `once`。
- **连带规则：机缘耗尽不得白扣行动点**。`drawXianyuan` / `travel` / `shanheExplore` / `jiyuan` / `social` / `seekNpcXianyuan` 在池空时一律**只返回提示字符串、不 `spend`**；仅"行动点不足"由 `canAction` 拦截。
- 副作用（已知取舍）：除上述 6 件日常小事外，一生能触发的一次性机缘约 60+ 桩（山河 13 桩仍未放开）。后期池子会被日常小事占满（实测 60 年 × 每年 3 次叩问 ≈ 166 次命中，全落在 6 件小事上）——这是**预期效果**：前期探机缘、后期过日常。

## 十六、命格 / 轮回
- 命格加成：`getDestinyAttrBonus`（平加）、`getDestinyAttrMult`（乘区 atkMul/defMul）、`getDestinyBonus`（暴击/闪避/吸血/反伤等）。
- 轮回阁：`REINCARNATION` 提供转世加成（修为/丹心/器魂/小绿瓶/灵田/命格栏等）。**2026-09-14 二批下线 4 项**：殷实 / 见面礼 / 延寿 **移入开荒「三 · 经历」**（`INIT_EXP`，改吃开荒点数），舍生 **删除**（连带 `s.reinc.shesheng` 的修炼 +10% 与「每次修炼 -1 寿元」两条消费点一起摘掉）。旧档已购等级由 `loadMeta` 按原价 `单价 × (1+2+…+n)` 全额退还轮回点并清字段。
- **开荒「三 · 经历」（`INIT_EXP`，2026-09-14 用户定稿）**：殷实 = **灵石 +500 / 3 点**、见面礼 = **聚气丹 ×3 / 4 点**、延寿 = **寿元 +20 / 2 点**、早夭 = **寿元 -30 / −3 点**（2026-09-16 由 -20 改 -30；负值 → 选它反而**增加** 3 点预算，用于对冲）。**延寿与早夭互斥**（`conflict` 双向声明，`Engine.initExpIds` 先取者生效；UI 点一个即摘掉另一个）。四项均为「取 / 不取」toggle、**固定点数**（不随重复递增），在 `Engine.applyInit` 一次性结算、不入 meta、不跨世。点数折算的唯一真源是 `Engine.initExpCost(sel)`（UI 的 `createSpent` 直接调它，不自算）；寿元合计的唯一真源是 `Engine.initExpLife(sel)`（二者同走 `initExpIds`，含去重与互斥）；早夭结算后寿元有 `Math.max(1, …)` 地板。开荒页分段顺序：**一 择灵根 / 二 定出身 / 三 经历 / 四 百艺**（百艺由三挪到四）。
- **进入页劫数自由选择（2026-09-13 用户定稿）**：`showEnterPage` 的 `maxJie` 恒为 **9**——新账号开局即可选 0–9 劫，不再受「历史最高劫数」（`meta.maxJie`，仍在结算页作成就展示）封顶。所选劫数写入 `S.jie`，JIE_DATA 难度倍率、命格金池（3劫+）、隐藏线阈值（6劫+）、3 劫命格栏 +1 等全部按**所选**劫数生效——选高劫 = 主动提升难度。结算页「应劫轮回（X劫）」写入 `meta.nextJie` 后，进入页默认落在该劫（此前 `enterState.jie` 恒 0，预设实际被丢弃——属顺带修复）。
- **开局六维基准值（2026-09-14 用户定稿）**：`startLife` 的 `jieBase = (meta.nextJie >= 3) ? 2 : 1`，即 **0~2 劫六维各 1，3 劫及以上各 2**。动机：① 高劫难度系数更高（3 劫 `JIE_DATA.diff = 1.50`），需要更好的起手面板；② **规避负值风险**——金阶仙命【九天玄体】带 `ti-1 / dun-1`，六维为 1 时有效体魄会被扣到 0（`hpMax` 仅 80，离负数只差一步），六维为 2 时最坏仍为 1。**阈值与「3 劫起金池才有金命格」（`JIE_TIER_WEIGHTS[3]` 起 gold 权重 > 0）天然对齐**，不存在「有金命格却没吃到基准值」的窗口。连带效应：`ling` 由 1→2 时 `mpMax` 由 20→40（公式 `20 + Math.max(0, ling-1)×20`），属预期。守卫见 `03`「主角初始六维：0~2 劫为 1，3 劫及以上为 2（规避负属性风险）」。

## 十七、UI 结构
- **行动栏**（主页中上部）：修炼 / 秘境 / 宗门 / 锻体 / 游历 / 百艺(未解锁置灰) / 突破 / 下一年。
- **底部栏**：角色 / 储物袋 / 仙缘 / 图鉴（**4 项**，z-index 50）。2026-09-14 二次定稿：设置上移 HUD、成就上移 HUD 右侧功能列、图鉴落到此处（原 3 项 → 4 项）。
- **HUD 右侧功能列**（`.hud-top` 第 3 列、跨两行 `.hud-side`）：**成就在上 / 设置在下方**（`#btn-ach-hud` / `#hud-settings`）。设置由 ⚙ 齿轮**还原为文字【设置】**。
- **标题页资料入口**：原 `.title-util-row` 曾放 玉符（成就/图鉴 已迁主页面）；**2026-09-15 玉符已从标题页删除**（PC 端右上角 `pc-omen` 仍可用）。
- **Modal** z-index 250；**战斗层** z-index 9999（`!important`）。
- **屏幕**：`overflow:hidden`，底部留 70px 给底部栏。**滚动适配**：内容可能超屏的页面必须有受约束滚动容器（`min-height:0` + `overflow-y:auto`），规则集中在 style.css 末尾「手机端滑动适配修复」段，守卫见 `01` 套件。
- **角色页** `screen-char` 全屏，Tab：属性 / 装备 / 法宝 / 功法。
- **百艺页** `screen-crafts`：炼丹 / 炼器 / 灵田 / 灵矿（+ 五艺研习 / 五行阵）。
- 字体统一规则：弹窗标题 `#modal-body h3` 15px/600/金；描述类 13px/400；名称类 15px/600（详见 `style.css` 的 `ct-*`/`tn-*` 系列）。

## 十八、关键陷阱（gotchas）
- `cultivate()` 每年仅一次；`endYear()` 重置 `cultedThisYear`。
- `equipStats` 统算**全部**装备（含法宝数组）。切勿直接 `s.wu += it.wu`，会双重计数。
- `treasure` 为数组 `s.equip.treasure = []`，容量 = `3 + bigIdx + min(3,⌊道心/10⌋) + min(3,⌊神识/10⌋) + 轮回阁·先天灵宝`（`maxTreasure`，即 炼气3/筑基4/金丹5/元婴6，最大 9）。⚠ 旧文档写「容量 `bigIdx+1`」为过期值（2026-09-15 更正）。
- 入宗在首次突破筑基时自动触发。
- 战斗开局满血满蓝（`combatStart` 设 `s.hp = s.hpMax`）。
- `loadState` 用 try-catch 吞错，读档失败看 console。
- `s.materials` 须初始化：`if (!s.materials) s.materials = {};`
- 法宝**自动装备进 `s.equip.treasure` 才生效**；`s.arts` 是未装备库存（不生效），角色法宝栏须读 `s.equip.treasure`（它非空）。
- 测试用 `_Spatch(fn)` 改 `S`；测试路径硬编码 `D:/opencode/DEDAO/js/`。
- **Duobao 机制已移除**：装备直接掉落，不再经多宝。
- **装备掉落：品质上限＝本阶位区间（`realmTierRange`），永不许越阶；掉率与偏置公式见下（2026-09-13 二次重平衡）**：
  - 区间：黄级 `bi=0` → tier `[1,2]`（凡品/良品）、玄 `[2,3]`、地 `[3,4]`、天/仙 `[4,5]`。⚠ 旧版 `randomEquip` 里有一句 `if (rand<0.18 && range[1]<5) tier = range[1]+1` 的向上越阶，让黄级秘境掉出「上品」（玩家实测反馈），已删。
  - **总掉率**（`enemyGen`，`ed` = 有效深度，Boss 另计；**2026-09-13 三调 · 用户拍板公式**）：杂兵/精英 `p = min(0.30, ed×0.02)` → 首层 **2%** / 10 层 **20%** / 15 层起封顶 **30%**；**Boss 固定 `0.60`**。常量 `EQUIP_DROP_PER_DEPTH=0.02` / `EQUIP_DROP_CAP=0.30` / `EQUIP_DROP_BOSS=0.60`（旧值① `min(0.35, 0.06+ed×0.02)`、旧值② `min(0.55, 0.10+ed×0.04)` / Boss `0.80`——用户反馈「掉落太优越」，两轮收紧）。
  - **品阶偏置**（`randomEquip`；同批三调）：`bias = min(0.30, 深度×0.02)` = 掉**高一品**（即区间上限档）的概率，`本阶品 = 1 − bias` → 首层 98% / 10 层 80% / 15 层起 70%。常量 `RANGE_BIAS_PER_DEPTH=0.02` / `RANGE_BIAS_CAP=0.30`（旧值① `min(0.55, 0.18+深度×0.02)`、旧值② `clamp(0.30 + 深度×0.03, ≤0.90)`）。
  - 实测（1200 次抽样）：杂兵首层 **总 2.1% / 高一品 1.7%**；第 10 层 **20.8% / 20.3%**；第 20 层 **28.8% / 28.7%**（封顶）；Boss **58.4%**。深度只改「区间内偏向本阶上限」的概率，**不改上限**。
  - 回归守卫见 `04` 套件「装备掉落：品质严格落在阶位区间内」+「秘境装备掉落率三调」。完整掉落映射见 `DEDAO_装备属性与装池完整表.md` §六。
- **手游版 HUD 资源位**：`index.html` 的 `行动 / 灵石` 在**六维右侧竖排**（`.stats-top-row > .six-dim-wrap + .action-info-col`，上=行动、下=灵石），**不在 header 内**。PC 版 `index_pc.html` 仍留在 header（`.hud-actions`，由 `style_pc.css` 接管），改 HUD 时两边分别处理，别把 `.hud-actions` 从 PC 页删掉。回归守卫见 `03` 套件「秘境地图几何 + HUD 资源列」。
- 屏幕生命周期：`showScreen(name)` 隐藏所有 `.screen` 再显示 `#screen-{name}`。
- 灵根词条 `/` 五行阵可加战斗次级属性（暴击/闪避/渡劫/防御）。
- **市井机缘 = `social()` 只取 `shejiao` 池（3 选 1）**；天地机缘走游历「名山大川」。两者已拆分，勿再合并。
- **Boss 节点恒渲染**：未满 100% 时加 `.locked` 灰显（不可点，角标「未启」）；满后 `advNextChoices` 追加 `revealed` 选项，可在任意深度一步直达。UI 渲染须判 `advCanFightBoss()`。
- **宗门门禁**：未过考验（`sectRank` 为 null/`'杂役'`）→ `sectPassed(s)` 为假，商人/任务/晋升自动拒；勿直接把未应考的玩家设正式地位。杂役筑基自动升内门走 `sectYearPromote`，勿手动设 `外门`（会破坏"筑基=内门"约定）。
- **境界 / 渡劫判据只有两个字段**（2026-09-11 踩坑，2026-09-15 收敛）：
  - `s.idx` = **阶位索引**（0 炼气前期 / 3 筑基 / 6 金丹 / 9 元婴 / 15 仙）；`s.tribPassed` = **成功渡劫次数**（仅 `dujieWin()` 累加，金丹劫/元婴劫/飞升劫，上限 3）。
  - 境界类判据用 `s.idx`，渡劫类用 `s.tribPassed`。曾把「破境·筑基」写成「突破次数 >= 1」，导致炼气中期就点亮筑基成就；「三劫不陨」「结算的渡劫 N 次」同源错误。
  - 结算点数 `breakdown.trib` = `tribPassed × 3`。
  - ⚠ **「突破次数」字段已于 2026-09-15 全量删除（#61）**：它既不能当境界判据、也不能当渡劫判据，历史上被误用两次（成就 `sanjie`、`tools/` 三个镜像脚本）。回归守卫见 `test/automated/09-achievements.test.js`，以及 `01` 套件「已删除的『突破次数』字段不得复活」。
  - ❗ **别和 `s.breakFails` 搞混**：「小境界连续失败 2 次 → 第 3 次必成」的保底用的是 `s.breakFails`（成功清零、失败 +1，`ui.js` 显示「下次必成」），与境界/渡劫判据完全无关。
- **`applyOps` 白名单数组 ↔ `case` 分支必须一一对应（2026-09-13 踩坑）**：`applyOps(s, ops)` 先过 `['qi','hp',...,'trib','mo','dao','ling']` 白名单**才**进 `switch`。写了 `case 'dun'/'shen'` 却忘了把 `'dun','shen'` 加进白名单 → 事件 `effect:{dun:1}` / `{shen:1}` **不报错、什么都不做**，而文案写着「遁速+1 / 神识+0.5」。反之白名单有、`case` 没有同样静默。守卫见 `01` 套件「事件 effect 的键必须被 applyOps 白名单支持」（遍历 `EVENTS`/`XIANYUAN`/`MAINLINE`/`NPCS`/`SECT_SOCIAL`/`SECT_COMBAT` 的所有 `effect` 与 `choice.effect`）。
- **效果必须写进「现代存档真正会读的字段」（2026-09-13 踩坑）**：`case 'trib'` 原写 `s.linggen.body.trib`，而 `linggenTrait` 优先读 `s.linggen.trait.effect` → 所有「渡劫 +N%」奖励**长期静默无效**。现改写入 `s.tribBonusExtra`（**不能**写 `s.tribPct`——`recalcLinggenBonus` 每次重算会覆盖），并在 `breakInfo` 里累加。⚠ 改效果字段前先 grep「谁读它」，别只看「谁写它」。
- **特效/效果文案必须单一实现**：法宝效果文案只准由 `Engine.artEffectText(id)` 产出，六维收益只准由 `Engine.attrGainText(s,key)` 产出，UI 只转发。历史 bug：UI 侧 `pct()` 自带「+」、调用处又补一个「+」→「灵矿产量++30%」。
- **子页面重渲染的两个坑（2026-09-13 踩坑）**：① **同名 class 禁止嵌套**——`#crafts-body` 内再放一个 `class="crafts-body"` 的容器，切 tab 后浏览器把旧滚动位置夹到新内容底部，表现为「点一下就下拉、然后弹出新内容」。内容容器改用独立 id（`#crafts-tab-body`）。② **切 tab 后必须 `scrollTop = 0`**——滚动容器是 `.screen`（`#screen-crafts`）而非 `.panel`，不归零就停在旧偏移。同时注意 **render 函数名 ≠ tab 名**（`renderBaiyiStudy` 渲染的是 tab `'zhenfa'`，别按名字猜）。
- **「未开放」功能要真禁用**：不可交互的入口（如切磋演武）不能只改文案——按钮 `disabled` + 点击走 `uiAlert` 兜底，避免"看起来能点、点了没反应"（用户实测反馈）。
- **`ui.js` boot 的 `$('id').onclick` 绑定必须判空**（2026-09-13 PC 冒烟实测）：`index_pc.html` 曾缺 `screen-achievements`/`screen-codex` 两屏，boot 里 `$('ach-back').onclick = ...` 直接抛 TypeError——**DOMContentLoaded 第一个监听就炸，整条 PC 开局链路带伤运行**且无报错界面。既有守卫风格是 `if ($('btn-sect')) …`/`if ($('adv-info')) …`，新绑定一律照做；新增屏幕时**手机版与 PC 版两份 HTML 都要放**（dist 随构建同步）。
- **PC 入口（`index_pc.html` + `ui_pc.js`）没有自动化测试覆盖**：12 个套件全部只 boot 手机版。`ui_pc.js` 只做布局（129 行，无游戏逻辑），改动 ui.js 后至少手工/jsdom 冒烟一次 PC：开局全流程 → 主界面 → 各角落按钮。

## 十九、变更日志（只追加不重写 · 最新在末尾）

> 编号说明：第 1~22 条为 2026-09-08~09-11，第 29~32 条为 09-11 之后。**23~28 为空号**（历史编辑中被合并删除，勿补号，新条目从 33 起）。
1. 灵力公式改为 `10 + (ling−1)×20`（初始 10/1）。
2. 秘境地图竖版从下到上、Boss 探索度满才现、探索度累计机制、探查节点全改遭遇战。
3. 角色法宝栏修复（读 `s.arts`）。
4. 宗门商人重做（30→29 件/按类型单货币：丹药灵材=功业，功法装备法宝=灵石；阵法商品移除）。
5. 游历重构：删秘境/宗门/仙缘三节点；市井机缘纯化（shejiao 3 选 1）；新增名山大川（jiyuan）；新增宗门「同门交游」consuming `SECT_SOCIAL`（青云·剑峰习剑仅一次）。
6. 仙缘提纯 4 角色 + 真实缘法事件。
7. 字体统一（弹窗标题/描述/名称层级）。
8. 测试套件 76/76 通过（自动套件 `test/automated/run.js`）。
9. **宗门入宗考验门禁（2026-09-08 晚）**：删宗门商店聚灵阵/五行阵僵尸商品（洞府/百艺阵法保留）；商人单货币按类型；宗门页未过考验仅受限应考界面，`applySectTrial` 定级写回，失败成杂役（每年可重考/筑基自动内门），不考验无法入宗；`ml_2_0` 收束为「仙门收徒」引导；`sectYearPromote` 年度晋升；年初主线可连播（`moreMainline`）。测试套件 **80/80 通过**。
10. **宗门主线门禁 + 每年限考（2026-09-08 拍板落地）**：宗门语境主线条目加 `needSect:true`，`checkYearEvents`/`moreMainline` 未正式入宗（散修/杂役）跳过挂起、入宗后顺延连播；`applySectTrial` 每年限应考 1 次（`s.lastTrialYear` 冷却），UI 拦截提示；已择宗未过考验者**不可改投他门**（选宗即锁定，维持现状）；考验门槛维持 悟性≥8/道心≥8/实战、全败成杂役的现状；杂役筑基跳升内门保留。测试套件 **81/81 通过**。
11. **年末血灵同步回满（2026-09-08）**：`endYear` 由"仅气血回满"改为 `refreshStats` 后**气血与灵力均回满**（`hp=hpMax; mp=mpMax`），避免灵力在主界面恢复途径过少、连战后长期低位致法术乏力。缓存 v80/js39。测试套件 **82/82 通过**。
12. **百艺挖矿/种植分化 + 秘境连锁解锁（2026-09-09）**：①灵田播种两通道（灵石买苗受境界门禁 / 自备灵草下种不限境界），株数 1/3/6，`FIELD_SEEDS` 改 `realmMin/stone/herb`，修 `endYear` 字段错乱；②挖矿接入 `digMine(s,rounds)`（境界定档位 + depth 深化 + 投入轮次），百艺页补「灵矿」区块；③行动栏按钮 `秘境(2点)`→`秘境`；④秘境进入改双通道 `advUnlocked`（境界 or 通关上一级），通关持久于 `s.flags.advClear`（**转世清空**），仙级纳入连锁且须事件现身。缓存 v81/js40。测试套件 **86/86 通过**。
13. **仙缘 / 游历 / 缘法系统落地 + 死代码清理（2026-09-10）**：①新增 `NPCS` 四角色（老乞丐·炼体传承 / 林婉儿 / 白素 / 神秘黑猫），带立绘 `assets/img/portrait/npc_*.png`、解锁门槛、`tiers` 好感分级一次性奖励；②仙缘统一触发与权重（`evEligible` 校验 min/max/once/req）；③游历改 3 选 1（三桩际遇互不相同且不含 npc，每年上限 5 次，年末 `endYear` 归零）；④缘法交互：送礼 / 叙话年度冷却、仙缘单抽消耗行动点每年上限 3、探寻仙缘入口年 1 次；老乞丐由主线 `ml_0_5` 触发、林婉儿由游历触发；⑤清理守护式死代码 `btn-sect-bottom` / `btn-travel-bottom`（旧布局遗留，宗门/游历入口已在行动栏）。缓存 **v84/js43**（css v41）。测试套件扩至 **104/104 通过、0 风险项**（新增 05 仙缘统一触发 7 项 / 06 游历 3 选 1 3 项 / 07 仙缘 NPC 缘法 8 项）。
14. **软著材料行数口径刷新 + 源程序折行修复（2026-09-10）**：按 v84 源码重算——JS 共 **14169 行**（有效代码 **12919 行**，剔除空行/纯注释 1250 行）；重生成 `软著源程序_得道飞升模拟器.pdf`（**60 页 × 每页 50 行**）。同步刷新 `软著申请材料清单.md`、`软著申请表_逐字段填写速查.md`、`tools/gen_manual_pdf.py`、`tools/gen_manual_docx.py` 中的源程序量（14125→14169）与版本号（v81→v84），并重出说明书 PDF/DOCX。**口径**：源程序量以「含空行注释的物理行数」填报（14169），与 `tools/gen_softcopy_pdf.py` 输出的 `原始总行数` 一致。
    **折行修复**：原实现按 168 字符硬截断，中文行实际渲染更宽（最长 1356pt > 版面 510pt），90 行越出页面右边界且丢代码；改为**按实测字宽折行**（`pdfmetrics.stringWidth` 逐字符测量 + 续行缩进，续行计入行数），代码完整不越界。
    **三脚本同口径**：清洗与折行逻辑抽到 **`tools/softcopy_common.py`**（`strip_comments_and_blanks` / `load_effective` / `fold_lines` / `slice_pages`），被 `gen_softcopy_pdf.py`、`gen_softcopy_docx.py`、`verify_softcopy.py` 共用，避免口径漂移。
    **Word 版**：新增 **`tools/gen_softcopy_docx.py`**（python-docx 直出，SimSun 7pt / 行距固定 13.4pt / 每 50 行 `page_break_before` 强制分页 / 页眉 PAGE+NUMPAGES 域）→ `软著源程序_得道飞升模拟器.docx`（3000 段、59 处分页、100KB）。
    自检工具 **`tools/verify_softcopy.py`** 覆盖 PDF（R0~R8：页数/行数/清洗/页眉/页码位置/连续性/不截断不越界/字体中文）+ Word（段落数/分页数/页眉域/版心宽度不换行/字号行距/连续性），当前全过。改源码后跑一遍即可。
15. **源程序 Word 版 63 页 → 60 页修复（2026-09-10）**：Word 打开显示 **63 页**（多 3 页）。
    **根因**：折行按 **STSong-Light**（比例字体，`a`=0.42em / 空格=0.21em / `,`=0.24em）测量，而 Word 实际用 **SimSun** 渲染，其 ASCII 为**等宽半角**（每字符固定 0.5em，含空格/逗号）——中文源码 ASCII 占比极高，Word 实际行宽比折行估算**宽 20~40%**，触发自动换行把行挤到下一页（9052/13012 行超版心）。
    **修法**：`softcopy_common.py` 新增 **`make_simsun_measure()`**（PIL 读 `C:\Windows\Fonts\simsun.ttc` 字形宽度，逐字符缓存；无字形字符 emoji 等按 1.0em 保守计），`fold_lines` 默认改用它，`gen_softcopy_pdf.py` 亦显式传入 → **PDF/Word 折行口径统一为 SimSun 度量**，PDF 绘制仍用 STSong-Light（更窄）故两端都不越界。折行后 12919 → **13211 打印行**（原 13005），最大行宽 497pt < 版心 510pt，0 行超宽。
    **验证**：`verify_softcopy.py` 新增 **Word 实际渲染页数校验**（PowerShell + Word COM `ComputeStatistics(2)`，`SKIP_WORD_RENDER=1` 可跳过）→ 实测 **60 页**、3000 段。
    **教训**：凡「每页恰好 N 行」的硬分页材料，折行必须按**最终渲染字体的实际度量**算；等宽字体（SimSun）与比例字体（STSong-Light）的 ASCII 宽度差可达一倍，用错必翻车。
16. **五劫主线落地：死劫秘境化 / 噩兆玉符 / 渡劫劫境 / 隐藏线（2026-09-11）**：
    ①死劫由 14 个精简为 **5 个**（第 18/36/49/64/81 年），每个都是**专属劫境**——独立地图（列数 / 节点池 / 环境文案）+ 一位带称号 / 立绘 / 登场白 / 台词 / 战斗机制的**劫主**（狼王·赤瞳 / 黑风寨主·屠九 / 沧溟蛟·苍溟 / 无面 / 魔祖化身·渊），不再是"通用试炼换皮"。
    ②新增 **噩兆玉符** 主线：第 3 年坊市瞎眼老道硬塞玉符（双分支选择）→ 识海黑字逐年递减（`还剩 N 年` → `还剩 1 年（近了）` → `就是今年`）→ 每渡一劫玉符多一道裂纹 → 五劫尽渡转「飞升天劫 · 无期」。底部新增「玉符」入口（移动端 `btn-omen-bottom` / PC 端 `pc-omen`）。
    ③**渡劫劫境**按突破档位映射：练气→筑基无劫；筑基→金丹心魔劫境；金丹→元婴心魔+天劫；元婴→飞升心魔+仙界守卫+飞升天劫。每一段都是短劫境地图（险地/静室/祭坛），尽头一位「劫身」（`TRIB_BOSSES`）。
    ④**隐藏线【轮回之外 · 魔祖仙帝】** 解锁 = `s.jie >= 6` **单条件**。难度是逐级解锁的（通关前一难度才开下一难度），到 6 劫本身就意味着至少通关 6 次，**不叠加**"历尽 6 劫"。唯一前提是五劫尽渡（`s.omen.allPassed`，属主线自然进程）。
    ⑤结算倍率：飞升 ×1.2、打破轮回 ×1.5（`earnPoints` 里的 `endMul`）。
    **踩坑 1（致命）**：导出表把 `trialBossTrib` 误写成 `tribBossTrib`（该函数名不存在）→ 加载 `engine.js` 即抛 `ReferenceError`，全量测试从 104 崩到 **1/23**。**改 `engine.js` 导出表后必须立刻跑测试**，一个未定义标识符会炸掉整个沙箱。
    **踩坑 2**：`nextDeathEvent` 原先按 `s.year < ev.year` 找下一劫，在劫一当年（第 18 年）会误判为"已过去"，玉符显示"还剩 18 年"而非"就是今年"；改为按 `s.seen['death_' + year]` 判断**尚未触发的第一劫**（死劫按年份顺序强制触发，触发时 UI 写入 `seen`）。
    **立绘**：只做关键 7 张（`boss_jie1~jie5` + `boss_dixian` + `npc_laodao`）；渡劫四个劫身复用现有素材（心魔→`me`、天劫→`boss_tian`、仙门守卫 / 飞升天劫→`boss_xian`）。规格：BOSS **184×240**、NPC **768×768**，原图归档 `assets/img/_src/v4_portrait/`。
    缓存 **v86/js49**（PC css & ui_pc 独立序列 v8）。测试扩至 **115/115**（新增 08 套件 11 项）。
17. **五劫立绘重做：画风对齐（2026-09-11）**：
    首版 7 张立绘被否决——文案写成了「暗黑厚涂油画 + 彩色光效」，出的是**高饱和彩色 CG**，与既有素材完全不同源。
    ①**画风锚点（BOSS 组）**：`东方志怪插画，单色系做旧质感，低饱和高级灰；粗细分明的线稿 + 木刻版画式排线阴影，纸面颗粒与磨损做旧；半身构图，深暗背景，冷峻阴郁，克制的逆光`。
    ②**NPC 组是另一条线**：`npc_*` 一律走**水墨淡彩写实**（宣纸米白底、淡墨渲染、留白），与暗调 BOSS 不混用。
    ③生成时把现有素材当**风格参考图**（`image1`）传入可显著提升同源度——但**参考图必须与目标同风格**：`boss_xian.png` 本身是"冷灰白白衣女子"，拿它做 `jie4`（无面）的参考，模型直接照抄了那张图（连性别都带过来）；改用做旧风的 `boss_huang.png` 才正确。
    ④**并行出图会撞车**：同一次 message 里并发多个 `ImageGen`，若 prompt 前缀相同、落盘目录相同，会因秒级时间戳重名而**互相覆盖**（7 张只活下来 4 张）。**必须串行生成**，并让每张 prompt 以不同词开头。
    ⑤裁剪即去水印：生成图右下角带「AI生成 WORKBUDDY」水印。BOSS 由 `1024×1536 → 184×240` 的居中裁切天然切掉；NPC 因 `1024×1024 → 768×768` 等比不裁，需**先切掉底部 84px 再取中心方图**。
    ⑥`npc_laodao` 按要求改为**坊市算命摊**场景 + **洗旧发白的灰道袍**（少量补丁、不褴褛）。
    规格不变：BOSS **184×240**、NPC **768×768**，原图归档 `assets/img/_src/v5_portrait/`。缓存 **v88/js51**（PC css & ui_pc v9）。测试 **116/116**。
18. **秘境敌人立绘分层 + 老道改脸（2026-09-11）**：
    ①**敌人立绘分层**：`ADVENTURE_CONFIG[阶位]` 新增可选字段 **`foeArt`**（`{ combat: '立绘key', elite: '立绘key' }`），`enemyGen` 据此取图，未配置的遭遇类型回落通用 `'foe'`；BOSS 仍是 `'boss_' + 阶位`。当前配置：黄级小怪 → `foe_bandit`（持刀巨汉）、玄级精英 → `foe_wolf`（血月狼王）。以后加素材**只改 data.js，不动引擎**。
    ②`foe.png`（通用小怪）实为 **16-bit 像素风**，与立绘体系不一致；分层立绘是向写实志怪风统一的第一步。
    ③**老道改脸**：上一版 `npc_laodao` 与 `npc_laoqigai`（老乞丐）撞脸，根因是**prompt 把两人描述成了同一个人**（都写"白须白眉 + 银白乱发挽髻 + 枯木簪"）。改法：以现图为底做定点改脸，描述**明显不同的特征组合**——清癯瘦削 / 高颧骨 / 鹰钩鼻 / **稀疏山羊胡（非浓密长白须）** / 高束道髻配**木冠**（非枯木簪）/ 青灰肤色 / 阴冷神态，并把这些反向特征写进负向。
    ④**踩坑：参考图会连人物一起抄**（第二次遇到）。`boss_jie2`（现 `foe_bandit`）当时拿 `boss_huang` 当风格参考，结果**人物、姿态、武器几乎照搬**，与黄级 BOSS 撞脸。教训：**风格参考图要选"同风格但主体不同"的**；若目标主体与参考图主体相似，就必须把主体描述写满并加负向，或干脆不用参考图。
    ⑤狼王去肩上长剑用 i2i 定点编辑（`input_fidelity: high`）+ 明确的"只改这一处、其余不得改动"约束，一次成功。
    新增素材归档 `assets/img/_src/v6_foe/`。缓存 **v89/js52**。测试 **117/117**（新增「敌人立绘分层」用例）。
19. **算命老道定稿：从"BOSS 感"回到市井凡人（2026-09-11）**：
    `npc_laodao`（玉符剧情的算命老道，`data.js` 中 `portrait: 'npc_laodao'`）连改三轮才定稿，三个根因值得记：
    ①**上一版做成了 BOSS 感**：青灰冷调 + 阴冷神态 + 破烂补丁袍。老道是**市井凡人**，不是首领。定稿方向：**暖调米黄宣纸底、提高色彩饱和度**（赭石/花青/藤黄淡彩晕染），面容清瘦但**和善温厚、嘴角含笑**。
    ②**头部必须区别于老乞丐**：老乞丐是「蓬乱白发随风飘散 + 斜插枯枝」；老道改成 **灰白头发全部梳拢、收成紧实端正的圆道髻 + 一根素净深褐木簪横穿发髻**（两端露出）。**注意：是木簪，不是木冠/道冠/布巾**——第一版给的是木冠，错。负向要写死 `披散长发、散发、枯枝、树杈、木冠、道冠、布帽、头巾`。
    ③**瞎眼的表现形式 = 双眼紧闭**（两道自然闭合的眼缝，无眼球无瞳孔），不是"睁着的浑浊眼白"。负向写死 `睁眼、眼球、瞳孔、浑浊眼白`。
    ④**衣服绝不能读成僧衣**：第一版给脖子挂了**长串木珠念珠**，直接变成和尚。定稿为**青灰交领右衽大袖道袍**（深色镶边 + 淡彩云纹）、内衬月白中衣、腰系赭色布带、腰侧挂小木牌与卦袋；负向写死 `佛珠、念珠、项串、木珠项链、僧衣、袈裟、和尚`。
    ⑤**幡面禁用汉字**：算命摊的布幡改为**朱砂绘太极阴阳鱼 + 八卦爻线符号**；负向写死 `汉字、文字、书法、毛笔字、字帖`。凡场景中出现的旗帜/幡/招牌/匾额，一律在负向里禁掉文字。
    ⑥**迭代策略**：整图重生成容易顾此失彼，改用**以现图为底的定点 i2i**（`input_fidelity: high`）逐项修——先修发型头饰，再修服饰与幡子，每轮只改一处并明确"其余完全不变"，命中率高且省额度。
    原图归档 `assets/img/_src/v7_laodao/`（发型版）、`assets/img/_src/v8_laodao/`（定稿）。缓存 **v90/js53**。测试 **117/117**。
20. **死劫立绘缩编为 3 张自绘（2026-09-11）**：
    用户判定 `boss_jie3 / boss_jie4 / boss_jie5 / boss_dixian` 四张**作废并删除**（"占位就占位"）。落地方案——
    ①**文件已物理删除**（含 `assets/img/_src/v5_portrait/` 下对应原图）；用户明确要求删，不做保留。
    ②**引用改为按既有 5 档 BOSS 素材顺次占位，不重复**：
    | 角色 | 原 key | 现 key |
    |---|---|---|
    | 劫3 沧溟蛟·苍溟 | `boss_jie3` | `boss_xuan` |
    | 劫4 无面 | `boss_jie4` | `boss_di` |
    | 劫5 魔祖化身·渊 | `boss_jie5` | `boss_tian` |
    | 隐藏线 魔祖仙帝·帝渊 | `boss_dixian` | `boss_xian` |
    劫1 狼王（`boss_jie1`）、劫2 屠九（`boss_jie2`）、算命老道（`npc_laodao`）**保留自绘**。
    ③`engine.js` 中 `trialBossHidden` 的兜底值同步由 `'boss_dixian'` 改为 `'boss_xian'`。
    ④**立绘解析机制无需改动**：`setPortrait` 本就按 `assets/img/portrait/<key>.png` 命名规则回落，且绑定 `img.onerror` 做优雅降级——所以「占位」只需把 key 指向已存在的文件即可。
    ⑤08 套件断言已改写：由"7 张关键立绘必须齐备"改为「**自绘 3 张（jie1/jie2/laodao）必须存在且被引用；其余 key 必须落在既有 5 档 BOSS 素材集合内；已作废的 4 个 key 不得再被引用、文件不得残留**」。
    缓存 **v91/js54**。测试 **117/117**。
21. **噩兆玉符文案改为玩家指定版（2026-09-11）**：
    剧情由"瞎眼老道攥手腕硬塞"改为玩家指定的**两幕线性**叙事（`js/data.js` 的 `OMEN_TALISMAN.meet`）——
    ①**第一幕 `meet.lines`**（标题「坊市 · 算命的老道」，副题「他不肯答，只说天机不可泄露」）：坊市游历遇到**笑眯眯的算命老道** → 以**紫微斗数、六壬正法**算了一番 → 追问不答，只道「天机不可泄露」→ 硬塞玉符 → 凝神一探被**神念入侵**，头晕眼花。
    ②**第二幕 `meet.after.lines`**（标题「噩兆玉符」，副题「一行散着黑气的字」）：清醒时老道与摊位**无影无踪**，天色从**正午到夜半** → 玉符已入**神台识海**盘踞不动 → 一行散着黑气的字 → 眉头紧皱无可奈何 → 似是魔气却对修行无影响、**宗门也丝毫没有检测出** → 半信半疑，**更加坚定了变强的道心**。
    ③**结构变动**：删除了 `meet.choices`（原两个分支"追上去问" / "扔进水沟"）——玩家文案是线性的，不再有分支。`showChapter` 本就支持无 choices 的线性章节（`hasChoices` 为假时直接 `chapterClose`），UI 无需特判。
    ④**识海黑字注入**：第二幕用 `{omen}` 占位，`omenMeetFlow` 里 `Engine.omenText(S)` 按**玩家寿元与触发年份实时**替换（第 3 年触发 → 「死劫还剩 15 年」，因首个死劫在第 18 年）。
    ⑤**用词修正**：玩家原文写的「紫**徽**斗数」按标准术数名称落为「**紫微**斗数」（紫微星）。
    ⑥`desc`（底部「玉符」按钮详情）同步改为**识海盘踞**口径，去掉与"入识海"矛盾的"出现在怀里"表述；`omenMeetFlow` 日志与"尚未获得"提示里的"瞎眼老道"统一改为"笑眯眯的算命老道"（全库已无"瞎眼"残留）。
    ⑦08 套件断言改写：由"必须有 2 个分支"改为「**不得再有 choices** + 第一幕 ≥4 行、第二幕 ≥6 行 + `{omen}` 占位**有且仅有 1 处** + 玩家文案的 11 个关键信息点（笑眯眯的算命老道/紫微斗数/六壬正法/天机不可泄露/神念入侵/无影无踪/正午/神台识海/魔气/宗门/变强的道心）必须全部保留」。
    缓存 **v92/js55**。测试 **117/117**。
22. **秘境地图重做：50 层 + 杀戮尖塔连线 + Boss 任意深度现身（2026-09-11）**：
    用户反馈四连：①秘境内容不够体力消耗；②路线常无路可选（假选择）；③折寿强搜还能搜出高阶功法（自测漏项）；④每年回满血蓝疑似未实装。
    | # | 问题 | 根因 | 处置 |
    |---|---|---|---|
    | 1 | 层数太少，体力花不完 | `genAdvMap` 固定 9 列，10 步即通关（50 体力），而体力 70/95 | 普通列 **9 → 50**；每步 5 体力 → 最短通关需 **250** 体力，单次秘境永远走不完；体力重定 **110（2行动）/150（3行动）** |
    | 2 | 路线"有时候根本无法选择" | 连边 `Math.random() < 0.6` 才补第 2 条边，实测 7381 个节点中 **6603 个只有 1 条出边** | 改为**保底 2 条**（下一层 ≥2 节点时必出 2 条，目标按 `idx` 归一化映射形成交叉）；入口层固定单节点 |
    | 3 | 黄级出玄阶功法 | `getAdvTechPools` 的 `huang/xuan` **共用同一份池子**（含天罡诀/长春功/纯阳功/太阴诀/坤元诀/影遁术） | `getRandomTechFromPools(advType, s, gi)` 加 `gradeIdxOf(grade) <= gi` 过滤；顺带修 `gradeIdxOf('仙')` 曾回落 0 的漏洞与 `pickLootKey` 的越阶兜底（→ `null`） |
    | 4 | 年末血蓝"没实装" | 实测 `endYear` **确实已回满**（`s.hp = s.hpMax`），但 UI 只字未提，极易误判 | 年末日志补一行「（一岁一枯荣：气血与灵力已随新岁尽数复原）」；「岁月将尽」弹窗按钮补注「（气血与灵力尽复）」；新增 **10-year-end 套件** 3 例 |
    **UI 重做**：`renderAdvMap` 由「一列一个 `.adv-col` 的 flex 竖列」改为 **canvas + 绝对定位节点 + 一层 SVG 连线**：
    - 节点 `left:(idx+1)/(count+1)*100%`、`top: 20+(normalCols-col)*78px`，`transform:translateX(-50%)` 居中，宽度 `clamp(62px,19%,104px)`；
    - SVG `viewBox="0 0 100 CANVAS_H" preserveAspectRatio="none"`，靠 `vector-effect: non-scaling-stroke` 抵消横向拉伸；`path` 用三次贝塞尔 `M x1 y1 C x1 y1-c x2 y2+c x2 y2`；
    - 连线三态：`.walked`（已走过，紫）/ `.active`（当前可选，金）/ `.reveal`（探索度满后直贯 Boss 的血色虚线）；
    - 视口 `scrollTop = yOf(curCol) - clientHeight*0.55`，进入时对准当前层（不是死滚到底）。
    **数值配套**：`enemyGen` 内新增 `ed = min(max(depth,1),10)`，`hits/atk/loot/装备掉率` 一律改用 `ed`——否则第 50 层敌人血量会膨胀到玩家攻击的 **29 倍**。装备掉率另加 `min(0.55, …)` 上限。
    新增测试：04「杀戮尖塔式地图保底 2 条出边」「探索度达标 → 任意深度直达决战」「深层敌人数值不失控」「产出分层（补功法/仙阶）」；03「秘境地图：SVG 连线 + ≥2 条真实可选路线（jsdom 实渲染）」；10「年末回满血蓝」。
    **每例均做反向验证**：把保底改回 1 条 → 6603/7381 单出口断言变红；去掉功法 gi 过滤 → 黄级搜出 6 种玄阶功法断言变红。
    缓存 **v95/js58**。测试 **133/133**。

29. **秘境地图二次重做 + 丹药来源改造（2026-09-11 二轮，用户六项反馈）**：
    | # | 用户反馈 | 根因 | 处置 |
    |---|---|---|---|
    | 1 | 贝塞尔曲线手感差、直接穿过选项块、互相连接过密 | 连线锚点用**节点中心**（`curve(x, yOf(col), …)`），跨度 144px > 行距 88px，必然压过方块；连边随机取 `center±1` 形成蛛网 | 锚点改 **源底边 → 目标顶边**（跨度恒 32px）；连边改**只连相邻索引** `{center, center+1}`（同层穿插 ≤1） |
    | 2 | 右侧进度条非常出戏 | `.adv-map { overflow-y:auto }` 的浏览器滚动条 | `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` + `overscroll-behavior:contain` |
    | 3 | 选项块仍有滑动和虚影 | `.adv-node { transition: transform .12s }` + `:hover { translateY(-3px) }`，与滚动重绘打架；且每次渲染都重设 `scrollTop` | 过渡改为仅 `border-color/box-shadow/background-color`；hover 去位移；视口**只在层变化时**重定位（`advLastMapRef/advLastCol`） |
    | 4 | 说明按钮灰色不可交互；要实时血蓝条；删携带丹药页 | 说明是只读弹窗；`openAdvPrep` 是独立整备页 | HUD 左槽改 `adv-hp-bar/adv-mp-bar` 实时血蓝条（<35% 转红）；说明移到页脚；**删除整备页**，选完行动点直接进入 |
    | 5 | 每行要有三个选项，每三列换行（参考异世轮回录） | 层 0 只有 1 个节点、其余 2~3 个，行行不齐 | `PER = 3` 每层固定 3 个 + **虚拟 `entry` 节点**（`col=-1`）指向首层 3 节点，首行也是 3 个真选项 |
    | 6 | 折寿探索一直 -1，指数没实装 | **引擎早已是 1/2/4/8/16**（`FORCE_LIFE_COSTS`）；玩家看到的 -1 来自另一套「强行前行」（固定 1 年） | 引擎复核无 bug；把**「第 N 次 · -X 年（下次 -Y；序列 1/2/4/8/16 封顶）」直接写进按钮文案**，并在文案上显式区分两套机制 |
    **新增守卫**（均已反向验证：改回旧实现即变红）：
    - 04「genAdvMap 合法 DAG」加：每层必须 3 节点、`entry.next === 3`、**零跨层连线**；
    - 04「保底 2 条出边」加：首层 3 节点、`startId === 'entry'`、同层穿插上限；
    - 04「死路兜底」：末层 + 探索度未满 → `advSituation().deadEnd === true`；探索度满 → `false`；
    - 04「坊市购丹」：进入不扣储物袋、`buyStock({advItem})` 进随身、可服、离场不回库；
    - 04「地图样式守卫」：隐藏滚动条、`.adv-node` 无 `transform` 过渡、**CSS 节点高度 === JS `ADV_NODE_H`**、`ADV_ROW_H > ADV_NODE_H`、两个入口页 HUD 一致、整备页彻底删除；
    - 03「秘境地图」加 **jsdom 几何断言**：所有非 reveal 连线的纵向跨度 ≤ 34px（正常 32px；旧实现 300 条 / 144px 直接红）、同一 `top` 值节点 ≤ 3 个、HUD 血蓝条存在。
    **反向验证数据**：锚点改回节点中心 → 300 条线跨度 144px（红）；层节点数改回 1/2~3 → 24 层不符合 + 60 个单出口（红）；`deadEnd` 退回只判空 → 末层死路用例红；CSS 加回 `transition: transform` 且去掉 `scrollbar-width:none` → 样式守卫红。
    引擎新增导出 `advSituation(s)`；`advEnd()` 不再回流未用丹药。缓存 **v96/js59**（PC 同步）。测试 **135/135**。

30. **秘境地图三次重做 + 结算重复扣减修复（2026-09-11 三轮）**：
    | # | 用户反馈 | 根因 | 处置 |
    |---|---|---|---|
    | 1 | 连线仍太密集、右侧和中间可随意在三列切换、交叉线过多；要做到没有交叉线；至少 1/3 格子只能走直线；斜线随机且 ≤40% | 第二轮连边仍是「相邻索引 2 条出边」，同层内源节点可能一个往左一个往右，形成交叉；且几乎所有节点都有 2 条出边，缺乏稳定主路 | 改为**「主边直线 + 同层单向斜边」**：每个节点先连同索引直线；每层风格 ∈ {直, 左斜, 右斜}，同层所有次边方向一致；**直风格层数 ≥ 1/3**，斜边占比 ≤40%；同层连线**永不交叉** |
    | 2 | 结算弹窗里「劫后余生：灵石 -500，灵草 -71，灵铁 -13。」出现两次 | `advFinish` 把 `a.lostMsg` push 进弹窗 `lines` 一次，但弹窗关闭后的日志循环里又单独 `log(a.lostMsg, 'bad')` 一次；且 `advEnd('done')` 不清空旧 `lostMsg`，撤退时会残留上一次的扣减文案 | `advEnd('done')` 清空 `s.adv.lostMsg`；`advFinish` 日志改为统一 `lines.forEach` 输出，不再单独 log（保留样式：lostMsg 走 'bad' 色） |
    **新增/更新守卫**：
    - 04「杀戮尖塔式地图」改为断言：**无交叉线（=0）**、直线节点 ≥1/3、斜边 ≤40%、入口 3 条路；
    - 04「探索度达标」不再要求每步 ≥2 条路，改为「3 步内都有可行路线」；
    - 04「死路兜底」改为普通层 `≥1` 条即可；
    - 04 新增「结算扣减文案仅出现一次」：战败生成 `lostMsg`、非战败清空、且 `adv.gains` 不得混入该文案；
    - 03 jsdom 地图用例同步：「≥2 条真实可选路线」改为「当前节点有可选路线」。
    **反向验证**：把连边改回第二轮相邻索引 2 条出边 → 直线节点仅 180/9000、斜边 8820/17820（>40%）、交叉 1960 处；把 `advEnd('done')` 清空去掉 → 撤退残留 lostMsg。均变红。
    缓存 **v97/js60**（PC 同步）。测试 **136/136**。

31. **法术五新机制 + 黄阶五行重写实装（2026-09-13）**：①治愈减半（木灵治愈 0.15 / 水灵术 0.125 / 生机盎然 0.25 / 万木回春 0.40）；②删除旧固定冻结 `寒冰刺 / 玄冰阵 / 冰封千里`（`freeze` 字段废弃），冻结改概率 `stun`；③新增 15 个法术（土·眩晕 / 水·冻结 / 火·灼烧 / 金·伐灾 / 木·中毒，各三阶），共 41 个法术；④剑气诀 / 万剑归宗 / 破天一击 转无属性 `sect:'qingyunjian'`；⑤木吸血与金伐灾补 `dmg` 对齐火系同档；⑥DoT 与伐灾叠层 玄+1 / 地+2 / 天+3，上限 2/4/8。缓存 **v93/dedao-v130**。测试 **178/178**。
32. **BOSS 五行属性与法术适配实装（2026-09-13）**：
    - `data.js` 新增 `BOSS_ELEMENT`（17 个正式 BOSS，按 name 索引）+ `EVENT_FOE_ELEMENT`（28 个剧情强敌）。
    - `engine.js` 新增 `elemCounterMul`（克 ×1.2 / 同属 ×0.9 / 被克 ×0.8 / 无属性法术恒 ×1.0）、`enemyTakenMul`（含无属性 BOSS ×0.90 与 `fxBossDefUp`）、`applyBossElement`（`combatStart` 末尾注入，含 `mirrorElement` 取玩家主灵根）、`bossTryCast` / `bossCastSpell`（每回合按 `spellChance` 施法并跳过普攻）。
    - BOSS 法术伤害 `round(b.atk × sp.dmg × 0.35)`；施加控制复用 `applyPlayerControl`（伐灾 3 层免控）；治疗**全额**；`defUp` 转 `fxBossDefUp`（BOSS 自身减伤）。
    - **坑**：`element` 未配置时必须保持 `undefined` 而非 `'无'`——否则全部既有战斗（杂兵/测试木桩）都会被 ×0.9 减伤、178 条既有断言全变；`disaster`（伐灾）为玩家专属，BOSS 不使用（否则会误给玩家加免控层数）。
    - 新增测试 `test/automated/12-boss-element.test.js`（16 例，含生克四档 / 无属性减伤 / 镜像属性 / BOSS 施毒施控 / 伐灾免控 / 治疗全额 / 护盾递减 / DoT 封顶）。
    缓存 **v94/dedao-v131**。测试 **194/194**（两份 dist 同步且回归一致）。

33. **手机端秘境专项 + 战斗血蓝条 + 敌人掉落下调（2026-09-13）**：
    - **秘境页密度**：`ADV_ROW_H 88→70` / `ADV_NODE_H 56→46`（CSS `.adv-canvas .adv-node` 的 `height` 同步 46px）；`@media (max-width:520px)` 内把 `.adv-vitals / .adv-right` 的 `min-width` **归零**（**窄屏换行根因**：`min-width:200px` 在 360~414px 触发换行，HUD 从 2 行撑成 4 行、吃掉半个屏幕）、`.chapter-overlay` padding 18→10、`.chapter-head` margin 16→8、隐藏空的丹药提示行。640px 高小屏可见层数 **4 行 → 6 行左右**。
    - **战斗血蓝条**：`index.html` / `index_pc.html` 玩家血条 `#4ec9a0`（绿）→ `#e8443e`（红）、灵条 `#6ad1ff` → `#3a86d6`（蓝）；`@media(max-width:520px)` 内收窄 `.hp-row .who`(64→16px) 与 `.hp-num`(70→56px) 并给 `.hp-bar` 加 `min-width:40px`。**根因**：窄屏下 `who + num` 的固定宽度把 `flex:1` 的进度条挤到 ~7px 甚至 0，表现就是「只看得到数值、看不到条」。
    - **初入秘境灵力回满**：`startAdventure` 在 `refreshStats` 后置 `s.mp = s.mpMax`（**气血不回满**，沿用进入时状态）。根因：入口沿用俗世残蓝 + `combatStart` 战前只 +75%（封顶），玩家在俗世耗空蓝再入秘境会带着残蓝开打、开局放不出法术。
    - **秘境 BGM 仙魔浩劫**：`audio.js` 新增 `xianmo` 键（`assets/audio/bgm/bgm_xianmo.mp3`）+ `BGM_FALLBACK.xianmo='battle'`（文件缺失回落战斗 BGM，不落合成单音）；`doStartAdv` 进秘境即播、`openBattle` 在秘境中（`!s.adv.done && !s.adv.trial`）用 `xianmo` 而非 `battle`，出秘境/试炼回 `game`。⚠ **需美术投放 `bgm_xianmo.mp3`**（主库 + 两份 dist 的 `assets/audio/bgm/`）。
    - **残魂考验 = 精英战难度**：`advResolveRemnantSoul` 改用 `Engine.enemyGen(S,'elite',S.adv.depth)`（清空 `loot`），**废弃**旧式「玩家 `atk×0.8` / 玩家 `hpMax×0.6`」挂玩家缩放。
    - **敌人灵石掉落减半**：`(10 + 10·ed)×realmM` → `(5 + 5·ed)×realmM`，**层级关系不变**（精英 ×1.5 / Boss ×2 / 高阶秘境更肥）。
    - 新增 3 条回归测试（`04-adventure`）：初入秘境灵力回满（并反向确认气血不回满）/ 残魂考验=精英战（含源码级「不得残留挂玩家缩放」断言）/ 灵石掉落量级与层级关系。
    缓存 **v99/dedao-v136**。测试 **200/200**（两份 dist 同步且回归一致）。

34. **BGM 定稿 + 手游 HUD 资源位 + 地图 4 行视口 + 装备掉落禁越阶（2026-09-13）**：
    - **仙魔浩劫 = `bgm_battle.mp3`**：`BGM_FILES.xianmo` 由不存在的 `bgm_xianmo.mp3` 改为 `assets/audio/bgm/bgm_battle.mp3`，`BGM_FALLBACK` 清空（无缺失项了）。**不再需要美术额外投放音频文件**。
    - **手游版 HUD 资源位**：`index.html` 把 `行动 / 灵石` 从 header 的 `.hud-actions` 移到**六维右侧竖排** `.stats-top-row > .six-dim-wrap + .action-info-col`（上=行动、下=灵石）；`style.css` 给 `.stats-top-row / .six-dim-wrap / .action-info-col` 补基础规则 + 窄屏压扁（`min-width 68px`）。**PC 版 `index_pc.html` 不动**（仍 `.hud-actions`）。实测 360/390/414px 三档均「在六维右侧 + 一上一下 + 零横向溢出」。
    - **秘境地图视口固定 4 行**：`ui.js` 新增 `ADV_VISIBLE_ROWS = 4` 并把 `--adv-row-h / --adv-node-h / --adv-visible-rows` 写入根节点；`.adv-map` 由 `flex:1` 自适应改为固定 `calc()` 高度（4×70+46+10 = **336px**）+ `max-height:62vh` 兜底。**根因**：`flex:1` 让长屏一次露 **9 行**道路（玩家实测）。实测视口 ≥542px 高时恒为 **4.00 行**、`chapter-inner` 不溢出、按钮在视口内。
    - **装备掉落禁越阶**：`randomEquip` 删除 `if (rand<0.18 && range[1]<5) tier = range[1]+1`（**黄级会掉上品**的根因）；新增 `RANGE_BIAS_PER_DEPTH = 0.03` 深度偏置（区间内偏向本阶上限，`bias = clamp(0.30 + 深度×0.03, ≤0.90)`，**不越阶**）。黄级现只出凡品/良品。
    - 新增 3 条回归测试：`04` 装备掉落区间上限（4 个阶位 × 首层/深 20 层）、`04` 仙魔浩劫 BGM 指向真实文件、`03` 手游 HUD 资源列结构（`.action-info-col` 在六维右侧 + 无 `.hud-actions`）；`04` 地图样式守卫扩为「4 行视口 + CSS 变量单一来源」。
    缓存 **v100/dedao-v137**。测试 **202/202**（两份 dist 同步且回归一致）。

35. **灵物改制为法宝 + 秘藏二选一重做 + 属性面板文案收敛（2026-09-13）**：
    - **灵物＝法宝**：旧版灵物是 `s.spiritItems` 独立道具（只能完美突破、储物袋里看不到）。现 4 件灵物并入 `ARTIFACTS`（`spirit:true`、`type:'灵'`、黄/玄/地/天各一），与普通法宝同吃「法宝囊→装备槽」体系；`loadState` 自动迁移旧档 `s.spiritItems → s.arts`。**「完美突破」机制取消**（`perfectBreakthrough` 变空壳），效果改被动：`hpMax` / `doubleCult 0.3`（修炼几率翻倍）/ `doubleDmg 0.5`（出手几率翻倍）。
    - **一屏白拿两件的 bug**：Boss 战利品原自动带 `loot.spirit`，通关「秘藏二选一」再选一件法宝 → 同时蹦出「获得灵物【上品灵晶】」+「获得法宝【寻矿罗盘】」；且旧 `advBossBonus` 的灵物选项走的是 `applyOps(s,{spirit})`——`applyOps` 根本没有 `spirit` 分支，**选了等于什么都没给**。现删除 Boss 的 `loot.spirit`，灵物只从「秘藏二选一」选项一出。
    - **秘藏二选一新规则**：选项一＝本阶位灵物（未持有必出）/ 已持有则换随机法宝；选项二＝当前品阶池随机法宝；**每层（阶位）秘境最多 3 件法宝（含灵物）**，计数 `s.flags.advArt[阶位]` 跨通关累计、转世清空，取尽后降级为灵石。守卫见 `04`「灵物已是法宝：Boss 不再自动掉灵物，秘藏二选一只给一件」。
    - **罗盘文案「++」根因**：UI 侧 `pct()` 自带「+」而调用处又补了一个「+」→「灵矿产量++30%」（同批受影响：体魄气血 / 锻体效率 / 淬神效率 / 百艺效率 / 灵田产量 / 每年灵石 / 三种修炼模式 / 金精匕金精甲）。修法：把效果文案**唯一实现收敛到 `Engine.artEffectText`**（ui.js 只转发），一处治根。
    - **属性面板文案收敛**：六维卡片不再显示「（基础6.5 + 命格+1）」拆分、不再写「每点+多少」、不再提「每 10 点 +1 法宝栏」；改为引擎 `Engine.attrGainText(s,key)` 给出的**总增益**（如体魄「气血上限 +375、防御 +4」）。**战斗属性只留「名称 + 数值」**，`.attr-combat-desc` 全部删除。六维展示值改用 `effAttr + equipStats`（与战斗实算同源）。
    - 新增 4 条回归测试：`01` 法宝文案无「++」/ 无栏位解锁水词、`01` 六维面板文案无「基础/命格/每点/解锁」、`04` 秘藏二选一全规则（Boss 不掉灵物 / 只给一件 / 已持有转随机 / 3 件上限 / 灵物可被法宝栏识别）、`04` 灵物不进随机法宝池（商贩池 + 宗门商店 + 二选一选项二）。
    - `wanmei` 隐藏成就改为「秘藏尽收」＝单轮集齐四件灵物。缓存 **v101/dedao-v138**。测试 **206/206**（两份 dist 同步且回归一致）。

36. **灵物豁免上限 + 机缘本世一次性 + 仙缘页滚动（2026-09-13 晚）**：
    - **灵物豁免「每层 3 件」上限**：`grantAdvArt` 内 `isSpiritArt(id)` 为真时**不计数**，`advBossBonus` 的「取尽」判定只看普通法宝。连取 3 件普通法宝后选项一仍是灵物（否则「不选则下次仍给灵物」会被上限吃掉）。种子文件改为「灵物 1 件 + 普通 3 件」后本阶位才真正取尽。
    - **堵「仙缘的缘法可以无限刷」**：`evOK` 由「仅 `once` 去重」改为「**默认本世一次性**（`!ev.repeat && seen` 即排除）」。旧实现下 29 件漏标 `once` 的仙缘事件（山河 13 件全漏）可反复触发反复发奖励。守卫见 `05`「rollXianyuan 触发后写入 seen（本世不重复 · 堵无限刷）」+「仙缘池：未标 once 的事件也默认一次性」。
    - **机缘耗尽不再白扣行动点**：`drawXianyuan` / `travel` / `shanheExplore` / `jiyuan` / `social` / `explore` 池空时改为只提示不 `spend`（旧版炼气期点「山河探索」白扣 1 点只回一句「无所遇」——用户反馈「实际效果空」）。守卫见 `05`「无可用机缘时不消耗行动点」。
    - **游历文案校正**：`renderTravel` 的「山河探索」节点原写「每年至多 5 次」，实际 `SHANHE_CFG.perYearMax=1` → 改「每年限 1 次」。
    - **仙缘页显示不完整**：`.screen > .panel > head + .screen-body` 结构缺 flex 高度约束，内容被 `.screen` 的 `overflow:hidden` 裁掉。改为 `#screen-npc .panel{flex:1;flex-column}` + `.screen-body{flex:1;overflow-y:auto}`（**标题固定、内容区内部滚动**，`data-bg` 压暗层不随滚动飘走）；滚动条为「隐藏式」：默认 `transparent`，指针移入才淡显金色细条。
    - **仙缘卡片横向溢出**：`.npc-tier` 徽章文案较长时 flex item 默认 `min-width:auto` 不收缩 → 撑破卡片。补 `max-width:100%; overflow-wrap:anywhere`（实测 `tierOverflow:0`）；`.npc-actions .btn-small` 同样收口。
    - 新增 2 条回归测试（`05` 机缘一次性 ×2 + 池空不扣点 ×1 = 净增 3 例）。缓存 **v102/dedao-v139**。测试 **208/208**（两份 dist 同步且回归一致）。
37. **秘藏二选一收口：选项二留空 + 秘境入口显示「剩余法宝 N」（2026-09-13 晚）**：
    - **选项二无可取之物时留空**：普通法宝取尽（`ADV_ART_CAP=3` 满）时若选项一是灵物，就**只显示灵物一张卡**，不再拿灵石充数。弹窗标题/提示随选项数收口（二选一 → 「秘藏 · 唯一之选 / 此间只余这一件」）。
    - **真取尽只留一个灵石兜底**：灵物已持有 + 普通法宝取满时返回单元素数组（`取·灵石 ×N`）。⚠ 必须留兜底——`showBossChoice` 的弹窗 `ov.onclick=null`，返回空数组会让弹窗一张卡都没有、**无按钮可点而卡死流程**。
    - **修一个越上限漏洞**：`advBossBonus` 的「已持有灵物」分支原来只判 `rollArt` 能否取到，没判 `remain.normal`；池内还有未持有的普通法宝时会**突破每阶 3 件上限继续发放**。已改为 `else if (remain.normal > 0)`，与灵物分支同口径。
    - **秘境入口显示「剩余法宝 N」**：新增 `Engine.advArtRemain(s, 阶位)` → `{spirit, normal, total}`（普通＝`min(每阶余额, 池内未持有数)`，灵物＝未持有即 1），在 `openAdvEnter` 卡片上以金色虚线分隔一行「剩余法宝 4（灵物 1 · 法宝 3）」；取尽显示「本阶秘藏已尽数取出」。样式 `.adv-art-remain`。
    - 新增/改写回归测试：`04` 新增「秘境『剩余法宝 N』口径与二选一选项数」（入口口径 + 连选 3 件普通法宝后选项二留空 + 唯一选项仍为灵物），并改写「灵物已是法宝」用例的取尽断言（两个灵石 → 单个灵石兜底）。
    - 缓存 **v103/dedao-v140**。测试 **209/209**（两份 dist 同步且回归一致）。
38. **补日常小事：6 件纯资源事件开放 repeat（2026-09-13 晚，用户选「A 保守档」）**：
    - 背景：上一条把机缘改成「本世一次性」后，玩家后期会遇到「此世机缘已尽」。本次按用户拍板的 **A 保守档**，只放开 6 件**纯资源小收益**事件（`repeat: true`）：山涧灵泉（灵草+2/灵石+20）、天降陨铁（铁+5，**由 +10 下调**）、仙鹤衔药（灵草+5）、巧遇散修（灵石+15）、市井烟火（气血+25）、野岭采药（灵草+5）。
    - **未放开**：含法宝/功法/装备/属性点/寿元/渡劫加成的事件一律保持一次性（雷雨悟道、断崖洞府、论道大会、西王母赐桃、飞升预兆、莲香归来…）——一放开就是数值雪崩。
    - `E(tag, ev)` 把同一对象同时推进 `EVENTS[tag]` 与 `XIANYUAN`，故只在 data.js 定义处标一次 `repeat`，游历池与仙缘池同时生效。
    - **测试手法更新**：「制造空池」不能再靠 `s.seen[id]=1`（repeat 事件永远可见）——改为**临时把整池 `min` 抬到 999**（境界区间屏蔽），测完还原。
    - 新增守卫：`05`「日常小事（repeat）仅限白名单，且收益不得含成长类资源」（白名单 id 精确比对 + 收益字段黑名单 `art/tech/equip/life/trib/hpMax/qi/六维/elixirs/flags/sect` + repeat 事件触发后仍可见 + 60 年长期跑必有命中）。
    - 缓存 **v104/dedao-v141**。测试 **210/210**（两份 dist 同步且回归一致）。
39. **宗门三件套重做 + 大比秘境化 + 装备掉率二次收紧 + 阵法页 + 主线门禁（2026-09-13 深夜）**：
    - **宗门任务「秘境探勘」对标地级秘境 BOSS**：`COMMISSIONS.tancha` 加 `enemyBoss: { adv:'di', tag:'boss', depth:10 }`，走 `enemyGen` 取真属性（旧版静态 `atk 15 / hp 60`，玩家反馈「敌人太弱」）。新增 `Engine.commissionEnemy(s, c)` 作为守敌**唯一口径**。
    - **宗门任务每年至多 3 件**：新增 `COMM_YEAR_MAX = 3` / `commissionYearLeft(s)` / `s.commYear`（跨年归零），`commissionComplete` 拦截超额，UI 菜单显「本年剩余 N/3 件」。
    - **宗门大比重做为秘境式一条直线 5 连战**：`SECT_DABI` 删掉写死的 `foes`，改 `{intervalYears:10, firstYear:10, layers:5, layerMul:[0.45,0.65,0.85,1.05,1.30]}`，对手按境界实时生成（外门散修→首席弟子）；新增 `dabiFoe` / `dabiLayerCount` / `dabiNextYear` / `dabiStatus`（返回 **「距离下次大比还有 X 年」**），UI 用 `.dabi-ladder` 一列 5 节点呈现；首赛为第 10 年、按游戏时间推进。
    - **切磋演武改为「（未开放）」**：菜单文案 + 按钮 `disabled` + `sectDoFight` → `uiAlert`，杜绝"能点但无反应"。
    - **巨灵腰带文案「体魄气血++50%」＝ `pct()` 双加号残留**：实测现渲染为 `体魄气血+50%`（`grade:'玄'` / `stoneFix:1000` 均与预期一致）。**全量检索**：44 件法宝字符串字面量 0 处 `++`、`artEffectText` 覆盖全部 effect 键、20 个屏幕的可见文案 0 处可疑串；仅 `静室玉牌` 描述自带「闭关修炼 +10%」且与 `effect.modeBonus.seclusion` 一致。结论：该 bug 已由上一轮 `artEffectText` 收敛根治，本轮**无新增文案缺陷**，但审计**捞出两处真隐患**（见下）。
    - **修两处「文案承诺但静默失效」**：① `applyOps` 的 `case 'trib'` 写进死字段 `s.linggen.body.trib`（现代存档读 `linggen.trait.effect`）→ 所有「渡劫 +N%」奖励无效；改为 `s.tribBonusExtra` 并纳入 `breakInfo`。② `case 'shen'/'dun'` 有实现但**白名单数组没开** → `effect:{dun:1}/{shen:1}` 无效果；白名单补齐。新增 `01` 守卫「事件 effect 的键必须被 applyOps 白名单支持」。
    - **秘境装备掉落三调收口**（用户反馈「掉落太优越」→ 当日二次反馈，**用户拍板去基数公式**）：总掉率 `min(0.55,0.10+ed×0.04)` → 二调 `min(0.35, 0.06+ed×0.02)` → **终版 `min(0.30, ed×0.02)`**；Boss `0.80` → **`0.60`**（未再动）。高一品偏置 `clamp(0.30+深度×0.03, ≤0.90)` → 二调 `min(0.55, 0.18+深度×0.02)` → **终版 `min(0.30, 深度×0.02)`**。实测（1200 次抽样）杂兵首层 2.1%/1.7%、10 层 20.8%/20.3%、20 层 28.8%/28.7%、Boss 58.4%。（常量 `EQUIP_DROP_PER_DEPTH/CAP` / `RANGE_BIAS_PER_DEPTH/CAP`，`*_BASE` 已删除）
    - **百艺「研习」页改名【阵法】并修「下拉后弹新内容」**：根因是 `.crafts-body` **同名 class 嵌套**（`#crafts-body` 内又放一个 `.crafts-body` 的 pad）+ 切 tab 后滚动位置被夹到新内容底部。修法：内容容器改独立 id `#crafts-tab-body`（去嵌套）+ 切 tab 后 `$('screen-crafts').scrollTop = 0`。`renderBaiyiTab` 重构：炼丹/炼器各挂本艺研习（公共 `renderCraftStudyRows`），第 5 个 tab 独立为「阵法」（`renderBaiyiStudy` 只列 `zhenfa`）。
    - **主线门禁收敛为 `mainlineGateOK(s, ml)`**（`checkYearEvents`/`moreMainline` 共用）：`needSect` 之外新增 **`noSect`**（已入宗不显示 → `ml_2_0`「仙门收徒」）与 **`afterSectYear`**（入宗的下一年才播 → `ml_2_1` 初入宗门 / `ml_2_g1` 百艺初窥）；`applySectTrial` 首次正式入宗时写 `s.sectJoinYear`，旧档无该字段**兜底放行**。`ml_2_3` 宗门任务由 `fight` 改为**机制教学**（引导点开宗门任务 + `stone:120`）。
    - 顺带清理死键：`EVENTS.jiyuan[1]` 删掉 `qiMul: function(){return 1;}`（声明但无人消费）。
    - **补 PC 版缺屏 bug（PC 冒烟实测发现）**：`index_pc.html` 缺 `screen-achievements` / `screen-codex` 两屏 → `ui.js` boot 绑定 `$('ach-back').onclick` 直接抛 `TypeError: Cannot set properties of null`（**首个 DOMContentLoaded 监听即炸，PC 版开局链路带伤运行**），且 PC 角落「成就/图鉴」按钮点了白屏。修法：两屏结构照手机版补进 `index_pc.html` + `ui.js` 对 `ach-back`/`codex-back` 绑定加判空（与 `btn-sect`/`adv-info` 同风格）。jsdom 全流程冒烟 8/8：开局→主界面→成就页开/关→图鉴页开/关→零 JS 错误。⚠ **PC 入口此前无任何自动化覆盖**，本轮起 boot 绑定一律判空。
    - 新增/改写回归用例 9 例（`01`×1 白名单守卫、`02`×5 年上限/守敌同源/大比/主线门禁/trib、`03`×2 宗门菜单/阵法板块、`04`×1 掉率重平衡）。缓存 **v106/dedao-v143**。测试 **220/220**（两份 dist 同步且回归一致；02 套件含 1 个随机长模拟动态用例，总数会 ±1 波动）。
40. **进入页劫数自由选择：新账号开局可选 0–9 劫（2026-09-13 深夜，用户要求实装）**：
    - **改动点仅一处口径**：`showEnterPage` 中 `const maxJie = m.maxJie || 0` → **`const maxJie = 9`**。旧逻辑下新账号 `meta.maxJie=0`，进入页「+」按钮被禁死只能 0 劫开局；现在 0–9 劫自由选择，`meta.maxJie` 保留在结算页作「历史最高」成就展示。
    - **顺带修一处既有不一致**：结算页「应劫轮回（X劫）」写 `meta.nextJie`，但进入页 `enterState.jie` 恒 0，预设实际被丢弃；现进入页默认落在 `min(9, meta.nextJie||0)`（玩家仍可自由改）。
    - **难度语义不变**：所选劫数写入 `S.jie`，JIE_DATA 难度倍率（9劫 4.0x）、命格金池（3劫+）、命格栏 +1、锁定槽 +1（6劫+）、隐藏线魔祖仙帝（6劫+）全部按所选劫数生效——选高劫 = 主动提升难度。
    - 新增回归用例：`03`「进入页劫数自由选择：新账号可选 0–9 劫，所选劫数生效到本世」（全新账号连点 + 到 9 劫 → 按钮禁用态 → 以 9 劫开局 → 存档 `jie===9`）。
    - 同批提交：外部新增的「存档版本清理」功能（`SAVE_VERSION` + `cleanupLegacySaves` + 旧档清理 toast，见 §三 档案）一并入库。
    - 缓存 **v108/dedao-v146**。测试 **221/221**（两份 dist 同步且回归一致）。
41. **手机端「所有页面全量可滑动」适配（2026-09-13 深夜，用户反馈进入页被裁、开始不了新游戏）**：
    - **症状**：`.screen{overflow:hidden}` + 部分屏没有滚动容器 → 内容超屏即被裁切，进入页「开始这一世」按钮在手机上够不到。
    - **修复（css/style.css 末尾滚动适配段）**：① 百艺/锻体页：中间块级 `.panel` 改受约束 flex 容器，`#crafts-body`/`#duanti-body` 自身内滚；② 装备页：`#gear-inv-wrap` 内滚；③ 轮回塔：`.rb-list` 内滚；④ **天命抉择页：`#screen-enter .enter-wrap` 整块可滚**（本条即用户反馈的主修点）；⑤ 弹窗/成就/图鉴限高层补 `dvh` 回退 + `overscroll-behavior:contain`；⑥ `.screen-body`/`.chapter-body`/`.char-body`/`#log` 防滚动穿透。
    - **无头 Edge 手机视口（390×844）实测**：`.enter-wrap` scrollHeight 910 / clientHeight 669，scrollTop 可滚至 241，`canScroll:true` —— 开始按钮可达。
    - **静态守卫**：`01` 新增「手机端滚动适配：关键屏幕必须有可用滚动容器」（7 处滚动规则在位性检查，防误删回归）。
    - 同批入库并行改动：**游历流动商贩防重复购买**（`ownsArt` 含装备位判定，已拥有法宝标 `owned` 禁购）。
    - 缓存 **v109/dedao-v147**。测试 **222/222**（两份 dist 同步且回归一致）。
42. **法宝栏显示修正（空槽照常渲染）+ 炼体主线两选项「必然学会」《锻体诀》（2026-09-14 凌晨，用户反馈）**：
    - **症状 A（显示错误）**：角色页「法宝」分页在**未持有任何法宝**时，用一句 `未持有法宝。法宝需于「装备」页穿戴后生效（当前装备槽 N 个）` **顶掉了整个面板** —— 玩家既看不到本该显示的空法宝槽，文案还把装佩页指错了。
    - **修法（js/ui.js `renderCharTreasure`）**：删掉该 early-return；`法宝栏 X / N 已用` 标题 + 空栏位 + 🔒未解锁栏位一律照常渲染，无法宝时只补一行 dim 说明「你尚未获得任何法宝 —— 法宝在本页（法宝栏）装佩后即生效」；空栏位副文案按有无存货切换（`可在下方「储物袋法宝」中装备` / `尚未获得法宝`）。
    - **口径固化**：**法宝只在「法宝」分页装佩**。装备分页只渲染常规装备（`renderCharEquip` 按 `EQUIPS.treasure` 过滤宝物）；旧 `screen-gear` 页的法宝槽为**只读展示**（无穿戴按钮）。勿再写「法宝需于装备页穿戴」。
    - **症状 B（炼体主线）**：仙缘·老乞丐主线 `xian_laoqigai`「老丐传艺」两选项不对称——「恭敬请教炼体之法」给 体魄+1/攻击+3，「赠以干粮，结个善缘」只给 悟性+0.5，选后者就学不到炼体之法。
    - **修法（js/data.js）**：两选项 `effect` 均加 `flags:{duanti:1}`（习得《锻体诀》→ 解锁锻体），**差别只在属性加成**（体魄+1/攻击+3 ↔ 灵石-10/悟性+0.5），台词补齐「习得《锻体诀》」。`actArts` 未解锁引导文案同步改为指向老乞丐（原写「练气后期」，现锻体在炼气期即可由老丐传艺解锁；`ml_2_beggar_duanti` 练气后期章节保留为同门再授 + 气血上限+20）。
    - **新增回归用例**：`07`「老丐传艺：两个选项都必然习得《锻体诀》（差别只在属性加成）」（含 `applyOps` 端到端断言 `duantiInfo().unlocked`）；`03`「法宝页：未持有时渲染空的法宝槽，文案不再指向「装备」页」。
    - 缓存 **v114/dedao-v152**。测试 **226/226**（主仓库 + `dist/DEDAO_release` 双跑一致；`dist/taptap/dedao` 同源同步）。
43. **静室歇脚弹窗：删除冗余的「不再停留」，原位置改为「撤离（保住收获）」（2026-09-14 上午，用户反馈）**：
    - **症状**：秘境【静室歇脚】弹窗底部并排两个出口——`不再停留`（`btn-main ghost`）与 `撤离（保住收获）`（`btn-main ghost adv-retreat`，小号）。用户要求**删掉「不再停留」，把「撤离（保住收获）」放到它原来的位置**。
    - **判定「不再停留」确实冗余**：`advMove` 早已把玩家移到该节点（`handleMovedNode` → `advResolveNode` → `openRestScreen`），而 `advAdvanceToMap()` 只做 `Engine.advAdvance`（更新 `depth` + 存档）+ `renderAdvMap`，**不产生任何位移**；右上【关闭】走 `closeModal()` 同样是「收起弹窗留在原节点」。故两者完全等价，留两个出口纯属冗余。
    - **修法（js/ui.js `openRestScreen`）**：删掉 `不再停留` 的创建与接线；原本紧随其后的 `撤离（保住收获）` 上移一格（仍走 `advFinish('撤离')` = 完整收货分支，静室仍是秘境中唯一不掉收获的撤退点；其余中途撤离一律走右下角【强行撤离（失五成收获）】）。样式沿用 `adv-retreat`（小号 ghost），未改动视觉层级。
    - **新增静态守卫**：`01`「静室歇脚：已删除「不再停留」，原位置为「撤离（保住收获）」」——断言 ①`不再停留` 不出现 ②`撤离（保住收获）` 存在、且在 `养精蓄锐（秘境体力 +10）` 之后（即原位置）③全文只出现一次 ④仍走 `advFinish('撤离')`。
    - **顺带教训**：源码级文案守卫**必须先剥掉 `//` 与 `/* */` 注释再断言**——本用例首版直接匹配原文，被自己新增的说明性注释误报成红灯。
    - 缓存 **v117/dedao-v155**。测试 **227/227**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。

44. **成就·轮回印记全不显示 / 宗门商人灵石 / 巨灵腰带装备后属性不刷新（2026-09-14，用户反馈）**：
    - **症状 A（成就页「轮回」整页空白）**：成就页（含「轮回」分类 6 项）时不时刷新后整页空白、一个都不显示。
    - **根因（js/engine.js `loadMeta`）**：旧档兼容缺失——`loadMeta` 仅在 `m && m.reinc` 时返回，**不保证 `achievements` 字段存在**。旧档（有 `reinc` 但无 `achievements`）令 `openAchievements` 中 `meta.achievements[id]` 抛 `TypeError`，导致成就页整页崩溃空白（用 `legacyMeta={points:5,lives:2,reinc:{}}` 实测复现：ach-body 长度 0、0 卡片、页面不可见）。
    - **修法**：`loadMeta` 补齐缺省字段——`const d = defaultMeta(); for (const k in d) if (m[k] === undefined) m[k] = d[k];` 额外 `if (!m.achievements) m.achievements = {};`。修复后旧档不再崩溃，轮回印记正常渲染。
    - **症状 B（宗门商人无灵石可见量）**：宗门商人界面未展示玩家当前可用灵石，无法判断能否购买。
    - **修法（js/ui.js `sectDoShop`）**：标题下新增一行「当前可用灵石：**N** 枚」（取 `S.stone`，缺省 0），置于商品网格之上。
    - **症状 C（巨灵腰带「代码层无效」）**：用户反馈装备/卸下巨灵腰带（`juling_yaodai`，`effect.tiHpBonus:0.50`）后，主页面战斗属性、角色页战斗属性、角色页六维体魄文案均无任何变化；预期原版体魄气血 +100、装备后 +150。
    - **核查结论（关键）**：经 `vm` 沙箱实测，**引擎层计算本身正确**——装备后 `hpMax` 由 180→230、六维体魄文案由 +100→+150，`artifactStats(s).tiHpBonus` 累加无误（`attrGainText` 体魄公式含 `(1 + tiHpBonus)`）。真凶是**装备/卸下操作后未触发界面重算**：`equipTreasureAuto` 写入 `s.equip.treasure` 后，主页面 `refresh()` 与角色页 `renderCharAttr()` 没被调用，属性面板停留在旧值。故「巨灵腰带无效」实为 UI 同步缺失，非计算 bug。
    - **修法（js/ui.js 装备/法宝页 4 处按钮回调）**：装备页「卸下 / 穿戴」、法宝页「卸下 / 装备」四个回调，操作后均追加 `refresh(); renderCharAttr(); renderCharEquip()/renderCharTreasure();`，使主页面六维/战斗属性与角色页同步刷新。
    - **顺带确认**：`data.js` 中巨灵腰带定义与宗门商店条目本就正确，无需改动。
    - 缓存 **v122/dedao-v160**。测试 **230/231**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致；唯一失败为并发会话在途改动的「山河探索」UI 用例，与本次 4 项修复无关）。

45. **游历「探寻仙缘」点击无反应 / 主页面 HUD 头像单独占一行（2026-09-14，用户反馈）**：
    - **症状 A**：游历页点【探寻仙缘】毫无反应（战斗页服药、秘境商店那批修复之后的又一例「点了没反应」）。
    - **根因**：游历页 `#screen-travel` 是**静态地图，没有日志区**；`xunxian` 分支在「行动点不足 / 尚无已解锁的仙缘之人 / 今年已探寻过」三条路径上都只调 `log()`，而 `log()` 写的是主界面 `#log`。玩家人在游历页，提示落在离屏日志里 → 表现为「点了没反应」。炼气期尚无已结识 NPC（`NPCS[*].unlock.story` 未达成）时必然命中这条路径，故体感是「完全没反应」。
    - **修法（js/ui.js + index.html + css/style.css）**：`#screen-travel .panel` 新增页内提示区 `#travel-msg`，新增 `travelMsg(text, kind)`（写页内 + 同时补一条主日志留痕）与 `travelMsgClear()`；`renderTravel` 的 `xianyuan / xunxian / shanhe` 三节点**所有字符串提示**改走 `travelMsg`（"行动点不足" 走 bad 样式），每次点击先 `travelMsgClear()`；`window.actSeekXianyuan`（PC 热点）同步改用它（PC 无该元素时自动降级为纯日志）。`openTravel()` 进入时清空提示。
    - **症状 B**：主页面 HUD 里头像**单独占了一行**（用户要：头像在左 / 道号在右 / 命格在下一行 / 设置在命格右侧）。
    - **根因**：`.hud-top` 是 `flex` + `flex-wrap:wrap`，`.hud-name` 内含「道号+境界+命格」三块，其中 `.realm-badge` 与 `.hud-destiny-inline` 都是 `flex-shrink:0` → `.hud-name` 的 min-content 顶破容器宽度，整块换行，头像就被挤成独占一行。
    - **修法（index.html + css/style.css）**：`.hud-top` 改 **CSS Grid 2 行 × 3 列**（`auto minmax(0,1fr) auto`）：头像 `grid-column:1 / grid-row:1 / span 2`（`align-self:start`，保证命格换行变高时仍与「道号」同行）；道号+境界 `col2 row1`；命格 **移出 `.hud-name`** 成为 `.hud-top` 直接子元素（`col2 row2`，可换行）；新增 `#hud-settings`（`.hud-gear`，`col3 row2`，⚙）。**设置从底部栏上移到 HUD**（底部栏由 4 项变 3 项：角色/储物袋/仙缘），`js/ui.js` 的 `#btn-settings-bottom` 绑定改判空（PC 副本 `index_pc.html` 仍保留该隐藏靶点，`ui_pc.js` 的 `pc-set` 靠它代理触发）。
    - **几何实测（无头 Edge 探针，320/360/390/414px × 3~6 个命格）**：横向溢出恒为 0；`grid-column/row` 计算值恒为 `avatar 1/1-2 · name 2/1 · destiny 2/2 · gear 3/2`；390px + 3 命格时 HUD 顶栏高 65px。
    - **新增回归**：`03`「游历页「探寻仙缘」：无仙缘之人时必须有页内提示（旧版静默无反应）」（**回退修复后该用例实测转红**，非空转）+「已结识仙缘之人时回到主界面并弹章节层」+「主页面 HUD：头像左 / 道号右 / 命格下一行 / 设置在命格右侧」（含 CSS 网格口径守卫，防回退成 flex-wrap）；`01` 的「未定义 ID」审计**新增 index_pc.html 白名单**（PC 隐藏代理靶点不再误报为死代码）；`03` 底部栏用例 4 项 → 3 项。
    - 缓存 **v125/dedao-v163**。测试 **234/234**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。
46. **仙命（金阶轮回命格）10 条重写 + 图鉴「仙命」卷 + 秘境掉率文案收敛与四调 + 同名装备凭空消失 BUG + 负体魄地板（2026-09-14，用户逐字给定数值）**：
    - ⚠ 本条曾随并发会话的 `git reset --hard` 丢失过一次（代码与 `DEDAO_装备属性与装池完整表.md` 均在，仅 AGENTS.md 记录缺失），此处补回。
    - **仙命口径澄清（易混点）**：项目里有两套命格——`TALENTS`（id `t_*`，**开局命格**，金×5）与 `DESTINIES`（**轮回命格**，金×10）。**「仙命」= `DESTINIES` 中 `grade:'金'` 的 10 条**（`rollDestinyPool` 的 forceGold 逻辑），不是 `t_*`。图鉴新增第 3 个 tab `xianming`（🌟 仙命），`codexState.xianming` **恒为 `true` 全展示**（用户要求「展示所有仙命」，不隐藏为 `???`）；`codexInfo('xianming', id)` 单独一支，`meta` 固定 `仙命 · 金阶命格`。
    - **10 条金阶仙命数值（`js/data.js` `DESTINIES`，用户逐字给定）**：九天玄体 `{wu:2,shen:2,dao:1,ling:2,ti:-1,dun:-1}`；道心渐明 `{wuPerYear:1,wuPerYearCap:6}`；肉身成圣 `{tiPerYear:1,tiPerYearCap:6,defMul:0.30}`；天命之子 `{dao:3,ling:2}`+`{tribBonus:0.15}`；杀伐果断 `{atkMul:0.15,critRate:0.13,executeBonus:0.10}`；万法不侵 `{ti:3}`+`{defMul:0.20,thorns:0.20,controlImmune:true}`；先天道体 六维各 +1；战神降世 `{shen:3}`+`{atkMul:0.20,recoverPct:0.10}`；天道宠儿 `{wu:2,ti:1,shen:1,ling:1}`+`{tribBonus:0.15}`；万剑归宗 `{shen:3}`+`{noElemSpellMul:0.50,swordCritRate:0.50}`。
    - **新增引擎机制 4 条**：① `applyDestinyYearly` 支持 `*PerYearCap`（前 N 年封顶，第 7 年起停）；② `getRecoverPct` 纳入 `recoverPct`；③ `playerHit` 新增 `extraCrit` 形参供「剑法暴击」叠加；④ 法术伤害分支按 `sp.element==='无'` 判剑法，分别乘 `(1+noElemSpellMul)` 与传 `swordCritRate`。**口径澄清**：「无属性法术」= 青云剑宗剑法（`element:'无'` + `sect:'qingyunjian'`：剑气诀/万剑归宗/破天一击），故「无属性法术伤害+50%」与「剑法暴击+50%」同源不冲突。
    - **`mergeEff(attr, effect)` 新增**：命格可同时带 `attr`（六维）与 `effect`（战斗/被动），旧写法 `d.attr || d.effect` 只取其一 → 丢掉后半段。现两段合并展示。
    - **`effText` 支持负值与逐年封顶**：新增 `effNum(v)`（`|v|<1` 视为百分比；负值带 `-`，如【九天玄体】`体魄-1 · 遁速-1`）；`*Cap$` 字段只作机制参数**不展示**；`*PerYear` 键若同对象带 `*Cap`，渲染为 **`前6年每年悟性+1`**（避免玩家误以为终身叠加）。
    - **秘境选择页删掉全部掉率数字**（用户强要求「不要写在秘境那里！！！！」）：卡片只留「产出：…」+ 定性提示 **`（越深越容易出高品装备）`**。引擎侧 `equipDropRate` / `equipBiasRate` 导出保留（供测试与内部调用）。
    - **装备掉率四调**：`min(0.30, ed×0.02)` → **`min(0.40, ed×0.025)`**（首层 2.5% / 10 层 25% / **16 层起封顶 40%**）；`EQUIP_DROP_PER_DEPTH=0.025` / `EQUIP_DROP_CAP=0.40`；Boss 维持 `0.60`；品阶偏置未动（`min(0.30, 深度×0.02)`）。见 `DEDAO_装备属性与装池完整表.md` §6.1。
    - **⚠ 装备页「同名装备凭空消失」BUG（用户实测）**：`wearEquip` 两处 `s.inventory.filter(x => equipInst(x).id !== id)` 语义是**删掉袋里全部同名装备** → 袋有青锋剑×2，穿一件另一件一并消失。**修法**：新增 `removeOneFromInventory(s, inst)`，按 `id + JSON(词条)` 精确定位、`splice` **只删一件**（找不到同词条退化为只按 id 删一件）；两处调用点全部替换。回归用例 `02`「穿戴装备：同名只消耗一件（另一件不得凭空消失 · 2026-09-14 用户实测 BUG）」；无头浏览器探针 `_probe/gen5.js` 含 `engine_old.js` 旧代码对照组，可截图复现 BUG。
    - **负体魄地板加固（首次引入负属性带出的潜伏地雷）**：`calcHpMax` 的 `80 + effAttr(ti)×50 + …` 与 `getRecoverPct` 的 `effAttr(ti)×0.01 + …` **原本都没有下限**。构造性极端（有效体魄 -3）实测算出 **`hpMax = -70`（进场即死、存档不可玩）** 与 **`getRecoverPct = -0.01`（战斗中 `Math.round(dmg×recover)` 为负 → 吸血变自残）**。修法：`calcHpMax` 收口 `Math.max(1, m)`、`getRecoverPct` 收口 `Math.max(0, …)`。**开局六维恒为 1，线上最坏只是 `effAttr(ti)=0 → hpMax=80`，本次加固不改变任何现状数值**，纯粹把「第二个减体魄来源」出现时的塌陷堵死。守卫：`11`「负体魄地板：仙命【九天玄体】不得算出 hpMax ≤ 0 或负回复」。
    - **测试手法教训（重要）**：`11` 套件的「眩晕」用例原本用宿主 Node 的 `Math.random` 打桩，但引擎跑在 `vm` 沙箱、用的是**沙箱自己的 `Math`** → 该桩从未生效，此前「通过」纯属巧合。现改为 `G.get('Math')` 取沙箱 Math 再覆盖。另：新增用例若污染共享沙箱 RNG 会连带打挂后续用例——需要独立 RNG 的用例请自建 `createGameContext({seed})`。
    - **测试稳定性（新增 `waitUntil` 助手）**：`03` 套件的 jsdom 用例此前用固定 `setTimeout(250)` 等 UI 响应，慢机器上「假红」——同一份代码主仓库曾在 230/231 之间波动（`h-stone` 未及时刷新，实 80→80，而章节层文案断言已通过，证明 effect 已结算、只是顶栏晚一拍）。新增 `waitUntil(fn, ms)` 轮询助手并用于该断言，连跑 3 轮稳定。
    - **图鉴总览计数修正（「仙命卷」引入的重复统计）**：「仙命」是 `DESTINIES` 金阶子集，**不是独立收藏集**。`renderCodex` 原本对 `CODEX_TABS` 全量累加 → 那 10 条被算两次（既在「命格 47」内、又在「仙命 10」内）：分母虚高 10（**274 → 真实唯一项 264**），玩家抽到金阶命格后分子也重复 +1。修法：新增 `TALLY_SKIP = { xianming: 1 }`，**只把它排除出全局总览**；tab 上的「🌟 仙命 10/10」徽标保留（那是「本卷展示条数」，本身就该满额）。守卫 `03`「图鉴计数：分母不得因「仙命卷」重复统计金阶命格」（断言 `分母 === 各卷之和 − 仙命卷`）。
    - **负属性安全地图（`effAttr` 全消费点审计，2026-09-14）**：引入负属性时必须按「**负值会不会把收益翻转成相反效果**」逐个判，而不是无脑加 `Math.max` —— 因为【九天玄体】的 `-1` **本来就该真的扣血扣防**，任何在 `effAttr` 层面统一夹紧的做法都会把惩罚抹掉。审计结论（13 个消费点）：

      | 消费点 | 负值情形 | 判定 |
      |---|---|---|
      | `calcHpMax`（`80 + ti×50`） | `hpMax ≤ 0` → 进场即死、存档不可玩 | ❌ **曾炸** → 已收口 `Math.max(1, m)` |
      | `getRecoverPct`（`ti×0.01`） | 负回复 → `Math.round(dmg×recover)` 吸血变**自残** | ❌ **曾炸** → 已收口 `Math.max(0, …)` |
      | `getDefense`（绝对减伤） | 负防御 | ✅ 消费点早已守卫 `if (defAbs > 0) x = Math.max(1, x - defAbs)`，不翻转；`defToAtk`（棘鳞甲）同受影响但同一守卫覆盖 |
      | `getExtraAtkChance` | 负攻速 | ✅ 消费点早已守卫 `if (extraChance > 0 && …)` |
      | `getDodgeRate` / `getCounterRate` | 负闪避 / 负反击 | ✅ `Math.random() < rate` 为假 → 永不触发，无翻转 |
      | `getCritRate` | 负暴击 | ✅ `Math.floor` 后 `if (critCount > 0)` 拦住，无翻转 |
      | `mpMax`（`ling`） | 负灵力 | ✅ 公式自带 `20 + Math.max(0, ling - 1) × 20` |
      | `firstStrike`（`dun`） | 负先手 | ✅ 消费点守卫 `if (b.firstStrike > 0)` |
      | `calcAtk`（`shen`/`ling`） | 负攻击 | ✅ 伤害端有地板（普攻 `Math.max(1, …)`、法术 `Math.max(2, …)`），无翻转 |
      | `tribBonus`（`dao`） | 负渡劫率 | ✅ 当前不可达（各项均为非负相加）；仅 `Math.min(…, TRIB_CAP)` 无下界，**将来若出现减道心来源需补地板** |

      **结论**：真正会「收益翻转」的只有 `hpMax` 与 `recoverPct` 两处，均已修复；其余要么已被下游守卫拦住、要么退化为「永不触发」，**不需要再加夹紧**。以后新增「减六维」内容时，按上表只复查标 ❌ 的两格 + `tribBonus`。本项为文档审计、无代码变更，故**不 bump 缓存版本**（AGENTS.md 不在浏览器可缓存资源内）。
    - 缓存 **v127/dedao-v165**。测试 **236/236**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致），`tools/pool-audit.js` 0 错 0 警。
47. **3 劫起开局六维 2 点 + 删【杀伐果断】+ 手机端主页面入口重排（成就上 HUD / 图鉴下底栏）（2026-09-14，用户逐条拍板）**：
    - **① 开局六维基准值上浮（规避负值风险）**：`startLife` 新增 `jieBase = (meta.nextJie >= 3) ? 2 : 1`，六维（`wu/ti/dun/shen/dao/ling`）由硬编码 `1` 改吃 `jieBase`。**0~2 劫仍为 1（行为零变化），3 劫及以上为 2**。详见 §十六「开局六维基准值」。实测 3 劫开局：六维 `[2,2,2,2,2,2]`、`hpMax=180`、`mpMax=40`；叠【九天玄体】后有效体魄 1、`hpMax=130`、回复 `0.01`（**永不触 0 或负数**）。进入页 `enter-jie-status` 文案同步改为「3劫起开局六维 +1、解锁「我命由我」命格栏+1」。
    - **② 删除金阶仙命【杀伐果断】**（`DESTINIES.shafadj`）：用户此前两轮未列该条，本轮直接裁定删除。**注意重名**——白阶 `DESTINIES.shafa`（`critRate:0.02`）**保留不动**，两者只是同名、各自独立。删除后**金阶仙命 10 → 9 条**，连锁：图鉴「🌟 仙命」徽标 `10/10 → 9/9`、总览分母 `264 → 263`。副作用：`effect.executeBonus`（气血 <30% 增伤，`playerHit` 消费）**暂时没有配置来源**，机制保留待后续内容复用，`11` 套件的相关 `note` 已改为不带「杀伐果断」字样。
    - **③ 手机端主页面入口重排**（`index.html` + `css/style.css` + `js/ui.js`）：
      - **设置还原为文字**：HUD 的 `⚙` 齿轮（`.hud-gear`，仅第 2 行第 3 列）**退役**，改为第 3 列跨两行的右侧功能列 `.hud-side`，内含 **`#btn-ach-hud`（成就，在上）+ `#hud-settings`（设置，文字，在下）**。
      - **成就上 HUD**：`bindNav` 增加 `btn-ach-hud`（原局内无成入口，成就只能从标题页进）。
      - **图鉴下底栏**：`.bottom-bar` 新增第 4 项 `btn-codex-bottom`（📖 图鉴）——这个 ID 在 `ui.js` 里**早就 bindNav 了**，此前只是 HTML 里没有实体按钮（PC 用隐藏靶点代理），本次「实装」。
      - **标题页减负**：成就/图鉴 撤除后 `.title-util-row` 仅留 玉符；**2026-09-15 玉符亦从标题页删除**，该入口整行与 `.title-util-row`/`.util-btn` 样式一并移除（PC 端 `pc-omen` 仍可用）。
      - **PC 兼容不变**：`index_pc.html` 的隐藏靶点 `btn-ach-bottom` / `btn-codex-bottom` / `btn-omen-bottom` / `btn-settings-bottom` **一律保留**（`ui_pc.js` 的 `pc-ach` / `pc-codex` 靠 `clickBtn` 代理触发）。
      - **回归改造**：`03` 「底部栏只保留 3 项…」→ **「底部栏 4 项（角色/储物袋/仙缘/图鉴），成就与设置已在 HUD」**；`03`「主页面 HUD…」用例的 CSS 守卫由 `.hud-gear` 改为 `.hud-side`（`grid-column:3` + `grid-row:1/span 2`）；`03`「标题页可见且主按钮齐备」删除 `btn-ach-title`/`btn-codex-title` 并反向断言已迁走；`03`「主角初始六维=1」→ **「0~2 劫为 1，3 劫及以上为 2」**（含 2 劫边界 + 3/5/9 劫 + 九天玄体最坏值守卫）；新增 `03`「HUD 成就 / 设置 与底部栏图鉴：局内可点开且返回主界面」。
    - 缓存 **v128/dedao-v166**。测试 **238/238**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。
48. **成就 / 图鉴放回主页面并置于设置附近 + 三仙命成就/图鉴可达性检测（2026-09-14，用户反馈）**：
    - **UI 调整（index.html + js/ui.js）**：
      - **图鉴上移 HUD**：把 `btn-codex-bottom` 从底部栏移到 `.hud-side` 功能列，新增 `btn-codex-hud`，与已有的 `btn-ach-hud`（成就）、`hud-settings`（设置）三者**同簇竖排**（成就 / 图鉴 / 设置），即使用户要求的「放在设置附近」。
      - **底部栏回退到 3 项**：角色 / 储物袋 / 仙缘。
      - **标题页仍只保留玉符**，不重复放成就/图鉴。
      - `bindNav` 把 `btn-codex-hud` 加入图鉴入口列表（同时保留 `btn-codex-bottom` 兼容绑定，但 HTML 中该元素已移除）。
    - **检测脚本（tools/detect_sanxianming.js，不进页面）**：
      - 定义「三仙命」为 3 条金阶（仙命）命格：天命之子 / 万剑归宗 / 天道宠儿。
      - 场景 A：仅三仙命、其余全新 → 解锁「命格初醒」「金色传说」2 条，证明三仙命直接满足仙命成就。
      - 场景 B：三仙命 + 集齐全部 46 命格 → 解锁「命格博览」等 5 条，证明全命格收集可达。
      - 场景 C：在三仙命基石上构造完整通关状态 → 64/66 成就点亮、图鉴 272/272 满卷；仅余「寿终正寝」（需寿元耗尽结局）与「天道」（集齐其余全部），二者属另一人生结局链，机制上均可达成且不受三仙命阻断。
    - **预览图（_preview/main_page.html + main_page.png）**：用真实 `css/style.css` 渲染的手机宽度（390px）主页面，可见头像在左、道号在右、命格在下一行、右侧「成就/图鉴/设置」同簇、底部栏 3 项，命格处展示「三仙命」3 个金阶标签。
    - **回归改造**：`03`「底部栏 4 项…」改为「底部栏 3 项（角色/储物袋/仙缘），成就/图鉴/设置 已上移 HUD 功能列」；断言图鉴从底部栏移除、HUD 新增 `btn-codex-hud`、且图鉴排在成就之后/设置之前；`03`「HUD 成就 / 设置 与底部栏图鉴」标题改为「HUD 成就 / 图鉴 / 设置」并把点击目标改为 `btn-codex-hud`；`03` 图鉴计数用例点击目标改为 `btn-codex-hud`；`03` 布局口径守卫的底部栏数量 4→3。
    - 缓存 **v129/dedao-v167**。测试 **237/237**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。
49. **新档突破「一直失败」根因 + 渡劫加成作用于小境界（封顶 98%）+ 连续失败 2 次保底（2026-09-14，用户反馈）**：
    - **① 根因检测（`tools/_probe_break.js` 实测，已删）**：新档「炼气中期 → 炼气后期」走 `breakInfo` 的 `else`（同大境界小境界）分支，
      公式 `base = 0.8 + (s.wu - 5) * 0.01`，**只吃悟性、完全不吃渡劫加成**（道心/灵根/命格/事件/丹药全部无效），且封顶 0.97。
      新档（wu=1、dao=1）实测：炼气中→后 ≈ **77%**、炼气后→筑基 ≈ **67%**、筑基后→金丹（大劫）≈ 57%。
      即：失败率 23%~33%，且**每次失败修为折损 30%~40%**（`qi *= 0.7 / 0.6`），又没有保底 →
      玩家体感「突破一直失败、渡劫属性白堆」。**这不是「概率为 0」的 bug，而是小境界口径漏吃渡劫加成 + 无保底**。
    - **② 渡劫加成提供给小境界、封顶 98%（`js/engine.js` breakInfo）**：
      - 同大境界小境界分支：`base = Math.min(base + tribBonus, TRIB_CAP)`（原 `Math.min(base, 0.97)`）。
      - 炼气圆满 → 筑基 分支（无天劫的概率突破）：`base = 0.72 + (wu-5)*0.015 + tribBonus`，封顶由 0.9 → `TRIB_CAP(0.98)`。
      - `tribBonus` 与渡劫同源汇总：`s.tribPct + s.tribBonusExtra + talentApply('trib') + getDestinyBonus('tribBonus') + 渡劫天赋 + 玄天宗 + effAttr(dao)*1%`。
    - **③ 连续失败 2 次 → 第 3 次必然成功（`js/engine.js` doBreakthrough）**：新增状态字段 `s.breakFails`（`startLife` 初始化为 0）。
      失败时 `+1` 并在文案追加「（已连续失败 N 次，下一次突破必定成功）」；成功时清零；`breakFails >= 2` 时 `pass` 直接置真。
      **仅覆盖掷骰式概率突破**（小境界 / 炼气圆满→筑基 / 极少直掷渡劫）；大境界渡劫走「劫境序列」实战胜负，不由保底覆盖。
    - **④ UI（`js/ui.js` refresh）**：突破按钮文案由「破境突破」改为**带成功率**「破境突破 77%」，
      并在保底生效时追加「 · 下次必成」（旧版小境界不显示概率，玩家无从判断）。
    - **⑤ 回归（`02`）**：新增「小境界突破吃渡劫加成且封顶 98%」（道心 +10 应 ≈ +10%，极端 dao 封顶 98%，炼气→筑基同样吃加成）
      +「突破连续失败 2 次后第 3 次必成」（用 `dao=-200` 使 base<0 制造确定性失败 → 计数 1、2 → 第 3 次 guaranteed win、计数清零）。
      **回退修复后两例实测转红**（236/239），证明非空转。
    - 缓存 **v130/dedao-v168**。测试 **241/242**（**唯一失败项为并发会话在途的「开荒·三 经历」用例，非本次改动**；本次两项新用例全绿）。
50. **轮回塔 4 项天赋退役 + 开荒新增「三 · 经历」（殷实/见面礼/延寿/早夭）+ 舍生删除（2026-09-14，用户定稿）**：
    - **轮回塔（`js/data.js` `REINCARNATION`）**：殷实 / 见面礼 / 延寿 **移出**、舍生 **删除** → 18 → **14 项**（+「开荒」1 张 = 轮回塔共 15 张卡）。
    - **开荒「三 · 经历」（新增 `js/data.js` `INIT_EXP`）**：殷实 **灵石 +500 / 3 点**、见面礼 **聚气丹 ×3 / 4 点**、延寿 **寿元 +20 / 2 点**、**新增【早夭】寿元 -20 / −3 点**（2026-09-16 起为 **-30**，并与【延寿】互斥）。
      四项均为「取 / 不取」toggle、**固定点数**（不像轮回天赋那样随等级递增），本世开局一次性结算、不入 meta、不跨世。
      **【早夭】的 cost 为负**：选它反而**增加 3 点**开荒预算（以寿元换点数），UI 用收益色（`.ct-point.good`）区分。
    - **分段顺序调整（`js/ui.js` `renderCreatePage`）**：~~一 灵根 / 二 出身 / 三 百艺~~ → **一 择灵根 / 二 定出身 / 三 经历 / 四 百艺**（百艺由三挪到四）。
    - **口径唯一化**：新增 `Engine.initExpCost(sel)` 作为「经历 → 点数」的唯一真源，UI 的 `createSpent()` 直接调用（不再各算一遍）。
      经历是**二值选择**，故另设 `Engine.initExpIds(sel)` 做**去重 + 过滤未知 id**，`initExpCost` 与 `applyInit` 共用它。
      ⚠ 去重必须在引擎侧做：`applyInit` 是公开接口，若容忍重复 id，`exp:['zaoyao','zaoyao',…]` 就能**量产负点（刷开荒预算）并重复扣寿元**
      （实测未去重时 `initExpCost` 返回 -9、寿元掉到 10；UI 的 toggle 天然不重复，属「线上不可达但必须堵」的一类）。
    - **引擎侧下线（`js/engine.js`）**：`applyReinc` 不再拷贝/结算 stone・juling0・life20；`s.reinc.shesheng` 的**两条消费点**一并摘除
      （`cultGain` 的「修炼 +10%」与修炼动作里的「每次修炼 -1 寿元 + 文案」）——**避免留下「有字段、无来源」的死配置**。
    - **旧档迁移（`loadMeta`）**：已购的 4 项按**原价**退还轮回点（`单价 × (1+2+…+n)`，与轮回阁「第 n 级 `cost×n`」定价一致）并清字段。
      `{stone:2, juling0:3, life20:2, shesheng:5}` 为首级单价；例：`stone` 2 级 + `shesheng` 1 级 → 退 `2×3 + 5×1 = 11` 点。
    - **负值地板（延续 #46 的「负属性安全地图」）**：【早夭】是本项目**第二个**负值来源，`applyInit` 结算后寿元补 `Math.max(1, …)`；
      同时 `hp` 上限重夹一次（寿元/气血口径不被压穿）。
    - **副作用（已核对，无需改动）**：成就 `tianfu`「天赋觉醒」（`desc: 解锁全部局外天赋`）的解锁判定是
      `REINCARNATION.every(r => (meta.reinc[r.id]||0) >= r.max)` —— **表驱动**，随 18→14 项自动收敛，**无悬挂 id**。
      故该成就未失效，只是**所需满级天赋由 18 项降到 14 项**（更易达成）；满级总花费 **1296 轮回点**。
    - **回归**：`03` 新增「开荒页：三 · 经历 四项齐备、点数结算正确、【早夭】为负点、百艺已挪到「四」」（含 toggle 反复选/取消、预算逐项核对、总览列出已选经历与寿元 90）；
      `03` 轮回塔卡数由写死 `>= 19` 改为**按引擎真值动态断言**（`REINCARNATION.length + 1`）并新增「退役天赋不得再出现」；
      `11` 新增「开荒 · 三 经历：四项实装结算（含【早夭】负点反向收益）」+「开荒 · 三 经历：重复 id 只结算一次（不得刷负点 / 重复扣寿元）」
      +「轮回塔退役天赋：……旧档按原价退还轮回点」（含舍生消费点已摘除的断言）。
    - **防御性 CSS（`css/style.css`）**：`.ct-grid` 由 `1fr 1fr` → `repeat(2, minmax(0, 1fr))`。
      `1fr` 的隐含下限是 `min-content`，卡片长文案（如「灵力上限+40 · 遁速+8%」）理论上能把两列撑破容器；
      **当前内容实测未触发**（探针量到 `clientWidth === scrollWidth`，改前改后渲染 md5 一致），属预防性加固，不改变现状观感。
    - **探针口径提醒**：无头 Edge 的 CSS 视口**锁定在 504px**，`--window-size=414` 只会截出 414px 宽的图、
      右侧 90px 被裁——**看起来像「布局横向溢出」，实际是截图与视口宽度不匹配**。截图请用 `--window-size=504,H`。
    - **工具同步**：`tools/reinc_sim.js`、`tools/player_sim.js` 的天赋表 / 结算分支同步下线退役项（都读真实 `REINCARNATION`，不再残留 phantom 天赋）。
    - 缓存 **v132/dedao-v170**。测试 **243/243**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。

51. **战斗状态图标实装（BUFF/DEBUFF 徽章）：图标 + 名称 + 层数/回合（2026-09-14，用户需求「给BUFF和DEBUFF分别增设图标」+「测试运行，给我跑战斗图标，全BUFF的」）**：
    - **🔴 关键发现（三个既有缺陷一次修掉）**：
      1. `index.html` 的 `#b-me-buffs` / `#b-enemy-buffs` 与 `ui.js renderBuffs()` 早就写好，但 **`s.battle.buffs` 全仓库从未被任何代码写入**（全仓 `.buffs` 仅 4 处引用：engine 两行解毒、ui 两行渲染）→ **战斗徽章一直恒为空**，玩家看不到眩晕/灼烧/中毒/伐灾/减伤。
      2. `renderBuffs('b-enemy-buffs', bb.buffs)` 与 `renderBuffs('b-me-buffs', S.battle.buffs)` 读的是**同一个对象**（`bb === S.battle`）→ 即便填了数据，敌我面板也注定同源。
      3. `解毒丹`（`data.js:52 adv:{cure:true}`）用 `s.battle.buffs.filter(bf => !bf.bad)` 解毒 → 列表恒空 = **完全无效但不报错**；且 filter 派生数组也**清不掉** `pDotBurn`/`pDotPoison` 真实字段，属假实现。
    - **① 数据源 `Engine.battleFxList(s, b)`（`js/engine.js`，导出）**：返回 `{ me, foe }` 两个列表，每项 `{ icon, label, bad, tip }`。
      **刻意「纯派生、不落盘」**——不写回 `s.battle`：`s.battle` 会被整对象序列化进存档，存派生数组会造成「字段与数组不同步」（DoT 结算、回合递减都会让数组过期），旧档也没有该字段。UI 渲染与解毒判定**共用这一份口径**。
      - 我方增益 5：⚔️ 攻击提升 / 🛡️ 受伤减免 / 🎯 暴击提升 / ✨ 伐灾（层数）/ 🧱 防御姿态。
      - 我方减益 4：💫 眩晕 · ❄️ 冻结 / 🔥 灼烧（层数）/ ☠️ 中毒（层数）/ 😵 心神失守。
      - 敌方减益 4：💫/❄️ / 🔥 / ☠️ / 🔻 攻击削弱。敌方增益 2：🪨 减伤 / 💢 狂暴。
      - **明确不进徽章**：`b.slow`（**死状态**——全仓库只被读取、从未被置真，展示窗口为 0）、`b.guard`（遁术常驻减伤，已有遁术列表承担）、`b.mechanic`（召唤/荆棘/吸血是敌人**固有特性**非可变状态）、瞬时量（heal / mpRestore / lifesteal）。
    - **② 眩晕 / 冻结 图标区分（`js/engine.js`）**：两者共用 `stunNext` 字段，故新增 `b.stunKind` / `b.pStunKind`（`'stun'` 眩晕(土) / `'freeze'` 冻结(水)），**仅用于图标，不参与任何结算**。
      `applySpellFx` 施控时按 `sp.element === '水'` 写入 `b.stunKind`；`applyPlayerControl` 加**可选第 4 参** `kind`（既有测试 `E.applyPlayerControl(s, b, 1.0)` 三参调用不受影响，未传则回落 `'stun'`）；`bossCastSpell` 传 `sp.element === '水' ? 'freeze' : 'stun'`。`ensureBattleFx` / `startBattle` 补初始化（旧档缺失回落 `'stun'`）。
    - **③ 解毒丹真解负面（`js/engine.js useAdvElixir`）**：由 filter 派生数组改为**直接清结算字段** `pDotBurn = 0 / pDotPoison = 0 / pStunNext = false / suppressed = false`；文案按实际情况区分「负面状态已解除」/「并无负面状态可解」。**正面状态（攻击增益、伐灾层数）不受影响**。
    - **④ UI（`js/ui.js renderBattle` + `renderBuffs`）**：`renderBattle` 改调 `Engine.battleFxList(S, bb)` 并分别喂 `fxl.foe` / `fxl.me`（敌我彻底分离）；`renderBuffs` 渲染为 `<span class="buff[ bad]"><i class="bf-ic">图标</i><b class="bf-tx">名称</b></span>`，`title` 挂完整说明（数值 + 剩余回合）。
    - **⑤ CSS（`css/style.css`）**：`.buff` 改 `inline-flex` + `gap:3px`；新增 `.buff .bf-ic`（图标，13px）/ `.buff .bf-tx`（名称，`font-weight:400` 抵消 `<b>` 加粗）；`.buff.bad` 补暗红底 `rgba(74,10,10,.42)`，与增益金黄底一眼可分。
    - **⑥ 全 BUFF 预览（`tools/build_battle_preview.js` → `_preview/battle_buffs.html` + `_preview/battle_buffs.png`）**：徽章内容由**真实引擎** `Engine.battleFxList()` 现算，样式引用真实 `css/style.css`，战斗 DOM 直接从 `index.html` 的 `#battle` 层抓取 → 预览 = 实装（共 15 枚：我方 9 / 敌方 6）。
      ⚠ 抓取正则必须把战斗层的收尾 `</div>` 一并吃进捕获组，否则外层 `#preview-wrap` 被缺失的闭合标签吃掉、图例 DOM 落进手机层内部、被 `z-index:9999` 的不透明遮罩盖住而「看不见」。
    - **⑦ 回归（4 例，回退修复后实测转红 → 244/247）**：`11` 新增「battleFxList 覆盖全部 15 项（我方 9 / 敌方 6）+ 空状态必须为空 + 死状态 `slow`/`guard`/`mechanic` 不得进列表」「眩晕 💫 与冻结 ❄️ 按五行区分（含三参旧签名兼容）」「解毒丹真解负面（旧版 filter 恒空 = 静默无效）+ 不得误伤正面状态」；`01` 新增「战斗徽章契约：由 `Engine.battleFxList` 供数 + 图标/文字双节点 + 减益底色区分」**含回退守卫**（`!/renderBuffs\([^)]*\.buffs\)/`，防再退回读恒空的 `s.battle.buffs`）。
    - 缓存 **v133/dedao-v171**。测试 **247/247**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。

52. **黄阶法术挂载五大机制 + 伐灾免控「按阶取小」（2026-09-15，执行 `DEDAO_黄阶法术特殊效果_方案.md`）**：
    - **背景**：五大机制（眩晕/冻结/灼烧/中毒/伐灾）此前只覆盖 **玄/地/天** 三阶，黄阶法术只有元素效果（critUp/atkUp/mpRestore/defUp/lifesteal），机制列在档位表里全是「—」。本轮**不新增法术 id**，把机制补进现有 9 个黄阶法术中的 8 个。
    - **① 数据（`js/data.js`，8 行）**：`jinren`/`leiyin` +`disaster: 1`；`huoqiu`/`yuhuo` +`dotBurn: 1`；`shuidan`/`hanshuang`/`luoshi` +`stun: 0.10`；`tengman` +`dotPoison: 1`。**`jianqi`（无属性·青云剑宗）刻意不挂**——与 `wanjian`/`potian` 同口径，无属性不参与五行机制。8 条的 `desc` 同步补机制说明（沿用玄/地/天 写法）。
      - **黄阶一律取四阶最低档**：眩晕/冻结 **10%**，DoT/伐灾 叠 **1 层、上限 1**。理由：黄阶法术**同时保留原有元素 buff**，机制数值再给高会反超玄阶纯机制法术。
      - 上限 1 的体感后果：**单次施法只烧 1 回合（当前血 10%）即消退，想叠层必须上玄阶**。
    - **② 引擎（`js/engine.js`，2 处，机制主路径一行未动）**：
      - `dotCapByGrade` 显式补黄阶分支（`g === '黄' ? 1 : 1`）。原靠 `else` 兜底返回 1，**行为不变**，纯显式化以便测试断言；非四阶取值仍回落 1。
      - **伐灾免控门槛由固定 3 层 → `min(3, b.disasterCap)`**：新增战斗态字段 `b.disasterCap`（本次伐灾的**档位上限快照**，多次施法取 max），新增派生函数 `disasterImmuneCost(b)`（已导出）。
        **修掉的真实缺陷**：黄阶上限 1、玄阶上限 2，**都叠不到旧的固定阈值 3** → 低阶伐灾的免控**永远不可达**，只有地(4)/天(8) 能触发。
        | 施法档位 | 本档上限 | 免控消耗 | 与旧版对比 |
        |---|---|---|---|
        | 黄 | 1 | **1** | 从「不可达」变为可达 |
        | 玄 | 2 | **2** | 从「不可达」变为可达 |
        | 地 / 天 | 4 / 8 | 3 | 不变 |
        | 旧存档 / 手工置层（无 `disasterCap`） | — | 3（回落基准） | 不变 |
      - `ensureBattleFx` / `combatStart` 补 `b.disasterCap = 0`（旧档回落 → 阈值 3，保持兼容）。
      - **顺带修一个错报**：`bossCastSpell` 里原用「施控前层数 `before >= 阈值`」判断是否报伐灾消抵 → **控制没命中时也会错报**成「伐灾消抵」；黄阶 10% 命中率让这个错报更显眼。改为按**实际扣减量**（`b.disasterStacks < before`）判定，并报出真实消耗层数。
      - `battleFxList` 的伐灾徽章 tip 由写死「每 3 层」改为现算 `disasterImmuneCost(b)`。
    - **③ 敌人影响面（既定口径：BUFF/DEBUFF 双向）**：**14 个敌人在用黄阶法术**，同步获得机制（匪首/试炼之主/狼王/黑风寨主/沧溟蛟/冰蛟/火脉元灵/石门机关/虚空兽潮…）。早期对手施法率 15%~25%，命中后为「10% 概率一回合无法行动」或「1 层 DoT（1 回合即退）」，**量级温和、无需门控**。
      **金系伐灾天然只惠及玩家**：`bossCastSpell` 不读 `sp.disaster`，敌人施金刃术只取伤害。
    - **④ 测试（5 例新增，252/252）**：
      - `11` 「新机制④」补 `dotCapByGrade('黄') === 1` + 非四阶回落；「新机制⑤」**改造为免控完整矩阵**（黄1/玄2/地3/天3/无cap回落3 + 玄阶 2 层免控 + 黄阶 1 层免控）；
        新增「黄阶机制①：8 条逐一挂载字段（含无属性·剑气诀必须不挂 + 全表普查黄阶 `stun` 必为 (0,1]）」「②：DoT/伐灾 被黄阶上限 1 夹住（玄阶对照夹到 2）」「③：水弹术确定性命中 → 冻结（`stunKind==='freeze'` + 水系文案 + 未命中反馈）」「④：金刃术伐灾 —— 自叠 1 层 + 净化自身毒/灼 + 不得挤掉原有暴击 buff + cap1 一层即可免控」。
      - `12` 「BOSS 施法⑥」补黄阶上限；新增「施法⑧：黄阶法术双向生效（落石→`pStunNext`/`pStunKind='stun'`、水弹→`freeze`、火球→`pDotBurn=1`、藤蔓→`pDotPoison=1`、金刃术**不得**给玩家加伐灾）」；「施法⑦」以 `jinren` 作纯伤害参照实跑仍绿（伐灾不进 BOSS 分支）。
    - **⑤ 非空转验证（三组变异，全部实测转红后还原）**：
      - 抹掉 `data.js` 8 行机制字段 → `11` **35 → 31**（新增 4 条黄阶用例全红）。
      - `dotCapByGrade` 黄阶改错（1 → 2）→ `11` **35 → 32**、`12` **17 → 16**。
      - `disasterImmuneCost` 退回固定 3 → `11` **35 → 33**（`新机制⑤` + `黄阶机制④` 红，精确指出「期望 1 实际 3」）。
    - **⑥ 两个测试写法坑（本轮实踩）**：
      1. **`stunNext` 不能在 `combatAct` 之后断言**——敌方被控后会在**同一回合内**跳过行动并清掉该标记，所以整回合跑完 `stunNext === false`。要观察「落效果本身」必须直接调 `E.applySpellFx(s, b, sp, out)`（不经回合推进）；`combatAct` 只用来断言「本回合未反击（`hpLost === 0`）+ 战报文案」。
      2. **「连施 2 次仍为 1 层」证明不了上限**——回合开始 `tickDot` 会先 −1 层，黄(上限1)/玄(上限2) 连施两次后都停在 1。正确写法：直接调 `applySpellFx` 预置 5 层再施法，断言被夹到 1（**并用玄阶对照夹到 2**，才排除「全局都夹 1」的可能）。
    - **⑦ 文档同步**：`DEDAO_法术效果全等级大表.md`（状态头 → ?v=133/252；第一节机制口径表补黄阶四列 + 免控公式；第二节档位表填上黄阶 5 格「—」+ 新增「黄阶机制档位」说明；第三节黄阶表补机制；第四节机制覆盖自黄阶起；**顺带校正 `cost` 列 41 行过期值** —— 文档 15/13/14… vs `data.js` 40/35/35…，约 2.5× 系统性偏差，`data.js` 为唯一真源）；`DEDAO_法术新机制方案.md`（机制线由「五机制 × 三阶（15）」注明扩为「× 四阶（20，含黄）」）；`DEDAO_黄阶法术特殊效果_方案.md`（状态头改「已实装」+ 记录 3 条实装偏差）。
      **`DEDAO_秘境功法法术池映射.md` 无需改动**（不新增法术 id，黄级秘境池不变）。
    - 缓存 **v134/dedao-v172**。测试 **252/252**（主仓库 + `dist/DEDAO_release` + `dist/taptap/dedao` 三跑一致）。

53. **「字体不统一」根因定位并修复（线上字体被二次子集化）+ 天榜/云存档整体下线走纯本地（2026-09-15，用户需求「当前字体不统一，检测问题，天榜可以删除相关机制走纯本地」）**：
    - **① 根因：`assets/fonts/TsangerYuYangT-W05.woff2` 被二次子集化，不是字体栈 / 授权问题**。线上文件只有 **2352 个 cmap 码位**，而游戏可见文案用了 **2488 个字**，其中 **381 字不在该文件内、累计出现 1446 次** ⇒ 这些字静默回退到字体栈第二位的 `SimSun`/`宋体`。表现就是「同一屏两套字形」：老文案是渔阳体、新加内容（黄阶法术、轮回塔、开荒页几轮新增）是宋体。**不是版权问题**（仓耳字库官方声明免费商用），也不是 CSS 写错。
    - **② 度量与选型（先量后改）**：用 `fontTools` 拆包核对，线上文件的 family/version/UPM/weight 与官方发行版**完全一致** ⇒ 确认是**同一字体被裁过**而非换了字体。随后从 npm 包 `@fontpkg/tsanger-yu-yang-t`（5 字重，W05 = 1,553,124 B / 7018 字形 / 7049 码位）重制三个候选：

      | 方案 | 取字范围 | 码位 | 体积 |
      |---|---|---|---|
      | A | 仅游戏用字 | 2611 | 291.7 KB |
      | B | 游戏用字 ∪ GB2312-80 | 6985 | 837.7 KB |
      | **C ✅ 采纳** | 完整字库 | 7046 | 839.4 KB |
      | （对照）线上旧文件 | — | 2352 | 261.6 KB |

      **选 C 而不是 A 的理由**：C 比 B 只多 **1.7 KB**，比 A 多 548 KB 但换来「以后新增任何 GB2312 内文字都不会再回退」——A 方案只要下次加词就又破功，属于**会复发的修法**。包体 11.18 → 11.73 MB，仍远低于 TapTap 20 MB 上限。
    - **③ 结果**：可见文案缺字 **381 → 7**，且这 7 个是**渔阳体本身就没有的字**（`槃 誰 輪 窸 窣 啰 炁`，共 8 处），**改文案可归零，处置见 `tools/font_allowlist.txt` §三**。其余 71 个「缺字」是 emoji / 几何 / 数学符号，任何中文字体都没有，走系统字体渲染**属正确行为**，已写进豁免表。
    - **④ 防复发（本轮真正的产出）**：
      - `tools/font_coverage.py`——**只看玩家可见文字**的覆盖率守卫。`.js` 先剥 `/*…*/` 与 `//` 注释再只取 `'…'`/`"…"`/`` `…` `` 字面量内容；`.html` 剥 `<script>`/`<style>` 后取文本节点 + `title|placeholder|alt|aria-label|content` 属性；`.css` 只取 `content:` 值。**报告模式**看缺字，**`--check` 模式**遇未豁免缺字即 `exit 1`。
      - `tools/font_charset.txt`——字体 cmap 导出成纯文本（7017 字，一行），**让守卫不依赖 fontTools**，任何机器 clone 下来就能跑。
      - `tools/font_allowlist.txt`——96 行豁免表，分「emoji / 符号形态 / 待裁定汉字」三组，每行都写了豁免理由。
      - `css/style.css` 的 `@font-face` 上方写了**维护警告注释**：切勿再次子集化 + 新增内容后必须跑 `--check`。
      - 当前基线：可见文字 2488 字、缺 78、**豁免 78、未豁免 0 ⇒ 守卫通过**。
    - **⑤ 天榜 / 云存档整体下线（改走纯本地）**：用户明确授权删除。摘除范围按「**退役项必须连消费点一起摘**」的既有约定做全量清理，而不是只删数据定义：
      - `js/backend-api.js` 整文件 `git rm`（198 行，原提供 `window.DedaoAPI` 的 `register/submitScore/fetchLeaderboard/fetchMyRank/uploadSave/downloadSave`）。
      - `js/ui.js` 六处：`endLifeFlow()` 里的 `reportToCloud()` 调用；整块 `reportToCloud()` + `appendLeaderboardSection()` 定义；`renderSettlement()` 里的 `appendLeaderboardSection(wrap)`；`doUploadToCloud()` / `doRestoreFromCloud()`；存档弹窗的「云存档」按钮行；以及**新增 `purgeLegacyCloudKeys()` 并在 `boot()` 调用**，清掉旧版写进 localStorage 的 `dedao_api_identity`（内含道号与 api_key，**属个人数据残留，不清就是隐私披露义务**）。
      - `index.html` / `index_pc.html` 移除 `backend-api.js` 的 `<script>`，并加了字体 `preload`（`<link rel="preload" as="font" type="font/woff2" crossorigin>`）避免 FOUT 抖动。
      - `sw.js` 的 `ASSETS` **本来就没收录** `backend-api.js`，所以只需 bump 缓存号，无需改清单。
      - **顺带纠正一条既有判断**：`BASE_URL = window.DEDAO_API_BASE || ''` ⇒ 线上其实是**同域请求**，容器里没有后端，`fetchLeaderboard` 恒返回 `null`，天榜**从来就只显示**「天榜寂寥，尚无人留名。（无法连接云端）」。也就是说这套东西在线上**一直是死交互**，删掉没有任何体验损失——这也让「不收集个人信息、数据仅存本地」的最简隐私政策成立。
    - **⑥ 防回归**：`test/automated/11-dead-config.test.js` 新增用例「天榜/云存档退役：源码零残留，且旧身份键有清理者」，五重断言：`js/backend-api.js` 必须不存在；`js/ui.js|engine.js|data.js|index.html|index_pc.html|sw.js` 剥注释后不得含 `DedaoAPI|backend-api|fetchLeaderboard|fetchMyRank|submitScore|uploadSave|downloadSave|reportToCloud|appendLeaderboardSection|DEDAO_API_BASE`；UI 文案「万道争锋/叩问天榜/上传云端/从云端恢复/自云端归来」不得残留；结算页 `settle-section` 计数 ≤4；`purgeLegacyCloudKeys` 存在且被调用。
      **踩坑**：守卫第一次是**红的** —— `js/ui.js` 里我自己写的说明注释提到了 `backend-api` 这个旧文件名。修法是**在测试里先剥 JS 注释再扫标识符**，这样既保住人看得懂的留痕注释，又能真的抓代码残留。
    - **⑦ 双版本序列**：`?v=134 → 135`、`dedao-v172 → v173`（两条序列独立递增，本次同时 bump）。两份 dist 与 taptap zip 三处已核验一致。
    - 测试 **252/252** + `11` 模块 **36/36**；字体守卫 `--check` 通过。commit `d7ca755`。

54. **字体覆盖清零：把渔阳体缺的 7 个汉字全部改写为字库内用字（2026-09-15，承接 #53）**：
    - **① 为什么要做**：#53 修完字体后，可见文案仍缺 **7 个汉字 / 8 处**（`槃 誰 輪 窸 窣 啰 炁`）—— 这 7 个是**渔阳体本身就没有**的字，会回退宋体，也就是「字体不统一」这个原始问题的**最后残留**。只修字体不动文案，问题没关死。
    - **② 逐处改写（语义等价，非"优化"）**：

      | 原字 | 位置 | 改为 | 依据 |
      |---|---|---|---|
      | `誰` | `data.js` 玉符对话「是誰给你的？」 | **谁** | 全游戏其余处均为简体，此处系笔误 |
      | `輪` | `data.js`「刻着同一个字：輪」 | **轮** | 按简体统一（原疑为刻意用古字，非硬设定） |
      | `窸` `窣` | `data.js`「腐叶发出窸窣声」 | **沙沙** | 窸、窣均不在 GB2312；「沙沙声」为常规写法 |
      | `啰` | `data.js`「几个小喽啰在分赃」 | **罗** | 「喽罗」是合法异形词，且罗在字库内 |
      | `槃` | `data.js` 朱雀诀「朱雀涅槃，浴火重生。」 | **朱雀焚身，浴火重生。** | 槃不在 GB2312，**无同义字可换**，只能换词；保留核心句「浴火重生」 |
      | `槃` | `data.js` 浴火遁「浴火重生，凤凰涅槃。」 | **浴火重生，焚身遁形。** | 同上；该术是**遁术**，改后顺带更贴语义 |
      | `炁` | `data.js`「竟悟得一丝运炁之法」 | **引气** | 炁不在 GB2312；「引气」是修真文的标准用词，语义等价 |

    - **③ 结果**：可见文案缺字 **78 → 71**，其中 **71 个全部是 emoji / 几何 / 数学符号**（本就该由系统字体渲染，见豁免表一、二节），**缺字汉字归零** ⇒ 「同一屏两套字形」的问题**彻底关死**。守卫口径：可见文本用字 2479，缺 71，豁免 71，未豁免 0。
    - **④ 留下的痕迹（重要）**：这 7 处改写理由**逐条写进了 `tools/font_allowlist.txt` 第三节**，并注明「若要恢复涅槃 / 运炁这类写法，只能接受该处回退宋体，或整体换一款含 GBK 扩展区的字体 —— 后者牵动整个项目的字体选型，不要单独改」。所以将来有人想改回去，先看那里。
    - **⑤ 顺带同步**：`剧情梳理.md` 里的镜像文案（「腐叶发出窸窣声」）一并改正，避免文档与实现漂移。
    - 缓存 **v137/dedao-v175**。测试 **255/255**；字体守卫 `--check` 通过。
    - **⑥ 方法论留痕（可复用）**：**改文案这种"看起来是内容问题"的活，先跑一遍覆盖率守卫拿到精确的「字 — 次数 — 出现文件」清单，再逐条改**。比通读全文找生僻字可靠得多，而且改完能立刻用同一条命令验证归零。

55. **战斗状态图标方案收尾：Emoji 字体兜底 + 图标对照表 + `03-ui` 端到端徽章回归（2026-09-15，执行 `DEDAO_战斗状态图标_方案.md` §8）**：
    - **① 为什么还有这一轮**：图标本体的实装在 #51，方案 §8 留了三项收尾未做 —— ① 缺 Emoji 字体兜底（方案自列风险 #1）；② 图标/文案散在引擎里，缺一份可对照的独立文档；③ **最要紧的一项：`03-ui` 没有任何用例把徽章真的渲染进 DOM**，此前只在 `11` 模块测了 `Engine.battleFxList` 的纯派生输出 ⇒ **渲染层整条链路其实是裸奔的**。
    - **② Emoji 兜底**：`css/style.css` 的 `.buff .bf-ic` 补字体链（`Apple Color Emoji` / `Segoe UI Emoji` / `Noto Color Emoji` / `Twemoji Mozilla` / `EmojiOne Color`），修部分安卓 WebView 与老 iOS 把图标渲染成黑白或方块。
      方案原拟的「窄屏隐藏 `.btxt`」**未采纳**：本实现把层数/回合并进了 `.bf-tx`（「灼烧 2 层」「攻击 +12%」），隐藏它会**连数值一起丢** —— 与「图标 + 名称 + 层数」的展示口径直接冲突，理由已写进 CSS 注释。
    - **③ 新增 `DEDAO_战斗状态图标对照表.md`（单一事实来源）**：15 枚徽章的图标/文案/`tip` **逐字取自 `Engine.battleFxList()`**（不是设计稿转抄，避免文档与实现漂移）；按「我方增益 5 / 我方减益 4 / 敌方减益 4 / 敌方增益 2」分组；并收录三类容易反复踩的口径：**不进徽章的黑名单**（`slow` 死状态 / `guard` 常驻 / `mechanic` 固有特性 / `heal`·`mpRestore` 瞬发）、**眩晕 💫 与冻结 ❄️ 凭什么能分开**（共用 `stunNext`，靠只用于展示、不参与结算的 `stunKind`/`pStunKind` 区分；旧存档回落 `'stun'`）、**Emoji 兜底与防回退守卫表**。大表第二节末尾补链到该文档。
    - **④ `03-ui` 端到端用例（本轮真正的产出）**：两条新用例走**真实点击链** —— 续档 → `btn-explore` → 弹窗「入秘境（2行动）」→ 章节层连点 → `.adv-node.selectable` 里的战斗节点 → `openBattle` → `b-spell` → 点法术 → 断言 `#b-me-buffs` / `#b-enemy-buffs`。
      - **用例一**：开战两行皆空 → 施放**玄阶·岩甲术**（纯自身 `defUp`、无 dot）→ 我方出徽章（`.bf-ic` 非空 / `title` 非空 / 不带 `bad`），**敌方行为空**。这一条正是防回退线：旧版两行同读 `bb.buffs`（`bb === S.battle`）而 `s.battle.buffs` **全仓库从未被写入**，徽章恒为空。
      - **用例二**：施放**黄阶·火球术**（自身 `atkUp` + 敌方 `dotBurn`）→ 我方「⚔️攻击 +12%」、敌方「🔥灼烧 1 层」，**两行内容必须不同**、敌方必须带 `bad`、我方不得带。
      - **踩坑 1（秘境不能续档）**：`js/ui.js` 读档时会把 `adv.status === 'running'` 直接置为 `'done'`（两处），所以**无法**用「预置一份含进行中秘境的存档」进战斗，必须在同一次会话里走完；章节层的连点也不能省。
      - **踩坑 2（首层不一定有战斗）**：`advGenLayer` 的池子里战斗虽占 5/16，但先 `shuffle` 再取**前 3 个去重类型**，约三成抽不到 `combat`。修法是**在点「入秘境」之前**把 `win.Math.random` 换成固定 LCG —— 让秘境地图的随机源与「启动到此刻消耗了多少 rand」解耦。这比「挑一个固定种子开机」稳得多：后者依赖前面所有随机调用的次数，改一行无关代码就可能翻车。
      - **踩坑 3（新号无法术）**：`combatStart` 的法术栏来自 `equippedShufa(s)`，新号是空的（按钮显示「法术(无)」且 disabled）。故加 `battleSave()`：**只生成一次并缓存**的预置存档（`techs` 与 `techEquip.shufa` 都要写 `yanjia`/`huoqiu` —— 因为 `ensureTechEquip` 会按 `s.techs` 过滤 `shufa`；`ling=15` ⇒ `mpMax≈300`，够放「岩甲术 50 + 火球术 35」）。两条用例共享这一份，省掉一次 jsdom 启动。
    - **⑤ 反向验证（证明用例不是空转）**：

      | 变异 | 结果 |
      |---|---|
      | `renderBuffs('b-enemy-buffs', fxl.foe)` 改回 `fxl.me`（复刻旧「敌我同源」bug） | **42/44**，两条用例共 5 条断言同时红 |
      | `ic.textContent = x.icon` 置空 | **42/44**，两条用例的「图标不得为空」各红 1 条 |

      两次变异均已还原，并用 `tr -d '\r' | md5sum` 与 `HEAD:js/ui.js` 逐字节比对确认无残留。
    - **⑥ 分工不变**：用例只断言「结构 + 数据源 + 敌我隔离」；尺寸/配色仍归 Edge 探针（与 #51 同一分工），jsdom 量不出几何就不硬量。
    - **⑦ 缓存**：`v137 → v138`、`dedao-v175 → v176`（**两条序列独立递增**）。注：我先在工作区把 v135 改到 v136，随即被并行会话的 #54 提交顺带带走并升到 v137，故本轮顺延一档 —— 这也是**多个会话共用一个工作区时，改版本号必须重新读取当前值**的现场教训。
    - 测试：主仓库 **255/255**（`03` 模块 **44/44**，新增 2 条）；`dist/taptap/dedao` **255/255**；`dist/DEDAO_release` 首跑撞上并行会话 `rmtree` 重建交付目录、`index.html` 瞬时缺失 → 31 条 `ENOENT` **假红（并非真实缺陷）**，目录稳定后复跑 **255/255**。
      **教训**：用 `DEDAO_ROOT` 指向 `dist/` 跑测试时，**必须先确认没有别的进程在重建该目录**；`ENOENT index.html` 是"目录正在被重建"的指纹，不是代码问题。

56. **数据一致性审计：「文案里硬编码的总数」是一类独立漂移源 —— 修 2 处玩家可见错文案 + 命格索引与引擎逐行校核 + 项目简介数量刷新（2026-09-15，承接 #55 收尾后的自查）**：
    - **① 起因**：#55 收尾后做了一轮**「文案里的数字 vs 数据表实际条目数」普查**。结论是这类漂移**靠人读永远查不全**，必须用脚本对接。
    - **② 两个玩家可见的错文案（本轮最硬的产出）**：

      | 成就 | 原文案 | 数据实况 |
      |---|---|---|
      | `fabao_da` 法宝大成 | 拥有全部**四十四**件法宝 | `ARTIFACTS` **47** 件 |
      | `mingbo` 命格博览 | 集齐全部**四十七**个命格 | `DESTINIES` **46** 个 |

      两处都是「改了数据、忘了改文案」。`fabao_da` 尤其隐蔽：判定用的是 `allArtifacts.every(...)`（**动态**），
      **成就本身没错，只有文案在骗玩家**。
      **修法不是「把数字改对」**（那样下次加一件法宝又会漂移）：新增 `09` 套件用例
      「成就文案『总数』与数据表动态一致」——解析 `desc` 里的中文数字（含「十六」这类，
      自写 `cn2int` 支持 十/十六/四十七），与 `Object.keys(ARTIFACTS).length` / `DESTINIES.length` /
      仙阶数 / 灵物数 / 秘境数**动态**比对，覆盖 6 条文案
      （`fabao_da`/`xianqi_man`/`wanmei`/`mingbo`/`quanjing`/`shou_cang`）。
      后两条（灵物四件 / 仙阶四件）当时是**对的**，但此前没有守卫，下次加灵物就会错，故一并纳入。
      **变异验证（均已还原）**：改回「四十四」→ 期望 47 实际 44 红；改回「四十七」→ 期望 46 实际 47 红；
      **给 `ARTIFACTS` 加 1 件 → 期望 48 实际 47 红**（这条证明断言是「动态计算」而非写死）。
    - **③ `命格索引.md` 与 `DESTINIES` 逐行校核（46 = 46，漂移清零）**：新增两个可复用探针
      `_probe/audit_destiny_doc.js`（id / 名称 / 品阶）、`_probe/audit_destiny_attr.js`（属性列，
      带「全属性+N」等价判定与全角负号归一，`exit 1` 可当门禁）。修正的漂移：
      - **整表停留在「福源」时代**：该资源早改名为**灵力**（`福源` 在 `js/` 里出现 **0** 次），文档 5 处；
      - **3 个命格被改过名**：财星高照→**灵星高照**（`caixing`）、聚宝盆→**聚灵盆**（`jubao`）、天生福星→**天生灵星**（`tianshengfx`）；
      - **1 条幽灵行**：`shafadj`（金·杀伐果断）—— 该 id 在当前 `DESTINIES` 中**不存在**（仅历史提交留有痕迹），
        而真正的杀伐果断是白阶 `shafa`（暴击+2%）→ 删行；
      - **3 条漏填属性**：`wanfabuqin` 体魄+3 / `zhanshen` 神识+3 / `wanjian` 神识+3（文档属性列写 `-`）；
      - **数值不符**：`tianming2` 文档「福源+3」实为**灵力+2**；`jiutian`/`xiantiandao`/`tiandao` 文档写「全属性+2」，
        引擎是**混合值**（`jiutian` 甚至带 **体魄−1、遁速−1**）。
      - 另在文档里写清「**同名不同阶**」是刻意设计、**不要当重复条目清理**：追风逐电 `zhuifeng`/`zhuifeng2`、
        先天道体 `xiantiandt`/`xiantiandao`、天命之子 `tianming`/`tianming2` —— 匹配**用 `id` 不要用名称**。
    - **④ 挖出 1 项「文档写了、代码完全没有」的待裁定项**：`xiantiandao`（金·先天道体）
      文档写特效「每年灵石+25」，而引擎该条目**没有 `effect` 字段** ⇒ **效果未实现**。
      另有 3 条特效数值口径整体重做过（`wanjian` / `zhanshen` / `wanfabuqin`），文档停在旧数值。
      **这 4 项本轮未改代码**，已逐条列进 `命格索引.md` 文末「与实现的差异记录」，等用户裁定（补代码 or 改设计）。
      原则也写进文档：**要改就改代码，不要把文档改回旧数值**，否则下次比对又报漂移。
    - **⑤ `DEDAO_项目简介.md`（求职简历附件）数量刷新**：原写「39 件法宝 / 75 项用例 / 75/75 通过」，
      实为 **47 件 / 255 项 / 255/255**（`39` 是 2026-09-13 的口径）。内容规模同时补全为**可核对的实数**：
      99 事件 / 47 法宝 / 46 命格 / 93 功法（心法37·术法41·遁术15）/ 28 天赋 / 22 配方 / 5 秘境，
      并在文末写明**口径来源（`js/data.js` 各表）与核对命令**，避免下次再漂。
    - **⑥ 顺手修正 4 处过期注释 / 图例**：
      - `js/ui.js` 的 `/* 锻体系统UI（未实装） */` —— **两处都错**：① 该块其实是**百艺**
        （灵田 / 炼丹 / 炼器 / 阵法），锻体页在 `renderDuantiPage()`（约 L2024）另成一节；
        ② 锻体**早已实装**（`S.flags.duanti` 解锁、《锻体诀》页、`Engine.duantiInfo`，且有 `03-ui` 用例在守）→ 改正并写明来历。
      - `DEDAO_法术新机制方案.md` 仍写第八节「BOSS 属性倾向与 BOSS 法术实装」**未实装** —— 其实 2026-09-13 就实装了 → 更正。
      - `DEDAO_法术效果全等级大表.md` 的状态图例写成「✅实装 = 已落地；✅实装 = 待拍板实装」——
        **两个标记字面完全相同、图例自相矛盾** → 改为「本表全部已实装」并说明两标记的由来。
      - `DEDAO_三方案推进对齐_2026-09-13.md` 顶部加**快照声明**（39 件 / v94 / 194 是当时口径，现为 47 件 / v139 / 256）；
        表格里的旧数字**保留为历史记录**，不改成现值。
    - **⑦ 缓存**：`v138 → v139`、`dedao-v176 → v177`。测试：主仓库 + 两份 dist 三跑 **256/256**（`09` 模块新增 1 条）。commit `d4384e3`。
    - **方法论留痕（可复用）**：**「文案里的数字」是一类独立的漂移源 —— 先写脚本把「文案中的中文数字」与
      「数据表长度」动态对接，再逐条改，最后让同一条断言长期守住。** 本轮两个真实 bug（44 vs 47、47 vs 46）
      都是脚本先发现的，人读表格根本看不出来。同类守卫已有：`tools/font_coverage.py`（缺字覆盖率）、
      `_probe/audit_destiny_*.js`（命格表）。**下一步可推广**：法宝 / 功法 / 秘境 / 宗门等其他数据表若出现
      「全部 N 个」式文案，都该纳入同一守卫。（→ **当天就做了，见 #57**）

57. **文案/文档「硬编码数字」普查第二轮：成就「阈值」双侧夹逼 + AGENTS.md 模块表计数自动对账（2026-09-15，承接 #56）**：
    - **① 起因**：#56 只守住了「文案里的**总数**」（「全部 N 件」）。顺着同一思路普查，发现成就表里还有
      **第二类、也更危险**的漂移源 —— **阈值**。
    - **② 两类漂移源的危害不同（本轮最重要的区分）**：

      | 类别 | 例子 | 玩家体感 | 守卫手段 |
      |---|---|---|---|
      | **总数**漂移 | 「拥有全部四十四件法宝」而实为 47 | 看着别扭，数字明摆着不对 | 文案数字 ↔ 数据表长度**动态比对** |
      | **阈值**漂移 | 「习得十五部功法」而引擎要 16 部 | **玩家照着文案刷，成就永远差一步，且不会怀疑是文案** | **N-1 / N 双侧夹逼** |

      文案与代码是两处独立写的数字：`js/data.js` 的 `desc` 与 `js/engine.js` `achDefs` 里的比较常量。
      只改一边就漂，且**没有任何编译期约束**。
    - **③ 新增 `09` 用例「成就文案『阈值』与引擎开关点双侧夹逼」**：覆盖 **18 条**阈值型成就
      （`daofa_3k`15 / `wanfa`30 / `sanxiu_dao`6 / `fabao_cang`15 / `shiming`10 / `sanshiming`30 /
      `busi`10 / `pingjie`5 / `shanhe`50 / `jingshi3`3 / `wangu`10 / `jishan`100 / `fujia`500 /
      `ai_renzi`200 / `chang_sheng`300 / `baiyi_tong`5 / `lingtian`5 / `sanjie`3）。
      做法：① 从 `desc` 抽数字（中文数字**与半角阿拉伯数字都要认**），要求引擎实际阈值 N 在其中；
      ② 构造存档使计数器 = N-1 → 必须 `false`；= N → 必须 `true`。
      **审计结论（可引用）：当前 18/18 全部一致，文案与引擎零漂移。**
      两者被有意同时改大改小（策划调平衡）不会误报 —— 这正是要的。
      非空转验证（均已还原）：引擎侧 `daofa_3k >= 15` 改 `>= 16` → 红；文案侧「一百轮回点」改「二百」→ 红。
    - **④ 同一轮发现 `AGENTS.md` 自己的「测试模块表」也在漂**：12 个模块里 **7 个**例数是错的
      （`03` 写 32 实为 **44**、`11` 写 24 实为 **36**、`09` 写 6 实为 8、`02` 51→55、`01` 21→24、
      `07` 9→10、`12` 16→17），同段落「当前 223/223 全过」也早该作废（实为 **258**）。
      **这张表是 agent 判断「哪个模块守住了什么」的依据，写小了会让人以为那里没覆盖** —— 比成就文案危害更大。
      修法同样不是「把数字改对」：新增 `01` 用例「AGENTS.md 测试模块表用例数与实际一致」，
      数每个测试文件里 `S\.case\(` 的出现次数与模块表该行比对。
      - ⚠ **踩坑**：守卫第一次跑把 **01 自己**数成 26（实际 24）—— 因为我在**注释里写了未转义的字面量**
        `S.case(`，被自己数了进去。注释里必须写转义形式 `S\.case\(`。
      - ⚠ **锚点**：`AGENTS.md` 只在仓库根有（`dist/` 副本不含），故守卫锚定
        `path.join(__dirname,'..','..')` 而非 `ROOT` —— 这样主仓库 / 两份 dist 三种跑法都校验同一份文档
        （用 `ROOT` 会在 dist 跑时 ENOENT）。
    - **⑤ 顺带发现（不改，仅记录）**：`baiyi_tong`「（等级≥5）」与 `lingtian`「（深度≥5）」的**括号内注记用半角数字**，
      而成就表其余全用中文数字。这是括号注记的**统一子体例**（两条一致），不是漂移；但解析器必须容忍半角数字，
      否则会把这两条误判为「文案里找不到阈值」。
    - **⑥ 交付**：测试 **258/258**（`09` +1、`01` +1）。**本轮只改 `test/` 与 `*.md`，按交付 skill 第 11 行
      「只改 tools/ test/ *.md 时不用 bump 版本」→ 不动 `?v=` / `dedao-vNNN`、不同步 `dist/`**
      （已核验 `js/ css/ index*.html sw.js dist/` 全部干净）。
    - **方法论留痕（可复用，建议发展成固定检查）**：**「数字」在项目里有三种存在形式 —— ① 代码常量、
      ② 数据表长度、③ 文案/文档里手抄的字面量。①↔② 由引擎保证，③ 谁都不管。** 故凡是在 `.md` / `desc` /
      注释里"手抄"的数字，都要么删掉、要么配一条对账断言。已建成的对账守卫：`09`（成就总数 + 阈值）、
      `01`（AGENTS.md 模块表计数）、`tools/pool-audit.js`（池子体检）、`tools/font_coverage.py`（缺字覆盖率）、
      `_probe/audit_destiny_*.js`（命格表）。

58. **「手抄数字」普查第三轮：定向检查 vs 全仓裸扫 —— 简历附件 4 处失实（含我自己上轮写错的 2 处）+ 一条否定性结论（2026-09-15）**：
    - **① 起因**：#57 留的「下一步可推广」是"其他数据表 / 文档也该纳入"。于是先写了个**全仓库文档裸扫**探针
      （`_probe/audit_doc_numbers.js`），扫 42 份 `*.md`、命中「数字+实体」88 处、告警 **69** 处。
    - **② 否定性结论（省下次的时间）：裸扫不可行，本类守卫只能定向。** 正则法**两头都不成立**：
      - **漏报**：`47 件可收集法宝` —— 量词与实体间夹了修饰词「可收集」，匹配不到（**真声明反而漏掉**）；
      - **误报**：`### 4.3 命格池` 被读成「命格 3 个」、`初始可装备3个法宝` 被读成"法宝总数 3"、
        `6 个秘境 BOSS` 被读成"秘境 6 处" —— 69 处告警里几乎全是章节号 / 上下文数量 / 历史方案口径。
      **结论：不要写「扫全部文档」的对账脚本**；正确做法是选定「宣称**当前总量**」的那一句，逐项与数据表对比。
    - **③ 定向检查立刻抓到 4 处真失实，全部在 `DEDAO_项目简介.md`（对外简历附件）** ——
      其中 **2 处是 #56 我自己改文档时写错的**，属"改文档引入的新漂移"：

      | 位置 | 原写法 | 实况 |
      |---|---|---|
      | 内容规模 | **28 个轮回天赋** | `REINCARNATION` = **14**；**28 其实是旧「开局命格」表 `TALENTS` 的条数**（张冠李戴） |
      | 内容规模 | **99 个游历奇遇事件** | 99 是**全部随机事件**；游戏内「游历」口径只有 **68**（`jiyuan` 30 + `shejiao` 38） |
      | 用例数 ×3 | 255 项 / 255/255 ×2 | 已到 **258**（加本轮的守卫后为 259） |

    - **④ 关键新知识：`TALENTS`(28) 不是「天赋」，是旧命格系统。** 三张表极易混：
      `TALENTS` **28**（旧·开局命格，凡命/本命/奇命/极命/仙命；`js/data.js` 表头注释「开局命格（品质分级）」
      与 `engine.js:748`「旧命格（TALENTS）」均可证）/ `DESTINIES` **46**（现行命格）/
      `REINCARNATION` **14**（轮回天赋，轮回点购买；另有 `INIT_EXP` 4 项开荒经历）。
      **写文档前先确认数字出自哪张表。**
    - **⑤ 新增守卫**：`01` 用例「DEDAO_项目简介.md（对外简历附件）的数量口径与数据表一致」——
      定向断言 **11 项**（随机事件 / 游历奇遇 / 法宝 / 命格 / 功法 / 轮回天赋 / 配方 / 秘境 / 成就 /
      用例总数 / 通过数），期望值全部**现算**；锚定仓库根（dist 副本不含此文档，找不到则 `note` 跳过）。
    - **⑥ 交付**：测试 **259/259**（`01` +1）。仍只改 `test/` + `*.md` → 不 bump、不同步 `dist/`。
    - **⑦ 变异验证（两侧）**：文档侧「66 个成就」改「65」→ 红；数据侧给 `ARTIFACTS` 注入 1 件 → 48，
      断言随即要求文档写「48 件可收集法宝」→ 红（证明期望值**真读数据表**）。
      ⚠ **踩坑**：用通用正则改 `data.js` 很容易匹配到**别的表**的第一条条目 —— 我第一次就这么注入错了位置，
      `ARTIFACTS` 数量没变 → 守卫不红，**变异"看起来通过"却完全无效**。变异注入必须**按表边界**精确定位。
    - **方法论补充**：定向守卫的**成本**是为每份文档手写一行期望；**收益**是零误报、报错信息可直接执行。
      故只在「对外可见 + 宣称当前总量」的文档上做（目前两份：`AGENTS.md` 测试模块表、`DEDAO_项目简介.md`）；
      历史方案类文档（`PLAN_*` / `*_2026-09-1*`）里的旧数字**保留为历史记录**，不纳入对账。

59. **第四大 bug 类：`tools/` 镜像脚本与引擎分叉 —— 一张错误镜像污染了四张文档表（2026-09-15）**：

    - **起因**：承接 #58 的"手抄数字"普查，去看 `DEDAO_三方案推进对齐_2026-09-13.md` 的 P1/P2 遗留项，
      其中 P1「轮回 §九 平衡表用实际公式重算」要求跑 `tools/reinc_validate.js`。**一跑就发现脚本自己是错的。**
    - **实锤（三处分叉，同时存在）**：

      | # | 脚本写法 | 引擎实际 | 后果 |
      |---|---|---|---|
      | ① | `Math.floor(s.broken / 3)` | `Math.min(10, s.tribPassed * 3)`（`engine.js:4730`） | `s.broken` 是**突破次数**（每次小阶提升 +1），`s.tribPassed` 才是**渡劫次数**（金丹劫/元婴劫/飞升劫，至多 3）。**引擎里有同源前车之鉴** —— 成就 `sanjie` 曾误用 `s.broken`（`engine.js:4801` 有专门注释）。 |
      | ② | 无 | `endMul`：飞升/仙 **1.2**、打破轮回 **1.5**（`engine.js:4740`） | 飞升场景偏低约 27% |
      | ③ | 漏 | `+ Math.round(exploreKills * 0.05)`（`engine.js:4696`） | 秘境击杀分丢失 |

    - **净效应**：脚本输出的 `jie0` 列 `6/18/34/55/129` **整列是错的**（正确 `6/18/37/61/164`），
      而 `DEDAO_轮回结算重做_方案.md` 的 **§7.1 / §7.2 / §7.3 / §九 四张表**全部照抄它 →
      **一张错误镜像污染了四张文档表**。更隐蔽的是**脚本自己那条「全部天赋全满 = 1406」断言长期报 ❌**
      （实测 **1296**），因为它不在 `run.js` 的视野里，红了几百天没人看见。
    - **为什么必须单独立类**：`tools/reinc_validate.js` / `reinc_sim.js` / `player_sim.js` 是**手抄引擎公式的镜像**，
      住在 `tools/`、不被任何测试导入、也没有约束它们与 `js/engine.js` 一致的机制 → 可以静默地产生整列错数据，
      而**所有文档都引用它们的输出**。这与 #56/#58 的"文案手抄数字"是同一根源（第三份副本），但危害更大：
      它不是抄错一个数，而是**一个错公式持续产出错数**。
    - **修法（两层，缺一不可）**：
      1. **脚本内加「读文档断言」**：`reinc_validate.js` 新增**测试7** —— 读 `DEDAO_轮回结算重做_方案.md`，
         逐场景断言表内数字 == 实算值。**文档 ↔ 实算**被绑死，改任一侧不跑脚本就红。
      2. **进常规测试视野**：新增 **`test/automated/13-tools-reinc.test.js`（1 条用例）**，
         `execFileSync(process.execPath, [tools/reinc_validate.js])` 断言 **exit 0 且含 `0 失败`**，
         并把脚本输出最后一行作为 `t.note`（红了能直接在报告里看到是哪一项）。
         脚本天然锚定**仓库根**（`tools/` 与目标文档都只在仓库有，两份 `dist/` 都不含），
         故该用例在任意 `DEDAO_ROOT` 下校验的都是仓库那一份 —— 三种跑法结果一致，**无需 skip**。
    - **文档修正**：§二 公式补 `endMul`；渡劫分 `⌊渡劫次数/3⌋` → `min(10, 渡劫次数×3)` 并注明**不得用 `s.broken`**；
      §7.1 `1406` → `1296`；§7.2 / §7.3 / §九 三表按实算重排（加满局数由新 jie0/jie9 重算）；
      标题去掉遗留的「（Plan）」，补状态行「已实装 + 数字由 `reinc_validate.js` 测试7 自动对账」。
    - **同轮 P1/P3 收尾**（`DEDAO_三方案推进对齐_2026-09-13.md` 的遗留清单，逐项核实）：
      - `AGENTS.md` §十八 `treasure` 容量仍写旧值 `bigIdx+1` → 更正为 `maxTreasure` 实式（炼气3/筑基4/金丹5/元婴6，最大 9）；
        §十一/§十八 的「`s.equip.treasure` 才生效、`s.arts` 是不生效库存」**已在早前修对**，无需再动。
      - 法宝设计文档：标题「含 39 法宝池」→ 标注当前 47；字段表 `apBonus` 补注「**通道已通但无数据源**」
        （`Engine.actionPoints` 已 `+artifactStats(s).apBonus`，但 47 件法宝无一提供该字段，实际恒为 0）。
      - 宗门商人方案：合计 `30` → **29**（`SECT_GOODS` 实测；原为笔误）；状态行去掉过期快照「76/76」。
      - **未决项（已写进文档、等用户拍板，本轮不动代码）**：4 件宗门法宝的「**功业翻倍**」决策在代码中**未落地**
        （均 `coin:'stone'` + `stoneFix`，无 `gongye` 字段，玩家实付纯灵石），且 4 件的 `grade` 已在 09-13 重平衡时下调，
        故 §二 表与代码现值不符 → 已在文档顶部加 ⚠ 分歧说明 +「要改就改代码，别只改文档」的口径原则。
      - 攻速类法宝（P2「补一件打通 `getExtraAtkChance`」）**已实现**：`tafeng_lv` 踏风履（辅/地/`atkSpd:10`），
        山河古径「踏风古径」风灵兽掉落。
    - **测试**：**260/260**（新增 `13` 模块 1 条；`01` 模块表对账随之被顶到 13 行 / 260 总数 ——
      守卫链自己逼着我把 AGENTS.md 模块表与 `DEDAO_项目简介.md` 的用例数一起改对）。
    - **本轮只改 `tools/`、`test/`、`*.md`** → 按交付五步**不 bump 版本、不同步 dist**（已核 `js/ css/ index*.html sw.js dist/` 全干净）。
    - **给下次的判据**：① `tools/*.js` 里出现与 `js/engine.js` 同源的**数值常量/阈值/公式** → 疑似镜像，优先纳入 run.js；
      ② 脚本里 `check('... = 常量', x === 常量)` 形式的断言就是"手抄数字"，**改数据后必然过期**；
      ③ 文档写「由 `xx.js` 实跑得」→ **去跑一次**，别信（本次就是跑了一次才发现整列错的）。

60. **承接 #59：把 `tools/` 的镜像彻底拆掉 —— 改用「真加载引擎」，`tools/` 现零公式镜像（2026-09-15）**：

    - **起因**：#59 只修了 `reinc_validate.js` 一个脚本。按它自己写下的判据回头扫一遍 `tools/`，
      **同类分叉不止一个**，而且是同一套错法在三个脚本里各抄了一遍：

      | 脚本 | 分叉内容 | 后果 |
      |---|---|---|
      | `reinc_points.js` | 手抄 earnPoints：`floor(s.broken/3)` + **残留 jie×2 平加** + 漏 `deathPts`/`advPts`/`endMul`；手抄 `REINC_TALENT` 成本 `0/10/20/40/80`（真值 `0/6/12/18/24`） | 「本世合计」整列不可用；100 点红利算出的开荒池也错 |
      | `reinc_sim.js` | 手抄 `REINCARNATION`，六维 **`max:5`**（真值 9）；`floor(state.broken/3)`；SCEN 用 `broken:0/1/3/5/9` 当渡劫次数 | `sixTotal` 算成 **360**（真值 1080）、`allTotal` 也错 → 加满局数整表错 |
      | `player_sim.js` | 文案/标签写「全天赋 **1406**」（真值 1296） | 报告标题印错数（计算本身读 data.js，故只错在字面量） |

      另核 `balance_sim.js` 的 `NEED` / `JIE_DIFF` 与引擎一致（当前未漂移，但仍是硬编码副本）。

    - **正解：不要再镜像，去真加载引擎。** 新增 **`tools/_engine_loader.js`** —— 在 vm 沙箱里
      把 `js/data.js` + `js/engine.js` **拼成一个脚本**加载，直接拿到真 `Engine` 与全部数据表
      （兼容 `DEDAO_ROOT`）。关键坑：**必须拼成一个脚本再跑** —— `js/*.js` 都是顶层 `const`，
      `const` 不挂 `window`，分两次 `runInContext` 第二次取不到上一次的 `const`。
      （该模式本项目已有先例：`detect_sanxianming.js` / `build_battle_preview.js` 各自内联实现过一份。）
    - **三个脚本全部改版**：`reinc_validate.js` / `reinc_sim.js` / `reinc_points.js` 改为数据表直读、
      公式直调 `Engine.settlePoints` / `Engine.earnPoints`。改完 **`tools/` 里零公式镜像**。
      复现"文档口径"（给定成就分 2/4/9/14/48）的办法：**预置 meta** 把其余已达成成就标记为早先已得，
      只留指定几条 → 引擎只把这几条算作"本世新增"，而公式仍出自引擎。
    - **产出交叉印证**：改完的 `reinc_sim.js`（引擎驱动）与 `reinc_validate.js` 各自**独立**算出
      同一组 `jie0 = 6/18/37/61/164`，与方案文档三表一致 —— 两条独立实现互证。
    - **顺带产出一个平衡结论**：同进度下由 `Engine.achDefs` **实际会发的全部成就**（6/11/22/37/63）
      高于文档表用的保守成就集（2/4/9/14/48），故 `jie0` 实为 **10/25/50/84/182**。
      即 **文档 §7.2/§九 两张表属"保守估计"**，飞升实得约 **182** 而非 164。两栏已在 `reinc_sim.js` 并列输出。
    - **第三层守卫（补"跑得通 ≠ 口径对"）**：`13` 套件新增第 2 条用例 —— **静态扫描 `tools/*.js`**：
      ① `reinc_validate/reinc_sim/reinc_points` 三个脚本**必须** `require('./_engine_loader')`；
      ② 命中「已知陈旧写法黑名单」即红：`Math.floor(x.broken/3)`、行尾 `+ jie * 2`、字面量 `1406`。
      ⚠ **扫前必须去注释**（`/*...*/` + 整行 `//` + 行尾 `//`）—— `reinc_validate.js` 的注释里就写着
      `Math.floor(s.broken/3)` 作为"前车之鉴"，不去注释会自己撞自己。
      变异验证三连（均实测变红）：注释掉 loader 引用 / 注入 `1406` / 注入 `Math.floor(state.broken/3)`。
    - **测试**：**261/261**（`13` 模块 1→2 条）。**只改 `tools/` + `test/` + `*.md`** → 不 bump、不同步 dist。
    - **留给下次**：`balance_sim.js` 的 `NEED` / `JIE_DIFF` 仍是硬编码副本（当前值对，会随平衡调整漂移）；
      `player_sim.js` 自带 `equipStats`/`calcAtk`/`calcHpMax` 等一整套公式副本，体量大，尚未迁到 `_engine_loader`。
      两者适用同一处方：能直读就直读，不能直读就改成 `_engine_loader` 的调用。

### #61 — 删掉「突破次数」字段（`s.broken` 全量下线，2026-09-15）

- **诉求**：该字段是**突破次数**（每次小阶提升 +1），除了一处 UI 展示外没有任何玩法意义，
  却反复被误当成「境界判据」和「渡劫判据」用 —— 删掉它，从根上断掉第三次误用。
- **先做的冲突检测（关键）**：用户担心的「小境界突破失败两次后下一次必定成功」规则 ——
  **实测不冲突**。该保底走的是**另一个独立字段** `s.breakFails`：
  `engine.js` 里 `const pity = (s.breakFails||0) >= 2` → 成功清零 / 失败 +1，`ui.js:232` 显示「下次必成」。
  与 `s.broken` **零耦合**。删后保底用例（`02` 套件）实测仍 ✅ 全绿。
- **删了什么**（`js/` 侧 6 处）：
  | 位置 | 原内容 | 处理 |
  |---|---|---|
  | `engine.js` 初始状态 | `broken: 0` | 删 |
  | `engine.js` 小境界突破成功 | `s.broken += 1` | 删 |
  | `engine.js` `dujieWin` 飞升分支 | `s.broken += 1` | 删 |
  | `engine.js` `dujieWin` 金丹/元婴劫 | `s.broken += 1` | 删 |
  | `engine.js` 成就 `dacheng` | `s.idx >= 15 && s.broken >= 3` | → `s.idx >= 15` |
  | `ui.js` `statSheet` / `diffLines` / 结算页 | `statSheet` 删 `broken` 字段；`diffLines`「生涯突破 X→Y 次」删；结算页「一生突破 N 次」→「一生渡劫 N 次」(取 `S.tribPassed`) | 改 |
- **`dacheng`（大乘之路）为什么可以安全去掉后半条件**：`s.idx` 每 +1 必然伴随一次突破，
  走到 `idx=15`（仙）时突破次数早已 ≥ 14 ⇒ `s.broken >= 3` **恒真**，删掉它行为完全等价；
  且成就描述「单世筑基·金丹·元婴·飞升皆圆满」本来就只由 `s.idx >= 15` 表达。
- **顺带清掉的"僵尸赋值"**（字段没了但代码还在写，最误导人）：
  `09-achievements.test.js` 9 处、`02-engine-sim.test.js`、`_repro_adv.js`、`_repro_dev.js`、
  `tools/detect_sanxianming.js`、`tools/reinc_points.js` 的一句 `console.log` 文案。
  ⚠ 教训：清理脚本的兜底正则会**先撞上自己写的注释**（注释里引用了旧字段名）。
  与本仓早先「计数守卫自引用」是同一个坑 —— **守卫扫什么，注释里就别写什么**。
- **新增守卫（`01` 套件第 26 条）**：「已删除的『突破次数』字段不得复活」——
  剥注释后扫 `js/`（跟 `DEDAO_ROOT`，三份复跑各验各的）与 `tools/`，命中 `.broken` 即红。
- **存档兼容**：`saveState` 是 `JSON.stringify(s)` 整存，老存档里残留的该字段**无人读取**，
  属无害死数据；新存档不再写入。无需迁移。
- **同批拍板（用户决策）· 宗门法宝用灵石**：`SECT_GOODS` 里 4 件法宝
  （巨灵腰带 玄/1000、锻骨池 玄/1800、淬神台 地/2000、九转金丹炉 天/6000）**维持纯灵石**
  （`coin:'stone'` + `stoneFix`，无 `gongye`）；原「功业翻倍」语义作废，已按此改
  `DEDAO_宗门商人重做方案.md`（表头口径 + §一价格割裂行 + §二四行法宝 + §三取价规则 + §六/§七），
  **代码未动**。
- **交付**：改了 `js/` → bump 到 `dedao-v178` / `?v=140`，`_probe/sync_dist.py` 同步两份 `dist/`，三份复跑全绿。
- **测试**：**262/262**（`01` 模块 25→26 条）。

### #62 — `tools/player_sim.js` 手抄公式迁移到真引擎（2026-09-15）

- **背景**：#60 留下的尾项。本文件自带 `equipStats` / `artifactStats` / `calcAtk` / `calcHpMax` /
  `calcMpMax` / `cultGain` / `getCritRate` / `getDodgeRate` / `getDefense*` / `talentApply` /
  `effAttr` / `applyWuxing` / `techMult` / `getXinfa*` / `getDestiny*` / `linggenTrait` / `refresh`
  共 22 个引擎公式副本 —— 抄得再像也会漂。本次**全部换成 `Engine.*` 调用**。
- **改动量**：203 行副本 → 41 行调用（`62 增 / 203 删`，净 −141 行）。
- **迁移中实锤的四个坑**（都在**状态构造**侧，公式本身没错）：
  | 坑 | 现象 | 根因 | 修法 |
  |---|---|---|---|
  | ① `ENG.bigIdxOf` 签名 | 四境界 `atk` 全雷同、血量为小数 | `bigIdxOf` 定义在 **data.js:3072**，签名是 `bigIdxOf(s)`（吃**状态对象**、读 `s.idx`），不是境界名 | 改用 `D.BIG_IDX(typeof s === 'string' ? s : s.realm)` |
  | ② `idx` 填成大境序号 | 全表系统性偏低 | 引擎要的是**阶位索引**（炼气前 0 / 筑基前 3 / 金丹前 6 / 元婴前 9），旧镜像的 `bigIdxOf` 读 `s.realm` 所以这个错**一直没暴露** | `idx: bi * 3` |
  | ③ 缺 `s.sectRank` | 血/攻/修炼三项偏低 | 引擎宗门加成由 `sectPassed(s)` 把关（要求非空且非「杂役」），旧镜像**无门**、本文件又从不设 `sectRank` | 按境界映射正式品阶（炼气外门 / 筑基内门 / 金丹真传 / 元婴核心） |
  | ④ 心法只写 `techEquip` 不写 `techs` | `hp` 低 5.7%、`cultGain` 低 1/3 | `ensureTechEquip()`（engine.js:243）会校验「已装备心法是否在**持有列表**里」，不在就清空 `s.techEquip.xinfa` → `getXinfaHpMax` 归 0、`techMult` 退回 1 | `s.techs = [XINFA]` 与 `s.techEquip.xinfa` **同时写** |
  > ④ 是最后一次残留差异，逐项对拍定位到 `xinfaHpMax 新=0 旧=50` 才破案。
  > **教训：迁移不是"换函数"，是"换状态契约"** —— 引擎比镜像多了三道门（`sectPassed`、
  > `ensureTechEquip` 持有校验、`idx` 语义），镜像全靠"自己造的宽松环境"活着。
- **A/B 验证方法**（可复用）：迁移前文件另存为对照模块 → 确认它**逐字节复现原基线** →
  再逐项对拍。这样任何差异都能归因到"公式"还是"状态"，不会在两头乱猜。
- **唯一残留差异（已判定为引擎真值，非 bug）**：引擎 `calcHpMax` 末尾**不取整**
  （`return Math.max(1, m)`），五行阵百分比会算出 `1219.9000000000001`；
  旧镜像多了一次 `Math.round`。已改为**只在显示层取整**，不覆盖 `s.hpMax`，战斗模拟仍用引擎原值。
- **结果**：`SIM_SEED=42 node tools/player_sim.js` 输出与迁移前基线**逐字节一致**。
- **仍属"模拟模型"、本轮不动**（写在文件头注释里，避免后人误判为遗漏）：
  - `combatSim` —— 蒙特卡洛抽样，不对应任何引擎函数；
  - `advEnemy` / `genEnemyStats` / `deathEnemyDynamic` —— 复刻引擎的 `enemyStats` / `deathEnemyGen`，
    但这两个**没从 Engine 导出**（声明在 IIFE 内）。要消掉须先加导出 = 动 `js/` = bump + 同步 dist → 另开一轮。
  - 数据表仍**直读** `js/data.js`（第 1 节）—— 直读 ≠ 镜像。
- **配套守卫**：`13` 模块 `MUST_USE_LOADER` 增加 `player_sim.js`，强制它必须 `require('./_engine_loader')`。
- **交付**：只改 `tools/` + `test/` + `*.md` → **不 bump、不同步 dist**。
- **测试**：**262/262**（`13` 模块扫描项从 3 个脚本扩到 4 个，用例数不变）。

### #63 — `balance_sim.js` 常量普查：五处漂移 + 玩家模型失准，判定退役（2026-09-15）

- **起因**：#60 留下的另一半（「`balance_sim.js` 的 `NEED`/`JIE_DIFF` 仍是硬编码副本」）。
  计划是照 #62 的方子迁一遍，结果普查发现它**早已不是一个"漂移的工具"，而是一个"过期的设计模型"**。
- **五处常量漂移**（均为「工具值 vs 引擎/数据真值」）：
  | 项 | 工具旧值 | 真值 | 后果 |
  |---|---|---|---|
  | 法术 cost 黄/玄/地/天 | 15 / 25 / 45 / 70 | **40 / 65 / 115 / 175** | 低估约 2.5 倍 →「可连续施放」次数翻倍 |
  | 心法 mult 玄/地/天 | 1.40 / 1.70 / 2.10 | **1.5 / 1.8 / 2.3** | 那次"下调"从未落地 |
  | MP 公式 | `20 + 灵×25` | **`20 + (灵-1)×20`** | 前者从未在代码里存在过 |
  | 秘境敌人 | v3 旧公式（挂钩玩家攻/血） | **固定基数 × 深度系数** | 引擎已判定旧式为设计失误并移除 |
  | 死劫 | 14 劫（year 10~140） | **5 劫（18/36/49/64/81）** | v6 起已改 |
  > 法术 **dmg** 旧值恰好等于各品级上限，所以一直"看起来对"；**cost** 才是塌方点，
  > 而"耗蓝够不够"恰是这张表要回答的问题 —— 基于它得出的「耗蓝批量下调已驳回」结论整个失效。
- **更根本的问题：玩家战力模型本身失准。**
  `PLAYER_TABLE` / `GEAR` / `TREASURE` 这套手写曲线算出元婴玩家 **264 攻 / 1665 血**，
  而 `data.js` 的 `ENEMY_REALM_BASE` 元婴档是 **502 / 2629**，其注释明写
  「该境界正常发育玩家的参考攻/血，见 `tools/player_sim.js` 实测」—— 敌人基准是按 player_sim 校准的。
  `player_sim.js` 的元婴正常玩家为 727 / 3327。本工具比校准基准低了近一倍，
  于是它"打不过"是**模型的错**，不是数值的错。
- **处置**：
  1. `balance_sim.js` 常量**全量改为直读 data.js / 调 `_engine_loader`**（与 #62 同一处方），
     并在文件头与运行输出加**退役提示**：秘境/死劫结论一律以 `player_sim.js` 为准，
     本文件仅保留 [A2]（法术可持续施放）与 [C]（心法修炼速度）两项数据查询。
  2. `player_sim.js` 同批次修三处（都是 #62 之后顺带挖出的）：
     - `SPELL_DMG`/`SPELL_COST` 改为由 `TECHNIQUES` 推导（同品级取 dmg 最高者，**dmg 与 cost 必须取自同一条**）。
     - `advEnemy` 改为匹配引擎现行 `enemyGen`（固定基数 × 深度系数），去掉 v3 旧式与 atk/hp 互换。
     - **随机流按档案复位**：原为全局单流，A 档案的战斗抽签会改变 B 档案抽到的命格，
       导致改动任一公式都会让所有档案属性跟着变、**快照差异无法归因**
       （实测只改法术 cost，「单发法术伤害」却从 3123 变 3191 —— 变的其实是命格，极易误判）。
       现用 `FNV-1a(SEED + 档案标签)` 独立复位；蒙特卡洛段必须带样本序号，
       否则 400 个样本抽出**完全相同**的命格（3 仙命占比会塌成 0%）。
- **新增守卫（`13` 模块 `FORBID` +2）**：
  `SPELL_COST` 出现 `黄: 15`（过期耗蓝表）、`hits = (elite ? 5.0`（秘境 v3 旧式）。
- **实测影响**：`player_sim.js` 秘境 d9 BOSS 仍全 100%（结论稳健）；
  死劫 jie6 压力档明显下降（如 死劫4 正常 14%→1%、死劫5 57% vs 87%）——
  这是 **cost 修正后的真实结果**，旧值高估。
- **⚠ 由此暴露的文档↔代码分歧（未决，需拍板，本轮未动引擎/文档结论）**：
  `DEDAO_数值模型_设计稿.md` §六 有两条标着「**已落地**」，但代码里没有：
  | 文档声称已落地 | 代码实测 | 证据 |
  |---|---|---|
  | 心法 mult 下调 玄1.50→1.40 / 地1.80→1.70 / 天2.30→2.10 | 仍为 **1.5 / 1.8 / 2.3**（玄8条/地9条/天9条全未改） | `git log -S "mult: 1.40" -- js/data.js` 为空 |
  | `calcMpMax` 抬高 `10+(灵-1)×20` → `20+灵×25` | 实为 **`20+(灵-1)×20`**（只落了基数 10→20，系数与 -1 都没动） | `git log -S "ling) * 25" -- js/engine.js` 为空 |
  二者都是**数值平衡**改动，须你决定是「补落地」还是「改文档」。
- **交付**：只改 `tools/` + `test/` + `*.md` → **不 bump、不同步 dist**。
- **测试**：**262/262**。
- **另注**：`DEDAO_玩家全量测试报告.md` 的数字**早于本轮就已落后于工具**
  （报告元婴 1489 vs 工具实测 1741，Sep 12 后未同步）。本轮未手工对齐整份报告，
  留作专项：以 `SIM_SEED=42 node tools/player_sim.js` 重新出数并整份刷新。

### #64 — 明亮主题第二轮：暗底页修复 + 云纹角饰（测试版待用户过目，2026-09-15）

- **起因**：用户实测亮版 v141 两页翻车 —— ①角色页战斗属性格淡红标签在暖底上看不清；
  ②秘境页整页棕绿难看、节点中文与「迷雾事件」正文全灭（亮版把 `--gold/--dim/--text`
  全局改深，而秘境层 `#adv-screen` 是暖墨棕暗底 `#3a3020` → 暗底配深字）。
- **根因**：**`.chapter-overlay`（秘境层+迷雾事件层）底色是深墨 `#3a3020`，
  `.chapter-inner` 同为深墨** —— 亮版只改了全局 token，没覆盖暗底页作用域。
- **修法（最终方向：暗底页不再保留暗底，整体并入亮版）**：
  1. `#adv-screen` 与 `.chapter-overlay` 作用域覆盖回**宣纸亮底 + 墨字**：`--text/--dim/--gold/`
     `--panel/--panel2` 局部还原亮版值；`.chapter-inner` 实底 `#fffdf6`。
  2. `ui.js resetAdvBackground`：秘境背景图不再压深墨棕遮罩，改**宣纸亮遮罩**
     `rgba(242,234,216,.88→.94)` 淡显轮廓；无图兜底也改宣纸渐变。
  3. 角色页：`.attr-combat-cell`/`.stat-grid.combat-stats .kv` 半透明暗底 → **实底 `#fffdf6`
     + 墨字标签 `#5a4a30` + 深色数值**；`ui.js` 内联 `#ff9080→#c23a22`、`#ffb84d→#b8791e`。
  4. **云纹角饰**：`.screen::after` + `.chapter-overlay::after` 用双层 radial-gradient +
     conic 画四角云纹（左上/右上/右下/左下），金棕 `rgba(168,121,42,.18)`，`pointer-events:none`；
     `.screen > *` 抬 `z-index:1` 防压字。
- **教训**：**换肤必须按「页面作用域」排查，不能只改全局 token** —— 秘境层/章节层/迷雾层
  都是自带底色的 overlay，全局深字色在暗底 overlay 上必翻车。下次新增 overlay 先问底色。
- **自检**：无头 Edge 截图 `_probe/shot_char.png`/`shot_adv.png`（504×896 CSS 视口）确认
  角色页白底黑字清晰、秘境节点中文/迷雾事件可见、四角云纹在位。
- **交付**：bump `?v=142` / `dedao-v180`；**测试版，dist 未同步**，等用户过目再全实装
  （联动亮化 9 件商店物料 + 玄秘境暗图 AI 重生成）。
- **测试**：**263/263**（并发会话新增法术对账用例后全过）。

### #65 — 用户拍板三件事：结算页「一生渡劫」+ 先天道体每年灵石+25（2026-09-15）

- **① 结算页「一生突破 N 次」→「一生渡劫 N 次」**（`js/ui.js` 结算渲染，line 2650）。
  呼应 #61 下线「突破次数」`s.broken`：突破次数本就是误导概念，结算应展示玩家真正在意的「渡劫次数」。
  取 `S.tribPassed`（金丹劫/元婴劫/飞升劫成功次数），与成就/战斗口径一致。
  （年度回顾 `diffLines` 的「生涯突破 X→Y 次」已于 #61 删除，本轮确认无残留。）
- **② `xiantiandao`（先天道体·金）补 `effect:{ stonePerYear:25 }`**（`js/data.js:3062`）。
  这是 #61 挖出的 **E1 待裁定项**：文档/命格索引写「每年灵石+25」，引擎该条目此前**完全没有 `effect`** ⇒ 效果未实现。
  引擎 `endYear` 已有 `stonePerYear` 年度结算分支（engine.js:4488），UI 命格面板也已支持「每年灵石+25」展示（ui.js:2842/3091）。
  **实测**：`Engine.endYear` 跑一年，带 `xiantiandao` 的玩家 `stone` 50→75（增量 25），无该命格增量 0。✓
- **③ #63 审计轮遗留的「法术大表 dmg/cost 与 data.js 逐条对账」守卫正式收口**（01 模块 26→27 条）。
  此前 `DEDAO_法术效果全等级大表.md` 耗蓝列曾整表漂移 2.5×（41 行），人工校正后落地；
  该守卫把「文档数字 ↔ 引擎真值」钉成常驻回归，杜绝再漂。

- **交付**：改了 `js/`（`ui.js` 结算渲染 + `data.js` 命格 effect）→ bump 到 `dedao-v181` / `?v=143`。
  ⚠ **dist 未同步**：并行会话的明亮主题（#64）明确「测试版，等用户过目再全实装」，
  故本轮**不跑 `_probe/sync_dist.py`**——本轮回合的 js/ 改动与 #64 主题同源、共用同一份
  service-worker 缓存，dist 同步留待你过目主题后一并执行（届时缓存顺推到下一版本）。
  源已提交、缓存号已预留，主题过目后一条 `sync_dist` 即可全量上线。
- **测试**：**263/263**（仅主仓库跑；dist 两份因未同步不参与本轮复跑）。

### #66 — 主题过目反馈：字统一改黑色（2026-09-15 晚）

- **用户过目 #64 明亮主题后拍板**：「字统一改黑色！除了区分装备/法宝/命格的颜色适配外，统一改为黑色；
  需要金色的部分，金色外的方框出白色（参考标题页 DEDAO 方框）」。
- **落地（css/style.css）**：
  1. 基础墨字 token 改黑：`--text #3a3020→#1a1a1a`、`--dim #76684c→#4a4a4a`（保留次级深灰层级，仍单色非彩）；
     并同步覆盖 `.chapter-overlay` 作用域（该作用域原重定义 `--text/--dim`，会让秘境/章节层仍走棕字）。
  2. 亮底上的浅色/彩色阅读文字全部转黑/深：hud-mini、realm-badge、util-btn、arts-tabs/codex 标签、hp-num、
     chap-npc、buff（浅金 `#ffd27a`→黑 `var(--text)`，按阅读文字处理；紫边保留）、travel-msg 三态、ct-sub/ct-bonus、age-kv（深蓝底→亮底黑字）、
     settle/log 浅紫浅蓝分类色（→深紫/深蓝仍可辨类）、empty 占位、VS、char-tab 非选中、adv 节点名/血蓝标签等。
     （注：hud-mini / realm-badge / util-btn / chap-npc / travel-msg / age-kv / VS 等已由并行会话 #64/#65 在亮版中改黑；
      本轮补齐的遗漏项为：arts-tabs 标签、hp-num、.buff、log-line.sect/evtitle/choice（→黑）、
      log-line.omen（浅紫→深紫 `#7a3ea8` 保留语义且可见）、settle-event.realm/sect（→黑）、
      char-tab 非选中（紫→黑）、ct-sub/ct-bonus（→`var(--dim)`）、fighter .fname（→黑）、
      avatar-circle（→黑）、.gear-slot/.equip-slot/.treasure-slot 的 empty 占位（浅 tan→`var(--dim)`）、
      #adv-screen .adv-node .n-name / .adv-vital .who（→黑）、.adv-art-remain 基础版浅金（→`#8a5f14` 对齐 #adv-screen 深金）。）
  3. 修黑字回落导致的暗底翻车：底部导航栏 `rgba(60,40,20,.4)`→亮面板 `var(--panel)`（黑字可读）；成就 toast 深棕渐变→纯白；
     弹窗起名输入框深底金字→白底【金字保留，方框转白】；徽章/锁等边角仍按语义保留。
  4. 金色标题外框转白（参考标题页 DEDAO 方框）：`.logo-frame` 渐变→纯白 `#fff`（金边、`.logo-cn` 金字保留）；
     `ach-toast` 深棕渐变→纯白（金边、金字保留）；起名弹窗 `.name-input` 深底→白底（金字保留、方框转白）。
- **保留（用户豁免项）**：① 装备/法宝/命格品阶区分色（`.g-*` 黄玄地天仙、`.destiny-tag.grade-*`、`.grade-*` 命格卡、节点图标色）；
  ② 金色标题/数值（`.logo-cn`、各 section 标题、`.gold`/`.big-gold`、命格名、部分数值强调）—— 暂视为「需要金色的部分」留金。
- **判断点（已告知用户）**：战斗/血量/状态色（float-dmg、buff.bad、combat-stats 红绿、HP 提示）按「功能性区分色」保留，未强制作黑；
  小型金色数值（`.kv b`/`.stone-val`/`.attr-val`/道具名）暂留金，待用户定夺是否更彻底黑化。
- **交付**：改源码 `css/style.css` + `sw.js`（`CACHE='dedao-v182'`）+ `index.html`/`index_pc.html`（`?v=144`）+ 本日志；
  **dist 未同步**（沿用 #64/#65「测试版等过目」策略，待你本地过目主题后一条 `sync_dist` 全量上线）。
- **验证**：纯 CSS 改色不涉及字位，`font_coverage` 无需重跑；视觉待用户本地 `python -m http.server` 过目。

### #67 — 角色页：默认切装备 + 四选项卡加粗高亮（v145/v183，2026-09-15）

- 字符页四个 tab（属性/装备/法宝/功法）统一 `font-weight:700` 加粗；非选中态描边 `#c9a86a`、浅金底 `rgba(168,121,42,.06)`、字色 `#5a4a2a`，更突出；active 紫底白字 + 阴影高亮保留。
- 默认打开从「属性」改为「装备」：index.html / index_pc.html 的 `.char-tab` 与 `.char-tab-content` 的 `active` 类移至 `equip`（静态默认；`renderCharPage` 只绑 onclick 不重置 active，重开仍保留上次切换）。
- 交付：改 `css/style.css` + `index.html`/`index_pc.html`（?v=145）+ `sw.js`（`dedao-v183`）+ 本日志；dist 未同步（沿用测试版等过目策略）。
- 验证：测试 263/263；字体守卫通过。

### #68 — 标题页玉符删除 + 云纹包每个方框 + 主页面字转黑（v146/v184，2026-09-15）

用户主题反馈（接续 #64/#65/#66/#67）：
- **标题页玉符删除**：`index.html` 移除 `#btn-omen-title`（`.title-util-row` 整行，仅玉符一子）；`js/ui.js` 的 `bindNav` 数组去掉 `'btn-omen-title'`（保留 `'btn-omen-bottom'` 给 PC 代理）；
  顺手删除仅玉符使用的死样式 `.title-util-row` / `.util-btn` / `.util-icon`（grep 确认源码无其他引用）。PC 端 `pc-omen`（右上角）仍保留，玉符详情可从 PC 进。
  ⚠️ 移动端标题页现无玉符入口（功能入口收窄为用户要求）；若想移动端也能看玉符，可挪到角色页。
- **主页面名字转黑**：`.name`（HUD 道号）由 `#fff` → `var(--text)`（此前在亮面板上是隐形白字）。
- **云纹包每个方框（随盒缩放）**：新增 `.panel::after` 四角如意卷云（复用 #64 的 SVG 角饰），`background-size:22%`（百分比 = 随方框尺寸缩放）；
  父级 `.panel{ position:relative; isolation:isolate }` + `::after{ z-index:-1 }` → 云纹落在面板底色之上、文字之下，不挡字。覆盖所有 `.panel`（属性/日志/角色/图鉴/成就/轮回塔/储物袋/装备…）。
  HUD（`.hud`）**未**加云纹，避免压住右上角 成就/图鉴/设置 按钮——如要，可单独补 `.hud::after`。
- **境界 / 成就 / 图鉴 / 设置 转黑**：`.realm-badge`、`.hud-mini`（成就/图鉴/设置 三枚）由 `var(--dim)`(灰) → `var(--text)`(黑)。
  年龄寿元（`.age-kv`/`.age-val`）此前已是 `var(--text) !important`，无需改。
- **背景未动**：`--tint` 遮罩、`data-bg` 背景图、屏级 `.screen::after` 云纹角饰 全部保持（用户「背景依然用之前的背景」）。
- **豁免**：装备/法宝/命格品阶色、战斗/状态功能色、金色标题与数值 均保留（延续 #66 边界）。
- **测试联动**：`test/automated/03-ui.test.js` 两处断言随玉符删除改写（标题页按钮清单去掉 `btn-omen-title`；原「玉符应仍在标题页」→「标题页玉符入口应已删除」，并移除点开玉符的步骤）。其余 261 用例不受影响。
- **交付**：改 `index.html`/`index_pc.html`（?v=145→?v=146）+ `css/style.css` + `js/ui.js` + `sw.js`（v183→v184）+ `test/automated/03-ui.test.js` + 本日志；dist 未同步。
- **验证**：测试 **263/263**（全绿，含改写后的 03 用例）；字体守卫通过。视觉待用户本地过目。

### #69 — 全局带框文字容器统一白底 + 境界字色转黑（v147/v185，2026-09-15）

- **全局带框文字容器白底**：所有亮底页面内容框背景 `rgba(120,90,50,.04/.06/.08)` 淡暖棕 → 纯白 `#fff`（批量 sed）。覆盖：开荒 `.ct-card`/`.ct-craft-row`/`.pt-row`、储物袋 `.bag-item`、键值 `.kv`/`.age-kv`、`.buff`(紫边保留)、`.chip`、`.realm-badge`、属性页 `.attr-realm-bar`、旅行 `.travel-node`、HUD 信息小框 `.action-info-item` 等。**边框全部保留**（金棕 `--line`/`#e3d6b8`/功能色紫蓝绿），只把底变白。
- **保留非白底**：选中态 `.ct-card.selected`(金底高亮)、底部导航栏暗底 `rgba(60,40,20,.4)`、导航 tab（`.char-tab` #67 金棕底 / `.arts-tabs .tab`）、`.panel`(云纹亮面板) 不改。
- **境界字色转黑**：HUD `.h-realm`、`#screen-char` 的 `.char-realm`、属性页 `.attr-realm-bar .realm-name`、结算页「最终境界」四处内联 `st.color`(各境界彩色) → `#1a1a1a` 纯黑；`.h-realm` 边框 `st.color` → 金棕 `var(--line)`。
- **标题页玉符**：已由 #68 删除（本提交不涉及；实测 index.html 无「玉符」残留）。
- **交付**：改 `css/style.css` + `js/ui.js`(5 处境界色) + `index.html`/`index_pc.html`(?v=146→147) + `sw.js`(→v185) + 本日志；dist 未同步。
- **提交策略**：工作区同时含并发会话新手引导 WIP(`tutorial`)，用「备份工作区→`git checkout HEAD` 还原纯净 #68→只重做本提交改动→add→再还原工作区」的精确暂存法，避免裹挟并发 WIP。
- **验证**：测试 263/263；字体守卫通过；css 括号 686/686 平衡。

### #70 — 新手引导系统：聚光灯分步高亮 / 可跳过 / 完整介绍（v146/v185，2026-09-15）

- **需求**：新玩家不知"什么按键在哪里怎么用"。新增新手引导：聚光灯分步高亮每个按键并解说"这是什么 / 在哪 / 怎么用"，覆盖完整且可随时跳过。
- **形式（已与用户确认）**：聚光灯分步高亮——半透明遮罩 + 目标元素金色高亮环 + 解说卡（上一步 / 下一步 / 跳过全部）。
- **触发（已确认 · 分期）**：避免开局一次性全介绍劝退玩家，按进度分四阶段——① `boot()` 调 `Tutorial.autoTitle()`：首见标题页只播【开始+轮回阁】；② `initGame()` 调 `Tutorial.onEnterGame()`：进入游戏首世只播【修炼·角色·游历·引导下一步】；③ `Tutorial.onYear(year)`：第 2 年自动播【秘境】、第 5 年自动播【宗门·百艺】；④ 设置「新手引导」重看（`replay`=强制复习 basics）、标题页「新手引导」看标题阶段。每阶段独立 `localStorage('dedao_tut_<stage>')` 标记，看完/跳过即不再自动弹（重玩也不重复）。
- **内容模型**：`js/tutorial.js` 的 `STAGES`（数据/逻辑分离），共 9 步——`title` 2 步（开始轮回 / 轮回阁·天赋）+ `basics` 4 步（修炼 / 角色 / 游历 / 引导下一步[整屏]）+ `secret` 1 步（秘境·第2年开启）+ `sect` 2 步（宗门 / 百艺）。
- **触发时机（2026-09-16 用户定稿）**：教程**不在年初打断剧情**——年初 `doYearEnd` 不再直接调 `onYear`；改为在 `playMainlineChain` 末尾（本年主线剧情全部播完，`Engine.moreMainline` 为假时）与「正常年初」分支各补一次 `Tutorial.onYear(S.year)`。
- **导航**：目标不在当前屏时经 `window.DedaoNav`（`js/ui.js` 末尾导出：char / bag / settings / omen / battle / adv / title / game）切到对应屏再高亮；战斗/秘境屏用 `showScreen` 揭示（不改游戏状态）。
- **可跳过**：每步「跳过引导」→ 隐藏遮罩 + 写阶段标记；`prev`/`next` 可前后翻；各阶段进度独立计数。
- **秘境分级解锁（与分期引导配套）**：`js/ui.js` 行动栏+`actExplore2`+`openAdvSelect` 三重把关——`S.year < 2` 时秘境按钮显示「秘境（未解锁）」并置灰、点击不开启（弹「需待第 2 年方启」）；第 2 年起自动解锁。新手引导在第 2 年单独介绍秘境。
- **文件**：新增 `js/tutorial.js`；改 `js/ui.js`（导出 DedaoNav + boot/ initGame/ doYearEnd 分期触发 + 秘境 year 门禁 + 设置加按钮 + 标题按钮绑定）、`index.html`/`index_pc.html`（标题按钮 + 加载脚本 ?v=150）、`css/style.css`（聚光灯/卡片样式）、`sw.js`（→v187 预缓存 `./js/tutorial.js`）；新增测试 `test/automated/14-tutorial.test.js`（6 例）。
- **文档同步**：AGENTS.md 模块表加 14-tutorial(6 例)、运行行 01~14 / 270 例；`DEDAO_项目简介.md` 口径 270 项用例 / 270·270 通过（满足 01 模块表对账与简介对外口径对账两守卫）。
- **验证**：全量 270/270 通过；14-tutorial 套件 6/6（步骤完整性[全部 target 存在于 index.html]、标题阶段启动、上下步、跳过写阶段标记、autoTitle+onEnterGame、onYear(2,5)+非 2/5 年不触发+replay）；03-ui 新增「秘境第 1 年未解锁/第 2 年开放」守卫（续档年份 `raw.year = 2`）。
- **注意**：`tutorial.js` 对 `window.DedaoNav` 缺失有降级（仅不高亮具体元素、居中解说卡），故不加载 ui.js 也能单测。

### #71 — 主题：金色字体全转黑（保留命格/装备品阶金），匪徒营寨转黑（v147/v185，2026-09-15）

- **需求（用户原话）**：「除了命格和装备之外的所有金色字体都先改为黑色字体！！！！！」；并点名「黄级秘境·匪徒营寨也统一用黑色字体」。
- **范围**：全局金色 **FONT** 颜色 → 黑（`--text`），仅保留两类金：① 命格品阶金——`.destiny-tag.grade-gold`、`.grade-gold .destiny-grade`、`.g-仙,.g-金` 及 ui.js 命格 `gradeColor` 映射 `'金':'#a8792a'`（4 处）；② 装备品阶金——ui.js `EQUIP_TIERS[v.tier].color)||'var(--gold)'` 分支（5 处）。
- **顺带处理**：① 黄级秘境·匪徒营寨 realm 名 `#e0c27a` → `var(--text)`；② 储物袋装备 h4 被并发 #70 教程改动误回退为金，已还原 `var(--text)`；③ 法宝（isArt 分支 `GRADE_COLOR[v.grade]||'var(--gold)'`）无「金」档、属通用金 → 转黑（与 ② 装备品阶金区分）。
- **未动（非字体金，用户指令仅针对「字体」）**：金色边框/高亮环/阴影/底色——`.ap-dot`、`.adv-node` 选中描边、`.ct-sec` 左边框、`.dabi-node` 指示、装备选中边框、好感星、法宝选中边框等。
- **文件**：改 `css/style.css`（71 处 `color:var(--gold)`→`color:var(--text)`，保留 3 条命格金规则）、`css/style_pc.css`（4 处）、`js/ui.js`（56 处：章节标题/境界/秘境旗/灵石数/法宝 fallback 等）、`index.html`/`index_pc.html`（储物袋装备 h4 转黑）；与并发 #70 教程改动同处共享文件，故合并提交、不再单独 bump（沿用 ?v=147 / sw v185）。
- **验证**：全量 269/269 通过；命格金/装备金/边框/好感星均保金；匪徒营寨与法宝转黑。
- **部署**：dist 未同步，等用户本地过目主题。

### #72 — 主题修正：法宝 / 好感★星保留金色（收窄 #71 豁免范围，2026-09-15）

- **用户裁定**：「法宝也保留原本的颜色，好感也保留金」——保留金色的清单由 #71 的「命格 + 装备」扩为 **命格 + 装备 + 法宝 + 好感★星**；其余金色字体仍黑。
- **相对 #71 撤回两处**：
  - 法宝 fallback：`ui.js` 5 处 `GRADE_COLOR[v.grade]) || 'var(--text)'` → 还原 `|| 'var(--gold)'`（金阶法宝恢复金，其余阶走 GRADE_COLOR 不变）。
  - 好感★星：`ui.js` 两处填充星（3913/7839）`var(--text)` → `#a8792a`，空星仍 `#3a3450`。
- **最终保留金色**：命格品阶金、装备品阶金、法宝（金阶）金、好感★星金；其余（匪徒营寨 realm 名、储物袋装备 h4、章节标题/境界/灵石数等）黑。非字体金（边框/高亮环/阴影/SVG 描边）不变。
- **验证**：全量 269/269 通过；字体守卫通过。
- **部署**：dist 未同步，等用户本地过目。

### #73 — 四件修正：白素救狐狸前情 / 仙缘未解锁显【未知】/ 六维·战斗白底黑字+微型云纹（v149，2026-09-15）

- **① 白素剧情断档修复**：原 `xian_baisu`（白衣报恩）开场即"一饭之恩"，缺救狐狸前情，与狐妻报恩线脱节。
  - `ssj_huqi_baoen`（狐妻报恩，炼气0-2）扩写为完整「救狐狸→白素现身报恩」叙事（拨开荆棘 / 掰开兽夹 / 敷灵药包扎 / 放归 / 当夜白衣女子狐尾现身）；`setFlags:{foxGraced:1}` 不变。
  - `baisu.event`（白衣报恩）加 `req:{flags:{foxGraced:1}}` 门槛（经 `evReqOK` 拦截，未救狐狸不进游历池），开场文案改"当年你于猎夹之下救我脱困"——保证白素线开头必为救狐狸、剧情连贯。
- **② 仙缘未解锁显【未知】**：`renderNpc` 未解锁 NPC 名称显示【未知】、头像占位符【？】、隐藏 loc/role，仅留"未解锁：需先达成【X】剧情"。
- **③ 六维 / 战斗属性白底黑字 + 网格整齐**：六维卡与战斗属性卡 `background:#fff`、名称及数值 `var(--text)`（黑）、边框统一 `var(--line)`、`min-height` 对齐；主页面与角色页两处渲染同步。
- **④ 六维白框微型云纹**：`.attr-six-card::after` 右上角淡金 SVG 云纹水印（opacity .15），不抢字。
- **验证**：全量 264/269 通过（仅 suite14 新手引导 5 项失败，属并发会话 tutorial WIP，与本次无关）；字体守卫通过；`data.js`/`ui.js`/`engine.js` 语法检查通过。
- **文件**：`js/data.js`（白素两事件）、`js/ui.js`（renderNpc + 两处六维/战斗渲染）、`css/style.css`（六维白框+云纹 / 战斗白底）、`index.html`/`index_pc.html`（bump ?v=148→149）。
- **部署**：dist 未同步，等用户本地过目。

### #74 — 主页面 HUD 六维/战斗属性补做白底黑字+整齐+微型云纹（v150，2026-09-15）

- **根因**：#73 只改了角色页弹层 `.attr-six-card`/`.attr-combat-cell`，漏改**主页面 HUD** 的 `.kv` 小框（`.stat-grid.six-dim` / `.stat-grid.combat-stats`），导致主页面战斗属性仍是红底红字、六维无云纹——用户反馈"没实装"。
- **修正**（`css/style.css`）：
  - `.stat-grid.combat-stats .kv`：红底 `rgba(160,60,45,.08)`+红字 `#7c261c` → 白底 `#fff`、黑字 `var(--text)`、边框统一 `var(--line)`、`min-height:34px` 对齐；`.below-hp` 同改为白底黑字。
  - `.stat-grid.six-dim .kv`：去掉绿左条 `#4ec9a0` → 白底 `#fff`、黑字 `var(--text)`、统一 `var(--line)` 边框；新增 `::after` 右上角淡金云纹水印（与角色页同款，opacity .15）。
  - `.age-kv`（年龄/寿元）：蓝左条 `var(--blue)` → `var(--line)` 统一边框，保持白底黑字。
  - PC 版 `style_pc.css` 是独立暗紫主题、不在本次亮化范围，未动。
- **bump**：`css/style.css ?v=149→150`（其余资源未改内容，不 bump）。
- **未提交并发 WIP**（已排除）：`js/engine.js`/`js/tutorial.js`/`sw.js`/`test/automated/14-tutorial.test.js`/`tools/player_sim.js`。

### #75 — 技术债清理：player_sim.js 敌人基线 enemyStats 改走引擎（2026-09-15）

- **根因**：#60 已把 player_sim.js 的大套引擎公式副本迁到 `_engine_loader`，但遗留两块敌人模型仍手抄：
  - `genEnemyStats(tier,atkMul,hpMul,jieDiff,opts)` 是 engine.js `enemyStats` 的**字节级副本**；
  - `deathEnemyDynamic(p,idx,jieDiff)` 内联了同一套 `base.atk×mul×jd` 数学（`DEATH_REALM_BASE` 在 data.js 中即 `ENEMY_REALM_BASE` 的别名，与引擎同源）。
  两者都不走引擎，属「第四大 bug 类」镜像分叉的残留。
- **修正**：
  - `js/engine.js`：把 `enemyStats` 加入 `module.exports`（原本只导出了 `enemyGen`；`deathEnemyGen` 仍未导出，但本处不需要）。
  - `tools/player_sim.js`：`const genEnemyStats = ENG.enemyStats;` 删本地副本；`deathEnemyDynamic` 改为 `return ENG.enemyStats(DEATH_IDX_REALM[idx], sc.atkMul, sc.hpMul, jieDiff);`。`advEnemy` 经 `genEnemyStats` 自动跟随。
  - `combatSim`（蒙特卡洛抽样）本非引擎函数镜像，保留。
- **验证**：`SIM_SEED=42` 下改动前后 `node tools/player_sim.js` 全量输出 **byte-identical（零漂移）**；并直接比对 5 档死劫敌人 atk/hp 旧式=新式。
- **文件**：`js/engine.js`（+1 导出）、`tools/player_sim.js`（删副本）、`AGENTS.md`（本条目 + 文件导航去"手工镜像"误述）。
- **部署**：本次为工具/引擎导出层改动，浏览器游戏行为不变（新增 `enemyStats` 导出未被前端调用），故**未 bump 缓存版本、未同步 dist、未推送**；待与并发会话的 tutorial WIP（sw.js/index*.html 缓存版本）一并 bump+dist+push。

### #76 — 主页面属性统一 4×4 网格对齐 + 云纹可见化 + 修为条改透明空/淡蓝（v151，2026-09-15）

- **根因**：#74 虽把主页面 `.kv` 改白底黑字，但仍分三段（六维 3 列 / 行动·灵石 竖排 / 战斗 4 列），行不对齐；且六维 `.kv` 云纹 opacity .15 在 34px 小框上几乎看不见 → 用户反馈"没实装 / 没对齐"。
- **对齐（index.html）**：把六维 6 + 行动 + 灵石 + 战斗 8（共 16 格）合并进**单个 `.stat-grid.main-stats`（4 列 × 4 行）**，所有 `.kv` 同 `min-height:34px`、统一白底黑字、边框对齐；修为条保留在网格下方（独立 `.stat-row` 进度条）。
- **云纹可见化（css/style.css）**：六维 6 格加 `class="kv six"`，`.stat-grid.main-stats .kv.six::after` 右上角淡金 SVG 云纹水印 **opacity .15→.35**、尺寸 24px（明显但不抢字）；原 `.stat-grid.six-dim .kv::after` 规则因 HTML 已改结构转为死规则（PC 另有独立覆盖，不受影响）。
- **修为条（css/style.css + js/ui.js）**：`.bar-box` 空槽 `#3a3020` 深棕 → **transparent**（仅留边框）；填充色 `bar('bar-qi',pct,'#1d7a55')` 绿 → **实心淡蓝 `#5b9bd5`**。还原用户要的"透明空 + 实心淡蓝"。
- **bump**：`css/style.css ?v=150→151`、`js/ui.js ?v=149→150`（data/engine 未改不 bump）；index.html/index_pc.html 同步。
- **未提交并发 WIP**（已排除）：`js/engine.js`/`js/tutorial.js`/`sw.js`/`test/automated/14-tutorial.test.js`/`tools/player_sim.js`。

### #77 — 云纹贴角避数字 + 行动/神识对调 + 日志框半透明 + 小框白底 50% 透明（v152，2026-09-15）

- **云纹避让**：`.stat-grid.main-stats .kv.six::after` 从 `top:3px;right:3px;24px`（与右侧数字重合）改为 **`top:1px;right:1px;18px` 贴右上角**；`.kv.six` 加 `padding-right:22px` 把数字左移让位——云纹与数字不再重合，`overflow:hidden` 保证不出框；opacity .4。
- **行动/神识对调（index.html）**：main-stats 顺序改为 悟性/体魄/遁速/**行动** ‖ 道心/灵力/**神识**/灵石 ‖…（`kv six` 类跟随属性走：神识仍带云纹，行动不带）。
- **日志框半透明**：`.screen[data-bg] .log` 从 `.panel` 合并规则中拆出 → **`rgba(255,255,255,.5)` + blur(4px)**，主页面背景透出；`.screen[data-bg] .panel` 保持淡棕 tint 不变。
- **小框白底 50% 透明**：全部内容框 `background:#fff` → `rgba(255,255,255,.5)`（28 处：.kv/.buff/.chip/.bag-item/.ct-card/.pt-row/.travel-node/.battle-board/.chap-npc/.gear-item 等）；**大框不动**——`.panel` 走 `var(--panel)`(#fffdf6) 未被波及；3 处 `#ffffff` 结构实底（标题大框/姓名输入/成就 toast）保留。
- **bump**：`css/style.css ?v=151→152`（ui.js/data 未改不 bump）。
- **未提交并发 WIP**（已排除）：`AGENTS.md` 测试计数 269→270 与 `DEDAO_项目简介.md`（AGENTS 采用「基线+仅本条目」精确暂存）。

### #78 — 秘境/死劫/开局主线因果链关联文案 + 仙缘页【返回修行】按钮（v155/dedao-v189，2026-09-16）

- **起因**：用户要求给不同秘境、死劫、开局设计彼此关联的主线文案（例：开局村庄遇袭=秘境一土匪），并令仙缘页返回按钮与储物袋/角色一致为【返回修行】。
- **因果链（data.js）**：村庄危机(`ml_0_3`)改妖兽→**赤狼旗匪徒(独眼龙)**；黄级匪徒营寨 desc/boss 点名独眼龙即洗劫村庄者；死劫二黑风寨补「赤狼旗为黑风寨分舵」互文，构成**匪患线**。玄级大黑山 desc/黑风狼/boss 点名奉**血月狼谷赤瞳狼王**为祖，死劫一 resultWin 回扣大黑山狼群——**狼王线**。地级洞天福地 desc/洞天之主点名**城隍庙老乞丐**即从此洞天走出、与**沧溟水府**同源，死劫三 resultWin 回扣洞天云纹——**洞天/沧溟线**。天级魔道祖地 desc/魔祖化身点名**魔渊裂隙源头**，死劫五 resultWin 回扣祖地——**魔渊线**。仙级遗世仙踪 desc 点明**飞升门口**。
- **仙缘页 UI 一致化（index.html/index_pc.html + ui.js）**：`screen-npc` 由 `screen-head` 内联 `btn-small ghost`「返回」重构为 **`gear-head`(标题+说明) + `gear-footer` + `btn-main`【返回修行】**，与储物袋/角色完全一致；`renderNpc` 去掉重复引导段（已上移页头）。`npc-back` id 与 `openNpc` 的 onclick 不变。
- **守卫**：`tools/font_coverage.py --check` 通过（「喽啰」→「喽罗」规避缺字 啰）。`node --check` data.js/ui.js 通过。
- **bump**：`index.html/index_pc.html ?v=154→155`、`sw.js dedao-v188→v189`（data/engine 未改随页面 bump）。
- **提交**：`4496b2d`（6 文件；排除并发会话 WIP `test/automated/03-ui.test.js`）。

### #79 — 好感度空心星 / 村庄危机改匪徒(去独眼龙) / 秘境第2年解锁 / 教程移至主线后（2026-09-16）
- **起因**：用户四项要求——好感度星星初始空心、满足变金色；村庄危机妖兽→匪徒且不要独眼龙命名；老乞丐线两选项都能解锁锻体；秘境第2年解锁且教程在每年主线剧情跑完后才开始。
- **好感度(ui.js 约3898)**：`star` 初始 `color:transparent` + `-webkit-text-stroke:1.5px #b9b2a4`（空心），`i < floor(favor)` 满足时改金色实心 `★ #a8792a`。
- **村庄危机(data.js)**：`ml_0_3` 维持赤狼旗匪徒；`resultWin` 去「独眼龙大哥不会放过你」改「这笔账，我们赤狼旗记下了」；`ml_0_4`「妖兽事件后」→「匪患过后」；黄级匪徒营寨 desc/boss 与赤狼旗喽啰去「独眼龙」命名，保留赤狼旗=洗劫村庄的因果链。全仓 `独眼龙` 计数归 0。
- **秘境第2年(ui.js + tutorial.js)**：行动栏 `advLocked`、选择页 `openAdvSelect`、行动入口 `actExplore2` 三处年份门槛 `<3`→`<2`；`tutorial.js onYear` 触发年 `3`→`2`，秘境引导文案「第3年」→「第2年」。
- **教程时机(ui.js + tutorial.js)**：移除年初 `doYearEnd` 里打断剧情的 `Tutorial.onYear` 调用；改为在 `playMainlineChain` 末尾（本年主线剧情全部播完）与「正常年初」分支各补 `Tutorial.onYear(S.year)`——即「本年主线剧情跑完之后」才开始教程。
- **老乞丐线(核验已满足)**：城中老乞丐两选项(买烧鸡/施舍馒头)均置 `beggar_met`，触发练气后期《锻体诀》(`ml_2_beggar_duanti`) 解锁锻体；仙缘传艺事件 `xian_laoqigai` 两选项均直接置 `duanti`。冷/热两条线皆能解锁锻体。
- **守卫**：`tools/font_coverage.py --check` 通过；`node --check` data.js/ui.js/tutorial.js 通过。
- **版本**：本次未 bump（并发工作区混有未提交 HUD 改动，精确暂存仅提交本回合 3 个 JS；待工作区干净后单独 bump 双版本）。
- **提交**：`5c121b0`（js/data.js + js/tutorial.js + js/ui.js；精确暂存排除并发会话的 css/style.css、index.html、index_pc.html 未提交 WIP）。

### #80 — #79 的三项收尾（仙缘页空心星补漏 / 测试断言跟到「第 2 年」/ dist 同步 + 双版本 bump）（v156/dedao-v190，2026-09-16）

- **起因（三类遗漏，均属「改了但没落到玩家手上」）**：
  ① 好感度空心星只改了缘法页 `createFavorSection`，**仙缘页 `renderNpc` 仍是旧的实心紫星**（`#3a3450`）——玩家在仙缘页看到的仍是旧样式；
  ② 秘境解锁提前到第 2 年后，**测试断言仍钉在「第 3 年」**（`03-ui` 的 `bootYear3` / `14-tutorial` 的 `onYear(3)`）——代码与断言口径分叉，任意一轮复跑必红；
  ③ **两份 dist 副本从未同步过 #78/#79**（`dist/` 在 `.gitignore`，`git status` 看不到）→ 发布包里跑的还是第 3 年版本，这是用户「改了没生效」的直接原因。
- **仙缘页空心星（ui.js `renderNpc`）**：改为 `color:transparent` + `-webkit-text-stroke:1.5px #b9b2a4`（空心），达成后金色实心 `#a8792a`；同时**点亮数统一取 `Math.floor(fav)`**——原仙缘页用 `i < fav`（浮点）、缘法页用 `i < Math.floor(favor)`，两处口径分叉已并回一个。
- **测试断言跟随（test/automated）**：`03-ui.test.js` 的 `bootYear3` → `bootYear2`（预置 `raw.year = 2`），用例名与三条断言文案改「第 2 年」；`14-tutorial.test.js` 的 `onYear(3)` → `onYear(2)`，并补一条 `onYear(3) === false`（非 2/5 年不触发任何阶段）。
- **AGENTS.md 现状描述同步**：§四测试模块表两行（03-ui / 14-tutorial）、§新手引导分期段（触发时机补「本年主线剧情跑完之后」）、§秘境分级解锁段（`S.year < 2`）一并改口径，避免文档与代码再分叉。
- **bump + dist**：`index.html`/`index_pc.html ?v=155→156`、`sw.js dedao-v189→v190`；两份 dist 按白名单 cp 同步（含 `js/tutorial.js`，旧同步脚本清单里漏了它），校验两份副本 `?v=156` / `dedao-v190` 且 `ui.js|data.js|tutorial.js` 与主目录逐字节一致。
- **验证**：全量 **270/270 通过**（改前改后各跑一次均全绿）；`node --check` data/ui/tutorial 通过；`tools/font_coverage.py --check` 通过。
- **提交口径**：工作区混有并发会话 HUD（明亮主题）未提交 WIP → 用「构造 blob 写入索引」精确暂存（`js/ui.js` 只带空心星那一段、`index*.html` 只带 `?v=` bump），复核暂存版 `index.html` 不含 `h-destiny`、`js/ui.js` 不含独立 `'h-realm'` 后提交；`css/style.css` 的并发 WIP 留在工作区未动。

### #81 — 好感度星星「两处渲染」防回退守卫（01 套件 28 例，2026-09-16）

- **起因**：#80 的空心星漏改是**同一视觉契约分两处实现**（缘法页 createFavorSection / 仙缘页 renderNpc）的典型分叉，只能靠人眼发现。按本仓「凡同类 bug 必留守卫」的惯例补静态断言。
- **新增用例**（`01-static-data.test.js`，第 28 例）：剥注释后扫 `js/ui.js` —— ① `-webkit-text-stroke:1.5px #b9b2a4`（空心）≥ 2 处；② `#a8792a`（金色）≥ 2 处；③ **不得**再出现旧的实心星三元配色（未达成时填深紫实心）；④ 点亮数统一 `Math.floor(fa` ≥ 2 处（堵「一处浮点、一处取整」的口径分叉）。
- **变异验证（已做）**：把仙缘页退回旧的一行式实心星 → 3 条断言同时报红（空心 1<2 / 残留旧三元 / Math.floor 1<2）；`cp` 备份还原后 md5 与备份一致（两个哈希同一值）。
- **对账连动**：新增 1 例后，`01` 模块表 27→28、运行行「270 例→271 例 / 270/270→271/271」、`DEDAO_项目简介.md` 三处 270→271 —— 均由 `01` 的对账守卫自动逼出来（先红后改），再次证明手抄数字必须交给机器对。
- **验证**：全量 **271/271 通过**。- **验证**：全量 **271/271 通过**（主目录）；`dist/taptap/dedao` 271/271、`dist/DEDAO_release` 271/271（`DEDAO_ROOT='D:/opencode/DEDAO/dist/...'`，Windows 风格路径）。
- **玩家侧实测探针**（`node _probe/probe_favor_stars.js`，`_probe` 在 .gitignore 属一次性脚本）：jsdom 续一份「老乞丐已解锁 + 好感 3/10 + 第 2 年」的存档 → 开仙缘页读真实 DOM —— 10 颗星中 **3 颗金色实心 / 7 颗空心（transparent + 描边）**，文案「(3/10) 相识·略有交情」；同轮验证第 1 年秘境按钮「秘境（未解锁）」且置灰、第 2 年「秘境」可点并弹出入口。改星星样式或解锁年份后可直接复跑它。
- **附带**：`node tools/pool-audit.js` 0 错误 0 警告（装备 58 / 法宝 47）。- **附带**：`node tools/pool-audit.js` 0 错误 0 警告（装备 58 / 法宝 47）。
- **教程时机端到端探针**（`node _probe/probe_tutorial_after_mainline.js`）：续一份「第 2 年年初恰有一条纯文本主线（青梅往事）待播」的存档 → 点【下一年】——
  ① 章节层弹出「主线剧情 · 青梅往事」时，`#tutorial-overlay` **未出现**（教程不再在年初打断剧情）；
  ② 主线播完（5 次点击）后，遮罩 `display=block`、标题「秘境 · 第 2 年开启」。
  ⚠ 造档时**必须把带选项/战斗分支的主线（初修功法 ml_0_2、村庄危机 ml_0_3）标为已播**：否则会误入战斗层、`chapter` 虽隐藏但流程未结束，教程自然不弹，容易误判成 bug。
  **顺带确认的语义**：主线后若接战斗，教程会等这一整段（含战斗）结束才弹 —— 与「本年主线跑完之后」一致。

### #82 — 四项修正：早夭 -30 且与延寿互斥 / 命格选中高亮 / 云纹不压小数 / 修为条淡蓝 / 教程游历步回主屏（v157 / dedao-v191，2026-09-16）

- **① 早夭 -30 + 与延寿互斥**（用户：「早夭改为 -30 年，与增寿的冲突，只能选 1 个」；本仓对应项名为【延寿】）。
  - 数据侧：`INIT_EXP` 增 `conflict` 字段（**双向**声明），`zaoyao.apply.life` 由 -20 → **-30**。
  - 引擎侧：`initExpIds(sel)` 在同一次遍历里同时做「去重 + 互斥」（**先取者生效**，后来者整条丢弃）。
    与去重同层是关键 —— 若只在 UI 摘掉另一项，`applyInit` / `initExpCost` 这类公开接口仍会被
    `exp:['life20','zaoyao']` 打穿（点数与结算各留一份口径）。
  - 口径唯一化：新增 `Engine.initExpLife(sel)`（与 `initExpCost` 同走 `initExpIds`），
    「命数总览」的寿元行改调它 —— **原实现在 UI 里自己 `indexOf('life20') ? 20 : 0` 手抄了一遍**，
    互斥一上就必然分叉。测试里补了一条「`initExpLife` 与 `applyInit` 实算必须完全一致」。
  - UI 侧：点一个摘掉另一个；卡片上追加「与「延寿」互斥」提示，**由 `conflict` 反查名字生成**（不手抄）。
- **② 命格选中高亮**：原 `.destiny-card.selected` 只有「深色细边框 + 6% 黄底」，浅色主题下几乎看不出选中。
  改为金边 + 18% 金底 + 内描边，并在卡片右侧追加 `.destiny-pick`「✔ 已选」角标（flex 子项，不压住锁定圆钮）。
  标题文案改为「命格 N 选 M（点卡片选中，再点取消 · 可上下滑动）　已选 x/M　·　还可再选 N 个 / 已选满，可点「开始这一世」」
  —— ⚠ **「已选 N/M」这串被 `03-ui.test.js` 的劫数用例断言依赖，改文案不能动它**。
- **③ 云纹不压小数**：六维会出现带小数的值（engine 里 `s.wu += 0.5` → 面板显示「3.5」），
  而右上角云纹水印是 `position:absolute` 的定位元素，**默认盖在静态文字之上**，小数部分被金色卷云糊住。
  修法复用 `.panel::after` 的成熟套路：父级 `isolation:isolate` + 水印 `z-index:-1` → 落在框底色之上、文字之下。
  三处同改：`.stat-grid.six-dim .kv` / `.stat-grid.main-stats .kv.six` / `.attr-six-card`；
  手机版窄格顺带把给水印预留的 `padding-right:22px` 收回为 7px（数值拿回整格宽度），水印不透明度降至 .45~.5。
- **④ 修为条淡蓝**：`bar('bar-qi', …)` 由 `#1d7a55`（深绿，与气血条撞色）→ **`#74b9e7`**。
  ⚠ 该行当初只存在于 HUD 回滚在途改动里（Part1/Part2 版把修为条移出了主界面），故 #82 提交未含它。
  **已于 #83（`5272c4d`）随 HUD 回滚整批入提交** —— 教训：改色这种一行改动若骑在别人的 WIP 块上，
  要么整批入提交，要么先与对方合流，**否则 HEAD 上根本不存在这行代码，已提交的守卫会变成「只在本地绿」**。
- **⑤ 教程游历步回主屏**：`basics` 阶段第 2 步【角色】带 `goto:'char'`，第 3 步【游历】却没声明跳转 →
  人还在角色页，`btn-social` 不可见（rect 0×0）→ 聚光灯消失、解说卡被居中盖住（用户报「游历提示被覆盖掉了」）。
  修法：给【游历】步补 `goto:'game'`（与 `secret` 阶段的【宗门】步同一套路）。
- **守卫**：`01` 新增第 29 例（云纹三处 `z-index:-1` + 父级 `isolation` / 修为条色值 / 教程 `goto:'game'` /
  早夭 -30 与双向 `conflict` / 引擎须消费 `conflict`）。**变异验证已做**：同时改坏四处
  （退回深绿 / 去掉 goto / 去掉 z-index:-1 / 早夭回退 -20 并删互斥声明）→ 6 条断言同时报红，备份还原后 29/29。
- **对账连动**：`01` 27→28→29、`11` 36→37 → 总数 271→**273**；`AGENTS.md` 模块表与运行行、
  `DEDAO_项目简介.md` 三处同步（由 `01` 的对账守卫逼出）。
- **验证**：主目录 **273/273**；`dist/DEDAO_release` 与 `dist/taptap/dedao` 同跑（各 273/273）。
- **玩家侧视觉实测**（无头 Edge，`_probe/probe82_visual.html` → `_probe/probe82.png` / `probe82_zoom.png`，真实 `css/style.css` + 真实 class）：
  ① 悟性故意设 **3.5** → 小数完整可读，云纹在文字之下不再糊住「.5」；防御 1.5 同；
  ② 修为条呈淡蓝；③ 命格「天道宠儿」选中卡 = 金边 + 金底 + 右侧「✔ 已选」角标，未选卡为普通灰边；
  ④ 开荒「三 · 经历」两卡各自带「与「早夭/延寿」互斥」金字提示，选中早夭时延寿不亮（`.ct-grid` 是 `minmax(0,1fr)`，无横向溢出）；
  ⑤ 角色页六维大卡体魄 3.5 可读。⚠ 探针页必须用 `--window-size=520`（本机 headless Edge CSS 视口锁 ~520px，
  写 420 会把右侧裁掉，易误判成「溢出」）；要看细节加 `--force-device-scale-factor=2`。
- **提交**：`33a351c`。⚠ 当时的 HUD 回滚 WIP（`css/style.css` / `index.html` / `index_pc.html` / `js/ui.js`）
  用「构造 blob 写索引」精确排除；dist 仍按工作区整份同步（含该 WIP + 修为条改色），以便用户直接验证。
  该 WIP 已于 #83 随 `5272c4d` 整批入提交。

### #83 — HUD 回滚整批入提交（含修为条淡蓝）+ 主界面灵力只显示总量（v158 / dedao-v192，2026-09-16）

- **① HUD 回滚入提交**（用户：「修为条改色进提交」）。
  - 背景：#82 时这行改色只存在于工作区的 HUD 回滚改动里 —— HEAD 的 Part1/Part2 版**把修为条整个移出了主界面**，
    没有 `bar('bar-qi', …)` 这一行。于是出现一个隐蔽的坏状态：**01 套件的修为条守卫（已提交）在 HEAD 上必然报红**，
    只因为工作区带着 WIP 才显示绿 —— 属于「只在本地绿」的假绿灯。
  - 处理：修为条改色无法脱离 HUD 回滚块单提（它就在那一段里）→ 把四份文件整批回滚入提交
    （`css/style.css` / `index.html` / `index_pc.html` / `js/ui.js`，+108/−116），即 `5272c4d`。
    回滚内容：HUD 回到 2026-09-14 定稿版（头像左 + 道号 + 境界徽标 + 命格内联），
    六维/战斗/年龄/寿元回到下方 `.stat-grid.main-stats` 4 列网格，修为条回到网格下方 `.stat-row`。
- **② 主界面战斗属性「灵力」只显示总量**（用户：「灵力只需要显示总量，不需要 100/100」）。
  - `js/ui.js` 的 `st-mo` 由 `(S.mp||0) + '/' + (S.mpMax||0)` → 只取 **`S.mpMax`**。
    理由：战前灵力本就补满，两个数字恒等纯属占位；且六维里已有一个「灵力」属性点，
    并排两个「灵力 · 100/100」极易看错。HTML 侧给该格补 `title="灵力上限（战斗前补满）"`。
  - **角色/属性面板（`openAttrs` 的「灵量 / 灵力」词条）刻意保留「当前/上限」** —— 战斗中灵力有消耗，那里要看余量。
- **守卫**：`01` 新增第 30 例 —— `st-mo` 赋值须取 `mpMax`、不得出现 `S.mp` 或 `' / '`；
  并加**反向守卫**：属性面板里带 `mpMax` 的灵力词条必须仍在（防止有人顺手把面板也改成总量）。
  **变异验证已做**：退回旧写法 → 「不得再拼当前值 mp」报红；还原后 30/30。
- **对账连动**：`01` 29→30 → 总数 273→**274**（`AGENTS.md` 模块表 + 运行行、`DEDAO_项目简介.md` 三处，由对账守卫逼出）。
- **提交拆分**：`5272c4d`（HUD 回滚 + 修为条淡蓝，四份布局文件）与本轮的灵力改动分两笔 ——
  回滚是布局级大改，与「一行显示口径」混在一笔里不好 bisect。拆法：先脚本临时撤销本轮改动 → 提交 → 再脚本恢复
  （`_probe/split83.py revert|apply`，比「构造 blob 写索引」省事，前提是每处改动都有可唯一定位的字符串）。
- **验证**：全量 **274/274**（主目录 + `dist/DEDAO_release` + `dist/taptap/dedao` 三份各 274/274）。
- **运行时探针**（`node _probe/probe83_mp_and_bar.js`，jsdom 续「mp=30 / mpMax=100」的存档）：
  主界面六维「灵力」= 1、战斗属性「灵力」= **100**（不再 30/100）；修为条填充 = **rgb(116,185,231)**（即 #74b9e7）；
  点【角色】后面板内仍是「灵力 当前/上限」（反向确认没被顺手改掉）。
  ⚠ 探针坑：点 `btn-char-bottom` 后要 **sleep 600ms** 再读 `screen-char`，400ms 时面板尚未渲染完，
  会读成「面板里没有灵力」的假失败。
- **提交**：`5272c4d`（HUD 回滚 + 修为条淡蓝）、`6fdd56d`（灵力总量 + 守卫 + 文档 + bump v158）、`640e6f8`（探针结论）。
- **「假绿灯」已闭环验证**：在**纯净 HEAD 的独立 worktree** 上跑全量（`git worktree add … HEAD --detach` →
  跑 worktree 里那份 `run.js`）→ **274/274**。这条要留着：以后每加一条「断言某行代码」的静态守卫，
  都该确认那行代码在 HEAD 里真的存在（`git show HEAD:<file> | grep -c <字面量>`），
  否则就会出现「工作区带 WIP 才绿、换台机器 checkout 就红」的假绿灯。
