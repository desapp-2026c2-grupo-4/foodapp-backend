const { sequelize, Parametro } = require("../models");

const DEFAULTS = {
  tiempo_base_entrega_min: {
    valor: 20,
    tipo: "integer",
    grupo: "operacion",
    descripcion: "Tiempo base de preparación y entrega que se suma al viaje.",
    unidad: "min",
    min: 1,
    max: 240,
  },
  velocidad_urbana_kmh: {
    valor: 40,
    tipo: "integer",
    grupo: "operacion",
    descripcion: "Velocidad urbana promedio usada para estimar el tiempo de viaje.",
    unidad: "km/h",
    min: 1,
    max: 200,
  },
  radio_cobertura_default_km: {
    valor: 2,
    tipo: "decimal",
    grupo: "operacion",
    descripcion: "Radio de cobertura sugerido al crear una sucursal.",
    unidad: "km",
    min: 0.1,
    max: 100,
  },
  stock_minimo_default: {
    valor: 0,
    tipo: "integer",
    grupo: "stock",
    descripcion: "Stock mínimo sugerido al crear una materia prima.",
    unidad: "unidades",
    min: 0,
    max: 1000000,
  },
  historial_reducciones_limit: {
    valor: 20,
    tipo: "integer",
    grupo: "stock",
    descripcion: "Cantidad de reducciones manuales que se muestran en el historial.",
    unidad: "registros",
    min: 1,
    max: 100,
  },
  dias_cliente_inactivo: {
    valor: 30,
    tipo: "integer",
    grupo: "clientes",
    descripcion: "Días sin pedidos para considerar a un cliente inactivo.",
    unidad: "días",
    min: 1,
    max: 365,
  },
  pedidos_cliente_recurrente: {
    valor: 3,
    tipo: "integer",
    grupo: "clientes",
    descripcion: "Pedidos entregados necesarios para considerar a un cliente recurrente.",
    unidad: "pedidos",
    min: 1,
    max: 100,
  },
  reporte_dias_default: {
    valor: 30,
    tipo: "integer",
    grupo: "reportes",
    descripcion: "Cantidad de días que se consultan por defecto en los reportes.",
    unidad: "días",
    min: 1,
    max: 3650,
  },
  reporte_dias_max: {
    valor: 365,
    tipo: "integer",
    grupo: "reportes",
    descripcion: "Máximo de días permitido en un rango de reportes.",
    unidad: "días",
    min: 1,
    max: 3650,
  },
  reporte_limite_default: {
    valor: 10,
    tipo: "integer",
    grupo: "reportes",
    descripcion: "Cantidad de filas que se muestran por defecto en los rankings.",
    unidad: "filas",
    min: 1,
    max: 100,
  },
  reporte_limite_max: {
    valor: 50,
    tipo: "integer",
    grupo: "reportes",
    descripcion: "Máximo de filas permitido en los rankings de reportes.",
    unidad: "filas",
    min: 1,
    max: 500,
  },
  reporte_cancelados_limit: {
    valor: 100,
    tipo: "integer",
    grupo: "reportes",
    descripcion: "Cantidad máxima de pedidos cancelados incluidos en el detalle.",
    unidad: "pedidos",
    min: 1,
    max: 500,
  },
};

let cache = null;
let cargando = null;

const errorConStatus = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsearValor = (tipo, valor) => {
  if (valor === null || valor === undefined) return valor;
  if (tipo === "integer") {
    const n = Number.parseInt(valor, 10);
    return Number.isNaN(n) ? null : n;
  }
  if (tipo === "decimal") {
    const n = Number.parseFloat(valor);
    return Number.isNaN(n) ? null : n;
  }
  if (tipo === "boolean") return valor === true || valor === "true";
  return String(valor);
};

const serializarValor = (tipo, valor) => {
  if (tipo === "boolean") return valor ? "true" : "false";
  return String(valor);
};

const validarValor = (clave, valor) => {
  const meta = DEFAULTS[clave];
  if (!meta) throw errorConStatus(400, `Parámetro desconocido: ${clave}`);
  if (meta.tipo === "integer" && !Number.isInteger(valor)) {
    throw errorConStatus(400, `El parámetro ${clave} debe ser un entero`);
  }
  if (meta.tipo === "decimal" && !Number.isFinite(valor)) {
    throw errorConStatus(400, `El parámetro ${clave} debe ser un número`);
  }
  if (meta.min !== undefined && valor < meta.min) {
    throw errorConStatus(400, `El parámetro ${clave} debe ser mayor o igual a ${meta.min}`);
  }
  if (meta.max !== undefined && valor > meta.max) {
    throw errorConStatus(400, `El parámetro ${clave} debe ser menor o igual a ${meta.max}`);
  }
};

const validarCombinacion = (valores) => {
  if (valores.reporte_dias_default > valores.reporte_dias_max) {
    throw errorConStatus(400, "Los días por defecto de reportes no pueden superar el máximo permitido");
  }
  if (valores.reporte_limite_default > valores.reporte_limite_max) {
    throw errorConStatus(400, "El límite por defecto de reportes no puede superar el máximo permitido");
  }
};

const leerValores = async (transaction) => {
  if (!transaction && cache) return cache;

  const filas = await Parametro.findAll({ transaction });
  const valores = {};
  for (const [clave, meta] of Object.entries(DEFAULTS)) {
    valores[clave] = meta.valor;
  }
  for (const fila of filas) {
    const meta = DEFAULTS[fila.clave];
    if (!meta) continue;
    const valor = parsearValor(meta.tipo, fila.valor);
    if (valor !== null) valores[fila.clave] = valor;
  }

  if (!transaction) cache = valores;
  return valores;
};

const cargarValores = async (transaction) => {
  if (!transaction && cache) return cache;
  if (transaction) return leerValores(transaction);
  if (!cargando) {
    cargando = leerValores().finally(() => {
      cargando = null;
    });
  }
  return cargando;
};

const listar = async () => {
  const filas = await Parametro.findAll();
  const porClave = new Map(filas.map((f) => [f.clave, f]));

  return Object.entries(DEFAULTS).map(([clave, meta]) => {
    const fila = porClave.get(clave);
    return {
      clave,
      valor: fila ? parsearValor(meta.tipo, fila.valor) : meta.valor,
      valor_defecto: meta.valor,
      tipo: meta.tipo,
      grupo: meta.grupo,
      descripcion: meta.descripcion,
      unidad: meta.unidad,
      min: meta.min,
      max: meta.max,
      actualizado_en: fila?.updatedAt ? fila.updatedAt.toISOString() : null,
      actualizado_por: fila?.id_empleado_actualizacion ?? null,
    };
  });
};

const obtener = async (clave) => {
  const valores = await cargarValores();
  return Object.prototype.hasOwnProperty.call(valores, clave)
    ? valores[clave]
    : DEFAULTS[clave]?.valor;
};

const obtenerNumero = async (clave, fallback) => {
  const valor = await obtener(clave);
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
};

const actualizar = async (cambios, id_empleado = null) => {
  const claves = Object.keys(cambios || {});
  if (claves.length === 0) throw errorConStatus(400, "No se enviaron parámetros para actualizar");

  for (const clave of claves) {
    if (!DEFAULTS[clave]) throw errorConStatus(400, `Parámetro desconocido: ${clave}`);
    validarValor(clave, cambios[clave]);
  }

  await sequelize.transaction(async (transaction) => {
    const valoresActuales = await cargarValores(transaction);
    const valoresFinales = { ...valoresActuales, ...cambios };
    validarCombinacion(valoresFinales);

    for (const clave of claves) {
      const meta = DEFAULTS[clave];
      await Parametro.upsert({
        clave,
        valor: serializarValor(meta.tipo, cambios[clave]),
        tipo: meta.tipo,
        grupo: meta.grupo,
        descripcion: meta.descripcion,
        id_empleado_actualizacion: id_empleado,
      }, { transaction });
    }
  });

  cache = null;
  return listar();
};

const resetCache = () => {
  cache = null;
  cargando = null;
};

module.exports = {
  DEFAULTS,
  listar,
  obtener,
  obtenerNumero,
  actualizar,
  resetCache,
};
