import SubmissionForm from "@/components/SubmissionForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8 sm:py-14">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 shadow-sm">
          <SwanMark />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Cisne
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-600">
          Enter your details and add a photo. Takes less than a minute.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur sm:p-7">
        <SubmissionForm />
      </section>

      <footer className="mt-8 text-center text-xs text-slate-400">
        Your information is stored securely and used only for this submission.
      </footer>
    </main>
  );
}

function SwanMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 21c0-5 3-8 7-8 0 0-2-1-2-4a3 3 0 0 1 6 0c0 2-1 3-1 3" />
      <path d="M4 21h16" />
      <path d="M16 12c2 1 3 3 3 6" />
    </svg>
  );
}
