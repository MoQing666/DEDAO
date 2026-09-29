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
  2. 把根 index.html / index_pc.html 的缓存戳 +1（就地改根），再把抬过戳的内容
     **按 HTML_MAP 抄进各 dist 的入口页**（结构与戳一并同步，L5）
  3. 重建 3 个 TapTap zip（从对应 dist 目录整体打包，顶层目录名=目录名）

设计要点：
  - 单一真源 = 仓库根。任何代码更新后只需跑本脚本即可全量铺开。
  - 缓存戳单调递增即可，具体数字不重要；每次同步都 +1，保证唯一且递增。
  - sw.js 为 network-first 策略，?v= 查询串足以让回访玩家拿到新代码，无需改 SW 缓存名。
  - 不触碰 assets/（字体/音频/图片由 optimize_package.py 单独管理）。

⚠ L5（2026-09-24 补，起因是一次线上事故）——HTML 也曾只"抬戳"不"抄内容"：
  · 缺陷 1：本脚本原来**只复制 js/css/manifest/sw**，index.html 从不从根抄进副本，
    只做「归一 + 抬戳」。于是根的结构改动（如 2026-09-23 新增的 `#sect-msg` 宗门页
    反馈条）**永远进不了 dist**（4 个副本全缺）。最坏后果：按既定流程「用
    dist/DEDAO_release/ 覆盖仓库根」会把线上新结构打回旧版。
  · 缺陷 2：抬戳只抬 dist 的 HTML，**不抬仓库根的 index.html**。而玩家/用户最常用的
    上传路径恰恰是「覆盖仓库根」，于是根 index.html 的 `?v=` 恒为 168 →
    浏览器与 SW 直接复用旧缓存，**代码是新的、玩家看到的却是旧的**。
  · 现在的口径：HTML 与 JS 同等对待 —— 根是唯一真源，dist 入口页是根的副本；
    同步完成后 `md5(根 index.html)` == `md5(dist/<各副本>/index.html)`，两边都抬戳。
    这条不变量由 19 号套件的「HTML 包体守卫」守住，漏同步/漏抬戳会直接报红。

⚠ HTML_MAP 的必要性：各副本的入口页**并非全部源自根 index.html** ——
  `taptap/dedao-pc/index.html` 是 PC 版页面（`body.pc` + style_pc.css + ui_pc.js），
  它的真源是根 `index_pc.html`。若盲目一律抄 index.html，会直接毁掉 PC 包。

⚠ L6（2026-09-24 续，与 L5 同一病根的第三处）——发布包的**组成**没和「要部署的仓库根」对齐：
  · `dist/DEDAO_release/` 是「覆盖到静态站根目录」的那个包，但它的构建方是
    `tools/build_release.sh`（白名单 `index.html manifest.json sw.js` + css/js/assets），
    **白名单里没有 `index_pc.html`** —— 而线上根目录**确实有**这个文件。
  · 后果：无论同步多少次、覆盖多少次 release 包，线上那张 PC 页永远是旧的
    （HTTP 200，但 `?v=` 停在旧号、且缺 t-daily 等新元素）。
  · 现口径：`HTML_MAP` 即口径 —— 声明了的入口页在副本中缺失就**补齐**；
    `build_release.sh` 的白名单同步补 `index_pc.html`。
    这条不变量由 19 号套件的「发布包组成守卫」守住。
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

# 根 HTML：同步时就地抬升它们的缓存戳（缺陷 2 的修法）
ROOT_HTML = ['index.html', 'index_pc.html']

# HTML 真源映射（L5）：dist 相对路径 -> [(dist 内入口页, 根内真源), ...]
# **本清单即口径**：声明了的入口页若副本中缺失，会被补齐（L6），不再「只覆盖已存在的」。
# 各副本入口页的真源并不统一 —— PC 包的 index.html 是 PC 版页面，真源是 index_pc.html。
HTML_MAP = {
    # DEDAO_release 是「用来覆盖部署根」的那个包，组成必须与可部署的仓库根对齐
    # （L6：此前漏 index_pc.html → 线上那张 PC 页永远更新不到）。
    'DEDAO_release':    [('index.html', 'index.html'), ('index_pc.html', 'index_pc.html')],
    'taptap/dedao':     [('index.html', 'index.html'), ('index_pc.html', 'index_pc.html')],
    'taptap/dedao-pc':  [('index.html', 'index_pc.html')],   # PC 包入口 ← 根 index_pc.html
    'taptap/dedao_tap': [('index.html', 'index.html'), ('index_pc.html', 'index_pc.html')],
}

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
    """遗留 NAME.NNN.js -> NAME.js?v=NNN；再所有 ?v=N -> ?v=N+1（脚本与样式）。"""
    # 1) 哈希命名归一
    txt = re.sub(
        r'(<script\s+src="js/[A-Za-z_]+)\.(\d+)\.js(")',
        r'\1.js?v=\2\3',
        txt,
    )

    # 2) 缓存戳 +1（脚本 <script src="js/*.js?v=N">）
    def inc(m):
        return '%s%d%s' % (m.group(1), int(m.group(2)) + 1, m.group(3))

    txt = re.sub(
        r'(<script\s+src="js/[A-Za-z_]+\.js\?v=)(\d+)(")',
        inc,
        txt,
    )
    # 3) 缓存戳 +1（样式 <link ... href="css/*.css?v=N">）
    #    早先只抬脚本，样式改动永远命中旧缓存 —— 与 HTML「只抬戳不抄内容」同源。
    txt = re.sub(
        r'(<link[^>]*href="css/[A-Za-z_]+\.css\?v=)(\d+)(")',
        inc,
        txt,
    )
    return txt


def strip_stamps(txt):
    """把 ?v=N 一律归一为 ?v=N，用于「只比结构、忽略戳号」的比对。"""
    return re.sub(r'\?v=\d+', '?v=N', txt)


def read_text(path):
    """按字节读 + 显式 utf-8 解码：**不要**用文本模式。
    本仓库 HTML/JS 的行尾是 CRLF（Windows 习惯），文本模式读会把 CRLF 折叠成 LF，
    于是「zip 内原始字节」与「文本模式读出的内容」永远对不上（踩过：巡检假报陈旧）。"""
    with open(path, 'rb') as f:
        return f.read().decode('utf-8')


def write_text(path, txt):
    """按字节写，避免文本模式把 \\n 翻译成 \\r\\n 而改变行尾。"""
    with open(path, 'wb') as f:
        f.write(txt.encode('utf-8'))


def stamp_of(txt):
    """取出文中所有脚本/样式戳，用于报告（全统一时应只有一个值）。"""
    return sorted(set(re.findall(r'\?v=(\d+)', txt)))


def bump_root_html(check_only=False):
    """把根 HTML 就地抬戳，返回 {根文件名: 抬戳后的内容}（供抄进各副本）。
    check_only 模式下只读不写，且**不抬戳** —— 结构比对里戳号已被 strip_stamps 抹平，
    若仍返回「抬戳后的内容」，报告里根戳会比副本大 1，看起来像不一致（误导读者）。"""
    out = {}
    for hf in ROOT_HTML:
        p = os.path.join(ROOT, hf)
        if not os.path.exists(p):
            continue
        txt = read_text(p)
        new = txt if check_only else normalize_and_bump(txt)
        out[hf] = new
        if not check_only and new != txt:
            write_text(p, new)
    return out


def sync_dist_html(rel, root_html, check_only=False):
    """把根真源抄进 dist 入口页（结构与缓存戳一并同步）。
    返回 (一致数, 不一致数)；check_only 下只报告不写文件。"""
    dist = os.path.join(DIST_BASE, rel)
    same = diff = 0
    for dst_name, src_name in HTML_MAP.get(rel, []):
        dp = os.path.join(dist, dst_name)
        src_txt = root_html.get(src_name)
        if src_txt is None:
            log('    %-16s : [跳过] 根缺少真源 %s' % (dst_name, src_name))
            continue
        if not os.path.exists(dp):
            # L6：HTML_MAP 声明了却缺失 → 补齐（清单即口径）。
            # 起因：DEDAO_release 是按白名单构建的（tools/build_release.sh），白名单漏了
            # index_pc.html → 「覆盖仓库根」后线上那张 PC 页永远是旧的（HTTP 200 但内容停在旧戳）。
            if check_only:
                diff += 1
                log('    %-16s : ❌ 缺失（应把根 %s 同步过去）—— 请运行 python tools/sync_dist.py'
                    % (dst_name, src_name))
            else:
                write_text(dp, src_txt)
                log('    %-16s 已补齐（← 根 %s，此前缺失）' % (dst_name, src_name))
                same += 1
            continue
        cur = read_text(dp)
        if check_only:
            if strip_stamps(cur) == strip_stamps(src_txt):
                log('    %-16s : 结构一致（← 根 %s，戳 %s）'
                    % (dst_name, src_name, '/'.join(stamp_of(cur)) or '-'))
                same += 1
            else:
                diff += 1
                log('    %-16s : ❌ 结构不一致（← 根 %s）—— 请运行 python tools/sync_dist.py'
                    % (dst_name, src_name))
                for a, b in zip(strip_stamps(cur).split('\n'), strip_stamps(src_txt).split('\n')):
                    if a != b:
                        log('        首个差异：dist 有 %r / 根是 %r'
                            % (a.strip()[:60], b.strip()[:60]))
                        break
        else:
            if cur != src_txt:
                write_text(dp, src_txt)
                log('    %-16s 已同步（← 根 %s，结构+戳 %s）'
                    % (dst_name, src_name, '/'.join(stamp_of(src_txt)) or '-'))
            else:
                log('    %-16s 当前一致' % dst_name)
            same += 1
    return same, diff


def sync_one_dist(rel, root_html=None, check_only=False):
    dist = os.path.join(DIST_BASE, rel)
    if not os.path.isdir(dist):
        log('  [跳过] 目录不存在: %s' % rel)
        return 0, 0
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
    # HTML：从根真源抄结构与缓存戳（L5：不再只抬戳不抄内容）
    return sync_dist_html(rel, root_html or {}, check_only=check_only)


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

    # ① 先抬根 HTML 的缓存戳（缺陷 2 的修法：根 index.html 以前从不抬，玩家永远命中旧缓存）
    root_html = bump_root_html(check_only=check_only)
    log('根 HTML（同级真源，%s）' % ('当前戳' if check_only else '本次抬戳后'))
    for hf in ROOT_HTML:
        if hf in root_html:
            log('  %-14s : 戳 %s' % (hf, '/'.join(stamp_of(root_html[hf])) or '-'))
    log('-' * 60)

    # ② 逐副本：JS/CSS/静态复制 + HTML 从根真源抄（结构与戳一并同步）
    same = diff = 0
    for rel in DIST_DIRS:
        s, d = sync_one_dist(rel, root_html=root_html, check_only=check_only)
        same += s
        diff += d

    log('-' * 60)
    log('HTML 结构对账（dist 入口页 ← 根真源）')
    if check_only:
        log('  结构一致 %d 个 / 不一致 %d 个%s'
            % (same, diff, '  ← 有偏离，请运行 python tools/sync_dist.py' if diff else '  ✔'))
    else:
        log('  已同步 %d 个入口页（全部与根真源字节一致）' % same)

    log('-' * 60)
    log('TapTap zip %s' % ('校验' if check_only else '重建'))
    for rel, zname in TAP_ZIPS.items():
        if check_only:
            # 比对 zip 内 data.js 与 index.html 是否与源码/副本一致
            zp = os.path.join(DIST_BASE, 'taptap', zname)
            if not os.path.exists(zp):
                log('  [缺失] %s' % zname)
                continue
            with zipfile.ZipFile(zp) as z:
                stale = False
                cand = [n for n in z.namelist()
                        if n.endswith('js/data.js') or n.endswith('js/data.')]
                for c in cand:
                    with z.open(c) as f, open(os.path.join(ROOT, 'js', 'data.js'), 'rb') as s:
                        if f.read() != s.read():
                            stale = True
                # zip 内 index.html 必须与它来源的 dist 入口页一致（证明 zip 重建过）
                inner = [n for n in z.namelist() if n.endswith('/index.html')]
                html_txt = z.read(inner[0]).decode('utf-8', 'ignore') if inner else None
                for dst_name, src_name in HTML_MAP.get(rel, []):
                    if dst_name != 'index.html':
                        continue
                    dp = os.path.join(DIST_BASE, rel, dst_name)
                    if os.path.exists(dp) and html_txt is not None:
                        if strip_stamps(html_txt) != strip_stamps(read_text(dp)):
                            stale = True
                log('  %s : %s' % (zname, '陈旧(与源码不一致)' if stale else '与源码一致'))
        else:
            rebuild_zip(rel, zname)

    log('=' * 60)
    if not check_only:
        log('完成。dist 入口页已与根真源字节一致（含缓存戳）。')
    else:
        log('检查完成（未修改任何文件）。' if not diff else
            '检查完成：发现 %d 个入口页结构偏离（未修改任何文件）。' % diff)


if __name__ == '__main__':
    main()
