import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Icon } from "../site/shared";

/* The Reveal demo card: a photo, a quote and a voice note.
   The waveform is the clip's peaks; the player here is visual only (no sound file ships with the demo). */

const PEAKS = [
    8.3, 14.1, 5.6, 9.6, 3.5, 10.4, 4.2, 12, 14.1, 11.2, 7.7, 11.2, 3.2, 15.7, 6.4,
    12.6, 6.7, 10.6, 8.8, 7, 12.8, 6.2, 14.9, 15.8,
];
const LENGTH = 9; // seconds

export function VoiceNote({ onPhotoReady }: { onPhotoReady?: () => void }) {
    const [playing, setPlaying] = useState(false);
    const [t, setT] = useState(0);
    const raf = useRef(0);
    useEffect(() => {
        if (!playing) return;
        let last = performance.now();
        const tick = (now: number) => {
            setT((v) => {
                const n = v + (now - last) / 1000;
                last = now;
                if (n >= LENGTH) {
                    setPlaying(false);
                    return 0;
                }
                return n;
            });
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [playing]);
    const done = Math.floor((t / LENGTH) * PEAKS.length);
    const secs = playing || t > 0 ? Math.floor(t) : LENGTH;
    return (
        <figure className="vn">
            <img
                className="vn-photo"
                src="images/home/quote-photo.webp"
                alt="A designer in profile, blurred by a passing train"
                decoding="async"
                ref={(el) => {
                    if (el?.complete && el.naturalWidth) onPhotoReady?.();
                }}
                onLoad={onPhotoReady}
                onError={onPhotoReady}
            />
            <blockquote className="vn-quote">
                “Investors kept saying the product felt slow. It wasn’t slow, the
                loading screen was just ugly. We made it ASCII and now they call it
                a vibe.”
            </blockquote>
            <div className="vn-audio" data-ascii="fade">
                <button
                    type="button"
                    className="vn-play"
                    aria-label={playing ? "Pause voice note" : "Play voice note (preview, no sound)"}
                    onClick={(e) => {
                        e.stopPropagation();
                        setPlaying((p) => !p);
                    }}>
                    <Icon icon={playing ? PauseIcon : PlayIcon} size={16} stroke={2} />
                </button>
                <span className="vn-wave" aria-hidden="true">
                    {PEAKS.map((h, i) => (
                        <i key={i} style={{ height: h }} className={(playing || t > 0) && i >= done ? "dim" : undefined} />
                    ))}
                </span>
                <span className="vn-time">
                    0:{String(secs).padStart(2, "0")}
                </span>
            </div>
            <figcaption className="vn-who">Designer / Stockholm</figcaption>
        </figure>
    );
}
