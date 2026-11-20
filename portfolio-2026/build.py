"""Build the portfolio: site (index.html), editor (admin/index.html), redirects.

Output goes to ./dist (deploy root). Also writes ./index.html + ./preview.html
(single-file builds used for the Claude artifact and local testing).
"""
import json, pathlib, re, shutil

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
css = (SRC / 'style.css').read_text()
body = (SRC / 'body.html').read_text()
content = json.loads((SRC / 'content.json').read_text())
dims = json.loads((SRC / 'dims.json').read_text()) if (SRC / 'dims.json').exists() else json.loads((ROOT / 'dims.json').read_text())
js = (SRC / 'app.js').read_text().replace('/*DIMS*/{}', json.dumps(dims, separators=(',', ':')))
admin_js = (SRC / 'admin.js').read_text()
admin_css = (SRC / 'admin.css').read_text()

CMS = {'url': 'https://obzyhvgvxlqzklvcbtlq.supabase.co',
       'key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ienlodmd2eGxxemtsdmNidGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDYyNjgsImV4cCI6MjA3ODQyMjI2OH0.QLtuqC9sp-i0auq2mKotXLTPUIlFT_cl-QxxPf7zvg8'}


def add_video_selectors(text):
    """Every rule that styles an <img> also styles a <video> in the same spot."""
    def fix(m):
        sels, block = m.group(1), m.group(2)
        parts = [s.strip() for s in sels.split(',')]
        extra = []
        for s in parts:
            if re.search(r'(^|[\s>+~])img(\.[\w-]+|:[\w-]+)*$', s):
                v = re.sub(r'img((\.[\w-]+|:[\w-]+)*)$', r'video\1', s)
                if v not in parts and v not in extra:
                    extra.append(v)
        return ','.join(parts + extra) + '{' + block + '}'
    return re.sub(r'([^{}@]+)\{([^{}]*)\}', fix, text)


css_out = add_video_selectors(css)
seed = json.dumps(content, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
cms = json.dumps(CMS)

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet">')
LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
        'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js']
PRE = "<script>if(/access_token=|type=recovery|error_description=/.test(location.hash))location.replace('/admin/'+location.hash);</script><script>try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-pre')}catch(e){}</script>"


def page(fonts, libs, with_cms=True):
    scripts = '\n'.join(f'<script src="{u}"></script>' for u in libs)
    cms_line = f'window.SITE_CMS={cms};' if with_cms else ''
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bharath Gaddam Portfolio</title>
<meta name="description" content="Bharath Kumar Gaddam, senior product and visual designer in Atlanta. Case studies, gallery and journey.">
<meta property="og:title" content="Bharath Gaddam · Product & Visual Designer">
<meta property="og:description" content="Case studies, gallery and journey.">
<meta property="og:image" content="img/orbit-podium.jpg">
{PRE}
{fonts}
<style>
{css_out}
</style>
</head>
<body>
{body}
{scripts}
<script>
{cms_line}
var SITE={seed};
{js}
</script>
</body>
</html>
'''


ADMIN = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Site editor · Bharath Gaddam</title>
{FONTS}
<style>
{admin_css}
</style>
</head>
<body>
<div id="app"><main class="auth"><p class="muted">Loading editor…</p></main></div>
<div id="toasts" aria-live="polite"></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script>
window.SITE_CMS={cms};
window.SITE_SEED={seed};
{admin_js}
</script>
</body>
</html>
'''

REDIRECTS = {
    '/about': '/#about', '/projects': '/#work', '/contact': '/#contact', '/work': '/#work',
    '/projects/amazon-autosphere-redesign': '/#autosphere', '/projects/walmart-plus-membership': '/#walmart',
}
NOT_FOUND = '''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found · Bharath Gaddam</title>
<script>var m={"/about":"about","/projects":"work","/contact":"contact","/work":"work","/projects/amazon-autosphere-redesign":"autosphere","/projects/walmart-plus-membership":"walmart"};var p=location.pathname.replace(/\\/+$/,"");if(m[p])location.replace("/#"+m[p]);else if(/^\\/admin/.test(p))location.replace("/admin/");</script>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#fff;color:#0a0a0a}a{color:inherit}</style></head>
<body><main style="text-align:center;padding:24px"><h1 style="font-size:64px;letter-spacing:-.05em;margin:0">Not found</h1><p>This page moved. <a href="/">Go to the homepage</a>.</p></main></body></html>'''

# ---- dist (deploy root) ----
DIST = ROOT / 'dist'
if DIST.exists():
    shutil.rmtree(DIST)
(DIST / 'admin').mkdir(parents=True)
shutil.copytree(ROOT / 'img', DIST / 'img')
(DIST / 'index.html').write_text(page(FONTS, LIBS))
(DIST / 'admin' / 'index.html').write_text(ADMIN)
(DIST / '404.html').write_text(NOT_FOUND)
(DIST / '_redirects').write_text(''.join(f'{a} {b} 301\n' for a, b in REDIRECTS.items()) + '/admin /admin/ 301\n')
(DIST / 'robots.txt').write_text('User-agent: *\nDisallow: /admin/\n')

# ---- single-file builds ----
(ROOT / 'index.html').write_text(page(FONTS, LIBS))
NM = 'file:///home/claude/preview/node_modules'
local_fonts = f'''<style>
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2) format('woff2');font-weight:400}}
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2) format('woff2');font-weight:500}}
@font-face{{font-family:'Instrument Sans';src:url({NM}/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2) format('woff2');font-weight:600}}
</style>'''
local_libs = [f'{NM}/gsap/dist/gsap.min.js', f'{NM}/gsap/dist/ScrollTrigger.min.js', f'{NM}/lenis/dist/lenis.min.js']
(ROOT / 'preview.html').write_text(page(local_fonts, local_libs, with_cms=False))
(ROOT / 'admin-preview.html').write_text(ADMIN.replace(FONTS, local_fonts).replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'file:///home/claude/site2/test/sb-stub.js'))
print('built', len((DIST / 'index.html').read_text()) // 1024, 'KB site,', len(ADMIN) // 1024, 'KB editor')
