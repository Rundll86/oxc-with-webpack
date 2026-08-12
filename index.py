import os

from PIL import Image

os.makedirs("output", exist_ok=True)
for f in os.listdir("output"):
    os.remove(os.path.join("output", f))
for i, file in enumerate(sorted(os.listdir("assets"))):
    source = os.path.join("assets", file)
    dist = os.path.join("output", f"{i}.png")
    with Image.open(source) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img.save(dist, format="PNG")
