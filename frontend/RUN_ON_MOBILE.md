# SehatLine — Mobile pe Expo se kaise chalayein

> **Zaroori baat:** Ye project folder phone pe **seedha copy karke nahi** chalta.
> Isse ek **computer (Windows/Mac/Linux)** pe `expo start` se chalaate hain,
> aur phone usi app ko **Expo Go** se connect karke kholta hai.

Backend pehle se **live (hosted)** hai — is folder ko sirf chalana hai, koi
backend setup nahi chahiye. CNIC verification bhi chal jayegi.

---

## Ek dafa ka setup (computer pe)

1. **Node.js (LTS)** install karo → https://nodejs.org  (18 ya 20 LTS)
2. Is folder mein terminal/command prompt kholo.
3. Dependencies install karo (ek hi dafa):
   ```bash
   npm install
   ```

## App chalana (har dafa)

4. Expo start karo:
   ```bash
   npx expo start
   ```
   - Agar phone aur computer **same Wi-Fi** pe hain → normal theek hai.
   - Agar same Wi-Fi na ho ya QR connect na kare → tunnel use karo:
     ```bash
     npx expo start --tunnel
     ```

5. Phone pe **Expo Go** install karo:
   - Android → Play Store → "Expo Go"
   - iPhone → App Store → "Expo Go"

6. Terminal mein jo **QR code** aaye use scan karo:
   - **Android:** Expo Go app ke andar se "Scan QR code"
   - **iPhone:** phone ka **Camera** app QR pe le jao → banner tap karo (Expo Go khul jayega)

7. App load ho ke khul jayegi — live backend se connected. 🎉

---

## Notes

- Code badlo → file save karte hi app phone pe khud reload ho jayegi (hot reload).
- Ye **dev/testing** ka tareeqa hai. Kisi ko bina computer ke sirf app deni ho
  to **APK** (Android) share karo — woh direct install ho jaati hai, Expo Go
  ki zaroorat nahi.
- iPhone pe bina Expo Go ke standalone app ke liye iOS build (EAS) chahiye.

## Agar error aaye
- `npm install` fail ho → Node version check karo (`node -v`), 18/20 LTS rakho.
- QR connect na kare → `npx expo start --tunnel` try karo.
- `expo: command not found` → `npx expo start` use karo (npx ke saath).
