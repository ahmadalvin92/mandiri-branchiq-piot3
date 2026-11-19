const puppeteer = require('puppeteer-core');
const path = require('path');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runQCTestSuite() {
  console.log('=====================================================');
  console.log('🚀 BRANCHIQ MANDIRI - FULL QC & VERIFICATION SUITE');
  console.log('Target Live URL: https://mandiri-branchiq-piot3.vercel.app/');
  console.log('=====================================================\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  const results = [];

  try {
    // -----------------------------------------------------------------
    // 1. PAGE LOAD
    // -----------------------------------------------------------------
    console.log('[1/7] Navigasi ke Live Vercel URL...');
    const response = await page.goto('https://mandiri-branchiq-piot3.vercel.app/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    const status = response.status();
    console.log(` -> HTTP Status: ${status}`);
    results.push({ name: 'HTTP 200 OK Response', pass: status === 200 });

    // -----------------------------------------------------------------
    // 2. AUTHENTICATION & LOGIN
    // -----------------------------------------------------------------
    console.log('[2/7] Menguji Autentikasi & Form Login...');
    const hasLoginForm = await page.$('form');
    if (hasLoginForm) {
      console.log(' -> Form login terdeteksi. Melakukan login sebagai Superadmin...');
      const inputs = await page.$$('input');
      // input[0] is username, input[1] is password
      await inputs[0].type('alvin.superadmin');
      await inputs[1].type('mandiri123');
      
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
      console.log(' -> Tombol submit diklik. Menunggu dashboard termuat...');
      
      // Wait for navigation / dashboard render
      await page.waitForFunction(() => !document.body.innerText.includes('LOGIN PORTAL BRANCHIQ'), { timeout: 10000 });
      console.log(' -> Berhasil login masuk ke Dashboard Utama!');
      results.push({ name: 'Login & Autentikasi Pengguna', pass: true });
    } else {
      console.log(' -> Sesi sudah aktif, langsung di Dashboard.');
      results.push({ name: 'Login & Autentikasi Pengguna', pass: true });
    }

    // Tunggu 2 detik untuk sinkronisasi cloud data
    await new Promise(r => setTimeout(r, 2000));

    // -----------------------------------------------------------------
    // 3. VERIFIKASI PEMBERSIHAN HEADER & FOOTER ("Idea by" & "Developed by")
    // -----------------------------------------------------------------
    console.log('[3/7] Memeriksa Penghapusan "Idea by" & "Developed by"...');
    const fullBodyText = await page.evaluate(() => document.body.innerText);
    const hasIdeaBy = /idea\s+by/i.test(fullBodyText);
    const hasDevelopedBy = /developed\s+by/i.test(fullBodyText);
    const hasMichaelIdea = /idea\s+by\s+michael/i.test(fullBodyText);
    const hasAlvinDevelop = /developed\s+by\s+ahmad\s+alvin/i.test(fullBodyText);

    console.log(` -> Teks 'Idea by' ditemukan? ${hasIdeaBy}`);
    console.log(` -> Teks 'Developed by' ditemukan? ${hasDevelopedBy}`);
    results.push({ name: 'Pembersihan "Idea by" (Request #1)', pass: !hasIdeaBy && !hasMichaelIdea });
    results.push({ name: 'Pembersihan "Developed by" (Request #1)', pass: !hasDevelopedBy && !hasAlvinDevelop });

    // -----------------------------------------------------------------
    // 4. VERIFIKASI DATA RESMI BASELINE (16 November 2026, Skor 85.65, Rank #41)
    // -----------------------------------------------------------------
    console.log('[4/7] Memeriksa Baseline 16 November 2026...');
    const dateMatch = fullBodyText.match(/16\s+November\s+2026/i);
    const scoreMatch = fullBodyText.match(/85[,.]65/);
    const rankMatch = fullBodyText.match(/#41/);
    const branchMatch = fullBodyText.includes('10125') || fullBodyText.includes('Pondok Indah Office 3');

    console.log(` -> Posisi Tanggal terdeteksi: ${dateMatch ? dateMatch[0] : 'TIDAK DITEMUKAN'}`);
    console.log(` -> Skor KC 10125 terdeteksi: ${scoreMatch ? scoreMatch[0] : 'TIDAK DITEMUKAN'}`);
    console.log(` -> Ranking KC 10125 terdeteksi: ${rankMatch ? rankMatch[0] : 'TIDAK DITEMUKAN'}`);
    console.log(` -> Cabang KC 10125 terdeteksi: ${branchMatch}`);

    results.push({ name: 'Tanggal Aktif adalah 16 November 2026', pass: !!dateMatch });
    results.push({ name: 'Skor Total KC 10125 adalah 85,65', pass: !!scoreMatch });
    results.push({ name: 'Peringkat KC 10125 adalah #41', pass: !!rankMatch });
    results.push({ name: 'Cabang Teridentifikasi KC 10125', pass: branchMatch });

    // -----------------------------------------------------------------
    // 5. UJI MODAL PERINGKAT & FILTER KELAS (Request #2)
    // -----------------------------------------------------------------
    console.log('[5/7] Menguji Modal Peringkat & Filter Kelas Cabang...');
    // Klik tombol ranking / badge ranking
    const clickedRanking = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const rankBtn = allButtons.find(b => 
        b.innerText.includes('Peringkat') || 
        b.innerText.includes('Ranking') || 
        b.innerText.includes('#41') ||
        b.innerText.includes('Komparasi')
      );
      if (rankBtn) {
        rankBtn.click();
        return true;
      }
      return false;
    });

    if (clickedRanking) {
      await new Promise(r => setTimeout(r, 1000));
      const modalTitleExists = await page.evaluate(() => {
        return document.body.innerText.includes('Peringkat & Matriks Komparasi Cabang');
      });
      console.log(` -> Modal Peringkat Terbuka: ${modalTitleExists}`);
      results.push({ name: 'Modal Peringkat Dapat Dibuka', pass: modalTitleExists });

      // Uji filter dropdown kelas
      const filterWorks = await page.evaluate(async () => {
        const select = document.querySelector('select');
        if (!select) return { error: 'No select found' };

        // 1. Cek semua cabang awal (164)
        const initialRows = document.querySelectorAll('tbody tr').length;

        // 2. Filter ke Kelas B.3
        select.value = 'B.3';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const b3Rows = document.querySelectorAll('tbody tr').length;

        // 3. Filter ke Kelas B.1
        select.value = 'B.1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const b1Rows = document.querySelectorAll('tbody tr').length;

        // 4. Kembalikan ke Semua Kelas
        select.value = 'all';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        const allRows = document.querySelectorAll('tbody tr').length;

        return {
          initialRows,
          b3Rows,
          b1Rows,
          allRows
        };
      });

      console.log(` -> Hasil Filter Kelas:`, filterWorks);
      const isFilterValid = filterWorks.b3Rows > 0 && 
                            filterWorks.b3Rows < filterWorks.initialRows && 
                            filterWorks.b1Rows > 0 && 
                            filterWorks.allRows >= 164;
      results.push({ name: 'Filter Kelas Cabang (B.1, B.3, Semua Kelas) Berfungsi', pass: isFilterValid });

      // Tutup modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const close = btns.find(b => b.innerText.trim() === 'Tutup' || b.querySelector('svg.lucide-x'));
        if (close) close.click();
      });
      await new Promise(r => setTimeout(r, 600));
    } else {
      results.push({ name: 'Modal Peringkat Dapat Dibuka', pass: false });
    }

    // -----------------------------------------------------------------
    // 6. UJI MODAL UPLOAD EXCEL & RIWAYAT DATA (Supabase Cloud Sync)
    // -----------------------------------------------------------------
    console.log('[6/7] Menguji Modal Riwayat Data & Cloud Sync...');
    const clickedUploadHistory = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const histBtn = allButtons.find(b => 
        b.innerText.includes('Riwayat') || 
        b.innerText.includes('Upload') || 
        b.title?.includes('Upload') ||
        b.title?.includes('Riwayat')
      );
      if (histBtn) {
        histBtn.click();
        return true;
      }
      return false;
    });

    if (clickedUploadHistory) {
      await new Promise(r => setTimeout(r, 1000));
      const modalUploadText = await page.evaluate(() => document.body.innerText);
      const has16NovSnapshot = modalUploadText.includes('16 November 2026');
      const hasActiveStatus = modalUploadText.includes('Sedang Aktif') || modalUploadText.includes('Sedang Dibuka');

      console.log(` -> Riwayat memiliki Posisi 16 November 2026: ${has16NovSnapshot}`);
      console.log(` -> Status data aktif terverifikasi: ${hasActiveStatus}`);

      results.push({ name: 'Riwayat Cloud Snapshot 16 November Terdaftar', pass: has16NovSnapshot });
      results.push({ name: 'Status Snapshot Terpilih Aktif di Semua Perangkat', pass: hasActiveStatus });

      // Tutup modal
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const close = btns.find(b => b.querySelector('svg.lucide-x') || b.innerText.trim() === 'Tutup');
        if (close) close.click();
      });
      await new Promise(r => setTimeout(r, 600));
    }

    // -----------------------------------------------------------------
    // 7. PEMERIKSAAN CONSOLE ERRORS & SCREENSHOT BUKTI
    // -----------------------------------------------------------------
    console.log('[7/7] Memeriksa Log Konsol & Menyimpan Screenshot Bukti...');
    const fatalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('Download the React DevTools') &&
      !e.includes('autocomplete')
    );
    console.log(` -> Fatal Console Errors: ${fatalErrors.length}`);
    if (fatalErrors.length > 0) {
      console.log('    Errors:', fatalErrors);
    }
    results.push({ name: 'Zero Fatal Console / Network Errors', pass: fatalErrors.length === 0 });

    // Capture screenshot
    const screenshotPath = '/Users/alvin/.gemini/antigravity/brain/b628e1a5-0dcd-4175-abe5-b34c037bb927/qc_test_dashboard.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(` -> Screenshot QC tersimpan di: ${screenshotPath}`);

  } catch (err) {
    console.error('QC Suite Exception:', err);
    results.push({ name: 'QC Suite Exception Handler', pass: false });
  } finally {
    await browser.close();
  }

  // -----------------------------------------------------------------
  // SUMMARY REPORT
  // -----------------------------------------------------------------
  console.log('\n=====================================================');
  console.log('📋 HASIL LENGKAP QUALITY CONTROL (QC) MANDIRI BRANCHIQ');
  console.log('=====================================================');
  let passCount = 0;
  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | ${r.name}`);
    if (r.pass) passCount++;
  }
  console.log('=====================================================');
  const allSuccess = passCount === results.length;
  console.log(`TOTAL: ${passCount} / ${results.length} PENGUJIAN LULUS (${allSuccess ? '100% SEMPURNA' : 'PERLU PERBAIKAN'})`);
  console.log('=====================================================\n');

  return { allSuccess, results };
}

runQCTestSuite();
