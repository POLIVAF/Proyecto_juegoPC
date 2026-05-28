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
