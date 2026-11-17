const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('public/sample_branchiq.xlsx', { cellFormula: true, cellDates: true });

const CAT_ORDER = ['DPK', 'Kredit', 'Livin', 'Kopra', 'Acquiring', 'GMM', 'Ekosistem'];
const CAT_ROWS = { 8: 'DPK', 20: 'Kredit', 49: 'Livin', 56: 'Kopra', 64: 'Acquiring', 79: 'GMM', 86: 'Ekosistem' };
const CAT_HEADER_ROW_BY_NAME = { DPK: 8, Kredit: 20, Livin: 49, Kopra: 56, Acquiring: 64, GMM: 79, Ekosistem: 86 };
const CAT_MULTIPLIERS = {
  DPK: 30,
  Kredit: 20,
  Livin: 15,
  Kopra: 10,
  Acquiring: 15,
  GMM: 5,
  Ekosistem: 5
};

// Reference layout from branchiq-dashboard (100% matching Level Cabang / Level Cabang Non Micro rows 8..88)
const FALLBACK = {
  cats: { DPK: 61, Kredit: 395, Livin: 397, Kopra: 401, Acquiring: 399, GMM: 403, Ekosistem: 390 },
  rows: [
    [9, 'DPK', 'Avgbal DPK MtD', '', 5, 1, 6, 1, 0, 0, 0, 9],
    [10, 'DPK', 'Endbal DPK', '', 10, 1, 11, 1, 0, 1, 1, 9],
    [11, 'DPK', 'Avgbal Tabungan MtD', '', 45, 1, 46, 1, 0, 1, 1, 9],
    [12, 'DPK', 'Endbal Tabungan', '', 55, 1, 56, 1, 0, 1, 1, 9],
    [13, 'DPK', 'Endbal 3P', '', 50, 1, 51, 1, 0, 1, 1, 9],
    [14, 'DPK', 'Akuisisi NTB 3Pi', '', 40, 1, 41, 1, 0, 1, 1, 9],
    [15, 'DPK', 'Avgbal Giro MtD', '', 20, 1, 21, 1, 0, 1, 1, 9],
    [16, 'DPK', 'Average Balance Giro CMB/Retail/SME', '', 25, 1, 26, 1, 0, 1, 1, 9],
    [17, 'DPK', 'Endbal Giro', '', 30, 1, 31, 1, 0, 1, 1, 9],
    [18, 'DPK', 'Ending Balance Giro CMB/Retail/SME', '', 35, 1, 36, 1, 0, 1, 1, 9],
    [19, 'DPK', 'Akuisisi Giro Retail', '', 15, 1, 16, 1, 0, 1, 1, 9],
    [21, 'Kredit', 'Kredit Retail', 'Baki Debet Kredit Retail', 64, 1, 65, 1, 0, 1, 0, 21],
    [22, 'Kredit', 'Kredit Retail', 'Booking Kredit Retail YtD', 69, 1, 70, 1, 0, 1, 0, 21],
    [23, 'Kredit', 'Kredit Retail', '% Kol 2 Kredit Retail', 74, 1, 75, 1, 1, 1, 0, 21],
    [24, 'Kredit', 'Kredit Retail', '% NPL Kredit Retail', 79, 1, 80, 1, 1, 1, 0, 21],
    [25, 'Kredit', 'KPR', 'Baki Debet KPR (Rp Tn)', 84, 1, 85, 1, 0, 1, 1, 21],
    [26, 'Kredit', 'KPR', 'Booking KPR YtD (Rp M)', 89, 100, 90, 100, 0, 1, 1, 21],
    [27, 'Kredit', 'KPR', '% Kol 2 KPR', 94, 1, 95, 1, 1, 1, 1, 21],
    [28, 'Kredit', 'KPR', '% NPL KPR', 99, 1, 100, 1, 1, 1, 1, 21],
    [29, 'Kredit', 'Autoloan', 'Baki Debet Autoloan (Rp M)', 104, 1, 105, 1, 0, 1, 1, 21],
    [30, 'Kredit', 'Autoloan', 'Booking Autoloan YtD (Rp M)', 109, 1, 110, 1, 0, 1, 1, 21],
    [31, 'Kredit', 'Autoloan', '% Kol 2 Autoloan', 114, 1, 115, 1, 1, 1, 1, 21],
    [32, 'Kredit', 'Autoloan', '% NPL Autoloan', 119, 1, 120, 1, 1, 1, 1, 21],
    [33, 'Kredit', 'CC', 'Baki Debet CC', 124, 1, 125, 1, 0, 1, 1, 21],
    [34, 'Kredit', 'CC', 'Booking CC YtD (Jumlah Kartu)', 129, 100, 130, 100, 0, 1, 1, 21],
    [35, 'Kredit', 'CC', '% Kol 2 CC', 134, 100, 135, 100, 1, 1, 1, 21],
    [36, 'Kredit', 'CC', '% NPL CC', 139, 1, 140, 1, 1, 1, 1, 21],
    [37, 'Kredit', 'KUM', 'Baki Debet KUM (Rp M)', 144, 1, 145, 1, 0, 1, 1, 21],
    [38, 'Kredit', 'KUM', 'Booking KUM YtD (Rp M)', 149, 1, 150, 1, 0, 1, 1, 21],
    [39, 'Kredit', 'KUM', '% Kol 2 KUM', 154, 1, 155, 1, 1, 1, 1, 21],
    [40, 'Kredit', 'KUM', '% NPL KUM', 159, 1, 160, 1, 1, 1, 1, 21],
    [41, 'Kredit', 'KUR', 'Baki Debet KUR (Rp M)', 164, 1, 165, 1, 0, 1, 1, 21],
    [42, 'Kredit', 'KUR', 'Booking KUR YtD (Rp M)', 169, 1, 170, 1, 0, 1, 1, 21],
    [43, 'Kredit', 'KUR', '% Kol 2 KUR', 174, 1, 175, 1, 1, 1, 1, 21],
    [44, 'Kredit', 'KUR', '% NPL KUR', 179, 1, 180, 1, 1, 1, 1, 21],
    [45, 'Kredit', 'KSM', 'Baki Debet KSM (Rp Tn)', 184, 1, 185, 1, 0, 1, 1, 21],
    [46, 'Kredit', 'KSM', 'Booking KSM YtD (Rp M)', 189, 1, 190, 1, 0, 1, 1, 21],
    [47, 'Kredit', 'KSM', '% Kol 2 KSM', 194, 1, 195, 1, 1, 1, 1, 21],
    [48, 'Kredit', 'KSM', '% NPL KSM', 199, 1, 200, 1, 1, 1, 1, 21],
    [50, 'Livin', 'Akuisisi New UREG', 'Akuisisi New UREG', 208, 1, 209, 1, 0, 1, 1, 50],
    [51, 'Livin', 'User Registered', 'UREG dengan funding Product', 213, 1, 214, 1, 0, 1, 1, 50],
    [52, 'Livin', 'USAK Finansial FBI', 'USAK Finansial FBI MtD', 218, 1, 219, 1, 0, 1, 1, 50],
    [53, 'Livin', 'USAK Finansial', '', 223, 1, 224, 1, 0, 1, 1, 50],
    [54, 'Livin', 'Frekuensi', '', 228, 1, 229, 1, 0, 1, 1, 50],
    [55, 'Livin', 'Volume', '(Rp Tn)', 233, 1000000000, 234, 1, 0, 1, 1, 50],
    [57, 'Kopra', 'Akuisisi New UREG', '', 257, 1, 258, 1, 0, 1, 0, 57],
    [58, 'Kopra', 'User Aktif', '', 242, 1, 243, 1, 0, 1, 1, 57],
    [59, 'Kopra', 'User Aktif SME non Debitur Only', '', 262, 1, 263, 1, 0, 1, 1, 57],
    [60, 'Kopra', 'User Registered', '', 247, 1, 248, 1, 0, 1, 1, 57],
    [61, 'Kopra', 'USAK Core', '', 0, 1, 0, 1, 0, 1, 0, 57],
    [62, 'Kopra', 'GTV', '(Rp M)', 252, 1, 253, 1, 0, 1, 1, 57],
    [63, 'Kopra', 'FBI', '(Rp Jt)', 0, 1, 0, 1, 0, 1, 0, 57],
    [65, 'Acquiring', 'EDC', 'Jumlah Merchant', 301, 1, 302, 1, 0, 1, 0, 65],
    [66, 'Acquiring', 'EDC', 'Akuisisi New Merchant', 271, 1, 272, 1, 0, 1, 1, 65],
    [67, 'Acquiring', 'EDC', 'Frekuensi', 0, 1, 0, 1, 0, 1, 0, 65],
    [68, 'Acquiring', 'EDC', 'SV Ytd (Rp Jt)', 276, 1, 277, 1, 0, 1, 1, 65],
    [69, 'Acquiring', 'EDC', 'FBI (Rp Jt)', 281, 1, 282, 1, 0, 1, 1, 65],
    [70, 'Acquiring', 'EDC', 'Funding Rek Settlement (Rp M)', 286, 1, 287, 1, 0, 1, 1, 65],
    [71, 'Acquiring', 'EDC', 'Merchant Optimal', 296, 1, 2796, 1, 0, 1, 0, 65],
    [72, 'Acquiring', 'LVM', 'User Registered', 306, 1, 307, 1, 0, 1, 1, 65],
    [73, 'Acquiring', 'LVM', 'User Aktif', 311, 1, 312, 1, 0, 1, 1, 65],
    [74, 'Acquiring', 'LVM', 'Akuisisi New UREG', 316, 1, 317, 1, 0, 1, 1, 65],
    [75, 'Acquiring', 'LVM', 'Frekuensi', 0, 1, 0, 1, 0, 1, 0, 65],
    [76, 'Acquiring', 'LVM', 'SV Ytd (Rp M)', 321, 1, 322, 1, 0, 1, 1, 65],
    [77, 'Acquiring', 'LVM', 'FBI Ytd (Rp Jt)', 326, 1, 327, 1, 0, 1, 1, 65],
    [78, 'Acquiring', 'LVM', 'Funding Rek Settlement (Rp M)', 336, 1, 337, 1, 0, 1, 1, 65],
    [80, 'GMM', 'Livin', 'Jumlah Pegawai Berpartisipasi', 345, 1, 346, 1, 0, 1, 1, 80],
    [81, 'GMM', 'Livin', 'Jumlah Akuisisi per Pegawai', 350, 1, 351, 1, 0, 1, 0, 80],
    [82, 'GMM', 'Livin', '% UREG Aktif Transaksi dari Total Akuisisi', 355, 1, 356, 1, 0, 1, 0, 80],
    [83, 'GMM', 'Duta Transaksi', 'Jumlah Pegawai Berpartisipasi', 365, 1, 366, 1, 0, 1, 1, 80],
    [84, 'GMM', 'Duta Transaksi', 'Jumlah Pegawai dengan % On-Us >= 60%', 360, 1, 361, 1, 0, 1, 0, 80],
    [85, 'GMM', 'Merchant', 'Jumlah Pegawai Berpartisipasi', 370, 1, 371, 1, 0, 1, 1, 80],
    [87, 'Ekosistem', 'Porsi DPK Ekosistem Terhadap DPK Region', '', 379, 1, 380, 1, 0, 1, 1, 87],
    [88, 'Ekosistem', 'Porsi Kredit Retail Ekosistem Terhadap Kredit Retail Region', '', 384, 1, 385, 1, 0, 1, 1, 87]
  ]
};

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

const xround = (x, n = 2) => {
  const p = Math.pow(10, n);
  return Math.sign(x) * Math.floor(Math.abs(x) * p + 0.5 + 1e-9) / p;
};

const wsDb = wb.Sheets['Database'];
const dbData = XLSX.utils.sheet_to_json(wsDb, { header: 1, defval: '' });

// Parse Jarcab
const wsJarcab = wb.Sheets['Jarcab'];
const jarcabRaw = XLSX.utils.sheet_to_json(wsJarcab, { header: 1, defval: '' });
const branches = [];
const jarcabMap = {};
for (let i = 2; i < jarcabRaw.length; i++) {
  const row = jarcabRaw[i];
  const code = String(row[0] || '').trim();
  if (code && !isNaN(Number(code)) && code.length >= 4) {
    const name = String(row[1] || '').trim();
    const head = String(row[2] || '').trim();
    const grade = String(row[3] || 'B.3').trim();
    if (/^[AR]\./i.test(grade) || /^(AREA|REGION)\b/i.test(name)) continue;
    const item = { code, name, head, grade };
    branches.push(item);
    jarcabMap[code] = item;
  }
}

const wsBobot = wb.Sheets['Matriks Bobot_2'];

const metricDefs = FALLBACK.rows.map(m => {
  const [row, category, metric, subMetric, realColIdx, realDiv, tgtColIdx, tgtDiv, inv, rnd, scored, maxRow] = m;
  const bobotN = Number(wsBobot['N' + row]?.v) || 0;
  const rawO = wsBobot['O' + row]?.v;
  const bobotO = typeof rawO === 'number' ? rawO : null;
  const bobot = (category === 'Kredit' && bobotO !== null) ? bobotO : bobotN;
  const maxCategoryScore = Number(wsBobot['F' + maxRow]?.v) || CAT_MULTIPLIERS[category] || 0;
  const displayName = (metric && subMetric && metric !== subMetric)
    ? `${metric} - ${subMetric}`
    : (metric || subMetric);

  return {
    row,
    category,
    categoryRow: CAT_HEADER_ROW_BY_NAME[category],
    metric,
    subMetric,
    name: displayName,
    bobot,
    bobotN,
    bobotO,
    maxCategoryScore,
    realColIdx: realColIdx || null,
    realDiv: realDiv || 1,
    tgtColIdx: tgtColIdx || null,
    tgtDiv: tgtDiv || 1,
    isQuality: Boolean(inv),
    rndAcv: Boolean(rnd),
    scored: Boolean(scored),
    isPct: /^%/.test(subMetric || metric)
  };
});

// Extract dbRows
const dbRows = {};
for (let r = 10; r < dbData.length; r++) {
  const row = dbData[r];
  const code = String(row[2] || '').trim();
  if (!code || isNaN(Number(code)) || code.length < 4) continue;
  dbRows[code] = row;
}

function computeBranchWithWeightSet(row, nonMicro) {
  return metricDefs.map(def => {
    let real = 0;
    let target = 0;
    if (def.realColIdx) {
      real = (Number(row[def.realColIdx + 1]) || 0) / (def.realDiv || 1);
    }
    if (def.tgtColIdx && def.tgtColIdx < 1000) {
      target = (Number(row[def.tgtColIdx + 1]) || 0) / (def.tgtDiv || 1);
    }

    let acv = 0;
    if (def.isQuality) {
      if (real === target) acv = 1;
      else if (target > 0) acv = Math.max(0, xround(1 - (real - target) / target));
      else acv = 0;
    } else {
      if (target > 0) acv = def.rndAcv ? xround(real / target) : (real / target);
      else acv = 0;
    }

    const maxAcv = Math.min(acv, 1);
    let w = def.bobotN !== undefined ? def.bobotN : def.bobot;
    if (nonMicro && def.category === 'Kredit' && typeof def.bobotO === 'number') {
      w = def.bobotO;
    }

    const used = Boolean(def.scored && w > 0);
    const mult = def.maxCategoryScore || CAT_MULTIPLIERS[def.category] || 0;
    const maxScore = used ? Number((w * mult).toFixed(4)) : 0;
    const score = def.scored ? Number((maxAcv * w * mult).toFixed(4)) : 0;
    const scoreGap = used ? Number(Math.max(0, (1 - maxAcv) * w * mult).toFixed(4)) : 0;
    const nominalGap = def.isQuality ? (target - real) : (real - target);

    return {
      ...def,
      bobot: w,
      used,
      real: Number(real.toFixed(6)),
      target: Number(target.toFixed(6)),
      acv: Number(acv.toFixed(4)),
      maxAcv: Number(maxAcv.toFixed(4)),
      score,
      maxScore,
      scoreGap,
      nominalGap: Number(nominalGap.toFixed(6))
    };
  });
}

function scoreBranchRow(row) {
  const nominal = {};
  for (const c of CAT_ORDER) {
    const colIdx = FALLBACK.cats[c];
    nominal[c] = colIdx ? (Number(row[colIdx + 1]) || 0) : 0;
  }
  const sumCat = (rows, c) => rows.filter(x => x.category === c && x.scored && x.score).reduce((s, x) => s + x.score, 0);

  const a = computeBranchWithWeightSet(row, false);
  const n = computeBranchWithWeightSet(row, true);
  const da = Math.abs(sumCat(a, 'Kredit') - nominal.Kredit);
  const dn = Math.abs(sumCat(n, 'Kredit') - nominal.Kredit);
  const nonMicro = dn < da - 1e-9;
  const rows = nonMicro ? n : a;

  const categorySummary = {};
  let totalRaw = 0;
  for (const c of CAT_ORDER) {
    const catRows = rows.filter(x => x.category === c);
    const maxScore = CAT_MULTIPLIERS[c] || 0;
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

// Compute allRankings across all branches in Database
const allRankings = [];
for (const code of Object.keys(dbRows)) {
  const row = dbRows[code];
  const bInfo = jarcabMap[code] || {
    code,
    name: String(row[3] || '').trim(),
    head: String(row[4] || '').trim(),
    grade: 'B.3'
  };
  if (/^[AR]\./i.test(bInfo.grade) || /^(AREA|REGION)\b/i.test(bInfo.name)) continue;

  const areaCode = String(row[1] || '').trim();
  const areaName = areaNames[areaCode] || ('Area ' + areaCode);
  const scored = scoreBranchRow(row);

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

// Sort by totalRaw descending (matches branchiq-dashboard)
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

function calculateBranch(branchCode) {
  const row = dbRows[branchCode];
  if (!row) return null;
  const rankingItem = allRankings.find(r => r.code === String(branchCode).trim());
  const scored = scoreBranchRow(row);

  const branchInfo = {
    code: branchCode,
    name: rankingItem?.name || String(row[3] || '').trim(),
    head: rankingItem?.head || String(row[4] || '').trim(),
    grade: rankingItem?.grade || 'B.3',
    nonMicro: scored.nonMicro,
    areaCode: rankingItem?.areaCode || String(row[1] || '').trim(),
    areaName: rankingItem?.areaName || 'Region V',
    totalRank: rankingItem?.totalRank || 43,
    totalScore: scored.totalScore
  };

  const underTargetMetrics = scored.rows
    .filter(m => m.used && m.scoreGap > 0.0005)
    .sort((a, b) => b.scoreGap - a.scoreGap);

  return {
    branchInfo,
    rankingInfo: rankingItem || {
      totalRank: 43,
      totalBranches: allRankings.length,
      totalScore: scored.totalScore,
      areaRank: 5,
      totalInArea: 15,
      gradeRank: 17,
      totalInGrade: 57,
      categoryScores: {}
    },
    realizationDate: '13 November 2026',
    calculatedMetrics: scored.rows,
    categorySummary: scored.categorySummary,
    totalScore: scored.totalScore,
    totalMaxScore: 100,
    totalGap: Number((100 - scored.totalScore).toFixed(2)),
    underTargetCount: underTargetMetrics.length,
    underTargetMetrics
  };
}

const data10125 = calculateBranch('10125');

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/branches.json', JSON.stringify(branches, null, 2));
fs.writeFileSync('src/data/allRankings.json', JSON.stringify(allRankings, null, 2));
fs.writeFileSync('src/data/dbRows.json', JSON.stringify(dbRows));
fs.writeFileSync('src/data/metricDefinitions.json', JSON.stringify(metricDefs, null, 2));
fs.writeFileSync('src/data/default10125.json', JSON.stringify(data10125, null, 2));

console.log('SUCCESS!');
console.log('Total metric rows (Excel template):', metricDefs.length);
console.log('Branches count:', branches.length);
console.log('Rankings count:', allRankings.length);
console.log('Branch 10125 totalScore:', data10125.totalScore, 'Rank:', data10125.rankingInfo.totalRank);
