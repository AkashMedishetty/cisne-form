import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, createSessionToken, passwordMatches } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_DAYS = 7;

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!password || !passwordMatches(password)) {
    // Generic message — don't reveal whether the password merely was too short, etc.
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken(SESSION_DAYS);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
