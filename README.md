# Scrub Deck

Nursing study cards for iPhone, iPad, and the web. Built by Violet with her dad.

- Decks and cards: `src/data/decks.ts` (add a `[front, back]` pair to add a card)
- Screens: `src/App.tsx`, look and colors: `src/index.css`
- Streak and quiz rules: `src/lib/`, with tests in `src/lib/lib.test.ts`

```sh
npm run dev      # try it in a browser
npm test         # run the tests
npm run build && npx cap sync ios   # refresh the iOS app in ios/
```

Everything is saved on the device. No account, no server, no tracking.
