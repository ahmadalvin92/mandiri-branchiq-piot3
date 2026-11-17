import * as XLSX from 'xlsx';
import metricDefinitionsTemplate from '../data/metricDefinitions.json' with { type: 'json' };

export const CAT_ORDER = ['DPK', 'Kredit', 'Livin', 'Kopra', 'Acquiring', 'GMM', 'Ekosistem'];
export const CAT_ROWS = { 8: 'DPK', 20: 'Kredit', 49: 'Livin', 56: 'Kopra', 64: 'Acquiring', 79: 'GMM', 86: 'Ekosistem' };
export const CAT_HEADER_ROW_BY_NAME = { DPK: 8, Kredit: 20, Livin: 49, Kopra: 56, Acquiring: 64, GMM: 79, Ekosistem: 86 };

export const CATEGORY_MULTIPLIERS = {
  DPK: 30,
  Kredit: 20,
  Livin: 15,
  Kopra: 10,
  Acquiring: 15,
  GMM: 5,
  Ekosistmen: 5,
  Ekosistem: 5
};

export const FALLBACK_CATS = {
  DPK: 61,
  Kredit: 395,
  Livin: 397,
  Kopra: 401,
  Acquiring: 399,
  GMM: 403,
  Ekosistem: 390
};

/**
 * Exact Excel ROUND(x, n) implementation from branchiq-dashboard
 */
export function xround(x, n = 2) {
  const p = Math.pow(10, n);
  return Math.sign(x) * Math.floor(Math.abs(x) * p + 0.5 + 1e-9) / p;
}

/**
 * Calculate ACV (achievement) for a single metric given real & target values
 * Matches branchiq-dashboard & Excel formula:
 * - Quality (inv): (H === I) ? 1 : (I ? Math.max(0, xround(1 - (H - I)/I)) : 0)
 * - Normal: I ? (rnd ? xround(H/I) : H/I) : 0
 */
export function calcAcv(real, target, isQuality, rndAcv = true) {
  if (isQuality) {
    if (real === target) return 1.0;
    if (!target || target === 0) return 0.0;
    return Math.max(0, xround(1 - (real - target) / target, 2));
  } else {
    if (!target || target === 0) return 0.0;
    return rndAcv ? xround(real / target, 2) : (real / target);
  }
}

/**
 * Calculate score for a single metric
 */
export function calcMetricScore(real, target, bobot, category, isQuality, rndAcv = true, scored = true) {
  const acv = calcAcv(real, target, isQuality, rndAcv);
  const maxAcv = Math.min(1.0, Math.max(0.0, acv));
  const mult = CATEGORY_MULTIPLIERS[category] || 0;
  const used = Boolean(scored && bobot > 0);
  const maxScore = used ? Number((bobot * mult).toFixed(4)) : 0;
  const score = scored ? Number((maxAcv * bobot * mult).toFixed(4)) : 0;
  const scoreGap = used ? Number(Math.max(0, (1 - maxAcv) * bobot * mult).toFixed(4)) : 0;
  return { acv: Number(acv.toFixed(4)), maxAcv: Number(maxAcv.toFixed(4)), score, maxScore, scoreGap, used };
}

/**
 * Action text ("Yang perlu dikejar") ported from branchiq-dashboard
 */
export function getActionText(metricItem, formatFn) {
  const H = Number(metricItem.real) || 0;
  const I = Number(metricItem.target) || 0;
  if (!I) return 'Target belum tersedia di file';
  if (metricItem.isQuality) {
    const d = H - I;
    if (d > 0) {
      return `Turunkan ${metricItem.isPct ? (d * 100).toFixed(2) + ' pp' : (formatFn ? formatFn(d) : d.toFixed(2))} (ke ≤ ${formatFn ? formatFn(I) : I.toFixed(2)})`;
    }
    return 'Sudah di bawah batas target';
  }
  const d = I - H;
  if (d > 0) {
    const pct = ((d / I) * 100).toFixed(1).replace('.', ',') + '%';
    return `Tambah +${formatFn ? formatFn(d) : d.toFixed(2)} lagi (${pct} dari target)`;
  }
  return 'Sudah capai target (≥100%)';
}

/**
 * Rule-based default strategy ("Cara mengejar") ported from branchiq-dashboard
 */
export function getDefaultStrategyText(x) {
  const t = `${x.category || ''} ${x.metric || ''} ${x.subMetric || ''}`.toLowerCase();
  if (x.isQuality) {
    return 'Kualitas kredit: makin kecil makin baik. Monitor debitur DPD 1–30 tiap hari, prioritaskan penagihan debitur dengan outstanding terbesar, dan tawarkan restrukturisasi sebelum turun ke Kol 2/NPL.';
  }
  if (x.category === 'DPK') {
    if (/akuisisi giro/.test(t)) return 'Buka rekening giro baru: prospek badan usaha, UMKM, dan instansi di sekitar cabang. Bisa juga cross-sell ke nasabah tabungan pemilik usaha.';
    if (/ntb/.test(t)) return 'Akuisisi nasabah New To Bank: datangi komunitas, perusahaan, dan tenant gedung di sekitar cabang, minta referral dari nasabah existing, dan buka rekening on-the-spot.';
    if (/avgbal|average/.test(t) && /giro/.test(t)) return 'Average balance giro naik kalau dana masuk lebih awal di bulan. Dorong nasabah badan usaha menaruh dana operasional/settlement di giro Mandiri sejak awal bulan dan jaga dana besar agar tidak keluar.';
    if (/giro/.test(t)) return 'Ending balance giro: kejar penempatan dana nasabah badan usaha sebelum tutup bulan dan follow-up rekening giro yang saldonya turun.';
    if (/avgbal|average/.test(t)) return 'Average balance naik kalau dana masuk lebih awal dan bertahan sebulan penuh. Kejar top-up di awal bulan, jaga retensi nasabah bersaldo besar, dorong rekening payroll.';
    if (/3p/.test(t)) return 'Dorong penempatan dana baru ke produk 3P (Tabungan Mandiri, Bisnis, Valas) dan jaga saldo nasabah existing tidak berpindah ke bank lain.';
    return 'Kejar penempatan dana sebelum tutup bulan, follow-up nasabah yang saldonya turun, dan akuisisi rekening payroll.';
  }
  if (x.category === 'Kredit') {
    const book = /booking|kartu baru/.test(t);
    if (/kpr/.test(t)) return book ? 'Booking KPR: perkuat kerja sama dengan developer dan agen properti, ikut pameran, dan percepat proses approval agar pipeline cepat cair.' : 'Baki debet KPR: tambah booking baru dan cegah pelunasan dipercepat / take-over ke bank lain.';
    if (/autoloan/.test(t)) return book ? 'Booking Autoloan: aktifkan kerja sama dealer/showroom dan mitra leasing, tawarkan ke nasabah payroll.' : 'Baki debet Autoloan: naik lewat booking baru; jaga agar tidak banyak pelunasan awal.';
    if (/cc|kartu/.test(t)) return /kartu/.test(t) ? 'Kartu baru: cross-sell kartu kredit ke nasabah payroll/prioritas yang eligible, beri target harian per frontliner.' : 'Baki debet CC: dorong aktivasi kartu dan pemakaian (program cicilan, promo merchant).';
    if (/ksm/.test(t)) return book ? 'Booking KSM: tawarkan ke pegawai instansi/perusahaan yang payroll di Mandiri.' : 'Baki debet KSM: tambah booking baru dan tawarkan top-up ke debitur existing.';
    if (/kum|kur/.test(t)) return 'Prospek UMKM di sekitar cabang (pasar, sentra usaha) dan percepat proses pengajuan.';
    return 'Tambah booking kredit baru dan jaga outstanding existing.';
  }
  if (x.category === 'Livin') {
    if (/akuisisi new ureg/.test(t)) return "Registrasikan Livin' di tempat untuk setiap pembukaan rekening dan nasabah walk-in. Bagi target registrasi per pegawai per hari.";
    if (/user registered|funding/.test(t)) return "Pastikan user Livin' baru punya rekening dana yang aktif dan bersaldo, terutama hasil akuisisi baru.";
    if (/usak|frekuensi|volume/.test(t)) return "Dorong transaksi finansial di Livin' (transfer, bayar tagihan, top-up e-wallet) supaya user tercatat aktif.";
    return "Dorong registrasi dan transaksi Livin'.";
  }
  if (x.category === 'Kopra') {
    if (/gtv/.test(t)) return 'GTV Kopra: arahkan transaksi rutin nasabah badan usaha (payroll, bayar supplier, pajak) lewat Kopra.';
    if (/registered|akuisisi/.test(t)) return 'Onboard nasabah giro/badan usaha ke Kopra dan dampingi sampai aktivasi.';
    return 'User aktif Kopra: dampingi transaksi pertama dan follow-up user yang belum bertransaksi bulan ini.';
  }
  if (x.category === 'Acquiring') {
    if (/settlement/.test(t)) return 'Funding rek settlement: minta merchant menahan dana hasil settlement di rekening Mandiri (tidak langsung ditarik/dipindah).';
    if (/fbi/.test(t)) return 'Fee-based income ikut naik bersama sales volume. Fokus ke merchant omzet besar dan merchant yang EDC/QR-nya jarang dipakai.';
    if (/sv/.test(t)) return 'Sales volume: aktifkan merchant pasif, pastikan transaksi merchant lewat EDC/QR Mandiri, dan prioritaskan merchant beromzet besar.';
    if (/akuisisi|jumlah merchant/.test(t)) return 'Akuisisi merchant baru di sekitar cabang (toko, resto, klinik) dan pasang EDC/QR.';
    if (/user|ureg/.test(t)) return "Livin' Merchant: daftarkan pelaku usaha dan pastikan QR-nya dipakai bertransaksi.";
    return 'Aktifkan merchant dan dorong transaksi.';
  }
  if (x.category === 'GMM') return 'Pastikan semua pegawai ikut program GMM (Livin, Duta Transaksi, Merchant) dan partisipasinya tercatat penuh.';
  if (x.category === 'Ekosistem') return 'Tarik DPK/kredit dari ekosistem anchor (supplier, distributor, karyawan perusahaan mitra).';
  return 'Kejar realisasi sampai target.';
}

/**
 * Compute metrics for a single branch row with either Mikro (false) or Non-Mikro (true) weight set
 */
function computeBranchWithWeightSet(row, metricDefs, nonMicro) {
  return metricDefs.map(def => {
    let real = 0;
    let target = 0;
    if (def.realColIdx) {
      real = (Number(row[def.realColIdx + 1]) || 0) / (def.realDiv || 1);
    }
    if (def.tgtColIdx && def.tgtColIdx < 1000) {
      target = (Number(row[def.tgtColIdx + 1]) || 0) / (def.tgtDiv || 1);
    }

    let w = def.bobotN !== undefined ? def.bobotN : def.bobot;
    if (nonMicro && def.category === 'Kredit' && typeof def.bobotO === 'number') {
      w = def.bobotO;
    }

    const { acv, maxAcv, score, maxScore, scoreGap, used } = calcMetricScore(
      real,
      target,
      w,
      def.category,
      def.isQuality,
      def.rndAcv !== false,
      def.scored !== false
    );

    const nominalGap = def.isQuality ? (target - real) : (real - target);

    return {
      ...def,
      bobot: w,
      used,
      real: Number(real.toFixed(6)),
      target: Number(target.toFixed(6)),
      acv,
      maxAcv,
      score,
      maxScore,
      scoreGap,
      nominalGap: Number(nominalGap.toFixed(6))
    };
  });
}

/**
 * Score a branch row using branchiq-dashboard's automatic Non-Mikro vs Mikro detection
 */
function scoreBranchRow(row, metricDefs) {
  const nominal = {};
  for (const c of CAT_ORDER) {
    const colIdx = FALLBACK_CATS[c];
    nominal[c] = colIdx ? (Number(row[colIdx + 1]) || 0) : 0;
  }

  const sumCat = (rows, c) =>
    rows.filter(x => x.category === c && x.scored !== false && x.score).reduce((s, x) => s + x.score, 0);

  const a = computeBranchWithWeightSet(row, metricDefs, false);
  const n = computeBranchWithWeightSet(row, metricDefs, true);
  const da = Math.abs(sumCat(a, 'Kredit') - nominal.Kredit);
  const dn = Math.abs(sumCat(n, 'Kredit') - nominal.Kredit);
  const nonMicro = dn < da - 1e-9;
  const rows = nonMicro ? n : a;

  const categorySummary = {};
  let totalRaw = 0;

  for (const c of CAT_ORDER) {
    const catRows = rows.filter(x => x.category === c);
    const maxScore = CATEGORY_MULTIPLIERS[c] || 0;
    const rawCatScore = sumCat(rows, c);
    totalRaw += rawCatScore;
    const actualScore = Number(rawCatScore.toFixed(2));
    const gapScore = Number(Math.max(0, maxScore - actualScore).toFixed(2));
    const usedCatRows = catRows.filter(x => x.used);
    const underTargetCount = usedCatRows.filter(x => x.maxAcv < 1).length;

    categorySummary[c] = {
      category: c,
      categoryRow: CAT_HEADER_ROW_BY_NAME[c],
      maxScore,
      actualScore,
      rawScore: Number(rawCatScore.toFixed(4)),
      nominalScore: Number((nominal[c] || 0).toFixed(4)),
      gapScore,
      metricsCount: usedCatRows.length,
      totalRowsCount: catRows.length,
      underTargetCount,
      achievementPct: maxScore ? Number(((actualScore / maxScore) * 100).toFixed(1)) : 0
    };
  }

  const totalScore = Number(totalRaw.toFixed(2));
  return { rows, categorySummary, totalScore, totalRaw, nonMicro, nominal };
}

/**
 * Recalculate branch data with custom Target or Realisasi overrides
 * Used for both Master Target edits (by Admin/Konseptor `michael` & `superadmin`)
 * and Local Simulation Mode (by `viewer`).
 */
export function recalculateBranchWithOverrides(branchData, targetOverrides = {}, realOverrides = {}) {
  if (!branchData || !branchData.calculatedMetrics) return branchData;
  const code = String(branchData.branchInfo?.code || '10125');

  const updatedMetrics = branchData.calculatedMetrics.map(m => {
    const branchRowKey = `${code}_${m.row}`;
    const hasCustomTarget =
      targetOverrides[branchRowKey] !== undefined
        ? targetOverrides[branchRowKey]
        : targetOverrides[m.row];
    const hasCustomReal =
      realOverrides[branchRowKey] !== undefined
        ? realOverrides[branchRowKey]
        : realOverrides[m.row];

    const effectiveTarget = hasCustomTarget !== undefined && hasCustomTarget !== null && !isNaN(Number(hasCustomTarget))
      ? Number(hasCustomTarget)
      : m.target;
    const effectiveReal = hasCustomReal !== undefined && hasCustomReal !== null && !isNaN(Number(hasCustomReal))
      ? Number(hasCustomReal)
      : m.real;

    const { acv, maxAcv, score, maxScore, scoreGap, used } = calcMetricScore(
      effectiveReal,
      effectiveTarget,
      m.bobot,
      m.category,
      m.isQuality,
      m.rndAcv !== false,
      m.scored !== false
    );

    const nominalGap = m.isQuality ? (effectiveTarget - effectiveReal) : (effectiveReal - effectiveTarget);

    return {
      ...m,
      originalTarget: m.originalTarget !== undefined ? m.originalTarget : m.target,
      originalReal: m.originalReal !== undefined ? m.originalReal : m.real,
      target: Number(effectiveTarget.toFixed(6)),
      real: Number(effectiveReal.toFixed(6)),
      isTargetModified: Math.abs(effectiveTarget - (m.originalTarget !== undefined ? m.originalTarget : m.target)) > 1e-6,
      isRealModified: Math.abs(effectiveReal - (m.originalReal !== undefined ? m.originalReal : m.real)) > 1e-6,
      used,
      acv,
      maxAcv,
      score,
      maxScore,
      scoreGap,
      nominalGap: Number(nominalGap.toFixed(6))
    };
  });

  const categorySummary = {};
  let totalRaw = 0;

  for (const c of CAT_ORDER) {
    const catRows = updatedMetrics.filter(x => x.category === c);
    const maxScore = CATEGORY_MULTIPLIERS[c] || 0;
    const rawCatScore = catRows
      .filter(x => x.scored !== false && x.score)
      .reduce((s, x) => s + x.score, 0);
    totalRaw += rawCatScore;
    const actualScore = Number(rawCatScore.toFixed(2));
    const gapScore = Number(Math.max(0, maxScore - actualScore).toFixed(2));
    const usedCatRows = catRows.filter(x => x.used);
    const underTargetCount = usedCatRows.filter(x => x.maxAcv < 1).length;

    categorySummary[c] = {
      ...(branchData.categorySummary?.[c] || {}),
      category: c,
      categoryRow: CAT_HEADER_ROW_BY_NAME[c],
      maxScore,
      actualScore,
      rawScore: Number(rawCatScore.toFixed(4)),
      gapScore,
      metricsCount: usedCatRows.length,
      totalRowsCount: catRows.length,
      underTargetCount,
      achievementPct: maxScore ? Number(((actualScore / maxScore) * 100).toFixed(1)) : 0
    };
  }

  const totalScore = Number(totalRaw.toFixed(2));
  const underTargetMetrics = updatedMetrics
    .filter(m => m.used && m.scoreGap > 0.0005)
    .sort((a, b) => b.scoreGap - a.scoreGap);

  return {
    ...branchData,
    branchInfo: {
      ...branchData.branchInfo,
      totalScore
    },
    rankingInfo: {
      ...branchData.rankingInfo,
      totalScore
    },
    calculatedMetrics: updatedMetrics,
    categorySummary,
    totalScore,
    totalGap: Number((100 - totalScore).toFixed(2)),
    underTargetCount: underTargetMetrics.length,
    underTargetMetrics
  };
}

/**
 * Parse an Excel workbook buffer client-side
 */
export async function parseBranchIQWorkbook(fileOrBuffer) {
  let arrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else {
    throw new Error('Format file tidak didukung');
  }

  const wb = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellDates: true });
  const sheetNames = wb.SheetNames;

  // Validate required sheets
  const requiredSheets = ['Jarcab', 'Database', 'Matriks Bobot_2'];
  const missing = requiredSheets.filter(s => !sheetNames.includes(s));
  if (missing.length > 0) {
    throw new Error(`Sheet berikut tidak ditemukan dalam file: ${missing.join(', ')}`);
  }

  // 1. Parse Jarcab
  const wsJarcab = wb.Sheets['Jarcab'];
  const jarcabRaw = XLSX.utils.sheet_to_json(wsJarcab, { header: 1, defval: '' });
  const branches = [];
  for (let i = 2; i < jarcabRaw.length; i++) {
    const row = jarcabRaw[i];
    const code = String(row[0] || '').trim();
    if (code && !isNaN(Number(code)) && code.length >= 4) {
      const name = String(row[1] || '').trim();
      const head = String(row[2] || '').trim();
      const grade = String(row[3] || 'B.3').trim();
      if (/^[AR]\./i.test(grade) || /^(AREA|REGION)\b/i.test(name)) continue;
      branches.push({ code, name, head, grade });
    }
  }

  // 2. Parse Database
  const wsDb = wb.Sheets['Database'];
  const dbData = XLSX.utils.sheet_to_json(wsDb, { header: 1, defval: '' });

  // 3. Extract Realization Date
  let realizationDate = '13 November 2026';
  const wsLevel = wb.Sheets['Level Cabang'] || wb.Sheets['Level Cabang Non Micro'];
  if (wsLevel && wsLevel['C5'] && wsLevel['C5'].v) {
    const c5Text = String(wsLevel['C5'].v);
    const m = c5Text.match(/Realisasi\s+(.+)/i);
    if (m) realizationDate = m[1].trim();
  } else if (wsLevel && wsLevel['B5'] && wsLevel['B5'].v) {
    const b5Text = String(wsLevel['B5'].v);
    const m = b5Text.match(/Realisasi\s+(.+)/i);
    if (m) realizationDate = m[1].trim();
  }

  // 4. Metric Definitions from template + Matriks Bobot_2 weights
  const wsBobot = wb.Sheets['Matriks Bobot_2'];
  const metricDefs = metricDefinitionsTemplate.map(def => {
    if (!wsBobot) return def;
    const bobotN = Number(wsBobot['N' + def.row]?.v) ?? def.bobotN ?? def.bobot;
    const rawO = wsBobot['O' + def.row]?.v;
    const bobotO = typeof rawO === 'number' ? rawO : def.bobotO;
    const bobot = (def.category === 'Kredit' && bobotO !== null && bobotO !== undefined) ? bobotO : bobotN;
    return {
      ...def,
      bobot,
      bobotN,
      bobotO
    };
  });

  // 5. Build rankings across all 164 branches using branchiq-dashboard's exact scoring
  const areaNames = {
    '70': 'Area Wisma Danantara',
    '101': 'Area Pondok Indah',
    '102': 'Area Sudirman',
    '124': 'Area Tebet Supomo',
    '126': 'Area Falatehan',
    '127': 'Area Fatmawati',
    '133': 'Area Bogor',
    '157': 'Area Depok'
  };

  const allRankings = [];
  for (let r = 10; r < dbData.length; r++) {
    const row = dbData[r];
    const code = String(row[2] || '').trim();
    if (!code || isNaN(Number(code)) || code.length < 4) continue;
    const bInfo = branches.find(b => b.code === code) || {
      code,
      name: String(row[3] || '').trim(),
      head: String(row[4] || '').trim(),
      grade: 'B.3'
    };
    if (/^[AR]\./i.test(bInfo.grade) || /^(AREA|REGION)\b/i.test(bInfo.name)) continue;

    const areaCode = String(row[1] || '').trim();
    const areaName = areaNames[areaCode] || ('Area ' + areaCode);
    const scored = scoreBranchRow(row, metricDefs);

    const categoryScores = {};
    for (const c of CAT_ORDER) {
      categoryScores[c] = {
        score: scored.categorySummary[c].actualScore,
        rawScore: scored.categorySummary[c].rawScore,
        rank: 999
      };
    }

    allRankings.push({
      code,
      name: bInfo.name,
      head: bInfo.head,
      grade: bInfo.grade,
      nonMicro: scored.nonMicro,
      areaCode,
      areaName,
      totalScore: scored.totalScore,
      totalRaw: scored.totalRaw,
      totalRank: 999,
      categoryScores
    });
  }

  allRankings.sort((a, b) => b.totalRaw - a.totalRaw);
  allRankings.forEach((r, idx) => {
    r.totalRank = idx + 1;
  });

  for (const catName of CAT_ORDER) {
    const sorted = [...allRankings].sort((a, b) => (b.categoryScores[catName]?.rawScore || 0) - (a.categoryScores[catName]?.rawScore || 0));
    sorted.forEach((r, idx) => {
      if (r.categoryScores[catName]) {
        r.categoryScores[catName].rank = idx + 1;
      }
    });
  }

  for (const aCode of Object.keys(areaNames)) {
    const inArea = allRankings.filter(r => r.areaCode === aCode).sort((a, b) => b.totalRaw - a.totalRaw);
    inArea.forEach((r, idx) => {
      r.areaRank = idx + 1;
      r.totalInArea = inArea.length;
    });
  }

  const grades = [...new Set(allRankings.map(r => r.grade))];
  for (const gr of grades) {
    const inGrade = allRankings.filter(r => r.grade === gr).sort((a, b) => b.totalRaw - a.totalRaw);
    inGrade.forEach((r, idx) => {
      r.gradeRank = idx + 1;
      r.totalInGrade = inGrade.length;
    });
  }

  allRankings.sort((a, b) => a.totalRank - b.totalRank);

  return {
    branches,
    dbData,
    metricDefs,
    realizationDate,
    allRankings
  };
}

/**
 * Calculate Branch metrics given branch code, dbData, and metric definitions
 */
export function calculateBranchScore(
  branchCode,
  dbData,
  metricDefs = metricDefinitionsTemplate,
  branches = [],
  realizationDate = '13 November 2026',
  allRankings = null
) {
  let row = null;
  if (Array.isArray(dbData)) {
    row = dbData.find(r => String(r[2]).trim() === String(branchCode).trim());
  } else if (dbData && typeof dbData === 'object') {
    row = dbData[String(branchCode).trim()] || Object.values(dbData).find(r => String(r[2]).trim() === String(branchCode).trim());
  }

  if (!row) {
    throw new Error(`Data cabang dengan kode ${branchCode} tidak ditemukan di sheet Database`);
  }

  const rankingItem = allRankings?.find(r => String(r.code).trim() === String(branchCode).trim());
  const scored = scoreBranchRow(row, metricDefs);

  const underTargetMetrics = scored.rows
    .filter(m => m.used && m.scoreGap > 0.0005)
    .sort((a, b) => b.scoreGap - a.scoreGap);

  const branchInfo = {
    code: String(branchCode).trim(),
    name: rankingItem?.name || String(row[3] || 'Unit ' + branchCode).trim(),
    head: rankingItem?.head || String(row[4] || '-').trim(),
    grade: rankingItem?.grade || (branches?.find(b => b.code === String(branchCode).trim())?.grade || 'B.3'),
    nonMicro: scored.nonMicro,
    areaCode: rankingItem?.areaCode || String(row[1] || '').trim(),
    areaName: rankingItem?.areaName || 'Region V',
    totalRank: rankingItem?.totalRank || 43,
    totalScore: scored.totalScore
  };

  return {
    branchInfo,
    rankingInfo: rankingItem
      ? {
          ...rankingItem,
          totalScore: scored.totalScore
        }
      : {
          code: String(branchCode).trim(),
          totalRank: 43,
          totalBranches: allRankings?.length || 164,
          totalScore: scored.totalScore,
          areaRank: 5,
          totalInArea: 15,
          gradeRank: 17,
          totalInGrade: 57,
          categoryScores: {}
        },
    realizationDate,
    calculatedMetrics: scored.rows,
    categorySummary: scored.categorySummary,
    totalScore: scored.totalScore,
    totalMaxScore: 100,
    totalGap: Number((100 - scored.totalScore).toFixed(2)),
    underTargetCount: underTargetMetrics.length,
    underTargetMetrics
  };
}
