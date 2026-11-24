import { useState, useEffect } from "react";
import Modal from "../Modal";
import FormField from "../FormField";
import { mapErrorToField } from "../../utils/fieldErrors";
import {
  getUsersRequest,
  getPlansRequest,
  getBranchesRequest,
  createUserRequest,
  updateUserRequest,
  deleteUserRequest,
  reactivateUserRequest,
} from "../../services/api";

// Cada regla asocia un fragmento del mensaje del backend con el campo afectado.
const ERROR_FIELD_RULES = [
  [/usuario o dni ya/i, "dni"],
  [/nombre de usuario/i, "username"],
  [/contrasena/i, "password"],
  [/dni/i, "dni"],
  [/nombre solo/i, "first_name"],
  [/apellido solo/i, "last_name"],
  [/telefono/i, "phone"],
  [/email/i, "email"],
  [/nacimiento/i, "birth_date"],
  [/sucursal/i, "branch_id"],
  [/plan/i, "plan_id"],
];

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [branches, setBranches] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null });

  const [formData, setFormData] = useState({
    username: "", password: "", dni: "", first_name: "", last_name: "",
    email: "", phone: "", birth_date: "", branch_id: "", plan_id: "",
  });

  const fetchUsers = async () => {
    try {
      const data = await getUsersRequest();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await getPlansRequest();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchBranches = async () => {
    try {
      setBranches(await getBranchesRequest());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchBranches();
  }, []);

  // Actualiza un campo y limpia el error que tenía asociado.
  const setField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const handleInputChange = (e) => setField(e.target.name, e.target.value);
  const handleLettersChange = (e) => setField(e.target.name, e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ""));
  const handleDigitsChange = (e) => setField(e.target.name, e.target.value.replace(/\D/g, ""));
  const handlePhoneChange = (e) => setField(e.target.name, e.target.value.replace(/[^\d\s-]/g, ""));

  // Los planes inactivos no se pueden asignar, salvo el que el usuario ya tiene.
  const selectablePlans = plans.filter(
    (plan) => plan.status === "active" || Number(plan.plan_id) === Number(formData.plan_id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

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
        username: "", password: "", dni: "", first_name: "", last_name: "",
        email: "", phone: "", birth_date: "", branch_id: "", plan_id: "",
      });
    } catch (err) {
      const field = mapErrorToField(err.message, ERROR_FIELD_RULES);
      if (field) {
        setFieldErrors({ [field]: err.message });
        return;
      }
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal({ ...modal, isOpen: false })
      });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.user_id);
    setShowForm(true);

    setFormData({
      username: user.username || "", password: "",
      first_name: user.first_name || "", last_name: user.last_name || "",
      dni: user.dni || "", email: user.email || "", phone: user.phone || "",
      birth_date: user.birth_date ? user.birth_date.slice(0, 10) : "",
      branch_id: user.branch_id ?? null, plan_id: user.plan_id ?? null,
    });
  };

  // Función del Modal
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const result = await deleteUserRequest(userToDelete.user_id);
      setUserToDelete(null);
      await fetchUsers();
      setModal({
        isOpen: true,
        title: "Usuario desactivado",
        message: `${result.cancelledBookings || 0} reservas futuras fueron canceladas.`,
        type: "success",
        onConfirm: () => setModal((current) => ({ ...current, isOpen: false })),
      });
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal((current) => ({ ...current, isOpen: false })),
      });
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    setShowForm(true);
    setFormData({
      username: "", password: "", first_name: "", last_name: "", dni: "",
      email: "", phone: "", birth_date: "", branch_id: null, plan_id: null,
    });
  };

  const handleReactivateUser = async (userId) => {
    try {
      await reactivateUserRequest(userId);
      fetchUsers();
    } catch (err) {
      setModal({
        isOpen: true,
        title: "Error",
        message: err.message,
        type: "error",
        onConfirm: () => setModal((current) => ({ ...current, isOpen: false })),
      });
    }
  };

  const getPlanName = (user) => {
    if (user.plan_type) return user.plan_type;
    if (!user.plan_id) return "Sin plan";

    const plan = plans.find((item) => Number(item.plan_id) === Number(user.plan_id));
    return plan?.plan_type || "Sin plan";
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

      {error && (
        <Modal
          isOpen={Boolean(error)}
          title="Error"
          message={error}
          type="error"
          confirmText="Aceptar"
          onConfirm={() => setError("")}
        />
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</h3>

          <p style={styles.legend}>Los campos con <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span> son obligatorios.</p>

          <div style={styles.grid}>
            <FormField id="user-username" label="Usuario" required help="Nombre con el que inicia sesión. No puede repetirse." error={fieldErrors.username}>
              <input name="username" value={formData.username} onChange={handleInputChange} style={styles.input} required autoComplete="off" />
            </FormField>
            <FormField
              id="user-password"
              label="Contraseña"
              required={!editingUser}
              help={editingUser ? "Dejala vacía para conservar la contraseña actual." : "Obligatoria al crear el usuario."}
              error={fieldErrors.password}
            >
              <input name="password" type="password" value={formData.password} onChange={handleInputChange} style={styles.input} required={!editingUser} autoComplete="new-password" />
            </FormField>
            <FormField id="user-first-name" label="Nombre" help="Solo letras y espacios." error={fieldErrors.first_name}>
              <input name="first_name" value={formData.first_name} onChange={handleLettersChange} style={styles.input} />
            </FormField>
            <FormField id="user-last-name" label="Apellido" help="Solo letras y espacios." error={fieldErrors.last_name}>
              <input name="last_name" value={formData.last_name} onChange={handleLettersChange} style={styles.input} />
            </FormField>
            <FormField id="user-dni" label="DNI" required help="Solo números, hasta 10 dígitos. No puede repetirse." error={fieldErrors.dni}>
              <input name="dni" type="text" inputMode="numeric" value={formData.dni} onChange={handleDigitsChange} style={styles.input} required maxLength="10" />
            </FormField>
            <FormField id="user-email" label="Email" required help="Recibe los avisos de reservas y vencimiento de la membresía." error={fieldErrors.email}>
              <input name="email" type="email" value={formData.email} onChange={handleInputChange} style={styles.input} required title="El email debe contener un @ y terminar obligatoriamente en .com" />
            </FormField>
            <FormField id="user-phone" label="Teléfono" help="Opcional. Solo números, espacios y guiones." error={fieldErrors.phone}>
              <input name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} style={styles.input} />
            </FormField>
            <FormField id="user-birth-date" label="Fecha de nacimiento" help="Opcional. No puede ser una fecha futura." error={fieldErrors.birth_date}>
              <input name="birth_date" type="date" max={new Date().toISOString().split("T")[0]} value={formData.birth_date || ""} onChange={handleInputChange} style={styles.input} />
            </FormField>
            <FormField id="user-branch" label="Sucursal" help="Opcional. Sucursal donde entrena el socio." error={fieldErrors.branch_id}>
              <select name="branch_id" value={formData.branch_id ?? ""} onChange={handleInputChange} style={styles.input}>
                <option value="">Sin sucursal</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>{branch.location}</option>
                ))}
              </select>
            </FormField>
            <FormField id="user-plan" label="Plan" help="Opcional. Solo se pueden elegir planes activos." error={fieldErrors.plan_id}>
              <select name="plan_id" value={formData.plan_id ?? ""} onChange={handleInputChange} style={styles.input}>
                <option value="">Sin plan</option>
                {selectablePlans.map((plan) => (
                  <option key={plan.plan_id} value={plan.plan_id}>{plan.plan_type}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button type="submit" style={{ ...styles.primaryBtn, width: "100%", padding: "12px", fontSize: "13" }}>
              {editingUser ? "Actualizar Usuario" : "Guardar Usuario"}
            </button>
          </div>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th><th style={styles.th}>Usuario</th><th style={styles.th}>Nombre</th><th style={styles.th}>Email</th><th style={styles.th}>DNI</th><th style={styles.th}>Estado</th><th style={styles.th}>Acciones </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.user_id}>
              <td style={styles.td}>{user.user_id}</td><td style={styles.td}>{user.username}</td><td style={styles.td}>{user.first_name} {user.last_name}</td><td style={styles.td}>{user.email}</td><td style={styles.td}>{user.dni}</td>
              <td style={styles.td}>
                <span style={user.user_status === "active" ? styles.activeBadge : styles.inactiveBadge}>
                  {user.user_status === "active" ? "Activo" : "Inactivo"}
                </span>
                <div style={user.plan_id ? styles.planBadge : styles.noPlanBadge}>
                  {getPlanName(user)}
                </div>
              </td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(user)} style={styles.editBtn}>Editar</button>
                {user.user_status === 'inactive' ? (
                  <button onClick={() => handleReactivateUser(user.user_id)} style={styles.reactivateBtn}>Reactivar</button>
                ) : (
                  <button onClick={() => setUserToDelete(user)} style={styles.deleteBtn}>Desactivar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* --- MODAL DE DESACTIVAR --- */}
      {userToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Desactivar usuario</h3>
            <p style={styles.modalText}>
              ¿Seguro que quieres desactivar al usuario <strong>{userToDelete.username}</strong>? Sus reservas futuras serán canceladas.
            </p>
            <div style={styles.modalActions}>
              <button onClick={() => setUserToDelete(null)} style={styles.cancelBtn}>Cancelar</button>
              <button onClick={confirmDeleteUser} style={styles.confirmDeleteBtn}>Desactivar</button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onConfirm={() => {
          modal.onConfirm?.();
        }}
        onCancel={() => setModal({ ...modal, isOpen: false })}
        confirmText={modal.type === "warning" ? "Confirmar" : "Aceptar"}
      />
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "1rem", backgroundColor: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  th: { backgroundColor: "#0b5ed7", color: "white", padding: "12px", textAlign: "left" },
  td: { padding: "12px", borderBottom: "1px solid #ddd" },
  primaryBtn: { padding: "8px 16px", backgroundColor: "#198754", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  formCard: { backgroundColor: "#f8f9fa", padding: "1.5rem", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" },
  legend: { margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b" },
  input: { padding: "10px", borderRadius: "4px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" },
  editBtn: { background: "#2563eb", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  reactivateBtn: { background: "#22c55e", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  warningBtn: { background: "#f59e0b", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", marginRight: "8px", cursor: "pointer" },
  deleteBtn: { background: "#ef4444", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" },
  activeBadge: { display: "inline-block", background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 },
  inactiveBadge: { display: "inline-block", background: "#fee2e2", color: "#991b1b", padding: "3px 9px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700 },
  planBadge: {
    display: "inline-block",
    marginTop: "6px",
    background: "#dbeafe",
    color: "#1e40af",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  noPlanBadge: {
    display: "inline-block",
    marginTop: "6px",
    background: "#f1f5f9",
    color: "#64748b",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 },
  modal: { backgroundColor: "white", padding: "2rem", borderRadius: "16px", width: "420px", maxWidth: "90%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { marginTop: 0, marginBottom: "1rem", fontSize: "1.4rem" },
  modalText: { marginBottom: "1.5rem", color: "#444" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#94a3b8", color: "white", cursor: "pointer" },
  confirmDeleteBtn: { padding: "10px 16px", border: "none", borderRadius: "8px", backgroundColor: "#ef4444", color: "white", cursor: "pointer" }
};
