"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ImportMembers } from "@/components/ImportMembers";
import { errorMessage, roleSeat } from "@/lib/format";
import { SkeletonTable } from "@/components/Skeleton";

const ROLES = ["member", "committee1", "committee2", "chair", "treasurer"] as const;
type Role = (typeof ROLES)[number];

/**
 * What the chair actually chooses. The two committee seats are one choice here
 * — they are not numbered posts, and the system only keeps them apart so it can
 * tell the two decisions on a loan apart. Picking "Committee Member" takes
 * whichever seat is free.
 */
const CHOICES = ["member", "committee", "chair", "treasurer"] as const;
type Choice = (typeof CHOICES)[number];

function choiceLabel(choice: Choice): string {
  return choice === "committee" ? "Committee Member" : roleSeat(choice);
}

/** The choice a stored role belongs to, for showing the select's value. */
function choiceOf(role: Role): Choice {
  return role === "committee1" || role === "committee2" ? "committee" : role;
}

export default function MembersPage() {
  const members = useQuery(api.members.list);
  const createMember = useMutation(api.members.create);
  const setRole = useMutation(api.members.setRole);
  const setActive = useMutation(api.members.setActive);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<"none" | "one" | "many">("none");

  // Staged changes awaiting confirmation. The selects stay controlled by server
  // state, so cancelling one snaps the control back on its own.
  const [roleChange, setRoleChange] = useState<{
    memberId: Id<"members">;
    name: string;
    from: Role;
    to: Role;
  } | null>(null);
  const [activeChange, setActiveChange] = useState<{
    memberId: Id<"members">;
    name: string;
    active: boolean;
  } | null>(null);
  const [applying, setApplying] = useState(false);

  /**
   * Turns the chair's choice into a stored role. "Committee Member" takes the
   * free seat; if this person already holds one, they keep it.
   */
  function resolveRole(choice: Choice, current: Role): Role {
    if (choice !== "committee") return choice;
    if (current === "committee1" || current === "committee2") return current;
    const taken = new Set(
      (members ?? []).filter((m) => m.active).map((m) => m.role),
    );
    return taken.has("committee1") ? "committee2" : "committee1";
  }

  async function applyRoleChange() {
    if (roleChange === null) return;
    setApplying(true);
    try {
      await setRole({ memberId: roleChange.memberId, role: roleChange.to });
      setRoleChange(null);
    } catch (caught) {
      setError(errorMessage(caught));
      setRoleChange(null);
    } finally {
      setApplying(false);
    }
  }

  async function applyActiveChange() {
    if (activeChange === null) return;
    setApplying(true);
    try {
      await setActive({
        memberId: activeChange.memberId,
        active: activeChange.active,
      });
      setActiveChange(null);
    } catch (caught) {
      setError(errorMessage(caught));
      setActiveChange(null);
    } finally {
      setApplying(false);
    }
  }

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
        role: resolveRole(data.get("role") as Choice, "member"),
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

      <hr className="mt-6 border-rule" />

      {error !== null && (
        <p
          role="alert"
          className="mt-5 notice-error"
        >
          {error}
        </p>
      )}

      {panel === "many" && <ImportMembers onDone={() => setPanel("none")} />}

      {panel === "one" && (
        <form onSubmit={handleCreate} className="leaf mt-6 p-6 sm:p-7">
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
                {CHOICES.map((choice) => (
                  <option key={choice} value={choice}>
                    {choiceLabel(choice)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2.5 pb-2 text-sm">
              <input
                type="checkbox"
                name="isPermanent"
                defaultChecked
                className="h-4 w-4 rounded border-rule-strong accent-[#1a3d8f]"
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
        <div className="mt-7 overflow-x-auto rounded-2xl border border-rule">
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
                      value={choiceOf(member.role as Role)}
                      onChange={(event) =>
                        setRoleChange({
                          memberId: member._id as Id<"members">,
                          name: member.name,
                          from: member.role as Role,
                          to: resolveRole(
                            event.target.value as Choice,
                            member.role as Role,
                          ),
                        })
                      }
                    >
                      {CHOICES.map((choice) => (
                        <option key={choice} value={choice}>
                          {choiceLabel(choice)}
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
                        setActiveChange({
                          memberId: member._id as Id<"members">,
                          name: member.name,
                          active: !member.active,
                        })
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

      <ConfirmDialog
        open={roleChange !== null}
        title="Change this role?"
        confirmLabel="Change role"
        busy={applying}
        busyLabel="Changing"
        onConfirm={() => void applyRoleChange()}
        onCancel={() => setRoleChange(null)}
      >
        <p>
          <span className="font-medium text-ink">{roleChange?.name}</span> moves
          from <span className="font-medium text-ink">
            {roleChange && roleSeat(roleChange.from)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-ink">
            {roleChange && roleSeat(roleChange.to)}
          </span>
          .
        </p>
        {roleChange?.to !== "member" && (
          <p className="mt-2.5">
            Committee seats are held by one person at a time. If someone already
            holds this seat, reassign them first.
          </p>
        )}
        {roleChange?.from !== "member" && (
          <p className="mt-2.5">
            They lose the access that came with their present seat.
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={activeChange !== null}
        title={
          activeChange?.active ? "Reactivate this member?" : "Deactivate this member?"
        }
        confirmLabel={activeChange?.active ? "Reactivate" : "Deactivate"}
        tone={activeChange?.active ? "default" : "danger"}
        busy={applying}
        busyLabel="Saving"
        onConfirm={() => void applyActiveChange()}
        onCancel={() => setActiveChange(null)}
      >
        <p>
          <span className="font-medium text-ink">{activeChange?.name}</span>
          {activeChange?.active
            ? " regains access and can file loans again."
            : " loses access immediately and cannot file or stand as co-maker. Their past loans stay in the archive."}
        </p>
      </ConfirmDialog>
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
