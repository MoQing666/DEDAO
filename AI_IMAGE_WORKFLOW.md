# DEDAO 得道 — AI图片生成工作流 (Human-in-the-Loop)

## 概述

将纯文字修仙游戏升级为有图片版本，使用AI生成图片，人工审核确认后集成到项目中。

---

## 推荐API平台

| 平台 | 价格参考 | 特点 | 链接 |
|------|---------|------|------|
| **Stability AI** | ~$0.01-0.03/张 | 官方API，质量稳定 | https://platform.stability.ai |
| **Replicate** | ~$0.01-0.05/张 | 多模型可选（SDXL, Flux等） | https://replicate.com |
| **硅基流动 (SiliconFlow)** | 国内平台，价格便宜 | 中文友好，速度快 | https://siliconflow.cn |
| **通义万相** | 阿里平台 | 中文理解好 | https://tongyi.aliyun.com |
| **智谱AI** | CogView模型 | 国内主流 | https://open.bigmodel.cn |

---

## 需要生成的图片清单

### 场景背景 (20-30张)
| 编号 | 场景名称 | 对应剧情 | 尺寸建议 |
|------|---------|---------|---------|
| bg_001 | 山村田野 | 出生背景·山村少年 | 1920×1080 |
| bg_002 | 古城街市 | 出生背景·世家庶子 | 1920×1080 |
| bg_003 | 道观山门 | 出生背景·遗孤 | 1920×1080 |
| bg_004 | 青云剑宗山门 | 拜入青云剑宗 | 1920×1080 |
| bg_005 | 丹霞谷药田 | 拜入丹霞谷 | 1920×1080 |
| bg_006 | 玄天门大殿 | 拜入玄天门 | 1920×1080 |
| bg_007 | 秘境·匪徒营寨 | 黄级秘境 | 1920×1080 |
| bg_008 | 秘境·大黑山 | 玄级秘境 | 1920×1080 |
| bg_009 | 秘境·洞天福地 | 地级秘境 | 1920×1080 |
| bg_010 | 秘境·魔道祖地 | 天级秘境 | 1920×1080 |
| bg_011 | 秘境·遗世仙踪 | 仙级秘境 | 1920×1080 |
| bg_012 | 渡劫雷云 | 金丹/元婴渡劫 | 1920×1080 |
| bg_013 | 魔渊战场 | 宿命之战 | 1920×1080 |
| bg_014 | 仙界天门 | 飞升结局 | 1920×1080 |
| bg_015 | 洞府内景 | 修炼场景 | 1920×1080 |
| bg_016 | 坊市街道 | 坊市购物 | 1920×1080 |
| bg_017 | 城隍庙 | 老乞丐事件 | 1920×1080 |
| bg_018 | 剑冢 | 青云剑宗剧情 | 1920×1080 |
| bg_019 | 丹房 | 丹霞谷剧情 | 1920×1080 |
| bg_020 | 雷池 | 玄天门剧情 | 1920×1080 |

### 角色立绘 (15-20张)
| 编号 | 角色名称 | 说明 | 尺寸建议 |
|------|---------|------|---------|
| char_001 | 林婉儿·初遇 | 药庐躲雨 | 800×1200 |
| char_002 | 林婉儿·灵谷 | 灵谷相遇 | 800×1200 |
| char_003 | 林婉儿·道侣 | 结为道侣 | 800×1200 |
| char_004 | 老乞丐 | 城隍庙神秘人 | 800×1200 |
| char_005 | 白须老道 | 山神庙前辈 | 800×1200 |
| char_006 | 青云剑宗长老 | 宗门长老 | 800×1200 |
| char_007 | 丹霞谷大长老 | 宗门长老 | 800×1200 |
| char_008 | 玄天门守关老将 | 宗门长老 | 800×1200 |
| char_009 | 守冢剑灵 | 剑冢BOSS | 800×1200 |
| char_010 | 守园老龟 | 上古药园BOSS | 800×1200 |
| char_011 | 心魔化身 | 渡劫人劫 | 800×1200 |
| char_012 | 天劫化身 | 渡劫天劫 | 800×1200 |
| char_013 | 魔祖宿敌 | 宿命之战 | 800×1200 |
| char_014 | 小白（灵狐） | 宠物 | 800×1200 |
| char_015 | 玩家默认形象 | 主角 | 800×1200 |

### 事件CG (30-50张)
| 编号 | 事件名称 | 说明 | 尺寸建议 |
|------|---------|------|---------|
| cg_001 | 第一章·出生 | 出生剧情 | 1280×720 |
| cg_002 | 灵根觉醒 | 灵根测试 | 1280×720 |
| cg_003 | 药庐躲雨 | 林婉儿初遇 | 1280×720 |
| cg_004 | 剑冢选剑 | 青云剧情 | 1280×720 |
| cg_005 | 丹房守炉 | 丹霞剧情 | 1280×720 |
| cg_006 | 雷池淬体 | 玄天剧情 | 1280×720 |
| cg_007 | 月下结缘 | 林婉儿结缘 | 1280×720 |
| cg_008 | 金丹渡劫 | 结成金丹 | 1280×720 |
| cg_009 | 元婴渡劫 | 凝出元婴 | 1280×720 |
| cg_010 | 心魔之战 | 人劫·心魔 | 1280×720 |
| cg_011 | 强敌拦路 | 人劫·强敌 | 1280×720 |
| cg_012 | 天劫降临 | 天劫战斗 | 1280×720 |
| cg_013 | 魔渊之战 | 宿命之战 | 1280×720 |
| cg_014 | 飞升成仙 | 结局CG | 1280×720 |
| cg_015 | 镇魔渊 | 隐藏结局 | 1280×720 |
| cg_016 | 救下灵狐 | 灵兽事件 | 1280×720 |
| cg_017 | 老乞丐回报 | 彩蛋事件 | 1280×720 |
| cg_018 | 雷雨悟道 | 机缘事件 | 1280×720 |
| cg_019 | 断崖洞府 | 秘境事件 | 1280×720 |
| cg_020 | 拍卖会 | 坊市事件 | 1280×720 |

### 怪物/Boss (10-15张)
| 编号 | 怪物名称 | 说明 | 尺寸建议 |
|------|---------|------|---------|
| mob_001 | 青纹狼 | 黄级秘境 | 800×800 |
| mob_002 | 黑风狼 | 玄级秘境 | 800×800 |
| mob_003 | 冰蛟 | 地级秘境 | 800×800 |
| mob_004 | 吞星巨蟒 | 天级秘境 | 800×800 |
| mob_005 | 匪首 | 黄级BOSS | 800×800 |
| mob_006 | 黑山老妖 | 玄级BOSS | 800×800 |
| mob_007 | 洞天之主 | 地级BOSS | 800×800 |
| mob_008 | 魔祖化身 | 天级BOSS | 800×800 |
| mob_009 | 仙人残念 | 仙级BOSS | 800×800 |
| mob_010 | 守墓尸傀 | 白骨古墓 | 800×800 |

### 道具/图标 (20-30张)
| 编号 | 道具名称 | 说明 | 尺寸建议 |
|------|---------|------|---------|
| item_001 | 灵草（黄级） | 材料图标 | 128×128 |
| item_002 | 灵草（玄级） | 材料图标 | 128×128 |
| item_003 | 灵草（地级） | 材料图标 | 128×128 |
| item_004 | 灵草（天级） | 材料图标 | 128×128 |
| item_005 | 灵铁 | 材料图标 | 128×128 |
| item_006 | 灵石 | 货币图标 | 128×128 |
| item_007 | 聚气丹 | 丹药图标 | 128×128 |
| item_008 | 筑基丹 | 丹药图标 | 128×128 |
| item_009 | 青锋剑 | 法宝图标 | 128×128 |
| item_010 | 玄铁甲 | 装备图标 | 128×128 |
| item_011 | 金缕衣 | 装备图标 | 128×128 |
| item_012 | 上品灵晶 | 灵物图标 | 128×128 |
| item_013 | 小绿瓶 | 天赋图标 | 128×128 |
| item_014 | 灵田 | 百艺图标 | 128×128 |
| item_015 | 轮回塔 | 系统图标 | 128×128 |

---

## 完整工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│  步骤1: 人类准备                                                │
│  ├── 选择API平台（如 Stability AI / Replicate / 硅基流动）     │
│  ├── 购买API资源包（100张额度）                                │
│  └── 获取API Key                                                │
├─────────────────────────────────────────────────────────────────┤
│  步骤2: Agent生成提示词                                         │
│  ├── 分析游戏数据，提取需要图片的场景                          │
│  ├── 为每个场景写英文/中文提示词                               │
│  ├── 统一风格参数（古风、水墨、像素等）                        │
│  └── 保存到 prompts.json                                       │
├─────────────────────────────────────────────────────────────────┤
│  步骤3: 人类审核提示词                                         │
│  ├── 检查提示词是否符合预期                                    │
│  ├── 调整风格、构图、色调等描述                                │
│  └── 确认后授权执行                                            │
├─────────────────────────────────────────────────────────────────┤
│  步骤4: Agent调用API生成图片                                   │
│  ├── 批量调用API（带速率限制）                                 │
│  ├── 下载图片到 assets/images/                                 │
│  ├── 按命名规则保存（如 scene_001_village.png）                │
│  └── 记录生成日志（prompt → filename 映射）                   │
├─────────────────────────────────────────────────────────────────┤
│  步骤5: 人类审核图片                                           │
│  ├── 浏览生成的图片                                            │
│  ├── 标记不满意的图片（可重新生成）                            │
│  └── 确认最终图片集                                            │
├─────────────────────────────────────────────────────────────────┤
│  步骤6: Agent处理图片                                          │
│  ├── 调用抠图工具（rembg / remove.bg API）                    │
│  ├── 裁剪、缩放到统一尺寸                                     │
│  ├── 转换格式（WebP压缩）                                     │
│  └── 生成图片索引文件                                          │
├─────────────────────────────────────────────────────────────────┤
│  步骤7: Agent集成到项目                                        │
│  ├── 修改 ui.js 添加图片显示逻辑                              │
│  ├── 修改 CSS 添加图片样式                                    │
│  ├── 更新 index.html 添加预加载                               │
│  └── 测试验证                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 文件结构（生成后）

```
DEDAO/
├── assets/
│   ├── images/
│   │   ├── bg/              # 场景背景
│   │   │   ├── bg_001_village.png
│   │   │   ├── bg_002_city.png
│   │   │   └── ...
│   │   ├── char/            # 角色立绘
│   │   │   ├── char_001_linwanr.png
│   │   │   ├── char_002_beggar.png
│   │   │   └── ...
│   │   ├── cg/              # 事件CG
│   │   │   ├── cg_001_birth.png
│   │   │   ├── cg_002_linggen.png
│   │   │   └── ...
│   │   ├── mob/             # 怪物/Boss
│   │   │   ├── mob_001_wolf.png
│   │   │   └── ...
│   │   └── item/            # 道具图标
│   │       ├── item_001_herb.png
│   │       └── ...
│   └── audio/
├── prompts.json             # 提示词映射文件
├── generate-images.js       # 图片生成脚本
└── ...
```

---

## 提示词模板

### 场景背景模板
```
Chinese fantasy landscape painting, [场景描述], 
ancient Chinese architecture, misty mountains, 
traditional ink wash style, ethereal atmosphere,
16:9 aspect ratio, high quality, detailed
```

### 角色立绘模板
```
Chinese fantasy character portrait, [角色描述],
[服装描述], [表情描述], 
transparent background, full body, 
high quality anime style, detailed
```

### 事件CG模板
```
Chinese fantasy scene, [事件描述],
[人物描述], [环境描述],
dramatic lighting, cinematic composition,
16:9 aspect ratio, high quality, detailed
```

---

## 提示词示例（prompts.json）

```json
{
  "bg_001_village": {
    "prompt": "Chinese fantasy landscape, small mountain village at dawn, thatched houses, rice fields, misty mountains in background, traditional ink wash style, ethereal atmosphere, 16:9, high quality",
    "negative": "modern buildings, cars, electricity poles, low quality, blurry",
    "width": 1920,
    "height": 1080,
    "filename": "bg_001_village.png"
  },
  "char_001_linwanr": {
    "prompt": "Chinese fantasy young woman, gentle expression, holding herb basket, wearing light blue hanfu, long black hair, transparent background, full body, anime style, high quality",
    "negative": "low quality, blurry, deformed, extra limbs",
    "width": 800,
    "height": 1200,
    "filename": "char_001_linwanr.png"
  }
}
```

---

## 抠图工具选择

| 工具 | 类型 | 特点 |
|------|------|------|
| **rembg** | 本地Python库 | 免费，速度快，效果好 |
| **remove.bg** | 在线API | 效果最好，有免费额度 |
| **BRIA RMBG** | 本地模型 | 开源，效果接近remove.bg |

推荐使用 **rembg**：
```bash
pip install rembg
rembg i input.png output.png
```

---

## 图片集成方案

### 1. 预加载系统
```javascript
// js/imageLoader.js
const ImageLoader = {
  cache: {},
  async load(key, src) {
    if (this.cache[key]) return this.cache[key];
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.cache[key] = img; resolve(img); };
      img.src = src;
    });
  },
  async preloadAll(manifest) {
    const promises = Object.entries(manifest).map(
      ([key, src]) => this.load(key, src)
    );
    await Promise.all(promises);
  }
};
```

### 2. 章节背景显示
```javascript
// 在 showChapter 函数中添加
function showChapter(title, lines, opts) {
  // ... existing code ...
  if (opts.background) {
    const bg = ImageLoader.cache[opts.background];
    if (bg) {
      ov.style.backgroundImage = `url(${bg.src})`;
      ov.style.backgroundSize = 'cover';
      ov.style.backgroundPosition = 'center';
    }
  }
  // ... existing code ...
}
```

### 3. 调用示例
```javascript
showChapter('第 一 章 · 山村少年', lines, {
  subtitle: '凡尘旧事',
  background: 'bg_001_village'  // 对应图片key
});
```

---

## 预算估算

| 项目 | 数量 | 单价 | 小计 |
|------|------|------|------|
| 场景背景 | 20张 | $0.03 | $0.60 |
| 角色立绘 | 15张 | $0.03 | $0.45 |
| 事件CG | 20张 | $0.03 | $0.60 |
| 怪物Boss | 10张 | $0.03 | $0.30 |
| 道具图标 | 15张 | $0.03 | $0.45 |
| **合计** | **80张** | | **$2.40** |

注：实际价格取决于所选平台，部分平台可能更便宜。

---

## 注意事项

1. **风格统一**：所有图片应保持统一的美术风格（建议古风水墨或像素风）
2. **分辨率一致**：同类图片保持相同分辨率
3. **命名规范**：严格按命名规则保存，便于代码引用
4. **备份原图**：保留所有原始生成图片，便于后期调整
5. **审核确认**：每批图片生成后需人工审核确认

---

## 开始执行

需要用户提供：
```
API平台: [选择的平台]
API Key: [密钥]
风格偏好: [古风水墨 / 像素风 / 写实CG / 其他]
特殊要求: [如有]
```

确认后，Agent将：
1. 生成完整的 prompts.json
2. 编写 generate-images.js 脚本
3. 执行图片生成
4. 处理图片（抠图、裁剪）
5. 集成到项目中
