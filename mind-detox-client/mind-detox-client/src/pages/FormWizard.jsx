import { useEffect, useMemo, useState } from "react";
import "../styles/FormWizard.css";

const API = "http://localhost:8080";

const LIKERT_LABELS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

export default function FormWizard() {
  const [pages, setPages] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    fetch(`${API}/api/questions`)
      .then((r) => r.json())
      .then((d) => setPages(d || []))
      .catch((e) => console.error("Fetch error:", e));
  }, []);

  const page = pages[step];
  const progress = useMemo(() => {
    if (!pages.length) return 0;
    return Math.round(((step + 1) / pages.length) * 100);
  }, [pages.length, step]);

  const setValue = (id, val) => setAnswers((p) => ({ ...p, [id]: val }));

  if (!pages.length)
    return (
      <div className="shell">
        <div className="badge" style={{ padding: "20px" }}>
          Initializing Detox Engine...
        </div>
      </div>
    );

  if (!page) return null;
  const isLastStep = step === pages.length - 1;

  async function handleSubmit() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Login required");
        window.location.href = "/login";
        return;
      }

      const res = await fetch(`${API}/api/submit-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(answers),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data?.error || "Submit failed");
        return;
      }

      alert("Assessment Complete. Analyzing your data...");
      window.location.href = "/dashboard";
    } catch (e) {
      console.error(e);
      alert("Network error. Is backend running?");
    }
  }

  function renderField(f, idx, prefix = "") {
    const fid = prefix ? `${prefix}.${f.id}` : f.id;

    // GROUP support (keeps same layout)
    if (f.type === "group" && Array.isArray(f.fields)) {
      return (
        <div key={fid} className="fade-in">
          <label className="label">
            <span style={{ color: "var(--lavender)", marginRight: "8px" }}>
              {idx + 1}.
            </span>
            {f.label}
          </label>

          <div style={{ display: "grid", gap: "28px", marginTop: "14px" }}>
            {f.fields.map((sf, sidx) => (
              <div key={sf.id}>
                <label className="label" style={{ fontSize: "14px" }}>
                  {sf.label}
                </label>
                {renderSingle(sf, `${f.id}.${sf.id}`)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={fid} className="fade-in">
        <label className="label">
          <span style={{ color: "var(--lavender)", marginRight: "8px" }}>
            {idx + 1}.
          </span>
          {f.label}
        </label>
        {renderSingle(f, f.id)}
      </div>
    );
  }

  function renderSingle(f, idKey) {
    // RADIO
    if (f.type === "radio" || f.type === "radio_simple") {
      return (
        <div className="optionGrid">
          {f.options.map((o) => {
            const lbl = typeof o === "object" ? o.label : o;
            const cur = answers[idKey];
            const isSel =
              typeof o === "object" ? cur?.label === o.label : cur === o;

            return (
              <button
                key={lbl}
                className={`option ${isSel ? "selected" : ""}`}
                onClick={() => setValue(idKey, o)}
                type="button"
              >
                {lbl}
              </button>
            );
          })}
        </div>
      );
    }

    // LIKERT
    if (f.type === "likert_1_5") {
      return (
        <div className="optionGrid">
          {LIKERT_LABELS.map((l) => (
            <button
              key={l.value}
              className={`option ${answers[idKey] === l.value ? "selected" : ""}`}
              onClick={() => setValue(idKey, l.value)}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>
      );
    }

    // CHECKBOX (stores array of selected ids)
    if (f.type === "checkbox") {
      const selected = Array.isArray(answers[idKey]) ? answers[idKey] : [];
      return (
        <div className="optionGrid">
          {f.options.map((o) => {
            const oid = typeof o === "object" ? o.id : o;
            const lbl = typeof o === "object" ? o.label : o;
            const isSel = selected.includes(oid);

            return (
              <button
                key={oid}
                className={`option ${isSel ? "selected" : ""}`}
                onClick={() => {
                  const next = isSel
                    ? selected.filter((x) => x !== oid)
                    : [...selected, oid];
                  setValue(idKey, next);
                }}
                type="button"
              >
                {lbl}
              </button>
            );
          })}
        </div>
      );
    }

    // NUMBER / TEXT
    if (f.type === "number" || f.type === "text") {
      return (
        <input
          type={f.type}
          className="control"
          placeholder={f.placeholder || "Type your response..."}
          value={answers[idKey] ?? ""}
          onChange={(e) => setValue(idKey, e.target.value)}
        />
      );
    }

    // SELECT
    if (f.type === "select") {
      return (
        <select
          className="control"
          value={answers[idKey] || ""}
          onChange={(e) => setValue(idKey, e.target.value)}
        >
          <option value="" disabled>
            Select an option
          </option>
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    // SCALE 0-10
    if (f.type === "scale_0_10") {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(40px, 1fr))",
            gap: "8px",
          }}
        >
          {[...Array(11).keys()].map((n) => (
            <button
              key={n}
              className={`option ${answers[idKey] === n ? "selected" : ""}`}
              style={{ padding: "12px 0" }}
              onClick={() => setValue(idKey, n)}
              type="button"
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    return <div className="p">Unsupported field type: {String(f.type)}</div>;
  }

  return (
    <div className="shell">
      <div className="container">
        <div className="card">
          <div className="panel">
            {/* Header Area */}
            <div style={{ padding: "40px 60px 10px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ maxWidth: "80%" }}>
                  <h2 className="title">{page.title}</h2>
                  <p className="p" style={{ marginBottom: 0 }}>
                    {page.description}
                  </p>
                </div>
                <div className="badge">Phase {step + 1}</div>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="progress">
              <div style={{ width: `${progress}%` }} />
            </div>

            {/* Questions Content */}
            <div className="panelContent">
              <div style={{ display: "grid", gap: "48px" }}>
                {page.fields.map((f, idx) => renderField(f, idx))}
              </div>
            </div>

            {/* Sticky Navigation Footer */}
            <div className="stickyBar">
              <div className="stickyInner">
                <button
                  className="btn"
                  style={{ visibility: step === 0 ? "hidden" : "visible" }}
                  onClick={() => setStep((s) => s - 1)}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="btn btnPrimary"
                  onClick={isLastStep ? handleSubmit : () => setStep((s) => s + 1)}
                  type="button"
                >
                  {isLastStep ? "Submit Assessment" : "Next Phase"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
