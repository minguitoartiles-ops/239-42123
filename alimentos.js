/* =========================================================
   Fitnessindramas — Más alimentos concretos en el buscador (25/10/2026, tarea #213)
   · Productos de supermercado (Mercadona, Lidl, Carrefour, Dia, Alcampo, Eroski, Consum, HiperDino, bonÀrea…):
     valores por 100 g de Open Food Facts (base de datos abierta, licencia ODbL); cada uno lleva su ficha de origen.
   · Alimentos frescos y básicos (fruta a fruta, fruto seco a fruto seco, pescados, legumbres, cereales…):
     valores de referencia por 100 g de porción comestible en crudo, según tablas de composición españolas (BEDCA).
   · Fuera las opciones ambiguas o repetidas («Fruta», «Frutos secos», «Pollo», «Huevos», «Legumbres»…):
     se cambian en los planes por un alimento concreto y las cantidades se recalculan solas.
   ========================================================= */
const ALIM_GENERICOS = [
  ['Manzana', 0.3, 12, 0.1],
  ['Pera', 0.4, 12.2, 0.1],
  ['Plátano', 1.2, 20, 0.3],
  ['Naranja', 0.8, 8.6, 0.2],
  ['Mandarina', 0.8, 9, 0.2],
  ['Kiwi', 1, 10.6, 0.5],
  ['Fresas', 0.8, 5.5, 0.4],
  ['Frambuesas', 1.3, 4.8, 0.3],
  ['Uvas', 0.6, 16, 0.2],
  ['Melón', 0.6, 6, 0.1],
  ['Sandía', 0.6, 6.5, 0.2],
  ['Piña', 0.5, 11.5, 0.1],
  ['Mango', 0.6, 14, 0.4],
  ['Papaya', 0.5, 9, 0.1],
  ['Melocotón', 1, 10.2, 0.1],
  ['Nectarina', 1, 10, 0.3],
  ['Albaricoque', 0.8, 8.5, 0.3],
  ['Cerezas', 0.8, 13, 0.3],
  ['Ciruela', 0.6, 10, 0.1],
  ['Higos frescos', 1, 16, 0.3],
  ['Granada', 0.6, 16.1, 0.6],
  ['Caqui', 0.6, 16, 0.3],
  ['Chirimoya', 1.2, 14.1, 0.7],
  ['Pomelo', 0.7, 7, 0.1],
  ['Pasas', 2.5, 70, 0.5],
  ['Ciruelas pasas', 2.3, 42.4, 0.5],
  ['Orejones de albaricoque', 3.3, 62.6, 0.5],
  ['Avellanas', 12, 10.5, 61.6],
  ['Anacardos', 17.5, 30.5, 42],
  ['Pistachos', 20.2, 17, 45.3],
  ['Cacahuetes', 25.2, 7.9, 46],
  ['Nueces de Brasil', 14, 4.2, 67],
  ['Piñones', 14, 4, 68],
  ['Pipas de girasol peladas', 21, 11, 52],
  ['Semillas de calabaza', 30, 5, 49],
  ['Semillas de lino', 18, 1.6, 42],
  ['Semillas de sésamo', 18, 9, 50],
  ['Coco rallado', 5.6, 6.4, 62],
  ['Tahini (crema de sésamo)', 17, 10, 54],
  ['Mantequilla', 0.7, 0.6, 83],
  ['Aceite de coco', 0, 0, 99],
  ['Pechuga de pavo fresca', 24, 0, 1],
  ['Contramuslo de pollo sin piel', 19, 0, 6.5],
  ['Conejo', 21, 0, 4],
  ['Jamón serrano', 30, 0, 11],
  ['Lubina', 18.4, 0, 3.4],
  ['Dorada', 19.8, 0, 5],
  ['Rape', 17, 0, 1],
  ['Lenguado', 17, 0, 1],
  ['Trucha', 19.5, 0, 3],
  ['Caballa', 18.7, 0, 13],
  ['Boquerones', 18, 0, 4.8],
  ['Sepia', 16, 0.7, 0.9],
  ['Calamar', 15.6, 3, 1.4],
  ['Pulpo', 15, 1.5, 1],
  ['Mejillones', 12, 3, 2],
  ['Langostinos', 19, 0, 1.1],
  ['Huevos de codorniz', 13, 0.4, 11],
  ['Queso cottage', 11, 3.4, 4.3],
  ['Queso mozzarella', 22, 2, 21],
  ['Queso feta', 14, 4, 21],
  ['Kéfir natural', 3.3, 4, 3],
  ['Leche desnatada', 3.4, 4.8, 0.1],
  ['Leche entera', 3.1, 4.7, 3.6],
  ['Lentejas secas', 23.8, 48.8, 1.8],
  ['Garbanzos secos', 20, 47, 5],
  ['Alubias blancas secas', 21, 41, 1.6],
  ['Lentejas cocidas', 8, 13, 0.5],
  ['Garbanzos cocidos', 7.5, 16, 2.4],
  ['Pan blanco de barra', 8.5, 51, 1.5],
  ['Pan de pita', 9, 55, 1.2],
  ['Fideos de arroz', 6, 80, 0.6],
  ['Trigo sarraceno', 13, 71, 3.4],
  ['Mijo', 11, 73, 4],
  ['Amaranto', 13.6, 65, 7],
  ['Yuca', 1.4, 38, 0.3],
  ['Plátano macho', 1.3, 31, 0.4],
  ['Gofio de millo', 8.3, 71, 3.6],
  ['Gofio de trigo', 12.7, 66, 2.7],
];
const ALIM_SUPER = [   // [nombre, proteína, hidratos, grasa, ficha en Open Food Facts]
  ['Nueces naturales con cáscara (Mercadona Hacendado)', 17, 2.2, 69.6, 'https://world.openfoodfacts.org/product/8480000340245'],
  ['Nueces peladas (Mercadona Hacendado)', 15.2, 13.7, 65, 'https://world.openfoodfacts.org/product/8480000341983'],
  ['Almendra sin piel cruda (Mercadona Hacendado)', 23, 4, 60, 'https://world.openfoodfacts.org/product/8480000348241'],
  ['Almendra tostada sin sal (Mercadona Hacendado)', 23.3, 3, 57, 'https://world.openfoodfacts.org/product/8480000340146'],
  ['Pistacho natural (Mercadona Hacendado)', 25, 11.5, 49.6, 'https://es-ca.openfoodfacts.org/product/8480000342621'],
  ['Anacardo frito (Mercadona Hacendado)', 18, 22, 50, 'https://world.openfoodfacts.org/product/8480000340276'],
  ['Avellana tostada sin sal (Mercadona Hacendado)', 18, 3, 68, 'https://world.openfoodfacts.org/product/8480000340252'],
  ['Nueces de macadamia (Mercadona Hacendado)', 8.6, 5.8, 77, 'https://world.openfoodfacts.org/product/8480000348388'],
  ['Cacahuete tostado sin sal (Mercadona Hacendado)', 24, 13, 50.4, 'https://world.openfoodfacts.org/product/8480000340313'],
  ['Anacardo crudo natural (Consum)', 18.2, 30.2, 43.8, 'https://world.openfoodfacts.org/product/8414807549020'],
  ['Avellana tostada (Carrefour)', 15, 17.6, 62.4, 'https://world.openfoodfacts.org/product/8431876274004'],
  ['Arándanos frescos (Mercadona)', 0.7, 11, 0, 'https://world.openfoodfacts.org/product/8480000610935'],
  ['Frutos rojos congelados (Mercadona Hacendado)', 0.9, 5.5, 0, 'https://world.openfoodfacts.org/product/8480000610898'],
  ['Dátiles sin hueso (Mercadona Hacendado)', 1.1, 87.8, 0.2, 'https://world.openfoodfacts.org/product/8480000349040'],
  ['Yogur natural +Proteínas (Mercadona Hacendado)', 10, 3.1, 0.5, 'https://world.openfoodfacts.org/product/8480000209085'],
  ['Garbanzos cocidos congelados (Mercadona Hacendado)', 8, 14, 3.2, 'https://world.openfoodfacts.org/product/8480000612724'],
  ['Lenteja pardina cocida en bote (Mercadona Hacendado)', 8.2, 10.7, 0.4, 'https://world.openfoodfacts.org/product/8480000053329'],
  ['Jamón cocido extra finas lonchas (Mercadona Hacendado)', 18.6, 0.9, 2.5, 'https://world.openfoodfacts.org/product/8480000592484'],
  ['Yogur natural (Lidl Milbona)', 3.3, 4, 3.5, 'https://world.openfoodfacts.org/product/20248321'],
  ['Almendras tostadas con sal (Lidl Alesto)', 24.7, 3.8, 56.5, 'https://world.openfoodfacts.org/product/20245450'],
  ['Pechuga de pollo finas lonchas (Mercadona Hacendado)', 16.9, 1.3, 1.2, 'https://world.openfoodfacts.org/product/8480000561565'],
  ['Atún claro en aceite de oliva (Mercadona Hacendado)', 21, 0.9, 18, 'https://world.openfoodfacts.org/product/8480000180025'],
  ['Mejillones en escabeche picantes (Mercadona Hacendado)', 18, 6, 7.1, 'https://world.openfoodfacts.org/product/8480000186119'],
  ['Postre de soja natural (Mercadona Hacendado)', 4.6, 0, 2.7, 'https://world.openfoodfacts.org/product/8480000201607'],
  ['Cacahuete en polvo desgrasado (Mercadona Hacendado)', 46.7, 21, 13.2, 'https://world.openfoodfacts.org/product/8480000137388'],
  ['Espaguetis (Mercadona Hacendado)', 13, 72, 1.5, 'https://world.openfoodfacts.org/product/8480000062451'],
  ['Postre +Proteínas chocolate y nata (Mercadona Hacendado)', 10, 5, 2.4, 'https://world.openfoodfacts.org/product/8480000679802'],
  ['Granola (Mercadona Hacendado)', 13.6, 50.2, 22.7, 'https://world.openfoodfacts.org/product/8480000094742'],
  ['Pechuga de pavo en lonchas (Peñalabra)', 18, 2, 1.5, 'https://world.openfoodfacts.org/product/8411477910266'],
  ['Queso fresco 0% (Alcampo Auchan)', 10, 3.9, 0.5, 'https://world.openfoodfacts.org/product/8410285190273'],
  ['Queso fresco batido (Alcampo Auchan)', 10, 4, 0.5, 'https://world.openfoodfacts.org/product/8432022001574'],
  ['Yogur griego natural (Alteza)', 2.9, 5.3, 10, 'https://world.openfoodfacts.org/product/8480024649256'],
  ['Queso fresco batido (Lidl Milbona)', 8.5, 4.9, 0.5, 'https://world.openfoodfacts.org/product/20337223'],
  ['Anacardos (Lidl Alesto)', 20.5, 19.8, 47.6, 'https://world.openfoodfacts.org/product/20267605'],
  ['Bebida de avena (Dia)', 1.1, 10, 0.8, 'https://world.openfoodfacts.org/product/8480017235619'],
  ['Pechuga de pavo (bonÀrea)', 11.2, 5.5, 0.6, 'https://world.openfoodfacts.org/product/8413585002741'],
  ['Atún claro al natural (Consum)', 24, 0.9, 0.4, 'https://world.openfoodfacts.org/product/8414807550293'],
  ['Lentejas cocidas sin sal añadida (Carrefour)', 6.3, 13, 0, 'https://world.openfoodfacts.org/product/8431876115895'],
  ['Lentejas cocidas (SuperSol)', 6.3, 11, 0.5, 'https://world.openfoodfacts.org/product/8430803037095'],
  ['Yogur estilo griego ligero (Lidl Milbona)', 5.2, 6.9, 1.9, 'https://world.openfoodfacts.org/product/4056489148722'],
  ['Arroz redondo (Mercadona Hacendado)', 8.2, 75, 1, 'https://world.openfoodfacts.org/product/8480000050441'],
  ['Alubia blanca cocida en bote (Mercadona Hacendado)', 5.8, 10.7, 0.4, 'https://world.openfoodfacts.org/product/8480000260284'],
  ['Alubia roja seca (Mercadona Hacendado)', 21.4, 40, 1, 'https://world.openfoodfacts.org/product/8480000676092'],
  ['Atún en salsa de tomate (Mercadona Hacendado)', 13, 2.2, 15, 'https://world.openfoodfacts.org/product/8480000180377'],
  ['Atún claro en aceite de oliva (Dia)', 17, 0, 25, 'https://world.openfoodfacts.org/product/8480017224361'],
  ['Yogur natural (Consum)', 3.8, 4.7, 2.9, 'https://world.openfoodfacts.org/product/8414807547873'],
  ['Yogur natural alto en proteínas (Lidl Pilos)', 11, 3.6, 0.4, 'https://world.openfoodfacts.org/product/4056489745518'],
  ['Atún claro al natural (HiperDino)', 19.6, 0, 0.9, 'https://world.openfoodfacts.org/product/8435382817144'],
  ['Batido de proteínas whey vainilla (Mercadona Hacendado)', 7.9, 2.2, 0.6, 'https://world.openfoodfacts.org/product/8480000166715'],
  ['Batido de proteínas plátano (Mercadona Hacendado)', 7.1, 4.2, 0.4, 'https://world.openfoodfacts.org/product/8402001010279'],
  ['Batido de proteínas fresa (Mercadona Hacendado)', 7.1, 4.5, 0.4, 'https://world.openfoodfacts.org/product/8480000211026'],
];
/* opciones ambiguas o repetidas → alimento concreto (se quitan del buscador y se cambian en los planes) */
const ALIM_CAMBIOS = {
  'Fruta': 'Manzana',
  'Frutos secos': 'Nueces',
  'Frutos secos naturales': 'Nueces',
  'Pollo': 'Pechuga de pollo',
  'Pavo': 'Pechuga de pavo fresca',
  'Huevos': 'Huevos enteros',
  'Atún': 'Atún al natural',
  'Crema de cacahuete': 'Crema 100% cacahuete',
  'Legumbres': 'Lentejas cocidas',
  'Legumbre + huevo': 'Garbanzos cocidos',
  'Semillas': 'Semillas de lino'
};
(function(){
  ALIM_GENERICOS.forEach(function(x){
    if (!foodInfo(x[0])) FOOD_CATALOG.push({ n: x[0], p: x[1], c: x[2], f: x[3], g: nuGrupoPorMacros(x[1], x[2], x[3]), ref: 'BEDCA' });
  });
  ALIM_SUPER.forEach(function(x){
    if (!foodInfo(x[0])) FOOD_CATALOG.push({ n: x[0], p: x[1], c: x[2], f: x[3], g: nuGrupoPorMacros(x[1], x[2], x[3]), super: true, fuente: x[4] });
  });
  /* fuera del buscador las ambiguas (los alimentos propios de Fátima no se tocan) */
  for (let i = FOOD_CATALOG.length - 1; i >= 0; i--) {
    const o = FOOD_CATALOG[i];
    if (!o.custom && Object.prototype.hasOwnProperty.call(ALIM_CAMBIOS, o.n)) FOOD_CATALOG.splice(i, 1);
  }
})();
/* alérgenos de los alimentos nuevos */
NU_ALERGENOS.push(
  [/avellana|anacardo|pistacho|macadamia|pi[nñ]on|nueces de brasil/i, ['frutoscascara']],
  [/lubina|dorada|rape|lenguado|trucha|caballa|boquer/i, ['pescado', 'anisakis']],
  [/sepia|calamar|pulpo|mejill/i, ['moluscos']],
  [/langostino/i, ['crustaceos']],
  [/s[eé]samo|tahini/i, ['sesamo']],
  [/lino|calabaza|girasol|pipas/i, ['semillas']],
  [/k[eé]fir|leche|mantequilla|cottage|mozzarella|feta/i, ['leche', 'lactosa']],
  [/lenteja|garbanzo|alubia|guisante|edamame/i, ['legumbres']],
  [/gofio de trigo|pan de pita|pan blanco/i, ['gluten', 'celiaquia', 'sgnc']],
  [/^(manzana|pera|melocot[oó]n|nectarina|albaricoque|orejones|cerezas|ciruelas?( pasas)?|fresas|frambuesas)$/i, ['rosaceas']],
  [/^(pl[aá]tano( macho)?|kiwi|papaya|aguacate)$/i, ['latexfrutas']],
  [/^kiwi$/i, ['kiwi']],
  [/^(manzana|pera|pl[aá]tano|naranja|mandarina|kiwi|fresas|frambuesas|uvas|mel[oó]n|sand[ií]a|pi[nñ]a|mango|papaya|melocot[oó]n|nectarina|albaricoque|cerezas|ciruela|higos frescos|granada|caqui|chirimoya|pomelo|pasas|d[aá]tiles.*|ar[aá]ndanos.*)$/i, ['fructosa']],
  [/pasas|ciruelas pasas|orejones/i, ['sulfitos']]
);
/* «Plan rápido»: opciones concretas */
(function(){
  const cambia = function(l){ return l.map(function(n){ return ALIM_CAMBIOS[n] || n; }).filter(function(n, i, a){ return a.indexOf(n) === i; }); };
  Object.keys(NU_TIPICOS).forEach(function(k){ NU_TIPICOS[k] = NU_TIPICOS[k].map(cambia); });
  NU_TIPICOS.ligera[1] = ['Avena', 'Pan integral', 'Plátano', 'Manzana'];
  NU_TIPICOS.ligera[2] = ['Nueces', 'Almendras', 'Crema 100% cacahuete', 'Aguacate'];
  NU_TIPICOS.recena[1] = ['Kiwi', 'Fresas', 'Tortitas de arroz'];
})();
/* planes que ya usan opciones ambiguas: se cambian por el alimento concreto (una vez, en cada dispositivo) */
function alimMigrarPlanes(){
  if (typeof PLANES !== 'object' || !PLANES) return 0;
  let n = 0;
  Object.keys(PLANES).forEach(function(k){
    const html = PLANES[k] && PLANES[k].nut; if (!html || html.indexOf('chip') < 0) return;
    const t = document.createElement('template'); t.innerHTML = html;
    let cambio = false;
    Array.prototype.forEach.call(t.content.querySelectorAll('.macro-group .chip:not(.chip-add)'), function(ch){
      const nom = chipName(ch), nuevo = ALIM_CAMBIOS[nom];
      if (!nuevo) return;
      const g = ch.closest('.macro-group') || ch.parentNode;
      const ya = Array.prototype.some.call(g.querySelectorAll('.chip:not(.chip-add)'), function(o){ return o !== ch && chipName(o) === nuevo; });
      if (ya) { if (ch.classList.contains('selected')) { const o = Array.prototype.filter.call(g.querySelectorAll('.chip:not(.chip-add)'), function(o){ return chipName(o) === nuevo; })[0]; if (o) o.classList.add('selected'); } ch.remove(); }
      else {
        const txt = Array.prototype.filter.call(ch.childNodes, function(x){ return x.nodeType === 3 && x.textContent.trim(); })[0];
        if (txt) txt.textContent = nuevo; else ch.insertBefore(document.createTextNode(nuevo), ch.firstChild);
        const q = ch.querySelector('.chip-qty'); if (q) q.textContent = '';
      }
      cambio = true; n++;
    });
    Array.prototype.forEach.call(t.content.querySelectorAll('.meal-elegidas'), function(e){ e.textContent = ''; });
    if (cambio) PLANES[k].nut = t.innerHTML;
  });
  return n;
}
setTimeout(function(){
  try {
    const n = alimMigrarPlanes();
    if (n) { guardarTodo(); if (typeof clienteActual !== 'undefined' && clienteActual && typeof cargarPlan === 'function' && document.getElementById('app').style.display !== 'none') cargarPlan(clienteActual); }
  } catch(e){}
}, 0);

/* #216 · en el buscador, cada alimento lleva el emoji de su macronutriente principal (el que decide su fila) */
const ALIM_EMO = { p: ['🥩', 'Proteína'], c: ['🍚', 'Hidratos'], f: ['🥑', 'Grasa'] };
renderFoodList = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const list = document.getElementById('foodList'); if (!list) return r;
    Array.prototype.forEach.call(list.querySelectorAll('.picker-item[data-g]'), function(it){
      const e = ALIM_EMO[it.dataset.g], n = it.querySelector('.picker-item-name');
      if (!e || !n || n.querySelector('.alim-emo')) return;
      const t = alimEmoji(n.textContent, it.dataset.g);
      n.insertAdjacentHTML('afterbegin', '<span class="alim-emo" title="' + e[1] + '" aria-label="' + e[1] + ':">' + t + '</span>');
    });
    return r;
  };
})(renderFoodList);


/* =========================================================
   #225 Emoji según el TIPO de alimento (legumbre, arroz, cereal, cada fruta, pescado…)
   y, si no encaja ninguno, el de su macronutriente. Se ve en el buscador y en las opciones del plan.
   ========================================================= */
const ALIM_TIPOS = [
  [/batido de prote|whey|protein drink/, '🥤'], [/pudding|postre/, '🍮'],
  [/atun|sardina|boqueron|caballa|salmon|merluza|bacalao|lubina|dorada|rape|lenguado|trucha|pescado/, '🐟'],
  [/gamba|langostino/, '🦐'], [/calamar|sepia|pulpo/, '🦑'], [/mejillon|almeja/, '🦪'],
  [/huevo|clara/, '🥚'], [/pollo|pavo|contramuslo/, '🍗'], [/jamon|fiambre|bacon/, '🥓'],
  [/ternera|lomo|solomillo|cerdo|conejo|carne/, '🥩'], [/tofu|seitan|tempeh|soja/, '🌱'],
  [/queso|requeson|mozzarella|cottage|burgos/, '🧀'], [/skyr|yogur|kefir|leche|bebida de/, '🥛'],
  [/lenteja|garbanzo|alubia|judia|hummus|legumbre|guisante|edamame/, '🫘'],
  [/tortitas? de arroz/, '🍘'], [/fideos de arroz/, '🍜'], [/arroz/, '🍚'],
  [/pasta|espagueti|macarron|gnocchi|fideo/, '🍝'],
  [/gofio/, '🥣'], [/maiz|millo/, '🌽'],
  [/avena|muesli|granola|copos|quinoa|cous|bulgur|sarraceno|mijo|amaranto|gofio|cereal/, '🥣'],
  [/pan |pan$|pan de|tortilla|pita|biscote/, '🍞'],
  [/boniato|batata/, '🍠'], [/patata|yuca/, '🥔'],
  [/platano/, '🍌'], [/manzana/, '🍎'], [/pera/, '🍐'], [/naranja|mandarina|pomelo|limon/, '🍊'],
  [/kiwi/, '🥝'], [/fresa/, '🍓'], [/frambuesa|arandano|frutos rojos|mora/, '🫐'], [/uva|pasas/, '🍇'],
  [/sandia/, '🍉'], [/melon/, '🍈'], [/pina/, '🍍'], [/mango|papaya/, '🥭'],
  [/melocoton|nectarina|albaricoque|orejon/, '🍑'], [/cereza/, '🍒'], [/ciruela/, '🍑'],
  [/datil/, '🌴'], [/higo|granada|caqui|chirimoya|fruta/, '🍎'],
  [/aceituna|aceite de oliva|oliva/, '🫒'], [/coco/, '🥥'], [/aguacate|guacamole/, '🥑'],
  [/cacahuete/, '🥜'], [/nuez|nueces|almendra|avellana|anacardo|pistacho|macadamia|pinon|frutos secos/, '🌰'],
  [/semilla|pipas|chia|lino|sesamo|tahini/, '🌻'], [/mantequilla/, '🧈'], [/chocolate|cacao/, '🍫'],
  [/alioli|ajo/, '🧄'], [/tomate|ketchup/, '🍅'], [/mostaza|mayonesa|salsa|mojo|vinagreta/, '🥫']
];
function alimEmoji(nombre, g){
  const n = norm(String(nombre || '')).replace(/\(.*?\)/g, '').trim();
  for (let i = 0; i < ALIM_TIPOS.length; i++) if (ALIM_TIPOS[i][0].test(n)) return ALIM_TIPOS[i][1];
  return (ALIM_EMO[g] || ['🍽️'])[0];
}
/* opciones del plan (Fátima y cliente): el emoji va como atributo y se pinta con CSS, sin tocar el texto guardado */
function alimEmoChips(raiz){
  Array.prototype.forEach.call((raiz || document).querySelectorAll('.macro-group .chip:not(.chip-add)'), function(c){
    const t = c.firstChild && c.firstChild.nodeType === 3 ? c.firstChild.textContent : '';
    if (!t.trim()) return;
    const grp = c.classList.contains('protein') ? 'p' : (c.classList.contains('carb') ? 'c' : (c.classList.contains('fat') ? 'f' : ''));
    const e = alimEmoji(t, grp);
    if (c.dataset.emo !== e) c.dataset.emo = e;
  });
}
(function(){
  let pend = false;
  const mirar = function(){ if (pend) return; pend = true; requestAnimationFrame(function(){ pend = false; try { alimEmoChips(); } catch(e){} }); };
  window.addEventListener('load', function(){
    mirar();
    const c = document.getElementById('screenRoot') || document.body;
    if (window.MutationObserver) new MutationObserver(mirar).observe(c, { childList: true, subtree: true });
  });
})();
