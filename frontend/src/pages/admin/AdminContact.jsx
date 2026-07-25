import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Search, Mail, MessageCircle, Loader2 } from "lucide-react";

export default function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = () =>
    api.get("/admin/contact-messages")
      .then((r) => setMessages(r.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === "unread" && m.read) return false;
      if (filter === "read" && !m.read) return false;
      if (!q) return true;
      return [m.name, m.email, m.phone, m.subject, m.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [messages, query, filter]);

  const unread = messages.filter((m) => !m.read).length;

  const openMessage = async (msg) => {
    setSelected(msg);
    if (!msg.read) {
      try {
        const { data } = await api.patch(`/admin/contact-messages/${msg.id}`, { read: true });
        setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
        setSelected(data);
      } catch {
        /* keep showing message even if mark-read fails */
      }
    }
  };

  const toggleRead = async (msg) => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/admin/contact-messages/${msg.id}`, { read: !msg.read });
      setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      if (selected?.id === data.id) setSelected(data);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div data-testid="admin-contact">
      <div className="label-eyebrow">Support</div>
      <h1 className="font-display text-3xl mt-2 mb-6">Contact enquiries</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total messages" value={messages.length} />
        <StatCard label="Unread" value={unread} highlight={unread > 0} />
        <StatCard label="Read" value={messages.length - unread} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            data-testid="contact-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, subject…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex gap-2">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                filter === f
                  ? "bg-brand/15 border-brand/30 text-brand"
                  : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f === "unread" ? "Unread" : "Read"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-white/50">
              <Loader2 className="w-6 h-6 animate-spin text-brand inline" />
            </div>
          ) : shown.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              {messages.length === 0 ? "No enquiries yet." : "No messages match your filters."}
            </div>
          ) : (
            <ul>
              {shown.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openMessage(m)}
                    className={`w-full text-left p-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                      selected?.id === m.id ? "bg-brand/10" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-white/90 truncate">{m.name}</div>
                        <div className="text-xs text-white/50 truncate">{m.subject}</div>
                      </div>
                      {!m.read && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-brand mt-1.5" title="Unread" />
                      )}
                    </div>
                    <div className="text-xs text-white/40 mt-1">{fmtDate(m.created_at)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 glass rounded-xl p-6 min-h-[280px]">
          {!selected ? (
            <div className="h-full grid place-items-center text-white/40 text-sm">
              Select a message to view details
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-display text-xl">{selected.name}</h2>
                  <p className="text-sm text-white/50 mt-1">{fmtDate(selected.created_at)}</p>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => toggleRead(selected)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:text-white disabled:opacity-50"
                >
                  Mark as {selected.read ? "unread" : "read"}
                </button>
              </div>

              <dl className="space-y-3 text-sm mb-6">
                <Row label="Email">
                  <a href={`mailto:${selected.email}`} className="text-brand-light hover:text-brand-accent">
                    {selected.email}
                  </a>
                </Row>
                <Row label="Phone">{selected.phone || "—"}</Row>
                <Row label="Subject">{selected.subject}</Row>
              </dl>

              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <a
                  href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Reply by email
                </a>
                {selected.phone && (
                  <a
                    href={`https://wa.me/91${String(selected.phone).replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary inline-flex items-center gap-2 text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`glass rounded-xl p-5 ${highlight ? "border border-brand/30" : ""}`}>
      <div className={`font-display text-3xl ${highlight ? "text-brand" : ""}`}>{value}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-3">
      <dt className="text-white/45 w-20 shrink-0">{label}</dt>
      <dd className="text-white/80">{children}</dd>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
