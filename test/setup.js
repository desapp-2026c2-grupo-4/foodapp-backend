// Se ejecuta antes de cada archivo de test (jest setupFiles).
// Apunta la app a la base de test ANTES de que se carguen los modelos.
// dotenv NO pisa variables ya definidas, así que .env no la sobrescribe.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgres://unahur:desarrollo@localhost:5432/bajon_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "desarrollo";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
process.env.NODE_ENV = "test";
