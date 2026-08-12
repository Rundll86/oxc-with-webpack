import os
import zipfile

from PIL import Image

os.makedirs("textures", exist_ok=True)
for f in os.listdir("textures"):
    os.remove(os.path.join("textures", f))
for i, file in enumerate(sorted(os.listdir("assets/textures"))):
    source = os.path.join("assets/textures", file)
    dist = os.path.join("textures", f"{i}.png")
    with Image.open(source) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img.save(dist, format="PNG")
os.makedirs("comics", exist_ok=True)
for file in sorted(os.listdir("assets/comics")):
    if not file.lower().endswith(".zip"):
        continue
    name = os.path.splitext(file)[0]
    target = os.path.join("comics", name)
    os.makedirs(target, exist_ok=True)
    source = os.path.join("assets/comics", file)
    with zipfile.ZipFile(source) as f:
        for member in f.infolist():
            if not (member.flag_bits & 0x800):
                data = member.filename.encode("cp437")
                for enc in ("utf-8", "gbk"):
                    try:
                        member.filename = data.decode(enc)
                        break
                    except UnicodeDecodeError:
                        continue
        f.extractall(target)
