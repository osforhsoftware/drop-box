import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, HelpCircle } from "lucide-react";
import { COMPANY_NAME, CONTACT } from "../constants/company";
import { FAQ_ITEMS } from "../constants/policies";

function FaqItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-5 lg:p-6 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-white/90">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-brand-light shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-5 lg:px-6 pb-5 lg:pb-6 text-sm text-white/60 leading-relaxed border-t border-white/[0.05] pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div data-testid="faq-page" className="pb-16">
      <section className="max-w-3xl mx-auto px-6 lg:px-10 pt-12 lg:pt-20 pb-10">
        <div className="label-eyebrow">Help</div>
        <h1 className="font-display text-4xl sm:text-5xl mt-3 tracking-tight">Frequently asked questions</h1>
        <p className="mt-4 text-white/60 leading-relaxed">
          Quick answers about ordering, customization, payment, and shipping at {COMPANY_NAME}.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-10 space-y-3">
        {FAQ_ITEMS.map((item, index) => (
          <FaqItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          />
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 lg:px-10 pb-16">
        <div className="glass rounded-2xl p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/30 grid place-items-center shrink-0">
            <HelpCircle className="w-6 h-6 text-brand-light" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Still have questions?</div>
            <p className="text-sm text-white/55 mt-1">
              Message us on Instagram at {CONTACT.instagram.handle} or use our contact form.
            </p>
          </div>
          <Link to="/contact" className="btn-secondary shrink-0">
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
}
