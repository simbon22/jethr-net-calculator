/**
 * Motore di calcolo RAL → netto, anno d'imposta 2026.
 *
 * Funzioni pure, nessuna dipendenza dalla UI: la logica fiscale vive qui,
 * è tipizzata e testabile in isolamento. Ogni costante riporta la fonte
 * normativa da cui è tratta.
 */

export interface Scaglione {
  limite: number;
  aliquota: number;
}

export interface ParametriFiscali {
  anno: number;
  scaglioniIrpef: Scaglione[];
  inps: {
    aliquotaBase: number;
    aliquotaAggiuntiva: number;
    sogliaAggiuntiva: number;
    massimaleAnnuo: number;
  };
  detrazioneLavoro: {
    importoPieno: number;
    minimoIndeterminato: number;
    baseFasciaMedia: number;
    quotaVariabile: number;
    baseFasciaAlta: number;
    maggiorazione: number;
    maggiorazioneDa: number;
    maggiorazioneA: number;
  };
  cuneoFiscale: {
    bonusScaglioni: { limite: number; percentuale: number }[];
    sogliaBonus: number;
    detrazionePiena: number;
    sogliaPieno: number;
    sogliaAzzeramento: number;
  };
  coniugeACarico: {
    base: number;
    quotaVariabile: number;
    importoIntermedio: number;
    sogliaBassa: number;
    sogliaMedia: number;
    sogliaAlta: number;
  };
  addizionali: {
    regionale: { nome: string; scaglioni: Scaglione[] };
    comunale: { nome: string; aliquota: number; sogliaEsenzione: number };
  };
  giorniAnno: number;
}

export const PARAMETRI_2026: ParametriFiscali = {
  anno: 2026,

  // Art. 11 co. 1 TUIR (DPR 917/1986), come modificato da L. 199/2025
  // (Legge di Bilancio 2026) art. 1 co. 3: seconda aliquota dal 35% al 33%.
  scaglioniIrpef: [
    { limite: 28_000, aliquota: 0.23 },
    { limite: 50_000, aliquota: 0.33 },
    { limite: Infinity, aliquota: 0.43 },
  ],

  // Circolare INPS n. 6 del 30/01/2026.
  // L'1% aggiuntivo deriva dall'art. 3-ter D.L. 384/1992 conv. L. 438/1992.
  inps: {
    aliquotaBase: 0.0919,
    aliquotaAggiuntiva: 0.01,
    sogliaAggiuntiva: 56_224,
    massimaleAnnuo: 122_295,
  },

  // Art. 13 co. 1 TUIR, struttura introdotta dal D.Lgs. 216/2023.
  detrazioneLavoro: {
    importoPieno: 1_955,
    minimoIndeterminato: 690,
    baseFasciaMedia: 1_910,
    quotaVariabile: 1_190,
    baseFasciaAlta: 1_910,
    maggiorazione: 65,
    maggiorazioneDa: 25_000,
    maggiorazioneA: 35_000,
  },

  // Taglio del cuneo fiscale. Dal 2025 non è più esonero contributivo
  // (i contributi restano al 9,19% pieno) ma una doppia misura fiscale:
  // somma esente sotto i 20.000, ulteriore detrazione fino a 40.000.
  // Art. 1 co. 4 e 6 L. 207/2024, resi strutturali dalla L. 199/2025.
  cuneoFiscale: {
    bonusScaglioni: [
      { limite: 8_500, percentuale: 0.071 },
      { limite: 15_000, percentuale: 0.053 },
      { limite: 20_000, percentuale: 0.048 },
    ],
    sogliaBonus: 20_000,
    detrazionePiena: 1_000,
    sogliaPieno: 32_000,
    sogliaAzzeramento: 40_000,
  },

  // Art. 12 co. 1 lett. a) TUIR. Sono escluse le maggiorazioni minori
  // previste per la fascia 29.000–35.200 € (da 10 a 30 €).
  coniugeACarico: {
    base: 800,
    quotaVariabile: 110,
    importoIntermedio: 690,
    sogliaBassa: 15_000,
    sogliaMedia: 40_000,
    sogliaAlta: 80_000,
  },

  // Addizionale regionale: art. 72 l.r. Lombardia 10/2003, aliquote
  // progressive sugli stessi scaglioni IRPEF, in vigore dal 2022.
  // Addizionale comunale: delibera pubblicata sul Portale del
  // Federalismo Fiscale (MEF).
  addizionali: {
    regionale: {
      nome: 'Lombardia',
      scaglioni: [
        { limite: 15_000, aliquota: 0.0123 },
        { limite: 28_000, aliquota: 0.0158 },
        { limite: 50_000, aliquota: 0.0172 },
        { limite: Infinity, aliquota: 0.0173 },
      ],
    },
    comunale: { nome: 'Milano', aliquota: 0.008, sogliaEsenzione: 23_000 },
  },

  giorniAnno: 365,
};

export interface Ipotesi {
  ral: number;
  mensilita: number;
  giorniLavorati: number;
  coniugeACarico: boolean;
}

export const IPOTESI_DEFAULT: Ipotesi = {
  ral: 32_000,
  mensilita: 13,
  giorniLavorati: 365,
  coniugeACarico: false,
};

export interface RisultatoCalcolo {
  ral: number;
  contributiInps: number;
  imponibileFiscale: number;
  irpefLorda: number;
  detrazioneLavoro: number;
  detrazioneConiuge: number;
  detrazioneCuneo: number;
  detrazioniTotali: number;
  irpefNetta: number;
  bonusEsente: number;
  addizionaleRegionale: number;
  addizionaleComunale: number;
  totaleTrattenute: number;
  nettoAnnuo: number;
  nettoMensile: number;
  mensilita: number;
  aliquotaEffettiva: number;
  aliquotaMarginale: number;
}

/** Applica una scala progressiva a scaglioni su un imponibile. */
function applicaScaglioni(imponibile: number, scaglioni: Scaglione[]): number {
  let totale = 0;
  let precedente = 0;

  for (const s of scaglioni) {
    if (imponibile <= precedente) break;
    totale += (Math.min(imponibile, s.limite) - precedente) * s.aliquota;
    precedente = s.limite;
  }
  return totale;
}

/** Aliquota dello scaglione più alto raggiunto: quella sull'ultimo euro guadagnato. */
function trovaAliquotaMarginale(imponibile: number, scaglioni: Scaglione[]): number {
  for (const s of scaglioni) {
    if (imponibile <= s.limite) return s.aliquota;
  }
  return scaglioni[scaglioni.length - 1].aliquota;
}

/**
 * Contributi previdenziali a carico del lavoratore.
 * Base 9,19%, +1% sulla quota che eccede la prima fascia di retribuzione
 * pensionabile, il tutto entro il massimale annuo.
 */
export function calcolaContributiInps(
  ral: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const { aliquotaBase, aliquotaAggiuntiva, sogliaAggiuntiva, massimaleAnnuo } = p.inps;
  const imponibile = Math.min(ral, massimaleAnnuo);

  let contributi = imponibile * aliquotaBase;
  if (imponibile > sogliaAggiuntiva) {
    contributi += (imponibile - sogliaAggiuntiva) * aliquotaAggiuntiva;
  }
  return contributi;
}

/** IRPEF lorda per scaglioni progressivi. */
export function calcolaIrpefLorda(
  imponibile: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  return applicaScaglioni(imponibile, p.scaglioniIrpef);
}

/**
 * Detrazione per redditi di lavoro dipendente (art. 13 co. 1 TUIR).
 * Va rapportata ai giorni di lavoro nell'anno.
 */
export function calcolaDetrazioneLavoro(
  reddito: number,
  giorniLavorati: number = 365,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const d = p.detrazioneLavoro;
  let detrazione: number;

  if (reddito <= 15_000) {
    detrazione = d.importoPieno;
  } else if (reddito <= 28_000) {
    detrazione = d.baseFasciaMedia + d.quotaVariabile * ((28_000 - reddito) / 13_000);
  } else if (reddito <= 50_000) {
    detrazione = d.baseFasciaAlta * ((50_000 - reddito) / 22_000);
  } else {
    detrazione = 0;
  }

  if (reddito > d.maggiorazioneDa && reddito <= d.maggiorazioneA) {
    detrazione += d.maggiorazione;
  }

  const quota = giorniLavorati / p.giorniAnno;
  const ragguagliata = detrazione * quota;

  // Per il tempo indeterminato la detrazione non scende sotto il minimo
  // di legge, anch'esso rapportato ai giorni.
  const minimo = reddito <= 15_000 ? d.minimoIndeterminato * quota : 0;

  return Math.max(minimo, Math.max(0, ragguagliata));
}

/** Detrazione per coniuge a carico (art. 12 co. 1 lett. a TUIR). */
export function calcolaDetrazioneConiuge(
  reddito: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const c = p.coniugeACarico;

  if (reddito <= c.sogliaBassa) {
    return Math.max(0, c.base - c.quotaVariabile * (reddito / c.sogliaBassa));
  }
  if (reddito <= c.sogliaMedia) {
    return c.importoIntermedio;
  }
  if (reddito <= c.sogliaAlta) {
    return c.importoIntermedio * ((c.sogliaAlta - reddito) / 40_000);
  }
  return 0;
}

/**
 * Somma esente da taglio del cuneo (art. 1 co. 4 L. 207/2024).
 * Non è una detrazione: è una somma che non concorre a formare il reddito
 * ed è erogata direttamente in busta paga. Spetta fino a 20.000 €.
 */
export function calcolaBonusEsente(
  reddito: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const c = p.cuneoFiscale;
  if (reddito > c.sogliaBonus) return 0;

  for (const s of c.bonusScaglioni) {
    if (reddito <= s.limite) return reddito * s.percentuale;
  }
  return 0;
}

/**
 * Ulteriore detrazione da taglio del cuneo (art. 1 co. 6 L. 207/2024).
 * Piena da 20.001 a 32.000, poi decrescente fino ad azzerarsi a 40.000.
 */
export function calcolaDetrazioneCuneo(
  reddito: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const c = p.cuneoFiscale;

  if (reddito <= c.sogliaBonus || reddito > c.sogliaAzzeramento) return 0;
  if (reddito <= c.sogliaPieno) return c.detrazionePiena;

  return c.detrazionePiena * ((c.sogliaAzzeramento - reddito) / 8_000);
}

/** Addizionale regionale, progressiva sugli stessi scaglioni IRPEF. */
export function calcolaAddizionaleRegionale(
  imponibile: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  return applicaScaglioni(imponibile, p.addizionali.regionale.scaglioni);
}

/**
 * Addizionale comunale. La soglia di Milano non è una franchigia:
 * sotto non è dovuta, sopra è dovuta sull'intero imponibile.
 */
export function calcolaAddizionaleComunale(
  imponibile: number,
  p: ParametriFiscali = PARAMETRI_2026,
): number {
  const c = p.addizionali.comunale;
  return imponibile > c.sogliaEsenzione ? imponibile * c.aliquota : 0;
}

/**
 * Calcolo completo. Restituisce ogni voce intermedia e non solo il risultato:
 * il valore del prospetto è mostrare il percorso, non il numero finale.
 */
export function calcolaNetto(
  ipotesi: Ipotesi,
  p: ParametriFiscali = PARAMETRI_2026,
): RisultatoCalcolo {
  const { ral, mensilita, giorniLavorati, coniugeACarico } = ipotesi;

  const contributiInps = calcolaContributiInps(ral, p);

  // I contributi obbligatori sono deducibili dal reddito imponibile.
  const imponibileFiscale = ral - contributiInps;

  const irpefLorda = calcolaIrpefLorda(imponibileFiscale, p);

  const detrazioneLavoro = calcolaDetrazioneLavoro(imponibileFiscale, giorniLavorati, p);
  const detrazioneConiuge = coniugeACarico ? calcolaDetrazioneConiuge(imponibileFiscale, p) : 0;
  const detrazioneCuneo = calcolaDetrazioneCuneo(imponibileFiscale, p);

  const detrazioniTotali = detrazioneLavoro + detrazioneConiuge + detrazioneCuneo;
  const irpefNetta = Math.max(0, irpefLorda - detrazioniTotali);

  const bonusEsente = calcolaBonusEsente(imponibileFiscale, p);

  // Se le detrazioni azzerano l'IRPEF, non sono dovute nemmeno le addizionali.
  const addizionaleRegionale =
    irpefNetta > 0 ? calcolaAddizionaleRegionale(imponibileFiscale, p) : 0;
  const addizionaleComunale =
    irpefNetta > 0 ? calcolaAddizionaleComunale(imponibileFiscale, p) : 0;

  const totaleTrattenute =
    contributiInps + irpefNetta + addizionaleRegionale + addizionaleComunale;

  // Il bonus esente si somma al netto: non riduce l'imposta, è una somma
  // erogata in busta paga.
  const nettoAnnuo = ral - totaleTrattenute + bonusEsente;

  return {
    ral,
    contributiInps,
    imponibileFiscale,
    irpefLorda,
    detrazioneLavoro,
    detrazioneConiuge,
    detrazioneCuneo,
    detrazioniTotali,
    irpefNetta,
    bonusEsente,
    addizionaleRegionale,
    addizionaleComunale,
    totaleTrattenute,
    nettoAnnuo,
    nettoMensile: nettoAnnuo / mensilita,
    mensilita,
    aliquotaEffettiva: ral > 0 ? (totaleTrattenute - bonusEsente) / ral : 0,
    aliquotaMarginale: trovaAliquotaMarginale(imponibileFiscale, p.scaglioniIrpef),
  };
}
