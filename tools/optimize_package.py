# -*- coding: utf-8 -*-
"""
字体子集化 + 音频压缩 —— DEDAO 包体优化（TapTap / 移动端适配）
用法（在仓库根目录）：
  C:/Users/Lenovo/.workbuddy/binaries/python/envs/default/Scripts/python.exe tools/optimize_package.py

说明：
- 从 index.html / js / manifest 中提取游戏实际用到的全部字符，对 assets/fonts 下的字体
  做子集化并输出 woff2。字体文件名保持不变，CSS 无需改动。
- 玩家自由输入（如起名）可能包含子集外的字符，浏览器会回退到系统字体，仅字形略有差异。
- 若游戏文案新增生僻字，重新运行本脚本即可。
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- 1. 收集字符集 ----------
def collect_chars():
    chars = set()
    targets = [os.path.join(ROOT, 'index.html'),
               os.path.join(ROOT, 'manifest.json'),
               os.path.join(ROOT, 'js')]
    for t in targets:
        if os.path.isfile(t):
            files = [t]
        else:
            files = [os.path.join(t, f) for f in os.listdir(t) if f.endswith('.js')]
        for fp in files:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                chars.update(f.read())
    # ASCII 可见字符 + 常用中文标点 + 数字全角
    chars.update(chr(c) for c in range(0x20, 0x7F))
    chars.update('，。！？：；、""''（）《》【】…—·～￥%+×÷＝ｂｄｋｚｓｇ')
    chars.update('零一二三四五六七八九十百千万亿兆两')
    chars.discard('\n'); chars.discard('\r'); chars.discard('\t')
    return chars

# ---------- 2. 字体子集化 ----------
def subset_fonts(chars):
    from fontTools import subset
    fonts_dir = os.path.join(ROOT, 'assets', 'fonts')
    for name in os.listdir(fonts_dir):
        if not re.search(r'\.(ttf|otf|woff2?)(2)?$', name):
            continue
        src = os.path.join(fonts_dir, name)
        base, _ = os.path.splitext(name)
        out = os.path.join(fonts_dir, base + '.woff2')
        before = os.path.getsize(src)
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.ignore_missing_glyphs = True
        font = subset.load_font(src, opts)
        subsetter = subset.Subsetter(opts)
        subsetter.populate(text=''.join(chars))
        subsetter.subset(font)
        subset.save_font(font, out, opts)
        after = os.path.getsize(out)
        print('font: %s %d -> %d bytes (%s)' % (name, before, after, out))
        # ttf 源文件若已有同名 woff2 产物且非引用文件，可按需删除；这里保留原文件入 git，由打包脚本决定取舍

# ---------- 3. BGM 压缩 ----------
def compress_audio():
    ffmpeg = None
    try:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        print('skip audio: imageio-ffmpeg not installed')
        return
    bgm_dir = os.path.join(ROOT, 'assets', 'audio', 'bgm')
    for name in os.listdir(bgm_dir):
        if not name.endswith('.mp3'):
            continue
        src = os.path.join(bgm_dir, name)
        tmp = src + '.tmp.mp3'
        before = os.path.getsize(src)
        # 64kbps 单声道：放置类 BGM 足够，体积约为原来的 1/4
        subprocess.run([ffmpeg, '-y', '-v', 'error', '-i', src,
                        '-ac', '1', '-b:a', '64k', tmp], check=True)
        os.replace(tmp, src)
        after = os.path.getsize(src)
        print('audio: %s %d -> %d bytes' % (name, before, after))

if __name__ == '__main__':
    cs = collect_chars()
    print('charset: %d chars' % len(cs))
    if '--audio-only' not in sys.argv:
        subset_fonts(cs)
    if '--font-only' not in sys.argv:
        compress_audio()
    print('done.')
