# -*- coding: utf-8 -*-
"""
把软著相关的 Markdown 文档转为 Word（.docx）
用法: python tools/md2docx.py <input.md> [output.docx] [--header "页眉文字"]
流程: Markdown -> HTML -> html-to-docx -> .docx
"""
import os
import re
import subprocess
import sys

HTML_TO_DOCX_PY = r"C:\Users\Lenovo\.venv-html-to-docx\Scripts\python.exe"
H2D_SCRIPTS = (r"C:\Users\Lenovo\.workbuddy\plugins\cache\workbuddy-builtin"
               r"\tencent-docx\0.4.1\skills\html-to-docx\scripts")

CSS = """
@page {
  @top-left { content: "__HEADER__"; }
  @top-right { content: "第 " counter(page) " 页"; }
}
body { font-family: "宋体"; font-size: 10.5pt; line-height: 1.5; }
h1 { font-size: 16pt; text-align: center; }
h2 { font-size: 13pt; margin-top: 13pt; }
h3 { font-size: 11pt; margin-top: 9pt; }
p { margin: 4pt 0; }
blockquote p { font-size: 9.5pt; color: #444444; margin-left: 10pt; }
table.grid { border-collapse: collapse; width: 100%; }
table.grid th, table.grid td {
  border: 0.5pt solid #999999; padding: 3pt 5pt; font-size: 9pt;
}
table.grid th { background-color: #f0e6c8; }
li { font-size: 10pt; }
"""


def inline(t):
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`(.+?)`", r"\1", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", t)
    return t


def md_to_html(md):
    lines = md.split("\n")
    out = []
    i = 0
    in_ul = False

    def close_ul():
        nonlocal in_ul
        if in_ul:
            out.append("</ul>")
            in_ul = False

    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if not s:
            close_ul()
            i += 1
            continue
        # 表格
        if s.startswith("|") and i + 1 < len(lines) and \
                re.match(r"^\|[\s:\-|]+\|$", lines[i + 1].strip()):
            close_ul()
            header = [c.strip() for c in s.strip("|").split("|")]
            out.append('<table class="grid">')
            out.append("<tr>" + "".join(f"<th>{inline(c)}</th>" for c in header) + "</tr>")
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in cells) + "</tr>")
                i += 1
            out.append("</table>")
            continue
        if s.startswith("### "):
            close_ul(); out.append(f"<h3>{inline(s[4:])}</h3>")
        elif s.startswith("## "):
            close_ul(); out.append(f"<h2>{inline(s[3:])}</h2>")
        elif s.startswith("# "):
            close_ul(); out.append(f"<h1>{inline(s[2:])}</h1>")
        elif s.startswith("> "):
            close_ul(); out.append(f"<blockquote><p>{inline(s[2:])}</p></blockquote>")
        elif s in ("---", "***"):
            close_ul(); out.append("<hr/>")
        elif re.match(r"^[-*] ", s):
            if not in_ul:
                out.append("<ul>"); in_ul = True
            out.append(f"<li>{inline(s[2:])}</li>")
        elif re.match(r"^\d+\. ", s):
            close_ul()
            out.append(f'<p class="item">{inline(s)}</p>')
        else:
            close_ul(); out.append(f"<p>{inline(s)}</p>")
        i += 1
    close_ul()
    return "\n".join(out)


def convert(md_path, out_path=None, header="得道飞升模拟器 V1.0.0"):
    with open(md_path, encoding="utf-8") as f:
        md = f.read()
    body = md_to_html(md)
    html = (f'<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
            f'{CSS.replace("__HEADER__", header)}</style></head><body>{body}</body></html>')
    build = os.path.join(os.path.dirname(os.path.abspath(md_path)), "_build")
    os.makedirs(build, exist_ok=True)
    base = os.path.splitext(os.path.basename(md_path))[0]
    html_path = os.path.join(build, base + ".html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    if out_path is None:
        out_path = os.path.join(os.path.dirname(os.path.abspath(md_path)), base + ".docx")
    cmd = [HTML_TO_DOCX_PY, "-m", "html_to_docx", "convert", html_path,
           "-o", out_path, "--page-size", "A4",
           "--margin-top", "2.2", "--margin-bottom", "2.0",
           "--margin-left", "2.2", "--margin-right", "2.2"]
    r = subprocess.run(cmd, cwd=H2D_SCRIPTS, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    print("STDOUT:", (r.stdout or "").strip()[:600])
    if r.returncode != 0:
        print("STDERR:", (r.stderr or "").strip()[:1200])
        return None
    print("已生成:", out_path, "%.1f KB" % (os.path.getsize(out_path) / 1024))
    return out_path


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    hdr = "得道飞升模拟器 V1.0.0"
    for a in sys.argv[1:]:
        if a.startswith("--header="):
            hdr = a.split("=", 1)[1]
    src = args[0]
    dst = args[1] if len(args) > 1 else None
    convert(src, dst, hdr)
