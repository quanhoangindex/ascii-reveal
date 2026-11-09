import { useEffect, useState, type ReactNode } from "react";
import {
    AsciiReveal,
    AsciiSkeleton,
    type MascotName,
    type PresetName,
    type SkeletonVariant,
} from "ascii-reveal";
import { FALLBACK, type Slug } from "../site/shared";
import { DragonsScene } from "../home/DragonsScene";
import { CurrentsScene } from "../home/CurrentsScene";
import { VoiceNote } from "./VoiceNote";
import { Ctl, Seg, Slider, jsx } from "./ui";

/* Per-component content for the docs pages: description, live demo, props. */

export type PropRow = { name: string; type: string; def: string; desc: string };
export type Demo = { stage: ReactNode; controls: ReactNode; snippet: string };
export type Doc = {
    desc: string;
    /** Not in the npm package yet: shown with a note, and the prompt says so. */
    lab?: boolean;
    importLine: string;
    useDemo: (run: number) => Demo;
    props: PropRow[];
};

const PRESETS: [PresetName, string][] = [
    ["decode", "Decode"],
    ["dither", "Dither"],
    ["terminal", "Terminal"],
    ["blueprint", "Blueprint"],
];

/** Fake network: false for `ms` after every run, then true. Infinity never resolves. */
function useArrival(ms: number, deps: unknown[]) {
    const [ok, setOk] = useState(false);
    useEffect(() => {
        setOk(false);
        if (!isFinite(ms)) return;
        const id = window.setTimeout(() => setOk(true), ms);
        return () => clearTimeout(id);
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps
    return ok;
}

/* ---------- Reveal ---------- */
type Wave = "center" | "corner" | "cursor";
const ORIGIN = { center: "center", corner: "top-left", cursor: "pointer" } as const;
function useRevealDemo(run: number): Demo {
    const [preset, setPreset] = useState<PresetName>("decode");
    const [wave, setWave] = useState<Wave>("cursor");
    const [speed, setSpeed] = useState(1);
    const [photo, setPhoto] = useState(false);
    const data = useArrival(900, [run, preset, wave, speed]);
    return {
        stage: (
            <AsciiReveal
                className="demo-fit"
                loading={!(data && photo)}
                preset={preset}
                origin={ORIGIN[wave]}
                speed={speed}
                revealOnMount={false}
                lazy={false}
                fallback={FALLBACK}>
                <VoiceNote onPhotoReady={() => setPhoto(true)} />
            </AsciiReveal>
        ),
        controls: (
            <>
                <Ctl label="Preset">
                    <Seg value={preset} set={setPreset} options={PRESETS} label="Preset" />
                </Ctl>
                <Ctl label="Wave">
                    <Seg
                        value={wave}
                        set={setWave}
                        label="Wave origin"
                        options={[
                            ["center", "Center"],
                            ["corner", "Corner"],
                            ["cursor", "Cursor"],
                        ]}
                    />
                </Ctl>
                <Ctl label="Speed">
                    <Slider value={speed} set={setSpeed} min={0.25} max={2} step={0.25} label="Speed" />
                </Ctl>
            </>
        ),
        snippet: jsx(
            "AsciiReveal",
            [
                ["loading", "{!data}"],
                ["preset", preset !== "decode" ? preset : undefined],
                ["origin", wave !== "center" ? ORIGIN[wave] : undefined],
                ["speed", speed !== 1 ? speed : undefined],
            ],
            "<VoiceNote data={data} />",
        ),
    };
}

/* ---------- Mascot ---------- */
type Load = "quick" | "slow" | "never";
const LOAD_MS: Record<Load, number> = { quick: 1500, slow: 4000, never: Infinity };
function useMascotDemo(run: number): Demo {
    const [mascot, setMascot] = useState<MascotName>("ghost");
    const [load, setLoad] = useState<Load>("slow");
    const [photo, setPhoto] = useState(false);
    const data = useArrival(LOAD_MS[load], [run, mascot, load]);
    return {
        stage: (
            <AsciiReveal
                className="demo-fit"
                loading={!(data && photo)}
                mascot={mascot}
                revealOnMount={false}
                lazy={false}
                fallback={FALLBACK}>
                <VoiceNote onPhotoReady={() => setPhoto(true)} />
            </AsciiReveal>
        ),
        controls: (
            <>
                <Ctl label="Mascot">
                    <Seg
                        value={mascot}
                        set={setMascot}
                        label="Mascot"
                        options={[
                            ["ghost", "Ghost"],
                            ["spider", "Spider"],
                            ["pumpkin", "Pumpkin"],
                            ["bat", "Bat"],
                        ]}
                    />
                </Ctl>
                <Ctl label="Network">
                    <Seg
                        value={load}
                        set={setLoad}
                        label="Network"
                        options={[
                            ["quick", "1.5 s"],
                            ["slow", "4 s"],
                            ["never", "Never"],
                        ]}
                    />
                </Ctl>
            </>
        ),
        snippet: jsx(
            "AsciiReveal",
            [
                ["loading", "{!data}"],
                ["mascot", mascot],
            ],
            "<VoiceNote data={data} />",
        ),
    };
}

/* ---------- Skeleton ---------- */
function useSkeletonDemo(run: number): Demo {
    const [variant, setVariant] = useState<SkeletonVariant>("dither");
    const [lines, setLines] = useState(3);
    const [animate, setAnimate] = useState<"on" | "off">("on");
    const seed = run * 11;
    const common = { variant, animate: animate === "on" } as const;
    const v = variant !== "dither" ? variant : undefined;
    return {
        stage: (
            <div className="skc" aria-label="Loading post" role="status">
                <div className="skc-head">
                    <span className="skc-av">
                        <AsciiSkeleton {...common} rows={3} width={40} height={40} circle seed={seed + 1} />
                    </span>
                    <AsciiSkeleton {...common} lines={2} widths={["14ch", "9ch"]} seed={seed + 2} />
                </div>
                <div className="skc-img">
                    <AsciiSkeleton {...common} rows={9} seed={seed + 3} />
                </div>
                <AsciiSkeleton {...common} lines={lines} seed={seed + 4} />
            </div>
        ),
        controls: (
            <>
                <Ctl label="Variant">
                    <Seg
                        value={variant}
                        set={setVariant}
                        label="Variant"
                        options={[
                            ["dither", "Dither"],
                            ["scan", "Scan"],
                            ["braille", "Braille"],
                            ["terminal", "Terminal"],
                        ]}
                    />
                </Ctl>
                <Ctl label="Lines">
                    <Slider value={lines} set={setLines} min={1} max={6} step={1} label="Lines" format={(n) => String(n)} />
                </Ctl>
                <Ctl label="Shimmer">
                    <Seg
                        value={animate}
                        set={setAnimate}
                        label="Shimmer"
                        options={[
                            ["on", "On"],
                            ["off", "Off"],
                        ]}
                    />
                </Ctl>
            </>
        ),
        snippet: [
            jsx("AsciiSkeleton", [
                ["variant", v],
                ["rows", 3],
                ["width", 40],
                ["height", 40],
                ["circle", true],
                ["animate", animate === "off" ? false : undefined],
            ]),
            jsx("AsciiSkeleton", [
                ["variant", v],
                ["rows", 9],
                ["animate", animate === "off" ? false : undefined],
            ]),
            jsx("AsciiSkeleton", [
                ["variant", v],
                ["lines", lines !== 3 ? lines : undefined],
                ["animate", animate === "off" ? false : undefined],
            ]),
        ]
            .join("\n"),
    };
}

/* ---------- Dragons (lab) ---------- */
function useDragonsDemo(run: number): Demo {
    const [count, setCount] = useState(3);
    const [size, setSize] = useState(1.15);
    const [speed, setSpeed] = useState(1);
    const [fire, setFire] = useState<"on" | "off">("on");
    return {
        stage: (
            <div className="scene-stage">
                <DragonsScene
                    key={run}
                    className="scene-canvas"
                    count={count}
                    size={size}
                    speed={speed}
                    fire={fire === "on"}
                    avoid={false}
                />
            </div>
        ),
        controls: (
            <>
                <Ctl label="Dragons">
                    <Seg
                        value={count}
                        set={setCount}
                        label="Dragons"
                        options={[1, 2, 3, 4, 5].map((n) => [n, String(n)] as [number, string])}
                    />
                </Ctl>
                <Ctl label="Fire">
                    <Seg
                        value={fire}
                        set={setFire}
                        label="Fire"
                        options={[
                            ["on", "On"],
                            ["off", "Off"],
                        ]}
                    />
                </Ctl>
                <Ctl label="Size">
                    <Slider value={size} set={setSize} min={0.6} max={1.6} step={0.05} label="Size" />
                </Ctl>
                <Ctl label="Speed">
                    <Slider value={speed} set={setSpeed} min={0.25} max={2} step={0.25} label="Speed" />
                </Ctl>
            </>
        ),
        snippet: jsx("AsciiBackground", [
            ["scene", "dragons"],
            ["count", count],
            ["size", size !== 1.15 ? size : undefined],
            ["speed", speed !== 1 ? speed : undefined],
            ["fire", fire === "off" ? false : undefined],
                ]),
    };
}

/* ---------- Currents (lab) ---------- */
function useCurrentsDemo(run: number): Demo {
    const [lines, setLines] = useState(40);
    const [bend, setBend] = useState(1.4);
    const [speed, setSpeed] = useState(1);
    return {
        stage: (
            <div className="scene-stage">
                <CurrentsScene key={run} className="scene-canvas pixelated" lines={lines} bend={bend} speed={speed} />
                <button type="button" className="btn btn-glass btn-sm scene-btn" data-currents-trigger>
                    Send runners
                </button>
            </div>
        ),
        controls: (
            <>
                <Ctl label="Lines">
                    <Seg
                        value={lines}
                        set={setLines}
                        label="Lines"
                        options={[20, 40, 60].map((n) => [n, String(n)] as [number, string])}
                    />
                </Ctl>
                <Ctl label="Bend">
                    <Slider value={bend} set={setBend} min={0} max={2.5} step={0.1} label="Bend" />
                </Ctl>
                <Ctl label="Speed">
                    <Slider value={speed} set={setSpeed} min={0.25} max={2} step={0.25} label="Speed" />
                </Ctl>
            </>
        ),
        snippet: jsx(
            "AsciiBackground",
            [
                ["scene", "currents"],
                ["lines", lines !== 40 ? lines : undefined],
                ["bend", bend !== 1.4 ? +bend.toFixed(1) : undefined],
                ["speed", speed !== 1 ? speed : undefined],
            ],
            '<button data-currents-trigger>Star on GitHub</button>',
        ),
    };
}

const MASCOT_TYPE = "'spider' | 'ghost' | 'pumpkin' | 'bat' | url";

export const DOC: Record<Slug, Doc> = {
    skeleton: {
        desc: "Placeholder lines and blocks drawn in shimmering glyphs. Same footprint as the real content, so nothing jumps when the data lands.",
        importLine: 'import { AsciiSkeleton } from "ascii-reveal";',
        useDemo: useSkeletonDemo,
        props: [
            { name: "variant", type: "'dither' | 'scan' | 'braille' | 'terminal'", def: "'dither'", desc: "Glyph style: shaded blocks, decode glyphs, fine dots, or 0/1 in your accent colour." },
            { name: "lines", type: "number", def: "3", desc: "Number of text lines." },
            { name: "widths", type: "(string | number)[]", def: "–", desc: "Line widths as CSS lengths or px. Defaults to a natural paragraph shape." },
            { name: "rows", type: "number", def: "–", desc: "Draws a block (image, avatar, chart) this many glyph rows tall instead of text lines." },
            { name: "width / height", type: "string | number", def: "–", desc: "Block size. Use with rows." },
            { name: "circle", type: "boolean", def: "false", desc: "Round block, for avatars." },
            { name: "seed", type: "number", def: "–", desc: "Pattern seed, so neighbouring skeletons don’t look identical." },
            { name: "animate", type: "boolean", def: "true", desc: "Shimmer. Turn it off for long lists: a still pattern paints as fast as a grey box." },
        ],
    },
    mascot: {
        desc: "Swaps the shimmer for a tiny animated ASCII character while the data takes its time. Pass an image URL if spiders aren’t on brand.",
        importLine: 'import { AsciiReveal } from "ascii-reveal";',
        useDemo: useMascotDemo,
        props: [
            { name: "mascot", type: `${MASCOT_TYPE} | MascotDraw`, def: "–", desc: "Who keeps the user company. A URL turns any image into ASCII; a function draws your own frame by frame." },
            { name: "loading", type: "boolean", def: "false", desc: "The mascot plays while this is true. Switching to false decodes the content in." },
            { name: "preset", type: "'decode' | 'dither' | 'terminal' | 'blueprint'", def: "'decode'", desc: "Glyph style of the reveal that follows." },
            { name: "onRevealComplete", type: "() => void", def: "–", desc: "Runs when the reveal finishes." },
        ],
    },
    reveal: {
        desc: "Decodes text, images and cards from ASCII into the real thing as they load. Text is readable almost at once; images wait until they are ready.",
        importLine: 'import { AsciiReveal } from "ascii-reveal";',
        useDemo: useRevealDemo,
        props: [
            { name: "loading", type: "boolean", def: "false", desc: "Scrambles the content out with a shimmer; switching to false decodes the new content in." },
            { name: "preset", type: "'decode' | 'dither' | 'terminal' | 'blueprint'", def: "'decode'", desc: "Glyph style of the reveal, or your own preset object." },
            { name: "speed", type: "number", def: "1", desc: "Playback speed multiplier." },
            { name: "duration", type: "'fast' | 'cinematic'", def: "'fast'", desc: "fast keeps data readable within about 400 ms." },
            { name: "origin", type: "'center' | 'top-left' | 'pointer' | { x, y }", def: "'center'", desc: "Where the wave starts." },
            { name: "mascot", type: MASCOT_TYPE, def: "–", desc: "Swaps the shimmer for an animated ASCII mascot while loading." },
            { name: "lazy", type: "boolean", def: "true", desc: "Reveals sections below the fold as they scroll in." },
            { name: "onRevealComplete", type: "() => void", def: "–", desc: "Runs when a reveal finishes." },
        ],
    },
    dragons: {
        lab: true,
        desc: "A full-bleed background of ASCII dragons that glide, beat their wings and breathe fire on the turns. Made for heroes that need a little drama.",
        importLine: 'import { AsciiBackground } from "ascii-reveal";',
        useDemo: useDragonsDemo,
        props: [
            { name: "count", type: "number", def: "4", desc: "How many dragons, 1 to 5." },
            { name: "size", type: "number", def: "1.15", desc: "Dragon scale." },
            { name: "speed", type: "number", def: "1", desc: "Flight speed multiplier." },
            { name: "glow", type: "number", def: "0.5", desc: "Halo strength around bellies and fire." },
            { name: "cell", type: "number", def: "7", desc: "Glyph cell size in px." },
            { name: "fire", type: "boolean", def: "true", desc: "Fire breath on the turns." },
            { name: "gusts", type: "boolean", def: "true", desc: "Wind curls after a wing beat." },
            { name: "grid", type: "boolean", def: "true", desc: "Faint dotted grid behind the flight." },
            { name: "cursor", type: "boolean", def: "true", desc: "Reacts to the pointer." },
        ],
    },
    currents: {
        lab: true,
        desc: "Dotted streamlines that bend like smoke, with bright runners racing down them. Buttons inside can send a volley.",
        importLine: 'import { AsciiBackground } from "ascii-reveal";',
        useDemo: useCurrentsDemo,
        props: [
            { name: "lines", type: "number", def: "40", desc: "Streamlines per 1100 px of width." },
            { name: "bend", type: "number", def: "1.4", desc: "How far the lines bend. 0 is straight." },
            { name: "speed", type: "number", def: "1", desc: "Drift speed multiplier." },
            { name: "runners", type: "number", def: "10", desc: "Runners per minute." },
            { name: "tint", type: "boolean", def: "false", desc: "Tints runners with the accent colour." },
            { name: "cursor", type: "boolean", def: "true", desc: "Lines part around the pointer." },
            { name: "data-currents-trigger", type: "attribute", def: "–", desc: "Put it on a button inside the scene: hover sends three runners, a click sends a volley." },
        ],
    },
};
