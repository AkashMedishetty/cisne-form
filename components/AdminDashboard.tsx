"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Submission {
  id: string;
  name: string;
  email: string;
  fileName: string;
  blobUrl: string;
  contentType: string;
  size: number;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/admin/submissions", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.submissions as Submission[]);
    } catch {
      setError("Could not load submissions. Please refresh.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete the submission from ${name}? This also removes the photo.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Submissions
          </h1>
          <p className="text-sm text-slate-500">
            {items === null
              ? "Loading…"
              : `${items.length} total${query ? ` · ${filtered.length} shown` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/export/xlsx"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export sheet (.xlsx)
          </a>
          <a
            href="/api/admin/export/zip"
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Export ZIP (photos + sheet)
          </a>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        />
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty / loading states */}
      {items !== null && filtered.length === 0 && !error && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white/60 py-16 text-center text-slate-500">
          {items.length === 0 ? "No submissions yet." : "No matches for your search."}
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="mt-6 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Photo</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">File name</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <a href={s.blobUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.blobUrl}
                        alt={s.name}
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    </a>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.fileName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatSize(s.size)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      disabled={deleting === s.id}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <ul className="mt-6 space-y-3 md:hidden">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3"
            >
              <a href={s.blobUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.blobUrl}
                  alt={s.name}
                  className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{s.name}</p>
                <p className="truncate text-sm text-slate-600">{s.email}</p>
                <p className="truncate font-mono text-xs text-slate-400">{s.fileName}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDate(s.createdAt)} · {formatSize(s.size)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                disabled={deleting === s.id}
                className="self-start rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting === s.id ? "…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
