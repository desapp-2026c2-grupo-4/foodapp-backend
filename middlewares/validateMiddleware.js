const validate = (schema, property = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: false,
    convert: true,
  });
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message).join(", ") });
  }
  req[property] = value;
  next();
};

module.exports = validate;
