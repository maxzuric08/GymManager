import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, getClassesRequest } from "../services/api";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  // Leemos quién es el profe logueado
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  const [myClasses, setMyClasses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyAgenda = async () => {
      try {
        const allClasses = await getClassesRequest();
        
        // El filtro mágico: solo clases donde el instructor_id sea el mío
        const filteredClasses = allClasses.filter(
          (cls) => cls.instructor_id === user.instructor_id
        );
        
        setMyClasses(filteredClasses);
      } catch (err) {
        setError("Error al cargar la agenda. Verifica tu conexión.");
      }
    };

    fetchMyAgenda();
  }, [user.instructor_id]);

  const handleLogout = async () => {
    try { await logoutRequest(); } catch (error) { console.log(error); }
    localStorage.clear();
    navigate("/");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: "0 0 5px 0", color: "#132238" }}>Panel de Profesor</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "1.1rem" }}>¡Hola, Prof. {user?.first_name || user?.username}!</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.agendaCard}>
        <h2 style={{ marginTop: 0, color: "#132238" }}>Mi Agenda de Clases</h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Acá podés ver todos tus horarios asignados por la administración.</p>
        
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={styles.grid}>
          {myClasses.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No tenés clases asignadas por el momento.</p>
            </div>
          ) : (
            myClasses.map((cls) => (
              <div key={cls.class_id} style={styles.classCard}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0, color: "#0b5ed7" }}>{cls.class_name}</h3>
                  <span style={styles.badge}>{cls.status}</span>
                </div>
                <div style={styles.cardBody}>
                  <p><strong>📅 Fecha:</strong> <span style={{textTransform: "capitalize"}}>{formatDate(cls.class_date)}</span></p>
                  <p><strong>⏰ Horario:</strong> {cls.start_time.slice(0,5)} a {cls.end_time.slice(0,5)}</p>
                  <p><strong>👥 Cupos Totales:</strong> {cls.capacity} alumnos</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  logoutBtn: { padding: "10px 20px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  agendaCard: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  classCard: { border: "1px solid #eef2f7", borderRadius: "12px", padding: "1.5rem", backgroundColor: "#f8fafc" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "2px solid #eef2f7", paddingBottom: "0.8rem" },
  cardBody: { lineHeight: "1.8", color: "#334155" },
  badge: { backgroundColor: "#d1e7dd", color: "#0f5132", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
  emptyState: { padding: "3rem", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "12px", gridColumn: "1 / -1" }
};