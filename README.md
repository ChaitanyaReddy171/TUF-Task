# Interactive Wall Calendar (Next.js)

A polished React/Next.js wall-calendar style component inspired by the challenge reference image.

## Highlights

- Day range selector with clear visual states:
	- Start date
	- End date
	- In-between highlighted days
- Integrated notes:
	- Monthly notes
	- Range-specific memo notes
- Fully responsive layout:
	- Desktop: hero image, calendar grid, and notes in a balanced panel composition
	- Mobile: stacked sections optimized for touch interactions
- Browser persistence using `localStorage`.

## Design Direction

- Physical wall-calendar feel with top rings/hanger styling
- Prominent hero image and geometric wave overlay
- Editorial typography and business-friendly color palette
- Subtle entrance animation and interactive hover/focus states

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Plain CSS (custom design system)

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build

```bash
npm run build
npm run start
```

## Project Structure

- `src/app/page.tsx`: Calendar logic, range selection, notes wiring
- `src/app/globals.css`: Full visual system and responsive styling
- `src/app/layout.tsx`: App metadata and font setup
