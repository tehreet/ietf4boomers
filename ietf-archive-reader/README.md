# IETF Mail Archive Reader

A modern, three-pane interface for browsing IETF mailing list archives. Built because `mailarchive.ietf.org` deserves a better UX.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black)

## Features

- **Three-pane layout** — List picker, thread list, and reading pane
- **Thread visualization** — Color-coded nesting depth for conversation forks
- **Hot thread detection** — Flame indicators for active discussions
- **Keyboard navigation** — `j`/`k` to move, `Esc` to close, `?` for shortcuts
- **Area filtering** — Browse by IETF area (Security, Transport, Operations, etc.)
- **Responsive** — Mobile-friendly with slide-out sidebar and back navigation
- **Realistic data** — Populated with actual IETF working group names and thread patterns

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel

Push to GitHub then import at [vercel.com/new](https://vercel.com/new). Zero config needed.

Or use the Vercel CLI:

```bash
npx vercel
```

## Next Steps

- [ ] Wire up the [IETF Mail Archive API](https://github.com/ietf-tools/mailarchive/blob/main/api.yml) for live data
- [ ] Add full-text search via the Elasticsearch-backed search endpoint
- [ ] IMAP integration via `imap.ietf.org:993` for real-time updates
- [ ] Thread tree visualization (arc diagram or indented tree)
- [ ] Permalink support with URL routing per message
- [ ] RSS/Atom feed integration per list

## License

MIT
