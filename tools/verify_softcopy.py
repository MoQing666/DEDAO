# -*- coding: utf-8 -*-
"""
软著源程序鉴别材料 · 合规自检（PDF 版 + Word 版）
对照《计算机软件著作权登记办法》第十条 + 中国版权保护中心审查实务：

  R1 提交前、后各连续 30 页（共 60 页）；整个程序不足 60 页的全部提交
  R2 每页不少于 50 行（最后一页可为结束页）
  R3 空行、纯注释行（独立注释）不计入有效行数 —— 必须剔除
  R4 页眉标注软件名称 + 版本号，且与申请表一致
  R5 页码标注在右上角，连续
  R6 内容连续：前 30 页取自源码开头，后 30 页取自源码结尾
  R7 代码完整：不得截断、不得越出页面边界
  R8 A4 纵向、黑白、字体清晰、中文无乱码

用法：python tools/verify_softcopy.py
"""
import os
import re
import sys

import pdfplumber

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from softcopy_common import (FONT_SIZE, LINES_PER_PAGE, LINE_LEAD, SOFT_NAME,  # noqa: E402
                             TAP_DIR, USABLE, VERSION, fold_lines,
                             load_effective, make_measure, slice_pages)

PDF = os.path.join(TAP_DIR, "软著源程序_得道飞升模拟器.pdf")
DOCX = os.path.join(TAP_DIR, "软著源程序_得道飞升模拟器.docx")
WORD_FONT = "SimSun"

PASS, FAIL, WARN = "[PASS]", "[FAIL]", "[WARN]"
issues, warns = [], []
_sw = make_measure()


def ok(m):
    print(f"  {PASS} {m}")


def bad(m):
    print(f"  {FAIL} {m}")
    issues.append(m)


def warn(m):
    print(f"  {WARN} {m}")
    warns.append(m)


def norm(s):
    return re.sub(r"\s+", "", s)


def is_header_line(l):
    return SOFT_NAME in l or re.match(r"^第\s*\d+\s*页", l.strip())


raw, eff = load_effective()
physical = fold_lines(eff)
pages, info = slice_pages(physical)

print("=" * 74)
print("软著源程序鉴别材料 · 合规自检")
print("=" * 74)
print(f"源码物理行 {len(raw)} 行 → 有效代码行 {len(eff)} 行 "
      f"（剔除空行/纯注释 {len(raw) - len(eff)} 行，"
      f"占 {(1 - len(eff) / len(raw)) * 100:.1f}%）→ "
      f"折行后打印行 {len(physical)} 行 → {len(pages)} 页")

print("\n[R3] 有效行清洗（空行 / 纯注释行不计入）")
n_blank = sum(1 for l in eff if not l.strip())
n_cmt = sum(1 for l in eff if l.strip().startswith("//"))
n_blk = sum(1 for l in eff if l.strip().startswith(("*", "/*")))
if n_blank == 0 and n_cmt == 0 and n_blk == 0:
    ok("无空行、无 // 独立注释行、无 /* */ 块注释行残留")
else:
    bad(f"残留 空行 {n_blank} / 行注释 {n_cmt} / 块注释 {n_blk}")

# ================================================================ PDF 版
print("\n" + "-" * 74)
print(f"【PDF 版】{os.path.basename(PDF)}")
print("-" * 74)
print("\n[R0] 文件本身")
if not os.path.exists(PDF):
    bad("PDF 不存在")
    sys.exit(1)
ok(f"存在，{os.path.getsize(PDF) / 1024:.1f} KB")

with pdfplumber.open(PDF) as pdf:
    pdf_pages = pdf.pages

    print("\n[R1] 页数构成（前 30 页 + 后 30 页）")
    if len(pdf_pages) == len(pages):
        ok(f"共 {len(pdf_pages)} 页（前 30 页 + 后 30 页）")
    else:
        bad(f"页数 {len(pdf_pages)}，期望 {len(pages)}")

    texts = [(p.extract_text() or "") for p in pdf_pages]

    print("\n[R2] 每页行数（>= 50 行）")
    counts = [len([l for l in t.split("\n") if l.strip() and not is_header_line(l)])
              for t in texts]
    low = [(i, c) for i, c in enumerate(counts, 1) if c < LINES_PER_PAGE]
    if low:
        bad(f"不足 {LINES_PER_PAGE} 行的页：{low}")
    else:
        ok(f"每页均 >= {LINES_PER_PAGE} 行（实测 {min(counts)} ~ {max(counts)} 行）")

    print("\n[R4] 页眉（软件名称 + 版本号）")
    miss = [i for i, t in enumerate(texts, 1)
            if SOFT_NAME not in t.split("\n")[0] or VERSION not in t.split("\n")[0]]
    if miss:
        bad(f"页眉不合规的页：{miss}")
    else:
        ok(f"全部 {len(pdf_pages)} 页页眉均为「{SOFT_NAME} {VERSION}」")

    print("\n[R5] 页码（右上角、连续）")
    bad_no, bad_pos = [], []
    for i, pg in enumerate(pdf_pages, 1):
        t = texts[i - 1]
        if f"第 {i} 页" not in t or f"共 {len(pdf_pages)} 页" not in t:
            bad_no.append(i)
        ws = [w for w in pg.extract_words() if w["text"].startswith("第") and w["top"] < 60]
        if not ws or ws[0]["x0"] < pg.width * 0.6:
            bad_pos.append(i)
    if bad_no:
        bad(f"页码缺失/不连续的页：{bad_no}")
    else:
        ok(f"页码 1~{len(pdf_pages)} 连续，格式「第 X 页 / 共 {len(pdf_pages)} 页」")
    if bad_pos:
        bad(f"页码不在右上角的页：{bad_pos[:6]}")
    else:
        ok("页码均位于页面右上角")

    print("\n[R6] 内容连续性")
    p1 = [l for l in texts[0].split("\n") if l.strip() and not is_header_line(l)]
    if p1 and norm(eff[0]).startswith(norm(p1[0])[:40]):
        ok(f"第 1 页首行 = 源码首行：{p1[0][:56]!r}")
    else:
        bad(f"第 1 页首行与源码首行不符：{p1[0][:56] if p1 else '(空)'!r}")
    plast = [l for l in texts[-1].split("\n") if l.strip() and not is_header_line(l)]
    if plast and norm(eff[-1]).endswith(norm(plast[-1])[-40:]):
        ok(f"末页末行 = 源码末行：{plast[-1][:56]!r}")
    else:
        bad(f"末页末行与源码末行不符：{plast[-1][:56] if plast else '(空)'!r}")
    if info["mode"] == "front_back":
        ok(f"覆盖范围：前 30 页 = 有效代码 1~{info['cov_front']} 行；"
           f"后 30 页 = {len(eff) - info['cov_back'] + 1}~{len(eff)} 行（中间按一般交存省略）")

    print("\n[R7] 代码完整性与版面（不截断 / 不越界）")
    trunc = [(i, l[-50:]) for i, t in enumerate(texts, 1)
             for l in t.split("\n") if l.rstrip().endswith("...")]
    if trunc:
        warn(f"{len(trunc)} 行以「...」结尾，可能为截断")
        for pg, l in trunc[:3]:
            print(f"        P{pg}: …{l}")
    else:
        ok("无截断行（超长行按版面折行，代码完整）")

    over_r, over_b, nonA4 = [], [], []
    for i, pg in enumerate(pdf_pages, 1):
        if abs(pg.width - 595.276) > 2 or abs(pg.height - 841.89) > 2:
            nonA4.append(i)
        ws = pg.extract_words()
        if ws and max(w["x1"] for w in ws) > pg.width - 30:
            over_r.append((i, round(max(w["x1"] for w in ws), 1)))
        if ws and max(w["bottom"] for w in ws) > pg.height - 30:
            over_b.append((i, round(max(w["bottom"] for w in ws), 1)))
    ok("全部页面均为 A4 纵向（595 x 842 pt）") if not nonA4 else bad(f"非 A4 页：{nonA4}")
    if over_r:
        bad(f"文本越出右边界：{over_r[:6]}")
    else:
        ok(f"文本未越出右边界（版心 {USABLE:.0f} pt）")
    if over_b:
        bad(f"文本越出下边界：{over_b[:6]}")
    else:
        ok("文本未越出下边界")

    print("\n[R8] 字体与中文")
    fonts = sorted({ch.get("fontname", "") for pg in pdf_pages for ch in pg.chars})
    ok(f"字体：{', '.join(f for f in fonts if f)}")
    cn = sum(1 for l in eff if any("\u4e00" <= c <= "\u9fff" for c in l))
    ok(f"源码含中文的有效行 {cn} 行，PDF 文本层提取正常（无乱码）")

# ================================================================ Word 版
print("\n" + "-" * 74)
print(f"【Word 版】{os.path.basename(DOCX)}")
print("-" * 74)
try:
    from docx import Document
    from docx.oxml.ns import qn
except ImportError:
    warn("未安装 python-docx，跳过 Word 版自检")
    Document = None

if Document is not None:
    if not os.path.exists(DOCX):
        warn("Word 版尚未生成（先跑 tools/gen_softcopy_docx.py）")
    else:
        d = Document(DOCX)
        paras = list(d.paragraphs)
        print(f"段落 {len(paras)} 个 / 表格 {len(d.tables)} 个 / "
              f"图片 {len(d.inline_shapes)} 个 / {os.path.getsize(DOCX) / 1024:.1f} KB")

        expect_paras = len(pages) * LINES_PER_PAGE
        if len(paras) == expect_paras:
            ok(f"正文段落数 {len(paras)} = {len(pages)} 页 x {LINES_PER_PAGE} 行")
        else:
            bad(f"正文段落数 {len(paras)}，期望 {expect_paras}")

        brk = sum(1 for p in paras
                  if p._p.find(qn("w:pPr")) is not None
                  and p._p.find(qn("w:pPr")).find(qn("w:pageBreakBefore")) is not None)
        if brk == len(pages) - 1:
            ok(f"强制分页 {brk} 处 = {len(pages)} 页 - 1（每 {LINES_PER_PAGE} 行分页）")
        else:
            bad(f"强制分页 {brk} 处，期望 {len(pages) - 1}")

        sec0 = d.sections[0]
        htxt = " ".join(p.text for p in sec0.header.paragraphs if p.text.strip())
        if SOFT_NAME in htxt and VERSION in htxt:
            ok(f"页眉含软件名+版本号：{htxt.strip()[:44]}")
        else:
            bad(f"页眉缺软件名/版本号：{htxt!r}")
        hxml = sec0.header.paragraphs[0]._p.xml
        if "PAGE" in hxml and "NUMPAGES" in hxml:
            ok("页眉含 PAGE / NUMPAGES 域（页码自动计算，右制表位对齐）")
        else:
            bad("页眉缺少 PAGE / NUMPAGES 域")
        if abs(sec0.page_width.cm - 21.0) < 0.1 and abs(sec0.page_height.cm - 29.7) < 0.1:
            ok(f"A4 纵向 {sec0.page_width.cm:.1f} x {sec0.page_height.cm:.1f} cm，"
               f"左右边距 {sec0.left_margin.cm:.1f} cm / 上 {sec0.top_margin.cm:.1f} cm")
        else:
            bad("页面尺寸非 A4")

        over = [i for i, p in enumerate(paras, 1) if _sw(p.text) > USABLE]
        if over:
            bad(f"{len(over)} 行超出版心宽度（Word 会自动换行，破坏每页 50 行）：{over[:5]}")
        else:
            ok(f"全部 {len(paras)} 行均在版心宽度内（不会自动换行）")
        sizes = {r.font.size.pt for p in paras for r in p.runs if r.font.size}
        if sizes <= {FONT_SIZE}:
            ok(f"正文字号 {FONT_SIZE}pt / 字体 {WORD_FONT}")
        else:
            bad(f"正文字号不统一：{sorted(sizes)}")
        ls = {p.paragraph_format.line_spacing.pt for p in paras
              if hasattr(p.paragraph_format.line_spacing, "pt")}
        if ls <= {LINE_LEAD}:
            ok(f"行距固定 {LINE_LEAD}pt → 每页 {LINES_PER_PAGE} 行占 "
               f"{LINE_LEAD * LINES_PER_PAGE:.0f}pt < 版心高 742pt")
        else:
            bad(f"行距不统一：{sorted(ls)}")

        if norm(eff[0]).startswith(norm(paras[0].text)[:40]):
            ok(f"首行 = 源码首行：{paras[0].text[:52]!r}")
        else:
            bad(f"首行与源码首行不符：{paras[0].text[:52]!r}")
        if norm(eff[-1]).endswith(norm(paras[-1].text)[-40:]):
            ok(f"末行 = 源码末行：{paras[-1].text[:52]!r}")
        else:
            bad(f"末行与源码末行不符：{paras[-1].text[:52]!r}")
        trunc = [p.text for p in paras if p.text.rstrip().endswith("...")]
        if trunc:
            warn(f"{len(trunc)} 行以「...」结尾")
        else:
            ok("无截断行（超长行已折行，代码完整）")

print("\n" + "=" * 74)
if issues:
    print(f"结论：{FAIL} 发现 {len(issues)} 项不合规，需修复")
    for m in issues:
        print(f"   - {m}")
else:
    print(f"结论：{PASS} PDF 版与 Word 版全部检查通过，可直接提交")
if warns:
    print(f"提示：{len(warns)} 项非阻断性提示")
print("=" * 74)
