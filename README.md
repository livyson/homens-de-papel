# Homens de Papel — Ensaio do Frido

App web para ensaiar de cor as falas do personagem **Frido** na peça *Homens de Papel*, de Plínio Marcos.

## Acesso online (GitHub Pages)

Depois do deploy: **https://livyson.github.io/homens-de-papel/**

O push na branch `main` publica automaticamente via GitHub Actions (`.github/workflows/deploy.yml`).

Na primeira vez, ative o Pages no repositório:

1. Abra **Settings → Pages**
2. Em **Build and deployment → Source**, escolha **GitHub Actions**
3. Aguarde o workflow **Deploy to GitHub Pages** ficar verde em **Actions**

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra o endereço local no computador ou no celular (mesma rede: use o IP que o Vite mostrar com `--host`).

```bash
npm run dev -- --host
```

Build de produção:

```bash
npm run build
npm run preview
```

## Uso

1. Escolha uma ou mais cenas do Frido.
2. Escolha digitar ou falar (voz só aparece se o navegador suportar Web Speech API).
3. As falas dos outros personagens aparecem na tela; na sua vez, produza a fala do Frido.
4. O app compara ignorando pontuação/caixa/espaços, mas exige as palavras com acentuação correta.
5. Progresso fica salvo no `localStorage` do navegador.

## Dados

O roteiro está em `src/data/roteiro-frido.json` (14 cenas com falas do Frido).
