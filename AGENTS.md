# DEDAO 得道 — Agent 指南（项目宪法）

> 最后更新：2026-09-14（变更日志 #50）。本文档是项目的事实来源（source of truth），每次大规模改动后必须刷新。
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
| `test/automated/run.js` + `01~12-*.test.js` | 自动套件（222 例），新套件须登记 `MODULES` |
| `test/automated/_harness.js` | node `vm` 沙箱，`createGameContext()` → `G.get('Engine')` |
| `test/reports/` | 测试报告（固定写本仓库，不进发布包） |
| `tools/player_sim.js` | 引擎公式的**手工镜像**，改公式必须同步它 |
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
node test/automated/run.js     # 依次跑 01~12，当前 223/223 全过
```
| 文件 | 例数 | 覆盖 |
|---|---:|---|
| `01-static-data.test.js` | 21 | 静态数据一致性 & 引用完整性（含宗门商品单货币结构、法宝文案「++」守卫、六维面板文案守卫、**事件 effect 键 ⊆ applyOps 白名单**守卫、**手机端滚动适配在位性**守卫） |
| `02-engine-sim.test.js` | 51 | 引擎单元 & 长时模拟（宗门商人单货币、入宗考验门禁、杂役筑基、百艺播种/挖矿、秘境双通道解锁、法宝效率分离、踏风履攻速、山河探索池/每年上限、**宗门任务年上限**、**大比十年一届/五层/境界缩放**、**主线门禁 noSect/afterSectYear**、**effect.trib 真正计入渡劫率**、**阵法被动心得速率与阈值**） |
| `03-ui.test.js` | 32 | UI / DOM 层（jsdom；灵力上限 10/50/30、宗门禁 UI、秘境地图几何、**宗门页菜单三项副标题**、**百艺「阵法」板块**、**进入页劫数自由选择 0–9 劫**、**轮回塔 +/- 步进按钮真实可点且可返还**） |
| `04-adventure.test.js` | 36 | 秘境重构（50 层×每层 3 节点 / 保底 2 出边 / 无交叉线 / 隐藏滚动条 / 地图视口固定 4 行 / 体力 110·150 / 探索度达标任意深度直达 Boss / 死路兜底 / 产出分层 / 坊市购丹 / 折寿强搜 / 初入秘境灵力回满 / 残魂考验=精英战 / 灵石掉落量级 / 装备掉落不越阶 / **秘境装备掉落率三调** / 仙魔浩劫 BGM 指向 / **秘藏二选一全规则** / 灵物不进随机法宝池 / **秘境「剩余法宝 N」口径与选项数**） |
| `05-xianyuan.test.js` | 10 | 仙缘 NPC 缘法（解锁门槛 / 好感分级 / 冷却 / 上限 / 机缘本世一次性 / 池空不扣行动点 / **日常小事白名单**） |
| `06-travel.test.js` | 3 | 游历 3 选 1（三桩际遇 / 每年上限 / 年末归零） |
| `07-favor.test.js` | 9 | 缘法系统（NPCS 分流 / 送礼叙话 / 单抽与探寻入口） |
| `08-death-omen.test.js` | 11 | 五劫主线（年表 / 劫主角色卡 / 立绘占位 / 噩兆玉符倒计时与裂纹 / 渡劫档位 / 隐藏线） |
| `09-achievements.test.js` | 6 | 成就判定（境界用 `s.idx` / 渡劫用 `s.tribPassed` / 里程碑文案） |
| `10-year-end.test.js` | 4 | 年末结算（气血与灵力回满 / 岁增 / 行动点重置） |
| `11-dead-config.test.js` | 24 | 死配置实装（命格 / 心法 / 法术字段必须被引擎消费） |
| `12-boss-element.test.js` | 16 | BOSS 五行与法术适配（生克四档 / 无属性减伤 / 镜像属性 / 施毒施控 / 伐灾免控 / 治疗全额 / 护盾递减 / DoT 封顶） |

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
- **开荒「三 · 经历」（`INIT_EXP`，2026-09-14 用户定稿）**：殷实 = **灵石 +500 / 3 点**、见面礼 = **聚气丹 ×3 / 4 点**、延寿 = **寿元 +20 / 2 点**、早夭 = **寿元 -20 / −3 点**（负值 → 选它反而**增加** 3 点预算，用于对冲）。四项均为「取 / 不取」toggle、**固定点数**（不随重复递增），在 `Engine.applyInit` 一次性结算、不入 meta、不跨世。点数折算的唯一真源是 `Engine.initExpCost(sel)`（UI 的 `createSpent` 直接调它，不自算）；早夭结算后寿元有 `Math.max(1, …)` 地板。开荒页分段顺序：**一 择灵根 / 二 定出身 / 三 经历 / 四 百艺**（百艺由三挪到四）。
- **进入页劫数自由选择（2026-09-13 用户定稿）**：`showEnterPage` 的 `maxJie` 恒为 **9**——新账号开局即可选 0–9 劫，不再受「历史最高劫数」（`meta.maxJie`，仍在结算页作成就展示）封顶。所选劫数写入 `S.jie`，JIE_DATA 难度倍率、命格金池（3劫+）、隐藏线阈值（6劫+）、3 劫命格栏 +1 等全部按**所选**劫数生效——选高劫 = 主动提升难度。结算页「应劫轮回（X劫）」写入 `meta.nextJie` 后，进入页默认落在该劫（此前 `enterState.jie` 恒 0，预设实际被丢弃——属顺带修复）。
- **开局六维基准值（2026-09-14 用户定稿）**：`startLife` 的 `jieBase = (meta.nextJie >= 3) ? 2 : 1`，即 **0~2 劫六维各 1，3 劫及以上各 2**。动机：① 高劫难度系数更高（3 劫 `JIE_DATA.diff = 1.50`），需要更好的起手面板；② **规避负值风险**——金阶仙命【九天玄体】带 `ti-1 / dun-1`，六维为 1 时有效体魄会被扣到 0（`hpMax` 仅 80，离负数只差一步），六维为 2 时最坏仍为 1。**阈值与「3 劫起金池才有金命格」（`JIE_TIER_WEIGHTS[3]` 起 gold 权重 > 0）天然对齐**，不存在「有金命格却没吃到基准值」的窗口。连带效应：`ling` 由 1→2 时 `mpMax` 由 20→40（公式 `20 + Math.max(0, ling-1)×20`），属预期。守卫见 `03`「主角初始六维：0~2 劫为 1，3 劫及以上为 2（规避负属性风险）」。

## 十七、UI 结构
- **行动栏**（主页中上部）：修炼 / 秘境 / 宗门 / 锻体 / 游历 / 百艺(未解锁置灰) / 突破 / 下一年。
- **底部栏**：角色 / 储物袋 / 仙缘 / 图鉴（**4 项**，z-index 50）。2026-09-14 二次定稿：设置上移 HUD、成就上移 HUD 右侧功能列、图鉴落到此处（原 3 项 → 4 项）。
- **HUD 右侧功能列**（`.hud-top` 第 3 列、跨两行 `.hud-side`）：**成就在上 / 设置在下方**（`#btn-ach-hud` / `#hud-settings`）。设置由 ⚙ 齿轮**还原为文字【设置】**。
- **标题页资料入口**（`.title-util-row`）：仅剩 **玉符**（成就 / 图鉴 已迁至主页面）。
- **Modal** z-index 250；**战斗层** z-index 9999（`!important`）。
- **屏幕**：`overflow:hidden`，底部留 70px 给底部栏。**滚动适配**：内容可能超屏的页面必须有受约束滚动容器（`min-height:0` + `overflow-y:auto`），规则集中在 style.css 末尾「手机端滑动适配修复」段，守卫见 `01` 套件。
- **角色页** `screen-char` 全屏，Tab：属性 / 装备 / 法宝 / 功法。
- **百艺页** `screen-crafts`：炼丹 / 炼器 / 灵田 / 灵矿（+ 五艺研习 / 五行阵）。
- 字体统一规则：弹窗标题 `#modal-body h3` 15px/600/金；描述类 13px/400；名称类 15px/600（详见 `style.css` 的 `ct-*`/`tn-*` 系列）。

## 十八、关键陷阱（gotchas）
- `cultivate()` 每年仅一次；`endYear()` 重置 `cultedThisYear`。
- `equipStats` 统算**全部**装备（含法宝数组）。切勿直接 `s.wu += it.wu`，会双重计数。
- `treasure` 为数组 `s.equip.treasure = []`，容量 `bigIdx+1`。
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
- **成就判定的两个字段别混用**（2026-09-11 踩坑）：
  - `s.broken` = **突破次数**（每次小阶提升 +1，炼气前期→中期就会变 1）；`s.idx` = **阶位索引**（0 炼气前期 / 3 筑基 / 6 金丹 / 9 元婴 / 15 仙）；`s.tribPassed` = **成功渡劫次数**（仅 `dujieWin()` 累加，金丹劫/元婴劫/飞升劫，上限 3）。
  - 境界类成就用 `s.idx`，渡劫类用 `s.tribPassed`。曾把「破境·筑基」写成 `s.broken >= 1`，导致炼气中期就点亮筑基成就；「三劫不陨」「结算的渡劫 N 次」同源错误。
  - 结算点数 `breakdown.trib` = `tribPassed × 3`（不再是 `broken/3`）。回归守卫见 `test/automated/09-achievements.test.js`。
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
      - **标题页减负**：`.title-util-row` 只留 **玉符**（成就/图鉴 撤除）；`.title-util-row` 由「固定 3 列等分」改为 `flex` + `justify-content:center` + 单枚 `max-width:132px`（剩 1 项时居中，回填也自动铺开）。
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
    - **开荒「三 · 经历」（新增 `js/data.js` `INIT_EXP`）**：殷实 **灵石 +500 / 3 点**、见面礼 **聚气丹 ×3 / 4 点**、延寿 **寿元 +20 / 2 点**、**新增【早夭】寿元 -20 / −3 点**。
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
