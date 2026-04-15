import os
import glob
from PIL import Image, ImageDraw

def process():
    folder = "/Users/anthony/Downloads/manoscurativas.com.co/Fotos masages"
    files = sorted(glob.glob(os.path.join(folder, "*.jpg")))
    
    unique_files = []
    seen = set()
    for f in files:
        s = os.path.getsize(f)
        if s not in seen:
            seen.add(s)
            unique_files.append(f)
            
    print(f"Total unique files based on file size: {len(unique_files)}")
    
    # Grid of 5x5 = 25 images per collage
    cols, rows = 5, 5
    max_img = cols * rows
    thumb_w, thumb_h = 400, 400
    
    chunks = [unique_files[i:i+max_img] for i in range(0, len(unique_files), max_img)]
    
    for i, chunk in enumerate(chunks):
        collage = Image.new('RGB', (cols * thumb_w, rows * thumb_h), (255, 255, 255))
        
        for j, f in enumerate(chunk):
            try:
                with Image.open(f) as img:
                    img = img.convert('RGB')
                    gray = img.convert('L')
                    hist = gray.histogram()
                    pixels = sum(hist)
                    avg_brightness = sum(n * c for n, c in enumerate(hist)) / pixels
                    
                    img.thumbnail((thumb_w, thumb_h))
                    
                    x = (j % cols) * thumb_w
                    y = (j // cols) * thumb_h
                    
                    px = x + (thumb_w - img.width) // 2
                    py = y + (thumb_h - img.height) // 2
                    
                    collage.paste(img, (px, py))
                    
                    name = os.path.basename(f).replace('.jpg', '')
                    if avg_brightness < 45:
                        name += " OSCURA"
                    
                    # Custom huge txt
                    txt_i = Image.new('RGB', (160, 15), (0,0,0))
                    d = ImageDraw.Draw(txt_i)
                    d.text((2,2), name, fill=(255,255,0))
                    # 0 is Image.Resampling.NEAREST
                    txt_i = txt_i.resize((320, 30), 0)
                    collage.paste(txt_i, (x, y))
                    
            except Exception as e:
                print(f"Error reading {f}: {e}")
                
        out_f = f"/Users/anthony/Downloads/manoscurativas.com.co/ai_collage_{i}.jpg"
        collage.save(out_f, quality=80)
        print(f"Generated {out_f}")

if __name__ == '__main__':
    process()
