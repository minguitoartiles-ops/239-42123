// Pagos, tarifa, bajas y datos de pago en Supabase. No conoce la pantalla.
// Quién puede qué lo deciden las políticas del servidor: los pagos los registra el equipo y
// no se cambian ni se borran; el cliente ve los suyos; el acceso lo amplía el propio servidor.
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const METODOS = ['bizum', 'transferencia', 'efectivo', 'otro'];
const TARIFAS = ['mensual', 'trimestral', 'semestral', 'anual', 'ninguna'];
const COLUMNAS = 'id, cliente_id, fecha, importe, metodo, periodo_desde, periodo_hasta, nota, registrado_por, creado';

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (e && e.code === '42501') return new ErrorServidor('No tienes permiso para hacer esto.');
  if (/de baja/.test(msg)) return new ErrorServidor('Este cliente está de baja: reactívalo antes de registrar un pago.');
  if (e && (e.code === '23514' || e.code === '22023' || e.code === '22P02' || e.code === '22007' || e.code === '22008')) return new ErrorServidor('Algún dato no es válido. Revísalo.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}
const id = (x, que) => { if (!UUID.test(String(x || ''))) throw new ErrorServidor(`${que} no válido.`); return x; };
const fecha = (x, que) => { if (x == null) return null; if (!FECHA.test(String(x))) throw new ErrorServidor(`${que} no válida.`); return x; };
const importe = (x) => {
  const n = Math.round(Number(x) * 100) / 100;
  if (!(n > 0 && n < 100000)) throw new ErrorServidor('Escribe el importe del pago.');
  return n;
};

export function crearPagos(sb) {
  return {
    // Pagos que puede ver quien pregunta (el equipo, todos; el cliente, los suyos) → [fila]
    async lista(clienteId) {
      let q = sb.from('pagos').select(COLUMNAS).order('fecha').order('creado').limit(5000);
      if (clienteId) q = q.eq('cliente_id', id(clienteId, 'Cliente'));
      const { data, error } = await q;
      if (error) throw errorDe(error, 'No se han podido traer los pagos.');
      return data || [];
    },

    // Equipo: registra un pago; si trae periodo, el servidor amplía el acceso → fila
    async registrar(p) {
      const fila = {
        cliente_id: id(p && p.clienteId, 'Cliente'),
        importe: importe(p.importe),
        metodo: METODOS.includes(p.metodo) ? p.metodo : 'otro',
        periodo_desde: fecha(p.desde, 'Fecha de inicio'),
        periodo_hasta: fecha(p.hasta, 'Fecha de fin'),
        nota: p.nota ? String(p.nota).slice(0, 500) : null,
      };
      if (p.fecha) fila.fecha = fecha(p.fecha, 'Fecha del pago');
      const { data, error } = await sb.from('pagos').insert(fila).select(COLUMNAS).single();
      if (error) throw errorDe(error, 'No se ha podido registrar el pago.');
      return data;
    },

    // Equipo: tarifa, precio y «pagado hasta»
    async tarifa(clienteId, t) {
      const cambios = {};
      if (t.tarifa !== undefined) {
        if (!TARIFAS.includes(t.tarifa)) throw new ErrorServidor('Tarifa no válida.');
        cambios.tarifa = t.tarifa;
      }
      if (t.precio !== undefined) {
        if (t.precio !== null && !(Number(t.precio) >= 0 && Number(t.precio) < 100000)) throw new ErrorServidor('Precio no válido.');
        cambios.precio = t.precio === null ? null : Math.round(Number(t.precio) * 100) / 100;
      }
      if (t.hasta !== undefined) cambios.acceso_hasta = fecha(t.hasta, '«Pagado hasta»');
      if (!Object.keys(cambios).length) return;
      const { error } = await sb.from('clientes').update(cambios).eq('id', id(clienteId, 'Cliente'));
      if (error) throw errorDe(error, 'No se ha podido guardar la tarifa.');
    },

    // Equipo: dar de baja (pierde el acceso al momento; la ficha se borra a los 15 días)
    async baja(clienteId, motivo) {
      const { error } = await sb.from('clientes')
        .update({ estado: 'baja', baja: { motivo: String(motivo || '').slice(0, 120) } })
        .eq('id', id(clienteId, 'Cliente'));
      if (error) throw errorDe(error, 'No se ha podido dar de baja.');
    },

    // Equipo: reactivar (vuelve como mínimo en el margen de pago)
    async reactivar(clienteId) {
      const { error } = await sb.from('clientes').update({ estado: 'activo' }).eq('id', id(clienteId, 'Cliente'));
      if (error) throw errorDe(error, 'No se ha podido reactivar.');
    },

    // Bizum, transferencia y enlace de pago (los ve el equipo y los clientes con acceso)
    async datos() {
      const { data, error } = await sb.from('config_pagos').select('bizum, iban, titular, banco, enlace').maybeSingle();
      if (error) throw errorDe(error, 'No se han podido traer los datos de pago.');
      return data;
    },
    async guardarDatos(d) {
      const cambios = {};
      if (d.bizum !== undefined) cambios.bizum = (d.bizum || []).filter(Boolean).slice(0, 3).map((x) => String(x).trim());
      if (d.iban !== undefined) cambios.iban = d.iban ? String(d.iban).toUpperCase().replace(/\s+/g, '') : null;
      if (d.titular !== undefined) cambios.titular = d.titular ? String(d.titular).slice(0, 80) : null;
      if (d.banco !== undefined) cambios.banco = d.banco ? String(d.banco).slice(0, 60) : null;
      if (d.enlace !== undefined) {
        if (d.enlace && !/^https:\/\/[^\s"'<>]{1,290}$/i.test(d.enlace)) throw new ErrorServidor('El enlace debe empezar por https://');
        cambios.enlace = d.enlace || null;
      }
      if (!Object.keys(cambios).length) return;
      const { error } = await sb.from('config_pagos').update(cambios).eq('id', 1);
      if (error) throw errorDe(error, 'No se han podido guardar los datos de pago.');
    },
  };
}
