// Chat en Supabase: mensajes, mensaje fijado, dudas entre profesionales y «leído hasta aquí».
// No conoce la pantalla. Quién lee y escribe qué lo deciden las políticas RLS y los triggers
// del servidor (autor, fecha, límites); aquí solo se pide lo necesario.
import { ErrorServidor } from './clientes.js';
import { rutaValida } from './archivos.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS = 'id, cliente_id, autor, lado, tipo, texto, archivo_ruta, duracion, cita_de, eliminado, fecha, reenviado, etiqueta';
const MAX_MENSAJES = 500;              // los últimos de cada chat

function id(x, que) {
  if (!UUID.test(String(x || ''))) throw new ErrorServidor(que + ' no válido.');
  return x;
}
// Los errores que lanza el servidor a propósito ya traen un texto para enseñar
function errorDe(e, generico) {
  const msg = (e && e.message) || '';
  if (e && e.code === '54000') return new ErrorServidor(msg.slice(0, 200));
  if (e && e.code === '23514' && !/violates|constraint/i.test(msg)) return new ErrorServidor(msg.slice(0, 200));
  if (e && (e.code === '42501' || /row-level security/i.test(msg))) return new ErrorServidor('No tienes permiso para hacer esto en este chat.');
  if (e && (e.code === '23514' || e.code === '22P02' || e.code === '22001')) return new ErrorServidor('El mensaje es demasiado largo o tiene algún dato no válido.');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor.');
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}
export const sinConexion = (e) => e instanceof ErrorServidor && /^Sin conexión/.test(e.message);

export function crearChat(sb) {
  return {
    // Quién soy (id de la cuenta con sesión)
    async yo() {
      const { data } = await sb.auth.getSession();
      return data?.session?.user?.id || null;
    },

    // Nombre y papel de Domingo y Fátima (para saber quién escribe cada mensaje)
    async equipo() {
      const { data, error } = await sb.rpc('nombres_equipo');
      if (error) throw errorDe(error);
      return data || [];
    },

    // Lista de chats: último mensaje, sin leer y desde cuándo espera respuesta
    async resumen() {
      const { data, error } = await sb.rpc('resumen_chats');
      if (error) throw errorDe(error);
      return data || [];
    },

    // Un chat entero: { mensajes, fijado, dudas, leidoHasta }
    async traer(clienteId) {
      id(clienteId, 'Chat');
      const [m, f, d, l] = await Promise.all([
        sb.from('mensajes').select(COLUMNAS).eq('cliente_id', clienteId).order('fecha', { ascending: false }).order('id').limit(MAX_MENSAJES),
        sb.from('chat_fijado').select('mensaje_id, por, fecha').eq('cliente_id', clienteId).maybeSingle(),
        sb.from('dudas').select('id, mensaje_id, de, para, estado, creada, cerrada_por, cerrada_en').eq('cliente_id', clienteId),
        sb.from('chat_lecturas').select('hasta').eq('cliente_id', clienteId).maybeSingle(),
      ]);
      const fallo = [m, f, d, l].find((x) => x.error);
      if (fallo) throw errorDe(fallo.error, 'No se ha podido cargar el chat.');
      return {
        mensajes: (m.data || []).reverse(),
        fijado: f.data && f.data.mensaje_id ? f.data : null,
        dudas: d.data || [],                // el cliente recibe siempre una lista vacía
        leidoHasta: l.data ? l.data.hasta : null,
      };
    },

    // Enviar. El id lo pone la app: si se reintenta sin conexión, el servidor no lo duplica.
    // Foto o nota de voz: primero se sube el archivo (archivos.subir) y aquí va su ruta.
    async enviar({ id: mid, clienteId, texto, citaDe, reenviado, etiqueta, lado, tipo, archivoRuta, duracion }) {
      id(mid, 'Mensaje'); id(clienteId, 'Chat');
      if (citaDe) id(citaDe, 'Mensaje citado');
      const fila = { id: mid, cliente_id: clienteId, lado, tipo: 'texto' };
      if (tipo === 'foto' || tipo === 'audio') {
        if (!rutaValida(tipo === 'foto' ? 'fotos' : 'audios', archivoRuta) || !archivoRuta.startsWith(clienteId.toLowerCase() + '/')) {
          throw new ErrorServidor('Archivo no válido.');
        }
        fila.tipo = tipo; fila.archivo_ruta = archivoRuta;
        if (tipo === 'audio') {
          const d = Math.round(Number(duracion));
          if (!(d >= 1 && d <= 120)) throw new ErrorServidor('La nota de voz dura como mucho 2 minutos.');
          fila.duracion = d;
        }
      } else if (tipo && tipo !== 'texto') {
        throw new ErrorServidor('Tipo de mensaje no válido.');
      } else {
        const t = String(texto || '').trim();
        if (!t) throw new ErrorServidor('El mensaje está vacío.');
        if (t.length > 4000) throw new ErrorServidor('El mensaje es demasiado largo (máximo 4000 caracteres).');
        fila.texto = t;
      }
      if (citaDe) fila.cita_de = citaDe;
      if (reenviado) fila.reenviado = true;
      if (etiqueta) fila.etiqueta = etiqueta;
      const { error } = await sb.from('mensajes').insert(fila);
      if (error && error.code !== '23505') throw errorDe(error, 'No se ha podido enviar el mensaje.');
    },

    // «Mensaje eliminado»: solo el autor
    async vaciar(mid) {
      id(mid, 'Mensaje');
      const { data, error } = await sb.from('mensajes').update({ eliminado: true, texto: null, archivo_ruta: null })
        .eq('id', mid).select('id');
      if (error) throw errorDe(error, 'No se ha podido eliminar el mensaje.');
      if (!data || !data.length) throw new ErrorServidor('Solo puedes eliminar tus propios mensajes.');
    },

    // Fijar (o quitar con mensajeId = null)
    async fijar(clienteId, mensajeId) {
      id(clienteId, 'Chat');
      if (mensajeId) id(mensajeId, 'Mensaje');
      const { error } = await sb.from('chat_fijado')
        .upsert({ cliente_id: clienteId, mensaje_id: mensajeId || null }, { onConflict: 'cliente_id' });
      if (error) throw errorDe(error, 'No se ha podido fijar el mensaje.');
    },

    // Dudas entre profesionales
    async nuevaDuda(clienteId, mensajeId, para) {
      id(clienteId, 'Chat'); id(mensajeId, 'Mensaje'); id(para, 'Profesional');
      const { error } = await sb.from('dudas').insert({ cliente_id: clienteId, mensaje_id: mensajeId, para });
      if (error && error.code === '23505') throw new ErrorServidor('Ese mensaje ya tiene una duda pendiente.');
      if (error) throw errorDe(error, 'No se ha podido enviar la duda.');
    },
    async cerrarDuda(dudaId, estado) {
      id(dudaId, 'Duda');
      if (estado !== 'resuelta' && estado !== 'quitada') throw new ErrorServidor('Estado no válido.');
      const { data, error } = await sb.from('dudas').update({ estado }).eq('id', dudaId).select('id');
      if (error) throw errorDe(error, 'No se ha podido cerrar la duda.');
      if (!data || !data.length) throw new ErrorServidor('Esta duda ya no está pendiente.');
    },

    // Equipo: chats con alguna duda pendiente (para cargarlos y avisar)
    async dudasPendientes() {
      const { data, error } = await sb.from('dudas').select('cliente_id').eq('estado', 'pendiente');
      if (error) throw errorDe(error);
      return [...new Set((data || []).map((x) => x.cliente_id))];
    },

    // «Leído hasta aquí» (el servidor no deja que vaya hacia atrás ni al futuro)
    async leido(clienteId, hasta) {
      id(clienteId, 'Chat');
      const { error } = await sb.from('chat_lecturas')
        .upsert({ cliente_id: clienteId, hasta: hasta || new Date().toISOString(), no_leido: false }, { onConflict: 'user_id,cliente_id' });
      if (error) throw errorDe(error);
    },

    // Equipo: deja el chat como pendiente («marcar como no leído»); al leerlo se quita (no cambia «leído hasta»)
    async noLeido(clienteId) {
      id(clienteId, 'Chat');
      const { error } = await sb.from('chat_lecturas')
        .upsert({ cliente_id: clienteId, no_leido: true }, { onConflict: 'user_id,cliente_id' });
      if (error) throw errorDe(error);
    },

    // Avisa de cualquier cambio en lo que se puede ver: alCambiar(tabla, fila nueva o vieja)
    escuchar(alCambiar, alEstado) {
      let canal = sb.channel('chat');
      for (const t of ['mensajes', 'chat_fijado', 'dudas', 'chat_lecturas']) {
        canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t },
          (p) => alCambiar(t, p.new && Object.keys(p.new).length ? p.new : p.old, p.eventType));
      }
      canal.subscribe((estado) => { if (alEstado) alEstado(estado); });
      return () => { sb.removeChannel(canal); };
    },
  };
}
