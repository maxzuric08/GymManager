import { useState, useEffect } from "react";
import { getUsersRequest, createUserRequest } from "../../services/api";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    dni: "",
    email: "",
    phone: "",
    birth_date: "",
    branch_id: null,
    plan_id: null,
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

  const handleInputChange = (e) => {
    const value =
      e.target.value === "" ? null : e.target.value;

    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createUserRequest(formData);
      setShowForm(false);
      fetchUsers();

      setFormData({
        username: "",
        password: "",
        first_name: "",
        last_name: "",
        dni: "",
        email: "",
        phone: "",
        birth_date: "",
        branch_id: null,
        plan_id: null,
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Gestión de Usuarios</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.primaryBtn}>
          {showForm ? "Cancelar" : "+ Nuevo Usuario"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>Crear Nuevo Usuario</h3>

          <div style={styles.grid}>
            <input
              name="username"
              placeholder="Usuario"
              value={formData.username || ""}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={formData.password || ""}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="first_name"
              placeholder="Nombre"
              value={formData.first_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="last_name"
              placeholder="Apellido"
              value={formData.last_name || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="dni"
              placeholder="DNI"
              value={formData.dni || ""}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={formData.email || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="phone"
              placeholder="Teléfono"
              value={formData.phone || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="birth_date"
              type="date"
              value={formData.birth_date || ""}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: "1rem" }}>
            Guardar Usuario
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Usuario</th>
            <th style={styles.th}>Nombre</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>DNI</th>
            <th style={styles.th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id}>
              <td style={styles.td}>{user.user_id}</td>
              <td style={styles.td}>{user.username}</td>
              <td style={styles.td}>
                {user.first_name} {user.last_name}
              </td>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>{user.dni}</td>
              <td style={styles.td}>{user.user_status}</td>
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
    backgroundColor: "#0b5ed7",
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
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
};