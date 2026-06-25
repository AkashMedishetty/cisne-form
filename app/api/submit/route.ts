import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getSubmissions, type SubmissionDoc } from "@/lib/mongodb";
import {
  isValidEmail,
  isValidName,
  normalizeEmail,
  isAllowedImageType,
  MAX_FILE_BYTES,
} from "@/lib/validation";
import { slugifyName, extensionForType } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const rawEmail = String(form.get("email") ?? "");
  const photo = form.get("photo");

  // --- Validate text fields ---
  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "Please enter your full name (2–100 characters)." },
      { status: 400 },
    );
  }
  if (!isValidEmail(rawEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  const email = normalizeEmail(rawEmail);

  // --- Validate photo ---
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A photo is required." }, { status: 400 });
  }
  if (!isAllowedImageType(photo.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC." },
      { status: 400 },
    );
  }
  if (photo.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large. Maximum size is 10 MB." },
      { status: 413 },
    );
  }

  const submissions = await getSubmissions();

  // --- Reject duplicate email up front (nice error before any upload) ---
  const existing = await submissions.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "This email has already been used to submit a photo." },
      { status: 409 },
    );
  }

  // --- Build a name-based file name ---
  const ext = extensionForType(photo.type);
  const fileName = `${slugifyName(name)}.${ext}`;
  // Storage path is uniquified so two people with the same name never collide.
  const blobPath = `submissions/${slugifyName(name)}-${email.split("@")[0]}.${ext}`;

  // --- Upload to Vercel Blob ---
  let blobUrl = "";
  let blobPathname = "";
  try {
    const blob = await put(blobPath, photo, {
      access: "public",
      contentType: photo.type,
      addRandomSuffix: true, // guarantees a unique pathname even on retries
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    console.error("Blob upload failed:", err);
    return NextResponse.json(
      { error: "We couldn't store your photo. Please try again." },
      { status: 502 },
    );
  }

  // --- Insert into MongoDB (unique index is the hard guarantee) ---
  const doc: SubmissionDoc = {
    name,
    email,
    fileName,
    originalName: photo.name || fileName,
    blobUrl,
    blobPathname,
    contentType: photo.type,
    size: photo.size,
    createdAt: new Date(),
  };

  try {
    await submissions.insertOne(doc);
  } catch (err: unknown) {
    // Clean up the orphaned blob on failure.
    await del(blobPathname).catch(() => {});
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "This email has already been used to submit a photo." },
        { status: 409 },
      );
    }
    console.error("DB insert failed:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your submission. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, name, fileName }, { status: 201 });
}
