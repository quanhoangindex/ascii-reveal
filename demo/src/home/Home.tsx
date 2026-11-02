import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AsciiReveal, AsciiSkeleton, type PresetName, type SkeletonVariant } from "ascii-reveal";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
    ArrowDown01Icon,
    ArrowRight02Icon,
    Cancel01Icon,
    ComputerIcon,
    Copy01Icon,
    GithubIcon,
    Menu01Icon,
    Moon02Icon,
    RefreshIcon,
    Sun01Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import { DemoPlayer, DemoProfile, DemoStory, PROFILE } from "../App";
import { DragonsScene } from "./DragonsScene";

const REPO = "quanhoangindex/ascii-reveal";
const GH = `https://github.com/${REPO}`;
const DOCS = `${GH}#readme`;
const CHANGELOG = `${GH}/blob/main/CHANGELOG.md`;
const NPM = "https://www.npmjs.com/package/ascii-reveal";
// benchmarks open the page with ?nofallback to measure raw performance
const FALLBACK = typeof location === "undefined" || !location.search.includes("nofallback");

function Icon({ icon, size = 20, stroke = 1.5 }: { icon: IconSvgElement; size?: number; stroke?: number }) {
    return <HugeiconsIcon icon={icon} size={size} strokeWidth={stroke} aria-hidden="true" />;
}

/* ---------- theme ---------- */
type Theme = "system" | "light" | "dark";
const THEME_KEY = "ascii-reveal-theme";
function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const v = localStorage.getItem(THEME_KEY);
            if (v === "light" || v === "dark") return v;
        } catch {
            /* storage blocked */
        }
        return "system";
    });
    useEffect(() => {
        const el = document.documentElement;
        if (theme === "system") el.removeAttribute("data-theme");
        else el.setAttribute("data-theme", theme);
        try {
            if (theme === "system") localStorage.removeItem(THEME_KEY);
            else localStorage.setItem(THEME_KEY, theme);
        } catch {
            /* storage blocked */
        }
    }, [theme]);
    const next = () => setTheme((t) => (t === "system" ? "light" : t === "light" ? "dark" : "system"));
    return { theme, next };
}

/* ---------- GitHub stars ---------- */
let starsReq: Promise<number | null> | null = null;
function useStars() {
    const [stars, setStars] = useState<number | null>(null);
    useEffect(() => {
        let alive = true;
        starsReq ??= fetch(`https://api.github.com/repos/${REPO}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => (j && typeof j.stargazers_count === "number" ? j.stargazers_count : null))
            .catch(() => null);
        starsReq.then((n) => alive && n !== null && setStars(n));
        return () => {
            alive = false;
        };
    }, []);
    if (stars === null) return "Star";
    return `Star · ${stars >= 1000 ? (stars / 1000).toFixed(1).replace(/\.0$/, "") + "k" : stars}`;
}

/* ---------- copy ---------- */
function useCopy(text: string) {
    const [done, setDone] = useState<"" | "Copied" | "Select">("");
    const copy = () => {
        const end = (ok: boolean) => {
            setDone(ok ? "Copied" : "Select");
            setTimeout(() => setDone(""), 1600);
        };
        try {
            navigator.clipboard.writeText(text).then(
                () => end(true),
                () => end(false),
            );
        } catch {
            end(false);
        }
    };
    return { done, copy };
}

/* ---------- layout helpers ---------- */
function Band({ id, className = "", children, label }: { id?: string; className?: string; children: ReactNode; label?: string }) {
    return (
        <section id={id} className={`band ${className}`} aria-label={label}>
            <span className="joint l" aria-hidden="true" />
            <span className="joint r" aria-hidden="true" />
            <div className="rail">{children}</div>
        </section>
    );
}
function Head({ label, title, sub }: { label: string; title: ReactNode; sub?: ReactNode }) {
    return (
        <div className="head">
            <p className="label">{label}</p>
            <h2 className="h2">{title}</h2>
            {sub && <p className="sub">{sub}</p>}
        </div>
    );
}

/* ---------- nav ---------- */
function Nav() {
    const { theme, next } = useTheme();
    const star = useStars();
    const [open, setOpen] = useState(false);
    const themeIcon = theme === "light" ? Sun01Icon : theme === "dark" ? Moon02Icon : ComputerIcon;
    const links = (
        <>
            <a className="nav-link" href="#effects" onClick={() => setOpen(false)}>
                Components <Icon icon={ArrowDown01Icon} size={20} />
            </a>
            <a className="nav-link" href="#backgrounds" onClick={() => setOpen(false)}>
                Backgrounds
            </a>
            <a className="nav-link" href={DOCS} target="_blank" rel="noreferrer">
                Docs
            </a>
            <a className="nav-link" href={CHANGELOG} target="_blank" rel="noreferrer">
                Changelog
            </a>
        </>
    );
    return (
        <header className="nav">
            <div className="rail">
                <div className="nav-left">
                    <a className="logo" href="#top" aria-label="ascii-reveal home">
                        <span className="mark" aria-hidden="true" />
                        ascii-reveal
                    </a>
                    <span className="badge">v0.3</span>
                </div>
                <nav className="nav-links" aria-label="Main">
                    {links}
                </nav>
                <div className="nav-right">
                    <button type="button" className="theme-btn" onClick={next} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`}>
                        <span>
                            <Icon icon={themeIcon} size={20} />
                        </span>
                    </button>
                    <a className="btn btn-glass btn-sm" href={GH} target="_blank" rel="noreferrer" aria-label={`${star} on GitHub`}>
                        <Icon icon={GithubIcon} size={16} />
                        <span className="star-label">{star}</span>
                    </a>
                    <button type="button" className="btn btn-glass btn-sm menu-btn" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((o) => !o)}>
                        <Icon icon={open ? Cancel01Icon : Menu01Icon} size={18} />
                    </button>
                </div>
            </div>
            {open && (
                <nav className="mobile-menu" aria-label="Main">
                    {links}
                </nav>
            )}
        </header>
    );
}

/* ---------- hero ---------- */
function Hero() {
    const { done, copy } = useCopy("npm i ascii-reveal");
    return (
        <section className="hero" id="top" aria-label="Introduction">
            <DragonsScene className="hero-scene" />
            <div className="hero-rails" aria-hidden="true">
                <div className="rail" />
            </div>
            <div className="hero-card">
                <h1>
                    No cap, <br />
                    this effect goes hard.
                </h1>
                <div className="ctas">
                    <a className="btn btn-primary" href="#effects">
                        Browse components <Icon icon={ArrowRight02Icon} size={16} />
                    </a>
                    <button type="button" className="install" onClick={copy} aria-label="Copy install command">
                        $ npm i ascii-reveal
                        {done ? <span className="ok">{done}</span> : <Icon icon={Copy01Icon} size={16} />}
                    </button>
                </div>
            </div>
        </section>
    );
}

/* ---------- "wake" cards: hover or tap replays the loading state ---------- */
function useWake(ms: number) {
    const [ready, setReady] = useState(false);
    const busy = useRef(false);
    const timer = useRef(0);
    const wake = useCallback(() => {
        if (busy.current) return;
        busy.current = true;
        setReady(false);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setReady(true), ms);
    }, [ms]);
    const done = useCallback(() => {
        // short cool-down so a lingering pointer doesn't loop the effect
        window.setTimeout(() => (busy.current = false), 900);
    }, []);
    // first run when the card scrolls into view
    const seen = useRef<IntersectionObserver | null>(null);
    const ref = useCallback(
        (el: HTMLElement | null) => {
            seen.current?.disconnect();
            if (!el) return;
            seen.current = new IntersectionObserver(
                (es) => {
                    if (es.some((e) => e.isIntersecting)) {
                        seen.current?.disconnect();
                        wake();
                    }
                },
                { threshold: 0.35 },
            );
            seen.current.observe(el);
        },
        [wake],
    );
    useEffect(() => () => clearTimeout(timer.current), []);
    return { ready, wake, done, ref };
}

function WakeCard({
    ms,
    preset,
    className = "",
    label,
    mascot,
    children,
}: {
    ms: number;
    preset: PresetName;
    className?: string;
    label: string;
    mascot?: string;
    children: (ready: boolean) => ReactNode;
}) {
    const w = useWake(ms);
    return (
        <div
            ref={w.ref}
            className={`slot wake ${className}`}
            role="button"
            tabIndex={0}
            aria-label={`${label}. Press to replay the loading effect`}
            onPointerEnter={(e) => e.pointerType === "mouse" && w.wake()}
            onClick={w.wake}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    w.wake();
                }
            }}>
            <AsciiReveal className="slot-fill" loading={!w.ready} revealOnMount={false} lazy={false} preset={preset} mascot={mascot} fallback={FALLBACK} onRevealComplete={w.done}>
                {children(w.ready)}
            </AsciiReveal>
        </div>
    );
}

/* ---------- inbox (skeleton demo) ---------- */
const MAIL = [
    { name: "Noah Berg", time: "2m", msg: "Merged: decode wave from cursor", av: "images/home/inbox-noah.png", unread: true },
    { name: "Lina Sato", time: "14m", msg: "Can we ship the shark scene Friday?", av: "images/home/inbox-lina.png", unread: true },
    { name: "Release bot", time: "1h", msg: "v0.4.0 is live on npm 🎉", av: "images/home/inbox-bot.png", unread: true },
    { name: "Linus Mark", time: "3h", msg: "Loved the mascot. Stealing it.", av: "images/home/inbox-linus.png", unread: false },
];
function Inbox({ ready, variant }: { ready: boolean; variant: SkeletonVariant }) {
    return (
        <div className="gcard inbox">
            {ready ? (
                <div className="inbox-head">
                    <p className="inbox-title">
                        Inbox <span className="chip chip-accent">3 new</span>
                    </p>
                    <span className="label">Today</span>
                </div>
            ) : (
                <div className="inbox-head sk-head">
                    <AsciiSkeleton variant={variant} lines={1} widths={["12ch"]} seed={47} />
                    <AsciiSkeleton variant={variant} lines={1} widths={["6ch"]} seed={48} />
                </div>
            )}
            <div className="rows">
                {MAIL.map((m, i) => (
                    <div className={`row${i === 0 ? " active" : ""}`} key={m.name}>
                        {ready ? (
                            <img className="row-av" src={m.av} alt="" decoding="async" />
                        ) : (
                            <span className="row-av-sk">
                                <AsciiSkeleton variant={variant} rows={2} width={28} height={28} circle seed={50 + i} />
                            </span>
                        )}
                        {ready ? (
                            <div className="row-text">
                                <div className="row-top">
                                    <span className={`row-name${m.unread ? "" : " read"}`}>{m.name}</span>
                                    <span className="row-time">{m.time}</span>
                                </div>
                                <span className={`row-msg${m.unread ? "" : " read"}`}>{m.msg}</span>
                            </div>
                        ) : (
                            <div className="row-sk">
                                <AsciiSkeleton variant={variant} lines={2} widths={["42%", "86%"]} seed={60 + i * 3} />
                            </div>
                        )}
                        <span className={`dot${!ready ? " sk" : m.unread ? "" : " read"}`} aria-label={ready && m.unread ? "Unread" : undefined} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ---------- AI assistant (mascot demo) ---------- */
const TILES = {
    latte: "images/home/mood-latte.webp",
    beans: "images/home/mood-beans.webp",
    cup: "images/home/mood-cup.webp",
    shop: "images/home/mood-shop.webp",
};
function Ora({ ready, variant }: { ready: boolean; variant: SkeletonVariant }) {
    const sk = (props: Parameters<typeof AsciiSkeleton>[0]) => <AsciiSkeleton variant={variant} {...props} />;
    const tile = (src: string, alt: string, seed: number, caption?: string) => (
        <div className="tile">
            {ready ? (
                <>
                    <img src={src} alt={alt} decoding="async" />
                    {caption && <em>{caption}</em>}
                </>
            ) : (
                sk({ rows: 14, className: "tile-sk", seed })
            )}
        </div>
    );
    return (
        <div className="gcard ora">
            <div className="chat">
                <div className="chat-head">
                    <div className="who">
                        {ready ? <img src="images/home/ora.png" alt="" /> : <span className="who-sk">{sk({ rows: 3, width: 36, height: 36, circle: true, seed: 90 })}</span>}
                        {ready ? (
                            <div>
                                <b>Ora</b>
                                <small>assistant</small>
                            </div>
                        ) : (
                            <div className="who-lines">{sk({ lines: 2, widths: ["4ch", "9ch"], seed: 91 })}</div>
                        )}
                    </div>
                    {ready ? (
                        <span className="chip chip-success">
                            <i /> Done in 2.4s
                        </span>
                    ) : (
                        sk({ lines: 1, widths: ["13ch"], seed: 92, className: "chip-sk" })
                    )}
                </div>
                <div className="thread">
                    {ready ? (
                        <p className="bubble">Moodboard for most exciting effect with positive vibe pls</p>
                    ) : (
                        <div className="bubble bubble-sk">{sk({ lines: 2, widths: ["100%", "62%"], seed: 93 })}</div>
                    )}
                </div>
                <div className="ask" aria-hidden="true">
                    {ready ? "Ask Ora anything…" : sk({ lines: 1, widths: ["17ch"], seed: 94 })}
                    {ready ? (
                        <span className="send">
                            <Icon icon={ArrowRight02Icon} size={20} />
                        </span>
                    ) : (
                        sk({ rows: 3, width: 28, height: 28, circle: true, seed: 95 })
                    )}
                </div>
            </div>
            <div className="mood">
                <div className="mood-head">
                    {ready ? (
                        <>
                            Universal — moodboard
                            <span className="label">4 images</span>
                        </>
                    ) : (
                        <>
                            {sk({ lines: 1, widths: ["21ch"], seed: 96 })}
                            {sk({ lines: 1, widths: ["8ch"], seed: 97 })}
                        </>
                    )}
                </div>
                <div className="mood-grid">
                    {tile(TILES.latte, "Watercolour horses running through a golden field", 98, "latte_art.jpg")}
                    <div className="mood-stack">
                        {tile(TILES.beans, "Double exposure of a profile and wild flowers", 99, "beans.jpg")}
                        <div className="mood-pair">
                            {tile(TILES.cup, "Blurred dancer in warm red light", 100)}
                            {tile(TILES.shop, "Figure in soft pastel light with a lily", 101)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Effects() {
    return (
        <Band id="effects" label="Effects">
            <div className="inner">
                <Head label="Effects" title={<>+10.000 aura<br />with the whole gang</>} sub="Two for waiting, two for showing off. Hover to wake them up." />
                <div className="bento">
                    <div className="bento-row top">
                        <WakeCard ms={1200} preset="dither" className="slot-profile" label="Profile card">
                            {(ready) => <DemoProfile data={ready ? PROFILE : null} variant="dither" seed={7} />}
                        </WakeCard>
                        <div className="bento-col">
                            <WakeCard ms={900} preset="dither" className="slot-player" label="Music player card">
                                {(ready) => <DemoPlayer ready={ready} variant="dither" />}
                            </WakeCard>
                            <WakeCard ms={1100} preset="dither" className="slot-story" label="Customer story card">
                                {(ready) => <DemoStory ready={ready} variant="dither" />}
                            </WakeCard>
                        </div>
                    </div>
                    <div className="bento-row bottom">
                        <WakeCard ms={1000} preset="dither" className="slot-inbox" label="Inbox card">
                            {(ready) => <Inbox ready={ready} variant="dither" />}
                        </WakeCard>
                        <WakeCard ms={2400} preset="dither" className="slot-ora" label="AI assistant card">
                            {(ready) => <Ora ready={ready} variant="dither" />}
                        </WakeCard>
                    </div>
                </div>
            </div>
        </Band>
    );
}

/* ---------- playground ---------- */
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
type Net = "fast" | "slow" | "never";
const NETS: [Net, string][] = [
    ["fast", "Fast"],
    ["slow", "Slow 3G"],
    ["never", "Never loads"],
];
const NET_MS: Record<Net, number> = { fast: 350, slow: 2400, never: Infinity };
const NET_NOTE: Record<Net, string> = {
    fast: "Data lands almost at once, so the reveal does all the talking.",
    slow: "Skeleton holds until data arrives, then the reveal takes over.",
    never: "The request never resolves. The skeleton keeps shimmering, politely.",
};

function Seg<T extends string>({ value, set, options, label, soft }: { value: T; set: (v: T) => void; options: [T, string][]; label: string; soft?: boolean }) {
    return (
        <div className={`seg${soft ? " soft" : ""}`} role="group" aria-label={label}>
            {options.map(([v, text]) => (
                <button key={v} type="button" aria-pressed={value === v} onClick={() => set(v)}>
                    {text}
                </button>
            ))}
        </div>
    );
}

function Product() {
    return (
        <div className="pcard">
            <div className="p-photo">
                <img src="images/home/aura-print.webp" alt="Thermal-colour abstract print" decoding="async" />
            </div>
            <div className="p-title">
                <span>Aura No. 3</span>
                <span>€120.00</span>
            </div>
            <p className="p-desc">Giclée print · 50 × 70 cm · edition of 40</p>
            <div className="p-spacer" />
            <span className="btn btn-primary p-btn" data-ascii="fade">
                Add to cart
            </span>
        </div>
    );
}
function ProductSkeleton({ variant }: { variant: SkeletonVariant }) {
    return (
        <div className="pcard sk" aria-hidden="true">
            <div className="sk-photo">
                <AsciiSkeleton variant={variant} rows={11} seed={81} />
            </div>
            <div className="sk-pad sk-title">
                <AsciiSkeleton variant={variant} lines={1} widths={["14ch"]} seed={82} />
                <AsciiSkeleton variant={variant} lines={1} widths={["9ch"]} seed={83} />
            </div>
            <div className="sk-pad">
                <AsciiSkeleton variant={variant} lines={1} widths={["90%"]} seed={84} />
            </div>
            <div className="p-spacer" />
            <div className="sk-pad">
                <div className="sk-btn">
                    <AsciiSkeleton variant={variant} lines={1} widths={["30ch"]} seed={85} />
                </div>
            </div>
        </div>
    );
}

function Playground() {
    const [variant, setVariant] = useState<SkeletonVariant>("dither");
    const [preset, setPreset] = useState<PresetName>("decode");
    const [net, setNet] = useState<Net>("slow");
    const [run, setRun] = useState(0);
    const [ready, setReady] = useState(false);
    const [waving, setWaving] = useState(false);
    const replay = useCallback(() => setRun((r) => r + 1), []);
    useEffect(() => {
        setReady(false);
        setWaving(false);
        const ms = NET_MS[net];
        if (!isFinite(ms)) return;
        const id = window.setTimeout(() => {
            setReady(true);
            setWaving(true);
        }, ms);
        return () => clearTimeout(id);
    }, [run, net, variant, preset]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "r" && e.key !== "R") return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement;
            if (t.closest("input, textarea, select, [contenteditable]")) return;
            replay();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [replay]);
    // start the first run when the stage scrolls into view
    const stageRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = stageRef.current;
        if (!el) return;
        const io = new IntersectionObserver((es) => {
            if (es.some((e) => e.isIntersecting)) {
                io.disconnect();
                replay();
            }
        }, { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, [replay]);
    return (
        <Band id="playground" label="Playground">
            <div className="inner">
                <Head label="Playground" title="Poke it. It won’t bite." sub="Switch the skeleton, the reveal and the network. Every card replays." />
                <div className="toolbar" role="group" aria-label="Animation controls">
                    <div className="tgroup">
                        <span className="label">Skeleton</span>
                        <Seg value={variant} set={setVariant} options={SK_VARIANTS} label="Skeleton variant" />
                    </div>
                    <div className="tgroup">
                        <span className="label">Reveal</span>
                        <Seg value={preset} set={setPreset} options={RV_PRESETS} label="Reveal preset" />
                    </div>
                    <button type="button" className="btn btn-glass btn-sm" onClick={replay}>
                        <Icon icon={RefreshIcon} size={16} /> Replay <kbd>R</kbd>
                    </button>
                </div>
                <div className="netsim">
                    <span className="label">Network</span>
                    <Seg value={net} set={setNet} options={NETS} label="Network speed" soft />
                    <p aria-live="polite">{NET_NOTE[net]}</p>
                </div>
                <div className="stage" ref={stageRef}>
                    <div className="state">
                        <ProductSkeleton variant={variant} />
                        <div className="caption">
                            <span className="n">1</span>
                            <div>
                                <b>Loading</b>
                                <small>ASCII skeleton shimmers</small>
                            </div>
                        </div>
                    </div>
                    <div className="state">
                        <div className="live">
                            <AsciiReveal loading={!ready} revealOnMount={false} lazy={false} preset={preset} fallback={FALLBACK} onRevealComplete={() => setWaving(false)}>
                                {ready ? <Product /> : <ProductSkeleton variant={variant} />}
                            </AsciiReveal>
                            <span className={`wave-tag${waving ? " on" : ""}`}>reveal wave ↓</span>
                        </div>
                        <div className="caption">
                            <span className="n accent">2</span>
                            <div>
                                <b>{ready ? "Data arrives" : net === "never" ? "Still waiting…" : "Fetching…"}</b>
                                <small>{ready ? "reveal wave decodes it" : "live: press R to replay"}</small>
                            </div>
                        </div>
                    </div>
                    <div className="state">
                        <Product />
                        <div className="caption">
                            <span className="n">3</span>
                            <div>
                                <b>Ready</b>
                                <small>the real UI, untouched</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Band>
    );
}

/* ---------- usage ---------- */
const SNIPPET = `<AsciiReveal loading={!data}>
  {data ? <Profile data={data} />
     : <AsciiSkeleton variant="dither" />}
</AsciiReveal>`;
function Usage() {
    const { done, copy } = useCopy(SNIPPET);
    return (
        <Band id="usage" label="Usage">
            <div className="inner">
                <div className="usage">
                    <div className="usage-copy">
                        <Head label="Usage" title="Three lines to ship" />
                        <ul className="points">
                            {["Plays nice with Vite & Next.js", "Respects prefers-reduced-motion", "Pauses off-screen to save battery"].map((p) => (
                                <li key={p}>
                                    <Icon icon={Tick02Icon} size={20} />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="code">
                        <button type="button" className="copy" onClick={copy} aria-label="Copy code">
                            <Icon icon={Copy01Icon} size={12} stroke={1.8} /> {done || "Copy"}
                        </button>
                        <pre>
                            <code>
                                <span className="pn">{"<"}</span>
                                <span className="tag">AsciiReveal</span>
                                <span className="attr"> loading</span>
                                {"={!data}>\n  {data "}
                                <span className="kw">?</span>
                                {" <Profile data={data} />\n     "}
                                <span className="kw">:</span>
                                <span className="pn"> {"<"}</span>
                                <span className="tag">AsciiSkeleton</span>
                                <span className="attr"> variant</span>
                                <span className="str">="dither"</span>
                                {" />}\n"}
                                <span className="pn">{"</"}</span>
                                <span className="tag">AsciiReveal</span>
                                <span className="pn">{">"}</span>
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        </Band>
    );
}

/* ---------- final CTA ---------- */
function FinalCta() {
    const star = useStars();
    return (
        <Band id="backgrounds" label="Star the project">
            <div className="inner">
                <div className="banner">
                    <h2 className="h2">Made you look. Now make it star</h2>
                    <div className="ctas">
                        <a className="btn btn-primary" href={GH} target="_blank" rel="noreferrer">
                            <Icon icon={GithubIcon} size={16} /> {star}
                        </a>
                        <a className="btn btn-outline" href={DOCS} target="_blank" rel="noreferrer">
                            Read the docs
                        </a>
                    </div>
                </div>
            </div>
        </Band>
    );
}

/* ---------- footer ---------- */
function Footer() {
    const cols: [string, [string, string][]][] = [
        ["Product", [["Components", "#effects"], ["Backgrounds", "#backgrounds"], ["Lab", "#playground"]]],
        ["Resources", [["Docs", DOCS], ["API", `${GH}#api`], ["Changelog", CHANGELOG]]],
        ["Project", [["GitHub", GH], ["npm", NPM], ["MIT license", `${GH}/blob/main/LICENSE`]]],
    ];
    return (
        <footer className="band footer">
            <span className="joint l" aria-hidden="true" />
            <span className="joint r" aria-hidden="true" />
            <div className="rail">
                <div className="inner">
                    <div className="f-brand">
                        <span className="logo">
                            <span className="mark" aria-hidden="true" />
                            ascii-reveal
                        </span>
                        <p>
                            ASCII loading &amp; motion effects for React. Open source, MIT.
                            <br />
                            Made by Quan Hoang
                        </p>
                    </div>
                    <div className="f-cols">
                        {cols.map(([title, items]) => (
                            <div className="f-col" key={title}>
                                <p className="label">{title}</p>
                                {items.map(([t, href]) => (
                                    <a key={t} href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                                        {t}
                                    </a>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default function Home() {
    return (
        <>
            <Nav />
            <main>
                <Hero />
                <Effects />
                <Playground />
                <Usage />
                <FinalCta />
            </main>
            <Footer />
        </>
    );
}
