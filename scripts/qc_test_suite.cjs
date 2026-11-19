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
      await inputs[0].type('alvin.superadmin');
      await inputs[1].type('mandiri123');
      
      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
      console.log(' -> Tombol submit diklik. Menunggu dashboard termuat...');
      
      await page.waitForFunction(() => !document.body.innerText.includes('LOGIN PORTAL BRANCHIQ'), { timeout: 10000 });
      console.log(' -> Berhasil login masuk ke Dashboard Utama!');
      results.push({ name: 'Login & Autentikasi Pengguna', pass: true });
    } else {
      console.log(' -> Sesi sudah aktif, langsung di Dashboard.');
      results.push({ name: 'Login & Autentikasi Pengguna', pass: true });
    }

    // Tunggu sinkronisasi Supabase
    await new Promise(r => setTimeout(r, 2500));

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
    
    // Klik tombol badge rank di Executive Summary atau Header
    const rankBtn = await page.$('button[title="Buka Leaderboard 164 Cabang"]') || 
                    await page.$('button[title*="Leaderboard"]') ||
                    await page.evaluateHandle(() => {
                      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('#41'));
                    });

    if (rankBtn) {
      await rankBtn.click();
      await new Promise(r => setTimeout(r, 1000));

      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('.fixed');
        if (!modal) return null;
        const text = modal.innerText;
        return {
          hasTitle: text.includes('Peringkat & Matriks Perbandingan Cabang'),
          has164: text.includes('164 Cabang'),
          hasGradeB3Btn: text.includes('Kelas Cabang Anda (B.3)'),
          textPreview: text.slice(0, 300)
        };
      });

      console.log(' -> Info Modal Peringkat:', modalInfo);
      results.push({ name: 'Modal Peringkat Terbuka dengan 164 Cabang', pass: !!modalInfo && modalInfo.hasTitle });

      // Uji Filter Kelas B.3
      const filterB3Result = await page.evaluate(async () => {
        const modal = document.querySelector('.fixed');
        if (!modal) return { success: false, reason: 'no modal' };

        const buttons = Array.from(modal.querySelectorAll('button'));
        const b3Btn = buttons.find(b => b.innerText.includes('B.3') && b.innerText.includes('Kelas'));
        if (!b3Btn) return { success: false, reason: 'b3 button not found' };

        b3Btn.click();
        await new Promise(r => setTimeout(r, 600));

        const bannerText = modal.innerText;
        const bannerMatched = bannerText.includes('Ranking Khusus Kelas B.3');
        const rows = modal.querySelectorAll('tbody tr').length;

        return {
          success: true,
          bannerMatched,
          rowsCount: rows
        };
      });

      console.log(' -> Hasil Filter Kelas B.3:', filterB3Result);
      results.push({ 
        name: 'Filter Kelas B.3 Berfungsi & Menampilkan Ranking Se-Kelas', 
        pass: filterB3Result.success && filterB3Result.bannerMatched && filterB3Result.rowsCount > 0 && filterB3Result.rowsCount < 164 
      });

      // Uji Filter Kelas B.1
      const filterB1Result = await page.evaluate(async () => {
        const modal = document.querySelector('.fixed');
        if (!modal) return { success: false };

        const buttons = Array.from(modal.querySelectorAll('button'));
        const b1Btn = buttons.find(b => b.innerText.trim().startsWith('Kelas B.1'));
        if (!b1Btn) return { success: false };

        b1Btn.click();
        await new Promise(r => setTimeout(r, 600));

        const bannerText = modal.innerText;
        const bannerMatched = bannerText.includes('Ranking Khusus Kelas B.1');
        const rows = modal.querySelectorAll('tbody tr').length;

        return {
          success: true,
          bannerMatched,
          rowsCount: rows
        };
      });

      console.log(' -> Hasil Filter Kelas B.1:', filterB1Result);
      results.push({ 
        name: 'Filter Kelas B.1 Berfungsi Dinamis', 
        pass: filterB1Result.success && filterB1Result.bannerMatched && filterB1Result.rowsCount > 0 
      });

      // Reset ke Semua Kelas
      const resetAllFilter = await page.evaluate(async () => {
        const modal = document.querySelector('.fixed');
        if (!modal) return false;

        const buttons = Array.from(modal.querySelectorAll('button'));
        const allBtn = buttons.find(b => b.innerText.includes('Semua Kelas'));
        if (allBtn) {
          allBtn.click();
          await new Promise(r => setTimeout(r, 600));
          const rows = modal.querySelectorAll('tbody tr').length;
          return rows >= 164;
        }
        return false;
      });

      console.log(' -> Reset ke Semua Kelas (164 cabang):', resetAllFilter);
      results.push({ name: 'Tombol Semua Kelas Mengembalikan 164 Cabang', pass: resetAllFilter });

      // Tutup modal
      const closeBtn = await page.$('button[title="Tutup Modal"]') || 
                       await page.$('button[title*="Tutup"]');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      results.push({ name: 'Modal Peringkat Terbuka dengan 164 Cabang', pass: false });
    }

    // -----------------------------------------------------------------
    // 6. UJI MODAL UPLOAD EXCEL & RIWAYAT DATA (Supabase Cloud Sync)
    // -----------------------------------------------------------------
    console.log('[6/7] Menguji Modal Riwayat Data & Cloud Sync...');
    const histBtn = await page.$('button[title*="Riwayat"]') || 
                    await page.$('button[title*="Upload"]') ||
                    await page.evaluateHandle(() => {
                      return Array.from(document.querySelectorAll('button')).find(b => 
                        b.innerText.includes('Riwayat') || b.title?.includes('Excel')
                      );
                    });

    if (histBtn) {
      await histBtn.click();
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
        const modal = document.querySelector('.fixed');
        if (modal) {
          const btns = Array.from(modal.querySelectorAll('button'));
          const close = btns.find(b => b.querySelector('svg.lucide-x') || b.innerText.trim() === 'Tutup');
          if (close) close.click();
        }
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
      !e.includes('autocomplete') &&
      !e.includes('fonts.gstatic.com') &&
      !e.includes('ERR_FAILED')
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
  console.log(`TOTAL: ${passCount} / ${results.length} PENGUJIAN LULUS (${allSuccess ? '🎉 100% SEMPURNA' : '⚠️ PERLU PERBAIKAN'})`);
  console.log('=====================================================\n');

  return { allSuccess, results };
}

runQCTestSuite();
