# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
versionamento seguindo [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.1.0] - 2026-09-13

Sprint 0: esqueleto jogável — anda e olha ao redor numa cena vazia, com chão, céu e crosshair.

### Added
- Setup do projeto: Vite + React + TypeScript, `three` / `@react-three/fiber` / `@react-three/drei`, estrutura `src/scene`, `src/components`, `src/hooks`
- Câmera FPS com `PointerLockControls` (yaw livre, pitch limitado) e overlay de "clique pra jogar"
- Movimento WASD relativo ao yaw da câmera, gravidade simples e pulo (Space)
- Ambiente placeholder: chão em grid, céu (`Sky`), luz ambiente + direcional
- Crosshair central via overlay HTML/CSS
