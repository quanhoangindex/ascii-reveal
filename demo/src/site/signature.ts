/* Footer signature: "Quan Hoang" drawn by dotted streamlines flowing rightwards. Where a line runs through a
   letter its dots fill in and take the logo gradient, so the flow writes the name. The band is half as tall as
   the letters, so the page edge cuts them through the middle. The cursor bends the lines away.
   Transparent canvas: the footer paints the background. */

const NAME = "Quan Hoang";
type RGB = number[];

const hash = (x: number, y: number) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;


export type SignatureHandle = { destroy(): void };

/** `align`: [left, right] edges (in page px) the name's ink should span, e.g. the footer logo and the last column. */
export function createSignature(canvas: HTMLCanvasElement, stage: HTMLElement, align?: () => [number, number] | null): SignatureHandle {
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, cw = 8, ch = 12, cols = 0, rows = 0;
    let M = new Float32Array(0);
    let fg: RGB = [237, 237, 239], dot: RGB = [150, 152, 166];
    let raf = 0, seen = false, t0 = 0, visible = true, inView = false, dead = false;
    const ptr = { x: -1e4, y: -1e4, on: false, k: 0 };

    function colors() {
        const cs = getComputedStyle(stage);
        const v = (k: string, fb: RGB) => {
            const r = cs.getPropertyValue(k).split(",").map(Number);
            return r.length === 3 && r.every(Number.isFinite) ? r : fb;
        };
        fg = v("--rgb-fg", fg); // white in dark mode, near-black in light
        dot = v("--rgb-dot", dot);
    }

    /* Size the band from the letters: fit the name to the width, then make the band tall enough for the
       top half of the capitals plus some air. Coverage mask is sampled per glyph cell. */
    function build() {
        W = stage.getBoundingClientRect().width;
        cw = W < 700 ? 3.5 : 8; // finer dots on phones, where the letters are small
        ch = cw * 1.5;
        cols = Math.floor(W / cw);
        const m = document.createElement("canvas").getContext("2d")!;
        // the ink of the name spans exactly the footer content: logo's left edge to the last column's right edge
        const sr = stage.getBoundingClientRect(), edges = align?.();
        const L = edges ? edges[0] - sr.left : W * 0.03, R = edges ? edges[1] - sr.left : W * 0.97;
        m.font = `600 100px Geist, ui-sans-serif, system-ui, sans-serif`;
        const m100 = m.measureText(NAME);
        const ink100 = m100.actualBoundingBoxLeft + m100.actualBoundingBoxRight;
        const size = (100 * (R - L)) / ink100;
        m.font = `600 ${size}px Geist, ui-sans-serif, system-ui, sans-serif`;
        const startX = L + m.measureText(NAME).actualBoundingBoxLeft;
        const cap = m.measureText("H").actualBoundingBoxAscent || size * 0.7;
        const top = Math.max(20, W * 0.022);
        H = Math.round(top + cap / 2);
        stage.style.height = `${H}px`;
        rows = Math.ceil(H / ch);
        // draw at cell resolution: one canvas pixel per cell, x squashed by cw
        const c = document.createElement("canvas");
        c.width = cols;
        c.height = rows;
        const x = c.getContext("2d")!;
        x.scale(1 / cw, 1 / ch);
        x.font = `600 ${size}px Geist, ui-sans-serif, system-ui, sans-serif`;
        x.textAlign = "left";
        x.textBaseline = "alphabetic";
        x.fillStyle = "#fff";
        x.fillText(NAME, startX, top + cap); // baseline below the band: the edge cuts the capitals in half
        const d = x.getImageData(0, 0, cols, rows).data;
        M = new Float32Array(cols * rows);
        for (let i = 0; i < M.length; i++) M[i] = d[i * 4 + 3] / 255;
        const dpr = Math.min(2, devicePixelRatio || 1);
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t: number) {
        ctx.clearRect(0, 0, W, H);
        const T = t / 1000, prog = reduce ? 9 : (t - t0) / 1000;
        const px = cw < 5 ? 1.5 : Math.max(2, Math.round(cw / 3.4)), step = px * 1.6, R2 = 14000;
        for (let y = 0; y < rows * 2; y++) {
            const ly = ((y + 0.5) * ch) / 2;
            const off = (T * (40 + hash(y, 3) * 50)) % (step * 6);
            for (let x0 = -step * 6; x0 < W + step; x0 += step) {
                const x = x0 + off, gx = (x / cw) | 0, gy = (ly / ch) | 0;
                const m = gx >= 0 && gx < cols && gy < rows ? M[gy * cols + gx] : 0;
                const arrived = Math.min(1, Math.max(0, prog * 1.1 - (x / W) * 0.7)); // the name writes in left to right
                const lit = m > 0.45 ? arrived : 0;
                const k = Math.round((x - off) / step);
                if (!lit && ((((k % 6) + 6) % 6) > 2 || hash(y, 11) > 0.4)) continue; // background: sparse dashes
                let yy = ly + Math.sin(x * 0.012 + T * 0.8 + y * 0.7) * (lit ? 0.6 : 2.2);
                const dx = x - ptr.x, dy = yy - ptr.y, d2 = dx * dx + dy * dy;
                const near = ptr.k > 0.01 && d2 < R2 ? ptr.k * (1 - d2 / R2) : 0;
                if (near) yy += (dy >= 0 ? 1 : -1) * near * 22;
                ctx.fillStyle = lit
                    ? rgba(fg, (0.55 + 0.45 * lit) * (1 - near * 0.35))
                    : rgba(dot, 0.14 + 0.14 * hash(y, k));
                ctx.fillRect(Math.round(x), Math.round(yy), px, px);
            }
        }
    }

    const tick = (now: number) => {
        if (dead) return;
        raf = requestAnimationFrame(tick);
        if (!visible || !inView) return;
        ptr.k += ((ptr.on ? 1 : 0) - ptr.k) * 0.12;
        draw(now);
    };

    const onMove = (e: PointerEvent) => {
        const r = stage.getBoundingClientRect();
        ptr.x = e.clientX - r.left;
        ptr.y = e.clientY - r.top;
        ptr.on = e.pointerType !== "touch";
    };
    const onLeave = () => (ptr.on = false);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    const io = new IntersectionObserver(
        (es) => {
            inView = es.some((e) => e.isIntersecting);
            if (inView && !seen) {
                seen = true;
                t0 = performance.now();
            }
            if (reduce && inView) draw(performance.now());
        },
        { threshold: 0.3 },
    );
    io.observe(stage);
    const onVis = () => (visible = !document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const restyle = () => {
        colors();
        if (reduce) draw(performance.now());
    };
    const mo = new MutationObserver(restyle);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", restyle);
    let rt = 0;
    let lastW = 0;
    const ro = new ResizeObserver(() => {
        const w = stage.getBoundingClientRect().width;
        if (Math.abs(w - lastW) < 1) return; // our own height change also fires this
        lastW = w;
        clearTimeout(rt);
        rt = window.setTimeout(() => {
            build();
            if (reduce) draw(performance.now());
        }, 80);
    });
    ro.observe(stage);

    colors();
    build();
    lastW = W;
    if (!reduce) raf = requestAnimationFrame(tick);

    return {
        destroy() {
            dead = true;
            cancelAnimationFrame(raf);
            clearTimeout(rt);
            io.disconnect();
            ro.disconnect();
            mo.disconnect();
            mq.removeEventListener("change", restyle);
            document.removeEventListener("visibilitychange", onVis);
            stage.removeEventListener("pointermove", onMove);
            stage.removeEventListener("pointerleave", onLeave);
        },
    };
}
