import { useCallback, useEffect, useState } from "react";
import { createCheckoutRequest, getMyPaymentsRequest } from "../../services/api";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const PAYMENT_STATUS_LABELS = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  error: "Error",
};

const formatDate = (value) => {
  if (!value) return "Sin fecha informada";
  const normalized = String(value).slice(0, 10);
  return new Date(`${normalized}T00:00:00`).toLocaleDateString("es-AR");
};

const daysUntilExpiry = (expirationDate) => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

export default function MembershipPanel({ plans, currentUser, onMembershipUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [tooEarlyModal, setTooEarlyModal] = useState(false);

  const loadPayments = useCallback(async () => {
    try {
      const result = await getMyPaymentsRequest();
      setData(result);
      setError("");
      if (result.membership) onMembershipUpdated?.(result.membership);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onMembershipUpdated]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const payPlan = async (plan) => {
    setConfirmPlan(null);
    setWorking(true);
    setError("");
    try {
      const result = await createCheckoutRequest(plan.plan_id);
      if (!result.checkoutUrl) throw new Error("Mercado Pago no devolvio el enlace de pago");
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err.message);
      setWorking(false);
    }
  };

  if (loading) return <p style={styles.muted}>Cargando membresia...</p>;

  const membership = data?.membership;
  const days = daysUntilExpiry(membership?.plan_expiration_date);
  const hasActivePlan = !!membership?.plan_id;
  const canRenew = !hasActivePlan || (days !== null && days <= 5);

  const handlePlanClick = (plan) => {
    if (!canRenew) {
      setTooEarlyModal(true);
      return;
    }
    setConfirmPlan(plan);
  };

  return (
    <div>
      {error && <p style={styles.error}>{error}</p>}

      <section style={styles.summary}>
        <div>
          <p style={styles.eyebrow}>Plan actual</p>
          <h2 style={styles.heading}>{membership?.plan_type || "Sin membresia activa"}</h2>
          <p style={styles.muted}>Vigencia: {formatDate(membership?.plan_expiration_date)}</p>
          {hasActivePlan && days !== null && days <= 5 && days >= 0 && (
            <p style={styles.expiryWarning}>⚠ Vence en {days === 0 ? "hoy" : `${days} día${days === 1 ? "" : "s"}`} — podés renovar ahora</p>
          )}
        </div>
        <p style={styles.notice}>Los planes se pagan una vez. Cuando venza, podés renovarlo manualmente.</p>
      </section>

      <h2 style={styles.sectionTitle}>Planes disponibles</h2>
      <div style={styles.grid}>
        {plans.map((plan) => {
          const isCurrent = Number(membership?.plan_id || currentUser.plan_id) === Number(plan.plan_id);
          return (
            <article
              key={plan.plan_id}
              style={{ ...styles.card, ...(canRenew ? {} : styles.cardBlurred) }}
              onClick={!canRenew ? () => setTooEarlyModal(true) : undefined}
            >
              <h3 style={styles.planTitle}>{plan.plan_type}</h3>
              <p style={styles.price}>{money.format(plan.cost)}</p>
              <p style={styles.muted}>{plan.duration || `${plan.duration_value} ${plan.duration_unit}`}</p>
              <p>{plan.benefits}</p>
              <button
                type="button"
                disabled={working || !canRenew}
                onClick={(e) => { e.stopPropagation(); handlePlanClick(plan); }}
                style={{ ...styles.primaryButton, opacity: (working || !canRenew) ? 0.55 : 1, cursor: !canRenew ? "not-allowed" : "pointer" }}
              >
                {isCurrent ? "Renovar plan" : "Pagar plan"}
              </button>
            </article>
          );
        })}
      </div>

      {data?.payments?.length > 0 && (
        <section style={styles.payments}>
          <h2 style={styles.sectionTitle}>Historial de pagos</h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr><th style={styles.cell}>Fecha</th><th style={styles.cell}>Plan</th><th style={styles.cell}>Monto</th><th style={styles.cell}>Estado</th></tr></thead>
              <tbody>{data.payments.map((payment) => (
                <tr key={payment.payment_id}>
                  <td style={styles.cell}>{formatDate(payment.payment_date)}</td>
                  <td style={styles.cell}>{payment.plan_type || "-"}</td>
                  <td style={styles.cell}>{money.format(payment.amount)}</td>
                  <td style={styles.cell}>{PAYMENT_STATUS_LABELS[payment.payment_status] || payment.payment_status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {confirmPlan && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <h3 style={styles.confirmTitle}>Confirmar pago</h3>
            <p style={styles.confirmText}>
              Vas a pagar <strong>{money.format(confirmPlan.cost)}</strong> por el plan <strong>{confirmPlan.plan_type}</strong>. Serás redirigido a MercadoPago.
            </p>
            <div style={styles.confirmActions}>
              <button onClick={() => setConfirmPlan(null)} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={() => payPlan(confirmPlan)} style={styles.primaryButton2}>Continuar al pago</button>
            </div>
          </div>
        </div>
      )}

      {tooEarlyModal && (
        <div style={styles.overlay}>
          <div style={styles.confirmModal}>
            <h3 style={styles.confirmTitle}>Plan activo</h3>
            <p style={styles.confirmText}>
              Todavía tenés un plan activo. Podrás renovarlo o cambiarlo <strong>5 días antes del vencimiento</strong>, el <strong>{formatDate(membership?.plan_expiration_date ? new Date(new Date(membership.plan_expiration_date).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null)}</strong>.
            </p>
            <div style={styles.confirmActions}>
              <button onClick={() => setTooEarlyModal(false)} style={styles.primaryButton2}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  summary: { display: "flex", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", background: "white", padding: "1.5rem", border: "1px solid #e2e8f0", borderRadius: "8px" },
  eyebrow: { margin: 0, color: "#64748b", fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase" },
  heading: { margin: "0.35rem 0", color: "#0f172a" },
  muted: { color: "#64748b" },
  expiryWarning: { margin: "8px 0 0", color: "#92400e", background: "#fef3c7", padding: "6px 10px", borderRadius: "6px", fontSize: "0.88rem", fontWeight: 600 },
  notice: { maxWidth: "420px", margin: 0, color: "#475569" },
  sectionTitle: { marginTop: "2rem", color: "#0f172a" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" },
  card: { background: "white", padding: "1.25rem", border: "1px solid #e2e8f0", borderRadius: "8px", position: "relative", overflow: "hidden" },
  cardBlurred: { cursor: "pointer", opacity: 0.5, backgroundColor: "#f1f5f9" },
  planTitle: { margin: 0 },
  price: { fontSize: "1.45rem", fontWeight: 800, color: "#0f172a" },
  primaryButton: { width: "100%", minHeight: "44px", marginTop: "1rem", border: 0, borderRadius: "6px", background: "#f97316", color: "white", fontWeight: 700 },
  payments: { marginTop: "2rem" },
  tableWrap: { overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse" },
  cell: { padding: "10px", borderBottom: "1px solid #e2e8f0", textAlign: "left" },
  error: { padding: "10px", background: "#fee2e2", color: "#b91c1c", borderRadius: "6px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "grid", placeItems: "center", zIndex: 1000 },
  confirmModal: { background: "white", borderRadius: "12px", padding: "28px", maxWidth: "400px", width: "90%", boxShadow: "0 24px 60px rgba(15,23,42,0.2)" },
  confirmTitle: { margin: "0 0 12px", color: "#0f172a" },
  confirmText: { color: "#475569", lineHeight: 1.5, margin: "0 0 20px" },
  confirmActions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600 },
  primaryButton2: { padding: "10px 16px", border: 0, borderRadius: "8px", background: "#f97316", color: "white", fontWeight: 700, cursor: "pointer" },
};
