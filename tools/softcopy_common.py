# -*- coding: utf-8 -*-
"""
软著源程序鉴别材料 · 公共口径模块

被 gen_softcopy_pdf.py / gen_softcopy_docx.py / verify_softcopy.py 共用，
确保三者的「有效行清洗」与「折行」口径完全一致（避免各写一份导致漂移）。

合规口径（《计算机软件著作权登记办法》第十条 + 版权中心审查实务）：
  - 前连续 30 页 + 后连续 30 页，共 60 页；不足 60 页全交
  - 每页不少于 50 行
  - 空行、纯注释行（独立注释）不计入有效行数 → 必须剔除
  - 超长行按版面宽度折行（不截断），续行计入行数
"""
import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS_DIR = os.path.join(ROOT, "js")
TAP_DIR = os.path.join(ROOT, "dist", "taptap")

FILES = ["audio.js", "data.js", "engine.js", "ui.js"]   # 按 index.html 引用顺序

SOFT_NAME = "得道飞升模拟器"
VERSION = "V1.0.0"

LINES_PER_PAGE = 50
FRONT_PAGES = 30
BACK_PAGES = 30

FONT = "STSong-Light"          # PDF 用；与 Word 版选用的 SimSun 度量一致（ASCII 半角 / CJK 全角）
FONT_SIZE = 7.0
LINE_LEAD = 13.4
CONTINUE_INDENT = "    "       # 折行续行缩进
MARGIN = 15 * mm               # 左右页边距
USABLE = A4[0] - 2 * MARGIN    # 版心宽度 ≈ 510pt


def strip_comments_and_blanks(lines):
    """剔除空行与纯注释行，仅保留有效代码行（行内注释随代码保留）。"""
    out = []
    in_block = False
    for raw in lines:
        s = raw.strip()
        if in_block:
            if "*/" in s:
                in_block = False
                s = s.split("*/", 1)[1].strip()
                if not s:
                    continue
            else:
                continue
        while "/*" in s:
            before, rest = s.split("/*", 1)
            if "*/" in rest:
                s = (before + rest.split("*/", 1)[1]).strip()
            else:
                in_block = True
                s = before.strip()
                break
        if not s or s.startswith("//"):
            continue
        if "//" in s and not s.startswith('"') and not s.startswith("'"):
            code_part = s.split("//", 1)[0].rstrip()
            if code_part:
                s = code_part
        if s:
            out.append(s)
    return out


def load_raw_lines():
    lines = []
    for f in FILES:
        with open(os.path.join(JS_DIR, f), "r", encoding="utf-8", errors="replace") as fh:
            lines.extend(ln.rstrip("\n") for ln in fh)
    return lines


def load_effective():
    """返回 (物理行列表, 有效代码行列表)。"""
    raw = load_raw_lines()
    return raw, strip_comments_and_blanks(raw)


# ---------------------------------------------------------------- 宽度测量 / 折行
_wcache = {}


def make_measure(font=FONT, size=FONT_SIZE):
    """返回 measure(text) -> 渲染宽度(pt)。逐字符缓存，避免 O(n^2)。"""
    def measure(text):
        total = 0.0
        for ch in text:
            w = _wcache.get(ch)
            if w is None:
                w = pdfmetrics.stringWidth(ch, font, size)
                _wcache[ch] = w
            total += w
        return total
    return measure


def fold_lines(lines, measure=None, max_width=USABLE,
               cont_indent=CONTINUE_INDENT, safety=0.97):
    """
    把源码行按实测渲染宽度折成「打印行」；不截断，续行加缩进。
    返回 [(打印行文本, 原有效行序号)]。
    safety：留 3% 余量，防止 Word 端字体度量微小差异导致自动换行。
    """
    measure = measure or make_measure()
    limit_first = max_width * safety
    limit_cont = limit_first - measure(cont_indent)
    out = []
    for idx, ln in enumerate(lines):
        cur, cur_w, limit = "", 0.0, limit_first
        for ch in ln:
            w = measure(ch)
            if cur and cur_w + w > limit:
                out.append((cur, idx))
                cur, cur_w, limit = cont_indent, measure(cont_indent), limit_cont
            cur += ch
            cur_w += w
        out.append((cur, idx))
    return out


def slice_pages(physical, lines_per_page=LINES_PER_PAGE,
                front_pages=FRONT_PAGES, back_pages=BACK_PAGES):
    """按「前 N 页 + 后 N 页」切分打印行；返回 (pages, info)。"""
    front_n = lines_per_page * front_pages
    back_n = lines_per_page * back_pages
    if len(physical) <= front_n + back_n:
        pages = [physical[i:i + lines_per_page]
                 for i in range(0, len(physical), lines_per_page)]
        return pages, {"mode": "all"}
    front = physical[:front_n]
    back = physical[-back_n:]
    pages = [front[i:i + lines_per_page] for i in range(0, len(front), lines_per_page)]
    pages += [back[i:i + lines_per_page] for i in range(0, len(back), lines_per_page)]
    cov_f = len({i for _, i in front})
    cov_b = len({i for _, i in back})
    return pages, {"mode": "front_back", "cov_front": cov_f, "cov_back": cov_b,
                   "total_effective": len({i for _, i in physical})}
