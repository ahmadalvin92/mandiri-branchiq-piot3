const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = path.resolve(process.cwd(), 'screenshoot');

async function captureAll() {
  console.log('📸 Generating crisp, complete, uncropped screenshots for GitHub...');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  // 1. LOGIN PORTAL
  console.log('1. Capturing 01-login-portal-mandiri-kcp-piot.png...');
  await page.goto('https://mandiri-branchiq-piot3.vercel.app/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '01-login-portal-mandiri-kcp-piot.png') });

  // Login
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('alvin.superadmin');
    await inputs[1].type('mandiri123');
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();
    await page.waitForFunction(() => !document.body.innerText.includes('LOGIN PORTAL BRANCHIQ'), { timeout: 10000 });
  }

  // Wait for Supabase sync
  await new Promise(r => setTimeout(r, 2500));

  // 2. DASHBOARD UTAMA (TOP VIEW)
  console.log('2. Capturing 02-dashboard-utama-summary.png...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '02-dashboard-utama-summary.png') });

  // 3. FULL PAGE COMPLETE DASHBOARD (UNTRUNCATED TOP TO BOTTOM)
  console.log('3. Capturing 09-full-dashboard-overview.png (Complete full-page uncropped)...');
  await page.screenshot({ path: path.join(outDir, '09-full-dashboard-overview.png'), fullPage: true });

  // 4. MODAL PERINGKAT & FILTER KELAS
  console.log('4. Capturing 03-modal-peringkat-dan-filter-kelas.png...');
  const rankBtn = await page.$('button[title="Buka Leaderboard 164 Cabang"]') || 
                  await page.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('#41'));
                  });
  if (rankBtn) {
    await rankBtn.click();
    await new Promise(r => setTimeout(r, 1200));

    // Filter to Kelas Cabang Anda (B.3) to showcase the new filter feature
    await page.evaluate(() => {
      const modal = document.querySelector('.fixed');
      if (modal) {
        const buttons = Array.from(modal.querySelectorAll('button'));
        const b3Btn = buttons.find(b => b.innerText.includes('B.3') && b.innerText.includes('Kelas'));
        if (b3Btn) b3Btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(outDir, '03-modal-peringkat-dan-filter-kelas.png') });

    // Close modal
    await page.evaluate(() => {
      const modal = document.querySelector('.fixed');
      if (modal) {
        const close = modal.querySelector('button[title*="Tutup"]') || modal.querySelector('svg.lucide-x');
        if (close) close.closest('button').click();
      }
    });
    await new Promise(r => setTimeout(r, 600));
  }

  // 5. MODAL UPLOAD EXCEL & RIWAYAT POSISI DATA
  console.log('5. Capturing 04-modal-riwayat-upload-excel.png...');
  const histBtn = await page.$('button[title*="Riwayat"]') || await page.$('button[title*="Upload"]');
  if (histBtn) {
    await histBtn.click();
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(outDir, '04-modal-riwayat-upload-excel.png') });

    // Close modal
    await page.evaluate(() => {
      const modal = document.querySelector('.fixed');
      if (modal) {
        const close = modal.querySelector('svg.lucide-x');
        if (close) close.closest('button').click();
      }
    });
    await new Promise(r => setTimeout(r, 600));
  }

  // 6. TIMESTAND & TARGET KEJARAN HARIAN
  console.log('6. Capturing 05-timestand-target-kejaran-harian.png...');
  await page.evaluate(() => {
    // Scroll down to Timestand section
    const el = Array.from(document.querySelectorAll('h2, h3, span')).find(x => x.innerText?.includes('Target Kejaran Harian') || x.innerText?.includes('Timestand'));
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '05-timestand-target-kejaran-harian.png') });

  // 7. TABEL SCORECARD METRICS
  console.log('7. Capturing 06-tabel-scorecard-dan-strategi.png...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('h2, h3, span')).find(x => x.innerText?.includes('Scorecard') || x.innerText?.includes('Detail Evaluasi Metrik'));
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '06-tabel-scorecard-dan-strategi.png') });

  // 8. WHAT-IF SIMULATOR
  console.log('8. Capturing 07-what-if-simulator.png...');
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('h2, h3, span')).find(x => x.innerText?.includes('Simulasi') || x.innerText?.includes('What-If'));
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '07-what-if-simulator.png') });

  // 9. MOBILE VIEW
  console.log('9. Capturing 08-tampilan-responsif-mobile.png...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, '08-tampilan-responsif-mobile.png') });

  await browser.close();
  console.log('🎉 All screenshots generated successfully in screenshoot/ directory!');
}

captureAll().catch(console.error);
