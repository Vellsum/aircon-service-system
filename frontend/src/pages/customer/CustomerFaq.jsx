import React, { useEffect, useMemo, useState } from "react";
import { getChatbotFaq } from "../../api/customerApi";

const CustomerFaq = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let alive = true;
    getChatbotFaq()
      .then((res) => alive && setFaqs(res.faqs || []))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <>
      <div className="cust-page-head">
        <div>
          <h1>Frequently asked questions</h1>
          <p>Quick answers about booking, packages, promotions and support.</p>
        </div>
      </div>

      <section className="cust-panel">
        <input
          className="dash-form-input"
          placeholder="Search questions… e.g. cancel, promo, time slots"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 420, marginBottom: 18 }}
        />

        {loading && <p style={{ color: "var(--text-secondary)" }}>Loading FAQs…</p>}
        {error && <p style={{ color: "var(--danger, #c0392b)" }}>{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>No questions match "{query}". Try the chat assistant instead.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((f) => {
            const isOpen = openId === f.id;
            return (
              <div key={f.id} style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenId(isOpen ? null : f.id)}
                  style={{
                    width: "100%", textAlign: "left", padding: "12px 16px", background: "none",
                    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                    display: "flex", justifyContent: "space-between", gap: 10,
                  }}
                >
                  {f.question}
                  <span>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 14px", fontSize: 13.5, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    {f.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
};

export default CustomerFaq;