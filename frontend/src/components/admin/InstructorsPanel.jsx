import { useState, useEffect } from "react";
import {getInstructorsRequest,createInstructorRequest,updateInstructorRequest,deleteInstructorRequest,} from "../../services/api";

export default function InstructorsPanel() {
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    specialty: "",
    email: "",
    phone: "",
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

    try {
      if (editingInstructor) {
        await updateInstructorRequest(editingInstructor, formData);
      } else {
        await createInstructorRequest(formData);
      }

      setShowForm(false);
      setEditingInstructor(null);
      fetchInstructors();

      setFormData({
        username: "",
        password: "",
        specialty: "",
        email: "",
        phone: "",
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
           });
};

   const handleDelete = async (id) =>{
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
       username: "",
       password: "",
       specialty: "",
       email: "",
       phone: "",
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
            <input
              name="username"
              placeholder="Usuario"
              value={formData.username}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="specialty"
              placeholder="Especialidad"
              value={formData.specialty}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="phone"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: "1rem" }}>
            {editingInstructor ? "Actualizar Instructor" : "Guardar Instructor"}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Usuario</th>
            <th style={styles.th}>Especialidad</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Teléfono</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {instructors.map((instructor) => (
            <tr key={instructor.instructor_id}>
              <td style={styles.td}>{instructor.instructor_id}</td>
              <td style={styles.td}>{instructor.username}</td>
              <td style={styles.td}>{instructor.specialty}</td>
              <td style={styles.td}>{instructor.email}</td>
              <td style={styles.td}>{instructor.phone}</td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(instructor)} style={styles.editBtn}>
                  Editar
                </button>
                <button onClick={() => handleDelete(instructor.instructor_id)} style={styles.deleteBtn}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
    backgroundColor: "white",
  },
  th: {
    backgroundColor: "#6f42c1",
    color: "white",
    padding: "12px",
    textAlign: "left",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #ddd",
  },
  primaryBtn: {
    padding: "8px 16px",
    backgroundColor: "#6f42c1",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  formCard: {
    backgroundColor: "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    marginBottom: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },

    editBtn: {
      background: "#2563eb",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "8px",
      marginRight: "8px",
    },

    deleteBtn: {
      background: "#ef4444",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "8px",
    },
};