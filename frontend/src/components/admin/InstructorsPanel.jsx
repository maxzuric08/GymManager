import { useState, useEffect } from "react";
import Modal from "../Modal";
import FormField from "../FormField";
import { mapErrorToField } from "../../utils/fieldErrors";
import {
  getBranchesRequest,
  getInstructorsRequest,
  createInstructorRequest,
  updateInstructorRequest,
  deleteInstructorRequest,
  reactivateInstructorRequest,
} from "../../services/api";

// Cada regla asocia un fragmento del mensaje del backend con el campo afectado.
const ERROR_FIELD_RULES = [
  [/dni o usuario ya/i, "dni"],
  [/nombre de usuario/i, "username"],
  [/usuario y contrasena/i, "password"],
  [/dni/i, "dni"],
  [/nombre solo/i, "first_name"],
  [/apellido solo/i, "last_name"],
  [/telefono/i, "phone"],
  [/email/i, "email"],
  [/nacimiento/i, "birth_date"],
  [/sucursal/i, "branch_id"],
  [/disponible desde|disponible hasta|hora de fin|fuera de disponibilidad/i, "available_to"],
];

export default function InstructorsPanel() {
  const [instructors, setInstructors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [instructorToDelete, setInstructorToDelete] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null });

  const [formData, setFormData] = useState({
    username: "", password: "", specialty: "", email: "", phone: "",
    first_name: "", last_name: "", dni: "", birth_date: "", branch_id: "",
    available_from: "", available_to: ""
  });

  const fetchInstructors = async () => {
    try {
      const data = await getInstructorsRequest();
      setInstructors(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchBranches = async () => {
    try {
      setBranches(await getBranchesRequest());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchInstructors();
    fetchBranches();
  }, []);

  // Actualiza un campo y limpia el error que tenía asociado.
  const setField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const handleInputChange = (e) => setField(e.target.name, e.target.value);
  const handleLettersChange = (e) => setField(e.target.name, e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""));
  const handleDigitsChange = (e) => setField(e.target.name, e.target.value.replace(/\D/g, ""));
  const handlePhoneChange = (e) => setField(e.target.name, e.target.value.replace(/[^\d\s-]/g, ""));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (formData.available_from && formData.available_to) {
      if (formData.available_from >= formData.available_to) {
        setFieldErrors({ available_to: "La hora 'Hasta' debe ser mayor a la hora 'Desde'." });
        return;
      }
    }

    const payload = {
      ...formData,
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
    };

    try {
      if (editingInstructor) {
        await updateInstructorRequest(editingInstructor, payload);
      } else {
        await createInstructorRequest(payload);
      }

      setShowForm(false);
      setEditingInstructor(null);
      fetchInstructors();

      setFormData({
        username: "", password: "", specialty: "", email: "", phone: "",
        first_name: "", last_name: "", dni: "", birth_date: "", branch_id: "",
        available_from: "", available_to: ""
      });
    } catch (err) {
      const field = mapErrorToField(err.message, ERROR_FIELD_RULES);
      if (field) {
        setFieldErrors({ [field]: err.message });
        return;
      }
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false })
      });
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor.instructor_id);
    setShowForm(true);
    setFormData({
      username: instructor.username || "", password: "", specialty: instructor.specialty || "",
      email: instructor.email || "", phone: instructor.phone || "", first_name: instructor.first_name || "",
      last_name: instructor.last_name || "", dni: instructor.dni || "",
      birth_date: instructor.birth_date ? instructor.birth_date.slice(0, 10) : "",
      branch_id: instructor.branch_id || "", available_from: instructor.available_from || "", available_to: instructor.available_to || "",
    });
  };

  // Función del Modal
  const confirmDeleteInstructor = async () => {
    if (!instructorToDelete) return;
    try {
      await deleteInstructorRequest(instructorToDelete.instructor_id);
      setInstructorToDelete(null);
      fetchInstructors();
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false })
      });
    }
  };

  const handleNewInstructor = () => {
    setEditingInstructor(null);
    setShowForm(true);
    setFormData({
      username: "", password: "", specialty: "", email: "", phone: "",
      first_name: "", last_name: "", dni: "", birth_date: "", branch_id: "", available_from: "", available_to: ""
    });
  };

  const handleReactivateInstructor = async (instructorId) => {
    try {
      await reactivateInstructorRequest(instructorId);
      fetchInstructors();
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal((current) => ({ ...current, isOpen: false })),
      });
    }
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Gestión de Instructores</h2>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingInstructor(null);
            } else {
              handleNewInstructor();
            }
          }}
          style={styles.primaryBtn}
        >
          {showForm ? "Cancelar" : "+ Nuevo Instructor"}
        </button>
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

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>{editingInstructor ? "Editar Instructor" : "Crear Nuevo Instructor"}</h3>
          
          <p style={styles.legend}>Los campos con <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span> son obligatorios.</p>

          <div style={styles.grid}>
            <FormField id="instructor-username" label="Usuario" required help="Nombre con el que inicia sesión. No puede repetirse." error={fieldErrors.username}>
              <input name="username" value={formData.username} onChange={handleInputChange} required style={styles.input} autoComplete="off" />
            </FormField>
            <FormField
              id="instructor-password"
              label="Contraseña"
              required={!editingInstructor}
              help={editingInstructor ? "Dejala vacía para conservar la contraseña actual." : "Obligatoria al crear el instructor."}
              error={fieldErrors.password}
            >
              <input name="password" type="password" value={formData.password} onChange={handleInputChange} required={!editingInstructor} style={styles.input} autoComplete="new-password" />
            </FormField>
            <FormField id="instructor-first-name" label="Nombre" help="Solo letras y espacios." error={fieldErrors.first_name}>
              <input name="first_name" value={formData.first_name} onChange={handleLettersChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-last-name" label="Apellido" help="Solo letras y espacios." error={fieldErrors.last_name}>
              <input name="last_name" value={formData.last_name} onChange={handleLettersChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-dni" label="DNI" required help="Solo números, hasta 10 dígitos. No puede repetirse." error={fieldErrors.dni}>
              <input name="dni" type="text" inputMode="numeric" value={formData.dni} onChange={handleDigitsChange} style={styles.input} required maxLength="10" />
            </FormField>
            <FormField id="instructor-specialty" label="Especialidad" help="Opcional. Por ejemplo: Musculación, Spinning." error={fieldErrors.specialty}>
              <input name="specialty" value={formData.specialty} onChange={handleInputChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-email" label="Email" required help="Debe ser un email válido." error={fieldErrors.email}>
              <input name="email" type="email" value={formData.email} onChange={handleInputChange} style={styles.input} required title="El email debe contener un @ y terminar en .com" />
            </FormField>
            <FormField id="instructor-phone" label="Teléfono" help="Opcional. Solo números, espacios y guiones." error={fieldErrors.phone}>
              <input name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-birth-date" label="Fecha de nacimiento" help="Opcional. No puede ser una fecha futura." error={fieldErrors.birth_date}>
              <input name="birth_date" type="date" max={new Date().toISOString().split("T")[0]} value={formData.birth_date || ""} onChange={handleInputChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-branch" label="Sucursal" required help="Solo podrá dictar clases en esta sucursal." error={fieldErrors.branch_id}>
              <select name="branch_id" value={formData.branch_id ?? ""} onChange={handleInputChange} required style={styles.input}>
                <option value="">Seleccionar sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>{branch.location}</option>
                ))}
              </select>
            </FormField>
            <FormField id="instructor-available-from" label="Disponible desde" required help="Hora de inicio de su turno." error={fieldErrors.available_from}>
              <input name="available_from" type="time" required value={formData.available_from || ""} onChange={handleInputChange} style={styles.input} />
            </FormField>
            <FormField id="instructor-available-to" label="Disponible hasta" required help="Hora de fin del turno. Debe ser posterior a la de inicio." error={fieldErrors.available_to}>
              <input name="available_to" type="time" required value={formData.available_to || ""} onChange={handleInputChange} style={styles.input} />
            </FormField>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button type="submit" style={{ ...styles.primaryBtn, width: "100%", padding: "12px", fontSize: "13" }}>
              {editingInstructor ? "Actualizar Instructor" : "Guardar Instructor"}
            </button>
          </div>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th><th style={styles.th}>Nombre</th><th style={styles.th}>DNI</th><th style={styles.th}>Especialidad</th><th style={styles.th}>Horario</th><th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {instructors.map((instructor) => (
            <tr key={instructor.instructor_id}>
              <td style={styles.td}>{instructor.instructor_id}</td>
              <td style={styles.td}>{instructor.first_name || instructor.username} {instructor.last_name}</td>
              <td style={styles.td}>{instructor.dni || "-"}</td>
              <td style={styles.td}>{instructor.specialty}</td>
              <td style={styles.td}>{instructor.available_from && instructor.available_to ? `${instructor.available_from.slice(0,5)} a ${instructor.available_to.slice(0,5)}` : "No definido"}</td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(instructor)} style={styles.editBtn}>Editar</button>
                {instructor.status === 'inactive' ? (
                  <button onClick={() => handleReactivateInstructor(instructor.instructor_id)} style={styles.reactivateBtn}>Reactivar</button>
                ) : (
                  <button onClick={() => setInstructorToDelete(instructor)} style={styles.deleteBtn}>Desactivar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- MODAL DE DESACTIVAR --- */}
      {instructorToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Desactivar instructor</h3>
            <p style={styles.modalText}>
              ¿Seguro que quieres desactivar al instructor <strong>{instructorToDelete.username}</strong>?
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setInstructorToDelete(null)} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={confirmDeleteInstructor} style={styles.confirmDeleteBtn}>Desactivar</button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => {
          modal.onConfirm?.();
        }}
        onCancel={() => setModal({ ...modal, isOpen: false })}
        confirmText={modal.type === "warning" ? "Confirmar" : "Aceptar"}
      />
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "1rem", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  th: { backgroundColor: "#6f42c1", color: "white", padding: "12px", textAlign: "left" },
  td: { padding: "12px", borderBottom: "1px solid #ddd" },
  primaryBtn: { padding: "10px 16px", backgroundColor: "#6f42c1", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  formCard: { backgroundColor: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" },
  legend: { margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" },
  editBtn: { background: "#2563eb", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  reactivateBtn: { background: "#22c55e", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  deleteBtn: { background: "#ef4444", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modal: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", width: "420px", maxWidth: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { marginTop: 0, marginBottom: "1rem", fontSize: "1.4rem" },
  modalText: { marginBottom: "1.5rem", color: "#444" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#94a3b8", color: "white", cursor: "pointer" },
  confirmDeleteBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#ef4444", color: "white", cursor: "pointer" }
};
