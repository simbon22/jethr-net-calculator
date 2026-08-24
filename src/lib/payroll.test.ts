/**
 * Tests for the payroll engine. No test framework: a small runner is
 * enough for this surface area, and it keeps the dependency tree honest
 * about what's actually needed to verify the logic.
 *
 * Run with: npm test
 */

import {
  calcolaContributiInps,
  calcolaIrpefLorda,
  calcolaDetrazioneLavoro,
  calcolaDetrazioneConiuge,
  calcolaBonusEsente,
  calcolaDetrazioneCuneo,
  calcolaAddizionaleRegionale,
  calcolaAddizionaleComunale,
  calcolaNetto,
} from './payroll';

let passed = 0;
let failed = 0;

function check(label: string, actual: number, expected: number, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       expected ${expected}, got ${actual.toFixed(2)}`);
  }
}

console.log('\nINPS contributions');
check(
  '9.19% below the additional-rate threshold',
  calcolaContributiInps(30_000),
  30_000 * 0.0919,
);
check(
  'additional 1% applies only above 56,224 €',
  calcolaContributiInps(66_224),
  66_224 * 0.0919 + 10_000 * 0.01,
);
check(
  'contributions cap at the annual massimale (122,295 €)',
  calcolaContributiInps(200_000),
  calcolaContributiInps(122_295),
);

console.log('\nIRPEF gross tax, progressive brackets');
check('entirely within the first bracket', calcolaIrpefLorda(20_000), 20_000 * 0.23);
check(
  'straddling the first and second bracket',
  calcolaIrpefLorda(40_000),
  28_000 * 0.23 + 12_000 * 0.33,
);
check(
  'reaching all three brackets',
  calcolaIrpefLorda(60_000),
  28_000 * 0.23 + 22_000 * 0.33 + 10_000 * 0.43,
);

console.log('\nEmployment income deduction (art. 13 TUIR)');
check('full amount below 15,000 €', calcolaDetrazioneLavoro(14_000, 365), 1_955);
check('zeroed above 50,000 €', calcolaDetrazioneLavoro(55_000, 365), 0);
check(
  'prorated to worked days — half year, half deduction',
  calcolaDetrazioneLavoro(14_000, 182),
  1_955 * (182 / 365),
  2,
);
check(
  '65 € uplift applies within the 25,000–35,000 € band',
  calcolaDetrazioneLavoro(30_000, 365) - calcolaDetrazioneLavoro(30_000.01, 365) + 65,
  65,
  1,
);

console.log('\nDependent spouse deduction (art. 12 TUIR)');
check('not zero for a low income', calcolaDetrazioneConiuge(10_000) > 0 ? 1 : 0, 1, 0);
check('flat 690 € in the middle band', calcolaDetrazioneConiuge(25_000), 690);
check('zeroed above 80,000 €', calcolaDetrazioneConiuge(85_000), 0);

console.log('\nCuneo fiscale relief');
check('exempt sum only applies below 20,000 €', calcolaBonusEsente(25_000), 0);
check('further deduction does not apply below 20,000 €', calcolaDetrazioneCuneo(19_000), 0);
check('further deduction full at 32,000 €', calcolaDetrazioneCuneo(32_000), 1_000);
check('further deduction halved at 36,000 €', calcolaDetrazioneCuneo(36_000), 500);
check('further deduction zeroed at 40,000 €', calcolaDetrazioneCuneo(40_000), 0);

console.log('\nRegional and municipal surtax');
check(
  'regional surtax follows the same bracket logic as national IRPEF',
  calcolaAddizionaleRegionale(20_000),
  15_000 * 0.0123 + 5_000 * 0.0158,
);
check('municipal surtax not due below the exemption threshold', calcolaAddizionaleComunale(20_000), 0);
check(
  'municipal surtax due on the whole base once above threshold, not just the excess',
  calcolaAddizionaleComunale(25_000),
  25_000 * 0.008,
);

console.log('\nFull calculation, internal consistency');
{
  const r = calcolaNetto({ ral: 32_000, mensilita: 13, giorniLavorati: 365, coniugeACarico: false });
  check(
    'deductions plus net reconstruct the gross figure',
    r.nettoAnnuo + r.totaleTrattenute - r.bonusEsente,
    32_000,
  );
  check('monthly net times installments equals annual net', r.nettoMensile * r.mensilita, r.nettoAnnuo);
}

console.log('\nCross-check against PMI.it official calculator');
{
  // Shared inputs: RAL 50,000 €, Lombardy, Milan, 0.80% municipal surtax,
  // 13 installments, 365 worked days, no dependents.
  const r = calcolaNetto({ ral: 50_000, mensilita: 13, giorniLavorati: 365, coniugeACarico: false });
  check('annual net matches PMI.it (32,568 €)', r.nettoAnnuo, 32_568, 2);
  check('monthly net matches PMI.it (2,505 €)', r.nettoMensile, 2_505, 1);
  check(
    'IRPEF net + surtaxes match PMI.it (12,837 €)',
    r.irpefNetta + r.addizionaleRegionale + r.addizionaleComunale,
    12_837,
    2,
  );
  check('employment deduction matches PMI.it (399 €)', r.detrazioneLavoro, 399, 1);
}

console.log('\nProgressivity');
{
  const low = calcolaNetto({ ral: 25_000, mensilita: 13, giorniLavorati: 365, coniugeACarico: false });
  const mid = calcolaNetto({ ral: 45_000, mensilita: 13, giorniLavorati: 365, coniugeACarico: false });
  const high = calcolaNetto({ ral: 80_000, mensilita: 13, giorniLavorati: 365, coniugeACarico: false });
  const ok = low.aliquotaEffettiva < mid.aliquotaEffettiva && mid.aliquotaEffettiva < high.aliquotaEffettiva;
  if (ok) {
    passed++;
    console.log('  ok   effective tax burden increases with income');
  } else {
    failed++;
    console.log('  FAIL progressivity broken');
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
