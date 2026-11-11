// Inicio de sesión de los profesionales y de los clientes con Supabase Auth.
// No conoce la pantalla: recibe el cliente de Supabase y devuelve promesas.

const MENSAJES = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Esta cuenta aún no está confirmada.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  user_banned: 'Esta cuenta está bloqueada.',
};

export class ErrorAcceso extends Error {}

// 11/11/2026 · Verificación en dos pasos (TOTP). Si la cuenta la tiene activa, después de la contraseña
// hace falta el código de 6 cifras de la app del móvil. pedirCodigo(error?) lo pide en pantalla y
// devuelve el código, o null si la persona cancela. Hasta superarlo, el servidor no le deja ver nada.
async function segundoPaso(sb, pedirCodigo) {
  const { data: nivel, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new ErrorAcceso('No se ha podido comprobar tu cuenta. Inténtalo de nuevo.');
  if (!nivel || nivel.nextLevel !== 'aal2' || nivel.currentLevel === 'aal2') return;
  const { data: f } = await sb.auth.mfa.listFactors();
  const factor = (f?.totp || []).find((x) => x.status === 'verified');
  if (!factor || typeof pedirCodigo !== 'function') {
    await sb.auth.signOut({ scope: 'local' });
    throw new ErrorAcceso('Esta cuenta tiene la verificación en dos pasos y no se ha podido pedir el código.');
  }
  let aviso = '';
  for (let intento = 0; intento < 5; intento++) {
    const codigo = await pedirCodigo(aviso);
    if (codigo == null) {
      await sb.auth.signOut({ scope: 'local' });
      throw new ErrorAcceso('Entrada cancelada.');
    }
    const limpio = String(codigo).replace(/\D/g, '');
    if (limpio.length !== 6) { aviso = 'El código tiene 6 cifras.'; continue; }
    const { error: e } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: limpio });
    if (!e) return;
    aviso = e.status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'Código incorrecto o caducado. Mira el que sale ahora en tu app.';
  }
  await sb.auth.signOut({ scope: 'local' });
  throw new ErrorAcceso('Demasiados códigos incorrectos. Vuelve a entrar.');
}

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
    const { data, error } = await sb.from('equipo').select('nombre, rol, admin').eq('user_id', userId).maybeSingle();
    if (error) throw new ErrorAcceso('No se ha podido comprobar tu cuenta. Inténtalo de nuevo.');
    return data;   // null si no es del equipo
  }

  return {
    // Correo y contraseña → { nombre, rol, email } si es del equipo
    async entrar(email, password, pedirCodigo) {
      const correo = String(email || '').trim().toLowerCase();
      if (!correo || !password) throw new ErrorAcceso('Escribe tu correo y tu contraseña.');
      const { data, error } = await sb.auth.signInWithPassword({ email: correo, password });
      if (error || !data?.user) throw new ErrorAcceso(mensajeDe(error));
      await segundoPaso(sb, pedirCodigo);
      const papel = await miPapel(data.user.id);
      if (!papel) {
        await sb.auth.signOut({ scope: 'local' });
        throw new ErrorAcceso('Esta cuenta no es de un profesional del equipo.');
      }
      return { nombre: papel.nombre, rol: papel.rol, admin: !!papel.admin, email: data.user.email };
    },

    // Correo y contraseña → { id, nombre } de su ficha, si es un cliente con acceso
    async entrarCliente(email, password, pedirCodigo) {
      const correo = String(email || '').trim().toLowerCase();
      if (!correo || !password) throw new ErrorAcceso('Escribe tu correo y tu contraseña.');
      const { data, error } = await sb.auth.signInWithPassword({ email: correo, password });
      if (error || !data?.user) throw new ErrorAcceso(mensajeDe(error));
      await segundoPaso(sb, pedirCodigo);
      let papel;
      try { papel = await miPapel(data.user.id); } catch (e) { await sb.auth.signOut({ scope: 'local' }); throw e; }
      if (papel) {
        await sb.auth.signOut({ scope: 'local' });
        throw new ErrorAcceso('Esta cuenta es de un profesional: entra por «Acceso profesionales».');
      }
      const { data: ficha, error: e } = await sb.from('clientes').select('id, nombre')
        .eq('user_id', data.user.id).maybeSingle();
      if (e || !ficha) {
        await sb.auth.signOut({ scope: 'local' });
        throw new ErrorAcceso(e ? 'No se ha podido comprobar tu cuenta. Inténtalo de nuevo.'
          : 'Esta cuenta no tiene acceso ahora mismo. Si crees que es un error, habla con tu entrenador.');
      }
      return { id: ficha.id, nombre: ficha.nombre };
    },

    // Una sola entrada para todos: correo y contraseña → { tipo: 'pro', nombre, rol } o { tipo: 'cliente', id, nombre }
    async entrarCualquiera(email, password, pedirCodigo) {
      const correo = String(email || '').trim().toLowerCase();
      if (!correo || !password) throw new ErrorAcceso('Escribe tu correo y tu contraseña.');
      const { data, error } = await sb.auth.signInWithPassword({ email: correo, password });
      if (error || !data?.user) throw new ErrorAcceso(mensajeDe(error));
      await segundoPaso(sb, pedirCodigo);
      let papel;
      try { papel = await miPapel(data.user.id); } catch (e) { await sb.auth.signOut({ scope: 'local' }); throw e; }
      if (papel) return { tipo: 'pro', nombre: papel.nombre, rol: papel.rol, admin: !!papel.admin, email: data.user.email };
      const { data: ficha, error: e } = await sb.from('clientes').select('id, nombre')
        .eq('user_id', data.user.id).maybeSingle();
      if (e || !ficha) {
        await sb.auth.signOut({ scope: 'local' });
        throw new ErrorAcceso(e ? 'No se ha podido comprobar tu cuenta. Inténtalo de nuevo.'
          : 'Tu cuenta no tiene acceso ahora mismo: puede que tu asesoría esté de baja o lleve tiempo sin pagarse. Habla con Domingo o Fátima.');
      }
      return { tipo: 'cliente', id: ficha.id, nombre: ficha.nombre };
    },

    // 11/11/2026 · Verificación en dos pasos de la propia cuenta
    dosPasos: {
      // ¿La tiene activa? → { activa, factorId }
      async estado() {
        const { data, error } = await sb.auth.mfa.listFactors();
        if (error) throw new ErrorAcceso('No se ha podido comprobar la verificación en dos pasos.');
        const f = (data?.totp || []).find((x) => x.status === 'verified');
        return { activa: !!f, factorId: f ? f.id : null };
      },
      // Empieza a activarla → { factorId, qr (imagen), secreto (para escribirlo a mano) }
      async empezar() {
        const { data: lista } = await sb.auth.mfa.listFactors();
        for (const f of (lista?.all || [])) {
          if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });   // intentos a medias
        }
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Móvil ' + new Date().toISOString().slice(0, 16) });
        if (error || !data?.totp) throw new ErrorAcceso('No se ha podido empezar a activarla. Inténtalo de nuevo.');
        return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
      },
      // La termina con el primer código que da la app
      async confirmar(factorId, codigo) {
        const limpio = String(codigo || '').replace(/\D/g, '');
        if (limpio.length !== 6) throw new ErrorAcceso('El código tiene 6 cifras.');
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: limpio });
        if (error) throw new ErrorAcceso('Código incorrecto o caducado. Prueba con el que sale ahora en la app.');
      },
      // La quita (Supabase exige haber entrado con los dos pasos)
      async quitar(factorId) {
        const { error } = await sb.auth.mfa.unenroll({ factorId });
        if (error) throw new ErrorAcceso('No se ha podido quitar. Cierra sesión, vuelve a entrar con el código y prueba otra vez.');
      },
    },

    // Cierra la sesión en este dispositivo (y borra el token guardado)
    async salir() {
      try { await sb.auth.signOut({ scope: 'local' }); } catch { /* sin conexión: se borra igualmente en local */ }
    },
  };
}
