// Datos de salud del cliente en Supabase (tabla «salud»): el cuestionario inicial y lo que sale de él.
// Lo escribe solo el propio cliente (lo decide el servidor) y lo leen él y el equipo. No conoce la pantalla.
import { ErrorServidor } from './clientes.js';

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (/size|too large|65536|check constraint/i.test(msg)) return new ErrorServidor('Hay demasiado texto. Acorta alguna respuesta.');
  return new ErrorServidor(generico || 'No se ha podido guardar. Inténtalo de nuevo.');
}

export function crearSalud(sb) {
  return {
    // Las fichas de salud que puede ver quien pregunta → [{ cliente_id, datos, actualizado }]
    async lista(ids) {
      let q = sb.from('salud').select('cliente_id, datos, actualizado').limit(5000);
      if (ids) {
        if (!ids.every((x) => /^[0-9a-f-]{36}$/i.test(String(x)))) throw new ErrorServidor('Cliente no válido.');
        q = q.in('cliente_id', ids);
      }
      const { data, error } = await q;
      if (error) throw errorDe(error, 'No se han podido traer los cuestionarios.');
      return data || [];
    },
    // 8/11 · Avisa con el id del cliente cuando cambia su ficha de salud (cuestionario, alergias): alCambiar(id)
    escuchar(alCambiar, alEstado) {
      const canal = sb.channel('salud')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'salud' }, (p) => {
          const f = p.new && p.new.cliente_id ? p.new : p.old;
          if (f && f.cliente_id) alCambiar(f.cliente_id);
        })
        .subscribe((estado) => { if (alEstado) alEstado(estado); });
      return () => { sb.removeChannel(canal); };
    },
    // El cliente guarda la suya (se sustituye entera)
    async guardar(clienteId, datos) {
      if (!datos || typeof datos !== 'object' || Array.isArray(datos)) throw new ErrorServidor('Datos no válidos.');
      const { data, error } = await sb.from('salud').update({ datos }).eq('cliente_id', clienteId).select('cliente_id');
      if (error) throw errorDe(error);
      if (!data || !data.length) throw new ErrorServidor('Tu cuenta no tiene acceso ahora mismo.');
    },
  };
}
