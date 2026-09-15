# DEDAO 得道 — AI图片批量生成需求文案

> 全游戏图片适配方案。本文档定义所有需要AI生成的图片，包含分类、尺寸、风格、Prompt模板。

---

## 整体风格定义

- **画风**：中国古风水墨 + 仙侠幻想，半写实半写意
- **色调**：深紫/暗蓝底色（#12101a），金/青/白高光
- **比例**：头像/图标1:1，场景16:9，立绘3:4
- **统一前缀Prompt**：`Chinese xianxia cultivation game, dark fantasy, ink wash painting style, ethereal glow, detailed, 4k`

---

## Phase 1：高频UI图标（约40张）

### 1.1 底部导航栏图标（6张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `icon_char` | 角色 | 128×128 | `minimalist golden silhouette of a cultivator in meditation pose, dark background, glowing aura, game UI icon, flat design` |
| `icon_bag` | 储物袋 | 128×128 | `a glowing jade storage pouch with golden tassels, dark background, game UI icon, flat design` |
| `icon_favor` | 结缘 | 128×128 | `two intertwined red silk threads forming a heart, dark background, game UI icon, flat design` |
| `icon_craft` | 百艺 | 128×128 | `a glowing alchemy furnace with five element symbols, dark background, game UI icon, flat design` |
| `icon_events` | 事件 | 128×128 | `an ancient scroll unfurling with golden light, dark background, game UI icon, flat design` |
| `icon_settings` | 设置 | 128×128 | `a jade gear mechanism with intricate carvings, dark background, game UI icon, flat design` |

### 1.2 境界徽章（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `realm_lianqi` | 炼气 | 128×128 | `circular emblem with swirling silver clouds and qi energy streams, Chinese xianxia style, dark background, glowing` |
| `realm_zhuji` | 筑基 | 128×128 | `circular emblem with a foundation stone pillar radiating teal light, Chinese xianxia style, dark background` |
| `realm_jindan` | 金丹 | 128×128 | `circular emblem with a golden core radiating brilliant light, Chinese xianxia style, dark background` |
| `realm_yuanying` | 元婴 | 128×128 | `circular emblem with a meditating infant soul surrounded by purple energy, Chinese xianxia style, dark background` |
| `realm_xian` | 仙 | 128×128 | `circular emblem with celestial gates opening to golden light, Chinese xianxia style, dark background` |

### 1.3 灵材/货币图标（11张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `mat_herb_huang` | 黄级灵草 | 64×64 | `a small glowing green herb with soft light, pixel art style, dark background` |
| `mat_herb_xuan` | 玄级灵草 | 64×64 | `a luminous green herb with blue veins, pixel art style, dark background` |
| `mat_herb_di` | 地级灵草 | 64×64 | `a radiant golden herb with swirling energy, pixel art style, dark background` |
| `mat_herb_tian` | 天级灵草 | 64×64 | `an ethereal herb glowing with prismatic light, pixel art style, dark background` |
| `mat_iron_huang` | 黄级灵铁 | 64×64 | `a rough iron ore chunk with dull glow, pixel art style, dark background` |
| `mat_iron_xuan` | 玄级灵铁 | 64×64 | `a refined iron ingot with blue sheen, pixel art style, dark background` |
| `mat_iron_di` | 地级灵铁 | 64×64 | `a golden iron crystal radiating warmth, pixel art style, dark background` |
| `mat_iron_tian` | 天级灵铁 | 64×64 | `a prismatic iron fragment with cosmic glow, pixel art style, dark background` |
| `mat_stone` | 灵石 | 64×64 | `a translucent crystal spirit stone glowing with inner light, pixel art style, dark background` |
| `mat_herb` | 灵草(总) | 64×64 | `a bundle of glowing spiritual herbs, pixel art style, dark background` |
| `mat_iron` | 灵铁(总) | 64×64 | `a stack of refined spirit iron ingots, pixel art style, dark background` |

### 1.4 基础五行法术图标（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `spell_jin` | 金系 | 128×128 | `golden sword qi slashing through air, Chinese xianxia spell icon, dark background, glowing` |
| `spell_mu` | 木系 | 128×128 | `green vine tendrils growing with life energy, Chinese xianxia spell icon, dark background` |
| `spell_shui` | 水系 | 128×128 | `swirling blue water orb with ice crystals, Chinese xianxia spell icon, dark background` |
| `spell_huo` | 火系 | 128×128 | `blazing red fireball with licking flames, Chinese xianxia spell icon, dark background` |
| `spell_tu` | 土系 | 128×128 | `rising earth pillars with stone armor shards, Chinese xianxia spell icon, dark background` |

### 1.5 标题Logo（1张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `logo` | 得道标题 | 800×400 | `Chinese calligraphy logo reading "得道" in golden ink, surrounded by swirling clouds and ethereal mist, dark background, cinematic lighting, xianxia game title screen` |

### 1.6 出生背景（3张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `bg_birth_village` | 山村少年 | 1280×720 | `a peaceful Chinese mountain village at dawn, wheat fields, old ox, thatched roofs, warm golden light, ink wash painting style, xianxia atmosphere` |
| `bg_birth_estate` | 世家庶子 | 1280×720 | `a grand Chinese estate courtyard with ancestral hall, stone measuring pillar glowing faintly, moonlight, solemn atmosphere, ink wash painting style` |
| `bg_birth_temple` | 遗孤 | 1280×720 | `a misty Taoist temple entrance on mountain peak, sunrise breaking through clouds, lone figure silhouette, ethereal, ink wash painting style` |

### 1.7 章节背景（8张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `bg_ch1` | 第一章·灵根觉醒 | 1280×720 | `mountain wilderness with swirling spiritual energy, dawn light, a young figure meditating, ink wash painting, xianxia` |
| `bg_ch2` | 第二章·初窥门径 | 1280×720 | `a wandering cultivator on a ancient road, misty mountains, broken temple in distance, ink wash painting, xianxia` |
| `bg_ch3` | 第三章·宗门风云 | 1280×720 | `floating mountain sect gate above clouds, sword cultivators flying, majestic architecture, ink wash painting, xianxia` |
| `bg_ch4` | 第四章·金丹之路 | 1280×720 | `sect tournament arena with sword light raining down, dramatic lighting, ink wash painting, xianxia` |
| `bg_ch5` | 第五章·九州风云 | 1280×720 | `panoramic view of nine provinces, vast landscapes, floating islands, ink wash painting, xianxia` |
| `bg_ch6` | 第六章·魔劫降临 | 1280×720 | `dark demonic energy corrupting the land, red sky, ominous atmosphere, ink wash painting, dark xianxia` |
| `bg_ch7` | 第七章·元婴之路 | 1280×720 | `celestial chess game in the stars, cosmic energy swirling, ethereal atmosphere, ink wash painting, xianxia` |
| `bg_ch8` | 第八章·宿命决战 | 1280×720 | `demon abyss battlefield, dark army vs light, epic confrontation, dramatic lighting, ink wash painting, dark xianxia` |

---

## Phase 2：装备与道具（约60张）

### 2.1 装备槽图标（6张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `slot_weapon` | 武器槽 | 64×64 | `golden sword silhouette in circular frame, dark background, game UI icon` |
| `slot_head` | 头饰槽 | 64×64 | `golden crown silhouette in circular frame, dark background, game UI icon` |
| `slot_body` | 躯干槽 | 64×64 | `golden armor silhouette in circular frame, dark background, game UI icon` |
| `slot_leg` | 腿部槽 | 64×64 | `golden boot silhouette in circular frame, dark background, game UI icon` |
| `slot_accessory` | 饰品槽 | 64×64 | `golden pendant silhouette in circular frame, dark background, game UI icon` |
| `slot_treasure` | 法宝槽 | 64×64 | `golden orb silhouette in circular frame, dark background, game UI icon` |

### 2.2 装备物品图标（32张）

#### 头饰（5张）

| ID | 名称 | 品质 | 尺寸 | Prompt |
|----|------|------|------|--------|
| `eq_ling_toujin` | 云纹包头巾 | 凡品 | 128×128 | `a simple cloth headwrap with cloud patterns, silver glow, item icon, dark background` |
| `eq_wenyao_guan` | 文瑶玉冠 | 良品 | 128×128 | `an elegant jade crown with ornate carvings, blue glow, item icon, dark background` |
| `eq_xuantie_kuijia` | 玄铁战盔 | 上品 | 128×128 | `a dark iron war helmet with rune engravings, purple glow, item icon, dark background` |
| `eq_tianbao_guan` | 天宝紫金冠 | 极品 | 128×128 | `a magnificent purple-gold crown radiating golden light, item icon, dark background` |
| `eq_taiyi_huxian` | 太一太上冠 | 仙品 | 128×128 | `a transcendent immortal crown with celestial flames, orange fire glow, item icon, dark background` |

#### 躯干（6张）

| ID | 名称 | 品质 | 尺寸 | Prompt |
|----|------|------|------|--------|
| `eq_cubu_daopao` | 粗布道袍 | 凡品 | 128×128 | `a simple coarse cloth Taoist robe, silver glow, item icon, dark background` |
| `eq_linwen_ruanjia` | 鳞纹软甲 | 良品 | 128×128 | `a flexible scale-patterned soft armor, blue glow, item icon, dark background` |
| `eq_xuanjing_zhongjia` | 玄精重甲 | 上品 | 128×128 | `a heavy dark crystal armor with runic protection, purple glow, item icon, dark background` |
| `eq_jinluo_baoyi` | 金络宝衣 | 极品 | 128×128 | `a magnificent golden-threaded treasure robe, golden glow, item icon, dark background` |
| `eq_xinghe_fayi` | 星河法衣 | 仙品 | 128×128 | `a celestial robe woven with starlight and galaxy patterns, orange fire glow, item icon, dark background` |
| `eq_canjia` | 蚕丝甲 | 良品 | 128×128 | `a delicate silkworm silk armor shimmering with inner light, blue glow, item icon, dark background` |

#### 腿部（5张）

| ID | 名称 | 品质 | 尺寸 | Prompt |
|----|------|------|------|--------|
| `eq_qingma_caoxie` | 青麻草鞋 | 凡品 | 128×128 | `simple hemp grass sandals, silver glow, item icon, dark background` |
| `eq_yunwen_buxue` | 云纹步靴 | 良品 | 128×128 | `boots with cloud pattern embroidery, blue glow, item icon, dark background` |
| `eq_fenglei_zhuiyue` | 风雷追月靴 | 上品 | 128×128 | `boots crackling with wind and lightning energy, purple glow, item icon, dark background` |
| `eq_tianxing_xue` | 天行靴 | 极品 | 128×128 | `heavenly boots with golden wind patterns, golden glow, item icon, dark background` |
| `eq_lingyun_xianlv` | 凌云仙履 | 仙品 | 128×128 | `transcendent immortal shoes floating on clouds, orange fire glow, item icon, dark background` |

#### 法宝（13张）

| ID | 名称 | 品质 | 尺寸 | Prompt |
|----|------|------|------|--------|
| `eq_gutang_pinganpai` | 古檀平安牌 | 凡品 | 128×128 | `an ancient sandalwood peace talisman, silver glow, item icon, dark background` |
| `eq_juling_zhu` | 聚灵珠 | 良品 | 128×128 | `a spirit-gathering pearl swirling with blue energy, item icon, dark background` |
| `eq_zhenhun_moyu` | 镇魂墨玉 | 上品 | 128×128 | `a black jade soul-suppressing stone with purple runes, item icon, dark background` |
| `eq_jingang_xiangmoyin` | 金刚降魔印 | 极品 | 128×128 | `a golden vajra demon-subduing seal radiating holy light, item icon, dark background` |
| `eq_taiji_baguapei` | 太极八卦佩 | 仙品 | 128×128 | `a taiji bagua pendant with swirling yin-yang energy, orange fire glow, item icon, dark background` |
| `eq_qingfeng` | 青锋剑 | 凡品 | 128×128 | `a simple but sharp green-tinted sword, silver glow, item icon, dark background` |
| `eq_yuewang_sword` | 越王勾践剑 | 仙品 | 128×128 | `an ancient legendary sword with golden inscriptions, orange fire glow, item icon, dark background` |
| `eq_xuantie` | 玄铁甲 | 良品 | 128×128 | `a dark iron chest plate with protective runes, blue glow, item icon, dark background` |
| `eq_juling_art` | 聚灵珠(器) | 上品 | 128×128 | `a powerful spirit orb pulsing with purple energy, item icon, dark background` |
| `eq_jinylv` | 金缕衣 | 极品 | 128×128 | `a golden-threaded treasure garment, golden glow, item icon, dark background` |
| `eq_linghu_pei` | 灵狐配饰 | 良品 | 128×128 | `a fox-shaped jade pendant with silver fur detail, blue glow, item icon, dark background` |
| `eq_dashen_bian` | 打神鞭 | 上品 | 128×128 | `a divine whip crackling with heavenly lightning, purple glow, item icon, dark background` |
| `eq_tongqian_jian` | 铜钱剑 | 上品 | 128×128 | `a sword made of ancient copper coins bound with red thread, purple glow, item icon, dark background` |

### 2.3 丹药图标（6张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `pill_juling` | 聚气丹 | 64×64 | `a glowing green qi-gathering pill, pixel art, dark background` |
| `pill_zhuji` | 筑基丹 | 64×64 | `a luminous blue foundation-building pill, pixel art, dark background` |
| `pill_jiejin` | 结金丹 | 64×64 | `a brilliant golden core-forming pill, pixel art, dark background` |
| `pill_yuanying` | 元婴丹 | 64×64 | `a radiant purple nascent soul pill, pixel art, dark background` |
| `pill_zengshou` | 增寿丹 | 64×64 | `a warm golden life-extending pill, pixel art, dark background` |
| `pill_wudao` | 悟道丹 | 64×64 | `a mystical white comprehension pill, pixel art, dark background` |

### 2.4 灵物图标（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `spirit_lingjing` | 上品灵晶 | 128×128 | `a luminous spirit crystal pulsing with silver energy, item icon, dark background` |
| `spirit_yaodan` | 上品妖丹 | 128×128 | `a demonic beast core glowing with purple fire, item icon, dark background` |
| `spirit_dongxu` | 洞虚秘淬 | 128×128 | `a mysterious golden refinement orb, item icon, dark background` |
| `spirit_mohe` | 魔核碎片 | 128×128 | `a shattered dark demon core fragment, item icon, dark background` |

---

## Phase 3：角色与怪物（约80张）

### 3.1 秘境节点图标（7张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `node_combat` | 遭遇战 | 64×64 | `crossed swords with red glow, game map node icon, dark background` |
| `node_elite` | 精英强敌 | 64×64 | `skull with purple glow, game map node icon, dark background` |
| `node_treasure` | 无名宝箱 | 64×64 | `treasure chest with golden glow, game map node icon, dark background` |
| `node_herb` | 灵草丛 | 64×64 | `glowing herb patch with green glow, game map node icon, dark background` |
| `node_iron` | 灵铁矿脉 | 64×64 | `glowing ore vein with blue glow, game map node icon, dark background` |
| `node_shop` | 荒野坊市 | 64×64 | `market stall with warm glow, game map node icon, dark background` |
| `node_event` | 雾中奇遇 | 64×64 | `misty portal with white glow, game map node icon, dark background` |

### 3.2 怪物肖像（20张）

#### 黄级·匪徒营寨（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `mob_jiexiu` | 劫修 | 256×256 | `a rogue cultivator in tattered robes, menacing face, dark aura, portrait style, xianxia` |
| `mob_feitu` | 匪徒头目 | 256×256 | `a burly bandit leader with scarred face, crude weapons, dark atmosphere, portrait style, xianxia` |
| `mob_xiexiu` | 邪修弟子 | 256×256 | `a young evil cultivator with glowing red eyes, sinister smile, portrait style, xianxia` |
| `mob_sanxiu` | 散修败类 | 256×256 | `a fallen rogue cultivator with corrupted aura, desperate expression, portrait style, xianxia` |

#### 玄级·大黑山（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `mob_wolf` | 黑风狼 | 256×256 | `a massive black wolf surrounded by dark wind, glowing red eyes, menacing, portrait style, xianxia` |
| `mob_bear` | 魔化熊妖 | 256×256 | `a demon-corrupted bear monster with purple runes, massive claws, portrait style, xianxia` |
| `mob_python` | 毒雾瘴蟒 | 256×256 | `a giant poisonous python in toxic mist, glowing green scales, portrait style, xianxia` |
| `mob_hound` | 双头犬妖 | 256×256 | `a two-headed demon hound with fire and ice breath, portrait style, xianxia` |

#### 地级·洞天福地（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `mob_guardian` | 洞天守护者 | 256×256 | `an ancient stone guardian golem with glowing runes, portrait style, xianxia` |
| `mob_zhenling` | 上古阵灵 | 256×256 | `an ethereal formation spirit made of light arrays, portrait style, xianxia` |
| `mob_yitui` | 仙人遗蜕 | 256×256 | `a spectral remnant of an ancient immortal, ghostly blue glow, portrait style, xianxia` |
| `mob_spider` | 千目蛛母 | 256×256 | `a massive spider queen with hundreds of glowing eyes, portrait style, xianxia` |

#### 天级·魔道祖地（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `mob_fallen` | 堕落仙人 | 256×256 | `a fallen immortal with cracked halo, dark corruption spreading, portrait style, xianxia` |
| `mob_demon_cult` | 魔道修士 | 256×256 | `a demon path cultivator with dark energy swirling, crimson eyes, portrait style, xianxia` |
| `mob_ancient` | 上古妖魔 | 256×256 | `an ancient demon with multiple arms and dark flame aura, portrait style, xianxia` |
| `mob_blood` | 血铠魔将 | 256×256 | `a demon general in blood-red armor, massive dark sword, portrait style, xianxia` |

#### Boss（4张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `boss_feishou` | 匪首 | 512×512 | `a massive bandit chief with scarred face, crude throne, dark cave, epic portrait, xianxia` |
| `boss_heishan` | 黑山老妖 | 512×512 | `an ancient mountain demon with stone skin and glowing eyes, epic portrait, xianxia` |
| `boss_dongtian` | 洞天之主 | 512×512 | `a majestic cave heaven lord in ethereal robes, floating arrays, epic portrait, xianxia` |
| `boss_mozu` | 魔祖化身 | 512×512 | `a supreme demon ancestor avatar with cosmic dark energy, multiple heads, epic portrait, xianxia` |

### 3.3 林婉儿立绘（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `lin_child` | 童年林婉儿 | 400×600 | `a cute 10-year-old Chinese girl with twin buns, bright eyes, holding a flower, ink wash style, xianxia` |
| `lin_young` | 少女林婉儿 | 400×600 | `a young Chinese woman in simple blue daoist robe, herb basket on back, determined expression, ink wash style, xianxia` |
| `lin_sword` | 剑修林婉儿 | 400×600 | `a beautiful Chinese woman in blue daoist robe holding a long sword, confident stance, ink wash style, xianxia` |
| `lin_companion` | 道侣林婉儿 | 400×600 | `a mature Chinese woman in elegant blue daoist robe, standing beside her partner, warm expression, ink wash style, xianxia` |
| `lin_battle` | 战斗林婉儿 | 400×600 | `a fierce Chinese woman warrior in blue daoist robe, sword drawn, battle stance, dynamic pose, ink wash style, xianxia` |

### 3.4 NPC肖像（6张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `npc_beggar` | 老乞丐 | 256×256 | `an old beggar with kind eyes hiding immense power, tattered but clean robe, portrait style, xianxia` |
| `npc_elder` | 白须老道 | 256×256 | `a kind white-bearded Taoist elder with gentle smile, simple robe, portrait style, xianxia` |
| `npc_baisu` | 白素(白狐) | 256×256 | `a beautiful fox-eared woman in white dress, silver hair, ethereal beauty, portrait style, xianxia` |
| `npc_nie` | 聂小倩 | 256×256 | `an ethereal ghost woman in translucent white dress, melancholic expression, portrait style, xianxia` |
| `npc_lianxiang` | 莲香 | 256×256 | `a lotus spirit woman in red robes, surrounded by lotus petals, portrait style, xianxia` |
| `npc_yingning` | 婴宁 | 256×256 | `a cheerful girl with twin buns surrounded by flowers, bright smile, portrait style, xianxia` |

### 3.5 灵宠图片（3张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `pet_fox_cub` | 小白(幼) | 256×256 | `a cute baby silver fox with glowing blue eyes, fluffy, adorable, xianxia fantasy style` |
| `pet_fox_adult` | 小白(成) | 256×256 | `a majestic silver fox with nine tails, glowing blue eyes, ethereal, xianxia fantasy style` |
| `pet_bifang` | 毕方 | 256×256 | `a mythical one-legged fire bird with blazing plumage, xianxia fantasy style` |

### 3.6 宗门标志（3张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `sect_qingyun` | 青云剑宗 | 256×256 | `a floating mountain with swords orbiting it, teal and white color scheme, sect emblem, xianxia` |
| `sect_danxia` | 丹霞谷 | 256×256 | `a valley with pill furnaces and herb fields, red and gold color scheme, sect emblem, xianxia` |
| `sect_xuantian` | 玄天门 | 256×256 | `a fortress with barrier arrays and defensive formations, blue and iron color scheme, sect emblem, xianxia` |

---

## Phase 4：场景与CG（约80张）

### 4.1 渡劫场景（3张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `cg_jindan_jie` | 金丹劫 | 1280×720 | `lightning descending from dark clouds onto a meditating cultivator, golden core forming, dramatic, ink wash painting, xianxia` |
| `cg_yuanying_jie` | 元婴劫 | 1280×720 | `purple fire and lightning vortex around a cultivator, nascent soul emerging, epic, ink wash painting, xianxia` |
| `cg_feisheng_jie` | 飞升劫 | 1280×720 | `five elements calamities simultaneously striking, celestial gates opening above, ascension moment, epic, ink wash painting, xianxia` |

### 4.2 关键剧情CG（12张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `cg_lin_rain` | 药庐躲雨 | 1280×720 | `a young man and woman sheltering from rain in a herb hut, lightning illuminating their faces, first meeting, romantic, xianxia` |
| `cg_lin_moon` | 月下结缘 | 1280×720 | `two figures sitting on a mountain peak under full moon, romantic atmosphere, ink wash painting, xianxia` |
| `cg_beggar_repay` | 老乞丐回报 | 1280×720 | `an old beggar revealing divine power, golden light emanating, shocked onlookers, dramatic, xianxia` |
| `cg_jianzhong` | 剑冢选剑 | 1280×720 | `a sword tomb with thousands of swords embedded in ground, one glowing sword being chosen, epic, xianxia` |
| `cg_danlu` | 丹房守炉 | 1280×720 | `a cultivator guarding a massive pill furnace with five-color flames, alchemy scene, xianxia` |
| `cg_leichi` | 雷池淬体 | 1280×720 | `a cultivator bathing in a pool of lightning, body tempering, dramatic energy, xianxia` |
| `cg_jindan` | 金丹大成 | 1280×720 | `a golden core solidifying within a cultivator's body, brilliant golden light, transcendence moment, xianxia` |
| `cg_yuanying` | 元婴出窍 | 1280×720 | `a tiny nascent soul emerging from a cultivator's forehead, purple energy swirling, ethereal, xianxia` |
| `cg_feisheng` | 飞升 | 1280×720 | `a cultivator ascending to heaven through celestial gates, golden light, ascension, xianxia` |
| `cg_mobattle` | 魔渊决战 | 1280×720 | `epic battle between light and dark forces at a demon abyss, dramatic lighting, xianxia` |
| `cg_xinmo` | 心魔之战 | 1280×720 | `a cultivator fighting their own shadow/dark self, inner demon battle, dramatic, xianxia` |
| `cg_dao伴侣` | 道侣同行 | 1280×720 | `two cultivators standing together on a mountain peak, looking at sunset, romantic, xianxia` |

### 4.3 秘境环境背景（25张）

#### 黄级·匪徒营寨（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `adv_huang_1` | 匪营入口 | 1280×720 | `bandit camp entrance with crude wooden gates, torches, mountain pass, ink wash style` |
| `adv_huang_2` | 匪营广场 | 1280×720 | `bandit camp central area with training grounds, crude buildings, ink wash style` |
| `adv_huang_3` | 匪营仓库 | 1280×720 | `bandit warehouse filled with stolen goods, dim lighting, ink wash style` |
| `adv_huang_4` | 匪首大殿 | 1280×720 | `bandit chief's throne room, crude but imposing, ink wash style` |
| `adv_huang_5` | 匪营后山 | 1280×720 | `mountain path behind bandit camp, hidden escape route, ink wash style` |

#### 玄级·大黑山（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `adv_xuan_1` | 黑山入口 | 1280×720 | `dark mountain entrance with ominous trees, black mist, ink wash style` |
| `adv_xuan_2` | 暗林深处 | 1280×720 | `deep dark forest with glowing eyes in shadows, eerie atmosphere, ink wash style` |
| `adv_xuan_3` | 妖兽巢穴 | 1280×720 | `massive beast lair with bones and trophies, intimidating, ink wash style` |
| `adv_xuan_4` | 毒沼泽 | 1280×720 | `toxic swamp with green mist, dangerous terrain, ink wash style` |
| `adv_xuan_5` | 山巅祭坛 | 1280×720 | `dark altar on mountain peak, ritual symbols, ominous energy, ink wash style` |

#### 地级·洞天福地（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `adv_di_1` | 洞天入口 | 1280×720 | `mystical cave entrance with ancient seal, golden light within, ink wash style` |
| `adv_di_2` | 古老走廊 | 1280×720 | `ancient corridor with glowing runes on walls, mysterious, ink wash style` |
| `adv_di_3` | 遗迹大厅 | 1280×720 | `vast ancient hall with floating arrays and treasures, ink wash style` |
| `adv_di_4` | 阵法核心 | 1280×720`mysterious formation core with swirling energy patterns, ethereal, ink wash style` |
| `adv_di_5` | 传承密室 | 1280×720 | `secret chamber with remnant soul floating, ancient knowledge, ink wash style` |

#### 天级·魔道祖地（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `adv_tian_1` | 魔域边境 | 1280×720 | `border of demon realm, dark corrupted land, red sky, ink wash style` |
| `adv_tian_2` | 血海深处 | 1280×720 | `sea of blood with floating islands, demonic energy, ink wash style` |
| `adv_tian_3` | 魔宫废墟 | 1280×720 | `ruins of demon palace, dark grandeur, ominous atmosphere, ink wash style` |
| `adv_tian_4` | 禁忌祭坛 | 1280×720 | `forbidden altar with dark ritual, demonic symbols, ink wash style` |
| `adv_tian_5` | 魔祖王座 | 1280×720 | `demon ancestor's throne room, supreme dark power, ink wash style` |

#### 仙级·遗世仙踪（5张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `adv_xian_1` | 仙踪入口 | 1280×720 | `ethereal entrance to immortal's hidden realm, golden clouds, ink wash style` |
| `adv_xian_2` | 仙人庭院 | 1280×720 | `immortal's garden with celestial plants, peaceful, ink wash style` |
| `adv_xian_3` | 试炼之路 | 1280×720 | `path of trials with floating obstacles, heavenly light, ink wash style` |
| `adv_xian_4` | 遗迹核心 | 1280×720 | `core of immortal ruins with residual power, awe-inspiring, ink wash style` |
| `adv_xian_5` | 飞升台 | 1280×720 | `ascension platform with celestial gates, divine light, ink wash style` |

### 4.4 死亡事件CG（14张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `cg_death_1` | 妖兽头领 | 512×512 | `a massive beast leader in combat, dark fantasy, dramatic lighting` |
| `cg_death_2` | 劫修头领 | 512×512 | `a powerful robber cultivator boss, menacing, dark fantasy` |
| `cg_death_3` | 毒瘴蛊王 | 512×512 | `a venomous insect king with toxic aura, dark fantasy` |
| `cg_death_4` | 妖兽王 | 512×512 | `a supreme beast king, majestic and terrifying, dark fantasy` |
| `cg_death_5` | 魔修杀手 | 512×512 | `a demon cultivator assassin, dark and deadly, dark fantasy` |
| `cg_death_6` | 魔修将领 | 512×512 | `a demon cultivator general in dark armor, dark fantasy` |
| `cg_death_7` | 心魔化身 | 512×512 | `a shadow version of the player, inner demon, dark fantasy` |
| `cg_death_8` | 天劫化身 | 512×512 | `a living lightning tribulation entity, dark fantasy` |
| `cg_death_9` | 远古魔将 | 512×512 | `an ancient demon general with dark flame aura, dark fantasy` |
| `cg_death_10` | 魔祖化身 | 512×512 | `a supreme demon ancestor avatar, cosmic dark energy, dark fantasy` |
| `cg_death_11` | 天道化身 | 512×512 | `a living manifestation of heavenly law, cosmic light, dark fantasy` |
| `cg_death_12` | 仙界守卫 | 512×512 | `a celestial realm guardian in golden armor, dark fantasy` |
| `cg_death_13` | 飞升天劫 | 512×512 | `a massive tribulation lightning strike, dark fantasy` |
| `cg_death_14` | 魔祖仙帝 | 512×512 | `the ultimate demon ancestor in supreme form, dark fantasy` |

### 4.5 轮回塔天赋图标（17张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `rb_0` | 帝王之相 | 64×64 | `golden crown with divine aura, game icon, dark background` |
| `rb_1` | 习武之人 | 64×64 | `muscular fist with chi energy, game icon, dark background` |
| `rb_2` | 先天灵体 | 64×64 | `glowing body with five elements, game icon, dark background` |
| `rb_3` | 佛缘深厚 | 64×64 | `golden lotus with Buddhist aura, game icon, dark background` |
| `rb_4` | 天赋异禀 | 64×64 | `radiant head with wisdom light, game icon, dark background` |
| `rb_5` | 神秘 Apparatus | 64×64 | `mysterious mechanical device, game icon, dark background` |
| `rb_6` | 灵 nuo (temp) | 64×64 | `glowing spirit bond chain, game icon, dark background` |
| `rb_7` | 炼丹 | 64×64 | `alchemy furnace with flames, game icon, dark background` |
| `rb_8` | 炼器 | 64×64 | `forge hammer with sparks, game icon, dark background` |
| `rb_9` | 灵田 | 64×64 | `spirit field with herbs, game icon, dark background` |
| `rb_10` | 灵矿 | 64×64 | `spirit ore vein glowing, game icon, dark background` |
| `rb_11` | 妖魔血脉 | 64×64 | `demon blood lineage symbol, game icon, dark background` |
| `rb_12` | 速度 | 64×64 | `wind swirl with speed lines, game icon, dark background` |
| `rb_13` | 命格 | 64×64 | `mystical destiny pattern, game icon, dark background` |
| `rb_14` | 特殊 | 64×64 | `unique special ability symbol, game icon, dark background` |
| `rb_15` | 小绿瓶 | 64×64 | `small green bottle with life energy, game icon, dark background` |
| `rb_16` | 随身灵田 | 64×64 | `portable spirit field device, game icon, dark background` |

### 4.6 成就图标（9张）

| ID | 名称 | 尺寸 | Prompt |
|----|------|------|--------|
| `ach_shou_zhuji` | 破境·筑基 | 128×128 | `medal with foundation pillar symbol, golden glow, achievement icon` |
| `ach_shou_jiejin` | 金丹大道 | 128×128 | `medal with golden core symbol, golden glow, achievement icon` |
| `ach_shou_yuanying` | 元婴出窍 | 128×128 | `medal with nascent soul symbol, golden glow, achievement icon` |
| `ach_feisheng` | 羽化登仙 | 128×128 | `medal with celestial gates symbol, golden glow, achievement icon` |
| `ach_daolu` | 道侣同心 | 128×128 | `medal with intertwined hearts symbol, golden glow, achievement icon` |
| `ach_shou_zhong` | 寿终正寝 | 128×128 | `medal with peaceful sunset symbol, golden glow, achievement icon` |
| `ach_mo_yuan` | 镇魔渊 | 128×128 | `medal with sealed abyss symbol, golden glow, achievement icon` |
| `ach_binjie_3` | 三次渡劫 | 128×128 | `medal with three lightning bolts symbol, golden glow, achievement icon` |
| `ach_ai_renzi` | 双甲子 | 128×128 | `medal with 200 years symbol, golden glow, achievement icon` |

---

## 生成注意事项

1. **一致性**：同系列图片（如五行、境界、装备）需保持风格一致
2. **透明背景**：图标类建议生成后去背，或使用深色纯色背景便于后期处理
3. **尺寸规范**：严格按照标注尺寸生成，避免后期缩放失真
4. **命名规则**：所有文件名使用 `category_id.png` 格式，小写+下划线
5. **存储路径**：`assets/images/{category}/{id}.png`

---

## 总量统计

| 阶段 | 类别 | 数量 |
|------|------|------|
| Phase 1 | UI图标+境界+灵材+法术+Logo+背景 | ~40张 |
| Phase 2 | 装备+丹药+灵物 | ~50张 |
| Phase 3 | 怪物+角色+NPC+宠物+宗门 | ~50张 |
| Phase 4 | 渡劫+剧情CG+秘境+死亡+轮回+成就 | ~80张 |
| **合计** | | **~220张** |
