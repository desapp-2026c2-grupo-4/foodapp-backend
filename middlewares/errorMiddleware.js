const errorMiddleware = (err, req, res, _next) => {
  console.error(err);
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({ error: err.errors.map((e) => e.message).join(", ") });
  }
  res.status(500).json({ error: "Error interno del servidor" });
};

module.exports = errorMiddleware;
