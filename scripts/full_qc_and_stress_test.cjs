const puppeteer = require('puppeteer-core');
const { createClient } = require('@supabase/supabase-js');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SUPABASE_URL = 'https://pxcqpginolimyaxxyvao.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q8DEalEC14zk2q8uv5WK_g_UParEM4z';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const urlArg = process.argv.find(a => a.startsWith('--url='));
const TARGET_URL = urlArg ? urlArg.split('=')[1] : 'http://127.0.0.1:4173/';
const SKIP_STRESS = process.argv.includes('--skip-stress');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runStressTests() {
  console.log('\n=======================================================');
  console.log('🔥 PART A: CALCULATION & SUPABASE CONCURRENCY STRESS TEST');
  console.log('=======================================================');

  const { recalculateBranchWithOverrides } = await import('../src/utils/excelParser.js');
  const {
    fetchServerDb,
    persistDbState,
    normalizeMasterTargets,
    normalizeMasterStrategies
  } = await import('../src/utils/dbService.js');
  const {
    getExcelHistoryMetaList,
    syncCloudExcelHistory,
    getLatestUploadedSnapshotId
  } = await import('../src/utils/excelHistoryService.js');

  const default10125 = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/default10125.json'), 'utf-8'));

  // 1. 1,000 randomized stress calculations across all metrics + edge cases
  console.log('[A1] Running 1,000 randomized scorecard calculation stress tests...');
  for (let i = 0; i < 1000; i++) {
    const tgtOverrides = {};
    const realOverrides = {};
    for (const m of default10125.calculatedMetrics) {
      if (Math.random() < 0.25) {
        const edgeRoll = Math.random();
        const val = edgeRoll < 0.1 ? 0 : edgeRoll < 0.2 ? m.target * 3 : m.target * (0.2 + Math.random() * 1.5);
        tgtOverrides[`10125_${m.row}`] = i % 10 === 0 ? { target: val } : val; // test both Number & legacy object
      }
      if (Math.random() < 0.25) {
        const val = Math.random() < 0.1 ? 0 : m.real * (0.1 + Math.random() * 2);
        realOverrides[`10125_${m.row}`] = i % 10 === 0 ? { real: val } : val;
      }
    }
    const res = recalculateBranchWithOverrides(default10125, tgtOverrides, realOverrides, { isSimulationLayer: i % 2 === 0 });
    assert(Number.isFinite(res.totalScore), `Iteration ${i}: totalScore is not finite (${res.totalScore})`);
    assert(res.totalScore >= 0 && res.totalScore <= 100.01, `Iteration ${i}: totalScore out of bounds (${res.totalScore})`);
    for (const cm of res.calculatedMetrics) {
      assert(Number.isFinite(cm.score) && Number.isFinite(cm.acv), `Iteration ${i} row ${cm.row}: NaN detected`);
    }
  }
  console.log(' ✅ PASS | 1,000/1,000 scorecard calculations accurate (0 NaN, 0 Infinity, bounds valid)');

  // 2. Normalizers self-healing check
  console.log('[A2] Testing schema normalizers on legacy & corrupted formats...');
  const normTgt = normalizeMasterTargets({ '10125_12': { target: '555.5' }, '10125_13': 42, 'bad': NaN, 'empty': '' });
  assert.deepStrictEqual(normTgt, { '10125_12': 555.5, '10125_13': 42 });
  const normStr = normalizeMasterStrategies({
    'b10125~12': { strategyText: 'Legacy text' },
    'g~14': 'Plain string strategy',
    'empty': { text: '   ' },
    '__sys_timestand_config__': { text: 'should be excluded' }
  });
  assert.strictEqual(normStr['b10125~12'].text, 'Legacy text');
  assert.strictEqual(normStr['g~14'].text, 'Plain string strategy');
  assert.strictEqual(normStr['empty'], undefined);
  assert.strictEqual(normStr['__sys_timestand_config__'], undefined);
  console.log(' ✅ PASS | Schema normalizers cleanly normalize legacy objects and filter system/empty keys');

  // 3. Live Supabase concurrency & deletion sync stress test (non-destructive snapshot + restore)
  console.log('[A3] Running 15-burst Supabase concurrency, deletion & Viewer-isolation stress test...');
  const originalDb = await fetchServerDb();
  try {
    // 15 rapid concurrent bursts modifying an isolated branch '99999'
    const bursts = [];
    for (let b = 1; b <= 15; b++) {
      const nextDb = {
        ...originalDb,
        masterTargets: { ...originalDb.masterTargets, '99999_12': 100 + b },
        masterStrategies: {
          ...originalDb.masterStrategies,
          'b99999~12': { text: `Burst Strategy #${b}`, scope: 'branch', branchCode: '99999', rowId: 12, updatedBy: 'qc_stress' }
        }
      };
      bursts.push(persistDbState(nextDb, { changed: ['masterTargets', 'masterStrategies'], actor: 'qc_stress' }));
    }
    const burstResults = await Promise.all(bursts);
    assert(burstResults.every(r => r.ok), `Some burst writes failed: ${JSON.stringify(burstResults.filter(r => !r.ok))}`);

    const afterBurst = await fetchServerDb();
    assert.strictEqual(afterBurst.masterTargets['99999_12'], 115, `Expected serialized final value 115, got ${afterBurst.masterTargets['99999_12']}`);
    assert.strictEqual(afterBurst.masterStrategies['b99999~12']?.text, 'Burst Strategy #15', 'Strategy text mismatch after bursts');

    // Viewer simulation scoped write MUST NOT alter Master Targets/Strategies
    const simWriteRes = await persistDbState({
      ...afterBurst,
      masterTargets: {}, // stale/empty in hypothetical Viewer memory, shouldn't touch cloud because changed=['viewerSimulations']!
      viewerSimulations: [...(originalDb.viewerSimulations || []), { id: 'sim_qc_stress', title: 'QC Stress Sim', branchCode: '99999' }]
    }, { changed: ['viewerSimulations'], actor: 'rian' });
    assert(simWriteRes.ok, 'Viewer simulation write failed');

    const afterViewerWrite = await fetchServerDb();
    assert.strictEqual(afterViewerWrite.masterTargets['99999_12'], 115, 'Viewer sim write corrupted Master Target!');
    assert.strictEqual(afterViewerWrite.masterStrategies['b99999~12']?.text, 'Burst Strategy #15', 'Viewer sim write corrupted Master Strategy!');
    assert(afterViewerWrite.viewerSimulations.some(s => s.id === 'sim_qc_stress'), 'Viewer simulation did not persist to cloud!');

    // Deletion sync check: remove 99999 keys + stress sim and verify no zombie resurrection
    const cleanedTargets = { ...originalDb.masterTargets };
    delete cleanedTargets['99999_12'];
    const cleanedStrats = { ...originalDb.masterStrategies };
    delete cleanedStrats['b99999~12'];
    const restoreRes = await persistDbState({
      ...originalDb,
      masterTargets: cleanedTargets,
      masterStrategies: cleanedStrats,
      viewerSimulations: originalDb.viewerSimulations || []
    }, { changed: ['masterTargets', 'masterStrategies', 'viewerSimulations', 'timestandConfig'], actor: 'qc_cleanup' });
    assert(restoreRes.ok, 'Restore/cleanup failed');

    const afterDelete = await fetchServerDb();
    assert.strictEqual(afterDelete.masterTargets['99999_12'], undefined, 'Deleted target resurrected!');
    assert.strictEqual(afterDelete.masterStrategies['b99999~12'], undefined, 'Deleted strategy resurrected!');
    assert(!afterDelete.viewerSimulations.some(s => s.id === 'sim_qc_stress'), 'Deleted viewer sim resurrected!');
    console.log(' ✅ PASS | 15 concurrent bursts serialized cleanly, Viewer isolation verified, deletion sync verified');
  } catch (err) {
    // Best effort cleanup on failure
    await persistDbState(originalDb, { changed: ['masterTargets', 'masterStrategies', 'viewerSimulations', 'timestandConfig'], actor: 'qc_rollback' }).catch(() => {});
    throw err;
  }

  // 4. Cloud Excel History sort order check
  console.log('[A4] Verifying cloud Excel history order (newest cloud snapshot first, no duplicates)...');
  const historyList = await syncCloudExcelHistory();
  const latestUpload = getLatestUploadedSnapshotId(historyList);
  assert(latestUpload === 'snap_1795485641576', `Expected latest upload snap_1795485641576, got ${latestUpload}`);
  assert.strictEqual(historyList[0].id, 'snap_1795485641576', `Expected 18 Nov snapshot first, got ${historyList[0]?.id}`);
  assert(historyList.some(x => x.id === 'default_r05_16nov2026'), 'Missing 16 Nov baseline');
  assert(historyList.some(x => x.id === 'default_r05_13nov2026'), 'Missing 13 Nov baseline');
  console.log(` ✅ PASS | Cloud history sorted & deduped cleanly (${historyList.length} versions: ${historyList.map(h => h.realizationDate).join(' -> ')})`);
}

async function loginAs(page, username, password = 'mandiri123') {
  await page.waitForSelector('form', { timeout: 15000 });
  const inputs = await page.$$('form input');
  await inputs[0].click({ clickCount: 3 });
  await inputs[0].type(username);
  await inputs[1].click({ clickCount: 3 });
  await inputs[1].type(password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForFunction(() => !document.body.innerText.includes('LOGIN PORTAL BRANCHIQ'), { timeout: 15000 })
  ]);
  await sleep(2500);
}

async function waitForText(page, substring, timeout = 15000) {
  await page.waitForFunction(
    (sub) => document.body.innerText.includes(sub),
    { timeout },
    substring
  );
}

async function runBrowserE2EQC() {
  console.log('\n=======================================================');
  console.log(`🌐 PART B: MULTI-ROLE HEADLESS CHROME E2E QC`);
  console.log(`Target URL: ${TARGET_URL}`);
  console.log('=======================================================');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const adminErrors = [];
  const viewerErrors = [];
  const adminHttpErrors = [];
  const viewerHttpErrors = [];

  const adminCtx = await browser.createBrowserContext();
  const viewerCtx = await browser.createBrowserContext();
  const michaelCtx = await browser.createBrowserContext();

  const adminPage = await adminCtx.newPage();
  const viewerPage = await viewerCtx.newPage();
  const michaelPage = await michaelCtx.newPage();

  await adminPage.setViewport({ width: 1440, height: 900 });
  await viewerPage.setViewport({ width: 1440, height: 900 });
  await michaelPage.setViewport({ width: 1440, height: 900 });

  const attachWatchers = (p, errArr, httpArr) => {
    p.on('pageerror', e => errArr.push(`PAGEERROR: ${e.message}`));
    p.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (!txt.includes('fonts.gstatic.com') && !txt.includes('ERR_FAILED') && !txt.includes('favicon')) {
          errArr.push(`CONSOLE: ${txt}`);
        }
      }
    });
    p.on('response', res => {
      if (res.status() >= 400 && !res.url().includes('favicon')) {
        httpArr.push(`${res.status()} ${res.url()}`);
      }
    });
  };
  attachWatchers(adminPage, adminErrors, adminHttpErrors);
  attachWatchers(viewerPage, viewerErrors, viewerHttpErrors);
  attachWatchers(michaelPage, adminErrors, adminHttpErrors);

  // Accept confirm dialogs automatically when testing Reset/Delete actions
  adminPage.on('dialog', async d => await d.accept());
  viewerPage.on('dialog', async d => await d.accept());

  // Snapshot live production Supabase rows BEFORE browser tests so we never disturb real user edits (e.g. 10125_50, 10125_51)
  const { data: origTargetsSnap } = await supabase.from('master_targets').select('*');
  const { data: origStratsSnap } = await supabase.from('master_strategies').select('*');
  const origTargetKeys = (origTargetsSnap || []).map(r => r.key).filter(k => k !== '10125_12');
  const origNonSysStratKeys = (origStratsSnap || [])
    .map(r => r.key)
    .filter(k => !k.startsWith('__sys_') && k !== 'b10125~12');
  const origTimestandRow = (origStratsSnap || []).find(r => r.key === '__sys_timestand_config__');
  let origStartDate = '2026-11-16';
  try {
    const rawTs = origTimestandRow?.tactical_actions;
    const parsedTs = typeof rawTs === 'string' ? JSON.parse(rawTs) : rawTs;
    if (parsedTs?.startDate) origStartDate = parsedTs.startDate;
  } catch (e) {}

  try {
    // [B1] Superadmin login, initial cloud snapshot auto-load & simplified UI check
    console.log('[B1] Superadmin (alvin.superadmin) login & simplified UI check...');
    await adminPage.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await loginAs(adminPage, 'alvin.superadmin');
    await waitForText(adminPage, '18 November 2026', 15000);
    const adminCheck = await adminPage.evaluate(() => {
      const text = document.body.innerText;
      const hasSimulatorHeaderBtn = Boolean(document.querySelector('button[title="Buka What-If Simulator Skor"]'));
      const hasDetailRumusBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Detail Rumus'));
      const masterBar = document.querySelector('div[aria-label="Status Mode Master"]')?.innerText || '';
      const row12 = document.getElementById('metric-row-12')?.innerText || '';
      return { text, hasSimulatorHeaderBtn, hasDetailRumusBtn, masterBar, row12 };
    });
    assert(!/idea\s+by|developed\s+by/i.test(adminCheck.text), 'Idea by / Developed by must not exist');
    assert(adminCheck.text.includes('#45'), 'Superadmin should auto-load 18 Nov rank #45');
    assert(adminCheck.text.includes('Mode Edit Master Aktif'), 'Superadmin must start in Master Mode');
    assert(adminCheck.masterBar.includes('MODE MASTER (PERMANEN)') && adminCheck.masterBar.includes('Mode Simulasi'), 'Sticky top Master mode bar with switcher must be visible');
    assert(!adminCheck.hasSimulatorHeaderBtn, 'Duplicate Simulator button in Header must be removed');
    assert(!adminCheck.hasDetailRumusBtn, 'Duplicate Detail Rumus button must be removed');
    assert(!adminCheck.row12.includes('Porsi Target:'), 'Table row must not show cluttered Porsi Target');
    assert(!adminCheck.row12.includes('Target Asli Excel:'), 'Table row must not show cluttered Target Asli Excel');
    console.log(' ✅ PASS | Superadmin logged in, 18 Nov (#45), sticky Mode Master bar visible, no clutter');

    // [B2] Superadmin opens Row 12 Editor -> single-mode Master Editor, stays in Master Mode!
    console.log('[B2] Verifying Superadmin inline editor focuses only on Master Target & Strategy...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Target / Strategi'));
      if (!btn) throw new Error('Edit Target / Strategi button missing on row 12');
      btn.click();
    });
    await sleep(400);
    const hasFloatingBarBeforeSave = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarBeforeSave, 'BUG CHECK FAILED: Opening Master editor activated Simulation Bar!');
    const editorCheck = await adminPage.evaluate(() => document.getElementById('metric-row-12').nextElementSibling?.innerText || '');
    assert(editorCheck.includes('MODE MASTER'), 'Editor header must display MODE MASTER');
    assert(editorCheck.includes('1. Edit Target Master & Rumus Skor'), 'Left panel must focus on Target Master');
    assert(!editorCheck.includes('Simulasi Realisasi (Capaian)'), 'Duplicate 2-tab Simulasi Realisasi must NOT appear in Master Mode');

    // Edit Target to 555 and Strategy to QC Master Sync Strategy Test
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '555');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));

      const textarea = panel.querySelector('textarea');
      const tSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      tSetter.call(textarea, 'QC Master Sync Strategy Test Line 1\nQC Master Sync Strategy Test Line 2');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(300);

    // Ensure typing Target in Master Mode did NOT flip into Simulation Mode
    const hasFloatingBarDuringType = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarDuringType, 'BUG CHECK FAILED: Typing Master target flipped to Simulation Mode!');

    // Click Simpan ke Master (Permanen)
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const saveBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simpan ke Master (Permanen)'));
      if (!saveBtn) throw new Error('Simpan ke Master button not found');
      saveBtn.click();
    });
    await sleep(1500);

    const hasFloatingBarAfterSave = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarAfterSave, 'BUG CHECK FAILED: Saving Master flipped to Simulation Mode!');
    const row12TxtAfterSave = await adminPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(row12TxtAfterSave.includes('Master') && /555[,.]0/.test(row12TxtAfterSave), `Row 12 did not show Master 555,0: ${row12TxtAfterSave}`);
    assert(!row12TxtAfterSave.includes('Target Simulasi'), 'Row 12 falsely shows Target Simulasi in Master Mode!');
    assert(!row12TxtAfterSave.includes('Target Asli Excel:'), 'Row 12 must stay clean without Target Asli Excel!');

    // Confirm exact values persisted in live Supabase
    const { data: supTgt1 } = await supabase.from('master_targets').select('*').eq('key', '10125_12').single();
    const { data: supStr1 } = await supabase.from('master_strategies').select('*').eq('key', 'b10125~12').single();
    assert.strictEqual(Number(supTgt1?.target_value), 555, `Supabase target_value mismatch: ${JSON.stringify(supTgt1)}`);
    assert(supStr1?.strategy_text?.includes('QC Master Sync Strategy Test Line 1'), `Supabase strategy_text mismatch: ${JSON.stringify(supStr1)}`);
    console.log(' ✅ PASS | Superadmin stayed in Master Mode, saved Target=555 & Strategy to Supabase accurately');

    // [B3] Superadmin updates Timestand -> verify synced to Supabase
    console.log('[B3] Superadmin updates Timestand startDate -> verifying persistence...');
    await adminPage.evaluate(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dateInputs[0], '2026-11-18');
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(1200);

    // [B4] Incognito Viewer logs in -> must receive 18 Nov snapshot, Target 555, Strategy & Timestand!
    console.log('[B4] Incognito Viewer (rian) logs in -> verifying Master changes & 18 Nov snapshot sync...');
    await viewerPage.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await loginAs(viewerPage, 'rian');
    await waitForText(viewerPage, '18 November 2026', 15000);
    await waitForText(viewerPage, '555,0', 15000);

    const viewerRow12Text = await viewerPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const stratBtn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Lihat Strategi'));
      if (stratBtn) stratBtn.click();
      return row.innerText;
    });
    await sleep(300);
    const viewerRow12WithStrat = await viewerPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    const viewerBodyText = await viewerPage.evaluate(() => document.body.innerText);
    const viewerReadOnlyBar = await viewerPage.evaluate(() => document.querySelector('div[aria-label="Status Mode Read-Only"]')?.innerText || '');
    assert(viewerReadOnlyBar.includes('DATA MASTER (READ-ONLY)'), 'Sticky top Read-Only mode bar must be visible for Viewer');
    assert(viewerRow12Text.includes('Master') && /555[,.]0/.test(viewerRow12Text), `Viewer missing Master Target 555,0: ${viewerRow12Text}`);
    assert(viewerRow12WithStrat.includes('QC Master Sync Strategy Test Line 1'), `Viewer missing Master Strategy: ${viewerRow12WithStrat}`);
    assert(viewerBodyText.includes('18 Nov 2026 – 30 Nov 2026'), 'Viewer missing synced Timestand 18 Nov – 30 Nov 2026');
    console.log(' ✅ PASS | Viewer Read-Only sticky bar visible, received 18 Nov snapshot, Target 555, Strategy & Timestand');

    // [B5] Live sync WITHOUT page reload in Viewer when Superadmin updates Master Target 555 -> 560
    console.log('[B5] Testing live sync WITHOUT reload: Superadmin edits Target 555 -> 560...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Target / Strategi'));
      btn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '560');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
      const saveBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simpan ke Master (Permanen)'));
      saveBtn.click();
    });
    await sleep(1500);

    // Bring focus to Viewer tab (simulating user switching tabs) without reloading!
    await viewerPage.bringToFront();
    await viewerPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await waitForText(viewerPage, '560,0', 10000);
    console.log(' ✅ PASS | Viewer live-updated to Target 560,0 WITHOUT page reload');

    // [B6] Admin role (michael) verification
    console.log('[B6] Testing Admin role (michael) in Master Mode...');
    await michaelPage.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await loginAs(michaelPage, 'michael');
    await waitForText(michaelPage, '560,0', 15000);
    await michaelPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Target / Strategi'));
      btn.click();
    });
    await sleep(300);
    const michaelSimBar = await michaelPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!michaelSimBar, 'Admin michael entered simulation mode unexpectedly');
    console.log(' ✅ PASS | Admin (michael) sees Master Target 560,00 and stays in Master Mode');

    // [B7] Superadmin Top-Bar Switch + Simulasi Realisasi & Target + Strict Per-Account Privacy!
    console.log('[B7] Testing Superadmin top-bar switch, Simulasi Realisasi & Target, & strict privacy...');
    await adminPage.bringToFront();
    await adminPage.evaluate(() => {
      const topBar = document.querySelector('div[aria-label="Status Mode Master"]');
      const btn = topBar && Array.from(topBar.querySelectorAll('button')).find(b => b.innerText.includes('Mode Simulasi'));
      if (!btn) throw new Error('Mode Simulasi switcher missing in top Mode Master bar');
      btn.click();
    });
    await sleep(400);

    // Timestand Master inputs MUST be locked during Simulation Mode
    const timestandLockedInSim = await adminPage.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="date"]'));
      return inputs.length === 0 || inputs.every(inp => inp.disabled);
    });
    assert(timestandLockedInSim, 'Timestand Master must be locked while Superadmin is in Simulation Mode');

    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Capaian'));
      btn.click();
    });
    await sleep(300);
    const simPanelInfo = await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const panelText = panel?.innerText || '';
      const btns = panel ? Array.from(panel.querySelectorAll('button')).map(b => b.innerText) : [];
      return {
        panelText,
        hasRealTab: btns.some(t => t.includes('Simulasi Realisasi')),
        hasTargetTab: btns.some(t => t.includes('Simulasi Target'))
      };
    });
    assert(simPanelInfo.panelText.includes('MODE SIMULASI PRIBADI'), 'Admin simulation panel header must show MODE SIMULASI PRIBADI');
    assert(simPanelInfo.panelText.includes('1. Simulasi Angka & Rumus Skor'), 'Admin simulation editor must show 1. Simulasi Angka & Rumus Skor');
    assert(simPanelInfo.hasRealTab && simPanelInfo.hasTargetTab, 'Superadmin in Simulation Mode MUST have both Simulasi Realisasi & Simulasi Target tabs');

    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const set100Btn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Set 100% Target'));
      set100Btn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const tgtTabBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Target'));
      tgtTabBtn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '480');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(400);
    const adminSimRow = await adminPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(/480[,.]0/.test(adminSimRow) && adminSimRow.includes('Sim'), `Superadmin row 12 should show simulated target 480,0: ${adminSimRow}`);

    // Anti-Overlap Check: Top Sticky Simulation Bar MUST show MODE SIMULASI & Mode Master button and MUST NOT overlap Panel bottom buttons!
    const overlapCheck = await adminPage.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Status Simulasi Berjalan"]');
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      if (!aside || !panel) return { exists: false };
      panel.scrollIntoView({ block: 'center' });
      const btns = Array.from(panel.querySelectorAll('button')).filter(b =>
        b.innerText.includes('Tutup Panel') || b.innerText.includes('Selesai & Simpan Catatan')
      );
      const aRect = aside.getBoundingClientRect();
      const btnRects = btns.map(b => {
        const r = b.getBoundingClientRect();
        const overlaps = !(r.right <= aRect.left || r.left >= aRect.right || r.bottom <= aRect.top || r.top >= aRect.bottom);
        return { text: b.innerText, overlaps, aBottom: aRect.bottom, rTop: r.top };
      });
      return { exists: true, asideText: aside.innerText, btnRects };
    });
    assert(overlapCheck.exists, 'Sticky simulation bar should appear during Simulation Mode');
    assert(overlapCheck.asideText.includes('MODE SIMULASI') && overlapCheck.asideText.includes('Mode Master'), 'Sticky simulation bar must show MODE SIMULASI and Mode Master switcher');
    assert(overlapCheck.btnRects.length >= 2, 'Panel bottom buttons missing');
    for (const br of overlapCheck.btnRects) {
      assert(!br.overlaps, `BUG CHECK FAILED: Sticky simulation bar overlaps button "${br.text}": ${JSON.stringify(br)}`);
    }

    // Save Superadmin Private Simulation & test strict 3-account privacy!
    await adminPage.evaluate(() => {
      const saveSimBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simpan Simulasi ('));
      saveSimBtn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const modal = document.querySelector('.fixed');
      if (!modal.innerText.includes('PRIVAT')) throw new Error('Private simulation notice missing in Admin Save Modal');
      const inp = modal.querySelector('input[type="text"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'QC Superadmin Private Sim Test');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      modal.querySelector('button[type="submit"]').click();
    });
    await sleep(1400);

    // 1) Supabase Master Target MUST remain 560!
    const { data: supTgtAfterAdminSim } = await supabase.from('master_targets').select('*').eq('key', '10125_12').single();
    assert.strictEqual(Number(supTgtAfterAdminSim?.target_value), 560, 'Superadmin private simulation leaked to Master Target!');

    // 2) Superadmin owner DOES see it marked Privat (Akun Anda)
    await adminPage.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
    });
    await sleep(300);
    const adminListTxt = await adminPage.evaluate(() => document.getElementById('simulation-manager-section').innerText);
    assert(adminListTxt.includes('QC Superadmin Private Sim Test') && /Privat \(Akun Anda\)/i.test(adminListTxt), 'Superadmin owner must see own private simulation');
    await adminPage.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
    });

    // 3) Viewer (rian) MUST NOT see 480 nor QC Superadmin Private Sim Test!
    await viewerPage.bringToFront();
    await viewerPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await sleep(1200);
    const viewerPrivacyCheck = await viewerPage.evaluate(() => {
      const row12 = document.getElementById('metric-row-12').innerText;
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
      return row12;
    });
    await sleep(300);
    const viewerListTxt = await viewerPage.evaluate(() => {
      const sec = document.getElementById('simulation-manager-section').innerText;
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
      return sec;
    });
    assert(/560[,.]0/.test(viewerPrivacyCheck) && !/480[,.]0/.test(viewerPrivacyCheck), 'Viewer received Superadmin simulation instead of Master 560!');
    assert(!viewerListTxt.includes('QC Superadmin Private Sim Test'), 'PRIVACY BREACH: Viewer can see Superadmin private simulation!');

    // 4) Other Admin (michael) MUST NOT see QC Superadmin Private Sim Test!
    await michaelPage.bringToFront();
    await michaelPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await sleep(1200);
    await michaelPage.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
    });
    await sleep(300);
    const michaelListTxt = await michaelPage.evaluate(() => {
      const sec = document.getElementById('simulation-manager-section').innerText;
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
      return sec;
    });
    assert(!michaelListTxt.includes('QC Superadmin Private Sim Test'), 'PRIVACY BREACH: Other admin michael can see alvin.superadmin private simulation!');

    // Exit Simulation Mode back to Master directly via Top-Bar Switcher!
    await adminPage.bringToFront();
    await adminPage.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Status Simulasi Berjalan"]');
      const masterBtn = aside && Array.from(aside.querySelectorAll('button')).find(b => b.innerText.includes('Mode Master'));
      if (!masterBtn) throw new Error('Mode Master switcher missing in sticky simulation bar');
      masterBtn.click();
    });
    await sleep(400);
    const simBarAfterExit = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    const masterBarBack = await adminPage.evaluate(() => Boolean(document.querySelector('div[aria-label="Status Mode Master"]')));
    const row12RestoredToMaster = await adminPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(!simBarAfterExit && masterBarBack, 'BUG CHECK FAILED: Top-bar switcher did not return cleanly to Mode Master!');
    assert(/560[,.]0/.test(row12RestoredToMaster) && !/480[,.]0/.test(row12RestoredToMaster), 'Row 12 did not revert to Master 560,0 on exit!');
    console.log(' ✅ PASS | Superadmin Simulasi Realisasi+Target, top-bar switch, Timestand lock & 3-account privacy verified');

    // [B8] Viewer 1-Click Direct Open Panel + Viewer Target Simulation & Master Isolation Test
    console.log('[B8] Testing Viewer 1-click open, Simulasi Realisasi + Simulasi Target & Master isolation...');
    await viewerPage.bringToFront();
    // Viewer is currently still in Read-Only mode -> clicking Simulasi Capaian ONCE must open Panel Gambar 2 immediately!
    await viewerPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Capaian'));
      if (!btn) throw new Error('Viewer Simulasi Capaian button missing');
      btn.click();
    });
    await sleep(400);
    const viewerPanelState = await viewerPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12')?.nextElementSibling;
      const text = panel?.innerText || '';
      const btns = panel ? Array.from(panel.querySelectorAll('button')).map(b => b.innerText) : [];
      return {
        opened: text.includes('1. Simulasi Angka & Rumus Skor'),
        hasRealTab: btns.some(t => t.includes('Simulasi Realisasi')),
        hasTgtTab: btns.some(t => t.includes('Simulasi Target'))
      };
    });
    assert(viewerPanelState.opened, 'Viewer 1-click Simulasi Capaian did not open Panel Gambar 2 on first click!');
    assert(viewerPanelState.hasRealTab && viewerPanelState.hasTgtTab, 'Viewer Simulation Panel must expose both Simulasi Realisasi & Simulasi Target tabs');

    // 1) Click Set 100% Target on Realisasi tab
    await viewerPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const set100Btn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Set 100% Target'));
      set100Btn.click();
    });
    await sleep(300);

    // 2) Switch to Simulasi Target tab & change Viewer simulated target to 500
    await viewerPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const tgtTabBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Target'));
      tgtTabBtn.click();
    });
    await sleep(300);
    await viewerPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      if (!panel.innerText.includes('Simulasi Target Viewer')) {
        throw new Error('Simulasi Target Viewer notice missing after switching tab');
      }
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '500');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(400);

    const viewerRowAfterTargetSim = await viewerPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(/500[,.]0/.test(viewerRowAfterTargetSim) && viewerRowAfterTargetSim.includes('Sim'), `Viewer row 12 should reflect Target Simulasi 500,0 with Sim badge: ${viewerRowAfterTargetSim}`);

    // 3) Save Viewer simulation & verify Supabase Master stays 560 while Viewer Simulation stores targets["12"] === 500
    await viewerPage.evaluate(() => {
      const saveSimBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simpan Simulasi ('));
      saveSimBtn.click();
    });
    await sleep(300);
    await viewerPage.evaluate(() => {
      const modal = document.querySelector('.fixed');
      const inp = modal.querySelector('input[type="text"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, 'QC Viewer Sim Isolation Test');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      modal.querySelector('button[type="submit"]').click();
    });
    await sleep(1400);
    const { data: supTgtAfterSim } = await supabase.from('master_targets').select('*').eq('key', '10125_12').single();
    assert.strictEqual(Number(supTgtAfterSim?.target_value), 560, 'Viewer target simulation mutated Master Target!');
    const { data: supSimsRow } = await supabase.from('master_strategies').select('*').eq('key', '__sys_viewer_simulations__').single();
    const rawSims = supSimsRow?.tactical_actions;
    const savedSims = Array.isArray(rawSims) ? rawSims : JSON.parse(rawSims || '[]');
    const qcSim = savedSims.find(s => s.title === 'QC Viewer Sim Isolation Test');
    assert(qcSim && Number(qcSim.targets?.['12']) === 500, `Viewer simulation did not save simulated target 500: ${JSON.stringify(qcSim)}`);
    console.log(' ✅ PASS | Viewer 1-click opened panel, simulated Realisasi & Target=500, & Master stayed untouched (560)');

    // [B9] Regression checks: Ranking Modal, File Upload Modal order, Search Scroll, Mobile View, CMS
    console.log('[B9] Running UI Regression Suite (Leaderboard, Upload Order, CMS, Mobile Clean Cards)...');
    await adminPage.bringToFront();

    // 9a. Leaderboard & Grade Filter
    await adminPage.click('button[title="Buka Leaderboard 164 Cabang"]');
    await sleep(600);
    const compText = await adminPage.evaluate(() => document.querySelector('.fixed').innerText);
    assert(compText.includes('Posisi 18 November 2026'), 'Leaderboard modal missing dynamic 18 November 2026 date');
    await adminPage.evaluate(() => {
      const modal = document.querySelector('.fixed');
      const b3 = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('B.3') && b.innerText.includes('Kelas'));
      b3.click();
    });
    await sleep(400);
    const b3Count = await adminPage.evaluate(() => document.querySelector('.fixed tbody').querySelectorAll('tr').length);
    assert.strictEqual(b3Count, 57, `Expected 57 B.3 branches, got ${b3Count}`);
    await adminPage.click('button[title="Tutup Modal"]');
    await sleep(300);

    // 9b. FileUploadModal order (18 Nov -> 16 Nov -> 13 Nov, 3 items, no duplicates)
    await adminPage.click('button[title*="Upload File Excel"]');
    await sleep(600);
    const histText = await adminPage.evaluate(() => document.querySelector('.fixed').innerText);
    assert(histText.includes('3 Versi Tersimpan'), `Expected 3 history versions (18 Nov, 16 Nov, 13 Nov), got: ${histText.slice(0, 600)}`);
    const idx18 = histText.indexOf('Posisi: 18 November 2026');
    const idx16 = histText.indexOf('Posisi: 16 November 2026');
    const idx13 = histText.indexOf('Posisi: 13 November 2026');
    assert(idx18 > -1 && idx16 > idx18 && idx13 > idx16, 'History snapshots order mismatch (expected 18 -> 16 -> 13)');
    await adminPage.evaluate(() => {
      const modal = document.querySelector('.fixed');
      modal.querySelector('svg.lucide-x').closest('button').click();
    });
    await sleep(300);

    // 9c. CMS Page (Superadmin)
    await adminPage.evaluate(() => {
      const cmsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'CMS');
      cmsBtn.click();
    });
    await sleep(400);
    const cmsOk = await adminPage.evaluate(() => document.body.innerText.includes('CMS Manajemen User & Hak Akses BranchIQ'));
    assert(cmsOk, 'Superadmin CMS page failed to render');
    await adminPage.evaluate(() => {
      const backBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Kembali ke Dashboard Skor'));
      backBtn.click();
    });
    await sleep(400);

    // 9d. Mobile viewport check (clean cards without Porsi / Detail Rumus clutter)
    await adminPage.setViewport({ width: 390, height: 844, isMobile: true });
    await sleep(400);
    const mobCheck = await adminPage.evaluate(() => {
      const card = document.getElementById('metric-mob-12');
      return { exists: Boolean(card), text: card ? card.innerText : '' };
    });
    assert(mobCheck.exists, 'Mobile metric card #metric-mob-12 missing');
    assert(!mobCheck.text.includes('Porsi:'), 'Mobile card should not show cluttered Porsi:');
    await adminPage.setViewport({ width: 1440, height: 900, isMobile: false });
    await sleep(300);
    console.log(' ✅ PASS | All UI regressions (Leaderboard, Upload Order, CMS, Clean Mobile) passed cleanly');

    // [B10] Non-Destructive Per-Row Reset & Verification (Preserving Real Production Edits!)
    console.log('[B10] Resetting ONLY test row #12, timestand & QC test sim (preserving production rows)...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Target / Strategi'));
      btn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const resetTgtBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Reset ke Excel Asli'));
      if (resetTgtBtn) resetTgtBtn.click();
      const resetStrBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Reset ke Strategi Bawaan'));
      if (resetStrBtn) resetStrBtn.click();
    });
    await sleep(1200);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12')?.nextElementSibling;
      const closeBtn = panel && Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Tutup Panel'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(300);

    // Reset Timestand start date back to original production value
    await adminPage.evaluate((origDate) => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dateInputs[0], origDate);
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }, origStartDate);
    await sleep(1000);

    // Delete ONLY QC test scenario card(s) from Simulasi Tersimpan (leaving real user sims untouched)
    await adminPage.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Simulasi Tersimpan'));
      listBtn.click();
    });
    await sleep(400);
    await adminPage.evaluate(() => {
      const delBtns = Array.from(document.querySelectorAll('button[title="Hapus Simulasi"]')).filter(b => {
        const cardText = b.parentElement?.parentElement?.innerText || '';
        return cardText.includes('QC Viewer Sim Isolation Test') || cardText.includes('QC Superadmin Private Sim Test');
      });
      delBtns.forEach(b => b.click());
    });
    await sleep(1200);

    // Verify test keys cleaned AND all original production keys are 100% intact
    const { data: finalTargets } = await supabase.from('master_targets').select('*');
    const { data: finalStrats } = await supabase.from('master_strategies').select('*');
    assert(!(finalTargets || []).some(t => t.key === '10125_12'), 'Test key 10125_12 still in Supabase!');
    assert(!(finalStrats || []).some(s => s.key === 'b10125~12'), 'Test key b10125~12 still in Supabase!');
    for (const k of origTargetKeys) {
      assert((finalTargets || []).some(t => t.key === k), `Production target ${k} was unexpectedly removed!`);
    }
    for (const k of origNonSysStratKeys) {
      assert((finalStrats || []).some(s => s.key === k), `Production strategy ${k} was unexpectedly removed!`);
    }

    // Check console & HTTP errors
    assert.strictEqual(adminErrors.length, 0, `Admin/Michael Console Errors: ${adminErrors.join(' | ')}`);
    assert.strictEqual(viewerErrors.length, 0, `Viewer Console Errors: ${viewerErrors.join(' | ')}`);
    assert.strictEqual(adminHttpErrors.length, 0, `Admin/Michael HTTP Errors: ${adminHttpErrors.join(' | ')}`);
    assert.strictEqual(viewerHttpErrors.length, 0, `Viewer HTTP Errors: ${viewerHttpErrors.join(' | ')}`);

    console.log(' ✅ PASS | Test row #12 cleaned, all production data intact, 0 console & HTTP errors!');
  } finally {
    // Guaranteed cleanup of QC test keys even if a step throws early
    try { await supabase.from('master_targets').delete().eq('key', '10125_12'); } catch (e) {}
    try { await supabase.from('master_strategies').delete().eq('key', 'b10125~12'); } catch (e) {}
    await browser.close();
  }
}

async function main() {
  const start = Date.now();
  if (!SKIP_STRESS) {
    await runStressTests();
  }
  await runBrowserE2EQC();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n🎉 ALL STRESS TESTS & E2E QC PASSED 100% IN ${elapsed}s!`);
}

main().catch(err => {
  console.error('\n❌ QC / STRESS TEST FAILED:', err);
  process.exit(1);
});
