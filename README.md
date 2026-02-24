# High Aura — GitHub Pages + PWA Offline

Deploy pronto para GitHub Pages com Vite + PWA (service worker).
O workflow define `VITE_BASE="/<repo>/"` automaticamente para corrigir paths e cache no subdiretório.

## Rodar local
- Node 18+ (recomendado 20)
- `npm install`
- `npm run dev`

## Deploy no GitHub Pages
1) Suba para um repositório no GitHub (branch `main`)
2) Settings -> Pages -> Source: GitHub Actions
3) Push na `main` e pronto

## Notas importantes
- GitHub Pages publica em subpath `/NOME_DO_REPO/`. Por isso o Vite precisa do `base` configurado. (Vite docs: base rewrite de assets)
- Service worker/manifest precisam respeitar o mesmo base/scope para funcionar sem quebrar rotas.

## Features (V1)
- Privado (local), offline (PWA), modo militar
- Modo estrito com PIN
- Timers + checklist + NPC Mentor
- Dieta: biblioteca de opções por refeição (tudo em todas)
- Treino PPL 6x
- Fotos offline + timeline
- Auditoria + Social mentor
- Música offline (upload) + botão "ARMAR ÁUDIO"
