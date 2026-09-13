# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
versionamento seguindo [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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
