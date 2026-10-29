const TIMEZONE = process.env.SCHEDULE_TIMEZONE || "America/Argentina/Buenos_Aires";

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function esFechaISO(valor) {
  if (typeof valor !== "string" || !FECHA_ISO.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function normalizarFechaISO(valor) {
  if (!esFechaISO(valor)) {
    const err = new Error("La fecha debe tener formato YYYY-MM-DD y ser válida");
    err.status = 400;
    throw err;
  }
  return valor;
}

function fechaLocalISO(fecha = new Date(), timeZone = TIMEZONE) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

module.exports = {
  TIMEZONE,
  esFechaISO,
  normalizarFechaISO,
  fechaLocalISO,
};
