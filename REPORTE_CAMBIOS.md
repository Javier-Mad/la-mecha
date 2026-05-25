# Reporte de cambios - LaMecha

Fecha: 2026-05-25

Este archivo es la bitacora viva del proyecto. La idea es que cada ronda de cambios deje claro que se movio, por que se movio, como se puede probar, y que bugs siguen pendientes.

## Cambios aplicados

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

