# -*- coding: utf-8 -*-
"""
AI 出图后处理：裁切 → 降采样 → 调色板量化 → PNG-8 压缩
用法：
  python tools/postprocess_images.py <源文件或目录> <输出目录> <宽> <高> [--colors 64] [--map a.png:bg_a,b.png:bg_b]

- 保持宽高比：先按目标比例居中裁切，再降采样（LANCZOS → NEAREST 保留像素感）
- 量化到指定色数（像素风建议 32-64 色）+ optimize，体积可降至 1/5
"""
import argparse
import os
import sys

from PIL import Image


def process(src, dst, w, h, colors):
    im = Image.open(src).convert('RGBA')
    # 透明底转深色底（游戏为暗色 UI），避免量化后边缘发白
    if im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255:
        bg = Image.new('RGBA', im.size, (18, 16, 26, 255))
        bg.alpha_composite(im)
        im = bg
    im = im.convert('RGB')
    # 居中裁切到目标比例
    tr = w / h
    sr = im.width / im.height
    if sr > tr:
        nw = int(im.height * tr)
        im = im.crop(((im.width - nw) // 2, 0, (im.width + nw) // 2, im.height))
    else:
        nh = int(im.width / tr)
        im = im.crop((0, (im.height - nh) // 2, im.width, (im.height + nh) // 2))
    im = im.resize((w, h), Image.LANCZOS)
    im = im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, optimize=True)
    return os.path.getsize(src), os.path.getsize(dst)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('w', type=int)
    ap.add_argument('h', type=int)
    ap.add_argument('--colors', type=int, default=64)
    ap.add_argument('--map', default='')
    a = ap.parse_args()

    name_map = {}
    if a.map:
        for pair in a.map.split(','):
            k, v = pair.split(':')
            name_map[k.strip()] = v.strip()

    if os.path.isdir(a.src):
        files = [os.path.join(a.src, f) for f in os.listdir(a.src)
                 if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
        for f in files:
            base = os.path.splitext(os.path.basename(f))[0]
            out_name = name_map.get(base, base)
            # 未映射时用原始文件名（建议生成后手动重命名）
            dst = os.path.join(a.dst, out_name + '.png')
            b, af = process(f, dst, a.w, a.h, a.colors)
            print('%s: %d -> %d bytes' % (out_name, b, af))
    else:
        b, af = process(a.src, a.dst, a.w, a.h, a.colors)
        print('%s: %d -> %d bytes' % (os.path.basename(a.dst), b, af))


if __name__ == '__main__':
    main()
