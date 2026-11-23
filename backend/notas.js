// 23/11/2026 · «Mis notas» de los profesionales: agenda personal del Inicio.
// No conoce la pantalla. Quién ve qué lo decide el servidor (cada uno solo las suyas).
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNAS = 'id, texto, fecha, hecha, creada';

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (e && e.code === '54000' && msg.length < 120) return new ErrorServidor(msg);
  if (e && (e.code === '42501' || /row-level security/i.test(msg))) return new ErrorServidor('No tienes permiso para esto.');
  if (e && (e.code === '23514' || e.code === '22007' || e.code === '22008')) return new ErrorServidor('La nota está vacía o tiene algún dato no válido.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}
function texto(t) {
  const x = String(t || '').trim();
  if (!x) throw new ErrorServidor('Escribe algo en la nota.');
  if (x.length > 500) throw new ErrorServidor('La nota es demasiado larga (máximo 500 caracteres).');
  return x;
}
function fecha(f) {
  if (f == null || f === '') return null;
  if (!FECHA.test(String(f))) throw new ErrorServidor('Fecha no válida.');
  return String(f);
}
function id(x) {
  if (!UUID.test(String(x || ''))) throw new ErrorServidor('Nota no válida.');
  return x;
}

export function crearNotas(sb) {
  return {
    // Las mías: [{ id, texto, fecha, hecha, creada }]
    async lista() {
      const { data, error } = await sb.from('notas_equipo').select(COLUMNAS).order('creada', { ascending: false }).limit(500);
      if (error) throw errorDe(error, 'No se han podido traer tus notas.');
      return data || [];
    },
    async nueva(t, f) {
      const { data, error } = await sb.from('notas_equipo').insert({ texto: texto(t), fecha: fecha(f) }).select(COLUMNAS).single();
      if (error) throw errorDe(error, 'No se ha podido guardar la nota.');
      return data;
    },
    // cambios: { texto?, fecha?, hecha? }
    async cambiar(nid, cambios = {}) {
      const c = {};
      if ('texto' in cambios) c.texto = texto(cambios.texto);
      if ('fecha' in cambios) c.fecha = fecha(cambios.fecha);
      if ('hecha' in cambios) c.hecha = !!cambios.hecha;
      const { data, error } = await sb.from('notas_equipo').update(c).eq('id', id(nid)).select('id');
      if (error) throw errorDe(error, 'No se ha podido cambiar la nota.');
      if (!data || !data.length) throw new ErrorServidor('Esa nota ya no existe.');
    },
    async borrar(nid) {
      const { error } = await sb.from('notas_equipo').delete().eq('id', id(nid));
      if (error) throw errorDe(error, 'No se ha podido borrar la nota.');
    },
  };
}
