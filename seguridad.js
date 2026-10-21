/* =========================================================
   Fitnessindramas — Seguridad (auditoría #110, 22/10/2026)
   Se carga ANTES que app.js.
   1 · Limpieza del HTML guardado (planes y chat): los planes se guardan como HTML y una copia
       de seguridad manipulada (o datos tocados a mano) podría colar código. Al cargar los datos se
       quitan etiquetas peligrosas (script, iframe, object…), los atributos on… que no sean los de la
       propia app (con argumentos this / event) y los enlaces que no sean http(s), mailto o tel.
       Se analiza con <template>, que no ejecuta nada.
   2 · Fotos: solo se aceptan imágenes en data:image/… (png, jpeg, webp, gif).
   3 · Texto escapado para nombres que escriben los profesionales (ejercicios y alimentos propios).
   ========================================================= */
const FSD_ETIQUETAS_FUERA = ['SCRIPT', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET', 'LINK', 'META', 'BASE', 'FORM', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'MATH', 'PORTAL'];
/* funciones de la app que pueden aparecer en los atributos on… de un plan o del chat guardado */
const FSD_MANEJADORES = ['abrirAlergias','abrirAsistente','abrirAviso','abrirChatPro','abrirLegal','abrirNotis','abrirNotisCoach','abrirPlantillas','abrirRecurso','abrirSegsCliente','abrirTabPro','abrirTarifa','abrirVideoModal','addEjercicio','addMeal','addSesion','algEstado','algMarcar','algNinguna','backToCliente','backToPanel','calcularPlan','cambiarAcceso','cambiarSistema','cambiarTipoAviso','cancelarGrabacion','cdAbrirReg','cdDesmarcar','cdGuardarReg','cdHecho','cdModo','cdPreset','cerrarAlergias','cerrarAltaOk','cerrarDialogo','cerrarLegal','cerrarNotis','cerrarNotisCoach','cerrarPassPro','cerrarRecurso','cerrarSesionCliente','cerrarVideoModal','ciGuardar','closeExercisePicker','closeFoodPicker','confirmAlta','confirmarBaja','confirmarPago','confirmarPassPro','confirmarSalidaCliente','confirmarSalidaCoach','cookiesAceptar','cookiesCerrarConfig','cookiesConfigurar','cookiesGuardarSeleccion','cookiesRechazar','copiarCodigo','copiarCodigoAlta','copiarCodigoCoach','copiarPlan','crearPlanRapido','csAceptar','csCambio','csRechazar','descBlur','descEditada','desvincularDispositivo','editarPlan','editarSens','elegirAnimo','elegirFoto','elegirTema','eliminarCliente','emoElegirCat','emoPoner','enAbrirPlan','enAbrirPlanDesdeTab','enAbrirPlanNutri','enAnadirMarcados','enAplicarPlantilla','enBorrarPlantilla','enConfirmarPlantilla','enCopiarPeticion','enDuplicarEj','enDuplicarSesion','enGenerarPlan','enGuardarPlantilla','enImportarRespuesta','enIrSeccion','enMoverEj','enMoverSesion','enPauta','enQuitarEj','enTecAbrir','enTecAplicar','enTecElegir','enTecN','entFiltrar','enterApp','enviarCodigoCoach','enviarSens','escCerrarSoloMovil','escEquipoEntrar','escEquipoForm','escEquipoQuien','exAbrirComida','exEmpezarEntreno','exFiltrar','exPasoIr','formatCode','goTo','goToAlta','goToCliente','goToPlanCoach','goToSeguimientos','grElegir','grVerTabla','guardarAlergias','guardarContacto','guardarEditarCliente','guardarSeguimiento','guardarTarifa','guardarVideo','if','insertarEmoji','instalarApp','marcarTodosLeidos','mjAbrirFichaPago','mjCerrarHoja','mjChip','mjEditarEnlace','mjFiltrarPagos','mjGuardarEnlace','mjSalirBloqueo','mjToggleAuto','mostrarCodigo','mostrarCodigoCoach','muCambiarModo','nuGuardarIgualmente','onPautaChange','onSerieInput','openExercisePicker','pedirPago','pedirPassPro','pgDescargarCliente','pgVer','pick','pickExercise','pickFood','plFiltrar','prAbrir','prQuitar','prSubir','quitarFoto','quitarVideo','rcAbrir','rcBorrar','rcEditar','rcEnviar','rcGuardarBorrador','rcIngAnadir','rcIngQuitar','reactivarCliente','removeMeal','removeSesion','renderFoodList','renderPickerList','reproducirAudio','restaurarCopia','restaurarDesc','rnCopiar','saveNewExercise','saveNewFood','sendMsg','setEqFilter','setEscala','setPasos','setRango','sgCancelarEdicion','sgEditar','sgFiltrar','sgFotoAmpliar','sgFotoElegir','sgFotoQuitar','sgRevAbrir','sgRevCancelar','sgRevCompletar','sgRevDeshacer','sndCambiar','subirImagen','titleBlur','titleClick','titleEdited','titleKey','tituloSesionBlur','tituloSesionClick','tituloSesionKey','toggleComercial','toggleComida','toggleDisp','toggleEmojis','toggleMealBlock','toggleNewExercise','toggleNewFood','toggleSesion','toggleSesionHecha','verConversacion','verPagos','volverAtras'];
const FSD_RE_MANEJADOR = /^\s*([A-Za-z_$][\w$]*)\(\s*(?:this|event|event\s*,\s*this|this\.closest\('[\w.#\- ]+'\)|this\.parentNode\.parentNode\.nextElementSibling)?\s*\)\s*;?\s*$/;
function fsdUrlSegura(v){
  v = String(v || '').trim();
  if (!v || v.charAt(0) === '#') return true;
  if (/^(https?:|mailto:|tel:|blob:)/i.test(v)) return true;
  if (/^data:(image\/(png|jpe?g|webp|gif)|audio\/[\w.+-]+(;codecs=[\w.,-]+)?);base64,/i.test(v)) return true;
  return !/^[a-z][a-z0-9+.\-]*:/i.test(v) && !/^\s*\/\//.test(v);       // relativa
}
function fsdLimpiarNodo(raiz){
  if (!raiz || !raiz.querySelectorAll) return 0;
  let n = 0;
  Array.prototype.slice.call(raiz.querySelectorAll('*')).forEach(function(el){
    if (FSD_ETIQUETAS_FUERA.indexOf(el.tagName.toUpperCase()) > -1) { el.remove(); n++; return; }
    Array.prototype.slice.call(el.attributes).forEach(function(a){
      const nom = a.name.toLowerCase(), v = a.value;
      let fuera = false;
      if (nom.indexOf('on') === 0) {
        const m = v.match(FSD_RE_MANEJADOR);
        fuera = !m || FSD_MANEJADORES.indexOf(m[1]) < 0;
      } else if (['href', 'src', 'xlink:href', 'action', 'formaction', 'data-video', 'poster', 'background'].indexOf(nom) > -1) {
        fuera = !fsdUrlSegura(v);
      } else if (nom === 'srcdoc' || nom === 'srcset') fuera = true;
      else if (nom === 'style') fuera = /url\s*\(|expression\s*\(|javascript:/i.test(v);
      if (fuera) { el.removeAttribute(a.name); n++; }
    });
  });
  return n;
}
function fsdLimpiarHtml(html){
  if (!html || typeof html !== 'string' || !/[<&]/.test(html)) return html;
  const t = document.createElement('template'); t.innerHTML = html;
  if (!fsdLimpiarNodo(t.content)) return html;
  return t.innerHTML;                                  // serializa sin sacar el contenido del <template>
}
function fsdLimpiarPlan(p){
  if (!p || typeof p !== 'object') return p;
  ['ent', 'nut', 'chat'].forEach(function(c){ if (typeof p[c] === 'string') p[c] = fsdLimpiarHtml(p[c]); });
  return p;
}
function fsdFotoSegura(v){ return typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(v); }
function fsdEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* fotos de perfil y avatares guardados aparte */
(function(){
  try {
    const f = JSON.parse(localStorage.getItem('fsd_fotos') || 'null');
    if (f && typeof f === 'object') {
      let cambio = false;
      Object.keys(f).forEach(function(k){ if (!fsdFotoSegura(f[k])) { delete f[k]; cambio = true; } });
      if (cambio) localStorage.setItem('fsd_fotos', JSON.stringify(f));
    }
  } catch(e){}
})();
