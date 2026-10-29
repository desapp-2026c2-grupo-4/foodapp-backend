const { estaAbiertaEn, abiertaAhora } = require("../utils/schedule");

const rango = (dia, apertura, cierre) => ({
  dia_semana: dia,
  hora_apertura: apertura,
  hora_cierre: cierre,
});

describe("estaAbiertaEn", () => {
  test("sin horarios se considera abierta siempre", () => {
    expect(estaAbiertaEn([], { dia: 1, minutos: 600 })).toBe(true);
    expect(estaAbiertaEn(undefined, { dia: 1, minutos: 600 })).toBe(true);
  });

  test("detecta dentro y fuera de un rango diurno", () => {
    const horarios = [rango(1, "10:00", "23:00")];
    expect(estaAbiertaEn(horarios, { dia: 1, minutos: 12 * 60 })).toBe(true);
    expect(estaAbiertaEn(horarios, { dia: 1, minutos: 9 * 60 })).toBe(false);
    expect(estaAbiertaEn(horarios, { dia: 1, minutos: 23 * 60 })).toBe(false);
  });

  test("un día sin horario está cerrado", () => {
    const horarios = [rango(1, "10:00", "23:00")];
    expect(estaAbiertaEn(horarios, { dia: 2, minutos: 12 * 60 })).toBe(false);
  });

  test("el cierre a las 00:00 cubre hasta el final del día", () => {
    const horarios = [rango(1, "11:00", "00:00")];
    expect(estaAbiertaEn(horarios, { dia: 1, minutos: 23 * 60 })).toBe(true);
    expect(estaAbiertaEn(horarios, { dia: 1, minutos: 10 * 60 })).toBe(false);
  });

  test("un rango nocturno sigue abierto después de medianoche", () => {
    const horarios = [rango(6, "20:00", "02:00")];
    expect(estaAbiertaEn(horarios, { dia: 6, minutos: 23 * 60 })).toBe(true);
    expect(estaAbiertaEn(horarios, { dia: 7, minutos: 60 })).toBe(true);
    expect(estaAbiertaEn(horarios, { dia: 7, minutos: 3 * 60 })).toBe(false);
  });
});

describe("abiertaAhora", () => {
  test("respeta el estado manual de la sucursal", () => {
    expect(abiertaAhora({ estado: "inactiva", horarios: [] })).toBe(false);
    expect(abiertaAhora({ estado: "activa", horarios: [] })).toBe(true);
  });
});
