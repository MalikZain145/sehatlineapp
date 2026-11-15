# SehatLine — VS Code mein kaise kholें aur chalायें

Ye project do hisson ka hai:
- **frontend/** — Expo (React Native) mobile app
- **backend/** — Node + Express API (MongoDB)

> **Sab se aasan:** app ka **backend already live (hosted)** hai, aur frontend
> by-default usi se baat karta hai. Yaani sirf **frontend chalao** aur app chal
> jayegi — backend local setup ki zaroorat NAHI (jab tak aap backend code pe
> kaam na karna chaho).

---

## Zaroori: pehle dependencies install karo
`node_modules` zip mein shamil NAHI (bohot bhari hota hai) — har hisse mein ek
dafa install karna hai. **Node.js (LTS 18/20)** install hona chahiye → https://nodejs.org

---

## Option A — Sirf app dekhni/chalani hai (recommended)
```bash
cd frontend
npm install
npx expo start
```
- Phone pe **Expo Go** app install karo (Play Store / App Store).
- Terminal ka **QR** scan karo → app khul jayegi (live hosted backend se connected).
- Same Wi-Fi na ho to: `npx expo start --tunnel`

Web preview chahiye to: `npx expo start` ke baad terminal mein **`w`** dabao.

---

## Option B — Backend bhi locally chalana hai (development)
Tabhi karo jab API code pe kaam karna ho. Apna MongoDB chahiye (local ya free Atlas).

```bash
cd backend
npm install
copy .env.example .env      # (Windows)   | Mac/Linux: cp .env.example .env
# .env kholo aur MONGO_URI + JWT_SECRET bhar do
npm start
```
Backend `http://localhost:5000` pe chalega.

Frontend ko local backend se jorna ho to `frontend/src/config/api.config.js`
mein `USE_PRODUCTION = false` kar do (phir woh aap ki LAN IP khud detect karega).
Shareable build ke liye wapas `true` kar dena.

---

## VS Code tips
- Folder `File → Open Folder…` se kholo.
- Recommended extensions: **ESLint**, **Prettier**, **React Native Tools**.
- Do terminals rakho (ek backend, ek frontend) agar Option B use kar rahe ho.

## Aam masle
- `expo: command not found` → `npx expo start` use karo.
- QR connect na kare → `npx expo start --tunnel`.
- `npm install` fail → Node version 18/20 LTS check karo (`node -v`).
- Backend DB error → `.env` ka `MONGO_URI` sahi hai ya nahi dekho.
