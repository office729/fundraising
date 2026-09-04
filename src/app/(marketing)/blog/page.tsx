import Link from "next/link";

export default function BlogPage() {
  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          Acasă
        </Link>{" "}
        › Blog
      </div>

      <section className="px-[6%] py-20 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">Blog</span>
        <h1 className="font-display mx-auto mt-2 max-w-xl text-[28px] leading-tight font-bold text-ink">
          Primele articole vin în curând
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-muted">
          Lucrăm la ghiduri practice de fundraising, direct din experiența lui Vlad Plăcintă. Până atunci, scrie-ne
          orice întrebare ai — răspundem direct.
        </p>
        <a
          href="mailto:vlad.placinta@fundrasingacademy.ro"
          className="mt-6 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          Scrie-ne o întrebare
        </a>
      </section>
    </main>
  );
}
