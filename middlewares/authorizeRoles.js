const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log(roles, req.user.role)
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied, insufficient role.' });
    }
    next();
  };
};

module.exports = authorizeRoles;
