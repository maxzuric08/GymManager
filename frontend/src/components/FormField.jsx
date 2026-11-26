import { cloneElement } from "react";

// Campo de formulario accesible: label visible asociado al control, texto de
// ayuda opcional y error junto al campo. Recibe un único control como hijo y le
// inyecta id y aria-* para que lectores de pantalla lean la ayuda y el error.
export default function FormField({ id, label, help, required = false, error, children }) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div style={styles.field}>
      <label htmlFor={id} style={styles.label}>
        {label}
        {required && <span aria-hidden="true" style={styles.required}> *</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        style: { ...children.props.style, ...(error ? styles.invalid : null) },
      })}
      {help && <small id={helpId} style={styles.help}>{help}</small>}
      {error && <small id={errorId} role="alert" style={styles.error}>{error}</small>}
    </div>
  );
}

const styles = {
  field: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" },
  required: { color: "#b91c1c" },
  help: { fontSize: "0.78rem", color: "#64748b", lineHeight: 1.3 },
  error: { fontSize: "0.8rem", color: "#b91c1c", fontWeight: 600 },
  invalid: { borderColor: "#b91c1c", outlineColor: "#b91c1c" },
};
