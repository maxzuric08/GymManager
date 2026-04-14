import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutRequest, getUsersRequest, createUserRequest } from "../services/api";

import ClassesDashboard from "./ClassesDashboard";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  
  // Estados para el formulario
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "", password: "", first_name: "", last_name: "",
    dni: "", email: "", phone: "", birth_date: "", branch_id: 1, plan_id: 1
  });

  const fetchUsers = async () => {
    try {
      const data = await getUsersRequest();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogout = async () => {
    try { await logoutRequest(); } catch (error) { console.log(error); }
    localStorage.clear();
    navigate("/");
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUserRequest(formData); // Mandamos los datos al backend
      setShowForm(false); // Ocultamos el formulario
      fetchUsers(); // Recargamos la tabla para ver al nuevo usuario
      // Limpiamos el formulario
      setFormData({ username: "", password: "", first_name: "", last_name: "", dni: "", email: "", phone: "", birth_date: "", branch_id: 1, plan_id: 1 });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Panel de Administración</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar sesión</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2rem" }}>
        <h2>Gestión de Usuarios</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? "Cancelar" : "+ Nuevo Usuario"}
        </button>
      </div>
      
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Formulario de Alta */}
      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>Crear Nuevo Usuario</h3>
          <div style={styles.grid}>
            <input name="username" placeholder="Usuario" value={formData.username} onChange={handleInputChange} required style={styles.input} />
            <input name="password" type="password" placeholder="Contraseña" value={formData.password} onChange={handleInputChange} required style={styles.input} />
            <input name="first_name" placeholder="Nombre" value={formData.first_name} onChange={handleInputChange} style={styles.input} />
            <input name="last_name" placeholder="Apellido" value={formData.last_name} onChange={handleInputChange} style={styles.input} />
            <input name="dni" placeholder="DNI" value={formData.dni} onChange={handleInputChange} required style={styles.input} />
            <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} style={styles.input} />
            <input name="phone" placeholder="Teléfono" value={formData.phone} onChange={handleInputChange} style={styles.input} />
            <input name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} style={styles.input} />
          </div>
          <button type="submit" style={{...styles.primaryBtn, marginTop: "1rem"}}>Guardar Usuario</button>
        </form>
      )}

      {/* Tabla de Usuarios */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th><th style={styles.th}>Usuario</th><th style={styles.th}>Nombre</th>
            <th style={styles.th}>Email</th><th style={styles.th}>DNI</th><th style={styles.th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id} style={styles.tr}>
              <td style={styles.td}>{user.user_id}</td>
              <td style={styles.td}>{user.username}</td>
              <td style={styles.td}>{user.first_name} {user.last_name}</td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.dni}</td>
              <td style={styles.td}>
                <span style={user.user_status === 'active' ? styles.active : styles.inactive}>{user.user_status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr style={{ margin: "3rem 0", borderTop: "1px solid #eee" }} />
      <ClassesDashboard />
      
    </div>
  );
}

const styles = {
  table: { width: "100%", borderCollapse: "collapse", marginTop: "1rem", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  th: { backgroundColor: "#0b5ed7", color: "white", padding: "12px", textAlign: "left" },
  td: { padding: "12px", borderBottom: "1px solid #ddd" },
  tr: { borderBottom: "1px solid #ddd" },
  logoutBtn: { padding: "8px 16px", backgroundColor: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" },
  primaryBtn: { padding: "8px 16px", backgroundColor: "#198754", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  active: { backgroundColor: "#d1e7dd", color: "#0f5132", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" },
  inactive: { backgroundColor: "#f8d7da", color: "#842029", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" },
  formCard: { backgroundColor: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  input: { padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }
};