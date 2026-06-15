import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import {
  logoutRequest,
  getClassesRequest,
  getInstructorClassAttendanceRequest,
  saveInstructorClassAttendanceRequest,
  getInstructorAttendanceHistoryRequest,
  updateMyAvailabilityRequest,
} from "../services/api";

const STATUS_LABELS = {
  present: { label: "Presente", color: "#22c55e" },
  absent: { label: "Ausente", color: "#ef4444" },
  late: { label: "Tardanza", color: "#f59e0b" },
  excused: { label: "Justificado", color: "#6366f1" },
};

const CLASS_STATUS_LABELS = {
  scheduled: "Programada",
  active: "Activa",
  cancelled: "Cancelada",
};

const formatInputDate = (date) => date.toISOString().slice(0, 10);

const today = new Date().toISOString().slice(0, 10);

function Metric({ label, value, accent = "#0f172a" }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={{ ...styles.metricValue, color: accent }}>{value}</strong>
    </div>
  );
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState("agenda");
  const [myClasses, setMyClasses] = useState([]);
  const [attendanceRegistered, setAttendanceRegistered] = useState({});
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [availability, setAvailability] = useState({ from: user.available_from?.slice(0, 5) || "", to: user.available_to?.slice(0, 5) || "" });
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Historial state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatInputDate(d);
  });
  const [dateTo, setDateTo] = useState(() => formatInputDate(new Date()));
  const [overview, setOverview] = useState({ summary: {}, classes: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Attendance modal state
  const [attendanceModal, setAttendanceModal] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  useEffect(() => {
    const fetchMyAgenda = async () => {
      try {
        const [allClasses, historyData] = await Promise.all([
          getClassesRequest(),
          getInstructorAttendanceHistoryRequest("2000-01-01", "2100-01-01"),
        ]);
        const filtered = allClasses
          .filter((cls) => cls.instructor_id === user.instructor_id)
          .sort((a, b) => new Date(a.class_date) - new Date(b.class_date));
        setMyClasses(filtered);
        const registered = {};
        historyData.classes.forEach((c) => { registered[c.class_id] = c.attendance_registered > 0; });
        setAttendanceRegistered(registered);
      } catch {
        setModal({ isOpen: true, title: "Error", message: "Error al cargar la agenda.", type: "error" });
      }
    };
    fetchMyAgenda();
  }, [user.instructor_id]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getInstructorAttendanceHistoryRequest(dateFrom, dateTo);
      setOverview(data);
    } catch (err) {
      setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
    } finally {
      setLoadingHistory(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === "historial") loadHistory();
  }, [activeTab, loadHistory]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.error("Error al cerrar sesion:", error);
    }
    localStorage.clear();
    navigate("/");
  };

  const openAttendanceModal = async (cls) => {
    try {
      const data = await getInstructorClassAttendanceRequest(cls.class_id);
      const initial = {};
      data.students.forEach((s) => {
        initial[s.booking_id] = {
          status: s.attendance_status || "present",
          notes: s.notes || "",
        };
      });
      setAttendanceData(initial);
      setAttendanceModal({ cls: data.class, students: data.students });
      setAttendanceSaved(false);
    } catch (err) {
      setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const attendances = Object.entries(attendanceData).map(([booking_id, val]) => ({
        booking_id: Number(booking_id),
        status: val.status,
        notes: val.notes,
      }));
      await saveInstructorClassAttendanceRequest(attendanceModal.cls.class_id, attendances);
      setAttendanceSaved(true);
      setAttendanceRegistered((prev) => ({ ...prev, [attendanceModal.cls.class_id]: true }));
      if (activeTab === "historial") loadHistory();
    } catch (err) {
      setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const result = await updateMyAvailabilityRequest(availability.from, availability.to);
      const updatedUser = { ...user, available_from: result.instructor.available_from, available_to: result.instructor.available_to };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEditingAvailability(false);
      setModal({ isOpen: true, title: "Listo", message: "Disponibilidad actualizada correctamente.", type: "success" });
    } catch (err) {
      setModal({ isOpen: true, title: "Error", message: err.message, type: "error" });
    } finally {
      setSavingAvailability(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString.includes("T") ? dateString : `${dateString}T00:00:00`);
    const weekday = date.toLocaleDateString("es-AR", { weekday: "long" });
    const ddmmyyyy = date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${ddmmyyyy}`;
  };

  const summary = overview.summary || {};

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Panel de Instructor</h1>
          <p style={styles.subtitle}>Hola, Prof. {user?.first_name || user?.username}</p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={styles.infoCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong>Mi disponibilidad</strong>
            {!editingAvailability && (
              <span style={{ marginLeft: "12px", color: availability.from && availability.to ? "#334155" : "#94a3b8" }}>
                {availability.from && availability.to ? `${availability.from} a ${availability.to} hs` : "Sin horarios configurados"}
              </span>
            )}
          </div>
          {!editingAvailability ? (
            <button onClick={() => setEditingAvailability(true)} style={styles.editAvailBtn}>
              {availability.from ? "Editar" : "Configurar horarios"}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <label style={styles.timeLabel}>
                Desde
                <input type="time" value={availability.from} onChange={(e) => setAvailability({ ...availability, from: e.target.value })} style={styles.timeInput} />
              </label>
              <label style={styles.timeLabel}>
                Hasta
                <input type="time" value={availability.to} onChange={(e) => setAvailability({ ...availability, to: e.target.value })} style={styles.timeInput} />
              </label>
              <button onClick={handleSaveAvailability} disabled={savingAvailability} style={styles.saveAvailBtn}>
                {savingAvailability ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setEditingAvailability(false)} style={styles.cancelAvailBtn}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === "agenda" ? styles.tabActive : {}) }} onClick={() => setActiveTab("agenda")}>
          Mi Agenda
        </button>
        <button style={{ ...styles.tab, ...(activeTab === "historial" ? styles.tabActive : {}) }} onClick={() => setActiveTab("historial")}>
          Historial de Asistencia
        </button>
      </div>

      {/* ===== AGENDA TAB ===== */}
      {activeTab === "agenda" && (
        <div style={styles.grid}>
          {myClasses.length === 0 ? (
            <div style={styles.emptyState}>No tenés clases asignadas por el momento.</div>
          ) : (
            myClasses.map((cls) => {
              const isPast = cls.class_date < today;
              const isToday = cls.class_date === today;
              const hasAttendance = attendanceRegistered[cls.class_id];
              return (
                <div key={cls.class_id} style={{
                  ...styles.classCard,
                  borderLeft: cls.status === "cancelled" ? "4px solid #dc3545" : "4px solid #1e293b",
                  opacity: isPast ? 0.7 : 1,
                  backgroundColor: isPast ? "#f1f5f9" : "white",
                }}>
                  <div style={styles.cardHeader}>
                    <h3 style={{ margin: 0, color: "#132238" }}>{cls.class_name}</h3>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span style={cls.status === "cancelled" ? styles.badgeCancelled : styles.badgeActive}>
                        {CLASS_STATUS_LABELS[cls.status] || cls.status}
                      </span>
                      {isPast && (
                        <span style={styles.badgePast}>Pasada</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    <p><strong>Fecha:</strong> <span style={{ textTransform: "capitalize" }}>{formatDate(cls.class_date)}</span></p>
                    <p><strong>Horario:</strong> {cls.start_time?.slice(0, 5)} a {cls.end_time?.slice(0, 5)}</p>
                    <p><strong>Cupos:</strong> {cls.capacity}</p>
                  </div>
                  {cls.status !== "cancelled" && (
                    <div style={{ marginTop: "auto" }}>
                      {hasAttendance && isToday && (
                        <p style={styles.attendanceDone}>✓ Asistencia registrada</p>
                      )}
                      {isToday ? (
                        <button onClick={() => openAttendanceModal(cls)} style={styles.attendanceBtn}>
                          {hasAttendance ? "Editar Asistencia" : "Registrar Asistencia"}
                        </button>
                      ) : isPast ? (
                        <p style={styles.attendanceExpired}>Plazo vencido</p>
                      ) : (
                        <p style={styles.attendancePending}>Disponible el día de la clase</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== HISTORIAL TAB ===== */}
      {activeTab === "historial" && (
        <div>
          <div style={styles.historialHeader}>
            <div>
              <h2 style={{ margin: 0, color: "#0f172a" }}>Mis clases</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>Estadísticas del período seleccionado.</p>
            </div>
            <div style={styles.filters}>
              <label style={styles.filterLabel}>
                Desde
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.filterInput} />
              </label>
              <label style={styles.filterLabel}>
                Hasta
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.filterInput} />
              </label>
            </div>
          </div>

          <div style={styles.metrics}>
            <Metric label="Clases" value={summary.classes || 0} />
            <Metric label="Reservas" value={summary.booked || 0} />
            <Metric label="Presentes" value={summary.present || 0} accent="#15803d" />
            <Metric label="Ausentes" value={summary.absent || 0} accent="#b91c1c" />
            <Metric label="Tardanzas" value={summary.late || 0} accent="#d97706" />
            <Metric label="Asistencia" value={`${summary.attendance_rate || 0}%`} accent="#1d4ed8" />
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Clase</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Horario</th>
                  <th style={styles.th}>Reservas</th>
                  <th style={styles.th}>Presentes</th>
                  <th style={styles.th}>Ausentes</th>
                  <th style={styles.th}>Tardanzas</th>
                  <th style={styles.th}>Justificados</th>
                  <th style={styles.th}>Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {!loadingHistory && overview.classes.length === 0 && (
                  <tr><td colSpan="8" style={styles.empty}>No hay clases en el período seleccionado.</td></tr>
                )}
                {overview.classes.map((row) => (
                  <tr key={row.class_id}>
                    <td style={styles.td}><strong>{row.class_name}</strong></td>
                    <td style={styles.td}>{row.class_date ? new Date(`${row.class_date}T00:00:00`).toLocaleDateString("es-AR") : "-"}</td>
                    <td style={styles.td}>{row.start_time?.slice(0, 5)} - {row.end_time?.slice(0, 5)}</td>
                    <td style={styles.td}>{row.booked}</td>
                    <td style={{ ...styles.td, color: "#16a34a", fontWeight: "bold" }}>{row.present}</td>
                    <td style={{ ...styles.td, color: "#dc2626" }}>{row.absent}</td>
                    <td style={{ ...styles.td, color: "#d97706" }}>{row.late}</td>
                    <td style={{ ...styles.td, color: "#6366f1" }}>{row.excused}</td>
                    <td style={styles.td}>
                      {row.attendance_registered > 0
                        ? <span style={{ color: "#1d4ed8", fontWeight: "bold" }}>{row.attendance_rate}%</span>
                        : <span style={{ color: "#94a3b8" }}>Sin registrar</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loadingHistory && <p style={styles.empty}>Cargando...</p>}
          </div>
        </div>
      )}

      {/* ===== MODAL ASISTENCIA ===== */}
      {attendanceModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0 }}>Asistencia — {attendanceModal.cls.class_name}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  {formatDate(attendanceModal.cls.class_date)} · {attendanceModal.cls.start_time?.slice(0, 5)} a {attendanceModal.cls.end_time?.slice(0, 5)}
                </p>
              </div>
              <button onClick={() => setAttendanceModal(null)} style={styles.closeBtn}>✕</button>
            </div>

            {attendanceModal.students.length === 0 ? (
              <p style={{ color: "#64748b" }}>No hay alumnos inscriptos en esta clase.</p>
            ) : (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={styles.mth}>Alumno</th>
                      <th style={styles.mth}>DNI</th>
                      <th style={styles.mth}>Estado</th>
                      <th style={styles.mth}>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceModal.students.map((student) => (
                      <tr key={student.booking_id}>
                        <td style={styles.mtd}>{student.first_name} {student.last_name}</td>
                        <td style={styles.mtd}>{student.dni || "-"}</td>
                        <td style={styles.mtd}>
                          <select
                            value={attendanceData[student.booking_id]?.status || "present"}
                            onChange={(e) => setAttendanceData((prev) => ({ ...prev, [student.booking_id]: { ...prev[student.booking_id], status: e.target.value } }))}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ccc", fontWeight: "bold", color: STATUS_LABELS[attendanceData[student.booking_id]?.status || "present"]?.color }}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.mtd}>
                          <input
                            placeholder="Observaciones (opcional)"
                            value={attendanceData[student.booking_id]?.notes || ""}
                            onChange={(e) => setAttendanceData((prev) => ({ ...prev, [student.booking_id]: { ...prev[student.booking_id], notes: e.target.value } }))}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ccc", width: "160px" }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {attendanceSaved && (
              <p style={{ color: "#16a34a", fontWeight: "bold", marginTop: "1rem" }}>Asistencia guardada correctamente.</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
              <button onClick={() => setAttendanceModal(null)} style={styles.cancelBtn}>Cerrar</button>
              {attendanceModal.students.length > 0 && (
                <button onClick={handleSaveAttendance} disabled={savingAttendance} style={{ ...styles.saveBtn, opacity: savingAttendance ? 0.6 : 1 }}>
                  {savingAttendance ? "Guardando..." : "Guardar Asistencia"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => setModal({ ...modal, isOpen: false })}
        onCancel={() => setModal({ ...modal, isOpen: false })}
        confirmText="Aceptar"
      />
    </div>
  );
}

const styles = {
  container: { padding: "2rem", backgroundColor: "#f5f7fb", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: 0, marginTop: "0.3rem", color: "#64748b" },
  logoutBtn: { padding: "10px 20px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  infoCard: { backgroundColor: "white", padding: "1rem 1.5rem", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "1.5rem", color: "#334155" },
  editAvailBtn: { padding: "8px 16px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" },
  saveAvailBtn: { padding: "8px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" },
  cancelAvailBtn: { padding: "8px 16px", backgroundColor: "#94a3b8", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" },
  timeLabel: { display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.8rem", color: "#64748b", fontWeight: "bold" },
  timeInput: { padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white" },
  tabs: { display: "flex", gap: "8px", marginBottom: "1.5rem" },
  tab: { padding: "10px 20px", borderRadius: "8px", border: "2px solid #0b5ed7", backgroundColor: "white", color: "#0b5ed7", cursor: "pointer", fontWeight: "bold" },
  tabActive: { backgroundColor: "#0b5ed7", color: "white" },
  // Agenda
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" },
  classCard: { borderRadius: "12px", padding: "1.5rem", backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  cardBody: { lineHeight: "1.8", color: "#334155" },
  badgeActive: { backgroundColor: "#e2e8f0", color: "#1e293b", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
  badgeCancelled: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem", fontWeight: "bold" },
  badgePast: { backgroundColor: "#fef9c3", color: "#854d0e", padding: "3px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" },
  attendanceDone: { margin: "0 0 6px 0", color: "#16a34a", fontSize: "0.85rem", fontWeight: "bold" },
  attendanceExpired: { margin: 0, color: "#94a3b8", fontSize: "0.85rem", fontWeight: "bold", textAlign: "center", padding: "10px 0" },
  attendancePending: { margin: 0, color: "#64748b", fontSize: "0.85rem", textAlign: "center", padding: "10px 0" },
  attendanceBtn: { width: "100%", padding: "10px", backgroundColor: "#1e293b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  emptyState: { padding: "3rem", textAlign: "center", color: "#64748b", backgroundColor: "white", borderRadius: "12px", gridColumn: "1 / -1", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  // Historial
  historialHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", marginBottom: "20px", flexWrap: "wrap" },
  filters: { display: "flex", gap: "12px", flexWrap: "wrap" },
  filterLabel: { display: "grid", gap: "5px", color: "#475569", fontSize: "0.85rem", fontWeight: 700 },
  filterInput: { padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" },
  metric: { background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", minHeight: "72px", display: "grid", alignContent: "space-between" },
  metricLabel: { color: "#64748b", fontSize: "0.85rem" },
  metricValue: { fontSize: "1.6rem" },
  tableWrap: { overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "700px" },
  th: { background: "#0f172a", color: "white", textAlign: "left", padding: "12px", fontSize: "0.82rem" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "0.9rem" },
  empty: { padding: "24px", textAlign: "center", color: "#64748b" },
  // Modal asistencia
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modal: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", width: "700px", maxWidth: "95vw", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  closeBtn: { background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" },
  mth: { backgroundColor: "#f1f5f9", padding: "10px", textAlign: "left", fontWeight: "bold", fontSize: "0.85rem" },
  mtd: { padding: "10px", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" },
  cancelBtn: { padding: "10px 20px", border: "none", borderRadius: "8px", backgroundColor: "#94a3b8", color: "white", cursor: "pointer" },
  saveBtn: { padding: "10px 24px", border: "none", borderRadius: "8px", backgroundColor: "#16a34a", color: "white", cursor: "pointer", fontWeight: "bold" },
};
