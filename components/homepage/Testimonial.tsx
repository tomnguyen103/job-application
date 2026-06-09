import Image from "next/image";
import type { ReactElement } from "react";

export function Testimonial(): ReactElement {
  return (
    <section className="mx-auto flex min-h-[360px] max-w-[1280px] flex-col items-center justify-center border-x border-b border-border bg-surface px-6 py-20 text-center">
      <p className="text-xs font-bold uppercase leading-4 text-accent">
        Success Stories
      </p>
      <blockquote className="mt-7 max-w-[820px] text-[26px] font-semibold leading-[1.28] text-text-darker sm:text-[31px]">
        &quot;I used to spend my evenings copy-pasting resumes. Now I open my dashboard
        to see interviews waiting. It feels like cheating. Had 3 offers on the
        table simultaneously.&quot;
      </blockquote>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Image
          src="/images/user-icon.png"
          alt="Tom Wilson"
          width={48}
          height={48}
          className="rounded-md"
        />
        <div className="text-left">
          <p className="text-sm font-semibold leading-5 text-text-primary">
            Tom Wilson
          </p>
          <p className="text-xs font-medium leading-4 text-text-secondary">
            Junior Developer
          </p>
        </div>
      </div>
    </section>
  );
}
