import { Fragment, type ReactNode } from "react";

/* Small pieces shared by the component pages: segmented control, slider, code highlighting. */

export function Seg<T extends string | number>({
    value,
    set,
    options,
    label,
}: {
    value: T;
    set: (v: T) => void;
    options: [T, string][];
    label: string;
}) {
    return (
        <div className="seg soft" role="group" aria-label={label}>
            {options.map(([v, text]) => (
                <button
                    key={String(v)}
                    type="button"
                    aria-pressed={value === v}
                    onClick={() => set(v)}>
                    {text}
                </button>
            ))}
        </div>
    );
}

export function Slider({
    value,
    set,
    min,
    max,
    step,
    label,
    format = (v) => `${v.toFixed(2).replace(/0$/, "")}×`,
}: {
    value: number;
    set: (v: number) => void;
    min: number;
    max: number;
    step: number;
    label: string;
    format?: (v: number) => string;
}) {
    return (
        <span className="slider">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                aria-label={label}
                style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }}
                onChange={(e) => set(+e.target.value)}
            />
            <output>{format(value)}</output>
        </span>
    );
}

/** A labelled control in the preview's control bar. */
export function Ctl({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="ctl">
            <span className="label">{label}</span>
            {children}
        </div>
    );
}

/** JSX snippet: attributes on their own lines once there are more than two. */
export function jsx(tag: string, attrs: [string, string | number | boolean | undefined][], child?: string) {
    const parts = attrs
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) =>
            v === true
                ? k
                : typeof v === "string"
                  ? v.startsWith("{")
                      ? `${k}=${v}`
                      : `${k}="${v}"`
                  : `${k}={${v}}`,
        );
    const open =
        parts.length > 2
            ? `<${tag}\n${parts.map((p) => "  " + p).join("\n")}\n`
            : `<${tag}${parts.map((p) => " " + p).join("")}`;
    if (!child) return `${open}${parts.length > 2 ? "/>" : " />"}`;
    return `${open}>\n${child
        .split("\n")
        .map((l) => "  " + l)
        .join("\n")}\n</${tag}>`;
}

/** Lightweight JSX highlighter: tags, attributes, strings, punctuation. */
const TOKENS = /(<\/?|\/?>)|("[^"\n]*")|((?<=<\/?)[A-Za-z][\w.]*)|([A-Za-z][\w]*(?==))|(\bimport\b|\bfrom\b|\?|(?<=\s):(?=\s))/g;
export function Highlight({ code }: { code: string }) {
    const out: ReactNode[] = [];
    let last = 0;
    for (const m of code.matchAll(TOKENS)) {
        const i = m.index ?? 0;
        if (i > last) out.push(code.slice(last, i));
        const cls = m[1] ? "pn" : m[2] ? "str" : m[3] ? "tag" : m[4] ? "attr" : "kw";
        out.push(
            <span key={i} className={cls}>
                {m[0]}
            </span>,
        );
        last = i + m[0].length;
    }
    out.push(code.slice(last));
    return <Fragment>{out}</Fragment>;
}
