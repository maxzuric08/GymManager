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
  getMyPaymentsRequest,
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
  const [uploadingMedicalCertificate, setUploadingMedicalCertificate] = useState(false);
  const [myPayments, setMyPayments] = useState([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingClassId, setBookingClassId] = useState(null);

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

      const filteredPlans = plansData.filter((p) => p.status === "active");
      setPlans(filteredPlans);

      const filteredClasses = classesData.filter(
          (gymClass) => {
            if (!["active", "scheduled"].includes(gymClass.status)) return false;
            const classDate = gymClass.class_date.slice(0, 10);
            const start = new Date(`${classDate}T${gymClass.start_time}`);
            return start > new Date();
          }
      );
      setClasses(filteredClasses);

      setMyBookings(bookingsData);
      setError("");

      // Fetch medical certificate separately so it doesn't break other data
      try {
        const certificateData = await getMyMedicalCertificateRequest();
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
    if (bookingClassId !== null) return;
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
      setBookingClassId(classId);
      await createBookingRequest({ class_id: classId });
      setMessage("Reserva confirmada con éxito.");
      setError("");
      await fetchData();
    } catch (err) {
      setError(err.message);
      setMessage("");
    } finally {
      setBookingClassId(null);
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

    if (uploadingMedicalCertificate) return;

    if (!medicalFile) {
      setError("Selecciona un archivo.");
      return;
    }

    try {
      setUploadingMedicalCertificate(true);
      const fileData = await fileToBase64(medicalFile);

      const result = await uploadMedicalCertificateRequest({
        file_name: medicalFile.name,
        mime_type: medicalFile.type,
        file_data: fileData,
      });

      setMessage(result.message);
      setError("");
      setMedicalFile(null);
      await fetchMedicalCertificate();
    } catch (err) {
      setError(err.message);
      setMessage("");
    } finally {
      setUploadingMedicalCertificate(false);
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

          <button
              onClick={async () => {
                setActiveTab("payments");
                clearMessages();
                try {
                  const data = await getMyPaymentsRequest();
                  setMyPayments(data.payments || []);
                } catch (err) {
                  setError(err.message);
                }
              }}
              style={activeTab === "payments" ? styles.activeTab : styles.tab}
          >
            Mis Pagos
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
                  const isBooking = bookingClassId === cls.class_id;
                  const bookingInProgress = bookingClassId !== null;

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
                            disabled={isBooked || bookingInProgress}
                            style={{
                              ...styles.button,
                              background: (isBooked || bookingInProgress) ? "#94a3b8" : "#2563eb",
                              cursor: (isBooked || bookingInProgress) ? "not-allowed" : "pointer",
                            }}
                        >
                          {isBooked ? "Ya estas anotado" : isBooking ? "Reservando..." : "Reservar Lugar"}
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

              {(!medicalCertificate || medicalCertificate.status === "rejected") && (
                  <form onSubmit={handleUploadMedicalCertificate} style={styles.card}>
                    <h3 style={{ marginTop: 0 }}>
                      {medicalCertificate?.status === "rejected" ? "Enviar nuevo apto" : "Subir nuevo apto"}
                    </h3>

                    <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        disabled={uploadingMedicalCertificate}
                        onChange={(e) => setMedicalFile(e.target.files[0] || null)}
                        style={styles.input}
                    />

                    <button
                        type="submit"
                        disabled={uploadingMedicalCertificate}
                        style={{
                          ...styles.button,
                          opacity: uploadingMedicalCertificate ? 0.6 : 1,
                          cursor: uploadingMedicalCertificate ? "not-allowed" : "pointer",
                        }}
                    >
                      {uploadingMedicalCertificate ? "Enviando..." : "Enviar a revision"}
                    </button>
                  </form>
              )}
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

        {activeTab === "payments" && (
          <div>
            <h2 style={{ marginBottom: "1.5rem" }}>Mis Pagos</h2>
            {myPayments.length === 0 ? (
              <div style={styles.card}>
                <p style={{ color: "#64748b", margin: 0 }}>No tenés pagos registrados aún.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.paymentsTable}>
                  <thead>
                    <tr>
                      <th style={styles.pth}>#</th>
                      <th style={styles.pth}>Plan</th>
                      <th style={styles.pth}>Monto</th>
                      <th style={styles.pth}>Fecha</th>
                      <th style={styles.pth}>Vencimiento</th>
                      <th style={styles.pth}>Método</th>
                      <th style={styles.pth}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPayments.map((p) => (
                      <tr key={p.payment_id}>
                        <td style={styles.ptd}>{p.payment_id}</td>
                        <td style={styles.ptd}>{p.plan_type || "-"}</td>
                        <td style={styles.ptd}>${Number(p.amount).toLocaleString("es-AR")}</td>
                        <td style={styles.ptd}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString("es-AR") : "-"}</td>
                        <td style={styles.ptd}>{p.expiry_date ? new Date(`${p.expiry_date}T00:00:00`).toLocaleDateString("es-AR") : "-"}</td>
                        <td style={styles.ptd}>{p.payment_method || "-"}</td>
                        <td style={styles.ptd}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold",
                            backgroundColor: p.payment_status === "approved" ? "#dcfce7" : p.payment_status === "pending" ? "#fef9c3" : "#fee2e2",
                            color: p.payment_status === "approved" ? "#15803d" : p.payment_status === "pending" ? "#854d0e" : "#b91c1c",
                          }}>
                            {p.payment_status === "approved" ? "Aprobado" : p.payment_status === "pending" ? "Pendiente" : p.payment_status === "rejected" ? "Rechazado" : p.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
  paymentsTable: { width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  pth: { backgroundColor: "#0f172a", color: "white", padding: "12px 16px", textAlign: "left", fontSize: "0.85rem" },
  ptd: { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", fontSize: "0.9rem" },
};
