import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Instagram, Mail, MapPin, MessageCircle, Send, Clock, HelpCircle } from "lucide-react";
import { sanitizePhoneInput } from "../lib/phone";
import { api } from "../lib/api";
import { buildAuthSecurityPayload, honeypotFieldProps, HONEYPOT_CLASS } from "../lib/authSecurity";
import {
  collectErrors,
  hasErrors,
  validateEmail,
  validatePhone,
  validateRequired,
} from "../lib/formValidation";
import { fieldInputClass, FieldError } from "../components/FormField";
import {
  COMPANY_NAME,
  CONTACT,
  CONTACT_SUBJECTS,
  SHIPPING_INFO,
} from "../constants/company";

export default function Contact() {
  const formLoadedAt = useRef(Date.now());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(CONTACT_SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const clearError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const errors = collectErrors({
      name: validateRequired(name, "Name"),
      email: validateEmail(email),
      phone: phone.trim() ? validatePhone(phone) : null,
      subject: validateRequired(subject, "Subject"),
      message: validateRequired(message, "Message"),
    });
    setFieldErrors(errors);
    if (hasErrors(errors)) {
      toast.error("Please fix the errors below");
      return;
    }

    setBusy(true);
    try {
      await api.post("/contact", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        ...buildAuthSecurityPayload(formLoadedAt.current, honeypot),
      });
      setSent(true);
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject(CONTACT_SUBJECTS[0]);
      setMessage("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send message. Try Instagram DM instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="contact-page" className="pb-16">
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-20 pb-10">
        <div className="label-eyebrow">Contact</div>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mt-3 tracking-tight">
          Get in touch.
        </h1>
        <p className="mt-4 text-white/60 max-w-2xl leading-relaxed">{CONTACT.primaryChannel}</p>
        <p className="mt-2 text-sm text-white/45">{CONTACT.responseTime}</p>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-6">
        <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <HelpCircle className="w-5 h-5 text-brand-light shrink-0" />
          <p className="text-sm text-white/60 flex-1">
            Check our{" "}
            <Link to="/faq" className="text-brand-light hover:text-brand-accent transition-colors">
              FAQ
            </Link>{" "}
            for quick answers on orders, payment, and shipping — or browse our{" "}
            <Link to="/shipping" className="text-brand-light hover:text-brand-accent transition-colors">
              shipping
            </Link>{" "}
            and{" "}
            <Link to="/returns" className="text-brand-light hover:text-brand-accent transition-colors">
              refund & replacement policy
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="glass rounded-2xl p-8 lg:p-10">
              <h2 className="font-display text-2xl mb-2">Send us a message</h2>
              <p className="text-sm text-white/50 mb-8">
                For custom orders and design requests, include your phone model and any design ideas.
                For order support, include your order ID (e.g. FRM-YYMMDD-XXXXXX).
              </p>

              {sent && (
                <div className="mb-6 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand-light">
                  Thanks for reaching out. We typically respond within 24 hours.
                </div>
              )}

              <form onSubmit={submit} className="space-y-5 relative">
                <div className={HONEYPOT_CLASS} aria-hidden="true">
                  <label htmlFor="contact-honeypot">Leave blank</label>
                  <input
                    id="contact-honeypot"
                    {...honeypotFieldProps(honeypot, (e) => setHoneypot(e.target.value))}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm text-white/70 mb-2">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      data-testid="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        clearError("name");
                      }}
                      className={fieldInputClass(fieldErrors.name)}
                      placeholder="Enter your name"
                      autoComplete="name"
                    />
                    <FieldError error={fieldErrors.name} />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm text-white/70 mb-2">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      data-testid="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError("email");
                      }}
                      className={fieldInputClass(fieldErrors.email)}
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                    <FieldError error={fieldErrors.email} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-phone" className="block text-sm text-white/70 mb-2">
                      Phone <span className="text-white/40">(optional)</span>
                    </label>
                    <input
                      id="contact-phone"
                      data-testid="contact-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(sanitizePhoneInput(e.target.value));
                        clearError("phone");
                      }}
                      className={fieldInputClass(fieldErrors.phone)}
                      placeholder="Enter your phone number"
                      autoComplete="tel"
                    />
                    <FieldError error={fieldErrors.phone} />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-sm text-white/70 mb-2">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      data-testid="contact-subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        clearError("subject");
                      }}
                      className={fieldInputClass(fieldErrors.subject)}
                    >
                      {CONTACT_SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <FieldError error={fieldErrors.subject} />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm text-white/70 mb-2">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    data-testid="contact-message"
                    rows={5}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      clearError("message");
                    }}
                    className={fieldInputClass(fieldErrors.message, "resize-y min-h-[120px]")}
                    placeholder="Enter your message"
                  />
                  <FieldError error={fieldErrors.message} />
                </div>

                <button
                  type="submit"
                  data-testid="contact-submit"
                  disabled={busy}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {busy ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>
          </div>

          {/* Contact info sidebar */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="label-eyebrow mb-4">Direct channels</div>
              <ul className="space-y-4 text-sm">
                <li>
                  <a
                    href={CONTACT.instagram.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 text-white/80 hover:text-brand-light transition-colors group"
                  >
                    <Instagram className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                    <span>
                      <span className="block font-medium text-white group-hover:text-brand-light">
                        Instagram DM
                      </span>
                      <span className="text-white/55">{CONTACT.instagram.handle}</span>
                      <span className="block text-xs text-white/40 mt-1">Primary channel for orders</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <Mail className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-medium text-white">Email</span>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="text-white/55 hover:text-brand-light transition-colors"
                    >
                      {CONTACT.email}
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <Clock className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-medium text-white">Support hours</span>
                    <span className="text-white/55">{CONTACT.supportHours}</span>
                    <span className="block text-xs text-white/40 mt-1">{CONTACT.responseTime}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3 text-white/80">
                  <MapPin className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                  <span>
                    <span className="block font-medium text-white">Shipping</span>
                    <span className="text-white/55">{SHIPPING_INFO.coverage}</span>
                  </span>
                </li>
              </ul>
            </div>

            <a
              href={CONTACT.instagram.url}
              target="_blank"
              rel="noreferrer"
              className="glass rounded-2xl p-6 flex items-center gap-4 hover:border-brand/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/30 grid place-items-center shrink-0">
                <MessageCircle className="w-6 h-6 text-brand-light" />
              </div>
              <div>
                <div className="font-medium group-hover:text-brand-light transition-colors">
                  Message {COMPANY_NAME} on Instagram
                </div>
                <div className="text-sm text-white/50 mt-1">
                  Fastest way to place custom orders and get mockups
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
