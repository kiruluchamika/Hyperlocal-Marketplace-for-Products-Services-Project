import React from 'react';
import { FiCalendar, FiFileText } from 'react-icons/fi';

interface PolicySection {
  title: string;
  body: React.ReactNode;
}

interface PolicyPageLayoutProps {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: PolicySection[];
  asideTitle: string;
  asideItems: string[];
}

const PolicyPageLayout: React.FC<PolicyPageLayoutProps> = ({
  title,
  lastUpdated,
  summary,
  sections,
  asideTitle,
  asideItems,
}) => {
  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.18),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-indigo-100 backdrop-blur-sm">
              <FiFileText className="h-4 w-4" />
              Marketplace Policies
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">{summary}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
              <FiCalendar className="h-4 w-4" />
              <span className="font-semibold">Last Updated:</span>
              <span>{lastUpdated}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="space-y-6">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8"
              >
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{section.title}</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">{section.body}</div>
              </article>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/60 p-6 shadow-[0_18px_50px_rgba(99,102,241,0.12)]">
              <h2 className="text-lg font-semibold text-slate-900">{asideTitle}</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {asideItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default PolicyPageLayout;
