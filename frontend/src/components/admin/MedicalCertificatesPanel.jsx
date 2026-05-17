import { useEffect, useState } from "react";
import {
    getMedicalCertificatesRequest,
    reviewMedicalCertificateRequest,
    openMedicalCertificateFile,
} from "../../services/api";

export default function MedicalCertificatesPanel() {
    const [certificates, setCertificates] = useState([]);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const fetchCertificates = async () => {
        try {
            const data = await getMedicalCertificatesRequest(statusFilter);
            setCertificates(data);
            setError("");
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, [statusFilter]);

    const handleApprove = async (id) => {
        try {
            await reviewMedicalCertificateRequest(id, "approved");
            setMessage("Apto medico aprobado");
            setError("");
            fetchCertificates();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReject = async (id) => {
        if (!rejectionReason.trim()) {
            setError("Indica el motivo del rechazo");
            return;
        }

        try {
            await reviewMedicalCertificateRequest(id, "rejected", rejectionReason);
            setMessage("Apto medico rechazado");
            setError("");
            setRejectingId(null);
            setRejectionReason("");
            fetchCertificates();
        } catch (err) {
            setError(err.message);
        }
    };

    const statusLabel = {
        pending: "Pendiente",
        approved: "Aprobado",
        rejected: "Rechazado",
    };

    return (
        <div>
            <div style={styles.headerRow}>
                <h2>Solicitudes de Aptos Medicos</h2>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Todos</option>
                    <option value="pending">Pendientes</option>
                    <option value="approved">Aprobados</option>
                    <option value="rejected">Rechazados</option>
                </select>
            </div>

            {message && <p style={styles.success}>{message}</p>}
            {error && <p style={styles.error}>{error}</p>}

            <table style={styles.table}>
                <thead>
                <tr>
                    <th style={styles.th}>Usuario</th>
                    <th style={styles.th}>DNI</th>
                    <th style={styles.th}>Archivo</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Subido</th>
                    <th style={styles.th}>Acciones</th>
                </tr>
                </thead>

                <tbody>
                {certificates.map((certificate) => (
                    <tr key={certificate.medical_certificate_id}>
                        <td style={styles.td}>
                            {certificate.first_name} {certificate.last_name}
                            <br />
                            <span style={styles.muted}>{certificate.username}</span>
                        </td>
                        <td style={styles.td}>{certificate.dni}</td>
                        <td style={styles.td}>{certificate.file_name}</td>
                        <td style={styles.td}>{statusLabel[certificate.status]}</td>
                        <td style={styles.td}>
                            {new Date(certificate.uploaded_at).toLocaleDateString("es-AR")}
                        </td>
                        <td style={styles.td}>
                            <button
                                onClick={() => openMedicalCertificateFile(certificate.medical_certificate_id)}
                                style={styles.viewBtn}
                            >
                                Ver
                            </button>

                            {certificate.status === "pending" && (
                                <>
                                    <button
                                        onClick={() => handleApprove(certificate.medical_certificate_id)}
                                        style={styles.approveBtn}
                                    >
                                        Aprobar
                                    </button>

                                    <button
                                        onClick={() => setRejectingId(certificate.medical_certificate_id)}
                                        style={styles.rejectBtn}
                                    >
                                        Rechazar
                                    </button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>

            {certificates.length === 0 && (
                <p style={styles.empty}>No hay aptos medicos para mostrar.</p>
            )}

            {rejectingId && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3>Rechazar apto medico</h3>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Motivo del rechazo"
                            style={styles.textarea}
                        />

                        <div style={styles.modalActions}>
                            <button
                                onClick={() => {
                                    setRejectingId(null);
                                    setRejectionReason("");
                                }}
                                style={styles.cancelBtn}
                            >
                                Cancelar
                            </button>

                            <button onClick={() => handleReject(rejectingId)} style={styles.rejectBtn}>
                                Confirmar rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    select: { padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" },
    table: { width: "100%", borderCollapse: "collapse", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
    th: { background: "#0b5ed7", color: "white", padding: "12px", textAlign: "left" },
    td: { padding: "12px", borderBottom: "1px solid #e5e7eb" },
    muted: { color: "#64748b", fontSize: "0.85rem" },
    viewBtn: { marginRight: "8px", padding: "7px 10px", border: "none", borderRadius: "6px", background: "#475569", color: "white", cursor: "pointer" },
    approveBtn: { marginRight: "8px", padding: "7px 10px", border: "none", borderRadius: "6px", background: "#16a34a", color: "white", cursor: "pointer" },
    rejectBtn: { padding: "7px 10px", border: "none", borderRadius: "6px", background: "#dc2626", color: "white", cursor: "pointer" },
    success: { color: "#166534", background: "#dcfce7", padding: "10px", borderRadius: "8px" },
    error: { color: "#991b1b", background: "#fee2e2", padding: "10px", borderRadius: "8px" },
    empty: { color: "#64748b", marginTop: "1rem" },
    modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 999 },
    modal: { width: "420px", background: "white", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
    textarea: { width: "100%", minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" },
    modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem" },
    cancelBtn: { padding: "8px 12px", border: "none", borderRadius: "6px", background: "#94a3b8", color: "white", cursor: "pointer" },
};
