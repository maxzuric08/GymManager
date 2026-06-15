import { useState, useEffect } from "react";
import Modal from "../Modal";
import { getPlansRequest, createPlanRequest, updatePlanRequest, deactivatePlanRequest, reactivatePlanRequest } from "../../services/api";

export default function PlansPanel() {
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null });


  const [formData, setFormData] = useState({
    plan_type: "",
    cost: "",
    duration: "",
    duration_value: "",
    duration_unit: "months",
    benefits: "",
    class_limit: "",
    status: "active",
  });

  const fetchPlans = async () => {
    try {
      const data = await getPlansRequest();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

    const handleSubmit = async (e) => {
      e.preventDefault();

      try {
        if (editingPlan) {
          await updatePlanRequest(editingPlan, formData);
        } else {
          await createPlanRequest(formData);
        }

        setShowForm(false);
        setEditingPlan(null);
        fetchPlans();

        setFormData({
          plan_type: "",
          cost: "",
          duration: "",
          duration_value: "",
          duration_unit: "months",
          benefits: "",
          class_limit: "",
          status: "active",
        });
      } catch (err) {
        setModal({
          isOpen: true,
          title: "Error",
          message: err.message,
          type: "error",
          onConfirm: () => setModal({ ...modal, isOpen: false })
        });
      }
    };


    const handleEdit = (plan) => {
        setEditingPlan(plan.plan_id);
        setShowForm(true);
        setFormData({
            plan_type: plan.plan_type || "",
            cost: plan.cost || "",
            duration: plan.duration || "",
            duration_value: plan.duration_value || "",
            duration_unit: plan.duration_unit || "months",
            benefits: plan.benefits || "",
            class_limit: plan.class_limit || "",
            status: plan.status || "active",
            });
        };


    const handleDeactivatePlan = async (planId) => {
          try {
            const result = await deactivatePlanRequest(planId);
            setModal({
              isOpen: true,
              title: "Plan desactivado",
              message: `${result.activeUsersCount} usuarios aún usan este plan y pueden seguir hasta que venza.`,
              type: "success",
              onConfirm: () => {
                setModal({ ...modal, isOpen: false });
                fetchPlans();
              }
            });
          } catch (err) {
            setModal({
              isOpen: true,
              title: "Error",
              message: err.message,
              type: "error",
              onConfirm: () => setModal({ ...modal, isOpen: false })
            });
          }
        };

    const handleReactivatePlan = async (planId) => {
          try {
            await reactivatePlanRequest(planId);
            setModal({
              isOpen: true,
              title: "Plan reactivado",
              message: "El plan ahora está activo nuevamente.",
              type: "success",
              onConfirm: () => {
                setModal({ ...modal, isOpen: false });
                fetchPlans();
              }
            });
          } catch (err) {
            setModal({
              isOpen: true,
              title: "Error",
              message: err.message,
              type: "error",
              onConfirm: () => setModal({ ...modal, isOpen: false })
            });
          }
        };
    const handleNewPlan = () => {
          setEditingPlan(null);
          setShowForm(true);

          setFormData({
            plan_type: "",
            cost: "",
            duration: "",
            duration_value: "",
            duration_unit: "months",
            benefits: "",
            class_limit: "",
            status: "active",
          });
        };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Gestión de Planes</h2>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingPlan(null);
            } else {
              handleNewPlan();
            }
          }}
          style={styles.primaryBtn}
        >
          {showForm ? "Cancelar" : "+ Nuevo Plan"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formCard}>
          <h3>Crear Nuevo Plan</h3>
          <div style={styles.grid}>
            <input
              name="plan_type"
              placeholder="Tipo de plan"
              value={formData.plan_type}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="cost"
              type="number"
              placeholder="Costo"
              value={formData.cost}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
            <input
              name="duration_value"
              type="number"
              placeholder="Duración"
              value={formData.duration_value}
              onChange={handleInputChange}
              min="1"
              style={styles.input}
            />
            <select
              name="duration_unit"
              value={formData.duration_unit}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="days">Días</option>
              <option value="months">Meses</option>
              <option value="weeks">Semanas</option>
            </select>
            <input
              name="class_limit"
              type="number"
              placeholder="Límite de clases"
              value={formData.class_limit}
              onChange={handleInputChange}
              style={styles.input}
            />
            <input
              name="benefits"
              placeholder="Beneficios"
              value={formData.benefits}
              onChange={handleInputChange}
              style={styles.input}
            />
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <button type="submit" style={{ ...styles.primaryBtn, marginTop: "1rem" }}>
                {editingPlan ? "Actualizar Plan" : "Guardar Plan"}
          </button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Tipo</th>
            <th style={styles.th}>Costo</th>
            <th style={styles.th}>Duración</th>
            <th style={styles.th}>Límite</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.plan_id}>
              <td style={styles.td}>{plan.plan_id}</td>
              <td style={styles.td}>{plan.plan_type}</td>
              <td style={styles.td}>${plan.cost}</td>
              <td style={styles.td}>
                {plan.duration_value} {
                  plan.duration_unit === 'days' ? 'Día(s)' :
                  plan.duration_unit === 'weeks' ? 'Semana(s)' :
                  'Mes(es)'
                }
              </td>
              <td style={styles.td}>{plan.class_limit}</td>
              <td style={styles.td}>{plan.status}</td>
              <td style={styles.td}>
                <button onClick={() => handleEdit(plan)} style={styles.editBtn}>
                  Editar
                </button>
                {plan.status === 'active' ? (
                  <button onClick={() => handleDeactivatePlan(plan.plan_id)} style={styles.deactivateBtn}>
                    Desactivar
                  </button>
                ) : (
                  <button onClick={() => handleReactivatePlan(plan.plan_id)} style={styles.reactivateBtn}>
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    backgroundColor: "#fd7e14",
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
    backgroundColor: "#fd7e14",
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
      cursor: "pointer",
    },

    deactivateBtn: {
      background: "#f59e0b",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "8px",
      marginRight: "8px",
      cursor: "pointer",
    },

    reactivateBtn: {
      background: "#22c55e",
      color: "white",
      border: "none",
      padding: "6px 10px",
      borderRadius: "8px",
      marginRight: "8px",
      cursor: "pointer",
    },

};
