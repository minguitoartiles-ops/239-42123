// Fichas de clientes en Supabase. No conoce la pantalla: recibe el cliente de Supabase y
// devuelve promesas. Quién ve y cambia qué lo deciden las políticas RLS del servidor;
// aquí solo se piden las columnas que hacen falta.

export class ErrorServidor extends Error {}

const COLUMNAS = 'id, user_id, nombre, objetivo, email, telefono, estado, baja, fecha_alta, acceso_hasta, '
  + 'programa_semanas, tarifa, precio, inicio_programa';

// Lo único que la app puede cambiar de una ficha (el resto lo cambian funciones del servidor)
const EDITABLES = ['nombre', 'objetivo', 'email', 'telefono', 'programa_semanas', 'inicio_programa'];

const SIN_CONEXION = 'Sin conexión con el servidor. Comprueba internet y vuelve a probar.';
const GENERICO = 'No se ha podido completar. Inténtalo de nuevo.';

// Errores de las funciones del servidor: su mensaje ya está pensado para enseñarse
async function errorDeFuncion(e) {
  if (e && e.name === 'FunctionsFetchError') return new ErrorServidor(SIN_CONEXION);
  try {
    const cuerpo = await e.context.json();
    if (cuerpo && typeof cuerpo.error === 'string') return new ErrorServidor(cuerpo.error.slice(0, 200));
  } catch { /* respuesta sin JSON */ }
  return new ErrorServidor(GENERICO);
}

// Errores de la base de datos al leer o guardar directamente
function errorDeTabla(e) {
  if (!e) return new ErrorServidor(GENERICO);
  if (e.code === '23514' || e.code === '22023' || e.code === '22P02') return new ErrorServidor('Algún dato no es válido. Revísalo.');
  if (e.code === '42501') return new ErrorServidor('No tienes permiso para hacer esto.');
  if (/fetch|network/i.test(e.message || '')) return new ErrorServidor(SIN_CONEXION);
  return new ErrorServidor(GENERICO);
}

export function crearClientes(sb) {
  async function llamar(funcion, cuerpo) {
    const { data, error } = await sb.functions.invoke(funcion, { body: cuerpo });
    if (error) throw await errorDeFuncion(error);
    return data;
  }

  return {
    // Equipo: todas las fichas (también las de baja, hasta que el servidor las borra a los 15 días)
    async listar() {
      const { data, error } = await sb.from('clientes').select(COLUMNAS).order('fecha_alta');
      if (error) throw errorDeTabla(error);
      return data;
    },

    // Avisa (una vez cada medio segundo como mucho) cuando cambia alguna ficha que se puede ver
    escuchar(alCambiar) {
      let t = null;
      const aviso = () => { clearTimeout(t); t = setTimeout(alCambiar, 500); };
      const canal = sb.channel('fichas-clientes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, aviso)
        .subscribe();
      return () => { clearTimeout(t); sb.removeChannel(canal); };
    },

    // Alta: el servidor crea la ficha y devuelve el código (se enseña una sola vez)
    async crear(datos) {
      const r = await llamar('alta-cliente', datos);
      if (!r || typeof r.id !== 'string' || typeof r.codigo !== 'string') throw new ErrorServidor(GENERICO);
      return r;   // { id, codigo, acceso_hasta }
    },

    // Código nuevo para quien aún no tiene cuenta (el anterior deja de valer)
    async nuevoCodigo(id) {
      const r = await llamar('alta-cliente', { cliente_id: id });
      if (!r || typeof r.codigo !== 'string') throw new ErrorServidor(GENERICO);
      return r.codigo;
    },

    async actualizar(id, cambios) {
      const limpio = {};
      for (const k of EDITABLES) if (Object.prototype.hasOwnProperty.call(cambios, k)) limpio[k] = cambios[k];
      if (!Object.keys(limpio).length) return;
      const { error } = await sb.from('clientes').update(limpio).eq('id', id);
      if (error) throw errorDeTabla(error);
    },

    // Cliente: canjea su código y crea su cuenta (después hay que entrar con ella)
    async canjear(codigo, email, password) {
      await llamar('canjear-codigo', { codigo, email: String(email || '').trim().toLowerCase(), password });
    },

    // Cliente con sesión: su propia ficha (null si ahora mismo no tiene acceso)
    async miFicha() {
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return null;
      const { data, error } = await sb.from('clientes').select(COLUMNAS).eq('user_id', u.user.id).maybeSingle();
      if (error) throw errorDeTabla(error);
      return data;
    },
  };
}
