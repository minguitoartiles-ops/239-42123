function enterApp(){
  const cod=(document.getElementById('accessCode').value||'').trim().toUpperCase();
  const err=document.getElementById('loginError');
  const claves=Object.keys(clientesData);
  if(!claves.length){ err.textContent='Todavía no hay ningún cliente dado de alta. Crea uno desde el panel de coach.'; return; }
  if(!cod){ err.textContent='Introduce tu código de acceso.'; return; }
  const k=claves.filter(function(x){ return (clientesData[x].codigo||'').toUpperCase()===cod; })[0];
  if(!k){ err.textContent='Ese código no corresponde a ningún cliente.'; return; }
  err.textContent='';
  guardarPlan();
  clienteActual=k;
  cargarPlan(k);
  pintarCliente();
  document.getElementById('app').classList.remove('coach-view');
  document.getElementById('coachBar').classList.remove('show');
  document.getElementById('view-splash').style.display='none';
  document.getElementById('app').style.display='flex';
  goTo('hoy',true);
  navHist=[];
}
function pintarCliente(){
  const d=clienteActual?clientesData[clienteActual]:null;
  const nombre=d?d.nombre:'';
  const corto=nombre.split(' ')[0]||'';
  setTxt('hoySaludo','Hola'+(corto?', '+corto:''));
  setTxt('perfNombre',nombre||'—');
  setTxt('perfMeta',d?('Semana '+d.semana+' · '+d.objetivo):'Sin asesoría activa');
  const ct=document.getElementById('chatTitle');
  if(ct && !isCoachView()) ct.textContent='Tu equipo';
}
function actualizarPanel(){
  const claves=Object.keys(clientesData);
  setTxt('statClientes',claves.length);
  setTxt('statRevis',claves.length);
  const vac=document.getElementById('sinClientes');
  if(vac) vac.style.display=claves.length?'none':'block';
}
const tabs=['hoy','plan','entreno','progreso','chat'];
let vistaActual='hoy', navHist=[];
function goTo(name,sinHist){
  if(!sinHist && vistaActual && vistaActual!==name) navHist.push(vistaActual);
  if(navHist.length>25) navHist.shift();
  vistaActual=name;
  Array.prototype.forEach.call(document.querySelectorAll('.view'),v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  Array.prototype.forEach.call(document.querySelectorAll('.tbi'),t=>t.classList.remove('active'));
  const idx=tabs.indexOf(name);
  if(idx>-1) document.getElementById('tab-'+name).classList.add('active');
  document.getElementById('content').scrollTop=0;
  updateCoachBar(name);
  if(name==='chat') syncChatPerspective();
  pintarAtras();
}
function pintarAtras(){
  const hay=navHist.length>0;
  Array.prototype.forEach.call(document.querySelectorAll('.view-back'),function(b){
    b.style.visibility=hay?'visible':'hidden';
  });
}
function volverAtras(){
  const prev=navHist.pop();
  goTo(prev||'hoy',true);
}

function sesionCards(){ return Array.prototype.slice.call(document.querySelectorAll('#view-entreno .sesion-card')); }
function toggleSesionHecha(ev,el){
  ev.stopPropagation();
  el.closest('.sesion-card').classList.toggle('hecha');
  programarGuardado();
  recalcEntreno();
  recalcTonelaje();
  recalcCumplimiento();
  recalcProgreso();
  programarGuardado();
}
function recalcEntreno(){
  const cards=sesionCards();
  const hechas=cards.filter(function(c){ return c.classList.contains('hecha'); });
  setTxt('entHechas',hechas.length);
  setTxt('entTotal',cards.length);
  setTxt('entOk',hechas.length);
  setTxt('entFalta',cards.length-hechas.length);
  setArc('entArc',cards.length?hechas.length/cards.length:0);
  let ton=0;
  hechas.forEach(function(s){ ton+=tonelajeDe(s); });
  const sub=document.getElementById('entSub');
  if(sub) sub.textContent = cards.length
      ? cards.length+' sesion'+(cards.length===1?'':'es')+' esta semana · registra el peso al terminar cada una'
      : 'Aún no hay sesiones en el plan.';
  setTxt('entTon',ton?fmtMil(ton)+' kg':'— kg');
  renderHoy();
  const nota=document.getElementById('entNota');
  if(nota){
    if(!cards.length) nota.textContent='';
    else if(hechas.length===cards.length) nota.textContent='¡Semana completa! Has hecho las '+cards.length+' sesiones.';
    else if(!ton) nota.textContent='Entrena los días que mejor te vengan. Registra los pesos para ver tu tonelaje.';
    else nota.textContent='Te quedan '+(cards.length-hechas.length)+' sesiones esta semana.';
  }
}
function onPautaChange(inp){
  const item=inp.closest('.ex-item');
  if(!item) return;
  const campos=item.querySelectorAll('.rx-field');
  const nser=Math.max(1,Math.min(12,parseInt(campos[0].value)||1));
  const nrep=Math.max(0,parseInt(campos[1].value)||0);
  const cont=item.querySelector('.ex-series-inputs');
  if(!cont) return;
  const filas=Array.prototype.slice.call(cont.querySelectorAll('.serie-in'));
  const prev=filas.length?(filas[0].querySelector('input').dataset.prev||'0'):'0';
  while(filas.length>nser){ cont.removeChild(filas.pop()); }
  for(let k=filas.length;k<nser;k++){
    const l=document.createElement('label');
    l.className='serie-in';
    l.innerHTML='<span>S'+(k+1)+'</span><input type="number" step="0.5" placeholder="—" data-reps="'+nrep+'" data-prev="'+prev+'" oninput="onSerieInput(this)">';
    cont.appendChild(l);
    filas.push(l);
  }
  filas.forEach(function(l,k){
    l.querySelector('span').textContent='S'+(k+1);
    l.querySelector('input').dataset.reps=nrep;
  });
  recalcTonelaje(); recalcEntreno(); recalcCumplimiento(); recalcProgreso();
}
function onSerieInput(inp){
  const item=inp.closest('.ex-item');
  const tro=item.querySelector('.ex-trophy');
  let mejor=false;
  Array.prototype.forEach.call(item.querySelectorAll('.serie-in input'),function(x){
    const v=parseFloat(x.value), p=parseFloat(x.dataset.prev);
    if(!isNaN(v)&&!isNaN(p)&&v>p) mejor=true;
  });
  if(tro) tro.style.display=mejor?'inline':'none';
  recalcTonelaje();
  recalcEntreno();
  recalcCumplimiento();
  recalcProgreso();
}
function tonelajeDe(scope){
  let t=0;
  Array.prototype.forEach.call(scope.querySelectorAll('.serie-in input'),function(x){
    const v=parseFloat(x.value), r=parseFloat(x.dataset.reps||0);
    if(!isNaN(v)&&v>0) t+=v*r;
  });
  return t;
}
function recalcTonelaje(){
  const v=document.getElementById('tonelajeValue');
  const d=document.getElementById('tonelajeDelta');
  if(!v) return;
  const sec=document.getElementById('view-entreno');
  const hay=Array.prototype.filter.call(sec.querySelectorAll('.serie-in input'),function(x){ return x.value.trim()!==''; }).length;
  const tot=tonelajeDe(sec);
  v.textContent=fmtMil(tot)+' kg';
  if(!hay){ d.textContent='Registra tus pesos para verlo'; d.className='tonelaje-delta'; return; }
  let prev=0;
  Array.prototype.forEach.call(sec.querySelectorAll('.ex-item'),function(it){
    const usados=Array.prototype.filter.call(it.querySelectorAll('.serie-in input'),function(x){ return x.value.trim()!==''; });
    usados.forEach(function(x){ prev+=parseFloat(x.dataset.prev||0)*parseFloat(x.dataset.reps||0); });
  });
  const dif=Math.round(tot-prev);
  if(dif>0){ d.textContent='+'+fmtMil(dif)+' kg vs la semana pasada 🏆'; d.className='tonelaje-delta up'; }
  else if(dif<0){ d.textContent='−'+fmtMil(-dif)+' kg vs la semana pasada'; d.className='tonelaje-delta'; }
  else { d.textContent='Igual que la semana pasada'; d.className='tonelaje-delta'; }
}
function recalcCumplimiento(){
  const ses=sesionCards(), hechas=ses.filter(function(x){ return x.classList.contains('hecha'); }).length;
  const com=mealBlocks(), tomadas=com.filter(function(x){ return x.classList.contains('eaten'); }).length;
  const pe=ses.length?hechas/ses.length:0, pn=com.length?tomadas/com.length:0;
  setTxt('cumplEntrenoTxt',hechas+' de '+ses.length);
  setTxt('cumplComidasTxt',tomadas+' de '+com.length);
  const be=document.getElementById('cumplEntrenoBar'); if(be) be.style.width=Math.round(pe*100)+'%';
  const bn=document.getElementById('cumplComidasBar'); if(bn) bn.style.width=Math.round(pn*100)+'%';
  const glob=Math.round(((pe+pn)/2)*100);
  setTxt('cumplGlobal',glob+' %');
  const nota=document.getElementById('cumplNota');
  if(nota){
    if(glob>=85) nota.innerHTML='Vas por encima del <b>85 %</b>: es justo el rango en el que se ven los cambios.';
    else if(glob>=60) nota.innerHTML='Estás en el <b>'+glob+' %</b>. Subir al 85 % marca la diferencia.';
    else nota.innerHTML='Vas al <b>'+glob+' %</b>. Marca lo que vayas cumpliendo para verlo aquí.';
  }
}
function recalcProgreso(){
  const ses=sesionCards(), hechas=ses.filter(function(x){ return x.classList.contains('hecha'); });
  const com=mealBlocks(), tomadas=com.filter(function(x){ return x.classList.contains('eaten'); }).length;
  let ton=0; hechas.forEach(function(s){ ton+=tonelajeDe(s); });
  setTxt('pgSesiones',hechas.length+' de '+ses.length);
  setTxt('pgComidas',com.length?Math.round(tomadas/com.length*100)+' %':'—');
  setTxt('pgTonelaje',ton?fmtMil(ton)+' kg':'— kg');
  const barS=document.getElementById('pgBarSes'); if(barS) barS.style.width=(ses.length?Math.round(hechas.length/ses.length*100):0)+'%';
  const barC=document.getElementById('pgBarCom'); if(barC) barC.style.width=(com.length?Math.round(tomadas/com.length*100):0)+'%';
  const sem=document.getElementById('pgSemana');
  if(sem){
    const pe=ses.length?hechas.length/ses.length:0, pn=com.length?tomadas/com.length:0;
    const g=Math.round(((pe+pn)/2)*100);
    sem.textContent=g+' %';
  }
}
const RECURSOS={
 rir:{t:'Cómo funciona el RIR',s:'Repeticiones en reserva',b:[
  ['Qué es','RIR = <b>repeticiones en reserva</b>. Es mi manera de decirte a qué nivel de intensidad quiero que lleves esa serie. Tú autorregulas el <b>peso</b> para cumplir ese esfuerzo.<br><b>A menos RIR, más cerca del fallo.</b>'],
  ['Equivalencia','<b>RIR 0</b> — 0 repeticiones en recámara: fallo muscular<br><b>RIR 1</b> — a 1 repetición del fallo<br><b>RIR 2</b> — a 2 repeticiones del fallo<br><b>RIR 3</b> — a 3 repeticiones del fallo'],
  ['Serie efectiva vs. de calentamiento','Si coges un peso que <b>no</b> te hace cumplir el RIR pautado, esa serie cuenta como <b>calentamiento</b>. Si lo cumples, es una <b>serie efectiva</b>. Las que suman son las efectivas.'],
  ['Ejemplo 1 · RIR 0','Manolito tiene 3 series de press de banca con mancuerna a 12 repeticiones a <b>RIR 0</b>. Debe escoger un peso que le haga fallar justo en la repetición 12. Si acaba las 12 y podría haber hecho más, ha sido calentamiento: toca subir peso.'],
  ['Ejemplo 2 · RIR 2','Juanita tiene 3 series de sentadillas a 10 repeticiones a <b>RIR 2</b>. Elige un peso con el que, al llegar a 10, aún podría hacer 2 más si hiciera falta (como el tambor de un revólver: esas balas no se gastan). Si podía hacer 6 más, era calentamiento: sube peso.'],
  ['Ejemplo 3 · RIR 3','Marta empieza con curl de bíceps: 3 series de 12 a <b>RIR 3</b>. Al terminar las 12 le quedan 3 en el depósito. Es un margen conservador, pensado para semanas de mucha carga acumulada, al volver de un parón o cuando el ejercicio es nuevo y prima la técnica.'],
  ['Regla práctica','Si terminas la serie y no sabes cuántas te quedaban, casi seguro te sobraba margen: sube algo de peso la próxima. Y si dudas entre dos pesos en un ejercicio nuevo, quédate con el menor y ajusta en la siguiente serie.']
 ]},
 glosario:{t:'Glosario de entrenamiento',s:'El traductor de palabrejas raras',b:[
  ['Drop Sets (D)','Una técnica de intensidad que lleva tus músculos al límite.<br><b>Utilidad:</b> aumenta el tiempo bajo tensión, promueve la hipertrofia y mejora la resistencia muscular.<br><b>Ejemplo:</b> Press de pecho + 2D<br>Realiza una serie de press de banca con un peso que te permita hacer 8-10 repeticiones. Al llegar al fallo muscular, reduce el peso un 20-30 % y continúa haciendo repeticiones hasta el fallo nuevamente. Repite este proceso tantas D como te haya pautado en la rutina.'],
  ['Superseries','Consiste en realizar dos ejercicios consecutivos <b>sin descanso</b>.<br><b>Utilidad:</b> ahorra tiempo y aumenta la intensidad del entrenamiento. Puede ser antagónica (músculos opuestos) o sinérgica (mismos músculos).<br><b>Ejemplo:</b> Extensiones de tríceps + curl de bíceps en polea baja SUPERSERIE 10+10<br>Una vez hagas las extensiones de tríceps, inmediatamente realizas el siguiente ejercicio a las repeticiones establecidas. Una vez terminados ambos ejercicios has terminado una serie.'],
  ['Series Gigantes','Similar a las superseries, pero con <b>3 o más</b> ejercicios consecutivos.<br><b>Utilidad:</b> maximiza el estímulo muscular y la congestión. Ideal para generar alta intensidad si tienes muy poco tiempo para entrenar.<br><b>Ejemplo:</b> Sentadillas + zancadas + extensiones + curl femoral SERIE GIGANTE<br>Realiza una serie de sentadillas, seguida de zancadas, extensiones de pierna y curl femoral sin descanso. Una vez terminados todos los ejercicios, eso es una serie. Descansa 2-3 minutos y repite.'],
  ['AMRAP','<i>As Many Reps As Possible.</i> Realizar la mayor cantidad de repeticiones posible en un tiempo determinado.<br><b>Utilidad:</b> mejora la resistencia muscular y la capacidad de trabajo. Aumenta la intensidad y el volumen de entrenamiento.<br><b>Ejemplo:</b> Russian twist 1′<br>Elige un peso y realiza la mayor cantidad de repeticiones posibles en 1 minuto. Una vez terminado el tiempo, ha concluido la serie.'],
  ['EMOM','<i>Every Minute On the Minute.</i> Realizar un número específico de repeticiones al comienzo de cada minuto. El tiempo restante del minuto es tu descanso.<br><b>Utilidad:</b> controla el tiempo de descanso y mantiene una alta intensidad. Ideal para mejorar la fuerza y la resistencia.<br><b>Ejemplo:</b> 5 burpees al comienzo de cada minuto durante 15 minutos.'],
  ['Rest Pauses (RP)','Realizar una serie hasta el fallo muscular, descansar brevemente y luego continuar con repeticiones adicionales.<br><b>Utilidad:</b> permite realizar más repeticiones con un peso determinado, aumentando el tiempo bajo tensión y el estímulo hipertrófico.<br><b>Ejemplo:</b> Remo con barra + 2RP<br>Realiza una serie de remo con barra hasta el fallo a las repeticiones estipuladas. Descansa 5-10 segundos y haz tantas repeticiones adicionales como sea posible. Repite el proceso dos veces (2RP).'],
  ['Myo-Reps','Una serie de activación seguida de mini-series con descansos cortos.<br><b>Utilidad:</b> aumenta el volumen de entrenamiento efectivo sin un gran impacto en la fatiga.<br><b>Ejemplo:</b> Extensiones de cuádriceps + MYOREPS<br>Elige un peso para hacer 10-12 reps (serie de activación). Descansa 4 segundos y haz 3-5 reps (mini-serie). Descansa 4 segundos y vuelve a hacer tantas como puedas.'],
  ['Conclusión','Estas técnicas avanzadas son herramientas valiosas para superar estancamientos y llevar tu entrenamiento al siguiente nivel. Recuerda preguntar todas las dudas que te surjan y escucha a tu cuerpo para evitar lesiones. ¡A entrenar! 🏋']
 ]},
 calentamiento:{t:'Guía de calentamiento',s:'Para mis niños y niñas fuertes',b:[
  ['Introducción','Esta guía está diseñada para proporcionarte un calentamiento efectivo y personalizado para cada sesión. Un buen calentamiento es <b>fundamental</b> para preparar tu cuerpo, optimizar tu rendimiento y reducir el riesgo de lesiones.'],
  ['Beneficios del calentamiento','<b>Aumenta la temperatura muscular:</b> mejora la elasticidad y reduce el riesgo de desgarros.<br><b>Mejora la circulación sanguínea:</b> aumenta el suministro de oxígeno a los músculos.<br><b>Aumenta el rango de movimiento:</b> prepara las articulaciones para el ejercicio.<br><b>Prepara el sistema nervioso:</b> mejora la coordinación y los tiempos de reacción.<br><b>Mejora el rendimiento:</b> permite una transición suave al entrenamiento principal.'],
  ['Estructura: 3 fases','Un calentamiento completo se compone de tres fases clave:<br><b>1. Activación general</b> — eleva la frecuencia cardíaca y la temperatura corporal.<br><b>2. Movilidad articular</b> — aumenta el rango de movimiento de las articulaciones clave.<br><b>3. Calentamiento específico</b> — prepara los músculos que vas a usar.'],
  ['1 · Activación general','Cardio ligero, <b>5-10 minutos</b>: caminadora, bicicleta estática, elíptica o salto de cuerda.<br><b>Objetivo:</b> elevar suavemente la frecuencia cardíaca.'],
  ['2 · Movilidad articular','• Rotaciones de cuello (suaves)<br>• Círculos de hombros (adelante y atrás)<br>• Rotaciones de brazos<br>• Círculos de muñecas y tobillos<br>• Movimientos de cadera (círculos)<br>• Balanceo de piernas (adelante y atrás)<br>• Estiramientos dinámicos suaves (giros de torso)<br><b>Objetivo:</b> preparar las articulaciones para un mayor rango de movimiento.'],
  ['3 · Calentamiento específico','Realiza ejercicios que imiten los movimientos del entrenamiento principal, pero con menor intensidad o resistencia:<br>• Si vas a hacer sentadillas, empieza con sentadillas con el peso corporal.<br>• Si vas a hacer press de banca, haz repeticiones con la barra vacía o mancuernas ligeras.<br>• Si vas a correr, empieza con una caminata rápida y sube la velocidad poco a poco.<br><b>Objetivo:</b> activar los músculos específicos y mejorar la coordinación neuromuscular.'],
  ['Recomendaciones','<b>Escucha a tu cuerpo:</b> no fuerces los movimientos ni te excedas en la intensidad.<br><b>Adapta el calentamiento:</b> ajusta la duración y los ejercicios según tu nivel, el tipo de entrenamiento y el tiempo disponible.<br><b>Mantente hidratado:</b> bebe agua antes, durante y después.<br><b>Concéntrate:</b> presta atención a los movimientos y siente cómo se activan tus músculos.<br><b>No te saltes el calentamiento:</b> es una parte esencial de cada entrenamiento.'],
  ['Un aviso','Esta es una guía muy básica. Si necesitas movilidad muy específica para tus condiciones corporales, <b>pregúntanos por el chat</b> y te la preparamos.']
 ]}
};
function abrirRecurso(k){
  const r=RECURSOS[k];
  if(!r) return;
  document.getElementById('recEyebrow').textContent=r.s;
  document.getElementById('recTitulo').textContent=r.t;
  document.getElementById('recCuerpo').innerHTML=r.b.map(function(x){
    return '<div class="rec-bloque"><div class="rec-tit">'+x[0]+'</div><div class="rec-txt">'+x[1]+'</div></div>';
  }).join('');
  document.getElementById('recursoPop').classList.add('show');
}
function cerrarRecurso(){ document.getElementById('recursoPop').classList.remove('show'); }
const PLANES={};
const VACIO_ENT='<div class="vacio"><b>Sin sesiones todavía</b><span>Pulsa «Añadir sesión» para montar el entrenamiento de este cliente.</span></div>';
const VACIO_NUT='<div class="vacio"><b>Sin comidas todavía</b><span>Pulsa «Añadir comida» para montar el plan nutricional de este cliente.</span></div>';
function contEnt(){ return document.getElementById('sesionesCont'); }
function contNut(){ return document.getElementById('comidasCont'); }
const DB_KEY='fsd_datos_v1';
let guardadoPend=null;
function sincronizarInputs(cont){
  if(!cont) return;
  Array.prototype.forEach.call(cont.querySelectorAll('input'),function(i){
    if(i.type==='checkbox'||i.type==='radio') return;
    i.setAttribute('value', i.value);
  });
}
function guardarChat(){
  if(!clienteActual) return;
  const l=document.getElementById('chatList');
  if(!l) return;
  PLANES[clienteActual]=PLANES[clienteActual]||{ent:'',nut:''};
  PLANES[clienteActual].chat=l.innerHTML;
}
function guardarTodo(){
  try{
    sincronizarInputs(contEnt());
    sincronizarInputs(contNut());
    guardarPlan();
    guardarChat();
    localStorage.setItem(DB_KEY, JSON.stringify({
      v:1, clientes:clientesData, seg:SEGUIMIENTOS, planes:PLANES,
      notis:notisCoach, sesion:{cliente:clienteActual}
    }));
  }catch(e){}
}
function programarGuardado(){
  if(guardadoPend) clearTimeout(guardadoPend);
  guardadoPend=setTimeout(guardarTodo,400);
}
function cargarTodo(){
  let d=null;
  try{ d=JSON.parse(localStorage.getItem(DB_KEY)||'null'); }catch(e){ return null; }
  if(!d||!d.clientes) return null;
  Object.keys(d.clientes).forEach(function(k){ clientesData[k]=d.clientes[k]; });
  Object.keys(d.seg||{}).forEach(function(k){ SEGUIMIENTOS[k]=d.seg[k]; });
  Object.keys(d.planes||{}).forEach(function(k){ PLANES[k]=d.planes[k]; });
  notisCoach=d.notis||[];
  return d.sesion||null;
}
function borrarDatos(){
  if(!confirm('¿Borrar todos los datos guardados en este dispositivo? Se perderán los clientes, planes y seguimientos de prueba.')) return;
  try{ localStorage.removeItem(DB_KEY); }catch(e){}
  location.reload();
}
function cerrarSesionCliente(){
  clienteActual=null;
  guardarTodo();
  document.getElementById('app').style.display='none';
  document.getElementById('accessCode').value='';
  document.getElementById('loginError').textContent='';
  showScreen('view-splash');
}
function guardarPlan(){
  if(!clienteActual) return;
  PLANES[clienteActual]={ent:contEnt().innerHTML, nut:contNut().innerHTML};
}
function limpiarEditables(cont){
  Array.prototype.forEach.call(cont.querySelectorAll('.chip-x, .chip-add'),function(x){ x.remove(); });
  Array.prototype.forEach.call(cont.querySelectorAll('[data-edit-ready]'),function(x){ delete x.dataset.editReady; });
  Array.prototype.forEach.call(cont.querySelectorAll('[contenteditable]'),function(x){ x.removeAttribute('contenteditable'); });
}
function cargarPlan(key){
  const p=PLANES[key];
  contEnt().innerHTML = (p&&p.ent) ? p.ent : VACIO_ENT;
  contNut().innerHTML = (p&&p.nut) ? p.nut : VACIO_NUT;
  const cl=document.getElementById('chatList');
  if(cl) cl.innerHTML = (p&&p.chat) ? p.chat : '<div class="picker-empty" id="chatVacio">Aún no hay mensajes. Escribe el primero.</div>';
  limpiarEditables(contEnt());
  limpiarEditables(contNut());
  if(coachEditing) enableNutricionEdit();
  renumberMeals();
  calcularPlan();
  recalcEntreno();
  recalcTonelaje();
  recalcCumplimiento();
  recalcProgreso();
  refreshAllSummaries();
  renderHoy();
}
function nuevaSesion(n){
  return '<div class="sesion-card open">'
   +'<div class="sesion-head" onclick="toggleSesion(this)">'
   +'<div><div class="sesion-num">Sesión '+n+'</div>'
   +'<div class="sesion-title" onclick="tituloSesionClick(event)" onblur="tituloSesionBlur(this)" onkeydown="tituloSesionKey(event,this)">Nueva sesión</div></div>'
   +'<div class="sesion-acts"><span class="ses-tick" onclick="toggleSesionHecha(event,this)" title="Marcar sesión como hecha">✓</span><span class="ses-del" onclick="removeSesion(event,this)">×</span><div class="sesion-chevron open">⌄</div></div>'
   +'</div>'
   +'<div class="sesion-body" style="display:block">'
   +'<div class="ex-table-head"><span>Ejercicio</span><span>Series</span><span>Reps</span><span>RIR</span></div>'
   +'<button class="add-ej-btn" onclick="addEjercicio(this)">+ Añadir ejercicio</button>'
   +'</div></div>';
}
function addSesion(){
  const cont=contEnt();
  if(cont.querySelector('.vacio')) cont.innerHTML='';
  const n=cont.querySelectorAll('.sesion-card').length+1;
  cont.insertAdjacentHTML('beforeend',nuevaSesion(n));
  const nueva=cont.lastElementChild;
  if(coachEditing) nueva.querySelector('.sesion-title').setAttribute('contenteditable','true');
  renumerarSesiones();
  guardarTodo();
  nueva.scrollIntoView({behavior:'smooth',block:'center'});
}
function removeSesion(ev,el){
  ev.stopPropagation();
  el.closest('.sesion-card').remove();
  renumerarSesiones();
  if(!contEnt().querySelectorAll('.sesion-card').length) contEnt().innerHTML=VACIO_ENT;
  recalcEntreno(); recalcTonelaje(); recalcCumplimiento(); recalcProgreso(); guardarTodo();
}
function renumerarSesiones(){
  Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-card'),function(s,k){
    s.querySelector('.sesion-num').textContent='Sesión '+(k+1);
  });
}
function tituloSesionClick(ev){ if(coachEditing) ev.stopPropagation(); }
function tituloSesionBlur(el){ if(!el.textContent.trim()) el.textContent='Nueva sesión'; guardarPlan(); }
function tituloSesionKey(ev,el){ if(ev.key==='Enter'){ ev.preventDefault(); el.blur(); } }
function filaEjercicio(nombre,mus,se,rep,rir){
  let ins='';
  for(let k=0;k<se;k++){
    ins+='<label class="serie-in"><span>S'+(k+1)+'</span><input type="number" step="0.5" placeholder="—" data-reps="'+rep+'" data-prev="0" oninput="onSerieInput(this)"></label>';
  }
  return '<div class="ex-item">'
   +'<div class="ex-table-row"><span class="ex-name-cell" data-muscle="'+mus+'" onclick="openExercisePicker(this)">'+nombre+'</span>'
   +'<span><input class="rx-field" type="number" value="'+se+'" readonly oninput="onPautaChange(this)"></span>'
   +'<span><input class="rx-field" type="number" value="'+rep+'" readonly oninput="onPautaChange(this)"></span>'
   +'<span><input class="rx-field" type="number" value="'+rir+'" readonly></span></div>'
   +'<div class="ex-desc" oninput="descEditada(this)" onblur="descBlur(this)">'+(descDe(nombre)||'Sin descripción.')+'</div>'
   +'<span class="ex-desc-restore" onclick="restaurarDesc(this)">Restaurar descripción original</span>'
   +'<div class="ex-video-row"><a class="ex-video" target="_blank" rel="noopener">▶ Ver técnica</a><button class="ex-link-btn" onclick="abrirVideoModal(this)">🔗 Enlace</button></div>'
   +'<div class="ex-series"><div class="ex-series-top"><span class="ex-weight-lbl">Peso por serie (kg)</span><span class="ex-trophy" title="¡Más carga que la semana pasada!">🏆</span></div>'
   +'<div class="ex-series-inputs">'+ins+'</div></div></div>';
}
let addEjBtn=null;
function addEjercicio(btn){
  addEjBtn=btn;
  pickerTarget=null;
  document.getElementById('pickerCurrent').textContent='Elige un ejercicio';
  document.getElementById('pickerSearch').value='';
  eqFilter='todos';
  toggleNewExercise(false);
  renderPickerFilters();
  renderPickerList();
  document.getElementById('exPicker').classList.add('show');
}
function toggleSesion(head){
  const body = head.nextElementSibling;
  const chevron = head.querySelector('.sesion-chevron');
  const card = head.parentElement;
  const isOpen = body.style.display === 'block';
  body.style.display = isOpen ? 'none' : 'block';
  chevron.classList.toggle('open', !isOpen);
  card.classList.toggle('open', !isOpen);
}

const REGION={pecho:'sup',espalda:'sup',hombro:'sup',biceps:'sup',triceps:'sup',cuadriceps:'inf',isquios:'inf',gluteo:'inf',gemelos:'inf',core:'core'};
const EQ_LABEL={barra:'Barra',mancuerna:'Mancuerna',kettlebell:'Kettlebell',maquina:'Máquina',polea:'Polea',multipower:'Multipower',corporal:'Peso corporal',banda:'Banda'};
const EQ_FILTERS=['todos','barra','mancuerna','kettlebell','maquina','multipower','polea','corporal'];
let eqFilter='todos';
const MUS_LABEL={pecho:'Pecho',espalda:'Espalda',hombro:'Hombro',biceps:'Bíceps',triceps:'Tríceps',cuadriceps:'Cuádriceps',isquios:'Isquios',gluteo:'Glúteo',gemelos:'Gemelos',core:'Core'};
const EX_CATALOG=[
 {n:"Press banca",m:'pecho',e:'barra',d:"Escápulas retraídas, baja la barra al esternón y empuja sin despegar la espalda del banco."},
 {n:"Press banca inclinado",m:'pecho',e:'barra',d:"Banco a 30-45°. Baja a la clavícula; trabaja más el pectoral superior."},
 {n:"Press banca declinado",m:'pecho',e:'barra',d:"Banco declinado. Baja al pecho bajo, recorrido corto y controlado."},
 {n:"Press cerrado",m:'triceps',e:'barra',d:"Manos a la anchura de los hombros. Codos cerca del torso."},
 {n:"Press con mancuernas",m:'pecho',e:'mancuerna',d:"Permite más recorrido que la barra. Baja hasta notar estiramiento, sin chocar arriba."},
 {n:"Press inclinado con mancuernas",m:'pecho',e:'mancuerna',d:"Inclinación moderada. Codos a unos 45° del torso, no abiertos del todo."},
 {n:"Press declinado con mancuernas",m:'pecho',e:'mancuerna',d:"Control en la bajada; junta ligeramente arriba sin bloquear codos."},
 {n:"Press de pecho en multipower",m:'pecho',e:'multipower',d:"Recorrido guiado. Ajusta la altura del banco para que la barra caiga al esternón."},
 {n:"Press inclinado en multipower",m:'pecho',e:'multipower',d:"Guiado y estable, ideal para cargar seguro sin quien te ayude."},
 {n:"Press en máquina",m:'pecho',e:'maquina',d:"Espalda pegada al respaldo. Empuja sin bloquear codos y vuelve despacio."},
 {n:"Press convergente en máquina",m:'pecho',e:'maquina',d:"Los brazos convergen al frente: mayor contracción del pectoral al final."},
 {n:"Aperturas con mancuernas",m:'pecho',e:'mancuerna',d:"Codos ligeramente flexionados y fijos. Abre en arco hasta notar estiramiento."},
 {n:"Aperturas inclinadas con mancuernas",m:'pecho',e:'mancuerna',d:"Mismo arco, en banco inclinado. Prioriza estiramiento sobre carga."},
 {n:"Contractor de pecho",m:'pecho',e:'maquina',d:"Antebrazos en las almohadillas. Junta con el pecho, no con las manos."},
 {n:"Cruce de poleas",m:'pecho',e:'polea',d:"Ligera inclinación al frente. Cruza las manos al final para contraer más."},
 {n:"Cruce de poleas alto",m:'pecho',e:'polea',d:"Poleas arriba: el arco baja hacia el abdomen, trabaja el pectoral inferior."},
 {n:"Cruce de poleas bajo",m:'pecho',e:'polea',d:"Poleas abajo: el arco sube al pecho, incide en el pectoral superior."},
 {n:"Fondos en paralelas",m:'pecho',e:'corporal',d:"Inclina el torso al frente para el pecho. Baja hasta que el hombro quede a la altura del codo."},
 {n:"Fondos en máquina asistida",m:'pecho',e:'maquina',d:"Igual técnica, con contrapeso. Útil para aprender el patrón."},
 {n:"Flexiones",m:'pecho',e:'corporal',d:"Cuerpo en línea recta, abdomen firme. Codos a 45°, no abiertos en cruz."},
 {n:"Press de suelo con kettlebell",m:'pecho',e:'kettlebell',d:"Recorrido corto: el codo toca el suelo y frena. Protege el hombro."},
 {n:"Remo con barra",m:'espalda',e:'barra',d:"Torso a unos 45°, espalda neutra. Lleva la barra al ombligo pegando los codos."},
 {n:"Remo Pendlay",m:'espalda',e:'barra',d:"Cada repetición parte del suelo, torso paralelo. Explosivo al subir."},
 {n:"Remo en punta (T-bar)",m:'espalda',e:'barra',d:"Pecho apoyado o torso firme. Codos cerca del cuerpo, aprieta escápulas."},
 {n:"Remo con mancuerna",m:'espalda',e:'mancuerna',d:"Apoya rodilla y mano en el banco. Tira del codo hacia la cadera, sin girar el torso."},
 {n:"Remo con kettlebell",m:'espalda',e:'kettlebell',d:"Igual patrón que con mancuerna; el agarre bajo exige más al antebrazo."},
 {n:"Remo en máquina",m:'espalda',e:'maquina',d:"Pecho contra el respaldo. Junta escápulas antes de doblar el codo."},
 {n:"Remo apoyado en pecho en máquina",m:'espalda',e:'maquina',d:"El apoyo elimina el balanceo: aísla bien la espalda media."},
 {n:"Remo en polea baja",m:'espalda',e:'polea',d:"Espalda recta, sin mecerte. Lleva el agarre al abdomen y aprieta atrás."},
 {n:"Remo en polea a una mano",m:'espalda',e:'polea',d:"Permite más recorrido y corregir descompensaciones entre lados."},
 {n:"Remo en multipower",m:'espalda',e:'multipower',d:"Altura fija de la barra. Mantén el torso constante durante toda la serie."},
 {n:"Jalón al pecho",m:'espalda',e:'polea',d:"Agarre algo más ancho que los hombros. Baja a la clavícula llevando los codos abajo."},
 {n:"Jalón agarre neutro",m:'espalda',e:'polea',d:"Palmas enfrentadas. Más cómodo de hombro y con buen trabajo dorsal."},
 {n:"Jalón a una mano",m:'espalda',e:'polea',d:"Unilateral: corrige asimetrías y permite girar ligeramente la muñeca."},
 {n:"Dominadas",m:'espalda',e:'corporal',d:"Cuelga con escápulas activas. Sube llevando el pecho a la barra, sin impulso."},
 {n:"Dominadas asistidas en máquina",m:'espalda',e:'maquina',d:"Mismo patrón con contrapeso. Baja la asistencia según progreses."},
 {n:"Pullover en polea",m:'espalda',e:'polea',d:"Brazos casi rectos. Lleva la barra desde arriba al muslo con el dorsal."},
 {n:"Pullover con mancuerna",m:'espalda',e:'mancuerna',d:"Tumbado, baja tras la cabeza abriendo la caja torácica. Sin arquear la lumbar."},
 {n:"Encogimientos con barra",m:'espalda',e:'barra',d:"Solo sube los hombros hacia las orejas. No gires ni flexiones el codo."},
 {n:"Encogimientos con mancuernas",m:'espalda',e:'mancuerna',d:"Igual, con más libertad de recorrido. Aguanta un instante arriba."},
 {n:"Hiperextensiones",m:'espalda',e:'corporal',d:"Sube hasta alinear el tronco, sin pasarte. Trabaja lumbar y glúteo."},
 {n:"Press militar",m:'hombro',e:'barra',d:"De pie, abdomen y glúteo firmes. Empuja arriba sin arquear la espalda."},
 {n:"Press militar con mancuernas",m:'hombro',e:'mancuerna',d:"Permite recorrido natural del hombro. Baja hasta la altura de la barbilla."},
 {n:"Press de hombro en multipower",m:'hombro',e:'multipower',d:"Guiado; siéntate de forma que la barra pase cerca de la cara."},
 {n:"Press de hombro en máquina",m:'hombro',e:'maquina',d:"Respaldo firme. Sube sin bloquear del todo y controla la bajada."},
 {n:"Press Arnold",m:'hombro',e:'mancuerna',d:"Empieza con palmas hacia ti y gira mientras subes. Más recorrido del deltoides."},
 {n:"Press con kettlebell",m:'hombro',e:'kettlebell',d:"El peso cae tras la muñeca: exige más estabilidad del hombro."},
 {n:"Elevaciones laterales",m:'hombro',e:'mancuerna',d:"Codos algo flexionados. Sube por abducción hasta la horizontal, sin balanceo."},
 {n:"Elevaciones laterales en polea",m:'hombro',e:'polea',d:"Tensión constante en todo el recorrido, sobre todo abajo."},
 {n:"Elevaciones laterales en máquina",m:'hombro',e:'maquina',d:"Empuja con el codo contra la almohadilla, no con la mano."},
 {n:"Elevaciones frontales con mancuernas",m:'hombro',e:'mancuerna',d:"Sube al frente hasta la altura del hombro. Sin impulso de cadera."},
 {n:"Elevaciones frontales con disco",m:'hombro',e:'barra',d:"Agarra el disco a los lados. Recorrido controlado hasta los ojos."},
 {n:"Elevaciones frontales en polea",m:'hombro',e:'polea',d:"Desde atrás del cuerpo: mayor rango y tensión mantenida."},
 {n:"Pájaros con mancuernas",m:'hombro',e:'mancuerna',d:"Torso inclinado, abre en arco. Trabaja el deltoides posterior."},
 {n:"Pájaros en máquina",m:'hombro',e:'maquina',d:"Pecho apoyado. Abre llevando los codos atrás, sin encoger el trapecio."},
 {n:"Face pull",m:'hombro',e:'polea',d:"Cuerda a la altura de la cara. Separa las manos y lleva los codos altos y atrás."},
 {n:"Remo al mentón con barra",m:'hombro',e:'barra',d:"Agarre medio. Sube los codos por encima de las manos, sin pasar del pecho."},
 {n:"Remo al mentón en polea",m:'hombro',e:'polea',d:"Igual patrón con tensión constante y menos tirón en la muñeca."},
 {n:"Curl de bíceps",m:'biceps',e:'barra',d:"Codos pegados al costado. Sube sin balancear la espalda y baja despacio."},
 {n:"Curl con barra Z",m:'biceps',e:'barra',d:"El agarre en zeta reduce la tensión en muñeca y codo."},
 {n:"Curl con mancuernas",m:'biceps',e:'mancuerna',d:"Puedes supinar al subir para contraer más el bíceps."},
 {n:"Curl martillo",m:'biceps',e:'mancuerna',d:"Agarre neutro todo el recorrido. Incide en braquial y antebrazo."},
 {n:"Curl concentrado",m:'biceps',e:'mancuerna',d:"Codo apoyado en el muslo. Máximo aislamiento, sin ayuda del cuerpo."},
 {n:"Curl en banco inclinado",m:'biceps',e:'mancuerna',d:"Brazos por detrás del torso: gran estiramiento en la parte baja."},
 {n:"Curl araña",m:'biceps',e:'mancuerna',d:"Pecho apoyado en banco inclinado. Elimina cualquier balanceo."},
 {n:"Curl predicador con barra",m:'biceps',e:'barra',d:"Brazos sobre el atril. No extiendas del todo abajo para no forzar el codo."},
 {n:"Curl predicador en máquina",m:'biceps',e:'maquina',d:"Recorrido guiado con resistencia pareja en todo el rango."},
 {n:"Curl en polea",m:'biceps',e:'polea',d:"Tensión constante. Mantén el codo fijo y aprieta arriba."},
 {n:"Curl en polea a una mano",m:'biceps',e:'polea',d:"Unilateral, útil para igualar fuerza entre brazos."},
 {n:"Curl con kettlebell",m:'biceps',e:'kettlebell',d:"El centro de masa desplazado añade trabajo al antebrazo."},
 {n:"Extensión de tríceps en polea",m:'triceps',e:'polea',d:"Codos pegados al cuerpo. Solo se mueve el antebrazo."},
 {n:"Extensión en polea con cuerda",m:'triceps',e:'polea',d:"Separa las manos al final para contraer más el tríceps."},
 {n:"Extensión en polea agarre inverso",m:'triceps',e:'polea',d:"Palmas arriba. Incide en la cabeza lateral del tríceps."},
 {n:"Extensión sobre la cabeza en polea",m:'triceps',e:'polea',d:"Brazos arriba: estira la cabeza larga del tríceps."},
 {n:"Press francés con barra Z",m:'triceps',e:'barra',d:"Baja hacia la frente con el codo quieto. Controla en la bajada."},
 {n:"Press francés con mancuernas",m:'triceps',e:'mancuerna',d:"Permite un ángulo más cómodo de muñeca y codo."},
 {n:"Fondos en banco",m:'triceps',e:'corporal',d:"Manos en el banco tras la espalda. Baja hasta 90° de codo, sin encoger hombros."},
 {n:"Fondos en máquina",m:'triceps',e:'maquina',d:"Torso vertical para cargar el tríceps. Recorrido controlado."},
 {n:"Patada de tríceps",m:'triceps',e:'mancuerna',d:"Brazo paralelo al suelo. Extiende sin mover el hombro."},
 {n:"Patada de tríceps en polea",m:'triceps',e:'polea',d:"Tensión constante en el bloqueo final del codo."},
 {n:"Press cerrado en multipower",m:'triceps',e:'multipower',d:"Guiado, permite cargar el tríceps con seguridad."},
 {n:"Extensión de tríceps en máquina",m:'triceps',e:'maquina',d:"Codos fijos en el apoyo. Extiende y vuelve sin soltar la tensión."},
 {n:"Sentadilla",m:'cuadriceps',e:'barra',d:"Pies a la anchura de los hombros. Baja con la espalda neutra hasta romper el paralelo."},
 {n:"Sentadilla frontal",m:'cuadriceps',e:'barra',d:"Barra sobre los deltoides, codos altos. Torso más vertical, más cuádriceps."},
 {n:"Sentadilla Zercher",m:'cuadriceps',e:'barra',d:"Barra en la flexura de los codos. Exige mucho al tronco; sube el peso poco a poco."},
 {n:"Sentadilla con mancuernas",m:'cuadriceps',e:'mancuerna',d:"Mancuernas a los lados. Buena opción para aprender el patrón."},
 {n:"Sentadilla goblet",m:'cuadriceps',e:'kettlebell',d:"Peso al pecho: ayuda a mantener el torso vertical y bajar más."},
 {n:"Sentadilla en multipower",m:'cuadriceps',e:'multipower',d:"Recorrido guiado; adelanta algo los pies para cargar más el cuádriceps."},
 {n:"Sentadilla hack",m:'cuadriceps',e:'maquina',d:"Espalda apoyada. Aísla el cuádriceps con poca demanda lumbar."},
 {n:"Sentadilla lever",m:'cuadriceps',e:'maquina',d:"Máquina de palanca, patrón estable y seguro para cargar."},
 {n:"Sentadilla con cinturón en máquina",m:'cuadriceps',e:'maquina',d:"La carga va a la cadera, no a la columna. Ideal si molesta la lumbar."},
 {n:"Sentadilla búlgara",m:'cuadriceps',e:'mancuerna',d:"Pie trasero elevado. Baja vertical sobre la pierna delantera."},
 {n:"Sentadilla búlgara en multipower",m:'cuadriceps',e:'multipower',d:"Guiada: más fácil mantener el equilibrio y cargar."},
 {n:"Prensa de piernas",m:'cuadriceps',e:'maquina',d:"Pies a la anchura de la cadera. Baja hasta 90° sin despegar la lumbar."},
 {n:"Prensa horizontal",m:'cuadriceps',e:'maquina',d:"Mismo patrón sentado. Cómoda y fácil de progresar."},
 {n:"Zancadas",m:'cuadriceps',e:'mancuerna',d:"Paso largo, rodilla trasera casi al suelo. Torso erguido."},
 {n:"Zancadas caminando",m:'cuadriceps',e:'mancuerna',d:"Encadena pasos manteniendo el control en cada bajada."},
 {n:"Zancadas en multipower",m:'cuadriceps',e:'multipower',d:"Guiada; permite centrarse en la pierna sin pelear el equilibrio."},
 {n:"Extensión de cuádriceps",m:'cuadriceps',e:'maquina',d:"Ajusta el eje a la rodilla. Extiende y aguanta un instante arriba."},
 {n:"Step up al cajón",m:'cuadriceps',e:'mancuerna',d:"Sube empujando con el talón de la pierna de arriba, sin impulsarte con la otra."},
 {n:"Sissy squat",m:'cuadriceps',e:'corporal',d:"Rodillas al frente y cadera extendida. Gran estiramiento del cuádriceps."},
 {n:"Curl femoral",m:'isquios',e:'maquina',d:"Tumbado. Lleva el talón al glúteo sin despegar la cadera."},
 {n:"Curl femoral sentado",m:'isquios',e:'maquina',d:"Sentado, con la cadera flexionada: más tensión en el isquio."},
 {n:"Curl femoral de pie",m:'isquios',e:'maquina',d:"Unilateral, útil para corregir diferencias entre piernas."},
 {n:"Peso muerto rumano",m:'isquios',e:'barra',d:"Rodillas casi fijas. Lleva la cadera atrás y baja la barra pegada a la pierna."},
 {n:"Peso muerto rumano con mancuernas",m:'isquios',e:'mancuerna',d:"Mismo patrón de cadera, con recorrido algo más libre."},
 {n:"Peso muerto rumano en multipower",m:'isquios',e:'multipower',d:"Barra guiada: más fácil mantener la trayectoria pegada."},
 {n:"Peso muerto convencional",m:'isquios',e:'barra',d:"Barra pegada a la espinilla. Empuja el suelo y extiende cadera y rodilla a la vez."},
 {n:"Peso muerto sumo",m:'isquios',e:'barra',d:"Pies anchos y punteras abiertas. Torso más vertical, más aductor y glúteo."},
 {n:"Peso muerto a una pierna",m:'isquios',e:'mancuerna',d:"Trabaja equilibrio y cadena posterior. Cadera atrás, espalda neutra."},
 {n:"Peso muerto con kettlebell",m:'isquios',e:'kettlebell',d:"Buen ejercicio para aprender la bisagra de cadera con poca carga."},
 {n:"Buenos días",m:'isquios',e:'barra',d:"Barra en la espalda. Bisagra de cadera con la espalda muy firme; carga prudente."},
 {n:"Curl nórdico",m:'isquios',e:'corporal',d:"Baja despacio resistiendo con el isquio. Muy exigente, empieza asistido."},
 {n:"Hiperextensión 45°",m:'isquios',e:'corporal',d:"Bisagra de cadera con el tronco alineado. No hiperextiendas la lumbar."},
 {n:"Hip thrust",m:'gluteo',e:'barra',d:"Espalda alta en el banco. Empuja con el talón y aprieta el glúteo arriba."},
 {n:"Hip thrust en máquina",m:'gluteo',e:'maquina',d:"Mismo patrón, más cómodo de montar y progresar."},
 {n:"Hip thrust en multipower",m:'gluteo',e:'multipower',d:"Barra guiada; facilita mantener la trayectoria vertical."},
 {n:"Puente de glúteo",m:'gluteo',e:'corporal',d:"Desde el suelo, recorrido corto. Aprieta el glúteo sin arquear la lumbar."},
 {n:"Patada de glúteo en polea",m:'gluteo',e:'polea',d:"Extiende la cadera atrás con la rodilla algo flexionada, sin arquear la espalda."},
 {n:"Patada de glúteo en máquina",m:'gluteo',e:'maquina',d:"Guiada: aísla bien el glúteo con poco trabajo de estabilización."},
 {n:"Abducción de cadera en máquina",m:'gluteo',e:'maquina',d:"Abre las piernas contra la resistencia. Inclínate algo al frente para el glúteo medio."},
 {n:"Abducción con banda",m:'gluteo',e:'banda',d:"Banda por encima de la rodilla. Abre sin dejar caer la cadera."},
 {n:"Zancada inversa",m:'gluteo',e:'mancuerna',d:"Paso atrás: más glúteo y menos tensión en la rodilla que la zancada frontal."},
 {n:"Sentadilla sumo con mancuerna",m:'gluteo',e:'mancuerna',d:"Pies anchos y punteras fuera. Incide en glúteo y aductor."},
 {n:"Step up lateral",m:'gluteo',e:'mancuerna',d:"Sube de lado al cajón, controlando la rodilla. Trabaja el glúteo medio."},
 {n:"Elevación de gemelos",m:'gemelos',e:'maquina',d:"De pie, sube al máximo y baja hasta estirar. Recorrido completo, sin rebotes."},
 {n:"Elevación de gemelos sentado",m:'gemelos',e:'maquina',d:"Rodilla flexionada: incide más en el sóleo."},
 {n:"Elevación de gemelos en prensa",m:'gemelos',e:'maquina',d:"Empuja con la punta del pie; controla la bajada."},
 {n:"Elevación de gemelos en multipower",m:'gemelos',e:'multipower',d:"Barra guiada, cómodo para cargar y hacer pausas arriba."},
 {n:"Elevación de gemelos con mancuernas",m:'gemelos',e:'mancuerna',d:"Una mancuerna en la mano; apóyate para no perder equilibrio."},
 {n:"Elevación de gemelos a una pierna",m:'gemelos',e:'corporal',d:"Unilateral, con todo el peso corporal. Sube el rango poco a poco."},
 {n:"Plancha",m:'core',e:'corporal',d:"Cuerpo en línea recta. Aprieta abdomen y glúteo; no dejes caer la cadera."},
 {n:"Plancha lateral",m:'core',e:'corporal',d:"Apoyo en antebrazo y canto del pie. Cadera alta y alineada."},
 {n:"Elevación de piernas",m:'core',e:'corporal',d:"Lumbar pegada al suelo o colgado sin balanceo. Sube por flexión de cadera."},
 {n:"Elevación de rodillas colgado",m:'core',e:'corporal',d:"Sube las rodillas al pecho enrollando la pelvis, sin columpiarte."},
 {n:"Crunch en polea",m:'core',e:'polea',d:"De rodillas, enrolla la columna acercando codos a muslos. No tires con los brazos."},
 {n:"Crunch en máquina",m:'core',e:'maquina',d:"Recorrido guiado. Flexiona el tronco sin empujar con el cuello."},
 {n:"Rueda abdominal",m:'core',e:'corporal',d:"Avanza sin que la cadera caiga. Empieza de rodillas y rango corto."},
 {n:"Russian twist",m:'core',e:'mancuerna',d:"Sentado, gira el tronco de lado a lado con control, sin tirones."},
 {n:"Pallof press en polea",m:'core',e:'polea',d:"Antiroación: extiende los brazos resistiendo el giro. Cadera y hombros fijos."},
 {n:"Paseo del granjero",m:'core',e:'mancuerna',d:"Camina erguido con peso en ambas manos. Hombros atrás y abdomen firme."}
];
const FOOD_CATALOG=[
 {n:"Pechuga de pollo",g:"p",p:23,c:0,f:2},
 {n:"Pollo",g:"p",p:23,c:0,f:2},
 {n:"Pavo",g:"p",p:24,c:0,f:1.5},
 {n:"Ternera magra",g:"p",p:21,c:0,f:5},
 {n:"Lomo de cerdo",g:"p",p:22,c:0,f:6},
 {n:"Solomillo de cerdo",g:"p",p:21,c:0,f:4},
 {n:"Merluza",g:"p",p:17,c:0,f:2},
 {n:"Bacalao",g:"p",p:18,c:0,f:1},
 {n:"Salmón",g:"p",p:20,c:0,f:13},
 {n:"Sardinas",g:"p",p:21,c:0,f:10},
 {n:"Atún",g:"p",p:23,c:0,f:1},
 {n:"Atún al natural",g:"p",p:23,c:0,f:1},
 {n:"Gambas",g:"p",p:18,c:0,f:1},
 {n:"Huevos enteros",g:"p",p:13,c:1,f:11},
 {n:"Huevos",g:"p",p:13,c:1,f:11},
 {n:"Claras de huevo",g:"p",p:11,c:1,f:0},
 {n:"Skyr",g:"p",p:11,c:4,f:0.2},
 {n:"Yogur griego 0%",g:"p",p:10,c:4,f:0},
 {n:"Queso fresco batido 0%",g:"p",p:8,c:4,f:0},
 {n:"Requesón",g:"p",p:11,c:3,f:4},
 {n:"Jamón cocido",g:"p",p:18,c:1,f:3},
 {n:"Fiambre de pavo",g:"p",p:17,c:1,f:2},
 {n:"Legumbre + huevo",g:"p",p:12,c:18,f:4},
 {n:"Tofu",g:"p",p:12,c:2,f:7},
 {n:"Seitán",g:"p",p:24,c:4,f:2},
 {n:"Proteína whey",g:"p",p:80,c:6,f:6},
 {n:"Arroz",g:"c",p:7,c:78,f:0.6},
 {n:"Arroz integral",g:"c",p:7,c:76,f:2.5},
 {n:"Pasta",g:"c",p:12,c:71,f:1.5},
 {n:"Pasta integral",g:"c",p:13,c:65,f:2.5},
 {n:"Avena",g:"c",p:13,c:60,f:7},
 {n:"Pan integral",g:"c",p:9,c:43,f:3},
 {n:"Pan de centeno",g:"c",p:8,c:48,f:1.5},
 {n:"Patata",g:"c",p:2,c:17,f:0.1},
 {n:"Boniato",g:"c",p:1.6,c:20,f:0.1},
 {n:"Quinoa",g:"c",p:14,c:64,f:6},
 {n:"Cous cous",g:"c",p:13,c:72,f:1},
 {n:"Bulgur",g:"c",p:12,c:76,f:1.3},
 {n:"Legumbres",g:"c",p:9,c:20,f:0.5},
 {n:"Fruta",g:"c",p:0.7,c:14,f:0.2},
 {n:"Maíz dulce",g:"c",p:3,c:19,f:1},
 {n:"Tortitas de arroz",g:"c",p:8,c:81,f:3},
 {n:"Tortitas de maíz",g:"c",p:7,c:78,f:2},
 {n:"Copos de maíz sin azúcar",g:"c",p:7,c:84,f:1},
 {n:"Muesli sin azúcar",g:"c",p:10,c:60,f:8},
 {n:"Aceite de oliva",g:"f",p:0,c:0,f:100},
 {n:"Aguacate",g:"f",p:2,c:2,f:15},
 {n:"Frutos secos",g:"f",p:15,c:7,f:60},
 {n:"Frutos secos naturales",g:"f",p:15,c:7,f:60},
 {n:"Nueces",g:"f",p:15,c:7,f:65},
 {n:"Almendras",g:"f",p:21,c:9,f:50},
 {n:"Crema de cacahuete",g:"f",p:25,c:12,f:50},
 {n:"Crema 100% cacahuete",g:"f",p:25,c:12,f:50},
 {n:"Mantequilla de almendra",g:"f",p:21,c:19,f:55},
 {n:"Semillas",g:"f",p:18,c:10,f:45},
 {n:"Semillas de chía",g:"f",p:17,c:42,f:31},
 {n:"Queso curado",g:"f",p:25,c:1,f:33},
 {n:"Aceitunas",g:"f",p:1,c:1,f:15},
 {n:"Chocolate +70%",g:"f",p:8,c:30,f:43},
 {n:"Alioli ligero",g:"f",p:1,c:4,f:35}
];
const MACRO_LABEL={p:'Proteína',c:'Carbohidrato',f:'Grasa'};
const MACRO_CLASS={p:'protein',c:'carb',f:'fat'};
const CLASS_MACRO={protein:'p',carb:'c',fat:'f'};
function foodKcal(o){ return Math.round(o.p*4+o.c*4+o.f*9); }
function foodInfo(name){
  const n=norm(name);
  return FOOD_CATALOG.filter(function(o){ return norm(o.n)===n; })[0]||null;
}
function chipName(chip){
  const cl=chip.cloneNode(true);
  Array.prototype.forEach.call(cl.querySelectorAll('.chip-x,.chip-qty'),function(e){ e.remove(); });
  return cl.textContent.trim();
}
function setChipQty(chip,txt){
  let q=chip.querySelector('.chip-qty');
  if(!q){ q=document.createElement('span'); q.className='chip-qty';
    const x=chip.querySelector('.chip-x');
    if(x) chip.insertBefore(q,x); else chip.appendChild(q); }
  q.textContent=txt;
}

/* ---------- selector de alimentos ---------- */
let foodTargetGroup=null, foodTargetMacro='p';
function openFoodPicker(groupEl,macroClass){
  foodTargetGroup=groupEl;
  foodTargetMacro=CLASS_MACRO[macroClass]||'p';
  document.getElementById('foodPickerTitle').textContent=MACRO_LABEL[foodTargetMacro];
  document.getElementById('foodSearch').value='';
  toggleNewFood(false);
  renderFoodList();
  document.getElementById('foodPicker').classList.add('show');
}
function closeFoodPicker(){ document.getElementById('foodPicker').classList.remove('show'); foodTargetGroup=null; }
function renderFoodList(){
  const q=norm(document.getElementById('foodSearch').value.trim());
  const already=[];
  if(foodTargetGroup) Array.prototype.forEach.call(foodTargetGroup.querySelectorAll('.chip'),function(ch){
    if(!ch.classList.contains('chip-add')) already.push(norm(chipName(ch)));
  });
  const items=FOOD_CATALOG.filter(function(o){
      if(q && norm(o.n).indexOf(q)===-1) return false;
      return true;
    }).map(function(o){ return {o:o,s:(o.g===foodTargetMacro?0:1),dup:already.indexOf(norm(o.n))>-1}; })
    .sort(function(a,b){ return a.s-b.s || a.o.n.localeCompare(b.o.n,'es'); });
  const list=document.getElementById('foodList');
  if(!items.length){ list.innerHTML='<div class="picker-empty">Ningún alimento coincide con esa búsqueda.</div>'; return; }
  let html='',lastS=-1;
  items.forEach(function(it){
    if(it.s!==lastS){ html+='<div class="picker-group">'+(it.s===0?MACRO_LABEL[foodTargetMacro]:'Otros grupos')+'</div>'; lastS=it.s; }
    const o=it.o;
    html+='<div class="picker-item'+(it.dup?' current':'')+'" onclick="pickFood(this)" data-name="'+o.n+'" data-g="'+o.g+'">'
       +'<span><span class="picker-item-name">'+o.n+'</span>'
       +'<span class="food-macros">'+foodKcal(o)+' kcal · P '+o.p+' · C '+o.c+' · G '+o.f+' /100 g</span></span>'
       +(it.dup?'<span class="picker-item-eq">Ya está</span>':(o.custom?'<span class="picker-item-eq custom">Propio</span>':''))
       +'</div>';
  });
  list.innerHTML=html;
}
function pickFood(el){
  if(!foodTargetGroup) return;
  const name=el.dataset.name, g=el.dataset.g;
  const already=Array.prototype.filter.call(foodTargetGroup.querySelectorAll('.chip'),function(ch){
    return !ch.classList.contains('chip-add') && norm(chipName(ch))===norm(name); });
  if(already.length){ closeFoodPicker(); return; }
  const cls=MACRO_CLASS[g]||MACRO_CLASS[foodTargetMacro];
  const nc=document.createElement('div');
  nc.className='chip '+cls;
  nc.textContent=name;
  nc.onclick=function(){ pick(this); };
  const x=document.createElement('span');
  x.className='chip-x'; x.style.display='inline-block'; x.textContent='×';
  x.onclick=function(e){ e.stopPropagation(); const mb=nc.closest('.meal-block'); nc.remove(); if(mb) updateMealSummary(mb); calcularPlan(); };
  nc.appendChild(x);
  const addBtn=foodTargetGroup.querySelector('.chip-add');
  foodTargetGroup.insertBefore(nc,addBtn);
  const mb=nc.closest('.meal-block');
  if(mb) updateMealSummary(mb);
  closeFoodPicker();
  calcularPlan();
}
function toggleNewFood(show){
  document.getElementById('foodNewForm').classList.toggle('show',show);
  ['foodSearch','foodList'].forEach(function(id){ document.getElementById(id).style.display=show?'none':''; });
  document.getElementById('foodNewBtn').style.display=show?'none':'';
  document.getElementById('newFoodError').textContent='';
  if(show){
    document.getElementById('newFoodName').value=document.getElementById('foodSearch').value.trim();
    ['newFoodP','newFoodC','newFoodF'].forEach(function(id){ document.getElementById(id).value=''; });
    document.getElementById('newFoodGroup').innerHTML=['p','c','f'].map(function(k){
      return '<option value="'+k+'"'+(k===foodTargetMacro?' selected':'')+'>'+MACRO_LABEL[k]+'</option>'; }).join('');
  }
}
function saveNewFood(){
  const err=document.getElementById('newFoodError');
  const name=document.getElementById('newFoodName').value.trim();
  if(!name){ err.textContent='Escribe un nombre para el alimento.'; return; }
  if(foodInfo(name)){ err.textContent='Ya existe un alimento con ese nombre.'; return; }
  const p=parseFloat(document.getElementById('newFoodP').value);
  const cc=parseFloat(document.getElementById('newFoodC').value);
  const f=parseFloat(document.getElementById('newFoodF').value);
  if([p,cc,f].some(function(v){ return isNaN(v)||v<0; })){ err.textContent='Introduce los macros por 100 g (pon 0 si no tiene).'; return; }
  if(p+cc+f>100){ err.textContent='Los macros no pueden sumar más de 100 g por cada 100 g.'; return; }
  const g=document.getElementById('newFoodGroup').value;
  FOOD_CATALOG.push({n:name,g:g,p:p,c:cc,f:f,custom:true});
  toggleNewFood(false);
  const fake=document.createElement('div');
  fake.dataset.name=name; fake.dataset.g=g;
  pickFood(fake);
}

/* ---------- calculadora de cantidades ---------- */
function det3(m){
  return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
       - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
       + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
}
function solve3(M,t){
  const d=det3(M);
  if(Math.abs(d)<1e-6) return null;
  const out=[];
  for(let col=0;col<3;col++){
    const Mi=M.map(function(row,r){ return row.map(function(v,cIdx){ return cIdx===col?t[r]:v; }); });
    out.push(det3(Mi)/d);
  }
  return out;
}
function nnSolve(M,t){
  const x=solve3(M,t);
  if(x && x.every(function(v){ return v>=-1e-9; })) return x.map(function(v){ return Math.max(0,v); });
  let best=null;
  for(let drop=0;drop<3;drop++){
    const keep=[0,1,2].filter(function(k){ return k!==drop; });
    const rows=(drop===2)?[0,1]:(drop===1?[0,2]:[1,2]);
    const A=[[M[rows[0]][keep[0]],M[rows[0]][keep[1]]],[M[rows[1]][keep[0]],M[rows[1]][keep[1]]]];
    const b=[t[rows[0]],t[rows[1]]];
    const d=A[0][0]*A[1][1]-A[0][1]*A[1][0];
    if(Math.abs(d)<1e-6) continue;
    const u=(b[0]*A[1][1]-A[0][1]*b[1])/d;
    const v=(A[0][0]*b[1]-b[0]*A[1][0])/d;
    if(u<-1e-9||v<-1e-9) continue;
    const sol=[0,0,0]; sol[keep[0]]=u; sol[keep[1]]=v;
    let err=0;
    for(let r=0;r<3;r++){
      let got=0; for(let k=0;k<3;k++) got+=M[r][k]*sol[k];
      err+=(r===0?1.5:(r===1?1:0.7))*Math.abs(got-t[r]);
    }
    if(!best||err<best.err) best={sol:sol,err:err};
  }
  if(best) return best.sol;
  return (x||[0,0,0]).map(function(v){ return Math.max(0,v); });
}
function calcularPlan(){
  const res=document.getElementById('calcResult');
  const kcal=parseFloat(document.getElementById('calcKcal').value);
  const pPct=parseFloat(document.getElementById('calcP').value);
  const cPct=parseFloat(document.getElementById('calcC').value);
  const fPct=parseFloat(document.getElementById('calcF').value);
  if(!kcal||kcal<=0){ res.innerHTML='<div class="calc-warn">Introduce las calorías objetivo.</div>'; return; }
  if([pPct,cPct,fPct].some(function(v){ return isNaN(v)||v<0; })){ res.innerHTML='<div class="calc-warn">Revisa los porcentajes de macros.</div>'; return; }
  const sum=pPct+cPct+fPct;
  if(Math.abs(sum-100)>0.5){ res.innerHTML='<div class="calc-warn">Los macros deben sumar 100 % — ahora suman '+Math.round(sum)+' %.</div>'; return; }
  if(!mealBlocks().length){
    const dP=kcal*pPct/100/4, dC=kcal*cPct/100/4, dF=kcal*fPct/100/9;
    window.objNutri={kcal:kcal,p:dP,c:dC,f:dF};
    setTxt('resKcal',fmtMil(kcal)+' kcal');
    setTxt('resP',Math.round(dP)+' g'); setTxt('resC',Math.round(dC)+' g'); setTxt('resF',Math.round(dF)+' g');
    setTxt('resNote','Objetivo fijado · aún sin comidas en el plan');
    recalcConsumo(); recalcCumplimiento(); recalcProgreso();
    res.innerHTML='<div class="calc-warn">Añade comidas al plan para repartir estas calorías.</div>';
    return;
  }
  const mealInputs=Array.prototype.slice.call(document.querySelectorAll('.calc-meal'));
  const mealPct=mealInputs.map(function(i){ return parseFloat(i.value)||0; });
  const mSum=mealPct.reduce(function(a,b){ return a+b; },0);
  if(Math.abs(mSum-100)>0.5){ res.innerHTML='<div class="calc-warn">El reparto por comidas debe sumar 100 % — ahora suma '+Math.round(mSum)+' %.</div>'; return; }
  const dayP=kcal*pPct/100/4, dayC=kcal*cPct/100/4, dayF=kcal*fPct/100/9;
  const blocks=mealBlocks();
  let gotP=0,gotC=0,gotF=0,avisos=0;
  blocks.forEach(function(b,i){
    const share=mealPct[i]/100;
    const t=[dayP*share,dayC*share,dayF*share];
    const body=b.querySelector('.meal-body')||b;
    const sel=['protein','carb','fat'].map(function(m){ return body.querySelector('.chip.'+m+'.selected'); });
    const old=b.querySelector('.meal-calc');
    if(old) old.remove();
    const box=document.createElement('div');
    box.className='meal-calc';
    if(sel.some(function(s){ return !s; })){
      box.innerHTML='<div class="meal-calc-warn">Elige una opción de cada columna para calcular las cantidades.</div>';
      body.appendChild(box); avisos++; return;
    }
    const infos=sel.map(function(s){ return foodInfo(chipName(s)); });
    if(infos.some(function(o){ return !o; })){
      box.innerHTML='<div class="meal-calc-warn">Falta la ficha de macros de algún alimento de esta comida.</div>';
      body.appendChild(box); avisos++; return;
    }
    const M=[[infos[0].p,infos[1].p,infos[2].p],
             [infos[0].c,infos[1].c,infos[2].c],
             [infos[0].f,infos[1].f,infos[2].f]];
    const grams=nnSolve(M,t).map(function(v){ return Math.round(v*100/5)*5; });
    let mp=0,mc=0,mf=0;
    grams.forEach(function(g,k){ mp+=infos[k].p*g/100; mc+=infos[k].c*g/100; mf+=infos[k].f*g/100; });
    gotP+=mp; gotC+=mc; gotF+=mf;
    b.dataset.mp=mp; b.dataset.mc=mc; b.dataset.mf=mf;
    ['protein','carb','fat'].forEach(function(cls,k){
      const macroKey=CLASS_MACRO[cls];
      const aporte=infos[k][macroKey]*grams[k]/100;
      Array.prototype.forEach.call(body.querySelectorAll('.chip.'+cls),function(ch){
        if(ch.classList.contains('chip-add')) return;
        const inf=foodInfo(chipName(ch));
        if(!inf || !inf[macroKey]){ setChipQty(ch,''); return; }
        setChipQty(ch,'· '+Math.round(aporte/inf[macroKey]*100/5)*5+' g');
      });
    });
    let html='';
    infos.forEach(function(o,k){
      html+='<div class="meal-calc-row"><span>'+o.n+'</span><b>'+grams[k]+' g</b></div>';
    });
    const mKcal=Math.round(mp*4+mc*4+mf*9), tKcal=Math.round(t[0]*4+t[1]*4+t[2]*9);
    html+='<div class="meal-calc-tot">'+mKcal+' kcal · P '+Math.round(mp)+' · C '+Math.round(mc)+' · G '+Math.round(mf)+'</div>';
    if(tKcal && Math.abs(mKcal-tKcal)/tKcal>0.12){
      html+='<div class="meal-calc-warn">No cuadra con esta combinación ('+(mKcal>tKcal?'+':'')+(mKcal-tKcal)+' kcal). Prueba otra opción en alguna columna.</div>';
      avisos++;
    }
    box.innerHTML=html;
    body.appendChild(box);
  });
  document.getElementById('resKcal').textContent=Math.round(kcal)+' kcal';
  document.getElementById('resP').textContent=Math.round(dayP)+' g';
  document.getElementById('resC').textContent=Math.round(dayC)+' g';
  document.getElementById('resF').textContent=Math.round(dayF)+' g';
  document.getElementById('resNote').textContent='Reparto en '+blocks.length+' comidas · '+pPct+'/'+cPct+'/'+fPct+' %';
  window.objNutri={kcal:kcal,p:dayP,c:dayC,f:dayF};
  recalcConsumo();
  recalcCumplimiento();
  recalcProgreso();
  refreshAllSummaries();
  const gotKcal=Math.round(gotP*4+gotC*4+gotF*9);
  const diff=gotKcal-Math.round(kcal);
  res.innerHTML='<div class="calc-line"><span>Objetivo</span><b>'+Math.round(kcal)+' kcal · P '+Math.round(dayP)+' · C '+Math.round(dayC)+' · G '+Math.round(dayF)+'</b></div>'
    +'<div class="calc-line"><span>Conseguido</span><b>'+gotKcal+' kcal · P '+Math.round(gotP)+' · C '+Math.round(gotC)+' · G '+Math.round(gotF)+'</b></div>'
    +'<div class="calc-diff'+(Math.abs(diff)<=50?' ok':'')+'">'+(diff===0?'Cuadra exacto':(diff>0?'+':'')+diff+' kcal respecto al objetivo')
    +(avisos?' · '+avisos+' comida(s) a revisar':'')+'</div>';
}

let pickerTarget=null;
function norm(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function renderPickerFilters(){
  document.getElementById('pickerFilters').innerHTML=EQ_FILTERS.map(function(f){
    return '<div class="picker-filter'+(f===eqFilter?' on':'')+'" onclick="setEqFilter(\''+f+'\')">'+(f==='todos'?'Todos':EQ_LABEL[f])+'</div>';
  }).join('');
}
function setEqFilter(f){ eqFilter=f; renderPickerFilters(); renderPickerList(); }
function openExercisePicker(cell){
  if(!coachEditing) return;
  addEjBtn=null;
  pickerTarget=cell;
  document.getElementById('pickerCurrent').textContent=cell.textContent.replace(/\s*✎\s*$/,'').trim();
  document.getElementById('pickerSearch').value='';
  eqFilter='todos';
  toggleNewExercise(false);
  renderPickerFilters();
  renderPickerList();
  document.getElementById('exPicker').classList.add('show');
}
function closeExercisePicker(){
  document.getElementById('exPicker').classList.remove('show');
  pickerTarget=null;
}
function renderPickerList(){
  if(!pickerTarget && !addEjBtn) return;
  const mus=pickerTarget?pickerTarget.dataset.muscle:'pecho';
  const reg=REGION[mus];
  const cur=pickerTarget?pickerTarget.textContent.trim():'';
  const q=norm(document.getElementById('pickerSearch').value.trim());
  const items=EX_CATALOG.filter(function(e){
      if(eqFilter!=='todos' && e.e!==eqFilter) return false;
      return !q || norm(e.n).indexOf(q)>-1 || norm(EQ_LABEL[e.e]||'').indexOf(q)>-1;
    })
    .map(function(e){ return {n:e.n,m:e.m,eq:e.e,custom:e.custom,s:(e.m===mus?0:(REGION[e.m]===reg?1:2))}; })
    .sort(function(a,b){ return a.s-b.s || a.n.localeCompare(b.n,'es'); });
  const list=document.getElementById('pickerList');
  if(!items.length){ list.innerHTML='<div class="picker-empty">Ningún ejercicio coincide con esos filtros.</div>'; return; }
  const titles=['Recomendados para '+(MUS_LABEL[mus]||mus).toLowerCase(),'Mismo bloque muscular','Otros ejercicios'];
  let html='',lastS=-1;
  items.forEach(function(e){
    if(e.s!==lastS){ html+='<div class="picker-group">'+titles[e.s]+'</div>'; lastS=e.s; }
    html+='<div class="picker-item'+(e.n===cur?' current':'')+'" onclick="pickExercise(this)" data-name="'+e.n+'" data-mus="'+e.m+'">'
        +'<span class="picker-item-name">'+e.n+'</span><span class="picker-item-tags">'
        +(e.custom?'<span class="picker-item-eq custom">Propio</span>':'')
        +'<span class="picker-item-eq">'+(EQ_LABEL[e.eq]||e.eq)+'</span>'
        +'<span class="picker-item-mus">'+(MUS_LABEL[e.m]||e.m)+'</span></span></div>';
  });
  list.innerHTML=html;
}
function toggleNewExercise(show){
  if(show&&!pickerTarget&&!addEjBtn) return;
  const form=document.getElementById('pickerNewForm');
  form.classList.toggle('show',show);
  ['pickerSearch','pickerFilters','pickerList'].forEach(function(id){
    document.getElementById(id).style.display=show?'none':'';
  });
  document.getElementById('pickerNewBtn').style.display=show?'none':'';
  document.getElementById('newExError').textContent='';
  if(show){
    const mus=(pickerTarget&&pickerTarget.dataset.muscle)||'pecho';
    document.getElementById('newExName').value=document.getElementById('pickerSearch').value.trim();
    document.getElementById('newExMus').innerHTML=Object.keys(MUS_LABEL).map(function(k){
      return '<option value="'+k+'"'+(k===mus?' selected':'')+'>'+MUS_LABEL[k]+'</option>'; }).join('');
    document.getElementById('newExEq').innerHTML=Object.keys(EQ_LABEL).map(function(k){
      return '<option value="'+k+'">'+EQ_LABEL[k]+'</option>'; }).join('');
  }
}
function saveNewExercise(){
  const name=document.getElementById('newExName').value.trim();
  const err=document.getElementById('newExError');
  if(!name){ err.textContent='Escribe un nombre para el ejercicio.'; return; }
  if(EX_CATALOG.some(function(e){ return norm(e.n)===norm(name); })){
    err.textContent='Ya existe un ejercicio con ese nombre.'; return; }
  const mus=document.getElementById('newExMus').value;
  const eq=document.getElementById('newExEq').value;
  EX_CATALOG.push({n:name,m:mus,e:eq,custom:true});
  if(pickerTarget){
    pickerTarget.textContent=name;
    pickerTarget.dataset.muscle=mus;
  }
  toggleNewExercise(false);
  closeExercisePicker();
}
function descEditada(el){
  el.dataset.propia='1';
  el.classList.add('propia');
}
function descBlur(el){
  const t=el.textContent.replace(/\s+/g,' ').trim();
  if(!t){ restaurarDesc(el.nextElementSibling); }
}
function restaurarDesc(btn){
  const item=btn.closest('.ex-item');
  if(!item) return;
  const d=item.querySelector('.ex-desc');
  const nom=item.querySelector('.ex-name-cell');
  if(!d||!nom) return;
  d.textContent=descDe(chipName(nom))||'Sin descripción.';
  delete d.dataset.propia;
  d.classList.remove('propia');
}
function descDe(nombre){
  const f=EX_CATALOG.filter(function(x){ return norm(x.n)===norm(nombre); })[0];
  return f&&f.d?f.d:'';
}
function pickExercise(el){
  if(!pickerTarget && addEjBtn){
    const nom=el.dataset.name, mus=el.dataset.mus;
    addEjBtn.insertAdjacentHTML('beforebegin',filaEjercicio(nom,mus,3,10,2));
    if(coachEditing){
      const it=addEjBtn.previousElementSibling;
      it.querySelector('.ex-desc').setAttribute('contenteditable','true');
    }
    addEjBtn=null;
    closeExercisePicker();
    recalcEntreno(); recalcTonelaje(); guardarTodo();
    return;
  }
  if(!pickerTarget) return;
  const nombre=el.dataset.name;
  pickerTarget.textContent=nombre;
  pickerTarget.dataset.muscle=el.dataset.mus;
  const item=pickerTarget.closest('.ex-item');
  if(item){
    const d=item.querySelector('.ex-desc');
    if(d){
      d.textContent=descDe(nombre)||'Sin descripción. Puedes escribir una pauta aquí.';
      delete d.dataset.propia;
      d.classList.remove('propia');
    }
    item.dataset.video='';
    const v=item.querySelector('.ex-video');
    if(v) v.style.display='none';
  }
  closeExercisePicker();
}
function titleClick(ev){ if(coachEditing) ev.stopPropagation(); }
function titleEdited(el){ el.dataset.custom='1'; }
function titleBlur(el){
  const t=el.textContent.replace(/\s+/g,' ').trim();
  if(!t){ el.textContent='Comida'; delete el.dataset.custom; renumberMeals(); }
  else if(el.textContent!==t){ el.textContent=t; }
}
function titleKey(ev,el){ if(ev.key==='Enter'){ ev.preventDefault(); el.blur(); } }
const DIAS_L=['L','M','X','J','V','S','D'];
const DIAS_N=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function idxLunes(d){ return (d.getDay()+6)%7; }
function renderHoy(){
  const hoy=new Date(), i=idxLunes(hoy);
  const hechasSem=sesionCards().filter(function(s){ return s.classList.contains('hecha'); }).length;
  const fe=document.getElementById('hoyFecha');
  if(fe) fe.textContent=DIAS_N[i].charAt(0).toUpperCase()+DIAS_N[i].slice(1)+' '+hoy.getDate()+' de '+MESES[hoy.getMonth()];
  const row=document.getElementById('weekRow');
  if(row){
    let h='';
    for(let d=0;d<7;d++){
      const cls=['week-dot'];
      if(d===0) cls.push('segui');
      if(d<hechasSem) cls.push('done');
      if(d===i) cls.push('today');
      h+='<div class="week-day"><span class="lbl"'+(d===i?' style="color:var(--accent)"':'')+'>'+DIAS_L[d]+'</span>'
       +'<div class="'+cls.join(' ')+'">'+(d<hechasSem?'✓':'')+'</div>'
       +'<span class="week-flag">'+(d===0?'SEGUI.':'')+'</span></div>';
    }
    row.innerHTML=h;
  }
  const av=document.getElementById('seguiAviso');
  if(av){
    const faltan=(7-i)%7;
    const main=document.getElementById('seguiCuando');
    const cta=document.getElementById('seguiCta');
    av.classList.toggle('hoy',i===0);
    if(i===0){ main.textContent='¡Hoy toca rellenarlo!'; cta.textContent='Rellenar'; }
    else if(faltan===1){ main.textContent='Mañana lunes te toca'; cta.textContent='Ver'; }
    else { main.textContent='En '+faltan+' días · el lunes'; cta.textContent='Ver'; }
  }
}
function abrirNotis(){ document.getElementById('notiPop').classList.add('show'); }
function cerrarNotis(){
  document.getElementById('notiPop').classList.remove('show');
  document.getElementById('bellBadge').classList.add('hide');
}
const ESCALAS={
 agujetas:{1:'No has tenido nada de agujetas.',
  2:'Has notado un poco de tirantez unas 8-24 h tras la sesión, pero se ha resuelto antes de volver a entrenar ese grupo muscular.',
  3:'Agujetas leves-moderadas que se han resuelto totalmente justo antes de la sesión, o casi totalmente pero desaparecen al empezar a calentar.',
  4:'Agujetas moderadas-graves que persisten durante la siguiente sesión de entrenamiento de forma notoria.'},
 motiv:{1:'Me está resultando imposible cumplir con el plan, no me siento bien y estoy perdiendo las ganas de continuar.',
  2:'A veces dudo de mi progreso, siento que saco energías de donde no hay, sigo por compromiso, pero ya no siento la misma ilusión.',
  3:'Me siento un poco indiferente, cumplo con el plan como un autómata porque sé qué quiero conseguir y que este es el camino.',
  4:'Por lo general siento que estoy donde debo estar. Hay momentos más duros, pero me encanta lo que hago y estoy dispuesto a afrontar lo que venga.',
  5:'Me encanta mi preparación, lo estoy disfrutando muchísimo y me levanto todos los días pensando en que me voy a comer el mundo.'}
};
function setEscala(btn,grupo,n){
  Array.prototype.forEach.call(btn.parentElement.querySelectorAll('.esc-btn'),function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  document.getElementById(grupo+'Desc').textContent=ESCALAS[grupo][n];
}
function setRango(el,id){ document.getElementById(id).textContent=el.value; }
function guardarSeguimiento(){
  const b=document.getElementById('sgSave');
  const sec=document.getElementById('view-seguimiento');
  const txt=sec.querySelectorAll('.sg-text');
  const nums=sec.querySelectorAll('.row2col input');
  const peso=(nums[0]&&nums[0].value.trim())?nums[0].value.trim().replace('.',',')+' kg':'—';
  notificarCoach({
    cliente:(clienteActual&&clientesData[clienteActual])?clientesData[clienteActual].nombre:'Cliente', semana:'Nuevo', cuando:'Ahora mismo', leida:false,
    agujetas:leerEscala(sec,0)||'—', motiv:leerEscala(sec,1)||'—',
    entreno:document.getElementById('rEntreno').textContent,
    nutri:document.getElementById('rNutri').textContent,
    estres:document.getElementById('rEstres').textContent,
    peso:peso,
    progreso:txt[0]?txt[0].value.trim():'', obstaculos:txt[3]?txt[3].value.trim():''
  });
  b.textContent='Seguimiento enviado ✓';
  b.disabled=true;
  setTimeout(function(){ b.textContent='Enviar seguimiento'; b.disabled=false; goTo('hoy'); },1400);
}
let notisCoach=[];
function leerEscala(sec,i){
  const filas=sec.querySelectorAll('.esc-row');
  if(!filas[i]) return null;
  const on=filas[i].querySelector('.esc-btn.on');
  return on?on.textContent.trim():null;
}
function notificarCoach(datos){
  notisCoach.unshift(datos);
  programarGuardado();
  pintarNotisCoach();
  if(clienteActual){
    const tarj=document.querySelectorAll('#listaClientes .cliente-card');
    const idx=Object.keys(clientesData).indexOf(clienteActual);
    const t=tarj[idx];
    if(t && !t.querySelector('.adh-badge.nuevo')){
      const b=document.createElement('span');
      b.className='adh-badge nuevo';
      b.textContent='Seguimiento';
      t.querySelector('.cliente-flags').insertBefore(b,t.querySelector('.cliente-flags').firstChild);
    }
  }
  const card=document.getElementById('seguiList');
  if(card){
    const d=document.createElement('div');
    d.className='segui-card nuevo';
    d.innerHTML='<div class="segui-head"><span class="segui-week">'+datos.semana+' <span class="adh-badge nuevo">Nuevo</span></span>'
      +'<span class="segui-peso">'+datos.peso+'</span></div>'
      +'<div class="segui-stats">'
      +'<div><span class="segui-lbl">Entreno</span><span class="segui-val">'+datos.entreno+'/10</span></div>'
      +'<div><span class="segui-lbl">Nutrición</span><span class="segui-val">'+datos.nutri+'/10</span></div>'
      +'<div><span class="segui-lbl">Motivación</span><span class="segui-val">'+datos.motiv+'/5</span></div>'
      +'<div><span class="segui-lbl">Estrés</span><span class="segui-val">'+datos.estres+'/10</span></div></div>'
      +'<div class="segui-note"><b>Agujetas — </b>Nivel '+datos.agujetas+' sobre 4.</div>'
      +(datos.progreso?'<div class="segui-note"><b>Progreso — </b>'+datos.progreso+'</div>':'')
      +(datos.obstaculos?'<div class="segui-note"><b>Obstáculos — </b>'+datos.obstaculos+'</div>':'');
    card.insertBefore(d,card.firstElementChild);
    pintarSeguimientos();
  }
}
function pintarNotisCoach(){
  const b=document.getElementById('coachBellBadge');
  const list=document.getElementById('notiListCoach');
  if(!b||!list) return;
  const sinLeer=notisCoach.filter(function(n){ return !n.leida; }).length;
  b.textContent=sinLeer;
  b.classList.toggle('hide',sinLeer===0);
  if(!notisCoach.length){
    list.innerHTML='<div class="picker-empty">No hay notificaciones nuevas.</div>';
    return;
  }
  list.innerHTML=notisCoach.map(function(n){
    return '<div class="noti-item" onclick="cerrarNotisCoach();goToCliente(\'marta\');goToSeguimientos()">'
      +'<div class="noti-ico">📋</div><div class="noti-txt"><b>'+n.cliente+' ha enviado su seguimiento</b>'
      +'<span>Entreno '+n.entreno+'/10 · Nutrición '+n.nutri+'/10 · Motivación '+n.motiv+'/5 · '+n.peso+'</span>'
      +'<span class="noti-when">'+n.cuando+'</span></div></div>';
  }).join('');
}
function abrirNotisCoach(){ pintarNotisCoach(); document.getElementById('notiPopCoach').classList.add('show'); }
function cerrarNotisCoach(){
  document.getElementById('notiPopCoach').classList.remove('show');
  notisCoach.forEach(function(n){ n.leida=true; });
  pintarNotisCoach();
}
let vmTarget=null;
function ytId(u){
  const m=String(u).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m?m[1]:null;
}
function abrirVideoModal(btn){
  vmTarget=btn.closest('.ex-item');
  const nom=vmTarget.querySelector('.ex-name-cell');
  document.getElementById('vmEx').textContent=nom?chipName(nom):'Ejercicio';
  document.getElementById('vmUrl').value=vmTarget.dataset.video||'';
  document.getElementById('vmError').textContent='';
  document.getElementById('videoModal').classList.add('show');
}
function cerrarVideoModal(){ document.getElementById('videoModal').classList.remove('show'); vmTarget=null; }
function pintarVideo(item){
  const a=item.querySelector('.ex-video');
  if(!a) return;
  if(item.dataset.video){ a.href=item.dataset.video; a.classList.add('on'); }
  else { a.removeAttribute('href'); a.classList.remove('on'); }
}
function guardarVideo(){
  if(!vmTarget) return;
  const u=document.getElementById('vmUrl').value.trim();
  const err=document.getElementById('vmError');
  if(!u){ err.textContent='Pega un enlace o pulsa Quitar.'; return; }
  if(!ytId(u)){ err.textContent='Ese enlace no parece de YouTube.'; return; }
  vmTarget.dataset.video=u;
  pintarVideo(vmTarget);
  cerrarVideoModal();
}
function quitarVideo(){
  if(!vmTarget) return;
  delete vmTarget.dataset.video;
  pintarVideo(vmTarget);
  cerrarVideoModal();
}
function fmtMil(n){
  n=Math.round(n);
  const s=String(Math.abs(n));
  let out='';
  for(let i=0;i<s.length;i++){
    if(i>0 && (s.length-i)%3===0) out+='.';
    out+=s[i];
  }
  return (n<0?'-':'')+out;
}
function setTxt(id,t){ const e=document.getElementById(id); if(e) e.textContent=t; }
function setArc(id,pct){
  const el=document.getElementById(id);
  if(!el) return;
  const C=2*Math.PI*44;
  if(!isFinite(pct)||pct<0) pct=0;
  if(pct>1) pct=1;
  el.setAttribute('stroke-dashoffset',(C*(1-pct)).toFixed(1));
}
function toggleComida(ev,el){
  ev.stopPropagation();
  const b=el.closest('.meal-block');
  b.classList.toggle('eaten');
  programarGuardado();
  recalcConsumo();
  recalcCumplimiento();
  recalcProgreso();
}
function recalcConsumo(){
  const blocks=mealBlocks();
  let p=0,cb=0,f=0,n=0;
  blocks.forEach(function(b){
    if(b.classList.contains('eaten')){
      p+=parseFloat(b.dataset.mp||0);
      cb+=parseFloat(b.dataset.mc||0);
      f+=parseFloat(b.dataset.mf||0);
      n++;
    }
  });
  const o=window.objNutri||{kcal:2000,p:150,c:225,f:56};
  const kcal=p*4+cb*4+f*9;
  setTxt('kcalObj',fmtMil(o.kcal));
  setTxt('kcalCome',fmtMil(kcal));
  setTxt('kcalRest',fmtMil(Math.max(0,o.kcal-kcal)));
  setTxt('kcalComidas',n+' de '+blocks.length);
  setTxt('mgP',Math.round(p)+' g');
  setTxt('mgC',Math.round(cb)+' g');
  setTxt('mgF',Math.round(f)+' g');
  setArc('kcalArc',o.kcal?kcal/o.kcal:0);
  setArc('mrPArc',o.p?p/o.p:0);
  setArc('mrCArc',o.c?cb/o.c:0);
  setArc('mrFArc',o.f?f/o.f:0);
}
function toggleMealBlock(head){
  const body=head.nextElementSibling, ch=head.querySelector('.meal-chevron');
  const open=body.classList.contains('open');
  body.classList.toggle('open',!open);
  ch.classList.toggle('open',!open);
}
function mealBlocks(){ return Array.prototype.slice.call(document.querySelectorAll('#comidasCont .meal-block')); }
function updateMealSummary(b){
  const el=b.querySelector('.meal-summary');
  if(!el) return;
  const names=['protein','carb','fat'].map(function(m){
    const ch=b.querySelector('.meal-body .chip.'+m+'.selected');
    return ch?chipName(ch):null;
  }).filter(Boolean);
  const tot=b.querySelector('.meal-calc-tot');
  el.innerHTML=(names.length?names.join(' · '):'Sin opciones elegidas')+(tot?' · <b>'+tot.textContent.split('·')[0].trim()+'</b>':'');
}
function refreshAllSummaries(){ mealBlocks().forEach(updateMealSummary); }
function renumberMeals(){
  mealBlocks().forEach(function(b,i){
    const t=b.querySelector('.meal-block-title');
    if(!t.dataset.custom) t.textContent='Comida '+(i+1);
  });
  syncCalcMeals();
}
function syncCalcMeals(){
  const row=document.getElementById('calcMealRow');
  if(!row) return;
  const prev=Array.prototype.slice.call(row.querySelectorAll('.calc-meal')).map(function(i){ return i.value; });
  const n=mealBlocks().length;
  let html='';
  for(let i=0;i<n;i++){
    const v=(i<prev.length)?prev[i]:10;
    html+='<label>C'+(i+1)+'<input type="number" oninput="calcularPlan()" class="calc-meal" value="'+v+'"></label>';
  }
  row.innerHTML=html;
}
function addMeal(){
  const cols=[['protein','Proteína','--protein','🥩'],['carb','Carbohidrato','--carb','🍚'],['fat','Grasa','--fat','🥑']];
  let groups='';
  cols.forEach(function(c){
    groups+='<div class="macro-group"><div class="macro-label '+c[0]+'">'
      +'<span class="macro-ico">'+c[3]+'</span>'+c[1]+'</div><div class="chips"></div></div>';
  });
  const div=document.createElement('div');
  div.className='meal-block';
  div.innerHTML='<div class="meal-head" onclick="toggleMealBlock(this)">'
    +'<div class="meal-head-txt"><div class="meal-block-title" onclick="titleClick(event)" oninput="titleEdited(this)" onblur="titleBlur(this)" onkeydown="titleKey(event,this)">Comida</div><div class="meal-summary"></div></div>'
    +'<div class="meal-actions"><span class="meal-eat" onclick="toggleComida(event,this)" title="Marcar como tomada">✓</span><span class="meal-del" onclick="removeMeal(event,this)">×</span><span class="meal-chevron open">⌄</span></div>'
    +'</div><div class="meal-body open">'+groups+'</div>';
  const cont=contNut();
  if(cont.querySelector('.vacio')) cont.innerHTML='';
  cont.appendChild(div);
  enableNutricionEdit();
  renumberMeals();
  if(coachEditing) div.querySelector('.meal-block-title').setAttribute('contenteditable','true');
  updateMealSummary(div);
  calcularPlan();
  div.scrollIntoView({behavior:'smooth',block:'center'});
}
function removeMeal(ev,el){
  ev.stopPropagation();
  if(mealBlocks().length<=1) return;
  el.closest('.meal-block').remove();
  if(!contNut().querySelectorAll('.meal-block').length) contNut().innerHTML=VACIO_NUT;
  renumberMeals();
  calcularPlan();
  guardarTodo();
}
function toggleSwitch(el){ el.classList.toggle('on'); }
const topScreens=['view-splash','view-coach-login','view-coach-2fa','view-alta','view-coach-panel','view-coach-cliente','view-coach-seguimientos','app'];
function showScreen(id){
  topScreens.forEach(function(s){ document.getElementById(s).style.display='none'; });
  document.getElementById(id).style.display='flex';
}
function goToAlta(){ showScreen('view-alta'); }
function backToSplash(){ showScreen('view-splash'); }
function backToPanel(){ showScreen('view-coach-panel'); }
const COACHES=[
  {u:'Domingo',p:'demo1234',rol:'entrenador',mail:'domingo@ejemplo.com'},
  {u:'Fátima',p:'demo1234',rol:'dietista',mail:'fatima@ejemplo.com'}
];
let coachPend=null, coachActivo=null, fa2Esperado='';
function maskMail(m){
  const p=m.split('@');
  return p[0].slice(0,3)+'•••@'+p[1];
}
const TRUST_KEY='fsd_dispositivos_confianza';
const TRUST_DIAS=30;
let trustMem=null;
function trustRead(){
  if(trustMem) return trustMem;
  try{ trustMem=JSON.parse(localStorage.getItem(TRUST_KEY)||'{}'); }
  catch(e){ trustMem={}; }
  return trustMem;
}
function trustWrite(o){
  trustMem=o;
  try{ localStorage.setItem(TRUST_KEY,JSON.stringify(o)); }catch(e){}
}
function esConfiable(u){
  const t=trustRead()[norm(u)];
  if(!t) return false;
  if(Date.now()>t){ trustOlvidar(u); return false; }
  return true;
}
function trustGuardar(u){
  const o=trustRead();
  o[norm(u)]=Date.now()+TRUST_DIAS*86400000;
  trustWrite(o);
}
function trustOlvidar(u){
  const o=trustRead();
  delete o[norm(u)];
  trustWrite(o);
}
function entrarAlPanel(){
  document.getElementById('panelWho').textContent=coachActivo.u+' · '+coachActivo.rol;
  const row=document.getElementById('trustRow');
  const fiable=esConfiable(coachActivo.u);
  row.classList.toggle('show',fiable);
  if(fiable){
    const dias=Math.max(1,Math.ceil((trustRead()[norm(coachActivo.u)]-Date.now())/86400000));
    document.getElementById('trustTxt').textContent='Dispositivo de confianza · '+dias+' días restantes';
  }
  actualizarPanel();
  showScreen('view-coach-panel');
  pintarAdherencias();
}
function desvincularDispositivo(){
  if(!coachActivo) return;
  trustOlvidar(coachActivo.u);
  document.getElementById('trustRow').classList.remove('show');
}
function goToCoachLogin(){
  document.getElementById('coachLoginError').textContent='';
  document.getElementById('coachPass').value='';
  showScreen('view-coach-login');
}
function coachLogin(){
  const u=document.getElementById('coachUser').value.trim();
  const p=document.getElementById('coachPass').value;
  const err=document.getElementById('coachLoginError');
  if(!u||!p){ err.textContent='Introduce usuario y contraseña.'; return; }
  const m=COACHES.filter(function(x){ return norm(x.u)===norm(u); })[0];
  if(!m||m.p!==p){ err.textContent='Usuario o contraseña incorrectos.'; return; }
  if(esConfiable(m.u)){ coachActivo=m; coachPend=null; entrarAlPanel(); return; }
  coachPend=m;
  fa2Esperado=String(Math.floor(100000+Math.random()*900000));
  document.getElementById('fa2Mail').textContent=maskMail(m.mail);
  document.getElementById('fa2Demo').textContent=fa2Esperado;
  document.getElementById('fa2Code').value='';
  document.getElementById('fa2Error').textContent='';
  showScreen('view-coach-2fa');
}
function coach2fa(){
  const code=document.getElementById('fa2Code').value.trim();
  const err=document.getElementById('fa2Error');
  if(code!==fa2Esperado){ err.textContent='Código incorrecto. Revisa tu correo.'; return; }
  coachActivo=coachPend; coachPend=null; fa2Esperado='';
  if(document.getElementById('fa2Trust').checked) trustGuardar(coachActivo.u);
  entrarAlPanel();
}
function coachLogout(){
  coachActivo=null; coachPend=null; fa2Esperado='';
  document.getElementById('coachUser').value='';
  document.getElementById('coachPass').value='';
  backToSplash();
}
function nivel(p){ return p<0.35?1:(p<0.55?2:(p<0.7?3:(p<0.85?4:5))); }
function pintarSeguimientos(){
  const cards=document.querySelectorAll('#seguiList .segui-card');
  Array.prototype.forEach.call(cards,function(card){
    let suma=0,n=0;
    Array.prototype.forEach.call(card.querySelectorAll('.segui-stats > div'),function(d){
      const lbl=d.querySelector('.segui-lbl'), val=d.querySelector('.segui-val');
      if(!lbl||!val) return;
      const m=val.textContent.match(/([\d.,]+)\s*\/\s*(\d+)/);
      if(!m) return;
      let p=parseFloat(m[1].replace(',','.'))/parseFloat(m[2]);
      if(/estr[eé]s/i.test(lbl.textContent)) p=1-p;
      if(p<0)p=0; if(p>1)p=1;
      val.className='segui-val v'+nivel(p);
      suma+=p; n++;
    });
    const wk=card.querySelector('.segui-week');
    if(wk&&n){
      const media=suma/n, lv=nivel(media);
      let b=wk.querySelector('.sem-badge');
      if(!b){ b=document.createElement('span'); b.className='sem-badge'; wk.appendChild(b); }
      b.className='sem-badge b'+lv;
      b.textContent=Math.round(media*100)+' %';
    }
  });
}
function pintarAdherencias(){
  Array.prototype.forEach.call(document.querySelectorAll('#view-coach-panel .adh-badge'),function(b){
    const m=b.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if(!m) return;
    const p=parseFloat(m[1])/parseFloat(m[2]);
    b.className='adh-badge g'+nivel(p);
  });
}

const SEGUIMIENTOS={};
let clienteActual=null;
function tarjetaSeguimiento(r){
  return '<div class="segui-card">'
    +'<div class="segui-head"><span class="segui-week">'+r.s+'</span><span class="segui-peso">'+r.peso+'</span></div>'
    +'<div class="segui-stats">'
    +'<div><span class="segui-lbl">Entreno</span><span class="segui-val">'+r.e+'/10</span></div>'
    +'<div><span class="segui-lbl">Nutrición</span><span class="segui-val">'+r.n+'/10</span></div>'
    +'<div><span class="segui-lbl">Motivación</span><span class="segui-val">'+r.m+'/5</span></div>'
    +'<div><span class="segui-lbl">Estrés</span><span class="segui-val">'+r.x+'/10</span></div></div>'
    +'<div class="segui-note"><b>Progreso — </b>'+r.prog+'</div>'
    +'<div class="segui-note"><b>Obstáculos — </b>'+r.obs+'</div></div>';
}
function goToSeguimientos(){
  const d=clientesData[clienteActual];
  document.getElementById('seguiNombre').textContent=d?d.nombre:'Cliente';
  const lista=SEGUIMIENTOS[clienteActual]||[];
  const cont=document.getElementById('seguiList');
  let h='<div class="segui-leyenda"><span>Deficiente</span><span class="leyenda-barra"></span><span>Excelente</span></div>';
  h+= lista.length ? lista.map(tarjetaSeguimiento).join('')
     : '<div class="picker-empty">Todavía no ha enviado ningún seguimiento.</div>';
  cont.innerHTML=h;
  showScreen('view-coach-seguimientos');
  pintarSeguimientos();
}

function backToCliente(){
  if(coachEditing) editarPlan();
  document.getElementById('coachBar').classList.remove('show');
  document.getElementById('app').classList.remove('coach-view');
  document.getElementById('editarBtn').style.display='';
  document.getElementById('coachBarLabel').textContent='Editando:';
  guardarPlan();
  showScreen('view-coach-cliente');
}
const clientesData={};
function goToCliente(key){
  const d=clientesData[key];
  if(!d) return;
  guardarPlan();
  clienteActual=key;
  cargarPlan(key);
  document.getElementById('cd-nombre').textContent=d.nombre;
  document.getElementById('cd-meta').textContent='Semana '+d.semana+' · '+d.objetivo;
  document.getElementById('cd-adhE').textContent=(d.adhE!==null?d.adhE+'/10':'—');
  document.getElementById('cd-adhN').textContent=(d.adhN!==null?d.adhN+'/10':'—');
  document.getElementById('cd-tonelaje').textContent=d.tonelaje;
  const tdEl=document.getElementById('cd-tonelajeDelta');
  tdEl.textContent=d.tonelajeDelta;
  tdEl.className='tonelaje-delta'+(d.tonelajeDelta.startsWith('+')?' up':'');
  document.getElementById('cd-peso').textContent=d.peso;
  document.getElementById('cd-pesoDelta').textContent=d.pesoDelta;
  document.getElementById('cd-revision').textContent=d.revision;
  showScreen('view-coach-cliente');
}
function isCoachView(){ return document.getElementById('app').classList.contains('coach-view'); }
function syncChatPerspective(){
  const coach=isCoachView();
  const name=document.getElementById('coachBarName').textContent.trim();
  document.getElementById('chatTitle').textContent=coach?name:'Tu equipo';
  document.getElementById('chatSub').textContent=coach?'Conversación conjunta con Fátima y Domingo':'Fátima y Domingo, en la misma conversación';
  document.getElementById('chatInput').placeholder=coach?('Escribe a '+name.split(' ')[0]+'…'):'Escribe a tu equipo…';
}
function coachBarVisible(){ return document.getElementById('coachBar').classList.contains('show'); }
function updateCoachBar(vista){
  if(!coachBarVisible()) return;
  const editable=(vista==='entreno'||vista==='plan');
  document.getElementById('coachBarLabel').textContent=editable?'Editando:':'Viendo:';
  document.getElementById('editarBtn').style.display=editable?'':'none';
  if(!editable && coachEditing) editarPlan();
}
function abrirVistaCliente(vista){
  document.getElementById('coachBarName').textContent=document.getElementById('cd-nombre').textContent;
  document.getElementById('coachBar').classList.add('show');
  document.getElementById('app').classList.add('coach-view');
  showScreen('app');
  goTo(vista);
}
function verConversacion(){ abrirVistaCliente('chat'); }
function goToEntrenoCoach(){ abrirVistaCliente('entreno'); }
function goToPlanCoach(){ abrirVistaCliente('plan'); }
let coachEditing=false;
function editarPlan(){
  coachEditing=!coachEditing;
  Array.prototype.forEach.call(document.querySelectorAll('.rx-field'),function(f){
    if(coachEditing) f.removeAttribute('readonly'); else f.setAttribute('readonly','readonly');
  });
  if(coachEditing) enableNutricionEdit();
  Array.prototype.forEach.call(document.querySelectorAll('.meal-block-title'),function(t){
    if(coachEditing) t.setAttribute('contenteditable','true'); else t.removeAttribute('contenteditable');
  });
  Array.prototype.forEach.call(document.querySelectorAll('.chip-x'),function(el){ el.style.display=coachEditing?'inline-block':'none'; });
  Array.prototype.forEach.call(document.querySelectorAll('.chip-add'),function(el){ el.style.display=coachEditing?'inline-flex':'none'; });
  document.getElementById('app').classList.toggle('coach-edit',coachEditing);
  if(!coachEditing){ closeExercisePicker(); closeFoodPicker(); cerrarVideoModal(); }
  document.getElementById('editarBtn').textContent=coachEditing?'Guardar cambios':'Editar';
}
function macroOfGroup(group){
  const mg=group.closest('.macro-group');
  const lbl=mg?mg.querySelector('.macro-label'):null;
  const sources=[lbl,group.querySelector('.chip')];
  for(let i=0;i<sources.length;i++){
    const s=sources[i];
    if(!s) continue;
    const m=['protein','carb','fat'].filter(function(k){ return s.classList.contains(k); })[0];
    if(m) return m;
  }
  return 'protein';
}
function enableNutricionEdit(){
  Array.prototype.forEach.call(document.querySelectorAll('.macro-group .chips'),function(group){
    if(group.dataset.editReady) return;
    const macroClass=macroOfGroup(group);
    group.dataset.editReady='1';
    Array.prototype.forEach.call(group.querySelectorAll('.chip'), function(chip){
      if(chip.querySelector('.chip-x')) return;
      const x=document.createElement('span');
      x.className='chip-x';
      x.textContent='×';
      x.style.display=coachEditing?'inline-block':'none';
      x.onclick=function(e){ e.stopPropagation(); const mb=chip.closest('.meal-block'); chip.remove(); if(mb) updateMealSummary(mb); calcularPlan(); };
      chip.appendChild(x);
    });
    const addBtn=document.createElement('div');
    addBtn.className='chip chip-add '+macroClass;
    addBtn.textContent='+ Añadir';
    addBtn.style.display=coachEditing?'inline-flex':'none';
    addBtn.onclick=function(){ openFoodPicker(group,macroClass); };
    group.appendChild(addBtn);
  });
}
function generateCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i=0;i<8;i++){ code += chars[Math.floor(Math.random()*chars.length)]; }
  code = code.slice(0,4)+'-'+code.slice(4);
  document.getElementById('generatedCode').textContent = code;
}
function confirmAlta(){
  const body=document.getElementById('view-alta');
  const campos=body.querySelectorAll('.field input');
  const nombre=(campos[0].value||'').trim();
  const err=document.getElementById('altaError');
  if(!nombre){ err.textContent='Escribe el nombre del cliente para poder darlo de alta.'; campos[0].focus(); return; }
  err.textContent='';
  generateCode();
  const codigo=document.getElementById('generatedCode').textContent;
  const objChip=body.querySelector('.chip.protein.selected');
  const objetivo=objChip?objChip.textContent.trim():'Sin objetivo';
  const nums=body.querySelectorAll('.row2col input');
  const peso=(nums[0]&&nums[0].value.trim())?nums[0].value.trim().replace('.',',')+' kg':'—';
  const key='c'+Date.now();
  clientesData[key]={nombre:nombre,semana:'1 de 12',objetivo:objetivo,adhE:null,adhN:null,
    tonelaje:'—',tonelajeDelta:'Sin datos todavía',peso:peso,pesoDelta:'Peso inicial',
    revision:'Primera revisión el lunes',mensajes:0,codigo:codigo,
    email:(campos[1]&&campos[1].value||'').trim(),telefono:(campos[2]&&campos[2].value||'').trim(),fechaAlta:new Date().toISOString()};
  SEGUIMIENTOS[key]=[];
  PLANES[key]={ent:'',nut:''};
  const card=document.createElement('div');
  card.className='cliente-card';
  card.onclick=function(){ goToCliente(key); };
  card.innerHTML='<div class="avatar"></div>'
    +'<div class="cliente-info"><div class="cliente-name">'+nombre+'</div>'
    +'<div class="cliente-sub">Semana 1 de 12 · recién dado de alta</div></div>'
    +'<div class="cliente-flags"><span class="adh-badge new">Nuevo</span></div>';
  document.getElementById('listaClientes').appendChild(card);
  actualizarPanel();
  document.getElementById('altaOkNombre').textContent=nombre;
  document.getElementById('altaOkCode').textContent=codigo;
  guardarTodo();
  document.getElementById('altaOk').classList.add('show');
  document.getElementById('altaOk').scrollIntoView({behavior:'smooth',block:'center'});
  document.getElementById('confirmBtn').disabled=true;
  document.getElementById('altaPista').textContent='Ya está creado. Copia su código antes de salir.';
}
function copiarCodigoAlta(){
  const t=document.getElementById('altaOkCode').textContent;
  const b=document.getElementById('altaOkCopy');
  if(navigator.clipboard) navigator.clipboard.writeText(t).catch(function(){});
  b.textContent='Copiado ✓'; b.classList.add('copied');
  setTimeout(function(){ b.textContent='Copiar código'; b.classList.remove('copied'); },1600);
}
function cerrarAltaOk(){
  const body=document.getElementById('view-alta');
  Array.prototype.forEach.call(body.querySelectorAll('.field input'),function(x){ x.value=''; });
  Array.prototype.forEach.call(body.querySelectorAll('.row2col input'),function(x){ x.value=''; });
  document.getElementById('altaOk').classList.remove('show');
  document.getElementById('altaError').textContent='';
  document.getElementById('confirmBtn').disabled=false;
  document.getElementById('altaPista').textContent='Al darlo de alta se generará su código de acceso automáticamente.';
  backToPanel();
}
function formatCode(el){
  let v = el.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(v.length>8) v = v.slice(0,8);
  if(v.length>4) v = v.slice(0,4)+'-'+v.slice(4);
  el.value = v;
}
function pick(el){
  Array.prototype.forEach.call(el.parentElement.querySelectorAll('.chip'),function(x){ x.classList.remove('selected'); });
  el.classList.add('selected');
  const mb=el.closest('.meal-block');
  if(mb) updateMealSummary(mb);
  calcularPlan();
}
function entrarProfesionalPrueba(){
  coachActivo=COACHES[0]; coachPend=null;
  entrarAlPanel();
}
function burbujaNueva(){
  const coach=isCoachView();
  const b=document.createElement('div');
  b.className='bubble '+(coach?'in':'out');
  if(coach){
    const s=document.createElement('div');
    s.className='sender';
    s.textContent=coachActivo?coachActivo.u:'Fátima';
    b.appendChild(s);
  }
  return b;
}
function meterEnChat(b){
  const list=document.getElementById('chatList');
  const vac=document.getElementById('chatVacio');
  if(vac) vac.remove();
  list.appendChild(b);
  list.scrollTop=list.scrollHeight;
}
function subirImagen(input){
  const f=input.files&&input.files[0];
  if(!f) return;
  const r=new FileReader();
  r.onload=function(){
    const b=burbujaNueva();
    b.classList.add('media');
    const img=document.createElement('img');
    img.src=r.result;
    img.alt='Imagen enviada';
    b.appendChild(img);
    meterEnChat(b);
  };
  r.readAsDataURL(f);
  input.value='';
}
function ondas(n){
  let h='<span class="wave">';
  for(let i=0;i<n;i++){ h+='<i style="height:'+(5+Math.round(Math.abs(Math.sin(i*1.7))*15))+'px"></i>'; }
  return h+'</span>';
}
function fmtDur(s){ const r=s%60; return Math.floor(s/60)+':'+(r<10?'0':'')+r; }
function addAudioBubble(src,segs){
  const b=burbujaNueva();
  const wrap=document.createElement('div');
  wrap.className='audio-b';
  wrap.innerHTML='<button class="audio-play" onclick="reproducirAudio(this)">▶</button>'+ondas(22)+'<span class="audio-dur">'+fmtDur(segs)+'</span>';
  if(src){
    const a=document.createElement('audio');
    a.src=src; a.preload='metadata'; a.style.display='none';
    wrap.appendChild(a);
  }
  b.appendChild(wrap);
  meterEnChat(b);
}
function reproducirAudio(btn){
  const a=btn.parentElement.querySelector('audio');
  if(!a){ btn.textContent='▶'; return; }
  if(a.paused){ a.play(); btn.textContent='❚❚'; a.onended=function(){ btn.textContent='▶'; }; }
  else { a.pause(); btn.textContent='▶'; }
}
let mediaRec=null, recChunks=[], recInt=null, recSegs=0;
function recUI(on){
  document.getElementById('recLive').classList.toggle('on',on);
  document.getElementById('micBtn').classList.toggle('rec',on);
  document.getElementById('chatInput').style.display=on?'none':'';
}
function toggleMic(){
  if(mediaRec && mediaRec.state==='recording'){ mediaRec.stop(); return; }
  if(recInt){ clearInterval(recInt); recInt=null; recUI(false); addAudioBubble(null,recSegs); return; }
  recSegs=0;
  document.getElementById('recTime').textContent='0:00';
  const arranca=function(){
    recUI(true);
    recInt=setInterval(function(){ recSegs++; document.getElementById('recTime').textContent=fmtDur(recSegs); },1000);
  };
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      mediaRec=new MediaRecorder(stream);
      recChunks=[];
      mediaRec.ondataavailable=function(e){ recChunks.push(e.data); };
      mediaRec.onstop=function(){
        clearInterval(recInt); recInt=null; recUI(false);
        stream.getTracks().forEach(function(t){ t.stop(); });
        addAudioBubble(URL.createObjectURL(new Blob(recChunks,{type:'audio/webm'})),recSegs);
        mediaRec=null;
      };
      mediaRec.start(); arranca();
    }).catch(function(){ arranca(); });
  } else { arranca(); }
}
function sendMsg(){
  const input=document.getElementById('chatInput');
  const text=input.value.trim();
  if(!text)return;
  const coach=isCoachView();
  const list=document.getElementById('chatList');
  const b=document.createElement('div');
  b.className='bubble '+(coach?'in':'out');
  if(coach){
    const s=document.createElement('div');
    s.className='sender';
    s.textContent=coachActivo?coachActivo.u:'Fátima';
    b.appendChild(s);
  }
  b.appendChild(document.createTextNode(text));
  list.appendChild(b);
  input.value='';
  list.scrollTop=list.scrollHeight;
  setTimeout(function(){
    const r=document.createElement('div');
    r.className='bubble '+(coach?'out':'in');
    if(!coach){
      const s=document.createElement('div');
      s.className='sender';
      s.textContent='Fátima';
      r.appendChild(s);
    }
    r.appendChild(document.createTextNode(coach?'¡Perfecto, lo tengo en cuenta! 💪':'Recibido, le echo un ojo y te digo algo en un rato 💪'));
    list.appendChild(r);
    list.scrollTop=list.scrollHeight;
  },900);
}
document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendMsg();});
(function(){
  const s=cargarTodo();
  actualizarPanel();
  if(s&&s.cliente&&clientesData[s.cliente]){
    clienteActual=s.cliente;
    cargarPlan(s.cliente);
    pintarCliente();
    document.getElementById('view-splash').style.display='none';
    document.getElementById('app').style.display='flex';
  }
})();
calcularPlan();
renderHoy();
pintarSeguimientos();
pintarAdherencias();
recalcTonelaje();
recalcCumplimiento();
recalcProgreso();
refreshAllSummaries();
Array.prototype.forEach.call(document.querySelectorAll('.day-pill'),p=>p.addEventListener('click',()=>{
  Array.prototype.forEach.call(document.querySelectorAll('.day-pill'),x=>x.classList.remove('active'));
  p.classList.add('active');
}));
