import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { isClaim } from "@convex/lib/loan";
import { LoanFormPdf, type LoanFormData } from "@/components/LoanFormPdf";

// @react-pdf/renderer needs Node APIs; it cannot run on the edge runtime.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Forward the caller's own token so Convex applies the same authorisation as
  // everywhere else — this route grants no extra access.
  const token = await convexAuthNextjsToken();
  if (token === undefined) {
    return new Response("Not authenticated.", { status: 401 });
  }

  let data: LoanFormData & { queueNumber: string };
  try {
    data = (await fetchQuery(
      api.applications.getForPrint,
      { applicationId: id as Id<"applications"> },
      { token },
    )) as LoanFormData & { queueNumber: string };
  } catch {
    // Convex distinguishes "missing" from "forbidden"; the client should not.
    return new Response("Application not available.", { status: 404 });
  }

  const buffer = await renderToBuffer(LoanFormPdf({ data }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${
        isClaim(data.loanType) ? "claim" : "loan"
      }-${data.queueNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
