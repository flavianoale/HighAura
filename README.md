# High Aura (PWA offline, privado) — MVP

O que já está pronto neste MVP:
- PWA offline-first (Service Worker via vite-plugin-pwa)
- Banco local IndexedDB (Dexie) com log de eventos
- Tela principal "O QUE FAZER" (NPC Mentor + timer + checklist + log rápido)
- Modo Militar: falha crítica (pornografia/aposta) tira Honra e ativa Modo Estrito
- Modo Estrito: trava tudo (só execução). Sai apenas com PIN.
- Música offline: upload local + botão "ARMAR ÁUDIO" (autoplay exige gesto)
- Humor diário (energia/estresse/foco/libido)
- Backup criptografado local (AES-GCM + PBKDF2) export/import

## Rodar
1) Instale Node 18+
2) No terminal:
   - `npm install`
   - `npm run dev`
3) Para build:
   - `npm run build`
   - `npm run preview`

## Instalar como app (PWA)
No navegador (Chrome/Edge/Android):
- Menu -> "Instalar app".

No iPhone (Safari):
- Compartilhar -> "Adicionar à Tela de Início".

## Observações reais
- Autoplay de áudio normalmente é bloqueado sem gesto. Use "ARMAR ÁUDIO" na primeira vez.
- PWA offline não tem automação perfeita em background em todos os sistemas. O foco aqui é execução quando o app abre.
