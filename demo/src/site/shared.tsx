import { useEffect, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { createThumb, type ThumbHandle, type ThumbScene } from "./menuThumbs";
import {
    ArrowDown01Icon,
    ArrowUpRight01Icon,
    Cancel01Icon,
    ComputerIcon,
    GithubIcon,
    Menu01Icon,
    Moon02Icon,
    Sun01Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";

/* Shared site chrome: icons, theme, stars, copy, nav, footer and the component list. */

export const REPO = "quanhoangindex/ascii-reveal";
export const GH = `https://github.com/${REPO}`;
export const DOCS = `${GH}#readme`;
export const CHANGELOG = `${GH}/blob/main/CHANGELOG.md`;
export const NPM = "https://www.npmjs.com/package/ascii-reveal";
// benchmarks open the page with ?nofallback to measure raw performance
export const FALLBACK =
    typeof location === "undefined" || !location.search.includes("nofallback");

/* ---------- component list (sidebar, nav menu, footer, pager) ---------- */
export type Slug = "skeleton" | "mascot" | "reveal" | "dragons" | "currents";
export type Group = "Loading" | "Motion" | "Backgrounds";
export const COMPONENTS: { slug: Slug; name: string; group: Group; isNew?: boolean }[] = [
    { slug: "skeleton", name: "Skeleton", group: "Loading" },
    { slug: "mascot", name: "Mascot", group: "Loading" },
    { slug: "reveal", name: "Reveal", group: "Motion" },
    { slug: "dragons", name: "Dragons", group: "Backgrounds", isNew: true },
    { slug: "currents", name: "Currents", group: "Backgrounds", isNew: true },
];
export const GROUPS: Group[] = ["Loading", "Motion", "Backgrounds"];
export const href = (slug: Slug) => `#/components/${slug}`;

export function Icon({
    icon,
    size = 20,
    stroke = 1.5,
}: {
    icon: IconSvgElement;
    size?: number;
    stroke?: number;
}) {
    return (
        <HugeiconsIcon
            icon={icon}
            size={size}
            strokeWidth={stroke}
            aria-hidden="true"
        />
    );
}

/* ---------- theme ---------- */
export type Theme = "system" | "light" | "dark";
const THEME_KEY = "ascii-reveal-theme";
function readTheme(): Theme {
    try {
        const v = localStorage.getItem(THEME_KEY);
        if (v === "light" || v === "dark") return v;
    } catch {
        /* storage blocked */
    }
    return "system";
}
export function useTheme() {
    const [theme, setTheme] = useState<Theme>(readTheme);
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
    return { theme, setTheme };
}
/** The theme actually on screen right now (resolves "system"). */
export function useResolvedTheme(): "light" | "dark" {
    const get = (): "light" | "dark" => {
        const t = document.documentElement.getAttribute("data-theme");
        if (t === "light" || t === "dark") return t;
        return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };
    const [v, setV] = useState(get);
    useEffect(() => {
        const on = () => setV(get());
        const mo = new MutationObserver(on);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        const mq = matchMedia("(prefers-color-scheme: light)");
        mq.addEventListener("change", on);
        return () => {
            mo.disconnect();
            mq.removeEventListener("change", on);
        };
    }, []);
    return v;
}

/* ---------- GitHub stars ---------- */
let starsReq: Promise<number | null> | null = null;
export function useStars() {
    const [stars, setStars] = useState<number | null>(null);
    useEffect(() => {
        let alive = true;
        starsReq ??= fetch(`https://api.github.com/repos/${REPO}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) =>
                j && typeof j.stargazers_count === "number"
                    ? j.stargazers_count
                    : null,
            )
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
export function useCopy(text: string | (() => string)) {
    const [done, setDone] = useState<"" | "Copied" | "Select">("");
    const timer = useRef(0);
    const copy = () => {
        const end = (ok: boolean) => {
            setDone(ok ? "Copied" : "Select");
            clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setDone(""), 1600);
        };
        try {
            navigator.clipboard
                .writeText(typeof text === "function" ? text() : text)
                .then(
                    () => end(true),
                    () => end(false),
                );
        } catch {
            end(false);
        }
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    return { done, copy };
}

/* ---------- small popover menu (theme + components) ---------- */
function usePopover() {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!root.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                root.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
            }
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    // arrow keys move between the menu's items
    const onMenuKey = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const items = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>("[role^=menuitem]"),
        );
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    };
    return { open, setOpen, root, onMenuKey };
}

/* ---------- theme menu: System / Light / Dark ---------- */
const THEMES: [Theme, string, IconSvgElement][] = [
    ["system", "System", ComputerIcon],
    ["light", "Light", Sun01Icon],
    ["dark", "Dark", Moon02Icon],
];
function ThemeMenu() {
    const { theme, setTheme } = useTheme();
    const { open, setOpen, root, onMenuKey } = usePopover();
    const items = useRef<(HTMLButtonElement | null)[]>([]);
    const current = THEMES.find(([v]) => v === theme)!;
    useEffect(() => {
        if (open) items.current[THEMES.findIndex(([v]) => v === theme)]?.focus();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div className="theme" ref={root}>
            <button
                type="button"
                className="theme-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Theme: ${current[1]}`}
                title={`Theme: ${current[1]}`}
                onClick={() => setOpen((o) => !o)}>
                <span>
                    <Icon icon={current[2]} size={20} />
                </span>
            </button>
            {open && (
                <div className="theme-menu" role="menu" aria-label="Theme" onKeyDown={onMenuKey}>
                    {THEMES.map(([v, label, icon], i) => (
                        <button
                            key={v}
                            ref={(el) => (items.current[i] = el)}
                            type="button"
                            role="menuitemradio"
                            aria-checked={theme === v}
                            onClick={() => {
                                setTheme(v);
                                setOpen(false);
                            }}>
                            <Icon icon={icon} size={18} />
                            <span>{label}</span>
                            {theme === v && <Icon icon={Tick02Icon} size={16} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- components menu ---------- */
// each group has a live thumbnail; hovering or focusing an item switches it to that item's effect
const THUMB: Record<Slug, ThumbScene> = {
    skeleton: "skeleton",
    mascot: "ghost",
    reveal: "decode",
    dragons: "dragon",
    currents: "currents",
};
const MENU_ORDER: Group[] = ["Loading", "Backgrounds", "Motion"];
function GroupThumb({ scene }: { scene: ThumbScene }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const handle = useRef<ThumbHandle | null>(null);
    useEffect(() => {
        handle.current = createThumb(ref.current!, scene, "images/menu-reveal.webp");
        return () => handle.current?.destroy();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => handle.current?.set(scene), [scene]);
    return (
        <span className="comp-thumb" aria-hidden="true">
            <canvas ref={ref} />
        </span>
    );
}
function MenuGroup({ g, close }: { g: Group; close: () => void }) {
    const items = COMPONENTS.filter((c) => c.group === g);
    const [hot, setHot] = useState<Slug | null>(null);
    return (
        <div className="comp-group" role="group" aria-label={g} onPointerLeave={() => setHot(null)}>
            <GroupThumb scene={THUMB[hot ?? items[0].slug]} />
            <div className="comp-items">
                <p className="menu-label">{g}</p>
                {items.map((c) => (
                    <a
                        key={c.slug}
                        role="menuitem"
                        href={href(c.slug)}
                        onPointerEnter={() => setHot(c.slug)}
                        onFocus={() => setHot(c.slug)}
                        onClick={close}>
                        <span>{c.name}</span>
                        {c.isNew && <span className="new">New</span>}
                    </a>
                ))}
            </div>
        </div>
    );
}
function ComponentsMenu({ active }: { active: boolean }) {
    const { open, setOpen, root, onMenuKey } = usePopover();
    const menu = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (open) menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    }, [open]);
    return (
        <div className="theme" ref={root}>
            <button
                type="button"
                className={`nav-link${active ? " is-active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}>
                Components <Icon icon={ArrowDown01Icon} size={18} />
            </button>
            {open && (
                <div
                    ref={menu}
                    className="theme-menu comp-menu"
                    role="menu"
                    aria-label="Components"
                    onKeyDown={onMenuKey}>
                    {MENU_ORDER.map((g) => (
                        <MenuGroup key={g} g={g} close={() => setOpen(false)} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ---------- nav ---------- */
// overlay: transparent over the hero until the page scrolls (homepage only)
export function Nav({
    overlay = false,
    section,
}: {
    overlay?: boolean;
    section?: "components";
}) {
    const star = useStars();
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        if (!overlay) return;
        const on = () => setScrolled(window.scrollY > 8);
        on();
        window.addEventListener("scroll", on, { passive: true });
        return () => window.removeEventListener("scroll", on);
    }, [overlay]);
    useEffect(() => {
        const close = () => setOpen(false);
        window.addEventListener("hashchange", close);
        return () => window.removeEventListener("hashchange", close);
    }, []);
    const clear = overlay && !scrolled && !open;
    const changelog = (
        <a className="nav-link" href={CHANGELOG} target="_blank" rel="noreferrer">
            Changelog <Icon icon={ArrowUpRight01Icon} size={16} />
        </a>
    );
    return (
        <header className={`nav${overlay ? " nav-overlay" : ""}${clear ? " is-clear" : ""}`}>
            <div className="rail">
                <div className="nav-left">
                    <a className="logo" href="#/" aria-label="ascii-reveal home">
                        <img className="mark" src="logo.svg" alt="" width={24} height={24} />
                        ascii-reveal
                    </a>
                </div>
                <nav className="nav-links" aria-label="Main">
                    <ComponentsMenu active={section === "components"} />
                    {changelog}
                </nav>
                <div className="nav-right">
                    <ThemeMenu />
                    <a
                        className="btn btn-glass btn-sm"
                        href={GH}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${star} on GitHub`}>
                        <Icon icon={GithubIcon} size={16} />
                        <span className="star-label">{star}</span>
                    </a>
                    <button
                        type="button"
                        className="btn btn-glass btn-sm menu-btn"
                        aria-expanded={open}
                        aria-label="Menu"
                        onClick={() => setOpen((o) => !o)}>
                        <Icon icon={open ? Cancel01Icon : Menu01Icon} size={18} />
                    </button>
                </div>
            </div>
            {open && (
                <nav className="mobile-menu" aria-label="Main">
                    {GROUPS.map((g) => (
                        <div key={g} className="mm-group">
                            <p className="menu-label">{g}</p>
                            {COMPONENTS.filter((c) => c.group === g).map((c) => (
                                <a key={c.slug} className="nav-link" href={href(c.slug)}>
                                    {c.name}
                                    {c.isNew && <span className="new">New</span>}
                                </a>
                            ))}
                        </div>
                    ))}
                    <div className="mm-group">{changelog}</div>
                </nav>
            )}
        </header>
    );
}

/* ---------- footer ---------- */
export function Footer() {
    const cols: [string, [string, string][]][] = [
        ["Components", COMPONENTS.map((c) => [c.name, href(c.slug)])],
        [
            "Project",
            [
                ["GitHub", GH],
                ["npm", NPM],
                ["Changelog", CHANGELOG],
                ["MIT license", `${GH}/blob/main/LICENSE`],
            ],
        ],
    ];
    return (
        <footer className="band footer">
            <span className="joint l" aria-hidden="true" />
            <span className="joint r" aria-hidden="true" />
            <div className="rail">
                <div className="inner">
                    <div className="f-brand">
                        <a className="logo" href="#/">
                            <img className="mark" src="logo.svg" alt="" width={24} height={24} />
                            ascii-reveal
                        </a>
                        <p>
                            ASCII loading &amp; motion effects for React.
                            <br />
                            Open source, MIT.
                            <br />
                            Made by Quan Hoang
                        </p>
                    </div>
                    <div className="f-cols">
                        {cols.map(([title, items]) => (
                            <div className="f-col" key={title}>
                                <p className="label">{title}</p>
                                {items.map(([t, link]) => (
                                    <a
                                        key={t}
                                        href={link}
                                        {...(link.startsWith("http")
                                            ? { target: "_blank", rel: "noreferrer" }
                                            : {})}>
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

/** Hash route: "#/components/<slug>" opens a component page, anything else is the homepage. */
export function useRoute(): { page: "home" } | { page: "component"; slug: Slug } {
    const read = () => {
        const m = location.hash.match(/^#\/components\/([a-z]+)/);
        const c = m && COMPONENTS.find((x) => x.slug === m[1]);
        return c ? ({ page: "component", slug: c.slug } as const) : ({ page: "home" } as const);
    };
    const [r, setR] = useState(read);
    useEffect(() => {
        const on = () => {
            const next = read();
            setR((prev) => {
                // a route change starts at the top; in-page anchors (#effects) keep the browser's scroll
                const changed =
                    prev.page !== next.page ||
                    (prev.page === "component" && next.page === "component" && prev.slug !== next.slug);
                if (changed || location.hash === "#/") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                return changed ? next : prev;
            });
        };
        window.addEventListener("hashchange", on);
        return () => window.removeEventListener("hashchange", on);
    }, []);
    return r;
}

export type Children = { children?: ReactNode };
