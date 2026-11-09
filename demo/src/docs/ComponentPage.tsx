import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowDown01Icon,
    ArrowLeft02Icon,
    ArrowRight02Icon,
    Copy01Icon,
    GithubIcon,
    Link04Icon,
    Moon02Icon,
    RefreshIcon,
    SparklesIcon,
    Sun01Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";
import {
    COMPONENTS,
    Footer,
    GH,
    GROUPS,
    Icon,
    Nav,
    href,
    useCopy,
    useResolvedTheme,
    type Slug,
} from "../site/shared";
import { DOC, type Doc } from "./demos";
import { Highlight } from "./ui";

const SECTIONS = [
    ["preview", "Preview"],
    ["usage", "Usage"],
    ["props", "Props"],
] as const;

function promptFor(name: string, doc: Doc, snippet: string) {
    const props = doc.props
        .map((p) => `- ${p.name} (${p.type}${p.def !== "–" ? `, default ${p.def}` : ""}): ${p.desc}`)
        .join("\n");
    return [
        `Add the ${name} effect from the ascii-reveal React library to my app.`,
        doc.lab
            ? `Note: ${name} is a lab preview and is not in the npm package yet. Tell me that before writing code, and only continue if I say so.`
            : "Install: npm i ascii-reveal",
        "",
        `What it does: ${doc.desc}`,
        "",
        "Example:",
        doc.importLine,
        "",
        snippet,
        "",
        "Props:",
        props,
        "",
        "Keep my existing markup and styles. Reduced motion is handled by the library.",
        `Docs: ${GH}#readme`,
    ].join("\n");
}

/* ---------- sidebar ---------- */
function SideNav({ slug, onPick }: { slug: Slug; onPick?: () => void }) {
    return (
        <nav className="side-nav" aria-label="Components">
            {GROUPS.map((g) => (
                <div className="side-group" key={g}>
                    <p className="label">{g}</p>
                    {COMPONENTS.filter((c) => c.group === g).map((c) => (
                        <a
                            key={c.slug}
                            href={href(c.slug)}
                            aria-current={c.slug === slug ? "page" : undefined}
                            onClick={onPick}>
                            {c.name}
                            {c.isNew && <span className="new">New</span>}
                        </a>
                    ))}
                </div>
            ))}
        </nav>
    );
}

/* ---------- mobile picker: "Motion › Reveal" opens the component list ---------- */
function Picker({ slug }: { slug: Slug }) {
    const [open, setOpen] = useState(false);
    const c = COMPONENTS.find((x) => x.slug === slug)!;
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);
    return (
        <div className={`picker${open ? " is-open" : ""}`}>
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="picker-path">
                    <span>{c.group}</span> › <b>{c.name}</b>
                </span>
                <span className="picker-all">
                    All components <Icon icon={ArrowDown01Icon} size={16} />
                </span>
            </button>
            {open && (
                <div className="picker-sheet">
                    <SideNav slug={slug} onPick={() => setOpen(false)} />
                </div>
            )}
        </div>
    );
}

/* ---------- on this page ---------- */
function useActiveSection() {
    const [active, setActive] = useState<string>("preview");
    useEffect(() => {
        const on = () => {
            let cur: string = SECTIONS[0][0];
            for (const [id] of SECTIONS) {
                const el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top < 200) cur = id;
            }
            // the last section is active once the page bottoms out
            if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1][0];
            setActive(cur);
        };
        on();
        window.addEventListener("scroll", on, { passive: true });
        return () => window.removeEventListener("scroll", on);
    }, []);
    return active;
}
const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
    });

/* ---------- preview box ---------- */
function Preview({ name, doc, onSnippet }: { name: string; doc: Doc; onSnippet: (s: string) => void }) {
    const [run, setRun] = useState(0);
    const [view, setView] = useState<"preview" | "code">("preview");
    const site = useResolvedTheme();
    const [scope, setScope] = useState<"light" | "dark" | null>(null);
    const theme = scope ?? site;
    const demo = doc.useDemo(run);
    useEffect(() => onSnippet(demo.snippet), [demo.snippet, onSnippet]);
    const code = useCopy(demo.snippet);
    const link = useCopy(() => location.href);
    const replay = () => {
        setView("preview");
        setRun((r) => r + 1);
    };
    // R replays, like the homepage playground
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.key !== "r" && e.key !== "R") || e.metaKey || e.ctrlKey || e.altKey) return;
            if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
            replay();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);
    return (
        <div className="pv" data-theme={scope ?? undefined}>
            <div className="pv-bar">
                <div className="seg soft" role="tablist" aria-label="View">
                    {(["preview", "code"] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            role="tab"
                            aria-selected={view === v}
                            aria-pressed={view === v}
                            onClick={() => setView(v)}>
                            {v === "preview" ? "Preview" : "Code"}
                        </button>
                    ))}
                </div>
                <div className="pv-tools">
                    <button type="button" className="icon-btn" onClick={replay} aria-label="Replay" title="Replay (R)">
                        <Icon icon={RefreshIcon} size={18} />
                    </button>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setScope(theme === "dark" ? "light" : "dark")}
                        aria-label={`Preview in ${theme === "dark" ? "light" : "dark"} mode`}
                        title={`Preview in ${theme === "dark" ? "light" : "dark"} mode`}>
                        <Icon icon={theme === "dark" ? Sun01Icon : Moon02Icon} size={18} />
                    </button>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={link.copy}
                        aria-label="Copy link to this component"
                        title={link.done === "Copied" ? "Link copied" : "Copy link"}>
                        <Icon icon={link.done === "Copied" ? Tick02Icon : Link04Icon} size={18} />
                    </button>
                </div>
            </div>
            <div className={`pv-stage${view === "code" ? " is-code" : ""}`}>
                <div className="pv-demo" aria-hidden={view === "code"}>
                    {demo.stage}
                </div>
                {view === "code" && (
                    <div className="pv-code">
                        <button type="button" className="copy" onClick={code.copy} aria-label="Copy code">
                            <Icon icon={Copy01Icon} size={12} stroke={1.8} /> {code.done || "Copy"}
                        </button>
                        <pre>
                            <code>
                                <Highlight code={`${doc.importLine}\n\n${demo.snippet}`} />
                            </code>
                        </pre>
                    </div>
                )}
            </div>
            <div className="pv-controls" role="group" aria-label={`${name} controls`}>
                {demo.controls}
                <button type="button" className="btn btn-primary btn-sm pv-replay" onClick={replay}>
                    <Icon icon={RefreshIcon} size={16} /> Replay
                </button>
            </div>
        </div>
    );
}

export default function ComponentPage({ slug }: { slug: Slug }) {
    const c = COMPONENTS.find((x) => x.slug === slug)!;
    const doc = DOC[slug];
    const i = COMPONENTS.indexOf(c);
    const prev = COMPONENTS[i - 1];
    const next = COMPONENTS[i + 1];
    const [snippet, setSnippet] = useState("");
    const install = useCopy("npm i ascii-reveal");
    const prompt = useCopy(() => promptFor(c.name, doc, snippet));
    const usage = useCopy(() => `${doc.importLine}\n\n${snippet}`);
    const active = useActiveSection();
    const main = useRef<HTMLElement>(null);
    useEffect(() => {
        document.title = `${c.name} · ascii-reveal`;
        return () => {
            document.title = "ascii-reveal";
        };
    }, [c.name]);
    const props = useMemo(() => doc.props, [doc]);
    return (
        <>
            <Nav section="components" />
            <div className="band docs-band">
                <span className="joint l" aria-hidden="true" />
                <span className="joint r" aria-hidden="true" />
                <div className="rail docs">
                    <aside className="docs-side">
                        <SideNav slug={slug} />
                    </aside>
                    <main className="docs-main" ref={main} id="top">
                        <Picker slug={slug} />
                        <header className="doc-head">
                            <nav className="crumbs" aria-label="Breadcrumb">
                                <a href={href(COMPONENTS[0].slug)}>Components</a>
                                <span aria-hidden="true">›</span>
                                <span>{c.group}</span>
                                <span aria-hidden="true">›</span>
                                <span aria-current="page">{c.name}</span>
                            </nav>
                            <h1>{c.name}</h1>
                            <p className="doc-desc">{doc.desc}</p>
                            {doc.lab && (
                                <p className="lab-note">
                                    <span className="new">Lab</span> Runs on this site today. Ships in the package as{" "}
                                    <code>&lt;AsciiBackground /&gt;</code> next, so the API below may still change.
                                </p>
                            )}
                            <div className="doc-actions">
                                <button
                                    type="button"
                                    className="install install-sm"
                                    onClick={install.copy}
                                    aria-label="Copy install command">
                                    $ npm i ascii-reveal
                                    {install.done ? (
                                        <span className="ok">{install.done}</span>
                                    ) : (
                                        <Icon icon={Copy01Icon} size={14} />
                                    )}
                                </button>
                                <a className="btn btn-glass btn-sm" href={GH} target="_blank" rel="noreferrer">
                                    <Icon icon={GithubIcon} size={16} /> Source
                                </a>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={prompt.copy}
                                    title="Copies install steps, this example and every prop, ready to paste into your AI assistant">
                                    <Icon icon={prompt.done === "Copied" ? Tick02Icon : SparklesIcon} size={16} />
                                    {prompt.done === "Copied" ? "Prompt copied" : "Copy prompt"}
                                </button>
                            </div>
                        </header>

                        <section id="preview" className="doc-sec" aria-label="Preview">
                            <Preview key={slug} name={c.name} doc={doc} onSnippet={setSnippet} />
                        </section>

                        <section id="usage" className="doc-sec" aria-labelledby="usage-h">
                            <div className="sec-head">
                                <h2 id="usage-h">Usage</h2>
                                <p>Wrap anything that loads. The snippet follows the controls above.</p>
                            </div>
                            <div className="code">
                                <button type="button" className="copy" onClick={usage.copy} aria-label="Copy code">
                                    <Icon icon={Copy01Icon} size={12} stroke={1.8} /> {usage.done || "Copy"}
                                </button>
                                <pre>
                                    <code>
                                        <Highlight code={`${doc.importLine}\n\n${snippet}`} />
                                    </code>
                                </pre>
                            </div>
                        </section>

                        <section id="props" className="doc-sec" aria-labelledby="props-h">
                            <div className="sec-head">
                                <h2 id="props-h">Props</h2>
                                <p>
                                    {doc.lab
                                        ? "Options the scene takes today."
                                        : "Generated from the TypeScript types, so it never drifts."}
                                </p>
                            </div>
                            <div className="props" role="table" aria-label={`${c.name} props`}>
                                <div className="props-row props-head" role="row">
                                    <span role="columnheader">Prop</span>
                                    <span role="columnheader">Type</span>
                                    <span role="columnheader">Default</span>
                                </div>
                                {props.map((p) => (
                                    <div className="props-row" role="row" key={p.name}>
                                        <span role="cell" className="p-name">
                                            <code>{p.name}</code>
                                            <small>{p.desc}</small>
                                        </span>
                                        <span role="cell" className="p-type">
                                            <code>{p.type}</code>
                                        </span>
                                        <span role="cell" className="p-def">
                                            <span className="p-k">Default</span>
                                            <code>{p.def}</code>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <nav className="pager" aria-label="Previous and next component">
                            {prev ? (
                                <a href={href(prev.slug)}>
                                    <span className="label">Previous</span>
                                    <b>
                                        <Icon icon={ArrowLeft02Icon} size={16} /> {prev.name}
                                    </b>
                                </a>
                            ) : (
                                <span />
                            )}
                            {next && (
                                <a href={href(next.slug)} className="next">
                                    <span className="label">Next</span>
                                    <b>
                                        {next.name} <Icon icon={ArrowRight02Icon} size={16} />
                                    </b>
                                </a>
                            )}
                        </nav>
                    </main>
                    <aside className="docs-toc" aria-label="On this page">
                        <nav>
                            {SECTIONS.map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-current={active === id ? "location" : undefined}
                                    onClick={() => jump(id)}>
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </aside>
                </div>
            </div>
            <Footer />
        </>
    );
}
