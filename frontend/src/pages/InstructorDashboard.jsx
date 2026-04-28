import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, getClassesRequest } from "../services/api";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  // Leemos quién es el profe logueado (y ahora trae su first_name, available_from, etc.)
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

        // Ordenamos las clases por fecha para que la agenda tenga sentido
        filteredClasses.sort((a, b) => new Date(a.class_date) - new Date(b.class_date));
        
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
    // Le agregamos T00:00:00 para evitar que la zona horaria nos reste un día
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Profesor</h1>
          <p style={styles.subtitle}>¡Hola, Prof. {user?.first_name || user?.username}!</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.infoCard}>
        <h2 style={{ marginTop: 0, color: "#132238" }}>Mi Disponibilidad</h2>
        <p style={{ margin: 0, color: "#334155" }}>
          {user.available_from && user.available_to 
            ? `🕒 Tus horarios habilitados para dar clases son de ${user.available_from.slice(0,5)} a ${user.available_to.slice(0,5)} hs.`
            : "⚠️ Aún no tenés horarios de disponibilidad configurados. Hablá con el administrador."}
        </p>
      </div>

      <div style={styles.agendaCard}>
        <h2 style={{ marginTop: 0, color: "#132238" }}>Mi Agenda de Clases</h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Acá podés ver todos los turnos que te asignó la administración.</p>
        
        {error && <p style={{ color: "#dc3545", fontWeight: "bold" }}>{error}</p>}

        <div style={styles.grid}>
          {myClasses.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No tenés clases asignadas por el momento. ¡A descansar!</p>
            </div>
          ) : (
            myClasses.map((cls) => (
              <div key={cls.class_id} style={{...styles.classCard, borderLeft: cls.status === "cancelled" ? "4px solid #dc3545" : "4px solid #0b5ed7"}}>
                <div style={styles.cardHeader}>
                  <h3 style={{ margin: 0, color: "#132238" }}>{cls.class_name}</h3>
                  <span style={cls.status === "cancelled" ? styles.badgeCancelled : styles.badgeActive}>
                    {cls.status}
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <p><strong>🗓️ Fecha:</strong> <span style={{textTransform: "capitalize"}}>{formatDate(cls.class_date)}</span></p>
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
  container: { padding: "2rem", backgroundColor: "#f5f7fb", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: 0, marginTop: "0.4rem", color: "#64748b", fontSize: "1.1rem" },
  logoutBtn: { padding: "10px 20px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  infoCard: { backgroundColor: "white", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)", marginBottom: "2rem", border: "1px solid #e2e8f0" },
  agendaCard: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  classCard: { borderRadius: "12px", padding: "1.5rem", backgroundColor: "#f8fafc", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "2px solid #eef2f7", paddingBottom: "0.8rem" },
  cardBody: { lineHeight: "1.8", color: "#334155", margin: 0 },
  badgeActive: { backgroundColor: "#dbeafe", color: "#1d4ed8", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
  badgeCancelled: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
  emptyState: { padding: "3rem", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "12px", gridColumn: "1 / -1" }
};