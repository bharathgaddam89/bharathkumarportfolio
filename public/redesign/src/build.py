import json, pathlib

ROOT = pathlib.Path(__file__).parent.parent  # public/redesign
css = (ROOT / 'src/style.css').read_text()
body = (ROOT / 'src/body.html').read_text()
data = (ROOT / 'src/data.js').read_text()
dims = json.loads((ROOT / 'src/dims.json').read_text())
js = (ROOT / 'src/app.js').read_text().replace('/*DIMS*/{}', json.dumps(dims, separators=(',', ':')))

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">')
LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
        'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js']
PRE = "<script>try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-pre')}catch(e){}</script>"

def page(fonts, libs):
    scripts = '\n'.join(f'<script src="{u}"></script>' for u in libs)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bharath Gaddam Portfolio</title>
<meta name="description" content="Bharath Kumar Gaddam, senior product and visual designer in Atlanta. 11 case studies, a 45-piece gallery, and a journey from Hyderabad to a PhD.">
<meta property="og:title" content="Bharath Gaddam · Product & Visual Designer">
<meta property="og:description" content="Case studies, gallery and journey.">
<meta property="og:image" content="img/orbit-podium.jpg">
{PRE}
{fonts}
<style>
{css}
</style>
</head>
<body>
{body}
{scripts}
<script>
{data}
{js}
</script>
</body>
</html>
'''

(ROOT / 'index.html').write_text(page(FONTS, LIBS))
NM = 'file:///home/claude/preview/node_modules'
local_fonts = f'''<style>
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2) format('woff2');font-weight:400}}
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2) format('woff2');font-weight:500}}
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2) format('woff2');font-weight:600}}
</style>'''
local_libs = [f'{NM}/gsap/dist/gsap.min.js', f'{NM}/gsap/dist/ScrollTrigger.min.js', f'{NM}/lenis/dist/lenis.min.js']
(ROOT / 'preview.html').write_text(page(local_fonts, local_libs))
print('built', len((ROOT / 'index.html').read_text()) // 1024, 'KB')
