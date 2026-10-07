// Distancia Haversine entre dos coordenadas (en kilómetros).
// Se usa para asignar al pedido la sucursal más cercana a la dirección de entrega.
function distanciaKm(lat1, lon1, lat2, lon2) {
  const aLat1 = (parseFloat(lat1) * Math.PI) / 180;
  const aLat2 = (parseFloat(lat2) * Math.PI) / 180;
  const dLat = aLat2 - aLat1;
  const dLon = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(aLat1) * Math.cos(aLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c; // radio terrestre en km
}

module.exports = { distanciaKm };
