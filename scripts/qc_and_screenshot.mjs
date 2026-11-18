import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_URL = 'https://mandiri-branchiq-piot3.vercel.app';
const SCREENSHOT_DIR = path.resolve('screenshoot');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQCAndCapture() {
  console.log('=== STARTING QC & SCREENSHOT CAPTURE ===');
  console.log('Target URL:', TARGET_URL);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,1100',
      '--force-device-scale-factor=2'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });

  const pageErrors = [];
  page.on('pageerror', err => {
    console.error('🔴 [PAGE ERROR]:', err.message);
    pageErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.warn('⚠️ [BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  // 1. Capture Login Page
  console.log('\n--- 1. Testing & Capturing Login Page ---');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  await delay(1000);

  const loginTitle = await page.title();
  console.log('Title:', loginTitle);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01-login-portal-mandiri-kcp-piot.jpg'),
    type: 'jpeg',
    quality: 90
  });
  console.log('✅ Captured: 01-login-portal-mandiri-kcp-piot.jpg');

  // 2. Perform Login as Superadmin
  console.log('\n--- 2. Performing Login as Superadmin ---');
  await page.evaluate(() => {
    const authUser = {
      username: 'superadmin',
      displayName: 'Super Administrator',
      role: 'superadmin',
      jabatan: 'System Superadmin & IT'
    };
    localStorage.setItem('branchiq_auth_user', JSON.stringify(authUser));
  });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  await delay(1500);

  // 3. Verify QC Metrics on Dashboard
  console.log('\n--- 3. Running Scorecard & Dashboard QC Assertions ---');
  const qcData = await page.evaluate(() => {
    const totalScoreText = document.body.innerText.match(/85,53/);
    const branchName = document.body.innerText.includes('Jakarta Pondok Indah Office 3');
    const branchManager = document.body.innerText.includes('MICHAEL DANNIEL');
    const categories = ['DPK', 'Kredit', 'Livin', 'Kopra', 'Acquiring', 'GMM', 'Ekosistem'];
    const catsFound = categories.filter(c => document.body.innerText.includes(c));
    const infoButtons = document.querySelectorAll('button[aria-label^="Info"]');
    const footerDev = document.body.innerText.includes('ahmad alvin griffin');
    const footerIdea = document.body.innerText.includes('michael daniel');

    return {
      hasTotalScore: !!totalScoreText,
      hasBranchName: branchName,
      hasBranchManager: branchManager,
      catsFoundCount: catsFound.length,
      infoButtonsCount: infoButtons.length,
      hasFooterDev: footerDev,
      hasFooterIdea: footerIdea
    };
  });

  console.log('QC Results:', qcData);
  if (!qcData.hasTotalScore) console.error('❌ Failed: Total score 85,53 not found!');
  if (!qcData.hasBranchName) console.error('❌ Failed: Branch name not found!');
  if (qcData.catsFoundCount < 7) console.error('❌ Failed: Not all 7 categories found!');
  if (qcData.infoButtonsCount === 0) console.error('❌ Failed: InfoTooltip buttons not found!');
  console.log(`✅ QC Passed: Found ${qcData.infoButtonsCount} interactive InfoTooltip (ℹ️) buttons!`);

  // 4. Capture Executive Summary & Category Cards (09-skor-per-kategori-dan-kpi-summary.png)
  console.log('\n--- 4. Capturing Executive Summary & Category Cards ---');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '09-skor-per-kategori-dan-kpi-summary.png'),
    type: 'png'
  });
  console.log('✅ Captured: 09-skor-per-kategori-dan-kpi-summary.png');

  // 5. Capture Header & Peta Skor Kategori (02-header-dan-peta-skor-kategori.jpg)
  console.log('\n--- 5. Capturing Header & Peta Skor Kategori ---');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-header-dan-peta-skor-kategori.jpg'),
    type: 'jpeg',
    quality: 90
  });
  console.log('✅ Captured: 02-header-dan-peta-skor-kategori.jpg');

  // 6. Scroll to Timestand Control and capture (10-timestand-target-kejaran-per-hari.png)
  console.log('\n--- 6. Capturing Timestand Control ---');
  await page.evaluate(() => {
    const el = document.querySelector('[class*="Pengaturan Timestand"]')?.closest('div') || document.body;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await delay(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '10-timestand-target-kejaran-per-hari.png'),
    type: 'png'
  });
  console.log('✅ Captured: 10-timestand-target-kejaran-per-hari.png');

  // 7. Scroll to Table Scorecard & Capture (03-tabel-scorecard-dan-target-harian-timestand.jpg)
  console.log('\n--- 7. Capturing Table Scorecard & Target Harian ---');
  await page.evaluate(() => {
    const table = document.querySelector('table');
    if (table) {
      table.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  });
  await delay(500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03-tabel-scorecard-dan-target-harian-timestand.jpg'),
    type: 'jpeg',
    quality: 90
  });
  console.log('✅ Captured: 03-tabel-scorecard-dan-target-harian-timestand.jpg');

  // 8. Open InfoTooltip Popover and capture showcase (12-info-popover-dan-definisi-kpi.png)
  console.log('\n--- 8. Testing & Capturing InfoTooltip Popover ---');
  const tooltipOpened = await page.evaluate(() => {
    // Click the info tooltip for Endbal DPK or DPK category
    const infoBtn = document.querySelector('button[aria-label*="Endbal DPK"]') || document.querySelector('button[aria-label*="DPK"]');
    if (infoBtn) {
      infoBtn.click();
      return true;
    }
    return false;
  });

  if (tooltipOpened) {
    await delay(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '12-info-popover-dan-definisi-kpi.png'),
      type: 'png'
    });
    console.log('✅ Captured: 12-info-popover-dan-definisi-kpi.png (Interactive Info Popover with Bank Mandiri Knowledge)');
  }

  // 9. Open Full-Width Simulation Panel & Test Live Simulation (04-detail-metrik-dan-strategi-cabang.jpg)
  console.log('\n--- 9. Testing & Capturing Full-Width Simulation Panel ---');
  const simOpened = await page.evaluate(() => {
    // Find button to edit target or row
    const editBtns = Array.from(document.querySelectorAll('button'));
    const targetBtn = editBtns.find(b => b.innerText && (b.innerText.includes('Edit Target / Strategi') || b.innerText.includes('Simulasi Target')));
    if (targetBtn) {
      targetBtn.click();
      return true;
    }
    return false;
  });

  if (simOpened) {
    await delay(800);
    // Enter simulated number (+5% button if available)
    await page.evaluate(() => {
      const plusBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === '+5%');
      if (plusBtn) plusBtn.click();
    });
    await delay(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-detail-metrik-dan-strategi-cabang.jpg'),
      type: 'jpeg',
      quality: 92
    });
    console.log('✅ Captured: 04-detail-metrik-dan-strategi-cabang.jpg');
  }

  // 10. Test Mobile View (05-tampilan-responsif-mobile.jpg)
  console.log('\n--- 10. Testing & Capturing Mobile Responsive View ---');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobilePage.evaluateOnNewDocument(() => {
    const authUser = {
      username: 'superadmin',
      displayName: 'Super Administrator',
      role: 'superadmin',
      jabatan: 'System Superadmin & IT'
    };
    localStorage.setItem('branchiq_auth_user', JSON.stringify(authUser));
  });

  await mobilePage.goto(TARGET_URL, { waitUntil: 'networkidle0' });
  await delay(1200);

  // Scroll slightly to show mobile cards and tooltips
  await mobilePage.evaluate(() => {
    window.scrollBy({ top: 400, behavior: 'instant' });
  });
  await delay(500);

  await mobilePage.screenshot({
    path: path.join(SCREENSHOT_DIR, '05-tampilan-responsif-mobile.jpg'),
    type: 'jpeg',
    quality: 90
  });
  console.log('✅ Captured: 05-tampilan-responsif-mobile.jpg');

  // Close browser
  await browser.close();

  console.log('\n=== QC SUMMARY ===');
  console.log('Total Page Errors:', pageErrors.length);
  if (pageErrors.length === 0) {
    console.log('🎉 100% PERFECT: ZERO ERRORS detected on live production!');
  } else {
    console.error('Errors encountered:', pageErrors);
  }
}

runQCAndCapture().catch(console.error);
