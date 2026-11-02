// Planes en Supabase: la pauta (la escribe el profesional de cada área) y el registro semanal
// (lo apunta el cliente), por separado. Quién puede leer y escribir qué lo deciden las políticas
// RLS del servidor; aquí solo se pide lo necesario y se comprueba que de verdad se ha guardado.
import { ErrorServidor } from './clientes.js';

const TABLAS = {
  ent: { pauta: 'planes_entreno', registro: 'registro_entreno' },
  nut: { pauta: 'planes_nutricion', registro: 'registro_nutricion' },
};
const SEMANA = /^[0-9]{4}-W[0-9]{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tablas(area) {
  const t = TABLAS[area];
  if (!t) throw new ErrorServidor('Plan no válido.');
  return t;
}
function errorDe(e) {
  if (e && (e.code === '42501' || /row-level security/i.test(e.message || ''))) return new ErrorServidor('No tienes permiso para cambiar este plan.');
  if (e && (e.code === '23514' || e.code === '22P02')) return new ErrorServidor('El plan es demasiado grande o tiene algún dato no válido.');
  if (e && /fetch|network/i.test(e.message || '')) return new ErrorServidor('Sin conexión con el servidor. Se guardará al volver internet.');
  return new ErrorServidor('No se ha podido guardar el plan. Inténtalo de nuevo.');
}
// Lo más reciente de cada cliente
function ultimoPorCliente(filas) {
  const r = {};
  for (const f of filas || []) if (!r[f.cliente_id] || f.semana > r[f.cliente_id].semana) r[f.cliente_id] = f;
  return r;
}

export function crearPlanes(sb) {
  return {
    // Pautas y último registro (desde la semana «desde») de los clientes indicados, o de todos los que se pueden ver.
    // → { [cliente_id]: { ent: { pauta, semana, registro }, nut: { … } } }
    async traer(ids, desde) {
      if (ids && !ids.every((x) => UUID.test(x))) throw new ErrorServidor('Cliente no válido.');
      if (!SEMANA.test(desde)) throw new ErrorServidor('Semana no válida.');
      const filtro = (q) => (ids ? q.in('cliente_id', ids) : q);
      const [pe, pn, re, rn] = await Promise.all([
        filtro(sb.from('planes_entreno').select('cliente_id, pauta')),
        filtro(sb.from('planes_nutricion').select('cliente_id, pauta')),
        filtro(sb.from('registro_entreno').select('cliente_id, semana, datos').gte('semana', desde)),
        filtro(sb.from('registro_nutricion').select('cliente_id, semana, datos').gte('semana', desde)),
      ]);
      const fallo = [pe, pn, re, rn].find((x) => x.error);
      if (fallo) throw errorDe(fallo.error);
      const r = {};
      const de = (id) => (r[id] = r[id] || { ent: {}, nut: {} });
      for (const f of pe.data) de(f.cliente_id).ent.pauta = f.pauta;
      for (const f of pn.data) de(f.cliente_id).nut.pauta = f.pauta;
      for (const [id, f] of Object.entries(ultimoPorCliente(re.data))) Object.assign(de(id).ent, { semana: f.semana, registro: f.datos });
      for (const [id, f] of Object.entries(ultimoPorCliente(rn.data))) Object.assign(de(id).nut, { semana: f.semana, registro: f.datos });
      return r;
    },

    // Profesional: guarda la pauta de su área. Si el servidor no deja (otra área), avisa.
    async guardarPauta(area, clienteId, pauta) {
      const { data, error } = await sb.from(tablas(area).pauta).update({ pauta }).eq('cliente_id', clienteId).select('cliente_id');
      if (error) throw errorDe(error);
      if (!data || !data.length) throw new ErrorServidor('No tienes permiso para cambiar este plan.');
    },

    // Cliente: guarda lo que ha apuntado esta semana
    async guardarRegistro(area, clienteId, semana, datos) {
      if (!SEMANA.test(semana)) throw new ErrorServidor('Semana no válida.');
      const { error } = await sb.from(tablas(area).registro)
        .upsert({ cliente_id: clienteId, semana, datos }, { onConflict: 'cliente_id,semana' });
      if (error) throw errorDe(error);
    },

    // Avisa con el id del cliente cuando cambia su pauta o su registro (lo que se puede ver)
    escuchar(alCambiar) {
      const aviso = (p) => { const id = (p.new && p.new.cliente_id) || (p.old && p.old.cliente_id); if (id) alCambiar(id); };
      let canal = sb.channel('planes-y-registros');
      for (const t of ['planes_entreno', 'planes_nutricion', 'registro_entreno', 'registro_nutricion']) {
        canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aviso);
      }
      canal.subscribe();
      return () => { sb.removeChannel(canal); };
    },
  };
}
