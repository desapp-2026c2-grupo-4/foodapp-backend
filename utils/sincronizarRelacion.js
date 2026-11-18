async function sincronizarRelacion({ modelo, where, items, clave, crear, actualizar, transaction }) {
  const existentes = await modelo.findAll({ where, paranoid: false, transaction });
  const porClave = new Map(existentes.map((fila) => [clave(fila), fila]));
  const clavesDeseadas = new Set();

  for (const item of items) {
    const key = clave(item);
    if (clavesDeseadas.has(key)) {
      const err = new Error("La relación contiene elementos duplicados");
      err.status = 400;
      throw err;
    }
    clavesDeseadas.add(key);
  }

  for (const fila of existentes) {
    if (!clavesDeseadas.has(clave(fila)) && !fila.deletedAt) {
      await fila.destroy({ transaction });
    }
  }

  for (const item of items) {
    const fila = porClave.get(clave(item));
    if (!fila) {
      await modelo.create({ ...where, ...crear(item) }, { transaction });
      continue;
    }
    if (fila.deletedAt) {
      await fila.restore({ transaction });
    }
    const cambios = actualizar(item) || {};
    if (Object.keys(cambios).length > 0) {
      await fila.update(cambios, { transaction });
    }
  }
}

module.exports = sincronizarRelacion;
