# Historial de Aprendizaje Técnico Permanentemente Evolutivo

Este archivo sirve como memoria técnica, guía de arquitectura y registro de prevención de regresiones del RPG en Canvas/Phaser (Isekai Tower). **Debe ser actualizado ante cada corrección importante o cambio estructural.**

---

## 📋 Reglas Permanentes del Proyecto

Para mantener el gameplay limpio, justo y libre de fugas de memoria, se establecen las siguientes reglas de oro:

1. **Nunca usar daño continuo por frame**: Los ataques físicos de contacto (tanto de enemigos como de jefes) deben estar regulados por un cooldown discreto (ej: `attackCooldown` de 60 frames / 1 segundo). No se permite restar vida en cada tick o frame sin cooldown visual/audible.
2. **Nunca dejar listeners sin destruir**: Al cerrar modales o cambiar de escena, todos los event listeners, punteros, o referencias de drag-and-drop dinámicos vinculados a elementos HTML del DOM deben limpiarse o anularse explícitamente para evitar fugas de memoria.
3. **Nunca permitir stacking de mobs**: Los enemigos no deben poder superponerse exactamente en la misma posición (coordenadas X, Y idénticas). Siempre se debe aplicar un algoritmo de separación física que los mantenga adyacentes y permita al jugador empujarlos.
4. **Toda UI temporal debe destruirse al cerrar ventanas**: Elementos visuales flotantes externos al lienzo (como tooltips `#item-tooltip` o pantallas de tienda) deben ser destruidos o puestos en estado `hidden` de forma inmediata cuando el usuario cierra su contenedor padre, muere (`gameOver`), o transiciona el estado del juego (`setGameState`).
5. **No hardcodear rutas de assets**: Utilizar rutas relativas consistentes y coherentes con la estructura del proyecto (ej: `./assets/...` en lugar de rutas absolutas locales).
6. **Mantener compatibilidad con Netlify / PWA**: Asegurarse de que el Service Worker (`sw.js`) y `manifest.json` incluyan y apunten correctamente al archivo `index.html` (el juego principal de Canvas 2D) y que no se rompan las dependencias estáticas en el despliegue de Netlify.
7. **Consumir el Registro de Clases**: Nunca codificar estadísticas de personajes de forma directa en condicionales (`if (charClass === 'warrior')`). Toda propiedad de clase (vida, mana, velocidad, avatares, equipamiento inicial, etc.) debe consultarse dinámicamente de `Player.CLASSES`.
8. **Recogida Manual de Suelo**: No permitir recoger objetos del suelo de forma automática por proximidad física (excepto cuando se realiza un click/touch intencionado). El click/touch en un objeto debe cancelar cualquier ataque físico para evitar swings o uso de maná accidental.
9. **Doble Mecánica en Inventario**: Todo slot debe admitir interacción táctil (primer toque selecciona y abre barra de acciones inferiores, segundo toque equipa/usa) y ratón/teclado de escritorio (Shift+Click para soltar al suelo, Ctrl+Click para eliminar permanentemente, drag-and-drop a sus zonas respectivas).

---

## 🛠️ Historial de Aprendizaje y Correcciones

### 1. Fuga Visual del Tooltip del Inventario
- **Problema**: El tooltip flotante con estadísticas de objetos (`#item-tooltip`) se quedaba flotando y pegado en pantalla tras cerrar la mochila, al transicionar de estados o al morir.
- **Causa**: El manejador de cierre del inventario y las transiciones del estado del juego solo ponían la clase `.hidden` al modal, pero no llamaban a `hideTooltip()`, dejando el elemento absoluto del tooltip intacto.
- **Solución**: Se creó la función unificada `closeInventory()` que oculta el modal, destruye la ranura de backpack del DOM, limpia todos los controladores mouse/touch de las ranuras de equipo para liberar referencias, y llama a `hideTooltip()`.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Toggles directos de clase `.hidden` a modales de inventario sin implementar un cleanup de tooltips o eventos asociados.
- **Mejora futura recomendada**: Implementar un administrador de modales centralizado para que cualquier cierre dispare una función hook de limpieza de manera nativa.

### 2. Creación de Personaje Acoplada y Género Obsoleto
- **Problema**: Lógica rígida para Warrior/Mage basada en condicionales `if/else` y presencia de selectores de género redundantes.
- **Causa**: Código heredado que realizaba validaciones y asignaciones directas de vida, daño y armas iniciales basadas únicamente en strings rígidos.
- **Solución**: Se eliminó la selección de género en `index.html` y se creó un registro de configuración estático extensible en `Player.CLASSES` (dentro de `player_canvas.js`). Ahora el juego inicializa stats, starter weapons y emojis de avatar consultando dicho diccionario dinámicamente.
- **Archivos Afectados**:
  - [index.html](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/index.html)
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Escribir lógica de clases o de progresión de estadísticas de forma fija en constructores de entidades o controladores de eventos.

### 3. Daño por Frame Continuo en Jefes
- **Problema**: Al colisionar con un Boss, la vida del jugador disminuía exponencialmente por frame sin feedback visual claro, causando stunlocks y muertes inmediatas.
- **Causa**: Se implementó una lógica de daño continuo en la colisión de jefes multiplicada por delta de tiempo, en lugar de usar un sistema de cooldown de golpes directos como en los slimes normales.
- **Solución**: Se integró el decremento de `attackCooldown` a la actualización base de `Boss.js` y se unificó la lógica de colisión de contacto en `game.js` para que todos los enemigos (jefes y slimes) utilicen el filtro de `attackCooldown <= 0`, aplicando un cooldown de ataque de 60 frames tras cada golpe.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/boss.js)
- **Qué NO volver a hacer**: Aplicar daños continuos sin cooldowns en entidades de combate físico directo.

### 4. Apilamiento de Slimes (Stacking) y Bloqueos en Muros
- **Problema**: Los enemigos se apilaban en un solo punto, creando un efecto visual confuso y bloqueando al jugador permanentemente contra las esquinas o paredes.
- **Causa**: Falta de resolución física y fuerzas de separación entre las hitboxes de las entidades.
- **Solución**: Se implementó un paso de física al final de la actualización en `game.js` que realiza cálculos vectoriales de distancia y empuja a los enemigos entre sí y con respecto al jugador, validando siempre que no atraviesen paredes mediante `!dungeon.isWallRect`.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Ignorar las fuerzas de separación física entre mobs cuando se actualizan sus posiciones por perseguir el jugador.

### 5. Balance de Velocidad del Jugador
- **Problema**: El jugador podía huir de cualquier mob infinitamente porque su velocidad base era exageradamente alta en comparación a los slimes base.
- **Causa**: Velocidades de Guerrero (3.0) y Mago (4.0) muy superiores a las velocidades base promedio de los slimes (1.5 - 2.5).
- **Solución**: Se reajustaron las velocidades iniciales a `2.0` (Guerrero) y `2.2` (Mago). Se implementó un sistema de velocidad dinámica en `recalculateStats()` que suma el atributo `"velocidad"` generado de manera procedimental en el equipamiento, accesorios y efectos activos (ej: aura de furia).
- **Archivos Afectados**:
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
  - [stats.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/stats.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)

### 6. Sistema de Salas Seguras (Safe Rooms) y NPCs Reutilizables
- **Problema**: El sistema antiguo del comerciante aleatorio aparecía en pisos normales de forma procedural, rompiendo la inmersión de combate del juego, y la falta de un sistema robusto de NPCs dificultaba expansiones futuras.
- **Causa**: El comerciante aleatorio estaba acoplado a la generación procedural de mazmorras e interactuaba únicamente mediante proximidad de forma básica.
- **Solución**:
  - Se eliminó la sala y la generación procedural del comerciante aleatorio.
  - Se implementó un sistema de Safe Rooms no procedurales (pisos `"5.1"`, `"10.1"`, `"15.1"`) con suelo de madera, mesas decorativas sólidas (bloquean el paso mediante el tile tipo `2`) y una iluminación ambiental cálida mediante un gradiente radial dorado.
  - Se creó un arreglo global `safeRoomNPCs = []` para albergar NPCs con una estructura reutilizable (`id`, `name`, `x`, `y`, `width`, `height`, `sprite`, `dialog`, `interactable`, etc.).
  - Se agregaron 3 NPCs iniciales con diálogos personalizados: Comerciante (🧙‍♂️) —abre la tienda—, Herrero (⚒️) y Joyero (💎).
  - Se deshabilitaron los ataques del jugador, los enemigos y los botines en las Safe Rooms.
  - Se reestructuró la progresión de los pisos y las escaleras de bajada para permitir una transición limpia y bidirecional entre los pisos de jefe, las salas seguras y los siguientes niveles normales.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [dungeon.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/dungeon.js)
  - [economy.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/economy.js)
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
- **Qué NO volver a hacer**: Spawnear NPCs especiales interactivos mediante lógicas procedurales acopladas a la generación de monstruos o mapas normales sin una estructura y ciclo de vida de carga/limpieza claros.

### 7. Sistema de Botines de Materiales de Crafting y Probabilidades de Armas
- **Problema**: Los enemigos normales no tenían probabilidad de soltar materiales de crafting y las tasas de obtención de armas no contaban con la precisión requerida para rarezas altas.
- **Causa**: Falta de integración de un sistema de materiales y de una lógica probabilística precisa para equipamiento en el sistema de botines (`drops.js`).
- **Solución**:
  - Se definieron los 5 materiales de crafting: Molibdeno (⚙️), Níquel (🔗), Hematita (🪨), Carbón (🌑) y Carbono (💎).
  - Se restringió la aparición de Carbono únicamente entre los pisos 6 y 20, mientras que el resto puede aparecer desde el piso 1.
  - Se implementó un contador global de enemigos normales derrotados (`killedEnemiesCount`) guardado en la sesión de juego. Cada 5 muertes se realiza un roll con probabilidad del `0.15%` para drop de material.
  - Se configuraron probabilidades de obtención de armas específicas y precisas: Normal (5%), Raro (1%), Épico (0.001%) y Legendario (0.000001%).
  - Se actualizó el motor de renderizado del Canvas en `game.js` para mostrar el icono/emoji de cualquier botín que cuente con propiedad `it.icon` en el suelo.
  - Se añadieron las validaciones en `useItem` para evitar la consumición de materiales de crafting, mostrando un mensaje flotante y bloqueando su uso.
- **Archivos Afectados**:
  - [drops.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/drops.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Consumir o descartar elementos que sirvan para crafting y progresión, o realizar rolls de probabilidad acumulados de manera inexacta.

### 8. Sistema de Inventario de Materiales Apilables con Categorías
- **Problema**: Al mezclarse con el equipamiento y las pociones, los materiales ocupaban ranuras valiosas de la mochila limitada de 15 slots, y no había forma de apilarlos.
- **Causa**: Limitación del inventario base, el cual trataba cada objeto como una ranura independiente sin lógica de agregación ni división de categorías.
- **Solución**:
  - Se añadió una estructura de pestañas al modal del inventario en `index.html` ("Objetos" y "Materiales") estilizada estéticamente con el tema púrpura del juego.
  - Se introdujo el almacenamiento `player.materials = {}` para acumular cantidades de materiales crafteables sin impactar el límite de 15 ranuras del inventario regular.
  - Se interceptó el ciclo de recolección en `game.js` para que cualquier item tipo `material_*` incremente su contador y se guarde de forma apilable.
  - Se desarrolló `updateMaterialsUI()` para renderizar dinámicamente una bóveda con los 5 materiales disponibles, mostrando un badge de cantidad (`xCount`) y atenuando (`opacity: 0.35`) los que están en 0.
  - Se añadieron manejadores mouse y touch para tooltips de materiales que exponen su nombre, descripción, icono y cantidad acumulada.
  - Se conectó la carga/guardado de `materials` a la serialización del juego en LocalStorage y al reinicio por muerte del jugador.
- **Archivos Afectados**:
  - [index.html](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/index.html)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
- **Qué NO volver a hacer**: Mezclar materiales de progresión ilimitados con límites de mochila de equipo táctico sin proveer vistas o acumuladores independientes.

### 9. Reajuste de Jefes (HP, Armadura, Barras HUD y Habilidades AI Avanzadas)
- **Problema**: Los jefes de los pisos 5, 10 y 15 carecían de progresión de vida realista, visualización dinámica de la vida perdida (barras animadas), resistencia a daños físicos, y mecánicas de combate desafiantes.
- **Causa**: Stats bajos y acoplados, dibujo simple de barra sobre la cabeza y carencia de fases en IA.
- **Solución**:
  - Se redefinió la progresión de HP con la fórmula exponencial $HP = 10^{(floor/5) + 3}$ (piso 5: 10k, piso 10: 100k, piso 15: 1M).
  - Se añadieron mitigaciones de daño (armadura): Piso 5 (20%), Piso 10 (50%) y Piso 15 (70%).
  - Se creó un sistema de salud visual trailing (barra blanca lenta) que drena gradualmente hacia el HP real.
  - Para pisos 10 y 15 se diseñó una visualización de **10 barras de vida de colores apilables** con multiplicador visual (`x10`).
  - Habilidades AI añadidas:
    - *Guardián (Piso 5)*: Modo Furia al <35% HP (+40% velocidad, doble ratio de ataque, mayor rango de slam, y shockwaves sísmicas periódicas).
    - *General (Piso 10)*: Energy Nova al vaciar barras, Vortex Pull a distancias largas y Escudo Arcano de 4s (90% armadura) con invocación de 4 portales.
    - *Archimago (Piso 15)*: Spiral mejorado, Teletransporte al recibir impacto (12%), invocador de Sombras y conjuro final Cataclismo (obliga a buscar zonas seguras).
- **Archivos Afectados**:
  - [boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/boss.js)
  - [Floor10Boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/Floor10Boss.js)
  - [Floor15Boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/Floor15Boss.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Operar daños directos sobre HP de jefes sin pasar por un canal regulado de armadura o getters/setters, ni omitir animaciones de drenado de daño visual en elementos clave del juego.

### 10. Eliminación Completa de la Selección de Género
- **Problema**: Presencia de parámetros, variables y propiedades redundantes relacionadas con el género (`gender`) del jugador en constructores, almacenamiento persistente y firmas de funciones, a pesar de haberse retirado visualmente de la pantalla inicial.
- **Causa**: Código heredado de la primera fase que requería arrastrar el género a través del flujo de inicialización del nivel, inicio de partida y serialización de localStorage.
- **Solución**: Se eliminó el argumento `gender` de la firma y llamadas de `startGame()`, `initLevel()`, del constructor de `Player` en `player_canvas.js`, de la propiedad `this.gender`, y de la persistencia de datos en `saveGame()`, garantizando la retrocompatibilidad al ignorar el campo al cargar partidas antiguas.
- **Archivos Afectados**:
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Declarar variables, parámetros o persistir datos sobre características visuales o de rol obsoletas que ya no formen parte del juego base.

### 11. Compatibilidad Multiplataforma Mobile y Corrección de Entrada Táctil
- **Problema**: Varios problemas de interacción táctil y diseño visual impedían una experiencia fluida en iOS y Android:
  1. Al hacer clic o tocar en el fondo oscuro de los modales (Mochila y Tienda), el evento traspasaba el contenedor y hacía que el jugador se moviese o atacase en segundo plano.
  2. Los modales se cortaban verticalmente en pantallas de baja altura (típicas en orientación horizontal móvil) y no permitían scroll.
  3. Los navegadores móviles sufrían retrasos de toque de 300ms y zooms accidentales debido a la falta de optimización de gestos en botones y slots.
  4. Los cambios rápidos de orientación en Safari/iOS no actualizaban el lienzo del juego con los valores de ancho/alto correctos debido a un desfase de sincronía.
  5. El botón flotante de "Personaje" (para alternar el HUD) se ubicaba en el centro-izquierdo de la pantalla, interfiriendo físicamente con la zona del joystick virtual móvil.
- **Causa**: Configuración de `pointer-events` heredada de contenedores padres, uso de unidades fijas `vh` en lugar de `dvh` para viewports móviles, ausencia de directivas `touch-action` específicas y mala colocación espacial del HUD toggle.
- **Solución**:
  - Se añadió `pointer-events: auto;` a `#inventory-modal` y `#shop-modal` para interceptar toda entrada y evitar que se filtre al canvas de juego.
  - Se optimizó `.inventory-content` con `max-height: 95dvh; overflow-y: auto;` y se actualizaron las propiedades del comerciante con `dvh` dinámicos.
  - Se inyectó `touch-action: manipulation;` a todos los botones, ranuras del inventario (`.inv-slot`) y de habilidades (`.power-slot`) para eliminar el lag táctil y zooms rápidos del navegador.
  - Se vinculó el evento `"orientationchange"` con un retardo de `200ms` a la función `resize()` para estabilizar la rotación en Safari.
  - Se eliminó el botón virtual muerto `btn-p4` de los controles móviles y se reubicó `.char-toggle-btn` en la esquina superior izquierda (`top: 15px; left: 15px;` en desktop, `top: 6px; left: 6px;` en móvil), ocultándolo dinámicamente si el HUD está a la vista para limpiar la interfaz del joystick.
- **Archivos Afectados**:
  - [index.html](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/index.html)
  - [style.css](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/style.css)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Diseñar modales de pantalla completa sin bloquear explícitamente eventos de puntero (`pointer-events`), ignorar la relación de aspecto del landscape móvil al dimensionar contenedores de UI, o descuidar la proximidad física del joystick táctil al situar botones interactivos flotantes.

### 12. Recogida Manual de Objetos y Prevención de Ataques
- **Problema**: Recogida de objetos automática al pasar caminando por encima quitaba el control táctico del jugador, y clics accidentales de recogida provocaban ataques físicos/hechizos no deseados.
- **Causa**: Colisiones por proximidad física calculadas en cada tick dentro del bucle principal de actualización. Clics en items no interceptados en los controladores globales del canvas de Phaser/Canvas2D.
- **Solución**: Se eliminó la verificación de proximidad automática en `update()`. Se creó `checkItemClick()` y `pickupItemDirectly()` para permitir la recogida por click/toque dentro de un rango de 70px, mostrando "¡Muy lejos!" si es superior, y cancelando el ataque al interceptar el input.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Ejecutar recolecciones de recursos sin validación expresa de acción o permitir que clics/toques de recolección en items se propaguen como ataques físicos.

### 13. Sistema de Descarte e Interfaz Móvil Unificada
- **Problema**: Dispositivos móviles no soportan arrastrar-y-soltar ni Shift+Clic/Ctrl+Clic para descartar u soltar items. Los descartes temporales podían reaparecer en el suelo.
- **Causa**: Interfaz de mochila acoplada a gestos de ratón de escritorio y atajos de teclado sin vistas táctiles equivalentes.
- **Solución**: Se dividió la zona inferior en dos áreas visuales (`#inv-drop-zone` y `#inv-delete-zone`). Se implementó una barra de acciones de objeto (`#inv-actions-bar`) que aparece al tocar un objeto, permitiendo usar/equipar, soltar o eliminar permanentemente el objeto seleccionado en pantallas táctiles.
- **Archivos Afectados**:
  - [index.html](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/index.html)
  - [style.css](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/style.css)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Depender únicamente de gestos drag-and-drop o combinaciones de teclas para mecánicas críticas de inventario en juegos híbridos móvil/web.

### 14. Control Temporizado de Tooltips y Limpieza de DOM
- **Problema**: Caja de información del objeto (`#item-tooltip`) quedaba stuck en pantalla al cerrarse el inventario, al usar/equipar un objeto, al morir o al cambiar de piso.
- **Causa**: Pérdida de referencias en listeners `mouseleave` debido a la destrucción del slot del DOM que las contenía al actualizar el inventario.
- **Solución**: Se inyectó un temporizador de auto-ocultación de 3 segundos (`tooltipTimeout = setTimeout`) en `showTooltip()`. Se incluyeron llamadas explícitas a `hideTooltip()` al regenerar slots, en `closeInventory()`, al cambiar de piso (`initLevel()`) y al morir el jugador (`gameOver()`).
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
- **Qué NO volver a hacer**: Dejar tooltips absolutos sin manejadores de tiempo autónomos o no forzar su limpieza inmediata ante redibujos de componentes dinámicos.

### 15. Colisiones Físicas Reales, Separación de Entidades y Y-Sorting (Depth Sorting)
- **Problema**: Los enemigos y el jugador se atravesaban mutuamente, quedaban apilados debajo de los avatares, y visualmente no existía un orden tridimensional correcto (Y-sorting), lo que rompía la inmersión al poder caminar a través de NPCs, cofres dorados u otros monstruos.
- **Causa**: Las colisiones se validaban de forma individual únicamente contra paredes usando `dungeon.isWallRect`. No existía una capa de sólidos generalizada, y el dibujado de entidades se hacía en bucles fijos secuenciales independientes de la posición vertical.
- **Solución**:
  - Se implementó `window.isSolidAt(x, y, w, h, ignoreEntity)` que unifica las colisiones de muros, NPCs de safe room, merchants, cofres dorados, y el jugador/enemigos según corresponda.
  - Se sustituyeron todas las llamadas a `dungeon.isWallRect` en el movimiento del jugador, slimes, y los diferentes jefes/minions por la comprobación unificada.
  - Se reestructuró la función `draw()` en `game.js` para recolectar todas las entidades con volumen visual (jugador, enemigos, NPCs, cofres de oro), ordenarlas ascendentemente por su posición Y, y renderizarlas secuencialmente.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [player_canvas.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/player_canvas.js)
  - [enemy.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/enemy.js)
  - [boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/boss.js)
  - [Floor15Boss.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/entities/Floor15Boss.js)
- **Qué NO volver a hacer**: Realizar comprobaciones directas contra `isWallRect` para el movimiento de entidades físicas o dibujar personajes/objetos sólidos en capas fijas desvinculadas de su coordenada Y.

### 16. Interacciones por Toque Directo y Eliminación del Botón Flotante de Diálogo
- **Problema**: El botón flotante de diálogo (`#btn-interact`) para dispositivos móviles se superponía con los cofres, escaleras de subida/bajada y el botón de ataque, causando clics accidentales y ensuciando la interfaz táctil.
- **Causa**: Modelo antiguo de interacción que dependía de una tecla o de un botón flotante móvil único en pantalla para disparar la acción del interactivo más cercano.
- **Solución**:
  - Se eliminó el botón flotante `#btn-interact` del DOM (`index.html`) y sus estilos asociados en `style.css`.
  - Se implementó `checkInteractableClick(clientX, clientY)` en `game.js`, el cual evalúa si un toque o clic del jugador se realiza sobre el objeto interactivo de rango (cofre, puerta, escalera, comerciante) dentro de un radio de 40px, o sobre la caja del prompt flotante de interacción dibujada arriba del personaje.
  - Se integró la llamada en los manejadores globales `mousedown` y `touchstart` del canvas. Al pulsar sobre el interactivo o el prompt, se ejecuta la acción correspondiente (abrir cofre, cambiar piso, dialogar) y se detiene la propagación para evitar ataques accidentales o movimientos no deseados.
- **Archivos Afectados**:
  - [index.html](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/index.html)
  - [style.css](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/style.css)
- **Qué NO volver a hacer**: Utilizar botones flotantes de interacción específicos para móvil cuando se puede resolver mediante toques directos en el espacio del canvas sobre los objetos de juego o sobre sus prompts contextuales de interfaz.

### 17. Zonas de Respawn Seguro y Balance del Sistema de Drops de Mobs y Bosses
- **Problema**: El jugador reaparecía en áreas propensas a stunlocks/mobs y podía reencarnar encima de sólidos o enemigos. Adicionalmente, el balance de botines permitía que enemigos normales soltaran equipamiento de rareza Épica o Legendaria, y los jefes de piso no contaban con restricciones específicas ni adaptabilidad a nivel de jugador.
- **Causa**: `initLevel` colocaba al jugador en las escaleras sin validar que la celda de spawn estuviera libre de obstáculos, y la invulnerabilidad al spawnear era nula. Los drops de slimes comunes en `drops.js` y `rarities.js` incluían rolls para armas y armaduras legendarias/épicas. Los jefes de piso generaban drops aleatorios generales de 2 a 3 piezas sin limitación de ranuras ni escalado por nivel.
- **Solución**:
  - **Respawn Seguro**: Se integró una validación en `initLevel` para reubicar al jugador en la baldosa libre más cercana de la sala de inicio si el punto de entrada es sólido. Se configuró `player.immunityTimer = 180` (3 segundos de invulnerabilidad) en spawn/respawn.
  - **Distancia de Spawning de Enemigos**: Se aumentó la distancia mínima de generación entre mobs y jugador en `findSafeEnemySpawnPosition` de 3 a 6 celdas de mapa.
  - **Balance de Drops**: Se reconfiguró `rollRarity` en `rarities.js` y `rollMobDrop` en `drops.js` para excluir la rareza Épica (epic) y Legendaria (legendary) en enemigos comunes, limitando sus drops a Común, Raro y Poco Común (very_rare).
  - **Loot de Jefes**: Se reprogramó `rollBossDrop`. Los jefes normales (Piso 5) tienen un 15% de probabilidad total de soltar una única arma Épica o Legendaria adaptada al nivel del jugador (`player.level`). Los jefes de los pisos 10 y 15 tienen un 15% de probabilidad de soltar exactamente 1 pieza de joyería (anillo/colgante) o ropa (armadura) de rareza Épica o Legendaria, balanceada al nivel del jugador.
- **Archivos Afectados**:
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [loot.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/loot.js)
  - [rarities.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/rarities.js)
  - [drops.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/drops.js)
- **Qué NO volver a hacer**: Permitir que entidades comunes tengan acceso a rolls de tablas de botín de rareza superior (épicos/legendarios) o ignorar la validación física en los puntos iniciales de spawn y su respectivo retardo de invulnerabilidad.

### 18. Rareza Mítica e Integración de Rarity Glows y Multi-Navegador
- **Problema**: Necesidad de una nueva rareza premium (Mítica) superior a legendario, diferenciada con colores y efectos propios, junto con una revisión de compatibilidad multinavegador y optimización de inicialización de la interfaz.
- **Causa**: Limitación en los tiers de equipamiento y redundancias de llamadas en la carga del script de la interfaz (`setupInventoryTabs` / `setupInventoryActionButtons`).
- **Solución**:
  - Se registró la rareza `mythic` con el color naranja neón (`#ff5500`) y etiqueta `"Mítica"`.
  - Se configuró el multiplicador de daño a `3.5` (comparado con `2.7` de legendario) y se asignaron `6` estadísticas procedimentales.
  - Se agregaron prefijos míticos específicos para armas: `"Segadora del Inframundo"` (Guerrero) y `"Báculo de la Singularidad"` (Mago), así como sufijos míticos para accesorios.
  - Se implementó un resplandor de sombreado en canvas para botines tirados en el suelo míticos y legendarios, aumentando el grosor de línea a `3.5px` para míticos.
  - Se agregaron las clases CSS de resplandor `.rarity-mythic`, `.tooltip-rarity.rarity-mythic` y el resplandor de slot `.eq-slot.equipped.rarity-mythic` con un `box-shadow` naranja neón.
  - Se eliminaron las llamadas duplicadas de inicialización del inventario en la carga del script global para evitar dobles registros.
- **Archivos Afectados**:
  - [rarities.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/rarities.js)
  - [stats.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/stats.js)
  - [loot.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/loot.js)
  - [economy.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/economy.js)
  - [drops.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/systems/drops.js)
  - [game.js](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/js/game.js)
  - [style.css](file:///c:/Users/ARC/Downloads/freelance/proyecto%20de%20un%20juego%20en%20pc/pixel-game/style.css)
- **Qué NO volver a hacer**: Inicializar componentes DOM o listeners de eventos múltiples veces fuera de los eventos hook de carga estándar (`DOMContentLoaded`).

---

## 🏗️ Convenciones y Arquitectura

### Estructura de Directorios
El código del juego se organiza en directorios modulares claros:
- `pixel-game/assets/`: Contiene mapas, tilesets, efectos, sprites y elementos de UI.
- `pixel-game/js/`: Archivos lógicos y escenas.
  - `entities/`: Clases de entidades (Player, Enemy, Boss, Floor10Boss, Floor15Boss).
  - `systems/`: Sistemas del motor (generación procedimental de estadísticas, economía, botines/drops y configuración de mazmorras).
  - `scenes/`: Escenas de Phaser (usadas únicamente en el prototipo experimental `index_phaser.html`).
- `pixel-game/index.html`: Entrypoint del juego en Canvas 2D estable y principal.
- `pixel-game/index_phaser.html`: Entrypoint de desarrollo experimental del prototipo Phaser.
- `pixel-game/main.js` & `style.css`: Controladores centrales y hojas de estilos del prototipo.

### 📐 Nuevas Arquitecturas Registradas

#### 1. Arquitectura de Safe Rooms e Interacciones Bidireccionales
- **Pisos Especiales**: Los sub-pisos con formato decimal (ej: `5.1`, `10.1`, `15.1`) representan zonas de descanso no-procedurales (tabernas/zonas seguras).
- **Mapeo Estático y Colisiones**: El mapa se genera en base a un layout fijo con suelo de tablones de madera y mesas sólidas (tile tipo `2` que actúa como muro de colisión).
- **NPCs Reutilizables**: Se implementó el arreglo global `safeRoomNPCs` con objetos que encapsulan `id`, `name`, coordinates, sprites y sus respectivos flujos de diálogo y disparadores de UI (como abrir tienda).
- **Control de Progresión**: Se estableció un sistema de tránsito bidireccional en el que el jugador puede subir o bajar escaleras, manteniendo la consistencia de puertas de jefes derrotados y el correcto cargado del piso siguiente.

#### 2. Arquitectura de Drops Especiales y Materiales de Crafting
- **Mapeo de Probabilidades Preciso**: Los drops de enemigos se separan en flujos probabilísticos independientes (Monedas, Equipamiento, Consumibles y Materiales). Las armas utilizan límites probabilísticos acumulativos estrictos para evitar superposiciones de rarezas.
- **Materiales de Progresión**: Se definieron 5 materiales de crafteo con emojis y colores únicos. El material más raro (Carbono 💎) está restringido a partir del piso 6 para asegurar progresión vertical de nivel.
- **Roll por Cooldown de Kills**: Para evitar inflación en inventario, los materiales sólo se sortean en intervalos de cada 5 enemigos derrotados, usando un contador persistente (`killedEnemiesCount`) guardado en la sesión.
- **Renderizado Dinámico de Emojis**: La rutina de dibujo en `game.js` identifica la presencia de la propiedad `.icon` en cualquier tipo de botín en el suelo (no solo equipamiento) para dibujar su emoji en lugar de un círculo plano de color.
- **Bóveda y Apilamiento**: Los materiales interceptados en colisión se redirigen a `player.materials` en lugar de `player.inventory`. Se despliegan en una pestaña secundaria ("Materiales") en una cuadrícula dedicada que soporta tooltips e indica cantidades en formato `xCount` (estilizados mediante `.item-count`).
- **Bloqueo de Consumo**: La función `useItem()` intercepta materiales y detiene su consumo (`canUse = false`), redirigiendo la acción a un tooltip o texto flotante informativo.

#### 3. Arquitectura de HUD de Jefes y Combates Multicapa Dinámicos
- **Interceptación y Mitigación de Daño**: El HP de las entidades Boss se administra mediante propiedades getters/setters que aplican automáticamente la reducción por armadura antes de actualizar la salud real e inician un temporizador de flash blanco (`lastHitTimer = 10`).
- **Visualizador de Salud Trailing**: Se usa un acumulador `visualHp` que sigue al HP real restando una porción fraccional y constante de la diferencia, pintando una barra blanca/plateada en segundo plano que da feedback visual exacto del impacto.
- **Multicapa de Barras de Salud**: Para jefes avanzados, se mapea la proporción de salud restante a un conjunto de 10 colores premium (de violeta a crimson). Se dibuja en pantalla-espacio el color actual, revelando debajo el color del segmento anterior y mostrando el conteo dinámico (ej: "x7") en la esquina superior del lienzo.
- **Habilidades y Objetos Secundarios Autónomos**: Los portales, shockwaves de fuego y rayos del Archimago se gestionan mediante updates dinámicos que recalculan hitboxes y distancias con respecto al jugador, dibujando áreas de peligro y zonas seguras directamente integradas en el lienzo de juego.

#### 4. Arquitectura de Interacción y Viewports en Dispositivos Móviles (Landscape)
- **Bloqueo Táctil**: Modales absolutos deben contar con `pointer-events: auto` en sus contenedores principales para evitar fugas de eventos al canvas subyacente.
- **HUD Toggle Inteligente**: El botón flotante `.char-toggle-btn` (Personaje) solo debe actuar como un control de contingencia (se muestra cuando el HUD está colapsado y se oculta cuando se despliega), reduciendo la sobrecarga cognitiva y eliminando obstrucciones espaciales cerca de las áreas de control (joystick).
- **Dimensionamiento Elástico (dvh)**: Se prioriza el uso de la unidad de viewport dinámico (`dvh`) para contenedores modales, previniendo que los toolbars del navegador corten la visibilidad de los controles y permitiendo desbordes y scrolls verticales controlados (`overflow-y: auto`).

#### 5. Arquitectura de Colisiones Físicas Unificadas y Y-Sorting (Depth Sorting)
- **Renderizado Ordenado Dinámico (Y-Sorting)**: Los elementos planos del fondo (baldosas de suelo, pociones y monedas tiradas) se pintan primero. Luego, los avatares móviles (jugador, enemigos), los NPCs interactivos y los cofres de madera dorados se apilan en una lista única de renderizado que se ordena por su coordenada Y en cada frame. Esto garantiza que las entidades situadas abajo tapen a las de arriba, simulando una proyección tridimensional correcta.

#### 6. Arquitectura de Interacción por Toque Directo Multiplataforma
- **Detección Táctil de Rangos**: Cuando un objeto interactivo (cofre, puerta de jefe, escalera de subida/bajada, NPC o comerciante) entra en el rango de interacción del jugador, se establece la variable `currentInteractable`.
- **Toque en Objeto / Prompt**: En lugar de un botón en pantalla, el motor intercepta toques y clics en el canvas mediante `checkInteractableClick`. Si las coordenadas del clic están cerca de la posición del interactivo (rango de 40px) o sobre el avatar/prompt del jugador (rango de 60px alrededor del prompt flotante), se llama a `handleInteraction()`.
- **Prevención de Acción Secundaria**: El evento interceptado anula el ataque del jugador (`mouse.clicked = false`) y cancela la propagación del evento táctil (`e.preventDefault()`), garantizando una interacción limpia sin interrumpir el ritmo del combate ni gastar maná accidentalmente.

#### 7. Arquitectura de Respawn Protegido y Loot Tables Estrictas
- **Spawn Físico Validado**: El entrypoint `initLevel` calcula la baldosa de destino y valida mediante `isSolidAt` que no choca con ningún obstáculo (NPC, muro, etc.). En caso de colisión, un solucionador iterativo busca la primera baldosa transitable dentro de la sala de inicio.
- **Invulnerabilidad por Cooldown**: Tras el spawn, se inicializa `player.immunityTimer = 180`, inhibiendo daños de enemigos y la aplicación de estados alterados (veneno, aturdimiento) durante los primeros 3 segundos.
- **Loot Tables Segregadas**: Las tablas de botines de enemigos normales están tapadas en la rareza `very_rare` (Poco Común). Las rarezas `epic` y `legendary` se reservan en un 100% para drops de Bosses bajo un roll probabilístico unificado del 15%.
- **Generación de Equipo Adaptativa**: Los métodos de generación (`generateClassWeapon`, `generateRandomEquipment` y `generateRandomAccessory`) escalan sus bonos y sufijos consultando dinámicamente `player.level` en lugar del piso actual en los botines de jefes, garantizando equipo proporcional al progreso real del jugador.

#### 8. Arquitectura de Rareza Mítica y Efectos de Glow en Canvas/CSS
- **Tier Mítico Registrado**: Se incorpora el nuevo tier `"mythic"` de rareza superior con multiplicador de potencia base de `3.5` y soporte para `6` estadísticas procedimentales secundarias.
- **Resplandores del Sombreado en Canvas**: El trazado de botines en el suelo utiliza un contorno de trazo de color naranja brillante (`#ff5500`) con grosor aumentado a `3.5px` y un efecto de sombra difuminada en el lienzo para destacar visualmente en el piso.
- **Estilos Glow CSS**: Se implementa un resplandor dinámico en los slots del inventario y tooltips para items míticos usando reglas `box-shadow` y `text-shadow` de alta fidelidad.
- **Integración de Drop en Bosses**: Los bosses tienen un 15% de probabilidad total de soltar equipamiento; dentro de ese rol, existe una distribución del 5% Mítico, 20% Legendario y 75% Épico.

---

## 🗺️ Roadmap de Desarrollo / Próximos Pasos

### Fase 1: Sistema de Forja y Mejoras (Blacksmith Crafting)
* **Objetivo**: Habilitar al NPC Herrero (⚒️) en las Safe Rooms para interactuar y craftear/mejorar armas.
* **Estado**: Bóveda de materiales y apilado del inventario [COMPLETADO]. Pendiente implementar la interfaz de forjado que consume Molibdeno ⚙️, Níquel 🔗, Hematita 🪨 y Carbón 🌑 para subir el `weaponLevel` del arma principal.

### Fase 2: Fusión de Joyería (Jeweler Fusion)
* **Objetivo**: Habilitar al NPC Joyero (💎) para fusionar accesorios y engastar gemas.
* **Mecánica**: Permitir combinar dos anillos o colgantes de la misma rareza y nivel junto con Carbono (💎) para forjar un accesorio de rareza superior con estadísticas mejoradas.

### Fase 3: Expansión de Niveles y Jefes Finales
* **Objetivo**: Extender el reto del juego hasta el piso 20 e incluir al Jefe Final.
* **Mecánica**: Diseñar el jefe del piso 20 con mecánicas avanzadas (esbirros, fases de inmunidad, proyectiles de rebote) y habilitar el drop de Planos Especiales para armas legendarias.

### Fase 4: Optimización PWA, Guardado en Nube y Sonido
* **Objetivo**: Mejorar la experiencia nativa de app móvil y offline.
* **Mecánica**: Optimizar el Service Worker (`sw.js`) para cachear dinámicamente assets gráficos, habilitar slots de guardado en la nube/Firebase opcionales, y añadir efectos de sonido de sintetizador retro usando `Web Audio API`.
* **Estado**: Escalado de viewports dinámicos, estabilidad ante rotación de pantalla, controles touch reubicados y prevención de zoom accidental [COMPLETADO].

### Fase 5: Estabilización de Colisiones Físicas, Renderizado Y-Sorted, Zonas de Respawn Seguro y Balance de Loot
* **Objetivo**: Garantizar colisiones reales con deslizamiento suave (sliding) entre el jugador, enemigos, NPCs y cofres, corregir solapamientos mediante profundidad visual (Y-sorted), limpiar la UI móvil reemplazando el botón flotante de diálogo por interacciones táctiles directas, asegurar zonas seguras de respawn libre de enemigos con protección de invulnerabilidad, y equilibrar de forma estricta las tablas de botín para enemigos comunes y bosses adaptadas al nivel de jugador.
* **Estado**: Implementación de `isSolidAt` y Y-Sorting [COMPLETADO], Toque directo en interactivos [COMPLETADO], Spawn seguro con invulnerabilidad de 3s [COMPLETADO], y Loot Tables equilibradas con progresión adaptativa al nivel de jugador [COMPLETADO].

### Fase 6: Implementación de Rareza Mítica, Compatibilidad Multi-Navegador y Optimización General
* **Objetivo**: Diseñar y registrar la rareza Mítica, habilitar efectos estéticos de resplandor (glow) en Canvas y CSS, balancear la tabla de drop de bosses (5% Mítico, 20% Legendario, 75% Épico), comprobar compatibilidad y escalado en Google Chrome, Mozilla Firefox, Microsoft Edge, Opera y Safari, y limpiar listeners/llamadas redundantes de inicialización de la interfaz.
* **Estado**: Registro de rareza mítica y stats de nivel 6 [COMPLETADO], Renderizado y bordes de resplandor en inventario y suelo [COMPLETADO], Balance de drops de bosses [COMPLETADO], y eliminación de duplicados en carga de scripts de la UI [COMPLETADO].

