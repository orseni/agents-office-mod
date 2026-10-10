# Changelog

## 0.2.0 — 2026-10-10

- New pixel art for the office and the robot: outlined, shaded sprites (cool shadows, warm lights) laid out in zones so the character, the monitor and the effects no longer pile up.
- Office people get three haircuts, picked from the agent's name, and eyes that stay visible on dark skin.
- The robot's visor face changes with the work: a prompt while running, globes on the web, stars over a skill, X eyes on errors. The chest light no longer slides across the belly.
- Slim characters are 20×10 pixels drawn with quadrant blocks (twice the detail across, same 10×5 cells), with every terminal cell kept to two colors.
- The sleeping "Z" reads as a Z.

## 0.1.1 — 2026-10-08

- A subagent resumed by a message after it finished (and left the room) comes back as a working character instead of leaving only the orchestrator on screen.
- Subagents already running when the mod loads (a reload mid-session) are seated at load, and any tool call from an agent the office has not seen seats it.

## 0.1.0 — 2026-10-08

First release.

- A band above the prompt with the orchestrator and every delegated subagent as animated pixel-art characters; falls back to a one-line-per-agent list when the terminal is short.
- Three avatars: office, robot, tamagotchi.
- Eleven states: idle, thinking, reading, writing, running, delegating, skill, web, waiting, done, error.
- Subagents named after the project folder or git submodule their prompt names.
- Avatar and visibility kept across sessions.
- `/agent-office` to hide/show the band or switch the avatar, status-line summary, optional toasts.
- English and Brazilian Portuguese.
