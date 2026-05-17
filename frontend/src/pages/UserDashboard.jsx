import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPlansRequest,
  updateUserPlanRequest,
  logoutRequest,
  getClassesRequest,
  getUserBookingsRequest,
  createBookingRequest,
  cancelBookingRequest,
  getMyMedicalCertificateRequest,
  uploadMedicalCertificateRequest,
  openMedicalCertificateFile,
} from "../services/api";

export default function UserDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("classes");
  const [currentUser, setCurrentUser] = useState(
      JSON.parse(localStorage.getItem("user") || "{}")
  );

  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [myBookings, setMyBookings] = useState([]);

  const [medicalCertificate, setMedicalCertificate] = useState(null);
  const [medicalFile, setMedicalFile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchMedicalCertificate = async () => {
    try {
      const data = await getMyMedicalCertificateRequest();
      setMedicalCertificate(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchData = async () => {
    try {
      const [plansData, classesData, bookingsData, certificateData] =
          await Promise.all([
            getPlansRequest(),
            getClassesRequest(),
            getUserBookingsRequest(),
            getMyMedicalCertificateRequest(),
          ]);

      setPlans(plansData.filter((p) => p.status === "active"));

      const today = new Date().toISOString().split("T")[0];
      setClasses(
          classesData.filter(
              (c) => c.class_date >= today && c.status !== "cancelled"
          )
      );

      setMyBookings(bookingsData);
      setMedicalCertificate(certificateData);
      setError("");
    } catch (err) {
      setError("Error al cargar los datos del sistema.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

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
      setError("Debes adquirir una membresia antes de reservar clases.");
      setActiveTab("membership");
      return;
    }

    if (!medicalCertificate || medicalCertificate.status !== "approved") {
      setError("Necesitas tener el apto medico aprobado para reservar clases.");
      setActiveTab("medical-certificate");
      return;
    }

    try {
      await createBookingRequest({ class_id: classId });
      setMessage("Reserva confirmada con exito.");
      setError("");
      fetchData();
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Seguro que queres cancelar esta reserva?")) return;

    try {
      await cancelBookingRequest(bookingId);
      setMessage("Reserva cancelada.");
      setError("");
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadMedicalCertificate = async (e) => {
    e.preventDefault();

    if (!medicalFile) {
      setError("Selecciona un archivo.");
      return;
    }

    try {
      const fileData = await fileToBase64(medicalFile);

      const result = await uploadMedicalCertificateRequest({
        file_name: medicalFile.name,
        mime_type: medicalFile.type,
        file_data: fileData,
      });

      setMessage(result.message);
      setError("");
      setMedicalFile(null);
      fetchMedicalCertificate();
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (e) {
      console.log(e);
    }

    localStorage.clear();
    navigate("/");
  };

  const currentPlan = plans.find((p) => p.plan_id === currentUser.plan_id);

  const formatDate = (dateString) =>
      new Date(dateString).toLocaleDateString("es-AR", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

  const certificateStatusText = {
    pending: "Pendiente de revision",
    approved: "Aprobado",
    rejected: "Rechazado",
  };

  return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Panel de Usuario</h1>
            <p style={styles.subtitle}>
              Bienvenido, {currentUser.first_name || currentUser.username}
            </p>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar sesion
          </button>
        </div>

        <div style={styles.tabs}>
          <button
              onClick={() => {
                setActiveTab("classes");
                clearMessages();
              }}
              style={activeTab === "classes" ? styles.activeTab : styles.tab}
          >
            Mis Clases
          </button>

          <button
              onClick={() => {
                setActiveTab("membership");
                clearMessages();
              }}
              style={activeTab === "membership" ? styles.activeTab : styles.tab}
          >
            Mi Membresia
          </button>

          <button
              onClick={() => {
                setActiveTab("medical-certificate");
                clearMessages();
              }}
              style={
                activeTab === "medical-certificate" ? styles.activeTab : styles.tab
              }
          >
            Apto Medico
          </button>
        </div>

        {message && <p style={styles.success}>{message}</p>}
        {error && <p style={styles.error}>{error}</p>}

        {activeTab === "classes" && (
            <div>
              <h2>Mis Reservas Confirmadas</h2>

              <div style={styles.grid}>
                {myBookings.length === 0 ? (
                    <p style={{ color: "#64748b" }}>No tenes reservas activas.</p>
                ) : (
                    myBookings.map((booking) => (
                        <div
                            key={booking.booking_id}
                            style={{ ...styles.card, borderLeft: "4px solid #16a34a" }}
                        >
                          <h3 style={{ margin: "0 0 10px 0" }}>
                            {booking.class_name}
                          </h3>
                          <p>
                    <span style={{ textTransform: "capitalize" }}>
                      {formatDate(booking.class_date)}
                    </span>
                          </p>
                          <p>
                            {booking.start_time.slice(0, 5)} a{" "}
                            {booking.end_time.slice(0, 5)}
                          </p>
                          <p>Prof. {booking.first_name || "Asignado"}</p>

                          <button
                              onClick={() => handleCancelBooking(booking.booking_id)}
                              style={styles.cancelBtn}
                          >
                            Cancelar Reserva
                          </button>
                        </div>
                    ))
                )}
              </div>

              <h2 style={{ marginTop: "2rem" }}>Cartelera de Clases Disponibles</h2>

              <div style={styles.grid}>
                {classes.map((cls) => {
                  const isBooked = myBookings.some(
                      (booking) => booking.class_id === cls.class_id
                  );

                  return (
                      <div key={cls.class_id} style={styles.card}>
                        <h3 style={{ margin: "0 0 10px 0" }}>{cls.class_name}</h3>
                        <p>
                    <span style={{ textTransform: "capitalize" }}>
                      {formatDate(cls.class_date)}
                    </span>
                        </p>
                        <p>
                          {cls.start_time.slice(0, 5)} a {cls.end_time.slice(0, 5)}
                        </p>

                        <button
                            onClick={() => handleBookClass(cls.class_id)}
                            disabled={isBooked}
                            style={{
                              ...styles.button,
                              background: isBooked ? "#94a3b8" : "#2563eb",
                              cursor: isBooked ? "not-allowed" : "pointer",
                            }}
                        >
                          {isBooked ? "Ya estas anotado" : "Reservar Lugar"}
                        </button>
                      </div>
                  );
                })}
              </div>
            </div>
        )}

        {activeTab === "membership" && (
            <div>
              <div
                  style={{
                    ...styles.card,
                    marginBottom: "2rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
              >
                <h2>Mi membresia actual</h2>
                <p style={{ fontSize: "1.1rem" }}>
                  {currentPlan ? (
                      <span>
                  Tenes activo el plan: <strong>{currentPlan.plan_type}</strong>
                </span>
                  ) : (
                      "Aun no tenes una membresia seleccionada."
                  )}
                </p>
              </div>

              <h2>Planes disponibles para mejorar</h2>

              <div style={styles.grid}>
                {plans.map((plan) => {
                  const isCurrentPlan = currentUser.plan_id === plan.plan_id;

                  return (
                      <div key={plan.plan_id} style={styles.card}>
                        <h3 style={{ margin: "0 0 10px 0" }}>{plan.plan_type}</h3>
                        <p>
                          <strong>Precio:</strong> ${plan.cost}
                        </p>
                        <p>
                          <strong>Duracion:</strong> {plan.duration}
                        </p>
                        <p>
                          <strong>Beneficios:</strong> {plan.benefits}
                        </p>

                        <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrentPlan}
                            style={{
                              ...styles.button,
                              background: isCurrentPlan ? "#94a3b8" : "#f97316",
                              cursor: isCurrentPlan ? "not-allowed" : "pointer",
                            }}
                        >
                          {isCurrentPlan ? "Plan actual" : "Adquirir Plan"}
                        </button>
                      </div>
                  );
                })}
              </div>
            </div>
        )}

        {activeTab === "medical-certificate" && (
            <div>
              <div
                  style={{
                    ...styles.card,
                    marginBottom: "1.5rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
              >
                <h2>Apto medico</h2>

                {medicalCertificate ? (
                    <>
                      <p>
                        Estado:{" "}
                        <strong>
                          {certificateStatusText[medicalCertificate.status] ||
                              medicalCertificate.status}
                        </strong>
                      </p>

                      <p>
                        Archivo: <strong>{medicalCertificate.file_name}</strong>
                      </p>

                      {medicalCertificate.rejection_reason && (
                          <p style={{ color: "#dc2626" }}>
                            Motivo del rechazo: {medicalCertificate.rejection_reason}
                          </p>
                      )}

                      <button
                          type="button"
                          onClick={() =>
                              openMedicalCertificateFile(
                                  medicalCertificate.medical_certificate_id
                              )
                          }
                          style={styles.secondaryBtn}
                      >
                        Ver archivo enviado
                      </button>
                    </>
                ) : (
                    <p style={{ color: "#64748b" }}>
                      Todavia no subiste ningun apto medico.
                    </p>
                )}
              </div>

              <form onSubmit={handleUploadMedicalCertificate} style={styles.card}>
                <h3 style={{ marginTop: 0 }}>Subir nuevo apto</h3>

                <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => setMedicalFile(e.target.files[0] || null)}
                    style={styles.input}
                />

                <button type="submit" style={styles.button}>
                  Enviar a revision
                </button>
              </form>
            </div>
        )}
      </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    backgroundColor: "#f5f7fb",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: {
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: "0.4rem",
    color: "#64748b",
  },
  logoutBtn: {
    padding: "10px 16px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    marginBottom: "1.5rem",
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: "10px",
    flexWrap: "wrap",
  },
  tab: {
    padding: "10px 20px",
    background: "transparent",
    border: "none",
    fontSize: "1rem",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: "bold",
  },
  activeTab: {
    padding: "10px 20px",
    background: "#2563eb",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    marginBottom: "1rem",
  },
  button: {
    marginTop: "1rem",
    width: "100%",
    padding: "12px",
    color: "white",
    background: "#2563eb",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryBtn: {
    marginTop: "1rem",
    padding: "10px 14px",
    color: "white",
    background: "#475569",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  cancelBtn: {
    marginTop: "1rem",
    width: "100%",
    padding: "10px",
    color: "#dc3545",
    background: "transparent",
    border: "1px solid #dc3545",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  success: {
    color: "#16a34a",
    fontWeight: "bold",
    padding: "10px",
    background: "#dcfce7",
    borderRadius: "8px",
    marginBottom: "1rem",
  },
  error: {
    color: "#dc3545",
    fontWeight: "bold",
    padding: "10px",
    background: "#fee2e2",
    borderRadius: "8px",
    marginBottom: "1rem",
  },
};
