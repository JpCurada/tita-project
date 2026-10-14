"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import { errorMessage } from "@/lib/format";

/**
 * Bulk member entry by pasting rows straight out of a spreadsheet.
 *
 * The association's roster already lives in Excel, so copying a block of cells
 * and pasting it here is far less work than filling one form per person.
 * Tab-separated (what Excel puts on the clipboard) and comma-separated are both
 * accepted, and the parsed rows are shown before anything is saved.
 */

type ParsedRow = {
  employeeNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  position?: string;
  isPermanent: boolean;
  error?: string;
};

const SAMPLE = `2016-0198	Elena	B.	Bautista	e.bautista@pit.edu.ph	Instructor III	permanent
2014-0163	Ramon	V.	Villanueva	r.villanueva@pit.edu.ph	Assistant Professor I	permanent
2021-0276	Marisol	P.	Delgado	m.delgado@pit.edu.ph	Instructor I	probationary`;

function parse(text: string): ParsedRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      // Excel copies with tabs; a pasted CSV uses commas.
      const cells = (line.includes("\t") ? line.split("\t") : line.split(","))
        .map((cell) => cell.trim());
      const [employeeNo, firstName, middleName, lastName, email, position, standing] =
        cells;

      const row: ParsedRow = {
        employeeNo: employeeNo ?? "",
        firstName: firstName ?? "",
        middleName: middleName || undefined,
        lastName: lastName ?? "",
        email: (email ?? "").toLowerCase(),
        position: position || undefined,
        // Anything other than an explicit "probationary" counts as permanent,
        // since most of the roster is and the column is easy to leave blank.
        isPermanent: (standing ?? "").toLowerCase().trim() !== "probationary",
      };

      if (cells.length < 5) {
        row.error = "Needs at least 5 columns";
      } else if (row.firstName === "" || row.lastName === "") {
        row.error = "Missing name";
      } else if (!row.email.includes("@")) {
        row.error = "Invalid email";
      } else if (row.employeeNo === "") {
        row.error = "Missing employee number";
      }
      return row;
    });
}

export function ImportMembers({ onDone }: { onDone: () => void }) {
  const createMany = useMutation(api.members.createMany);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    added: string[];
    skipped: { row: number; name: string; reason: string }[];
  } | null>(null);

  const rows = useMemo(() => parse(text), [text]);
  const valid = rows.filter((r) => r.error === undefined);
  const invalid = rows.filter((r) => r.error !== undefined);

  async function handleImport() {
    setError(null);
    setSaving(true);
    try {
      const outcome = await createMany({
        rows: valid.map(({ error: _error, ...row }) => row),
      });
      setResult(outcome);
      if (outcome.added.length > 0) setText("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  if (result !== null) {
    return (
      <div className="leaf mt-6 p-6">
        <span className="eyebrow">Import finished</span>
        <p className="mt-2 text-sm">
          <span className="font-medium text-viridian">
            {result.added.length} added
          </span>
          {result.skipped.length > 0 && (
            <span className="text-ink-pencil">
              {" · "}
              {result.skipped.length} skipped
            </span>
          )}
        </p>

        {result.skipped.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-rule">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Name</th>
                  <th scope="col">Why it was skipped</th>
                </tr>
              </thead>
              <tbody>
                {result.skipped.map((s) => (
                  <tr key={`${s.row}-${s.name}`}>
                    <td className="tnum font-mono text-sm">{s.row}</td>
                    <td>{s.name || "Missing"}</td>
                    <td className="text-ink-pencil">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex gap-4 border-t border-rule pt-5">
          <button className="btn-primary" onClick={onDone}>
            Back to members
          </button>
          <button className="btn-quiet" onClick={() => setResult(null)}>
            Paste another list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaf mt-6 p-6">
      <span className="eyebrow">Paste a roster</span>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-pencil">
        Copy the rows from your spreadsheet and paste them below, one member per
        line, in this order:
      </p>

      <p className="mt-3 overflow-x-auto whitespace-nowrap rounded-xl bg-bond px-4 py-3 font-mono text-xs text-ink-pencil">
        Employee no. · First name · Middle · Last name · Email · Position ·
        permanent/probationary
      </p>

      <textarea
        className="input mt-4 min-h-44 resize-y font-mono text-xs"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={SAMPLE}
        aria-label="Member rows"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <button className="btn-quiet" onClick={() => setText(SAMPLE)}>
          Fill in an example
        </button>
        {rows.length > 0 && (
          <p className="text-xs text-ink-pencil">
            <span className="tnum font-mono">{valid.length}</span> ready
            {invalid.length > 0 && (
              <>
                {" · "}
                <span className="tnum font-mono text-oxide">
                  {invalid.length}
                </span>{" "}
                need fixing
              </>
            )}
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-5">
          <span className="eyebrow">Preview</span>
          <div className="mt-2 max-h-72 overflow-auto rounded-2xl border border-rule">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Employee no.</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Standing</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={row.error ? "bg-oxide-wash" : ""}>
                    <td className="tnum font-mono text-sm">
                      {row.employeeNo || "Missing"}
                    </td>
                    <td>
                      {`${row.firstName} ${row.middleName ?? ""} ${row.lastName}`.replace(
                        /\s+/g,
                        " ",
                      ).trim() || "Missing"}
                      {row.error && (
                        <span className="block text-xs text-oxide">{row.error}</span>
                      )}
                    </td>
                    <td className="text-ink-pencil">{row.email || "Missing"}</td>
                    <td className="text-sm">
                      {row.isPermanent ? (
                        "Permanent"
                      ) : (
                        <span className="text-amber-ledger">Probationary</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error !== null && (
        <p
          role="alert"
          className="mt-4 notice-error"
        >
          {error}
        </p>
      )}

      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink-faint">
        Everyone is added as a borrower. Assign committee seats afterwards from
        the members list. Each person signs up separately with the email address
        entered here.
      </p>

      <div className="mt-5 flex items-center justify-end gap-5 border-t border-rule pt-5">
        <button className="btn-quiet" onClick={onDone}>
          Cancel
        </button>
        <button
          className="btn-primary"
          disabled={saving || valid.length === 0}
          onClick={() => void handleImport()}
        >
          {saving
            ? "Adding"
            : `Add ${valid.length} member${valid.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
