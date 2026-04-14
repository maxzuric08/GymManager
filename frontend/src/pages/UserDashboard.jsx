import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, getClassesRequest } from "../services/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  
  const [availableClasses, setAvailableClasses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await getClassesRequest();
        setAvailableClasses(data);
      } catch (err) {
        setError("Error al cargar las clases disponibles.");
      }
    };

    fetchClasses();
  }, []);

  const handleLogout = async () => {
    try { await logoutRequest(); } catch (error) { console.log(error); }
    localStorage.clear();
    navigate("/");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('es-AR', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Simulamos la reserva para la demo
  const handleReserve = (className) => {
    alert(`¡Reserva confirmada para la clase de ${className}! Te esperamos.`);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1>GymManager</h1>
          <p style={{ color: "#666", fontSize: "1.1rem" }}>¡Bienvenido de vuelta, {user?.first_name || user?.username}!</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.agendaCard}>
        <h2>Clases Disponibles</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>Anotate en tus clases favoritas de la semana.</p>
        
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={styles.grid}>
          {availableClasses.length === 0 ? (
            <p style={{ textAlign: "center", color: "#666", gridColumn: "1 / -1" }}>No hay clases publicadas esta semana.</p>
          ) : (
            availableClasses.map((cls) => (
              <div key={cls.class_id} style={styles.classCard}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0, color: "#198754" }}>{cls.class_name}</h3>
                </div>
                <div style={styles.cardBody}>
                  <p><strong>📅 Día:</strong> <span style={{textTransform: "capitalize"}}>{formatDate(cls.class_date)}</span></p>
                  <p><strong>⏰ Hora:</strong> {cls.start_time.slice(0,5)} a {cls.end_time.slice(0,5)}</p>
                  <p><strong>🔥 Cupos:</strong> {cls.capacity} lugares</p>
                </div>
                <button 
                  onClick={() => handleReserve(cls.class_name)} 
                  style={styles.primaryBtn}
                >
                  Reservar lugar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  logoutBtn: { padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  agendaCard: { backgroundColor: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
  classCard: { border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem", backgroundColor: "#f8f9fa", display: "flex", flexDirection: "column", justifyContent: "space-between" },
  cardHeader: { marginBottom: "1rem", borderBottom: "2px solid #eee", paddingBottom: "0.5rem" },
  cardBody: { lineHeight: "1.8", marginBottom: "1.5rem", flexGrow: 1 },
  primaryBtn: { width: "100%", padding: "10px", backgroundColor: "#198754", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", transition: "background 0.3s" }
};