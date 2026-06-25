import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { del } from "@vercel/blob";
import { getSubmissions } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delete a single submission and its stored photo. (Protected by middleware.)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const submissions = await getSubmissions();
  const doc = await submissions.findOne({ _id: new ObjectId(id) });
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Best-effort blob deletion; proceed even if it fails.
  if (doc.blobPathname) {
    await del(doc.blobPathname).catch((err) => {
      console.error("Blob delete failed:", err);
    });
  }

  await submissions.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
