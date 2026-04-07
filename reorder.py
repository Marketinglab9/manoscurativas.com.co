import re

with open('src/templates/plantilla_maestra.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define blocks using regex. Wait, regex for HTML matching might be tricky if not careful with nested tags.
# Since the comments are very consistent, I can split by them.

def extract_block(pattern, content):
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"Failed to find pattern: {pattern}")
        return "", content
    block = match.group(0)
    # Remove the block from content
    content = content.replace(block, "")
    return block, content

# Elfsight (Reseñas) starts at: <!-- Reseñas de Google - Elfsight --> and ends before <!-- PHILOSOPHY_START -->
elfsight_pattern = r'<!-- Reseñas de Google - Elfsight -->.*?</section>'

# WIDGETS_CONVERSION 
widget_pattern = r'<!-- WIDGETS_CONVERSION_START -->.*?<!-- WIDGETS_CONVERSION_END -->'

# BENEFICIOS (Por qué elegirnos)
beneficios_pattern = r'<!-- SECCIÓN DE BENEFICIOS CLÍNICOS SEO \(Contenido Estructural de Valor\) -->.*?</section>'

# PHILOSOPHY
philosophy_pattern = r'<!-- PHILOSOPHY_START -->.*?<!-- PHILOSOPHY_END -->'

# We need to find the injection points.
# After hero wrapper: 
hero_end_pattern = r'</section>\s*</div>\s*<div class="flex flex-col w-full">\s*\{\{SERVICE_INFO\}\}'
# Wait, {{SERVICE_INFO}} is inside the <div class="flex flex-col w-full">.
# The `{{SERVICE_INFO}}` should stay, but wait: the plan says:
# 1. Hero
# 2. Reseñas (Elfsight)
# 3. Widgets Conversion
# 4. {{SERVICE_INFO}} AND Matriz
# Wait, the Matriz is INSIDE the Widgets Conversion block?
# Let's check where the Matriz is.

