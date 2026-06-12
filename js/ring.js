// Delad generator för ringen, MAOS-märket. Identiska parametrar (lines, seed)
// ger identiskt märke överallt: nav-SVG, favicon och kortens canvas-glyf.
// Seedad PRNG; anropsordningen får inte ändras, då byter märket form.

(function () {
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function params(lines, seed) {
    const rnd = mulberry32(seed);
    const out = [];
    for (let i = 0; i < lines; i++) {
      out.push({
        r0: 25 + i * 2.0,
        a1: 1.6 + rnd() * 2.8, p1: rnd() * 6.283, k1: 2 + Math.floor(rnd() * 2),
        a2: 0.8 + rnd() * 1.7, p2: rnd() * 6.283,
        cx: 60 + (rnd() - 0.5) * 4, cy: 60 + (rnd() - 0.5) * 4,
        op: 0.28 + (i / (lines - 1)) * 0.67,
        w: 0.9 + rnd() * 0.5
      });
    }
    return out;
  }

  function points(L, steps) {
    const pts = [];
    for (let s = 0; s <= steps; s++) {
      const th = (s / steps) * Math.PI * 2;
      const r = L.r0 + L.a1 * Math.sin(L.k1 * th + L.p1) + L.a2 * Math.sin(5 * th + L.p2);
      pts.push([L.cx + r * Math.cos(th), L.cy + r * Math.sin(th)]);
    }
    return pts;
  }

  function svg(lines, seed) {
    let paths = '';
    for (const L of params(lines, seed)) {
      let d = '';
      points(L, 64).forEach((p, s) => {
        d += (s === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      });
      d += 'Z';
      paths += '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="' + L.w.toFixed(2) + '" opacity="' + L.op.toFixed(2) + '"/>';
    }
    return '<svg viewBox="0 0 120 120" aria-hidden="true">' + paths + '</svg>';
  }

  // Ritar exakt samma märke på en 2D-canvas, centrerat i (cx0, cy0), bredd box.
  function drawOnCanvas(ctx, cx0, cy0, box, lines, seed) {
    const s = box / 120;
    for (const L of params(lines, seed)) {
      ctx.globalAlpha = L.op;
      ctx.lineWidth = Math.max(0.8, L.w * s * 2.2);
      ctx.beginPath();
      points(L, 48).forEach((p, i) => {
        const x = cx0 + (p[0] - 60) * s, y = cy0 + (p[1] - 60) * s;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function faviconURI(lines, seed) {
    const body = svg(lines, seed)
      .replace('<svg viewBox="0 0 120 120" aria-hidden="true">',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="26" fill="#000000"/><g color="#F2F2F2">')
      .replace('</svg>', '</g></svg>');
    return 'data:image/svg+xml,' + encodeURIComponent(body);
  }

  window.MAOSRing = { params, svg, drawOnCanvas, faviconURI };
})();
