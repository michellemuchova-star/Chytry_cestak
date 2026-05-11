# Cestovní příkazy – Euroinstitut

Webová aplikace pro evidenci pracovních cest.  
Stack: Next.js 14, TypeScript, Firebase (Auth + Firestore).

---

## 🚀 Spuštění aplikace – kompletní návod

### Část 1: Firebase projekt (uděláš jednou, trvá ~10 minut)

#### 1.1 Vytvoř projekt

1. Jdi na [console.firebase.google.com](https://console.firebase.google.com)
2. Přihlas se svým Google účtem
3. Klikni **„Vytvořit projekt"** → pojmenuj ho `cestovni-prikazy-euroinstitut`
4. Google Analytics vypni (není potřeba) → **Vytvořit projekt**

---

#### 1.2 Zapni přihlašování přes Google

1. V levém menu klikni **Authentication**
2. Záložka **Sign-in method** → klikni na **Google**
3. Přepni na **Enabled**
4. Vyplň „E-mail podpory projektu" (tvůj email)
5. Klikni **Uložit**

---

#### 1.3 Vytvoř databázi (Firestore)

1. V levém menu klikni **Firestore Database**
2. Klikni **„Create database"**
3. Vyber **„Start in production mode"** ← důležité (bezpečnější)
4. Vyber region **`europe-west3`** (Frankfurt – nejblíže ČR)
5. Klikni **Enable**

---

#### 1.4 Nahraj bezpečnostní pravidla

1. V Firestore klikni na záložku **Rules** (Pravidla)
2. Smaž vše co tam je
3. Zkopíruj celý obsah souboru `firestore.rules` z projektu
4. Vlož ho do textového pole
5. Klikni **Publish**

---

#### 1.5 Nahraj indexy databáze

1. V Firestore klikni na záložku **Indexes** (Indexy)
2. Klikni **„Add composite index"** → nebo použij přímý odkaz níže

> **Rychlejší způsob:** Indexy se vytvoří automaticky, když aplikaci poprvé spustíš
> a udělá se první dotaz. Firebase v konzoli prohlížeče ukáže odkaz „create index".
> Klikni na něj a index se přidá automaticky.

---

#### 1.6 Získej konfigurační údaje

1. Klikni na ozubené kolečko ⚙️ vedle „Project Overview" → **Project settings**
2. Sjeď dolů na sekci **„Your apps"**
3. Klikni na ikonu **`</>`** (Web app)
4. Pojmenuj ji `cestak-web` → **Register app**
5. Zobrazí se blok s hodnotami – nechej okno otevřené

---

### Část 2: Propoj s aplikací

#### 2.1 Vytvoř soubor `.env.local`

V Cursoru pravým kliknutím na `.env.local.example` → **Copy** → přejmenuj na `.env.local`

Doplň hodnoty z Firebase (ty které vidíš v otevřeném okně prohlížeče):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cestovni-prikazy-euroinstitut.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cestovni-prikazy-euroinstitut
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cestovni-prikazy-euroinstitut.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_ALLOWED_DOMAIN=euroinstitut.cz
```

> ⚠️ Poslední řádek – doplň skutečnou doménu firemních emailů!

---

### Část 3: Spusť aplikaci

Otevři terminál v Cursoru (menu nahoře → Terminal → New Terminal):

```bash
npm install
```

Počkej dokud neskončí (1–2 minuty). Pak:

```bash
npm run dev
```

Otevři prohlížeč na adrese: **http://localhost:3000**

---

## 👥 Jak funguje přihlašování zaměstnanců

**Žádný seznam zaměstnanců nahrávat nemusíš.**

- Každý zaměstnanec se přihlásí svým firemním Google účtem (`@euroinstitut.cz`)
- Při prvním přihlášení se automaticky vytvoří jeho profil v databázi
- Doména se kontroluje – účty z jiných domén se nepřihlásí
- Výchozí role je `employee` (zaměstnanec)

---

## 🔑 Jak nastavit roli účetní / HR / správce

Role se nastavuje ručně v Firebase konzoli (jen jednou, pro konkrétní osoby):

1. Jdi na [console.firebase.google.com](https://console.firebase.google.com) → tvůj projekt
2. Firestore Database → kolekce **`users`**
3. Najdi dokument zaměstnance (je pojmenován jejich UID)
4. Klikni na pole **`role`** → změň hodnotu na jednu z:
   - `accountant` – účetní (přehled všech cest + export)
   - `hr` – HR (stejné jako účetní)
   - `manager` – vedoucí (stejné jako účetní)
   - `admin` – plný přístup

---

## 📱 Role v aplikaci

| Role | Co vidí |
|---|---|
| `employee` | Jen své vlastní cesty, tlačítka Vyjíždím/V cíli |
| `accountant` / `hr` / `manager` | Přehled všech zaměstnanců, export PDF |
| `admin` | Vše výše + označování cest jako zpracovaných |

---

## 🗂️ Struktura projektu

```
app/
  page.tsx          ← hlavní vstupní bod, routuje podle role
  layout.tsx        ← HTML obal
  globals.css       ← globální styly

components/
  LoginPage.tsx     ← přihlašovací obrazovka
  Dashboard.tsx     ← obrazovka zaměstnance (GPS, cesty)
  VehicleProfile.tsx← nastavení vozidla
  AdminView.tsx     ← přehled pro účetní/HR
  ExportPreview.tsx ← tiskový formulář (PDF export)

lib/
  firebase.ts       ← inicializace Firebase
  types.ts          ← TypeScript typy + sazby diet
  trips.ts          ← operace s cestami (GPS, OSRM, Firestore)
  vehicles.ts       ← operace s vozidly
  admin.ts          ← admin dotazy (všechny cesty, uživatelé)

firestore.rules     ← bezpečnostní pravidla Firestore
firestore.indexes.json ← indexy pro dotazy
.env.local.example  ← šablona pro konfiguraci
```

---

## 💡 Sazby diet (platné od 1. 1. 2025)

| Délka pracovní cesty | Stravné |
|---|---|
| méně než 5 hodin | 0 Kč |
| 5–12 hodin | 148 Kč |
| 12–18 hodin | 225 Kč |
| více než 18 hodin | 353 Kč |

Sazby jsou v souboru `lib/types.ts` → `DEFAULT_PER_DIEM_RATES`.

---

## 🗺️ Výpočet vzdálenosti

Aplikace používá [OSRM](https://project-osrm.org/) – bezplatné API pro výpočet
nejkratší silniční trasy. Nevyžaduje žádný API klíč.

---

*Vytvořeno pomocí Cursor AI · Euroinstitut 2026*
