const pool = require("../db");

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "No tenes permisos para acceder a este recurso" });
        }

        next();
    };
};

const requireActiveRole = (role, table, idColumn, statusColumn) => {
    return async (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: "No tenes permisos para acceder a este recurso" });
        }

        try {
            const result = await pool.query(
                `SELECT ${statusColumn} AS status FROM ${table} WHERE ${idColumn} = $1`,
                [req.user.id]
            );

            if (!result.rows[0]) {
                return res.status(401).json({ error: "La cuenta ya no existe" });
            }

            if (result.rows[0].status !== "active") {
                return res.status(403).json({ error: "Tu cuenta esta desactivada" });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Error al verificar el estado de la cuenta" });
        }
    };
};

const requireAdmin = requireRole("admin");
const requireUser = requireActiveRole("user", "users", "user_id", "user_status");
const requireInstructor = requireActiveRole("instructor", "instructors", "instructor_id", "status");
const requireAdminOrActiveInstructor = async (req, res, next) => {
    if (req.user?.role === "admin") return next();
    return requireInstructor(req, res, next);
};

module.exports = {
    requireRole,
    requireAdmin,
    requireUser,
    requireInstructor,
    requireAdminOrActiveInstructor
};
