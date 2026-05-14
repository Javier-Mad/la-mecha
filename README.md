# La Mecha

Un juego de cartas íntimo para parejas con mecánica push-your-luck.

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion
- TypeScript
- `localStorage` para persistencia (sin backend)

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — la app es mobile-first, optimízala con Chrome DevTools a 390×844.

## Build

```bash
npm run build
npm run start
```

## Deploy

Listo para Vercel sin configuración. `vercel deploy` desde la raíz.

## Estructura

```
src/
├── app/           # layout + page (router de pantallas)
├── components/    # Fuse, ActionCard, ActionButtons, screens/
├── data/cards.ts  # CARD_DATABASE: 200 cartas
├── hooks/         # useGameState
└── lib/           # types, engine, deck, storage, constants
```

## Mecánica resumida

- 4 tiers de intensidad: **Chispa → Calor → Fuego → Ignición**
- Cada turno: HACERLA / EMPUJAR / OFRECER
- Tres caminos a BOOM: carta BOOM robada, mecha en cero, 3 empujes seguidos
- Cartas WILD: solo **VICTORIA (T4-49)** termina la partida; las demás continúan

## localStorage

Clave: `la-mecha-state`. Estado completo en un solo JSON. Al recargar, ofrece **Continuar partida / Empezar de cero**.
