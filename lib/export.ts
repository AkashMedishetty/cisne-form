import ExcelJS from "exceljs";
import type { WithId } from "mongodb";
import type { SubmissionDoc } from "@/lib/mongodb";

/** Build a styled .xlsx workbook of all submissions and return it as bytes. */
export async function buildWorkbookBuffer(
  docs: WithId<SubmissionDoc>[],
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Cisne";
  wb.created = docs[0]?.createdAt ?? new Date(0);

  const ws = wb.addWorksheet("Submissions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "#", key: "index", width: 6 },
    { header: "Name", key: "name", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "File Name", key: "fileName", width: 30 },
    { header: "Uploaded At", key: "createdAt", width: 22 },
    { header: "Size (KB)", key: "sizeKb", width: 12 },
    { header: "Photo URL", key: "blobUrl", width: 60 },
  ];

  // Header styling.
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF111827" },
    };
  });

  docs.forEach((d, i) => {
    ws.addRow({
      index: i + 1,
      name: d.name,
      email: d.email,
      fileName: d.fileName,
      createdAt: new Date(d.createdAt).toISOString().replace("T", " ").slice(0, 19),
      sizeKb: Math.round(d.size / 1024),
      blobUrl: d.blobUrl,
    });
  });

  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as unknown as ArrayBuffer);
}

export function exportDateStamp(now: Date): string {
  // YYYY-MM-DD for use in download file names.
  return now.toISOString().slice(0, 10);
}
