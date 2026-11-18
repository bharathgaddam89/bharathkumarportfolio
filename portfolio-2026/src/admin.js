(function () {
  'use strict';

  /* ===================== setup ===================== */
  var CFG = window.SITE_CMS;
  var SEED = window.SITE_SEED;
  var ADMIN_EMAIL = 'bharathgaddam89@gmail.com';
  var RESERVED = { home: 1, work: 1, gallery: 1, about: 1, journey: 1, capabilities: 1, contact: 1, admin: 1 };
  var sb = null;
  try { if (window.supabase && window.supabase.createClient) sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } }); } catch (e) { sb = null; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app');
  var S = { view: 'loading', user: null, doc: null, base: '', tab: 'cases', sel: 0, open: {}, libQ: '', libType: 'all', pendingDeletes: [], saving: false, updatedAt: null, updatedBy: null, history: null, authMode: 'signin', authMsg: '', authErr: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function src(k) { return !k ? '' : (/^(https?:)?\/\//.test(k) || k.indexOf('/') >= 0) ? k : '/img/' + k + '.jpg'; }
  var VIDRE = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
  function isVid(k) { return VIDRE.test(k || ''); }
  function lib() { if (!Array.isArray(S.doc.LIB)) S.doc.LIB = []; return S.doc.LIB; }
  function libItem(k) { var L = lib(); for (var i = 0; i < L.length; i++) if (L[i].key === k) return L[i]; return null; }
  function nameOf(k) { var m = libItem(k); return m ? (m.name || 'Untitled') : (k ? k.split('/').pop() : ''); }
  function thumb(k) {
    if (!k) return '<span class="t-empty">No media</span>';
    return isVid(k) ? '<video src="' + esc(src(k)) + '" muted loop playsinline preload="metadata" onmouseenter="this.play()" onmouseleave="this.pause()"></video><span class="t-badge">Video</span>' : '<img src="' + esc(src(k)) + '" alt="" loading="lazy">' + (/\.gif(\?|$)/i.test(k) ? '<span class="t-badge">GIF</span>' : '');
  }
  function enc(p) { return esc(JSON.stringify(p)); }
  function getAt(o, p) { for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; }
  function setAt(o, p, v) { for (var i = 0; i < p.length - 1; i++) { if (o[p[i]] == null) o[p[i]] = typeof p[i + 1] === 'number' ? [] : {}; o = o[p[i]]; } o[p[p.length - 1]] = v; }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  function dirty() { return S.doc && JSON.stringify(S.doc) !== S.base; }
  function fmtDate(d) { try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return d; } }

  /* ===================== toasts & dialogs ===================== */
  function toast(msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, kind === 'err' ? 7000 : 3500);
    setTimeout(function () { t.remove(); }, kind === 'err' ? 7600 : 4100);
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      var m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = '<div class="modal__box modal__box--sm" role="dialog" aria-modal="true" aria-labelledby="cb-t"><h2 id="cb-t">' + esc(title) + '</h2><p class="muted">' + esc(text) + '</p><div class="row end"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn ' + (danger ? 'btn--danger' : 'btn--ink') + '" data-ok>' + esc(okLabel || 'OK') + '</button></div></div>';
      document.body.appendChild(m);
      var done = function (v) { m.remove(); resolve(v); };
      $('[data-x]', m).onclick = function () { done(false); };
      $('[data-ok]', m).onclick = function () { done(true); };
      m.addEventListener('keydown', function (e) { if (e.key === 'Escape') done(false); });
      $('[data-ok]', m).focus();
    });
  }

  /* ===================== auth ===================== */
  function renderAuth() {
    var mode = S.authMode;
    var title = mode === 'signup' ? 'Create your editor account' : mode === 'forgot' ? 'Reset your password' : mode === 'recovery' ? 'Choose a new password' : 'Sign in to edit your site';
    var h = '<main class="auth"><div class="auth__box"><div class="brand"><span class="brand__mark">BG</span>Site editor</div><h1>' + title + '</h1>';
    if (mode === 'signup') h += '<p class="muted">Use <strong>' + ADMIN_EMAIL + '</strong>. Only this address can make changes.</p>';
    if (S.authMsg) h += '<p class="note" role="status">' + esc(S.authMsg) + '</p>';
    if (S.authErr) h += '<p class="err" role="alert">' + esc(S.authErr) + '</p>';
    h += '<form id="authf" novalidate>';
    if (mode !== 'recovery') h += '<label class="f"><span>Email</span><input id="a-email" type="email" autocomplete="email" required value="' + esc(S.lastEmail || (mode === 'signup' ? ADMIN_EMAIL : '')) + '"></label>';
    if (mode !== 'forgot') h += '<label class="f"><span>' + (mode === 'recovery' ? 'New password' : 'Password') + '</span><input id="a-pass" type="password" autocomplete="' + (mode === 'signin' ? 'current-password' : 'new-password') + '" required minlength="8"></label>';
    if (mode === 'signup' || mode === 'recovery') h += '<label class="f"><span>Repeat password</span><input id="a-pass2" type="password" autocomplete="new-password" required minlength="8"></label>';
    h += '<button class="btn btn--ink btn--block" type="submit">' + (mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Email me a reset link' : mode === 'recovery' ? 'Save new password' : 'Sign in') + '</button></form>';
    h += '<div class="auth__links">';
    if (mode === 'signin') h += '<button type="button" class="link" data-mode="signup">First time? Create your account</button><button type="button" class="link" data-mode="forgot">Forgot password?</button>';
    else if (mode !== 'recovery') h += '<button type="button" class="link" data-mode="signin">Back to sign in</button>';
    h += '</div><a class="link small" href="/">← Back to the website</a></div></main>';
    app.innerHTML = h;
    $$('[data-mode]').forEach(function (b) { b.onclick = function () { S.authMode = b.getAttribute('data-mode'); S.authMsg = S.authErr = ''; renderAuth(); }; });
    $('#authf').onsubmit = onAuthSubmit;
    var first = $('#authf input'); if (first) first.focus();
  }
  function onAuthSubmit(e) {
    e.preventDefault();
    var email = ($('#a-email') || {}).value, pass = ($('#a-pass') || {}).value, pass2 = ($('#a-pass2') || {}).value;
    if (email) S.lastEmail = email.trim();
    S.authErr = S.authMsg = '';
    var btn = $('#authf button[type=submit]'); btn.disabled = true; btn.textContent = 'Please wait…';
    var fail = function (err) { S.authErr = (err && err.message) || String(err); renderAuth(); };
    if ((S.authMode === 'signup' || S.authMode === 'recovery') && pass !== pass2) return fail('The two passwords don’t match.');
    if (S.authMode !== 'forgot' && (!pass || pass.length < 8)) return fail('Use at least 8 characters for the password.');
    if (S.authMode !== 'recovery' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return fail('Enter a valid email address.');
    var redirect = location.origin + '/admin/';
    if (S.authMode === 'signin') {
      sb.auth.signInWithPassword({ email: email.trim(), password: pass }).then(function (r) {
        if (r.error) return fail(/confirm/i.test(r.error.message) ? 'Please confirm your email first: open the link we sent to ' + email + '.' : r.error.message === 'Invalid login credentials' ? 'That email and password don’t match. Try again or reset your password.' : r.error.message);
        afterLogin(r.data.session);
      }, fail);
    } else if (S.authMode === 'signup') {
      sb.auth.signUp({ email: email.trim(), password: pass, options: { emailRedirectTo: redirect } }).then(function (r) {
        if (r.error) return fail(r.error.message);
        if (r.data.session) return afterLogin(r.data.session);
        S.authMode = 'signin'; S.authMsg = 'Almost done. We sent a confirmation link to ' + email + '. Click it, then come back here and sign in.'; renderAuth();
      }, fail);
    } else if (S.authMode === 'forgot') {
      sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect }).then(function (r) {
        if (r.error) return fail(r.error.message);
        S.authMode = 'signin'; S.authMsg = 'If an account exists for ' + email + ', a reset link is on its way. Open it on this device.'; renderAuth();
      }, fail);
    } else if (S.authMode === 'recovery') {
      sb.auth.updateUser({ password: pass }).then(function (r) {
        if (r.error) return fail(r.error.message);
        toast('Password updated.'); sb.auth.getSession().then(function (x) { afterLogin(x.data.session); });
      }, fail);
    }
  }
  function afterLogin(session) {
    if (!session) { S.view = 'auth'; renderAuth(); return; }
    S.user = session.user;
    app.innerHTML = '<main class="auth"><p class="muted">Loading your site…</p></main>';
    sb.rpc('is_site_admin').then(function (r) {
      if (r.error || !r.data) { S.view = 'denied'; renderDenied(); return; }
      loadContent();
    }, function () { S.view = 'denied'; renderDenied(); });
  }
  function renderDenied() {
    app.innerHTML = '<main class="auth"><div class="auth__box"><div class="brand"><span class="brand__mark">BG</span>Site editor</div><h1>This account can’t edit the site</h1><p class="muted">You’re signed in as <strong>' + esc(S.user && S.user.email) + '</strong>. Only <strong>' + ADMIN_EMAIL + '</strong> can make changes.</p><button class="btn btn--ink btn--block" type="button" id="so">Sign out</button></div></main>';
    $('#so').onclick = function () { sb.auth.signOut().then(function () { location.reload(); }); };
  }

  /* ===================== content load / save ===================== */
  function loadContent() {
    sb.from('site_content').select('data,updated_at,updated_by').eq('id', 'main').maybeSingle().then(function (r) {
      var d = r.data && r.data.data;
      if (d && Array.isArray(d.CASES)) { Object.keys(SEED).forEach(function (k) { if (!(k in d) || d[k] === null) d[k] = clone(SEED[k]); }); S.doc = d; S.updatedAt = r.data.updated_at; S.updatedBy = r.data.updated_by; }
      else { S.doc = clone(SEED); S.updatedAt = null; }
      S.base = d ? JSON.stringify(S.doc) : '';
      S.view = 'editor'; render();
      if (!d) toast('Your content isn’t published yet. Click Save & publish once to make the editor the source of your site.');
    }, function (e) { app.innerHTML = '<main class="auth"><p class="err">Couldn’t load your content: ' + esc(e.message || e) + '</p></main>'; });
  }
  function validate() {
    var errs = [], ids = {};
    (S.doc.CASES || []).forEach(function (c, i) {
      var n = '“' + (c.title || 'Case study ' + (i + 1)) + '”';
      if (!c.title) errs.push('Case study ' + (i + 1) + ' needs a title.');
      if (!c.id || !/^[a-z0-9][a-z0-9-]*$/.test(c.id)) errs.push(n + ': URL name can only use lowercase letters, numbers and dashes.');
      else if (RESERVED[c.id]) errs.push(n + ': “' + c.id + '” is reserved. Pick another URL name.');
      else if (ids[c.id]) errs.push(n + ': URL name “' + c.id + '” is used twice.');
      ids[c.id] = 1;
    });
    return errs;
  }
  function save() {
    if (S.saving) return;
    var errs = validate();
    if (errs.length) { S.tab = 'cases'; render(); toast(errs[0], 'err'); return; }
    S.saving = true; paintBar();
    var now = new Date().toISOString(), email = S.user.email, data = clone(S.doc);
    data.v = (data.v || 1);
    sb.from('site_content').upsert({ id: 'main', data: data, updated_at: now, updated_by: email }).then(function (r) {
      if (r.error) throw r.error;
      return sb.from('site_content_history').insert({ content_id: 'main', data: data, saved_by: email });
    }).then(function () {
      S.base = JSON.stringify(S.doc); S.updatedAt = now; S.updatedBy = email; S.history = null;
      var del = S.pendingDeletes.splice(0);
      if (del.length) sb.storage.from('site').remove(del).then(function () {}, function () {});
      S.saving = false; paintBar(); toast('Published. Your site is updated.');
    }).catch(function (e) {
      S.saving = false; paintBar();
      toast('Couldn’t save: ' + ((e && e.message) || e) + (/row-level|permission|policy/i.test(String(e && e.message)) ? ' (this account isn’t allowed to edit).' : ''), 'err');
    });
  }

  /* ===================== uploads ===================== */
  var ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,video/mp4,video/webm,video/quicktime';
  function readDims(file, kind) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      if (kind === 'video') {
        var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
        v.onloadedmetadata = function () { resolve([v.videoWidth || 1280, v.videoHeight || 720]); URL.revokeObjectURL(url); };
        v.onerror = function () { resolve([1280, 720]); URL.revokeObjectURL(url); };
        v.src = url;
      } else {
        var im = new Image();
        im.onload = function () { resolve([im.naturalWidth || 1200, im.naturalHeight || 800]); URL.revokeObjectURL(url); };
        im.onerror = function () { resolve([1200, 800]); URL.revokeObjectURL(url); };
        im.src = url;
      }
    });
  }
  function shrink(file, w, h) {
    var MAX = 2400;
    if (Math.max(w, h) <= MAX && file.size <= 1500000) return Promise.resolve({ blob: file, w: w, h: h, ext: null, type: file.type });
    var k = Math.min(1, MAX / Math.max(w, h)), W = Math.round(w * k), H = Math.round(h * k);
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = W; c.height = H;
        c.getContext('2d').drawImage(im, 0, 0, W, H);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (b && b.type === 'image/webp') resolve({ blob: b, w: W, h: H, ext: 'webp', type: 'image/webp' });
          else c.toBlob(function (b2) { resolve({ blob: b2 || file, w: W, h: H, ext: b2 ? 'jpg' : null, type: b2 ? 'image/jpeg' : file.type }); }, 'image/jpeg', 0.86);
        }, 'image/webp', 0.86);
      };
      im.onerror = function () { URL.revokeObjectURL(url); resolve({ blob: file, w: w, h: h, ext: null, type: file.type }); };
      im.src = url;
    });
  }
  function uploadFiles(files, progress) {
    files = Array.prototype.slice.call(files || []);
    var keys = [], i = 0;
    function next() {
      if (i >= files.length) return Promise.resolve(keys);
      var f = files[i++], type = f.type || '', kind = /^video\//.test(type) ? 'video' : /^image\//.test(type) ? 'image' : null;
      if (!kind || ACCEPT.indexOf(type) < 0) { toast(f.name + ': unsupported file type. Use JPG, PNG, WebP, GIF, SVG, MP4, WebM or MOV.', 'err'); return next(); }
      if (progress) progress(i, files.length, f.name);
      var base = f.name.replace(/\.[^.]+$/, ''), ext = (f.name.split('.').pop() || '').toLowerCase();
      return readDims(f, kind).then(function (d) {
        if (kind === 'image' && !/gif|svg/.test(type)) return shrink(f, d[0], d[1]);
        return { blob: f, w: d[0], h: d[1], ext: null, type: type };
      }).then(function (r) {
        if (r.blob.size > 50 * 1024 * 1024) { toast(f.name + ' is larger than 50 MB. Compress it first.', 'err'); return next(); }
        if (/gif/.test(type) && r.blob.size > 8 * 1024 * 1024) toast(f.name + ' is a heavy GIF (' + Math.round(r.blob.size / 1048576) + ' MB). An MP4 of the same clip loads far faster.', 'warn');
        var path = 'media/' + Date.now() + '-' + (slug(base) || 'file') + '.' + (r.ext || ext || 'bin');
        return sb.storage.from('site').upload(path, r.blob, { contentType: r.type, cacheControl: '31536000', upsert: false }).then(function (res) {
          if (res.error) throw res.error;
          var url = sb.storage.from('site').getPublicUrl(path).data.publicUrl;
          var ratio = r.h / r.w;
          lib().unshift({ key: url, name: base, w: r.w, h: r.h, frame: ratio > 1.9 && ratio < 2.4 && kind === 'image' ? 'phone' : 'none', size: r.blob.size, path: path });
          keys.push(url);
          return next();
        });
      }).catch(function (e) { toast('Upload failed for ' + f.name + ': ' + ((e && e.message) || e), 'err'); return next(); });
    }
    return next().then(function (k) { paintBar(); return k; });
  }

  /* ===================== media picker ===================== */
  function openPicker(multi, cb) {
    var sel = [], q = '';
    var m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = '<div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="pk-t"><div class="row between"><h2 id="pk-t">' + (multi ? 'Choose images or videos' : 'Choose an image or video') + '</h2><button type="button" class="icon" data-x aria-label="Close">✕</button></div>' +
      '<div class="row gap"><input class="search" type="search" placeholder="Search your library" aria-label="Search your library"><label class="btn btn--ink upl">Upload new<input type="file" multiple accept="' + ACCEPT + '" hidden></label></div>' +
      '<div class="drop" data-drop>Drop files here to upload · JPG, PNG, WebP, GIF, SVG, MP4, WebM, MOV</div>' +
      '<div class="pgrid" data-grid></div><div class="row between foot"><span class="muted" data-cnt></span><div class="row gap"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn btn--ink" data-use disabled>' + (multi ? 'Add selected' : 'Use this') + '</button></div></div></div>';
    document.body.appendChild(m);
    function paint() {
      var L = lib().filter(function (x) { return !q || (x.name || '').toLowerCase().indexOf(q) >= 0; });
      $('[data-grid]', m).innerHTML = L.map(function (x) {
        var on = sel.indexOf(x.key) >= 0;
        return '<button type="button" class="pitem' + (on ? ' on' : '') + '" data-k="' + esc(x.key) + '" aria-pressed="' + on + '"><span class="pthumb">' + thumb(x.key) + '</span><span class="pname">' + esc(x.name) + '</span>' + (on && multi ? '<span class="pnum">' + (sel.indexOf(x.key) + 1) + '</span>' : '') + '</button>';
      }).join('') || '<p class="muted">Nothing found.</p>';
      $('[data-cnt]', m).textContent = sel.length ? sel.length + ' selected' : lib().length + ' items';
      $('[data-use]', m).disabled = !sel.length;
    }
    function close() { m.remove(); }
    m.addEventListener('click', function (e) {
      if (e.target.closest('[data-x]')) return close();
      var it = e.target.closest('.pitem');
      if (it) {
        var k = it.getAttribute('data-k'), ix = sel.indexOf(k);
        if (multi) { if (ix >= 0) sel.splice(ix, 1); else sel.push(k); paint(); }
        else { close(); cb([k]); }
      }
      if (e.target.closest('[data-use]')) { close(); cb(sel.slice()); }
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    $('.search', m).addEventListener('input', function (e) { q = e.target.value.toLowerCase(); paint(); });
    var doUpload = function (files) {
      var d = $('[data-drop]', m); d.textContent = 'Uploading…';
      uploadFiles(files, function (a, b, n) { d.textContent = 'Uploading ' + a + ' of ' + b + ': ' + n; }).then(function (keys) {
        d.textContent = 'Drop files here to upload · JPG, PNG, WebP, GIF, SVG, MP4, WebM, MOV';
        if (!keys.length) return;
        if (!multi) { close(); cb([keys[0]]); return; }
        keys.forEach(function (k) { if (sel.indexOf(k) < 0) sel.push(k); }); paint();
      });
    };
    $('.upl input', m).addEventListener('change', function (e) { doUpload(e.target.files); e.target.value = ''; });
    bindDrop($('[data-drop]', m), doUpload);
    paint(); $('.search', m).focus();
  }
  function bindDrop(el, fn) {
    ['dragenter', 'dragover'].forEach(function (t) { el.addEventListener(t, function (e) { e.preventDefault(); el.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { el.addEventListener(t, function (e) { e.preventDefault(); el.classList.remove('over'); }); });
    el.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) fn(e.dataTransfer.files); });
  }

  /* ===================== form builder ===================== */
  function caseOptions() { return [['', 'None']].concat((S.doc.CASES || []).map(function (c) { return [c.id, c.title]; })); }

  function F(def, val, path) {
    if (def.sec) return '<h3 class="sec">' + esc(def.sec) + '</h3>' + (def.hint ? '<p class="hint">' + esc(def.hint) + '</p>' : '');
    var p = path.concat(def.k === undefined ? [] : [def.k]);
    var v = def.k === undefined ? val : (val ? val[def.k] : undefined);
    if (def.when && !def.when(val || {})) return '';
    var lab = def.label ? '<span class="lab">' + esc(def.label) + '</span>' : '';
    var hint = def.hint ? '<span class="hint">' + esc(def.hint) + '</span>' : '';
    var id = 'f' + Math.random().toString(36).slice(2, 9);
    switch (def.t) {
      case 'text':
        return '<label class="f" for="' + id + '">' + lab + '<input id="' + id + '" type="text" data-p="' + enc(p) + '" value="' + esc(v) + '" placeholder="' + esc(def.ph || '') + '">' + hint + '</label>';
      case 'textarea':
        return '<label class="f" for="' + id + '">' + lab + '<textarea id="' + id + '" rows="' + (def.rows || 3) + '" data-p="' + enc(p) + '" placeholder="' + esc(def.ph || '') + '">' + esc(v) + '</textarea>' + hint + '</label>';
      case 'select':
        var opts = typeof def.options === 'function' ? def.options() : def.options;
        return '<label class="f" for="' + id + '">' + lab + '<select id="' + id + '" data-p="' + enc(p) + '" data-rerender="1">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + ((v || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' + hint + '</label>';
      case 'bool':
        return '<label class="f f--check"><input type="checkbox" data-p="' + enc(p) + '"' + (v ? ' checked' : '') + '> <span>' + esc(def.label) + '</span></label>';
      case 'color':
        return '<label class="f" for="' + id + '">' + lab + '<span class="row gap"><input type="color" aria-label="' + esc(def.label) + ' picker" data-p="' + enc(p) + '" value="' + esc(/^#[0-9a-f]{6}$/i.test(v || '') ? v : '#eeeeee') + '"><input id="' + id + '" type="text" data-p="' + enc(p) + '" value="' + esc(v || '') + '" placeholder="#EEEEEE" style="max-width:140px"></span></label>';
      case 'media':
        return '<div class="f">' + lab + '<div class="media"><span class="mthumb">' + thumb(v) + '</span><span class="mmeta"><span class="mname">' + esc(v ? nameOf(v) : 'Nothing selected') + '</span><span class="row gap"><button type="button" class="btn btn--sm" data-act="pick" data-p="' + enc(p) + '">' + (v ? 'Change' : 'Choose') + '</button>' + (v ? '<button type="button" class="btn btn--sm btn--ghost" data-act="clear" data-p="' + enc(p) + '">Remove</button>' : '') + '</span></span></div>' + hint + '</div>';
      case 'medialist':
        var L = Array.isArray(v) ? v : [];
        return '<div class="f">' + lab + '<div class="mlist">' + L.map(function (k, i) {
          var ip = p.concat([i]);
          return '<div class="mli"><span class="mthumb">' + thumb(k) + '</span><span class="mli__bar"><button type="button" class="icon" data-act="up" data-p="' + enc(ip) + '" aria-label="Move left">←</button><button type="button" class="icon" data-act="down" data-p="' + enc(ip) + '" aria-label="Move right">→</button><button type="button" class="icon" data-act="del" data-p="' + enc(ip) + '" aria-label="Remove">✕</button></span></div>';
        }).join('') + '<button type="button" class="mli mli--add" data-act="addmedia" data-p="' + enc(p) + '"><span>+ Add</span></button></div>' + hint + '</div>';
      case 'strings':
        var A = Array.isArray(v) ? v : [];
        return '<div class="f">' + lab + '<div class="list">' + A.map(function (x, i) {
          var ip = p.concat([i]);
          var input = def.multiline ? '<textarea rows="' + (def.rows || 2) + '" data-p="' + enc(ip) + '" aria-label="' + esc(def.label) + ' ' + (i + 1) + '">' + esc(x) + '</textarea>' : '<input type="text" data-p="' + enc(ip) + '" value="' + esc(x) + '" aria-label="' + esc(def.label) + ' ' + (i + 1) + '">';
          return '<div class="li">' + input + rowBtns(ip) + '</div>';
        }).join('') + '<button type="button" class="btn btn--sm btn--ghost" data-act="add" data-p="' + enc(p) + '" data-tpl="' + esc('""') + '">+ Add</button></div>' + hint + '</div>';
      case 'tuples':
        var T = Array.isArray(v) ? v : [];
        return '<div class="f">' + lab + hint + '<div class="list">' + T.map(function (row, i) {
          var ip = p.concat([i]);
          return '<div class="tuple"><span class="tuple__n">' + (i + 1) + '</span><div class="tuple__cols">' + def.cols.map(function (c, j) {
            return F({ k: j, t: c.t, ph: c.ph, label: c.label, rows: c.rows }, row, ip);
          }).join('') + '</div>' + rowBtns(ip) + '</div>';
        }).join('') + '<div class="row gap"><button type="button" class="btn btn--sm btn--ghost" data-act="add" data-p="' + enc(p) + '" data-tpl="' + esc(JSON.stringify(def.tpl)) + '">+ Add ' + esc(def.item || 'row') + '</button>' +
          (def.bulk !== undefined ? '<button type="button" class="btn btn--sm btn--ghost" data-act="bulk" data-p="' + enc(p) + '" data-tpl="' + esc(JSON.stringify(def.tpl)) + '" data-col="' + def.bulk + '">+ Add several from library</button>' : '') + '</div></div></div>';
      case 'objects':
        var O = Array.isArray(v) ? v : [];
        return '<div class="f">' + lab + hint + '<div class="list">' + O.map(function (o, i) {
          var ip = p.concat([i]), key = JSON.stringify(ip), open = S.open[key];
          var title = (def.title ? def.title(o, i) : (o && o[def.titleKey])) || ('Item ' + (i + 1));
          return '<div class="obj' + (open ? ' open' : '') + '"><div class="obj__head"><button type="button" class="obj__toggle" data-act="toggle" data-key="' + esc(key) + '" aria-expanded="' + !!open + '"><span class="chev" aria-hidden="true">▸</span>' + esc(title) + '</button>' + rowBtns(ip, true) + '</div>' +
            (open ? '<div class="obj__body">' + def.fields.map(function (fd) { return F(fd, o, ip); }).join('') + '</div>' : '') + '</div>';
        }).join('') + '<button type="button" class="btn btn--sm btn--ghost" data-act="add" data-p="' + enc(p) + '" data-tpl="' + esc(JSON.stringify(def.tpl)) + '" data-openlast="1">+ Add ' + esc(def.item || 'item') + '</button></div></div>';
      case 'group':
        if (v == null || (def.optional && v === false)) {
          return '<div class="f group group--off">' + lab + hint + '<button type="button" class="btn btn--sm btn--ghost" data-act="on" data-p="' + enc(p) + '" data-tpl="' + esc(JSON.stringify(def.tpl || {})) + '">+ Add this section</button></div>';
        }
        return '<div class="f group">' + '<div class="row between">' + lab + (def.optional ? '<button type="button" class="btn btn--sm btn--ghost" data-act="off" data-p="' + enc(p) + '">Remove section</button>' : '') + '</div>' + hint + '<div class="group__body">' + def.fields.map(function (fd) { return F(fd, v, p); }).join('') + '</div></div>';
    }
    return '';
  }
  function rowBtns(ip, dup) {
    return '<span class="rowbtns"><button type="button" class="icon" data-act="up" data-p="' + enc(ip) + '" aria-label="Move up">↑</button><button type="button" class="icon" data-act="down" data-p="' + enc(ip) + '" aria-label="Move down">↓</button>' + (dup ? '<button type="button" class="icon" data-act="dup" data-p="' + enc(ip) + '" aria-label="Duplicate">⧉</button>' : '') + '<button type="button" class="icon icon--danger" data-act="del" data-p="' + enc(ip) + '" aria-label="Remove">✕</button></span>';
  }

  /* ===================== schemas ===================== */
  var CASE_FIELDS = [
    { sec: 'Basics' },
    { k: 'title', t: 'text', label: 'Title' },
    { k: 'id', t: 'text', label: 'URL name', hint: 'Lowercase letters, numbers and dashes. This case opens at bharathgaddam.com/#url-name' },
    { k: 'sub', t: 'text', label: 'One-line summary' },
    { k: 'cat', t: 'text', label: 'Discipline', ph: 'Mobile app · Fintech' },
    { k: 'year', t: 'text', label: 'Year' },
    { k: 'kind', t: 'text', label: 'Type label', ph: 'Concept, In-house, Personal…' },
    { k: 'cover', t: 'media', label: 'Cover', hint: 'Shown in the project list, the hover preview and the “next project” banner.' },
    { k: 'coverFit', t: 'select', label: 'Cover fit', options: [['', 'Fill the frame (may crop)'], ['contain', 'Fit inside (no crop)']] },
    { k: 'feature', t: 'group', optional: true, label: 'Big featured card on the home page', hint: 'Turn on to show this project as one of the large stacked cards.', tpl: { bg: 'light', img: '', phones: [] }, fields: [
      { k: 'bg', t: 'select', label: 'Card colour', options: [['light', 'Light'], ['dark', 'Dark']] },
      { k: 'img', t: 'media', label: 'Image or video' },
      { k: 'phones', t: 'medialist', label: 'Or up to 3 phone screens (used instead of the image)' }] },
    { sec: 'Top of the page' },
    { k: 'meta', t: 'tuples', label: 'Facts row', hint: 'e.g. Role, Timeline, Platform, Type', item: 'fact', cols: [{ t: 'text', ph: 'Label' }, { t: 'text', ph: 'Value' }], tpl: ['', ''] },
    { k: 'hero', t: 'group', label: 'Hero visual', fields: [
      { k: 'kind', t: 'select', label: 'Style', options: [['cover', 'Full-bleed image or video'], ['white', 'Wide image on a light background'], ['phones', 'Row of phone screens']] },
      { k: 'img', t: 'media', label: 'Image or video', when: function (o) { return o.kind !== 'phones'; } },
      { k: 'alt', t: 'text', label: 'Short description (for screen readers)', when: function (o) { return o.kind !== 'phones'; } },
      { k: 'imgs', t: 'medialist', label: 'Phone screens', when: function (o) { return o.kind === 'phones'; } },
      { k: 'bg', t: 'color', label: 'Background colour', when: function (o) { return o.kind === 'phones'; } }] },
    { k: 'note', t: 'text', label: 'Small note under the hero', ph: 'e.g. Personal concept. Brand marks belong to their owners.' },
    { sec: 'The story' },
    { k: 'glance', t: 'tuples', label: 'At a glance', hint: 'Three short boxes: challenge, your role, outcome.', item: 'box', cols: [{ t: 'text', ph: 'Label' }, { t: 'textarea', ph: 'Text', rows: 2 }], tpl: ['', ''] },
    { k: 'overview', t: 'strings', label: 'Overview paragraphs', hint: 'The first paragraph is shown large.', multiline: true, rows: 3 },
    { k: 'impact', t: 'tuples', label: 'Impact numbers (optional)', item: 'number', cols: [{ t: 'text', ph: '85%' }, { t: 'text', ph: 'what it measures' }], tpl: ['', ''] },
    { k: 'wide', t: 'group', optional: true, label: 'Wide image (optional)', hint: 'Great for a full user flow.', tpl: { img: '', cap: '' }, fields: [{ k: 'img', t: 'media', label: 'Image or video' }, { k: 'cap', t: 'text', label: 'Caption' }] },
    { k: 'challenges', t: 'tuples', label: 'Problems → solutions', item: 'problem', cols: [{ t: 'textarea', ph: 'The problem', rows: 2 }, { t: 'textarea', ph: 'What you changed', rows: 3 }], tpl: ['', ''] },
    { k: 'stories', t: 'tuples', label: 'Key moments', hint: 'Heading, text and an optional image, GIF or video. They alternate left and right.', item: 'moment', cols: [{ t: 'text', ph: 'Heading' }, { t: 'textarea', ph: 'Text', rows: 3 }, { t: 'media', label: 'Visual (optional)' }], tpl: ['', '', ''] },
    { k: 'screens', t: 'group', optional: true, label: '3D screens slider (optional)', tpl: { type: 'phone', list: [] }, fields: [
      { k: 'type', t: 'select', label: 'Screen type', options: [['phone', 'Phone screens'], ['desk', 'Desktop or wide screens']] },
      { k: 'list', t: 'tuples', label: 'Screens', item: 'screen', bulk: 0, cols: [{ t: 'media' }, { t: 'text', ph: 'Caption' }], tpl: ['', ''] }] },
    { k: 'principles', t: 'tuples', label: 'Design principles (optional)', item: 'principle', cols: [{ t: 'text', ph: 'Title' }, { t: 'textarea', ph: 'Text', rows: 2 }], tpl: ['', ''] },
    { k: 'process', t: 'tuples', label: 'Process steps (optional)', item: 'step', cols: [{ t: 'text', ph: 'Step' }, { t: 'textarea', ph: 'Text', rows: 2 }], tpl: ['', ''] },
    { k: 'a11y', t: 'strings', label: 'Accessibility notes (optional)', multiline: true },
    { k: 'outcome', t: 'textarea', label: 'Outcome', hint: 'The big closing statement.', rows: 3 }
  ];
  var NEW_CASE = { id: '', title: 'New case study', sub: '', cat: '', year: String(new Date().getFullYear()), kind: 'Concept', cover: '', coverFit: '', feature: null, meta: [['Role', ''], ['Timeline', ''], ['Platform', ''], ['Type', '']], hero: { kind: 'cover', img: '', alt: '' }, note: '', overview: ['', ''], glance: [['Challenge', ''], ['My role', ''], ['Outcome', '']], impact: [], wide: null, challenges: [], stories: [], screens: null, principles: [], process: [], a11y: [], outcome: '' };

  var HOME_FIELDS = [
    { sec: 'Hero', hint: 'Use {1} and {2} in the headline to place the small rotating image pills.' },
    { k: 'PROFILE', t: 'group', fields: [
      { k: 'heroLine1', t: 'text', label: 'Headline line 1' },
      { k: 'heroLine2', t: 'text', label: 'Headline line 2' },
      { k: 'pills1', t: 'medialist', label: 'Images in pill {1}' },
      { k: 'pills2', t: 'medialist', label: 'Images in pill {2}' },
      { k: 'heroBio', t: 'textarea', label: 'Intro paragraph', hint: '{name} is replaced with your name in bold.' },
      { k: 'name', t: 'text', label: 'Your name' },
      { k: 'role', t: 'text', label: 'Role (top left)' },
      { k: 'city', t: 'text', label: 'City (top middle)' },
      { k: 'status', t: 'text', label: 'Status (top right)' }] },
    { sec: 'Showreel', hint: 'The big slideshow under the hero. Each slide is one image or video, or a row of phone screens.' },
    { k: 'REEL', t: 'objects', item: 'slide', titleKey: 'cap', tpl: { cap: 'New slide', img: '', contain: false, phones: [], bg: '#EDEDED' }, fields: [
      { k: 'cap', t: 'text', label: 'Caption' },
      { k: 'img', t: 'media', label: 'Image or video' },
      { k: 'contain', t: 'bool', label: 'Show the whole image on a light background (no crop)' },
      { k: 'phones', t: 'medialist', label: 'Or phone screens (used instead of the image)' },
      { k: 'bg', t: 'color', label: 'Background behind phone screens' }] },
    { sec: 'Gallery band on the home page' },
    { k: 'RING', t: 'medialist', label: '3D spinning ring', hint: '12 to 18 items look best.' },
    { k: 'MARQ_A', t: 'medialist', label: 'Scrolling row 1' },
    { k: 'MARQ_B', t: 'medialist', label: 'Scrolling row 2' },
    { k: 'PRELOAD', t: 'medialist', label: 'Loading screen images', hint: 'Flash by while the site loads. Keep it to 6 to 10 images.' }
  ];
  var ABOUT_FIELDS = [
    { sec: 'About' },
    { k: 'PROFILE', t: 'group', fields: [
      { k: 'portrait', t: 'media', label: 'Portrait' },
      { k: 'portraitBadge', t: 'text', label: 'Badge on the portrait' },
      { k: 'statement', t: 'textarea', label: 'Big statement', rows: 3 },
      { k: 'aboutBio', t: 'textarea', label: 'Bio', rows: 4 }] },
    { k: 'EDU', t: 'objects', label: 'Education', item: 'degree', titleKey: 'title', tpl: { period: '', title: 'New degree', school: '', now: false }, fields: [
      { k: 'title', t: 'text', label: 'Degree' }, { k: 'school', t: 'text', label: 'School / details' }, { k: 'period', t: 'text', label: 'Dates' }, { k: 'now', t: 'bool', label: 'Current (highlighted in black)' }] },
    { k: 'STATS', t: 'objects', label: 'Numbers', hint: 'Numbers count up when they scroll into view.', item: 'number', title: function (o) { return (o.pre || '') + (o.value || '') + (o.suf || '') + ' · ' + (o.label || ''); }, tpl: { value: '', pre: '', suf: '', label: '' }, fields: [
      { k: 'value', t: 'text', label: 'Number', ph: '85' }, { k: 'pre', t: 'text', label: 'Before the number', ph: '$' }, { k: 'suf', t: 'text', label: 'After the number', ph: '% or M+' }, { k: 'label', t: 'text', label: 'Label' }] },
    { sec: 'Capabilities' },
    { k: 'CAPS', t: 'objects', item: 'group', titleKey: 'title', tpl: { title: 'New group', items: [] }, fields: [{ k: 'title', t: 'text', label: 'Title' }, { k: 'items', t: 'strings', label: 'Skills' }] },
    { k: 'TOOLS', t: 'strings', label: 'Toolkit' },
    { sec: 'Contact' },
    { k: 'PROFILE', t: 'group', fields: [
      { k: 'footerTitle', t: 'text', label: 'Big footer headline' },
      { k: 'email', t: 'text', label: 'Email' },
      { k: 'linkedin', t: 'text', label: 'LinkedIn URL' }] }
  ];
  var JOURNEY_FIELDS = [
    { sec: 'Journey', hint: 'Each chapter scrolls past the big rolling year. Use a 4-digit year.' },
    { k: 'CHAPTERS', t: 'objects', item: 'chapter', title: function (o) { return (o.yr || '????') + ' · ' + (o.title || ''); }, tpl: { yr: String(new Date().getFullYear()), place: '', period: '', title: 'New chapter', org: '', txt: '', chips: [], link: '', now: false }, fields: [
      { k: 'yr', t: 'text', label: 'Year (4 digits)' }, { k: 'place', t: 'text', label: 'Place shown under the year' }, { k: 'period', t: 'text', label: 'Dates label' },
      { k: 'title', t: 'text', label: 'Title' }, { k: 'org', t: 'text', label: 'Organisation · role' }, { k: 'txt', t: 'textarea', label: 'Text' },
      { k: 'chips', t: 'strings', label: 'Highlights' }, { k: 'link', t: 'select', label: 'Link to a case study', options: caseOptions }, { k: 'now', t: 'bool', label: 'Current chapter (highlighted)' }] }
  ];

  /* ===================== editor shell ===================== */
  var TABS = [['cases', 'Case studies'], ['gallery', 'Gallery'], ['home', 'Home page'], ['about', 'About & contact'], ['journey', 'Journey'], ['media', 'Media library'], ['history', 'History']];
  function render() {
    if (S.view !== 'editor') return;
    var y = window.scrollY;
    app.innerHTML = '<header class="bar"><div class="brand"><span class="brand__mark">BG</span>Site editor</div><div class="bar__mid" id="barstate"></div><div class="row gap"><a class="btn btn--ghost" href="/" target="_blank" rel="noopener">View site ↗</a><button type="button" class="btn btn--ink" id="savebtn">Save &amp; publish</button><button type="button" class="btn btn--ghost" id="signout" title="Signed in as ' + esc(S.user.email) + '">Sign out</button></div></header>' +
      '<div class="shell"><nav class="tabs" aria-label="Sections">' + TABS.map(function (t) { return '<button type="button" class="tab' + (S.tab === t[0] ? ' on' : '') + '" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + t[1] + '</button>'; }).join('') +
      '<p class="tabs__foot muted">Signed in as<br>' + esc(S.user.email) + '</p></nav><main class="main" id="main">' + renderTab() + '</main></div>';
    paintBar();
    $('#savebtn').onclick = save;
    $('#signout').onclick = function () {
      var go = function () { sb.auth.signOut().then(function () { S.doc = null; location.reload(); }); };
      if (dirty()) confirmBox('Sign out without saving?', 'Your unsaved changes will be lost.', 'Sign out', true).then(function (ok) { if (ok) go(); }); else go();
    };
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-tab'); render(); window.scrollTo(0, 0); }; });
    if (S.tab === 'media') bindMediaTab();
    if (S.tab === 'history') loadHistory();
    window.scrollTo(0, y);
  }
  function paintBar() {
    var el = $('#barstate'); if (!el) return;
    var d = dirty();
    el.innerHTML = S.saving ? '<span class="pill pill--busy">Publishing…</span>' : d ? '<span class="pill pill--dirty">Unsaved changes</span>' : '<span class="pill pill--ok">All changes published' + (S.updatedAt ? ' · ' + esc(fmtDate(S.updatedAt)) : '') + '</span>';
    var b = $('#savebtn'); if (b) { b.disabled = S.saving || !d; }
  }
  function renderTab() {
    var D = S.doc;
    if (S.tab === 'cases') {
      var C = D.CASES || [];
      if (S.sel >= C.length) S.sel = Math.max(0, C.length - 1);
      var c = C[S.sel];
      var list = '<div class="cl"><div class="row between"><h2>Case studies <span class="muted">(' + C.length + ')</span></h2><button type="button" class="btn btn--ink btn--sm" data-act="newcase">+ New</button></div><ol class="cl__list">' + C.map(function (x, i) {
        return '<li><button type="button" class="cl__item' + (i === S.sel ? ' on' : '') + '" data-sel="' + i + '"><span class="cl__thumb">' + thumb(x.cover) + '</span><span><strong>' + esc(x.title || 'Untitled') + '</strong><span class="muted small">' + esc([x.kind, x.year].filter(Boolean).join(' · ')) + (x.feature ? ' · Featured' : '') + '</span></span></button></li>';
      }).join('') + '</ol><p class="hint">The order here is the order on your site. Featured cases also appear as big cards on the home page.</p></div>';
      var form = c ? '<div class="cf"><div class="row between cf__top"><h2>' + esc(c.title || 'Untitled') + '</h2><span class="row gap"><a class="btn btn--sm btn--ghost" href="/#' + esc(c.id) + '" target="_blank" rel="noopener">Open on site ↗</a><button type="button" class="btn btn--sm btn--ghost" data-act="up" data-p="' + enc(['CASES', S.sel]) + '" data-follow="1">Move up</button><button type="button" class="btn btn--sm btn--ghost" data-act="down" data-p="' + enc(['CASES', S.sel]) + '" data-follow="1">Move down</button><button type="button" class="btn btn--sm btn--ghost" data-act="dup" data-p="' + enc(['CASES', S.sel]) + '">Duplicate</button><button type="button" class="btn btn--sm btn--danger" data-act="delcase">Delete</button></span></div>' +
        CASE_FIELDS.map(function (fd) { return F(fd, c, ['CASES', S.sel]); }).join('') + '</div>' : '<div class="cf"><p class="muted">No case studies yet. Click + New.</p></div>';
      return '<div class="split">' + list + form + '</div>';
    }
    if (S.tab === 'gallery') {
      var Gl = D.GALLERY || [];
      var cats = {}; Gl.forEach(function (g) { if (g[2]) cats[g[2]] = 1; });
      return '<div class="row between"><div><h2>Gallery <span class="muted">(' + Gl.length + ')</span></h2><p class="hint">Everything here appears on the Gallery page, in this order. Type a new category to create it.</p></div><span class="row gap"><button type="button" class="btn btn--ink" data-act="galadd">+ Add images or videos</button></span></div>' +
        '<datalist id="cats">' + Object.keys(cats).map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist>' +
        '<div class="ggrid">' + Gl.map(function (g, i) {
          var ip = ['GALLERY', i];
          return '<div class="gi"><button type="button" class="gi__thumb" data-act="pick" data-p="' + enc(ip.concat([0])) + '" aria-label="Change media for ' + esc(g[1] || 'item ' + (i + 1)) + '">' + thumb(g[0]) + '</button><input type="text" data-p="' + enc(ip.concat([1])) + '" value="' + esc(g[1]) + '" placeholder="Caption" aria-label="Caption"><input type="text" list="cats" data-p="' + enc(ip.concat([2])) + '" value="' + esc(g[2]) + '" placeholder="Category" aria-label="Category"><span class="gi__bar"><button type="button" class="icon" data-act="up" data-p="' + enc(ip) + '" aria-label="Move earlier">←</button><span class="muted small">' + (i + 1) + '</span><button type="button" class="icon" data-act="down" data-p="' + enc(ip) + '" aria-label="Move later">→</button><button type="button" class="icon icon--danger" data-act="del" data-p="' + enc(ip) + '" aria-label="Remove from gallery">✕</button></span></div>';
        }).join('') + '</div>';
    }
    if (S.tab === 'home') return '<div class="narrow"><h2>Home page</h2>' + HOME_FIELDS.map(function (fd) { return F(fd, D, []); }).join('') + '</div>';
    if (S.tab === 'about') return '<div class="narrow"><h2>About &amp; contact</h2>' + ABOUT_FIELDS.map(function (fd) { return F(fd, D, []); }).join('') + '</div>';
    if (S.tab === 'journey') return '<div class="narrow"><h2>Journey</h2>' + JOURNEY_FIELDS.map(function (fd) { return F(fd, D, []); }).join('') + '</div>';
    if (S.tab === 'media') {
      var all = JSON.stringify(Object.keys(D).filter(function (k) { return k !== 'LIB'; }).map(function (k) { return D[k]; }));
      var L = lib().map(function (m, i) { return { m: m, i: i }; }).filter(function (x) {
        var t = isVid(x.m.key) ? 'video' : /\.gif(\?|$)/i.test(x.m.key) ? 'gif' : 'image';
        return (!S.libQ || (x.m.name || '').toLowerCase().indexOf(S.libQ) >= 0) && (S.libType === 'all' || S.libType === t);
      });
      return '<div class="row between"><div><h2>Media library <span class="muted">(' + lib().length + ')</span></h2><p class="hint">Upload once, use anywhere. Large photos are resized automatically. “Frame” controls how an item is shown across the site.</p></div></div>' +
        '<div class="drop drop--big" data-drop><strong>Drop images, GIFs or videos here</strong><span>or</span><label class="btn btn--ink">Choose files<input type="file" multiple accept="' + ACCEPT + '" hidden data-upl></label><span class="muted small">JPG, PNG, WebP, GIF, SVG, MP4, WebM, MOV · up to 50 MB each</span></div>' +
        '<div class="row gap" style="margin:18px 0"><input class="search" type="search" placeholder="Search by name" aria-label="Search media" value="' + esc(S.libQ) + '" data-libq><select data-libtype aria-label="Filter by type">' + [['all', 'All types'], ['image', 'Images'], ['gif', 'GIFs'], ['video', 'Videos']].map(function (o) { return '<option value="' + o[0] + '"' + (S.libType === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="lgrid">' + L.map(function (x) {
          var m = x.m, ip = ['LIB', x.i], used = all.split(JSON.stringify(m.key)).length - 1;
          return '<div class="li2"><span class="li2__thumb">' + thumb(m.key) + '</span><input type="text" data-p="' + enc(ip.concat(['name'])) + '" value="' + esc(m.name) + '" aria-label="Name"><label class="f f--inline"><span class="small muted">Frame</span><select data-p="' + enc(ip.concat(['frame'])) + '"><option value="none"' + (m.frame === 'none' || !m.frame ? ' selected' : '') + '>None</option><option value="phone"' + (m.frame === 'phone' ? ' selected' : '') + '>Phone</option><option value="light"' + (m.frame === 'light' ? ' selected' : '') + '>Light background</option></select></label><span class="small muted">' + (m.w ? m.w + '×' + m.h : '') + (m.size ? ' · ' + (m.size / 1048576).toFixed(1) + ' MB' : '') + '</span><span class="row between"><span class="small ' + (used ? '' : 'muted') + '">' + (used ? 'Used in ' + used + (used === 1 ? ' place' : ' places') : 'Not used') + '</span><button type="button" class="btn btn--sm btn--ghost" data-act="libdel" data-k="' + esc(m.key) + '"' + (used ? ' disabled title="Remove it from the places it’s used first"' : '') + '>Delete</button></span></div>';
        }).join('') + '</div>';
    }
    if (S.tab === 'history') return '<div class="narrow"><h2>History</h2><p class="hint">Every publish is kept. Load an older version, check it, then Save &amp; publish to bring it back.</p><div id="hist"><p class="muted">Loading…</p></div></div>';
    return '';
  }
  function bindMediaTab() {
    var drop = $('[data-drop]', app);
    var go = function (files) { drop.classList.add('busy'); uploadFiles(files, function (a, b, n) { drop.querySelector('strong').textContent = 'Uploading ' + a + ' of ' + b + ': ' + n; }).then(function (k) { if (k.length) toast(k.length + (k.length === 1 ? ' file' : ' files') + ' uploaded. Click Save & publish to keep them in your library.'); render(); }); };
    bindDrop(drop, go);
    $('[data-upl]', app).addEventListener('change', function (e) { go(e.target.files); });
    $('[data-libq]', app).addEventListener('input', function (e) { S.libQ = e.target.value.toLowerCase(); var pos = e.target.selectionStart; render(); var q = $('[data-libq]'); q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} });
    $('[data-libtype]', app).addEventListener('change', function (e) { S.libType = e.target.value; render(); });
  }
  function loadHistory() {
    var box = $('#hist');
    sb.from('site_content_history').select('id,saved_at,saved_by').eq('content_id', 'main').order('saved_at', { ascending: false }).limit(40).then(function (r) {
      if (r.error) { box.innerHTML = '<p class="err">' + esc(r.error.message) + '</p>'; return; }
      if (!r.data.length) { box.innerHTML = '<p class="muted">No published versions yet.</p>'; return; }
      box.innerHTML = '<ol class="hist">' + r.data.map(function (h, i) { return '<li><span><strong>' + esc(fmtDate(h.saved_at)) + '</strong>' + (i === 0 ? ' <span class="pill pill--ok">Live</span>' : '') + '<br><span class="muted small">' + esc(h.saved_by || '') + '</span></span>' + (i ? '<button type="button" class="btn btn--sm btn--ghost" data-restore="' + h.id + '">Load this version</button>' : '') + '</li>'; }).join('') + '</ol>';
      $$('[data-restore]', box).forEach(function (b) {
        b.onclick = function () {
          sb.from('site_content_history').select('data,saved_at').eq('id', b.getAttribute('data-restore')).single().then(function (x) {
            if (x.error) return toast(x.error.message, 'err');
            S.doc = x.data.data; S.tab = 'cases'; S.sel = 0; render();
            toast('Loaded the version from ' + fmtDate(x.data.saved_at) + '. Click Save & publish to make it live.');
          });
        };
      });
    });
  }

  /* ===================== events ===================== */
  function valFor(el) {
    if (el.type === 'checkbox') return el.checked;
    return el.value;
  }
  app.addEventListener('input', function (e) {
    var el = e.target; if (!el.hasAttribute || !el.hasAttribute('data-p')) return;
    var p = JSON.parse(el.getAttribute('data-p'));
    setAt(S.doc, p, valFor(el));
    if (el.type === 'color') { var sib = el.parentNode.querySelector('input[type=text]'); if (sib) sib.value = el.value; }
    paintBar();
    if (p[0] === 'CASES' && (p[2] === 'title' || p[2] === 'kind' || p[2] === 'year')) {
      var it = $('.cl__item.on strong'); if (it && p[2] === 'title') it.textContent = el.value || 'Untitled';
      if (p[2] === 'title') { var h = $('.cf__top h2'); if (h) h.textContent = el.value || 'Untitled'; }
    }
  });
  app.addEventListener('change', function (e) {
    var el = e.target; if (!el.hasAttribute || !el.hasAttribute('data-p')) return;
    setAt(S.doc, JSON.parse(el.getAttribute('data-p')), valFor(el)); paintBar();
    if (el.getAttribute('data-rerender') || el.type === 'checkbox') render();
    if (el.getAttribute('data-p').indexOf('"id"') >= 0) {
      var p = JSON.parse(el.getAttribute('data-p'));
      if (p[0] === 'CASES' && p[2] === 'id') { var v = slug(el.value); if (v !== el.value) { setAt(S.doc, p, v); el.value = v; } }
    }
  });
  app.addEventListener('click', function (e) {
    var sel = e.target.closest('[data-sel]');
    if (sel) { S.sel = +sel.getAttribute('data-sel'); render(); var m = $('.cf'); if (m) m.scrollTop = 0; return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), p = b.hasAttribute('data-p') ? JSON.parse(b.getAttribute('data-p')) : null;
    var tpl = b.hasAttribute('data-tpl') ? JSON.parse(b.getAttribute('data-tpl')) : null;
    var parentP = p ? p.slice(0, -1) : null, idx = p ? p[p.length - 1] : null;
    if (act === 'toggle') { var k = b.getAttribute('data-key'); S.open[k] = !S.open[k]; render(); return; }
    if (act === 'add') {
      var arr = getAt(S.doc, p); if (!Array.isArray(arr)) { arr = []; setAt(S.doc, p, arr); }
      arr.push(clone(tpl));
      if (b.hasAttribute('data-openlast')) S.open[JSON.stringify(p.concat([arr.length - 1]))] = true;
      render(); return;
    }
    if (act === 'bulk') {
      var col = +b.getAttribute('data-col');
      openPicker(true, function (keys) {
        var a2 = getAt(S.doc, p); if (!Array.isArray(a2)) { a2 = []; setAt(S.doc, p, a2); }
        keys.forEach(function (key) { var row = clone(tpl); row[col] = key; if (row.length > col + 1 && !row[col + 1]) row[col + 1] = nameOf(key); a2.push(row); });
        render();
      });
      return;
    }
    if (act === 'del') {
      var a3 = getAt(S.doc, parentP); a3.splice(idx, 1); render(); return;
    }
    if (act === 'up' || act === 'down') {
      var a4 = getAt(S.doc, parentP), j = act === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= a4.length) return;
      var t = a4[idx]; a4[idx] = a4[j]; a4[j] = t;
      if (b.hasAttribute('data-follow')) S.sel = j;
      render(); return;
    }
    if (act === 'dup') {
      var a5 = getAt(S.doc, parentP), copy = clone(a5[idx]);
      if (parentP.length === 1 && parentP[0] === 'CASES') { copy.title = (copy.title || '') + ' copy'; copy.id = slug((copy.id || 'case') + '-copy-' + Date.now().toString(36).slice(-3)); copy.feature = null; S.sel = idx + 1; }
      a5.splice(idx + 1, 0, copy); render(); return;
    }
    if (act === 'on') { setAt(S.doc, p, clone(tpl)); render(); return; }
    if (act === 'off') { setAt(S.doc, p, null); render(); return; }
    if (act === 'clear') { setAt(S.doc, p, ''); render(); return; }
    if (act === 'pick') { openPicker(false, function (keys) { setAt(S.doc, p, keys[0]); render(); }); return; }
    if (act === 'addmedia') {
      openPicker(true, function (keys) { var a6 = getAt(S.doc, p); if (!Array.isArray(a6)) { a6 = []; setAt(S.doc, p, a6); } keys.forEach(function (k2) { a6.push(k2); }); render(); });
      return;
    }
    if (act === 'galadd') {
      openPicker(true, function (keys) { keys.forEach(function (k3) { S.doc.GALLERY.push([k3, nameOf(k3), 'Mobile']); }); render(); toast(keys.length + ' added at the end of the gallery.'); });
      return;
    }
    if (act === 'newcase') {
      var nc = clone(NEW_CASE); nc.id = 'new-case-' + Date.now().toString(36).slice(-4);
      S.doc.CASES.unshift(nc); S.sel = 0; render(); toast('New case study added at the top. Fill it in, then Save & publish.');
      return;
    }
    if (act === 'delcase') {
      var c = S.doc.CASES[S.sel];
      confirmBox('Delete “' + (c.title || 'this case study') + '”?', 'It will disappear from your site when you publish. You can bring it back from History.', 'Delete', true).then(function (ok) {
        if (!ok) return;
        S.doc.CASES.splice(S.sel, 1); S.sel = Math.max(0, S.sel - 1); render();
      });
      return;
    }
    if (act === 'libdel') {
      var key = b.getAttribute('data-k'), L = lib();
      confirmBox('Delete this file?', 'It will be removed from your library when you publish.', 'Delete', true).then(function (ok) {
        if (!ok) return;
        for (var i = 0; i < L.length; i++) if (L[i].key === key) {
          if (L[i].path) S.pendingDeletes.push(L[i].path);
          L.splice(i, 1); break;
        }
        render();
      });
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && S.view === 'editor') { e.preventDefault(); if (dirty()) save(); }
  });
  window.addEventListener('beforeunload', function (e) { if (S.view === 'editor' && dirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ===================== start ===================== */
  if (!sb) {
    app.innerHTML = '<main class="auth"><div class="auth__box"><h1>The editor couldn’t start</h1><p class="muted">Its sign-in library didn’t load. Check your internet connection and reload the page.</p></div></main>';
    return;
  }
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') { S.view = 'auth'; S.authMode = 'recovery'; S.authMsg = ''; renderAuth(); }
    else if (event === 'SIGNED_OUT') { S.view = 'auth'; S.authMode = 'signin'; renderAuth(); }
  });
  sb.auth.getSession().then(function (r) {
    if (S.authMode === 'recovery') return;
    var s = r.data && r.data.session;
    if (s) afterLogin(s); else { S.view = 'auth'; renderAuth(); }
  }, function () { S.view = 'auth'; renderAuth(); });
})();
