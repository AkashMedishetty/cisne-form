import Image from "next/image";
import SubmissionForm from "@/components/SubmissionForm";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8 sm:py-14">
      <header className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="CIBC"
          width={220}
          height={57}
          priority
          className="h-auto w-[180px] sm:w-[210px]"
        />
        <p className="mx-auto mt-5 max-w-sm text-slate-600">
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
