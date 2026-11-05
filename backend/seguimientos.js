// Seguimientos semanales en Supabase: lo que envía el cliente, lo que hace cada profesional con
// cada seguimiento (visto, revisado y su comentario) y el historial del cliente.
// No conoce la pantalla. Quién lee y escribe qué lo deciden las políticas RLS y los triggers.
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const COLUMNAS = 'id, cliente_id, fecha, semana, datos, creado, editado';

function id(x, que) {
  if (!UUID.test(String(x || ''))) throw new ErrorServidor(que + ' no válido.');
  return x;
}
function errorDe(e, generico) {
  const msg = (e && e.message) || '';
  if (e && e.code === '42501' && /semana|corregir|escribió/i.test(msg)) return new ErrorServidor(msg.slice(0, 200));
  if (e && (e.code === '42501' || /row-level security/i.test(msg))) return new ErrorServidor('No tienes permiso para hacer esto.');
  if (e && (e.code === '23514' || e.code === '22P02')) return new ErrorServidor('El seguimiento es demasiado grande o tiene algún dato no válido.');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}

export function crearSeguimientos(sb) {
  const filtro = (q, ids) => (ids ? q.in('cliente_id', ids) : q);
  const comprobarIds = (ids) => { if (ids && !ids.every((x) => UUID.test(x))) throw new ErrorServidor('Cliente no válido.'); };

  return {
    // Seguimientos (los más recientes primero), lo de cada profesional (solo el equipo) e historial
    // → { seguimientos: [...], equipo: [...], historial: { [cliente_id]: datos } }
    async traer(ids, conEquipo) {
      comprobarIds(ids);
      const [s, e, h] = await Promise.all([
        filtro(sb.from('seguimientos').select(COLUMNAS), ids).order('fecha', { ascending: false }).limit(2000),
        conEquipo ? filtro(sb.from('seguimiento_equipo').select('seguimiento_id, cliente_id, user_id, visto, revisado, comentario'), ids)
          : Promise.resolve({ data: [] }),
        filtro(sb.from('historial').select('cliente_id, datos'), ids),
      ]);
      const fallo = [s, e, h].find((x) => x.error);
      if (fallo) throw errorDe(fallo.error, 'No se han podido traer los seguimientos.');
      const historial = {};
      for (const f of h.data || []) historial[f.cliente_id] = f.datos;
      return { seguimientos: s.data || [], equipo: e.data || [], historial };
    },

    // Cliente: envía el de esta semana. El id lo pone la app: si se reintenta, no se duplica.
    async enviar({ id: sid, clienteId, fecha, datos }) {
      id(sid, 'Seguimiento'); id(clienteId, 'Cliente');
      if (!FECHA.test(fecha)) throw new ErrorServidor('Fecha no válida.');
      const { error } = await sb.from('seguimientos').insert({ id: sid, cliente_id: clienteId, fecha, datos });
      if (!error) return;
      if (error.code === '23505') {
        // ¿ya estaba (reintento) o ya había otro de esta semana?
        const { data } = await sb.from('seguimientos').select('id').eq('id', sid).maybeSingle();
        if (data) return;
        throw new ErrorServidor('Ya enviaste el seguimiento de esta semana. Puedes editarlo.');
      }
      throw errorDe(error, 'No se ha podido enviar el seguimiento.');
    },

    // Cliente: corrige el de esta semana
    async corregir(sid, datos) {
      id(sid, 'Seguimiento');
      const { data, error } = await sb.from('seguimientos').update({ datos }).eq('id', sid).select('id');
      if (error) throw errorDe(error, 'No se ha podido guardar la corrección.');
      if (!data || !data.length) throw new ErrorServidor('Este seguimiento ya no se puede corregir.');
    },

    // Profesional: visto / revisado (con comentario) / deshacer la revisión (revisado: null)
    async marcar(sid, cambios) {
      id(sid, 'Seguimiento');
      const fila = { seguimiento_id: sid };
      if ('visto' in cambios) fila.visto = cambios.visto;
      if ('revisado' in cambios) { fila.revisado = cambios.revisado; fila.comentario = cambios.revisado ? String(cambios.comentario || '').slice(0, 4000) || null : null; }
      const { error } = await sb.from('seguimiento_equipo').upsert(fila, { onConflict: 'seguimiento_id,user_id' });
      if (error) throw errorDe(error, 'No se ha podido guardar la revisión.');
    },

    // Cliente: su historial (registro de pesos, tonelaje, sesiones, comidas, cardio)
    async guardarHistorial(clienteId, datos) {
      id(clienteId, 'Cliente');
      const { error } = await sb.from('historial').upsert({ cliente_id: clienteId, datos }, { onConflict: 'cliente_id' });
      if (error) throw errorDe(error, 'No se ha podido guardar el historial.');
    },

    // Avisa con el id del cliente cuando cambia algo de sus seguimientos o su historial
    escuchar(alCambiar) {
      let canal = sb.channel('seguimientos');
      for (const t of ['seguimientos', 'seguimiento_equipo', 'historial']) {
        canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p) => {
          const f = p.new && Object.keys(p.new).length ? p.new : p.old;
          if (f && f.cliente_id) alCambiar(t, f.cliente_id, p.eventType, f);
        });
      }
      canal.subscribe();
      return () => { sb.removeChannel(canal); };
    },
  };
}
