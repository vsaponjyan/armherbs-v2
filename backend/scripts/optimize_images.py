import json
from pathlib import Path
from PIL import Image
import os


SCRIPTS_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPTS_DIR.parent.parent
IMAGE_DIR = ROOT_DIR / "frontend" / "public" / "herbs"

def optimize_images():
    for img_path in IMAGE_DIR.glob("*.jpg"):
        temp_path = img_path.with_suffix(".temp.jpg")
        
        try:
            with Image.open(img_path) as img:
                # We solve the BLACK BACKGROUND problem(we put a white background underneath)
                if img.mode in ("RGBA", "LA", "P"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "RGBA":
                        background.paste(img, (0, 0), img)
                    else:
                        background.paste(img, (0, 0))
                    img = background
                else:
                    img = img.convert("RGB")

                target_width = 1200 
                if img.width > target_width:
                    ratio = target_width / float(img.width)
                    target_height = int(float(img.height) * float(ratio))
                    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

                img.save(temp_path, "JPEG", quality=90, optimize=True, subsampling=0)
            
            os.replace(temp_path, img_path)
            print(f"✅ Անվտանգ օպտիմալացվեց: {img_path.name}")
                
        except Exception as e:
            if temp_path.exists():
                os.remove(temp_path)
            print(f"❌ Սխալ {img_path.name}-ի հետ: {e}")

if __name__ == "__main__":
    optimize_images()