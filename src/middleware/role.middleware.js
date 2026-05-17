const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "No tenes permisos para acceder a este recurso" });
        }

        next();
    };
};

const requireAdmin = requireRole("admin");
const requireUser = requireRole("user");
const requireInstructor = requireRole("instructor");

module.exports = {
    requireRole,
    requireAdmin,
    requireUser,
    requireInstructor
};
