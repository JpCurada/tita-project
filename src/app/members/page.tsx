"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ImportMembers } from "@/components/ImportMembers";
import { errorMessage, roleSeat } from "@/lib/format";
import { SkeletonTable } from "@/components/Skeleton";

const ROLES = ["member", "committee1", "committee2", "chair", "treasurer"] as const;
type Role = (typeof ROLES)[number];

export default function MembersPage() {
  const members = useQuery(api.members.list);
  const createMember = useMutation(api.members.create);
  const setRole = useMutation(api.members.setRole);
  const setActive = useMutation(api.members.setActive);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<"none" | "one" | "many">("none");

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
      setPanel("none");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Chair</span>
          <h1 className="page-title mt-1.5">Members</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn-secondary"
            aria-pressed={panel === "many"}
            onClick={() => setPanel(panel === "many" ? "none" : "many")}
          >
            Paste a roster
          </button>
          <button
            className="btn-primary"
            aria-pressed={panel === "one"}
            onClick={() => setPanel(panel === "one" ? "none" : "one")}
          >
            Add a member
          </button>
        </div>
      </div>

      <hr className="mt-5 border-rule-strong" />

      {error !== null && (
        <p
          role="alert"
          className="mt-5 border-l-2 border-oxide bg-oxide-wash px-3 py-2 text-sm text-oxide"
        >
          {error}
        </p>
      )}

      {panel === "many" && <ImportMembers onDone={() => setPanel("none")} />}

      {panel === "one" && (
        <form onSubmit={handleCreate} className="leaf mt-6 p-6">
          <span className="eyebrow">New member</span>
          <div className="mt-5 grid gap-x-7 gap-y-5 sm:grid-cols-3">
            <Text name="firstName" label="First name" required />
            <Text name="middleName" label="Middle name" />
            <Text name="lastName" label="Last name" required />
            <Text name="employeeNo" label="Employee no." required />
            <Text name="email" label="Email" type="email" required />
            <Text name="position" label="Position" />
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-5">
            <div className="w-56">
              <label className="label" htmlFor="role">
                Role
              </label>
              <select id="role" name="role" className="input" defaultValue="member">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleSeat(role)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 pb-2 text-sm">
              <input
                type="checkbox"
                name="isPermanent"
                defaultChecked
                className="h-4 w-4 rounded-none border-rule-strong text-viridian focus:ring-viridian"
              />
              Permanent status
            </label>
          </div>

          <p className="mt-5 max-w-lg text-xs leading-relaxed text-ink-faint">
            The member signs up separately using this same email address. Their
            account links to this record on first sign-in.
          </p>

          <div className="mt-6 flex justify-end border-t border-rule pt-5">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Adding" : "Add member"}
            </button>
          </div>
        </form>
      )}

      {members === undefined ? (
        <SkeletonTable rows={6} columns={6} />
      ) : (
        <div className="mt-7 overflow-x-auto">
          <table className="ledger">
            <caption className="sr-only">Faculty association members</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Employee no.</th>
                <th scope="col">Standing</th>
                <th scope="col">Role</th>
                <th scope="col">Account</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member._id} className={member.active ? "" : "opacity-45"}>
                  <td>
                    <span className="block text-sm font-medium">{member.name}</span>
                    <span className="block text-xs text-ink-faint">
                      {member.email}
                    </span>
                  </td>
                  <td className="tnum font-mono text-sm text-ink-pencil">
                    {member.employeeNo}
                  </td>
                  <td className="text-sm">
                    {member.isPermanent ? (
                      "Permanent"
                    ) : (
                      <span className="text-amber-ledger">Probationary</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="input py-1 text-sm"
                      aria-label={`Role for ${member.name}`}
                      value={member.role}
                      onChange={(event) =>
                        void setRole({
                          memberId: member._id as Id<"members">,
                          role: event.target.value as Role,
                        }).catch((caught) => setError(errorMessage(caught)))
                      }
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {roleSeat(role)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-sm">
                    {member.linked ? (
                      <span className="text-viridian">Linked</span>
                    ) : (
                      <span className="text-ink-faint">Not signed up</span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      className="btn-quiet"
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
        {!required && <span className="normal-case tracking-normal"> (optional)</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className="input" />
    </div>
  );
}
