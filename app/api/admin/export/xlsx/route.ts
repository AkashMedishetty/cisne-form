import { getSubmissions } from "@/lib/mongodb";
import { buildWorkbookBuffer, exportDateStamp } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Download all submissions as a styled Excel workbook. (Protected by middleware.)
export async function GET() {
  const submissions = await getSubmissions();
  const docs = await submissions.find({}, { sort: { createdAt: -1 } }).toArray();

  const buffer = await buildWorkbookBuffer(docs);
  const fileName = `cisne-submissions-${exportDateStamp(new Date())}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
