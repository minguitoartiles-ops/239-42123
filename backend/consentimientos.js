// Consentimientos (salud, imagen, comercial) en Supabase. No conoce la pantalla.
// Es un registro que solo crece: cada decisión del cliente es un apunte nuevo; vale el último.
// El servidor pone de quién es, la fecha, la IP y el navegador.
import { ErrorServidor } from './clientes.js';

const TIPOS = ['salud', 'imagen', 'comercial'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (e && e.code === '42501') return new ErrorServidor('No tienes permiso para hacer esto.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}

export function crearConsentimientos(sb) {
  return {
    // Los que puede ver quien pregunta (cliente: los suyos; equipo: todos), del más antiguo al más nuevo
    async lista(clienteId) {
      let q = sb.from('consentimientos').select('id, cliente_id, tipo, dado, version, detalle, fecha').order('fecha').limit(5000);
      if (clienteId) {
        if (!UUID.test(String(clienteId))) throw new ErrorServidor('Cliente no válido.');
        q = q.eq('cliente_id', clienteId);
      }
      const { data, error } = await q;
      if (error) throw errorDe(error, 'No se han podido traer los consentimientos.');
      return data || [];
    },

    // El cliente apunta una decisión suya
    async apuntar(tipo, dado, version, detalle) {
      if (!TIPOS.includes(tipo)) throw new ErrorServidor('Consentimiento no válido.');
      const fila = { tipo, dado: !!dado, version: String(version || '').slice(0, 40) || 'sin-version' };
      if (tipo === 'imagen') fila.detalle = { progreso: !!(detalle && detalle.progreso), reconocible: !!(detalle && detalle.reconocible), nombre: !!(detalle && detalle.nombre) };
      const { error } = await sb.from('consentimientos').insert(fila);
      if (error) throw errorDe(error, 'No se ha podido registrar tu decisión.');
    },
  };
}
