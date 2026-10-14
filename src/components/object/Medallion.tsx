"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * The seal, set like an object on a white table: a turned bezel, a recessed
 * dish, and the seal on a raised plate. Every ring is CSS, so it stays sharp at
 * any size.
 *
 * On a fine pointer it tilts a few degrees toward the cursor, as if you had
 * picked it up. Reduced motion and touch both get a still object.
 */
export function Medallion({ className = "" }: { className?: string }) {
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;
    const still =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches;
    if (still) return;

    let frame = 0;
    function onMove(event: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!el) return;
        const box = el.getBoundingClientRect();
        // -1..1 from the medallion's centre, clamped so a far cursor does
        // not keep tipping it over.
        const clamp = (n: number) => Math.max(-1, Math.min(1, n));
        const x = clamp((event.clientX - (box.left + box.width / 2)) / (box.width * 2));
        const y = clamp((event.clientY - (box.top + box.height / 2)) / (box.height * 2));
        el.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
      });
    }
    function onLeave() {
      cancelAnimationFrame(frame);
      if (el) el.style.transform = "";
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className={`[perspective:900px] ${className}`}>
      <div
        ref={tiltRef}
        className="relative aspect-square w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
      >
        {/* Bezel */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(180deg,#fafafa,#eeeef0)",
            boxShadow:
              "inset 0 1px 2px rgba(0,0,0,0.06), 0 26px 60px rgba(0,0,0,0.10)",
          }}
        />
        {/* Dish */}
        <div
          className="absolute inset-[9%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #f6f6f7, #e6e6e9)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.07)",
          }}
        />
        {/* Plate */}
        <div
          className="absolute inset-[15%] rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ffffff, #f2f2f4 70%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 26px rgba(0,0,0,0.12)",
          }}
        />
        <Image
          src="/pit-logo.png"
          alt="Palompon Institute of Technology seal"
          width={320}
          height={320}
          priority
          className="absolute inset-[19%] h-[62%] w-[62%] select-none object-contain [filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.12))]"
          draggable={false}
        />
        {/* Specular: the light falls from the upper left, as in the reference. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[18%] top-[10%] h-[22%] w-[36%] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)",
          }}
        />
      </div>
    </div>
  );
}
