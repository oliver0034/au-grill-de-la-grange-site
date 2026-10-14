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

  if (!window.ScrollTrigger) { gsap.set('.route__trace', { strokeDashoffset: 0 }); return; }

  /* Les mots d'affiche glissent légèrement au défilement, comme des affiches collées à la volée */
  document.querySelectorAll('[data-mot]').forEach(function (mot, i) {
    gsap.fromTo(mot, { xPercent: i % 2 ? 3 : -3 }, { xPercent: i % 2 ? -3 : 3, ease: 'none', scrollTrigger: { trigger: mot, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* La route du vendredi se trace au défilement */
  document.querySelectorAll('[data-route]').forEach(function (trace) {
    var fig = trace.closest('.route');
    gsap.fromTo(trace, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 78%', end: 'bottom 55%', scrub: 0.6 } });
  });
})();
