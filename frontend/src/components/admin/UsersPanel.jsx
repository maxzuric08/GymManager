import { useState, useEffect } from "react";
import {getUsersRequest,createUserRequest,updateUserRequest,deleteUserRequest,} from "../../services/api";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);


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

    const confirmDeleteUser = async () => {
      if (!userToDelete) return;

      try {
        await deleteUserRequest(userToDelete.user_id);
        setUserToDelete(null);
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
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
               onChange={handleInputChange}
               style={styles.input}
             />

             <input
               name="last_name"
               placeholder="Apellido"
               value={formData.last_name}
               onChange={handleInputChange}
               style={styles.input}
             />

             <input
               name="dni"
               placeholder="DNI"
               value={formData.dni}
               onChange={handleInputChange}
               style={styles.input}
               required
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

             <input
               name="birth_date"
               type="date"
               value={formData.birth_date || ""}
               onChange={handleInputChange}
               style={styles.input}
             />

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
                 <button onClick={() => setUserToDelete(user)} style={styles.deleteBtn}>
                   Eliminar
                 </button>
               </td>
            </tr>
          ))}
        </tbody>
      </table>
      {userToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Eliminar usuario</h3>
            <p style={styles.modalText}>
              ¿Seguro que quieres eliminar a <strong>{userToDelete.username}</strong>?
            </p>

            <div style={styles.modalActions}>
              <button
                onClick={() => setUserToDelete(null)}
                style={styles.cancelBtn}
              >
                Cancelar
              </button>

              <button
                onClick={confirmDeleteUser}
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