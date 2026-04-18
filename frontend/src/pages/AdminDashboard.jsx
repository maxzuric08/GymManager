import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import AdminOverviewPanel from "../components/admin/AdminOverviewPanel";
import UsersPanel from "../components/admin/UsersPanel";
import InstructorsPanel from "../components/admin/InstructorsPanel";
import PlansPanel from "../components/admin/PlansPanel";
import ClassesPanel from "../components/admin/ClassesPanel";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/");
  };

  const renderPanel = () => {
    switch (activeSection) {
      case "users":
        return <UsersPanel />;
      case "instructors":
        return <InstructorsPanel />;
      case "plans":
        return <PlansPanel />;
      case "classes":
        return <ClassesPanel />;
      default:
        return <AdminOverviewPanel user={user} />;
    }
  };

  return (
    <div style={styles.wrapper}>
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        handleLogout={handleLogout}
      />

      <div style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>¡Hola, {user?.first_name || user?.username || "Admin"}!</h1>
            <p style={styles.subtitle}>Bienvenido al panel de administración de GymManager</p>
          </div>

          <div style={styles.topActions}>
            <button style={styles.iconBtn}>🔔</button>
            <button style={styles.iconBtn}>⚙️</button>
            <div style={styles.avatar}>
              {(user?.username || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section style={styles.content}>{renderPanel()}</section>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef4ff 0%, #f6f8fc 45%, #eef7ff 100%)",
    fontFamily: "Inter, Arial, sans-serif",
  },
  main: {
    flex: 1,
    padding: "24px 28px",
  },
  topbar: {
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.7)",
    boxShadow: "0 10px 30px rgba(30, 41, 59, 0.08)",
    borderRadius: "22px",
    padding: "22px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    fontWeight: 800,
    color: "#132238",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#64748b",
    fontSize: "0.98rem",
  },
  topActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBtn: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    border: "1px solid #dbe4f0",
    background: "white",
    cursor: "pointer",
    fontSize: "1rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #14b8a6)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    boxShadow: "0 8px 20px rgba(37,99,235,0.25)",
  },
  content: {
    marginTop: "8px",
  },
};