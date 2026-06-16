import { useCallback, useEffect, useState } from "react";
import Modal from "../Modal";
import { getAllPaymentsAdminRequest } from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "approved", label: "Aprobado" },
  { value: "pending", label: "Pendiente" },
  { value: "rejected", label: "Rechazado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "error", label: "Error" },
];

const STATUS_LABELS = {
  approved: { label: "Aprobado", color: "#15803d", bg: "#dcfce7" },
  pending:  { label: "Pendiente", color: "#92400e", bg: "#fef3c7" },
  rejected: { label: "Rechazado", color: "#991b1b", bg: "#fee2e2" },
  cancelled:{ label: "Cancelado", color: "#475569", bg: "#e2e8f0" },
  error:    { label: "Error",     color: "#991b1b", bg: "#fee2e2" },
};

const formatInputDate = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  return isNaN(d) ? "-" : d.toLocaleDateString("es-AR");
};

const formatAmount = (amount) => {
  if (!amount) return "-";
  return `$${Number(amount).toLocaleString("es-AR")}`;
};

export default function PaymentsPanel() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatInputDate(d);
  });
  const [dateTo, setDateTo]     = useState(() => formatInputDate(new Date()));
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser]     = useState("");
  const [payments, setPayments] = useState([]);
  const [stats, setStats]       = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllPaymentsAdminRequest({
        status:   filterStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      setPayments(data.payments);
      setStats(data.stats || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (status) => {
    const s = STATUS_LABELS[status] || { label: status, color: "#475569", bg: "#f1f5f9" };
    return (
      <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
        {s.label}
      </span>
    );
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Historial de Pagos</h2>
          <p style={styles.subtitle}>Todos los pagos procesados a través de MercadoPago.</p>
        </div>
        <div style={styles.filters}>
          <label style={styles.filterLabel}>
            Desde
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.filterLabel}>
            Hasta
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.filterLabel}>
            Estado
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.input}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
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

      <div style={styles.metrics}>
        <Metric label="Total pagos"  value={stats.total || 0} />
        <Metric label="Aprobados"    value={stats.approved || 0}  accent="#15803d" />
        <Metric label="Pendientes"   value={stats.pending || 0}   accent="#92400e" />
        <Metric label="Rechazados"   value={stats.rejected || 0}  accent="#b91c1c" />
        <Metric label="Cancelados"   value={stats.cancelled || 0} accent="#475569" />
        <Metric label="Errores"      value={stats.errors || 0}    accent="#b91c1c" />
        <Metric label="Recaudado"    value={formatAmount(stats.total_approved_amount)} accent="#1d4ed8" />
      </div>

      <div style={styles.searchRow}>
        <input
          type="text"
          placeholder="Buscar por usuario..."
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{ ...styles.input, width: "240px" }}
        />
        <span style={styles.count}>{payments.length} registro(s)</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Usuario</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Fecha de pago</th>
              <th style={styles.th}>Vencimiento</th>
              <th style={styles.th}>Método</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {!loading && payments.length === 0 && (
              <tr><td colSpan="8" style={styles.empty}>No hay pagos en el periodo.</td></tr>
            )}
            {payments
              .filter((p) => {
                if (!filterUser) return true;
                const q = filterUser.toLowerCase();
                return (
                  p.username?.toLowerCase().includes(q) ||
                  p.first_name?.toLowerCase().includes(q) ||
                  p.last_name?.toLowerCase().includes(q)
                );
              })
              .map((p) => (
                <tr key={p.payment_id}>
                  <td style={styles.td}>{p.payment_id}</td>
                  <td style={styles.td}>
                    <strong>{p.first_name} {p.last_name}</strong>
                    <br />
                    <span style={styles.meta}>{p.username}</span>
                  </td>
                  <td style={styles.td}>{p.plan_type || "-"}</td>
                  <td style={styles.td}>{formatAmount(p.amount)}</td>
                  <td style={styles.td}>{formatDate(p.payment_date)}</td>
                  <td style={styles.td}>{formatDate(p.expiry_date)}</td>
                  <td style={styles.td}>{p.payment_method || "-"}</td>
                  <td style={styles.td}>{statusBadge(p.payment_status)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {loading && <p style={styles.empty}>Cargando pagos...</p>}
      </div>
    </div>
  );
}

function Metric({ label, value, accent = "#0f172a" }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={{ ...styles.metricValue, color: accent }}>{value}</strong>
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", marginBottom: "20px", flexWrap: "wrap" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: "6px 0 0", color: "#64748b" },
  filters: { display: "flex", gap: "12px", flexWrap: "wrap" },
  filterLabel: { display: "grid", gap: "5px", color: "#475569", fontSize: "0.85rem", fontWeight: 700 },
  input: { padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" },
  metric: { background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", minHeight: "72px", display: "grid", alignContent: "space-between" },
  metricLabel: { color: "#64748b", fontSize: "0.85rem" },
  metricValue: { fontSize: "1.6rem" },
  searchRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  count: { color: "#64748b", fontSize: "0.85rem" },
  tableWrap: { overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "860px" },
  th: { background: "#0f172a", color: "white", textAlign: "left", padding: "12px", fontSize: "0.82rem" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "0.9rem" },
  meta: { color: "#64748b", fontSize: "0.8rem" },
  empty: { padding: "24px", textAlign: "center", color: "#64748b" },
  error: { padding: "10px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", marginBottom: "16px" },
};
