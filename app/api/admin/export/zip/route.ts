import JSZip from "jszip";
import { getSubmissions } from "@/lib/mongodb";
import { buildWorkbookBuffer, exportDateStamp } from "@/lib/export";
import { uniqueFileName, slugifyName, extensionForType } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download a ZIP containing every photo (renamed to the submitter's name) plus
 * the full submissions spreadsheet. (Protected by middleware.)
 */
export async function GET() {
  const submissions = await getSubmissions();
  const docs = await submissions.find({}, { sort: { createdAt: -1 } }).toArray();

  const zip = new JSZip();
  const photosDir = zip.folder("photos");
  const usedNames = new Set<string>();
  const failures: string[] = [];

  // Fetch all photos in parallel, then add to the zip in order.
  const fetched = await Promise.all(
    docs.map(async (d) => {
      try {
        const res = await fetch(d.blobUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return { doc: d, buf };
      } catch (err) {
        console.error(`Failed to fetch photo for ${d.email}:`, err);
        return { doc: d, buf: null };
      }
    }),
  );

  for (const { doc, buf } of fetched) {
    if (!buf) {
      failures.push(`${doc.name} <${doc.email}>`);
      continue;
    }
    // File name = the user's name (deduped), with the right extension.
    const ext = doc.fileName.includes(".")
      ? doc.fileName.slice(doc.fileName.lastIndexOf(".") + 1)
      : extensionForType(doc.contentType);
    const desired = `${slugifyName(doc.name)}.${ext}`;
    const finalName = uniqueFileName(desired, usedNames);
    photosDir?.file(finalName, buf);
  }

  // Add the spreadsheet at the root of the zip.
  const workbook = await buildWorkbookBuffer(docs);
  zip.file("submissions.xlsx", workbook);

  // Note any photos that couldn't be retrieved.
  if (failures.length > 0) {
    zip.file(
      "MISSING_PHOTOS.txt",
      `These submissions had photos that could not be downloaded:\n\n${failures.join("\n")}\n`,
    );
  }

  const content = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const fileName = `cibc-export-${exportDateStamp(new Date())}.zip`;

  return new Response(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
