import { useEffect, useRef } from "react";
import { createCurrents, type CurrentsOptions } from "./currents";

/**
 * The currents background (lab preview of `<AsciiBackground scene="currents" />`).
 * Fills its positioned parent, which is also where the cursor parts the lines.
 * Mark a button inside the parent with `data-currents-trigger` and hovering or clicking it sends runners.
 */
export function CurrentsScene({ className, ...opts }: Omit<CurrentsOptions, "stage"> & { className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const key = JSON.stringify(opts);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        const handle = createCurrents(cv, { ...opts, stage: cv.parentElement ?? undefined });
        return () => handle.destroy();
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
    return <canvas ref={ref} className={className} aria-hidden="true" />;
}
