// @ts-nocheck — ported verbatim from the dragons lab prototype (v8.3); typed API lives at the bottom.
/* Dragons scene: top-down ASCII dragons with armoured backs, soft bellies, glow, wing gusts,
   clouds and fire breath, drawn on one canvas. Original code (techniques inspired by
   stackedlol/ascii-sharks, MIT — no code copied). */

export type DragonsOptions = {
  count?: number; size?: number; speed?: number; glow?: number; cell?: number;
  colorful?: boolean; clouds?: boolean; fire?: boolean; gusts?: boolean; grid?: boolean;
  shadows?: boolean; avoid?: boolean; cursor?: boolean; twins?: boolean;
  /** Element whose box is the flight area and that receives pointer events. Defaults to the canvas parent. */
  stage?: HTMLElement;
  /** Ellipse the dragons steer around, in px relative to the stage centre. */
  avoidBox?: { rx: number; ry: number };
};
export type DragonsHandle = { destroy(): void; refresh(): void; setPaused(p: boolean): void; breathe(): void; replay(): void };

export function createDragons(canvas: HTMLCanvasElement, opts: DragonsOptions = {}): DragonsHandle {
  const narrowMQ = matchMedia('(max-width: 640px)');
  const S = {
    preset: 'decode', count: 4, size: 1.15, speed: 1, glow: .5, cell: 7, twins: true, color: true, clouds: true,
    fire: true, gusts: true, grid: true, shadows: true, headline: true, cursor: true,
  };
  for (const [k, v] of Object.entries(opts)) if (v !== undefined) S[k === 'colorful' ? 'color' : k === 'avoid' ? 'headline' : k] = v;
  S.count = Math.min(5, Math.max(1, S.count | 0));
  const stage = opts.stage || canvas.parentElement;
  const cv = canvas;
  const ctx = cv.getContext('2d', { alpha: false });
  const gridCv = document.createElement('canvas');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const adiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  function hsh(x, y, z) { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x61c88647); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 13; h = Math.imul(h, 0x297a2d39); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

  // ---------- glyph presets ----------
  const PRESETS = {
    decode:    { blocks: true,  skin: ':;;=++**##', plate: '%#', edgeH: ':;', edgeL: ".'`", membrane: '·', soft: '·:', horn: '^', eye: 'o', mark: '#%', spike: '^', cloud: '.:~', fire: '@*+·', scramble: 'abcdefghjkmnpqrstuvwxyz0123456789#%&*+=?' },
    dither:    { blocks: false, skin: '░░▒▒▓▓██', plate: '█', edgeH: '▒', edgeL: '░', membrane: '░', soft: '░', horn: '▲', eye: '●', mark: '░', spike: '▲', cloud: '░▒', fire: '█▓▒░', scramble: '░▒▓█' },
    terminal:  { blocks: false, skin: '0011', plate: '1', edgeH: ':', edgeL: '.', membrane: '0', soft: '.', horn: '^', eye: 'o', mark: '0', spike: '1', cloud: '.:', fire: '#10.', scramble: '01' },
    blueprint: { blocks: false, skin: '+', plate: 'x', edgeH: '', edgeL: '', membrane: '·', soft: '·', horn: '^', eye: 'o', mark: 'x', spike: '^', cloud: '.-', fire: '*+-.', scramble: '+-x|/\\' },
  };

  // ---------- breeds ----------
  // horns: triangles in head space (u back from the snout, a out from the head's axis), fractions of body length
  const HORNS = {
    long:  [[[.04, .028], [.16, .1], [.075, .02]], [[.03, .03], [.07, .062], [.05, .028]]],
    swept: [[[.045, .022], [.19, .052], [.08, .016]]],
    curl:  [[[.045, .03], [.095, .072], [.062, .026]], [[.095, .072], [.07, .09], [.088, .062]]],
    pair:  [[[.032, .02], [.105, .064], [.058, .015]]],
    crown: [[[.04, .03], [.085, .075], [.058, .026]], [[.056, .026], [.12, .058], [.072, .02]], [[.03, .032], [.048, .08], [.044, .03]]],
  };
  const PAL = { white: [227, 228, 221], black: [37, 27, 19], green: [37, 45, 28], blue: [38, 50, 77] };
  const BREEDS = [
    { name: 'Ember', hue: 'black',    heads: 1, horns: 'long',  skin: 'spikes',  width: 1.05, wingSpan: 1.1,  dark: [255, 178, 152], light: [222, 118, 90],  eye: [255, 236, 170] },
    { name: 'Twinfang', hue: 'blue', heads: 2, horns: 'pair',  skin: 'stripes', width: 1,    wingSpan: 1,    dark: [206, 188, 255], light: [138, 112, 226], eye: [255, 170, 214] },
    { name: 'Frost', hue: 'white',    heads: 1, horns: 'swept', skin: 'scales',  width: .82,  wingSpan: 1.15, dark: [172, 216, 255], light: [86, 148, 222], eye: [240, 252, 255] },
    { name: 'Jade', hue: 'green',     heads: 1, horns: 'curl',  skin: 'spots',   width: .95,  wingSpan: .9,   dark: [170, 234, 200], light: [66, 166, 118], eye: [255, 238, 150] },
    { name: 'Gilded', hue: 'white',   heads: 2, horns: 'crown', skin: 'smooth',  width: 1.12, wingSpan: 1.05, dark: [255, 226, 160], light: [196, 150, 52], eye: [255, 128, 112] },
  ];

  let W = 1, H = 1, DPR = 1, cw = 10, ch = 14, cols = 0, rows = 0, N = 0, fontPx = 10;
  let CX = 0, CY = 0, R = 1, BASE = 1;
  let dotBase, reveal, wake, wakeTmp, shadow, dFlag, dShade, dKey, dCov, dDim, dS, dDelay, dBone, dBreed, dBel, dRim, dSheen, halo, haloSrc;
  const C = {};

  const rgbVar = (cs, k) => cs.getPropertyValue('--rgb-' + k).split(',').map((v) => +v);
  function readColors() {
    const cs = getComputedStyle(stage); // stage, so a scoped data-theme (docs preview) applies
    for (const k of ['bg', 'fg', 'skin', 'dot', 'wake', 'a1', 'a2', 'a3']) C[k] = rgbVar(cs, k);
    C.gridA = +cs.getPropertyValue('--grid-alpha') || .05;
    C.light = (C.bg[0] + C.bg[1] + C.bg[2]) / 3 > 128;
    C.accents = [C.a1, C.a2, C.a3].map((c) => `rgb(${c})`);
  }
  const mix = (a, b, t) => `rgb(${(a[0] + (b[0] - a[0]) * t) | 0},${(a[1] + (b[1] - a[1]) * t) | 0},${(a[2] + (b[2] - a[2]) * t) | 0})`;
  const mixa = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function tintOf(b) { if (!S.color) return C.skin; const c = C.light ? BREEDS[b].light : BREEDS[b].dark; return mixa(C.skin, c, .92); }
  function edgeGlyph(gx, gy) { const a = ((Math.atan2(gy, gx) * 180 / Math.PI) + 450) % 180; return a < 22.5 || a >= 157.5 ? '-' : a < 67.5 ? '\\' : a < 112.5 ? '|' : '/'; }
  function lineGlyph(dx, dy) { const a = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 180; return a < 22.5 || a >= 157.5 ? '-' : a < 67.5 ? '\\' : a < 112.5 ? '|' : '/'; }

  function build() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height); DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cw = S.cell; ch = Math.round(cw * 1.45); fontPx = Math.round(ch * .74);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch); N = cols * rows;
    BASE = Math.min(W, H * 1.25); R = BASE * .43;
    CX = W / 2; CY = narrowMQ.matches ? H * .55 : H * .5;
    dotBase = new Float32Array(N); reveal = new Float32Array(N); wake = new Float32Array(N); wakeTmp = new Float32Array(N); shadow = new Uint8Array(N);
    dFlag = new Uint8Array(N); dShade = new Float32Array(N); dKey = new Uint32Array(N); dCov = new Float32Array(N); dDim = new Float32Array(N); dS = new Float32Array(N); dDelay = new Float32Array(N); dBone = new Array(N); dBreed = new Uint8Array(N); dBel = new Float32Array(N); dRim = new Float32Array(N); dSheen = new Float32Array(N); halo = new Uint8Array(N); haloSrc = new Int32Array(N);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = (c + .5) * cw, y = (r + .5) * ch;
      // a quiet night sky: sparse dots, a few brighter "stars"
      const h = hsh(c, r, 11);
      dotBase[i] = h > .985 ? .9 : h > .93 ? .45 : .12 + .1 * hsh(c, r, 3);
      reveal[i] = Math.hypot(x - CX, y - CY) / (Math.max(W, H) * .6);
    }
    paintGrid();
  }
  function paintGrid() {
    gridCv.width = cv.width; gridCv.height = cv.height;
    const g = gridCv.getContext('2d');
    g.fillStyle = `rgb(${C.bg})`; g.fillRect(0, 0, gridCv.width, gridCv.height);
    if (!S.grid) return;
    g.strokeStyle = `rgba(${C.fg},${C.gridA})`; g.lineWidth = 1; g.beginPath();
    for (let c = 0; c <= cols; c++) { const x = Math.round(c * cw * DPR) + .5; g.moveTo(x, 0); g.lineTo(x, gridCv.height); }
    for (let r = 0; r <= rows; r++) { const y = Math.round(r * ch * DPR) + .5; g.moveTo(0, y); g.lineTo(gridCv.width, y); }
    g.stroke();
  }

  // ---------- dragons ----------
  const NODES = 26;
  let dragons = [];
  function breedFor(i) { let b = [0, 1, 2, 3, 4][i]; if (!S.twins && BREEDS[b].heads === 2) b = b === 1 ? 2 : 3; return b; }
  function seed() {
    dragons = [];
    const n = S.count;
    for (let i = 0; i < n; i++) {
      const breed = breedFor(i);
      const L = BASE * .34 * S.size * [1, .9, .86, .8, .94][i];
      const a = (i / n) * TAU + rnd(-.3, .3), orbit = R * [1.0, 1.14, .92, 1.26, 1.08][i];
      const x = CX + Math.cos(a) * orbit, y = CY + Math.sin(a) * orbit * .9, heading = a + Math.PI / 2;
      const nodes = new Float32Array(NODES * 2), seg = L / (NODES - 1);
      for (let k = 0; k < NODES; k++) { nodes[k * 2] = x - Math.cos(heading) * seg * k; nodes[k * 2 + 1] = y - Math.sin(heading) * seg * k; }
      dragons.push({ id: i + 1, breed, L, nodes, heading, speed: 40, turn: 0, wander: 0, orbit, flap: rnd(0, TAU), state: 'flap', beats: 3, glide: 0, alt: rnd(.6, 1), altPh: rnd(0, TAU), wave: rnd(0, TAU), delay: .15 + i * .3 });
    }
  }

  function stepDragons(dt, t) {
    const sp = S.speed;
    for (const d of dragons) {
      const L = d.L, n = d.nodes, hx = n[0], hy = n[1];
      let dx = Math.cos(d.heading), dy = Math.sin(d.heading);
      d.wander = clamp(d.wander + (Math.random() - .5) * dt * 2.4, -.9, .9);
      dx += Math.cos(d.heading + d.wander) * .35; dy += Math.sin(d.heading + d.wander) * .35;
      const rx = hx - CX, ry = (hy - CY) / .9, r = Math.hypot(rx, ry) || 1;
      const target = d.orbit * (1 + .14 * Math.sin(t * .06 * sp + d.id * 2));
      const radial = clamp((target - r) / target, -1, 1);
      dx += (-ry / r + rx / r * radial * 1.1) * .7; dy += (rx / r + ry / r * radial * 1.1) * .7;
      for (const o of dragons) { if (o === d) continue; for (let k = 0; k < NODES; k += 5) { const ox = hx - o.nodes[k * 2], oy = hy - o.nodes[k * 2 + 1], dd = Math.hypot(ox, oy), range = (L + o.L) * .42; if (dd < range && dd > 1e-3) { const w = (1 - dd / range) * 2.6; dx += ox / dd * w; dy += oy / dd * w; } } }
      if (S.headline) { const ex = (hx - W / 2) / (W < 640 ? W * .5 : Math.min(380, W * .32)), ey = (hy - H / 2) / Math.min(190, H * .22), e2 = ex * ex + ey * ey; if (e2 < 1) { const e = Math.sqrt(e2) || 1e-3, w = (1 - e) * 3; dx += ex / e * w; dy += ey / e * w; } }
      if (S.cursor && ptr.on) { const ox = hx - ptr.x, oy = hy - ptr.y, dd = Math.hypot(ox, oy), pr = 170; if (dd < pr && dd > 1e-3) { const w = (1 - dd / pr) ** 2 * 5; dx += ox / dd * w; dy += oy / dd * w; } }
      const over = Math.max(-hx, hx - W, -hy, hy - H); if (over > -L * .1) { const w = clamp((over + L * .1) / (L * .4), 0, 1) * 3.5, tx = CX - hx, ty = CY - hy, dd = Math.hypot(tx, ty) || 1; dx += tx / dd * w; dy += ty / dd * w; }
      const desired = Math.atan2(dy, dx);
      const isBreathing = breathing && breathing.d === d;
      const agility = Math.min(1.1, d.speed / (L * .2)) * (isBreathing ? .2 : 1);
      const turned = clamp(adiff(d.heading, desired), -agility * dt, agility * dt);
      d.heading += turned; d.turn += (turned / dt - d.turn) * Math.min(1, dt * 2.5);
      const cruise = (34 + L * .05) * sp;
      if (d.state === 'flap') {
        const before = d.flap; d.flap += dt * 7.6 * Math.min(1.4, sp);
        if (S.gusts && introT > d.delay + 1.2 && Math.floor((before - 2.1) / TAU) !== Math.floor((d.flap - 2.1) / TAU)) emitGusts(d);
        if (Math.floor(before / TAU) !== Math.floor(d.flap / TAU)) { d.beats--; if (d.beats <= 0) { d.state = 'glide'; d.glide = rnd(1.8, 3.8) / Math.max(.5, sp); } }
        d.speed += (cruise * 1.15 + 26 * Math.max(0, Math.sin(d.flap)) * sp - d.speed) * Math.min(1, dt * 2.2);
      } else {
        const tgt = Math.round(d.flap / TAU) * TAU; d.flap += (tgt - d.flap) * Math.min(1, dt * 3);
        d.glide -= dt; if (d.glide <= 0) { d.state = 'flap'; d.beats = 2 + (Math.random() * 3 | 0); }
        d.speed += (cruise * .85 - d.speed) * Math.min(1, dt * .8);
      }
      if (isBreathing) { d.state = 'glide'; d.glide = Math.max(d.glide, .6); d.speed += (cruise * .5 - d.speed) * Math.min(1, dt * 3); }
      d.alt = .74 + .2 * Math.sin(t * .23 * sp + d.altPh) + (d.state === 'flap' ? .06 * Math.sin(d.flap) : 0);
      d.wave += dt * (1.1 + d.speed / 90);
      n[0] += Math.cos(d.heading) * d.speed * dt; n[1] += Math.sin(d.heading) * d.speed * dt;
      const seg = L / (NODES - 1); let prev = d.heading + Math.PI;
      for (let k = 1; k < NODES; k++) {
        const px = n[(k - 1) * 2], py = n[(k - 1) * 2 + 1];
        let a = Math.atan2(n[k * 2 + 1] - py, n[k * 2] - px); const lim = k < 11 ? .045 : .1; a = prev + clamp(adiff(prev, a), -lim, lim);
        n[k * 2] = px + Math.cos(a) * seg; n[k * 2 + 1] = py + Math.sin(a) * seg; prev = a;
      }
      if (d.state === 'flap') { const nx = -Math.sin(d.heading), ny = Math.cos(d.heading); for (const sgn of [1, -1]) deposit(n[16] + nx * sgn * L * .42, n[17] + ny * sgn * L * .42, .05); }
    }
  }

  // body half-width (fraction of length), snout → tail
  function hwOf(s, wm) {
    let v;
    if (s < .06) v = .05 * Math.pow(Math.sin((s / .06) * Math.PI / 2), .6);
    else if (s < .12) v = .05 - .016 * smooth(.06, .12, s);
    else if (s < .45) v = .034 + .06 * Math.pow(Math.max(0, Math.sin(Math.PI * (s - .17) / .28)), .8);
    else v = .034 * Math.pow(1 - (s - .45) / .55, 1.05) + .006;
    return v * wm;
  }
  // a twin head: narrower head, longer neck
  function hwTwin(s) { return s < .06 ? .044 * Math.pow(Math.sin((s / .06) * Math.PI / 2), .6) : .026 + .018 * (1 - smooth(.06, .1, s)); }
  function scallop(out, a, b, ctl) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, kx = mx + (ctl[0] - mx) * .32, ky = my + (ctl[1] - my) * .32; for (let j = 1; j < 6; j++) { const t = j / 6; out.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * kx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ky + t * t * b[1]]); } }
  function wing(sp, sw, L) {
    const P0 = [.21, .085], wr = [.15 - .035 * sw, .21 * sp], F1 = [.27 + .05 * sw, .48 * sp], F2 = [.4 + .025 * sw, .39 * sp], F3 = [.49, .26 * sp], RR = [.43, .06];
    const poly = [P0, wr, F1]; scallop(poly, F1, F2, wr); poly.push(F2); scallop(poly, F2, F3, wr); poly.push(F3); scallop(poly, F3, RR, wr); poly.push(RR);
    const sc = (p) => [p[0] * L, p[1] * L];
    return { poly: poly.map(sc), bones: [[P0, wr], [wr, F1], [wr, F2], [wr, F3]].map(([a, b]) => [sc(a), sc(b)]), reach: .5 * L * sp };
  }
  const inPoly = (x, y, P) => { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
  const segDist = (px, py, a, b) => { const sx = b[0] - a[0], sy = b[1] - a[1], u = clamp(((px - a[0]) * sx + (py - a[1]) * sy) / (sx * sx + sy * sy || 1), 0, 1); return Math.hypot(px - a[0] - sx * u, py - a[1] - sy * u); };
  const inTri = (px, py, a, b, c) => { const d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1]), d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1]), d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };

  const F = { BODY: 1, PLATE: 2, HEAD: 3, EYE: 4, HORN: 5, MEMBRANE: 6, BONE: 7, EDGE: 8, MARK: 9, SPIKE: 10, SCALE: 11 };
  const spine = new Float32Array(NODES * 2), arc = new Float32Array(NODES);
  let arcTot = 1, curL = 1, curB = BREEDS[0], curWave = 0, wingR = null, wingL = null;
  const hit = { f: 0, shade: 0, s: 0, v: 0, dist: 0, g: '', sg: '', bel: 0, rim: 0 };
  let curBank = 0;

  function hornHit(u, aa, L, set) { for (const tr of HORNS[set]) if (inTri(u, aa, [tr[0][0] * L, tr[0][1] * L], [tr[1][0] * L, tr[1][1] * L], [tr[2][0] * L, tr[2][1] * L])) return true; return false; }
  function headShade(f, across, facing, s, near) { let shade = .6 - across * across * .38 + facing * .26; if (s < .06) shade += .1; return clamp(shade, 0, 1); }

  function sample(px, py) {
    let bk = 0, bd = Infinity;
    for (let k = 0; k < NODES; k += 3) { const d2 = (px - spine[k * 2]) ** 2 + (py - spine[k * 2 + 1]) ** 2; if (d2 < bd) { bd = d2; bk = k; } }
    let best = Infinity, bs = 0, sign = 1, nx = 0, ny = 0, tx = 1, ty = 0;
    for (let k = Math.max(0, bk - 4); k < Math.min(NODES - 1, bk + 4); k++) {
      const ax = spine[k * 2], ay = spine[k * 2 + 1], sx = spine[k * 2 + 2] - ax, sy = spine[k * 2 + 3] - ay, l2 = sx * sx + sy * sy || 1;
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / l2, 0, 1), qx = ax + sx * u, qy = ay + sy * u, d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) { best = d2; const l = Math.sqrt(l2); bs = (arc[k] + u * l) / arcTot; sign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1; nx = -sy / l * sign; ny = sx / l * sign; tx = sx / l; ty = sy / l; }
    }
    const a = Math.sqrt(best), s = bs, L = curL, u = s * L, B = curB;
    hit.dist = a; hit.s = s; hit.v = a * sign; hit.bel = 0; hit.rim = 0;
    // pale soft skin on the flanks; banking rolls more of it into view on the outer side
    const thr = clamp(.72 + curBank * sign * 1.1, .42, .94);
    // ----- heads -----
    if (B.heads === 2 && s < .2) {
      const base = .09 * L * Math.pow(1 - s / .2, .7);
      const offA = base * (1 + .14 * Math.sin(curWave * 1.3)), offB = base * (1 + .14 * Math.sin(curWave * 1.3 + Math.PI));
      const v = a * sign, dA = Math.abs(v - offA), dB = Math.abs(v + offB), aa = Math.min(dA, dB);
      if (s < .14 && hornHit(u, aa, L, B.horns)) { hit.f = F.HORN; hit.shade = .85; return true; }
      const hw = hwTwin(s) * L * B.width;
      if (aa <= hw) {
        const across = aa / (hw || 1), facing = (nx * -.6 + ny * -.8) * across;
        hit.shade = headShade(0, across, facing, s); hit.f = s < .06 ? F.HEAD : F.BODY; hit.bel = smooth(.6, .8, across); hit.rim = facing;
        if (s > .02 && s < .045 && across > .36 && across < .86) { hit.f = F.EYE; hit.shade = 0; }
        return true;
      }
    } else {
      if (s < .14 && hornHit(u, a, L, B.horns)) { hit.f = F.HORN; hit.shade = .85; return true; }
    }
    const hw = hwOf(s, B.width) * L;
    if (!(B.heads === 2 && s < .2) && a <= hw) {
      const across = a / (hw || 1), facing = (nx * -.6 + ny * -.8) * across;
      let shade = .6 - across * across * .38 + facing * .26, f = F.BODY;
      hit.bel = s < .07 ? smooth(.7, .88, across) : smooth(thr - .08, thr + .08, across); hit.rim = facing;
      const back = across < thr - .06;
      if (s < .07) { f = F.HEAD; shade += .1; if (s > .022 && s < .046 && across > .4 && across < .85) { f = F.EYE; shade = 0; } }
      else if (B.skin !== 'stripes' && B.skin !== 'scales' && s > .1 && s < .62 && across < .3 && Math.floor(s * 48) % 2 === 0) { f = F.PLATE; shade = (s * 48) % 1 < .5 ? 1 : .7; }
      else if (s > .1 && s < .97) {
        const v = a * sign;
        if (!back) { /* soft belly skin: no pattern */ }
        else if (B.skin === 'stripes') { if ( Math.sin(s * TAU * 13 + .6 * Math.sin(v / L * 30)) > .4) f = F.MARK; }
        else if (B.skin === 'spots') { const gu = s / .045, gv = v / (L * .035), cu = Math.floor(gu), cv = Math.floor(gv), jx = hsh(cu, cv, 41) * .5 + .25, jy = hsh(cu, cv, 43) * .5 + .25; if ((gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < .1) f = F.MARK; }
        else if (B.skin === 'scales') { const gu = Math.floor(s * L / (cw * 1.2)), gv = Math.floor((v + L) / (ch * .75)); f = F.SCALE; hit.sg = (gu + gv) % 2 ? '<' : '>'; shade += .05; }
        else if (s >= .62 && across < .25 && Math.floor(s * 40) % 3 === 0) shade = Math.max(shade, .78);
      }
      hit.f = f; hit.shade = clamp(shade, 0, 1); return true;
    }
    if (B.heads === 2 && s >= .17 && a <= hw) { hit.f = F.BODY; hit.shade = .6; return true; }
    if (B.skin === 'spikes' && s > .1 && s < .9) { const per = .05, ph = (s % per) / per, len = L * .042 * (1 - Math.abs(2 * ph - 1)) * (s < .45 ? 1 : 1 - (s - .45) / .5); if (a > hw && a < hw + len) { hit.f = F.SPIKE; hit.shade = .95; return true; } }
    if (s > .925) { const k = (s - .925) / .075, hwS = .06 * L * Math.sin(Math.PI * Math.min(1, k * 1.15)); if (a < hwS) { hit.f = F.BODY; hit.shade = .5; return true; } }
    if (s > .08 && s < .62) {
      const w = sign > 0 ? wingR : wingL; if (a > w.reach + cw) return false;
      const bw = Math.max(curL * .011, cw * .32);
      for (const [p, q] of w.bones) if (segDist(u, a, p, q) < bw) { const du = q[0] - p[0], dv = q[1] - p[1]; hit.f = F.BONE; hit.shade = .88; hit.g = lineGlyph(du * tx + dv * nx, du * ty + dv * ny); return true; }
      if (inPoly(u, a, w.poly)) { let nb = Infinity; for (const [p, q] of w.bones) nb = Math.min(nb, segDist(u, a, p, q)); hit.f = F.MEMBRANE; hit.shade = .25 + .5 * Math.exp(-nb / (curL * .05)); return true; }
    }
    return false;
  }

  const SUB = [.25, .28, .75, .28, .25, .72, .75, .72];
  function rasterise(t) {
    dFlag.fill(0); dCov.fill(0); shadow.fill(0);
    const order = dragons.slice().sort((a, b) => a.alt - b.alt);
    for (const d of order) {
      const L = d.L * (.9 + .14 * d.alt), n = d.nodes; curL = L; curB = BREEDS[d.breed]; curWave = d.wave;
      for (let k = 0; k < NODES; k++) {
        const s = k / (NODES - 1), a = Math.max(0, k - 1), b = Math.min(NODES - 1, k + 1);
        let tx = n[a * 2] - n[b * 2], ty = n[a * 2 + 1] - n[b * 2 + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const off = L * .016 * Math.pow(Math.max(0, s - .45) / .55, 1.6) * Math.sin(d.wave - s * 3);
        spine[k * 2] = n[k * 2] - ty * off; spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
      }
      arc[0] = 0; for (let k = 1; k < NODES; k++) arc[k] = arc[k - 1] + Math.hypot(spine[k * 2] - spine[k * 2 - 2], spine[k * 2 + 1] - spine[k * 2 - 1]); arcTot = arc[NODES - 1] || 1;
      const st = d.state === 'flap' ? Math.cos(d.flap + .5 * Math.sin(d.flap)) : 1 - .04 * (1 + Math.sin(t * 1.3 + d.id));
      const spread = (.34 + .66 * (.5 + .5 * st)) * curB.wingSpan, sweep = (1 - st) * 1.15, bank = clamp(d.turn * .45, -.3, .3); curBank = bank;
      const sheenS = ((t * .16 + d.id * .37) % 1.5) - .25;
      wingR = wing(spread * (1 - bank), sweep, L); wingL = wing(spread * (1 + bank), sweep, L);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let k = 0; k < NODES; k++) { x0 = Math.min(x0, spine[k * 2]); x1 = Math.max(x1, spine[k * 2]); y0 = Math.min(y0, spine[k * 2 + 1]); y1 = Math.max(y1, spine[k * 2 + 1]); }
      const reach = L * .6;
      const c0 = Math.max(0, Math.floor((x0 - reach) / cw)), c1 = Math.min(cols - 1, Math.floor((x1 + reach) / cw));
      const r0 = Math.max(0, Math.floor((y0 - reach) / ch)), r1 = Math.min(rows - 1, Math.floor((y1 + reach) / ch));
      const dim = .66 + .34 * d.alt;
      // shadow far below: shrunk toward the dragon's centre and cast down-right, smaller and further away the higher it flies
      let dcx = 0, dcy = 0; for (let k = 0; k < NODES; k++) { dcx += spine[k * 2]; dcy += spine[k * 2 + 1]; } dcx /= NODES; dcy /= NODES;
      const shK = .5 - .16 * d.alt, shX = L * (.28 + .3 * d.alt), shY = L * (.22 + .26 * d.alt);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const x = c * cw, y = r * ch;
        const centre = sample(x + cw / 2, y + ch / 2);
        if (!centre && hit.dist > reach + cw * 2) continue;
        const f = hit.f, shade = hit.shade, s = hit.s, v = hit.v, bg = f === F.SCALE ? hit.sg : hit.g, bel = hit.bel, rim = hit.rim;
        let hits = centre ? 1 : 0;
        for (let k = 0; k < 8; k += 2) if (sample(x + SUB[k] * cw, y + SUB[k + 1] * ch)) hits++;
        if (!hits) continue;
        const i = r * cols + c, cov = hits / 5;
        dKey[i] = (hsh(Math.round(s * 64), Math.round(v / (cw * .85)), d.id) * 4294967295) >>> 0;
        dDim[i] = dim; dS[i] = s; dDelay[i] = d.delay; dCov[i] = cov; dBreed[i] = d.breed;
        dBel[i] = bel; dRim[i] = rim; dSheen[i] = Math.exp(-(((s - sheenS) / .035) ** 2)) * (1 - bel);
        if (centre && cov >= .6) { dFlag[i] = f; dBone[i] = f === F.BONE || f === F.SCALE ? bg : ''; dShade[i] = clamp(shade + (hsh(c, r, Math.floor(t * 5)) - .5) * .05, 0, 1); const sc = Math.floor((dcx + ((c + .5) * cw - dcx) * shK + shX) / cw), sr = Math.floor((dcy + ((r + .5) * ch - dcy) * shK + shY) / ch); if (sc >= 0 && sr >= 0 && sc < cols && sr < rows) shadow[sr * cols + sc] = 1; }
        else { dFlag[i] = F.EDGE; dShade[i] = cov; }
      }
    }
  }

  // ---------- sparks + wake ----------
  const sparks = [];
  function deposit(x, y, amt) { const c = Math.floor(x / cw), r = Math.floor(y / ch); if (c >= 0 && r >= 0 && c < cols && r < rows) { const i = r * cols + c; wake[i] = Math.min(1.5, wake[i] + amt); } }
  function burst(x, y, k) { for (let j = 0; j < k; j++) { const a = rnd(0, TAU), v = rnd(40, 150); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rnd(.7, 1.8), c: j % 3 }); } for (let r = -3; r <= 3; r++) for (let c = -4; c <= 4; c++) deposit(x + c * cw, y + r * ch, .55 * Math.max(0, 1 - Math.hypot(c / 4, r / 3) / 1.4)); }
  // ---------- wing gusts: a small curl of air shed off each wingtip at the end of the downstroke ----------
  const gusts = [];
  function emitGusts(d) {
    const n = d.nodes, k = Math.round(.3 * (NODES - 1)), hx = Math.cos(d.heading), hy = Math.sin(d.heading), nx = -hy, ny = hx;
    const reach = .4 * d.L * BREEDS[d.breed].wingSpan, sc = clamp(d.L / 340, .6, 1.4);
    for (const side of [1, -1]) {
      if (gusts.length > 40) break;
      const x = n[k * 2] + nx * side * reach * 1.12 - hx * d.L * .1, y = n[k * 2 + 1] + ny * side * reach * 1.12 - hy * d.L * .1;
      const dir = Math.atan2(-hy + ny * side * .55, -hx + nx * side * .55);   // backward and outward
      gusts.push({ x, y, dir, v: rnd(70, 100) * sc, age: 0, life: rnd(.8, 1.1), r0: 6 * sc, r1: 34 * sc, side, a: .5 + .2 * d.alt });
    }
  }
  function stepGusts(dt) { for (let j = gusts.length - 1; j >= 0; j--) { const g = gusts[j]; g.age += dt; if (g.age > g.life) { gusts.splice(j, 1); continue; } const sl = Math.exp(-g.age * 2.6); g.x += Math.cos(g.dir) * g.v * sl * dt; g.y += Math.sin(g.dir) * g.v * sl * dt; } }
  function drawGusts() {
    if (!gusts.length) return;
    const seen = new Set();
    for (const g of gusts) {
      const u = g.age / g.life, r = g.r0 + (g.r1 - g.r0) * (1 - Math.pow(1 - u, 2)), a = g.a * Math.pow(1 - u, 1.4) * Math.min(1, u * 8);
      for (const [rk, ak, lag] of [[1, 1, 0], [.58, .7, .12]]) {
      if (u < lag) continue; const R = r * rk;
      const span = .5 + .9 * u, steps = Math.max(3, Math.round(R * span * 2 / cw));
      for (let q = 0; q <= steps; q++) {
        const th = g.dir + (q / steps - .5) * 2 * span * g.side, px = g.x + Math.cos(th) * R - Math.cos(g.dir) * r, py = g.y + Math.sin(th) * R - Math.sin(g.dir) * r;
        const c = Math.floor(px / cw), rr = Math.floor(py / ch); if (c < 0 || rr < 0 || c >= cols || rr >= rows) continue;
        const i = rr * cols + c; if (seen.has(i) || (dFlag[i] && dFlag[i] !== F.EDGE)) continue; seen.add(i);
        const end = Math.abs(q / steps - .5) * 2, lg = lineGlyph(-Math.sin(th), Math.cos(th)), gl = end > .8 ? (u < .5 ? "'" : '·') : lg === '|' ? (Math.cos(th - g.dir) * Math.cos(g.dir) > 0 ? ')' : '(') : lg === '-' ? '~' : lg;
        ctx.fillStyle = `rgba(${C.fg},${a * ak * (1 - .5 * end)})`; ctx.fillText(gl, c * cw + cw / 2, rr * ch + ch / 2 + 1);
      }
      }
    }
  }
  // ---------- fire breath ----------
  const flames = []; let breathing = null, nextBreath = 4;
  function mouths(d) {
    const n = d.nodes, dir = d.heading, fx = Math.cos(dir), fy = Math.sin(dir), nx = -fy, ny = fx, L = d.L;
    if (BREEDS[d.breed].heads === 2) { const o = .09 * L; return [[n[0] + nx * o + fx * L * .012, n[1] + ny * o + fy * L * .012], [n[0] - nx * o + fx * L * .012, n[1] - ny * o + fy * L * .012]]; }
    return [[n[0] + fx * L * .018, n[1] + fy * L * .018]];
  }
  function okToBreathe(d) {
    const reach = d.L * .7, hx = d.nodes[0], hy = d.nodes[1], ex = hx + Math.cos(d.heading) * reach, ey = hy + Math.sin(d.heading) * reach;
    const on = (x, y, m) => x > m && y > m && x < W - m && y < H - m;
    if (!on(hx, hy, 20) || !on(ex, ey, -40)) return false;
    if (S.headline) { const ax = W < 640 ? W * .55 : Math.min(420, W * .36), ay = Math.min(220, H * .26); for (const k of [.35, .7, 1]) { const x = hx + (ex - hx) * k, y = hy + (ey - hy) * k; if (((x - W / 2) / ax) ** 2 + ((y - H / 2) / ay) ** 2 < 1) return false; } }
    return true;
  }
  function stepFire(dt) {
    if (S.fire && !breathing) {
      nextBreath -= dt;
      if (nextBreath <= 0) { const cand = dragons.filter(okToBreathe); if (cand.length) { const d = cand[Math.random() * cand.length | 0]; breathing = { d, t: 0, dur: rnd(.9, 1.4), both: Math.random() < .6 }; } else nextBreath = .8; }
    }
    if (breathing) {
      const b = breathing, d = b.d; b.t += dt;
      const ms = mouths(d), use = ms.length === 2 && !b.both ? [ms[(b.t * 1.6 | 0) % 2]] : ms;
      const ramp = Math.min(1, b.t / .15) * clamp((b.dur - b.t) / .25, 0, 1), scale = clamp(d.L / 340, .6, 1.4);
      for (const m of use) {
        let k = dt * 140 * ramp; while (k > 0) { if (k < 1 && Math.random() > k) break; k -= 1;
          const a = d.heading + rnd(-.28, .28) * (.5 + .5 * Math.random()), v = rnd(200, 330) * scale;
          flames.push({ x: m[0], y: m[1], vx: Math.cos(a) * v + Math.cos(d.heading) * d.speed, vy: Math.sin(a) * v + Math.sin(d.heading) * d.speed, age: 0, life: rnd(.45, .85), seed: Math.random() * 1e6 | 0 }); }
      }
      if (b.t > b.dur) { breathing = null; nextBreath = rnd(15, 25) / Math.max(.5, S.speed); }
    }
    for (let j = flames.length - 1; j >= 0; j--) { const f = flames[j]; f.age += dt; if (f.age > f.life) { flames.splice(j, 1); continue; } const drag = Math.exp(-dt * 2.4); f.vx *= drag; f.vy *= drag; f.x += f.vx * dt; f.y += f.vy * dt; }
  }

  // ---------- clouds + wind ----------
  let cloudD = new Float32Array(0); const clouds = [], wisps = [];
  function makeCloud(x0) {
    const sc = rnd(.65, 1.2) * clamp(BASE / 1000, .55, 1.1), blobs = [], n = 3 + (Math.random() * 3 | 0);
    for (let k = 0; k < n; k++) blobs.push({ x: rnd(-50, 50) * sc, y: rnd(-12, 12) * sc, rx: rnd(26, 48) * sc, ry: rnd(16, 26) * sc });
    return { x: x0 ?? -180 * sc, y: rnd(.06, .94) * H, v: rnd(9, 20), blobs, a: rnd(.55, 1) };
  }
  function seedClouds() { clouds.length = 0; wisps.length = 0; const n = W < 640 ? 3 : 5; for (let k = 0; k < n; k++) clouds.push(makeCloud(rnd(-60, W))); }
  function stepClouds(dt) {
    for (let k = 0; k < clouds.length; k++) { const cl = clouds[k]; cl.x += cl.v * S.speed * dt; if (cl.x - 220 > W) clouds[k] = makeCloud(); }
    if (Math.random() < dt * .7) wisps.push({ x: -20, y: rnd(.05, .95) * H, v: rnd(70, 120), len: 3 + (Math.random() * 5 | 0), age: 0, life: rnd(2.5, 4.5), ph: rnd(0, TAU) });
    for (let k = wisps.length - 1; k >= 0; k--) { const w = wisps[k]; w.age += dt; w.x += w.v * S.speed * dt; if (w.age > w.life || w.x - w.len * cw > W) wisps.splice(k, 1); }
  }
  function rasteriseClouds() {
    if (cloudD.length !== N) cloudD = new Float32Array(N); else cloudD.fill(0);
    for (const cl of clouds) for (const b of cl.blobs) {
      const bx = cl.x + b.x, by = cl.y + b.y;
      const c0 = Math.max(0, Math.floor((bx - b.rx) / cw)), c1 = Math.min(cols - 1, Math.floor((bx + b.rx) / cw));
      const r0 = Math.max(0, Math.floor((by - b.ry) / ch)), r1 = Math.min(rows - 1, Math.floor((by + b.ry) / ch));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const dx = ((c + .5) * cw - bx) / b.rx, dy = ((r + .5) * ch - by) / b.ry, d = 1 - (dx * dx + dy * dy); if (d > 0) { const i = r * cols + c, v = Math.min(1, d * 1.4) * cl.a; if (v > cloudD[i]) cloudD[i] = v; } }
    }
  }
  function stepSparks(dt) { for (let j = sparks.length - 1; j >= 0; j--) { const e = sparks[j]; e.age += dt; if (e.age > e.life) { sparks.splice(j, 1); continue; } e.vx *= Math.exp(-dt * 1.6); e.vy *= Math.exp(-dt * 1.6); e.x += e.vx * dt; e.y += e.vy * dt; } }
  function diffuse(dt) {
    const dec = Math.exp(-dt * 1.4);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c, e = wake[i]; wakeTmp[i] = (e * 4 + (c ? wake[i - 1] : e) + (c < cols - 1 ? wake[i + 1] : e) + (r ? wake[i - cols] : e) + (r < rows - 1 ? wake[i + cols] : e)) * .125 * dec; }
    const tmp = wake; wake = wakeTmp; wakeTmp = tmp;
  }

  // ---------- draw ----------
  const DOT_LV = 6;
  function draw(t) {
    const P = PRESETS[S.preset];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(gridCv, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const intro = introT;
    // dragon shadows: the grid disappears under them
    if (S.shadows) {
      ctx.fillStyle = C.light ? `rgba(${C.fg},.07)` : `rgb(${C.bg})`;
      for (let i = 0; i < N; i++) if (shadow[i]) { const c = i % cols, r = (i / cols) | 0; ctx.fillRect(c * cw, r * ch, cw + 1, ch + 1); }
      if (!C.light) {
        // a near-black sky can't get darker, so dark mode draws the shadow as a soft hatch
        ctx.font = `600 ${fontPx}px "Geist Mono", ui-monospace, Menlo, Consolas, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(${C.fg},.22)`;
        for (let i = 0; i < N; i++) if (shadow[i]) { const c = i % cols, r = (i / cols) | 0; ctx.fillText((c + r) % 2 ? '/' : '·', c * cw + cw / 2, r * ch + ch / 2 + 1); }
      }
    }
    ctx.font = `600 ${fontPx}px "Geist Mono", ui-monospace, Menlo, Consolas, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // clouds + wind
    if (S.clouds) {
      const fade = clamp(intro / 1.2, 0, 1), set = P.cloud;
      for (let i = 0; i < N; i++) {
        const d = cloudD[i]; if (d < .1 || (dFlag[i] && dFlag[i] !== F.EDGE)) continue;
        const c = i % cols, r = (i / cols) | 0;
        const k = Math.min(set.length - 1, ((d - .1) / .9 * set.length) | 0);
        ctx.fillStyle = `rgba(${C.fg},${(.1 + .26 * d) * fade * (shadow[i] && S.shadows ? .45 : 1)})`;
        ctx.fillText(set[k], c * cw + cw / 2, r * ch + ch / 2 + 1);
      }
      for (const w of wisps) {
        const u = w.age / w.life, a = Math.sin(Math.PI * u) * .3 * fade;
        for (let j = 0; j < w.len; j++) {
          const x = w.x - j * cw, edge = 1 - Math.abs(j / (w.len - 1) * 2 - 1) * .7;
          const c = Math.floor(x / cw), r = Math.floor((w.y + Math.sin(x * .02 + w.ph) * ch * .6) / ch);
          if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
          ctx.fillStyle = `rgba(${C.fg},${a * edge})`; ctx.fillText(j % 3 === 1 ? '~' : '-', c * cw + cw / 2, r * ch + ch / 2 + 1);
        }
      }
    }
    drawGusts();
    for (const e of sparks) { const u = e.age / e.life; ctx.globalAlpha = 1 - u; ctx.fillStyle = C.accents[e.c]; ctx.fillText(u < .35 ? '*' : u < .7 ? '+' : '·', Math.floor(e.x / cw) * cw + cw / 2, Math.floor(e.y / ch) * ch + ch / 2 + 1); }
    ctx.globalAlpha = 1;
    // Dragon palette: white E3E4DD, black 251B13, green 252D1C, blue 26324D.
    // Each dragon gets a base colour plus an opposite "ink" (white on dark dragons, black on the white one),
    // and the outline always contrasts with the page, so every dragon reads in both themes.
    const term = S.preset === 'terminal', phos = C.light ? [18, 128, 66] : [150, 255, 186];
    const lum = (c) => (.2126 * c[0] + .7152 * c[1] + .0722 * c[2]) / 255;
    const looks = BREEDS.map((B) => {
      if (term) return { base: phos, ink: C.light ? [8, 90, 40] : [220, 255, 230], edge: phos };
      let base = S.color ? PAL[B.hue] : (C.light ? PAL.black : PAL.white);
      const dark = lum(base) < .5, ink = dark ? PAL.white : PAL.black;
      if (!C.light && dark) base = mixa(base, PAL.white, .08);   // lift dark hides off a near-black sky
      if (C.light && !dark) base = mixa(base, PAL.black, .05);   // and the white one off a light page
      const edge = C.light ? (dark ? base : mixa(base, PAL.black, .6)) : (dark ? mixa(base, PAL.white, .55) : base);
      // five-step ramp: deep shadow · armour · mid · soft belly · highlight
      const W = PAL.white, K = [8, 6, 4];
      const tone = dark
        ? (C.light ? [mixa(base, K, .4), base, mixa(base, W, .16), mixa(base, W, .4), mixa(base, W, .64)]
                   : [mixa(base, K, .38), base, mixa(base, W, .2), mixa(base, W, .56), mixa(base, W, .84)])
        : [mixa(base, PAL.black, .5), mixa(mixa(base, PAL.blue, .26), PAL.black, .12), mixa(base, PAL.blue, .12), base, mixa(base, [255, 255, 250], .7)];
      const glow = C.light ? (dark ? tone[2] : tone[1]) : (dark ? tone[4] : tone[3]);
      return { base, ink, edge, dark, tone, glow };
    });
    // soft halo: two rings of faint glow just outside each body (wings excluded so it hugs the silhouette)
    halo.fill(0);
    for (let i = 0; i < N; i++) {
      const f = dFlag[i]; if (!f || f === F.MEMBRANE || f === F.BONE || f === F.EDGE) continue;
      const c = i % cols, r = (i / cols) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const cc = c + dx, rr = r + dy; if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue; const j = rr * cols + cc; if ((!dFlag[j] || dFlag[j] === F.EDGE) && halo[j] !== 1) { halo[j] = 1; haloSrc[j] = i; } }
    }
    for (let i = 0; i < N; i++) {
      if (halo[i] !== 1) continue; const c = i % cols, r = (i / cols) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const cc = c + dx, rr = r + dy; if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue; const j = rr * cols + cc; if (!dFlag[j] && !halo[j]) { halo[j] = 2; haloSrc[j] = haloSrc[i]; } }
    }
    {
      const gk = S.glow ?? 1, a1 = (term ? .08 : C.light ? .085 : .12) * gk, a2 = (term ? .03 : C.light ? .03 : .045) * gk;
      if (gk > 0)
      for (let i = 0; i < N; i++) {
        const h = halo[i]; if (!h) continue; const src = haloSrc[i];
        const k = clamp((intro - dDelay[src] - dS[src] * .9) / .4, 0, 1); if (!k) continue;
        const g = looks[dBreed[src]].glow, a = (h === 1 ? a1 : a2) * k * (.6 + .4 * dDim[src]);
        ctx.fillStyle = `rgba(${g[0] | 0},${g[1] | 0},${g[2] | 0},${a})`; ctx.fillRect((i % cols) * cw, ((i / cols) | 0) * ch, cw, ch);
      }
    }
    const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
    for (let i = 0; i < N; i++) {
      const f = dFlag[i]; if (!f) continue;
      const c = i % cols, r = (i / cols) | 0, x = c * cw, y = r * ch, key = dKey[i], sh = dShade[i], dim = dDim[i], B = BREEDS[dBreed[i]], lk = looks[dBreed[i]];
      if (term) ctx.globalAlpha = (r % 2 ? .6 : 1) * (.92 + .08 * Math.sin(t * 9 + r));
      const revealAt = dDelay[i] + dS[i] * .9;
      if (intro < revealAt - .45) continue;
      if (intro < revealAt) { ctx.fillStyle = rgb(lk.edge); ctx.fillText(P.scramble[(hsh(key, (t * 24) | 0, 9) * P.scramble.length) | 0], x + cw / 2, y + ch / 2 + 1); continue; }
      const roll = hsh(key, Math.floor(t * 2.2 + (key % 997) / 97), 5);
      const fade = (col) => rgb(mixa(C.bg, col, .7 + .3 * dim));
      if (f === F.EDGE) {
        let gl;
        if (S.preset === 'blueprint') { const gx = (dCov[i + 1] || 0) - (dCov[i - 1] || 0), gy = (dCov[i + cols] || 0) - (dCov[i - cols] || 0); gl = edgeGlyph(gx / cw, gy / ch); }
        else { const set = sh >= .5 ? P.edgeH : P.edgeL; gl = set[(key >>> 8) % set.length]; }
        ctx.fillStyle = rgb(mixa(C.bg, lk.edge, (P.blocks ? .55 : 1) * (.7 + .3 * dim))); ctx.fillText(gl, x + cw / 2, y + ch / 2 + 1); continue;
      }
      let gl, set;
      if (f === F.PLATE) set = P.plate;
      else if (f === F.EYE) gl = P.eye;
      else if (f === F.HORN) gl = P.horn;
      else if (f === F.BONE) gl = S.preset === 'decode' || S.preset === 'blueprint' ? (dBone[i] || '-') : (S.preset === 'dither' ? '▓' : '|');
      else if (f === F.MEMBRANE) { set = P.membrane; if ((key >>> 6) % 3) gl = ' '; }
      else if (f === F.MARK) set = P.mark;
      else if (f === F.SPIKE) gl = P.spike;
      else if (f === F.SCALE && S.preset === 'decode') gl = dBone[i] || '<';
      else if (dBel[i] > .5 && (f === F.BODY || f === F.HEAD)) { gl = (key >>> 7) % 3 ? ' ' : P.soft[(key >>> 9) % P.soft.length]; }
      else { const j = ((key >>> 4) % 3) - 1; const k = S.preset === 'dither' ? Math.floor(sh * (P.skin.length - .01)) : Math.floor((1 - sh) * (P.skin.length - .01)); gl = P.skin[clamp(k + j, 0, P.skin.length - 1)]; }
      if (!gl) gl = set[(key >>> 8) % set.length];
      const hi = f === F.PLATE || f === F.HORN || f === F.SPIKE;
      if (P.blocks) {
        // block = the hide, glyph = texture. Tone comes from the ramp: back = armour, flanks = soft belly,
        // lit edge steps up (rim light), far edge steps down, and a slow sheen slides along the back.
        const T = lk.tone, bel = dBel[i], rim = dRim[i];
        let ti = bel > .5 ? 3 : bel > .15 ? 2 : 1;
        if (rim > .42) ti++; else if (rim < -.45) ti--;
        if (dSheen[i] > .5 && bel < .5) ti++;
        ti = clamp(ti, 0, 4);
        let fill, ink;
        if (f === F.PLATE) { fill = sh > .9 ? T[2] : T[0]; ink = sh > .9 ? T[4] : T[1]; }          // bevelled scute: lit front, shaded back
        else if (f === F.HORN) { fill = T[3]; ink = T[0]; }
        else if (f === F.SPIKE) { fill = T[2]; ink = T[4]; }
        else if (f === F.MARK) { fill = T[Math.max(0, ti - 1)]; ink = T[Math.min(4, ti + 1)]; if (!lk.dark) fill = T[0]; }
        else if (f === F.MEMBRANE) { const n = clamp((sh - .25) / .5, 0, 1), wt = C.light ? (lk.dark ? T[1] : T[0]) : T[3]; fill = mixa(C.bg, wt, (C.light ? .16 : .2) + .42 * n); ink = mixa(C.bg, T[1], .5); }   // thin, lit-through
        else if (f === F.BONE) { fill = mixa(C.bg, T[1], .92); ink = C.light ? T[4] : T[4]; }
        else if (f === F.EYE) { fill = T[0]; ink = T[4]; }
        else { fill = T[ti]; ink = ti >= 3 ? T[2] : T[Math.min(4, ti + 1)]; }
        if (bel < .3 && f !== F.EYE && f !== F.MEMBRANE && f !== F.BONE && roll < (B.skin === 'smooth' ? .1 : .03)) ink = T[4];   // glints on the armour
        ctx.fillStyle = fade(fill); ctx.fillRect(x + 1, y + 1, cw - 1, ch - 1);
        ctx.fillStyle = fade(ink);
      } else {
        // glyph-only presets: shade the outline colour against the page
        let lv = f === F.EYE ? 1 : hi || f === F.BONE ? .95 : f === F.MEMBRANE ? .3 : f === F.MARK ? .45 : .4 + .55 * sh;
        if (f === F.BODY || f === F.HEAD) lv = clamp(lv - .22 * dBel[i] + (dRim[i] > .42 ? .15 : 0) + .2 * dSheen[i], .15, 1);
        ctx.fillStyle = rgb(mixa(C.bg, f === F.EYE ? lk.edge : lk.edge, (.3 + .7 * lv) * (.75 + .25 * dim)));
      }
      ctx.fillText(gl, x + cw / 2, y + ch / 2 + 1);
    }
    ctx.globalAlpha = 1;
    // fire: decodes in, burns butter → peach → rose, fades out (phosphor in Terminal)
    if (flames.length) {
      const hot = term ? (C.light ? [10, 100, 50] : [220, 255, 230]) : C.light ? [222, 146, 40] : [255, 238, 176], mid = term ? phos : C.light ? [222, 100, 78] : [255, 178, 150], cool = term ? mixa(phos, C.bg, .4) : C.light ? [196, 84, 140] : [255, 150, 200];
      const seen = new Set();
      for (let j = flames.length - 1; j >= 0; j--) {
        const f = flames[j], c = Math.floor(f.x / cw), r = Math.floor(f.y / ch); if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const cell = r * cols + c; if (seen.has(cell)) continue; seen.add(cell);
        const u = f.age / f.life, col = u < .4 ? mixa(hot, mid, u / .4) : mixa(mid, cool, (u - .4) / .6);
        const g = f.age < .09 ? P.scramble[(hsh(f.seed, (t * 30) | 0, 3) * P.scramble.length) | 0] : P.fire[Math.min(P.fire.length - 1, (u * P.fire.length) | 0)];
        ctx.globalAlpha = Math.pow(1 - u, .7); ctx.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
        ctx.fillText(g, c * cw + cw / 2, r * ch + ch / 2 + 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- loop ----------
  const STEP = 1 / 60;
  let simT = 0, acc = 0, last = performance.now(), introT = 0, paused = reduce, visible = true, inView = true, raf = 0, dead = false;
  function tick(now) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (paused || !visible || !inView) return;
    acc += dt; let k = 0;
    while (acc >= STEP && k < 4) { stepDragons(STEP, simT); stepSparks(STEP); stepGusts(STEP); stepClouds(STEP); stepFire(STEP); simT += STEP; acc -= STEP; k++; }
    if (k === 4) acc = 0;
    introT += dt; diffuse(dt);
    rasterise(simT); rasteriseClouds(); draw(simT);
  }
  function still() { if (simT < 4) for (let i = 0; i < 300; i++) { stepDragons(STEP, simT); simT += STEP; } introT = 99; rasterise(simT); rasteriseClouds(); draw(simT); }

  // ---------- input ----------
  const ptr = { x: 0, y: 0, on: false };
  const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onMove = (e) => { const [x, y] = local(e); ptr.x = x; ptr.y = y; ptr.on = e.pointerType !== 'touch'; if (ptr.on && Math.random() < .5) deposit(x, y, .12); };
  const onLeave = () => { ptr.on = false; };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);

  // ---------- lifecycle ----------
  const refresh = () => { readColors(); if (cols) paintGrid(); if (paused) still(); };
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', refresh);
  const mo = new MutationObserver(refresh);
  mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-theme'] });
  const onVis = () => { visible = !document.hidden; last = performance.now(); };
  document.addEventListener('visibilitychange', onVis);
  const io = new IntersectionObserver((es) => { inView = es[0].isIntersecting; last = performance.now(); });
  io.observe(stage);
  let rt = 0, lastW = 0, lastH = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const r = stage.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
      lastW = r.width; lastH = r.height; build(); seed(); seedClouds(); if (paused) still();
    }, 80);
  });
  ro.observe(stage);

  readColors(); build(); seed(); seedClouds();
  { const r = stage.getBoundingClientRect(); lastW = r.width; lastH = r.height; }
  if (paused) still();
  raf = requestAnimationFrame(tick);

  return {
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); mq.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', onVis); stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); },
    refresh,
    setPaused(p) { paused = p; if (p) still(); else last = performance.now(); },
    breathe() { if (!breathing) nextBreath = 0; },
    replay() { introT = 0; },
  };
}
