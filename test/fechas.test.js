const { fechaLocalISO, esFechaISO, normalizarFechaISO } = require("../utils/dates");

describe("utils/dates", () => {
  test("fechaLocalISO usa la zona horaria indicada", () => {
    const fecha = new Date("2026-10-29T02:30:00.000Z");
    expect(fechaLocalISO(fecha, "America/Argentina/Buenos_Aires")).toBe("2026-10-28");
  });

  test("esFechaISO acepta solo fechas de calendario válidas", () => {
    expect(esFechaISO("2026-09-20")).toBe(true);
    expect(esFechaISO("2026-02-31")).toBe(false);
    expect(esFechaISO("2026-09-20T00:00:00.000Z")).toBe(false);
  });

  test("normalizarFechaISO conserva el formato YYYY-MM-DD", () => {
    expect(normalizarFechaISO("2026-09-20")).toBe("2026-09-20");
    expect(() => normalizarFechaISO("2026-09-20T00:00:00.000Z")).toThrow();
  });
});
