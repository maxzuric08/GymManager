import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, getClassesRequest } from "../services/api";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  // Traemos los datos del profesor logueado desde el localStorage
  const user = JSON.parse(localStorage.getItem("user"));
  
  const [myClasses, setMyClasses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMyAgenda = async () => {
      try {
        const allClasses = await getClassesRequest();
        
        // Filtramos para que solo vea las clases donde el ID coincide con su instructor_id
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1>Panel de Profesor</h1>
          <p style={{ color: "#666", fontSize: "1.1rem" }}>¡Hola, Prof. {user?.username}!</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.agendaCard}>
        <h2>Mi Agenda de Clases</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>Acá podés ver todos tus horarios asignados por la administración.</p>
        
        {error && <p style={{ color: "red" }}>{error}</p>}

        <div style={styles.grid}>
          {myClasses.length === 0 ? (
            <p style={{ padding: "2rem", textAlign: "center", color: "#666", backgroundColor: "#f8f9fa", borderRadius: "8px", gridColumn: "1 / -1" }}>
              No tenés clases asignadas por el momento.
            </p>
          ) : (
            myClasses.map((cls) => (
              <div key={cls.class_id} style={styles.classCard}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0, color: "#0b5ed7" }}>{cls.class_name}</h3>
                  <span style={styles.badge}>{cls.status}</span>
                </div>
                <div style={styles.cardBody}>
                  <p><strong>📅 Fecha:</strong> <span style={{textTransform: "capitalize"}}>{formatDate(cls.class_date)}</span></p>
                  <p><strong>⏰ Horario:</strong> {cls.start_time} a {cls.end_time}</p>
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
  logoutBtn: { padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  agendaCard: { backgroundColor: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  classCard: { border: "1px solid #e0e0e0", borderRadius: "8px", padding: "1.5rem", backgroundColor: "#fafafa" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "2px solid #eee", paddingBottom: "0.5rem" },
  cardBody: { lineHeight: "1.8", marginBottom: "1.5rem" },
  badge: { backgroundColor: "#d1e7dd", color: "#0f5132", padding: "4px 8px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
};