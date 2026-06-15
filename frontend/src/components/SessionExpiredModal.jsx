import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SessionExpiredModal() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, []);

  const handleLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setVisible(false);
    navigate("/");
  };

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.icon}>⏱</div>
        <h2 style={styles.title}>Sesión expirada</h2>
        <p style={styles.text}>Tu sesión cerró por inactividad. Volvé a iniciar sesión para continuar.</p>
        <button onClick={handleLogin} style={styles.btn}>
          Volver a iniciar sesión
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.6)",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  modal: {
    background: "white",
    borderRadius: "16px",
    padding: "40px 36px",
    textAlign: "center",
    maxWidth: "380px",
    width: "90%",
    boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
  },
  icon: {
    fontSize: "2.5rem",
    marginBottom: "12px",
  },
  title: {
    margin: "0 0 10px",
    color: "#0f172a",
    fontSize: "1.4rem",
  },
  text: {
    color: "#64748b",
    margin: "0 0 24px",
    lineHeight: 1.5,
  },
  btn: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
  },
};
