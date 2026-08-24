import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { calcolaNetto, IPOTESI_DEFAULT, PARAMETRI_2026, type Ipotesi } from './lib/payroll';
import { AnimatedNumber, euro, percentuale } from './components/AnimatedNumber';
import { Waterfall } from './components/Waterfall';

const PRESET = [25_000, 32_000, 40_000, 55_000, 80_000];
const MENSILITA = [12, 13, 14];

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const },
  }),
};

type Stile = 'neutro' | 'trattenuta' | 'credito' | 'subtotale';

export default function App() {
  const [ipotesi, setIpotesi] = useState<Ipotesi>(IPOTESI_DEFAULT);
  const r = useMemo(() => calcolaNetto(ipotesi), [ipotesi]);

  const set = <K extends keyof Ipotesi>(chiave: K, valore: Ipotesi[K]) =>
    setIpotesi((p) => ({ ...p, [chiave]: valore }));

  const righe: { voce: string; nota: string; valore: number; stile: Stile }[] = [
    {
      voce: 'Retribuzione annua lorda',
      nota: 'valore contrattuale di partenza',
      valore: r.ral,
      stile: 'neutro',
    },
    {
      voce: 'Contributi previdenziali INPS',
      nota:
        r.ral > PARAMETRI_2026.inps.sogliaAggiuntiva
          ? '9,19% + 1% sulla quota oltre 56.224 €'
          : '9,19% della retribuzione lorda',
      valore: -r.contributiInps,
      stile: 'trattenuta',
    },
    {
      voce: 'Imponibile fiscale',
      nota: 'i contributi obbligatori sono deducibili',
      valore: r.imponibileFiscale,
      stile: 'subtotale',
    },
    {
      voce: 'IRPEF lorda',
      nota: `scaglioni 23% · 33% · 43% — marginale ${percentuale(r.aliquotaMarginale)}`,
      valore: -r.irpefLorda,
      stile: 'trattenuta',
    },
    {
      voce: 'Detrazione da lavoro dipendente',
      nota:
        ipotesi.giorniLavorati < 365
          ? `art. 13 TUIR — rapportata a ${ipotesi.giorniLavorati} giorni su 365`
          : 'art. 13 TUIR — decresce al crescere del reddito',
      valore: r.detrazioneLavoro,
      stile: 'credito',
    },
    ...(ipotesi.coniugeACarico
      ? [
          {
            voce: 'Detrazione per coniuge a carico',
            nota: 'art. 12 TUIR — decresce fino ad azzerarsi a 80.000 €',
            valore: r.detrazioneConiuge,
            stile: 'credito' as Stile,
          },
        ]
      : []),
    {
      voce: 'Ulteriore detrazione — taglio del cuneo',
      nota:
        r.detrazioneCuneo > 0
          ? 'L. 207/2024 — piena fino a 32.000 €, poi decresce'
          : 'non spetta a questo livello di reddito',
      valore: r.detrazioneCuneo,
      stile: 'credito',
    },
    {
      voce: 'IRPEF effettivamente dovuta',
      nota: 'lorda al netto delle detrazioni spettanti',
      valore: -r.irpefNetta,
      stile: 'subtotale',
    },
    {
      voce: 'Addizionale regionale Lombardia',
      nota: 'progressiva: 1,23% · 1,58% · 1,72% · 1,73%',
      valore: -r.addizionaleRegionale,
      stile: 'trattenuta',
    },
    {
      voce: 'Addizionale comunale Milano',
      nota:
        r.addizionaleComunale === 0
          ? 'non dovuta sotto i 23.000 € di imponibile'
          : '0,80% sull’intero imponibile, oltre soglia',
      valore: -r.addizionaleComunale,
      stile: 'trattenuta',
    },
    ...(r.bonusEsente > 0
      ? [
          {
            voce: 'Somma esente — taglio del cuneo',
            nota: 'L. 207/2024 — erogata in busta, non riduce l’imposta',
            valore: r.bonusEsente,
            stile: 'credito' as Stile,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-16 sm:pt-24">

      <motion.header initial="hidden" animate="show" variants={fadeUp} custom={0} className="mb-10">
        <h1 className="font-display text-[clamp(38px,7vw,66px)] leading-[1.02] tracking-[-.02em] text-ink">
          Dove finisce<br />il tuo <em className="italic text-moss">lordo</em>
        </h1>
        <p className="mt-5 max-w-[54ch] text-[15px] leading-relaxed text-ink-soft">
          Tra la retribuzione scritta nel contratto e il denaro che arriva sul conto si
          interpongono contributi, imposta progressiva, detrazioni e tributi locali.
          Questo prospetto li mostra uno per uno, per un impiegato del settore privato
          residente a Milano.
        </p>
      </motion.header>

      {/* console */}
      <motion.section
        initial="hidden" animate="show" variants={fadeUp} custom={1}
        className="grain relative mb-6 overflow-hidden rounded-2xl border border-surface-edge bg-white shadow-card"
      >
        <div className="p-6 sm:p-8">
          <label htmlFor="ral" className="mb-3 block font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-faint">
            Retribuzione annua lorda
          </label>

          <div className="flex flex-wrap items-end gap-5">
            <div className="flex min-w-[220px] flex-1 items-baseline gap-2 border-b-2 border-ink/85 pb-2 transition-colors focus-within:border-moss">
              <span className="font-display text-3xl text-ink-faint">€</span>
              <input
                id="ral"
                type="number"
                inputMode="numeric"
                value={ipotesi.ral}
                min={0}
                max={500_000}
                step={1_000}
                onChange={(e) => set('ral', Math.max(0, Number(e.target.value) || 0))}
                className="w-full min-w-0 bg-transparent font-mono text-[clamp(28px,5vw,38px)] font-medium tabular-nums text-ink outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {PRESET.map((v) => (
                <button
                  key={v}
                  onClick={() => set('ral', v)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-all ${
                    ipotesi.ral === v
                      ? 'border-moss bg-moss text-white'
                      : 'border-surface-edge text-ink-soft hover:border-ink/40 hover:text-ink'
                  }`}
                >
                  {euro(v)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* parametri secondari */}
        <div className="grid gap-px border-t border-surface-edge bg-surface-edge sm:grid-cols-3">
          <div className="bg-white px-6 py-5">
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[.13em] text-ink-faint">
              Mensilità
            </div>
            <div className="flex gap-1.5">
              {MENSILITA.map((m) => (
                <button
                  key={m}
                  onClick={() => set('mensilita', m)}
                  className={`flex-1 rounded-lg border py-1.5 font-mono text-[12px] transition-all ${
                    ipotesi.mensilita === m
                      ? 'border-ink bg-ink text-white'
                      : 'border-surface-edge text-ink-soft hover:border-ink/40'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white px-6 py-5">
            <div className="mb-2.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[.13em] text-ink-faint">
              <span>Giorni lavorati</span>
              <span className="tnum text-ink">{ipotesi.giorniLavorati}</span>
            </div>
            <input
              type="range"
              min={1}
              max={365}
              value={ipotesi.giorniLavorati}
              onChange={(e) => set('giorniLavorati', Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-edge accent-moss"
              aria-label="Giorni di lavoro nell'anno"
            />
            <div className="mt-1.5 font-mono text-[9.5px] text-ink-faint">
              rapporta le detrazioni al periodo lavorato
            </div>
          </div>

          <div className="bg-white px-6 py-5">
            <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[.13em] text-ink-faint">
              Coniuge a carico
            </div>
            <button
              onClick={() => set('coniugeACarico', !ipotesi.coniugeACarico)}
              role="switch"
              aria-checked={ipotesi.coniugeACarico}
              className="flex w-full items-center gap-3"
            >
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  ipotesi.coniugeACarico ? 'bg-moss' : 'bg-surface-edge'
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ${
                    ipotesi.coniugeACarico ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </span>
              <span className="font-mono text-[12px] text-ink-soft">
                {ipotesi.coniugeACarico ? 'Sì' : 'No'}
              </span>
            </button>
          </div>
        </div>
      </motion.section>

      {/* verdetto */}
      <motion.section
        initial="hidden" animate="show" variants={fadeUp} custom={2}
        className="mb-6 grid gap-4 sm:grid-cols-5"
      >
        <div className="rounded-2xl border border-moss/20 bg-gradient-to-br from-moss-wash to-white p-7 shadow-card sm:col-span-3">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[.14em] text-moss/70">
            Netto in busta, al mese
          </div>
          <div className="flex items-baseline gap-1.5 font-display text-[clamp(42px,8vw,60px)] leading-none tracking-[-.02em] text-moss">
            <span className="text-[.45em] text-moss/50">€</span>
            <AnimatedNumber value={r.nettoMensile} />
          </div>
          <div className="mt-3 font-mono text-[11px] text-ink-faint">
            su {r.mensilita} mensilità
          </div>
        </div>

        <div className="rounded-2xl border border-surface-edge bg-white p-7 shadow-card sm:col-span-2">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-faint">
            Netto annuale
          </div>
          <div className="flex items-baseline gap-1.5 font-display text-[clamp(30px,5.5vw,42px)] leading-none tracking-[-.02em] text-ink">
            <span className="text-[.45em] text-ink-faint">€</span>
            <AnimatedNumber value={r.nettoAnnuo} />
          </div>
          <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-faint">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-clay" />
            prelievo complessivo {percentuale(r.aliquotaEffettiva)}
          </div>
        </div>
      </motion.section>

      {/* waterfall */}
      <motion.section
        initial="hidden" animate="show" variants={fadeUp} custom={3}
        className="mb-6 rounded-2xl border border-surface-edge bg-white p-6 shadow-card sm:p-7"
      >
        <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-faint">
          La discesa
        </div>
        <p className="mb-5 text-[13px] text-ink-faint">
          Ogni gradino è una trattenuta che si stacca dal lordo.
        </p>
        <Waterfall r={r} />
      </motion.section>

      {/* prospetto */}
      <motion.section
        initial="hidden" animate="show" variants={fadeUp} custom={4}
        className="mb-6 overflow-hidden rounded-2xl border border-surface-edge bg-white shadow-card"
      >
        <div className="border-b border-surface-edge px-6 py-5 sm:px-7">
          <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-faint">
            Prospetto analitico
          </div>
        </div>

        <div className="divide-y divide-surface-edge">
          {righe.map((riga, i) => (
            <motion.div
              key={riga.voce}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: i * 0.025 } }}
              className={`flex items-baseline justify-between gap-6 px-6 py-3.5 sm:px-7 ${
                riga.stile === 'subtotale' ? 'bg-surface-sunk/60' : ''
              }`}
            >
              <div className="min-w-0">
                <div className={`text-[14px] ${riga.stile === 'subtotale' ? 'font-semibold text-ink' : 'text-ink'}`}>
                  {riga.voce}
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] leading-snug text-ink-faint">
                  {riga.nota}
                </div>
              </div>
              <div
                className={`tnum shrink-0 whitespace-nowrap font-mono text-[13.5px] ${
                  riga.stile === 'trattenuta' ? 'text-clay'
                  : riga.stile === 'credito' ? 'text-brass'
                  : riga.stile === 'subtotale' ? 'font-semibold text-ink'
                  : 'text-ink'
                }`}
              >
                {riga.valore < 0 ? '−' : ''}€ {euro(Math.abs(riga.valore))}
              </div>
            </motion.div>
          ))}

          <div className="flex items-baseline justify-between gap-6 border-t-2 border-ink/85 bg-surface-sunk/60 px-6 py-4 sm:px-7">
            <div>
              <div className="text-[14px] font-semibold text-ink">Totale trattenute</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink-faint">
                prelievo effettivo del {percentuale(r.aliquotaEffettiva)} sul lordo
              </div>
            </div>
            <div className="tnum shrink-0 font-mono text-[14px] font-semibold text-clay">
              −€ {euro(r.totaleTrattenute)}
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 bg-moss-wash px-6 py-5 sm:px-7">
            <div className="text-[15px] font-semibold text-moss">Netto annuale</div>
            <div className="tnum shrink-0 font-mono text-[17px] font-semibold text-moss">
              € {euro(r.nettoAnnuo)}
            </div>
          </div>
        </div>
      </motion.section>

      {/* cosa resta fuori */}
      <motion.section
        initial="hidden" animate="show" variants={fadeUp} custom={5}
        className="mb-10 rounded-2xl border border-brass/25 bg-brass-wash/50 p-6 sm:p-7"
      >
        <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[.14em] text-brass">
          Cosa resta fuori dal calcolo
        </div>
        <div className="grid gap-x-10 gap-y-3 text-[13px] leading-relaxed text-ink-soft sm:grid-cols-2">
          <p>
            <b className="font-medium text-ink">* Figli a carico.</b> Dal 2022 l’Assegno Unico
            ha sostituito le detrazioni per i figli under 21: restano solo per i figli dai 21 anni
            in su. Includerle darebbe l’impressione sbagliata che incidano nel caso standard.
          </p>
          <p>
            <b className="font-medium text-ink">* Trattamento integrativo.</b> L’ex bonus di
            1.200 € per redditi bassi è subordinato a una verifica di capienza che dipende da oneri
            detraibili qui non modellati.
          </p>
          <p>
            <b className="font-medium text-ink">* Conguagli di fine anno.</b> Il calcolo è annuale
            a consuntivo. In busta paga detrazioni e addizionali si distribuiscono mese per mese
            e si conguagliano a dicembre o a gennaio successivo: il netto di un singolo mese non è
            mai esattamente un tredicesimo del netto annuo.
          </p>
          <p>
            <b className="font-medium text-ink">* Componenti variabili.</b> Premi di risultato a
            imposta sostitutiva, straordinari, welfare aziendale, fringe benefit, TFR erogato in
            busta, oneri deducibili e detraibili diversi da quelli indicati.
          </p>
          <p>
            <b className="font-medium text-ink">* Specificità del CCNL.</b> Ogni contratto
            collettivo ha minimi, scatti di anzianità ed elementi propri: il prototipo lavora
            sulla sola RAL complessiva.
          </p>
          <p>
            <b className="font-medium text-ink">* Sgravi contributivi.</b> Assunzioni agevolate,
            esoneri per specifiche categorie e riduzioni a carico del datore non incidono sul
            netto del dipendente e sono fuori perimetro.
          </p>
        </div>
      </motion.section>

      <motion.footer
        initial="hidden" animate="show" variants={fadeUp} custom={6}
        className="grid gap-8 border-t border-surface-edge pt-8 text-[13px] leading-relaxed text-ink-faint sm:grid-cols-2"
      >
        <div>
          <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
            Fonti normative
          </h3>
          <ul className="space-y-1.5">
            <li>Aliquote IRPEF — art. 11 TUIR, modificato da L. 199/2025 art. 1 co. 3</li>
            <li>Contributi, soglie e massimale — circolare INPS n. 6 del 30 gennaio 2026</li>
            <li>Detrazione da lavoro — art. 13 TUIR (D.Lgs. 216/2023)</li>
            <li>Detrazione coniuge — art. 12 TUIR</li>
            <li>Taglio del cuneo — art. 1 co. 4 e 6 L. 207/2024, resi strutturali</li>
            <li>Addizionale regionale — art. 72 l.r. Lombardia 10/2003</li>
            <li>Addizionale comunale — delibera su Portale del Federalismo Fiscale (MEF)</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[.14em] text-ink-soft">
            Verifica
          </h3>
          <p>
            L’output è stato confrontato con il calcolatore di PMI.it a parità di ipotesi
            (RAL 50.000 €, Lombardia, addizionale comunale 0,80%, 13 mensilità, 365 giorni,
            nessun familiare a carico): i valori coincidono, netto annuo compreso.
          </p>
        </div>
      </motion.footer>

    </div>
  );
}
