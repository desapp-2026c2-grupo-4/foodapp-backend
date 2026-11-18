const validate = (schema, property = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message).join(", ") });
  }
  if (property === "query") {
    Object.defineProperty(req, "query", {
      value,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } else {
    req[property] = value;
  }
  next();
};

module.exports = validate;
