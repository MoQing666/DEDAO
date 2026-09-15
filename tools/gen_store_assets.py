#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
DEDAO · TapTap 物料生成器（零成本版）

不调用任何图片生成接口，全部由仓库内现有素材 + 站酷仓耳渔阳体字库合成。
产出目录：dist/taptap/物料/

设计语言与游戏内保持一致（见 css/style.css :root）：
  暗墨紫底 #12101a / 面板 #1d1926 / 描边 #3a3450
  金 #e8c15a / 亮金 #f7e2a0 / 淡紫 #cdb9ff / 灰紫 #8a7ab0

字体来源（按优先级自动解析，见 resolve_font）：
  1. 环境变量 DEDAO_FONT_TTF
  2. _probe/fontsrc/package/仓耳渔阳体-W05.ttf（本地解包产物，gitignore）
  3. 从 assets/fonts/TsangerYuYangT-W05.woff2 解压出 TTF（需 fontTools + brotli）
  —— 第 3 条是给「新 clone 仓库」准备的，保证脚本不依赖任何临时文件。

⚠ 原图水印：assets/img/_src/*.png 右下角带生成器水印，本脚本统一裁掉底部 94px。
"""

import os
import sys
import math

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_DIR = os.path.join(ROOT, 'dist', 'taptap', '物料')

# ─────────────────────────── 调色板（与 css/style.css 对齐） ───────────────────────────
INK      = (18, 16, 26)        # --bg
INK_2    = (13, 11, 19)
PANEL    = (29, 25, 38)        # --panel
PANEL_2  = (36, 31, 49)        # --panel2
LINE     = (58, 52, 80)        # --line
GOLD     = (232, 193, 90)      # --gold
GOLD_L   = (250, 232, 176)
GOLD_D   = (168, 130, 44)
LILAC    = (205, 185, 255)
MUTED    = (138, 122, 176)
WHITE    = (245, 242, 250)
CINNABAR = (188, 74, 58)

FONT_W05 = None  # 运行时填充


# ───────────────────────────────── 基础设施 ─────────────────────────────────

def resolve_font():
    """按优先级解析出一个可用的渔阳体 TTF，返回绝对路径。"""
    env = os.environ.get('DEDAO_FONT_TTF')
    if env and os.path.exists(env):
        return env

    scratch = os.path.join(ROOT, '_probe', 'fontsrc', 'package', '仓耳渔阳体-W05.ttf')
    if os.path.exists(scratch):
        return scratch

    # 从仓库内的 woff2 还原（保证新 clone 也能跑）
    woff2 = os.path.join(ROOT, 'assets', 'fonts', 'TsangerYuYangT-W05.woff2')
    if os.path.exists(woff2):
        cache = os.path.join(ROOT, '_probe', '.fontcache', 'TsangerYuYangT-W05.ttf')
        if not os.path.exists(cache):
            try:
                from fontTools.ttLib import TTFont
            except ImportError:
                sys.exit('需要 fontTools 才能从 woff2 还原字体：pip install fonttools brotli')
            os.makedirs(os.path.dirname(cache), exist_ok=True)
            f = TTFont(woff2)
            f.flavor = None
            f.save(cache)
        return cache

    sys.exit('找不到渔阳体 TTF。请设 DEDAO_FONT_TTF=<path> 或确认 assets/fonts/TsangerYuYangT-W05.woff2 存在。')


def F(size):
    """取指定磅值的字体。"""
    return ImageFont.truetype(FONT_W05, size)


def fit_cover(im, W, H, ax=0.5, ay=0.5):
    """等比缩放并居中裁切，填满 W×H（cover）。ax/ay 为裁切锚点 0~1。"""
    sw, sh = im.size
    k = max(W / sw, H / sh)
    nw, nh = int(round(sw * k)), int(round(sh * k))
    im = im.resize((nw, nh), Image.LANCZOS)
    x = int((nw - W) * ax)
    y = int((nh - H) * ay)
    return im.crop((x, y, x + W, y + H))


def fit_contain(im, W, H):
    """等比缩放至完整放入 W×H（contain），返回缩放后的图。"""
    sw, sh = im.size
    k = min(W / sw, H / sh)
    return im.resize((max(1, int(round(sw * k))), max(1, int(round(sh * k)))), Image.LANCZOS)


def src_path(name):
    """在 assets/img/_src/ 及其子目录里找原图。"""
    base = os.path.join(ROOT, 'assets', 'img', '_src')
    for d, _, files in os.walk(base):
        if name in files:
            return os.path.join(d, name)
    raise FileNotFoundError(f'找不到原图 {name}（已在 {base} 递归查找）')


def load_src(name, trim=94):
    """读 1536×1024 原图，裁掉底部水印区（生成器水印在右下角）。"""
    im = Image.open(src_path(name)).convert('RGB')
    if trim:
        im = im.crop((0, 0, im.width, im.height - trim))
    return im


def load_img(*parts):
    p = os.path.join(ROOT, *parts)
    return Image.open(p).convert('RGBA')


def gradient(size, c_top, c_bot):
    """竖直渐变图（同尺寸）。"""
    W, H = size
    g = Image.new('RGB', (1, H))
    px = g.load()
    for y in range(H):
        t = y / max(1, H - 1)
        px[0, y] = tuple(int(c_top[i] + (c_bot[i] - c_top[i]) * t) for i in range(3))
    return g.resize((W, H), Image.BILINEAR)


def text_mask(size, xy, text, font, anchor='mm', stroke=0):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    d.text(xy, text, font=font, fill=255, anchor=anchor,
           stroke_width=stroke, stroke_fill=255)
    return m


def paste_text(base, xy, text, font, fill=GOLD, anchor='mm',
               grad=None, stroke=0, stroke_fill=INK,
               glow=None, glow_blur=14, shadow=None, shadow_off=(0, 4), shadow_blur=8,
               optical=False):
    """
    把文字贴到 base 上，支持：纯色 / 竖直渐变 / 描边 / 外发光 / 投影。

    optical=True 时按字形实际 bbox 光学居中 —— 对汉字很重要：字体度量给出的 mm 锚点
    是按 ascent/descent 中线算的，实际字面往往偏低（汉字字面偏上），大字号时肉眼很明显。
    """
    W, H = base.size
    if optical:
        probe = text_mask((W, H), xy, text, font, anchor)
        bb = probe.getbbox()
        if bb:
            dx = int(round(xy[0] - (bb[0] + bb[2]) / 2))
            dy = int(round(xy[1] - (bb[1] + bb[3]) / 2))
            xy = (xy[0] + dx, xy[1] + dy)
    mask = text_mask((W, H), xy, text, font, anchor, stroke)

    if shadow:
        sm = text_mask((W, H), (xy[0] + shadow_off[0], xy[1] + shadow_off[1]), text, font, anchor, stroke)
        sm = sm.filter(ImageFilter.GaussianBlur(shadow_blur))
        base.paste(Image.new('RGBA', (W, H), _rgba(shadow)), (0, 0), sm)

    if glow:
        gm = mask.filter(ImageFilter.GaussianBlur(glow_blur))
        base.paste(Image.new('RGBA', (W, H), _rgba(glow)), (0, 0), gm)

    if grad:
        src = gradient((W, H), grad[0], grad[1]).convert('RGBA')
    else:
        src = Image.new('RGBA', (W, H), _rgba(fill))
    base.paste(src, (0, 0), mask)

    # 描边单独压一层，保证压盖顺序（先描边后字面会糊，这里是在字面之后补描边轮廓）
    if stroke and stroke_fill:
        ring = ImageChops.subtract(
            text_mask((W, H), xy, text, font, anchor, stroke),
            text_mask((W, H), xy, text, font, anchor, 0))
        base.paste(Image.new('RGBA', (W, H), _rgba(stroke_fill)), (0, 0), ring)


def _rgba(c, a=255):
    """把 3 元组 / 4 元组统一成 RGBA。"""
    c = tuple(c)
    return c if len(c) == 4 else c + (a,)


def feather(im, fade=70, radius=0):
    """给图加四周羽化的 alpha 遮罩，用来把「深底矩形立绘」融进背景。"""
    W, H = im.size
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    if radius:
        d.rounded_rectangle((0, 0, W - 1, H - 1), radius=radius, fill=255)
    else:
        d.rectangle((0, 0, W - 1, H - 1), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(fade / 2))
    out = im.convert('RGBA')
    out.putalpha(ImageChops.multiply(out.getchannel('A'), m))
    return out


def _hero_frame(portrait, radius=18, pad=10, border=GOLD):
    """把立绘装进金边圆角卡（立绘自带不透明底色，羽化不一定够，框起来更干净）。"""
    W, H = portrait.size
    card = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=radius,
                        fill=_rgba(PANEL_2, 235), outline=_rgba(border, 210), width=4)
    d.rounded_rectangle((pad - 3, pad - 3, pad + W + 2, pad + H + 2), radius=max(2, radius - 6),
                        outline=_rgba(border, 90), width=2)
    card.alpha_composite(portrait.convert('RGBA'), (pad, pad))
    return card


def hgrad_stops(size, color, stops):
    """多停靠点水平不透明度渐变。stops = [(t, alpha), ...]，t 为 0~1。"""
    W, H = size
    row = Image.new('RGBA', (W, 1))
    px = row.load()
    stops = sorted(stops)
    for x in range(W):
        t = x / max(1, W - 1)
        a = stops[-1][1]
        for i in range(len(stops) - 1):
            t0, a0 = stops[i]
            t1, a1 = stops[i + 1]
            if t0 <= t <= t1:
                k = 0 if t1 == t0 else (t - t0) / (t1 - t0)
                a = a0 + (a1 - a0) * k
                break
        px[x, 0] = _rgba(color, int(max(0, min(255, a))))
    return row.resize((W, H), Image.NEAREST)


def rgba(im, a=255):
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    if a < 255:
        al = im.getchannel('A').point(lambda v: int(v * a / 255))
        im.putalpha(al)
    return im


def vgrad_alpha(size, c, a_top, a_bot):
    """带竖直不透明度渐变的纯色层（用于压暗上/下缘）。先算 1px 高再放大，避免百万级循环。"""
    W, H = size
    col = Image.new('RGBA', (1, H))
    px = col.load()
    for y in range(H):
        t = y / max(1, H - 1)
        px[0, y] = _rgba(c, int(a_top + (a_bot - a_top) * t))
    return col.resize((W, H), Image.NEAREST)


def hgrad_alpha(size, c, a_left, a_right, gamma=1.0):
    """带水平不透明度渐变的纯色层。"""
    W, H = size
    row = Image.new('RGBA', (W, 1))
    px = row.load()
    for x in range(W):
        t = (x / max(1, W - 1)) ** gamma
        px[x, 0] = _rgba(c, int(a_left + (a_right - a_left) * t))
    return row.resize((W, H), Image.NEAREST)


def darken(base, factor=0.6):
    return ImageEnhance.Brightness(base).enhance(factor)


def grain(im, amount=6):
    """加一层细颗粒，避免大面积渐变出现色带。"""
    W, H = im.size
    noise = Image.effect_noise((W, H), amount).convert('L')
    noise = noise.point(lambda v: 128 + (v - 128) // 3)
    return ImageChops.overlay(im.convert('RGB'), noise.convert('RGB'))


def ring(draw, cx, cy, r, color, width=3):
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=_rgba(color), width=width)


def hairline_frame(base, inset=28, color=GOLD, width=2, alpha=110, corner=64):
    """细金边框 + 四角短装饰线。"""
    W, H = base.size
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = _rgba(color, alpha)
    x0, y0, x1, y1 = inset, inset, W - inset - 1, H - inset - 1
    d.rectangle((x0, y0, x1, y1), outline=c, width=width)
    c2 = _rgba(color, min(255, alpha + 90))
    for (px, py, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        d.line((px, py, px + dx * corner, py), fill=c2, width=width + 1)
        d.line((px, py, px, py + dy * corner), fill=c2, width=width + 1)
    base.alpha_composite(layer)


def seal(base, xy, text, size=52, color=CINNABAR, radius=6):
    """朱红印章式小方块（装饰用）。"""
    W, H = base.size
    f = F(size)
    m = text_mask((W, H), xy, text, f, 'mm')
    bbox = m.getbbox()
    if not bbox:
        return
    pad = int(size * 0.26)
    x0, y0, x1, y1 = bbox[0] - pad, bbox[1] - pad, bbox[2] + pad, bbox[3] + pad
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=_rgba(color))
    base.alpha_composite(layer)
    base.paste(Image.new('RGBA', (W, H), _rgba(WHITE)), (0, 0), m)


# ───────────────────────────────── 各物料 ─────────────────────────────────

def make_icon():
    """
    图标 512×512。
    TapTap 硬约束：不得纯白/纯黑/透明背景、不得自行加圆角。
    → 满幅云海底 + 竖向暗角 + 中心金字 + 双圈金环。主体收在中心 70% 内，
      平台按圆角裁切也切不到字。
    """
    S = 512
    bg = load_src('title.png')
    bg = fit_cover(bg, S, S, ax=0.30, ay=0.40)
    bg = darken(bg, 0.40)
    bg = grain(bg, 7).convert('RGBA')

    # 竖向暗角（上略压、下重压），让中心自然亮出来 —— 比画椭圆更干净，不会露出亮斑边界
    bg.alpha_composite(vgrad_alpha((S, S), INK_2, 120, 205))
    bg.alpha_composite(hgrad_stops((S, S), INK_2, [(0, 165), (0.28, 0), (0.72, 0), (1, 165)]))

    d = ImageDraw.Draw(bg)
    ring(d, S / 2, S / 2, 208, GOLD, 4)
    ring(d, S / 2, S / 2, 194, _rgba(GOLD, 70), 2)

    paste_text(bg, (S / 2, S / 2), '道', F(262), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=6, stroke_fill=(42, 30, 8),
               glow=_rgba(GOLD, 46), glow_blur=30,
               shadow=INK, shadow_off=(0, 7), shadow_blur=12)

    out = os.path.join(OUT_DIR, '图标_512x512.png')
    bg.convert('RGB').save(out)
    return out


def make_logo():
    """LOGO PNG，透明底，横版。TapTap 要求宽≥1280 或 高≥720。"""
    W, H = 2048, 768
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    paste_text(base, (W / 2, 322), '得道飞升', F(360), anchor='mm',
               grad=(GOLD_L, GOLD), stroke=4, stroke_fill=(54, 38, 8),
               glow=GOLD + (44,), glow_blur=22)

    # 副标题 + 左右短分隔线
    paste_text(base, (W / 2, 566), '模拟器', F(120), anchor='mm', fill=LILAC,
               stroke=2, stroke_fill=(48, 34, 12))
    d = ImageDraw.Draw(base)
    y = 566
    d.line((W / 2 - 470, y, W / 2 - 250, y), fill=GOLD + (150,), width=3)
    d.line((W / 2 + 250, y, W / 2 + 470, y), fill=GOLD + (150,), width=3)
    for sx in (-1, 1):
        cx = W / 2 + sx * 520
        d.polygon([(cx, y - 12), (cx + 12 * sx, y), (cx, y + 12)], fill=GOLD + (170,))

    paste_text(base, (W / 2, 686), 'D E D A O   ·   S I N C E   2 0 2 5', F(40), anchor='mm',
               fill=MUTED + (215,))

    out = os.path.join(OUT_DIR, 'LOGO_2048x768.png')
    base.save(out)
    return out


def _hero_portrait(target_h, feather_px=None):
    """
    主角立绘。像素风 → NEAREST 放大，放大后仍保留像素质感。
    me.png 是不透明深底矩图，直接贴会露出方块边，默认按宽度的 9% 做四周羽化。
    """
    me = load_img('assets', 'img', 'portrait', 'me.png')
    k = target_h / me.height
    im = me.resize((int(me.width * k), target_h), Image.NEAREST)
    f = feather_px if feather_px is not None else int(im.width * 0.09)
    return feather(im, fade=f)


def make_hero_banner():
    """详情页顶部图 1920×1080。安全区 1760×920（四周各留 80），文字全部落在安全区内。"""
    W, H = 1920, 1080
    bg = load_src('title.png')
    bg = fit_cover(bg, W, H, ax=0.34, ay=0.5).convert('RGBA')

    # 左重右轻的压暗，给文字留对比度
    dark = Image.new('L', (W, 1), 0)
    dpx = dark.load()
    for x in range(W):
        t = x / (W - 1)
        dpx[x, 0] = int(232 * max(0.0, 1.0 - (t / 0.72) ** 1.25))
    dark = dark.resize((W, H), Image.NEAREST)
    bg.paste(Image.new('RGBA', (W, H), _rgba(INK_2)), (0, 0), dark)
    bg.alpha_composite(vgrad_alpha((W, H), INK, 150, 215))

    # 主角立绘（右侧，略微出血到安全区外，属装饰不算信息）
    hero = _hero_portrait(780, feather_px=120)
    hx = W - hero.width - 150
    bg.alpha_composite(hero, (hx, H - hero.height + 60))

    paste_text(bg, (150, 352), '得道飞升', F(196), anchor='lm',
               grad=(GOLD_L, GOLD), stroke=4, stroke_fill=(50, 36, 8),
               glow=GOLD + (40,), glow_blur=20, shadow=INK, shadow_off=(0, 6), shadow_blur=12)
    paste_text(bg, (150, 500), '模 拟 器', F(96), anchor='lm', fill=LILAC,
               stroke=2, stroke_fill=(48, 34, 12), shadow=INK, shadow_off=(0, 4), shadow_blur=8)

    d = ImageDraw.Draw(bg)
    d.line((150, 592, 610, 592), fill=GOLD + (170,), width=3)

    paste_text(bg, (150, 668), '一命一轮回 · 百世证长生', F(64), anchor='lm',
               fill=(240, 232, 214) + (255,), shadow=INK, shadow_off=(0, 4), shadow_blur=8)
    paste_text(bg, (150, 748), '修仙文字模拟 · 五行法术 · 轮回转世 · 随机命格', F(40), anchor='lm',
               fill=MUTED + (255,))

    # 右下小标签
    seal(bg, (W - 250, H - 150), '仙', size=68)

    hairline_frame(bg, inset=80, alpha=60, corner=96)
    out = os.path.join(OUT_DIR, '顶部图_1920x1080.png')
    bg.convert('RGB').save(out)
    return out


def _screenshot_card(path, height, radius=10, border=GOLD):
    """把一张竖版截图做成带金边的浮层卡片。"""
    im = Image.open(path).convert('RGBA')
    k = height / im.height
    im = im.resize((int(im.width * k), height), Image.LANCZOS)
    card = Image.new('RGBA', (im.width + 8, im.height + 8), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=radius,
                        outline=_rgba(border, 190), width=3)
    card.alpha_composite(im, (4, 4))
    return card


def make_promo_16x9():
    """宣传图 16:9，1920×1080。左侧卖点、右侧实机截图立牌。"""
    W, H = 1920, 1080
    bg = load_src('Vast_sea_of_clouds_with_floati_2026-09-06T08-52-45.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.40).convert('RGBA')
    bg = darken(bg, 0.46)
    bg.alpha_composite(vgrad_alpha((W, H), INK, 110, 200))
    bg.alpha_composite(hgrad_stops((W, H), INK_2, [(0, 180), (0.45, 0), (1, 90)]))

    shots = os.path.join(ROOT, 'dist', 'taptap', 'screenshots')
    back = _screenshot_card(os.path.join(shots, '09_开荒命数自定.png'), 620, border=MUTED)
    front = _screenshot_card(os.path.join(shots, '02_战斗_五行法术.png'), 700, border=GOLD)
    mid = _screenshot_card(os.path.join(shots, '04_角色属性.png'), 560, border=MUTED)

    # 投影：卡片整体做一层模糊黑影再贴，避免「浮空贴纸」感
    for card, pos in ((back, (1148, 250)), (mid, (1652, 330)), (front, (1360, 236))):
        sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
        sh.paste(Image.new('RGBA', card.size, (0, 0, 0, 150)), pos, card.getchannel('A'))
        bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
    for card, pos in ((back, (1148, 250)), (mid, (1652, 330)), (front, (1360, 236))):
        bg.alpha_composite(card, pos)

    paste_text(bg, (120, 268), '修 仙', F(150), anchor='lm',
               grad=(GOLD_L, GOLD), stroke=4, stroke_fill=(50, 36, 8), glow=_rgba(GOLD, 34), glow_blur=18)
    paste_text(bg, (120, 418), '一世一劫 · 百世飞升', F(92), anchor='lm', fill=WHITE,
               shadow=INK, shadow_off=(0, 5), shadow_blur=10)

    d = ImageDraw.Draw(bg)
    d.line((120, 502, 700, 502), fill=_rgba(GOLD, 190), width=4)

    feats = ['▸ 上千条随机事件 · 每一次开局都不一样',
             '▸ 五行生克 · 黄玄地天四阶法术',
             '▸ 轮回塔天赋 · 死亡不是终点',
             '▸ 纯单机 · 无内购 · 无广告']
    y = 592
    for t in feats:
        paste_text(bg, (124, y), t, F(48), anchor='lm', fill=(228, 220, 242))
        y += 78

    paste_text(bg, (W - 120, H - 92), 'DEDAO · 得道飞升模拟器', F(38), anchor='rm', fill=MUTED)
    hairline_frame(bg, inset=44, alpha=70, corner=84)

    out = os.path.join(OUT_DIR, '宣传图_16x9_1920x1080.png')
    bg.convert('RGB').save(out)
    return out


def make_promo_1x1():
    """1:1 宣传图，1440×1440。"""
    S = 1440
    bg = load_src('tian.png')
    bg = fit_cover(bg, S, S, ax=0.5, ay=0.42).convert('RGBA')
    bg = darken(bg, 0.44)
    bg.alpha_composite(vgrad_alpha((S, S), INK_2, 150, 210))

    hero = _hero_frame(_hero_portrait(700), border=GOLD)
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    sh.paste(Image.new('RGBA', hero.size, (0, 0, 0, 170)), (S // 2 - hero.width // 2, 300), hero.getchannel('A'))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    bg.alpha_composite(hero, (S // 2 - hero.width // 2, 300))

    paste_text(bg, (S / 2, 156), '得道飞升模拟器', F(104), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD), stroke=3, stroke_fill=(50, 36, 8), glow=_rgba(GOLD, 40), glow_blur=18)

    d = ImageDraw.Draw(bg)
    d.line((300, 242, S - 300, 242), fill=_rgba(GOLD, 175), width=3)

    paste_text(bg, (S / 2, 1188), '一世一劫 · 百世飞升', F(88), anchor='mm', fill=WHITE,
               shadow=INK, shadow_off=(0, 5), shadow_blur=10)
    paste_text(bg, (S / 2, 1288), '纯单机 · 无内购 · 无广告', F(50), anchor='mm', fill=LILAC)
    paste_text(bg, (S / 2, 1372), '修仙文字模拟 · 五行法术 · 轮回转世', F(42), anchor='mm', fill=MUTED)

    hairline_frame(bg, inset=52, alpha=70, corner=96)
    out = os.path.join(OUT_DIR, '宣传图_1x1_1440x1440.png')
    bg.convert('RGB').save(out)
    return out


def make_vertical_cover():
    """竖版封面 ≥600×900，出 1200×1800。"""
    W, H = 1200, 1800
    bg = load_src('Cloud_ruins_of_an_ancient_immo_2026-09-06T08-52-48.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.38).convert('RGBA')
    bg = darken(bg, 0.46)
    bg.alpha_composite(vgrad_alpha((W, H), INK_2, 205, 120))
    bg.alpha_composite(vgrad_alpha((W, H), INK, 60, 215))

    card = _screenshot_card(os.path.join(ROOT, 'dist', 'taptap', 'screenshots',
                                         '01_主界面_修行.png'), 900)
    bg.alpha_composite(card, (W // 2 - card.width // 2, 700))

    paste_text(bg, (W / 2, 236), '得道飞升', F(190), anchor='mm',
               grad=(GOLD_L, GOLD), stroke=4, stroke_fill=(50, 36, 8), glow=GOLD + (44,), glow_blur=20)
    paste_text(bg, (W / 2, 378), '模 拟 器', F(84), anchor='mm', fill=LILAC + (255,))

    d = ImageDraw.Draw(bg)
    d.line((170, 466, W - 170, 466), fill=GOLD + (170,), width=3)

    paste_text(bg, (W / 2, 546), '一世一劫 · 百世飞升', F(66), anchor='mm', fill=WHITE + (255,))
    paste_text(bg, (W / 2, 626), '修仙文字模拟 · 纯单机 · 无内购', F(42), anchor='mm', fill=MUTED + (255,))

    paste_text(bg, (W / 2, H - 96), '一命一轮回 · 每一世都是新故事', F(46), anchor='mm', fill=LILAC + (255,))
    hairline_frame(bg, inset=42, alpha=70, corner=90)

    out = os.path.join(OUT_DIR, '竖版封面_1200x1800.png')
    bg.convert('RGB').save(out)
    return out


def make_horizontal_cover():
    """横版封面 ≥460×215，出 1920×900。"""
    W, H = 1920, 900
    bg = load_src('xian.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.44).convert('RGBA')
    bg = darken(bg, 0.48)
    bg.alpha_composite(vgrad_alpha((W, H), INK_2, 120, 205))

    hero = _hero_frame(_hero_portrait(560), border=GOLD)
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    sh.paste(Image.new('RGBA', hero.size, (0, 0, 0, 170)), (W - hero.width - 128, 176), hero.getchannel('A'))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    bg.alpha_composite(hero, (W - hero.width - 128, 176))

    paste_text(bg, (140, 300), '得道飞升模拟器', F(132), anchor='lm',
               grad=(GOLD_L, GOLD), stroke=4, stroke_fill=(50, 36, 8), glow=GOLD + (38,), glow_blur=18)
    paste_text(bg, (140, 440), '一世一劫 · 百世飞升', F(66), anchor='lm', fill=WHITE + (255,),
               shadow=INK, shadow_off=(0, 4), shadow_blur=8)
    paste_text(bg, (140, 540), '修仙文字模拟 · 五行法术 · 轮回转世 · 无内购无广告', F(40), anchor='lm',
               fill=MUTED + (255,))

    d = ImageDraw.Draw(bg)
    d.line((140, 388, 700, 388), fill=GOLD + (170,), width=3)

    hairline_frame(bg, inset=40, alpha=70, corner=80)
    out = os.path.join(OUT_DIR, '横版封面_1920x900.png')
    bg.convert('RGB').save(out)
    return out


def make_wallpaper():
    """
    库背景壁纸 3840×1240，**画面内不得有任何文字/logo**。

    源图只有 1536×930（去水印后），直接放到 3840 宽要放大 2.5×，必糊。
    做法：中间放「原生清晰」的主体（只放大 1.33×），两侧用镜像+强模糊延展，
    再用一条多停靠点水平暗化把两侧压到近黑 —— 接缝被暗化吃掉，看不出拼痕。
    """
    W, H = 3840, 1240
    src = load_src('title.png')           # 1536×930

    center_w = int(src.width * (H / src.height))     # 等比放到高 1240 → 约 2048
    center = src.resize((center_w, H), Image.LANCZOS)
    cx = (W - center_w) // 2

    base = Image.new('RGB', (W, H), INK_2)

    # 左右延展：中心图镜像后大幅模糊 + 压暗
    side = center.transpose(Image.FLIP_LEFT_RIGHT)
    pad = cx + 420
    for pos in (0, W - pad):
        s2 = side.resize((pad, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(48))
        base.paste(ImageEnhance.Brightness(s2).enhance(0.34), (pos, 0))

    # 中心图带左右羽化贴上（羽化宽度 = 接缝处，后面还会被暗化覆盖）
    fade = 460
    m = Image.new('L', (center_w, H), 255)
    mp = m.load()
    for x in range(fade):
        v = int(255 * (x / fade) ** 1.6)
        for y in range(H):
            mp[x, y] = v
            mp[center_w - 1 - x, y] = v
    base.paste(center, (cx, 0), m)

    base = base.convert('RGBA')
    # 氛围：上暖下暗
    base.alpha_composite(vgrad_alpha((W, H), (10, 8, 16), 30, 165))
    # 两侧压到近黑 —— 这一步是「看不见接缝」的关键
    base.alpha_composite(hgrad_stops((W, H), INK_2, [
        (0.00, 236), (0.10, 196), (0.22, 120), (0.32, 30), (0.42, 0),
        (0.58, 0), (0.68, 30), (0.78, 120), (0.90, 196), (1.00, 236)]))

    base = ImageEnhance.Brightness(base.convert('RGB')).enhance(0.84)
    base = grain(base, 4)
    base = ImageEnhance.Contrast(base).enhance(1.06)

    out = os.path.join(OUT_DIR, '库背景壁纸_3840x1240.png')
    # 用 JPEG 思路压体积：PNG 量化到 256 色会出色带，这里直接 optimize
    base.convert('RGB').save(out, optimize=True)
    return out


def make_video_cover():
    """实机视频封面 1256×706。"""
    W, H = 1256, 706
    bg = load_src('dujie.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.42).convert('RGBA')
    bg = darken(bg, 0.40)
    bg.alpha_composite(vgrad_alpha((W, H), INK, 90, 190))

    # 播放按钮
    cx, cy, r = W / 2, H / 2, 84
    d = ImageDraw.Draw(bg)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=INK + (150,), outline=GOLD + (235,), width=4)
    d.polygon([(cx - 26, cy - 38), (cx + 42, cy), (cx - 26, cy + 38)], fill=GOLD_L + (255,))

    paste_text(bg, (W / 2, 92), '实机演示', F(64), anchor='mm',
               grad=(GOLD_L, GOLD), stroke=3, stroke_fill=(50, 36, 8), glow=GOLD + (36,), glow_blur=16)
    paste_text(bg, (W / 2, H - 84), '得道飞升模拟器 · 一世一劫 百世飞升', F(38), anchor='mm',
               fill=WHITE + (255,), shadow=INK, shadow_off=(0, 4), shadow_blur=8)

    hairline_frame(bg, inset=26, alpha=70, corner=58)
    out = os.path.join(OUT_DIR, '视频封面_1256x706.png')
    bg.convert('RGB').save(out)
    return out


# ───────────────────────────────── 主流程 ─────────────────────────────────

BUILDERS = [
    ('图标 512×512',            make_icon,              (512, 512)),
    ('LOGO 2048×768',          make_logo,              (2048, 768)),
    ('顶部图 1920×1080',        make_hero_banner,       (1920, 1080)),
    ('宣传图 16:9 1920×1080',   make_promo_16x9,        (1920, 1080)),
    ('宣传图 1:1 1440×1440',    make_promo_1x1,         (1440, 1440)),
    ('竖版封面 1200×1800',      make_vertical_cover,    (1200, 1800)),
    ('横版封面 1920×900',       make_horizontal_cover,  (1920, 900)),
    ('库背景壁纸 3840×1240',    make_wallpaper,         (3840, 1240)),
    ('视频封面 1256×706',       make_video_cover,       (1256, 706)),
]


def main():
    global FONT_W05
    FONT_W05 = resolve_font()
    print('字体：', FONT_W05)
    os.makedirs(OUT_DIR, exist_ok=True)

    rows, bad = [], []
    for label, fn, want in BUILDERS:
        out = fn()
        im = Image.open(out)
        ok = im.size == want
        if not ok:
            bad.append((label, im.size, want))
        size_kb = os.path.getsize(out) // 1024
        rows.append((label, os.path.basename(out), f'{im.size[0]}×{im.size[1]}',
                     f'{size_kb}KB', 'OK' if ok else f'!! 期望 {want}'))
        print(f'{"OK " if ok else "!! "}{label:<24} {im.size[0]}×{im.size[1]:<6} {size_kb}KB')

    print('\n全部产出 →', OUT_DIR, f'（{len(rows)} 件）')
    if bad:
        # 尺寸即合规 —— 不达标必须让 CI/人立刻看见，不能只打印一行
        for label, got, want in bad:
            print(f'✗ 尺寸不达标：{label} 实际 {got[0]}×{got[1]}，官方要求 {want[0]}×{want[1]}',
                  file=sys.stderr)
        sys.exit(1)
    print('✓ 尺寸自检通过（全部 ≥ 官方下限）')
    return rows


if __name__ == '__main__':
    main()
