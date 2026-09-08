# -*- coding: utf-8 -*-
"""
生成软著源程序鉴别材料 PDF（前 30 页 + 后 30 页，每页 50 行，页眉含软件全称+版本号）
用法：python gen_softcopy_pdf.py
输出：dist/taptap/软著源程序_得道飞升模拟器.pdf
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle

# 中文字体
pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["audio.js", "data.js", "engine.js", "ui.js"]  # 按 index.html 引用顺序
JS_DIR = os.path.join(ROOT, "js")
OUT_DIR = os.path.join(ROOT, "dist", "taptap")
OUT_PDF = os.path.join(OUT_DIR, "软著源程序_得道飞升模拟器.pdf")

SOFT_NAME = "得道飞升模拟器"
VERSION = "V1.0.0"
LINES_PER_PAGE = 50

# 合并代码行
all_lines = []
for f in FILES:
    p = os.path.join(JS_DIR, f)
    with open(p, "r", encoding="utf-8", errors="replace") as fh:
        for ln in fh:
            all_lines.append(ln.rstrip("\n"))

total = len(all_lines)
print(f"合并总行数: {total}")

# 选取 前30页(前1500行) + 后30页(后1500行)
FRONT = LINES_PER_PAGE * 30
BACK = LINES_PER_PAGE * 30
front_lines = all_lines[:FRONT]
back_lines = all_lines[-BACK:] if total > FRONT else []

# 组合成 60 页的行列表（每页 50 行）
pages = []
for i in range(0, len(front_lines), LINES_PER_PAGE):
    pages.append(front_lines[i:i + LINES_PER_PAGE])
for i in range(0, len(back_lines), LINES_PER_PAGE):
    pages.append(back_lines[i:i + LINES_PER_PAGE])

print(f"页数: {len(pages)}（前 {len(front_lines)//LINES_PER_PAGE} 页 + 后 {len(back_lines)//LINES_PER_PAGE} 页）")

# 样式
line_style = ParagraphStyle(
    "code",
    fontName="STSong-Light",
    fontSize=7.5,
    leading=9.2,
    textColor=colors.black,
    wordWrap="CJK",
)

header_style = ParagraphStyle(
    "header",
    fontName="STSong-Light",
    fontSize=8,
    leading=10,
    textColor=colors.black,
)

def esc(s):
    # 转义 XML 特殊字符，保留代码原貌
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def build_page(canvas, doc):
    canvas.saveState()
    # 页眉
    canvas.setFont("STSong-Light", 8)
    header_text = f"{SOFT_NAME} {VERSION}"
    canvas.drawString(20 * mm, A4[1] - 15 * mm, header_text)
    canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 15 * mm, header_text)
    # 页脚页码
    canvas.drawCentredString(A4[0] / 2, 12 * mm, f"第 {doc.page} 页")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUT_PDF,
    pagesize=A4,
    topMargin=20 * mm,
    bottomMargin=20 * mm,
    leftMargin=15 * mm,
    rightMargin=15 * mm,
)

story = []
for idx, page_lines in enumerate(pages):
    # 每页顶部一个小标注（可选，不占行数统计）
    for ln in page_lines:
        story.append(Paragraph(esc(ln) if ln else " ", line_style))
    story.append(Spacer(1, 4))

doc.build(story, onFirstPage=build_page, onLaterPages=build_page)
print(f"已生成: {OUT_PDF}")
print(f"大小: {os.path.getsize(OUT_PDF)/1024:.1f} KB")
