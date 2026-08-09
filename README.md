# Homens de Papel — Ensaio de elenco

App web para ensaiar de cor as falas da peça *Homens de Papel*, de Plínio Marcos — com o elenco completo e ensaio por personagem.

## Acesso online (GitHub Pages)

Depois do deploy: **https://livyson.github.io/homens-de-papel/**

O push na branch `main` publica automaticamente via GitHub Actions (`.github/workflows/deploy.yml`).

Na primeira vez, ative o Pages no repositório:

1. Abra **Settings → Pages**
2. Em **Build and deployment → Source**, escolha **GitHub Actions**
3. Aguarde o workflow **Deploy to GitHub Pages** ficar verde em **Actions**

## Como usar

1. Escolha seu personagem no elenco (ex.: `Tiago = Coco`).
2. Filtre por Ato I / Ato II e marque as cenas.
3. Escolha digitar ou falar.
4. No **modo cego**, veja só a deixa anterior e produza a fala de memória.
5. O progresso (falas decoradas por cena) fica salvo no navegador.

## Como rodar localmente

```bash
npm install
npm run dev -- --host
```

Build de produção:

```bash
npm run build
npm run preview
```

## Dados

Roteiro completo em `src/data/homens-de-papel.json` (2 atos, 31 cenas, elenco mapeado ator → personagem).
