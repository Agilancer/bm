"""Lays review shots out as contact sheets. Usage: python tools/sheet.py OUT.jpg COLS WIDTH name [name...]"""
import os
import sys

from PIL import Image, ImageDraw

out, cols, width = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "shots")
images = [(n, Image.open(os.path.join(root, n + ".png")).convert("RGB")) for n in sys.argv[4:]]
h = int(width * images[0][1].height / images[0][1].width)
rows = (len(images) + cols - 1) // cols
sheet = Image.new("RGB", (cols * width, rows * h))
for i, (name, im) in enumerate(images):
    x, y = (i % cols) * width, (i // cols) * h
    sheet.paste(im.resize((width, h), Image.LANCZOS), (x, y))
    ImageDraw.Draw(sheet).text((x + 6, y + 4), name, fill=(255, 240, 180))
sheet.save(out, quality=88)
