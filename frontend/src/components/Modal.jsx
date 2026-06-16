export default function Modal({
  title,
  message,
  isOpen,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "info" // "info", "warning", "error", "success"
}) {
  if (!isOpen) return null;

  const colorMap = {
    info: "#2563eb",
    warning: "#f59e0b",
    error: "#ef4444",
    success: "#22c55e",
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={{ ...styles.modalHeader, borderLeftColor: colorMap[type] }}>
          <h3 style={styles.modalTitle}>{title}</h3>
        </div>

        <p style={styles.modalText}>{message}</p>

        <div style={styles.modalActions}>
          {onCancel && (
            <button onClick={onCancel} style={styles.cancelBtn}>
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} style={{ ...styles.confirmBtn, backgroundColor: colorMap[type] }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    maxWidth: "450px",
    width: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "24px",
    borderLeft: "4px solid #2563eb",
    backgroundColor: "#f8f9fa",
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
  },
  modalText: {
    padding: "20px 24px",
    color: "#475569",
    margin: 0,
    lineHeight: "1.6",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8f9fa",
  },
  cancelBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#e2e8f0",
    color: "#475569",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  confirmBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "6px",
    color: "white",
    cursor: "pointer",
    fontWeight: "500",
    transition: "opacity 0.2s",
  },
};
