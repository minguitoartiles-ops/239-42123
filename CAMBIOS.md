# Registro de cambios — Fitnessindramas

La versión sube cada 10 cambios o mejoras (norma desde la 0.47) y la tercera cifra cada 2 cambios
(norma desde el 19/10/2026 23:14): 0.48 → 0.48.1 → 0.48.2 → … → 0.49.

## Versión 0.72.3 (actual)
Cambios acumulados hacia la 0.73: **6 de 10**

## Versión 0.72 → 0.72.3

### Hacia la 0.73
1. 21/10/2026 23:30 · Seguridad: si la app de un profesional se queda abierta 30 minutos sin usarse, se guarda lo que estaba editando y se cierra la sesión sola; al volver avisa «Sesión cerrada por seguridad»
2. 21/10/2026 23:30 · Seguridad: las copias de seguridad se descargan cifradas con contraseña (AES-256; sin la contraseña el archivo no se puede leer). Al restaurar una copia cifrada la pide. Se puede descargar sin contraseña, pero no se recomienda → **0.72.1**
3. 21/10/2026 23:30 · Seguridad: el IBAN y los números de Bizum salen del código de la app (que es público) y pasan a Ajustes → Pagos de clientes → «Bizum y transferencia». El recuadro «¿Cómo renovar?» del cliente los lee de ahí (y viajan en la copia de seguridad cifrada)
4. 21/10/2026 23:30 · Cliente (móvil): en Entrenamiento las sesiones salen todas plegadas y el cliente despliega la que quiere → **0.72.2**
5. 21/10/2026 23:35 · Cliente: sesión de entreno rediseñada para leerse mejor. Cada ejercicio va en su propia tarjeta con número y nombre grandes y su progreso al lado («1/3 ●○○»); la pauta va en etiquetas («3 series» destacada, «10 reps», «RIR 2» con su color); la serie que toca se resalta en azul con su RIR, las hechas quedan en verde y las demás en una sola línea limpia (el RIR se abre al tocarlas)
6. 22/10/2026 09:30 · Modo pruebas (temporal, solo en el dispositivo donde se activa): abriendo la app con `#pruebas` al final de la dirección, Domingo y Fátima entran sin contraseña, aparece un botón «🧪 Domingo → Fátima» para cambiar de profesional sin cerrar sesión (guarda lo que se estuviera editando) y no se cierra la sesión por inactividad. `#pruebas-off` lo apaga y vuelve a pedir contraseña → **0.72.3**

## Versión 0.71 → 0.71.4

### Hacia la 0.72
1. 21/10/2026 23:20 · Ficha del cliente (sección Seguimiento): «📸 Antes / Ahora» con la primera y la última foto de cada posición (frente, perfil, espalda), con fecha y peso; se amplían al tocarlas
2. 21/10/2026 23:40 · Detalles: en ventanas de ordenador estrechas (hasta 1180 px) la barra del plan deja el nombre del cliente entero («Editando:» se oculta, «Deshacer» queda como ↶ y el botón dice «Guardar y notificar»); la calculadora dice «Kcal objetivo»; los logros se leen mejor en móviles pequeños; Entrenamientos tiene filtros rápidos Todos · ⚠️ Toca revisar · Sin plan · Al día (se combinan con el buscador) → **0.71.1**
3. 21/10/2026 23:59 · Limpieza interna (sin cambios visibles): las tareas que se hacen «después de» abrir pantallas, guardar o pintar el plan se registran como ganchos que se instalan una sola vez al final y corren aislados (si uno falla, los demás siguen); fuera código duplicado (el apagado del modo edición en el cliente estaba dos veces) y envolturas repetidas; goTo pasa de 30 a 24 capas
4. 21/10/2026 23:59 · Mapa muscular semanal. Domingo, en Entrenamientos: figura de frente y espalda + lista con las series semanales por músculo, para ver de un vistazo cómo reparte el volumen; por defecto lo «Pautado en la rutina» y con un toque lo «Hecho esta semana»; tocando un músculo salen los ejercicios de los que salen sus series. Cliente: tarjeta «💪 Tu semana muscular» en su entreno con el mapa y el tonelaje de la semana; se abre sola al completar un día. Escala por series efectivas por músculo y semana según la evidencia en hipertrofia: 1-3 mantenimiento · 4-9 mínimo eficaz · 10-20 óptimo · +20 alto; los músculos que ayudan cuentan media serie → **0.71.2**
5. 22/10/2026 00:10 · Seguimientos: botón «✓ Completar seguimiento» en cada cliente con un seguimiento sin revisar, con comentario opcional que le llega al chat como mención («📋 Revisión de tu seguimiento») y con aviso. Al completarlo desaparece de tu pestaña (independiente para Domingo y Fátima; el otro ve «Ya lo revisó …»). Contador «N seguimientos por revisar» y chip «✓ Revisados» para verlos y «Deshacer». Si el cliente corrige su seguimiento, vuelve a salir para revisar
6. 22/10/2026 00:25 · Chat en la app de escritorio: vuelve el botón 😊 con un panel por categorías (Recientes, Caras, Gestos, Deporte, Comida, Símbolos); inserta donde está el cursor, deja poner varios seguidos y se cierra con Esc o al hacer clic fuera. En el móvil se siguen usando los emojis del teclado → **0.71.3**
7. 22/10/2026 00:45 · Nombre corregido en toda la app: «Fitnessindramas», todo junto (título de la ventana y de la app instalada, menú, textos legales, consentimientos, avisos…)
8. 22/10/2026 01:00 · Mapa muscular con figura anatómica nueva (react-native-body-highlighter, licencia MIT): músculos separados de frente y de espalda, en versión hombre o mujer según el cliente («Figura del mapa muscular» en sus datos). Nueva fila «Créditos y licencias» en Ajustes → Privacidad → **0.71.4**
9. 22/10/2026 01:30 · Seguridad (auditoría): al cargar, los planes y el chat se limpian de código colado (etiquetas y atributos peligrosos, enlaces que no sean http/https/mailto/tel); las funciones de limpieza ya no cargan el HTML que limpian; solo se aceptan fotos reales; los nombres propios de ejercicios y alimentos se escapan
10. 22/10/2026 01:30 · Seguridad (auditoría): política de seguridad de contenidos (la app solo conecta consigo misma, las fuentes y los vídeos incrustados), la app no se muestra si otra web la mete dentro, enlace de pago solo https y códigos de acceso con azar criptográfico → **0.72.0**

## Versión 0.70 → 0.70.4

### Hacia la 0.71
1. 21/10/2026 21:00 · Seguimiento → Datos biométricos: apartado «Fotos de progreso» con tres huecos (Frente · Perfil · Espalda), opcional; se puede quitar o cambiar cada foto y, al editar el seguimiento de la semana, salen las que ya envió. Fátima y Domingo las ven en la tarjeta del seguimiento y se amplían al tocarlas. Fuera el «+ Añadir fotos» que no hacía nada. Se guardan reducidas en el propio dispositivo (pendiente de Supabase, punto 6)
2. 21/10/2026 21:15 · El cliente solo ve lo que pautan los profesionales: en Nutrición fuera la calculadora «Objetivo y reparto», «Plan rápido», «+ Añadir comida» y los controles de opciones; en Entrenamiento fuera Asistente, Plantillas, «+ Día», la ✕ de cada sesión y «+ Añadir sesión». Si un profesional deja el modo edición abierto y entra un cliente en el mismo dispositivo, se apaga solo (sin guardar nada) → **0.70.1**
3. 21/10/2026 21:30 · Profesionales: al pasar del Chat a Entrenamiento (Domingo) o a Nutrición (Fátima) con las pestañas de arriba, el plan se abre igual que desde la ficha del cliente: directamente en modo edición y con el mismo formato (columnas, líneas plegadas, Asistente, Plantillas…). Antes salía la vista de cliente sin editar
4. 21/10/2026 21:50 · Domingo: nueva pestaña «Entrenamientos» (en el móvil «Entrenos») justo debajo de Clientes, con buscador, foto, estado de la rutina (sin plan, toca revisar, al día) y semanas con la rutina actual. Un toque abre el entreno del cliente listo para editar; atrás vuelve a la lista → **0.70.2**
5. 21/10/2026 22:05 · Entrenamientos (Domingo): clientes en lista; al tocar uno, a la derecha (en el móvil, debajo) sale su entreno día a día con el tonelaje movido esa semana (y el de la anterior), sesiones hechas y tiempo con la rutina, con «Abrir entreno» (doble clic también lo abre)
6. 21/10/2026 22:30 · Cardio en el creador de rutinas: 27 ejercicios nuevos (máquinas de cardio, exterior y metabólicos) con filtros propios. Cada uno se pauta «Por tiempo» (minutos + intensidad), «Intervalos / SIIT» (rondas × trabajo / descanso + intensidad, con atajos HIIT 30/30, SIIT 20 s / 2 min, Tabata y 1/1) o «Por series». El cliente lo ve en una línea («35 min · Zona 2», «6 × 20 s / 2 min · Sprint (14 min)») y lo marca como hecho. Nuevo grupo «🔄 Circuito» en ⚡ Técnica para circuitos de fuerza + cardio (vueltas y descanso), hasta 8 ejercicios → **0.70.3**
7. 21/10/2026 22:45 · Botón «Volver» de la barra del plan: vuelve a donde estabas (Entrenamientos, Nutrición, Chats o la ficha del cliente), igual que el botón atrás; antes siempre llevaba a Clientes
8. 21/10/2026 22:55 · Menú de los profesionales en este orden: Clientes · Seguimientos · Entrenamientos (Nutrición y Recetas para Fátima) · Chats · Pagos · Ajustes (en el móvil, Más al final)
9. 21/10/2026 22:55 · Tarjetas de Clientes sin la casilla «Mensajes» (los mensajes se ven en Chats); quedan Global, Entreno y Nutrición → **0.70.4**
   · 21/10/2026 23:30 · Auditoría: en móviles de 360 px los filtros «Todos · Necesitan atención · Sin plan» de Clientes bajan de línea en vez de cortarse (arreglo dentro de la auditoría)
10. 21/10/2026 23:20 · Cardio registrado: al marcarlo como hecho el cliente apunta los minutos y la distancia (por tiempo) o las rondas (intervalos) y lo ve como «✓ Hecho: 32 min · 5,2 km»; se puede cambiar o quitar. Los minutos de la semana se guardan con el seguimiento (salen en su tarjeta), en el gráfico de evolución (filtro «Cardio») y en Entrenamientos junto al tonelaje → **0.71.0**

## Versión 0.69 → 0.69.4

### Hacia la 0.70
1. 21/10/2026 19:40 · Seguimiento semanal más visual: agujetas de 1 verde a 4 rojo; motivación con caras (1 😞 → 5 😄); cumplimiento nutricional coloreado de 1 rojo a 10 verde; estrés con una cara que cambia al deslizar (1 😌 tranquilo → 10 😫 muy estresado). Los valores que se guardan no cambian
2. 21/10/2026 19:40 · Hoy (cliente): fuera las tarjetas «Hoy toca» y «Ahora»; las tarjetas Entrenamiento (sesiones de la semana y completadas) y Plan nutricional (kcal, comidas y macros) son el acceso directo a la rutina y al plan → **0.69.1**
3. 21/10/2026 19:55 · «Necesitan atención» = riesgo de abandono: solo marca a quien lleva 2 o más seguimientos seguidos con puntuación global baja (menos de 55), +48 h sin que le contestemos u 8 semanas o más con la misma rutina (esto último solo para Domingo). Los mensajes sin leer, seguimientos nuevos y pagos ya no lo activan; mensajes y seguimientos nuevos siguen en la tarjeta en gris, como información
4. 21/10/2026 19:55 · Ficha en el ordenador: el tonelaje de la semana sale en su propio marco, separado del de Entrenamiento (se muestra con el filtro Entrenamiento; Fátima no lo ve) → **0.69.2**
5. 21/10/2026 20:15 · Campana: ya no cuenta ni muestra los mensajes del chat (los cuenta en rojo la pestaña Chat/Chats; el sonido de mensaje sigue sonando). Los avisos sin leer salen ordenados por importancia: primero seguimientos, luego pagos, luego cambios de plan y después el resto
6. 21/10/2026 20:15 · Seguimiento: en Agujetas, el número de la semana anterior ya no sale con un aro gris que tapaba el color; se marca con un borde discontinuo de su propio color → **0.69.3**
7. 21/10/2026 20:30 · Protocolos en PDF: Fátima sube PDF (hasta 10 MB) en la ficha de cada cliente, dentro de Nutrición («Protocolos en PDF» · «+ Subir PDF», ✕ para quitar). El cliente recibe un aviso y los ve en Nutrición («Protocolos de Fátima») para descargarlos; Domingo los ve en la ficha sin poder subir ni quitar. Los archivos se guardan en el propio dispositivo (pendiente de Supabase para que lleguen a otros móviles)
8. 21/10/2026 20:30 · Cliente: cuadro «¿Cómo renovar?» en el aviso de suscripción (a punto de vencer, vencida o en gracia) y en la pantalla de acceso pausado: Bizum a los dos números o transferencia (IBAN de Fátima Toledo, Cajasiete), con el concepto ya escrito con su nombre y tarifa y botón «Copiar» en cada dato → **0.69.4**
9. 21/10/2026 20:45 · Mensajes de ánimo al cliente (campana, justo después de seguimiento y pago): felicitación si lleva 3 o más semanas seguidas cumpliendo los entrenos o 2 seguimientos seguidos de 80 o más; ánimo si lleva 2 seguimientos seguidos con puntuación baja o 2 semanas sin entrenar. Como mucho uno por semana; se puede desactivar en Ajustes → Notificaciones
10. 21/10/2026 20:45 · Ordenador (Chrome o Edge): botón «Instalar en este ordenador» en el pie del menú lateral mientras la app no esté instalada; la tarjeta de instalar de la entrada se adapta al ordenador → **0.70.0**

## Versión 0.69.0

## Versión 0.68 → 0.68.5

### Hacia la 0.69
1. 21/10/2026 18:00 · Creador de rutinas (móvil y ordenador): los días se abren y cierran tocando su cabecera o su nombre (el ✎ de al lado sirve para renombrarlos); cada ejercicio sale plegado en una línea (series × reps · RIR editables) y se despliega o pliega tocando su nombre; el botón «Cambiar» abre la lista para elegir otro ejercicio; «Añadir ejercicio» añade una fila vacía sin abrir la lista (se elige con «Cambiar»; si se queda sin elegir, se quita al guardar); fuera las sugerencias 3×10, 4×8…
2. 21/10/2026 18:00 · Chat: fuera el panel de emojis de la app; se usan los del teclado del móvil (Android e iOS) → **0.68.1**
3. 21/10/2026 18:30 · Seguimiento semanal: uno por semana (de lunes a domingo). Si el cliente ya lo envió, ve «Ya has enviado el seguimiento de esta semana» con la fecha del siguiente y «Editar el de esta semana», que abre el formulario relleno; al guardar se corrige ese mismo seguimiento, sin duplicarlo
4. 21/10/2026 18:30 · Creador de rutinas en el ordenador: con más de 3 días, cada día mantiene un ancho cómodo y la fila se desplaza a los lados; el nombre de cada ejercicio sale entero en su línea y la pauta debajo → **0.68.2**
5. 21/10/2026 18:45 · App instalada o abierta mucho rato: busca versión nueva al volver a la ventana y cada 10 minutos y se recarga sola (si estás editando, sale «Hay una versión nueva · Actualizar» para no perder nada). Así la ventana de escritorio en multitarea recibe ya el creador de rutinas que se adapta al ancho → **0.68.3**
6. 21/10/2026 18:55 · Creador de rutinas: «Añadir ejercicio» añade la fila plegada y vacía (sin 3 series ni RIR 2 por defecto); series, reps y RIR se rellenan en la propia línea → **0.68.4**
7. 21/10/2026 19:05 · Creador de rutinas: la línea plegada se actualiza al instante al rellenar series, reps o RIR en el editor (también en el móvil y al añadir o quitar series); si las reps varían se ven tal cual («8/6/6») en vez de casillas vacías
8. 21/10/2026 19:05 · Botón «Cambiar» siempre del mismo color → **0.68.5**
9. 21/10/2026 19:20 · Teléfono (alta de cliente y demás fichas): al entrar en el campo aparece «+34 » ya escrito y se mantiene al escribir el número; si se vuelve a teclear +34 no se duplica, y si solo queda el prefijo el campo se guarda vacío
10. 21/10/2026 19:20 · App de escritorio instalada: fuera el texto de la barra de título («Fitness sin Dramas · Fitnessindramas — Prototipo (Semana viva)»); en su lugar queda una franja fina y limpia (sirve para arrastrar la ventana) separada del contenido por una línea suave. El título de la pestaña pasa a ser solo «Fitness sin Dramas» → **0.69.0**

## Versión 0.67 → 0.67.4

### Hacia la 0.68
1. 21/10/2026 16:00 · Creador de rutinas compacto en el ordenador: los días salen en columnas, uno al lado del otro y todos abiertos; cada ejercicio es una línea con su pauta (3 × 10 · RIR 2, con su color) y al tocarlo se abre su editor (tabla serie a serie, notas, vídeo) sin plegar nada más; los ejercicios nuevos se abren solos. Botón «Vista detallada / Vista compacta» (se recuerda)
2. 21/10/2026 16:00 · Tarjetas de clientes: el periodo de gracia ya no sale dos veces → **0.67.1**
3. 21/10/2026 16:00 · Ficha: el apartado del filtro elegido se abre, pero se puede plegar; Domingo vuelve a ver «Nutrición de un vistazo» (salía vacío al filtrar por Nutrición)
4. 21/10/2026 16:00 · Ordenador: al abrir un cliente desde Pagos, Chats, avisos o Seguimientos, queda marcado en la lista de Clientes de la izquierda y la lista se desplaza hasta él → **0.67.2**
5. 21/10/2026 16:00 · Todos los contadores de notificaciones en el mismo rojo
6. 21/10/2026 16:30 · Tiempo con la rutina actual: la ficha muestra «Con esta rutina desde el dd/mm · N semanas» (ámbar a partir de 6 semanas, rojo a partir de 8) y las tarjetas de la lista de Domingo «🏋️ Rutina: N sem»; la cuenta empieza de nuevo solo cuando cambian los ejercicios o los días, no al ajustar reps o RIR
7. 21/10/2026 16:30 · Seguimientos de un cliente: gráfico de evolución arriba con filtros Peso · Cintura · Cadera · Bíceps · Muslo · Entreno · Nutrición · Motivación · Estrés · Pasos/día · Tonelaje semanal; muestra el último valor y el cambio desde el inicio, y al pasar el ratón o el dedo cada semana. La tabla sigue en «Ver tabla» → **0.67.3**
8. 21/10/2026 16:50 · Creador de rutinas compacto: series, reps y RIR se cambian directamente en la línea de cada ejercicio (se aplican a todas sus series; Intro para confirmar, ↑ ↓ para subir o bajar) sin abrirlo; ✎ o un clic en la línea abre el editor completo (serie a serie, notas, vídeo, técnica) y Esc lo cierra → **0.67.4**
9. 21/10/2026 17:20 · Cada profesional en su área: Domingo ya no abre ni edita el plan nutricional ni las recetas (ve «Nutrición de un vistazo» en la ficha, como resumen) y Fátima no abre ni edita el entrenamiento ni ve el registro de pesos ni el tonelaje (ve el resumen de sesiones); en la ficha solo aparecen los accesos de cada uno. Chat, seguimientos, ficha y pagos siguen compartidos
10. 21/10/2026 17:20 · Fátima · Planes de nutrición: buscador de clientes, foto (o inicial) de cada uno y lista; al elegir un cliente su resumen nutricional sale a la derecha en el ordenador (debajo en el móvil) con «Abrir plan» → **sube a la 0.68**

## Versión 0.66 → 0.66.4

### Hacia la 0.67
1. 21/10/2026 14:35 · Plan nutricional (profesionales, editando): volver a tocar un alimento elegido lo deselecciona (se puede deshacer)
2. 21/10/2026 14:35 · Pagos: «Clientes» y «Últimos movimientos» en dos apartados (selector arriba); filas con una franja de color a la izquierda (rojo sin acceso, naranja gracia, ámbar vence pronto, verde al día), texto más grande y columnas Nombre · Tarifa · Alta · Estado mejor alineadas → **0.66.1**
3. 21/10/2026 14:35 · Sonidos: «campanita» cuando llega un aviso a la campana y «mensaje enviado» al enviar un mensaje, foto o audio en el chat; se pueden quitar en Ajustes → Notificaciones → Sonidos
4. 21/10/2026 14:55 · Clientes sin pago: cuando se acaba el periodo de gracia y el cliente se queda sin acceso, su ficha se guarda 15 días; si sigue sin pagar, la app borra su perfil al abrirla un profesional (no afecta a bajas ni a quien tenga el acceso permitido a mano). 3 días antes se avisa a Domingo y Fátima; la ficha muestra «Su perfil se borrará el dd/mm» con «Descargar sus datos», Pagos indica «se borra en N días» y el cliente bloqueado ve hasta cuándo se guardan sus datos → **0.66.2**
5. 21/10/2026 15:10 · Términos y condiciones del servicio dentro de la app (Ajustes → Privacidad, en la pantalla de inicio y en el consentimiento del primer acceso), con el texto de Domingo adaptado a la app: dudas por el chat de la app (antes Telegram), seguimiento desde la app (antes Google Drive), 7 días de gracia (antes 5), borrado del perfil a los 15 días sin pagar, solo mayores de 18 años (antes desde 16 con autorización) y «Brain4gainzz» corregido a Fitnessindramas
6. 21/10/2026 15:10 · Política de privacidad actualizada: qué pasa con los datos si no pagas (gracia de 7 días, 15 días guardados y borrado) y si te das de baja; pagos por transferencia o Stripe → **0.66.3**
7. 21/10/2026 15:30 · Ordenador en multitarea: el modo ordenador funciona ya desde 900 px de ancho (media pantalla); por debajo de 1280 px el menú lateral se queda en iconos (con su nombre al pasar el ratón) y, si la lista se estrecha, las cifras de cada cliente pasan a 2 × 2
8. 21/10/2026 15:30 · Barra vertical entre la lista y el panel derecho: se arrastra para dar más o menos ancho a cada lado (también con ← →), todo se recoloca solo, se recuerda para cada profesional y con doble clic vuelve al ancho normal → **0.66.4**
9. 21/10/2026 15:30 · Seguimientos: fuera el peso repetido arriba a la derecha de cada semana (ya está en su casilla)
10. 21/10/2026 15:30 · Sonidos: ya no suena nada al enviar un mensaje; el sonido «mensaje enviado» suena ahora al RECIBIR un mensaje, y la campanita con el resto de avisos → **sube a la 0.67**

## Versión 0.65 → 0.65.4

### Hacia la 0.66
1. 21/10/2026 13:25 · Seguimientos de un cliente (profesionales): en lista de una sola columna, del más reciente (arriba) al más antiguo (abajo), también en el ordenador; en el móvil el botón «Descargar en PDF» ya no ocupa todo el ancho
2. 21/10/2026 13:45 · Chat: cada mensaje lleva la foto (o la inicial) de quien lo escribe a la izquierda de la burbuja, también los tuyos, para Domingo, Fátima y el cliente → **0.65.1**
3. 21/10/2026 13:45 · Recetas: la pantalla ya no se puede aplastar con listas largas o ventanas bajas; la etiqueta «Esta semana» del recetario del cliente ya no se estira
4. 21/10/2026 13:45 · Pagos (móvil y ordenador): lista en columnas Nombre · Tarifa · Alta · Estado del pago, con los mismos colores (rojo sin acceso o vencido, naranja periodo de gracia, ámbar vence pronto, verde al día); al tocar un cliente se abre su ficha con «Suscripción» desplegada → **0.65.2**
5. 21/10/2026 14:05 · Ordenador con pantalla grande: el historial de seguimientos de un cliente y la pantalla de Recetas ya no salen aplastados en una columna estrechísima (era el «achatado» de Recetas)
6. 21/10/2026 14:05 · Tarjetas de la lista de clientes: el nombre ya no se parte en tres líneas; la etiqueta de estado baja a la línea de abajo si no cabe. Filtros de clientes sin cortarse en el ordenador y casillas de la calculadora alineadas. Revisadas todas las pantallas con 40 clientes en móvil (360 y 412 px), tablet y ordenador (1100 a 2560 px) → **0.65.3**
7. 21/10/2026 14:20 · Pestaña Seguimientos (profesionales): la puntuación sale grande («66 /100») con su color, «Ver resumen» es un botón cómodo de pulsar y hay filtros Todos · Al día · Pendientes de rellenar · Mejor puntuación · Peor puntuación (con el número de clientes en cada uno); la línea de la última semana ya no corta la fecha
8. 21/10/2026 14:20 · Seguimientos siempre ordenados del más reciente al más antiguo aunque una copia restaurada los traiga al revés (la copia de prueba de 40 clientes los traía así y marcaba días de retraso que no eran) → **0.65.4**
9. 21/10/2026 14:15 · Cliente: barra de abajo Hoy · Nutrición · Entreno · Chat · ⚙️ Ajustes. Fuera la pestaña «Progreso»: al final de «Hoy» sale «Tu progreso» (semana del plan, peso desde el inicio, seguimientos, logros y rachas) con «Ver todo mi progreso». «Cerrar sesión» pasa al panel de la foto de perfil, con acceso directo a Ajustes
10. 21/10/2026 14:15 · Seguimientos en el ordenador: números y medidas más grandes y repartidos por todo el ancho de la tarjeta (notas en casillas de 24 px, medidas en tres columnas) → **sube a la 0.66**

## Versión 0.64 → 0.64.4

### Hacia la 0.65
1. 20/10/2026 18:51 · Botones de eliminar más grandes y en rojo en toda la app: ✕ de días, comidas, ejercicios y series (38 px, fondo rojo claro, rojo entero al pasar por encima) y ✕ de cada alimento como círculo rojo con zona de toque más grande; «Borrar» plantilla, «Quitar» foto y «Quitar» vídeo en rojo
2. 20/10/2026 18:54 · Plan nutricional: Fátima ya no ve el check de «comida tomada» al crear o revisar el plan (solo lo ve el cliente) → **0.64.1**
3. 20/10/2026 19:03 · Recetas de Fátima (profesionales): nueva sección «Recetas» (en «Más» en el móvil y en el menú lateral del ordenador) para crear recetas completas a mano —ingredientes en gramos, raciones y preparación— con calorías, macros por ración y alérgenos al momento; «📣 Enviar a todos» la manda a todos los clientes con un aviso y queda como «Receta de la semana» durante 7 días
4. 20/10/2026 19:03 · Recetas de Fátima (cliente): tarjeta «Receta de la semana» en Hoy y recetario en Nutrición; al abrir una receta el cliente elige en qué comida la quiere y ve las cantidades de SU ración (la receta entera escalada a las kcal de esa comida, mismas proporciones), sus macros frente a los de esa comida, la preparación, la receta original y un aviso si choca con sus alergias → **0.64.2**
5. 21/10/2026 12:35 · Memoria: los datos de la app se guardan comprimidos (unas 4 veces menos espacio) y los planes ya no guardan los botones y la tabla del editor, solo la pauta; con 40 clientes de prueba (34 con plan de entreno) ocupa ~0,5 MB y guardar tarda ~30 ms. Los datos antiguos se convierten solos al abrir la app
6. 21/10/2026 12:35 · Aviso de memoria: si el almacenamiento del navegador pasa del 80 %, sale un aviso para hacer una copia de seguridad; «Espacio usado» en Ajustes mide el tamaño real comprimido → **0.64.3**
7. 21/10/2026 12:35 · Arrastrar ejercicios: el ejercicio ya no salta de sitio mientras se arrastra; una línea azul marca dónde quedará y se mueve al soltar (ratón y dedo)
8. 21/10/2026 13:10 · Avisos de «plan actualizado»: abrir o consultar el plan de un cliente ya no cuenta como cambio; solo se avisa al cliente al guardar si de verdad ha cambiado algo de la pauta. El botón pasa a llamarse «Guardar cambios y notificar» («Guardar y notificar» en el móvil) y al pulsarlo se confirma si se ha avisado o no hubo cambios → **0.64.4** (junto con el 9)
9. 21/10/2026 13:10 · Cliente: el botón «Chat» de la barra de abajo muestra en rojo cuántos mensajes del equipo tiene sin leer; desaparece al abrir el chat
10. 21/10/2026 13:25 · Ficha del cliente (profesionales): «Gestión del cliente», «Suscripción» y «Entrenamiento» salen plegados al abrirla desde Clientes, con un resumen en una línea (p. ej. «Mensual · hasta 20/11/2026»); se despliegan tocando el título y se quedan abiertos mientras trabajas con ese cliente. Los filtros de arriba y los avisos (alergias, pagos) abren el apartado que toca. En el ordenador ya no salen tarjetas vacías → **sube a la 0.65**

## Versión 0.63 → 0.63.4

### Hacia la 0.64
1. 20/10/2026 18:10 · Editor de rutinas: cada ejercicio es una tarjeta con sus propias columnas «Series · Reps · RIR» (en el ordenador, en la misma fila que el nombre)
2. 20/10/2026 18:10 · Las series del cliente se llaman «Serie 1, Serie 2, Serie 3…» en vez de S1, S2, S3 → **0.63.1**
3. 20/10/2026 18:10 · Vídeo de ejemplo por ejercicio: Domingo pega el enlace (YouTube, Instagram, Vimeo o Google Drive) y el cliente lo ve dentro de la app con «▶ Ver vídeo de ejemplo»; otros enlaces se abren aparte
4. 20/10/2026 18:10 · Fuera las descripciones automáticas de los ejercicios (también las de los planes ya hechos): ahora son «Notas» que escribe Domingo; si no hay nota, el cliente no ve nada → **0.63.2**
5. 20/10/2026 18:10 · Domingo ya no ve el check de «sesión hecha» en los días (solo lo ve el cliente)
6. 20/10/2026 18:10 · Mover ejercicios manteniendo pulsado (ratón o dedo) o arrastrando desde ⠿, dentro del día o a otro día (soltando sobre un día plegado); se puede deshacer → **0.63.3**
7. 20/10/2026 18:10 · RIR con un tono por valor: 0 rojo muy oscuro, 1 rojo oscuro, 2 rojo claro, 3 naranja oscuro, 4 naranja claro, 5+ verde (antes 3-4 era amarillo)
8. 20/10/2026 18:10 · Una sola pauta por ejercicio: Domingo pone series, reps y RIR una vez y se aplican a todas las series (fuera la edición serie a serie). En los planes ya hechos, si las series eran distintas se vacían reps y RIR para ponerlos a mano; → **0.63.4**
9. 20/10/2026 18:32 · Entreno: «Ajustar serie a serie» en cada ejercicio para dar a cada serie sus reps y su RIR (p. ej. 1×5 RIR 2 + 2×10 RIR 1), añadir una serie (copia la última) o quitar una concreta; arriba se lee «varía» y, si se cambian las reps o el RIR de arriba, se aplican a todas (se puede deshacer). El cliente ve «3 series · 5 / 10 / 10 reps · RIR 2 / 1 / 1». El asistente y la importación vuelven a respetar las series distintas
10. 20/10/2026 18:43 · Entreno: la tabla «Serie · Reps · RIR» con una fila por serie pasa a ser la forma normal de escribir la pauta (siempre visible, sin botón «Ajustar serie a serie»); fuera los bloques sueltos Series / Reps / RIR. Las pautas rápidas (3×10 · RIR 2…) rellenan todas las filas. Al arrastrar, basta con entrar un poco en el ejercicio vecino para cambiarlos de sitio → **sube a la 0.64**

## Versión 0.62 → 0.62.4

### Hacia la 0.63
1. 20/10/2026 16:50 · Plan nutricional (profesionales, móvil): barra fija con el cuadre del día (kcal y macros frente al objetivo) y calculadora plegable que muestra en una línea el objetivo y el reparto
2. 20/10/2026 16:50 · Seguimientos (profesionales): una línea por cliente con su estado; «Ver resumen ▾» despliega el detalle → **0.62.1**
3. 20/10/2026 16:50 · Seguimiento semanal del cliente en 4 pasos (Entrenamiento, Nutrición, Bienestar y Datos biométricos) con barra de progreso y botones Anterior / Siguiente; si falta un dato obligatorio salta a ese paso; el historial pasa a «Progreso»
4. 20/10/2026 16:50 · Ordenador: filas de clientes más compactas, seguimientos en rejilla, pestañas del cliente (Entrenamiento / Nutrición / Chat) en la barra del editor y atajos Ctrl+K (buscar cliente) y Alt+↑↓ (cliente anterior / siguiente) → **0.62.2**
5. 20/10/2026 16:50 · Ajustes en apartados plegables (el primero abierto; recuerda cuáles dejaste abiertos)
6. 20/10/2026 16:50 · Recompensas para el cliente: mensaje corto de motivación al completar una sesión, la semana de entrenos, un récord de peso en un ejercicio, el día de nutrición, enviar el seguimiento o tener una semana de nota (entreno y nutrición ≥ 8); rachas de semanas de entrenos, días de nutrición y semanas de seguimiento con hitos (2, 3, 4, 6, 8… semanas; 3, 5, 7, 10… días); tarjeta «🏅 Tus logros» en Progreso → **0.62.3**
7. 20/10/2026 17:10 · Recompensas sin saturar: los logros que llegan a la vez (p. ej. semana completa + racha) salen en un único mensaje «¡N logros a la vez!» con la lista; «sesión hecha» no se muestra si hay un logro mayor
8. 20/10/2026 17:10 · Recompensas: récord de repeticiones (más reps que nunca con ese peso o más, uno por ejercicio y día); los récords también comparan con las series ya hechas ese día → **0.62.4**
9. 20/10/2026 17:10 · Entreno en móviles pequeños (iPhone SE y similares): el RIR solo se despliega en la serie que toca (o al tocar S1 o editar la serie); las demás muestran el RIR apuntado en una etiqueta de color. Un día de 6 ejercicios pasa de unas 5,5 a 4,2 pantallas
10. 20/10/2026 18:10 · Rutinas: el nombre del día más grande (22 px) que el de cada ejercicio (16-17 px, numerado) para distinguirlos mejor, para Domingo y para el cliente → **sube a la 0.63**

## Versión 0.61.1 → 0.61.4

### Hacia la 0.62
1. 20/10/2026 13:10 · Corregido: no se podía mover un ejercicio por encima o por debajo del título de una superserie o circuito
2. 20/10/2026 13:10 · Corregido: «Deshacer» juntaba en un solo paso dos acciones hechas muy seguidas; ahora cada acción es un paso → **0.61.1**
3. 20/10/2026 16:50 · Hoy (cliente): tarjetas «Hoy toca» (la sesión que corresponde, con su progreso) y «Ahora» (la comida de esta franja); el aviso del chat ocupa menos
4. 20/10/2026 16:50 · Entreno (cliente): se abre directamente el día que toca; las sensaciones van al final y el tonelaje en una línea → **0.61.2**
5. 20/10/2026 16:50 · Entreno (cliente): ejercicio compacto (la pauta no se repite, «Técnica» plegada); al completar un ejercicio se pliega y la pantalla baja sola al siguiente; barra fija con ejercicio y series hechas
6. 20/10/2026 16:50 · Nutrición (cliente): la comida de ahora sale abierta y marcada «AHORA»; el resto plegadas mostrando las opciones elegidas → **0.61.3**
7. 20/10/2026 16:50 · Textos de al menos 11 px y botones más grandes (marcar sesión y comida, barra del editor, flechas de cliente)
8. 20/10/2026 16:50 · Corregido: en el ordenador, al volver atrás la app no sabía qué pantalla estaba abierta → **0.61.4**
9. 20/10/2026 16:50 · Clientes (profesionales): buscador en el móvil, filtros «Necesitan atención» (mensajes, +48 h sin respuesta, seguimientos nuevos, pagos) y «Sin plan», los urgentes primero con el motivo; tarjetas más compactas; el aviso de copia de seguridad se puede posponer una semana
10. 20/10/2026 16:50 · Editor de entreno: solo la pauta (fuera tonelaje, sensaciones, recursos y campos del cliente) y botones de la barra más grandes → **sube a la 0.62**

## Versión 0.60 → 0.60.4

### Hacia la 0.61
1. 20/10/2026 10:35 · Corregido: en un plan guardado, las opciones de cada comida no se podían tocar al volver a abrirlo; el cliente ya puede elegir su opción
2. 20/10/2026 10:50 · Deshacer: mientras se edita un entreno o un plan nutricional, botón «↶ Deshacer» y Ctrl+Z (Cmd+Z en Mac) para volver atrás hasta 20 cambios (borrados, plantillas, series, alimentos, kcal…); en móviles pequeños la barra se compacta para que quepa el nombre → **0.60.1**
3. 20/10/2026 11:00 · Ficha: «Gestión del cliente» arriba, después «Suscripción» y luego el resto; Domingo también ve el resumen del plan nutricional (después del entreno)
4. 20/10/2026 11:00 · Ficha: lápiz ✎ junto al nombre para cambiar el nombre y los datos del cliente → **0.60.2**
5. 20/10/2026 11:10 · Ordenador: en el aviso «La app de clientes funciona en el móvil», «Soy del equipo» pide la contraseña de Fátima o Domingo y abre la app de ese cliente con el ancho de un móvil (con aviso «Vista de cliente» y botón Salir); los clientes siguen bloqueados
6. 20/10/2026 11:40 · Entreno: técnicas avanzadas con «⚡ Técnica» en cada ejercicio: myo reps, drop set y rest-pause con pauta editable; superseries (A1/A2…) y circuitos por tiempo (EMOM, AMRAP, Tabata, intervalos) con minutos para un grupo de ejercicios seguidos; el cliente ve la pauta y «¿Cómo se hace?», y en AMRAP apunta las rondas → **0.60.3**
7. 20/10/2026 11:25 · Nutrición: 35 productos de Mercadona (Hacendado), Lidl y Carrefour en el catálogo, con la marca en el nombre, sus macros de etiqueta y sus alérgenos
8. 20/10/2026 11:25 · Nutrición: cada alimento va a la fila del macronutriente del que más gramos tiene (también los que creéis vosotros; al crearlo se indica la fila). Cambian «Legumbre + huevo» y «Semillas de chía», que pasan a Carbohidrato → **0.60.4**
9. 20/10/2026 11:45 · Nutrición: Fátima puede fijar a mano los gramos de un alimento (tocando su cantidad en «Editar»); queda con 📌 y el resto de la comida se recalcula para cuadrar; las alternativas de esa fila salen equivalentes (mismos gramos de su macronutriente principal); tocando 📌 se suelta; si lo fijado se pasa, la comida lo avisa
10. 20/10/2026 13:10 · Entreno: nueva forma de apuntar las series (como la captura de Domingo): una fila por serie con S1, reps, peso con − / + y ✓; RIR con botones 0 · 1 · 2 · 3 · 4 · 5+ con sus colores (0-2 rojo, 3-4 amarillo, 5+ verde) y la pauta marcada; tipo de serie (Efectiva, Aprox., Descarga, Drop, RP) y nota; cabecera con la pauta y la semana pasada. Al marcar ✓ sin datos se ponen las reps de la pauta y el peso anterior → **sube a la 0.61**

## Versión 0.59.1 → 0.59.4

### Hacia la 0.60
1. 20/10/2026 09:45 · Ordenador: los clientes solo pueden usar la app en el móvil o la tablet; en un ordenador ven un aviso con un código QR para abrirla en el móvil
2. 20/10/2026 09:45 · Corregido: en pantallas grandes asomaba el texto antiguo «Prototipo interactivo…» → **0.59.1**
3. 20/10/2026 09:40 · Entreno: al aplicar una plantilla los días salen plegados (solo el nombre de cada día) y se abre el que se quiera editar
4. 20/10/2026 09:45 · Entreno: el plan del asistente y el importado desde Claude también salen con los días plegados → **0.59.2**
5. 20/10/2026 10:05 · Nutrición: al crear un alimento propio se avisa si sus macros no son creíbles por 100 g (p. ej. una leche con 15 g de carbohidrato, copiada de un vaso), con «Corregir» o «Guardar igualmente»; se muestran las kcal por 100 g mientras se escriben
6. 20/10/2026 10:35 · Ajustes de Fátima y Domingo: fuera «Dispositivos y apps de salud» (sigue en los Ajustes del cliente) → **0.59.3**
7. 20/10/2026 10:35 · Plan nutricional (profesionales): fuera de «Editar», tocar una opción no la cambia ni recalcula cantidades; avisa «Pulsa Editar»
8. 20/10/2026 10:35 · Plan nutricional: fuera el «Resumen rápido de cantidades» para todos (ya están en cada comida) → **0.59.4**
9. 20/10/2026 10:35 · Ficha: el «Registro de pesos» va plegado dentro del bloque «Entrenamiento» (y sale de los apartados)
10. 20/10/2026 10:35 · Ficha: «Gestión del cliente» sin «Seguimientos realizados», «Entrenamiento», «Plan nutricional» ni «Conversación» (están en los botones de arriba) → **sube a la 0.60**

## Versión 0.58.1 → 0.58.4

### Hacia la 0.59
1. 20/10/2026 09:05 · Domingo: quitada la pestaña «Entrenos» de la barra de abajo (los entrenos se abren desde «Clientes»); Fátima mantiene «Nutrición»
2. 20/10/2026 09:05 · Corregido: la pantalla «Más» salía descolocada (lista a la derecha y barra de abajo a media pantalla); ahora tiene la misma estructura que las demás pestañas → **0.58.1**
3. 20/10/2026 09:45 · Ordenador (Fátima y Domingo): menú lateral con Clientes, Nutrición (Fátima), Chats, Seguimientos, Pagos, Ajustes, notificaciones y Salir, en vez de la barra de abajo
4. 20/10/2026 09:45 · Ordenador: lista de clientes con buscador a la izquierda y ficha a la derecha; se cambia de cliente con un clic → **0.58.2**
5. 20/10/2026 09:45 · Ordenador: la ficha del cliente se ordena en bloques a dos columnas (entreno, registro, seguimiento, datos, nutrición, suscripción), empezando por lo de cada profesional
6. 20/10/2026 09:45 · Ordenador: editor de entrenos tipo Excel: ejercicio a la izquierda y series en casillas a la derecha, botones al pasar el ratón, el tabulador salta de casilla y Ctrl+S guarda → **0.58.3**
7. 20/10/2026 09:45 · Ordenador: en nutrición, la calculadora (objetivo, macros, reparto y cuadre) queda fija a la derecha mientras se edita el plan
8. 20/10/2026 09:45 · Ordenador: chats tipo WhatsApp Web, con la lista a la izquierda y la conversación a la derecha; Intro envía y Mayúsculas+Intro hace salto de línea → **0.58.4**
9. 20/10/2026 09:45 · Ordenador: seguimientos en tabla semana a semana (peso, medidas, puntuaciones y pasos) y tarjetas en varias columnas
10. 20/10/2026 09:45 · Ordenador: avisos, asistente, plantillas y selectores se abren como ventana centrada; Esc la cierra → **sube a la 0.59**

## Versión 0.57 → 0.57.4

### Hacia la 0.58
1. 20/10/2026 02:55 · Entreno: las sesiones se pueden renombrar tocando su nombre (encima sigue «Día 1, Día 2…» como en el Excel)
2. 20/10/2026 02:55 · Entreno: reps y RIR por serie (S1…S5), como en la hoja «Entrenamiento»; la cabecera los pone iguales en todas de una vez → **0.57.1**
3. 20/10/2026 02:55 · Entreno más rápido: pautas de un toque (3×10 · RIR 2, 4×8, 5×5…), añadir varios ejercicios a la vez, duplicar y ordenar ejercicios y días, y plantillas (Full body, Torso/Pierna, Empuje/Tirón/Pierna, Weider y las tuyas)
4. 20/10/2026 02:55 · RIR por colores para el cliente: rojo 0-2, amarillo 3-4 y verde 5 o más, con leyenda «¿Qué es el RIR?» → **0.57.2**
5. 20/10/2026 02:55 · Barra de abajo según quién entra: Domingo «Clientes · Entrenos · Chats · Seguimientos · Más» y Fátima «Clientes · Nutrición · Chats · Seguimientos · Más»; Pagos y Ajustes pasan a «Más»
6. 20/10/2026 02:55 · Pestaña «Entrenos» / «Nutrición»: cada cliente con el estado de su plan (sin plan, toca revisar, actualizado hace X); al tocarlo se abre ya en edición, se guarda solo y las flechas ‹ › siguen editando → **0.57.3**
7. 20/10/2026 02:55 · Ficha del cliente: cuatro accesos grandes (Entreno, Nutrición, Chat, Seguimientos, en orden según el profesional), apartados como las hojas del Excel y resumen del entrenamiento; botón «Entreno» / «Plan» en cada tarjeta
8. 20/10/2026 02:55 · Registro de pesos como en el Excel: el cliente apunta peso y reps hechas en cada serie, se guarda cada semana, ve su historial por ejercicio y el profesional ve la tabla semanal con 🏆 cuando sube → **0.57.4**
9. 20/10/2026 02:55 · ✨ Asistente de entrenamiento: crea un plan base con días, nivel, material, tiempo, objetivo, prioridad y molestias; o «Preparar con Claude»: copia la petición, pégala en Claude e importa su respuesta
10. 20/10/2026 02:55 · Corregido: un ejercicio nuevo creado desde «+ Añadir ejercicio» no se añadía a la sesión, y los ejercicios propios se perdían al cerrar la app → **sube a la 0.58**

## Versión 0.56 → 0.56.4

### Hacia la 0.57
1. 20/10/2026 02:00 · Corregido: los pesos que apuntaba el cliente se perdían si cerraba la app sin hacer nada más; ahora se guardan al escribir y al salir
2. 20/10/2026 02:00 · Corregido: «Revisiones esta semana» pasa a «Seguimientos esta semana» y los textos de prueba de la ficha («1.040 kg», «Marta») ya no aparecen → **0.56.1**
3. 20/10/2026 02:30 · Nutrición: cálculo automático. Cada opción de cada comida tiene ya sus gramos para que la comida cuadre con su parte de las kcal y de los macros, también al cambiar una opción por otra; el total del plan se compara con el objetivo
4. 20/10/2026 02:30 · Nutrición: el reparto entre comidas se hace solo según el número de comidas (con sus kcal); si Fátima lo cambia a mano, botón «Repartir automáticamente» → **0.56.2**
5. 20/10/2026 02:30 · Nutrición: «⚡ Plan rápido»: número de comidas, kcal sugeridas por peso y objetivo, macros por objetivo y opciones típicas en cada comida, evitando sus alergias
6. 20/10/2026 02:30 · Nutrición: el selector de alimentos avisa de los que chocan con las alergias del cliente → **0.56.3**
7. 20/10/2026 02:30 · Corregido: los alimentos propios se perdían al cerrar la app; ahora se guardan
8. 20/10/2026 02:30 · Plan del cliente: flechas ‹ › junto al nombre para pasar al siguiente cliente sin salir del plan → **0.56.4**
9. 20/10/2026 02:30 · Ficha (Fátima): «Nutrición de un vistazo» con kcal, macros, cuadre, comidas con cantidades, alergias, adherencia y última sensación
10. 20/10/2026 02:30 · Tarjetas de clientes (Fátima): kcal, macros, nº de comidas y alergias; al tocarla se abre el plan → **sube a la 0.57**

## Versión 0.55 → 0.55.4

### Hacia la 0.56
1. 20/10/2026 01:45 · Mejora: accesibilidad (interruptores con nombre y letras más grandes en la barra inferior)
2. 20/10/2026 01:45 · Tarifas mensual, trimestral o anual desde el alta, con precio y primer pago; registro de pagos en la ficha → **0.55.1**
3. 20/10/2026 01:45 · Recordatorios de pago al cliente (7, 3 y 1 días antes y el día del vencimiento) y periodo de gracia de 7 días con ventana una vez al día
4. 20/10/2026 01:45 · Acceso: el profesional puede denegar o permitir el acceso; al acabar la gracia se pierde el acceso (se puede desactivar) y enlace de pago opcional → **0.55.2**
5. 20/10/2026 01:45 · Pestaña «Pagos clientes»: estado de cada cliente, ingresos, pendientes, filtros y últimos movimientos
6. 20/10/2026 01:45 · Bajas de clientes (con motivo) y reactivación, sin borrar datos → **0.55.3**
7. 20/10/2026 02:00 · Textos: «coach» pasa a «tu equipo» o «profesional» en toda la app
8. 20/10/2026 02:00 · El panel del profesional se titula «Clientes» (antes «Entrenamiento» o «Nutrición») y Ajustes muestra quién eres → **0.55.4**
9. 20/10/2026 02:00 · Ajustes del profesional: fuera el correo de prueba; se muestra el correo de contacto real
10. 20/10/2026 02:00 · Ficha: tonelaje real de la semana (con comparación) y «Próxima revisión» con la fecha del lunes; fuera el acceso antiguo con contraseña de prueba del código → **sube a la 0.56**

### Hacia la 0.55
1. 20/10/2026 01:45 · Mejora: editar los datos del cliente desde la ficha (objetivo, duración, fecha de alta, contacto)
2. 20/10/2026 01:45 · Mejora: el objetivo nutricional muestra «pendiente» hasta que Fátima lo fija y cuándo se actualizó → **0.54.1**
3. 20/10/2026 01:45 · Mejora: sesiones y comidas marcadas con su fecha; la adherencia del seguimiento se sugiere sola
4. 20/10/2026 01:45 · Mejora: aviso en «Hoy» si faltan las alergias → **0.54.2**
5. 20/10/2026 01:45 · Mejora: campana en todas las pestañas del profesional
6. 20/10/2026 01:45 · Mejora: barra del cliente con 5 pestañas (Ajustes pasa al perfil) → **0.54.3**
7. 20/10/2026 01:45 · Mejora: recordatorio semanal para descargar la copia de seguridad
8. 20/10/2026 01:45 · Mejora: indicador del espacio usado en el móvil → **0.54.4**
9. 20/10/2026 01:45 · Mejora: copiar el plan de un cliente a otro
10. 20/10/2026 01:45 · Mejora: seguimientos en PDF → **sube a la 0.55**

### Hacia la 0.54
1. 20/10/2026 01:45 · Corregido: el tonelaje comparaba con una «semana pasada» que no existía; ahora hay cambio de semana real
2. 20/10/2026 01:45 · Corregido: el cumplimiento contaba «0 de 0 comidas» como 0 % → **0.53.1**
3. 20/10/2026 01:45 · Corregido: barras y botones que se montaban en móviles estrechos (iPhone SE)
4. 20/10/2026 01:45 · Corregido: el mensaje de código erróneo iba dirigido al profesional → **0.53.2**
5. 20/10/2026 01:45 · Corregido: «Mensajes sin leer» en rojo con 0
6. 20/10/2026 01:45 · Corregido: textos «Has hecho las 1 sesiones» y «1 sesion» → **0.53.3**
7. 20/10/2026 01:45 · Corregido: «Retirar consentimiento» ahora dice «…de salud» y va junto a su fila
8. 20/10/2026 01:45 · Corregido: la copia de seguridad no guardaba las notificaciones y al restaurar no avisaba de volver a entrar → **0.53.4**
9. 20/10/2026 01:45 · Corregido: no se podía borrar la última comida del plan
10. 20/10/2026 01:45 · Mejora: las medidas del alta son el punto de partida (flechas y evolución desde el primer seguimiento) → **sube a la 0.54**

### Hacia la 0.53
1. 20/10/2026 01:00 · Pasos medios semanales: deslizador en el seguimiento, puntuación 1–10 (menos de 2.000 = 1 · 10.000 o más = 10) que cuenta en la global (5 puntos; entreno pasa de 20 a 15), flechas por semana y gráfico con tendencia en la ficha
2. 20/10/2026 01:00 · Atrás del móvil por niveles: subpantalla → su pestaña principal (paso a paso) → inicio → «¿Salir de la app?» → **0.52.1**
3. 20/10/2026 01:45 · Corregido: el peso por serie no aceptaba la coma («22,5» se guardaba como 225)
4. 20/10/2026 01:45 · Corregido: el alta guardaba solo el peso; ahora también altura, cintura, cadera, bíceps y muslo → **0.52.2**
5. 20/10/2026 01:45 · Corregido: «Semana 1 de 12» no avanzaba; ahora se calcula con la fecha de alta y la duración elegida (4, 8, 12, 16, 24 semanas o 1 año)
6. 20/10/2026 01:45 · Corregido: el objetivo del cliente no se podía cambiar después del alta → **0.52.3**
7. 20/10/2026 01:45 · Corregido: el cliente veía textos para el profesional («…de este cliente») en Nutrición y Entrenamiento
8. 20/10/2026 01:45 · Corregido: el objetivo diario era el mismo para todos y el cliente veía 2.000 kcal sin que Fátima lo fijara; ahora cada cliente tiene el suyo → **0.52.4**
9. 20/10/2026 01:45 · Corregido: los días de Nutrición marcaban el miércoles y no hacían nada
10. 20/10/2026 01:45 · Corregido: la tira de la semana marcaba las sesiones en el lunes en vez del día real → **sube a la 0.53**

## Versión 0.51 → 0.51.4

### Hacia la 0.52
1. 20/10/2026 00:20 · Botón atrás del móvil: al entrar desde las notificaciones (o al pulsar atrás varias veces seguidas) ya no saca de la app; las marcas de historial se ponen siempre con un toque
2. 20/10/2026 00:30 · Gestión del cliente: los globos solo cuentan lo pendiente (seguimientos sin revisar y mensajes sin leer) y desaparecen al abrirlos; también se marcan como leídos sus avisos → **0.51.1**
3. 20/10/2026 00:30 · Sensaciones del día: el cliente cuenta cómo le ha ido en Entrenamiento y en Nutrición (ánimo + comentario); le llega al profesional de cada área y se ve en la tarjeta del panel y en la ficha
4. 20/10/2026 00:30 · Consentimiento de uso de imagen para redes (fotos sin cara, reconocible, nombre o testimonio), cambiable en Ajustes y visible en la ficha; añadido a la política de privacidad → **0.51.2**
5. 20/10/2026 00:35 · Botón atrás del móvil: siempre a la pantalla principal (cliente «Hoy», profesional panel de Clientes); en la principal muestra «¿Salir de la app?» y el siguiente atrás sale (la sesión sigue abierta)
6. 20/10/2026 00:35 · Logo nuevo (pesa rusa con pizza y «FSD») en la pantalla de inicio → **0.51.3**
7. 20/10/2026 00:35 · Corregido: la ficha mostraba «—» en las adherencias aunque hubiera seguimiento
8. 20/10/2026 00:40 · Alergias e intolerancias: lista para marcar (14 alérgenos UE, otras frecuentes en España, intolerancias) con diagnosticada o sospecha y nota libre; Fátima recibe aviso, lo ve en la ficha y fijo arriba del plan nutricional → **0.51.4**
9. 20/10/2026 00:45 · Pestaña Clientes: colores de valoración (deficiente → excelente) en Entreno y Nutrición, como en Seguimientos; Mensajes en rojo solo si hay sin leer
10. 20/10/2026 00:55 · Pestaña «Chats» del profesional: los que esperan tu respuesta arriba (el que más tiempo lleva primero), aviso rojo a partir de 48 h, cada profesional por separado; botón «Chat» arriba en la ficha del cliente → **sube a la 0.52**

## Versión 0.50 → 0.50.4

### Hacia la 0.51
1. 19/10/2026 23:50 · Tarjetas de Clientes: puntuación global (evolución 30 · entreno 20 · nutrición 20 · constancia 20 · motivación 5 · estrés 5) con tendencia, adherencias y mensajes pendientes
2. 19/10/2026 23:52 · Cliente en «Hoy»: el atrás del móvil pregunta «¿Salir a la pantalla de acceso?» en vez de salir de la app
3. 19/10/2026 23:58 · Pestaña Seguimientos con el formato y colores del detalle; pendientes y peor puntuación arriba
4. 20/10/2026 00:10 · Seguimiento del cliente: lo del seguimiento anterior aparece difuminado de fondo (textos, medidas, escalas y deslizadores); el formulario se vacía al enviarlo → **0.50.2**
5. 20/10/2026 00:10 · Barra del chat como WhatsApp: 📎, emoji, «Escribe un mensaje» y micrófono dentro de una sola barra; al escribir, el micrófono pasa a «Enviar»
6. 20/10/2026 00:10 · Notas de voz: mantener pulsado graba y al soltar se envía; deslizar arriba la bloquea (papelera y «Enviar»); deslizar a la izquierda la borra → **0.50.3**
7. 20/10/2026 00:20 · Corregido: «Obstáculos» del seguimiento guardaba lo escrito en «Descanso»
8. 20/10/2026 00:20 · Corregido: la motivación venía marcada en 1; ahora hay que elegirla antes de enviar → **0.50.4**
9. 20/10/2026 00:20 · Notas de voz: las ondas siguen la reproducción, tocar o arrastrar para saltar (muestra el tiempo) y velocidad x1 · x1,2 · x1,5 · x2
10. 20/10/2026 00:20 · Notas de voz: formato según el móvil (Android webm, iPhone mp4) y aviso claro si no se puede reproducir → **sube a la 0.51**

## Versión 0.49 → 0.49.4

### Hacia la 0.50
1. 19/10/2026 23:35 · Capa de la campana y selectores sin las esquinas del antiguo marco
2. 19/10/2026 23:35 · «Mensajes sin leer» real en el panel y en cada tarjeta de cliente (por profesional)
3. 19/10/2026 23:35 · Logo pequeño visible en iPhone SE y pantallas bajas
4. 19/10/2026 23:35 · Iconos siempre dentro de los botones de acceso de profesionales
5. 19/10/2026 23:35 · Gramos de todas las opciones de comida y resumen rápido de cantidades en Nutrición
6. 19/10/2026 23:45 · Aviso «¿Salir a la pantalla de acceso?» también para el cliente
7. 19/10/2026 23:45 · Espacio del profesional con barra inferior: Clientes · Seguimientos · Ajustes
8. 19/10/2026 23:45 · Pestaña Seguimientos: resumen por cliente (pendientes primero, datos con flechas, obstáculos)
9. 19/10/2026 23:45 · Pestaña Ajustes del profesional; fuera el botón y la fila duplicados del panel
10. 19/10/2026 23:40 · Corregido: el formulario de alta conservaba los datos del cliente anterior → **sube a la 0.50**

## Versión 0.48 → 0.48.4

### Hacia la 0.49
1. 19/10/2026 22:56 · Pantalla de acceso: logo, tarjeta y accesos agrupados y centrados
2. 19/10/2026 23:05 · Aviso antes de salir a la pantalla de acceso (Domingo y Fátima); botón atrás verificado en el espacio de Fátima
3. 19/10/2026 23:08 · Actualizaciones al momento: la app siempre comprueba con GitHub si hay archivos nuevos
4. 19/10/2026 23:12 · Los avisos flotantes desaparecen al cambiar de pantalla
5. 19/10/2026 23:20 · Centro de notificaciones (campana) para cliente y profesionales: no leídas, marcar leídas, ir al sitio
6. 19/10/2026 23:20 · Tipos de aviso: mensajes, plan actualizado, recordatorio y revisión de seguimiento, seguimientos recibidos, altas y pendientes
7. 19/10/2026 23:20 · Ajustes → Notificaciones: un interruptor por tipo (sustituye a los dos que no funcionaban)
8. 19/10/2026 23:20 · Avisos del móvil opcionales (con permiso); tocar el aviso abre la app
9. 19/10/2026 23:28 · Chat estilo grupos: foto (o inicial) y nombre de quien escribe; lo propio a la derecha
10. 19/10/2026 23:28 · Cabecera del chat del profesional con la foto del cliente → **sube a la 0.49**

## Versión 0.47

- Código de acceso del cliente visible en su ficha para los profesionales (mostrar, copiar y enviar)
- Quitada una nota antigua e incorrecta de la ficha del cliente

### Hacia la 0.48
1. 19/10/2026 22:30 · Foto de perfil para clientes y profesionales (chat, Hoy, perfil, panel)
2. 19/10/2026 22:30 · Quitada la entrada «¿Eres coach? Entrar al panel»; solo accesos directos
3. 19/10/2026 22:30 · Corregido: los mensajes del profesional al cliente se perdían al salir de su vista
4. 19/10/2026 22:40 · Notas de voz compatibles con iPhone y Android, guardadas de verdad (máx. 60 s)
5. 19/10/2026 22:40 · Fotos del chat reducidas y guardadas al enviarlas; aviso si la memoria se llena
6. 19/10/2026 22:40 · Teclado y alturas de pantalla en iPhone; alternativas para iOS antiguos
7. 19/10/2026 22:40 · Ayuda para instalar la app (Android e iPhone) y entrada compacta en móviles pequeños
8. 19/10/2026 22:45 · Políticas de privacidad y cookies completas con los datos del titular; consentimiento opcional para boletín y ofertas
9. 19/10/2026 22:45 · Corregido el desplazamiento vertical en las pantallas de los profesionales (panel, alta, ficha, ajustes)
10. 19/10/2026 22:50 · Botón atrás fiable en Chrome Android: desde el panel lleva a la pantalla de acceso → **sube a la 0.48**
