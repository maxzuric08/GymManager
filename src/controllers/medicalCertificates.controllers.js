const pool = require("../db");

const VALID_REVIEW_STATUSES = ["approved", "rejected"];
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const sanitizeBase64 = (value = "") => {
    return value.replace(/^data:[^;]+;base64,/, "");
};

const getMyMedicalCertificate = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT medical_certificate_id,
                    user_id,
                    file_name,
                    mime_type,
                    status,
                    rejection_reason,
                    uploaded_at,
                    reviewed_at,
                    reviewed_by
             FROM medical_certificates
             WHERE user_id = $1
             ORDER BY uploaded_at DESC
             LIMIT 1`,
            [req.user.id]
        );

        res.json(result.rows[0] || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el apto medico" });
    }
};

const uploadMedicalCertificate = async (req, res) => {
    try {
        const { file_name, mime_type, file_data } = req.body;

        if (!file_name || !mime_type || !file_data) {
            return res.status(400).json({ error: "Debes enviar un archivo completo" });
        }

        if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
            return res.status(400).json({
                error: "Formato no permitido. Usa PDF, JPG, PNG o WEBP"
            });
        }

        const base64Data = sanitizeBase64(file_data);
        const fileBuffer = Buffer.from(base64Data, "base64");

        if (!fileBuffer.length) {
            return res.status(400).json({ error: "El archivo esta vacio" });
        }

        if (fileBuffer.length > MAX_FILE_SIZE) {
            return res.status(400).json({ error: "El archivo no puede superar 5 MB" });
        }

        const result = await pool.query(
            `INSERT INTO medical_certificates
             (user_id, file_name, mime_type, file_data, status, rejection_reason, uploaded_at, reviewed_at, reviewed_by)
             VALUES ($1, $2, $3, $4, 'pending', NULL, CURRENT_TIMESTAMP, NULL, NULL)
             RETURNING medical_certificate_id,
                       user_id,
                       file_name,
                       mime_type,
                       status,
                       rejection_reason,
                       uploaded_at,
                       reviewed_at,
                       reviewed_by`,
            [req.user.id, file_name, mime_type, fileBuffer]
        );

        res.status(201).json({
            message: "Apto medico enviado para revision",
            certificate: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al subir el apto medico" });
    }
};

const getMedicalCertificates = async (req, res) => {
    try {
        const { status } = req.query;

        const params = [];
        let whereClause = "";

        if (status) {
            const validStatuses = ["pending", "approved", "rejected"];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: "Estado invalido" });
            }

            params.push(status);
            whereClause = "WHERE mc.status = $1";
        }

        const result = await pool.query(
            `SELECT mc.medical_certificate_id,
                    mc.user_id,
                    mc.file_name,
                    mc.mime_type,
                    mc.status,
                    mc.rejection_reason,
                    mc.uploaded_at,
                    mc.reviewed_at,
                    mc.reviewed_by,
                    u.username,
                    u.first_name,
                    u.last_name,
                    u.dni,
                    a.username AS reviewed_by_username
             FROM medical_certificates mc
             JOIN users u ON mc.user_id = u.user_id
             LEFT JOIN administrators a ON mc.reviewed_by = a.admin_id
             ${whereClause}
             ORDER BY mc.uploaded_at DESC`,
            params
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener aptos medicos" });
    }
};

const getMedicalCertificateFile = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT medical_certificate_id,
                    user_id,
                    file_name,
                    mime_type,
                    file_data
             FROM medical_certificates
             WHERE medical_certificate_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Apto medico no encontrado" });
        }

        const certificate = result.rows[0];

        const isOwner =
            req.user.role === "user" &&
            Number(certificate.user_id) === Number(req.user.id);

        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: "No tenes permiso para ver este archivo" });
        }

        res.setHeader("Content-Type", certificate.mime_type);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${certificate.file_name}"`
        );

        res.send(certificate.file_data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al descargar el apto medico" });
    }
};

const reviewMedicalCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!VALID_REVIEW_STATUSES.includes(status)) {
            return res.status(400).json({
                error: "El estado debe ser approved o rejected"
            });
        }

        if (status === "rejected" && !rejection_reason?.trim()) {
            return res.status(400).json({
                error: "Indica el motivo del rechazo"
            });
        }

        const result = await pool.query(
            `UPDATE medical_certificates
             SET status = $1,
                 rejection_reason = $2,
                 reviewed_at = CURRENT_TIMESTAMP,
                 reviewed_by = $3
             WHERE medical_certificate_id = $4
             RETURNING medical_certificate_id,
                       user_id,
                       file_name,
                       mime_type,
                       status,
                       rejection_reason,
                       uploaded_at,
                       reviewed_at,
                       reviewed_by`,
            [
                status,
                status === "rejected" ? rejection_reason.trim() : null,
                req.user.id,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Apto medico no encontrado" });
        }

        res.json({
            message:
                status === "approved"
                    ? "Apto medico aprobado"
                    : "Apto medico rechazado",
            certificate: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al revisar el apto medico" });
    }
};

module.exports = {
    getMyMedicalCertificate,
    uploadMedicalCertificate,
    getMedicalCertificates,
    getMedicalCertificateFile,
    reviewMedicalCertificate
};
