import { useCallback, useEffect, useState } from "react";
import Modal from "../Modal";
import {
  getAttendanceOverviewRequest,
  getClassAttendanceRequest,
  saveClassAttendanceRequest,
} from "../../services/api";

const STATUS_OPTIONS = [
  { value: "present", label: "Presente" },
  { value: "absent", label: "Ausente" },
  { value: "late", label: "Tarde" },
  { value: "excused", label: "Justificado" },
];

const formatInputDate = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getClassDate = (value) => value?.slice(0, 10) || "";

const formatClassDate = (value) => {
  const date = getClassDate(value);
  return date ? new Date(`${date}T00:00:00`).toLocaleDateString("es-AR") : "-";
};

export default function AttendancePanel() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return formatInputDate(date);
  });
  const [dateTo, setDateTo] = useState(() => formatInputDate(new Date()));
  const [overview, setOverview] = useState({ summary: {}, classes: [] });
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAttendanceOverviewRequest(dateFrom, dateTo);
      setOverview(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const openClass = async (classId) => {
    try {
      const data = await getClassAttendanceRequest(classId);
      setSelectedClass(data.class);
      setStudents(
        data.students.map((student) => ({
          ...student,
          attendance_status: student.attendance_status || "",
          notes: student.notes || "",
        }))
      );
      setError("");
      setMessage("");
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStudent = (bookingId, field, value) => {
    setStudents((current) =>
      current.map((student) =>
        student.booking_id === bookingId ? { ...student, [field]: value } : student
      )
    );
  };

  const saveAttendance = async () => {
    if (!selectedClass || students.length === 0) return;
    if (students.some((student) => !student.attendance_status)) {
      setError("Seleccioná el estado de asistencia de todos los alumnos.");
      setMessage("");
      return;
    }

    setSaving(true);
    try {
      const result = await saveClassAttendanceRequest(
        selectedClass.class_id,
        students.map((student) => ({
          booking_id: student.booking_id,
          status: student.attendance_status,
          notes: student.notes,
        }))
      );
      setMessage(result.message);
      setError("");
      await loadOverview();
      await openClass(selectedClass.class_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = overview.summary || {};

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Asistencias por clase</h2>
          <p style={styles.subtitle}>Control y estadisticas del periodo seleccionado.</p>
        </div>
        <div style={styles.filters}>
          <label style={styles.filterLabel}>
            Desde
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.filterLabel}>
            Hasta
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.input} />
          </label>
        </div>
      </div>

      {error && (
        <Modal
          isOpen={Boolean(error)}
          title="Error"
          message={error}
          type="error"
          confirmText="Aceptar"
          onConfirm={() => setError("")}
        />
      )}
      {message && <p style={styles.success}>{message}</p>}

      <div style={styles.metrics}>
        <Metric label="Clases" value={summary.classes || 0} />
        <Metric label="Reservas" value={summary.booked || 0} />
        <Metric label="Presentes" value={summary.present || 0} accent="#15803d" />
        <Metric label="Ausentes" value={summary.absent || 0} accent="#b91c1c" />
        <Metric label="Asistencia" value={`${summary.attendance_rate || 0}%`} accent="#1d4ed8" />
        <Metric label="Ocupacion" value={`${summary.occupancy_rate || 0}%`} accent="#7c3aed" />
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Clase</th>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Instructor</th>
              <th style={styles.th}>Reservas</th>
              <th style={styles.th}>Presentes</th>
              <th style={styles.th}>Ausentes</th>
              <th style={styles.th}>Tarde</th>
              <th style={styles.th}>Justificados</th>
              <th style={styles.th}>Asistencia</th>
              <th style={styles.th}>Accion</th>
            </tr>
          </thead>
          <tbody>
            {!loading && overview.classes.length === 0 && (
              <tr><td colSpan="10" style={styles.empty}>No hay clases en el periodo.</td></tr>
            )}
            {overview.classes.map((gymClass) => (
              <tr key={gymClass.class_id}>
                <td style={styles.td}><strong>{gymClass.class_name}</strong></td>
                <td style={styles.td}>{formatClassDate(gymClass.class_date)}</td>
                <td style={styles.td}>{gymClass.instructor_name}</td>
                <td style={styles.td}>{gymClass.booked}</td>
                <td style={styles.td}>{gymClass.present}</td>
                <td style={styles.td}>{gymClass.absent}</td>
                <td style={styles.td}>{gymClass.late}</td>
                <td style={styles.td}>{gymClass.excused}</td>
                <td style={styles.td}>
                  {gymClass.attendance_registered > 0
                    ? `${gymClass.attendance_rate}%`
                    : <span style={styles.notRegistered}>Sin registrar</span>}
                </td>
                <td style={styles.td}>
                  <button onClick={() => openClass(gymClass.class_id)} style={styles.actionBtn}>
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p style={styles.empty}>Cargando asistencias...</p>}
      </div>

      {selectedClass && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{selectedClass.class_name}</h3>
                <p style={styles.subtitle}>
                  {formatClassDate(selectedClass.class_date)} · {selectedClass.start_time?.slice(0, 5)}
                </p>
              </div>
              <button onClick={() => setSelectedClass(null)} style={styles.closeBtn} aria-label="Cerrar">×</button>
            </div>

            {students.length === 0 ? (
              <p style={styles.empty}>La clase no tiene reservas confirmadas.</p>
            ) : (
              <div style={styles.studentList}>
                {students.map((student) => (
                  <div key={student.booking_id} style={styles.studentRow}>
                    <div style={styles.studentName}>
                      <strong>{student.first_name} {student.last_name}</strong>
                      <span style={styles.studentMeta}>DNI {student.dni} · {student.username}</span>
                    </div>
                    <select
                      value={student.attendance_status}
                      onChange={(e) => updateStudent(student.booking_id, "attendance_status", e.target.value)}
                      style={styles.statusSelect}
                    >
                      <option value="">Seleccionar</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      value={student.notes}
                      onChange={(e) => updateStudent(student.booking_id, "notes", e.target.value)}
                      placeholder="Nota opcional"
                      style={styles.notesInput}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={styles.modalActions}>
              <button onClick={() => setSelectedClass(null)} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={saveAttendance} disabled={saving || students.length === 0} style={styles.saveBtn}>
                {saving ? "Guardando..." : "Guardar asistencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent = "#0f172a" }) {
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={{ ...styles.metricValue, color: accent }}>{value}</strong>
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "20px", marginBottom: "20px", flexWrap: "wrap" },
  title: { margin: 0, color: "#0f172a" },
  subtitle: { margin: "6px 0 0", color: "#64748b" },
  filters: { display: "flex", gap: "12px", flexWrap: "wrap" },
  filterLabel: { display: "grid", gap: "5px", color: "#475569", fontSize: "0.85rem", fontWeight: 700 },
  input: { padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" },
  metric: { background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", minHeight: "72px", display: "grid", alignContent: "space-between" },
  metricLabel: { color: "#64748b", fontSize: "0.85rem" },
  metricValue: { fontSize: "1.6rem" },
  tableWrap: { overflowX: "auto", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "920px" },
  th: { background: "#0f172a", color: "white", textAlign: "left", padding: "12px", fontSize: "0.82rem" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0", color: "#334155", fontSize: "0.9rem" },
  empty: { padding: "24px", textAlign: "center", color: "#64748b" },
  actionBtn: { border: 0, borderRadius: "6px", padding: "8px 11px", background: "#2563eb", color: "white", fontWeight: 700, cursor: "pointer" },
  error: { padding: "10px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px" },
  success: { padding: "10px", background: "#dcfce7", color: "#166534", borderRadius: "6px" },
  notRegistered: { color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "grid", placeItems: "center", padding: "20px", zIndex: 1000 },
  modal: { width: "min(900px, 100%)", maxHeight: "88vh", overflow: "auto", background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 24px 60px rgba(15,23,42,0.25)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" },
  modalTitle: { margin: 0, color: "#0f172a" },
  closeBtn: { width: "36px", height: "36px", border: 0, background: "#e2e8f0", borderRadius: "6px", fontSize: "1.4rem", cursor: "pointer" },
  studentList: { display: "grid", gap: "8px" },
  studentRow: { display: "grid", gridTemplateColumns: "minmax(180px, 1fr) 150px minmax(180px, 1fr)", gap: "10px", alignItems: "center", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "6px" },
  studentName: { display: "grid", gap: "4px", color: "#1e293b" },
  studentMeta: { color: "#64748b", fontSize: "0.8rem" },
  statusSelect: { padding: "9px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "white" },
  notesInput: { padding: "9px", border: "1px solid #cbd5e1", borderRadius: "6px", minWidth: 0 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" },
  cancelBtn: { border: 0, borderRadius: "6px", padding: "10px 14px", background: "#e2e8f0", color: "#334155", cursor: "pointer", fontWeight: 700 },
  saveBtn: { border: 0, borderRadius: "6px", padding: "10px 14px", background: "#16a34a", color: "white", cursor: "pointer", fontWeight: 700 },
};
