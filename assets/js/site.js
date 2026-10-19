/* Au Grill de la Grange — interactions. Aucun contenu ne dépend de ce fichier : sans lui, tout reste lisible. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var economie = navigator.connection && navigator.connection.saveData;

  /* ---------- En-tête : fond plein après le premier écran */
  var entete = document.querySelector('[data-entete]');
  function majEntete() { if (entete) entete.classList.toggle('entete--plein', window.scrollY > 40); }
  majEntete();
  window.addEventListener('scroll', majEntete, { passive: true });

  /* ---------- Menu mobile */
  var boutonMenu = document.querySelector('[data-menu]');
  function fermerMenu() { document.body.classList.remove('menu-ouvert'); if (boutonMenu) boutonMenu.setAttribute('aria-expanded', 'false'); }
  if (boutonMenu) {
    boutonMenu.addEventListener('click', function () {
      var ouvert = document.body.classList.toggle('menu-ouvert');
      boutonMenu.setAttribute('aria-expanded', String(ouvert));
    });
    document.querySelectorAll('#navigation a').forEach(function (a) { a.addEventListener('click', fermerMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerMenu(); });
  }

  /* ---------- État du feu, d'après les horaires (heure de Paris) */
  var donnees = {};
  try { donnees = JSON.parse(document.getElementById('donnees-horaires').textContent); } catch (e) {}
  var JOURS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var NOMS = { Friday: 'vendredi', Saturday: 'samedi', Sunday: 'dimanche' };
  function heureFr(hhmm) { var p = hhmm.split(':'); return parseInt(p[0], 10) + ' h' + (p[1] === '00' ? '' : p[1]); }
  function minutes(hhmm) { var p = hhmm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function maintenantParis() {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var o = {}; parts.forEach(function (p) { o[p.type] = p.value; });
    return { jour: o.weekday, min: parseInt(o.hour, 10) % 24 * 60 + parseInt(o.minute, 10) };
  }
  function etatDuFeu() {
    var h = donnees.horaires || [];
    if (!h.length) return null;
    var now = maintenantParis();
    var auj = h.filter(function (x) { return x.schema === now.jour; });
    for (var i = 0; i < auj.length; i++) {
      var o = minutes(auj[i].ouverture), f = minutes(auj[i].fermeture);
      if (now.min >= o && now.min < f) return { classe: 'ouvert', texte: 'Le feu est allumé : service jusqu’à\u00a0' + heureFr(auj[i].fermeture) + ', sur réservation.' };
      if (now.min < o) return { classe: 'bientot', texte: (o >= 18 * 60 ? 'Ce soir' : 'Aujourd’hui') + ', le feu s’allume à\u00a0' + heureFr(auj[i].ouverture) + '. Réservez votre table.' };
    }
    var idx = JOURS.indexOf(now.jour);
    for (var d = 1; d <= 7; d++) {
      var jour = JOURS[(idx + d) % 7];
      var s = h.filter(function (x) { return x.schema === jour; })[0];
      if (s) return { classe: 'ferme', texte: 'Prochain service : ' + NOMS[jour] + ' ' + s.libelle.replace(/^le /, '') + ', à\u00a0' + heureFr(s.ouverture) + '. Sur réservation.' };
    }
    return null;
  }
  var etat = etatDuFeu();
  if (etat) document.querySelectorAll('[data-etat-feu]').forEach(function (el) {
    el.classList.add('etat-feu--' + etat.classe);
    var t = el.querySelector('[data-etat-texte]');
    if (t) t.textContent = etat.texte;
  });

  /* ---------- Vidéo du feu : lecture seulement à l'écran, jamais si mouvement réduit ou économie de données */
  var video = document.querySelector('[data-feu]');
  if (video) {
    if (reduit || economie) { video.remove(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } else video.pause(); });
      }, { threshold: 0.05 }).observe(video);
    }
  }

  /* ---------- Barre d'appel mobile : masquée tant que le premier écran (qui a son bouton) est visible */
  var barre = document.querySelector('.barre-appel');
  var une = document.querySelector('.une');
  if (barre && une && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (en) { barre.classList.toggle('barre-appel--cachee', en.isIntersecting); }); }, { threshold: 0.25 }).observe(une);
  }

  /* ---------- Animations : seulement si GSAP est là et que le visiteur n'a pas demandé moins de mouvement */
  if (reduit || !window.gsap) return;
  var gsap = window.gsap;
  doc.classList.add('js-anim');
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  if (window.Lenis && window.ScrollTrigger) {
    var lenis = new window.Lenis({ lerp: 0.12 });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) { var c = document.querySelector(a.getAttribute('href')); if (c) { e.preventDefault(); lenis.scrollTo(c, { offset: -((entete ? entete.offsetHeight : 0) + 16) }); } });
    });
  }

  /* Premier écran : le logo, puis les lignes */
  var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  var logo = document.querySelector('[data-une-logo]');
  if (logo) tl.fromTo(logo, { opacity: 0, y: 28, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 1.3 });
  var lignes = document.querySelectorAll('[data-une-ligne]');
  if (lignes.length) tl.fromTo(lignes, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, '-=0.6');

  /* Effets choisis le 14/10/2026 sur démo (catalogue Magic UI, réécrits ici en GSAP et canvas) */
  if (!economie) lettresDeFeu();
  lueurs();

  if (!window.ScrollTrigger) { gsap.set('.route__trace', { strokeDashoffset: 0 }); return; }
  var ST = window.ScrollTrigger;

  /* Les mots d'affiche glissent légèrement au défilement, comme des affiches collées à la volée */
  document.querySelectorAll('[data-mot]').forEach(function (mot, i) {
    gsap.fromTo(mot, { xPercent: i % 2 ? 3 : -3 }, { xPercent: i % 2 ? -3 : 3, ease: 'none', scrollTrigger: { trigger: mot, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* La route du vendredi se trace lentement au défilement, une braise en tête ; elle se défait en remontant */
  document.querySelectorAll('[data-route]').forEach(function (trace) {
    var fig = trace.closest('.route'), tete = fig.querySelector('[data-route-tete]'), long = trace.getTotalLength();
    gsap.fromTo(trace, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: fig, start: 'top 85%', end: 'bottom 30%', scrub: 1.6 },
      onUpdate: function () {
        if (!tete) return;
        var p = trace.getPointAtLength(long * this.progress());
        tete.setAttribute('cx', p.x.toFixed(1)); tete.setAttribute('cy', p.y.toFixed(1));
      } });
  });

  apparitions();
  affichesCollees();
  compteur();
  photosCarte();
  poussiere();

  /* ---------- Lettres remplies par la vidéo du feu : « Restaurant à la ferme » et les mots d'affiche de toutes les pages.
     Un canvas par mot : un mot plié sur deux lignes (mobile) reste rempli, et chaque mot prend la portion de vidéo
     qui correspond à sa place dans la ligne, pour une texture continue. Vidéo du premier écran pour le titre,
     une seconde copie ailleurs ; chacune ne tourne qu'à l'écran. La page 404 (« Éteint ») est laissée telle quelle. */
  function lettresDeFeu() {
    var cibles = [].slice.call(document.querySelectorAll('.une__titre-ligne:first-child, .mot-affiche--section, .tete-page:not(.tete-page--sobre) .mot-affiche--page'));
    if (!cibles.length || !('IntersectionObserver' in window)) return;
    var videoUne = document.querySelector('[data-feu]'), videoCopie = null;
    function copieVideo() {
      if (videoCopie) return videoCopie;
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
      ['webm', 'mp4'].forEach(function (t) { var s = document.createElement('source'); s.src = '/assets/video/feu-boucle.' + t; s.type = 'video/' + t; v.appendChild(s); });
      v.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
      document.body.appendChild(v);
      return (videoCopie = v);
    }
    var dpr = Math.min(2, window.devicePixelRatio || 1), boucle = false;
    var blocs = cibles.map(function (el) {
      var texte = el.textContent.trim(), majuscules = getComputedStyle(el).textTransform === 'uppercase';
      el.classList.add('feu-texte');
      el.textContent = '';
      var mots = [];
      texte.split(/(\s+)/).forEach(function (morceau) {
        if (!morceau) return;
        if (/^\s+$/.test(morceau)) { el.appendChild(document.createTextNode(' ')); return; }
        var span = document.createElement('span'); span.className = 'feu-texte__mot'; span.textContent = morceau;
        var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
        el.appendChild(span);
        mots.push({ span: span, cv: cv, ctx: cv.getContext('2d'), texte: majuscules ? morceau.toUpperCase() : morceau });
      });
      mots.forEach(function (m) { el.appendChild(m.cv); });
      return { el: el, mots: mots, video: el.closest('.une') && videoUne ? videoUne : copieVideo(),
        voile: el.closest('.une') ? 0.55 : 0.38, vu: false };
    });

    function mesurer() {
      blocs.forEach(function (b) {
        var cs = getComputedStyle(b.el);
        b.police = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        b.espace = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        b.largeur = b.el.clientWidth || 1;
        b.mots.forEach(function (m) {
          m.actif = m.span.getClientRects().length === 1;
          m.span.classList.toggle('feu-texte__mot--actif', m.actif);
          m.cv.style.display = m.actif ? 'block' : 'none';
          if (!m.actif) return;
          var w = m.span.offsetWidth + 16, h = m.span.offsetHeight;
          m.x = m.span.offsetLeft - 8;
          m.cv.style.left = m.x + 'px'; m.cv.style.top = m.span.offsetTop + 'px';
          m.cv.style.width = w + 'px'; m.cv.style.height = h + 'px';
          m.cv.width = Math.round(w * dpr); m.cv.height = Math.round(h * dpr);
          m.w = w; m.h = h;
        });
        dessiner(b);
      });
    }
    function dessiner(b) {
      var v = b.video, pret = v.readyState >= 2;
      b.mots.forEach(function (m) {
        if (!m.actif) return;
        var c = m.ctx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, m.w, m.h);
        if (pret) {
          // bande de braises du bas de la vidéo, sous les barreaux : cadrée sur toute la largeur du bloc,
          // puis découpée à l'endroit du mot
          var vw = v.videoWidth, vh = v.videoHeight, sh = vh * 0.17, sw = sh * b.largeur / m.h;
          if (sw > vw * 0.9) { sw = vw * 0.9; sh = sw * m.h / b.largeur; }
          var sx = Math.max(0, Math.min(vw - sw, vw * 0.6 - sw / 2)), sy = Math.max(0, vh * 0.775 - sh / 2);
          var k = sw / b.largeur, mx = Math.max(0, m.x) * k, mw = Math.min(sw - mx, m.w * k);
          c.filter = 'brightness(1.35) saturate(1.25)';
          if (mw > 1) c.drawImage(v, sx + mx, sy, mw, sh, 0, 0, mw / k, m.h);
          c.filter = 'none';
          c.globalCompositeOperation = 'screen';
          c.fillStyle = 'rgba(231,181,69,' + b.voile + ')';  // relève les zones sombres vers l'or ; plus fort sur le titre, posé sur le feu
          c.fillRect(0, 0, m.w, m.h);
        } else {
          c.fillStyle = '#E7B545'; c.fillRect(0, 0, m.w, m.h);
        }
        c.globalCompositeOperation = 'destination-in';
        c.font = b.police;
        if ('letterSpacing' in c) c.letterSpacing = b.espace;
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        var t = c.measureText(m.texte);
        c.fillStyle = '#000';
        c.fillText(m.texte, m.w / 2, (m.h + t.actualBoundingBoxAscent - t.actualBoundingBoxDescent) / 2);
      });
    }
    function image() {
      var vus = blocs.filter(function (b) { return b.vu; });
      if (!vus.length || document.hidden) { boucle = false; if (videoCopie) videoCopie.pause(); return; }
      if (videoCopie && videoCopie.paused && vus.some(function (b) { return b.video === videoCopie; })) { var p = videoCopie.play(); if (p && p.catch) p.catch(function () {}); }
      vus.forEach(dessiner);
      requestAnimationFrame(image);
    }
    function relancer() { if (!boucle && !document.hidden && blocs.some(function (b) { return b.vu; })) { boucle = true; requestAnimationFrame(image); } }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { blocs.forEach(function (b) { if (b.el === en.target) b.vu = en.isIntersecting; }); });
      relancer();
    });
    blocs.forEach(function (b) { io.observe(b.el); });
    document.addEventListener('visibilitychange', relancer);
    window.addEventListener('resize', aplati(function () { mesurer(); relancer(); }));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { mesurer(); relancer(); });
  }

  /* ---------- Lueur qui respire derrière la photo et le film (copie floutée de l'image) */
  function lueurs() {
    var paires = [];
    function ajouter(hote, cible, src) {
      var l = document.createElement('img');
      l.className = 'lueur'; l.alt = ''; l.setAttribute('aria-hidden', 'true'); l.decoding = 'async'; l.src = src;
      hote.classList.add('lueur-hote');
      hote.insertBefore(l, cible);
      paires.push([l, cible]);
      return l;
    }
    document.querySelectorAll('.cadre-photo:not([data-poussiere])').forEach(function (fig) {   // la photo en poussière n'a pas de halo
      var pic = fig.querySelector('picture'), img = fig.querySelector('img');
      if (!pic || !img) return;
      var l = ajouter(fig, pic, img.currentSrc || img.src);
      img.addEventListener('load', function () { l.src = img.currentSrc || img.src; placer(); });
    });
    var cadre = document.querySelector('.film__cadre');
    if (cadre) ajouter(cadre.parentNode, cadre, '/assets/video/film-affiche.webp');
    if (!paires.length) return;
    function placer() {
      paires.forEach(function (p) {
        var l = p[0], c = p[1];
        l.style.left = c.offsetLeft + 'px'; l.style.top = c.offsetTop + 'px';
        l.style.width = c.offsetWidth + 'px'; l.style.height = c.offsetHeight + 'px';
      });
    }
    placer();
    window.addEventListener('resize', aplati(placer));
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', placer);
    // sur la carte, quatre grandes photos : halo plus discret pour ne pas alourdir la page
    gsap.to(paires.map(function (p) { return p[0]; }), { opacity: function (i, l) { return l.parentNode.hasAttribute('data-photo-carte') ? 0.5 : 1; },
      scale: 1.17, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 1.1 });
  }

  /* ---------- Les blocs entrent en fondu, du flou au net (toutes les pages) */
  function apparitions() {
    var cibles = gsap.utils.toArray([
      '.tete-page .chapo', '.tete-page .une__actions', '.tete-page .etat-feu',                    // en-tête des pages intérieures
      '.film__cadre', '.affiche .chapo:not(.infos-page__bloc .chapo)', '.faits > div', '.aubrac__texte > p:not(.chapo)', '.route',
      '.plats > li', '.menu-section > h2', '.menu-section__intro', '.carte-extrait__suite', '.cadre-photo:not([data-photo-carte])',
      '.ferme > p:not(.chapo)', '.affiche .une__actions', '.colonne-texte > h2', '.colonne-texte > p:not(.chapo)',
      '.infos-grille__bloc', '.infos-page__bloc', '.faq'].join(','));
    if (!cibles.length) return;
    gsap.set(cibles, { autoAlpha: 0, y: 26, filter: 'blur(10px)' });
    ST.batch(cibles, { start: 'top 88%', once: true, onEnter: function (lot) {
      gsap.to(lot, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'expo.out', stagger: 0.09, overwrite: true, clearProps: 'filter,transform' });
    } });
    cibles.forEach(function (el) { if (el.getBoundingClientRect().bottom < 0) gsap.set(el, { autoAlpha: 1, y: 0, filter: 'none' }); });
  }

  /* ---------- Titres qui s'ouvrent depuis le centre, lignes d'affiche posées une à une comme des bandes collées */
  function affichesCollees() {
    document.querySelectorAll('.affiche .titre-section, .affiche .titre-affiche, .tete-page .titre-section').forEach(function (t) {
      var mot = t.querySelector('.mot-affiche') || t, ligne = t.querySelector('.titre-section__ligne');
      var tl = gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 84%', once: true } });
      tl.fromTo(mot, { clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.15, ease: 'expo.out', clearProps: 'clipPath' });
      if (ligne) tl.fromTo(ligne, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.65');
    });
    document.querySelectorAll('.affiche-lignes--section, .etapes').forEach(function (ul) {
      gsap.fromTo(ul.children, { clipPath: 'inset(0 100% 0 0)', x: -16, rotation: -1.4 },
        { clipPath: 'inset(0 0% 0 0)', x: 0, rotation: 0, duration: 0.85, ease: 'power3.out', stagger: 0.16, clearProps: 'clipPath,transform',
          scrollTrigger: { trigger: ul, start: 'top 86%', once: true } });
    });
  }

  /* ---------- « Environ 130 km » compte de 0 à 130 quand il arrive à l'écran */
  function compteur() {
    var dt = [].slice.call(document.querySelectorAll('.faits dt')).filter(function (d) { return /130\s*km/.test(d.textContent); })[0];
    if (!dt) return;
    dt.innerHTML = dt.innerHTML.replace('130', '<span class="faits__compteur">0</span>');
    var n = dt.querySelector('.faits__compteur'), o = { v: 0 };
    n.style.cssText = 'display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums';
    gsap.to(o, { v: 130, duration: 2.2, ease: 'power2.out', onUpdate: function () { n.textContent = Math.round(o.v); },
      onComplete: function () { n.style.minWidth = ''; },          // la réserve de largeur ne sert que pendant le comptage
      scrollTrigger: { trigger: dt, start: 'top 86%', once: true } });
  }

  /* ---------- Photos de la carte : l'image se dévoile de bas en haut dans son cadre, se pose depuis un léger zoom,
     puis dérive de quelques pixels au défilement ; au survol, elle s'avance à peine */
  function photosCarte() {
    document.querySelectorAll('[data-photo-carte]').forEach(function (fig) {
      var img = fig.querySelector('img'), legende = fig.querySelector('figcaption');
      if (!img) return;
      gsap.set(img, { '--entree': 1.14, clipPath: 'inset(100% 0% 0% 0%)' });
      if (legende) gsap.set(legende, { autoAlpha: 0, x: -12 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 84%', once: true } });
      tl.to(img, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath' })
        .to(img, { '--entree': 1, duration: 2.4, ease: 'power3.out' }, 0.2);
      if (legende) tl.to(legende, { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power3.out' }, 0.95);
      gsap.fromTo(img, { '--parallaxe': '-14px' }, { '--parallaxe': '14px', ease: 'none',
        scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      fig.addEventListener('mouseenter', function () { gsap.to(img, { '--survol': 1.035, duration: 0.9, ease: 'power3.out' }); });
      fig.addEventListener('mouseleave', function () { gsap.to(img, { '--survol': 1, duration: 0.9, ease: 'power3.out' }); });
      if (fig.getBoundingClientRect().bottom < 0) { tl.progress(1); }
    });
  }

  /* ---------- Photos de l'accueil qui partent en poussière quand on les dépasse, et se reforment en remontant.
     Chaque photo est répartie pixel par pixel, au hasard (le haut d'abord), entre N calques ; au défilement, chaque calque
     se détache à son tour vers le haut et vers l'espace libre (data-poussiere="gauche" ou "droite") en s'effaçant.
     Calques construits une fois, à l'approche de la photo. */
  function poussiere() {
    if (!('IntersectionObserver' in window)) return;
    document.querySelectorAll('[data-poussiere]').forEach(poussiereUne);
  }
  function poussiereUne(fig) {
    var pic = fig.querySelector('picture'), img = fig.querySelector('img'), legende = fig.querySelector('figcaption');
    if (!pic || !img) return;
    var N = window.innerWidth < 720 ? 16 : 24, MARGE = 240, sens = fig.getAttribute('data-poussiere') === 'droite' ? 1 : -1;
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.className = 'poussiere'; cv.setAttribute('aria-hidden', 'true');
    fig.appendChild(cv);
    var couches = [], vols = [], W = 0, H = 0, pret = false, etat = { p: 0 };

    function construire() {
      W = Math.round(pic.clientWidth); H = Math.round(pic.clientHeight);
      if (!W || !H || !img.naturalWidth) return;
      var src = document.createElement('canvas'); src.width = W; src.height = H;
      var s = src.getContext('2d'); s.drawImage(img, 0, 0, W, H);
      var pixels = s.getImageData(0, 0, W, H).data, lots = [];
      for (var i = 0; i < N; i++) lots.push(s.createImageData(W, H));
      for (var y = 0; y < H; y++) {
        for (var x = 0; x < W; x++) {
          var k = (y * W + x) * 4, c = Math.min(N - 1, Math.floor((0.5 * Math.random() + 0.5 * y / H) * N)), d = lots[c].data;
          d[k] = pixels[k]; d[k + 1] = pixels[k + 1]; d[k + 2] = pixels[k + 2]; d[k + 3] = pixels[k + 3];
        }
      }
      couches = lots.map(function (lot) { var c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(lot, 0, 0); return c; });
      vols = couches.map(function (_, i) { return { dx: sens * (80 + Math.random() * 230), dy: -(40 + Math.random() * 150), rot: (Math.random() - 0.5) * 0.35, depart: i / N * 0.55 }; });
      cv.width = W + 2 * MARGE; cv.height = H + 2 * MARGE;
      cv.style.left = (pic.offsetLeft - MARGE) + 'px'; cv.style.top = (pic.offsetTop - MARGE) + 'px';
      cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
      pret = true;
      dessiner();
    }
    function dessiner() {
      if (!pret) return;
      var p = etat.p, actif = p > 0.002;
      img.style.visibility = actif ? 'hidden' : '';
      cv.style.display = actif ? 'block' : 'none';
      pic.style.opacity = actif ? String(1 - p) : '';
      if (legende) legende.style.opacity = actif ? String(Math.max(0, 1 - p * 2.5)) : '';
      if (!actif) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (var i = 0; i < N; i++) {
        var q = Math.max(0, Math.min(1, (p - vols[i].depart) / 0.45)), e = q * q;
        if (e >= 1) continue;
        ctx.globalAlpha = 1 - e;
        ctx.setTransform(1, 0, 0, 1, MARGE + W / 2 + vols[i].dx * e, MARGE + H / 2 + vols[i].dy * e);
        ctx.rotate(vols[i].rot * e);
        ctx.drawImage(couches[i], -W / 2, -H / 2);
      }
    }
    new IntersectionObserver(function (es, io) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      (img.decode ? img.decode() : Promise.resolve()).then(construire, construire);
    }, { rootMargin: '600px 0px' }).observe(fig);
    window.addEventListener('resize', aplati(function () { pret = false; construire(); }));
    gsap.to(etat, { p: 1, ease: 'none', onUpdate: dessiner,
      scrollTrigger: { trigger: fig, start: 'top 20%', end: 'bottom 20%', scrub: 0.8 } });
  }

  function aplati(fn) { var t; return function () { clearTimeout(t); t = setTimeout(fn, 150); }; }
})();
