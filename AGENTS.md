# DEDAO 得道 — Agent 指南（项目宪法）

> 最后更新：2026-09-09。本文档是项目的事实来源（source of truth），每次大规模改动后必须刷新。

## 一、项目概述
- **类型**：修仙题材放置 / 养成类**纯文字浏览器游戏**（auto-battler + 文字剧情）。
- **技术栈**：原生 JS / HTML / CSS + PWA（Service Worker 离线缓存），**无框架、无打包器、无 npm 依赖**。
- **商业模式**：纯免费，**不接任何内购付费点**。
- **发布渠道**：静态 PWA，通过 WebView 嵌入运行于 **抖音小游戏 / TAPTAP / 华为小游戏**；亦可 GitHub Pages 等任意静态托管。
- **代码规模**：`data.js`(~224KB) / `engine.js`(~147KB) / `ui.js`(~295KB) / `style.css`(~47KB)。

## 二、架构与加载顺序
所有文件**共享全局作用域**，加载顺序即依赖顺序：
1. `js/data.js` — 全部游戏数据常量。关键全局：`STAGES`, `SECTS`, `EVENTS`(含 `shejiao`/`jiyuan`/`mijing` 等分池), `TECHNIQUES`, `EQUIPS`, `ARTIFACTS`, `ELIXIRS`, `MATERIALS`, `SECT_GOODS`, `NPCS`, `SECT_SOCIAL`, `ADVENTURE_CONFIG`, `ADVENTURE_GRADE`, `ELEMENT_COUNTER`, `FORMULAS`, `REINCARNATION`, `FIELD_SEEDS`, `DESTINIES`。事件注册统一用 `E(tag, ev)`。
2. `js/engine.js` — 全部游戏逻辑。IIFE 暴露单一 `Engine` 全局（~80 个函数）。关键：`startLife`, `commitStart`, `combatStart`, `startAdventure`, `cultivate`, `endYear`, `breakthrough`, `perfectBreakthrough`, `normalBreakthrough`, `social`, `sectSocial`, `sectBuy`, `calcMpMax`, `artifactStats`, `advNextChoices`, `advCanFightBoss`。
3. `js/audio.js` — 音频管理器 `AudioManager`（真实音频文件 + Web Audio 合成兜底）。
4. `js/ui.js` — 全部 DOM 渲染。IIFE，`DOMContentLoaded` 启动。`S` = 当前游戏状态对象。
5. `index.html` — 所有 screen / overlay / modal 的单一容器。
6. `css/style.css` — 单一样式表。字体统一 `'YuYang'`。

## 三、运行 / 调试 / 构建
```bash
# 本地开发（二选一）
node serve.js                         # 内置静态服务器，端口 8000
python -m http.server 8080 --bind 127.0.0.1   # 端口 8080（常用）

# 发布包构建：产物在 dist/DEDAO_release/
```
**缓存失效（改 UI/数据后必做）**：
- `sw.js` 顶部 `const CACHE = 'dedao-v84';` 自增。
- `index.html` 内 `css/style.css?v=41`、`js/*.js?v=43` 版本号自增（强刷 Ctrl+Shift+R 才生效）。

## 四、测试
存在**自动化测试套件**（非"无框架"，旧文档已过时）：
```bash
node test/automated/run.js     # 依次跑 01~07，当前 104/104 全过（0 风险项）
```
| 文件 | 覆盖 |
|---|---|
| `01-static-data.test.js` | 静态数据一致性 & 引用完整性（含宗门商品单货币结构） |
| `02-engine-sim.test.js` | 引擎单元 & 长时模拟（含宗门商人单货币、入宗考验门禁、杂役筑基、百艺播种/挖矿、秘境双通道解锁） |
| `03-ui.test.js` | UI / DOM 层（含灵力上限断言 10/50/30、宗门页门禁受限 UI） |
| `04-adventure.test.js` | 秘境重构（横版地图 / 体力 / 探索度 / Boss） |
| `05-xianyuan.test.js` | 仙缘 NPC 缘法（解锁门槛 / 好感分级 / 冷却 / 上限） |
| `06-travel.test.js` | 游历 3 选 1（三桩际遇 / 每年上限 / 年末归零） |
| `07-favor.test.js` | 缘法系统（NPCS 分流 / 送礼叙话 / 单抽与探寻入口） |

- 旧 `test/dedao_*.js` 为历史脚本，**不在自动套件内**（部分因中文标签损坏无法运行），改动时不要依赖它们。
- 测试路径硬编码 `D:/opencode/DEDAO/js/`；用 `_harness.js` 暴露 `ROOT`。

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
- **每场战斗开始前**：各恢复 10% 上限（血蓝跨节点延续，秘境通用）。
- **战斗内**：吸血（命格）/ 神兵饮血（法宝 steal）。
- **秘境**：休息节点单复60%·双修各30%；回春/凝灵/九转丹仅秘境内可用（`usableInAdv`）；坊市即时丹。
- 回春丹/凝灵丹/九转丹等回血回灵丹**仅限秘境**携带使用。

### 战斗属性
- 攻击：`(10 + bigRealm*15) * talentMult * linggenMult * destMult * allMult + extraAtk + equipAtk`
- 防御：`round(ti * 0.5 * destDefMul)`
- 气血上限：含 `ti / bigRealm / linggenHp / artHp / sectHp / 装备 / 命格` 多项
- 暴击：`shen * 0.01 + destCritRate`；闪避：`dun * 0.005 + destDodgeRate`
- 修炼收益：`(60 + wu*10) * realmMult * techMult * linggenMult * talentMult * reincMult * equipMult * destMult`（聚气丹现 +20%）
- 战斗**无随机乘数**：`伤害 = atk * 法术系数`。

## 六、五行系统
相克：`金 → 木 → 土 → 水 → 火 → 金`。克制 ×1.5 / 被克 ×0.7 / 无关 ×1.0。每个法术有 `element`，每门心法有 `element` 或 `sect`。

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

- **横版地图（从下到上）**：第 1 层在底部（入口），洞天决战在顶部；渲染后自动滚动到底部。
- **探索度机制**：经历节点累计探索度（普通战斗 +10 / 精英 +20 / 宝箱·灵草·灵铁 +5 / 探查·事件·商贩·静室 +5），满 **100%** 方可直面 Boss。
- **Boss 开局不显示**：仅当 `advCanFightBoss()`（探索度满）才渲染 Boss 列；未满时提供"折寿强搜 / 撤退"兜底，**杜绝卡死**。
- **节点类型**：`combat / elite / treasure / herb / iron / rest / event / shop`。原"秘地探查(explore)"节点已**全部改为遭遇战(combat)**（"谜底探查"需求）。
- **连锁解锁（2026-09-09，双通道）**：进入门槛由\"仅境界\"改为 **`advUnlocked(s,key)` = 境界达标(realmReq) 或 已通关上一级秘境**。通关记录持久于 `s.flags.advClear[key]`（同世持久、**转世清空**）。链：黄(恒开)→玄(筑基 or 通黄)→地(金丹 or 通玄)→天(元婴 or 通地)→仙(元婴 or 通天)。**仙级另须事件现身**(每10年)。API：`markAdvClear`(Boss 胜时写)/`advUnlocked`/`advNextOf`。只放开入口，**不动**\"一年一次/行动点\"。

## 九、突破系统
三种模式：`perfectBreakthrough`(灵物 100%)、`normalBreakthrough`(丹药，基础率)、`normalBreakthrough(s,null)`(无物，基础率)。灵物 `SPIRIT_ITEMS` 每境界一个（Boss 掉落）。

## 十、法宝系统
- 法宝存于 `s.arts`（`ARTIFACTS`），由 `artifactStats(s)` 聚合、**自动生效**（储物袋获得即计入，无需手动装备）。
- **角色页法宝栏**（`renderCharTreasure`）展示 `s.arts` + `S.equip.treasure`（装备型法宝）；曾因误读 `S.equip.treasure`（恒空）导致空栏，已修复。
- 宗门商店亦售法宝（4 件），**灵石价走同级中值（不翻倍），功业价翻倍**。
- 装备型法宝存 `s.equip.treasure`（数组，容量 = bigIdx+1，最大 4）。

## 十一、灵材 / 丹药 / 装备
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

## 十二、宗门系统
- **入宗门禁（2026-09-08 重构）**：不考验，无法入宗。
  - `sectPassed(s)` = 已正式入宗（`sect` 非空且 `sectRank` 为 SECT_RANKS 正式五档之一，非杂役）。
  - 地位谱：`杂役(-1) < 外门 < 内门 < 真传 < 核心 < 首席`。「杂役」不在 `SECT_RANKS`，`sectRankIndex` 对未知名(含杂役)返回 -1 → 商人/任务天然拒绝。
  - 宗门页两态：未过考验仅「择宗 + 入宗考验」受限界面；通过后 7 项完整菜单（商人/晋升/任务/大比/练神/传功/切磋，无入宗考验项）。
  - 考验 `Engine.applySectTrial(s, win)`：武骨(悟性≥8)/道心(道心≥8)/实战三项 → 真传/内门/外门；全败 → **杂役**（每年可重考，评得更高即升）；杂役筑基(`bigIdx≥1`)由年度 `sectYearPromote` 自动升**内门**。
  - **每年限应考 1 次**：`applySectTrial` 记录 `s.lastTrialYear`，同一年重复应考返回 `{blocked:true}`（防杂役连续刷考）；UI 入口 `sectDoTrial` 同判拦截提示。跨年自然失效。
  - **宗门向主线门禁**：`MAINLINE` 中宗门语境条目带 `needSect:true`（ml_2_1 初入宗门/ml_2_g1 百艺初窥/ml_2_2 藏剑阁/ml_2_3 宗门任务/ml_3_0 秘境探索/ml_3_1 宗门大比/ml_3_2 大比后重逢），`checkYearEvents`/`moreMainline` 仅当 `sectPassed(s)` 才播；散修/杂役一律跳过挂起 → 入宗后顺延连播，不阻塞后续非宗门主线。
  - 触发：主线 `ml_2_0`「仙门收徒」(idx2 炼气后期) 引导；突破筑基散修走 `sectJoinFlow`(仅意属择宗、须应考)。年末 `sectYearPromote` 统一处理杂役筑基 / 正式档自动晋升。
- **宗门商人 `SECT_GOODS`（2026-09-08 改单货币按类型）**：**丹药(elixir)/灵材(mat) 只用功业**；**功法(tech)/遁术(dun)/法宝(art)/装备(equip) 只用灵石**。每件 `coin: 'stone'|'gongye'`。阵法(array)商品已移除——有效阵法属洞府(聚灵阵)与百艺页(五行阵)。
- **宗门活动 `actSect`**：降妖除魔(combat) / 道庭讲法(lecture) / **同门交游(sectSocial)** —— `sectSocial` 从 `SECT_SOCIAL` 取事件（含「青云·剑峰习剑」，已设 `once:true` 仅一次）。
- 宗门任务、宗门大比、师父传功、练神峰等各自独立入口。

## 十三、游历系统（2026-09-08 重构）
主页面【游历】→ `openTravel()`，节点：
| 节点 | 接取逻辑 |
|---|---|
| 流动商贩 | `travelShop`（游历专属行商，仅灵石） |
| 市井机缘 | `social()` → **始终只从 `EVENTS.shejiao` 抽 3 个、玩家 3 选 1**（修复：曾误用 `SECT_SOCIAL` 导致与「青云·剑峰习剑」等价） |
| 名山大川 | `actJiyuan` → `Engine.jiyuan`（天地机缘独立入口） |

- 删除了原"秘境探幽 / 宗门信符 / 仙缘寻访"三节点（避免与主页秘境、宗门页、仙缘页重复开口）。

## 十四、仙缘系统（提纯）
仙缘页（底部栏「仙缘」`openNpc`）**只保留 4 个纯仙缘角色**，各配真实缘法事件（点击 `runEvent(n.event)` 触发，非跳转，`once` 防刷）：
- **老乞丐**（炼体传承）、**林婉儿**（结缘线）、**白素**（狐仙报恩）、**神秘黑猫**（引路教学）。
- 功能型 NPC（商贩/长老/师父/师兄/师姐）已移出仙缘页，回归游历/宗门原入口。

## 十五、命格 / 轮回
- 命格加成：`getDestinyAttrBonus`（平加）、`getDestinyAttrMult`（乘区 atkMul/defMul）、`getDestinyBonus`（暴击/闪避/吸血/反伤等）。
- 轮回阁：`REINCARNATION` 提供转世加成（修为/舍生等）。

## 十六、UI 结构
- **行动栏**（主页中上部）：修炼 / 秘境 / 宗门 / 锻体 / 游历 / 百艺(未解锁置灰) / 突破 / 下一年。
- **底部栏**：角色 / 储物袋 / 仙缘 / 设置（z-index 50）。
- **Modal** z-index 250；**战斗层** z-index 9999（`!important`）。
- **屏幕**：`overflow:hidden`，底部留 70px 给底部栏。
- **角色页** `screen-char` 全屏，Tab：属性 / 装备 / 法宝 / 功法。
- **百艺页** `screen-crafts`：炼丹 / 炼器 / 灵田 / 灵矿（+ 五艺研习 / 五行阵）。
- 字体统一规则：弹窗标题 `#modal-body h3` 15px/600/金；描述类 13px/400；名称类 15px/600（详见 `style.css` 的 `ct-*`/`tn-*` 系列）。

## 十七、关键陷阱（gotchas）
- `cultivate()` 每年仅一次；`endYear()` 重置 `cultedThisYear`。
- `equipStats` 统算**全部**装备（含法宝数组）。切勿直接 `s.wu += it.wu`，会双重计数。
- `treasure` 为数组 `s.equip.treasure = []`，容量 `bigIdx+1`。
- 入宗在首次突破筑基时自动触发。
- 战斗开局满血满蓝（`combatStart` 设 `s.hp = s.hpMax`）。
- `loadState` 用 try-catch 吞错，读档失败看 console。
- `s.materials` 须初始化：`if (!s.materials) s.materials = {};`
- `s.arts` 法宝**自动生效**，角色法宝栏须读 `s.arts`（不要误读恒空的 `S.equip.treasure`）。
- 测试用 `_Spatch(fn)` 改 `S`；测试路径硬编码 `D:/opencode/DEDAO/js/`。
- **Duobao 机制已移除**：装备直接掉落，不再经多宝。
- 屏幕生命周期：`showScreen(name)` 隐藏所有 `.screen` 再显示 `#screen-{name}`。
- 灵根词条 `/` 五行阵可加战斗次级属性（暴击/闪避/渡劫/防御）。
- **市井机缘 = `social()` 只取 `shejiao` 池（3 选 1）**；天地机缘走游历「名山大川」。两者已拆分，勿再合并。
- **Boss 探索度未满时不可见**，UI 渲染须判 `advCanFightBoss()`。
- **宗门门禁**：未过考验（`sectRank` 为 null/`'杂役'`）→ `sectPassed(s)` 为假，商人/任务/晋升自动拒；勿直接把未应考的玩家设正式地位。杂役筑基自动升内门走 `sectYearPromote`，勿手动设 `外门`（会破坏"筑基=内门"约定）。

## 十八、近期重大变更（2026-09-08）
1. 灵力公式改为 `10 + (ling−1)×20`（初始 10/1）。
2. 秘境地图横版从下到上、Boss 探索度满才现、探索度累计机制、探查节点全改遭遇战。
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
