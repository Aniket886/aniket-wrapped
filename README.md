# Aniket Wrapped

A Spotify Wrapped-style GitHub showcase for `Aniket886`, built with Vite and React.

## What it does

- pulls public GitHub profile and repo data in the browser
- samples recent non-fork repos to estimate public commit activity
- aggregates language bytes from GitHub's language endpoint
- presents the result as a shareable animated one-page "Wrapped"

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app is configured for GitHub Pages at `/aniket-wrapped/` and deploys from `main` using the workflow in `.github/workflows/deploy.yml`.
