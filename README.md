# Chain Reaction

3D strategy game for 2–8 players. Drop atoms onto a grid; overflow a cell and it explodes into its neighbors, stealing them. Last player with atoms wins.

Play: **https://chain-reaction3d.web.app**

## Modes

- **Local** — hotseat on one device with humans or a bot (Easy / Medium / Hard).
- **Online** — create or join a room with a short code, share the link, chat inside the match.
- **Rematch** — after a game everyone votes to replay in the same room.
- **Share** — post the winning board (PNG + text) to any app on mobile, or copy the link on desktop.

## Rules

- Corner cells hold 1 atom, edge cells 2, middle cells 3.
- Drop on empty cells or on your own color.
- Exceeding a cell's capacity makes it explode: one atom flies to each neighbor, and those cells become yours.
- Explosions can cascade into long chain reactions.
- Lose all your atoms → you're eliminated.

The in-game **How to play** button walks through all of this with an infographic.

## Run locally

```
npm install
npm run dev
```

Then open http://localhost:3001.

## Deploy

```
npm run deploy
```

Requires a one-time `npx firebase-tools login`. Deploys the built site to Firebase Hosting.
