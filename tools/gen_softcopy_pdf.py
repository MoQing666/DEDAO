# -*- coding: utf-8 -*-
"""
生成软著源程序鉴别材料 PDF（前 30 页 + 后 30 页，每页恰好 50 行）

合规依据（《计算机软件著作权登记办法》第十条 + 中国版权保护中心审查实务）：
  - 源程序：前连续 30 页 + 后连续 30 页，共 60 页；不足 60 页全交。
  - 程序每页不少于 50 行；最后一页可为结束页。
  - **空行不计入有效行数，必须删除**；**纯注释行（独立注释）不计入，必须清理**。
  - 行内注释（代码 + 行尾注释）可保留，计入有效行。
  - 页眉标注软件名称 + 版本号（须与申请表一致）；右上角标注连续页码。
  - A4 纵向、单面、黑白；等宽字体优先。

实现要点：
  1) 读取合并代码 → 2) 剔除空行与纯注释行 → 3) 超长行按实测宽度**折行**（不截断，
     保证代码完整且不越出页面右边界）→ 4) 每页严格 50 条打印行
  5) Canvas 逐行定高绘制，确保行数精确、版面不越界。

清洗 / 折行口径统一放在 tools/softcopy_common.py，与 Word 版、自检脚本共用。

用法：python tools/gen_softcopy_pdf.py
输出：dist/taptap/软著源程序_得道飞升模拟器.pdf
"""
import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from softcopy_common import (FONT, FONT_SIZE, LINES_PER_PAGE,  # noqa: E402
                             LINE_LEAD, MARGIN, SOFT_NAME, TAP_DIR, USABLE,
                             VERSION, fold_lines, load_effective,
                             make_simsun_measure, slice_pages)

OUT_PDF = os.path.join(TAP_DIR, "软著源程序_得道飞升模拟器.pdf")

# ---------------- 1. 读取 / 清洗 ----------------
raw, effective = load_effective()
total_raw, total = len(raw), len(effective)
print(f"原始总行数: {total_raw}")
print(f"有效代码行数（已剔除空行与纯注释行）: {total}")
print(f"注释/空行剔除占比: {(1 - total / total_raw) * 100:.1f}%")

# ---------------- 2. 折行 ----------------
# 折行按 Word 端最终字体 SimSun 的度量（与 Word 版同口径），
# 绘制仍用 STSong-Light（更窄）→ 两端都不会越出页面。
measure = make_simsun_measure(FONT_SIZE)
physical = fold_lines(effective, measure=measure)
wrapped_src = sum(1 for ln in effective if measure(ln) > USABLE)
print(f"超长行（按版面宽度折行）: {wrapped_src} 行 → 折行后打印行总数 {len(physical)}")

pages, info = slice_pages(physical)
if info["mode"] == "all":
    print(f"打印行不足 3000 行，全部提交，共 {len(pages)} 页")
else:
    print(f"页数: {len(pages)}（前 30 页 + 后 30 页）")
    print(f"覆盖范围: 前 30 页 = 有效代码第 1~{info['cov_front']} 行；"
          f"后 30 页 = 有效代码第 {total - info['cov_back'] + 1}~{total} 行")

# ---------------- 3. 绘制 ----------------
os.makedirs(TAP_DIR, exist_ok=True)
c = pdfcanvas.Canvas(OUT_PDF, pagesize=A4)
PW, PH = A4
LEFT = MARGIN
RIGHT = PW - MARGIN
TOP = PH - 20 * mm
HEADER_Y = PH - 13 * mm
TOTAL_PAGES = len(pages)


def draw_header(page_no):
    c.setFont(FONT, 8)
    c.setFillColor(colors.black)
    c.drawString(LEFT, HEADER_Y, f"{SOFT_NAME} {VERSION}")
    c.drawRightString(RIGHT, HEADER_Y, f"第 {page_no} 页 / 共 {TOTAL_PAGES} 页")
    c.setStrokeColor(colors.HexColor("#bbbbbb"))
    c.setLineWidth(0.4)
    c.line(LEFT, HEADER_Y - 4, RIGHT, HEADER_Y - 4)


for page_no, page_lines in enumerate(pages, start=1):
    draw_header(page_no)
    c.setFont(FONT, FONT_SIZE)
    c.setFillColor(colors.black)
    y = TOP
    for txt, _idx in page_lines:
        c.drawString(LEFT, y, txt)
        y -= LINE_LEAD
    c.showPage()

c.save()

print(f"已生成: {OUT_PDF}")
print(f"页数: {len(pages)}，每页 {LINES_PER_PAGE} 行")
print(f"大小: {os.path.getsize(OUT_PDF)/1024:.1f} KB")
