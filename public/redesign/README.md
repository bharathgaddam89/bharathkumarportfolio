# Portfolio redesign (2026)

A standalone, fully animated version of the portfolio: white editorial layout, one typeface (Instrument Sans), monochrome palette, black gallery bands.

**Live once merged:** `https://www.bharathgaddam.com/redesign/` (Vite copies `public/` into the build as-is, so the existing React app and admin panel are untouched).

## What's inside
- Preloader, smooth scrolling (Lenis) and GSAP ScrollTrigger animations
- Showreel with wipe transitions, 3D stacked case cards, hover-preview project index
- 3D spinning gallery ring, velocity-reactive marquees
- Gallery page: draggable infinite canvas + filterable grid with lightbox
- 11 case studies with 3D screens slider, problems → solutions, principles, process, accessibility
- Journey timeline with rolling year counter (incl. M.S. Business Analytics and PhD at Harrisburg University)

## Editing
- Text and case studies: `src/data.js`
- Styles: `src/style.css` · Page skeleton: `src/body.html` · Interactions: `src/app.js`
- Images: `img/` (add the file, then add its size to `src/dims.json`)
- Rebuild `index.html` after edits: `python3 src/build.py`

Placeholder art is used for Social Brands USA, Blue Dart and Sri Sai Logistics covers until real visuals are added.
