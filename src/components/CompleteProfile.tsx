"use client";

import { useMutation } from "convex/react";
import Image from "next/image";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import { SiteFooter } from "@/components/SiteFooter";
import { Spinner } from "@/components/Spinner";
import { toUserMessage } from "@/lib/errors";

/**
 * Shown once, right after a member's first sign-in.
 *
 * Members register themselves, so the details that used to come from the
 * chair's roster — name, employee number, standing — are collected here
 * instead. Everything asked for appears on the printed loan form, which is why
 * none of it can be skipped.
 */
export function CompleteProfile({ onSignOut }: { onSignOut: () => void }) {
  const registerSelf = useMutation(api.members.registerSelf);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const data = new FormData(event.currentTarget);
    try {
      await registerSelf({
        firstName: String(data.get("firstName") ?? ""),
        middleName: String(data.get("middleName") ?? "") || undefined,
        lastName: String(data.get("lastName") ?? ""),
        employeeNo: String(data.get("employeeNo") ?? ""),
        position: String(data.get("position") ?? "") || undefined,
        isPermanent: data.get("isPermanent") === "on",
      });
      // The membership query re-runs on its own and the app takes over.
    } catch (caught) {
      setError(toUserMessage(caught, "We could not save those details."));
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="rise w-full max-w-lg">
          <div className="text-center">
            <Image
              src="/pit-logo.png"
              alt=""
              width={52}
              height={52}
              className="mx-auto"
              priority
            />
            <p className="eyebrow mt-5">PIT Faculty Association</p>
            <h1 className="page-title mt-2">Tell us who you are</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-pencil">
              These details are printed on your loan form, so they should match
              your records at the Institute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="leaf mt-8 p-6 sm:p-7">
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <Field name="firstName" label="First name" required autoFocus />
              <Field name="lastName" label="Last name" required />
              <Field name="middleName" label="Middle name" />
              <Field name="employeeNo" label="Employee number" required />
            </div>

            <div className="mt-5">
              <Field
                name="position"
                label="Position"
                placeholder="Instructor I, College of Education"
              />
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-bond p-4">
              <input
                type="checkbox"
                name="isPermanent"
                defaultChecked
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-rule-strong accent-[#1a3d8f]"
              />
              <span className="text-sm leading-relaxed">
                <span className="font-medium">I am in permanent status.</span>
                <span className="mt-0.5 block text-ink-pencil">
                  Only permanent members may stand as a co-maker on someone
                  else&rsquo;s loan. The committee checks this when it reviews an
                  application.
                </span>
              </span>
            </label>

            {error !== null && (
              <p
                role="alert"
                className="rise mt-5 notice-error"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-rule pt-5">
              <button type="button" className="btn-quiet" onClick={onSignOut}>
                Sign out
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Spinner />}
                {saving ? "Saving" : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Field({
  name,
  label,
  required = false,
  autoFocus = false,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {!required && <span className="text-ink-faint"> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}
