// Facturas y datos fiscales en Supabase. No conoce la pantalla.
// Las facturas las numera y calcula el servidor (IGIC, 50 %, retención): la app solo pide
// emitirlas y las lee. Ninguna se cambia ni se borra desde la app.
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS = 'id, emisor, serie, anio, numero, codigo, tipo, fecha, mes, cliente_id, datos, total, creado';
// Mensajes del servidor que ya están pensados para enseñarse
const CLAROS = /Faltan los datos de facturación|ya está facturado|No hay pagos de clientes|mes ya cerrado|numeración ya no se puede|está anulado o es de otro cliente|Número no válido/;

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  const claro = msg.match(CLAROS);
  if (claro) return new ErrorServidor(msg.slice(0, 160));
  if (e && e.code === '42501') return new ErrorServidor('No tienes permiso para hacer esto.');
  if (e && (e.code === '23514' || e.code === '22023' || e.code === '22P02')) return new ErrorServidor('Algún dato no es válido. Revísalo.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}
const txt = (x, max) => (x == null ? null : String(x).trim().slice(0, max) || null);

export function crearFacturas(sb) {
  return {
    // Las facturas que puede ver quien pregunta (equipo: todas; cliente: las suyas)
    async lista() {
      const { data, error } = await sb.from('facturas').select(COLUMNAS).order('anio').order('serie').order('numero').limit(5000);
      if (error) throw errorDe(error, 'No se han podido traer las facturas.');
      return data || [];
    },

    // Avisa cuando se crea una factura (para que el otro profesional la vea al momento)
    escuchar(alCambiar) {
      let t = null;
      const canal = sb.channel('facturas')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'facturas' }, () => { clearTimeout(t); t = setTimeout(alCambiar, 400); })
        .subscribe();
      return () => { clearTimeout(t); sb.removeChannel(canal); };
    },

    // Datos fiscales del equipo (los ven Domingo y Fátima)
    async datosFiscales() {
      const { data, error } = await sb.from('datos_fiscales').select('user_id, nombre, nif, direccion, contacto, nota');
      if (error) throw errorDe(error, 'No se han podido traer los datos de facturación.');
      return data || [];
    },
    async guardarDatosFiscales(d) {
      const { data: s } = await sb.auth.getSession();
      const yo = s?.session?.user?.id;
      if (!yo) throw new ErrorServidor('Sin sesión.');
      const fila = {
        user_id: yo, nombre: txt(d.nombre, 120), nif: String(d.nif || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        direccion: txt(d.direccion, 200), contacto: txt(d.contacto, 120), nota: txt(d.nota, 200),
      };
      if (!fila.nombre || !fila.direccion || !/^[A-Z0-9]{8,12}$/.test(fila.nif)) throw new ErrorServidor('Faltan nombre, NIF o dirección (o el NIF no es válido).');
      const { error } = await sb.from('datos_fiscales').upsert(fila, { onConflict: 'user_id' });
      if (error) throw errorDe(error, 'No se han podido guardar los datos de facturación.');
    },

    // Mi numeración: { serie, anio, siguiente, se_puede_fijar } (null si no es del equipo)
    async numeracion() {
      const { data, error } = await sb.rpc('mi_numeracion');
      if (error) throw errorDe(error);
      return (data && data[0]) || null;
    },
    async fijarNumeracion(ultimo) {
      const n = Number(ultimo);
      if (!Number.isInteger(n) || n < 0 || n > 99999) throw new ErrorServidor('Número no válido.');
      const { error } = await sb.rpc('fijar_numeracion', { p_ultimo: n });
      if (error) throw errorDe(error);
    },

    // Fátima: factura de un pago (o varios del mismo cliente) → código
    async emitirCliente(pagoIds, receptor) {
      const ids = (pagoIds || []).filter((x) => UUID.test(String(x)));
      if (!ids.length) throw new ErrorServidor('No hay pagos que facturar.');
      const r = { nombre: txt(receptor && receptor.nombre, 120), nif: txt(receptor && receptor.nif, 20), direccion: txt(receptor && receptor.direccion, 200) };
      if (!r.nombre) throw new ErrorServidor('Falta el nombre del cliente para la factura.');
      const { data, error } = await sb.rpc('emitir_factura_cliente', { p_pagos: ids, p_receptor: r });
      if (error) throw errorDe(error, 'No se ha podido crear la factura.');
      return data;
    },

    // Domingo: factura del mes (AAAA-MM) a Fátima → código
    async emitirMensual(mes) {
      if (!/^\d{4}-\d{2}$/.test(String(mes || ''))) throw new ErrorServidor('Mes no válido.');
      const { data, error } = await sb.rpc('emitir_factura_mensual', { p_mes: mes + '-01', p_receptor: null });
      if (error) throw errorDe(error, 'No se ha podido crear la factura.');
      return data;
    },
  };
}
