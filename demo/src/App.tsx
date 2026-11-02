import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent,
} from "react";
import {
    AsciiReveal,
    AsciiSkeleton,
    type AsciiRevealHandle,
    type MascotName,
    type Origin,
    type PresetName,
    type SkeletonVariant,
} from "ascii-reveal";
import { drawArt, type ArtName } from "./art";
import { AsciiBackdrop } from "./Backdrop";
import { SpookyBackdrop } from "./SpookyBackdrop";

type Theme = "system" | "light" | "dark";
type OriginMode = "center" | "corner" | "cursor";

/* Canvas artwork that redraws on resize and theme change. */
function Art({
    name,
    className,
    theme,
}: {
    name: ArtName;
    className: string;
    theme: Theme;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useLayoutEffect(() => {
        const cv = ref.current!;
        const draw = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const W = Math.round(cv.clientWidth * dpr),
                H = Math.round(cv.clientHeight * dpr);
            if (!W || !H) return;
            if (cv.width !== W || cv.height !== H) {
                cv.width = W;
                cv.height = H;
            }
            const cs = getComputedStyle(document.documentElement);
            const colors = {
                accent: cs.getPropertyValue("--accent").trim(),
                line: cs.getPropertyValue("--line").trim(),
                surface: cs.getPropertyValue("--bg").trim(),
            };
            drawArt(
                name,
                cv.getContext("2d", { willReadFrequently: true })!,
                W,
                H,
                dpr,
                colors,
            );
        };
        draw();
        const ro = new ResizeObserver(draw);
        ro.observe(cv);
        const mq = matchMedia("(prefers-color-scheme: dark)");
        mq.addEventListener("change", draw);
        return () => {
            ro.disconnect();
            mq.removeEventListener("change", draw);
        };
    }, [name, theme]);
    return (
        <canvas ref={ref} className={`media ${className}`} aria-hidden="true" />
    );
}

/* A real image from the design. Falls back to generated art if the file is missing. */
function Photo({
    src,
    fallback,
    className,
    theme,
}: {
    src: string;
    fallback: ArtName;
    className: string;
    theme: Theme;
}) {
    const [failed, setFailed] = useState(false);
    if (failed)
        return <Art name={fallback} className={className} theme={theme} />;
    return (
        <img
            src={src}
            alt=""
            className={`media ${className}`}
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

// GitHub repo. Drives the install command and docs links on the page.
const REPO = "quanhoangindex/ascii-reveal";
const INSTALL = `npm i github:${REPO}`;

const STEPS: { title: string; body: string; code: string }[] = [
    {
        title: "Install",
        body: "Add the package from npm, or straight from GitHub. React 17 or newer is all it needs.",
        code: `npm i ascii-reveal\n\n# or straight from GitHub\n${INSTALL}`,
    },
    {
        title: "Wrap your content",
        body: "Everything inside decodes into place when it mounts: text, images, canvases and video.",
        code: `import { AsciiReveal } from 'ascii-reveal';\n\n<AsciiReveal preset="decode">\n  <YourPage />\n</AsciiReveal>`,
    },
    {
        title: "Mark the pieces",
        body: "Optional attributes for cards, buttons, and anything that should stay untouched.",
        code: `<article data-ascii="surface">…</article>\n<button data-ascii="fade">Buy</button>\n<nav data-ascii="skip">…</nav>`,
    },
    {
        title: "Show loading states",
        body: "An ASCII skeleton paints instantly while data loads, then the real content decodes in. Use AsciiSkeleton on its own if you only want the placeholder.",
        code: `import { AsciiReveal, AsciiSkeleton } from 'ascii-reveal';\n\n<AsciiReveal loading={!data}>\n  {data\n    ? <Stats data={data} />\n    : <AsciiSkeleton variant="dither" />}\n</AsciiReveal>`,
    },
];

/* Tiny highlighter for the snippets: shell comments, strings, JSX tags, attributes, keywords. */
const TOKENS =
    /(#[^\n]*)|("[^"\n]*"|'[^'\n]*')|(<\/?)([A-Za-z][\w.]*)|(\/?>)|\b(import|from|npm)\b|([\w-]+)(?==)|(\{[^}\n]*\})|(github:[\w./-]+)/g;
function highlight(code: string) {
    const out: React.ReactNode[] = [];
    let last = 0,
        k = 0,
        m: RegExpExecArray | null;
    TOKENS.lastIndex = 0;
    while ((m = TOKENS.exec(code))) {
        if (m.index > last) out.push(code.slice(last, m.index));
        const [all, cm, str, open, tag, close, kw, attr, expr, gh] = m;
        if (cm)
            out.push(
                <span key={k++} className="cm">
                    {cm}
                </span>,
            );
        else if (str)
            out.push(
                <span key={k++} className="str">
                    {str}
                </span>,
            );
        else if (open)
            out.push(
                <span key={k++} className="pn">
                    {open}
                </span>,
                <span key={k++} className="tag">
                    {tag}
                </span>,
            );
        else if (close)
            out.push(
                <span key={k++} className="pn">
                    {close}
                </span>,
            );
        else if (kw)
            out.push(
                <span key={k++} className="kw">
                    {kw}
                </span>,
            );
        else if (attr)
            out.push(
                <span key={k++} className="attr">
                    {attr}
                </span>,
            );
        else if (expr)
            out.push(
                <span key={k++} className="expr">
                    {expr}
                </span>,
            );
        else if (gh)
            out.push(
                <span key={k++} className="str">
                    {gh}
                </span>,
            );
        last = m.index + all.length;
    }
    if (last < code.length) out.push(code.slice(last));
    return out;
}

function CopyButton({ text }: { text: string }) {
    const [label, setLabel] = useState("Copy");
    const copy = () => {
        const done = (ok: boolean) => {
            setLabel(ok ? "Copied" : "Select");
            setTimeout(() => setLabel("Copy"), 1600);
        };
        try {
            navigator.clipboard.writeText(text).then(
                () => done(true),
                () => done(false),
            );
        } catch {
            done(false);
        }
    };
    return (
        <button
            type="button"
            className="copy-btn"
            onClick={copy}
            data-ascii="fade"
            aria-label="Copy code">
            {label}
        </button>
    );
}

const COMMITS = [
    "fix hydration flash",
    "tune glyph ramp",
    "cache font metrics",
    "drop layout thrash",
    "batch canvas draws",
    "respect reduced motion",
];
const REGIONS = [
    "eu-north-1",
    "eu-west-3",
    "us-east-2",
    "ap-northeast-1",
    "sa-east-1",
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
// benchmarks open the page with ?nofallback to measure raw performance
const FALLBACK =
    typeof location === "undefined" || !location.search.includes("nofallback");

/* Halloween section: one card per loading mascot */
type Spooky = {
    mascot: MascotName;
    title: string;
    label: string;
    value: () => string;
    meta: () => string;
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const SPOOKY: Spooky[] = [
    {
        mascot: "spider",
        title: "Web crawler",
        label: "Pages indexed",
        value: () => Math.round(rnd(900, 4800)).toLocaleString("en-US"),
        meta: () => `${Math.round(rnd(12, 60))} new since midnight`,
    },
    {
        mascot: "ghost",
        title: "Ghost sessions",
        label: "Idle users",
        value: () => String(Math.round(rnd(120, 640))),
        meta: () => `last seen ${Math.round(rnd(2, 59))} min ago`,
    },
    {
        mascot: "pumpkin",
        title: "Pumpkin spice index",
        label: "Price per latte",
        value: () => "€" + rnd(3.9, 6.5).toFixed(2),
        meta: () => `demand +${Math.round(rnd(12, 64))}% this week`,
    },
    {
        mascot: "bat",
        title: "Night traffic",
        label: "Requests after 2 a.m.",
        value: () => rnd(8, 42).toFixed(1) + "k",
        meta: () => `p95 ${Math.round(rnd(28, 90))} ms`,
    },
];

function MascotCard({
    s,
    trigger,
    index,
}: {
    s: Spooky;
    trigger: number;
    index: number;
}) {
    const [loading, setLoading] = useState(false);
    const [v, setV] = useState({ value: s.value(), meta: s.meta() });
    const load = () => {
        if (loading) return;
        setLoading(true);
        setTimeout(() => {
            setV({ value: s.value(), meta: s.meta() });
            setLoading(false);
        }, 2400);
    };
    const first = useRef(trigger);
    // staggered so the four mascots don't all appear on the same frame
    useEffect(() => {
        if (trigger === first.current) return;
        const id = setTimeout(load, index * 220);
        return () => clearTimeout(id);
    }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <article className="card spooky-card" data-ascii="surface">
            <AsciiReveal
                className="stack"
                loading={loading}
                selector="[data-swap]"
                revealOnMount={false}
                mascot={s.mascot}>
                <p className="eyebrow">{s.title}</p>
                <div className="spooky-body">
                    <p className="small muted" data-swap>
                        {s.label}
                    </p>
                    <p className="big" data-swap>
                        {v.value}
                    </p>
                    <p className="small muted" data-swap>
                        {v.meta}
                    </p>
                </div>
                <button
                    className="btn full"
                    type="button"
                    data-ascii="fade"
                    disabled={loading}
                    onClick={load}>
                    {loading ? "Loading…" : "Load"}
                </button>
                <p className="tiny mono muted spooky-code">
                    mascot="{s.mascot}"
                </p>
            </AsciiReveal>
        </article>
    );
}

/* Skeleton vs ascii-reveal: same fake request, same timing, measured time-to-readable */
export const PROFILE = {
    name: "Ada Lindqvist",
    role: "Visual artist · Stockholm",
    cover: "images/card-cover.png",
    avatar: "images/card-avatar.png",
    stats: [
        ["12.4k", "Followers"],
        ["48", "Works"],
        ["3.1k", "Sold"],
    ] as [string, string][],
};
// warm the cover image so the reveal can sample it the moment data lands
if (typeof Image !== "undefined")
    for (const src of [
        PROFILE.cover,
        PROFILE.avatar,
        "images/album-art.png",
        "images/story-bg.webp",
        "images/northwind-logo.svg",
        "images/story-author.png",
    ]) {
        const im = new Image();
        im.src = src;
    }
function useFakeFetch(ms: number) {
    const [data, setData] = useState<typeof PROFILE | null>(null);
    const [took, setTook] = useState<number | null>(null);
    const t0 = useRef(0);
    const load = () => {
        setData(null);
        setTook(null);
        t0.current = performance.now();
        setTimeout(() => setData(PROFILE), ms);
    };
    return { data, took, setTook, t0, load };
}
type DemoKind = "profile" | "player" | "story";
type LoadMode = "reveal" | "only";
const MODES: Record<LoadMode, { tab: string; blurb: string; code: string }> = {
    reveal: {
        tab: "Skeleton + reveal",
        blurb: "The skeleton paints instantly. When data lands, the real content decodes in through the glyph grid.",
        code: `<AsciiReveal loading={!data} preset="PRESET">\n  {data\n    ? <Profile data={data} />\n    : <AsciiSkeleton variant="VARIANT" />}\n</AsciiReveal>`,
    },
    only: {
        tab: "Skeleton only",
        blurb: "Just the placeholder. Plain HTML and CSS, paints before any JavaScript runs, and the content swaps in as usual.",
        code: `{data\n  ? <Profile data={data} />\n  : <AsciiSkeleton variant="VARIANT" />}`,
    },
};

type SkProps = Parameters<typeof AsciiSkeleton>[0];

/** Big card: creator profile with cover art, avatar, stats and a button. */
export function DemoProfile({
    data,
    variant,
    seed,
}: {
    data: typeof PROFILE | null;
    variant: SkeletonVariant;
    seed: number;
}) {
    if (data) {
        return (
            <div className="dcard">
                <div className="dc-cover">
                    <img src={data.cover} alt="" decoding="async" />
                </div>
                <div className="dc-body">
                    <div className="dc-head">
                        <img
                            className="dc-avatar"
                            src={data.avatar}
                            alt=""
                            decoding="async"
                        />
                        <span className="dc-btn" data-ascii="fade">
                            Follow
                        </span>
                    </div>
                    <div className="dc-id">
                        <p className="dc-name">{data.name}</p>
                        <p className="dc-role">{data.role}</p>
                    </div>
                    <dl className="dc-stats">
                        {data.stats.map(([v, l]) => (
                            <div key={l}>
                                <dt>{l}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        );
    }
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard" aria-hidden="true">
            <div className="dc-cover">
                {sk({ rows: 26, className: "dc-fill", seed: seed + 70 })}
            </div>
            <div className="dc-body">
                <div className="dc-head">
                    <span className="dc-avatar dc-avatar-skel">
                        {sk({
                            rows: 5,
                            width: "100%",
                            height: "100%",
                            circle: true,
                            seed: seed + 40,
                        })}
                    </span>
                    {sk({
                        rows: 2,
                        width: 72,
                        height: 30,
                        className: "dc-btn-sk",
                        seed: seed + 3,
                    })}
                </div>
                <div className="dc-id">
                    {sk({
                        lines: 2,
                        widths: ["55%", "40%"],
                        seed,
                        className: "dc-skel-id",
                    })}
                </div>
                <div className="dc-stats">
                    {[0, 1, 2].map((i) => (
                        <div key={i}>
                            {sk({
                                lines: 2,
                                widths: ["60%", "45%"],
                                seed: seed + 11 * (i + 1),
                                className: "dc-skel-stat",
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Small card 1: a music player. Every visible part has a skeleton, including the progress bar and controls. */
export function DemoPlayer({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className="dcard np">
            <div className="np-art">
                {ready ? (
                    <img src="images/album-art.png" alt="" decoding="async" />
                ) : (
                    sk({ rows: 9, className: "dc-fill", seed: 21 })
                )}
            </div>
            <div className="np-main">
                <p className="np-label">Now playing</p>
                {ready ? (
                    <div className="np-id">
                        <p className="np-title">Static Bloom</p>
                        <p className="np-artist">Glyph Theory</p>
                    </div>
                ) : (
                    <div className="np-id">
                        {sk({
                            lines: 2,
                            widths: ["70%", "45%"],
                            seed: 23,
                            className: "np-skel",
                        })}
                    </div>
                )}
                {ready ? (
                    <div className="np-bar">
                        <span />
                    </div>
                ) : (
                    sk({
                        lines: 1,
                        widths: ["100%"],
                        seed: 24,
                        className: "np-bar-sk",
                    })
                )}
                <div className="np-times">
                    {ready ? (
                        <>
                            <span>1:12</span>
                            <span>3:28</span>
                        </>
                    ) : (
                        <>
                            {sk({ lines: 1, widths: ["28px"], seed: 25 })}
                            {sk({ lines: 1, widths: ["28px"], seed: 26 })}
                        </>
                    )}
                </div>
                <div className="np-ctrl" aria-hidden="true">
                    {ready ? (
                        <>
                            <span>⏮</span>
                            <span className="np-play" data-ascii="fade">
                                ❚❚
                            </span>
                            <span>⏭</span>
                        </>
                    ) : (
                        <>
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 27,
                            })}
                            {sk({
                                rows: 3,
                                width: 32,
                                height: 32,
                                circle: true,
                                seed: 28,
                            })}
                            {sk({
                                rows: 1,
                                width: 14,
                                height: 12,
                                className: "np-ic-sk",
                                seed: 29,
                            })}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Small card 2: a customer story. While loading, even the gradient background and the logo are skeletons. */
export function DemoStory({
    ready,
    variant,
}: {
    ready: boolean;
    variant: SkeletonVariant;
}) {
    const sk = (props: SkProps) => (
        <AsciiSkeleton variant={variant} {...props} />
    );
    return (
        <div className={`dcard story${ready ? "" : " is-loading"}`}>
            {ready ? (
                <img
                    className="st-bg"
                    src="images/story-bg.webp"
                    alt=""
                    decoding="async"
                />
            ) : (
                sk({ rows: 30, className: "st-bg st-bg-sk", seed: 30 })
            )}
            <div className="st-top">
                {ready ? (
                    <img
                        className="st-logo"
                        src="images/northwind-logo.svg"
                        alt=""
                        decoding="async"
                    />
                ) : (
                    sk({
                        rows: 3,
                        width: 32,
                        height: 32,
                        className: "st-logo-sk",
                        seed: 32,
                    })
                )}
                {ready ? (
                    <div>
                        <p className="st-co">Northwind Studio</p>
                        <p className="st-sub">
                            Ships 40 product launches a year.
                        </p>
                    </div>
                ) : (
                    <div className="st-skel-co">
                        {sk({ lines: 2, widths: ["46%", "78%"], seed: 31 })}
                    </div>
                )}
            </div>
            {ready ? (
                <p className="st-quote">
                    “Our loading states used to be gray boxes. Now people
                    screenshot them.”
                </p>
            ) : (
                <div className="st-skel-quote">
                    {sk({ lines: 2, widths: ["100%", "70%"], seed: 33 })}
                </div>
            )}
            <div className="st-foot">
                {ready ? (
                    <>
                        <img
                            className="st-av"
                            src="images/story-author.png"
                            alt=""
                            decoding="async"
                        />
                        <span className="st-by">
                            Maja Karlsson, Design lead
                        </span>
                        <span className="st-link">Read the story →</span>
                    </>
                ) : (
                    <>
                        {sk({
                            rows: 3,
                            width: 28,
                            height: 28,
                            circle: true,
                            seed: 35,
                        })}
                        <div className="st-skel-by">
                            {sk({ lines: 1, widths: ["55%"], seed: 37 })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/** One demo card in the bento: fakes a 1.2 s fetch, then shows the content (decoded or plain, depending on the mode). */
function DemoSlot({
    kind,
    run,
    mode,
    variant,
    preset,
    onReady,
}: {
    kind: DemoKind;
    run: number;
    mode: LoadMode;
    variant: SkeletonVariant;
    preset: PresetName;
    onReady: (kind: DemoKind, ms: number | null) => void;
}) {
    const f = useFakeFetch(1200);
    useEffect(() => {
        if (run > 0) f.load();
    }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        onReady(kind, f.took);
    }, [f.took]); // eslint-disable-line react-hooks/exhaustive-deps
    // without the reveal, content is readable the moment data lands
    useEffect(() => {
        if (mode === "only" && f.data)
            f.setTook(performance.now() - f.t0.current);
    }, [f.data]); // eslint-disable-line react-hooks/exhaustive-deps
    const demo =
        kind === "profile" ? (
            <DemoProfile data={f.data} variant={variant} seed={7} />
        ) : kind === "player" ? (
            <DemoPlayer ready={!!f.data} variant={variant} />
        ) : (
            <DemoStory ready={!!f.data} variant={variant} />
        );
    return (
        <div className={`slot slot-${kind}`}>
            {mode === "reveal" ? (
                <AsciiReveal
                    className="slot-fill"
                    loading={!f.data}
                    revealOnMount={false}
                    preset={preset}
                    fallback={FALLBACK}
                    onRevealComplete={() =>
                        f.setTook(performance.now() - f.t0.current)
                    }>
                    {demo}
                </AsciiReveal>
            ) : (
                demo
            )}
        </div>
    );
}

const SK_VARIANTS: [SkeletonVariant, string][] = [
    ["dither", "Dither"],
    ["scan", "Scan"],
    ["braille", "Braille"],
    ["terminal", "Terminal"],
];
const RV_PRESETS: [PresetName, string][] = [
    ["decode", "Decode"],
    ["dither", "Dither"],
    ["terminal", "Terminal"],
    ["blueprint", "Blueprint"],
];

function CompareSection() {
    const [run, setRun] = useState(0);
    const [mode, setMode] = useState<LoadMode>("reveal");
    const [variant, setVariant] = useState<SkeletonVariant>("dither");
    const [preset, setPreset] = useState<PresetName>("decode");
    const [times, setTimes] = useState<Record<DemoKind, number | null>>({
        profile: null,
        player: null,
        story: null,
    });
    const ref = useRef<HTMLElement>(null);
    const reload = () => {
        setTimes({ profile: null, player: null, story: null });
        setRun((n) => n + 1);
    };
    // start the first load when the section scrolls into view
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    io.disconnect();
                    setRun((n) => n || 1);
                }
            },
            { threshold: 0.3 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    const onReady = useCallback(
        (k: DemoKind, ms: number | null) =>
            setTimes((t) => (t[k] === ms ? t : { ...t, [k]: ms })),
        [],
    );
    const vals = Object.values(times);
    const done = run > 0 && vals.every((v) => v != null);
    const slowest = done ? Math.max(...(vals as number[])) : 0;
    const m = MODES[mode];
    const cmpCode = m.code
        .replace("VARIANT", variant)
        .replace("PRESET", preset);
    const pick = <T extends string>(
        value: T,
        set: (v: T) => void,
        options: [T, string][],
        label: string,
    ) => (
        <div className="seg" role="group" aria-label={label}>
            {options.map(([v, t]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => {
                        set(v);
                        reload();
                    }}>
                    {t}
                </button>
            ))}
        </div>
    );
    return (
        <section
            className="sec compare"
            id="skeleton"
            aria-label="Loading states"
            ref={ref}>
            <header className="cmp-head">
                <p className="eyebrow">Loading states</p>
                <h2>
                    <span className="aura">+1000 aura</span>
                    <br />
                    per loading state.
                </h2>
            </header>

            <div className="cmp-tabs" role="tablist" aria-label="Loading mode">
                {(Object.keys(MODES) as LoadMode[]).map((k) => (
                    <button
                        key={k}
                        role="tab"
                        type="button"
                        aria-selected={mode === k}
                        className="cmp-tab"
                        onClick={() => {
                            setMode(k);
                            reload();
                        }}>
                        {MODES[k].tab}
                    </button>
                ))}
            </div>

            <div className="cmp-bar" role="group" aria-label="Demo controls">
                <div className="group">
                    <span className="glabel">Skeleton</span>
                    {pick(variant, setVariant, SK_VARIANTS, "Skeleton style")}
                </div>
                {mode === "reveal" && (
                    <div className="group">
                        <span className="glabel">Reveal</span>
                        {pick(preset, setPreset, RV_PRESETS, "Reveal preset")}
                    </div>
                )}
                <div className="cmp-status">
                    <span className="tier-time" aria-live="polite">
                        {!run ? (
                            "waiting"
                        ) : done ? (
                            <>
                                all ready in{" "}
                                <b>{(slowest / 1000).toFixed(2)} s</b>
                            </>
                        ) : (
                            "loading…"
                        )}
                    </span>
                    <button className="cta" type="button" onClick={reload}>
                        ↻ Reload
                    </button>
                </div>
            </div>

            <div className="bento" role="tabpanel">
                {(["profile", "player", "story"] as DemoKind[]).map((k) => (
                    <DemoSlot
                        key={`${k}-${mode}`}
                        kind={k}
                        run={run}
                        mode={mode}
                        variant={variant}
                        preset={preset}
                        onReady={onReady}
                    />
                ))}
            </div>

            <div className="snippet cmp-snippet">
                <pre className="code cmp-code">
                    <code>
                        {cmpCode.split("\n").map((l, i) => (
                            <span key={i}>
                                {highlight(l)}
                                {"\n"}
                            </span>
                        ))}
                    </code>
                </pre>
                <CopyButton text={cmpCode} />
            </div>
        </section>
    );
}

function DeployCard({
    onReplay,
}: {
    onReplay: (e: MouseEvent<HTMLElement>) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [d, setD] = useState({
        commit: "a3f9c21 · fix hydration flash",
        region: "eu-north-1",
        latency: "84 ms",
        cache: "97.3%",
    });
    const redeploy = () => {
        setLoading(true);
        setTimeout(() => {
            setD({
                commit:
                    Math.floor(Math.random() * 0xfffffff)
                        .toString(16)
                        .padStart(7, "0") +
                    " · " +
                    pick(COMMITS),
                region: pick(REGIONS),
                latency: 58 + Math.floor(Math.random() * 60) + " ms",
                cache: (94 + Math.random() * 5.8).toFixed(1) + "%",
            });
            setLoading(false);
        }, 1500);
    };
    return (
        <article
            className="card"
            data-ascii="surface"
            tabIndex={0}
            aria-label="Deploy status card"
            onClick={onReplay}>
            <AsciiReveal
                className="stack"
                loading={loading}
                selector="[data-swap]"
                revealOnMount={false}
                mascot="spider"
                fallback={FALLBACK}>
                <div className="row between">
                    <p className="eyebrow">Production deploy</p>
                    <span className="chip" data-ascii="fade">
                        <span data-swap>● Ready</span>
                    </span>
                </div>
                <dl className="rows">
                    <dt>Commit</dt>
                    <dd className="mono" data-swap>
                        {d.commit}
                    </dd>
                    <dt>Region</dt>
                    <dd className="mono" data-swap>
                        {d.region}
                    </dd>
                    <dt>p95</dt>
                    <dd className="mono" data-swap>
                        {d.latency}
                    </dd>
                    <dt>Cache hit</dt>
                    <dd className="mono" data-swap>
                        {d.cache}
                    </dd>
                </dl>
                <button
                    className="btn primary full"
                    type="button"
                    data-ascii="fade"
                    style={{ marginTop: "auto" }}
                    disabled={loading}
                    onClick={redeploy}>
                    Redeploy
                </button>
            </AsciiReveal>
        </article>
    );
}

export default function App() {
    const page = useRef<AsciiRevealHandle>(null);
    const [preset, setPreset] = useState<PresetName>("decode");
    const [originMode, setOriginMode] = useState<OriginMode>("center");
    const [speed, setSpeed] = useState(1);
    const [theme, setTheme] = useState<Theme>("system");
    const [copied, setCopied] = useState("Copy");
    const [spookyRun, setSpookyRun] = useState(0);

    const grid = useRef<HTMLElement>(null);
    const spooky = useRef<HTMLElement>(null);
    // Replay only re-runs the demo cards, with the wave measured from the card grid
    const origin = (): Origin => {
        const r = grid.current?.getBoundingClientRect();
        if (!r) return "center";
        if (originMode === "corner") return { x: r.left, y: r.top };
        if (originMode === "cursor") return "pointer";
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const replay = () => {
        if (grid.current)
            page.current?.reveal({
                within: grid.current,
                origin: origin(),
                preset,
                speed,
            });
    };
    const showCards = () => {
        grid.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(replay, 550);
    };

    // mascots show themselves: run when the section comes into view, then every few seconds while it stays visible
    useEffect(() => {
        const el = spooky.current;
        if (!el) return;
        let timer = 0;
        const canHover = matchMedia("(hover: hover)").matches;
        const run = () => setSpookyRun((n) => n + 1);
        const tick = () => {
            // touch screens keep :hover after a tap, so only real pointers pause it
            if (!(canHover && el.matches(":hover"))) run();
        }; // repeats pause while you hover
        const io = new IntersectionObserver(
            ([e]) => {
                clearInterval(timer);
                clearTimeout(timer);
                if (e.isIntersecting) {
                    timer = window.setTimeout(() => {
                        run();
                        timer = window.setInterval(tick, 7000);
                    }, 700);
                }
            },
            { threshold: 0.2 },
        );
        io.observe(el);
        return () => {
            io.disconnect();
            clearInterval(timer);
            clearTimeout(timer);
        };
    }, []);

    // replay only when the preset or origin actually changes (not on mount, and not on React's dev double-run)
    const prev = useRef({ preset, originMode });
    useEffect(() => {
        if (
            prev.current.preset === preset &&
            prev.current.originMode === originMode
        )
            return;
        prev.current = { preset, originMode };
        replay();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preset, originMode]);

    useEffect(() => {
        if (theme === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                (e.key === "r" || e.key === "R") &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !/INPUT|TEXTAREA|SELECT/.test(
                    (document.activeElement as HTMLElement)?.tagName,
                )
            )
                replay();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    });

    const replayCard = (e: MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("button")) return;
        page.current?.reveal({
            within: e.currentTarget,
            origin: { x: e.clientX, y: e.clientY },
            preset,
            speed,
        });
    };
    const replayKey = (e: React.KeyboardEvent<HTMLElement>) => {
        if (
            e.target !== e.currentTarget ||
            (e.key !== "Enter" && e.key !== " ")
        )
            return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        page.current?.reveal({
            within: e.currentTarget,
            origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
            preset,
            speed,
        });
    };
    const copy = () => {
        const done = (ok: boolean) => {
            setCopied(ok ? "Copied" : "Select");
            setTimeout(() => setCopied("Copy"), 1600);
        };
        try {
            navigator.clipboard.writeText("npm i ascii-reveal").then(
                () => done(true),
                () => done(false),
            );
        } catch {
            done(false);
        }
    };

    const seg = <T extends string>(
        value: T,
        set: (v: T) => void,
        options: [T, React.ReactNode][],
        label: string,
    ) => (
        <div className="seg" role="group" aria-label={label}>
            {options.map(([v, text]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => set(v)}>
                    {text}
                </button>
            ))}
        </div>
    );

    return (
        <>
            <AsciiBackdrop theme={theme} />
            <div className="page">
                <AsciiReveal
                    ref={page}
                    className="frame"
                    preset={preset}
                    speed={speed}
                    duration="cinematic"
                    fallback={FALLBACK}
                    origin={{
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                    }}>
                    <nav className="sec nav" aria-label="Project">
                        <div className="brand">
                            <span className="mark" aria-hidden="true" />
                            ascii-reveal
                        </div>
                        <div className="nav-right">
                            <span className="badge">v0.3 · open source</span>
                            <a
                                className="gh-pill"
                                href={`https://github.com/${REPO}`}
                                target="_blank"
                                rel="noreferrer"
                                data-ascii="fade"
                                aria-label="ascii-reveal on GitHub">
                                <svg
                                    className="gh-icon"
                                    viewBox="0 0 16 16"
                                    width="15"
                                    height="15"
                                    aria-hidden="true">
                                    <path
                                        fill="currentColor"
                                        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                                    />
                                </svg>
                                <span>GitHub</span>
                            </a>
                        </div>
                    </nav>

                    <section className="sec hero" aria-label="Introduction">
                        <div className="hero-copy">
                            <span className="pill">
                                <b>New</b>A loading effect for React
                            </span>
                            <h1>Your skeleton loader is boring us to death.</h1>
                            <p className="lede">
                                Nobody has ever enjoyed a pulsing gray
                                rectangle. ascii-reveal decodes your real
                                content into place, glyph by glyph, so the wait
                                looks like something is actually happening.
                            </p>
                            <div className="actions">
                                <button
                                    className="cta"
                                    type="button"
                                    onClick={showCards}
                                    data-ascii="fade">
                                    See it in action{" "}
                                    <span aria-hidden="true">↓</span>
                                </button>
                                <button
                                    className="copy"
                                    type="button"
                                    onClick={copy}
                                    aria-label="Copy install command"
                                    data-ascii="fade">
                                    <span>
                                        <span className="d">$</span> npm i
                                        ascii-reveal
                                    </span>
                                    <em>{copied}</em>
                                </button>
                            </div>
                        </div>
                        <div className="hero-art">
                            <img
                                className="hero-glow"
                                src="images/hero-glow.webp"
                                alt=""
                                aria-hidden="true"
                                decoding="async"
                            />
                            <Photo
                                src="images/hero-figure.png"
                                fallback="orb"
                                className="hero-img"
                                theme={theme}
                            />
                        </div>
                    </section>

                    <div className="card-zone">
                        <div
                            className="sec toolbar"
                            role="group"
                            aria-label="Animation controls"
                            data-ascii="skip">
                            <div className="group">
                                <span className="glabel">Preset</span>
                                {seg(
                                    preset,
                                    setPreset,
                                    [
                                        ["decode", "Decode"],
                                        ["dither", "Dither"],
                                        ["terminal", "Terminal"],
                                        ["blueprint", "Blueprint"],
                                    ],
                                    "Preset",
                                )}
                            </div>
                            <div className="group">
                                <span className="glabel">Wave from</span>
                                {seg(
                                    originMode,
                                    setOriginMode,
                                    [
                                        ["center", "Center"],
                                        ["corner", "Corner"],
                                        [
                                            "cursor",
                                            <>
                                                <span className="on-pointer">Cursor</span>
                                                <span className="on-touch">Tap</span>
                                            </>,
                                        ],
                                    ],
                                    "Wave origin",
                                )}
                            </div>
                            <div className="group">
                                <label className="glabel" htmlFor="speed">
                                    Speed
                                </label>
                                <input
                                    type="range"
                                    id="speed"
                                    min={0.4}
                                    max={2}
                                    step={0.1}
                                    value={speed}
                                    onChange={(e) => setSpeed(+e.target.value)}
                                    onPointerUp={replay}
                                    onKeyUp={replay}
                                />
                                <span className="speedval">
                                    {speed.toFixed(1)}×
                                </span>
                            </div>
                            <button
                                type="button"
                                className="cta"
                                onClick={replay}>
                                Replay <kbd>R</kbd>
                            </button>
                        </div>

                        <section className="sec demo" aria-label="Demo cards">
                            <div className="demo-head">
                                <p>
                                    <span className="on-pointer">Click</span>
                                    <span className="on-touch">Tap</span> a card
                                    to replay it from that point
                                </p>
                                <p>Redeploy runs the loading → loaded cycle</p>
                            </div>

                            <main className="grid" ref={grid}>
                                <article
                                    className="card"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Profile card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <div className="row">
                                        <Photo
                                            src="images/avatar.png"
                                            fallback="avatar"
                                            className="avatar"
                                            theme={theme}
                                        />
                                        <div className="grow">
                                            <p className="title">Quan Hoang</p>
                                            <p className="small muted">
                                                Designer &amp; UX/UI Engineer
                                            </p>
                                        </div>
                                    </div>
                                    <p className="body">
                                        Designs and builds interfaces where
                                        motion explains state. Currently making
                                        ascii-reveal, an open-source loading
                                        effect for React.
                                    </p>
                                    <div
                                        className="row hair"
                                        style={{ paddingTop: 12 }}>
                                        <span className="tiny mono muted grow">
                                            2026
                                        </span>
                                        <span
                                            className="chip"
                                            data-ascii="fade">
                                            Building in public
                                        </span>
                                    </div>
                                    <div
                                        className="row"
                                        style={{ marginTop: "auto" }}>
                                        <button
                                            className="btn primary grow"
                                            type="button"
                                            data-ascii="fade">
                                            Say hello
                                        </button>
                                        <button
                                            className="btn grow"
                                            type="button"
                                            data-ascii="fade">
                                            View work
                                        </button>
                                    </div>
                                </article>

                                <article
                                    className="card"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Product card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <Photo
                                        src="images/print.png"
                                        fallback="print"
                                        className="photo"
                                        theme={theme}
                                    />
                                    <div
                                        className="row between"
                                        style={{ alignItems: "baseline" }}>
                                        <p className="title">Aura No. 3</p>
                                        <p className="title mono">€120.00</p>
                                    </div>
                                    <p
                                        className="small muted"
                                        style={{ marginTop: -8 }}>
                                        Giclée print · 50 × 70 cm · edition of
                                        40
                                    </p>
                                    <button
                                        className="btn primary full"
                                        type="button"
                                        data-ascii="fade">
                                        Add to cart
                                    </button>
                                </article>

                                <article
                                    className="card"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Stats card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <div className="row between">
                                        <p className="eyebrow">
                                            Weekly active users
                                        </p>
                                        <span
                                            className="chip"
                                            data-ascii="fade">
                                            +8.2%
                                        </span>
                                    </div>
                                    <p className="big">12,480</p>
                                    <p
                                        className="small muted"
                                        style={{ marginTop: -8 }}>
                                        vs 11,530 the week before
                                    </p>
                                    <div
                                        style={{
                                            marginTop: "auto",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                        }}>
                                        <Art
                                            name="chart"
                                            className="chart"
                                            theme={theme}
                                        />
                                        <div className="axis">
                                            <span>Oct 7</span>
                                            <span>Oct 20</span>
                                        </div>
                                    </div>
                                </article>

                                <article
                                    className="card"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Article card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <p className="eyebrow">
                                        Field notes · 6 min read
                                    </p>
                                    <h2 className="headline">
                                        Loaders should resolve, not disappear
                                    </h2>
                                    <p className="body">
                                        A spinner asks people to wait. A reveal
                                        shows them what they are waiting for.
                                        When content decodes in its final
                                        position, the layout never jumps and the
                                        eye already knows where to look.
                                    </p>
                                    <div
                                        className="row between hair"
                                        style={{
                                            paddingTop: 12,
                                            marginTop: "auto",
                                        }}>
                                        <span className="tiny mono muted">
                                            Oct 18, 2026
                                        </span>
                                        <span className="tiny mono muted">
                                            Read →
                                        </span>
                                    </div>
                                </article>

                                <article
                                    className="card"
                                    data-ascii="surface"
                                    tabIndex={0}
                                    aria-label="Code card"
                                    onClick={replayCard}
                                    onKeyDown={replayKey}>
                                    <div className="row between">
                                        <p className="eyebrow">Usage</p>
                                        <span className="tiny mono muted">
                                            App.tsx
                                        </span>
                                    </div>
                                    <div className="code">
                                        <span className="ln">
                                            <span className="kw">import</span>{" "}
                                            {"{ AsciiReveal }"}{" "}
                                            <span className="kw">from</span>{" "}
                                            <span className="str">
                                                "ascii-reveal"
                                            </span>
                                            ;
                                        </span>
                                        <span className="ln"> </span>
                                        <span className="ln">
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                AsciiReveal
                                            </span>{" "}
                                            <span className="attr">preset</span>
                                            =
                                            <span className="str">
                                                "decode"
                                            </span>
                                            <span className="pn">&gt;</span>
                                        </span>
                                        <span className="ln">
                                            {"  "}
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                ProfileCard
                                            </span>{" "}
                                            <span className="pn">/&gt;</span>
                                        </span>
                                        <span className="ln">
                                            {"  "}
                                            <span className="pn">&lt;</span>
                                            <span className="tag">
                                                Gallery
                                            </span>{" "}
                                            <span className="attr">items</span>=
                                            {"{prints}"}{" "}
                                            <span className="pn">/&gt;</span>
                                        </span>
                                        <span className="ln">
                                            <span className="pn">&lt;/</span>
                                            <span className="tag">
                                                AsciiReveal
                                            </span>
                                            <span className="pn">&gt;</span>
                                        </span>
                                    </div>
                                    <p className="small muted">
                                        Wrap any subtree. Text, images and
                                        canvases inside it reveal in one wave.
                                    </p>
                                </article>

                                <DeployCard onReplay={replayCard} />
                            </main>
                        </section>
                    </div>

                    <CompareSection />

                    <section
                        className="sec spooky"
                        id="mascots"
                        aria-label="Loading mascots"
                        ref={spooky}>
                        <SpookyBackdrop />
                        <div className="spooky-head">
                            <div className="spooky-intro">
                                <p className="eyebrow">New · loading mascots</p>
                                <h2>Halloween came early.</h2>
                                <p className="body">
                                    Swap the shimmer for a spider, a ghost, a
                                    pumpkin or a bat. They're drawn as ASCII
                                    while your data loads, then dissolve as it
                                    decodes in. Bring your own SVG too.
                                </p>
                            </div>
                            <div className="spooky-actions">
                                <div className="snippet">
                                    <pre className="code">
                                        <code>
                                            {highlight(
                                                '<AsciiReveal loading={isLoading} mascot="spider">',
                                            )}
                                        </code>
                                    </pre>
                                </div>
                                <button
                                    className="cta"
                                    type="button"
                                    onClick={() => setSpookyRun((n) => n + 1)}>
                                    Load all
                                </button>
                            </div>
                        </div>
                        <div className="spooky-grid">
                            {SPOOKY.map((s, i) => (
                                <MascotCard
                                    key={s.mascot}
                                    s={s}
                                    index={i}
                                    trigger={spookyRun}
                                />
                            ))}
                        </div>
                    </section>

                    <section
                        className="sec usage"
                        id="get-started"
                        aria-label="Get started">
                        <div className="usage-intro">
                            <p className="eyebrow">Get started</p>
                            <h2>Use it in your project</h2>
                            <p className="body">
                                Four steps from install to loading states. The
                                README covers every prop, theming, and use
                                without React.
                            </p>
                            <a
                                className="text-link"
                                href={`https://github.com/${REPO}#readme`}
                                target="_blank"
                                rel="noreferrer">
                                Read the docs on GitHub →
                            </a>
                        </div>
                        <ol className="steps">
                            {STEPS.map((st, i) => (
                                <li key={st.title} className="step">
                                    <span className="step-n">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div className="step-body">
                                        <h3>{st.title}</h3>
                                        <p className="small muted">{st.body}</p>
                                        <div className="snippet">
                                            <pre className="code">
                                                <code>
                                                    {highlight(st.code)}
                                                </code>
                                            </pre>
                                            <CopyButton text={st.code} />
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <footer className="foot" data-ascii="skip">
                        <span className="credit">
                            Made by{" "}
                            <a
                                href="https://github.com/quanhoangindex"
                                target="_blank"
                                rel="noreferrer">
                                Quan Hoang
                            </a>{" "}
                            · MIT licensed · ~15 KB gzipped
                        </span>
                        {seg(
                            theme,
                            setTheme,
                            [
                                ["system", "System"],
                                ["light", "Light"],
                                ["dark", "Dark"],
                            ],
                            "Theme",
                        )}
                    </footer>
                </AsciiReveal>
            </div>
        </>
    );
}
