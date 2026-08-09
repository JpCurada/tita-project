"use client";

import { useId, useState } from "react";

/**
 * Password input with a reveal toggle.
 *
 * The control is a real <button> inside the field's own relative box, so it is
 * reachable by keyboard and announces its state. Toggling swaps the input's
 * `type`, which is what browsers and password managers expect.
 */
export function PasswordField({
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  minLength,
  hint,
}: {
  name?: string;
  label?: string;
  autoComplete?: string;
  minLength?: number;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={hint ? hintId : undefined}
          // Room for the toggle, so a long password never runs under it.
          className="input pr-10"
        />

        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
          // Not in the tab order: it sits between the password field and the
          // submit button, where a stop would interrupt every sign-in.
          tabIndex={-1}
          className="absolute inset-y-1 right-1 grid w-9 place-items-center rounded
                     text-ink-faint transition-colors duration-150
                     hover:bg-black/[0.04] hover:text-ink"
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>

      {hint && (
        <p id={hintId} className="mt-2 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Drawn to match the hairline weight of the rules elsewhere on the page. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 10S4.6 4.5 10 4.5 18.5 10 18.5 10 15.4 15.5 10 15.5 1.5 10 1.5 10Z" />
      <circle cx="10" cy="10" r="2.6" />
      {crossed && <path d="M3.5 16.5 16.5 3.5" />}
    </svg>
  );
}
