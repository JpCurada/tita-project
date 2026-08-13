"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/Spinner";

/**
 * A confirmation dialog for actions that are hard or impossible to undo.
 *
 * Deliberately not used everywhere: a prompt on every action trains people to
 * dismiss prompts without reading them, which is worse than no prompt at all.
 * It is reserved for decisions that cannot be taken back (an approval, a
 * release) and for actions that change someone else's access.
 *
 * The confirm button names the action rather than saying "OK", so the last
 * thing read before committing is what is about to happen.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Whatever had focus before the dialog opened, so it can be given back.
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    // Focus the confirm button, not the panel: the primary choice should be
    // one Enter away, while Escape and Cancel both back out.
    const focusTimer = window.setTimeout(() => confirmRef.current?.focus(), 20);

    // The page behind must not scroll while a dialog is over it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the dialog.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable === undefined || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop. Clicking it cancels, the same as Escape. */}
      <div
        className="fade-in absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
        onClick={() => !busy && onCancel()}
        aria-hidden="true"
      />

      {/* Rises from the bottom on a phone, scales in on a larger screen. */}
      <div
        ref={panelRef}
        className="dialog-panel relative w-full max-w-md rounded-t-xl bg-leaf
                   p-6 shadow-lift sm:rounded-xl"
      >
        <h2 id="confirm-title" className="section-title">
          {title}
        </h2>

        <div className="mt-2.5 text-sm leading-relaxed text-ink-pencil">
          {children}
        </div>

        {/* Confirm sits last, on the right: the reading order ends on the
            action being taken, and Cancel is the easier target to reach. */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={tone === "danger" ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Spinner />}
            {busy ? (busyLabel ?? "Working") : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
