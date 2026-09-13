# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
versionamento seguindo [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.3.0] - 2026-09-13

Sprint 1.5 (polish da física) + Sprint 2 (feedback visual do balanço) —
a teia agora "dá aquele uou": corda visível, crosshair reativo, câmera que
acompanha a curva.

### Added
- Controle no ar: WASD acelera levemente o jogador depois de soltar a teia (`AIR_ACCEL`), sem nunca frear o momentum
- Impulso no balanço: WASD "bombeia" o pêndulo enquanto preso na teia (`SWING_ACCEL`), dá pra começar um balanço do repouso e ganhar velocidade em cada arco
- Teto de velocidade (`MAX_SPEED`) pra bombear não crescer sem limite
- Corda visual (`Line` do drei) ligando a "mão" (câmera deslocada) ao anchor, atualizada por frame enquanto o balanço estiver ativo
- Crosshair dinâmico: raycast de mira roda todo frame e muda a cor/gap do crosshair quando o alvo mirado é válido pra teia, antes mesmo do clique
- Tilt de câmera: `tiltTarget` (`swing.ts`) calcula o roll alvo a partir da direção pro anchor e da velocidade; `Player.tsx` suaviza com `MathUtils.damp` e escreve em `camera.rotation.z`
- HUD de velocidade (`SpeedHud.tsx`) mostrando `|velocity|` em m/s, toggle por F3
- `MIN_ROPE`: hit mais perto que isso não prende a teia
- Testes de `stepBody`/`tiltTarget`: pêndulo conserva energia, corda nunca estica, independência de framerate, pouso preserva momentum, clamp de delta, sinal e teto do tilt

### Changed
- Física do jogador unificada em `stepBody` (`src/scene/swing.ts`): chão, ar e teia são só regras de aceleração sobre uma velocidade única. `Player.tsx` virou wiring de input → física
- Integrador com substeps (`MAX_STEP` = 1/120 s) e clamp de delta (`MAX_DELTA` = 0.1 s): balanço estável em qualquer framerate, sem teleporte ao voltar de aba em background
- Pouso não zera mais a velocidade: momentum horizontal freia gradualmente (`GROUND_ACCEL`), soltar no ápice e aterrissar vira um deslize em vez de parada seca
- Andar no chão agora é por velocidade (aceleração até `WALK_SPEED`), não soma de posição
- Anchor e marcador de debug saíram do `useState` pra `ref`: clique não re-renderiza e a física começa no mesmo frame
- Constantes de física (`GRAVITY`, `EYE_HEIGHT`, `WALK_SPEED`, `JUMP_SPEED`, `MAX_ROPE`, ...) centralizadas em `swing.ts`
- Raycast de teia deixou de rodar só no clique: `onPointerDown` agora consome o resultado do raycast contínuo do `useFrame`
- Marcador esférico de debug do anchor removido, substituído pela corda visual
- `camera.rotation.order` fixado em `YXZ` pra o roll de câmera sobreviver ao mouse look do `PointerLockControls` sem entortar a vista

## [0.2.0] - 2026-09-13

Sprint 1: mecanica de teia — prende num alvo, balança e solta com o momentum real.

### Added
- Teia via raycast: clique esquerdo dispara raio na direção que a câmera olha, alcance máximo configurável (`MAX_ROPE`); acertando um alvo, guarda o ponto de impacto como anchor e o tamanho da corda
- Física do balanço (`src/scene/swing.ts`): restrição de distância estilo position based dynamics — corda esticada corrige posição e remove o componente radial da velocidade, corda frouxa deixa em queda livre
- Liberação com conservação de momentum: soltar o botão limpa só o anchor, sem nenhum freio artificial na velocidade
- Blocos placeholder em `Environment.tsx` como alvos de ancoragem (substituídos pelos prédios na sprint 3)
- Marcador visual temporário (esfera vermelha) no ponto de anchor durante o swing, pra debug
- Testes (`vitest`, `npm test`) cobrindo `solveRopeConstraint`

### Changed
- Velocidade do jogador em `Player.tsx` virou `Vector3` (antes só escalar Y), pra carregar momentum horizontal do balanço
- WASD desativado enquanto o jogador estiver preso na teia

## [0.1.0] - 2026-09-13

Sprint 0: esqueleto jogável — anda e olha ao redor numa cena vazia, com chão, céu e crosshair.

### Added
- Setup do projeto: Vite + React + TypeScript, `three` / `@react-three/fiber` / `@react-three/drei`, estrutura `src/scene`, `src/components`, `src/hooks`
- Câmera FPS com `PointerLockControls` (yaw livre, pitch limitado) e overlay de "clique pra jogar"
- Movimento WASD relativo ao yaw da câmera, gravidade simples e pulo (Space)
- Ambiente placeholder: chão em grid, céu (`Sky`), luz ambiente + direcional
- Crosshair central via overlay HTML/CSS
