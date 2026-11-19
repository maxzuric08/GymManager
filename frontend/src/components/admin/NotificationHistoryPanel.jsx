import { useCallback, useEffect, useState } from "react";
import Modal from "../Modal";
import { getMembershipExpirationNotificationRunsRequest } from "../../services/api";

const STATUS = {
  completed: { label: "Completado", color: "#166534", background: "#dcfce7" },
  running: { label: "En curso", color: "#1d4ed8", background: "#dbeafe" },
  failed: { label: "Falló", color: "#991b1b", background: "#fee2e2" },
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-AR");
};

const triggerLabel = (trigger) => trigger === "manual" ? "Manual" : "Programado";

function StatusBadge({ status }) {
  const value = STATUS[status] || { label: status || "Desconocido", color: "#475569", background: "#e2e8f0" };
  return <span style={{ ...styles.badge, color: value.color, background: value.background }}>{value.label}</span>;
}

function Metric({ label, value, accent = "#0f172a" }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={{ ...styles.metricValue, color: accent }}>{value ?? 0}</strong>
    </div>
  );
}

function FailureDetails({ failures = [], runError }) {
  if (!failures.length && !runError) return <span style={styles.muted}>Sin fallos</span>;

  return (
    <details>
      <summary style={styles.failureSummary}>
        {failures.length ? `${failures.length} fallo(s) registrado(s)` : "Ver motivo"}
      </summary>
      {runError && <p style={styles.runError}>{runError}</p>}
      {failures.map((failure) => (
        <div key={failure.deliveryId} style={styles.failureItem}>
          <strong>{failure.email || `Usuario #${failure.userId}`}</strong>
          <span>{failure.error || "No se pudo enviar el email"}</span>
        </div>
      ))}
    </details>
  );
}

export default function NotificationHistoryPanel() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMembershipExpirationNotificationRunsRequest();
      setRuns(data.runs || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const latestRun = runs[0];

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Historial de notificaciones</h2>
          <p style={styles.subtitle}>Auditoría de los recordatorios de vencimiento de membresía.</p>
        </div>
        <button type="button" onClick={loadRuns} disabled={loading} style={styles.refreshButton}>
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <Modal
          isOpen={Boolean(error)}
          title="Error"
          message={error}
          type="error"
          confirmText="Aceptar"
          onConfirm={() => setError("")}
        />
      )}

      {!loading && !latestRun && (
        <div style={styles.emptyCard}>
          <strong>Aún no hay chequeos registrados.</strong>
          <span>La primera ejecución programada o manual aparecerá acá.</span>
        </div>
      )}

      {latestRun && (
        <section style={styles.latestCard} aria-labelledby="latest-run-title">
          <div style={styles.latestHeader}>
            <div>
              <p style={styles.eyebrow}>ÚLTIMO CHEQUEO</p>
              <h3 id="latest-run-title" style={styles.latestTitle}>{formatDateTime(latestRun.started_at)}</h3>
              <p style={styles.latestMeta}>
                Vencimientos objetivo: {formatDate(latestRun.target_expiration_date)} · {triggerLabel(latestRun.trigger)}
              </p>
            </div>
            <StatusBadge status={latestRun.status} />
          </div>
          <div style={styles.metrics}>
            <Metric label="Usuarios evaluados" value={latestRun.processed_count} />
            <Metric label="Enviados" value={latestRun.sent_count} accent="#15803d" />
            <Metric label="Fallidos" value={latestRun.failed_count} accent="#b91c1c" />
            <Metric label="Omitidos" value={latestRun.skipped_count} accent="#475569" />
          </div>
          {(latestRun.failed_count > 0 || latestRun.error_message) && (
            <div style={styles.latestFailures}>
              <FailureDetails failures={latestRun.failures} runError={latestRun.error_message} />
            </div>
          )}
        </section>
      )}

      <section style={styles.historySection} aria-labelledby="history-title">
        <h3 id="history-title" style={styles.historyTitle}>Ejecuciones recientes</h3>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha y hora</th>
                <th style={styles.th}>Origen</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Evaluados</th>
                <th style={styles.th}>Enviados</th>
                <th style={styles.th}>Fallidos</th>
                <th style={styles.th}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.notification_run_id}>
                  <td style={styles.td}>{formatDateTime(run.started_at)}</td>
                  <td style={styles.td}>{triggerLabel(run.trigger)}</td>
                  <td style={styles.td}><StatusBadge status={run.status} /></td>
                  <td style={styles.td}>{run.processed_count}</td>
                  <td style={styles.td}>{run.sent_count}</td>
                  <td style={styles.td}>{run.failed_count}</td>
                  <td style={styles.td}><FailureDetails failures={run.failures} runError={run.error_message} /></td>
                </tr>
              ))}
              {!loading && runs.length === 0 && (
                <tr><td colSpan="7" style={styles.empty}>No hay ejecuciones para mostrar.</td></tr>
              )}
            </tbody>
          </table>
          {loading && <p style={styles.empty}>Cargando historial de notificaciones...</p>}
        </div>
      </section>
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", marginBottom: "20px", flexWrap: "wrap" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: "6px 0 0", color: "#64748b" },
  refreshButton: { border: 0, borderRadius: "7px", padding: "10px 14px", background: "#2563eb", color: "white", fontWeight: 700, cursor: "pointer" },
  emptyCard: { display: "grid", gap: "6px", padding: "24px", background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", color: "#475569" },
  latestCard: { background: "white", border: "1px solid #dbeafe", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.06)" },
  latestHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px", flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#2563eb", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.08em" },
  latestTitle: { margin: "5px 0", color: "#0f172a", fontSize: "1.25rem" },
  latestMeta: { margin: 0, color: "#64748b", fontSize: "0.9rem" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" },
  metric: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", display: "grid", gap: "6px" },
  metricLabel: { color: "#64748b", fontSize: "0.82rem" },
  metricValue: { fontSize: "1.45rem" },
  badge: { display: "inline-block", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" },
  latestFailures: { marginTop: "16px", padding: "12px", borderRadius: "8px", background: "#fff7ed", border: "1px solid #fed7aa" },
  historySection: { marginTop: "24px" },
  historyTitle: { margin: "0 0 12px", color: "#0f172a" },
  tableWrap: { overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "900px" },
  th: { background: "#0f172a", color: "white", textAlign: "left", padding: "12px", fontSize: "0.82rem" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "0.9rem", verticalAlign: "top" },
  empty: { padding: "24px", textAlign: "center", color: "#64748b" },
  muted: { color: "#64748b", fontSize: "0.85rem" },
  failureSummary: { color: "#b45309", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" },
  failureItem: { display: "grid", gap: "3px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #fed7aa", color: "#92400e", fontSize: "0.85rem" },
  runError: { margin: "10px 0 0", color: "#991b1b", fontSize: "0.85rem" },
};
