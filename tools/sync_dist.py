# -*- coding: utf-8 -*-
"""
DEDAO 发布包体同步脚本（固化版）
=================================
从仓库根（源码真源）一次性把游戏代码同步进所有 dist 发布副本，
并重建 TapTap 上传用的 zip 包，杜绝"漏更新某个副本/zip"。

用法（仓库根目录执行）：
  python tools/sync_dist.py            # 同步 4 个目录 + 重建 3 个 zip
  python tools/sync_dist.py --check    # 仅报告各副本与源码的偏离，不写文件

职责：
  1. 对每个 dist 目录：复制根 js/*.js、css/*、manifest.json、sw.js
  2. 对每个 dist 目录的 index.html / index_pc.html：
       - 把遗留的 js/NAME.NNN.js 哈希命名归一为 js/NAME.js?v=NNN
       - 把所有 ?v=N 缓存戳 +1（确保回访者命中新文件）
  3. 重建 3 个 TapTap zip（从对应 dist 目录整体打包，顶层目录名=目录名）

设计要点：
  - 单一真源 = 仓库根。任何代码更新后只需跑本脚本即可全量铺开。
  - 缓存戳单调递增即可，具体数字不重要；每次同步都 +1，保证唯一且递增。
  - sw.js 为 network-first 策略，?v= 查询串足以让回访玩家拿到新代码，无需改 SW 缓存名。
  - 不触碰 assets/（字体/音频/图片由 optimize_package.py 单独管理）。
"""

import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_BASE = os.path.join(ROOT, 'dist')

# 4 个目录型发布副本（相对 dist/）
DIST_DIRS = [
    'DEDAO_release',
    'taptap/dedao',
    'taptap/dedao-pc',
    'taptap/dedao_tap',
]

# 3 个 TapTap 上传 zip：键为 dist 子目录，值为 zip 文件名（位于 dist/taptap/ 下）
TAP_ZIPS = {
    'taptap/dedao':     'dedao-taptap-h5.zip',
    'taptap/dedao-pc':  'dedao-pc-h5.zip',
    'taptap/dedao_tap': 'dedao_tap-taptap-h5.zip',
}

# 需要同步的代码/静态文件（仅复制根中实际存在的）
JS_FILES = ['data.js', 'engine.js', 'audio.js', 'ui.js', 'tutorial.js', 'ui_pc.js']
STATIC_FILES = ['manifest.json', 'sw.js']
CSS_DIR = 'css'
HTML_FILES = ['index.html', 'index_pc.html']

# 打包时跳过的垃圾
SKIP_DIRS = {'__pycache__', '.git', 'node_modules', '_build'}
SKIP_FILES = {'.DS_Store', 'Thumbs.db'}


def log(msg):
    print(msg)


def copy_if_changed(src, dst):
    """复制文件；返回 ('copied'|'identical'|'missing')。"""
    if not os.path.exists(src):
        return 'missing'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(src, 'rb') as f:
        s = f.read()
    if os.path.exists(dst):
        with open(dst, 'rb') as f:
            d = f.read()
        if s == d:
            return 'identical'
    with open(dst, 'wb') as f:
        f.write(s)
    return 'copied'


def normalize_and_bump(txt):
    """遗留 NAME.NNN.js -> NAME.js?v=NNN；再 ?v=N -> ?v=N+1。"""
    # 1) 哈希命名归一
    txt = re.sub(
        r'(<script\s+src="js/[A-Za-z_]+)\.(\d+)\.js(")',
        r'\1.js?v=\2\3',
        txt,
    )
    # 2) 缓存戳 +1（仅作用于脚本引用）
    def inc(m):
        return '%s%d%s' % (m.group(1), int(m.group(2)) + 1, m.group(3))

    txt = re.sub(
        r'(<script\s+src="js/[A-Za-z_]+\.js\?v=)(\d+)(")',
        inc,
        txt,
    )
    return txt


def sync_html(path, check_only=False):
    if not os.path.exists(path):
        return False
    with open(path, 'r', encoding='utf-8') as f:
        txt = f.read()
    new = normalize_and_bump(txt)
    if new != txt:
        if not check_only:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new)
        return True
    return False


def sync_one_dist(rel, check_only=False):
    dist = os.path.join(DIST_BASE, rel)
    if not os.path.isdir(dist):
        log('  [跳过] 目录不存在: %s' % rel)
        return
    log('▶ %s' % rel)
    # 复制 js
    for jf in JS_FILES:
        s = os.path.join(ROOT, 'js', jf)
        d = os.path.join(dist, 'js', jf)
        r = copy_if_changed(s, d)
        if check_only:
            if r == 'missing':
                continue
            log('    js/%s : %s' % (jf, '当前一致' if r == 'identical' else '需更新'))
        else:
            if r == 'copied':
                log('    js/%s 已更新' % jf)
            elif r == 'missing':
                pass  # 根无此文件，忽略（如某些目录不需要 ui_pc.js）
    # 复制 css
    src_css = os.path.join(ROOT, CSS_DIR)
    if os.path.isdir(src_css):
        for fn in os.listdir(src_css):
            if fn.endswith('.css'):
                r = copy_if_changed(os.path.join(src_css, fn),
                                    os.path.join(dist, CSS_DIR, fn))
                if not check_only and r == 'copied':
                    log('    css/%s 已更新' % fn)
    # 复制静态文件
    for sf in STATIC_FILES:
        r = copy_if_changed(os.path.join(ROOT, sf), os.path.join(dist, sf))
        if not check_only and r == 'copied':
            log('    %s 已更新' % sf)
    # HTML：归一 + 抬升缓存戳
    for hf in HTML_FILES:
        p = os.path.join(dist, hf)
        if sync_html(p, check_only=check_only):
            log('    %s : %s' % (hf, '缓存戳需抬升' if check_only else '缓存戳已抬升'))


def rebuild_zip(rel_dir, zip_name):
    base = os.path.join(DIST_BASE, 'taptap')
    src_dir = os.path.join(DIST_BASE, rel_dir)  # rel_dir 已含 'taptap/'
    zip_path = os.path.join(base, zip_name)
    if not os.path.isdir(src_dir):
        log('  [跳过] zip 源目录不存在: %s' % rel_dir)
        return
    if os.path.exists(zip_path):
        os.remove(zip_path)
    n = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for fn in files:
                if fn in SKIP_FILES:
                    continue
                fp = os.path.join(root, fn)
                arc = os.path.relpath(fp, base)  # 顶层为目录名
                z.write(fp, arc)
                n += 1
    log('  ⟳ 重建 %s （%d 个文件，顶层目录 %s/）' % (zip_name, n, os.path.basename(rel_dir)))


def main():
    check_only = '--check' in sys.argv
    log('=' * 60)
    log('DEDAO 包体同步  |  真源: 仓库根  |  模式: %s' %
        ('仅检查' if check_only else '同步+重建'))
    log('=' * 60)

    for rel in DIST_DIRS:
        sync_one_dist(rel, check_only=check_only)

    log('-' * 60)
    log('TapTap zip 重建')
    for rel, zname in TAP_ZIPS.items():
        if check_only:
            # 仅比对 zip 内 data.js 是否与源码一致
            zp = os.path.join(DIST_BASE, 'taptap', zname)
            if not os.path.exists(zp):
                log('  [缺失] %s' % zname)
                continue
            with zipfile.ZipFile(zp) as z:
                cand = [n for n in z.namelist()
                        if n.endswith('js/data.js') or n.endswith('js/data.')]
                stale = False
                for c in cand:
                    with z.open(c) as f, open(os.path.join(ROOT, 'js', 'data.js'), 'rb') as s:
                        if f.read() != s.read():
                            stale = True
                log('  %s : %s' % (zname, '陈旧(与源码不一致)' if stale else '与源码一致'))
        else:
            rebuild_zip(rel, zname)

    log('=' * 60)
    log('完成。' if not check_only else '检查完成（未修改任何文件）。')


if __name__ == '__main__':
    main()
