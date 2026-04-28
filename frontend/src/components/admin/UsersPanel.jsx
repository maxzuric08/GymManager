import { useState, useEffect } from "react";
import {getUsersRequest,createUserRequest,updateUserRequest,deleteUserRequest,} from "../../services/api";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    dni: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    branch_id: "",
    plan_id: "",
    user_status: "active",
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const payload = {
    ...formData,
    birth_date: formData.birth_date ? formData.birth_date : null,
    branch_id: formData.branch_id ? Number(formData.branch_id) : null,
    plan_id: formData.plan_id ? Number(formData.plan_id) : null,
  };

  try {
    if (editingUser) {
      await updateUserRequest(editingUser, payload);
    } else {
      await createUserRequest(payload);
    }

    setShowForm(false);
    setEditingUser(null);
    fetchUsers();

    setFormData({
      username: "",
      password: "",
      dni: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      birth_date: "",
      branch_id: "",
      plan_id: "",
      user_status: "active",
    });
  } catch (err) {
    alert(err.message);
  }
};

    const handleEdit = (user) => {
      setEditingUser(user.user_id);
      setShowForm(true);

      setFormData({
        username: user.username || "",
        password: user.password || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        dni: user.dni || "",
        email: user.email || "",
        phone: user.phone || "",
        birth_date: user.birth_date ? user.birth_date.slice(0, 10) : "",
        branch_id: user.branch_id ?? null,
        plan_id: user.plan_id ?? null,
        user_status: user.user_status || "active",
      });
    };

    const handleDelete = async (id) => {
      const confirmDelete = window.confirm("¿Seguro que quieres eliminar este usuario?");
      if (!confirmDelete) return;

      try {
        await deleteUserRequest(id);
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
    };

    const handleNewUser = () => {
      setEditingUser(null);
      setShowForm(true);

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
        user_status: "active",
      });
    };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Gestión de Usuarios</h2>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingUser(null);
            } else {
              handleNewUser();
            }
          }}
          style={styles.primaryBtn}
        >
          {showForm ? "Cancelar" : "+ Nuevo Usuario"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

        {showForm && (
         <form onSubmit={handleSubmit} style={styles.form}>
           <h3>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</h3>

           <div style={styles.grid}>

             <input
               name="username"
               placeholder="Usuario"
               value={formData.username}
               onChange={handleInputChange}
               style={styles.input}
               required
             />

             <input
               name="password"
               type="password"
               placeholder="Contraseña"
               value={formData.password}
               onChange={handleInputChange}
               style={styles.input}
               required
             />

             <input
               name="first_name"
               placeholder="Nombre"
               value={formData.first_name}
               onChange={(e) => {
                const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
                setFormData({ ...formData, first_name: soloLetras });
               }}
               style={styles.input}
             />

             <input
               name="last_name"
               placeholder="Apellido"
               value={formData.last_name}
               onChange={(e) => {
                 const soloLetras = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "");
                 setFormData({ ...formData, last_name: soloLetras });
               }}
               style={styles.input}
             />

             <input
               name="dni"
               type="text"
               placeholder="DNI (solo números)"
               value={formData.dni}
               onChange={(e) => {
                const soloNumeros = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, dni: soloNumeros });
               }}
               style={styles.input}
               required
               maxLength="10"
             />

             <input
               name="email"
               type="email"
               placeholder="Email (ej: usuario@gmail.com)"
               value={formData.email}
               onChange={handleInputChange}
               style={styles.input}
               required
               pattern=".*@.*\.com$"
               title="El email debe contener un @ y terminar obligatoriamente en .com"
             />

             <input
               name="phone"
               placeholder="Teléfono"
               value={formData.phone}
               onChange={(e) => {
                 const phoneValido = e.target.value.replace(/[^\d\s\-]/g, "");
                 setFormData({ ...formData, phone: phoneValido });
               }}
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

             <input
               name="branch_id"
               type="number"
               placeholder="ID Sucursal"
               value={formData.branch_id || ""}
               onChange={handleInputChange}
               style={styles.input}
             />

             <input
               name="plan_id"
               type="number"
               placeholder="ID Plan"
               value={formData.plan_id || ""}
               onChange={handleInputChange}
               style={styles.input}
             />

             <select
               name="user_status"
               value={formData.user_status || "active"}
               onChange={handleInputChange}
               style={styles.input}
             >
               <option value="active">Activo</option>
               <option value="inactive">Inactivo</option>
             </select>

           </div>

           <button type="submit" style={styles.primaryBtn}>
             {editingUser ? "Actualizar Usuario" : "Guardar Usuario"}
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
            <th style={styles.th}>Acciones </th>
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
               <td style={styles.td}>
                 <button onClick={() => handleEdit(user)} style={styles.editBtn}>
                   Editar
                 </button>
                 <button onClick={() => handleDelete(user.user_id)} style={styles.deleteBtn}>
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
editBtn: {
  background:"#2563eb",
  color:"white",
  border:"none",
  padding:"6px 10px",
  borderRadius:"8px",
  marginRight:"8px"
},

deleteBtn:{
  background:"#ef4444",
  color:"white",
  border:"none",
  padding:"6px 10px",
  borderRadius:"8px"
},
};