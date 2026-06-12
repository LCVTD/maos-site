// MAOS hero: ringen. Loggans flödande linjer i stor skala, svävande i tomrummet.
// Uppgifter faller längs laserlinjer; svep skjuter in dem i ringens omlopp där de
// löses upp i partiklar. Monokromt: vitt och silver på svart, inverterat i ljust läge.

import * as THREE from 'three';

const TASK_LABELS = [
  'Tidrapport v24', 'ÄTA-underrättelse', 'Avropssvar', 'Kontrollplan',
  'Fakturaunderlag', 'Mötesprotokoll', 'Besiktningsutlåtande', 'Dagboksblad'
];
const DECISION_LABEL = 'Beslut väntar';

// "Copper"-fälten bär beslutskortens inverterade färger.
const PALETTES = {
  dark: {
    bg: 0x000000, fog: 0.045,
    ring: 0xFFFFFF, ringHl: 0xFFFFFF, additive: true,
    beam: 0xFFFFFF, beamCopper: 0xFFFFFF, beamOpacity: 0.40,
    particle: new THREE.Color(0xFFFFFF), particleCopper: new THREE.Color(0xFFFFFF),
    cardBg: '#0B0B0B', cardEdge: 'rgba(255,255,255,0.85)', cardText: '#F2F2F2',
    cardBgCopper: '#F2F2F2', cardEdgeCopper: '#FFFFFF', cardTextCopper: '#0A0A0A'
  },
  light: {
    bg: 0xF5F5F5, fog: 0.038,
    ring: 0x0A0A0A, ringHl: 0x000000, additive: false,
    beam: 0x0A0A0A, beamCopper: 0x0A0A0A, beamOpacity: 0.40,
    particle: new THREE.Color(0x0A0A0A), particleCopper: new THREE.Color(0x0A0A0A),
    cardBg: '#FBFBFB', cardEdge: 'rgba(10,10,10,0.85)', cardText: '#0A0A0A',
    cardBgCopper: '#0A0A0A', cardEdgeCopper: '#0A0A0A', cardTextCopper: '#F5F5F5'
  }
};

const MAX_TASKS = 11;
const SPAWN_EVERY = 0.85;
const SWEEP_RADIUS = 1.8;
const SWEEP_SPEED_MIN = 2.2;
const AMBIENT_COUNT = 260;
const BURST_POOL = 480;
const RING_LINES = 14;

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class HeroScene {
  constructor(container) {
    this.container = container;
    this.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    this.pal = PALETTES[this.theme];
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.running = false;
    this.inView = true;
    this.sweepCount = 0;
    this.scrollP = 0;
    this.clock = new THREE.Clock();
    this.spawnTimer = 0;
    this.pointerWorld = new THREE.Vector3();
    this.pointerPrev = new THREE.Vector3();
    this.pointerVel = new THREE.Vector3();
    this.pointerActive = false;
    this.raycaster = new THREE.Raycaster();
    this.interactPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.4);
    this.ndc = new THREE.Vector2();
    this.ringPos = new THREE.Vector3(0, 2.75, -2.6);
    this.ringR = 2.3;

    this.initRenderer();
    if (!this.renderer) return;
    this.buildScene();
    this.buildTasks();
    this.buildParticles();
    this.bindEvents();
    this.applyTheme(this.theme);

    if (this.reduced) {
      for (let i = 0; i < 5; i++) this.spawnTask(true);
      this.updateRing(0, 0);
      this.renderOnce();
    } else {
      this.start();
    }
    document.fonts?.ready?.then(() => this.regenerateCardTextures());
  }

  initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) {
      this.container.classList.add('hidden');
      return;
    }
    this.setSize();
    this.container.appendChild(this.renderer.domElement);
  }

  setSize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  buildScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this.setSize();
    this.baseCam = new THREE.Vector3(0, 2.6, 6.2);
    this.lookAt = new THREE.Vector3(0, 2.4, -1.5);
    this.camera.position.copy(this.baseCam);
    this.camera.lookAt(this.lookAt);
    this.buildRing();
  }

  // Ringen: samma generativa rekonstruktion som märket i nav och footer,
  // som tredimensionella linjeslingor med individuell rotation och andning.
  buildRing() {
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    this.ringGroup = new THREE.Group();
    this.ringGroup.position.copy(this.ringPos);
    this.ringLines = [];

    for (let i = 0; i < RING_LINES; i++) {
      const r0 = this.ringR * (0.80 + (i / (RING_LINES - 1)) * 0.26);
      const P = {
        r0,
        a1: r0 * (0.05 + rnd() * 0.09), k1: 2 + Math.floor(rnd() * 2), p1: rnd() * 6.283,
        a2: r0 * (0.02 + rnd() * 0.05), p2: rnd() * 6.283,
        zOff: (rnd() - 0.5) * 0.22, zAmp: 0.03 + rnd() * 0.05
      };
      const pts = [];
      const steps = 160;
      for (let s = 0; s < steps; s++) {
        const th = (s / steps) * Math.PI * 2;
        const r = P.r0 + P.a1 * Math.sin(P.k1 * th + P.p1) + P.a2 * Math.sin(5 * th + P.p2);
        pts.push(new THREE.Vector3(
          r * Math.cos(th),
          r * Math.sin(th),
          P.zOff + Math.sin(3 * th + P.p1) * P.zAmp
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        transparent: true,
        opacity: 0.20 + (i / (RING_LINES - 1)) * 0.55,
        depthWrite: false
      });
      const line = new THREE.LineLoop(geo, mat);
      line.rotation.z = rnd() * 6.283;
      this.ringGroup.add(line);
      this.ringLines.push({ line, mat, P, speed: 0.04 + (rnd() - 0.5) * 0.14 });
    }

    // Pulsen: en ljusbåge som vandrar ett varv var fjärde sekund
    this.hlIdx = RING_LINES - 2;
    this.hlPts = 26;
    const hlPos = new Float32Array(this.hlPts * 3);
    this.hlGeo = new THREE.BufferGeometry();
    this.hlGeo.setAttribute('position', new THREE.BufferAttribute(hlPos, 3));
    this.hlMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false });
    this.hl = new THREE.Line(this.hlGeo, this.hlMat);
    this.ringGroup.add(this.hl);

    this.scene.add(this.ringGroup);
  }

  updateRing(dt, time) {
    for (const L of this.ringLines) L.line.rotation.z += L.speed * dt;
    const breathe = 1 + 0.012 * Math.sin(time * 0.7);
    this.ringGroup.scale.setScalar(breathe);
    this.ringGroup.rotation.x = Math.sin(time * 0.23) * 0.07;
    this.ringGroup.rotation.y = Math.cos(time * 0.19) * 0.07;

    const L = this.ringLines[this.hlIdx];
    const h0 = ((time % 4) / 4) * Math.PI * 2;
    const pos = this.hlGeo.attributes.position.array;
    for (let s = 0; s < this.hlPts; s++) {
      const th = h0 + (s / (this.hlPts - 1)) * 0.85;
      const r = L.P.r0 + L.P.a1 * Math.sin(L.P.k1 * th + L.P.p1) + L.P.a2 * Math.sin(5 * th + L.P.p2);
      pos[s * 3] = r * Math.cos(th);
      pos[s * 3 + 1] = r * Math.sin(th);
      pos[s * 3 + 2] = L.P.zOff + Math.sin(3 * th + L.P.p1) * L.P.zAmp + 0.01;
    }
    this.hl.rotation.z = L.line.rotation.z;
    this.hlGeo.attributes.position.needsUpdate = true;
    this.hlMat.opacity = 0.7 + 0.3 * Math.sin(time * 9);
  }

  makeCardTexture(label, copper) {
    const c = document.createElement('canvas');
    c.width = 360; c.height = 208;
    const ctx = c.getContext('2d');
    const p = this.pal;
    ctx.clearRect(0, 0, c.width, c.height);
    roundedRectPath(ctx, 6, 6, 348, 196, 26);
    ctx.fillStyle = copper ? p.cardBgCopper : p.cardBg;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = copper ? p.cardEdgeCopper : p.cardEdge;
    ctx.stroke();
    // Märkets glyf i hörnet: exakt samma ring som i nav, via delad generator
    ctx.strokeStyle = copper ? p.cardTextCopper : p.cardText;
    if (window.MAOSRing) window.MAOSRing.drawOnCanvas(ctx, 48, 48, 50, 12, 7);
    ctx.fillStyle = copper ? p.cardTextCopper : p.cardText;
    ctx.textBaseline = 'middle';
    // Etiketten får aldrig sticka ut ur ramen: krymp tills den ryms
    let fontSize = 34;
    const maxWidth = 296;
    ctx.font = '600 ' + fontSize + 'px Inter, system-ui, sans-serif';
    while (ctx.measureText(label).width > maxWidth && fontSize > 18) {
      fontSize -= 1;
      ctx.font = '600 ' + fontSize + 'px Inter, system-ui, sans-serif';
    }
    ctx.fillText(label, 30, 150);
    ctx.font = '500 19px "IBM Plex Mono", monospace';
    ctx.globalAlpha = 0.7;
    ctx.fillText(copper ? 'BESLUT · KRÄVER DIG' : 'AUTOMATISERAS', 86, 48);
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  buildTasks() {
    this.tasks = [];
    const cardGeo = new THREE.PlaneGeometry(1.35, 0.78);
    const beamGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_TASKS + 3; i++) {
      const copper = i % 7 === 3;
      const label = copper ? DECISION_LABEL : TASK_LABELS[i % TASK_LABELS.length];
      const mat = new THREE.MeshBasicMaterial({
        map: this.makeCardTexture(label, copper),
        transparent: true, side: THREE.DoubleSide, depthWrite: false
      });
      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.visible = false;
      const beamMat = new THREE.MeshBasicMaterial({
        color: copper ? this.pal.beamCopper : this.pal.beam,
        transparent: true, opacity: this.pal.beamOpacity,
        depthWrite: false, side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.visible = false;
      this.scene.add(mesh, beam);
      this.tasks.push({
        mesh, beam, copper, label, state: 'idle',
        vel: new THREE.Vector3(), ang: new THREE.Vector3(), t: 0, phase: Math.random() * 6.28
      });
    }
  }

  spawnTask(staticPlace) {
    const free = this.tasks.find(t => t.state === 'idle');
    if (!free) return;
    free.state = 'falling';
    free.t = 0;
    free.burst = false;
    free.mesh.visible = true;
    free.beam.visible = true;
    free.mesh.material.opacity = 1;
    free.mesh.scale.setScalar(1);
    free.mesh.rotation.set(0, 0, (Math.random() - 0.5) * 0.16);
    const x = (Math.random() - 0.5) * 8.4;
    const y = staticPlace ? 2.2 + Math.random() * 2.6 : 6.6 + Math.random() * 1.6;
    const z = -2.2 + Math.random() * 1.5;
    free.mesh.position.set(x, y, z);
    free.vel.set(0, -(0.5 + Math.random() * 0.28), 0);
    free.ang.set(0, 0, (Math.random() - 0.5) * 0.35);
  }

  emitBurst(pos, copper, n) {
    const P = this.burst;
    for (let i = 0; i < n; i++) {
      const idx = P.cursor;
      P.cursor = (P.cursor + 1) % BURST_POOL;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.2 + 0.3;
      P.pos[idx * 3] = pos.x; P.pos[idx * 3 + 1] = pos.y; P.pos[idx * 3 + 2] = pos.z;
      P.vel[idx * 3] = Math.cos(a) * r;
      P.vel[idx * 3 + 1] = Math.sin(a) * r;
      P.vel[idx * 3 + 2] = (Math.random() - 0.5) * 0.5;
      P.life[idx] = 1.2 + Math.random() * 0.6;
      P.copper[idx] = copper ? 1 : 0;
    }
  }

  buildParticles() {
    // Omgivande drift genom hallen
    const aPos = new Float32Array(AMBIENT_COUNT * 3);
    const aCol = new Float32Array(AMBIENT_COUNT * 3);
    this.ambientSpeed = new Float32Array(AMBIENT_COUNT);
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      aPos[i * 3] = (Math.random() - 0.5) * 26;
      aPos[i * 3 + 1] = 0.3 + Math.random() * 5.6;
      aPos[i * 3 + 2] = -5.5 + Math.random() * 6.0;
      this.ambientSpeed[i] = 0.18 + Math.random() * 0.5;
    }
    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
    aGeo.setAttribute('color', new THREE.BufferAttribute(aCol, 3));
    this.ambientMat = new THREE.PointsMaterial({
      size: 0.035, transparent: true, opacity: 0.85, vertexColors: true,
      depthWrite: false, sizeAttenuation: true
    });
    this.ambient = { geo: aGeo, pos: aPos, col: aCol };
    this.scene.add(new THREE.Points(aGeo, this.ambientMat));

    // Burst-pool: svepta kort löses upp och dras in i ringens omlopp
    const bPos = new Float32Array(BURST_POOL * 3);
    const bCol = new Float32Array(BURST_POOL * 3);
    bPos.fill(999);
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
    this.burstMat = new THREE.PointsMaterial({
      size: 0.05, transparent: true, opacity: 1, vertexColors: true,
      depthWrite: false, sizeAttenuation: true
    });
    this.burst = {
      geo: bGeo, pos: bPos, col: bCol,
      vel: new Float32Array(BURST_POOL * 3),
      life: new Float32Array(BURST_POOL),
      copper: new Float32Array(BURST_POOL),
      cursor: 0
    };
    this.scene.add(new THREE.Points(bGeo, this.burstMat));
  }

  bindEvents() {
    window.addEventListener('resize', () => this.setSize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop(); else if (this.inView && !this.reduced) this.start();
    });
    const io = new IntersectionObserver(entries => {
      this.inView = entries[0].isIntersecting;
      if (this.inView && !this.reduced && !document.hidden) this.start(); else this.stop();
    }, { threshold: 0.02 });
    io.observe(this.container);

    const onMove = (clientX, clientY) => {
      const r = this.container.getBoundingClientRect();
      if (clientY < r.top || clientY > r.bottom) { this.pointerActive = false; return; }
      this.ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
      this.raycaster.setFromCamera(this.ndc, this.camera);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.interactPlane, hit)) {
        if (!this.pointerActive) this.pointerPrev.copy(hit);
        this.pointerWorld.copy(hit);
        this.pointerActive = true;
      }
    };
    window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY), { passive: true });
    window.addEventListener('touchmove', e => {
      if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  sweep(dt) {
    if (!this.pointerActive) return;
    this.pointerVel.subVectors(this.pointerWorld, this.pointerPrev).divideScalar(Math.max(dt, 0.001));
    this.pointerPrev.copy(this.pointerWorld);
    const speed = this.pointerVel.length();
    if (speed < SWEEP_SPEED_MIN) return;
    const capped = Math.min(speed, 14);
    for (const t of this.tasks) {
      if (t.state !== 'falling') continue;
      const d = t.mesh.position.distanceTo(this.pointerWorld);
      if (d > SWEEP_RADIUS) continue;
      t.state = 'swept';
      t.t = 0;
      const dir = this.pointerVel.clone().normalize();
      t.vel.copy(dir).multiplyScalar(capped * 0.45);
      const toRing = this.ringPos.clone().sub(t.mesh.position).normalize();
      t.vel.addScaledVector(toRing, 2.2);
      t.ang.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
      this.sweepCount++;
      window.dispatchEvent(new CustomEvent('maos:sweep', { detail: { count: this.sweepCount } }));
    }
  }

  updateTasks(dt, time) {
    let active = 0;
    for (const t of this.tasks) {
      if (t.state === 'idle') continue;
      active++;
      const m = t.mesh;
      if (t.state === 'falling') {
        m.position.y += t.vel.y * dt;
        m.position.x += Math.sin(time * 0.7 + t.phase) * 0.12 * dt;
        m.rotation.z += t.ang.z * dt * 0.4;
        if (m.position.y < 1.0) { t.state = 'landing'; t.t = 0; }
      } else if (t.state === 'swept') {
        t.t += dt;
        m.position.addScaledVector(t.vel, dt);
        t.vel.multiplyScalar(1 - 0.6 * dt);
        const toRing = this.ringPos.clone().sub(m.position).normalize();
        t.vel.addScaledVector(toRing, 6 * dt);
        m.rotation.x += t.ang.x * dt;
        m.rotation.y += t.ang.y * dt;
        m.rotation.z += t.ang.z * dt;
        if (t.t > 0.22 && !t.burst) { t.burst = true; this.emitBurst(m.position, t.copper, 16); }
        const k = Math.max(0, 1 - t.t / 0.75);
        m.material.opacity = k;
        m.scale.setScalar(0.55 + 0.45 * k);
        if (t.t > 0.8) this.recycle(t);
      } else if (t.state === 'landing') {
        // Det du inte hinner svepa fångar systemet självt: in i ringen
        t.t += dt;
        m.position.lerp(this.ringPos, Math.min(1, dt * 2.2));
        m.rotation.z += dt * 2.0;
        const d = m.position.distanceTo(this.ringPos);
        const fade = Math.min(1, d / 2.2);
        m.material.opacity = fade;
        m.scale.setScalar(Math.max(0.25, fade));
        if (d < 0.55) {
          this.emitBurst(m.position, t.copper, 12);
          this.recycle(t);
        }
      }
      // Lasern följer kortet från ovan
      const top = 8.4;
      const beamH = Math.max(0.001, top - (m.position.y + 0.42));
      t.beam.scale.set(0.05, beamH, 1);
      t.beam.position.set(m.position.x, top - beamH / 2, m.position.z - 0.01);
      t.beam.material.opacity = (t.state === 'falling' ? 1 : 0.25) *
        this.pal.beamOpacity * (0.75 + 0.25 * Math.sin(time * 7 + t.phase));
      t.beam.visible = t.state === 'falling' || t.state === 'swept';
    }
    this.spawnTimer += dt;
    if (active < MAX_TASKS && this.spawnTimer > SPAWN_EVERY) {
      this.spawnTimer = 0;
      this.spawnTask(false);
    }
  }

  recycle(t) {
    t.state = 'idle';
    t.burst = false;
    t.mesh.visible = false;
    t.beam.visible = false;
  }

  updateParticles(dt) {
    const A = this.ambient, base = this.pal.particle;
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      A.pos[i * 3] += this.ambientSpeed[i] * dt;
      if (A.pos[i * 3] > 13) A.pos[i * 3] = -13;
      const tw = 0.35 + 0.3 * Math.sin(i * 1.7 + performance.now() * 0.0011);
      A.col[i * 3] = base.r * tw; A.col[i * 3 + 1] = base.g * tw; A.col[i * 3 + 2] = base.b * tw;
    }
    A.geo.attributes.position.needsUpdate = true;
    A.geo.attributes.color.needsUpdate = true;

    // Bursten dras mot ringradien och läggs i omlopp innan den slocknar
    const B = this.burst, C = this.ringPos, R = this.ringR;
    for (let i = 0; i < BURST_POOL; i++) {
      if (B.life[i] <= 0) continue;
      B.life[i] -= dt;
      const i3 = i * 3;
      const dx = B.pos[i3] - C.x, dy = B.pos[i3 + 1] - C.y;
      const rr = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const ux = dx / rr, uy = dy / rr;
      B.vel[i3] += (ux * (R - rr) * 3.0 - uy * 1.8) * dt;
      B.vel[i3 + 1] += (uy * (R - rr) * 3.0 + ux * 1.8) * dt;
      B.vel[i3 + 2] += (C.z - B.pos[i3 + 2]) * 1.5 * dt;
      B.vel[i3] *= 1 - 0.5 * dt;
      B.vel[i3 + 1] *= 1 - 0.5 * dt;
      B.pos[i3] += B.vel[i3] * dt;
      B.pos[i3 + 1] += B.vel[i3 + 1] * dt;
      B.pos[i3 + 2] += B.vel[i3 + 2] * dt;
      const col = B.copper[i] ? this.pal.particleCopper : this.pal.particle;
      const k = Math.max(0, Math.min(1, B.life[i]));
      B.col[i3] = col.r * k; B.col[i3 + 1] = col.g * k; B.col[i3 + 2] = col.b * k;
      if (B.life[i] <= 0) { B.pos[i3] = 999; B.pos[i3 + 1] = 999; }
    }
    B.geo.attributes.position.needsUpdate = true;
    B.geo.attributes.color.needsUpdate = true;
  }

  applyTheme(theme) {
    this.theme = theme;
    this.pal = PALETTES[theme];
    const p = this.pal;
    const blend = p.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.renderer.setClearColor(p.bg);
    this.scene.fog = new THREE.FogExp2(p.bg, p.fog);
    for (const L of this.ringLines) {
      L.mat.color.setHex(p.ring);
      L.mat.blending = blend;
      L.mat.needsUpdate = true;
    }
    this.hlMat.color.setHex(p.ringHl);
    this.hlMat.blending = blend;
    this.hlMat.needsUpdate = true;
    this.ambientMat.blending = blend;
    this.ambientMat.needsUpdate = true;
    this.burstMat.blending = blend;
    this.burstMat.needsUpdate = true;
    this.regenerateCardTextures();
    if (this.reduced || !this.running) this.renderOnce();
  }

  regenerateCardTextures() {
    if (!this.tasks) return;
    const blend = this.pal.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (const t of this.tasks) {
      const old = t.mesh.material.map;
      t.mesh.material.map = this.makeCardTexture(t.label, t.copper);
      t.mesh.material.needsUpdate = true;
      if (old) old.dispose();
      t.beam.material.color.setHex(t.copper ? this.pal.beamCopper : this.pal.beam);
      t.beam.material.blending = blend;
      t.beam.material.needsUpdate = true;
    }
  }

  setScroll(p) {
    this.scrollP = p;
    if (this.reduced) return;
    this.camera.position.set(
      this.baseCam.x,
      this.baseCam.y + p * 1.1,
      this.baseCam.z + p * 2.4
    );
    this.camera.lookAt(this.lookAt);
    if (!this.running) this.renderOnce();
  }

  renderOnce() {
    this.renderer.render(this.scene, this.camera);
  }

  frame(dt) {
    this.time = (this.time || 0) + dt;
    this.sweep(dt);
    this.updateTasks(dt, this.time);
    this.updateParticles(dt);
    this.updateRing(dt, this.time);
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (this.running) return;
    this.running = true;
    // GSAP-tickern driver loopen: den faller tillbaka på setTimeout när
    // fliken är dold, vilket rå requestAnimationFrame inte gör.
    if (window.gsap) {
      this._tick = this._tick || ((t, dtMs) => this.frame(Math.min(dtMs / 1000, 0.05)));
      gsap.ticker.add(this._tick);
    } else {
      this.clock.getDelta();
      const loop = () => {
        if (!this.running) return;
        this.frame(Math.min(this.clock.getDelta(), 0.05));
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  stop() {
    this.running = false;
    if (window.gsap && this._tick) gsap.ticker.remove(this._tick);
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}

const container = document.getElementById('hero-canvas');
if (container) {
  const scene = new HeroScene(container);
  window.MAOSHero = {
    setTheme: mode => scene.applyTheme?.(mode),
    setScroll: p => scene.setScroll?.(p),
    _s: scene
  };
  window.dispatchEvent(new Event('maos:hero-ready'));
}
