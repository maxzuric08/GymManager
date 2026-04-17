export default function AdminSidebar({
  activeSection,
  setActiveSection,
  handleLogout,
}) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: "🏠" },
    { key: "users", label: "Usuarios", icon: "👥" },
    { key: "instructors", label: "Instructores", icon: "🏋️" },
    { key: "plans", label: "Planes", icon: "💳" },
    { key: "classes", label: "Clases", icon: "📅" },
  ];

  return (
    <aside style={styles.sidebar}>
      <div>
        <div style={styles.brand}>
          <img src="/logo.png" alt="GymManager" style={styles.logo} />
        </div>

        <div style={styles.menu}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              style={
                activeSection === item.key ? styles.activeBtn : styles.menuBtn
              }
            >
              <span style={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleLogout} style={styles.logoutBtn}>
        <span style={styles.icon}>↩</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "260px",
    padding: "20px 16px",
    background: "linear-gradient(180deg, #0f60ff 0%, #0a4fd4 45%, #0d9488 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "8px 0 30px rgba(15, 96, 255, 0.18)",
    minHeight: "100vh",
  },
  brand: {
    padding: "10px 6px 20px 6px",
    marginBottom: "18px",
  },
  logo: {
    width: "250px",
    display: "block",
  },
  menu: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  menuBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderRadius: "14px",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontSize: "0.98rem",
    textAlign: "left",
  },
  activeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.18)",
    color: "white",
    cursor: "pointer",
    fontSize: "0.98rem",
    textAlign: "left",
    fontWeight: 700,
    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  },
  icon: {
    width: "20px",
    textAlign: "center",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "14px 16px",
    border: "none",
    borderRadius: "14px",
    background: "rgba(220,53,69,0.95)",
    color: "white",
    cursor: "pointer",
    fontSize: "0.98rem",
    fontWeight: 700,
  },
};