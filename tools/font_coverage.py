# -*- coding: utf-8 -*-
"""DEDAO 字体覆盖守卫 —— 检测「用户可见文本用字」是否都存在于 woff2 字形表中。

背景（2026-09-15）：线上 woff2 曾被裁成仅 2352 码位的子集，游戏文本里有 381 个用字
不在其中 → 这些字全部回退到 SimSun/宋体，同屏出现渔阳体 + 宋体两套字形。
本工具用于在每次内容扩充后复检，防止再次回归。

用法:
  python tools/font_coverage.py            # 体检报告（全量，不退出非零）
  python tools/font_coverage.py --check    # 守卫模式：有未豁免缺字则 exit 1
  python tools/font_coverage.py --check --staged   # 只检本次提交增量，给 pre-commit 用

豁免清单: tools/font_allowlist.txt
  每行一个字符，`#` 后写原因。仅允许「字形本就该由系统字体渲染」的字符
  （emoji / 几何符号 / 渔阳体天生没有的生僻字），不允许把普通汉字塞进来。
"""
import os, re, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'assets/fonts/TsangerYuYangT-W05.woff2')
CHARSET_TXT = os.path.join(ROOT, 'tools/font_charset.txt')
ALLOWLIST = os.path.join(ROOT, 'tools/font_allowlist.txt')

JS_FILES = ['js/data.js', 'js/ui.js', 'js/engine.js']
HTML_FILES = ['index.html', 'index_pc.html']
CSS_FILES = ['css/style.css']


# ---------- 字体侧：取字形表 ----------
def font_charset():
    """优先读 tools/font_charset.txt（无第三方依赖）；缺失时回落到 fontTools。"""
    if os.path.exists(CHARSET_TXT):
        txt = open(CHARSET_TXT, encoding='utf-8').read()
        return set(ord(c) for c in txt), 'tools/font_charset.txt'
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        sys.exit('缺少 tools/font_charset.txt，且未安装 fontTools。'
                 '请先 pip install fonttools brotli 并重跑 _probe/font_subset.py')
    f = TTFont(FONT, lazy=True)
    cm = set()
    for t in f['cmap'].tables:
        cm |= set(t.cmap.keys())
    return cm, 'fontTools 直读 woff2'


# ---------- 源码侧：只取用户可见文本 ----------
def strip_js_comments(src):
    """去 // 行注释与 /* */ 块注释（保守：不处理字符串内的 //，误差可忽略）"""
    src = re.sub(r'/\*.*?\*/', ' ', src, flags=re.S)
    out = []
    for line in src.split('\n'):
        # 去掉引号外的 // 之后内容
        q = None
        for i, ch in enumerate(line):
            if q:
                if ch == q and line[i - 1] != '\\':
                    q = None
            elif ch in '\'"`':
                q = ch
            elif ch == '/' and i + 1 < len(line) and line[i + 1] == '/':
                line = line[:i]
                break
        out.append(line)
    return '\n'.join(out)


def visible_chars(path):
    """返回该文件「用户可见文本」字符串（供整文件扫描用）"""
    ext = os.path.splitext(path)[1]
    return extract_visible(ext, open(path, encoding='utf-8').read())


def extract_visible(ext, raw):
    """返回 raw 文本里「用户可见文本」的字符串（ext 决定解析方式）"""
    if ext == '.js':
        src = strip_js_comments(raw)
        # 单/双引号与模板字符串内的内容
        chunks = re.findall(r"'([^'\\]*(?:\\.[^'\\]*)*)'", src)
        chunks += re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"', src)
        chunks += re.findall(r'`([^`\\]*(?:\\.[^"\\]*)*)`', src)
        return ''.join(chunks)
    if ext == '.html':
        src = re.sub(r'<script.*?</script>', ' ', raw, flags=re.S | re.I)
        src = re.sub(r'<style.*?</style>', ' ', src, flags=re.S | re.I)
        # 属性值（title / placeholder / alt / aria-label / content）
        attrs = re.findall(r'(?:title|placeholder|alt|aria-label|content)\s*=\s*"([^"]*)"',
                           src, flags=re.I)
        body = re.sub(r'<[^>]+>', ' ', src)
        return ' '.join(attrs) + ' ' + body
    if ext == '.css':
        # 仅 content: "..." / '...'
        return ' '.join(re.findall(r'content\s*:\s*["\']([^"\']*)["\']', raw))
    return ''


def staged_added_text():
    """返回 [(rel, text), ...]，取自 git diff --cached 的 + 行（仅 .js/.html/.css）。

    用于「更新前检测」：只检本次提交引入的玩家可见文字，精准定位回归。"""
    try:
        files = subprocess.check_output(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            cwd=ROOT, text=True).split()
    except Exception:
        return []
    out = []
    for rel in files:
        ext = os.path.splitext(rel)[1]
        if ext not in ('.js', '.html', '.css'):
            continue
        try:
            diff = subprocess.check_output(
                ['git', 'diff', '--cached', '-U0', '--', rel], cwd=ROOT, text=True)
        except Exception:
            continue
        added = []
        for ln in diff.split('\n'):
            if ln.startswith('+++ '):
                continue
            if ln.startswith('+'):
                added.append(ln[1:])
        if added:
            out.append((rel, '\n'.join(added)))
    return out


def load_allowlist():
    if not os.path.exists(ALLOWLIST):
        return set()
    out = set()
    for line in open(ALLOWLIST, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        out.add(line[0])
    return out


def main():
    check_mode = '--check' in sys.argv
    staged = '--staged' in sys.argv
    cm, src_info = font_charset()
    allow = load_allowlist()

    if staged:
        items = staged_added_text()
        if not items:
            print('=' * 66)
            print('字体覆盖守卫 · 仅检本次提交增量（--staged）')
            print('本次提交无 .js/.html/.css 文本变更，跳过。')
            print('=' * 66)
            return 0
        srcs = [(rel, extract_visible(os.path.splitext(rel)[1], text)) for rel, text in items]
        mode_label = '增量（本次提交引入）'
    else:
        srcs = [(rel, visible_chars(os.path.join(ROOT, rel)))
                for rel in JS_FILES + HTML_FILES + CSS_FILES
                if os.path.exists(os.path.join(ROOT, rel))]
        mode_label = '全量（整文件）'

    seen = {}          # 字符 -> 出现的文件集合
    freq = {}
    for rel, text in srcs:
        for ch in text:
            if ord(ch) < 128:
                continue
            freq[ch] = freq.get(ch, 0) + 1
            seen.setdefault(ch, set()).add(rel)

    missing = sorted((c for c in freq if ord(c) not in cm), key=lambda c: -freq[c])
    unallowed = [c for c in missing if c not in allow]

    print('=' * 66)
    print('字体覆盖守卫 · 可见文本口径 · %s' % mode_label)
    print('字形表来源 : %s（%d 码位）' % (src_info, len(cm)))
    print('可见文本用字: %d 个不同字符' % len(freq))
    print('缺字       : %d 个（其中已豁免 %d 个）' % (len(missing), len(missing) - len(unallowed)))
    print('=' * 66)

    if missing:
        print('\n%-4s %-5s %-8s %s' % ('字符', '次数', '状态', '出现位置'))
        for ch in missing:
            tag = '豁免' if ch in allow else '★未豁免'
            print('%-4s %-5d %-8s %s' % (ch, freq[ch], tag, ','.join(sorted(seen[ch]))))
    else:
        print('\n✓ 全部可见文本用字均在字形表内，无回退。')

    if unallowed:
        print('\n✗ %d 个未豁免缺字：%s' % (len(unallowed), ' '.join(unallowed)))
        if check_mode:
            return 1
    else:
        print('\n✓ 守卫通过。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
