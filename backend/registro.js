// 11/11/2026 · Registro de actividad, roles y permisos del equipo, y derechos RGPD de los clientes.
// No conoce la pantalla. Lo que se puede hacer lo decide el servidor (ver la migración del 11/11).
import { ErrorServidor } from './clientes.js';

const ROLES = ['entrenador', 'dietista'];
const DERECHOS = ['acceso', 'rectificacion', 'supresion', 'oposicion', 'limitacion', 'portabilidad'];
const ESTADOS = ['pendiente', 'en_curso', 'resuelta', 'denegada'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorDe(e, generico) {
  const msg = String((e && e.message) || '');
  if (/fetch|network|Failed to fetch|Load failed/i.test(msg)) return new ErrorServidor('Sin conexión con el servidor. Comprueba internet y vuelve a probar.');
  if (e && e.code === '42501') return new ErrorServidor(/[a-záéíóúñ]/i.test(msg) && msg.length < 120 ? msg : 'No tienes permiso para esto.');
  if (e && (e.code === '23514' || e.code === '22023' || e.code === '54000') && msg.length < 120) return new ErrorServidor(msg);
  return new ErrorServidor(generico || 'No se ha podido completar. Inténtalo de nuevo.');
}

export function crearRegistro(sb) {
  return {
    // Solo el administrador: [{ id, fecha, quien_nombre, rol, accion, tabla, cliente_nombre, campos, detalle }]
    async actividad(f = {}) {
      const p = { p_limite: Math.min(Math.max(Number(f.limite) || 200, 1), 1000) };
      if (f.desde) p.p_desde = f.desde;
      if (f.hasta) p.p_hasta = f.hasta;
      if (f.accion) p.p_accion = String(f.accion).slice(0, 40);
      if (f.cliente && UUID.test(f.cliente)) p.p_cliente = f.cliente;
      if (f.quien && UUID.test(f.quien)) p.p_quien = f.quien;
      const { data, error } = await sb.rpc('registro_actividad', p);
      if (error) throw errorDe(error, 'No se ha podido traer el registro de actividad.');
      return data || [];
    },
    // El equipo: [{ user_id, nombre, rol, admin, activo, dos_pasos, ultimo_acceso }]
    async permisos() {
      const { data, error } = await sb.rpc('permisos_equipo');
      if (error) throw errorDe(error, 'No se han podido traer los permisos.');
      return data || [];
    },
    // Solo el administrador
    async cambiarPermisos(userId, rol, admin, activo) {
      if (!UUID.test(String(userId)) || !ROLES.includes(rol)) throw new ErrorServidor('Permisos no válidos.');
      const { error } = await sb.rpc('cambiar_permisos', { p_user: userId, p_rol: rol, p_admin: !!admin, p_activo: !!activo });
      if (error) throw errorDe(error, 'No se han podido cambiar los permisos.');
    },
    // Apunta en el registro una descarga hecha en el aparato ('mis_datos' o 'copia_completa'). Si falla, no molesta.
    async apuntarDescarga(que) {
      try { await sb.rpc('apuntar_descarga', { p_que: que }); } catch { /* sin conexión */ }
    },
  };
}

export function crearDerechos(sb) {
  return {
    // Las que puede ver quien pregunta (el cliente, las suyas; el equipo, todas)
    async lista() {
      const { data, error } = await sb.from('solicitudes_derechos')
        .select('id, cliente_id, tipo, detalle, estado, respuesta, creada, plazo, resuelta_en, resuelta_por')
        .order('creada', { ascending: false }).limit(500);
      if (error) throw errorDe(error, 'No se han podido traer las solicitudes.');
      return data || [];
    },
    // El cliente ejerce un derecho
    async pedir(tipo, detalle) {
      if (!DERECHOS.includes(tipo)) throw new ErrorServidor('Derecho no válido.');
      const { error } = await sb.from('solicitudes_derechos').insert({ tipo, detalle: String(detalle || '').slice(0, 1000) });
      if (error) throw errorDe(error, 'No se ha podido enviar la solicitud.');
    },
    // El equipo la atiende
    async responder(id, estado, respuesta) {
      if (!UUID.test(String(id)) || !ESTADOS.includes(estado)) throw new ErrorServidor('Respuesta no válida.');
      const { error } = await sb.from('solicitudes_derechos').update({ estado, respuesta: String(respuesta || '').slice(0, 1000) }).eq('id', id);
      if (error) throw errorDe(error, 'No se ha podido guardar la respuesta.');
    },
    // Avisa cuando llega o cambia una: alCambiar()
    escuchar(alCambiar) {
      const canal = sb.channel('solicitudes_derechos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_derechos' }, () => alCambiar())
        .subscribe();
      return () => { sb.removeChannel(canal); };
    },
  };
}
