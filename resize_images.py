import os
from PIL import Image

def optimize_image(filepath, is_hero=False):
    try:
        img = Image.open(filepath)
        max_size = 1920 if is_hero else 800
        
        # Calculate new size maintaining aspect ratio
        if img.width > max_size or img.height > max_size:
            if img.width > img.height:
                new_width = max_size
                new_height = int((max_size / img.width) * img.height)
            else:
                new_height = max_size
                new_width = int((max_size / img.height) * img.width)
            
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        # Save optimized webp
        img.save(filepath, 'WEBP', quality=75, method=6)
        print(f"Optimized {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {str(e)}")

assets_dir = "./src/assets"
servicios_dir = os.path.join(assets_dir, "servicios")

# Optimize hero
hero_path = os.path.join(assets_dir, "hero_7720.webp")
if os.path.exists(hero_path):
    optimize_image(hero_path, is_hero=True)

# Optimize service images
if os.path.exists(servicios_dir):
    for f in os.listdir(servicios_dir):
        if f.endswith('.webp') and not f.startswith('media_'):
            # Only optimize the main high-res ones
            path = os.path.join(servicios_dir, f)
            size = os.path.getsize(path)
            if size > 150000: # if larger than 150KB
                optimize_image(path, is_hero=False)

