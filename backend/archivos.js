// Fotos y notas de voz en Supabase Storage (carpetas privadas, una por cliente).
// No conoce la pantalla. Quién sube y ve qué lo deciden las políticas del servidor; aquí se
// comprueba antes lo mismo para no gastar una subida en algo que el servidor va a rechazar.
// Ningún archivo tiene enlace: se descarga con la sesión de quien lo pide.
import { ErrorServidor } from './clientes.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CARPETAS = {
  fotos:  { max: 5 * 1024 * 1024, tipos: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } },
  audios: { max: 3 * 1024 * 1024, tipos: { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/aac': 'aac' } },
};
const RUTA = {
  fotos:  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/,
  audios: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{1,64}\.(webm|m4a|mp4|mp3|ogg|aac)$/,
};

function carpetaDe(c) {
  if (!CARPETAS[c]) throw new ErrorServidor('Carpeta no válida.');
  return CARPETAS[c];
}
export function rutaValida(carpeta, ruta) {
  return !!RUTA[carpeta] && RUTA[carpeta].test(String(ruta || ''));
}
function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  const estado = String((e && (e.statusCode || e.status)) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor.');
  if (estado === '413' || /too large|exceeded the maximum/i.test(msg)) return new ErrorServidor('El archivo es demasiado grande.');
  if (/mime|content type/i.test(msg)) return new ErrorServidor('Ese tipo de archivo no se puede enviar.');
  if (estado === '403' || /row-level security|unauthorized/i.test(msg)) {
    return new ErrorServidor('No se ha podido subir el archivo. Si has enviado muchos hoy, prueba mañana.');
  }
  if (estado === '404' || /not found/i.test(msg)) return new ErrorServidor('Este archivo ya no está disponible.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}

export function crearArchivos(sb) {
  return {
    // Sube un archivo a la carpeta del cliente con el nombre que da la app (su id).
    // Reintentar con el mismo id no lo duplica. → ruta («<cliente_id>/<id>.<ext>»)
    async subir(carpeta, clienteId, nombre, blob) {
      const c = carpetaDe(carpeta);
      if (!UUID.test(String(clienteId || ''))) throw new ErrorServidor('Cliente no válido.');
      if (!UUID.test(String(nombre || ''))) throw new ErrorServidor('Archivo no válido.');
      if (!blob || typeof blob.size !== 'number' || !blob.size) throw new ErrorServidor('El archivo está vacío.');
      if (blob.size > c.max) throw new ErrorServidor('El archivo es demasiado grande.');
      const tipo = String(blob.type || '').split(';')[0].trim().toLowerCase();
      const ext = c.tipos[tipo];
      if (!ext) throw new ErrorServidor('Ese tipo de archivo no se puede enviar.');
      const ruta = `${clienteId.toLowerCase()}/${nombre.toLowerCase()}.${ext}`;
      const { error } = await sb.storage.from(carpeta).upload(ruta, blob, { contentType: tipo, upsert: false, cacheControl: '3600' });
      if (error && !/already exists|duplicate/i.test(String(error.message || '')) && String(error.statusCode || '') !== '409') {
        throw errorDe(error, 'No se ha podido subir el archivo.');
      }
      return ruta;
    },

    // Descarga un archivo (con la sesión de quien lo pide) → Blob
    async descargar(carpeta, ruta) {
      carpetaDe(carpeta);
      if (!rutaValida(carpeta, ruta)) throw new ErrorServidor('Archivo no válido.');
      const { data, error } = await sb.storage.from(carpeta).download(ruta);
      if (error || !data) throw errorDe(error, 'No se ha podido descargar el archivo.');
      return data;
    },

    // Quita un archivo propio (al eliminar un mensaje). Si falla, lo borra la limpieza diaria.
    async quitar(carpeta, ruta) {
      carpetaDe(carpeta);
      if (!rutaValida(carpeta, ruta)) return;
      const { error } = await sb.storage.from(carpeta).remove([ruta]);
      if (error) throw errorDe(error, 'No se ha podido borrar el archivo.');
    },
  };
}
