// Fotos de perfil en Supabase: la del cliente la ven él y el equipo; las del equipo, también sus
// clientes. Cada uno pone, cambia o quita solo la suya (lo deciden las políticas del servidor).
// No conoce la pantalla. Ninguna foto tiene enlace: se descarga con la sesión de quien la pide.
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/;
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX = 300 * 1024;

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor.');
  if (/too large|exceeded the maximum/i.test(msg)) return new ErrorServidor('La foto es demasiado grande.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}

export function crearPerfiles(sb) {
  const yo = async () => {
    const { data } = await sb.auth.getSession();
    const u = data?.session?.user?.id;
    if (!u) throw new ErrorServidor('Sin sesión.');
    return u;
  };
  return {
    // Las fotos que puede ver quien pregunta → [{ user_id, cliente_id, ruta, actualizado }]
    async lista() {
      const { data, error } = await sb.from('fotos_perfil').select('user_id, cliente_id, ruta, actualizado');
      if (error) throw errorDe(error, 'No se han podido traer las fotos de perfil.');
      return data || [];
    },

    // Pone (o cambia) la foto propia. → ruta
    async poner(blob) {
      if (!blob || !blob.size) throw new ErrorServidor('La foto está vacía.');
      if (blob.size > MAX) throw new ErrorServidor('La foto es demasiado grande.');
      const tipo = String(blob.type || '').split(';')[0].toLowerCase();
      if (!TIPOS[tipo]) throw new ErrorServidor('Esa imagen no se puede usar.');
      const u = await yo();
      const ruta = `${u}/${crypto.randomUUID()}.${TIPOS[tipo]}`;
      const sub = await sb.storage.from('perfiles').upload(ruta, blob, { contentType: tipo, upsert: false, cacheControl: '3600' });
      if (sub.error) throw errorDe(sub.error, 'No se ha podido subir la foto.');
      const { error } = await sb.from('fotos_perfil').upsert({ user_id: u, ruta }, { onConflict: 'user_id' });
      if (error) throw errorDe(error, 'No se ha podido guardar la foto.');
      return ruta;
    },

    // Quita la foto propia (el archivo lo borra la limpieza diaria)
    async quitar() {
      const u = await yo();
      const { error } = await sb.from('fotos_perfil').upsert({ user_id: u, ruta: null }, { onConflict: 'user_id' });
      if (error) throw errorDe(error, 'No se ha podido quitar la foto.');
    },

    // Descarga una foto → Blob
    async descargar(ruta) {
      if (!RUTA.test(String(ruta || ''))) throw new ErrorServidor('Foto no válida.');
      const { data, error } = await sb.storage.from('perfiles').download(ruta);
      if (error || !data) throw errorDe(error, 'No se ha podido descargar la foto.');
      return data;
    },

    // Avisa cuando alguien pone, cambia o quita su foto: alCambiar(fila)
    escuchar(alCambiar) {
      const canal = sb.channel('fotos_perfil')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fotos_perfil' }, (p) => {
          const f = p.new && Object.keys(p.new).length ? p.new : null;
          if (f && UUID.test(String(f.user_id || ''))) alCambiar(f);
        })
        .subscribe();
      return () => { sb.removeChannel(canal); };
    },
  };
}
