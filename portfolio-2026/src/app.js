(function () {
  'use strict';
  var BUNDLED = SITE;
  var CMS = window.SITE_CMS || null;
  function loadRemote() {
    if (!CMS || !window.fetch || location.protocol === 'file:') return Promise.resolve(null);
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    try {
      return fetch(CMS.url + '/rest/v1/site_content?id=eq.main&select=data', { headers: { apikey: CMS.key, Authorization: 'Bearer ' + CMS.key }, signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (rows) { clearTimeout(t); return rows && rows[0] ? rows[0].data : null; })
        .catch(function () { clearTimeout(t); return null; });
    } catch (e) { clearTimeout(t); return Promise.resolve(null); }
  }
  loadRemote().then(function (d) {
    if (d && Array.isArray(d.CASES) && d.CASES.length) {
      Object.keys(BUNDLED).forEach(function (k) { if (!(k in d) || d[k] === null) d[k] = BUNDLED[k]; });
      SITE = d;
    }
    boot();
  });

  function boot() {
  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var G = window.gsap, ST = window.ScrollTrigger;
  var hasG = !!(G && ST);
  if (hasG) G.registerPlugin(ST);
  if (reduce) document.documentElement.classList.add('no-motion');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var mod = function (n, m) { return ((n % m) + m) % m; };

  var DIMS = /*DIMS*/{};
  var PH = {}, LIGHT = {};
  (SITE.PHONE || []).forEach(function (k) { PH[k] = 1; });
  (SITE.LIGHT || []).forEach(function (k) { LIGHT[k] = 1; });
  (SITE.LIB || []).forEach(function (m) {
    if (!m || !m.key) return;
    if (m.w && m.h) DIMS[m.key] = [m.w, m.h];
    PH[m.key] = m.frame === 'phone' ? 1 : 0;
    LIGHT[m.key] = m.frame === 'light' ? 1 : 0;
  });
  ['GALLERY', 'REEL', 'RING', 'MARQ_A', 'MARQ_B', 'PRELOAD', 'CHAPTERS'].forEach(function (k) { if (!Array.isArray(SITE[k])) SITE[k] = []; });
  SITE.GALLERY = SITE.GALLERY.filter(function (g) { return g && g[0]; });
  var P = SITE.PROFILE || {};
  var CASES = (SITE.CASES || []).filter(function (c) { return c && c.id && c.title; }), BY = {};
  CASES.forEach(function (c, i) { c.n = (i < 9 ? '0' : '') + (i + 1); BY[c.id] = c; });

  var VIDRE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  function src(k) { return !k ? '' : (/^(https?:)?\/\//.test(k) || k.indexOf('/') >= 0) ? k : 'img/' + k + '.jpg'; }
  function isVid(k) { return VIDRE.test(k || ''); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function img(k, alt, extra) {
    if (!k) return '<span class="m-empty" aria-hidden="true"></span>';
    var d = DIMS[k] || [1200, 800];
    extra = extra || '';
    if (isVid(k)) return '<video src="' + esc(src(k)) + '" width="' + d[0] + '" height="' + d[1] + '" muted loop playsinline' + (reduce ? '' : ' autoplay') + ' preload="metadata"' + (alt ? ' aria-label="' + esc(alt) + '"' : ' aria-hidden="true"') + extra + '></video>';
    return '<img src="' + esc(src(k)) + '" width="' + d[0] + '" height="' + d[1] + '" alt="' + esc(alt || '') + '"' + (extra.indexOf('loading=') >= 0 ? '' : ' loading="lazy"') + ' decoding="async"' + extra + '>';
  }
  function phone(k, alt) { return '<span class="phone">' + img(k, alt) + '</span>'; }
  function phones(list) { return '<div class="phones">' + list.map(function (k) { return phone(k, ''); }).join('') + '</div>'; }
  var onTick = function (fn) { if (hasG) G.ticker.add(fn); else { var l = function () { fn(); requestAnimationFrame(l); }; requestAnimationFrame(l); } };
  var offTick = function (fn) { if (hasG) G.ticker.remove(fn); };

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      if (hasG) { lenis.on('scroll', ST.update); G.ticker.add(function (t) { lenis.raf(t * 1000); }); G.ticker.lagSmoothing(0); }
      else { var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    } catch (e) { lenis = null; }
  }
  function scrollToY(y, immediate) {
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, duration: 1.5 });
    else window.scrollTo({ top: y, behavior: immediate || reduce ? 'auto' : 'smooth' });
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis && lenis.resize) lenis.resize();
    scrollToY(Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - 24));
  }

  /* ---------- clock, nav, menu ---------- */
  function tickClock() {
    var t = '';
    try { t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); } catch (e) { t = ''; }
    $$('[data-time]').forEach(function (n) { n.textContent = t; });
  }
  tickClock(); setInterval(tickClock, 15000);

  var nav = $('.nav'), lastY = 0;
  function navScroll(y) {
    if (document.body.classList.contains('menu-open')) return;
    if (y > 160 && y > lastY + 6) nav.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 160) nav.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', function (e) { navScroll(e.scroll); });
  else window.addEventListener('scroll', function () { navScroll(window.pageYOffset); }, { passive: true });

  var menu = $('#menu'), menuBtn = $('.menu-btn');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('menu-open', open);
    if (lenis && !document.body.classList.contains('is-canvas')) { if (open) lenis.stop(); else lenis.start(); }
    if (open) $('[data-menu-close]').focus(); else menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(true); });
  $('[data-menu-close]').addEventListener('click', function () { setMenu(false); });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------- text splitting ---------- */
  function splitWords(el) {
    if (el.__words) return el.__words;
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var i = document.createElement('span'); i.textContent = p;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.classList.contains('pill') || ch.classList.contains('count')) {
            var w2 = document.createElement('span'); w2.className = 'w';
            var i2 = document.createElement('span');
            ch.parentNode.replaceChild(w2, ch); i2.appendChild(ch); w2.appendChild(i2); out.push(i2);
          } else walk(ch);
        }
      });
    })(el);
    el.__words = out;
    return out;
  }
  function splitPlain(el) {
    if (el.__plain) return el.__plain;
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement('span'); s.textContent = p; frag.appendChild(s); out.push(s);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    })(el);
    el.__plain = out;
    return out;
  }
  function revealHeadings(root) {
    $$('[data-reveal]', root).forEach(function (el) {
      G.from(splitWords(el), { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }
  function revealUp(list, y) {
    list.forEach(function (el) {
      G.from(el, { y: y || 48, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }
  function scrubWords(list, start, end) {
    list.forEach(function (st) {
      G.fromTo(splitPlain(st), { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: st, start: start || 'top 82%', end: end || 'bottom 50%', scrub: true } });
    });
  }

  /* ---------- cursor ---------- */
  var cursor = $('.cursor'), cLabel = $('.cursor-label'), cText = $('.cursor-label span');
  if (fine && !reduce) {
    document.documentElement.classList.add('has-cursor');
    var mx = -100, my = -100, cx = -100, cy = -100, lx = -100, ly = -100;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    onTick(function () {
      cx += (mx - cx) * 0.4; cy += (my - cy) * 0.4; lx += (mx - lx) * 0.17; ly += (my - ly) * 0.17;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      cLabel.style.transform = 'translate3d(' + lx + 'px,' + ly + 'px,0)';
    });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      var ctl = e.target.closest ? e.target.closest('a,button') : null;
      if (t && ctl && t !== ctl && t.contains(ctl) && !ctl.hasAttribute('data-cursor')) t = null;
      if (t) { cText.textContent = t.getAttribute('data-cursor'); cLabel.classList.add('on'); cursor.classList.add('hide'); }
      else { cLabel.classList.remove('on'); cursor.classList.remove('hide'); }
      cLabel.classList.toggle('inv', !!(e.target.closest && e.target.closest('.dark, .gview, .card--dark, .lb')));
      var a = e.target.closest ? e.target.closest('a,button,summary,.irow') : null;
      cursor.classList.toggle('grow', !!a && !t);
    });
    document.addEventListener('pointerleave', function () { cursor.classList.add('hide'); });
  }

  /* ---------- magnetic, copy, top ---------- */
  function magnetize(root) {
    if (!fine || reduce || !hasG) return;
    $$('[data-magnetic]', root).forEach(function (el) {
      if (el.__mag) return; el.__mag = 1;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        G.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.6, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', function () { G.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,0.4)' }); });
    });
  }
  magnetize(document);
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!b) return;
    var txt = b.getAttribute('data-copy'), old = b.textContent;
    var done = function (msg) { b.textContent = msg; setTimeout(function () { b.textContent = old; }, 1800); };
    try { navigator.clipboard.writeText(txt).then(function () { done('Copied'); }, function () { done(txt); }); } catch (err) { done(txt); }
  });
  $$('[data-top]').forEach(function (b) { b.addEventListener('click', function () { scrollToY(0); }); });

  /* ---------- preloader ---------- */
  var preDone = new Promise(function (resolve) {
    var pre = $('.pre');
    var on = document.documentElement.classList.contains('js-pre');
    if (!on || !hasG || reduce) { document.documentElement.classList.remove('js-pre'); resolve(); return; }
    var frame = $('.pre__frame'), count = $('.pre__count'), line = $('.pre__line');
    frame.innerHTML = SITE.PRELOAD.map(function (k, i) { return img(k, '', ' loading="eager"' + (i === 0 ? ' class="on"' : '')); }).join('');
    var ims = $$('img,video', frame), cur = 0, o = { v: 0 };
    if (!ims.length) { frame.innerHTML = '<span class="m-empty"></span>'; ims = $$('span', frame); }
    if (lenis) lenis.stop();
    G.timeline({ onComplete: function () { document.documentElement.classList.remove('js-pre'); if (lenis) lenis.start(); resolve(); } })
      .to(o, { v: 100, duration: 2.1, ease: 'power2.inOut', onUpdate: function () {
        count.textContent = Math.round(o.v);
        line.style.transform = 'scaleX(' + (o.v / 100) + ')';
        var n = Math.min(ims.length - 1, Math.floor(o.v / (100 / ims.length)));
        if (n !== cur) { ims[cur].classList.remove('on'); ims[n].classList.add('on'); cur = n; }
      } })
      .to(frame, { scale: 1.25, duration: 0.7, ease: 'expo.inOut' }, '-=0.2')
      .to([count, '.pre__name'], { yPercent: 60, opacity: 0, duration: 0.5, ease: 'expo.in' }, '<')
      .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, '-=0.25');
  });

  /* ---------- hover preview (index rows) ---------- */
  var pv = $('.preview'), pvIn = $('.preview__in');
  (function () {
    if (!fine || reduce) return;
    var px = 0, py = 0, tx = 0, ty = 0, rot = 0;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    onTick(function () {
      var dx = tx - px; px += dx * 0.13; py += (ty - py) * 0.13; rot += (clamp(dx * 0.06, -14, 14) - rot) * 0.12;
      pv.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
      pvIn.style.rotate = rot.toFixed(2) + 'deg';
    });
  })();
  function bindPreview(root) {
    if (!fine || reduce) return;
    $$('[data-pv]', root).forEach(function (r) {
      r.addEventListener('pointerenter', function () {
        pvIn.innerHTML = img(r.getAttribute('data-pv'), '', ' loading="eager"' + (r.getAttribute('data-pv-fit') === 'contain' ? ' class="contain"' : ''));
        pv.classList.add('on');
      });
      r.addEventListener('pointerleave', function () { pv.classList.remove('on'); });
    });
  }

  /* ---------- HOME ---------- */
  var views = { home: $('#view-home'), 'case': $('#view-case'), gallery: $('#view-gallery') };
  var homeBuilt = false;

  function buildHome() {
    if (homeBuilt) return; homeBuilt = true;
    $('[data-case-count]').textContent = '(' + CASES.length + ')';
    $('[data-gal-count]').textContent = SITE.GALLERY.length + ' pieces';

    /* showreel */
    var reel = $('[data-reel]');
    reel.innerHTML = SITE.REEL.map(function (s, i) {
      var inner = s.phones ? '<div class="reel__media" style="background:' + s.bg + '">' + phones(s.phones) + '</div>' : '<div class="reel__media">' + img(s.img, s.cap) + '</div>';
      if (s.contain) inner = img(s.img, s.cap);
      return '<figure class="reel__slide' + (s.contain ? ' contain' : '') + (i === 0 ? ' is-on' : '') + '" data-cap="' + esc(s.cap) + '">' + inner + '</figure>';
    }).join('') +
      '<div class="reel__ui"><div><p class="label light">Showreel 2026</p><p class="reel__cap" aria-live="polite">' + esc(SITE.REEL[0].cap) + '</p><div class="reel__bars">' +
      SITE.REEL.map(function (s, i) { return '<button type="button" aria-label="Show slide ' + (i + 1) + ': ' + esc(s.cap) + '"><i></i></button>'; }).join('') +
      '</div></div><p class="reel__num"><span class="reel__n" style="font-size:1em;color:#fff;margin:0">01</span><span>/' + (SITE.REEL.length < 10 ? '0' : '') + SITE.REEL.length + '</span></p></div>';

    /* featured stack */
    var feat = CASES.filter(function (c) { return c.feature; });
    $('[data-stack]').innerHTML = feat.map(function (c, i) {
      var f = c.feature;
      var media = f.phones && f.phones.length ? '<div class="card__tilt">' + phones(f.phones) + '</div>' : img(f.img || c.cover, c.title);
      return '<a class="card card--' + f.bg + '" href="#' + c.id + '" data-cursor="View case" style="--i:' + i + '">' +
        '<div class="card__txt"><div class="card__top"><span class="label">' + c.n + ' — ' + esc(c.kind) + '</span><span class="label">' + c.year + '</span></div>' +
        '<div><h3>' + esc(c.title) + '</h3><p class="card__desc">' + esc((c.overview || [])[1] || c.sub || '') + '</p></div>' +
        '<div class="card__bottom"><div class="card__tags">' + (c.meta || []).filter(function (m) { return m && m[1]; }).slice(0, 3).map(function (m) { return '<span class="tag">' + esc(String(m[1]).split(',')[0]) + '</span>'; }).join('') + '</div>' +
        '<span class="card__cta">View case study <svg class="ico"><use href="#i-right"></use></svg></span></div></div>' +
        '<div class="card__media">' + media + '</div><span class="card__shade" aria-hidden="true"></span></a>';
    }).join('');

    /* index */
    $('[data-index]').innerHTML = CASES.map(function (c) {
      return '<a class="irow" href="#' + c.id + '" data-pv="' + c.cover + '" data-pv-fit="' + (c.coverFit || '') + '">' +
        '<span class="irow__thumb">' + img(c.cover, '') + '</span>' +
        '<span class="irow__n">' + c.n + '</span><span class="irow__t">' + esc(c.title) + '</span><span class="irow__c">' + esc(c.cat) + '</span><span class="irow__y">' + c.year + '</span>' +
        '<svg class="ico irow__a" aria-hidden="true"><use href="#i-ne"></use></svg></a>';
    }).join('');
    bindPreview(views.home);

    /* ring */
    $('[data-ring]').innerHTML = SITE.RING.map(function (k, i) {
      return '<div class="rcard"><div class="rcard__f' + (LIGHT[k] ? ' contain' : '') + '">' + img(k, '') + '</div><div class="rcard__b">' + (i < 9 ? '0' : '') + (i + 1) + '</div></div>';
    }).join('');

    /* marquees */
    var mk = function (k) {
      if (PH[k]) return '<a class="marq__item tile-phone" href="#gallery" data-cursor="Open">' + phone(k, '') + '<span class="marq__cap">' + esc(capOf(k)) + '</span></a>';
      return '<a class="marq__item' + (LIGHT[k] ? ' light' : '') + '" href="#gallery" data-cursor="Open">' + img(k, capOf(k)) + '<span class="marq__cap">' + esc(capOf(k)) + '</span></a>';
    };
    $('[data-marq="a"]').innerHTML = SITE.MARQ_A.map(mk).join('');
    $('[data-marq="b"]').innerHTML = SITE.MARQ_B.map(mk).join('');

    /* journey */
    var odo = $('[data-odo]');
    odo.innerHTML = '2017'.split('').map(function () {
      return '<span class="odo__d"><span class="odo__col">' + '0123456789'.split('').map(function (n) { return '<span>' + n + '</span>'; }).join('') + '</span></span>';
    }).join('');
    $('[data-chapters]').innerHTML = SITE.CHAPTERS.map(function (c, i) {
      return '<li class="ch' + (c.now ? ' ch--now' : '') + '" data-yr="' + c.yr + '" data-place="' + esc(c.place) + '">' +
        '<span class="ch__yr" aria-hidden="true">' + c.yr + '</span>' +
        '<div class="ch__top"><span class="label">' + (i < 9 ? '0' : '') + (i + 1) + ' / 0' + SITE.CHAPTERS.length + '</span><span class="label">' + esc(c.period) + '</span></div>' +
        '<h3>' + esc(c.title) + '</h3><p class="ch__org">' + esc(c.org) + '</p><p class="ch__txt">' + esc(c.txt) + '</p>' +
        '<div class="chips">' + (c.chips || []).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') + '</div>' +
        (c.link ? '<a class="btn btn--ghost" href="#' + c.link + '" style="align-self:flex-start;margin-top:6px">Read the case study <svg class="ico"><use href="#i-right"></use></svg></a>' : '') +
        '</li>';
    }).join('');
    setYear('2017');
  }
  function capOf(k) { for (var i = 0; i < SITE.GALLERY.length; i++) if (SITE.GALLERY[i][0] === k) return SITE.GALLERY[i][1]; return ''; }
  function setYear(y) {
    var cols = $$('.odo__col');
    String(y).split('').forEach(function (d, i) { if (cols[i]) cols[i].style.transform = 'translateY(' + (-parseInt(d, 10)) + 'em)'; });
  }

  /* profile-driven text, hero, about, footer */
  function renderProfile() {
    $$('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); if (P[k]) el.textContent = P[k]; });
    var hero = $('[data-hero]');
    if (P.heroLine1 || P.heroLine2) {
      var pill = function (list, wide) {
        list = (list || []).filter(Boolean);
        if (!list.length) return '';
        return '<span class="pill' + (wide ? ' pill--wide' : '') + '" data-rotate>' + list.map(function (k, i) { return img(k, '', ' loading="eager"' + (i === 0 ? ' class="on"' : '')); }).join('') + '</span>';
      };
      var line = function (t) { return esc(t || '').replace('{1}', pill(P.pills1)).replace('{2}', pill(P.pills2, true)); };
      hero.innerHTML = '<span class="line">' + line(P.heroLine1) + '</span>' + (P.heroLine2 ? '<span class="line">' + line(P.heroLine2) + '</span>' : '');
    }
    if (P.heroBio) $('[data-herobio]').innerHTML = esc(P.heroBio).replace('{name}', '<strong>' + esc(P.name || '') + '</strong>');
    if (P.portrait) $('[data-portrait]').innerHTML = img(P.portrait, 'Portrait of ' + (P.name || 'Bharath'));
    if (P.email) {
      $$('[data-email],[data-email-link]').forEach(function (a) { a.href = 'mailto:' + P.email; });
      $('[data-email]').textContent = P.email;
      $('[data-email-copy]').setAttribute('data-copy', P.email);
    }
    if (P.linkedin) $('[data-linkedin]').href = P.linkedin;
    if (Array.isArray(SITE.EDU)) $('[data-edu]').innerHTML = SITE.EDU.map(function (e) {
      return '<li' + (e.now ? ' class="now"' : '') + '><span class="label">' + esc(e.period || '') + '</span><strong>' + esc(e.title || '') + '</strong><span class="s">' + esc(e.school || '') + '</span></li>';
    }).join('');
    if (Array.isArray(SITE.STATS)) $('[data-stats]').innerHTML = SITE.STATS.map(function (st) {
      var v = String(st.value == null ? '' : st.value), num = !isNaN(parseFloat(v)) && /^[0-9.]+$/.test(v);
      var dec = (v.split('.')[1] || '').length;
      return '<div class="stat"><p class="stat__n"' + (num ? ' data-count="' + esc(v) + '" data-dec="' + dec + '" data-pre="' + esc(st.pre || '') + '" data-suf="' + esc(st.suf || '') + '"' : '') + '>' + esc((st.pre || '') + v + (st.suf || '')) + '</p><p class="stat__l">' + esc(st.label || '') + '</p></div>';
    }).join('');
    if (Array.isArray(SITE.CAPS)) $('[data-caps]').innerHTML = SITE.CAPS.map(function (c, i) {
      return '<div class="cap"><span class="label">' + (i < 9 ? '0' : '') + (i + 1) + '</span><h3>' + esc(c.title || '') + '</h3><ul>' + (c.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    if (Array.isArray(SITE.TOOLS)) $('[data-tools]').innerHTML = '<span class="label">Toolkit</span>' + SITE.TOOLS.map(function (t) { return '<span class="t">' + esc(t) + '</span>'; }).join('');
  }
  renderProfile();

  /* hero pills */
  $$('[data-rotate]').forEach(function (p, k) {
    var ims = $$('img,video', p), i = 0;
    if (reduce || ims.length < 2) return;
    setTimeout(function () { setInterval(function () { ims[i].classList.remove('on'); i = (i + 1) % ims.length; ims[i].classList.add('on'); }, 2600); }, 2600 + k * 1300);
  });

  /* showreel */
  function initReel() {
    var slides = $$('.reel__slide'), bars = $$('.reel__bars button'), cap = $('.reel__cap'), num = $('.reel__n');
    if (!slides.length) return function () {};
    var i = 0, timer = null;
    function show(n, dir) {
      if (n === i && slides[n].classList.contains('is-on')) { paint(n); return; }
      var prev = slides[i];
      slides.forEach(function (s) { s.classList.remove('is-prev'); });
      prev.classList.remove('is-on'); prev.classList.add('is-prev');
      var nx = slides[n]; nx.classList.add('is-on');
      if (hasG && !reduce) {
        G.fromTo(nx, { clipPath: dir < 0 ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut', onComplete: function () { prev.classList.remove('is-prev'); } });
        G.fromTo(prev, { scale: 1 }, { scale: 1.06, duration: 1.1, ease: 'expo.inOut', clearProps: 'scale' });
      } else prev.classList.remove('is-prev');
      i = n; paint(n);
    }
    function paint(n) {
      bars.forEach(function (b, k) { b.classList.toggle('done', k < n); b.classList.remove('on'); });
      void bars[n].offsetWidth;
      if (!reduce) bars[n].classList.add('on'); else bars[n].classList.add('done');
      cap.textContent = slides[n].getAttribute('data-cap');
      num.textContent = (n < 9 ? '0' : '') + (n + 1);
    }
    function start() { stop(); if (!reduce) timer = setInterval(function () { show((i + 1) % slides.length, 1); }, 4400); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    bars.forEach(function (b, k) { b.addEventListener('click', function () { show(k, k < i ? -1 : 1); start(); }); });
    paint(0); start();
    return stop;
  }

  /* marquee with velocity skew */
  var marq = { rows: [], on: false };
  function setupMarquee() {
    if (reduce) return;
    marq.rows = $$('.marq__row').map(function (row) {
      if (!row.__dup) {
        $$(':scope > *', row).forEach(function (n) { var c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1'); row.appendChild(c); });
        row.__dup = 1;
        row.addEventListener('pointerenter', function () { row.__slow = 1; });
        row.addEventListener('pointerleave', function () { row.__slow = 0; });
      }
      return { el: row, x: 0, dir: parseFloat(row.getAttribute('data-dir')) || -1, w: row.scrollWidth / 2, sk: 0 };
    });
    marq.on = true;
  }
  onTick(function () {
    if (!marq.on) return;
    var v = lenis ? lenis.velocity : 0;
    var boost = Math.min(Math.abs(v) * 0.5, 18), flip = lenis && lenis.direction === -1 ? -1 : 1;
    marq.rows.forEach(function (r) {
      if (!r.w) r.w = r.el.scrollWidth / 2;
      if (!r.w) return;
      r.x += (0.6 + boost) * (r.el.__slow ? 0.25 : 1) * r.dir * flip;
      if (r.x <= -r.w) r.x += r.w;
      if (r.x > 0) r.x -= r.w;
      r.sk += (clamp(-v * 0.25, -9, 9) - r.sk) * 0.1;
      r.el.style.transform = 'translate3d(' + r.x.toFixed(2) + 'px,0,0) skewX(' + r.sk.toFixed(2) + 'deg)';
    });
  });
  window.addEventListener('resize', function () { marq.rows.forEach(function (r) { r.w = r.el.scrollWidth / 2; }); });

  /* 3D ring */
  var ring = { on: false, target: 0, angle: 0, drift: 0, tilt: -10, ty: 0 };
  function layoutRing() {
    var el = $('[data-ring]'); if (!el) return;
    var cards = $$('.rcard', el), n = cards.length, vw = window.innerWidth;
    var w = vw < 700 ? Math.round(vw * 0.3) : clamp(Math.round(vw * 0.14), 150, 230);
    var gapR = Math.round(w * 0.14);
    var R = Math.max(w, Math.round(((w + gapR) * n) / (2 * Math.PI)));
    ring.R = R;
    el.style.setProperty('--w', w + 'px');
    cards.forEach(function (c, i) { c.style.transform = 'rotateY(' + (i * 360 / n) + 'deg) translateZ(' + R + 'px)'; });
  }
  function ringTick() {
    if (!ring.on) return;
    if (!reduce) ring.drift -= 0.05;
    ring.angle += (ring.target + ring.drift - ring.angle) * 0.08;
    var el = $('[data-ring]');
    el.style.transform = 'translate3d(0,' + ring.ty + 'px,' + (-ring.R * 0.55) + 'px) rotateX(' + ring.tilt.toFixed(2) + 'deg) rotateY(' + ring.angle.toFixed(2) + 'deg)';
  }
  onTick(ringTick);
  var ringPointer = function (e) { ring.tilt = -10 + ((e.clientY / window.innerHeight) - 0.5) * -8; };

  function initHome() {
    buildHome();
    layoutRing(); ring.on = true;
    window.addEventListener('resize', layoutRing);
    window.addEventListener('pointermove', ringPointer, { passive: true });
    var stopReel = initReel();
    if (!hasG || reduce) {
      setupMarquee(); magnetize(views.home);
      return function () { marq.on = false; ring.on = false; stopReel(); window.removeEventListener('resize', layoutRing); window.removeEventListener('pointermove', ringPointer); };
    }
    var mm = G.matchMedia();
    var ctx = G.context(function () {
      var hero = $('[data-hero]');
      var words = splitWords(hero);
      G.set(words, { yPercent: 118 });
      G.set($$('.hero__meta > *, [data-hero-foot] > *'), { y: 26, opacity: 0 });
      preDone.then(function () {
        G.to(words, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 });
        G.from($$('.pill', hero), { scale: 0, duration: 1.2, ease: 'expo.out', delay: 0.35 });
        G.to($$('.hero__meta > *, [data-hero-foot] > *'), { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.3 });
      });

      G.fromTo('.reel__frame', { rotateX: 24, scale: 0.84, borderRadius: 60 }, { rotateX: 0, scale: 1, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: '.reel', start: 'top 100%', end: 'top 18%', scrub: true } });
      revealHeadings(views.home);
      revealUp($$('.sec-note, .edu li, .cap, .tools, .index__head', views.home));
      G.from($$('.irow', views.home), { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '[data-index]', start: 'top 85%', once: true } });

      var cards = $$('.card', views.home);
      mm.add('(min-width: 901px)', function () {
        cards.forEach(function (c, i) {
          var next = cards[i + 1];
          if (!next) return;
          var tr = { trigger: next, start: 'top bottom', end: 'top 15%', scrub: true };
          G.to(c, { scale: 0.86, rotateX: 14, ease: 'none', scrollTrigger: tr });
          G.to($('.card__shade', c), { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 15%', scrub: true } });
        });
      });
      cards.forEach(function (c) {
        var t = $('.card__tilt', c) || $('.card__media > img', c);
        if (!t || !fine) return;
        c.addEventListener('pointermove', function (e) {
          var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          t.style.transform = 'rotateY(' + (x * 14).toFixed(2) + 'deg) rotateX(' + (-y * 12).toFixed(2) + 'deg) scale(1.03)';
        });
        c.addEventListener('pointerleave', function () { t.style.transform = ''; });
      });

      /* ring: pinned spin */
      ST.create({ trigger: '[data-ring-sec]', start: 'top top', end: '+=160%', pin: true, scrub: true, anticipatePin: 1,
        onUpdate: function (s) { ring.target = -s.progress * 320; ring.ty = 0; } });
      G.from('.ring-stage', { opacity: 0, scale: 0.82, y: 90, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '[data-ring-sec]', start: 'top 70%', once: true } });
      G.fromTo('.ring-title', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '[data-ring-sec]', start: 'top bottom', end: 'top top', scrub: true } });

      scrubWords($$('[data-scrub]', views.home));
      $$('[data-count]', views.home).forEach(function (el) {
        var end = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
        var pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '', o = { v: 0 };
        ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () {
          G.to(o, { v: end, duration: 1.8, ease: 'expo.out', onUpdate: function () { el.textContent = pre + o.v.toFixed(dec) + suf; } });
        } });
      });
      G.fromTo('.about__photo img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* journey */
      var chs = $$('.ch', views.home), place = $('[data-place]');
      mm.add('(min-width: 901px)', function () {
        chs.forEach(function (ch) {
          ST.create({ trigger: ch, start: 'top 62%', end: 'bottom 62%', onToggle: function (s) {
            ch.classList.toggle('is-on', s.isActive);
            if (s.isActive) { setYear(ch.getAttribute('data-yr')); place.textContent = ch.getAttribute('data-place'); }
          } });
        });
        G.fromTo('[data-jr-bar]', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-chapters]', start: 'top 62%', end: 'bottom 62%', scrub: true } });
      });
      mm.add('(max-width: 900px)', function () { revealUp(chs, 30); });
    }, views.home);
    setupMarquee();
    magnetize(views.home);
    return function () { ctx.revert(); mm.revert(); marq.on = false; ring.on = false; stopReel(); window.removeEventListener('resize', layoutRing); window.removeEventListener('pointermove', ringPointer); };
  }

  /* ---------- CASE STUDY ---------- */
  function renderCase(id) {
    var c = BY[id], i = CASES.indexOf(c), nx = CASES[(i + 1) % CASES.length];
    var h = '<article class="cs wrap">';
    h += '<a class="cs__back" href="#work"><svg class="ico"><use href="#i-left"></use></svg>All work</a>';
    h += '<div class="cs__top"><span class="label">Case study ' + c.n + ' / ' + CASES.length + ' · ' + esc(c.kind) + '</span><span class="label">' + esc(c.cat) + ' · ' + c.year + '</span></div>';
    h += '<h1 class="cs__title" data-cs-title>' + esc(c.title) + '</h1><p class="cs__sub">' + esc(c.sub) + '</p>';
    if ((c.meta || []).length) h += '<dl class="cs__meta">' + c.meta.map(function (m) { return '<div><dt class="label">' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + '</dl>';
    var hr = c.hero || {};
    if (!hr.img && !(hr.imgs && hr.imgs.length)) {}
    else if (hr.kind === 'white') h += '<figure class="cs__hero cs__hero--white" data-hero3d>' + img(hr.img, hr.alt) + '</figure>';
    else if (hr.kind === 'cover') h += '<figure class="cs__hero cs__hero--cover" data-hero3d>' + img(hr.img, hr.alt, ' data-par') + '</figure>';
    else h += '<figure class="cs__hero cs__hero--phones" data-hero3d style="background:' + hr.bg + '">' + phones(hr.imgs) + '</figure>';
    if (c.note && (hr.img || (hr.imgs && hr.imgs.length))) h += '<p class="cs__note">' + esc(c.note) + '</p>';

    if ((c.glance || []).length) h += '<ul class="glance">' + c.glance.map(function (g) { return '<li data-up><span class="label">' + esc(g[0]) + '</span><p>' + esc(g[1]) + '</p></li>'; }).join('') + '</ul>';
    var ov = (c.overview || []).filter(Boolean);
    if (ov.length) h += '<section class="cs__sec"><p class="label">Overview</p><div><p class="cs__lead" data-up>' + esc(ov[0]) + '</p>' + ov.slice(1).map(function (p) { return '<p class="cs__more" data-up>' + esc(p) + '</p>'; }).join('') + '</div></section>';
    if (c.impact && c.impact.length) h += '<section class="cs__sec"><p class="label">Impact</p><ul class="impact">' + c.impact.map(function (m) { return '<li data-up><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></li>'; }).join('') + '</ul></section>';
    if (c.wide && c.wide.img) h += '<figure class="story__media story__media--wide" data-up style="margin-top:clamp(48px,6vw,96px)">' + img(c.wide.img, c.wide.cap) + '</figure><p class="cs__note">' + esc(c.wide.cap) + '</p>';
    if (c.challenges && c.challenges.length) {
      h += '<section class="cs__sec"><p class="label">Problems → solutions</p><div class="chal">' + c.challenges.map(function (q, k) {
        return '<div class="chal__c" data-up><span class="label">0' + (k + 1) + '</span><p class="chal__q">' + esc(q[0]) + '</p><p class="chal__a"><b>What I changed</b>' + esc(q[1]) + '</p></div>';
      }).join('') + '</div></section>';
    }
    if ((c.stories || []).length) h += '<section class="stories" aria-label="Key moments">' + c.stories.map(function (s, k) {
      var body = '<div class="story__body" data-up><span class="story__n">' + (k < 9 ? '0' : '') + (k + 1) + ' — Key moment</span><h3>' + esc(s[0]) + '</h3><p>' + esc(s[1]) + '</p></div>';
      if (!s[2]) return '<div class="story story--text">' + body + '</div>';
      var k2 = s[2], cls = 'story__media' + (PH[k2] ? ' story__media--phone' : LIGHT[k2] ? ' story__media--wide' : ' story__media--cover');
      var media = PH[k2] ? phone(k2, s[0]) : img(k2, s[0], LIGHT[k2] ? '' : ' data-par');
      return '<div class="story"><div class="' + cls + '" data-up data-tilt>' + media + '</div>' + body + '</div>';
    }).join('') + '</section>';
    if (c.screens && (c.screens.list || []).filter(function (x) { return x && x[0]; }).length) {
      var sc = { type: c.screens.type, list: c.screens.list.filter(function (x) { return x && x[0]; }) };
      h += '<section class="cf" data-cf aria-label="Screens"><div class="cf__head"><div><p class="label" style="margin-bottom:14px">Screens</p><h2 class="t-xl">' + sc.list.length + ' screens</h2></div>' +
        '<div class="cf__nav"><button type="button" data-cf-prev aria-label="Previous screen"><svg class="ico"><use href="#i-left"></use></svg></button><span class="cf__count" data-cf-count>1 / ' + sc.list.length + '</span><button type="button" data-cf-next aria-label="Next screen"><svg class="ico"><use href="#i-right"></use></svg></button></div></div>' +
        '<div class="cf__stage" tabindex="0" aria-label="Screens slider. Use arrow keys to move." data-cursor="Drag">' + sc.list.map(function (s) {
          return '<div class="cf__card ' + (sc.type === 'phone' ? 'phone' : 'desk') + '" data-cap="' + esc(s[1] || '') + '">' + img(s[0], s[1], ' loading="eager"') + '</div>';
        }).join('') + '</div><p class="cf__cap" data-cf-cap aria-live="polite"></p></section>';
    }
    if (c.principles && c.principles.length) h += '<section class="prin dark" data-up><p class="label light">Design principles</p><h2 class="t-xl" data-reveal>How it should feel</h2><div class="prin__grid">' + c.principles.map(function (p, k) {
      return '<div class="prin__i"><span>0' + (k + 1) + '</span><h4>' + esc(p[0]) + '</h4><p>' + esc(p[1]) + '</p></div>';
    }).join('') + '</div></section>';
    if (c.process && c.process.length) h += '<section class="cs__sec"><p class="label">Process</p><ol class="psteps">' + c.process.map(function (p, k) {
      return '<li data-up><span class="ix">0' + (k + 1) + '</span><h4>' + esc(p[0]) + '</h4><p>' + esc(p[1]) + '</p></li>';
    }).join('') + '</ol></section>';
    if (c.a11y && c.a11y.length) h += '<section class="cs__sec"><p class="label">Accessibility</p><ul class="a11y">' + c.a11y.map(function (a) { return '<li data-up>' + esc(a) + '</li>'; }).join('') + '</ul></section>';
    if (c.outcome) h += '<section class="cs__sec"><p class="label">Outcome</p><p class="outcome" data-scrub>' + esc(c.outcome) + '</p></section>';
    h += '</article>';
    var nm = nx.hero && nx.hero.kind === 'phones' && (nx.hero.imgs || []).length ? '<div class="next__media" style="background:' + nx.hero.bg + ';opacity:1">' + phones(nx.hero.imgs) + '</div>' : '<div class="next__media">' + img(nx.cover, '') + '</div>';
    h += '<div class="wrap"><a class="next" href="#' + nx.id + '" data-cursor="Next">' + nm +
      '<div class="next__txt"><span class="label light">Next case study · ' + nx.n + ' / ' + CASES.length + '</span><div><p class="next__t">' + esc(nx.title) + '</p><p style="margin-top:14px;font-size:clamp(17px,1.4vw,21px);opacity:.85">' + esc(nx.sub) + '</p></div></div></a></div>';
    views['case'].innerHTML = h;
  }

  function initCoverflow(root) {
    var box = $('[data-cf]', root); if (!box) return function () {};
    var stage = $('.cf__stage', box), cards = $$('.cf__card', stage), cap = $('[data-cf-cap]', box), cnt = $('[data-cf-count]', box);
    var i = 0, n = cards.length;
    function render() {
      var w = cards[0].offsetWidth, sp = cards[0].classList.contains('desk') ? w * 0.42 : w * 0.72;
      cards.forEach(function (c, k) {
        var o = k - i, a = Math.abs(o);
        c.style.transform = 'translate(-50%,-50%) translate3d(' + (o * sp) + 'px,0,' + (-a * 160) + 'px) rotateY(' + clamp(-o * 32, -64, 64) + 'deg)';
        c.style.opacity = a > 3 ? 0 : 1 - a * 0.16;
        c.style.zIndex = 100 - a;
        c.style.filter = a ? 'brightness(' + (1 - a * 0.07) + ')' : '';
      });
      cap.textContent = cards[i].getAttribute('data-cap') || '';
      cnt.textContent = (i + 1) + ' / ' + n;
    }
    function go(k) { i = clamp(k, 0, n - 1); render(); }
    $('[data-cf-prev]', box).addEventListener('click', function () { go(i - 1); });
    $('[data-cf-next]', box).addEventListener('click', function () { go(i + 1); });
    stage.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); } });
    var x0 = null, moved = 0;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; moved = 0; });
    window.addEventListener('pointerup', up);
    function up(e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1) * Math.max(1, Math.round(Math.abs(dx) / 160))); return; }
      var hit = e.target.closest ? e.target.closest('.cf__card') : null;
      if (hit) go(cards.indexOf(hit));
    }
    window.addEventListener('resize', render);
    render();
    return function () { window.removeEventListener('pointerup', up); window.removeEventListener('resize', render); };
  }

  function initCase() {
    var root = views['case'];
    magnetize(root);
    var cf = initCoverflow(root);
    $$('[data-tilt]', root).forEach(function (m) {
      if (!fine || reduce) return;
      var t = $('.phone', m) || $('img', m);
      m.addEventListener('pointermove', function (e) {
        var r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        t.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
        t.style.transform = 'rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg) scale(1.03)';
      });
      m.addEventListener('pointerleave', function () { t.style.transform = ''; });
    });
    if (!hasG || reduce) return cf;
    var ctx = G.context(function () {
      G.from(splitWords($('[data-cs-title]', root)), { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 0.05 });
      G.from($$('.cs__top, .cs__sub, .cs__meta > div, .cs__back', root), { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.35 });
      G.from($('[data-hero3d]', root), { rotateX: 18, y: 120, opacity: 0, transformPerspective: 1400, transformOrigin: '50% 0', duration: 1.5, ease: 'expo.out', delay: 0.45 });
      G.from($$('[data-hero3d] .phone', root), { y: 140, rotateZ: function (k) { return (k - 1.5) * 6; }, duration: 1.6, ease: 'expo.out', stagger: 0.08, delay: 0.6 });
      revealHeadings(root);
      revealUp($$('[data-up]', root));
      $$('[data-par]', root).forEach(function (im) {
        G.fromTo(im, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
      if ($('[data-cf]', root)) G.from($('.cf__stage', root), { y: 120, opacity: 0, rotateX: 16, transformPerspective: 1400, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '[data-cf]', start: 'top 75%', once: true } });
      scrubWords($$('[data-scrub]', root), 'top 85%', 'bottom 55%');
    }, root);
    return function () { ctx.revert(); cf(); };
  }

  /* ---------- GALLERY ---------- */
  var galMode = 'canvas', galFilter = 'All';
  var CATS = ['All', 'Mobile', 'Desktop', 'Flows', 'Web & motion', 'Brand & packaging', 'Photography'];
  function renderGallery() {
    var G2 = SITE.GALLERY, n = G2.length;
    var modes = '<div class="gmodes" role="group" aria-label="Gallery view"><button type="button" data-mode="canvas" aria-pressed="' + (galMode === 'canvas') + '">Canvas</button><button type="button" data-mode="grid" aria-pressed="' + (galMode === 'grid') + '">Grid</button></div>';
    var h = '';
    if (galMode === 'canvas') {
      h += '<div class="gcanvas" tabindex="0" data-lenis-prevent data-cursor="Drag" aria-label="Gallery canvas. Drag, scroll or use the arrow keys to explore. Switch to Grid for a list."><div class="gworld"></div>' +
        '<div class="gover"><div><p class="label light" style="margin-bottom:10px">(02) Gallery</p><h1 class="gtitle" data-cs-title>Gallery<span class="count">(' + n + ')</span></h1></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:14px"><p class="ghint"><svg aria-hidden="true"><use href="#i-drag"></use></svg>Drag, scroll or use arrow keys</p>' + modes + '</div></div></div>';
    } else {
      var count = function (c) { return c === 'All' ? n : G2.filter(function (g) { return g[2] === c; }).length; };
      h += '<section class="ggrid wrap" aria-labelledby="gal-title"><div class="ggrid__head"><div><p class="label light" style="margin-bottom:14px">(02) Gallery</p><h1 class="gtitle" id="gal-title" data-cs-title>Gallery<span class="count">(' + n + ')</span></h1></div>' + modes + '</div>' +
        '<div class="gal__filters" role="group" aria-label="Filter images">' + CATS.map(function (c) {
          return '<button type="button" class="fchip" data-filter="' + c + '" aria-pressed="' + (c === galFilter) + '">' + c + '<span>' + count(c) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="masonry">' + G2.map(function (g, k) {
          var cls = 'mitem' + (PH[g[0]] ? ' ph' : '') + (LIGHT[g[0]] ? ' light' : '');
          var media = PH[g[0]] ? phone(g[0], g[1]) : img(g[0], g[1]);
          return '<button type="button" class="' + cls + '" data-i="' + k + '" data-cat="' + g[2] + '" data-cursor="Open"><span class="mitem__media">' + media + '</span><span class="mitem__cap"><span>' + esc(g[1]) + '</span><span class="label light">' + g[2] + '</span></span></button>';
        }).join('') + '</div></section>';
    }
    views.gallery.innerHTML = h;
    document.body.classList.toggle('is-canvas', galMode === 'canvas');
    if (lenis) { if (galMode === 'canvas') lenis.stop(); else lenis.start(); }
    if (galMode === 'grid') applyFilter();
  }
  function applyFilter() {
    $$('.mitem', views.gallery).forEach(function (m) { m.classList.toggle('is-out', galFilter !== 'All' && m.getAttribute('data-cat') !== galFilter); });
    $$('.fchip', views.gallery).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === galFilter)); });
    if (hasG) ST.refresh();
    if (lenis && lenis.resize) lenis.resize();
  }

  function initCanvas() {
    var cv = $('.gcanvas', views.gallery); if (!cv) return function () {};
    var world = $('.gworld', cv), items = SITE.GALLERY;
    var tiles = [], WW = 0, WH = 0, tw = 0, gap = 0;
    var cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, tiltX = 0, tiltY = 0, sc = 1, intro = { v: reduce || !hasG ? 1 : 0 };
    function ratio(k) { var d = DIMS[k] || [4, 3]; var r = d[1] / d[0]; return PH[k] ? 1.75 : clamp(r, 0.42, 1.3); }
    function layout() {
      var vw = cv.clientWidth, vh = cv.clientHeight;
      tw = vw < 700 ? 150 : clamp(Math.round(vw * 0.15), 200, 280); gap = vw < 700 ? 12 : 22;
      var cols = Math.ceil((vw + 2 * (tw + gap)) / (tw + gap));
      var list = items.slice();
      while (list.length < cols * 4) list = list.concat(items);
      var colH = [], colItems = [];
      for (var c = 0; c < cols; c++) { colH[c] = 0; colItems[c] = []; }
      list.forEach(function (it, k) {
        var c2 = colH.indexOf(Math.min.apply(null, colH));
        var h = Math.round(tw * ratio(it[0]));
        colItems[c2].push({ it: it, h: h, idx: k % items.length });
        colH[c2] += h + gap;
      });
      WH = Math.max.apply(null, colH);
      var minNeed = vh + 2 * (tw * 2 + gap);
      if (WH < minNeed) WH = minNeed;
      WW = cols * (tw + gap);
      world.innerHTML = '';
      tiles = [];
      colItems.forEach(function (arr, c3) {
        var used = arr.reduce(function (s, a) { return s + a.h + gap; }, 0), extra = (WH - used) / Math.max(1, arr.length), y = 0;
        arr.forEach(function (a) {
          var k = a.it[0], b = document.createElement('div');
          b.className = 'gtile' + (PH[k] ? ' ph' : '') + (LIGHT[k] ? ' light' : '');
          b.style.width = tw + 'px'; b.style.height = a.h + 'px';
          b.setAttribute('data-i', a.idx); b.setAttribute('data-cursor', 'Open'); b.setAttribute('aria-hidden', 'true');
          b.innerHTML = img(k, '', ' loading="eager"');
          world.appendChild(b);
          tiles.push({ el: b, x0: c3 * (tw + gap), y0: y, h: a.h, sp: 1 + ((c3 % 3) - 1) * 0.12 });
          y += a.h + gap + extra;
        });
      });
      cur.x = tgt.x = -(WW - vw) / 2; cur.y = tgt.y = -WH * 0.15;
    }
    var dragging = false, sx = 0, sy = 0, lx2 = 0, ly2 = 0, moved = 0, downTile = null, lastV = { x: 0, y: 0 };
    function down(e) {
      if (e.target.closest && e.target.closest('.gover button, .gover a')) return;
      dragging = true; moved = 0; sx = lx2 = e.clientX; sy = ly2 = e.clientY; lastV = { x: 0, y: 0 };
      downTile = e.target.closest ? e.target.closest('.gtile') : null;
      cv.classList.add('drag'); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    }
    function move(e) {
      if (!dragging) return;
      var dx = e.clientX - lx2, dy = e.clientY - ly2;
      lx2 = e.clientX; ly2 = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      tgt.x += dx * 1.25; tgt.y += dy * 1.25; lastV = { x: dx, y: dy };
    }
    function up() {
      if (!dragging) return;
      dragging = false; cv.classList.remove('drag');
      if (moved < 6 && downTile) { var vis = items; openLB(vis, +downTile.getAttribute('data-i'), cv); return; }
      tgt.x += lastV.x * 14; tgt.y += lastV.y * 14;
    }
    function wheel(e) { e.preventDefault(); tgt.x -= e.deltaX * 0.9; tgt.y -= e.deltaY * 0.9; }
    function key(e) {
      var s = 160;
      if (e.key === 'ArrowLeft') tgt.x += s; else if (e.key === 'ArrowRight') tgt.x -= s;
      else if (e.key === 'ArrowUp') tgt.y += s; else if (e.key === 'ArrowDown') tgt.y -= s; else return;
      e.preventDefault();
    }
    function tick() {
      if (!dragging && !reduce && Math.abs(tgt.x - cur.x) < 0.6 && Math.abs(tgt.y - cur.y) < 0.6) { tgt.x -= 0.22; tgt.y -= 0.14; }
      var px = cur.x, py = cur.y;
      cur.x += (tgt.x - cur.x) * 0.085; cur.y += (tgt.y - cur.y) * 0.085;
      vel.x = cur.x - px; vel.y = cur.y - py;
      var speed = Math.min(Math.hypot(vel.x, vel.y), 60);
      tiltX += (clamp(-vel.y * 0.12, -7, 7) - tiltX) * 0.1; tiltY += (clamp(vel.x * 0.12, -7, 7) - tiltY) * 0.1;
      sc += ((dragging ? 0.94 : 1) - speed * 0.0015 - sc) * 0.1;
      if (!reduce) {
        world.style.opacity = intro.v.toFixed(3);
        world.style.transform = 'rotateX(' + (tiltX + (1 - intro.v) * 24).toFixed(2) + 'deg) rotateY(' + tiltY.toFixed(2) + 'deg) scale(' + (sc * (0.62 + 0.38 * intro.v)).toFixed(3) + ')';
      }
      for (var k = 0; k < tiles.length; k++) {
        var t = tiles[k];
        var x = mod(t.x0 + cur.x + tw + gap, WW) - tw - gap;
        var y = mod(t.y0 + cur.y * t.sp + t.h + gap, WH) - t.h - gap;
        t.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      }
    }
    layout();
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', wheel, { passive: false });
    cv.addEventListener('keydown', key);
    var rs = function () { layout(); };
    window.addEventListener('resize', rs);
    onTick(tick); if (!hasG) tick();
    if (hasG && !reduce) G.to(intro, { v: 1, duration: 1.6, ease: 'expo.out' });
    return function () { offTick(tick); window.removeEventListener('resize', rs); };
  }

  function initGallery() {
    var stopCanvas = galMode === 'canvas' ? initCanvas() : function () {};
    var onClick = function (e) {
      var md = e.target.closest('[data-mode]');
      if (md && md.getAttribute('data-mode') !== galMode) {
        galMode = md.getAttribute('data-mode');
        cleanup && cleanup(); renderGallery(); cleanup = initGallery(); scrollToY(0, true);
        var b = $('[data-mode="' + galMode + '"]', views.gallery); if (b) b.focus();
        return;
      }
      var f = e.target.closest('.fchip');
      if (f) { galFilter = f.getAttribute('data-filter'); applyFilter(); return; }
      var m = e.target.closest('.mitem');
      if (m) {
        var visible = $$('.mitem', views.gallery).filter(function (x) { return !x.classList.contains('is-out'); });
        var list = visible.map(function (x) { return SITE.GALLERY[+x.getAttribute('data-i')]; });
        openLB(list, visible.indexOf(m), m);
      }
    };
    views.gallery.addEventListener('click', onClick);
    var ctx = null;
    if (hasG && !reduce) {
      ctx = G.context(function () {
        var t = $('[data-cs-title]', views.gallery);
        if (t) G.from(splitWords(t), { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.08, delay: 0.2 });
        G.from($$('.fchip, .gmodes, .ghint', views.gallery), { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.03, delay: 0.4 });
        $$('.mitem', views.gallery).forEach(function (m, k) {
          G.from(m, { y: 80, opacity: 0, rotateX: 12, transformPerspective: 900, duration: 1.2, ease: 'expo.out', clearProps: 'transform', delay: (k % 3) * 0.08, scrollTrigger: { trigger: m, start: 'top 96%', once: true } });
        });
      }, views.gallery);
    }
    return function () { views.gallery.removeEventListener('click', onClick); stopCanvas(); if (ctx) ctx.revert(); };
  }

  /* ---------- lightbox ---------- */
  var lb = $('.lb'), lbImg = $('.lb__stage img'), lbCap = $('.lb__cap'), lbCount = $('.lb__count');
  var lbVid = $('.lb__vid');
  var lbList = [], lbI = 0, lbOpener = null;
  function lbCur() { return lbVid.hidden ? lbImg : lbVid; }
  function lbShow() {
    var g = lbList[lbI], v = isVid(g[0]);
    lbImg.hidden = v; lbVid.hidden = !v;
    if (v) {
      lbImg.removeAttribute('src');
      lbVid.src = src(g[0]); lbVid.setAttribute('aria-label', g[1] || '');
      lbVid.classList.toggle('phone-shot', !!PH[g[0]]);
      try { var pr = lbVid.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    } else {
      try { lbVid.pause(); } catch (e) {}
      lbVid.removeAttribute('src');
      lbImg.src = src(g[0]); lbImg.alt = g[1] || ''; lbImg.className = PH[g[0]] ? 'phone-shot' : '';
    }
    lbCap.textContent = g[1] || ''; lbCount.textContent = (lbI + 1) + ' / ' + lbList.length;
  }
  function openLB(list, i, opener) {
    lbList = list; lbI = Math.max(0, i); lbOpener = opener; lbShow();
    lb.hidden = false; if (lenis) lenis.stop();
    if (hasG && !reduce) G.fromTo(lbCur(), { scale: 0.92, opacity: 0, rotateX: 10, transformPerspective: 1000 }, { scale: 1, opacity: 1, rotateX: 0, duration: 0.7, ease: 'expo.out' });
    $('.lb__close').focus();
  }
  function closeLB() { try { lbVid.pause(); } catch (e) {} lb.hidden = true; if (lenis && !document.body.classList.contains('is-canvas')) lenis.start(); if (lbOpener) lbOpener.focus(); }
  function stepLB(d) {
    lbI = (lbI + d + lbList.length) % lbList.length; lbShow();
    if (hasG && !reduce) G.fromTo(lbCur(), { x: 60 * d, opacity: 0, rotateY: -10 * d, transformPerspective: 1000 }, { x: 0, opacity: 1, rotateY: 0, duration: 0.6, ease: 'expo.out' });
  }
  $('.lb__close').addEventListener('click', closeLB);
  $('.lb__prev').addEventListener('click', function () { stepLB(-1); });
  $('.lb__next').addEventListener('click', function () { stepLB(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb__stage')) closeLB(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.hidden) {
      if (e.key === 'Escape') closeLB();
      else if (e.key === 'ArrowRight') stepLB(1);
      else if (e.key === 'ArrowLeft') stepLB(-1);
      else if (e.key === 'Tab') {
        var f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    } else if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
  });
  var tsx = 0;
  lb.addEventListener('touchstart', function (e) { tsx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - tsx; if (Math.abs(dx) > 50) stepLB(dx < 0 ? 1 : -1); });

  /* ---------- wordmark fit ---------- */
  var wm = $('.wordmark');
  function fitWordmark() {
    if (!wm) return;
    wm.style.fontSize = '100px';
    wm.style.fontSize = (100 * (document.documentElement.clientWidth * 0.97) / (wm.scrollWidth || 1)).toFixed(2) + 'px';
  }
  fitWordmark();
  window.addEventListener('resize', fitWordmark);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitWordmark(); layoutRing(); if (hasG) ST.refresh(); });
  window.addEventListener('load', function () { if (hasG) ST.refresh(); });

  /* ---------- router ---------- */
  var current = null, cleanup = null;
  var ANCHORS = { work: 1, about: 1, journey: 1, capabilities: 1, contact: 1 };
  function parse() {
    var h = (location.hash || '').slice(1);
    if (BY[h]) return { view: 'case', id: h };
    if (h === 'gallery') return { view: 'gallery' };
    if (ANCHORS[h]) return { view: 'home', anchor: h };
    return { view: 'home' };
  }
  function labelFor(r) { return r.view === 'case' ? BY[r.id].title : r.view === 'gallery' ? 'Gallery' : 'Bharath Gaddam'; }
  function setCurrent(r) {
    $$('[data-nav]').forEach(function (a) {
      var k = a.getAttribute('data-nav');
      var on = (r.view === 'gallery' && k === 'gallery') || (r.view === 'case' && k === 'work');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = r.view === 'home' ? 'Bharath Gaddam · Product & Visual Designer' : labelFor(r) + ' · Bharath Gaddam';
  }
  function anchorEl(name) { return $('[data-section="' + name + '"]'); }

  function route(initial) {
    var r = parse();
    if (r.anchor === 'contact' && current && current.view !== 'gallery') { scrollToEl(anchorEl('contact')); return; }
    var same = current && current.view === r.view && (r.view !== 'case' || current.id === r.id);
    if (same) { if (r.anchor) scrollToEl(anchorEl(r.anchor)); else if (r.view === 'home') scrollToY(0); return; }
    var go = function () {
      if (cleanup) { cleanup(); cleanup = null; }
      document.body.classList.remove('is-canvas');
      if (lenis) lenis.start();
      Object.keys(views).forEach(function (k) { views[k].hidden = k !== r.view; });
      if (r.view === 'case') renderCase(r.id);
      if (r.view === 'gallery') renderGallery();
      scrollToY(0, true); window.scrollTo(0, 0);
      setCurrent(r);
      cleanup = r.view === 'home' ? initHome() : r.view === 'case' ? initCase() : initGallery();
      if (hasG) ST.refresh();
      if (lenis && lenis.resize) lenis.resize();
      nav.classList.remove('is-hidden');
      if (r.anchor) setTimeout(function () { scrollToEl(anchorEl(r.anchor)); }, initial ? 2900 : 150);
      if (!initial) { var h1 = $('h1', views[r.view]); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } }
    };
    current = r;
    if (initial || !hasG || reduce) { go(); return; }
    var cur = $('.curtain');
    $('.curtain__label').textContent = labelFor(r);
    G.timeline()
      .set(cur, { yPercent: 100, visibility: 'visible' })
      .to(cur, { yPercent: 0, duration: 0.65, ease: 'expo.inOut' })
      .fromTo('.curtain__label', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out' }, '-=0.25')
      .add(go)
      .to(cur, { yPercent: -100, duration: 0.8, ease: 'expo.inOut', delay: 0.15 })
      .set(cur, { visibility: 'hidden' });
  }
  window.addEventListener('hashchange', function () { route(false); });
  $('[data-skip]').addEventListener('click', function (e) {
    e.preventDefault();
    var h = $('h1', views[current ? current.view : 'home']);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  });
  if (hasG && !reduce) revealHeadings($('.foot'));

  route(true);
}
})();
