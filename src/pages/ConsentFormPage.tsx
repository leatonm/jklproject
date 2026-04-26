import { Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export function ConsentFormPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white print:bg-white">
      <div className="print:hidden">
        <PageHeader title="Parent / guardian consent" />
      </div>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-8 print:py-4">
        <div className="mb-4 flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-jkl-navy px-4 py-2 text-sm font-semibold text-white hover:bg-jkl-navy-muted"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print or save as PDF
          </button>
        </div>
        <article className="rounded-2xl border border-jkl-border bg-zinc-50/80 p-6 text-sm text-jkl-ink shadow-sm print:border-0 print:shadow-none">
          <h1 className="text-xl font-bold print:text-2xl">Student participation consent</h1>
          <p className="mt-3 text-zinc-700">
            This in-app form is a printable template. Your program may issue an official
            PDF; use this page for a quick hard copy, then upload the signed scan from the
            student roster in the app.
          </p>
          <section className="mt-8 space-y-4">
            <p>
              <span className="font-semibold">Student name:</span>{" "}
              <span className="inline-block min-w-[12rem] border-b border-zinc-400" />
            </p>
            <p>
              <span className="font-semibold">Grade:</span>{" "}
              <span className="inline-block min-w-[8rem] border-b border-zinc-400" />
            </p>
            <p>
              <span className="font-semibold">Parent / guardian name:</span>{" "}
              <span className="inline-block min-w-[14rem] border-b border-zinc-400" />
            </p>
            <p>
              <span className="font-semibold">Parent / guardian email:</span>{" "}
              <span className="inline-block min-w-[16rem] border-b border-zinc-400" />
            </p>
            <p className="pt-4 leading-relaxed text-zinc-700">
              I confirm that I am the parent or legal guardian of the student named above. I
              consent to the student&apos;s participation in this JKL-affiliated program,
              including photos and video used for program reporting as described by the
              instructor.
            </p>
            <div className="grid gap-6 pt-8 sm:grid-cols-2">
              <p>
                <span className="font-semibold">Signature</span>
                <span className="mt-6 block min-h-[3rem] border-b border-zinc-400" />
              </p>
              <p>
                <span className="font-semibold">Date</span>
                <span className="mt-6 block min-h-[3rem] border-b border-zinc-400" />
              </p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
