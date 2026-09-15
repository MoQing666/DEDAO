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


# ---------------- 手书「道」混合字标 ----------------
# 「道」字改用用户手写草书真迹（assets/img/brand/dao_handwritten.png，版权 100% 用户），
# 其余字仍用游戏字库。视觉与原字标一致（同渐变/描边/发光/投影）。

_DAO_GLYPH = None


def _dao_glyph():
    global _DAO_GLYPH
    if _DAO_GLYPH is None:
        g = Image.open(os.path.join(ROOT, 'assets', 'img', 'brand',
                                    'dao_handwritten.png')).convert('RGBA')
        _DAO_GLYPH = g.crop(g.getbbox())
    return _DAO_GLYPH


def wordmark_mask(size, xy, text, font, anchor='mm', stroke=0, optical=False):
    """
    生成混合字标的 L 掩码：'道' 用手迹 alpha，其余字符用 font 绘制。
    手迹按参考字（第一个非'道'字）的字面高度缩放、按其视觉中心对齐。
    """
    W, H = size
    probe = ImageDraw.Draw(Image.new('L', (8, 8)))

    # 参考字度量：字面 bbox（相对 lm 锚点）
    ref_ch = next((c for c in text if c != '道'), text[0])
    rb = probe.textbbox((0, 0), ref_ch, font=font, anchor='lm')
    ref_h = rb[3] - rb[1]
    ref_cy = (rb[1] + rb[3]) / 2          # 字面中心相对锚点 y 的偏移

    # 手迹缩放到参考字字面高（略放大 4%，草书字面偏瘦）
    g = _dao_glyph()
    k = ref_h * 1.04 / g.height
    gw, gh = max(1, int(g.width * k)), max(1, int(g.height * k))
    glyph = g.resize((gw, gh), Image.LANCZOS)

    # 逐字排布：字库字用 textlength，手迹用缩放宽 + 2% 字距
    advs, xs = [], []
    x = 0
    for ch in text:
        if ch == '道':
            advs.append((ch, x, gw * 1.02))
            x += gw * 1.02
        else:
            a = probe.textlength(ch, font=font)
            advs.append((ch, x, a))
            x += a
    total = x

    def build(dx, dy):
        cx_offset = -total / 2 if anchor.startswith('m') else 0
        m = Image.new('L', (W, H), 0)
        dm = ImageDraw.Draw(m)
        for ch, cx0, a in advs:
            px = xy[0] + cx_offset + cx0 + dx
            if ch == '道':
                # 上提 5%：草书笔画重心偏下（长捺拖尾），视觉对齐字库字
                m.paste(glyph.split()[3],
                        (int(px), int(xy[1] + ref_cy - gh / 2 - 0.05 * gh + dy)),
                        glyph.split()[3])
            else:
                dm.text((px, xy[1] + dy), ch, font=font, fill=255, anchor='lm')
        return m

    if optical:
        m0 = build(0, 0)
        bb = m0.getbbox()
        if bb:
            dx = xy[0] - (bb[0] + bb[2]) / 2
            dy = xy[1] - (bb[1] + bb[3]) / 2
            return build(dx, dy), (xy[0], xy[1])
    return build(0, 0), (xy[0], xy[1])


def paste_wordmark(base, xy, text, font, fill=GOLD, anchor='mm',
                   grad=None, stroke=0, stroke_fill=INK,
                   glow=None, glow_blur=14, shadow=None, shadow_off=(0, 4), shadow_blur=8,
                   optical=False):
    """paste_text 的混合字标版：'道' 为手迹真迹，效果栈与 paste_text 相同。"""
    W, H = base.size
    mask, xy2 = wordmark_mask((W, H), xy, text, font, anchor, stroke, optical)

    if shadow:
        sm = mask.transform((W, H), Image.AFFINE,
                            (1, 0, -shadow_off[0], 0, 1, -shadow_off[1]))
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

    if stroke and stroke_fill:
        ring = ImageChops.subtract(
            mask.filter(ImageFilter.MaxFilter(2 * stroke + 1)), mask)
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


def divider(base, cy, x0, x1, color=GOLD, alpha=180, width=3, diamond=13, gap=11):
    """
    中式双线分隔符（**纯几何，不含任何文字**）。

    存在的理由：审核细则 2.7.1 要求宣传图上「不得出现游戏名以外的文字」，
    原先用来做视觉层次的 slogan 全部违规，层次感只能改由图形承担。
    """
    W, H = base.size
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = _rgba(color, alpha)
    cx = (x0 + x1) / 2
    for dy in (-gap / 2, gap / 2):
        d.line((x0, cy + dy, cx - diamond - 26, cy + dy), fill=c, width=width)
        d.line((cx + diamond + 26, cy + dy, x1, cy + dy), fill=c, width=width)
    d.polygon([(cx, cy - diamond), (cx + diamond, cy),
               (cx, cy + diamond), (cx - diamond, cy)], outline=c)
    base.alpha_composite(layer)


def cloud_band(base, cy, x0, x1, n=3, r=52, color=GOLD, alpha=115, width=3):
    """云头纹装饰带（纯几何圆弧）。中式气质靠它体现，不靠文字。"""
    W, H = base.size
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = _rgba(color, alpha)
    span = x1 - x0
    for i in range(n):
        cx = x0 + span * (i + 0.5) / n
        d.arc((cx - r, cy - r, cx + r, cy + r), 200, 340, fill=c, width=width)
    base.alpha_composite(layer)


def glow_orb(base, cx, cy, r, color=GOLD, alpha=70):
    """柔光光晕（纯图形）。去掉文案后用来撑住画面重心的亮点。"""
    W, H = base.size
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(max(8.0, r / 2.2)))
    orb = Image.new('RGBA', (W, H), _rgba(color))
    orb.putalpha(m)
    base.alpha_composite(orb)


# ───────────────────────────────── 各物料 ─────────────────────────────────

def make_icon():
    """
    图标 512×512 —— **宣纸墨迹版（定稿 2026-09-15）**。

    TapTap 硬约束：不得纯白/纯黑/透明背景、不得自行加圆角。
    → 米白宣纸底（细颗粒 + 暗角）+ 用户手书草书「道」真迹（墨色原样）
      + 右下「得道飞升」朱印（游戏字库白文）。主体收在中心 70% 内，
      平台按圆角裁切也切不到主体。
    历史：v1/v2 为「云海+金环+字库/AI 底图」方案，已否（AI 画汉字不可控，
    用户提供手写真迹后全面改用手迹管线）。
    """
    import random
    S = 512
    # 宣纸底：米白 + 细颗粒 + 椭圆暗角
    im = Image.new('RGB', (S, S), (241, 235, 222))
    rnd = random.Random(7)
    px = im.load()
    for y in range(S):
        for x in range(S):
            n = rnd.randint(-7, 7)
            r, g, b = px[x, y]
            px[x, y] = (r + n, g + n, b + n - 2)
    vg = Image.new('L', (S, S), 0)
    ImageDraw.Draw(vg).ellipse([-S * 0.35, -S * 0.35, S * 1.35, S * 1.35], fill=46)
    vg = vg.filter(ImageFilter.GaussianBlur(90))
    bg = Image.composite(im, Image.new('RGB', (S, S), (214, 205, 188)), vg).convert('RGBA')

    # 手迹「道」：墨色原样，居中偏上
    g = _dao_glyph()
    k = int(S * 0.66) / g.height
    g = g.resize((int(g.width * k), int(S * 0.66)), Image.LANCZOS)
    ax, ay = (S - g.width) // 2, int(S * 0.10)
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sh.paste(Image.new('RGBA', g.size, (60, 50, 40, 70)), (ax + 5, ay + 7), g)
    bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(4)))
    bg.alpha_composite(g, (ax, ay))

    # 朱印「得道飞升」2x2 白文
    seal = Image.new('RGBA', (int(S * 0.16),) * 2, (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    m = int(S * 0.16 * 0.04)
    sd.rounded_rectangle([0, 0, seal.width - 1, seal.height - 1],
                         radius=int(seal.width * 0.10), fill=(166, 32, 28, 235))
    fnt = F(int(seal.width * 0.40))
    for t, cx, cy in [('得', 0, 0), ('道', 1, 0), ('飞', 0, 1), ('升', 1, 1)]:
        cw = (seal.width - 2 * m) / 2
        sd.text((m + cw * cx + cw / 2, m + cw * cy + cw / 2), t, font=fnt,
                fill=(244, 238, 228, 255), anchor='mm')
    bg.alpha_composite(seal, (int(S * 0.72), int(S * 0.76)))

    out = os.path.join(OUT_DIR, '图标_512x512.png')
    bg.convert('RGB').save(out)
    return out


def make_logo():
    """
    游戏 LOGO 2048×768，**透明底**。

    官方：尺寸需满足「1280px 宽」或「720px 高」其一，格式 png，≤4MB；
          「非设计元素以外的空间皆用透明度处理」。

    ⚠ 2026-09-15 修正：移除原先的英文行「D E D A O · S I N C E 2 0 2 5」。
      LOGO 与封面/宣传图是同一套视觉资产，细则 2.7.1 与封面规则都要求
      「不得出现游戏名以外的文字」，统一收紧避免连带驳回。
      可读内容只剩游戏名「得道飞升模拟器」（两行排版）。
    """
    W, H = 2048, 768
    base = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    # 光晕：透明底上唯一能撑重心的元素
    glow_orb(base, W / 2, 320, 560, GOLD, 46)

    paste_wordmark(base, (W / 2, 300), '得道飞升', F(340), anchor='mm', optical=True,
                   grad=(GOLD_L, GOLD_D), glow=GOLD + (52,), glow_blur=28)
    paste_text(base, (W / 2, 596), '模 拟 器', F(120), anchor='mm', optical=True, fill=LILAC,
               stroke=2, stroke_fill=(48, 34, 12))

    divider(base, 478, 470, W - 470, gap=10, diamond=14)

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
    """
    详情页顶部图 1920×1080。安全区 1760×920（四周各留 80），文字全部落在安全区内。

    ⚠ 审核约束（官方物料页原文）：详情页顶部图
       "Do not include text other than the game title."
       ⇒ 本图**只允许出现游戏名**。
       2026-09-15 修正：原先的「一命一轮回 · 百世证长生」
       「修仙文字模拟 · 五行法术 · 轮回转世 · 随机命格」与「仙」朱印全部移除，
       改用双线分隔符 + 云头纹 + 光晕承担视觉层次。
    """
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

    glow_orb(bg, 620, 480, 580, GOLD, 38)

    # 主角立绘（右侧，略微出血到安全区外，属装饰不算信息）
    # 尺寸与 x 要让开左侧游戏名 —— 游戏名单行 F(140) 宽约 980，165+980=1145 < 1253
    hero = _hero_portrait(700, feather_px=110)
    hx = W - hero.width - 130
    bg.alpha_composite(hero, (hx, H - hero.height + 60))

    # 唯一文字：游戏名（「道」为用户手迹真迹）
    paste_wordmark(bg, (165, 470), '得道飞升模拟器', F(140), anchor='lm',
                   grad=(GOLD_L, GOLD_D), stroke=4, stroke_fill=(50, 36, 8),
                   glow=GOLD + (44,), glow_blur=22, shadow=INK, shadow_off=(0, 7), shadow_blur=13)

    divider(bg, 624, 172, 980, gap=12, diamond=15)
    cloud_band(bg, 742, 230, 880, n=3, r=46, alpha=105)

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
    """
    宣传图 16:9，1920×1080。

    ⚠ 审核约束（《TapTap 游戏审核规范细则》2.7）：
       2.7.1 宣传图需含有游戏名，**且请勿出现游戏名以外的文字**
       2.7.2 不得直接使用未经排版的游戏截图
       2.7.3 **不得使用多图拼接、平铺的素材**
       2.7.4 不得出现游戏 ICON 图标素材
       2.7.7 不得出现实物手机

    ⇒ 2026-09-15 整段重做。原版是「左侧 4 条卖点 + 右侧 3 张截图立牌」，
      **同时踩了 2.7.1（卖点文案）与 2.7.3（多图拼接）两条红线**。
      现改为「单一实景主体 + 游戏名 + 纯几何装饰」。
    """
    W, H = 1920, 1080
    bg = load_src('Vast_sea_of_clouds_with_floati_2026-09-06T08-52-45.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.40).convert('RGBA')
    bg = darken(bg, 0.44)
    bg.alpha_composite(vgrad_alpha((W, H), INK, 120, 205))

    # 单一主体：主角立绘（不是截图拼接，2.7.3 不适用）
    hero = _hero_portrait(640, feather_px=118)
    bg.alpha_composite(hero, (W - hero.width - 200, H - hero.height + 30))

    glow_orb(bg, 600, 460, 560, GOLD, 40)

    # 唯一文字：游戏名
    paste_wordmark(bg, (600, 420), '得道飞升模拟器', F(132), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=4, stroke_fill=(50, 36, 8),
               glow=GOLD + (46,), glow_blur=24, shadow=INK, shadow_off=(0, 7), shadow_blur=13)

    divider(bg, 556, 200, 1000, gap=13, diamond=16)
    cloud_band(bg, 676, 260, 940, n=3, r=46, alpha=105)

    hairline_frame(bg, inset=44, alpha=70, corner=84)
    out = os.path.join(OUT_DIR, '宣传图_16x9_1920x1080.png')
    bg.convert('RGB').save(out)
    return out


def make_promo_1x1():
    """
    1:1 宣传图，1440×1440。

    ⚠ 审核约束见 make_promo_16x9。2026-09-15 修正：移除「一世一劫 · 百世飞升」
      「纯单机 · 无内购 · 无广告」「修仙文字模拟 · 五行法术 · 轮回转世」三行
      —— 既踩 2.7.1（非游戏名文字），其中「无内购无广告」还属商业化宣传用语
      （细则 2.9.2 对本类用语有明确限制）。只保留游戏名。
    """
    S = 1440
    bg = load_src('tian.png')
    bg = fit_cover(bg, S, S, ax=0.5, ay=0.42).convert('RGBA')
    bg = darken(bg, 0.44)
    bg.alpha_composite(vgrad_alpha((S, S), INK_2, 150, 215))

    glow_orb(bg, S / 2, 320, 520, GOLD, 40)

    hero = _hero_portrait(560, feather_px=105)
    bg.alpha_composite(hero, (S // 2 - hero.width // 2, 650))

    # 唯一文字：游戏名
    paste_wordmark(bg, (S / 2, 250), '得道飞升模拟器', F(118), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=3, stroke_fill=(50, 36, 8),
               glow=GOLD + (44,), glow_blur=22, shadow=INK, shadow_off=(0, 6), shadow_blur=12)

    divider(bg, 372, 330, S - 330, gap=12, diamond=15)
    cloud_band(bg, 470, 470, S - 470, n=2, r=44, alpha=100)

    hairline_frame(bg, inset=52, alpha=70, corner=96)
    out = os.path.join(OUT_DIR, '宣传图_1x1_1440x1440.png')
    bg.convert('RGB').save(out)
    return out


def make_vertical_cover():
    """
    竖版封面 ≥600×900，出 1200×1800。

    ⚠ 审核约束（官方物料页）：游戏封面「**必须带有游戏 LOGO、游戏标题，且不得
      出现游戏标题以外的宣传性文字**」。
      2026-09-15 修正：原先 3 行副标题与底部一行副标题全部移除，只留游戏名。
      封面内保留 1 张实机截图 —— 这属「游戏内容展示」，非「宣传性文字」，规则未禁止。
    """
    W, H = 1200, 1800
    bg = load_src('Cloud_ruins_of_an_ancient_immo_2026-09-06T08-52-48.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.38).convert('RGBA')
    bg = darken(bg, 0.46)
    bg.alpha_composite(vgrad_alpha((W, H), INK_2, 205, 120))
    bg.alpha_composite(vgrad_alpha((W, H), INK, 60, 215))

    glow_orb(bg, W / 2, 300, 460, GOLD, 38)

    card = _screenshot_card(os.path.join(ROOT, 'dist', 'taptap', 'screenshots',
                                         '01_主界面_修行.png'), 900)
    bg.alpha_composite(card, (W // 2 - card.width // 2, 690))

    # 唯一文字：游戏名
    paste_wordmark(bg, (W / 2, 250), '得道飞升模拟器', F(118), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=4, stroke_fill=(50, 36, 8),
               glow=GOLD + (44,), glow_blur=22, shadow=INK, shadow_off=(0, 6), shadow_blur=12)

    divider(bg, 374, 200, W - 200, gap=12, diamond=15)
    cloud_band(bg, 472, 380, W - 380, n=2, r=44, alpha=100)

    hairline_frame(bg, inset=42, alpha=70, corner=90)
    out = os.path.join(OUT_DIR, '竖版封面_1200x1800.png')
    bg.convert('RGB').save(out)
    return out


def make_horizontal_cover():
    """
    横版封面 ≥460×215，出 1920×900。

    ⚠ 审核约束同 make_vertical_cover：不得出现游戏标题以外的宣传性文字。
      2026-09-15 修正：移除「一世一劫 · 百世飞升」与「修仙文字模拟 · 五行法术 ·
      轮回转世 · 无内购无广告」两行。
    """
    W, H = 1920, 900
    bg = load_src('xian.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.44).convert('RGBA')
    bg = darken(bg, 0.48)
    bg.alpha_composite(vgrad_alpha((W, H), INK_2, 120, 205))

    glow_orb(bg, 620, 420, 540, GOLD, 40)

    hero = _hero_frame(_hero_portrait(560), border=GOLD)
    sh = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    sh.paste(Image.new('RGBA', hero.size, (0, 0, 0, 170)), (W - hero.width - 128, 176), hero.getchannel('A'))
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    bg.alpha_composite(hero, (W - hero.width - 128, 176))

    # 唯一文字：游戏名
    paste_wordmark(bg, (600, 400), '得道飞升模拟器', F(132), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=4, stroke_fill=(50, 36, 8),
               glow=GOLD + (42,), glow_blur=20, shadow=INK, shadow_off=(0, 6), shadow_blur=12)

    divider(bg, 540, 200, 1000, gap=13, diamond=16)
    cloud_band(bg, 660, 260, 940, n=3, r=46, alpha=105)

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
    """
    实机视频封面 1256×706。

    ⚠ 2026-09-15 修正：移除「实机演示」与副标题「一世一劫 百世飞升」。
      规则对视频封面文字未单独列举，但与本套物料口径保持一致 ——
      除游戏名外不放其他文字，避免连带驳回。
    """
    W, H = 1256, 706
    bg = load_src('dujie.png')
    bg = fit_cover(bg, W, H, ax=0.5, ay=0.42).convert('RGBA')
    bg = darken(bg, 0.40)
    bg.alpha_composite(vgrad_alpha((W, H), INK, 90, 190))

    glow_orb(bg, W / 2, H / 2, 300, GOLD, 34)

    # 播放按钮（标准视频封面语汇，非文字）
    cx, cy, r = W / 2, H / 2 - 20, 82
    d = ImageDraw.Draw(bg)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=INK + (150,), outline=GOLD + (235,), width=4)
    d.polygon([(cx - 25, cy - 37), (cx + 41, cy), (cx - 25, cy + 37)], fill=GOLD_L + (255,))

    # 唯一文字：游戏名
    paste_wordmark(bg, (W / 2, H - 88), '得道飞升模拟器', F(72), anchor='mm', optical=True,
               grad=(GOLD_L, GOLD_D), stroke=3, stroke_fill=(50, 36, 8),
               glow=GOLD + (40,), glow_blur=18, shadow=INK, shadow_off=(0, 5), shadow_blur=10)

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
