# -*- coding: utf-8 -*-
"""
生成软著源程序鉴别材料 PDF（前 30 页 + 后 30 页，每页恰好 50 行有效代码）

合规依据（《计算机软件著作权登记办法》第十条 + 中国版权保护中心审查实务）：
  - 源程序：前连续 30 页 + 后连续 30 页，共 60 页；不足 60 页全交。
  - 程序每页不少于 50 行【有效代码行】；最后一页可为结束页。
  - **空行不计入有效行数，必须删除**。
  - **纯注释行（独立注释）不计入有效行数，必须清理**。
  - 行内注释（代码 + 行尾注释）可保留，计入有效行。
  - 页眉标注软件名称 + 版本号（须与申请表一致）；右上角标注连续页码。
  - A4 纵向、单面、黑白；等宽字体优先。

实现要点：
  1) 读取合并代码 → 2) 剔除空行与纯注释行 → 3) 每页严格 50 行有效代码
  4) Canvas 逐行定高绘制，超长行截断，确保不折行、每页行数精确。

用法：python gen_softcopy_pdf.py
输出：dist/taptap/软著源程序_得道飞升模拟器.pdf
"""
import os
import re
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["audio.js", "data.js", "engine.js", "ui.js"]  # 按 index.html 引用顺序
JS_DIR = os.path.join(ROOT, "js")
OUT_DIR = os.path.join(ROOT, "dist", "taptap")
OUT_PDF = os.path.join(OUT_DIR, "软著源程序_得道飞升模拟器.pdf")

SOFT_NAME = "得道飞升模拟器"
VERSION = "V1.0.0"
LINES_PER_PAGE = 50
FRONT_PAGES = 30
BACK_PAGES = 30

FONT_SIZE = 7.2
LINE_LEAD = 13.6
MAX_CHARS = 168


# ---------------- 1. 读取并合并代码 ----------------
def strip_comments_and_blanks(lines):
    """
    剔除空行与纯注释行，仅保留有效代码行。
    处理 /* ... */ 块注释（含单行与跨行）与 // 行注释。
    """
    out = []
    in_block = False
    for raw in lines:
        s = raw.strip()
        # 处理块注释状态
        if in_block:
            if "*/" in s:
                in_block = False
                s = s.split("*/", 1)[1].strip()
                if not s:
                    continue
            else:
                continue
        # 行内块注释处理（可能同一行有代码 + /* ... */）
        while "/*" in s:
            before, rest = s.split("/*", 1)
            if "*/" in rest:
                after = rest.split("*/", 1)[1]
                s = (before + after).strip()
            else:
                in_block = True
                s = before.strip()
                break
        if not s:
            continue
        # 纯 // 注释行
        if s.startswith("//"):
            continue
        # 行内 // 注释：保留代码部分（代码 + 行尾注释仍算有效行）
        # 注意避免误伤 http:// 等字符串，这里只在行首非引号时粗略处理
        if "//" in s and not s.startswith('"') and not s.startswith("'"):
            code_part = s.split("//", 1)[0].rstrip()
            if code_part:
                s = code_part
        if not s:
            continue
        out.append(s)
    return out


all_lines = []
for f in FILES:
    p = os.path.join(JS_DIR, f)
    with open(p, "r", encoding="utf-8", errors="replace") as fh:
        all_lines.extend(ln.rstrip("\n") for ln in fh)

total_raw = len(all_lines)
effective = strip_comments_and_blanks(all_lines)
total = len(effective)
print(f"原始总行数: {total_raw}")
print(f"有效代码行数（已剔除空行与纯注释行）: {total}")
print(f"注释/空行剔除占比: {(1 - total / total_raw) * 100:.1f}%")

FRONT_N = LINES_PER_PAGE * FRONT_PAGES
BACK_N = LINES_PER_PAGE * BACK_PAGES

if total <= FRONT_N + BACK_N:
    pages = [effective[i:i + LINES_PER_PAGE] for i in range(0, total, LINES_PER_PAGE)]
    print(f"有效代码不足 {FRONT_N + BACK_N} 行，全部提交，共 {len(pages)} 页")
else:
    front_lines = effective[:FRONT_N]
    back_lines = effective[-BACK_N:]
    pages = []
    for i in range(0, len(front_lines), LINES_PER_PAGE):
        pages.append(front_lines[i:i + LINES_PER_PAGE])
    for i in range(0, len(back_lines), LINES_PER_PAGE):
        pages.append(back_lines[i:i + LINES_PER_PAGE])
    print(f"页数: {len(pages)}（前 {FRONT_PAGES} 页 + 后 {BACK_PAGES} 页）")

# ---------------- 2. 绘制 ----------------
os.makedirs(OUT_DIR, exist_ok=True)
c = pdfcanvas.Canvas(OUT_PDF, pagesize=A4)
PW, PH = A4
LEFT = 15 * mm
RIGHT = PW - 15 * mm
TOP = PH - 20 * mm
HEADER_Y = PH - 13 * mm
TOTAL_PAGES = len(pages)


def draw_header(page_no):
    c.setFont("STSong-Light", 8)
    c.setFillColor(colors.black)
    c.drawString(LEFT, HEADER_Y, f"{SOFT_NAME} {VERSION}")
    c.drawRightString(RIGHT, HEADER_Y, f"第 {page_no} 页 / 共 {TOTAL_PAGES} 页")
    c.setStrokeColor(colors.HexColor("#bbbbbb"))
    c.setLineWidth(0.4)
    c.line(LEFT, HEADER_Y - 4, RIGHT, HEADER_Y - 4)


def truncate(line, max_chars=MAX_CHARS):
    return line if len(line) <= max_chars else line[:max_chars - 3] + "..."


for page_no, page_lines in enumerate(pages, start=1):
    draw_header(page_no)
    c.setFont("STSong-Light", FONT_SIZE)
    c.setFillColor(colors.black)
    y = TOP
    for ln in page_lines:
        c.drawString(LEFT, y, truncate(ln))
        y -= LINE_LEAD
    c.showPage()

c.save()

print(f"已生成: {OUT_PDF}")
print(f"页数: {len(pages)}，每页 {LINES_PER_PAGE} 行有效代码")
print(f"大小: {os.path.getsize(OUT_PDF)/1024:.1f} KB")
