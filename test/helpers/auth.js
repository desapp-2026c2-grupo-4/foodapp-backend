const { Empleado } = require("../../models");
const { hashPassword } = require("../../utils/password");
const { firmarToken } = require("../../utils/jwt");

const ADMIN_EMAIL = "admin.test@example.com";
const ADMIN_PASSWORD = "admin123";

let adminToken = null;
let admin = null;

const resetAdmin = () => {
  adminToken = null;
  admin = null;
};

const crearAdmin = async () => {
  admin = await Empleado.create({
    nombre: "Admin",
    apellido: "Test",
    rol: "ADMIN",
    email: ADMIN_EMAIL,
    password: await hashPassword(ADMIN_PASSWORD),
    id_sucursal: null,
  });
  adminToken = firmarToken({ id_empleado: admin.id_empleado, rol: "ADMIN" });
  return admin;
};

const getAdminToken = () => {
  if (!adminToken) throw new Error("El admin de test no fue inicializado");
  return adminToken;
};

const getAdmin = () => admin;
const getAdminCredentials = () => ({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

module.exports = { crearAdmin, resetAdmin, getAdminToken, getAdmin, getAdminCredentials };
