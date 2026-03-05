const jwt = require("jsonwebtoken");

// Middleware d’authentification JWT
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      username: payload.sub,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
    return next();
  } catch (err) {
    console.error("JWT verify error:", err.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware d’autorisation par rôles
function authorizeRoles(...allowedRoles) {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    const roles = (req.user && Array.isArray(req.user.roles)) ? req.user.roles : [];
    const hasRole = roles.some((r) => allowed.has(r));
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden (insufficient role)" });
    }
    return next();
  };
}

module.exports = {
  authenticateJWT,
  authorizeRoles,
};

