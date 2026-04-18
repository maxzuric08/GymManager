import { useEffect, useState } from "react";
import {
  getUsersRequest,
  getInstructorsRequest,
  getPlansRequest,
  getClassesRequest,
} from "../../services/api";

export default function AdminOverviewPanel({ user }) {
  const [stats, setStats] = useState({
    users: 0,
    instructors: 0,
    plans: 0,
    classes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, instructors, plans, classes] = await Promise.all([
          getUsersRequest(),
          getInstructorsRequest(),
          getPlansRequest(),
          getClassesRequest(),
        ]);

        setStats({
          users: users.length,
          instructors: instructors.length,
          plans: plans.length,
          classes: classes.length,
        });
      } catch (error) {
        console.log("Error cargando métricas:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div style={styles.hero}>
        <div>
          <p style={styles.kicker}>Resumen general</p>
          <h2 style={styles.heroTitle}>
            Todo el control del gimnasio en un solo lugar
          </h2>
          <p style={styles.heroText}>
            Administra usuarios, instructores, planes y clases desde este panel.
          </p>
        </div>

        <div style={styles.badge}>
          <span style={styles.badgeDot}></span>
          Admin activo: {user?.username}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.cardBlue}>
          <p style={styles.cardLabel}>Usuarios registrados</p>
          <h3 style={styles.cardValue}>{stats.users}</h3>
          <span style={styles.cardHint}>Clientes en el sistema</span>
        </div>

        <div style={styles.cardWhite}>
          <p style={styles.cardLabelDark}>Instructores</p>
          <h3 style={styles.cardValueDark}>{stats.instructors}</h3>
          <span style={styles.cardHintDark}>Profesores cargados</span>
        </div>

        <div style={styles.cardWhite}>
          <p style={styles.cardLabelDark}>Planes</p>
          <h3 style={styles.cardValueDark}>{stats.plans}</h3>
          <span style={styles.cardHintDark}>Membresías disponibles</span>
        </div>

        <div style={styles.cardWhite}>
          <p style={styles.cardLabelDark}>Clases</p>
          <h3 style={styles.cardValueDark}>{stats.classes}</h3>
          <span style={styles.cardHintDark}>Clases programadas</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg, #0f60ff 0%, #2563eb 45%, #14b8a6 100%)",
    color: "white",
    borderRadius: "24px",
    padding: "28px",
    boxShadow: "0 18px 40px rgba(37,99,235,0.22)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
  },
  kicker: {
    margin: 0,
    fontSize: "0.9rem",
    opacity: 0.85,
  },
  heroTitle: {
    margin: "10px 0 10px 0",
    fontSize: "1.9rem",
    fontWeight: 800,
  },
  heroText: {
    margin: 0,
    maxWidth: "560px",
    opacity: 0.92,
    lineHeight: 1.5,
  },
  badge: {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "10px 14px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
    fontSize: "0.92rem",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  badgeDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginTop: "22px",
  },
  cardBlue: {
    background: "linear-gradient(135deg, #0b5ed7, #14b8a6)",
    color: "white",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 16px 30px rgba(11,94,215,0.18)",
  },
  cardWhite: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  },
  cardLabel: {
    margin: 0,
    opacity: 0.85,
    fontSize: "0.95rem",
  },
  cardValue: {
    margin: "10px 0 8px 0",
    fontSize: "2rem",
    fontWeight: 800,
  },
  cardHint: {
    fontSize: "0.9rem",
    opacity: 0.82,
  },
  cardLabelDark: {
    margin: 0,
    color: "#64748b",
    fontSize: "0.95rem",
  },
  cardValueDark: {
    margin: "10px 0 8px 0",
    fontSize: "2rem",
    fontWeight: 800,
    color: "#132238",
  },
  cardHintDark: {
    fontSize: "0.9rem",
    color: "#64748b",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1fr",
    gap: "18px",
    marginTop: "22px",
  },
  panel: {
    background: "white",
    borderRadius: "22px",
    padding: "22px",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "16px",
    color: "#132238",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    color: "#475569",
    lineHeight: 1.9,
  },
  systemItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #eef2f7",
    color: "#334155",
  },
  ok: {
    color: "#16a34a",
    fontWeight: 700,
  },
};