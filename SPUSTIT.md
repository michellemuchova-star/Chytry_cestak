# Jak spustit aplikaci

## Problém: localhost nefunguje

Aplikace má poškozenou cache nebo běží starý server. Postup:

---

## Krok 1: Zastav VŠECHNY běžící servery

V **každém** terminálu, kde vidíš `npm run dev` nebo `next`:
- Stiskni **Ctrl+C**

---

## Krok 2: Spusť v jednom čistém terminálu

```bash
cd "/Users/michellemuchova/Desktop/Projekt Cesťáky"
rm -rf .next
npm run build
npm run start
```

---

## Krok 3: Otevři prohlížeč

**http://localhost:3000**

---

## Alternativa: Dev režim

Pokud chceš dev režim (s hot reload):

```bash
cd "/Users/michellemuchova/Desktop/Projekt Cesťáky"
rm -rf .next
npm run dev
```

Pak otevři **http://localhost:3000** nebo **http://localhost:3001** (pokud 3000 je obsazený).

---

## Pokud stále nefunguje

1. **Zavři Cursor** a znovu ho otevři
2. Otevři nový terminál (Terminal → New Terminal)
3. Zopakuj Kroky 2 a 3
