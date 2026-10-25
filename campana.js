/* =========================================================
   Fitnessindramas — Campana de los profesionales (24/10/2026, tarea #206)
   Domingo y Fátima solo reciben en la campana tres cosas:
   · seguimientos enviados por los clientes
   · pagos vencidos (cliente en periodo de gracia o sin acceso)
   · dudas que les marca el compañero en el chat
   El resto (altas, sensaciones, alergias, permisos de imagen, perfiles por borrar…) ya no genera aviso
   y tampoco sale en Ajustes → Notificaciones. Los mensajes del chat siguen contándose en la pestaña Chats.
   ========================================================= */
const CAMPANA_PRO = ['seguimientos', 'pagos', 'duda'];
function cpEsPro(dest){ return typeof dest === 'string' && dest.indexOf('pro:') === 0; }
crearAviso = (function(orig){
  return function(dest, tipo, titulo){
    if (cpEsPro(dest) && tipo !== 'mensajes' && CAMPANA_PRO.indexOf(tipo) < 0) return;
    /* de pagos, solo los vencidos: «le vence hoy» deja de avisar */
    if (cpEsPro(dest) && tipo === 'pagos' && / le vence hoy /.test(' ' + (titulo || '') + ' ')) return;
    return orig.apply(this, arguments);
  };
})(crearAviso);
/* los avisos antiguos de esos tipos dejan de verse en la campana (solo existen tipos de profesional con esos nombres) */
const CP_FUERA = ['altas', 'pendientes', 'sensaciones', 'imagen', 'alergias'];
enCampana = (function(orig){
  return function(x){
    if (!orig(x)) return false;
    if (CP_FUERA.indexOf(x.tipo) > -1) return false;
    if (x.tipo === 'pagos' && /le vence hoy/.test(x.titulo || '')) return false;
    return true;
  };
})(enCampana);
/* Ajustes → Notificaciones del profesional: solo esos tres tipos (más «Mensajes», que no va a la campana) */
tiposDe = (function(orig){
  return function(dest){
    const t = orig(dest);
    return cpEsPro(dest) ? t.filter(function(x){ return x.id === 'mensajes' || CAMPANA_PRO.indexOf(x.id) > -1; }) : t;
  };
})(tiposDe);
