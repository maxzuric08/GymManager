import { useState, useEffect } from "react";
import {getInstructorsRequest,createInstructorRequest,updateInstructorRequest,deleteInstructorRequest,} from "../../services/api";

export default function InstructorsPanel() {
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [instructorToDelete, setInstructorToDelete] = useState(null);

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

   const confirmDeleteInstructor = async () => {
             if (!instructorToDelete) return;

             try {
               await deletePlanRequest(instructorToDelete.instructor_id);
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
                <button onClick={() => setInstructorToDelete(instructor)} style={styles.deleteBtn}>
                    Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {instructorToDelete && (
              <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                  <h3 style={styles.modalTitle}>Eliminar instructor</h3>
                  <p style={styles.modalText}>
                    ¿Seguro que quieres eliminar a <strong>{instructorToDelete.username}</strong>?
                  </p>

                  <div style={styles.modalActions}>
                    <button
                      onClick={() => setInstructorToDelete(null)}
                      style={styles.cancelBtn}
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={confirmDeleteInstructor}
                      style={styles.confirmDeleteBtn}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )}
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
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999,
    },

    modal: {
      backgroundColor: "white",
      padding: "2rem",
      borderRadius: "16px",
      width: "420px",
      maxWidth: "90%",
      boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
    },

    modalTitle: {
      marginTop: 0,
      marginBottom: "1rem",
      fontSize: "1.4rem",
    },

    modalText: {
      marginBottom: "1.5rem",
      color: "#444",
    },

    modalActions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
    },

    cancelBtn: {
      padding: "10px 16px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: "#94a3b8",
      color: "white",
      cursor: "pointer",
    },

    confirmDeleteBtn: {
      padding: "10px 16px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: "#ef4444",
      color: "white",
      cursor: "pointer",
    },

};