import { useEffect, useState } from "react";

export default function Form() {
  const [pages, setPages] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    fetch("http://localhost:8080/api/questions")
      .then((r) => r.json())
      .then(setPages);
  }, []);

  if (!pages.length) return <p>Loading…</p>;
  const page = pages[step];

  const setValue = (id, val) => {
    setAnswers({ ...answers, [id]: val });
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ background: "#fff", padding: 30, width: 500, borderRadius: 16 }}>
        <h2>{page.title}</h2>

        {page.fields.map((f) => (
          <div key={f.id} style={{ marginBottom: 15 }}>
            <label>{f.label}</label>

            {f.type === "radio" &&
              f.options.map((o) => (
                <button
                  key={o.label}
                  onClick={() => setValue(f.id, o)}
                  style={{
                    display: "block",
                    marginTop: 5,
                    width: "100%",
                    padding: 8,
                    background: answers[f.id]?.label === o.label ? "#000" : "#eee",
                    color: answers[f.id]?.label === o.label ? "#fff" : "#000"
                  }}
                >
                  {o.label}
                </button>
              ))}

            {f.type === "number" && (
              <input
                type="number"
                onChange={(e) => setValue(f.id, e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            )}

            {f.type === "likert" && (
              <div style={{ display: "flex", gap: 6 }}>
                {f.scale.map((n) => (
                  <button
                    key={n}
                    onClick={() => setValue(f.id, n)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: answers[f.id] === n ? "#000" : "#eee",
                      color: answers[f.id] === n ? "#fff" : "#000"
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() =>
            step < pages.length - 1
              ? setStep(step + 1)
              : fetch("http://localhost:8080/api/submit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(answers)
                }).then(() => alert("Submitted"))
          }
          style={{ padding: 12, width: "100%", background: "#000", color: "#fff" }}
        >
          {step < pages.length - 1 ? "Next" : "Submit"}
        </button>
      </div>
    </div>
  );
}
