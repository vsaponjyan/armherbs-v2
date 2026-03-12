import json
from pathlib import Path
from PIL import Image
import os

# Paths
SCRIPTS_DIR = Path(__file__).parent.resolve()
ROOT_DIR = SCRIPTS_DIR.parent.parent
IMAGE_DIR = ROOT_DIR / "frontend" / "public" / "herbs"

def optimize_images():
    # We only check .jpg files.
    for img_path in IMAGE_DIR.glob("*.jpg"):
        # Temporary file address
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

                # Resize (1200px - high quality and clear)
                target_width = 1200 
                if img.width > target_width:
                    ratio = target_width / float(img.width)
                    target_height = int(float(img.height) * float(ratio))
                    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

                # Save to TEMPORARY file (Quality 90)
                # subsampling=0 preserves color accuracy
                img.save(temp_path, "JPEG", quality=90, optimize=True, subsampling=0)
            
            # If the save was successful, we replace the old with the new.
            os.replace(temp_path, img_path)
            print(f"✅ Անվտանգ օպտիմալացվեց: {img_path.name}")
                
        except Exception as e:
        # If an error occurs, we delete the temporary file so that it doesn't take up space.
            if temp_path.exists():
                os.remove(temp_path)
            print(f"❌ Սխալ {img_path.name}-ի հետ: {e}")

if __name__ == "__main__":
    optimize_images()