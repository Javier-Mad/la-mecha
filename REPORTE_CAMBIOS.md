# Reporte de cambios - LaMecha

Fecha: 2026-05-25

Este archivo es la bitacora viva del proyecto. La idea es que cada ronda de cambios deje claro que se movio, por que se movio, como se puede probar, y que bugs siguen pendientes.

## Cambios aplicados

### 2026-05-26 - Revision de copy: roles mas guiados y manga/juguete de mano

Objetivo:

Revisar el mazo completo despues de la prueba real y corregir cartas que se sentian demasiado abstractas, especialmente `ROLES / Disfraz`, y cartas de `MASTURBADOR` que podian caer raras segun quien tuviera el control.

Hallazgos:

- Varias cartas de `ROLES` pedian "inventar personaje", "accesorio" o "escena" sin dar suficientes opciones. En juego real eso mete friccion porque no siempre hay una idea lista.
- Las cartas con `MASTURBADOR` asumian demasiado quien recibia el juguete. Eso era fragil porque el juego no modela anatomia ni compatibilidad por jugador.
- Habia algunas frases con `la/lo`, `ella/el`, `vestido/a`, etc. que se ven torpes en carta grande y rompen un poco el tono.

Cambios:

- **`cards.ts`**: reescritura dirigida de cartas de `ROLES` T2/T3 para que sean escenas guiadas con opciones concretas:
  - cita prohibida
  - vestidor
  - rol guiado
  - semaforo de prenda
  - desconocidos
  - masaje privado
  - modelo privado
  - evaluacion privada
  - espejo/control
- **`cards.ts`**: las 5 cartas de `MASTURBADOR` ahora usan "manga o juguete de mano" y quedan como dinamicas mutuas donde la pareja decide quien recibe.
- **`constants.ts`**: el label visible cambia de `Masturbador` a `Manga / juguete de mano`.
- **`deck.ts`**: la memoria semantica de juguetes ahora reconoce tambien "manga".
- **`cards.ts`**: limpieza de copy con slashes (`la/lo`, `ella/el`, `vestido/a`, `quieto/a`) y frases demasiado abiertas.

Pruebas realizadas:

- Auditoria de 210 cartas parseadas desde `cards.ts`.
- Validacion de roles: 12 cartas `ROLES` revisadas, todas con marco/escena concreta.
- Validacion de manga/juguete de mano: 5 cartas revisadas.
- Validacion de copy: sin slashes ni frases abiertas detectadas por la auditoria.
- `git diff --check`: correcto.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- Deploy Vercel prod: `dpl_VyYkG2NUiNsdkvJaQcLnCBPjK6WL`, alias `https://la-mecha-inky.vercel.app`.

Archivos tocados:

- `src/data/cards.ts`
- `src/lib/constants.ts`
- `src/lib/deck.ts`
- `REPORTE_CAMBIOS.md`

---

### 2026-05-26 - Ajuste T3: mas juguetes/rough y sorteo menos plano

Objetivo:

Corregir la sensacion de repeticion en T3 y hacer que las categorias opcionales fuertes (`JUGUETES`, `ROUGH`, `ROLES`) realmente aparezcan cuando el jugador las activo.

Hallazgos:

- T3 ya tenia mas cartas que antes, pero el sorteo seguia siendo plano: si `JUGUETES`/`ROUGH` pasaban filtros, competian casi igual que cualquier carta base.
- La memoria semantica de `JUGUETES` estaba demasiado amplia. Varias cartas terminaban compartiendo llaves genericas como juguete + zona intima, lo que podia bloquear demasiadas cartas de juguetes aunque usaran juguetes distintos.
- `JUGUETES` y `ROUGH` siguen siendo categorias opcionales de setup. Si no se activan, el juego correctamente no las mete al pool.

Cambios:

- **`cards.ts`**: el mazo sube de 192 a 210 cartas.
- **`cards.ts`**: T3 sube de 50 a 68 cartas de accion.
- **`cards.ts`**: T3 ahora tiene 25 cartas `JUGUETES`, 13 `ROUGH` y 8 `ROLES`.
- **`deck.ts`**: las llaves anti-repeticion de juguetes ahora distinguen por juguete requerido y zona, evitando que un juguete bloquee media categoria.
- **`engine.ts`**: el sorteo de T3 ahora da mas peso a `JUGUETES`, `ROUGH`, `ROLES`, `VENDADOS` y `TEASE` cuando esas cartas estan disponibles; si vienes de `EMPUJAR`, `JUGUETES` y `ROUGH` pesan todavia mas.

Pruebas realizadas:

- Conteo del mazo: 210 cartas totales.
- Conteo T3: 68 acciones + 15 BOOM = 83 cartas.
- Conteo T3 por categoria: `JUGUETES` 25, `ROUGH` 13, `ROLES` 8.
- Validacion de IDs duplicados: ninguno.
- Validacion de `JUGUETES` sin `toyRequired`: ninguno.
- `git diff --check`: correcto.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.
- Deploy Vercel prod: `dpl_AZLtudpUqUtkpZjhyfZo5aHKMRWm`, alias `https://la-mecha-inky.vercel.app`.

Archivos tocados:

- `src/data/cards.ts`
- `src/lib/deck.ts`
- `src/lib/engine.ts`
- `REPORTE_CAMBIOS.md`

---

### 2026-05-26 - Cambio de mecanica: empujes acumulados

Objetivo:

Hacer que `EMPUJAR` tenga peso real durante la partida. El riesgo ya no se limpia por completar una carta; se acumula hasta que explota o hasta cambiar de tier.

Decision de mecanica:

- `pushCount` representa deuda acumulada, no empujes de la carta actual.
- `HACERLA`, `BAIL`, `OFRECER aceptada` y `OFRECER rechazada sin consecuencia` conservan `pushCount`.
- `BOOM` resetea `pushCount` a 0.
- Cambio de tier, nueva partida y reset de sesion tambien limpian `pushCount`.
- La mecha visual ya no se reinicia al completar/ofrecer una carta; conserva el estado de riesgo acumulado.

Cambios:

- **`engine.ts`**: se quitaron los resets de `pushCount` en `applyDoIt`, `applyBail`, `applyOfferAccept` y `applyOfferReject` para cartas `PAREJA`/`MUTUO`.
- **`engine.ts`**: `fuseLength` y `remainingFuse` se conservan al completar o delegar una carta; se regeneran solo con BOOM, tier nuevo o nueva sesion.
- **`PushCounter.tsx`**: accesibilidad actualizada de "empujes consecutivos" a "empujes acumulados".

Pruebas realizadas:

- Flujo `PUSH -> HACERLA -> PUSH -> HACERLA -> PUSH`: el tercer push acumulado activa BOOM.
- `BAIL`, `OFRECER aceptada` y `OFRECER rechazada` conservan el contador acumulado.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.

Archivos tocados:

- `src/lib/engine.ts`
- `src/components/PushCounter.tsx`
- `REPORTE_CAMBIOS.md`

---

### 2026-05-26 - Fix: clothing tracker por capas reales

Objetivo:

Hacer que el medidor de ropa se comporte mas parecido a una partida real, incluyendo dias con mas capas, y evitar que cartas de ropa interior o desnudez salgan demasiado pronto o desaparezcan antes de tiempo.

Hallazgos:

- El estado anterior era solo `clothed -> semi -> naked`, asi que dos cartas de quitar ropa podian marcar a alguien como desnudo aunque en la practica todavia tuviera varias prendas.
- Varias cartas que no quitaban ropa, pero asumian ropa interior o desnudez, no tenian un requisito de ropa. Eso podia hacer que salieran en un momento incorrecto o que el avance del tracker bloqueara cartas buenas.

Cambios:

- **`types.ts` / `engine.ts` — nuevo tracker de 5 estados**:
  - `layered` (`Con capas`)
  - `clothed` (`Con ropa`)
  - `semi` (`Menos ropa`)
  - `underwear` (`Ropa interior`)
  - `naked` (`Sin ropa`)
- **`engine.ts` — quitar ropa avanza una capa por carta**: una carta normal con `undressingTarget` solo avanza un paso. Las cartas marcadas con `undressingAmount: "final"` pasan de `underwear` a `naked`.
- **`deck.ts` — nuevo filtro `clothingRequirement`**: ahora una carta puede requerir que alguien tenga ropa, este en ropa interior o este sin ropa, aunque la carta no cambie el estado.
- **`cards.ts` — cartas T2 ajustadas**:
  - Cartas de ropa interior (`T2-13`, `T2-26`, `T2-37`) esperan a que la pareja este en `underwear`.
  - Cartas de ultima prenda (`T2-26`, `T2-38`) son finales y solo aparecen desde `underwear`.
  - Cartas que eran demasiado absolutas (`desnudate`, `se desnuda`, `te desviste`) ahora dicen "quita una prenda" para que coincidan con el tracker.
  - `T1-33` (zapatos/calcetines) ahora cuenta como quitar una capa ligera y se conserva al pasar a T2.
- **UI**:
  - El medidor muestra los 5 estados.
  - La etiqueta de la carta dice `Quita una capa` o `Quita ultima prenda` en vez de `Actualiza ropa`.
- **`constants.ts` — `STORAGE_VERSION` sube a `v7`** para evitar partidas guardadas con el tracker viejo.

Pruebas realizadas:

- Validacion dirigida: cartas de ropa interior/desnudez no salen al inicio de T2.
- Validacion dirigida: cartas de ropa interior aparecen cuando la pareja esta en `underwear`.
- Validacion dirigida: cartas de ropa interior dejan de salir cuando la pareja ya esta `naked`.
- Validacion dirigida: una carta normal avanza `layered -> clothed`; una carta final avanza `underwear -> naked`.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.

Archivos tocados:

- `src/lib/types.ts`
- `src/lib/engine.ts`
- `src/lib/deck.ts`
- `src/lib/constants.ts`
- `src/hooks/useGameState.ts`
- `src/components/screens/GameScreen.tsx`
- `src/components/ActionCard.tsx`
- `src/data/cards.ts`

---

### 2026-05-26 - Contenido: mas juguetes T3 y Roles / Disfraz

Objetivo:

Aumentar el numero de cartas de accion reales para que `EMPUJAR` tenga mas recompensa y el juego no dependa tanto de variaciones parecidas.

Cambios:

- **`cards.ts` — mazo expandido de 173 a 192 cartas**:
  - T2 sube de 40 a 44 cartas de accion.
  - T3 sube de 35 a 50 cartas de accion.
- **Nueva presencia real de `ROLES`**:
  - Se agregaron 4 cartas T2 de `ROLES`.
  - Se agregaron 6 cartas T3 de `ROLES`.
  - La etiqueta visible cambia de `Roles` a `Roles / Disfraz`.
- **Mas juguetes en T3**:
  - `JUGUETES` en T3 pasa de 5 a 15 cartas.
  - Se agregaron cartas para vibrador pequeno, vibrador grande, succionador, masturbador y anillo.
- **Correccion de carta existente**:
  - `T3-18` mencionaba vibrador pero estaba en `TEASE` y no tenia `toyRequired`. Ahora es `JUGUETES` y requiere `VIBRADOR_PEQUEÑO`.
- **`deck.ts` — memoria semantica afinada**:
  - Se agregaron claves para roleplay/disfraz y zonas especificas de juguetes, evitando que todas las cartas de juguetes o roles se bloqueen como una sola idea generica.

Pruebas realizadas:

- Conteo del mazo: 192 cartas totales.
- Validacion de IDs duplicados: ninguno.
- Validacion de cartas con texto de juguete sin `toyRequired`: ninguna.
- `npm run typecheck`: correcto.
- `npm run build`: correcto.

Archivos tocados:

- `src/data/cards.ts`
- `src/lib/constants.ts`
- `src/lib/deck.ts`

---

### 2026-05-26 - Fix: empujes arrastrados y repeticion exacta

Objetivo:

Corregir dos fallas observadas en prueba real: empujes que se sentian "regresados" entre cartas y cartas exactas que podian volver cuando el motor relajaba filtros para no quedarse sin pool.

Hallazgos:

- **`applyOfferReject` no reseteaba `pushCount` para cartas `PAREJA`/`MUTUO`**: si antes habia un push en otra carta, rechazar una oferta sin consecuencia podia dibujar carta nueva manteniendo el contador viejo. Eso hacia que el siguiente push pareciera acumulado indebidamente.
- **`seenCardKeys` mezclaba memoria exacta y memoria semantica**: cuando el pool se agotaba, el fallback limpiaba toda la memoria de ideas vistas. Como ahi tambien vivia la firma exacta del texto (`copy:*`), el juego podia repetir una carta exacta antes de permitir una carta parecida.

Cambios:

- **`engine.ts` — OFFER rechazado sin consecuencia resetea empujes**: para `PAREJA` y `MUTUO`, al dibujar otra carta ahora se fuerza `pushCount: 0`.
- **`engine.ts` — fallback anti-repeticion separado**: primero se limpian solo claves semanticas (`idea:*`, `mode:*`, `category:*`) y se conservan claves exactas (`copy:*`, `manual:*`). Solo si no existe ninguna carta posible se limpian tambien las exactas como ultimo recurso.
- **`deck.ts` — claves semanticas mas utiles**: una carta ahora puede registrar varias claves de repeticion: una exacta por copy y varias por idea (verbo + zona). Esto evita tanto repeticion literal como variaciones demasiado parecidas.
- **`constants.ts` — `STORAGE_VERSION` sube a `v6`**: evita reusar partidas guardadas con la memoria antigua de repeticion.

Pruebas realizadas:

- Simulacion determinista T1 con ciclo `PUSH -> HACERLA` hasta desbloquear T2: 0 repeticiones exactas.
- Simulacion determinista T1 con pushes continuos y BOOMs cada tercer push: 33 cartas mostradas, 0 repeticiones exactas, sin quedarse sin carta visible.

Archivos tocados:

- `src/lib/engine.ts`
- `src/lib/deck.ts`
- `src/lib/constants.ts`

---

### 2026-05-25 - Fix: orden de fallback anti-repeticion

Objetivo:

Corregir repeticiones que seguian apareciendo cuando el `heat` subia por encima del `max_heat` del tier actual.

Cambios:

- **`engine.ts` — orden de fallback corregido**: el motor estaba limpiando `deferredCards` y `seenCardKeys` antes de relajar `max_heat`. Eso permitia que regresaran cartas empujadas o ya vistas cuando el heat iba alto.
- Ahora el orden es:
  1. pool estricto
  2. reciclar completadas del tier si hace falta
  3. limpiar historial visual corto si hace falta
  4. relajar `max_heat` conservando `deferredCards` y `seenCardKeys`
  5. solo si aun no hay pool, limpiar diferidas
  6. solo como ultimo recurso, limpiar memoria semantica

Pruebas realizadas:

- Caso dirigido con `heat` por encima de `max_heat`: una carta en `deferredCards` ya no vuelve durante el fallback.
- Caso dirigido con `seenCardKeys`: una carta ya vista ya no vuelve durante el fallback.

Archivos tocados:

- `src/lib/engine.ts`

---

### 2026-05-25 - Fix: contador de push y cartas con referencia a ropa

Objetivo:

Corregir dos problemas reportados durante prueba: el contador de push aparecía aunque no había pushes en la carta actual, y en T2 salían cartas cuyo texto mencionaba ropa aunque ambos jugadores ya estuvieran sin ropa.

Cambios:

- **`GameScreen.tsx` — `PushCounter` oculto cuando no hay pushes**: el componente siempre era visible (3 puntos grises), lo cual lo hacía "regresar" visualmente en cada carta nueva. Ahora solo aparece cuando `pushCount > 0`.
- **`cards.ts` — textos de 4 cartas T2 actualizados**: las cartas T2-12, T2-14, T2-27 y T2-32 tenían texto que mencionaba ropa/desnudez pero **no tenían `undressingTarget`**, por lo que el filtro de ropa no las bloqueaba aunque ambos jugadores estuvieran desnudos. Se actualizaron los textos para ser neutros al estado de ropa:
  - T2-12: eliminado "Con tu pareja parcialmente desnuda"
  - T2-14: eliminado "(con ropa quitada arriba)"
  - T2-27: eliminado "ahora que tiene menos ropa"
  - T2-32: eliminado "con menos ropa"

Nota técnica:

El campo `undressingTarget` tiene semántica de "esta carta **quita** ropa" y filtra correctamente. El problema era cartas que **asumen** un estado de ropa sin quitarla — no tenían filtro. La solución más simple fue hacer los textos neutros al estado de ropa.

Archivos tocados:

- `src/components/screens/GameScreen.tsx`
- `src/data/cards.ts`

---

### 2026-05-25 - UI y contenido: ropa, audio, copy y cartas T1

Objetivo:

Mejorar la experiencia de juego: feedback visual de ropa en la carta, mejor audio al terminar el timer, copy mas claro en botones y pantallas, y cartas T1 reescritas para sentirse mas intencionadas y con tension.

Cambios:

- **`ActionCard.tsx` — etiqueta de ropa por carta**: las cartas con `undressingTarget` ahora muestran un aviso pequeno indicando a quien afectan ("Actualiza ropa: [nombre]" / "Actualiza ropa: ambos").
- **`GameScreen.tsx` — `ClothingStatusBar`**: barra de estado de ropa debajo del fuse, visible siempre durante la partida. Tambien se agrego estado vacio del deck ("Sin carta disponible") y mensaje de advertencia cuando el jugador lleva 1+ pushes en la carta actual.
- **`ActionButtons.tsx` — subtitulo en EMPUJAR**: el boton ahora muestra "Empujar" + "mas fuerte" en texto secundario.
- **`CircularTimer.tsx` — audio mejorado**: se reemplaza el tono simple de 440 Hz por un chime ascendente de 3 tonos (C5, E5, G5). El `AudioContext` ahora es compartido y se prepara (`resume()`) al montar el componente para evitar bloqueos de autoplay en iOS.
- **`BoomScreen.tsx` — copy**: "Control transferido a" → "Demasiado. El control cambia."
- **`cards.ts` — reescritura de cartas T1**: las primeras 15 cartas de T1 fueron reescritas para sentirse mas sugestivas, con mas tension y menos neutrales. Mismos IDs, mismo nivel de naughtiness.

Archivos tocados principalmente:

- `src/components/ActionCard.tsx`
- `src/components/screens/GameScreen.tsx`
- `src/components/ActionButtons.tsx`
- `src/components/CircularTimer.tsx`
- `src/components/screens/BoomScreen.tsx`
- `src/data/cards.ts`
- `src/lib/deck.ts`
- `src/lib/types.ts`

Pruebas realizadas:

- `npm run typecheck`: correcto.
- Prueba manual en navegador local: carta con `undressingTarget` muestra etiqueta, barra de ropa visible, audio del timer suena con 3 tonos.

---

### 2026-05-25 - Auditoria de bugs y correcciones de logica

Objetivo:

Revisar todo el juego en profundidad y corregir bugs encontrados. No se agregaron cartas ni cambios visuales.

Cambios:

- **`pushCount` no se reiniciaba al completar una carta** (`applyDoIt`): si el jugador empujaba dos veces en una carta y luego la completaba, en la siguiente carta el primer push ya tenia 100% de BOOM garantizado. Corregido: `pushCount: 0` al resolver cualquier carta (HACERLA, OFRECER aceptada, BAIL).
- **`applyOfferAccept` tampoco reiniciaba `pushCount`**: mismo problema, misma correccion.
- **`applyBail` tampoco reiniciaba `pushCount`**: idem.
- **`TierUnlockScreen` mostraba el tier equivocado**: `applyTierUnlock` incrementa `currentTier` antes de cambiar la pantalla, entonces cuando el componente renderizaba `state.currentTier` ya era el nuevo tier. Corregido en `page.tsx` pasando `(state.currentTier - 1) as Tier`.
- **`nextActionCount` con carta nula reiniciaba el contador a 0**: si no habia carta disponible, el buffer anti-BOOM se reseteaba incorrectamente. Corregido: sin carta drawn, se preserva el valor anterior.
- **`seenCardKeys` faltaba en `initialState` y `RESET_SESSION`**: causaba error de TypeScript (build roto). Corregido en `useGameState.ts`.
- **Timer leak en `OfferScreen`**: el `setTimeout` de la pantalla de rechazo no se cancelaba al desmontar el componente. Corregido con `useRef` y `useEffect` de limpieza.

Archivos tocados principalmente:

- `src/lib/engine.ts`
- `src/hooks/useGameState.ts`
- `src/app/page.tsx`
- `src/components/screens/OfferScreen.tsx`

Pruebas realizadas:

- `npm run typecheck`: correcto antes y despues.
- `npm run build`: correcto.
- Prueba manual: flujo completo T1→T2, pantalla de tier unlock muestra tier correcto.

Notas importantes:

- `startNewSession` ya aplicaba correctamente `clothingForTier(startingTier)` y `startingHeatForTier(startingTier)`. Un jugador que empieza en T3 arranca con ropa=Sin ropa y heat=5.0. No habia bug ahi.
- La probabilidad de BOOM es por carta, no por sesion. Push 1 en cada carta nueva es siempre 20%, no acumulado desde la carta anterior.

### 2026-05-25 - Repeticion de cartas y estado de ropa

Objetivo:

Evitar que el juego se sienta repetitivo, especialmente cuando salen cartas con la misma idea en diferentes tiers, y hacer visible el estado de ropa durante la partida.

Cambios:

- Se agrego memoria de cartas por "idea" y no solo por `id`.
- Se creo una firma semantica para cartas de accion, usando el texto de la accion como base normalizada.
- Se evita repetir una carta equivalente aunque venga de otro tier.
- Las cartas vistas por `PUSH`, `BAIL` u ofertas rechazadas tambien quedan recordadas, para que no regresen inmediatamente con otro `id`.
- El juego solo limpia la memoria de ideas vistas cuando el pool disponible se agota, evitando que la partida se quede sin carta.
- Se agrego estado visible de ropa en pantalla:
  - `Con ropa`
  - `Parcial`
  - `Sin ropa`
- Las cartas que actualizan ropa ahora muestran una etiqueta indicando a quien afectan.
- Al iniciar o desbloquear T3/T4, el estado de ambos jugadores se ajusta a `Sin ropa`.
- Se agregaron valores por defecto para partidas guardadas antiguas, evitando errores si `localStorage` no tenia los nuevos campos.

Archivos tocados principalmente:

- `src/lib/deck.ts`
- `src/lib/engine.ts`
- `src/lib/types.ts`
- `src/hooks/useGameState.ts`
- `src/components/screens/GameScreen.tsx`
- `src/components/ActionCard.tsx`

Pruebas realizadas:

- `npm run typecheck`: correcto.
- Prueba manual en navegador local:
  - Se abre la pantalla inicial.
  - Se puede iniciar partida.
  - Se ve el estado de ropa dentro de la pantalla de juego.
  - Los botones principales de accion aparecen correctamente.

URL local de prueba:

- `http://localhost:3000`

Notas importantes:

- No se agregaron mas cartas en esta ronda.
- Primero se corrigio la logica de repeticion, porque aumentar el mazo sin arreglar la seleccion podia ocultar el problema sin resolverlo.

---

### 2026-05-26 - Limpieza de juguetes: se quitan MASTURBADOR y ANILLO

Objetivo:

Eliminar los dos tipos de juguete que no encajaban bien con el diseño del juego: `MASTURBADOR` (dinamica de recepcion poco clara) y `ANILLO` (es un anillo de pene para retardar eyaculacion — su uso real no coincide con las cartas que lo tenian asignado).

Cambios:

- **`types.ts` — `ToyType` actualizado**: se eliminan `MASTURBADOR` y `ANILLO`. `ToyType` queda con 3 opciones: `VIBRADOR_PEQUEÑO`, `VIBRADOR_GRANDE`, `SUCCIONADOR`.
- **`constants.ts` — `TOY_LABELS` actualizado**: se eliminan las entradas de los dos juguetes removidos.
- **`components/screens/SetupScreen.tsx` — `ALL_TOYS` actualizado**: el array de juguetes visibles en setup queda con los 3 restantes.
- **`cards.ts` — 9 cartas reemplazadas**:
  - Las 7 cartas de `MASTURBADOR` (T3-35, T3-42, T3-44, T3-57, T3-58) y 3 de `ANILLO` (T3-43, T3-59, T3-60) fueron eliminadas.
  - Se removio tambien `T4-04` (la unica carta T4 con `ANILLO`).
  - En su lugar se agregaron 9 nuevas cartas T3 que cubren categorias subrepresentadas:
    - 3 cartas `VENDADOS` (T3-35, T3-42, T3-43)
    - 2 cartas `SENSACIÓN` (T3-44, T3-57)
    - 4 cartas `TEASE` (T3-58, T3-59, T3-60, T3-69)
  - El conteo total del mazo baja de 210 a 201 cartas (se quita T4-04 sin reemplazo en T4).

Decision de diseno:

- `VENDADOS`, `SENSACIÓN` y `TEASE` estaban muy poco representadas en T3 (2, 2 y 1 carta respectivamente vs 25 de `JUGUETES`). Las nuevas cartas diversifican la experiencia sin duplicar dinamicas existentes.
- Las cartas de reemplazo son deliberadamente distintas: tension de proximidad, contraste frio/calor, guia sin palabras, edging. No son variaciones de lo que ya existia.

Pruebas realizadas:

- `grep ANILLO | MASTURBADOR` en todos los archivos: sin referencias.
- `npm run typecheck`: correcto.

Archivos tocados:

- `src/lib/types.ts`
- `src/lib/constants.ts`
- `src/components/screens/SetupScreen.tsx`
- `src/data/cards.ts`
- Si despues de jugar varias rondas T4 se sigue sintiendo corto, conviene ampliar primero T4 y luego T3 con cartas realmente distintas, no variaciones cosmeticas de la misma accion.

## Bugs o dudas pendientes

### Resuelto: Build roto por `seenCardKeys` faltante en `initialState`

Estado: corregido en commit de auditoria 2026-05-25.

### Resuelto: `pushCount` no se reiniciaba entre cartas

Estado: corregido en `applyDoIt`, `applyOfferAccept`, y `applyBail`.

### Resuelto: `TierUnlockScreen` mostraba tier incorrecto (T2 mostraba nivel de T3)

Estado: corregido en `page.tsx` — ahora se pasa `(state.currentTier - 1) as Tier`.

---

### Pendiente: Validar repeticion real durante varias partidas

Estado: por probar.

Que revisar:

- Si siguen saliendo cartas con la misma idea en una misma sesion.
- Si la repeticion ocurre dentro del mismo tier o cruzando tiers.
- Si BOOM o WILD se sienten demasiado frecuentes.
- Si el juego se queda sin cartas antes de tiempo.

Como probar:

- Jugar una partida desde T1 hasta T3/T4.
- Anotar 5 ejemplos concretos si se repite algo:
  - Texto de la carta repetida.
  - Tier donde salio.
  - Si salio despues de `PUSH`, `BAIL`, oferta o accion completada.

### Pendiente: Evaluar si hacen falta mas cartas

Estado: por decidir despues de probar la nueva logica.

Observacion:

El problema puede venir de dos lugares distintos:

- Logica de seleccion: cartas distintas en codigo, pero iguales en sensacion.
- Cantidad de contenido: algunos tiers, especialmente los mas altos, pueden quedarse cortos.

Decision sugerida:

- Si T1/T2 ya se sienten variados, no crecerlos por crecer.
- Si T3/T4 se sienten repetitivos, ampliar esos tiers primero.

### Pendiente: Revisar copy de ropa/desnudez

Estado: por probar.

Que revisar:

- Si la etiqueta de ropa se entiende sin romper el ambiente del juego.
- Si conviene que el estado diga algo mas discreto o mas directo.
- Si las cartas que cambian ropa son suficientemente claras.

## Checklist para cada ronda de cambios

- Registrar el cambio en este archivo.
- Indicar archivos principales modificados.
- Correr `npm run typecheck`.
- Probar manualmente en navegador.
- Anotar bugs nuevos con ejemplos concretos.
- Separar problemas de logica, contenido y UI.
