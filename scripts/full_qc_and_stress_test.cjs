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
    normalizeMasterReals,
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
  const normReal = normalizeMasterReals({ '10125_12': { real: '450.5' }, '10125_13': 100, 'bad': NaN, 'empty': '' });
  assert.deepStrictEqual(normReal, { '10125_12': 450.5, '10125_13': 100 });
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
        masterReals: { ...(originalDb.masterReals || {}), '99999_12': 200 + b },
        masterStrategies: {
          ...originalDb.masterStrategies,
          'b99999~12': { text: `Burst Strategy #${b}`, scope: 'branch', branchCode: '99999', rowId: 12, updatedBy: 'qc_stress' }
        }
      };
      bursts.push(persistDbState(nextDb, { changed: ['masterTargets', 'masterReals', 'masterStrategies'], actor: 'qc_stress' }));
    }
    const burstResults = await Promise.all(bursts);
    assert(burstResults.every(r => r.ok), `Some burst writes failed: ${JSON.stringify(burstResults.filter(r => !r.ok))}`);

    const afterBurst = await fetchServerDb();
    assert.strictEqual(afterBurst.masterTargets['99999_12'], 115, `Expected serialized final value 115, got ${afterBurst.masterTargets['99999_12']}`);
    assert.strictEqual(afterBurst.masterReals['99999_12'], 215, `Expected serialized final real 215, got ${afterBurst.masterReals['99999_12']}`);
    assert.strictEqual(afterBurst.masterStrategies['b99999~12']?.text, 'Burst Strategy #15', 'Strategy text mismatch after bursts');

    // Viewer simulation scoped write MUST NOT alter Master Targets/Reals/Strategies
    const simWriteRes = await persistDbState({
      ...afterBurst,
      masterTargets: {}, // stale/empty in hypothetical Viewer memory, shouldn't touch cloud because changed=['viewerSimulations']!
      masterReals: {},
      viewerSimulations: [...(originalDb.viewerSimulations || []), { id: 'sim_qc_stress', title: 'QC Stress Sim', branchCode: '99999' }]
    }, { changed: ['viewerSimulations'], actor: 'rian' });
    assert(simWriteRes.ok, 'Viewer simulation write failed');

    const afterViewerWrite = await fetchServerDb();
    assert.strictEqual(afterViewerWrite.masterTargets['99999_12'], 115, 'Viewer sim write corrupted Master Target!');
    assert.strictEqual(afterViewerWrite.masterReals['99999_12'], 215, 'Viewer sim write corrupted Master Realisasi!');
    assert.strictEqual(afterViewerWrite.masterStrategies['b99999~12']?.text, 'Burst Strategy #15', 'Viewer sim write corrupted Master Strategy!');
    assert(afterViewerWrite.viewerSimulations.some(s => s.id === 'sim_qc_stress'), 'Viewer simulation did not persist to cloud!');

    // Deletion sync check: remove 99999 keys + stress sim and verify no zombie resurrection
    const cleanedTargets = { ...originalDb.masterTargets };
    delete cleanedTargets['99999_12'];
    const cleanedReals = { ...(originalDb.masterReals || {}) };
    delete cleanedReals['99999_12'];
    const cleanedStrats = { ...originalDb.masterStrategies };
    delete cleanedStrats['b99999~12'];
    const restoreRes = await persistDbState({
      ...originalDb,
      masterTargets: cleanedTargets,
      masterReals: cleanedReals,
      masterStrategies: cleanedStrats,
      viewerSimulations: originalDb.viewerSimulations || []
    }, { changed: ['masterTargets', 'masterReals', 'masterStrategies', 'viewerSimulations', 'timestandConfig'], actor: 'qc_cleanup' });
    assert(restoreRes.ok, 'Restore/cleanup failed');

    const afterDelete = await fetchServerDb();
    assert.strictEqual(afterDelete.masterTargets['99999_12'], undefined, 'Deleted target resurrected!');
    assert.strictEqual(afterDelete.masterReals['99999_12'], undefined, 'Deleted real resurrected!');
    assert.strictEqual(afterDelete.masterStrategies['b99999~12'], undefined, 'Deleted strategy resurrected!');
    assert(!afterDelete.viewerSimulations.some(s => s.id === 'sim_qc_stress'), 'Deleted viewer sim resurrected!');
    console.log(' ✅ PASS | 15 concurrent bursts serialized cleanly, Viewer isolation verified, deletion sync verified');
  } catch (err) {
    // Best effort cleanup on failure
    await persistDbState(originalDb, { changed: ['masterTargets', 'masterReals', 'masterStrategies', 'viewerSimulations', 'timestandConfig'], actor: 'qc_rollback' }).catch(() => {});
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

  // Keep browser-level CDP session attached until browser.close(); detaching resets Browser.setPermission overrides in Chromium
  const browserCdp = await browser.target().createCDPSession();
  const targetOrigin = new URL(TARGET_URL).origin;
  for (const ctx of [adminCtx, viewerCtx, michaelCtx]) {
    for (const name of ['local-network-access', 'local-network', 'loopback-network']) {
      try {
        await browserCdp.send('Browser.setPermission', {
          origin: targetOrigin,
          browserContextId: ctx.id,
          permission: { name },
          setting: 'granted'
        });
      } catch (e) {}
    }
  }

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

    // [B2] Superadmin opens Row 12 Editor -> verifies Target is LOCKED, edits Master Realisasi (450) & Strategy, stays in Master Mode!
    console.log('[B2] Verifying Superadmin Master Mode (Locked Target + Edit Realisasi Master + Strategy)...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Master'));
      if (!btn) throw new Error('Edit Master button missing on row 12');
      btn.click();
    });
    await sleep(400);
    const hasFloatingBarBeforeSave = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarBeforeSave, 'BUG CHECK FAILED: Opening Master editor activated Simulation Bar!');
    const editorCheck = await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const btns = panel ? Array.from(panel.querySelectorAll('button')).map(b => b.innerText) : [];
      const numInputs = panel ? panel.querySelectorAll('input[type="number"]').length : 0;
      return {
        text: panel?.innerText || '',
        numInputs,
        hasTargetTab: btns.some(t => t.includes('Edit Target Master') || t.includes('Simulasi Target'))
      };
    });
    assert(editorCheck.text.includes('MODE MASTER'), 'Editor header must display MODE MASTER');
    assert(editorCheck.text.includes('1. Edit Realisasi Master & Rumus Skor'), 'Left panel must show 1. Edit Realisasi Master & Rumus Skor');
    assert(editorCheck.text.includes('Target Resmi (Terkunci)'), 'Master Editor must show Target Resmi (Terkunci)');
    assert(!editorCheck.hasTargetTab, 'BUG CHECK FAILED: Master Editor must NOT expose any Edit Target Master or Simulasi Target tab!');
    assert.strictEqual(editorCheck.numInputs, 1, `Expected only 1 number input (Realisasi), got ${editorCheck.numInputs}`);

    // Edit Master Realisasi = 450 + Strategy
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '450');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));

      const textarea = panel.querySelector('textarea');
      const tSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      tSetter.call(textarea, 'QC Master Sync Strategy Test Line 1\nQC Master Sync Strategy Test Line 2');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(300);

    // Ensure typing Realisasi in Master Mode did NOT flip into Simulation Mode
    const hasFloatingBarDuringType = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarDuringType, 'BUG CHECK FAILED: Typing Master Realisasi flipped to Simulation Mode!');

    // Click Simpan ke Master (Permanen)
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const saveBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simpan ke Master (Permanen)'));
      if (!saveBtn) throw new Error('Simpan ke Master button not found');
      saveBtn.click();
    });
    await sleep(1600);

    const hasFloatingBarAfterSave = await adminPage.evaluate(() => Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]')));
    assert(!hasFloatingBarAfterSave, 'BUG CHECK FAILED: Saving Master flipped to Simulation Mode!');
    const row12TxtAfterSave = await adminPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(
      row12TxtAfterSave.includes('Master') && /450[,.]0/.test(row12TxtAfterSave),
      `Row 12 did not show Master Realisasi 450,0: ${row12TxtAfterSave}`
    );
    assert(!/\bSim\b/.test(row12TxtAfterSave) && !row12TxtAfterSave.includes('Target Simulasi'), 'Row 12 falsely shows Sim in Master Mode!');

    // Confirm exact values persisted in live Supabase (no master_targets test key, master_strategies & __sys_master_reals__)
    const { data: supTgt1 } = await supabase.from('master_targets').select('*').eq('key', '10125_12').maybeSingle();
    const { data: supStr1 } = await supabase.from('master_strategies').select('*').eq('key', 'b10125~12').single();
    const { data: supReals1 } = await supabase.from('master_strategies').select('*').eq('key', '__sys_master_reals__').single();
    assert.strictEqual(supTgt1, null, `Locked target 10125_12 should NOT be created in master_targets: ${JSON.stringify(supTgt1)}`);
    assert(supStr1?.strategy_text?.includes('QC Master Sync Strategy Test Line 1'), `Supabase strategy_text mismatch: ${JSON.stringify(supStr1)}`);
    assert.strictEqual(Number(supReals1?.tactical_actions?.['10125_12']), 450, `Supabase master_reals mismatch: ${JSON.stringify(supReals1?.tactical_actions)}`);
    console.log(' ✅ PASS | Superadmin stayed in Master Mode, Target locked, saved Real=450 & Strategy to Supabase');

    // [B3] Superadmin updates Timestand -> verify synced to Supabase
    console.log('[B3] Superadmin updates Timestand startDate -> verifying persistence...');
    await adminPage.evaluate(() => {
      const dateInputs = document.querySelectorAll('input[type="date"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(dateInputs[0], '2026-11-18');
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(1200);

    // [B4] Incognito Viewer logs in -> must receive 18 Nov snapshot, Master Real 450, visible Target, Strategy & Timestand!
    console.log('[B4] Incognito Viewer (rian) logs in -> verifying Master Realisasi, locked Target visibility, Strategy & 18 Nov snapshot sync...');
    await viewerPage.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await loginAs(viewerPage, 'rian');
    await waitForText(viewerPage, '18 November 2026', 15000);
    await waitForText(viewerPage, '450,0', 15000);

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
    assert(
      viewerRow12Text.includes('Master') && /450[,.]0/.test(viewerRow12Text) && viewerRow12Text.includes('Jadwal'),
      `Viewer missing Master Real 450,0 or visible Target/Jadwal: ${viewerRow12Text}`
    );
    assert(viewerRow12WithStrat.includes('QC Master Sync Strategy Test Line 1'), `Viewer missing Master Strategy: ${viewerRow12WithStrat}`);
    assert(viewerBodyText.includes('18 Nov 2026 – 30 Nov 2026'), 'Viewer missing synced Timestand 18 Nov – 30 Nov 2026');
    console.log(' ✅ PASS | Viewer Read-Only sticky bar visible, received Master Real 450, locked Target visible, Strategy & Timestand');

    // [B5] Live sync WITHOUT page reload in Viewer when Superadmin updates Master Real 450->475
    console.log('[B5] Testing live sync WITHOUT reload: Superadmin edits Master Real 450->475...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Master'));
      btn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '475');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
      const saveBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Simpan ke Master (Permanen)'));
      saveBtn.click();
    });
    await sleep(1600);

    // Bring focus to Viewer tab (simulating user switching tabs) without reloading!
    await viewerPage.bringToFront();
    await viewerPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await waitForText(viewerPage, '475,0', 10000);
    console.log(' ✅ PASS | Viewer live-updated to Real 475,0 WITHOUT page reload');

    // [B6] Admin role (michael) verification
    console.log('[B6] Testing Admin role (michael) in Master Mode (Target Locked)...');
    await michaelPage.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await loginAs(michaelPage, 'michael');
    await waitForText(michaelPage, '475,0', 15000);
    await michaelPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Master'));
      btn.click();
    });
    await sleep(300);
    const michaelCheck = await michaelPage.evaluate(() => {
      const simBar = Boolean(document.querySelector('aside[aria-label="Status Simulasi Berjalan"]'));
      const panel = document.getElementById('metric-row-12')?.nextElementSibling;
      const btns = panel ? Array.from(panel.querySelectorAll('button')).map(b => b.innerText) : [];
      return { simBar, hasTgtTab: btns.some(t => t.includes('Edit Target Master') || t.includes('Simulasi Target')) };
    });
    assert(!michaelCheck.simBar, 'Admin michael entered simulation mode unexpectedly');
    assert(!michaelCheck.hasTgtTab, 'Admin michael should NOT see any Target edit tab');
    console.log(' ✅ PASS | Admin (michael) sees Master Real 475,0, Target locked, and stays in Master Mode');

    // [B7] Superadmin Top-Bar Switch + Simulasi Realisasi ONLY (Target Locked) + Strict Per-Account Privacy!
    console.log('[B7] Testing Superadmin top-bar switch, Simulasi Realisasi ONLY (Target Locked) & strict privacy...');
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
      const numInputs = panel ? panel.querySelectorAll('input[type="number"]').length : 0;
      return {
        panelText,
        numInputs,
        hasTargetTab: btns.some(t => t.includes('Simulasi Target') || t.includes('Edit Target Master'))
      };
    });
    assert(simPanelInfo.panelText.includes('MODE SIMULASI PRIBADI'), 'Admin simulation panel header must show MODE SIMULASI PRIBADI');
    assert(simPanelInfo.panelText.includes('1. Simulasi Realisasi & Rumus Skor'), 'Admin simulation editor must show 1. Simulasi Realisasi & Rumus Skor');
    assert(simPanelInfo.panelText.includes('Target Resmi (Terkunci)'), 'Admin simulation editor must show Target Resmi (Terkunci)');
    assert(!simPanelInfo.hasTargetTab, 'BUG CHECK FAILED: Superadmin Simulation Mode must NOT expose Simulasi Target or Edit Target Master!');
    assert.strictEqual(simPanelInfo.numInputs, 1, `Expected only 1 number input in Admin simulation, got ${simPanelInfo.numInputs}`);

    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const set100Btn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Set 100% Target'));
      set100Btn.click();
    });
    await sleep(250);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '520');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(400);
    const adminSimRow = await adminPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(/520[,.]0/.test(adminSimRow) && adminSimRow.includes('Sim'), `Superadmin row 12 should show simulated real 520,0: ${adminSimRow}`);

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

    // 1) Supabase Master Real MUST remain 475, no target key created, and saved sim has empty targets!
    const { data: supRealsAfterAdminSim } = await supabase.from('master_strategies').select('*').eq('key', '__sys_master_reals__').single();
    assert.strictEqual(Number(supRealsAfterAdminSim?.tactical_actions?.['10125_12']), 475, 'Superadmin private simulation leaked to Master Realisasi!');
    const { data: supSimsRowAdmin } = await supabase.from('master_strategies').select('*').eq('key', '__sys_viewer_simulations__').single();
    const savedSimsAdmin = Array.isArray(supSimsRowAdmin?.tactical_actions) ? supSimsRowAdmin.tactical_actions : JSON.parse(supSimsRowAdmin?.tactical_actions || '[]');
    const adminQcSim = savedSimsAdmin.find(s => s.title === 'QC Superadmin Private Sim Test');
    assert(adminQcSim && Number(adminQcSim.reals?.['12']) === 520, `Admin sim reals['12'] mismatch: ${JSON.stringify(adminQcSim)}`);
    assert(Object.keys(adminQcSim.targets || {}).length === 0, `Locked targets leaked into Admin sim: ${JSON.stringify(adminQcSim.targets)}`);

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

    // 3) Viewer (rian) MUST NOT see 520 nor QC Superadmin Private Sim Test!
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
    assert(/475[,.]0/.test(viewerPrivacyCheck) && !/520[,.]0/.test(viewerPrivacyCheck), 'Viewer received Superadmin simulation instead of Master 475!');
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
    assert(/475[,.]0/.test(row12RestoredToMaster) && !/520[,.]0/.test(row12RestoredToMaster), 'Row 12 did not revert to Master 475,0 on exit!');
    console.log(' ✅ PASS | Superadmin Simulasi Realisasi ONLY (Target Locked), top-bar switch, Timestand lock & 3-account privacy verified');

    // [B8] Viewer 1-Click Direct Open Panel + Realisasi Simulation (Target Locked) & Master Isolation Test
    console.log('[B8] Testing Viewer 1-click open, Simulasi Realisasi (Target Locked) & Master isolation...');
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
      const numInputs = panel ? panel.querySelectorAll('input[type="number"]').length : 0;
      return {
        opened: text.includes('1. Simulasi Realisasi & Rumus Skor'),
        hasLockedNotice: text.includes('Target Resmi (Terkunci)'),
        numInputs,
        hasTargetTab: btns.some(t => t.includes('Simulasi Target') || t.includes('Edit Target Master'))
      };
    });
    assert(viewerPanelState.opened, 'Viewer 1-click Simulasi Capaian did not open Panel Editor on first click!');
    assert(viewerPanelState.hasLockedNotice, 'Viewer Simulation Panel must clearly display Target Resmi (Terkunci)');
    assert(!viewerPanelState.hasTargetTab, 'BUG CHECK FAILED: Viewer Simulation Panel must NOT expose Simulasi Target tab!');
    assert.strictEqual(viewerPanelState.numInputs, 1, `Expected only 1 number input in Viewer simulation, got ${viewerPanelState.numInputs}`);

    // Change Viewer simulated Realisasi to 510
    await viewerPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const numInput = panel.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(numInput, '510');
      numInput.dispatchEvent(new Event('input', { bubbles: true }));
      numInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(400);

    const viewerRowAfterRealSim = await viewerPage.evaluate(() => document.getElementById('metric-row-12').innerText);
    assert(/510[,.]0/.test(viewerRowAfterRealSim) && viewerRowAfterRealSim.includes('Sim'), `Viewer row 12 should reflect Realisasi Simulasi 510,0 with Sim badge: ${viewerRowAfterRealSim}`);

    // Save Viewer simulation & verify Supabase Master stays 475 while Viewer Simulation stores reals["12"] === 510 and empty targets
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
    const { data: supTgtAfterSim } = await supabase.from('master_targets').select('*').eq('key', '10125_12').maybeSingle();
    assert.strictEqual(supTgtAfterSim, null, 'Locked target test key 10125_12 appeared in master_targets!');
    const { data: supRealsAfterSim } = await supabase.from('master_strategies').select('*').eq('key', '__sys_master_reals__').single();
    assert.strictEqual(Number(supRealsAfterSim?.tactical_actions?.['10125_12']), 475, 'Viewer real simulation mutated Master Realisasi!');
    const { data: supSimsRow } = await supabase.from('master_strategies').select('*').eq('key', '__sys_viewer_simulations__').single();
    const rawSims = supSimsRow?.tactical_actions;
    const savedSims = Array.isArray(rawSims) ? rawSims : JSON.parse(rawSims || '[]');
    const qcSim = savedSims.find(s => s.title === 'QC Viewer Sim Isolation Test');
    assert(qcSim && Number(qcSim.reals?.['12']) === 510, `Viewer simulation did not save simulated real 510: ${JSON.stringify(qcSim)}`);
    assert(Object.keys(qcSim.targets || {}).length === 0, `Viewer simulation saved locked targets: ${JSON.stringify(qcSim.targets)}`);
    console.log(' ✅ PASS | Viewer 1-click opened panel, simulated Realisasi=510 (Target locked) & Master stayed 475');

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
    console.log('[B10] Resetting ONLY test row #12 (Real, Strategy), timestand & QC test sims (preserving production rows)...');
    await adminPage.evaluate(() => {
      const row = document.getElementById('metric-row-12');
      const btn = Array.from(row.querySelectorAll('button')).find(b => b.innerText.includes('Edit Master'));
      btn.click();
    });
    await sleep(300);
    await adminPage.evaluate(() => {
      const panel = document.getElementById('metric-row-12').nextElementSibling;
      const resetRealBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Reset Realisasi ke Excel'));
      if (resetRealBtn) resetRealBtn.click();
      const resetStrBtn = Array.from(panel.querySelectorAll('button')).find(b => b.innerText.includes('Reset ke Strategi Bawaan'));
      if (resetStrBtn) resetStrBtn.click();
    });
    await sleep(1800);
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
    await sleep(1400);

    // Verify test keys cleaned AND all original production keys are 100% intact
    const { data: finalTargets } = await supabase.from('master_targets').select('*');
    const { data: finalStrats } = await supabase.from('master_strategies').select('*');
    const finalRealsRow = (finalStrats || []).find(s => s.key === '__sys_master_reals__');
    const finalRealsMap = finalRealsRow?.tactical_actions || {};
    assert(!(finalTargets || []).some(t => t.key === '10125_12'), 'Test key 10125_12 still in master_targets!');
    assert(!(finalStrats || []).some(s => s.key === 'b10125~12'), 'Test key b10125~12 still in master_strategies!');
    assert.strictEqual(finalRealsMap['10125_12'], undefined, 'Test key 10125_12 still in __sys_master_reals__!');
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
    try {
      const { data: mr } = await supabase.from('master_strategies').select('*').eq('key', '__sys_master_reals__').single();
      if (mr?.tactical_actions && mr.tactical_actions['10125_12'] !== undefined) {
        const cleaned = { ...mr.tactical_actions };
        delete cleaned['10125_12'];
        await supabase.from('master_strategies').upsert({
          key: '__sys_master_reals__',
          branch_code: 'sys',
          row_id: -4,
          scope: 'system',
          strategy_text: 'master_reals',
          tactical_actions: cleaned,
          updated_by: 'qc_cleanup',
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}
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
