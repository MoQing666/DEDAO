#!/usr/bin/env python3
# 把 ImageGen 生成的立绘整理为 assets/img/portrait/<key>.png，并像素化/量化以贴合游戏像素风
import os, glob
from PIL import Image

BASE = "D:/opencode/DEDAO/assets/img/portrait"
KEYS = ["me", "foe", "boss_huang", "boss_xuan", "boss_di", "boss_tian", "boss_xian"]
TARGET = (184, 240)  # 2x of 92x120 显示尺寸，配合 image-rendering:pixelated

for k in KEYS:
    d = os.path.join(BASE, k)
    files = glob.glob(os.path.join(d, "*.png"))
    if not files:
        print("WARN 缺失:", k); continue
    src = files[0]
    im = Image.open(src).convert("RGB")
    # 先 LANCZOS 降采样，再量化到有限色板，得到干净像素感
    im = im.resize(TARGET, Image.LANCZOS)
    im = im.quantize(colors=56, method=Image.MEDIANCUT).convert("RGB")
    out = os.path.join(BASE, k + ".png")
    im.save(out, "PNG")
    os.remove(src)
    try: os.rmdir(d)
    except OSError: pass
    print("OK", k, "->", out, im.size)
print("done")
