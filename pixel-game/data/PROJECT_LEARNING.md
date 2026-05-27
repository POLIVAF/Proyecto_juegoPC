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
