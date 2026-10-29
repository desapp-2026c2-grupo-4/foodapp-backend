// Horarios de sucursal: una fila por día (1 = lunes ... 7 = domingo).
// Si hora_cierre <= hora_apertura, el rango cruza la medianoche.
const { TIMEZONE } = require("./dates");

const DIAS_INTL = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function toMinutes(hora) {
  if (!hora) return null;
  const [horas, minutos] = String(hora).split(":");
  const h = Number(horas);
  const m = Number(minutos);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return h * 60 + m;
}

// Día ISO (1-7) y minutos desde las 00:00 en la zona horaria configurada.
function diaYMinutoLocal(ahora = new Date(), timeZone = TIMEZONE) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value;
  const dia = DIAS_INTL[valor("weekday")];
  const minutos = Number(valor("hour")) * 60 + Number(valor("minute"));
  return { dia, minutos };
}

function rangoContiene(apertura, cierre, minutos) {
  const abre = toMinutes(apertura);
  const cierra = toMinutes(cierre);
  if (abre === null || cierra === null || abre === cierra) return false;
  if (abre < cierra) return minutos >= abre && minutos < cierra;
  // Cruza medianoche: la parte que empieza hoy.
  return minutos >= abre;
}

function estaAbiertaEn(horarios, { dia, minutos }) {
  if (!horarios || horarios.length === 0) return true; // sin horarios = abierta siempre
  const porDia = new Map(horarios.map((h) => [Number(h.dia_semana), h]));

  const hoy = porDia.get(dia);
  if (hoy && rangoContiene(hoy.hora_apertura, hoy.hora_cierre, minutos)) return true;

  // Cola nocturna del día anterior (ej. 20:00-02:00: a la 01:00 sigue abierta).
  const anterior = porDia.get(dia === 1 ? 7 : dia - 1);
  if (!anterior) return false;
  const abre = toMinutes(anterior.hora_apertura);
  const cierra = toMinutes(anterior.hora_cierre);
  if (abre === null || cierra === null || abre === cierra) return false;
  return abre > cierra && minutos < cierra;
}

function estaAbierta(horarios, ahora = new Date(), timeZone = TIMEZONE) {
  return estaAbiertaEn(horarios, diaYMinutoLocal(ahora, timeZone));
}

// Estado operativo: además del horario, la sucursal debe estar habilitada por el admin.
function abiertaAhora(sucursal, ahora = new Date(), timeZone = TIMEZONE) {
  if (!sucursal || sucursal.estado !== "activa") return false;
  return estaAbierta(sucursal.horarios, ahora, timeZone);
}

module.exports = {
  TIMEZONE,
  diaYMinutoLocal,
  estaAbiertaEn,
  estaAbierta,
  abiertaAhora,
};
