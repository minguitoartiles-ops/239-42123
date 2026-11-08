// Plantillas propias de cada profesional en Supabase (tabla «plantillas»): las de entrenamiento de Domingo y las de
// nutrición de Fátima. Cada uno ve y gestiona solo las suyas (lo decide el servidor). Nada se borra: se archivan.
// No conoce la pantalla: la app le pasa y le pide objetos.
import { ErrorServidor } from './clientes.js';

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (/size|too large|check constraint/i.test(msg)) return new ErrorServidor('La plantilla es demasiado grande.');
  return new ErrorServidor(generico || 'No se han podido guardar las plantillas. Inténtalo de nuevo.');
}

export function crearPlantillas(sb) {
  return {
    // Las mías → [{ id, area, nombre, contenido, archivada, actualizada }]
    async lista() {
      const { data, error } = await sb.from('plantillas').select('id, area, nombre, contenido, archivada, actualizada').limit(2000);
      if (error) throw errorDe(error, 'No se han podido traer las plantillas.');
      return data || [];
    },
    // Crea una plantilla nueva (el servidor pone de quién es y comprueba que sea de tu área)
    async crear(area, nombre, contenido) {
      const { data, error } = await sb.from('plantillas').insert({ area, nombre, contenido }).select('id, actualizada').single();
      if (error) throw errorDe(error);
      return data;
    },
    // Cambia el contenido de una existente (y la desarchiva si estaba archivada)
    async cambiar(id, contenido) {
      const { error } = await sb.from('plantillas').update({ contenido, archivada: false }).eq('id', id);
      if (error) throw errorDe(error);
    },
    // «Borrar»: se archiva
    async archivar(id) {
      const { error } = await sb.from('plantillas').update({ archivada: true }).eq('id', id);
      if (error) throw errorDe(error);
    },
  };
}
