# SimpleBank — Demo UI

Files added:

- `index.html` — login and sign-up page
- `dashboard.html` — main dashboard (balance, transactions, transfers)
- `styles.css` — responsive styles shared across pages
- `app-login.js` — login/sign-up page logic
- `app-dashboard.js` — dashboard page logic and authentication check
- `server.js` — Express API backend
- `package.json` — Node dependencies

How to run

1. Open `index.html` in your browser (double-click or right-click → Open with).

Run backend API (optional, recommended for realistic demo)

1. Open a terminal and `cd` to the project folder:

```powershell
cd "c:\Users\user\Desktop\Personal builds\Banking"
```

2. Install dependencies and start the server:

```powershell
npm install
npm start
```

This will start a demo Express API on `http://localhost:3000` with the following endpoints:

- `POST /login` — body `{ username, password }` (demo credentials: `demo` / `1234`)
- `POST /register` — body `{ username, password }` (create new account with $100 welcome bonus)
- `GET /balance` — returns `{ balance }` (requires `Authorization: Bearer <token>`)
- `GET /transactions` — returns `{ transactions: [...] }` (requires auth)
- `POST /transfer` — body `{ to, amount }` (requires auth)

When the server is running, the frontend (`index.html`) will call the API automatically and persist a simple token in `localStorage` for the demo session.

Notes & next steps

- This is a frontend-only demo that uses `localStorage` to persist a simple account state.
- Demo credentials: username `demo` and password `1234`.
- To turn this into a real app: add a backend API, secure authentication, and server-side storage.
