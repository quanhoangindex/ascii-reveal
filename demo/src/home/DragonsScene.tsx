import { useEffect, useRef } from "react";
import { createDragons, type DragonsOptions } from "./dragons";

/**
 * The dragons background (lab preview of `<AsciiBackground scene="dragons" />`).
 * Fills its positioned parent; the parent is also the flight area and receives the cursor.
 * Locked defaults: Decode preset, 4 dragons, size 1.15×, speed 1×, glow 0.5×, 7 px cells.
 */
export function DragonsScene({ className, ...opts }: DragonsOptions & { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const key = JSON.stringify(opts);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const handle = createDragons(cv, { ...opts, stage: cv.parentElement ?? undefined });
        return () => handle.destroy();
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
    return <canvas ref={ref} className={className} aria-hidden="true" />;
}
