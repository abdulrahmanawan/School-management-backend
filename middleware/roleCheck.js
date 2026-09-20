function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Forbidden: no role in token' });
    }

    // Map legacy 'superadmin' → 'principal' and 'owner'
    const effectiveAllowed = allowedRoles.flatMap(role => {
      if (role === 'superadmin') return ['principal', 'owner'];
      return [role];
    });

    if (!effectiveAllowed.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: role ${req.user.role} not allowed` });
    }
    next();
  };
}

module.exports = roleCheck;