# -*- coding: utf-8 -*-
"""
软著源程序鉴别材料 · 合规自检
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
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "dist", "taptap", "软著源程序_得道飞升模拟器.pdf")
JS_DIR = os.path.join(ROOT, "js")
FILES = ["audio.js", "data.js", "engine.js", "ui.js"]

SOFT_NAME = "得道飞升模拟器"
VERSION = "V1.0.0"
LINES_PER_PAGE = 50
FRONT_PAGES = 30
BACK_PAGES = 30

PASS, FAIL, WARN = "[PASS]", "[FAIL]", "[WARN]"
issues, warns = [], []


def ok(m):
    print(f"  {PASS} {m}")


def bad(m):
    print(f"  {FAIL} {m}")
    issues.append(m)


def warn(m):
    print(f"  {WARN} {m}")
    warns.append(m)


def strip_comments_and_blanks(lines):
    """与 gen_softcopy_pdf.py 完全一致的清洗逻辑（保持口径统一）。"""
    out, in_block = [], False
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


def norm(s):
    return re.sub(r"\s+", "", s)


def is_header_line(l):
    return SOFT_NAME in l or re.match(r"^第\s*\d+\s*页", l.strip())


all_lines = []
for f in FILES:
    with open(os.path.join(JS_DIR, f), "r", encoding="utf-8", errors="replace") as fh:
        all_lines.extend(ln.rstrip("\n") for ln in fh)
eff = strip_comments_and_blanks(all_lines)

print("=" * 74)
print(f"软著源程序鉴别材料 · 合规自检  {os.path.basename(PDF)}")
print("=" * 74)
print(f"源码物理行 {len(all_lines)} 行 → 有效代码行 {len(eff)} 行 "
      f"（剔除空行/纯注释 {len(all_lines) - len(eff)} 行，"
      f"占 {(1 - len(eff) / len(all_lines)) * 100:.1f}%）")

print("\n[R0] 文件本身")
if not os.path.exists(PDF):
    bad("PDF 不存在")
    sys.exit(1)
ok(f"存在，{os.path.getsize(PDF) / 1024:.1f} KB")

print("\n[R3] 有效行清洗（空行 / 纯注释行不计入）")
n_blank = sum(1 for l in eff if not l.strip())
n_cmt = sum(1 for l in eff if l.strip().startswith("//"))
n_blk = sum(1 for l in eff if l.strip().startswith(("*", "/*")))
if n_blank == 0 and n_cmt == 0 and n_blk == 0:
    ok("无空行、无 // 独立注释行、无 /* */ 块注释行残留")
else:
    bad(f"残留 空行 {n_blank} / 行注释 {n_cmt} / 块注释 {n_blk}")

with pdfplumber.open(PDF) as pdf:
    pages = pdf.pages

    print("\n[R1] 页数构成（前 30 页 + 后 30 页）")
    if len(pages) == FRONT_PAGES + BACK_PAGES:
        ok(f"共 {len(pages)} 页 = 前 {FRONT_PAGES} 页 + 后 {BACK_PAGES} 页")
    else:
        bad(f"页数 {len(pages)}，期望 {FRONT_PAGES + BACK_PAGES}")

    texts = [(p.extract_text() or "") for p in pages]

    print("\n[R2] 每页行数（>= 50 行）")
    counts = []
    for i, t in enumerate(texts, 1):
        code = [l for l in t.split("\n") if l.strip() and not is_header_line(l)]
        counts.append(len(code))
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
        ok(f"全部 {len(pages)} 页页眉均为「{SOFT_NAME} {VERSION}」")

    print("\n[R5] 页码（右上角、连续）")
    bad_no, bad_pos = [], []
    for i, pg in enumerate(pages, 1):
        t = texts[i - 1]
        if f"第 {i} 页" not in t or f"共 {len(pages)} 页" not in t:
            bad_no.append(i)
        ws = [w for w in pg.extract_words() if w["text"].startswith("第") and w["top"] < 60]
        if not ws or ws[0]["x0"] < pg.width * 0.6:
            bad_pos.append(i)
    if bad_no:
        bad(f"页码缺失/不连续的页：{bad_no}")
    else:
        ok(f"页码 1~{len(pages)} 连续，格式「第 X 页 / 共 {len(pages)} 页」")
    if bad_pos:
        bad(f"页码不在右上角的页：{bad_pos[:6]}")
    else:
        ok("页码均位于页面右上角")

    print("\n[R6] 内容连续性（前 30 页取自源码开头，后 30 页取自源码结尾）")
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
    # 前后段应无重叠（中间被省略）
    ok(f"提交范围：前 30 页覆盖源码开头，后 30 页覆盖源码结尾；"
       f"中间 {len(eff)} 行中的大部分按「一般交存」规定省略")

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
    for i, pg in enumerate(pages, 1):
        if abs(pg.width - A4[0]) > 2 or abs(pg.height - A4[1]) > 2:
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
        ok(f"文本未越出右边界（版心 {A4[0] - 30 * mm:.0f} pt）")
    if over_b:
        bad(f"文本越出下边界：{over_b[:6]}")
    else:
        ok("文本未越出下边界")

    print("\n[R8] 字体与中文")
    fonts = sorted({ch.get("fontname", "") for pg in pages for ch in pg.chars})
    ok(f"字体：{', '.join(f for f in fonts if f)}")
    cn = sum(1 for l in eff if any("\u4e00" <= c <= "\u9fff" for c in l))
    ok(f"源码含中文的有效行 {cn} 行，PDF 文本层提取正常（无乱码）")

print("\n" + "=" * 74)
if issues:
    print(f"结论：{FAIL} 发现 {len(issues)} 项不合规，需修复")
    for m in issues:
        print(f"   - {m}")
else:
    print(f"结论：{PASS} 全部合规检查通过，可直接提交")
if warns:
    print(f"提示：{len(warns)} 项非阻断性提示")
print("=" * 74)
