import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MembershipPanel from "../components/user/MembershipPanel";
import {
  getPlansRequest,
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

  const [activeTab, setActiveTab] = useState(() =>
      new URLSearchParams(window.location.search).has("payment") ? "membership" : "classes"
  );
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

  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

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
      const [plansData, classesData, bookingsData] =
          await Promise.all([
            getPlansRequest(),
            getClassesRequest(),
            getUserBookingsRequest(),
          ]);

      console.log("Plans data from API:", plansData);
      const filteredPlans = plansData.filter((p) => p.status === "active");
      console.log("Filtered plans:", filteredPlans);
      setPlans(filteredPlans);

      const today = new Date().toISOString().split("T")[0];
      const filteredClasses = classesData.filter(
          (c) => c.class_date >= today && c.status !== "cancelled"
      );
      console.log("Filtered classes:", filteredClasses);
      setClasses(filteredClasses);

      console.log("Bookings data:", bookingsData);

      setMyBookings(bookingsData);
      setError("");

      // Fetch medical certificate separately so it doesn't break other data
      try {
        const certificateData = await getMyMedicalCertificateRequest();
        console.log("Medical certificate data:", certificateData);
        setMedicalCertificate(certificateData);
      } catch (certErr) {
        console.error("Error fetching medical certificate:", certErr);
        setMedicalCertificate(null);
      }
    } catch (err) {
      console.error("Error in fetchData:", err);
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

  const handleBookClass = async (classId) => {
    clearMessages();

    if (!currentUser.plan_id) {
      setError("Debes adquirir una membresía antes de reservar clases.");
      setActiveTab("membership");
      return;
    }

    if (!medicalCertificate || medicalCertificate.status !== "approved") {
      setError("Necesitas tener el apto médico aprobado para reservar clases.");
      setActiveTab("medical-certificate");
      return;
    }

    try {
      await createBookingRequest({ class_id: classId });
      setMessage("Reserva confirmada con éxito.");
      setError("");
      fetchData();
    } catch (err) {
      setError(err.message);
      setMessage("");
    }
  };

  const handleCancelBooking = (bookingId) => {
    setConfirmModal({
      title: "Cancelar Reserva",
      message: "¿Seguro que quieres cancelar esta reserva?"
    });
    setConfirmAction(() => async () => {
      try {
        await cancelBookingRequest(bookingId);
        setMessage("Reserva cancelada.");
        setError("");
        setConfirmModal(null);
        fetchData();
      } catch (err) {
        setError(err.message);
      }
    });
  };

  const handleConfirmAction = async () => {
    if (confirmAction) {
      await confirmAction();
    }
    setConfirmModal(null);
    setConfirmAction(null);
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


  const handleMembershipUpdated = useCallback((membership) => {
    setCurrentUser((previousUser) => {
      const updatedUser = {
        ...previousUser,
        plan_id: membership.plan_id,
        plan_expiration_date: membership.plan_expiration_date,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);
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
                          <p>Prof. {booking.instructor_first_name && booking.instructor_last_name ? `${booking.instructor_first_name} ${booking.instructor_last_name}` : (booking.instructor_first_name || booking.instructor_last_name || "Asignado")}</p>

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
            <MembershipPanel
                plans={plans}
                currentUser={currentUser}
                onMembershipUpdated={handleMembershipUpdated}
            />
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

        {confirmModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                <h3 style={{ marginTop: 0, color: "#132238" }}>{confirmModal.title}</h3>
                <p style={{ color: "#475569", marginBottom: "1.5rem" }}>{confirmModal.message}</p>
                <div style={styles.modalActions}>
                  <button
                      onClick={() => {
                        setConfirmModal(null);
                        setConfirmAction(null);
                      }}
                      style={styles.modalCancelBtn}
                  >
                    Cancelar
                  </button>
                  <button
                      onClick={handleConfirmAction}
                      style={styles.modalConfirmBtn}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "grid",
    placeItems: "center",
    zIndex: 999,
  },
  modal: {
    width: "420px",
    background: "white",
    padding: "1.5rem",
    borderRadius: "14px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  modalCancelBtn: {
    padding: "10px 16px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    background: "white",
    color: "#475569",
    cursor: "pointer",
    fontWeight: "bold",
  },
  modalConfirmBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#dc3545",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
