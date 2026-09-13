# AGENTS.md

Guia rápido pra quem (humano ou agente) for mexer neste repo.

## Stack

- Vite 8 + React 19.2.8 + TypeScript
- `three` 0.186, `@react-three/fiber` 9.7, `@react-three/drei` 10.7
- ESLint (template padrão do Vite, sem Prettier)

React fixado em `19.2.8` (sem `^`) porque `@react-three/fiber` 9.x exige
`react`/`react-dom` `>=19 <19.3` — não subir a versão do React sem checar essa
faixa antes.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento (localhost:5173)
npm run build    # tsc -b + build de produção
npm run lint     # eslint .
npm run preview  # preview do build
```

## Estrutura

```
src/
  scene/        # tudo que roda dentro do <Canvas> (objetos, câmera, ambiente)
  components/   # overlays HTML por cima do Canvas (crosshair, telas de UI)
  hooks/        # hooks reutilizáveis (input, etc.)
```

## Convenções

- **Input via ref, não state.** `useKeyboard` guarda teclas pressionadas num
  `Set` dentro de um `ref` — evita re-render a cada tecla, já que o loop de
  jogo lê o estado a cada frame de qualquer forma.
- **Todo movimento é multiplicado por `delta`** (segundo argumento do
  `useFrame`), pra ficar independente de framerate. Exceção: rotação de
  câmera via mouse, que usa `movementX`/`movementY` puro (delta de mouse já é
  por evento, não por frame).
- **Yaw separado do pitch.** O vetor de movimento (WASD) usa só a rotação
  horizontal da câmera. Pitch (olhar cima/baixo) nunca entra nesse cálculo —
  evita o jogador "subir" ou "descer" ao olhar pro céu/chão andando.
- **Overlays são DOM, não objetos 3D.** Crosshair, tela de "clique pra
  jogar" etc. são `<div>`s com `position: fixed` por cima do Canvas — mais
  simples que renderizar dentro da cena.
- **`react-hooks/immutability` desligada em `src/scene/**`.** r3f muta
  objetos three.js (`camera.position`, etc.) direto dentro de
  `useFrame`/`useEffect` por design — é o padrão recomendado pela lib pra
  evitar re-render por frame. A regra do React Compiler não entende esse
  padrão imperativo, então fica desligada só nessa pasta.
- **Uma velocidade só.** O jogador é um `Body` (`src/scene/swing.ts`) com
  `position` (alias de `camera.position`), `velocity`, `anchor`, `ropeLength`,
  `grounded`. Chão, ar e teia não são "modos": são só regras diferentes de
  aceleração dentro de `stepBody`. Nunca somar posição direto nem zerar
  `velocity` fora de `stepBody` — é assim que se perde momentum sem querer.
- **Tuning de feel = constantes no topo de `swing.ts`.** Knobs principais:
  `SWING_ACCEL` (força do bombear), `GROUND_ACCEL` (quanto o pouso desliza),
  `AIR_ACCEL`, `MAX_SPEED`, `TILT_MAX`/`TILT_SPEED_REF`/`TILT_LAMBDA` (roll de
  câmera). Testes cobrem invariantes (corda não estica, energia, momentum,
  sinal/teto do tilt), não valores exatos — mexer nos knobs não quebra teste.
  `MAX_ROPE`/`MIN_ROPE` (alcance do raycast) moram aqui também, não em
  `Player.tsx`.
- **`camera.rotation.order = 'YXZ'`, setado uma vez no efeito de setup.**
  `PointerLockControls` decompõe a rotação nessa ordem e só sobrescreve
  `x`/`y` (mouse look), preservando `z`. Sem isso, escrever `camera.rotation.z`
  (tilt de câmera) reinterpreta yaw/pitch e entorta a vista.
- **HUD/overlays que mudam todo frame lêem um `ref` compartilhado via seu
  próprio `requestAnimationFrame`, nunca `state` por frame.** Ex.:
  `SpeedHud.tsx` lê `speed.current` (escrito pelo `Player` no `useFrame`) e
  escreve direto no `textContent` — zero re-render do React por frame.

## Specs

O planejamento de cada sprint fica em `.specs/` (fora do controle de
versão — ver `.gitignore`). Sprint 0 (setup + FPS básico), Sprint 1 (teia +
balanço), Sprint 1.5 (polish da física) e Sprint 2 (corda visual, crosshair
dinâmico, tilt de câmera, HUD de velocidade) já implementadas; próximas specs
devem seguir o mesmo padrão: um commit por subspec.

- **Física pura fica fora do r3f.** Lógica testável sem `useFrame`/câmera
  (ex.: `src/scene/swing.ts`) vai em módulo separado, sem depender de three
  além dos tipos (`Vector3`). `npm test` roda os testes (`vitest`).
- **Blocos em `Environment.tsx` são placeholder** até a sprint 3 trazer os
  prédios de verdade — servem só de alvo pra teia por enquanto.
