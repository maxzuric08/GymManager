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

    // Validar que el Desde no sea mayor al Hasta
    if (formData.available_from && formData.available_to) {
      if (formData.available_from >= formData.available_to) {
        alert("La hora 'Disponible Hasta' debe ser estrictamente mayor a 'Disponible Desde'.");
        return; // Corta la ejecución para que no se envíe al servidor
      }
    }

    // Formatear branch_id a número o null
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
      username: instructor.username || "",
      password: instructor.password || "",
      specialty: instructor.specialty || "",
      email: instructor.email || "",
      phone: instructor.phone || "",
      first_name: instructor.first_name || "",
      last_name: instructor.last_name || "",
      dni: instructor.dni || "",
      birth_date: instructor.birth_date ? instructor.birth_date.slice(0, 10) : "",
      branch_id: instructor.branch_id || "",
      available_from: instructor.available_from || "",
      available_to: instructor.available_to || "",
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar este instructor?");
    if (!confirmDelete) return;

    try {
      await deleteInstructorRequest(id);
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
      first_name: "", last_name: "", dni: "", birth_date: "", branch_id: "",
      available_from: "", available_to: ""
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
            
            <input
               name="first_name" placeholder="Nombre (solo letras)" value={formData.first_name}
               onChange={(e) => setFormData({ ...formData, first_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })}
               style={styles.input}
             />

             <input
               name="last_name" placeholder="Apellido (solo letras)" value={formData.last_name}
               onChange={(e) => setFormData({ ...formData, last_name: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "") })}
               style={styles.input}
             />

             <input
               name="dni" type="text" placeholder="DNI (solo números)" value={formData.dni}
               onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, "") })}
               style={styles.input} required maxLength="10"
             />

            <input name="specialty" placeholder="Especialidad (Ej: Musculación)" value={formData.specialty} onChange={handleInputChange} style={styles.input} />
            
            <input
              name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange}
              style={styles.input} required pattern=".*@.*\.com$" title="El email debe contener un @ y terminar en .com"
            />
            
            <input
              name="phone" placeholder="Teléfono" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d\s\-]/g, "") })}
              style={styles.input}
            />


           <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>Nacimiento:</span>
               <input
                 name="birth_date"
                 type="date"
                 max={new Date().toISOString().split("T")[0]}
                 value={formData.birth_date || ""}
                 onChange={handleInputChange}
                 style={{ border: "none", outline: "none", width: "100%", padding: "10px 0", backgroundColor: "transparent", color: "#1e293b" }}
               />
            </div>

            <input name="branch_id" type="number" placeholder="ID Sucursal" value={formData.branch_id || ""} onChange={handleInputChange} style={styles.input} />

            {/* Horarios de Disponibilidad */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>Desde:</span>
               <input
                 name="available_from"
                 type="time"
                 value={formData.available_from || ""}
                 onChange={handleInputChange}
                 style={{ border: "none", outline: "none", width: "100%", padding: "10px 0", backgroundColor: "transparent" }}
               />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 10px", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: "#fff", boxSizing: "border-box" }}>
               <span style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>Hasta:</span>
               <input
                 name="available_to"
                 type="time"
                 value={formData.available_to || ""}
                 onChange={handleInputChange}
                 style={{ border: "none", outline: "none", width: "100%", padding: "10px 0", backgroundColor: "transparent" }}
               />
            </div>

          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: "1rem", width: "100%" }}>
            {editingInstructor ? "Actualizar Instructor" : "Guardar Instructor"}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Nombre</th>
            <th style={styles.th}>DNI</th>
            <th style={styles.th}>Especialidad</th>
            <th style={styles.th}>Horario</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {instructors.map((instructor) => (
            <tr key={instructor.instructor_id}>
              <td style={styles.td}>{instructor.instructor_id}</td>
              <td style={styles.td}>
                {instructor.first_name || instructor.username} {instructor.last_name}
              </td>
              <td style={styles.td}>{instructor.dni || "-"}</td>
              <td style={styles.td}>{instructor.specialty}</td>
              <td style={styles.td}>
                {instructor.available_from && instructor.available_to 
                  ? `${instructor.available_from.slice(0,5)} a ${instructor.available_to.slice(0,5)}` 
                  : "No definido"}
              </td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(instructor)} style={styles.editBtn}>Editar</button>
                <button onClick={() => handleDelete(instructor.instructor_id)} style={styles.deleteBtn}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
};