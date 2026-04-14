import { useState, useEffect } from "react";
import { getClassesRequest, createClassRequest } from "../services/api";

export default function ClassesDashboard() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    instructor_id: 1, // Por defecto le asignamos el profe 1
    branch_id: 1,     // Sede 1
    class_name: "",
    capacity: 20,
    start_time: "",
    end_time: "",
    class_date: ""
  });

  const fetchClasses = async () => {
    try {
      const data = await getClassesRequest();
      setClasses(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClassRequest(formData);
      setShowForm(false);
      fetchClasses(); // Recargamos la tabla
      setFormData({ instructor_id: 1, branch_id: 1, class_name: "", capacity: 20, start_time: "", end_time: "", class_date: "" });
    } catch (err) {
      alert("Error al crear: Probablemente el ID del profesor no exista en la base de datos.");
    }
  };

  // Función para formatear la fecha y que no se vea fea
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Gestión de Clases</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? "Cancelar" : "+ Nueva Clase"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>Programar Nueva Clase</h3>
          <div style={styles.grid}>
            <input name="class_name" placeholder="Nombre de la clase (Ej: Crossfit)" value={formData.class_name} onChange={handleInputChange} required style={styles.input} />
            <input name="capacity" type="number" placeholder="Capacidad" value={formData.capacity} onChange={handleInputChange} required style={styles.input} />
            <input name="class_date" type="date" value={formData.class_date} onChange={handleInputChange} required style={styles.input} />
            <input name="start_time" type="time" value={formData.start_time} onChange={handleInputChange} required style={styles.input} />
            <input name="end_time" type="time" value={formData.end_time} onChange={handleInputChange} required style={styles.input} />
            <input name="instructor_id" type="number" placeholder="ID del Profesor" value={formData.instructor_id} onChange={handleInputChange} required style={styles.input} title="ID del Profesor" />
          </div>
          <button type="submit" style={{...styles.primaryBtn, marginTop: "1rem"}}>Guardar Clase</button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Clase</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Horario</th>
            <th style={styles.th}>Cupos</th>
            <th style={styles.th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {classes.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "1rem" }}>
                No hay clases programadas
              </td>
            </tr>
          ) : (
            classes.map((cls) => (
              <tr key={cls.class_id} style={styles.tr}>
                <td style={styles.td}>{cls.class_id}</td>
                <td style={styles.td}><strong>{cls.class_name}</strong> (Prof. ID: {cls.instructor_id})</td>
                <td style={styles.td}>{formatDate(cls.class_date)}</td>
                <td style={styles.td}>{cls.start_time} - {cls.end_time}</td>
                <td style={styles.td}>{cls.capacity}</td>
                <td style={styles.td}>
                  <span style={styles.active}>{cls.status}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse", marginTop: "1rem", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  th: { backgroundColor: "#198754", color: "white", padding: "12px", textAlign: "left" }, // Verde para diferenciar de usuarios
  td: { padding: "12px", borderBottom: "1px solid #ddd" },
  tr: { borderBottom: "1px solid #ddd" },
  primaryBtn: { padding: "8px 16px", backgroundColor: "#198754", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  active: { backgroundColor: "#d1e7dd", color: "#0f5132", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" },
  formCard: { backgroundColor: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" },
  input: { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }
};