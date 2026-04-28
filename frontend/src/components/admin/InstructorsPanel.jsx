import { useState, useEffect } from "react";
import {
  getInstructorsRequest,
  createInstructorRequest,
  updateInstructorRequest,
  deleteInstructorRequest,
} from "../../services/api";

export default function InstructorsPanel() {
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [instructorToDelete, setInstructorToDelete] = useState(null); // Estado para el Modal

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

  useEffect(() => {
    fetchInstructors();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.available_from && formData.available_to) {
      if (formData.available_from >= formData.available_to) {
        alert("La hora 'Disponible Hasta' debe ser estrictamente mayor a 'Disponible Desde'.");
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
      alert(err.message);
    }
  };

  const handleEdit = (instructor) => {
    setEditingInstructor(instructor.instructor_id);
    setShowForm(true);
    setFormData({
      username: instructor.username || "", password: instructor.password || "", specialty: instructor.specialty || "",
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
      alert(err.message);
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

      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>{editingInstructor ? "Editar Instructor" : "Crear Nuevo Instructor"}</h3>
          
          <div style={styles.grid}>
            <input name="username" placeholder="Usuario" value={formData.username} onChange={handleInputChange} required style={styles.input} />
            <input name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} required style={styles.input} />
            <input name="first_name" placeholder="Nombre (solo letras)" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })} style={styles.input} />
            <input name="last_name" placeholder="Apellido (solo letras)" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })} style={styles.input} />
            <input name="dni" type="text" placeholder="DNI (solo números)" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, "") })} style={styles.input} required maxLength="10" />
            <input name="specialty" placeholder="Especialidad (Ej: Musculación)" value={formData.specialty} onChange={handleInputChange} style={styles.input} />
            <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} style={styles.input} required pattern=".*@.*\.com$" title="El email debe contener un @ y terminar en .com" />
            <input name="phone" placeholder="Teléfono" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s\-]/g, "") })} style={styles.input} />

           <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>Nacimiento</span>
               <input name="birth_date" type="date" max={new Date().toISOString().split("T")[0]} value={formData.birth_date || ""} onChange={handleInputChange} style={{ border: "none", outline: "none", width: "100%", padding: "8px 0", backgroundColor: "transparent", color: "#1e293b" }} />
            </div>

            <input name="branch_id" type="number" placeholder="ID Sucursal" value={formData.branch_id || ""} onChange={handleInputChange} style={styles.input} />

            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>Desde</span>
               <input name="available_from" type="time" value={formData.available_from || ""} onChange={handleInputChange} style={{ border: "none", outline: "none", width: "100%", padding: "8px 0", backgroundColor: "transparent" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#64748b", whiteSpace: "nowrap" }}>Hasta</span>
               <input name="available_to" type="time" value={formData.available_to || ""} onChange={handleInputChange} style={{ border: "none", outline: "none", width: "100%", padding: "8px 0", backgroundColor: "transparent" }} />
            </div>
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
                <button onClick={() => setInstructorToDelete(instructor)} style={styles.deleteBtn}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- MODAL DE ELIMINAR --- */}
      {instructorToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Eliminar instructor</h3>
            <p style={styles.modalText}>
              ¿Seguro que quieres eliminar al instructor <strong>{instructorToDelete.username}</strong>?
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setInstructorToDelete(null)} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={confirmDeleteInstructor} style={styles.confirmDeleteBtn}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
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
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" },
  editBtn: { background: "#2563eb", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  deleteBtn: { background: "#ef4444", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modal: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", width: "420px", maxWidth: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { marginTop: 0, marginBottom: "1rem", fontSize: "1.4rem" },
  modalText: { marginBottom: "1.5rem", color: "#444" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#94a3b8", color: "white", cursor: "pointer" },
  confirmDeleteBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#ef4444", color: "white", cursor: "pointer" }
};