# -*- coding: utf-8 -*-
"""
生成软著《使用说明书》底稿 PDF（文档鉴别材料）
页眉含软件全称+版本号，连续页码。
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle

pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "taptap", "软著使用说明书_得道飞升模拟器.pdf")
SOFT = "得道飞升模拟器"
VER = "V1.0.0"

# 样式
h1 = ParagraphStyle("h1", fontName="STSong-Light", fontSize=16, leading=22, spaceAfter=6, spaceBefore=4)
h2 = ParagraphStyle("h2", fontName="STSong-Light", fontSize=13, leading=18, spaceAfter=4, spaceBefore=10)
body = ParagraphStyle("body", fontName="STSong-Light", fontSize=10.5, leading=17, spaceAfter=4)
small = ParagraphStyle("small", fontName="STSong-Light", fontSize=9, leading=14, textColor=colors.HexColor("#555555"))

def header(canvas, doc):
    canvas.saveState()
    canvas.setFont("STSong-Light", 8)
    t = f"{SOFT} {VER}"
    canvas.drawString(20*mm, A4[1]-15*mm, t)
    canvas.drawRightString(A4[0]-20*mm, A4[1]-15*mm, t)
    canvas.drawCentredString(A4[0]/2, 12*mm, f"第 {doc.page} 页")
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm,
                        leftMargin=18*mm, rightMargin=18*mm)
S = []

S.append(Paragraph(f"{SOFT} 使用说明书", h1))
S.append(Paragraph(f"软件版本：{VER}　|　软件类型：网页放置养成游戏（HTML5）　|　运行环境：现代浏览器 / PWA", small))
S.append(Spacer(1, 8))

S.append(Paragraph("一、软件概述", h2))
S.append(Paragraph(f"《{SOFT}》是一款以东方修仙为题材的文字放置养成类游戏。玩家扮演一名凡尘散修，从炼气期起步，历经锻体、炼气、筑基、金丹、元婴直至飞升成仙。游戏采用离线挂机机制，闭关修行、游历访友、探索秘境均可离线获得收益，配合完整的宗门体系、随机仙缘事件与法宝功法收集玩法，构建出一条可反复轮回的成长路线。软件为纯免费产品，不含内购与广告。", body))

S.append(Paragraph("二、运行与启动方式", h2))
S.append(Paragraph("1. 网页方式：使用浏览器直接打开程序目录下的 index.html 即可进入游戏；", body))
S.append(Paragraph("2. PWA 方式：部署到静态服务器（支持 HTTPS）后，浏览器提示“添加到主屏幕”，可像本地应用一样离线运行；", body))
S.append(Paragraph("3. 平台方式：作为 H5 包上传至 TapTap 小游戏中心等平台，在宿主应用内即点即玩。", body))
S.append(Paragraph("首次进入需选择命格（3 选 1）与输入角色姓名，随后进入游戏主界面。", body))

S.append(Paragraph("三、主要界面与功能说明", h2))

rows = [
    ["界面", "功能说明"],
    ["标题 / 开始", "开始新轮回，选择天命命格，输入姓名"],
    ["修行（主界面）", "闭关修炼积累修为，突破境界，处理随机事件"],
    ["锻体", "淬炼肉身，提升体魄与气血"],
    ["人物", "查看六维属性、灵根资质、装备、法宝、功法"],
    ["背包 / 储物", "查看与使用丹药、灵材、功法等物品"],
    ["装备", "穿戴武器、防具、饰品"],
    ["功法 / 法术", "学习功法、配置战斗法术顺序"],
    ["百艺 / 技艺", "炼丹、炼器、布阵等生产活动"],
    ["宗门", "入宗考验、宗门任务、藏剑阁、宗门大比、宗门商人"],
    ["游历", "市井机缘、名山大川、秘境探索"],
    ["仙缘 / 人际", "与 NPC 交游、触发仙缘剧情"],
    ["渡劫", "金丹、元婴、飞升大劫挑战"],
    ["轮回 / 结算", "一世结束后的结算与转世轮回"],
    ["设置", "音效、存档、读取、缓存管理"],
]
t = Table(rows, colWidths=[45*mm, 120*mm])
t.setStyle(TableStyle([
    ("FONTNAME", (0,0), (-1,-1), "STSong-Light"),
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#f0e6c8")),
    ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#999999")),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("LEFTPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
]))
S.append(t)
S.append(Spacer(1, 6))

S.append(Paragraph("四、核心系统说明", h2))
S.append(Paragraph("（一）境界体系：共 5 大境界（炼气、筑基、金丹、元婴、仙）× 前中后期 15 小阶，突破需累积修为并可通过渡劫丹药提升成功率，金丹、元婴、飞升阶段须渡天劫。", body))
S.append(Paragraph("（二）属性体系：核心属性包括悟性、道心、神识、体魄、灵根资质、灵力、遁速等，由命格、功法、丹药、法宝与随机事件共同养成。", body))
S.append(Paragraph("（三）宗门体系：入宗需经考验评定真传/内门/外门身份，失败可为杂役并逐年重考；宗门内可接任务、探索藏剑阁、参与大比，或在宗门商人处用功业与灵石兑换资源。", body))
S.append(Paragraph("（四）随机事件与游历：市井机缘、名山大川、秘境探索等百余个事件随境界与选择动态触发，塑造独一无二的修仙经历。", body))
S.append(Paragraph("（五）战斗系统：采用文字回合制自动战斗，可配置法术顺序，受属性与法宝加成影响。", body))

S.append(Paragraph("五、存档与数据", h2))
S.append(Paragraph("游戏进度自动保存于浏览器本地存储（localStorage），支持手动存档/读档；部署为 PWA 后通过 Service Worker 支持离线缓存与版本更新。", body))

S.append(Paragraph("六、常见问题（FAQ）", h2))
faq = [
    "Q：游戏需要联网吗？　A：核心玩法完全离线，仅首次加载资源与平台内部分享功能需要网络。",
    "Q：是否有内购？　A：无。本作完全免费，不含任何内购与广告。",
    "Q：如何突破境界？　A：在修行界面累积修为至所需阈值，渡劫阶段服用对应丹药可提升成功率。",
    "Q：如何加入宗门？　A：主线引导或达到筑基后，在宗门界面选择意属宗门并参加入宗考验。",
]
for q in faq:
    S.append(Paragraph(q, body))

doc.build(S, onFirstPage=header, onLaterPages=header)
print("已生成:", OUT)
print("大小: %.1f KB" % (os.path.getsize(OUT)/1024))
