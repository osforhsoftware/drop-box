import { Link } from "react-router-dom";
import { COMPANY_NAME } from "../constants/company";

export default function LegalPage({ testId, eyebrow, title, lastUpdated, intro, sections }) {
  return (
    <div data-testid={testId} className="pb-16">
      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-12 lg:pt-20 pb-10">
        <div className="label-eyebrow">{eyebrow}</div>
        <h1 className="font-display text-4xl sm:text-5xl mt-3 tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/40">Last updated: {lastUpdated}</p>
        <p className="mt-6 text-white/60 leading-relaxed">{intro}</p>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-16 space-y-8">
        {sections.map((section) => (
          <div key={section.heading} className="glass rounded-2xl p-6 lg:p-8">
            <h2 className="font-display text-xl mb-4">{section.heading}</h2>
            <ul className="space-y-3 text-sm text-white/65 leading-relaxed list-disc pl-5">
              {section.body.map((paragraph) => (
                <li key={paragraph}>{paragraph}</li>
              ))}
            </ul>
          </div>
        ))}

        <div className="text-center pt-4">
          <p className="text-sm text-white/50">
            Questions about this policy?{" "}
            <Link to="/contact" className="text-brand-light hover:text-brand-accent transition-colors">
              Contact {COMPANY_NAME}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
