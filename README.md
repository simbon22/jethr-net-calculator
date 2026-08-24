# Da RAL a netto — prospetto retributivo 2026

Prototipo per il task Jet HR. Riceve una retribuzione annua lorda e restituisce il netto annuale e mensile, scomponendo ogni trattenuta che si interpone fra i due.

**Demo:** https://jethr-netcalculator-test.vercel.app

---

## Fonti

Per i parametri ho preferito la norma agli aggregatori — i portali di consulenza fiscale per orientarmi, ma non sempre aggiornati, e su una soglia o un'aliquota sbagliata il calcolatore continua a girare senza segnalare nulla.

| Parametro | Fonte |
|---|---|
| Aliquote IRPEF | Art. 11 TUIR, come modificato da L. 199/2025 (Bilancio 2026) art. 1 co. 3 |
| Contributi INPS, soglie e massimale | Circolare INPS n. 6 del 30 gennaio 2026 |
| Detrazione da lavoro dipendente | Art. 13 TUIR (D.Lgs. 216/2023) |
| Detrazione coniuge a carico | Art. 12 co. 1 lett. a TUIR |
| Taglio del cuneo fiscale | Art. 1 co. 4 e 6 L. 207/2024, reso strutturale dalla L. 199/2025 |
| Addizionale regionale Lombardia | Art. 72 l.r. 10/2003 |
| Addizionale comunale Milano | Delibera sul Portale del Federalismo Fiscale (MEF) |

Due parametri specifici: la soglia INPS per l'1% aggiuntivo è 56.224 € (circolare INPS 6/2026, non 52.190 € come su diversi siti). L'addizionale regionale Lombardia è a scaglioni (1,23%–1,73%), non un'aliquota fissa.

## Verifica

Ho confrontato l'output con il calcolatore ufficiale di PMI.it, stessa RAL e stesse ipotesi (50.000 €, Lombardia, Milano, 13 mensilità, nessun familiare a carico):

| | Prototipo | PMI.it |
|---|---|---|
| Netto annuo | 32.568 € | 32.568 € |
| Netto mensile | 2.505 € | 2.505 € |
| IRPEF + addizionali | 12.837 € | 12.837 € |
| Detrazione lavoro | 399 € | 399 € |

Combacia. Il test automatico (`npm test`) include questo confronto insieme ad altri 24 sui casi limite, così una modifica ai parametri che rompe qualcosa si vede subito.

---

## Struttura

Vite + React + TypeScript, Tailwind per lo stile, Framer Motion per le animazioni, Recharts per il grafico.

```
src/lib/payroll.ts          motore di calcolo, funzioni pure
src/lib/payroll.test.ts     28 test, incluso il confronto con PMI.it
src/components/             numero animato, grafico a cascata
src/App.tsx                 interfaccia e stato
```

```
RAL
 − contributi INPS (9,19%, +1% oltre 56.224 €)
 = imponibile fiscale
 − IRPEF per scaglioni (23/33/43%)
 − detrazione lavoro dipendente (ragguagliata ai giorni lavorati)
 − detrazione coniuge, se selezionata
 − ulteriore detrazione cuneo fiscale
 = IRPEF netta
 − addizionale regionale (a scaglioni)
 − addizionale comunale (esente sotto 23.000 €, poi sull'intero imponibile)
 + somma esente cuneo fiscale, se reddito ≤ 20.000 €
 = netto annuo → diviso mensilità
```

## Cosa non copre

- **Trattamento integrativo** — dipende da una verifica di capienza su oneri detraibili che qui non sono modellati.
- **Conguagli** — il calcolo è annuale a consuntivo, non riproduce la distribuzione mese per mese che avviene in un cedolino reale.
- **Componenti variabili** — premi a tassazione agevolata, straordinari, welfare, fringe benefit.
- **CCNL specifici** — minimi contrattuali e scatti di anzianità.
- **Sgravi contributivi al datore** — non toccano il netto del dipendente.

Mensilità, giorni lavorati e coniuge a carico sono invece selezionabili nell'interfaccia: non sono semplificazioni ma variabili reali del caso richiesto, isolate per vedere quanto pesa ciascuna.

## Eseguire

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 28 test
npm run build    # build di produzione, singolo file HTML
```

---