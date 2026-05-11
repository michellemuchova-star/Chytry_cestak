# Testovací checklist – Chytrý Cesťák

## 1. Spuštění aplikace

- [ ] Dev server běží: `npm run dev`
- [ ] Otevři **http://localhost:3001** (nebo 3000, pokud je volný)
- [ ] Přihlašovací stránka se zobrazí

---

## 2. Demo režim (bez přihlášení)

- [ ] Klikni na **„Demo – vizuální pohled s fiktivními daty →“**
- [ ] Nebo otevři **http://localhost:3001/demo** přímo

### Pohled zaměstnance – přepínání scénářů

- [ ] **Připraven (Vyjíždím)** – hlavní obrazovka, tlačítko „Vyjíždím“, souhrn měsíce
- [ ] **Nová cesta (formulář)** – výběr dopravy (auto/vlak/bus), účel cesty
- [ ] **Cesta probíhá** – probíhající cesta s časovačem, tlačítko „V cíli“
- [ ] **Souhrn cesty** – km, kilometrovné, stravné po dokončení
- [ ] **Výběr kraje** – mřížka krajů (PHA, STC, ULK, OLK, KVK, SPC)
- [ ] **Nastavení vozidla** – formulář vozidla (SPZ, spotřeba, sazba)

### Pohled správce / HR / účetní

- [ ] Přepni na **„Přehled cest · Export PDF“**
- [ ] Zobrazí se karty zaměstnanců s cestami
- [ ] Filtry: organizace (Euroinstitut, Eduservis, Biotherapy)
- [ ] Pro Euroinstitut: filtry podle kraje
- [ ] Rozbalení karty – detail cest, tlačítko „Zpracovat“
- [ ] **Exportovat PDF** – tiskový formulář

---

## 3. Přihlášení (vyžaduje Firebase)

- [ ] Otevři **http://localhost:3001**
- [ ] Klikni **„Přihlásit se přes firemní Google účet“**
- [ ] Přihlášení firemním účtem (@euroinstitut.cz, @eduservis.cz, @biotherapy.cz)
- [ ] Zaměstnanec: vidí Dashboard
- [ ] Admin/HR/Účetní: vidí AdminView (role v Firestore)

---

## 4. Zaměstnanec – plný flow

- [ ] Přihlášení firemním účtem
- [ ] **Euroinstitut:** výběr kraje (pokud je první přihlášení)
- [ ] Nastavení vozidla (pokud není)
- [ ] **Vyjíždím** → formulář účelu → GPS odjezd → cesta probíhá
- [ ] **V cíli** → GPS příjezd → souhrn cesty
- [ ] Historie cest v seznamu

---

## 5. Admin – plný flow

- [ ] Přihlášení účtem s rolí manager/hr/accountant/admin
- [ ] Filtrování měsíců, organizací, krajů
- [ ] Zpracování cesty (draft → approved)
- [ ] Export PDF pro zaměstnance
- [ ] Odhlášení

---

## Rychlý test (bez Firebase)

1. Otevři **http://localhost:3001/demo**
2. Projdi všechny scénáře pohledu zaměstnance
3. Přepni na pohled správce
4. Zkontroluj, že export PDF funguje (Ctrl+P / Cmd+P)
