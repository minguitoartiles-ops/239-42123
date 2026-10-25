/* =========================================================
   Fitnessindramas — Licencia de uso de la app (EULA) · 25/10/2026 (#229)
   Protege el código, el diseño, la marca y los contenidos (planes, recetas, protocolos).
   Se consulta en Ajustes → Privacidad, en la pantalla de inicio y desde el consentimiento del primer acceso.
   Texto base: conviene que lo revise un abogado antes del lanzamiento.
   ========================================================= */
const LEGAL_LICENCIA =
  '<p class="legal-meta">Última actualización: 25 de octubre de 2026 · ' + TITULAR.marca + ' · ' + TITULAR.correo + '</p>'
+ '<p class="legal-aviso">Esta licencia regula el uso de la app ' + TITULAR.marca + '. Al instalarla, abrirla o usarla aceptas estas condiciones. Si no estás de acuerdo, no la uses.</p>'
+ '<h4>1. Titularidad</h4>'
+ '<p>La app, su código fuente y compilado, su diseño, interfaz, textos, iconos, logotipos, la marca «' + TITULAR.marca + '» y todos los contenidos que incluye (planes de entrenamiento y nutrición, rutinas, recetas, protocolos, plantillas, cálculos y materiales) son propiedad de ' + TITULAR.marca + ' y de sus profesionales (en adelante, «los titulares»), y están protegidos por la legislación española y europea de propiedad intelectual e industrial. <b>Todos los derechos reservados.</b></p>'
+ '<h4>2. Qué te permitimos</h4>'
+ '<p>Te concedemos una licencia personal, limitada, no exclusiva, intransferible y revocable para usar la app únicamente mientras tengas contratada la asesoría y solo para seguir tu propio plan. Los profesionales del equipo la usan para prestar el servicio.</p>'
+ '<h4>3. Qué no está permitido</h4>'
+ '<ul><li>Copiar, reproducir, modificar, traducir o crear obras derivadas de la app o de sus contenidos, en todo o en parte.</li>'
+ '<li>Descompilar, desensamblar, hacer ingeniería inversa o extraer el código, salvo en los casos que la ley permita expresamente.</li>'
+ '<li>Distribuir, vender, alquilar, sublicenciar, publicar o compartir la app, tus planes, recetas o protocolos con terceros, ni usarlos con fines comerciales.</li>'
+ '<li>Usar la app, su diseño o sus contenidos para crear un producto o servicio que compita con ' + TITULAR.marca + '.</li>'
+ '<li>Eliminar o alterar avisos de propiedad, marcas o logotipos.</li>'
+ '<li>Acceder a zonas o datos que no te correspondan, o intentar saltarte las medidas de seguridad.</li></ul>'
+ '<h4>4. Código publicado</h4>'
+ '<p>Que el código pueda verse públicamente mientras la app está en desarrollo <b>no concede ninguna licencia</b>: está publicado con todos los derechos reservados y no puede reutilizarse sin autorización escrita de los titulares.</p>'
+ '<h4>5. Tus datos y tu contenido</h4>'
+ '<p>Lo que tú escribes o subes (seguimientos, fotos, mensajes) sigue siendo tuyo. Su tratamiento se explica en la <a class="lnk" href="#" onclick="abrirLegal(\'privacidad\');return false;">política de privacidad</a>.</p>'
+ '<h4>6. Actualizaciones y fin de la licencia</h4>'
+ '<p>Podemos actualizar, cambiar o retirar funciones de la app. La licencia termina cuando finaliza tu asesoría o si incumples estas condiciones; en ese caso debes dejar de usar la app y sus contenidos.</p>'
+ '<h4>7. Garantías y responsabilidad</h4>'
+ '<p>La app se ofrece «tal cual», como herramienta de apoyo al servicio de asesoramiento. Responderemos en los términos que exige la ley, sin que estas condiciones limiten los derechos que te reconoce la normativa de consumidores.</p>'
+ '<h4>8. Ley aplicable</h4>'
+ '<p>Esta licencia se rige por la ley española. Para cualquier conflicto serán competentes los juzgados que correspondan según la normativa de consumidores. Consultas: ' + TITULAR.correo + '.</p>'
+ '<p>Esta licencia se completa con los <a class="lnk" href="#" onclick="abrirLegal(\'terminos\');return false;">términos y condiciones</a> del servicio.</p>';

abrirLegal = (function(orig){
  return function(tipo){
    if (tipo !== 'licencia') return orig.apply(this, arguments);
    document.getElementById('legalTitulo').textContent = 'Licencia de uso';
    document.getElementById('legalCuerpo').innerHTML = LEGAL_LICENCIA;
    const ov = document.getElementById('legalOverlay'); ov.classList.add('show');
    const s = ov.querySelector('.fsd-sheet'); if (s) s.scrollTop = 0;
  };
})(abrirLegal);

/* fila «Licencia de uso» en Ajustes, debajo de «Términos y condiciones» */
function lcFilaAjustes(){
  ['ajustesCliente', 'ajustesCoach'].forEach(function(id){
    const c = document.getElementById(id); if (!c || c.querySelector('.lc-fila')) return;
    const tc = c.querySelector('.tc-fila'); if (!tc) return;
    const f = tc.cloneNode(true);
    f.classList.remove('tc-fila'); f.classList.add('lc-fila');
    f.setAttribute('onclick', "abrirLegal('licencia')");
    const sp = f.querySelector('span'); if (sp) sp.textContent = 'Licencia de uso';
    tc.parentNode.insertBefore(f, tc.nextSibling);
  });
}
if (typeof renderAjustes === 'function') renderAjustes = (function(orig){ return function(){ const r = orig.apply(this, arguments); lcFilaAjustes(); return r; }; })(renderAjustes);
if (typeof refrescarAjustes === 'function') refrescarAjustes = (function(orig){ return function(){ const r = orig.apply(this, arguments); lcFilaAjustes(); return r; }; })(refrescarAjustes);

/* consentimiento del primer acceso y pantalla de inicio */
(function(){
  const p = document.querySelector('#consentSalud .cs-terminos');
  if (p && !p.querySelector('.lc-link')) p.innerHTML = 'Al continuar aceptas los <a class="lnk" href="#" onclick="abrirLegal(\'terminos\');return false;">términos y condiciones</a> del servicio y la <a class="lnk lc-link" href="#" onclick="abrirLegal(\'licencia\');return false;">licencia de uso</a> de la app.';
  const t = document.querySelector('.tc-link');
  if (t && !document.querySelector('.lc-link-ini')) t.insertAdjacentHTML('afterend', ' · <a class="lnk lc-link-ini" href="#" onclick="abrirLegal(\'licencia\');return false;">Licencia de uso</a>');
})();
