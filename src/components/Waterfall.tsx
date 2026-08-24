import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { RisultatoCalcolo } from '../lib/payroll';
import { euro } from './AnimatedNumber';

interface Barra {
  nome: string;
  base: number;
  valore: number;
  colore: string;
  reale: number;
}

/**
 * Waterfall: ogni trattenuta è un gradino che scende dal lordo al netto.
 * Recharts non ha un waterfall nativo: si costruisce impilando una barra
 * trasparente di offset sotto quella visibile.
 */
export function Waterfall({ r }: { r: RisultatoCalcolo }) {
  const passi: Barra[] = [];
  let corrente = r.ral;

  passi.push({ nome: 'Lordo', base: 0, valore: r.ral, colore: '#c9d3ce', reale: r.ral });

  const trattenute = [
    { nome: 'INPS', importo: r.contributiInps },
    { nome: 'IRPEF', importo: r.irpefNetta },
    { nome: 'Add. reg.', importo: r.addizionaleRegionale },
    { nome: 'Add. com.', importo: r.addizionaleComunale },
  ];

  for (const t of trattenute) {
    corrente -= t.importo;
    passi.push({
      nome: t.nome,
      base: corrente,
      valore: t.importo,
      colore: '#a8563a',
      reale: -t.importo,
    });
  }

  if (r.bonusEsente > 0) {
    passi.push({
      nome: 'Bonus',
      base: corrente,
      valore: r.bonusEsente,
      colore: '#8a7538',
      reale: r.bonusEsente,
    });
  }

  passi.push({ nome: 'Netto', base: 0, valore: r.nettoAnnuo, colore: '#1f5c47', reale: r.nettoAnnuo });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="h-[250px] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={passi} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
          <XAxis
            dataKey="nome"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7c8a83', fontSize: 10.5, fontFamily: 'JetBrains Mono' }}
            dy={6}
          />
          <YAxis hide domain={[0, r.ral * 1.05]} />
          <Tooltip
            cursor={{ fill: 'rgba(15,22,19,.035)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Barra;
              const negativo = d.reale < 0;
              return (
                <div className="rounded-lg border border-surface-edge bg-white px-3 py-2 shadow-lift">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">{d.nome}</div>
                  <div className={`tnum font-mono text-sm font-semibold ${negativo ? 'text-clay' : 'text-moss'}`}>
                    {negativo ? '−' : ''}€ {euro(Math.abs(d.reale))}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="valore" stackId="w" radius={[3, 3, 0, 0]} animationDuration={650}>
            {passi.map((p, i) => (
              <Cell key={i} fill={p.colore} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
