/* Currents scene: dotted flow-field streamlines that bend like smoke, with bright runners racing down them.
   Drawn on a half-resolution pixel canvas so every dot is a crisp 2 px square. Lab preview of
   `<AsciiBackground scene="currents" />`. Locked defaults (banner A): 40 lines, bend 1.4×, speed 1×, 10 runners/min. */

export type CurrentsOptions = {
    lines?: number;
    /** How far the lines bend. 0 = straight. */
    bend?: number;
    speed?: number;
    /** Runners per minute. */
    runners?: number;
    /** Tint runners with the accent colour. */
    tint?: boolean;
    /** Lines part around the cursor. */
    cursor?: boolean;
    /** Element whose box is drawn into and that receives pointer events. Defaults to the canvas parent. */
    stage?: HTMLElement;
};
export type CurrentsHandle = { destroy(): void; refresh(): void; burst(n?: number): void };

type Line = { x0: number; w: number; ph: number; sp: number };
type Runner = { L: Line; y: number; v: number; len: number; dir: number };

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hash = (x: number, y: number) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const ease = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = ease(x - xi), yf = ease(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return (a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf) * 2 - 1;
}
const rgbVar = (cs: CSSStyleDeclaration, k: string, fb: number[]) => {
    const v = cs.getPropertyValue(k).split(",").map(Number);
    return v.length === 3 && v.every((n) => Number.isFinite(n)) ? v : fb;
};

export function createCurrents(canvas: HTMLCanvasElement, opts: CurrentsOptions = {}): CurrentsHandle {
    const S = { lines: 40, bend: 1.4, speed: 1, runners: 10, tint: false, cursor: true, ...opts };
    const stage = opts.stage ?? canvas.parentElement!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PX = 2;
    let bw = 1, bh = 1, W = 1, H = 1;
    let img: ImageData, buf: Uint32Array, light = new Float32Array(1), tint = new Float32Array(1);
    let lines: Line[] = [], runners: Runner[] = [];
    let t = rnd(0, 100), nextRun = 0.5, last = performance.now(), visible = true, inView = true, raf = 0, dead = false;
    const ptr = { x: -1e4, y: -1e4, on: false, k: 0 };
    let bg = [8, 8, 10], fg = [237, 237, 239], ac = [130, 168, 255];

    function readColors() {
        const cs = getComputedStyle(stage); // stage, so a scoped data-theme (docs preview) applies
        bg = rgbVar(cs, "--rgb-bg", bg);
        fg = rgbVar(cs, "--rgb-fg", fg);
        ac = rgbVar(cs, "--rgb-accent", ac);
    }
    function build() {
        const r = stage.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        bw = Math.ceil(W / PX); bh = Math.ceil(H / PX);
        canvas.width = bw; canvas.height = bh;
        img = ctx.createImageData(bw, bh); buf = new Uint32Array(img.data.buffer);
        light = new Float32Array(bw * bh); tint = new Float32Array(bw * bh);
        const n = Math.max(8, Math.round(S.lines * W / 1100));
        lines = Array.from({ length: n }, (_, i) => ({ x0: (i + 0.5 + rnd(-0.35, 0.35)) / n, w: rnd(0.45, 1), ph: rnd(0, 1000), sp: rnd(0.7, 1.3) }));
        runners = [];
    }
    // x (buffer px) of a line at row y: low-frequency noise shared by neighbours, so lines bunch and part together
    function lineX(L: Line, y: number) {
        const u = L.x0 * 2.4, v = (y / bh) * 0.75;
        let x = L.x0 * bw + noise(u + t * 0.015, v - t * 0.035) * bw * 0.07 * S.bend + noise(u * 0.45 + 40, v * 0.55 + t * 0.02) * bw * 0.09 * S.bend
            + noise(u * 3 + 9, v * 1.6 - t * 0.05) * bw * 0.012 * S.bend;
        if (S.cursor && ptr.k > 0.01) {
            const dx = x - ptr.x / PX, dy = (y - ptr.y / PX) * 0.8, d2 = dx * dx + dy * dy, R = 70;
            if (d2 < R * R * 4) x += (dx >= 0 ? 1 : -1) * Math.exp(-d2 / (R * R)) * ptr.k * 26;
        }
        return x;
    }
    // quiet oval behind the headline and buttons
    function calm(x: number, y: number) {
        const ex = (x - bw / 2) / Math.min(bw * 0.34, 190), ey = (y - bh / 2) / Math.min(bh * 0.26, 52);
        return 0.28 + 0.72 * clamp((Math.sqrt(ex * ex + ey * ey) - 0.6) / 0.7, 0, 1);
    }
    function spawn(volley: boolean) {
        if (!lines.length) return;
        runners.push({
            L: lines[(Math.random() * lines.length) | 0],
            y: volley ? rnd(bh * 0.2, bh * 0.6) : rnd(-bh * 0.2, bh * 0.25),
            v: rnd(220, 420) * (volley ? 1.4 : 1), len: rnd(14, 34) * (volley ? 1.3 : 1), dir: Math.random() < 0.82 ? 1 : -1,
        });
    }
    function step(dt: number) {
        ptr.k += ((ptr.on ? 1 : 0) - ptr.k) * Math.min(1, dt * 4);
        t += dt * S.speed;
        nextRun -= dt;
        if (nextRun <= 0 && S.runners > 0) { spawn(false); nextRun = (60 / S.runners) * rnd(0.3, 1.7); }
        for (let j = runners.length - 1; j >= 0; j--) {
            const r = runners[j]; r.y += r.dir * r.v * dt;
            if (r.y - r.len > bh + 4 || r.y + r.len < -4) runners.splice(j, 1);
        }
    }
    function draw() {
        light.fill(0); tint.fill(0);
        for (let li = 0; li < lines.length; li++) {
            const L = lines[li], scroll = t * 26 * L.sp, gap = 2;
            for (let y = 0; y < bh; y++) {
                if ((y - Math.floor(scroll)) % gap) continue;
                const h = hash(li * 7919 + 13, Math.floor((y - scroll) / gap));
                if (h < 0.22) continue;
                const vis = clamp(noise(L.ph + li * 3.7, (y / bh) * 2.2 - t * 0.04) * 1.6 + 0.55, 0, 1);
                if (vis < 0.05) continue;
                const x = Math.round(lineX(L, y));
                if (x < 0 || x >= bw) continue;
                const shimmer = 0.55 + 0.45 * Math.sin(y * 0.03 + t * 1.1 + L.ph);
                const a = (0.13 + 0.36 * L.w * shimmer) * (0.6 + 0.4 * h) * vis * calm(x, y);
                const i = y * bw + x; if (a > light[i]) light[i] = a;
            }
        }
        for (const r of runners) {
            for (let s = 0; s < r.len; s++) {
                const y = Math.round(r.y - r.dir * s); if (y < 0 || y >= bh) continue;
                const x = Math.round(lineX(r.L, y)); if (x < 0 || x >= bw) continue;
                const f = 1 - s / r.len, a = Math.min(1, 0.25 + 0.85 * f * f) * Math.max(0.15, (calm(x, y) - 0.28) / 0.72), i = y * bw + x;
                if (a > light[i]) light[i] = a;
                if (f > tint[i]) tint[i] = f;
            }
        }
        buf.fill((255 << 24) | (bg[2] << 16) | (bg[1] << 8) | bg[0]);
        for (let i = 0; i < light.length; i++) {
            const a = light[i]; if (a < 0.02) continue;
            let r = fg[0], g = fg[1], b = fg[2];
            if (S.tint && tint[i] > 0) { const m = tint[i] * 0.85; r += (ac[0] - r) * m; g += (ac[1] - g) * m; b += (ac[2] - b) * m; }
            buf[i] = (255 << 24) | ((bg[2] + (b - bg[2]) * a) << 16) | ((bg[1] + (g - bg[1]) * a) << 8) | (bg[0] + (r - bg[0]) * a);
        }
        ctx.putImageData(img, 0, 0);
    }
    function tick(now: number) {
        if (dead) return;
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (!visible || !inView || reduce) return;
        step(dt); draw();
    }

    const onMove = (e: PointerEvent) => { const r = stage.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = e.pointerType !== "touch"; };
    const onLeave = () => { ptr.on = false; };
    // elements marked data-currents-trigger send runners: three on hover, a volley on click
    const onOver = (e: PointerEvent) => { const el = (e.target as Element).closest?.("[data-currents-trigger]"); if (el && !el.contains(e.relatedTarget as Node)) for (let k = 0; k < 3; k++) setTimeout(() => spawn(false), k * 140); };
    const onClick = (e: MouseEvent) => { if ((e.target as Element).closest?.("[data-currents-trigger]")) burst(6); };
    function burst(n = 6) { for (let k = 0; k < n; k++) setTimeout(() => spawn(true), k * 45); if (reduce) draw(); }
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerover", onOver);
    stage.addEventListener("click", onClick);

    const refresh = () => { readColors(); draw(); };
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", refresh);
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["data-theme"] });
    const onVis = () => { visible = !document.hidden; last = performance.now(); };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); last = performance.now(); });
    io.observe(stage);
    let rt = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => { build(); draw(); }, 60); });
    ro.observe(stage);

    readColors(); build();
    for (let k = 0; k < 3; k++) spawn(false);
    runners.forEach((r) => (r.y = rnd(0, bh)));
    draw();
    raf = requestAnimationFrame(tick);

    return {
        destroy() {
            dead = true; cancelAnimationFrame(raf); clearTimeout(rt);
            ro.disconnect(); io.disconnect(); mo.disconnect(); mq.removeEventListener("change", refresh);
            document.removeEventListener("visibilitychange", onVis);
            stage.removeEventListener("pointermove", onMove); stage.removeEventListener("pointerleave", onLeave);
            stage.removeEventListener("pointerover", onOver); stage.removeEventListener("click", onClick);
        },
        refresh,
        burst,
    };
}
