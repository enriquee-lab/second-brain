/**
 * Wissensgraph-Hintergrund — ein lebendiges Netz aus verknüpften Notizen.
 *
 * Rein dekorativ: eigenständiges Canvas hinter der App, ohne Einfluss auf die
 * App-Logik. Geclusterte Knoten (wie eine Graph-View) driften sanft, Kanten
 * verbinden Nachbarn, die Maus erzeugt einen leichten Parallax-Effekt.
 * Respektiert `prefers-reduced-motion` (dann statisch, keine Animation).
 */
(function () {
  const canvas = document.getElementById('bg-graph');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Farbpalette: überwiegend neutral, mit farbigen "Themen-Clustern"
  const COLORS = {
    blue: '#5b8def',
    purple: '#8b6fe0',
    red: '#e0655a',
    amber: '#e6b34e',
    green: '#4f9d78',
    grey: '#717784'
  };
  const CLUSTER_THEMES = ['blue', 'purple', 'red', 'amber', 'green', 'grey', 'blue', 'grey'];

  let W, H, dpr, nodes = [], edges = [], t = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  const rand = (a, b) => a + Math.random() * (b - a);
  // grobe Normalverteilung für organische Cluster
  const gauss = spread => ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * spread;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function hexA(hex, a) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function build() {
    nodes = [];
    edges = [];
    const count = clamp(Math.round((W * H) / 9000), 90, 240);
    const clusterCount = Math.max(5, Math.round(count / 28));
    const minWH = Math.min(W, H);

    const centers = [];
    for (let c = 0; c < clusterCount; c++) {
      centers.push({
        x: rand(W * 0.05, W * 0.95),
        y: rand(H * 0.05, H * 0.95),
        theme: CLUSTER_THEMES[c % CLUSTER_THEMES.length],
        spread: rand(minWH * 0.07, minWH * 0.15)
      });
    }

    for (let i = 0; i < count; i++) {
      const c = centers[Math.floor(Math.random() * centers.length)];
      const colorKey = Math.random() < 0.45 ? 'grey' : c.theme; // meist neutral
      const x = clamp(c.x + gauss(c.spread), 0, W);
      const y = clamp(c.y + gauss(c.spread), 0, H);
      nodes.push({
        x, y, bx: x, by: y,
        r: rand(1.1, 3.2) * (colorKey === 'grey' ? 1 : 1.15),
        color: COLORS[colorKey],
        depth: rand(0.4, 1),          // Parallax-Tiefe
        phase: rand(0, Math.PI * 2),
        amp: rand(6, 20),             // Bewegungsamplitude
        spd: rand(0.15, 0.5)
      });
    }

    // Kanten: jeder Knoten zu seinen nächsten Nachbarn innerhalb eines Radius
    const R = minWH * 0.12;
    const seen = new Set();
    for (let i = 0; i < nodes.length; i++) {
      const near = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].bx - nodes[j].bx;
        const dy = nodes[i].by - nodes[j].by;
        const d = dx * dx + dy * dy;
        if (d < R * R) near.push([d, j]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (let n = 0; n < Math.min(near.length, 3); n++) {
        const j = near[n][1];
        const key = i < j ? i + '-' + j : j + '-' + i;
        if (!seen.has(key)) { seen.add(key); edges.push([Math.min(i, j), Math.max(i, j)]); }
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (reduce) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H); // transparent -> dunkler Body-Gradient scheint durch
    const edgeMax = Math.min(W, H) * 0.14;

    for (const nd of nodes) {
      if (reduce) { nd.x = nd.bx; nd.y = nd.by; continue; }
      nd.x = nd.bx + Math.sin(t * nd.spd + nd.phase) * nd.amp + mouse.tx * nd.depth * 22;
      nd.y = nd.by + Math.cos(t * nd.spd * 0.9 + nd.phase) * nd.amp + mouse.ty * nd.depth * 22;
    }

    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const na = nodes[a], nb = nodes[b];
      const dist = Math.hypot(na.x - nb.x, na.y - nb.y);
      const alpha = 0.16 * (1 - dist / edgeMax);
      if (alpha <= 0.005) continue;
      ctx.strokeStyle = `rgba(150,165,200,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    }

    for (const nd of nodes) {
      ctx.beginPath();
      ctx.fillStyle = hexA(nd.color, 0.1);       // weicher Glow
      ctx.arc(nd.x, nd.y, nd.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = nd.color;                  // Kern
      ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    t += 0.016;
    mouse.tx += (mouse.x - mouse.tx) * 0.05;
    mouse.ty += (mouse.y - mouse.ty) * 0.05;
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  resize();
  if (!reduce) loop();
})();
