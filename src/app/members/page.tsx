"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorMessage, roleTitle } from "@/lib/format";

const ROLES = [
  "member",
  "committee1",
  "committee2",
  "chair",
  "treasurer",
] as const;

type Role = (typeof ROLES)[number];

export default function MembersPage() {
  const members = useQuery(api.members.list);
  const createMember = useMutation(api.members.create);
  const setRole = useMutation(api.members.setRole);
  const setActive = useMutation(api.members.setActive);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await createMember({
        employeeNo: String(data.get("employeeNo")),
        firstName: String(data.get("firstName")),
        middleName: String(data.get("middleName") ?? "") || undefined,
        lastName: String(data.get("lastName")),
        email: String(data.get("email")),
        position: String(data.get("position") ?? "") || undefined,
        isPermanent: data.get("isPermanent") === "on",
        role: data.get("role") as Role,
      });
      form.reset();
      setShowForm(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(memberId: Id<"members">, role: Role) {
    setError(null);
    try {
      await setRole({ memberId, role });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Members</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Add faculty members and assign committee posts.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add member"}
        </button>
      </div>

      {error !== null && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="firstName" label="First name" required />
            <Text name="middleName" label="Middle name" />
            <Text name="lastName" label="Last name" required />
            <Text name="employeeNo" label="Employee no." required />
            <Text name="email" label="Email" type="email" required />
            <Text name="position" label="Position" />
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="w-56">
              <label className="label" htmlFor="role">
                Role
              </label>
              <select id="role" name="role" className="input" defaultValue="member">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleTitle(role)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                name="isPermanent"
                defaultChecked
                className="h-4 w-4 rounded border-stone-300"
              />
              Permanent status
            </label>
          </div>

          <p className="text-xs text-ink-muted">
            The member signs up separately with this same email address; their
            account links automatically on first sign-in.
          </p>

          <div className="flex justify-end border-t border-stone-200 pt-4">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      )}

      {members === undefined ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Employee no.</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Account</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {members.map((member) => (
                <tr key={member._id} className={member.active ? "" : "opacity-50"}>
                  <td className="px-5 py-3">
                    <span className="font-medium">{member.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {member.email}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{member.employeeNo}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`badge ${
                        member.isPermanent
                          ? "bg-stone-200 text-stone-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {member.isPermanent ? "Permanent" : "Probationary"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      className="input py-1 text-xs"
                      value={member.role}
                      onChange={(event) =>
                        void changeRole(
                          member._id as Id<"members">,
                          event.target.value as Role,
                        )
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleTitle(role)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`badge ${
                        member.linked
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {member.linked ? "Linked" : "Not signed up"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="text-xs text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                      onClick={() =>
                        void setActive({
                          memberId: member._id as Id<"members">,
                          active: !member.active,
                        }).catch((caught) => setError(errorMessage(caught)))
                      }
                    >
                      {member.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Text({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {!required && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className="input" />
    </div>
  );
}
