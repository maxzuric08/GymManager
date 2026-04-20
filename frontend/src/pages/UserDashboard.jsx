import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPlansRequest,
  updateUserPlanRequest,
  logoutRequest,
} from "../services/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}")
  );

  const fetchPlans = async () => {
    try {
      const data = await getPlansRequest();
      setPlans(data.filter((plan) => plan.status === "active"));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSelectPlan = async (plan) => {
    try {
      const result = await updateUserPlanRequest(
        currentUser.user_id,
        plan.plan_id
      );

      localStorage.setItem("user", JSON.stringify(result.user));
      setCurrentUser(result.user);

      setMessage(result.message);
      setError("");
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.log(error);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/");
  };

  const currentPlan = plans.find(
    (plan) => plan.plan_id === currentUser.plan_id
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Usuario</h1>
          <p style={styles.subtitle}>
            Bienvenido {currentUser.username || "Usuario"}
          </p>
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Cerrar sesión
        </button>
      </div>

      <div style={styles.currentCard}>
        <h2>Mi membresía actual</h2>
        <p>
          {currentPlan
            ? `Tu plan actual es: ${currentPlan.plan_type}`
            : "Aún no tienes una membresía seleccionada"}
        </p>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Planes disponibles</h2>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.grid}>
        {plans.map((plan) => {
          const isCurrentPlan = currentUser.plan_id === plan.plan_id;

          return (
            <div key={plan.plan_id} style={styles.card}>
              <h3>{plan.plan_type}</h3>
              <p>
                <strong>Precio:</strong> ${plan.cost}
              </p>
              <p>
                <strong>Duración:</strong> {plan.duration}
              </p>
              <p>
                <strong>Beneficios:</strong> {plan.benefits}
              </p>
              <p>
                <strong>Límite de clases:</strong> {plan.class_limit}
              </p>

              <button
                style={{
                  ...styles.button,
                  background: isCurrentPlan ? "#94a3b8" : "#2563eb",
                  cursor: isCurrentPlan ? "not-allowed" : "pointer",
                }}
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan}
              >
                {isCurrentPlan ? "Plan actual" : "Seleccionar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    backgroundColor: "#f5f7fb",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: {
    margin: 0,
  },
  subtitle: {
    marginTop: "0.4rem",
    color: "#666",
  },
  logoutBtn: {
    padding: "10px 16px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  currentCard: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "1rem",
    marginTop: "1rem",
  },
  card: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
  },
  button: {
    marginTop: "1rem",
    width: "100%",
    padding: "10px",
    color: "white",
    border: "none",
    borderRadius: "10px",
  },
  success: {
    color: "green",
    fontWeight: "bold",
    marginTop: "1rem",
  },
  error: {
    color: "red",
    fontWeight: "bold",
    marginTop: "1rem",
  },
};