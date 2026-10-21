/* =========================================================
   Fitness sin Dramas — Términos y condiciones del servicio (21/10/2026)
   Texto de Domingo («Condiciones_servicio_Fitnessindrama.pdf») adaptado a la app:
   el chat y el seguimiento son de la app (antes Telegram y Google Drive), 7 días de gracia,
   borrado del perfil a los 15 días sin pagar y solo mayores de 18 años.
   Se consultan en Ajustes → Privacidad y desde el consentimiento del primer acceso.
   ========================================================= */
const LEGAL_TERMINOS =
  '<p class="legal-meta">Última actualización: 21 de octubre de 2026 · ' + TITULAR.marca + ' · ' + TITULAR.correo + '</p>'
+ '<p class="legal-aviso">Puedes consultar estos términos en cualquier momento en la app (Ajustes → Privacidad → Términos y condiciones). Al realizar el pago se entiende que has leído y aceptado estos términos y condiciones.</p>'
+ '<h4>1. El servicio</h4>'
+ '<ul><li>Una vez informado del método de trabajo y hecho el pago de la suscripción al plan que corresponda, el plan se enviará como máximo en 48 h, pudiendo retrasarse hasta 72 h en caso de excesiva demanda.</li>'
+ '<li>El seguimiento se realizará cada lunes, semanalmente, desde el formulario de seguimiento de la app, de cara a realizar los cambios necesarios para el adecuado progreso del cliente. Si el cliente no es responsable con su seguimiento, no nos hacemos cargo de un progreso ineficiente.</li>'
+ '<li>Las modificaciones del plan no serán necesarias en cada revisión: se harán cuando las consideremos necesarias en base a la progresión y el feedback del cliente.</li>'
+ '<li>Las dudas se resolverán a través del chat de la app. Horario de respuesta en días laborables (lunes a viernes), con mayor disponibilidad por la mañana. No se contestarán dudas fuera del horario laboral.</li>'
+ '<li>El plan proporcionado es una guía complementaria del éxito final. El cliente es sujeto activo de su progreso. Si en algún momento falla en su responsabilidad de dar la información necesaria que se pide en los seguimientos semanales para desarrollar el servicio con eficacia, podremos desistir del servicio y de toda comunicación con el cliente.</li></ul>'
+ '<h4>2. Pagos, impagos y bajas</h4>'
+ '<ul><li>Los pagos deben hacerse en tiempo y forma conforme a la duración de la suscripción contratada.</li>'
+ '<li>Si el pago se retrasa, hay un periodo de gracia de <b>7 días</b>. Pasado ese plazo sin pagar, se suspenden el acceso a la app, el servicio y el soporte online.</li>'
+ '<li>Desde ese momento guardamos los datos del cliente <b>15 días</b>. Si en ese tiempo sigue sin pagar, <b>su perfil se borra</b> (plan, seguimientos, conversación y fotos), salvo los datos que la ley nos obliga a conservar, como las facturas.</li>'
+ '<li>Una vez el cliente se da de baja, deja de tener acceso al servicio y a la app.</li>'
+ '<li>No se aceptan devoluciones una vez realizado el pago y enviados los planes de nutrición y entrenamiento. En caso de abandonar la preparación no se devolverá el importe de la cuota.</li>'
+ '<li>En caso de cancelación o anulación del pago por parte del banco, el usuario quedará inactivo en las asesorías.</li>'
+ '<li>' + 'Fitnessindramas no se responsabiliza de los gastos de gestión de la entidad bancaria del asesorado al realizar el pago, ni de posibles errores en el envío de la transferencia por parte del usuario contratante.</li></ul>'
+ '<h4>3. Respeto</h4>'
+ '<p>No toleraremos ninguna falta de respeto que pueda mermar el ambiente de trabajo o la relación profesional-cliente. Si ocurre, desistiremos del servicio de manera unilateral e inmediata, sin opción a reembolso.</p>'
+ '<h4>4. Salud y responsabilidad</h4>'
+ '<ul><li>El servicio está dirigido <b>exclusivamente a personas mayores de 18 años</b>.</li>'
+ '<li>La existencia de patologías o lesiones debe ser informada por el cliente, ya sea en el cuestionario proporcionado o antes de comenzar las asesorías.</li>'
+ '<li>En casos de patologías específicas (insuficiencias cardiacas, problemas endocrinos asociados, problemas de índole biomecánica, comorbilidades graves…) se debe acudir o seguir las pautas de un especialista.</li>'
+ '<li>No prestamos servicios médicos: no interpretamos analíticas, no prescribimos medicamentos ni fomentamos su uso.</li>'
+ '<li>Trabajamos con los datos que nos proporciona el cliente, que es responsable de su veracidad; nos ajustaremos a la información proporcionada.</li>'
+ '<li>No nos responsabilizamos de una mala ejecución de los ejercicios ni de posibles lesiones. Recomendamos encarecidamente mandar vídeos por el chat para comprobar la técnica en caso de duda, molestias, dolencias u otras cuestiones.</li>'
+ '<li>Queda bajo responsabilidad del cliente tomar o no los suplementos recomendados, siempre dentro del marco legal y con resultados basados en la evidencia científica.</li>'
+ '<li>No nos hacemos responsables del uso de sustancias no pautadas o no consultadas previamente con nosotros, ni de productos, servicios o tratamientos que se consuman sin nuestra recomendación o supervisión.</li>'
+ '<li>Fitnessindramas no vende, distribuye ni fomenta el consumo de sustancias de la lista de la AMA (WADA) que puedan considerarse dopaje. Si el cliente decide usarlas, queda bajo su responsabilidad y no nos haremos cargo de los posibles daños a corto, medio o largo plazo. Si tenemos conocimiento de ello, Fitnessindramas podrá interrumpir el servicio, sin derecho a abono de la parte pendiente, limitándose a informar al cliente sobre la sustancia y sus perjuicios y a recomendarle que deje de consumirla de inmediato.</li></ul>'
+ '<h4>5. Resultados</h4>'
+ '<p>Fitnessindramas no es responsable de los resultados de los planes, ya que dependen en mayor medida de la implicación del cliente que contrata las asesorías, ni del cumplimiento de los planes de asesoramiento.</p>'
+ '<h4>6. Protección de datos</h4>'
+ '<p>Tratamos tus datos personales, incluidos los de salud, para prestarte el servicio y con las medidas de seguridad adecuadas. Quién es el responsable, qué datos tratamos, para qué, cuánto tiempo los guardamos y cómo ejercer tus derechos está explicado en la <a class="lnk" href="#" onclick="abrirLegal(\'privacidad\');return false;">política de privacidad</a>.</p>';

/* abrir los términos con el mismo visor que las demás políticas */
abrirLegal = (function(orig){
  return function(tipo){
    if (tipo !== 'terminos') return orig.apply(this, arguments);
    document.getElementById('legalTitulo').textContent = 'Términos y condiciones';
    document.getElementById('legalCuerpo').innerHTML = LEGAL_TERMINOS;
    const ov = document.getElementById('legalOverlay'); ov.classList.add('show');
    const s = ov.querySelector('.fsd-sheet'); if (s) s.scrollTop = 0;
  };
})(abrirLegal);

/* fila «Términos y condiciones» junto a las políticas en Ajustes (cliente y profesionales) */
function tcFilaAjustes(){
  ['ajustesCliente', 'ajustesCoach'].forEach(function(id){
    const c = document.getElementById(id); if (!c || c.querySelector('.tc-fila')) return;
    const priv = Array.prototype.filter.call(c.querySelectorAll('.list-row'), function(r){ return /Política de privacidad/.test(r.textContent); })[0];
    if (!priv) return;
    const f = priv.cloneNode(true);
    f.classList.add('tc-fila');
    f.setAttribute('onclick', "abrirLegal('terminos')");
    const sp = f.querySelector('span'); if (sp) sp.textContent = 'Términos y condiciones';
    priv.parentNode.insertBefore(f, priv);
  });
}
if (typeof renderAjustes === 'function') renderAjustes = (function(orig){ return function(){ const r = orig.apply(this, arguments); tcFilaAjustes(); return r; }; })(renderAjustes);
if (typeof refrescarAjustes === 'function') refrescarAjustes = (function(orig){ return function(){ const r = orig.apply(this, arguments); tcFilaAjustes(); return r; }; })(refrescarAjustes);

/* primer acceso del cliente: el consentimiento enlaza también los términos */
(function(){
  const cs = document.getElementById('consentSalud'); if (!cs) return;
  const ok = document.getElementById('csOk'); if (!ok) return;
  const p = document.createElement('p'); p.className = 'cs-terminos';
  p.innerHTML = 'Al continuar aceptas los <a class="lnk" href="#" onclick="abrirLegal(\'terminos\');return false;">términos y condiciones</a> del servicio.';
  const fila = ok.closest('.btn-row') || ok.parentNode;
  fila.parentNode.insertBefore(p, fila);
})();
/* pantalla de inicio: enlace junto a las políticas */
(function(){
  const a = document.querySelector('a[onclick*="abrirLegal(\'privacidad\')"]');
  if (a && a.parentNode && a.parentNode.tagName === 'P' && !a.parentNode.querySelector('.tc-link')) {
    a.insertAdjacentHTML('afterend', ' · <a class="lnk tc-link" href="#" onclick="abrirLegal(\'terminos\');return false;">Términos y condiciones</a>');
  }
})();
