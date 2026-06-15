import { useState, useEffect } from "react";

const getClassDisplayStatus = (cls) => {
  const dateStr = cls.class_date ? cls.class_date.slice(0, 10) : null;
  const isPast = dateStr ? new Date(`${dateStr}T${cls.end_time || "23:59:00"}`) < new Date() : false;
  if (cls.status === "cancelled") return { label: "Cancelada", color: "#b91c1c", bg: "#fee2e2" };
  if (cls.status === "inactive")  return { label: "Inactiva",  color: "#64748b", bg: "#f1f5f9" };
  if (isPast)                     return { label: "Dictada",   color: "#854d0e", bg: "#fef9c3" };
  return { label: "Programada", color: "#166534", bg: "#dcfce7" };
};
import {
  getClassesRequest,
  createClassRequest,
  updateClassRequest,
  deleteClassRequest,
  reactivateClassRequest,
  getInstructorsRequest,
  getClassStudentsRequest,
} from "../../services/api";

export default function ClassesPanel() {
  const [classes, setClasses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);
  const [studentsModal, setStudentsModal] = useState(null);
  const [studentsData, setStudentsData] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const openStudentsModal = async (cls) => {
    setStudentsModal(cls);
    setStudentsData([]);
    setLoadingStudents(true);
    try {
      const data = await getClassStudentsRequest(cls.class_id);
      setStudentsData(data.students || data);
    } catch (err) {
      setError(err.message);
      setStudentsModal(null);
    } finally {
      setLoadingStudents(false);
    }
  };

  const [formData, setFormData] = useState({
    instructor_id: "",
    branch_id: "",
    class_name: "",
    capacity: "",
    class_date: "",
    start_time: "",
    end_time: "",
    status: "active",
  });

  const fetchClasses = async () => {
    try {
      const data = await getClassesRequest();
      setClasses(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchInstructors = async () => {
    try {
      const data = await getInstructorsRequest();
      setInstructors(data);
    } catch (err) {
      console.log(err.message);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchInstructors();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNewClass = () => {
    setEditingClass(null);
    setShowForm(true);

    setFormData({
      instructor_id: "",
      branch_id: "",
      class_name: "",
      capacity: "",
      class_date: "",
      start_time: "",
      end_time: "",
      status: "active",
    });
  };

  const handleEdit = (cls) => {
    setEditingClass(cls.class_id);
    setShowForm(true);

    setFormData({
      instructor_id: cls.instructor_id || "",
      branch_id: cls.branch_id || "",
      class_name: cls.class_name || "",
      capacity: cls.capacity || "",
      class_date: cls.class_date ? cls.class_date.slice(0, 10) : "",
      start_time: cls.start_time || "",
      end_time: cls.end_time || "",
      status: cls.status || "active",
    });
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await deleteClassRequest(classToDelete.class_id);
      setClassToDelete(null);
      fetchClasses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateClass = async (classId) => {
    try {
      await reactivateClassRequest(classId);
      fetchClasses();
    } catch (err) {
      setError(err.message);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!formData.instructor_id) {
    alert("Debes seleccionar un instructor");
    return;
  }

  if (!formData.class_name.trim()) {
    alert("Debes ingresar un nombre para la clase");
    return;
  }

  if (Number(formData.capacity) <= 0) {
    alert("La capacidad debe ser mayor a 0");
    return;
  }

  if (!formData.class_date) {
    alert("Debes seleccionar una fecha");
    return;
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  if (formData.class_date < todayStr) {
    alert("No puedes crear una clase en una fecha pasada");
    return;
  }

  if (!formData.start_time || !formData.end_time) {
    alert("Debes completar el horario");
    return;
  }

  if (formData.end_time <= formData.start_time) {
    alert("La hora de término debe ser mayor a la hora de inicio");
    return;
  }

  if (formData.class_date === todayStr) {
    const currentTime =
      String(today.getHours()).padStart(2, "0") +
      ":" +
      String(today.getMinutes()).padStart(2, "0");

    if (formData.start_time <= currentTime) {
      alert("No puedes crear una clase hoy en una hora que ya pasó");
      return;
    }
  }

  const payload = {
    ...formData,
    instructor_id: formData.instructor_id
      ? Number(formData.instructor_id)
      : null,
    branch_id: formData.branch_id ? Number(formData.branch_id) : null,
    capacity: formData.capacity ? Number(formData.capacity) : 0,
    class_date: formData.class_date ? formData.class_date : null,
  };

  try {
    if (editingClass) {
      await updateClassRequest(editingClass, payload);
    } else {
      await createClassRequest(payload);
    }

    setShowForm(false);
    setEditingClass(null);
    fetchClasses();

    setFormData({
      instructor_id: "",
      branch_id: "",
      class_name: "",
      capacity: "",
      class_date: "",
      start_time: "",
      end_time: "",
      status: "active",
    });
  } catch (err) {
    alert(err.message);
  }
};

  const eligibleInstructors = instructors.filter((instructor) => {
    const hasAvailability = instructor.available_from && instructor.available_to;
    const sameBranch = formData.branch_id && Number(instructor.branch_id) === Number(formData.branch_id);
    return instructor.status === "active" && hasAvailability && sameBranch;
  });
  const getInstructorName = (instructorId) => {
    const instructor = instructors.find(
      (inst) => inst.instructor_id === instructorId
    );
    return instructor
      ? `${instructor.username} - ${instructor.specialty || "Sin especialidad"}`
      : `ID ${instructorId}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR");
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Gestión de Clases</h2>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingClass(null);
            } else {
              handleNewClass();
            }
          }}
          style={styles.primaryBtn}
        >
          {showForm ? "Cancelar" : "+ Nueva Clase"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>{editingClass ? "Editar Clase" : "Programar Nueva Clase"}</h3>

          <div style={styles.grid}>
            <input
              name="class_name"
              placeholder="Nombre de la clase"
              value={formData.class_name}
              onChange={handleInputChange}
              required
              style={styles.input}
            />

            <input
              name="capacity"
              type="number"
              placeholder="Capacidad"
              value={formData.capacity}
              onChange={handleInputChange}
              required
              style={styles.input}
            />

            <input
              name="class_date"
              type="date"
              value={formData.class_date}
              onChange={handleInputChange}
              required
              min={new Date().toISOString().split("T")[0]}
              style={styles.input}
            />

            <input
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={handleInputChange}
              required
              style={styles.input}
            />

            <input
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={handleInputChange}
              required
              style={styles.input}
            />

            <input
              name="branch_id"
              type="number"
              placeholder="ID Sucursal"
              value={formData.branch_id}
              onChange={(event) => {
                setFormData({ ...formData, branch_id: event.target.value, instructor_id: "" });
              }}
              style={styles.input}
              min="1"
              required
            />

            <select
              name="instructor_id"
              value={formData.instructor_id}
              onChange={handleInputChange}
              style={styles.input}
              required
              disabled={!formData.branch_id}
            >
              <option value="">
                {!formData.branch_id ? "Primero selecciona una sucursal" : "Seleccionar instructor disponible"}
              </option>
              {eligibleInstructors.map((instructor) => (
                <option key={instructor.instructor_id} value={instructor.instructor_id}>
                  {instructor.username} - {instructor.specialty || "Sin especialidad"} - {instructor.available_from.slice(0, 5)} a {instructor.available_to.slice(0, 5)}
                </option>
              ))}
            </select>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="active">Activa</option>
              <option value="cancelled">Cancelada</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>

          <button
            type="submit"
            style={{ ...styles.primaryBtn, marginTop: "1rem" }}
          >
            {editingClass ? "Actualizar Clase" : "Guardar Clase"}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Clase</th>
            <th style={styles.th}>Instructor</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Horario</th>
            <th style={styles.th}>Cupos</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {classes.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                No hay clases programadas
              </td>
            </tr>
          ) : (
            classes.map((cls) => (
              <tr key={cls.class_id}>
                <td style={styles.td}>{cls.class_id}</td>
                <td style={styles.td}>{cls.class_name}</td>
                <td style={styles.td}>{getInstructorName(cls.instructor_id)}</td>
                <td style={styles.td}>{formatDate(cls.class_date)}</td>
                <td style={styles.td}>
                  {cls.start_time} - {cls.end_time}
                </td>
                <td style={styles.td}>{cls.capacity}</td>
                <td style={styles.td}>
                  {(() => {
                    const ds = getClassDisplayStatus(cls);
                    return <span style={{ background: ds.bg, color: ds.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>{ds.label}</span>;
                  })()}
                </td>
                <td style={styles.td}>
                  <button onClick={() => openStudentsModal(cls)} style={styles.studentsBtn}>Ver alumnos</button>
                  <button onClick={() => handleEdit(cls)} style={styles.editBtn}>Editar</button>
                  {cls.status === "inactive" ? (
                    <button onClick={() => handleReactivateClass(cls.class_id)} style={styles.reactivateBtn}>
                      Reactivar
                    </button>
                  ) : (
                    <button onClick={() => setClassToDelete(cls)} style={styles.deleteBtn}>
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {classToDelete && (
                    <div style={styles.modalOverlay}>
                      <div style={styles.modal}>
                        <h3 style={styles.modalTitle}>Eliminar clase</h3>
                        <p style={styles.modalText}>
                          ¿Seguro que quieres eliminar la clase de <strong>{classToDelete.class_name}</strong> del instructor <strong>{getInstructorName(classToDelete.instructor_id)}</strong>?
                        </p>

                        <div style={styles.modalActions}>
                          <button
                            onClick={() => setClassToDelete(null)}
                            style={styles.cancelBtn}
                          >
                            Cancelar
                          </button>

                          <button
                            onClick={confirmDeleteClass}
                            style={styles.confirmDeleteBtn}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

      {studentsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h3 style={styles.modalTitle}>{studentsModal.class_name}</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                  {formatDate(studentsModal.class_date)} · {studentsModal.start_time} - {studentsModal.end_time}
                </p>
              </div>
              <button onClick={() => setStudentsModal(null)} style={{ border: 0, background: "#e2e8f0", borderRadius: "6px", width: "32px", height: "32px", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            </div>

            {loadingStudents ? (
              <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>Cargando alumnos...</p>
            ) : studentsData.length === 0 ? (
              <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>No hay alumnos anotados en esta clase.</p>
            ) : (
              <div style={{ display: "grid", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
                {studentsData.map((student) => (
                  <div key={student.booking_id || student.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <div>
                      <strong style={{ color: "#0f172a" }}>{student.first_name} {student.last_name}</strong>
                      <span style={{ color: "#64748b", fontSize: "0.82rem", marginLeft: "8px" }}>{student.username}</span>
                    </div>
                    <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>DNI {student.dni || "-"}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button onClick={() => setStudentsModal(null)} style={{ padding: "8px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600 }}>Cerrar</button>
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
    backgroundColor: "#198754",
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
    backgroundColor: "#198754",
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
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "10px",
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  studentsBtn: {
    background: "#0891b2",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    marginRight: "8px",
    cursor: "pointer",
  },
  editBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    marginRight: "8px",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  reactivateBtn: {
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "8px",
    cursor: "pointer",
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