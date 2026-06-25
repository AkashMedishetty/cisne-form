import { NextResponse } from "next/server";
import { getSubmissions } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// List all submissions, newest first. (Protected by middleware.)
export async function GET() {
  const submissions = await getSubmissions();
  const docs = await submissions.find({}, { sort: { createdAt: -1 } }).toArray();

  const data = docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    email: d.email,
    fileName: d.fileName,
    blobUrl: d.blobUrl,
    contentType: d.contentType,
    size: d.size,
    createdAt: d.createdAt,
  }));

  return NextResponse.json({ count: data.length, submissions: data });
}
