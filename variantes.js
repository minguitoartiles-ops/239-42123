/* =========================================================
   Fitnessindramas — Variantes de los ejercicios principales (25/10/2026, #232)
   Cada variante lleva su ejercicio base (b), su grupo muscular (para el mapa y el volumen semanal),
   su material y una indicación técnica. En el buscador salen justo debajo de su ejercicio principal.
   ========================================================= */
const EX_VARIANTES = [
  /* flexiones */
  ['Flexiones', 'Flexiones con rodillas apoyadas', 'pecho', 'corporal', 'Rodillas en el suelo y cuerpo en línea desde la rodilla a la cabeza. Para empezar o acumular volumen.'],
  ['Flexiones', 'Flexiones inclinadas', 'pecho', 'corporal', 'Manos sobre un banco o cajón: menos carga. Cuanto más alto el apoyo, más fácil.'],
  ['Flexiones', 'Flexiones declinadas', 'pecho', 'corporal', 'Pies elevados en un banco: más carga y más trabajo del pectoral superior y el hombro.'],
  ['Flexiones', 'Flexiones abiertas', 'pecho', 'corporal', 'Manos más separadas que los hombros: más pectoral y menos tríceps. Sin abrir los codos en cruz.'],
  ['Flexiones', 'Flexiones diamante', 'triceps', 'corporal', 'Manos juntas formando un rombo bajo el esternón y codos pegados al cuerpo.'],
  ['Flexiones', 'Flexiones hindúes', 'hombro', 'corporal', 'Desde «perro boca abajo», baja en arco rozando el suelo con el pecho y termina arriba en «cobra».'],
  ['Flexiones', 'Flexiones pike', 'hombro', 'corporal', 'Cadera alta en forma de V. Baja la cabeza entre las manos: preparan el pino.'],
  ['Flexiones', 'Flexiones arquero', 'pecho', 'corporal', 'Manos muy abiertas; baja hacia un lado mientras el otro brazo queda casi recto.'],
  ['Flexiones', 'Flexiones con palmada', 'pecho', 'corporal', 'Empuje explosivo para despegar las manos y aterrizaje suave con codos flexionados.'],
  ['Flexiones', 'Flexiones con pausa', 'pecho', 'corporal', 'Aguanta 2 segundos a un dedo del suelo sin perder la línea del cuerpo.'],
  ['Flexiones', 'Flexiones a una mano', 'pecho', 'corporal', 'Pies separados y la mano libre a la espalda. Avanzada: exige mucho core.'],
  /* press */
  ['Press banca', 'Press banca con pausa', 'pecho', 'barra', 'Para 1-2 s con la barra en el pecho, sin rebotar, y empuja.'],
  ['Press banca', 'Press banca agarre ancho', 'pecho', 'barra', 'Agarre más abierto: menos recorrido y más pectoral. Cuida el hombro.'],
  ['Press banca', 'Press de suelo con barra', 'pecho', 'barra', 'Tumbado en el suelo: el codo frena el recorrido. Bueno para el bloqueo y para hombros delicados.'],
  ['Press militar', 'Press militar sentado con barra', 'hombro', 'barra', 'Sentado con respaldo: menos balanceo y más aislamiento del hombro.'],
  ['Press militar', 'Push press', 'hombro', 'barra', 'Pequeña flexión de rodillas y empuje con las piernas para subir más carga.'],
  ['Press militar', 'Press landmine', 'hombro', 'barra', 'Barra anclada en una esquina; empuje en diagonal muy amable con el hombro.'],
  ['Press militar con mancuernas', 'Press militar a una mano', 'hombro', 'mancuerna', 'Unilateral de pie: el core trabaja para no inclinarte.'],
  /* fondos */
  ['Fondos en paralelas', 'Fondos negativos', 'pecho', 'corporal', 'Sube con un salto y baja en 3-5 segundos. Para progresar hacia los fondos completos.'],
  ['Fondos en paralelas', 'Fondos lastrados', 'pecho', 'corporal', 'Con cinturón de lastre o mancuerna entre los pies. Solo con técnica sólida.'],
  ['Fondos en paralelas', 'Fondos en paralelas para tríceps', 'triceps', 'corporal', 'Torso vertical y codos atrás: el trabajo pasa al tríceps.'],
  /* espalda */
  ['Dominadas', 'Dominadas supinas', 'espalda', 'corporal', 'Palmas hacia ti (chin-up): más bíceps y suele ser la más fácil.'],
  ['Dominadas', 'Dominadas agarre neutro', 'espalda', 'corporal', 'Palmas enfrentadas: la más cómoda para codos y hombros.'],
  ['Dominadas', 'Dominadas anchas', 'espalda', 'corporal', 'Agarre amplio: más dorsal; baja el recorrido sin perder control.'],
  ['Dominadas', 'Dominadas con banda', 'espalda', 'banda', 'La banda ayuda abajo, donde más cuesta. Cambia a una más fina al progresar.'],
  ['Dominadas', 'Dominadas negativas', 'espalda', 'corporal', 'Sube con salto y baja en 3-5 segundos con escápulas activas.'],
  ['Dominadas', 'Dominadas lastradas', 'espalda', 'corporal', 'Con cinturón de lastre. Solo cuando haces más de 8-10 limpias.'],
  ['Remo invertido', 'Remo invertido con pies elevados', 'espalda', 'corporal', 'Pies en un banco: más carga. Cuerpo en línea y pecho a la barra.'],
  ['Remo con barra', 'Remo con barra agarre supino', 'espalda', 'barra', 'Palmas hacia arriba: codos más pegados, más dorsal bajo y bíceps.'],
  ['Remo con barra', 'Remo Seal', 'espalda', 'barra', 'Tumbado boca abajo en un banco alto: sin ayuda de piernas ni lumbar.'],
  ['Remo con mancuerna', 'Remo Kroc', 'espalda', 'mancuerna', 'Más carga y algo de impulso controlado, a altas repeticiones.'],
  ['Remo con mancuerna', 'Remo renegado', 'espalda', 'mancuerna', 'En plancha sobre dos mancuernas, rema alternando sin girar la cadera.'],
  /* piernas */
  ['Sentadilla', 'Sentadilla con peso corporal', 'cuadriceps', 'corporal', 'Sin carga: pies a la anchura de los hombros, baja con el pecho alto.'],
  ['Sentadilla', 'Sentadilla con pausa', 'cuadriceps', 'barra', 'Para 2 s abajo sin perder tensión y sube.'],
  ['Sentadilla', 'Sentadilla a cajón', 'cuadriceps', 'barra', 'Siéntate un instante en el cajón sin relajarte. Controla la profundidad.'],
  ['Sentadilla', 'Sentadilla 1 y 1/4', 'cuadriceps', 'barra', 'Baja, sube un cuarto, vuelve abajo y sube entero: más tiempo bajo tensión.'],
  ['Sentadilla', 'Sentadilla con talones elevados', 'cuadriceps', 'mancuerna', 'Talones sobre un disco o cuña: más rodilla adelante y más cuádriceps.'],
  ['Sentadilla', 'Sentadilla con salto', 'cuadriceps', 'corporal', 'Baja y salta explosivo; aterriza suave con rodillas alineadas.'],
  ['Sentadilla', 'Sentadilla pistol', 'cuadriceps', 'corporal', 'A una pierna con la otra estirada al frente. Empieza agarrado o a un cajón.'],
  ['Sentadilla', 'Sentadilla cosaca', 'cuadriceps', 'corporal', 'Pies muy abiertos; baja hacia un lado con la otra pierna estirada.'],
  ['Zancadas', 'Zancadas con mancuernas', 'cuadriceps', 'mancuerna', 'Paso largo, rodilla de atrás casi al suelo y torso erguido.'],
  ['Zancadas', 'Zancada lateral', 'cuadriceps', 'corporal', 'Paso amplio al lado, cadera atrás y la otra pierna estirada.'],
  ['Zancadas', 'Zancada cruzada', 'gluteo', 'corporal', 'Pierna de atrás cruzada en diagonal: más glúteo medio.'],
  ['Zancadas', 'Zancada en déficit', 'gluteo', 'mancuerna', 'Pie delantero sobre un disco o escalón: más recorrido y más glúteo.'],
  ['Zancadas', 'Zancada con salto', 'cuadriceps', 'corporal', 'Cambia de pierna en el aire y aterriza suave.'],
  ['Peso muerto convencional', 'Peso muerto con barra hexagonal', 'cuadriceps', 'barra', 'Con la barra trap: más cómodo de espalda y más cuádriceps.'],
  ['Peso muerto convencional', 'Peso muerto en déficit', 'isquios', 'barra', 'De pie sobre un disco: más recorrido desde el suelo.'],
  ['Peso muerto convencional', 'Rack pull', 'espalda', 'barra', 'Desde los soportes a la altura de la rodilla: más carga para la espalda alta.'],
  ['Peso muerto rumano', 'Peso muerto piernas rígidas', 'isquios', 'barra', 'Rodillas casi rectas y la barra baja cerca de las piernas.'],
  ['Hip thrust', 'Hip thrust a una pierna', 'gluteo', 'corporal', 'Espalda en el banco y una pierna en el aire. Sube sin girar la cadera.'],
  ['Hip thrust', 'Hip thrust con pausa', 'gluteo', 'barra', 'Aguanta 2 s arriba apretando glúteo, sin arquear la lumbar.'],
  ['Hip thrust', 'Hip thrust con banda', 'gluteo', 'banda', 'Banda sobre las rodillas: empuja hacia fuera mientras subes.'],
  ['Puente de glúteo', 'Puente de glúteo a una pierna', 'gluteo', 'corporal', 'Desde el suelo, una pierna estirada; sube la cadera en línea.'],
  ['Puente de glúteo', 'Frog pump', 'gluteo', 'corporal', 'Plantas de los pies juntas y rodillas abiertas: repeticiones rápidas y cortas.'],
  ['Swing con kettlebell', 'Swing a una mano', 'gluteo', 'kettlebell', 'Igual que el swing, con una mano: más trabajo de core y agarre.'],
  ['Elevación de gemelos', 'Elevación de gemelos en escalón', 'gemelos', 'corporal', 'Talones en el aire desde un escalón: baja hasta estirar y sube del todo.'],
  /* brazos */
  ['Curl con mancuernas', 'Curl Zottman', 'biceps', 'mancuerna', 'Sube con palmas arriba, gira arriba y baja con palmas abajo.'],
  ['Curl martillo', 'Curl martillo cruzado', 'biceps', 'mancuerna', 'Lleva la mancuerna hacia el hombro contrario cruzando el cuerpo.'],
  /* core */
  ['Plancha', 'Plancha RKC', 'core', 'corporal', 'Aprieta glúteo, abdomen y puños y tira de los codos hacia los pies: más intensa y más corta.'],
  ['Plancha', 'Plancha con toque de hombros', 'core', 'corporal', 'Desde plancha alta, toca el hombro contrario sin mover la cadera.'],
  ['Plancha', 'Plancha con elevación de pierna', 'core', 'corporal', 'Sube una pierna sin arquear la lumbar; alterna.'],
  ['Plancha', 'Mountain climbers', 'core', 'corporal', 'En plancha alta, lleva las rodillas al pecho alternando a ritmo constante.'],
  ['Plancha lateral', 'Plancha lateral con elevación de cadera', 'core', 'corporal', 'Baja y sube la cadera de forma controlada.'],
  ['Elevación de piernas', 'Dead bug', 'core', 'corporal', 'Boca arriba, lumbar pegada al suelo; estira brazo y pierna contrarios.']
];
/* ejercicios base nuevos (para que las variantes tengan su principal) */
const EX_BASES_NUEVAS = [
  ['Remo invertido', 'espalda', 'corporal', 'Bajo una barra fija o TRX, cuerpo en línea; lleva el pecho a la barra.'],
  ['Swing con kettlebell', 'gluteo', 'kettlebell', 'Bisagra de cadera: la fuerza sale del glúteo, no de los brazos. Sube hasta la altura del pecho.']
];
/* los que ya estaban, agrupados bajo su principal */
const EX_FAMILIAS = {
  'Press banca': ['Press banca inclinado', 'Press banca declinado'],
  'Press con mancuernas': ['Press inclinado con mancuernas', 'Press declinado con mancuernas'],
  'Press de pecho en multipower': ['Press inclinado en multipower'],
  'Aperturas con mancuernas': ['Aperturas inclinadas con mancuernas'],
  'Cruce de poleas': ['Cruce de poleas alto', 'Cruce de poleas bajo'],
  'Fondos en paralelas': ['Fondos en máquina asistida'],
  'Remo con barra': ['Remo Pendlay', 'Remo en punta (T-bar)'],
  'Remo en polea baja': ['Remo en polea a una mano'],
  'Jalón al pecho': ['Jalón agarre neutro', 'Jalón a una mano'],
  'Dominadas': ['Dominadas asistidas en máquina'],
  'Elevaciones laterales': ['Elevaciones laterales en polea', 'Elevaciones laterales en máquina'],
  'Elevaciones frontales con mancuernas': ['Elevaciones frontales con disco', 'Elevaciones frontales en polea'],
  'Curl de bíceps': ['Curl con barra Z'],
  'Curl con mancuernas': ['Curl martillo', 'Curl concentrado', 'Curl en banco inclinado', 'Curl araña'],
  'Curl predicador con barra': ['Curl predicador en máquina'],
  'Curl en polea': ['Curl en polea a una mano'],
  'Extensión de tríceps en polea': ['Extensión en polea con cuerda', 'Extensión en polea agarre inverso', 'Extensión sobre la cabeza en polea'],
  'Press francés con barra Z': ['Press francés con mancuernas'],
  'Patada de tríceps': ['Patada de tríceps en polea'],
  'Sentadilla': ['Sentadilla frontal', 'Sentadilla Zercher', 'Sentadilla con mancuernas', 'Sentadilla goblet', 'Sentadilla en multipower', 'Sentadilla hack', 'Sentadilla lever', 'Sentadilla con cinturón en máquina'],
  'Sentadilla búlgara': ['Sentadilla búlgara en multipower'],
  'Prensa de piernas': ['Prensa horizontal'],
  'Zancadas': ['Zancadas caminando', 'Zancadas en multipower', 'Zancada inversa'],
  'Curl femoral': ['Curl femoral sentado', 'Curl femoral de pie'],
  'Peso muerto rumano': ['Peso muerto rumano con mancuernas', 'Peso muerto rumano en multipower', 'Peso muerto a una pierna'],
  'Peso muerto convencional': ['Peso muerto sumo', 'Peso muerto con kettlebell'],
  'Hip thrust': ['Hip thrust en máquina', 'Hip thrust en multipower'],
  'Patada de glúteo en polea': ['Patada de glúteo en máquina'],
  'Elevación de gemelos': ['Elevación de gemelos sentado', 'Elevación de gemelos en prensa', 'Elevación de gemelos en multipower', 'Elevación de gemelos con mancuernas', 'Elevación de gemelos a una pierna'],
  'Elevación de piernas': ['Elevación de rodillas colgado']
};
(function(){
  const existe = function(n){ return EX_CATALOG.filter(function(e){ return norm(e.n) === norm(n); })[0]; };
  EX_BASES_NUEVAS.forEach(function(x){ if (!existe(x[0])) EX_CATALOG.push({ n: x[0], m: x[1], e: x[2], d: x[3] }); });
  EX_VARIANTES.forEach(function(x){ const e = existe(x[1]); if (e) { if (!e.b) e.b = x[0]; return; } EX_CATALOG.push({ n: x[1], m: x[2], e: x[3], d: x[4], b: x[0] }); });
  Object.keys(EX_FAMILIAS).forEach(function(base){ EX_FAMILIAS[base].forEach(function(n){ const e = existe(n); if (e && !e.b) e.b = base; }); });
})();
function exBase(n){ const e = EX_CATALOG.filter(function(x){ return x.n === n; })[0]; return e && e.b ? e.b : null; }
function exNVariantes(base){ return EX_CATALOG.filter(function(x){ return x.b === base; }).length; }

/* buscador de ejercicios: dentro de cada bloque, cada principal con sus variantes justo debajo */
renderPickerList = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const list = document.getElementById('pickerList'); if (!list) return r;
    const hijos = Array.prototype.slice.call(list.children);
    let bloque = [];
    const ordenar = function(){
      if (!bloque.length) return;
      const ancla = bloque[0].previousElementSibling;
      const clave = function(it){ const n = it.dataset.name, b = exBase(n); return { b: b || n, v: b ? 1 : 0, n: n }; };
      bloque.sort(function(a, b){ const x = clave(a), y = clave(b); return x.b.localeCompare(y.b, 'es') || x.v - y.v || x.n.localeCompare(y.n, 'es'); });
      let ref = ancla;
      bloque.forEach(function(it){
        const n = it.dataset.name, b = exBase(n), nv = exNVariantes(n);
        it.classList.toggle('ex-var', !!b);
        if (b && !it.querySelector('.ex-var-de')) it.querySelector('.picker-item-name').insertAdjacentHTML('beforeend', '<small class="ex-var-de">Variante de ' + fsdEsc(b) + '</small>');
        if (!b && nv && !it.querySelector('.ex-var-n')) it.querySelector('.picker-item-tags').insertAdjacentHTML('afterbegin', '<span class="picker-item-eq ex-var-n">' + nv + (nv === 1 ? ' variante' : ' variantes') + '</span>');
        if (ref) ref.insertAdjacentElement('afterend', it); else list.insertBefore(it, list.firstChild);
        ref = it;
      });
      bloque = [];
    };
    hijos.forEach(function(h){ if (h.classList.contains('picker-group')) { ordenar(); } else if (h.classList.contains('picker-item')) bloque.push(h); });
    ordenar();
    return r;
  };
})(renderPickerList);
