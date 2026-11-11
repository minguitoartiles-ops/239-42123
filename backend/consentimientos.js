// Consentimientos (datos de salud, uso de imagen y cookies) guardados en Supabase. No conoce la pantalla.
// Registro que solo crece: dar, cambiar o retirar añade una fila. Lo escribe el propio cliente
// (el servidor pone su ficha, la fecha y el navegador); lo ven él y el equipo.
import { ErrorServidor } from './clientes.js';

const TIPOS = ['salud', 'imagen', 'cookies'];   // 11/11 · cookies: «dado» acepta las de preferencias; «retirado», solo técnicas
const VERSION = /^[0-9A-Za-z._-]{1,40}$/;

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (e && e.code === '42501') return new ErrorServidor('Tu cuenta no tiene acceso ahora mismo.');
  return new ErrorServidor(generico || 'No se ha podido guardar. Inténtalo de nuevo.');
}

export function crearConsentimientos(sb) {
  return {
    // Todos los que puede ver quien pregunta, del más antiguo al más nuevo
    async lista() {
      const { data, error } = await sb.from('consentimientos')
        .select('cliente_id, tipo, estado, version, detalle, fecha').order('fecha').limit(5000);
      if (error) throw errorDe(error, 'No se han podido traer los consentimientos.');
      return data || [];
    },
    // 8/11 · Avisa cuando alguien da o retira un consentimiento: alCambiar(id del cliente)
    escuchar(alCambiar) {
      const canal = sb.channel('consentimientos')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'consentimientos' }, (p) => { if (p.new && p.new.cliente_id) alCambiar(p.new.cliente_id); })
        .subscribe();
      return () => { sb.removeChannel(canal); };
    },
    // El cliente da o retira un consentimiento (imagen: { progreso, reconocible, nombre })
    async registrar(tipo, estado, version, detalle) {
      if (!TIPOS.includes(tipo) || !['dado', 'retirado'].includes(estado) || !VERSION.test(String(version || ''))) {
        throw new ErrorServidor('Consentimiento no válido.');
      }
      const fila = { tipo, estado, version };
      if (tipo === 'imagen' && estado === 'dado') {
        fila.detalle = { progreso: !!(detalle && detalle.progreso), reconocible: !!(detalle && detalle.reconocible), nombre: !!(detalle && detalle.nombre) };
      }
      const { error } = await sb.from('consentimientos').insert(fila);
      if (error) throw errorDe(error);
    },
  };
}
