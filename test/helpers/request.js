const supertest = require("supertest");
const app = require("../../index");
const { getAdminToken } = require("./auth");

const conToken = (token) => {
  const agent = supertest(app);
  const auth = token ? `Bearer ${token}` : null;
  const wrap = (method) => (...args) => {
    const req = agent[method](...args);
    return auth ? req.set("Authorization", auth) : req;
  };
  return {
    get: wrap("get"),
    post: wrap("post"),
    put: wrap("put"),
    patch: wrap("patch"),
    delete: wrap("delete"),
    options: wrap("options"),
    head: wrap("head"),
  };
};

// Por defecto los tests existentes operan como ADMIN. Los tests de seguridad
// crean sus propios tokens y usan requestAs() para validar 401/403/ownership.
const request = () => conToken(getAdminToken());
const requestAs = (token) => conToken(token);

module.exports = { request, requestAs, app };
