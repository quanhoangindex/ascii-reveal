/* Live thumbnails for the Components menu: a tiny loop of each effect, drawn as glyphs on a canvas.
   Transparent background (the tile's CSS paints it); colours come from the page's --rgb-* tokens. */

export type ThumbScene = "skeleton" | "ghost" | "decode" | "currents" | "dragon";

const RAMP = " .:-=+*#%@";
const hash = (x: number, y: number) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
type RGB = number[];
const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lum = (c: number) => RAMP[Math.max(0, Math.min(RAMP.length - 1, Math.round(c * (RAMP.length - 1))))];

type Colors = { fg: RGB; dot: RGB; wake: RGB; a1: RGB; a2: RGB; a3: RGB };
function readColors(el: Element): Colors {
    const cs = getComputedStyle(el);
    const v = (k: string, fb: RGB) => {
        const r = cs.getPropertyValue(k).split(",").map(Number);
        return r.length === 3 && r.every(Number.isFinite) ? r : fb;
    };
    return {
        fg: v("--rgb-fg", [237, 237, 239]),
        dot: v("--rgb-dot", [150, 152, 166]),
        wake: v("--rgb-wake", [150, 170, 255]),
        a1: v("--rgb-a1", [240, 166, 202]),
        a2: v("--rgb-a2", [183, 156, 242]),
        a3: v("--rgb-a3", [143, 179, 255]),
    };
}

/** Glyph grid helper: fn(u, v, x, y) returns [char, colour, alpha] or null. */
function grid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    cell: number,
    fn: (u: number, v: number, x: number, y: number) => [string, RGB, number] | null,
) {
    const cols = Math.floor(w / cell), rows = Math.floor(h / (cell * 1.25)), cw = w / cols, ch = h / rows;
    ctx.font = `500 ${Math.round(cell * 1.2)}px "Geist Mono", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
            const g = fn(x / cols, y / rows, x, y);
            if (!g) continue;
            ctx.fillStyle = css(g[1], g[2]);
            ctx.fillText(g[0], (x + 0.5) * cw, (y + 0.5) * ch);
        }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

/* A card skeleton: avatar + name lines, an image block, three text lines. Each block is a soft bar with
   dither glyphs inside, and a shimmer sweeps across the whole card, like <AsciiSkeleton>. */
function skeleton(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, C: Colors) {
    const p = w * 0.13, inner = w - p * 2, s = w / 96;
    const blocks: [number, number, number, number, number][] = [
        [p, p, 20 * s, 20 * s, 10 * s], // avatar
        [p + 26 * s, p + 3 * s, inner * 0.62, 6 * s, 3 * s], // name
        [p + 26 * s, p + 12 * s, inner * 0.38, 5 * s, 2.5 * s], // handle
        [p, p + 28 * s, inner, 24 * s, 5 * s], // image
        [p, p + 58 * s, inner, 5 * s, 2.5 * s], // text lines
        [p, p + 66 * s, inner * 0.8, 5 * s, 2.5 * s],
    ];
    // a sweep every 1.6 s, then a short rest so it reads as "waiting"
    const cycle = (t % 1.9) / 1.6, band = -0.4 + cycle * 1.9;
    ctx.fillStyle = css(C.fg, 0.07);
    for (const [x, y, bw, bh, r] of blocks) {
        roundRect(ctx, x, y, bw, bh, r);
        ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    for (const [x, y, bw, bh, r] of blocks) ctx.roundRect(x, y, bw, bh, r);
    ctx.clip();
    const cell = 3.2 * s;
    grid(ctx, w, h, cell, (u, v, x, y) => {
        const d = u + v * 0.35 - band, glow = Math.exp(-(d * d) / 0.018);
        const k = hash(x, y + Math.floor(t * 4));
        const ch = glow > 0.35 ? "#%@*"[Math.floor(k * 4)] : "-=+:"[Math.floor(k * 4)];
        return [ch, mix(C.dot, C.fg, glow), 0.32 + glow * 0.68];
    });
    ctx.restore();
}

function ghost(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, C: Colors) {
    const bob = Math.sin(t * 2.2) * 0.04;
    grid(ctx, w, h, w / 16, (u, v, x, y) => {
        const cy = 0.42 + bob, dx = (u - 0.5) / 0.3, top = (v - cy) / 0.3;
        const hem = 0.82 + bob + Math.sin(u * 22 + t * 5) * 0.035;
        const body = v < cy ? dx * dx + top * top < 1 : Math.abs(dx) < 1 && v < hem;
        if (!body) return null;
        const eye = (Math.abs(u - 0.4) < 0.045 || Math.abs(u - 0.6) < 0.045) && Math.abs(v - cy) < 0.07;
        const mouth = Math.abs(u - 0.5) < 0.04 && Math.abs(v - (0.58 + bob)) < 0.05;
        if (eye || mouth) return null;
        return [RAMP[6 + Math.floor(hash(x, y + Math.floor(t * 3)) * 4)], C.fg, 0.85];
    });
}

/* The photo decodes in from ASCII behind a sweeping front, holds, then scrambles back out. */
function decode(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, C: Colors, img: Thumbs["img"]) {
    const T = 4.2, k = (t % T) / T;
    // 0-.45 decode in, .45-.8 hold, .8-1 scramble out
    const front = k < 0.45 ? -0.25 + (k / 0.45) * 1.5 : k < 0.8 ? 1.3 : 1.3 - ((k - 0.8) / 0.2) * 1.55;
    if (img.el && img.sample) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w * Math.max(0, front), h);
        ctx.clip();
        ctx.drawImage(img.el, 0, 0, w, h);
        ctx.restore();
    }
    grid(ctx, w, h, w / 16, (u, v, x, y) => {
        if (u < front - 0.02) return null;
        const L = img.sample ? img.sample(u, v) : 0.4, near = Math.max(0, 1 - (u - front) / 0.25);
        const ch = near > 0.2 && hash(x, y + Math.floor(t * 14)) < near ? "@#*+=%"[Math.floor(hash(y, x + Math.floor(t * 20)) * 6)] : lum(L);
        return [ch, near > 0 ? mix(C.fg, C.wake, near) : C.fg, 0.35 + L * 0.65];
    });
}

function currents(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, C: Colors) {
    const N = 7, px = Math.max(1.5, w / 48);
    const xAt = (i: number, y: number) => ((i + 0.5) / N + Math.sin((y / h) * 3 + t * 0.6 + i) * 0.05 + Math.sin((y / h) * 7 - t * 0.9 + i * 2) * 0.02) * w;
    ctx.fillStyle = css(C.fg);
    for (let i = 0; i < N; i++)
        for (let y = 0; y < h; y += px * 2) {
            if (Math.floor((y + t * 30 * (1 + (i % 3) * 0.2)) / (px * 2)) % 2) continue;
            ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(y * 0.05 + t + i));
            ctx.fillRect(Math.round(xAt(i, y)), Math.round(y), px, px);
        }
    const r = ((t * 0.8) % 1.4) - 0.2, li = Math.floor(t * 0.8) % N;
    for (let s = 0; s < 14; s++) {
        const y = r * h - s * px * 1.5;
        if (y < 0 || y > h) continue;
        ctx.globalAlpha = 1 - s / 14;
        ctx.fillRect(Math.round(xAt(li, y)), Math.round(y), px, px);
    }
    ctx.globalAlpha = 1;
}

function dragon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, C: Colors) {
    // a glider seen from above: arched wings that beat, a body and a swaying tail, drifting in a slow loop
    const flap = Math.sin(t * 4.5), ox = 0.5 + Math.sin(t * 0.7) * 0.08, oy = 0.46 + Math.cos(t * 0.9) * 0.06;
    grid(ctx, w, h, w / 20, (u, v, x, y) => {
        const dx = u - ox, dy = v - oy, ax = Math.abs(dx);
        const spine = -ax * 0.5 * flap + ax * ax * 0.55;
        const wing = ax < 0.46 && dy > spine - 0.05 && dy < spine + 0.03 + (0.46 - ax) * 0.22;
        const tailX = Math.sin(dy * 9 - t * 3) * 0.04 * Math.max(0, dy);
        const body = Math.abs(dx - tailX) < 0.06 - Math.max(0, dy) * 0.08 && dy > -0.14 && dy < 0.42;
        const head = dx * dx + (dy + 0.17) ** 2 < 0.006;
        if (!(wing || body || head)) return null;
        if (head || body) return [head ? "@" : "#%*"[Math.floor(hash(x, y) * 3)], C.fg, 0.95];
        const c = ax < 0.18 ? mix(C.a1, C.a2, ax / 0.18) : mix(C.a2, C.a3, Math.min(1, (ax - 0.18) / 0.28));
        const edge = dy > spine + 0.02 + (0.46 - ax) * 0.16;
        return [edge ? "-" : "*+=#"[Math.floor(hash(x, y + Math.floor(t * 2)) * 4)], c, edge ? 0.6 : 0.95];
    });
}

type Thumbs = { img: { el: HTMLImageElement | null; sample: ((u: number, v: number) => number) | null } };

/** Shared image for the Reveal thumbnail, loaded once. */
const shared: Thumbs["img"] = { el: null, sample: null };
function loadImage(src: string) {
    if (shared.el) return;
    const el = new Image();
    el.decoding = "async";
    el.src = src;
    el.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const x = c.getContext("2d")!;
        x.drawImage(el, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        shared.sample = (u, v) => {
            const i = (Math.min(23, Math.floor(v * 24)) * 24 + Math.min(23, Math.floor(u * 24))) * 4;
            return (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
        };
    };
    shared.el = el;
}

export type ThumbHandle = { set(scene: ThumbScene): void; destroy(): void };

/** Draws `scene` into the canvas until destroyed. Still frame under reduced motion. */
export function createThumb(canvas: HTMLCanvasElement, scene: ThumbScene, imageSrc: string): ThumbHandle {
    loadImage(imageSrc);
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cur = scene, raf = 0, w = 0, h = 0;
    let C = readColors(canvas);
    const size = () => {
        const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
        w = r.width;
        h = r.height;
        canvas.width = Math.round(w * d);
        canvas.height = Math.round(h * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = (t: number) => {
        ctx.clearRect(0, 0, w, h);
        if (cur === "skeleton") skeleton(ctx, w, h, t, C);
        else if (cur === "ghost") ghost(ctx, w, h, t, C);
        else if (cur === "decode") decode(ctx, w, h, t, C, shared);
        else if (cur === "currents") currents(ctx, w, h, t, C);
        else dragon(ctx, w, h, t, C);
    };
    const t0 = performance.now();
    const loop = (now: number) => {
        draw((now - t0) / 1000);
        raf = requestAnimationFrame(loop);
    };
    size();
    if (reduce) draw(2.6);
    else raf = requestAnimationFrame(loop);
    const mo = new MutationObserver(() => (C = readColors(canvas)));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => (C = readColors(canvas));
    mq.addEventListener("change", onScheme);
    return {
        set(s) {
            cur = s;
            if (reduce) draw(2.6);
        },
        destroy() {
            cancelAnimationFrame(raf);
            mo.disconnect();
            mq.removeEventListener("change", onScheme);
        },
    };
}
