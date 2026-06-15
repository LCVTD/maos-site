// MAOS scrollkoreografi. GSAP + ScrollTrigger laddas globalt via CDN.
// Rytmen är långsam och monumental: få element, generösa avstånd, en easing.

const EASE = 'power3.out';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Röstberättelse för demo-player: förinspelade repliker, ElevenLabs Tommy Svensson.
// Regenerera via ElevenLabs MCP (voice_id 6eknYWL7D5Z4nRkDy15t, eleven_multilingual_v2, speed 0.96)
// och spara som assets/voice/dp-0X.mp3 (fyra klipp dp-01..04).
let dpVoiceEnabled = true;
const dpVoiceClips = {};
['dp-01', 'dp-02', 'dp-03', 'dp-04'].forEach(id => {
  const a = new Audio('assets/voice/' + id + '.mp3?v=8');
  a.preload = 'auto';
  dpVoiceClips[id] = a;
});
function stopVoice() {
  Object.values(dpVoiceClips).forEach(a => { a.pause(); a.currentTime = 0; });
}
function speak(id) {
  if (!dpVoiceEnabled) return;
  stopVoice();
  dpVoiceClips[id]?.play().catch(() => {});
}

gsap.registerPlugin(ScrollTrigger);

// Nav-tillstånd
const nav = document.getElementById('site-nav');
ScrollTrigger.create({
  start: 40,
  onUpdate: self => nav.classList.toggle('nav-scrolled', self.scroll() > 40),
  onToggle: self => nav.classList.toggle('nav-scrolled', self.scroll() > 40)
});

if (!reduced) {
  // Guidelinjerna ritas uppifrån och ned
  gsap.to('.guide-line', { scaleY: 1, duration: 1.6, ease: 'power2.inOut', stagger: 0.15, delay: 0.2 });

  // Hero-intro med Auras fördröjningsrytm
  const intro = gsap.timeline({ defaults: { ease: EASE, duration: 0.9 } });
  if (localStorage.getItem('maos-fast-intro')) intro.timeScale(30);
  intro
    .from('[data-hero="eyebrow"]', { y: 14, opacity: 0 }, 0.3)
    .from('[data-hero="card"]', { y: 26, opacity: 0 }, 0.42)
    .from('[data-hero="title"] > span', { y: 34, opacity: 0, stagger: 0.12 }, 0.55)
    .from('[data-hero="sub"]', { y: 20, opacity: 0 }, 0.72)
    .from('[data-hero="cta"]', { y: 16, opacity: 0 }, 0.78)
    .from('[data-hero="hint"]', { opacity: 0 }, 1.0)
    .from('.hero-margin-label', { opacity: 0, duration: 1.2, stagger: 0.1 }, 1.05)
    .from('[data-hero="cue"]', { opacity: 0 }, 1.2);

  // Kameran dollyar bakåt när hallen lämnas
  ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6,
    onUpdate: self => {
      window.MAOSHero?.setScroll(self.progress);
      gsap.set('[data-hero="content"]', { y: self.progress * -90, opacity: 1 - self.progress * 1.25 });
    }
  });

  // Generella reveals
  document.querySelectorAll('[data-reveal]').forEach(el => {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 0.95, ease: EASE,
      scrollTrigger: { trigger: el, start: 'top 84%' }
    });
  });
  document.querySelectorAll('[data-reveal-stagger]').forEach(group => {
    gsap.to(group.children, {
      y: 0, opacity: 1, duration: 0.85, ease: EASE, stagger: 0.09,
      scrollTrigger: { trigger: group, start: 'top 84%' }
    });
  });

  // Watermark: långsam skala i scrub
  const wm = document.querySelector('.watermark');
  if (wm) {
    gsap.fromTo(wm, { scale: 0.94, y: 40 }, {
      scale: 1.03, y: -20, ease: 'none',
      scrollTrigger: { trigger: '#kontakt', start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  }
} else {
  window.MAOSHero?.setScroll(0);
}

// Stegdemos: spelar när de syns, pausar utanför
function demoTimeline(build, trigger) {
  const tl = build();
  tl.pause();
  ScrollTrigger.create({
    trigger, start: 'top 80%', end: 'bottom 10%',
    onEnter: () => tl.play(), onEnterBack: () => tl.play(),
    onLeave: () => tl.pause(), onLeaveBack: () => tl.pause()
  });
}

if (document.getElementById('demo-1')) {
  demoTimeline(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power2.inOut' } });
    tl.fromTo('#d1-laser', { attr: { x1: 40, x2: 40 }, opacity: 0 }, { opacity: 1, duration: 0.2 })
      .to('#d1-laser', { attr: { x1: 230, x2: 230 }, duration: 1.0 })
      .to('#d1-row2-bg', { opacity: 1, duration: 0.25 }, '<0.55')
      .fromTo('#d1-chip', { opacity: 0, scale: 0.8, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.3 }, '-=0.2')
      .to('#d1-laser', { opacity: 0, duration: 0.4 }, '+=0.6')
      .to(['#d1-chip', '#d1-row2-bg'], { opacity: 0, duration: 0.4 }, '+=0.8');
    return tl;
  }, '#demo-1');

  demoTimeline(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    tl.fromTo('#d2-pulse', { strokeDashoffset: 30 }, { strokeDashoffset: -210, duration: 1.5, ease: 'power1.inOut' })
      .to('#d2-l1', { attr: { width: 150 }, duration: 0.45, ease: 'power2.out' }, 0.55)
      .to('#d2-l2', { attr: { width: 122 }, duration: 0.45, ease: 'power2.out' }, 0.75)
      .to('#d2-l3', { attr: { width: 138 }, duration: 0.45, ease: 'power2.out' }, 0.95)
      .to('#d2-l4', { attr: { width: 96 }, duration: 0.45, ease: 'power2.out' }, 1.15)
      .to(['#d2-l1', '#d2-l2', '#d2-l3', '#d2-l4'], { attr: { width: 0 }, duration: 0.4, ease: 'power2.in' }, '+=1.4');
    return tl;
  }, '#demo-2');

  demoTimeline(() => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
    tl.fromTo('#d3-card', { x: 0, rotation: 0, opacity: 1, transformOrigin: '50% 80%' },
        { x: 14, duration: 0.5, ease: 'power1.inOut' })
      .to('#d3-card', { x: 200, rotation: 9, opacity: 0, duration: 0.6, ease: 'power2.in' })
      .fromTo('#d3-trail', { opacity: 0.8, attr: { x2: 60 } }, { attr: { x2: 230 }, opacity: 0, duration: 0.7, ease: 'power2.out' }, '<')
      .fromTo('#d3-check', { scale: 0, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' }, '-=0.15')
      .fromTo('#d3-flowtext', { opacity: 0 }, { opacity: 1, duration: 0.3 }, '<0.15')
      .to(['#d3-check', '#d3-flowtext'], { opacity: 0, duration: 0.4 }, '+=1.1')
      .set('#d3-card', { x: 0, rotation: 0, opacity: 1 });
    return tl;
  }, '#demo-3');
}

// Animatic-spelarna: GSAP-timelines i videospelarchrome. Autoplay i vy,
// paus utanför, manuell paus respekteras. Reduced motion visar slutbilden.
function setupPlayer(rootId, build) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const tl = build(root);
  root._mtl = tl;
  tl.pause();
  const dur = tl.duration();
  const fill = root.querySelector('.dp-fill');
  const timeEl = root.querySelector('.dp-time');
  const fmt = s => '0:' + String(Math.max(0, Math.floor(s))).padStart(2, '0');
  tl.eventCallback('onUpdate', () => {
    if (fill) fill.style.width = (tl.progress() * 100).toFixed(1) + '%';
    if (timeEl) timeEl.textContent = fmt(tl.time()) + ' / ' + fmt(dur);
  });
  let userPaused = false;
  const setPlaying = on => {
    root.classList.toggle('playing', on);
    if (on) tl.play(); else tl.pause();
    if (!on && root.id === 'demo-player') stopVoice();
  };
  root.querySelector('.dp-toggle')?.addEventListener('click', () => {
    const next = !root.classList.contains('playing');
    userPaused = !next;
    setPlaying(next);
  });
  if (reduced) { tl.progress(0.97).pause(); return; }
  ScrollTrigger.create({
    trigger: root, start: 'top 80%', end: 'bottom 12%',
    onEnter: () => { if (!userPaused) setPlaying(true); },
    onEnterBack: () => { if (!userPaused) setPlaying(true); },
    onLeave: () => setPlaying(false),
    onLeaveBack: () => setPlaying(false)
  });
}

// Demo: ny händelse → kontrolltornet (markören arbetar i dashboarden) → klart. ~36 s.
// Dashboarden ligger kvar genom hela dp-02 + dp-03: markören klickar händelsen, sammanfattningen
// kommer fram, föreslagen åtgärd byggs och godkänns. Instruerad röstberättelse (Tommy Svensson).
setupPlayer('demo-player', root => {
  const q = sel => root.querySelector(sel);
  const qa = sel => root.querySelectorAll(sel);
  const scenes = [1, 2, 3].map(n => q('[data-scene="' + n + '"]'));
  const stageEl = root.querySelector('.dp-stage');
  const cursorEl = root.querySelector('#dp-cursor');
  // Markörens mål räknas ut dynamiskt ur elementets faktiska position i scenen,
  // så pekaren landar exakt på det den klickar oavsett skärmstorlek (desktop eller mobil stack).
  const aim = sel => {
    const s = stageEl.getBoundingClientRect();
    const r = root.querySelector(sel).getBoundingClientRect();
    const half = (cursorEl.offsetWidth || 18) / 2;
    return {
      left: (r.left + r.width / 2 - s.left - half) / s.width * 100 + '%',
      top: (r.top + r.height / 2 - s.top - half) / s.height * 100 + '%'
    };
  };
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: 'power2.inOut' } });
  tl
    // Nollställ allt vid loop-start så inget barn-element ligger kvar synligt
    .set(scenes[0], { opacity: 1 }, 0.01)
    .set([scenes[1], scenes[2]], { opacity: 0 }, 0.01)
    .set('#dp-type', { clipPath: 'inset(0 100% 0 0)' }, 0.01)
    .set(['#dp-cursor', '.dp-summary', '.dash-action', '.dp-done'], { opacity: 0 }, 0.01)
    .set(qa('.dp-step'), { opacity: 0 }, 0.01)
    .set(qa('.dash-evt'), { opacity: 0 }, 0.01)
    .call(() => q('#dp-row-target')?.classList.remove('active'), null, 0.02)
    // Scen 1: ny händelse i inkorgen
    .call(() => speak('dp-01'), null, 0.5)
    .fromTo(scenes[0].querySelector('.ring-logo'), { scale: 0.9, opacity: 0.55 }, { scale: 1, opacity: 1, duration: 1.1 }, 0.5)
    .fromTo('#dp-type', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 3.4, ease: 'none' }, 0.9)
    .to(scenes[0], { opacity: 0, duration: 0.5 }, 10.4)
    // Scen 2: kontrolltornet tonar in, händelserna listas
    .to(scenes[1], { opacity: 1, duration: 0.5 }, 10.7)
    .fromTo(qa('.dash-evt'), { opacity: 0, x: -8 }, { opacity: 1, x: 0, stagger: 0.12, duration: 0.45 }, 11.0)
    .call(() => speak('dp-02'), null, 11.4)
    // Markören kommer in och klickar händelsen
    .fromTo('#dp-cursor', { opacity: 0, left: '82%', top: '88%' }, { opacity: 1, duration: 0.3 }, 12.3)
    .to('#dp-cursor', { left: () => aim('#dp-row-target').left, top: () => aim('#dp-row-target').top, duration: 0.95 }, 12.6)
    .to('#dp-cursor', { scale: 0.72, duration: 0.12, yoyo: true, repeat: 1 }, 13.7)
    .call(() => q('#dp-row-target')?.classList.add('active'), null, 13.85)
    // Detaljpanelen visar sammanfattningen; markören glider dit som om man läser
    .fromTo('.dp-summary', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 }, 14.3)
    .to('#dp-cursor', { left: () => aim('.dp-summary').left, top: () => aim('.dp-summary').top, duration: 1.1 }, 15.8)
    // Föreslagen åtgärd byggs (dp-03)
    .to('.dash-action', { opacity: 1, duration: 0.4 }, 19.7)
    .fromTo(qa('.dp-step'), { opacity: 0, x: -6 }, { opacity: 1, x: 0, stagger: 0.22, duration: 0.4 }, 19.9)
    .call(() => speak('dp-03'), null, 20.0)
    // Markören trycker godkänn
    .to('#dp-cursor', { left: () => aim('.dp-approve').left, top: () => aim('.dp-approve').top, duration: 0.9 }, 25.4)
    .to('#dp-cursor', { scale: 0.72, duration: 0.12, yoyo: true, repeat: 1 }, 26.7)
    .to(q('.dp-approve'), { scale: 0.95, duration: 0.12, yoyo: true, repeat: 1 }, 26.7)
    .to('#dp-cursor', { opacity: 0, duration: 0.3 }, 27.3)
    .fromTo('.dp-done', { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5 }, 27.6)
    .to(scenes[1], { opacity: 0, duration: 0.5 }, 30.8)
    // Scen 3: klart
    .to(scenes[2], { opacity: 1, duration: 0.7 }, 31.1)
    .fromTo(q('.dp-end-ring'), { scale: 0.85, rotation: -8 }, { scale: 1, rotation: 0, duration: 2.6, ease: 'power1.out' }, 31.1)
    .call(() => speak('dp-04'), null, 31.6)
    .to({}, { duration: 0.1 }, 35.6);
  return tl;
});

// Testimonial: fyra repliker ur dokumenterade fakta, cirka 20 sekunder.
setupPlayer('testimonial-player', root => {
  const caps = root.querySelectorAll('.tp-cap');
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8, defaults: { ease: 'power2.inOut' } });
  caps.forEach((c, i) => {
    tl.fromTo(c, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, i * 5 + 0.3)
      .to(c, { opacity: 0, y: -10, duration: 0.5 }, i * 5 + 4.5);
  });
  tl.fromTo(root.querySelectorAll('.tp-wave i'),
    { scaleY: 0.4 }, { scaleY: 2.2, duration: 0.3, yoyo: true, repeat: 26, stagger: 0.07 }, 0.3)
    .to({}, { duration: 0.1 }, 19.9);
  return tl;
});

// Röst-toggle för demo-player
(function () {
  const btn = document.getElementById('dp-voice-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    dpVoiceEnabled = !dpVoiceEnabled;
    btn.setAttribute('aria-pressed', String(dpVoiceEnabled));
    btn.title = dpVoiceEnabled ? 'Ljud på' : 'Ljud av';
    btn.setAttribute('aria-label', dpVoiceEnabled ? 'Ljud på' : 'Ljud av');
    const svg = btn.querySelector('svg');
    if (svg) {
      svg.innerHTML = dpVoiceEnabled
        ? '<path d="M1.5 5.5h2L7 2.5v9L3.5 8.5h-2a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5z" fill="currentColor"/><path d="M9 4.5a4 4 0 010 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>'
        : '<path d="M1.5 5.5h2L7 2.5v9L3.5 8.5h-2a.5.5 0 01-.5-.5V6a.5.5 0 01.5-.5z" fill="currentColor"/><path d="M9.5 5l3 4M12.5 5l-3 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
    }
    if (!dpVoiceEnabled) stopVoice();
  });
})();

// Magnetiska knappar, hoppar över pek- och reduced motion-lägen
if (!reduced && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.pill-primary, .pill-ghost').forEach(btn => {
    const qx = gsap.quickTo(btn, 'x', { duration: 0.3, ease: 'power3.out' });
    const qy = gsap.quickTo(btn, 'y', { duration: 0.3, ease: 'power3.out' });
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * 6);
      qy(((e.clientY - r.top) / r.height - 0.5) * 5);
    });
    btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}
