import { useState } from "react";
import { getRecommendationsRequest } from "../../services/api";

const formatDate = (dateString) => new Date(`${String(dateString).slice(0, 10)}T12:00:00`).toLocaleDateString("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function instructorName(instructor) {
  return [instructor?.first_name, instructor?.last_name].filter(Boolean).join(" ") || "Instructor asignado";
}

export default function RecommendationsPanel() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const sendQuestion = async (event) => {
    event.preventDefault();
    const message = question.trim();
    if (!message || isSending) return;

    setMessages((current) => [...current, { role: "user", text: message }]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await getRecommendationsRequest(message);
      setMessages((current) => [...current, { role: "assistant", ...response }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: "assistant",
        error: true,
        text: error.message || "No pudimos obtener recomendaciones en este momento.",
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section style={styles.panel} aria-label="Chat de recomendaciones">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Recomendaciones</h2>
          <p style={styles.subtitle}>Contame tu objetivo, disponibilidad u otra preferencia y te sugiero opciones del calendario.</p>
        </div>
        <span style={styles.disclaimer}>Recomendación orientativa</span>
      </div>

      <div style={styles.chat} aria-live="polite">
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            Probá con: “Quiero una clase de cardio después de las 18 h” o “¿Qué instructor me recomendás para una clase tranquila?”.
          </div>
        )}

        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} style={message.role === "user" ? styles.userMessage : styles.assistantMessage}>
            {message.role === "user" ? (
              message.text
            ) : (
              <>
                <p style={message.error ? styles.errorText : styles.answerText}>{message.text || message.message}</p>
                {message.disclaimer && <p style={styles.responseDisclaimer}>{message.disclaimer}</p>}
                {message.recommendations?.map((recommendation) => (
                  <article key={recommendation.class_id} style={styles.recommendationCard}>
                    <h3 style={styles.cardTitle}>{recommendation.class_name}</h3>
                    <p style={styles.detail}>{formatDate(recommendation.class_date)} · {String(recommendation.start_time).slice(0, 5)} a {String(recommendation.end_time).slice(0, 5)}</p>
                    <p style={styles.detail}>Prof. {instructorName(recommendation.instructor)}{recommendation.instructor?.specialty ? ` · ${recommendation.instructor.specialty}` : ""}</p>
                    {recommendation.branch_location && <p style={styles.detail}>Sede: {recommendation.branch_location}</p>}
                    <p style={styles.detail}>{recommendation.available_slots === null ? "Cupos sin límite" : `${recommendation.available_slots} cupo${recommendation.available_slots === 1 ? "" : "s"} disponible${recommendation.available_slots === 1 ? "" : "s"}`}</p>
                    <p style={styles.justification}>{recommendation.justification}</p>
                  </article>
                ))}
              </>
            )}
          </div>
        ))}
        {isSending && <div style={styles.assistantMessage}>Buscando opciones disponibles…</div>}
      </div>

      <form onSubmit={sendQuestion} style={styles.form}>
        <label htmlFor="recommendation-question" style={styles.label}>Tu consulta</label>
        <textarea
          id="recommendation-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ej.: Busco una clase para fortalecer y tengo disponibilidad por la mañana."
          style={styles.input}
          disabled={isSending}
        />
        <div style={styles.formFooter}>
          <span style={styles.counter}>{question.length}/500</span>
          <button type="submit" disabled={!question.trim() || isSending} style={{ ...styles.button, ...( !question.trim() || isSending ? styles.disabledButton : {}) }}>
            {isSending ? "Consultando…" : "Pedir recomendación"}
          </button>
        </div>
      </form>
    </section>
  );
}

const styles = {
  panel: { maxWidth: "850px", margin: "0 auto", background: "white", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" },
  header: { display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { color: "#64748b", marginBottom: "1.5rem" },
  disclaimer: { background: "#eff6ff", color: "#1d4ed8", borderRadius: "999px", padding: "6px 10px", fontSize: "0.8rem", fontWeight: "bold" },
  chat: { minHeight: "230px", maxHeight: "520px", overflowY: "auto", padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "12px" },
  emptyState: { color: "#64748b", lineHeight: 1.5, alignSelf: "center", maxWidth: "560px", textAlign: "center", margin: "auto" },
  userMessage: { alignSelf: "flex-end", maxWidth: "75%", whiteSpace: "pre-wrap", background: "#2563eb", color: "white", borderRadius: "14px 14px 2px 14px", padding: "10px 14px" },
  assistantMessage: { alignSelf: "flex-start", maxWidth: "90%", background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: "14px 14px 14px 2px", padding: "12px 14px" },
  answerText: { margin: "0 0 6px", lineHeight: 1.45 },
  errorText: { margin: 0, color: "#b91c1c", lineHeight: 1.45 },
  responseDisclaimer: { margin: "0 0 12px", color: "#64748b", fontSize: "0.8rem" },
  recommendationCard: { borderLeft: "4px solid #2563eb", background: "#f8fafc", borderRadius: "6px", padding: "12px", marginTop: "10px" },
  cardTitle: { margin: "0 0 8px", color: "#0f172a" },
  detail: { margin: "4px 0", color: "#475569", fontSize: "0.92rem" },
  justification: { margin: "10px 0 0", color: "#1e3a8a", fontStyle: "italic", lineHeight: 1.4 },
  form: { marginTop: "1rem" },
  label: { display: "block", marginBottom: "6px", color: "#334155", fontWeight: "bold" },
  input: { width: "100%", boxSizing: "border-box", resize: "vertical", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", fontFamily: "inherit", fontSize: "1rem" },
  formFooter: { marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" },
  counter: { color: "#64748b", fontSize: "0.8rem" },
  button: { padding: "10px 14px", border: "none", borderRadius: "8px", background: "#2563eb", color: "white", cursor: "pointer", fontWeight: "bold" },
  disabledButton: { background: "#94a3b8", cursor: "not-allowed" },
};
