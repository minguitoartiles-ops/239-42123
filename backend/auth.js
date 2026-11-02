// Inicio de sesión de los profesionales con Supabase Auth.
// No conoce la pantalla: recibe el cliente de Supabase y devuelve promesas.

const MENSAJES = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Esta cuenta aún no está confirmada.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  user_banned: 'Esta cuenta está bloqueada.',
};

export class ErrorAcceso extends Error {}

function mensajeDe(e) {
  if (!e) return 'No se ha podido entrar. Inténtalo de nuevo.';
  if (e.code && MENSAJES[e.code]) return MENSAJES[e.code];
  if (e.status === 429) return MENSAJES.over_request_rate_limit;
  if (e.name === 'AuthRetryableFetchError' || e instanceof TypeError) {
    return 'Sin conexión con el servidor. Comprueba internet y vuelve a probar.';
  }
  return 'No se ha podido entrar. Inténtalo de nuevo.';
}

export function crearAuth(sb) {
  // ¿Qué papel tiene en el equipo la cuenta con sesión? Lo responde el servidor.
  async function miPapel(userId) {
    const { data, error } = await sb.from('equipo').select('nombre, rol').eq('user_id', userId).maybeSingle();
    if (error) throw new ErrorAcceso('No se ha podido comprobar tu cuenta. Inténtalo de nuevo.');
    return data;   // null si no es del equipo
  }

  return {
    // Correo y contraseña → { nombre, rol, email } si es del equipo
    async entrar(email, password) {
      const correo = String(email || '').trim().toLowerCase();
      if (!correo || !password) throw new ErrorAcceso('Escribe tu correo y tu contraseña.');
      const { data, error } = await sb.auth.signInWithPassword({ email: correo, password });
      if (error || !data?.user) throw new ErrorAcceso(mensajeDe(error));
      const papel = await miPapel(data.user.id);
      if (!papel) {
        await sb.auth.signOut({ scope: 'local' });
        throw new ErrorAcceso('Esta cuenta no es de un profesional del equipo.');
      }
      return { nombre: papel.nombre, rol: papel.rol, email: data.user.email };
    },

    // Cierra la sesión en este dispositivo (y borra el token guardado)
    async salir() {
      try { await sb.auth.signOut({ scope: 'local' }); } catch { /* sin conexión: se borra igualmente en local */ }
    },
  };
}
