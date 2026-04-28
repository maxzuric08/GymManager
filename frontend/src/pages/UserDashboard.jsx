import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPlansRequest, updateUserPlanRequest, logoutRequest,
  getClassesRequest, getUserBookingsRequest, createBookingRequest, cancelBookingRequest
} from "../services/api";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("classes"); // "classes" o "membership"
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
  
  // Estados
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [plansData, classesData, bookingsData] = await Promise.all([
        getPlansRequest(),
        getClassesRequest(),
        getUserBookingsRequest(currentUser.user_id)
      ]);
      setPlans(plansData.filter(p => p.status === "active"));
      
      // Filtrar clases futuras
      const today = new Date().toISOString().split("T")[0];
      setClasses(classesData.filter(c => c.class_date >= today && c.status !== "cancelled"));
      
      setMyBookings(bookingsData);
    } catch (err) {
      setError("Error al cargar los datos del sistema.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPlan = async (plan) => {
    try {
      const result = await updateUserPlanRequest(currentUser.user_id, plan.plan_id);
      const updatedUser = { ...currentUser, plan_id: plan.plan_id };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setMessage(result.message);
      setError("");
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleBookClass = async (classId) => {
    if (!currentUser.plan_id) {
      setError("Debes adquirir una membresía antes de reservar clases.");
      setActiveTab("membership");
      return;
    }
    try {
      await createBookingRequest({ user_id: currentUser.user_id, class_id: classId });
      setMessage("¡Reserva confirmada con éxito!");
      setError("");
      fetchData(); // Recargar agenda
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("¿Seguro que querés cancelar esta reserva?")) return;
    try {
      await cancelBookingRequest(bookingId);
      setMessage("Reserva cancelada.");
      setError("");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try { await logoutRequest(); } catch (e) { console.log(e); }
    localStorage.clear();
    navigate("/");
  };

  const currentPlan = plans.find(p => p.plan_id === currentUser.plan_id);

  // Helper para mostrar fechas lindas
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-AR', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Usuario</h1>
          <p style={styles.subtitle}>Bienvenido, {currentUser.first_name || currentUser.username}</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.tabs}>
        <button onClick={() => {setActiveTab("classes"); setMessage(""); setError("");}} style={activeTab === "classes" ? styles.activeTab : styles.tab}>📅 Mis Clases</button>
        <button onClick={() => {setActiveTab("membership"); setMessage(""); setError("");}} style={activeTab === "membership" ? styles.activeTab : styles.tab}>💳 Mi Membresía</button>
      </div>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      {/* --- PESTAÑA: CLASES --- */}
      {activeTab === "classes" && (
        <div>
          <h2>Mis Reservas Confirmadas</h2>
          <div style={styles.grid}>
            {myBookings.length === 0 ? <p style={{color:"#64748b"}}>No tenés reservas activas.</p> : 
              myBookings.map(b => (
                <div key={b.booking_id} style={{...styles.card, borderLeft: "4px solid #16a34a"}}>
                  <h3 style={{margin: "0 0 10px 0"}}>{b.class_name}</h3>
                  <p>🗓️ <span style={{textTransform:"capitalize"}}>{formatDate(b.class_date)}</span></p>
                  <p>⏰ {b.start_time.slice(0,5)} a {b.end_time.slice(0,5)}</p>
                  <p>🏋️ Prof. {b.first_name || "Asignado"}</p>
                  <button onClick={() => handleCancelBooking(b.booking_id)} style={styles.cancelBtn}>Cancelar Reserva</button>
                </div>
              ))
            }
          </div>

          <h2 style={{marginTop: "2rem"}}>Cartelera de Clases Disponibles</h2>
          <div style={styles.grid}>
            {classes.map(cls => {
              const isBooked = myBookings.some(b => b.class_id === cls.class_id);
              return (
                <div key={cls.class_id} style={styles.card}>
                  <h3 style={{margin: "0 0 10px 0"}}>{cls.class_name}</h3>
                  <p>🗓️ <span style={{textTransform:"capitalize"}}>{formatDate(cls.class_date)}</span></p>
                  <p>⏰ {cls.start_time.slice(0,5)} a {cls.end_time.slice(0,5)}</p>
                  <button 
                    onClick={() => handleBookClass(cls.class_id)} 
                    disabled={isBooked}
                    style={{...styles.button, background: isBooked ? "#94a3b8" : "#2563eb", cursor: isBooked ? "not-allowed" : "pointer"}}
                  >
                    {isBooked ? "Ya estás anotado" : "Reservar Lugar"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- PESTAÑA: MEMBRESÍA --- */}
      {activeTab === "membership" && (
        <div>
          <div style={{...styles.card, marginBottom: "2rem", background: "#f8fafc", border: "1px solid #e2e8f0"}}>
            <h2>Mi membresía actual</h2>
            <p style={{fontSize: "1.1rem"}}>
              {currentPlan ? <span>Tenés activo el plan: <strong>{currentPlan.plan_type}</strong></span> : "⚠️ Aún no tienes una membresía seleccionada."}
            </p>
          </div>

          <h2>Planes disponibles para mejorar</h2>
          <div style={styles.grid}>
            {plans.map((plan) => {
              const isCurrentPlan = currentUser.plan_id === plan.plan_id;
              return (
                <div key={plan.plan_id} style={styles.card}>
                  <h3 style={{margin: "0 0 10px 0"}}>{plan.plan_type}</h3>
                  <p><strong>Precio:</strong> ${plan.cost}</p>
                  <p><strong>Duración:</strong> {plan.duration}</p>
                  <p><strong>Beneficios:</strong> {plan.benefits}</p>
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan}
                    style={{...styles.button, background: isCurrentPlan ? "#94a3b8" : "#f97316", cursor: isCurrentPlan ? "not-allowed" : "pointer"}}
                  >
                    {isCurrentPlan ? "Plan actual" : "Adquirir Plan"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "2rem", backgroundColor: "#f5f7fb", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { marginTop: "0.4rem", color: "#64748b" },
  logoutBtn: { padding: "10px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  tabs: { display: "flex", gap: "10px", marginBottom: "1.5rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" },
  tab: { padding: "10px 20px", background: "transparent", border: "none", fontSize: "1rem", color: "#64748b", cursor: "pointer", fontWeight: "bold" },
  activeTab: { padding: "10px 20px", background: "#2563eb", border: "none", borderRadius: "8px", fontSize: "1rem", color: "white", cursor: "pointer", fontWeight: "bold" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.5rem" },
  card: { background: "white", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" },
  button: { marginTop: "1rem", width: "100%", padding: "12px", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" },
  cancelBtn: { marginTop: "1rem", width: "100%", padding: "10px", color: "#dc3545", background: "transparent", border: "1px solid #dc3545", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  success: { color: "#16a34a", fontWeight: "bold", padding: "10px", background: "#dcfce7", borderRadius: "8px", marginBottom: "1rem" },
  error: { color: "#dc3545", fontWeight: "bold", padding: "10px", background: "#fee2e2", borderRadius: "8px", marginBottom: "1rem" },
};