"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import { isValidEmail, isValidName, MAX_FILE_MB } from "@/lib/validation";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; name: string }
  | { kind: "error"; message: string };

export default function SubmissionForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [touched, setTouched] = useState({ name: false, email: false });

  const submitting = status.kind === "submitting";

  const nameError = touched.name && !isValidName(name) ? "Please enter your full name." : "";
  const emailError =
    touched.email && !isValidEmail(email) ? "Please enter a valid email address." : "";

  const canSubmit =
    isValidName(name) && isValidEmail(email) && photo !== null && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!canSubmit || !photo) return;

    setStatus({ kind: "submitting" });
    try {
      const body = new FormData();
      body.append("name", name.trim());
      body.append("email", email.trim());
      body.append("photo", photo, photo.name);

      const res = await fetch("/api/submit", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data?.error || "Something went wrong. Please try again.",
        });
        return;
      }
      setStatus({ kind: "success", name: data?.name || name.trim() });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0f766e"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Thank you, {status.name}!</h2>
        <p className="mt-2 text-slate-600">
          Your photo has been submitted successfully.
        </p>
        <button
          type="button"
          onClick={() => {
            setName("");
            setEmail("");
            setPhoto(null);
            setTouched({ name: false, email: false });
            setStatus({ kind: "idle" });
          }}
          className="mt-7 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          disabled={submitting}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Jane Doe"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/40 disabled:opacity-60 ${
            nameError ? "border-red-300 focus:border-red-400" : "border-slate-300 focus:border-teal-500"
          }`}
        />
        {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          disabled={submitting}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="jane@example.com"
          className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/40 disabled:opacity-60 ${
            emailError ? "border-red-300 focus:border-red-400" : "border-slate-300 focus:border-teal-500"
          }`}
        />
        {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Each email can be used only once.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-700">Photo</span>
          <span className="text-xs text-slate-500">Max {MAX_FILE_MB} MB</span>
        </div>
        <PhotoCapture onSelect={setPhoto} disabled={submitting} />
      </div>

      {status.kind === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Spinner />
            Submitting…
          </>
        ) : (
          "Submit photo"
        )}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
