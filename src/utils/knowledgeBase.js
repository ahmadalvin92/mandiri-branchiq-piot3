/**
 * Knowledge Base & Actionable Strategy Database
 * Khusus untuk Bank Mandiri KC Jakarta Pondok Indah Office 3 (Kode: 10125)
 */

export const metricKnowledge = {
  // ==================== DPK ====================
  "Avgbal DPK MtD": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Average Balance (Saldo Rata-Rata) Total Dana Pihak Ketiga Month-to-Date. Mengukur rata-rata harian total dana simpanan (Tabungan, Giro, Deposito) yang dikelola cabang sejak awal bulan berjalan.",
    importance: "Indikator kestabilan likuiditas cabang. Berbeda dengan saldo akhir hari yang bisa fluktuatif (window dressing), saldo rata-rata mencerminkan likuiditas riil yang produktif.",
    tacticalAction: [
      "Fokus pada retensi saldo giro dan tabungan korporasi tenant Pondok Indah Office Tower 3 agar tidak ditarik di awal/pertengahan bulan.",
      "Tawarkan skema penempatan deposito berjangka khusus dengan skema automatic roll-over (ARO) bagi nasabah HNW sekitar Pondok Indah.",
      "Optimasi jadwal pembayaran gaji (payroll) tenant gedung agar saldo tabungan karyawan mengendap lebih lama sebelum ditarik."
    ]
  },
  "Endbal DPK": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Ending Balance (Saldo Akhir) Total Dana Pihak Ketiga pada tanggal posisi laporan. Mengukur total dana nasabah yang terparkir di cabang pada penutupan hari pelaporan.",
    importance: "Fondasi likuiditas utama bank untuk menjaga Loan to Deposit Ratio (LDR) sehat dan ketersediaan dana ekspansi kredit.",
    tacticalAction: [
      "Lakukan pendekatan 'Special Rate Offering' berjangka pendek bagi nasabah korporat tenant Pondok Indah Office Tower 3 yang memiliki dana mengendap.",
      "Monitor penarikan dana besar (RTGS/Kliring) di atas Rp 500 juta sebelum cut-off sore dan tawarkan penahanan saldo 1-3 hari dengan opsi Deposito On Call (DOC).",
      "Koordinasikan dengan Relationship Manager (RM) Wholesale dan Commercial untuk 'landing balance' pembayaran invoice vendor ke rekening Mandiri."
    ]
  },
  "Avgbal Tabungan MtD": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Average Balance Tabungan Month-to-Date: Rata-rata harian saldo tabungan nasabah ritel dan bisnis selama bulan berjalan.",
    importance: "Komponen CASA terpenting untuk menekan Cost of Fund (CoF) cabang. Bobot 15% dari total nilai maksimal DPK (30 poin). Di 10125 masih ada gap -165,5 M (Potensi +1,30 poin skor!).",
    tacticalAction: [
      "PROGRAM CASHBACK SALDO MENGENDAP: Buat program retensi saldo tabungan minimum Rp 50-250 juta selama 30 hari untuk nasabah perorangan di area Pondok Indah.",
      "OPTIMASI PAYROLL TENANT GEDUNG: Akuisisi 2-3 perusahaan baru di Office Tower 1, 2, dan 3 untuk migrasi payroll ke Mandiri, mewajibkan saldo mengendap minimum.",
      "CROSS-SELLING NASABAH PRIORITAS: Tawarkan program Tabungan Rencana Mandiri (TRM) dan tabungan auto-debit investasi bagi nasabah affluent penghuni perumahan Pondok Indah."
    ]
  },
  "Endbal Tabungan": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Posisi saldo penutupan rekening tabungan di cabang pada tanggal laporan. Di Cabang 10125 tercatat 389,8 M vs target 541,7 M (Gap -151,9 M).",
    importance: "Menjaga level likuiditas ritel dan menjadi bantalan utama penarikan musiman.",
    tacticalAction: [
      "Sweeping saldo rekening pasif dengan program reaktivasi berhadiah e-voucher belanja PIM.",
      "Edukasi nasabah untuk menempatkan dana darurat keluarga di Tabungan Mandiri dengan kemudahan tarik tunai tanpa kartu di ATM Pondok Indah Office Tower."
    ]
  },
  "Endbal 3P": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Ending Balance Tabungan 3 Produk Utama (Tabungan Mandiri, Tabungan Bisnis, Tabungan Valas). Menggambarkan kedalaman dana ritel inti cabang.",
    importance: "Metrik strategis ritel untuk memastikan pertumbuhan tabungan tidak didominasi produk non-standar. Di 10125 realisasi 384,4 M vs target 435,7 M.",
    tacticalAction: [
      "Buka booth Tabungan Valas (USD, SGD, AUD) di lobby Office Tower 3 untuk ekspatriat dan eksekutif perusahaan multinasional.",
      "Dorong pembukaan Tabungan Bisnis bagi para pemilik tenant F&B dan retail di Street Gallery & PIM."
    ]
  },
  "Akuisisi NTB 3Pi": {
    category: "DPK",
    unit: "Rekening Baru",
    type: "growth",
    definition: "New to Bank 3 Produk Utama Individu: Jumlah nasabah baru yang belum pernah memiliki rekening di Bank Mandiri dan berhasil membuka Tabungan Individu.",
    importance: "Memperlebar basis nasabah baru (customer base expansion). Realisasi 10125: 1.682 vs target 1.954 rekening (kurang 272 rekening).",
    tacticalAction: [
      "LOBBY STORMING EVENT: Buka 'Digital Account Opening Corner' di lobby lift Pondok Indah Office Tower 3 setiap hari Selasa-Kamis jam makan siang (11.30 - 13.30).",
      "Gunakan tablet pembukaan rekening online (Customer Onboarding) dengan gimmick merchandise Mandiri & voucher Kopi Kenangan / Starbucks gedung.",
      "Sinergikan dengan HRD tenant gedung untuk mewajibkan rekening Mandiri bagi staf magang / karyawan baru."
    ]
  },
  "Avgbal Giro MtD": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Average Balance Giro Month-to-Date: Saldo rata-rata harian rekening giro operasional bisnis nasabah selama bulan berjalan.",
    importance: "Sumber dana murah terbesar dari segmen korporasi dan komersial dengan biaya dana sangat rendah (CoF < 1.5%). Di 10125 realisasi 1.631,1 M vs target 1.695,9 M (Acv 96%).",
    tacticalAction: [
      "Penetrasi ke 10 holding company terbesar di Pondok Indah Office Tower 3 untuk menjadikan Mandiri sebagai Main Operating Bank rekening escrow dan payroll.",
      "Berikan benefit bebas biaya transaksi RTGS/BI-Fast dan integrasi API Kopra Cash Management jika rata-rata saldo giro dipertahankan > Rp 2 Miliar."
    ]
  },
  "Average Balance Giro CMB/Retail/SME": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Rata-rata saldo giro yang berasal khusus dari nasabah segmen Commercial Banking (CMB), Retail, dan SME/Small Business.",
    importance: "Menopang diversifikasi likuiditas giro agar cabang tidak rentan fluktuasi satu depositor besar.",
    tacticalAction: [
      "Targetkan perusahaan konsultan hukum, arsitektur, dan agensi properti yang menyewa unit di kawasan perkantoran Pondok Indah."
    ]
  },
  "Endbal Giro": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Posisi saldo akhir rekening giro cabang pada tanggal laporan. Realisasi 10125: 1.257,8 M vs target 1.530,8 M (Acv 82%).",
    importance: "Menunjukkan volume dana transaksional bisnis yang mengendap pada penutupan buku.",
    tacticalAction: [
      "Minta jadwal pembayaran dividen atau pembayaran supplier nasabah korporat agar dana ditahan hingga penutupan buku."
    ]
  },
  "Ending Balance Giro CMB/Retail/SME": {
    category: "DPK",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Saldo akhir giro nasabah segmen CMB, Retail, dan SME pada tanggal pelaporan. Realisasi 10125: 269,8 M vs target 256,7 M (Acv 105% - Sempurna!).",
    importance: "Pencapaian skor maksimal (4,50 dari bobot 15%). Menunjukkan penetrasi giro usaha menengah yang solid.",
    tacticalAction: [
      "Pertahankan hubungan baik dengan para bendahara dan finance manager nasabah giro SME eksisting."
    ]
  },
  "Akuisisi Giro Retail": {
    category: "DPK",
    unit: "Rekening Baru",
    type: "growth",
    definition: "Jumlah rekening giro baru yang dibuka oleh nasabah perorangan bisnis atau badan usaha skala ritel. Realisasi 10125: 50 vs target 49 (Acv 102% - Sempurna!).",
    importance: "Pencapaian skor maksimal (4,50 dari bobot 15%). Menjadi pipeline nasabah transaksi bisnis baru.",
    tacticalAction: [
      "Pertahankan akuisisi tenant baru yang baru masuk ke Office Tower 3 dan area komersial PIM."
    ]
  },

  // ==================== KREDIT ====================
  "Kredit Retail - Baki Debet Kredit Retail": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Baki Debet keseluruhan fasilitas pinjaman segmen ritel (KPR, Autoloan, CC, KSM, KUR, KUM).",
    importance: "Indikator ukuran aset produktif cabang yang menghasilkan pendapatan bunga bersih (NII).",
    tacticalAction: [
      "Optimalkan cross-selling produk kredit konsumer kepada nasabah funding berkategori Payroll dan Prioritas."
    ]
  },
  "Booking Kredit Retail YtD": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Akumulasi volume pencairan kredit ritel baru dari awal tahun berjalan hingga saat ini.",
    importance: "Pendorong ekspansi aset kredit dan penghasil fee provisi/administrasi.",
    tacticalAction: [
      "Percepat proses persetujuan (turn around time) aplikasi kredit konsumer yang masuk."
    ]
  },
  "% Kol 2 Kredit Retail": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio pinjaman ritel yang menunggak 1-90 hari (Kolektibilitas 2 / Dalam Perhatian Khusus).",
    importance: "Early warning pengawasan kualitas kredit agar debitur tidak jatuh ke NPL.",
    tacticalAction: [
      "Kirimkan reminder terjadwal H-3 sebelum tanggal gajian / jatuh tempo autodebet angsuran."
    ]
  },
  "% NPL Kredit Retail": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Non-Performing Loan kredit ritel (Kolektibilitas 3, 4, 5 dengan tunggakan > 90 hari).",
    importance: "Menjaga beban pencadangan CKPN agar laba cabang tidak tergerus.",
    tacticalAction: [
      "Lakukan pendekatan penagihan intensif dan tawarkan skema restrukturisasi bila debitur mengalami penurunan omset."
    ]
  },
  "KPR - Baki Debet KPR (Rp Tn)": {
    category: "Kredit",
    unit: "Rp Triliun",
    type: "growth",
    definition: "Baki Debet Kredit Pemilikan Rumah (KPR) yang dikelola KC Jakarta Pondok Indah Office 3. Realisasi 10125: 69,98 M vs target 40,17 M (Acv 174% - Sempurna!).",
    importance: "Bobot 12% di Kredit Non-Mikro. Skor maksimal 2,40 poin berhasil diamankan.",
    tacticalAction: [
      "Pertahankan baki debet dengan meminimalisir pelunasan dipercepat (early repayment) melalui penawaran top-up kredit multiguna."
    ]
  },
  "Booking KPR YtD (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar (/100)",
    type: "growth",
    definition: "Volume realisasi akad KPR baru sejak awal tahun. Realisasi 10125: 449,09 M vs target 234,57 M (Acv 191% - Sempurna!).",
    importance: "Pencapaian luar biasa dengan skor maksimal 4,00 poin (bobot 20% kredit non-mikro).",
    tacticalAction: [
      "Terus perkuat sinergi dengan developer rekanan di kawasan Pondok Indah, Simprug, dan Bintaro."
    ]
  },
  "% Kol 2 KPR": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Persentase baki debet KPR yang menunggak 1-90 hari. Realisasi 10125: 0,00% (Nol tunggakan - Sempurna!).",
    importance: "Kualitas portofolio KPR terbaik di wilayah Region V.",
    tacticalAction: [
      "Pertahankan monitoring debitur high ticket size."
    ]
  },
  "% NPL KPR": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio kredit bermasalah KPR (> 90 hari). Realisasi 10125: 0,00% (Zero NPL - Sempurna!).",
    importance: "Skor penuh 0,50 poin berhasil diamankan.",
    tacticalAction: [
      "Pertahankan seleksi underwriting yang ketat pada agunan properti."
    ]
  },
  "Autoloan - Baki Debet Autoloan (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Baki debet pembiayaan mobil/motor via MTF dan MUF. Realisasi 10125: 4,18 M vs target 6,71 M (Acv 62% -> Gap -0,38 poin).",
    importance: "Bobot 5% kredit non-mikro.",
    tacticalAction: [
      "Adakan 'Mandiri Auto Fest Mini' di pelataran parkir Pondok Indah Office Tower 3 menggandeng dealer mobil CBU / EV mewah (Hyundai Ioniq, BMW, Mercedes-Benz, Lexus).",
      "Tawarkan bunga murah 2,25% khusus bagi karyawan tenant gedung yang gajinya dibayarkan melalui Mandiri."
    ]
  },
  "Booking Autoloan YtD (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Pencairan pembiayaan kendaraan baru sejak awal tahun. Realisasi 10125: 3,12 M vs target 5,75 M (Acv 54% -> Gap -0,92 poin!).",
    importance: "Salah satu penyumbang gap skor terbesar di kategori kredit. Ada potensi kenaikan +0,92 poin jika target tercapai.",
    tacticalAction: [
      "Jemput bola berkas aplikasi pembiayaan kendaraan dari sales dealer sekitar Radio Dalam, Gandaria, dan Pondok Pinang.",
      "Tawarkan program 'Car Ownership Program (COP)' untuk level manajer dan direktur tenant perkantoran."
    ]
  },
  "% Kol 2 Autoloan": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Persentase tunggakan 1-90 hari cicilan autoloan.",
    importance: "Bobot 0% pada cabang non-mikro (dikelola oleh perusahaan anak MTF/MUF).",
    tacticalAction: [
      "Koordinasi berkala dengan tim collection MTF/MUF."
    ]
  },
  "% NPL Autoloan": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio kredit macet kendaraan bermotor.",
    importance: "Bobot 0% pada cabang non-mikro.",
    tacticalAction: [
      "Pantau pengembalian unit tarikan dealer bila ada debitur macet."
    ]
  },
  "CC - Baki Debet CC": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Total outstanding tagihan pemakaian kartu kredit nasabah cabang. Realisasi 10125: 14,37 M vs target 11,89 M (Acv 121% - Sempurna!).",
    importance: "Bobot 4% (skor maksimal 0,80 poin tercapai).",
    tacticalAction: [
      "Dorong program konversi cicilan 0% atau bunga ringan (Power Installment) via Livin' by Mandiri untuk pembelanjaan kartu kredit di PIM."
    ]
  },
  "Booking CC YtD (Jumlah Kartu)": {
    category: "Kredit",
    unit: "Ratusan Kartu (/100)",
    type: "growth",
    definition: "Jumlah kartu kredit baru yang disetujui. Realisasi 10125: 0,69 (69 kartu) vs target 1,43 (143 kartu) -> Acv 48% (Gap -0,83 poin!).",
    importance: "Bobot 8% di kredit non-mikro. Memberikan potensi tambahan skor sebesar +0,83 poin jika target tercapai.",
    tacticalAction: [
      "KAMPANYE INSTANT CARD ONBOARDING: CS & Sales Floor menargetkan 5 aplikasi kartu kredit per hari dari nasabah walking customer dan staf tenant gedung.",
      "Gunakan fitur 'Pengajuan Kartu Kredit Instan via Livin'' tanpa dokumen fisik untuk karyawan payroll tenant.",
      "Bundling program welcome bonus voucher MAP Rp 500.000 untuk pengajuan Mandiri Kartu Kredit Signature / Platinum."
    ]
  },
  "% Kol 2 CC": {
    category: "Kredit",
    unit: "Persen (%) (/100)",
    type: "quality",
    definition: "Tunggakan kartu kredit 1-30 hari. Realisasi 10125: 0,0089% vs target 0,0137% (Acv 135% - Sempurna!).",
    importance: "Bobot 2% (skor maksimal 0,40 poin tercapai).",
    tacticalAction: [
      "Pertahankan notifikasi jatuh tempo otomatis via SMS & Livin'."
    ]
  },
  "% NPL CC": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio kredit bermasalah kartu kredit (> 90 hari). Realisasi 10125: 0,73% vs batas target 1,12% (Acv 135% - Sempurna!).",
    importance: "Bobot 1% (skor maksimal 0,20 poin tercapai).",
    tacticalAction: [
      "Monitor debitur limit besar agar tidak gagal bayar."
    ]
  },
  "KUM - Baki Debet KUM (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Kredit Usaha Mikro (KUM): Pinjaman produktif mikro.",
    importance: "Bobot 0% pada cabang non-mikro (KC Jakarta Pondok Indah Office 3 difokuskan pada kredit konsumer & komersial).",
    tacticalAction: ["Referensikan calon debitur mikro ke unit Mandiri Mitra Usaha (MMU) terdekat."]
  },
  "Booking KUM YtD (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Pencairan pinjaman KUM baru.",
    importance: "Bobot 0% pada cabang non-mikro.",
    tacticalAction: ["Referensikan ke unit mikro."]
  },
  "% Kol 2 KUM": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio Kol 2 KUM (Bobot 0% pada non-mikro).",
    importance: "Bobot 0% pada non-mikro.",
    tacticalAction: ["N/A."]
  },
  "% NPL KUM": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio NPL KUM (Bobot 0% pada non-mikro).",
    importance: "Bobot 0% pada non-mikro.",
    tacticalAction: ["N/A."]
  },
  "KUR - Baki Debet KUR (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Kredit Usaha Rakyat (KUR): Pinjaman bersubsidi bunga pemerintah.",
    importance: "Bobot 0% pada cabang non-mikro (10125).",
    tacticalAction: ["Referensikan pengusaha UMKM ke cabang pelaksana KUR."]
  },
  "Booking KUR YtD (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Pencairan KUR baru (Bobot 0% pada non-mikro).",
    importance: "Bobot 0% pada non-mikro.",
    tacticalAction: ["N/A."]
  },
  "% Kol 2 KUR": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio Kol 2 KUR (Bobot 0% pada non-mikro).",
    importance: "Bobot 0% pada non-mikro.",
    tacticalAction: ["N/A."]
  },
  "% NPL KUR": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio NPL KUR (Bobot 0% pada non-mikro).",
    importance: "Bobot 0% pada non-mikro.",
    tacticalAction: ["N/A."]
  },
  "KSM - Baki Debet KSM (Rp Tn)": {
    category: "Kredit",
    unit: "Rp Triliun",
    type: "growth",
    definition: "Baki Debet Kredit Serbaguna Mandiri (KSM / pinjaman payroll). Realisasi 10125: 31,03 M vs target 30,58 M (Acv 101% - Sempurna!).",
    importance: "Bobot 10% (skor maksimal 2,00 poin tercapai).",
    tacticalAction: [
      "Pertahankan baki debet dengan penawaran top up fasilitas bagi karyawan tenant yang gajinya naik."
    ]
  },
  "Booking KSM YtD (Rp M)": {
    category: "Kredit",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Total pencairan KSM baru. Realisasi 10125: 9,51 M vs target 8,55 M (Acv 111% - Sempurna!).",
    importance: "Bobot 12,5% (skor maksimal 2,50 poin tercapai).",
    tacticalAction: [
      "Terus garap perusahaan payroll baru di Office Tower 3."
    ]
  },
  "% Kol 2 KSM": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Tunggakan angsuran KSM 1-90 hari. Realisasi 10125: 0,04% vs target 0,05% (Acv 111% - Sempurna!).",
    importance: "Bobot 5% (skor maksimal 1,00 poin tercapai).",
    tacticalAction: [
      "Monitor status kepegawaian debitur KSM di perusahaan mitra payroll."
    ]
  },
  "% NPL KSM": {
    category: "Kredit",
    unit: "Persen (%)",
    type: "quality",
    definition: "Rasio NPL pada portofolio KSM. Di 10125 realisasinya 0,1113% melebihi batas target 0,0543%, sehingga skor saat ini 0,00 dari bobot 2,5% (Bocor -0,50 poin!).",
    importance: "Menyebabkan kebocoran skor sebesar -0,50 poin! Perlu penanganan kuratif segera.",
    tacticalAction: [
      "PENANGANAN INTENSIF DEBITUR MACET KSM: Identifikasi 2-3 debitur KSM bermasalah terbesar.",
      "Tawarkan program keringanan bunga / restrukturisasi perpanjangan tenor cicilan agar debitur kembali mampu membayar angsuran pokok.",
      "Klaim asuransi jiwa / asuransi kredit KSM bila debitur mengalami pemutusan hubungan kerja atau meninggal dunia."
    ]
  },

  // ==================== LIVIN' ====================
  "Akuisisi New UREG": {
    category: "Livin",
    unit: "User Baru",
    type: "growth",
    definition: "Jumlah nasabah baru yang melakukan registrasi akun Livin' by Mandiri.",
    importance: "PINTU GERBANG DIGITAL UTAMA. Berbobot 40% dari nilai Livin (6 poin!). Di 10125 realisasi 1.873 user vs target 3.308 user (Acv 57%). Gap terbesar di seluruh cabang: kehilangan +2,58 poin!",
    tacticalAction: [
      "STANDARISASI CS & TELLER 100%: Wajibkan setiap nasabah yang datang ke customer service & teller mengaktifkan Livin' by Mandiri di tempat sebelum meninggalkan counter.",
      "PROGRAM DUTA LIVIN' DI GEDUNG OFFICE TOWER 3: Pasang QR download Livin' di lift gedung, resepsionis, dan lobby dengan voucher makan gratis di area kantin.",
      "PENETRASI KELUARGA & KOMUNITAS: Dorong pembukaan rekening Livin' bagi keluarga karyawan tenant dan komunitas olahraga/hobi sekitar Pondok Indah."
    ]
  },
  "User Registered - UREG dengan funding Product": {
    category: "Livin",
    unit: "User",
    type: "growth",
    definition: "User terdaftar Livin' yang aktif memiliki produk pendanaan (tabungan/giro/deposito). Realisasi 10125: 3.873 vs target 5.546 user (Acv 70% -> Gap -1,35 poin!).",
    importance: "Bobot 30% dari nilai Livin (4,50 poin maksimal). Gap skor signifikan kedua di Livin.",
    tacticalAction: [
      "BLASTING PROMO LIVIN' DEPOSITO: Kirimkan push notification kepada user Livin' yang saldonya pasif untuk mencoba Deposito Online bunga spesial mulai Rp 1 juta.",
      "FITUR TABUNGAN REGULER (TRM): Edukasi fitur menabung otomatis di Livin' untuk tujuan liburan atau dana darurat."
    ]
  },
  "USAK Finansial FBI - USAK Finansial FBI MtD": {
    category: "Livin",
    unit: "User",
    type: "growth",
    definition: "User Aktif Finansial yang menghasilkan Fee Based Income (transaksi bayar tagihan, beli pulsa, transfer antar-bank, top up e-wallet). Realisasi 10125: 2.823 vs target 2.771 (Acv 102% - Sempurna!).",
    importance: "Bobot 30% (skor maksimal 4,50 poin tercapai).",
    tacticalAction: [
      "Pertahankan kebiasaan transaksi nasabah dengan program cashback bayar tagihan PLN/BPJS di Livin' setiap awal bulan."
    ]
  },
  "USAK Finansial": {
    category: "Livin",
    unit: "User",
    type: "growth",
    definition: "Total user aktif finansial pada aplikasi Livin'.",
    importance: "Bobot 0% di matriks cabang saat ini (tercakup di USAK Finansial FBI).",
    tacticalAction: ["Terus tingkatkan fitur transaksi harian nasabah."]
  },
  "Frekuensi": {
    category: "Livin",
    unit: "Transaksi",
    type: "growth",
    definition: "Jumlah transaksi perbankan yang dieksekusi melalui Livin'.",
    importance: "Bobot 0% di matriks cabang saat ini.",
    tacticalAction: ["N/A."]
  },
  "Volume - (Rp Tn)": {
    category: "Livin",
    unit: "Rp Triliun",
    type: "growth",
    definition: "Volume nominal transaksi rupiah melalui Livin' by Mandiri.",
    importance: "Bobot 0% di matriks cabang saat ini.",
    tacticalAction: ["N/A."]
  },

  // ==================== KOPRA ====================
  "User Aktif": {
    category: "Kopra",
    unit: "User Bisnis",
    type: "growth",
    definition: "User korporasi/bisnis yang aktif bertransaksi di portal Kopra by Mandiri. Realisasi 10125: 140 vs target 98 (Acv 143% - Sempurna!).",
    importance: "Bobot 15% (skor maksimal 1,50 poin tercapai).",
    tacticalAction: [
      "Pertahankan kepuasan admin dan approver finance tenant gedung."
    ]
  },
  "User Aktif SME non Debitur Only": {
    category: "Kopra",
    unit: "User SME",
    type: "growth",
    definition: "User aktif Kopra dari segmen UKM/SME yang bukan debitur pinjaman. Realisasi 10125: 126 vs target 169 (Acv 75% -> Gap -0,50 poin).",
    importance: "Bobot 20% di kategori Kopra (2,00 poin).",
    tacticalAction: [
      "ONBOARDING TENANT & VENDOR: Hubungi 43 pemilik usaha SME (vendor IT, catering, cleaning service, event organizer) yang melayani tenant gedung untuk menggunakan Kopra.",
      "Bebaskan biaya bulanan token/administrasi Kopra selama 6 bulan pertama untuk nasabah SME baru."
    ]
  },
  "User Registered": {
    category: "Kopra",
    unit: "User Bisnis",
    type: "growth",
    definition: "Total perusahaan/user terdaftar di portal Kopra. Realisasi 10125: 446 vs target 386 (Acv 116% - Sempurna!).",
    importance: "Bobot 40% di Kopra (skor maksimal 4,00 poin tercapai).",
    tacticalAction: [
      "Fokus aktivasi user yang sudah terdaftar agar bertransaksi rutin."
    ]
  },
  "GTV - (Rp M)": {
    category: "Kopra",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Gross Transaction Volume: Nilai nominal perputaran uang melalui Kopra. Realisasi 10125: 4.828,5 M vs target 4.673,5 M (Acv 103% - Sempurna!).",
    importance: "Bobot 25% (skor maksimal 2,50 poin tercapai).",
    tacticalAction: [
      "Tingkatkan transaksi valas FX internasional via Kopra FX."
    ]
  },

  // ==================== ACQUIRING ====================
  "EDC - Jumlah Merchant": {
    category: "Acquiring",
    unit: "Merchant",
    type: "growth",
    definition: "Total basis merchant EDC yang dikelola cabang.",
    importance: "Bobot 0% (terwakili oleh Akuisisi New Merchant).",
    tacticalAction: ["Rawat hubungan dengan merchant eksisting."]
  },
  "Akuisisi New Merchant": {
    category: "Acquiring",
    unit: "Merchant Baru",
    type: "growth",
    definition: "Jumlah merchant baru yang dipasang mesin EDC Mandiri. Realisasi 10125: 28 vs target 19 (Acv 147% - Sempurna!).",
    importance: "Bobot 15% (skor maksimal 2,25 poin tercapai).",
    tacticalAction: [
      "Pertahankan akuisisi merchant ritel baru di PIM 3 & Street Gallery."
    ]
  },
  "SV Ytd (Rp Jt)": {
    category: "Acquiring",
    unit: "Rp Juta",
    type: "growth",
    definition: "Sales Volume Year-to-Date EDC: Nilai omset transaksi gesek EDC Mandiri. Realisasi 10125: 14.607 Jt (14,6 M) vs target 51.307 Jt (51,3 M) -> Acv hanya 28% (Bocor -1,62 poin!).",
    importance: "PENYUMBANG KEBOCORAN SKOR TERBESAR DI ACQUIRING. Bobot 15% (2,25 poin maksimal).",
    tacticalAction: [
      "MONITORING EDC PREMIUM MERCHANT: Kunjungi 15 merchant retail & restoran omset tertinggi di PIM 1, 2, 3 dan Street Gallery yang menggunakan EDC Mandiri.",
      "Berikan promo diskon 10-20% kartu kredit Mandiri atau FiestaPoin untuk mengarahkan kasir memprioritaskan gesek EDC Mandiri (On-Us).",
      "Ganti mesin EDC lama yang sering koneksi lambat dengan EDC Android 4G berkecepatan tinggi dengan layar sentuh modern."
    ]
  },
  "FBI (Rp Jt)": {
    category: "Acquiring",
    unit: "Rp Juta",
    type: "growth",
    definition: "Fee Based Income dari komisi MDR EDC. Realisasi 10125: 131,3 Jt vs target 387,1 Jt (Acv 34% -> Bocor -0,99 poin!).",
    importance: "Pendapatan komisi langsung bagi cabang.",
    tacticalAction: [
      "Tingkatkan porsi gesek kartu kredit internasional (Visa/Mastercard/JCB) di merchant butik dan klinik kecantikan Pondok Indah yang tarif MDR-nya lebih menguntungkan."
    ]
  },
  "Funding Rek Settlement (Rp M)": {
    category: "Acquiring",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Saldo penampungan hasil transaksi penjualan merchant EDC. Realisasi 10125: 11.753,9 M vs target 9.256,1 M (Acv 127% - Sempurna!).",
    importance: "Bobot 10% (skor maksimal 1,50 poin tercapai).",
    tacticalAction: ["Pertahankan saldo merchant dengan layanan auto-sweep."]
  },
  "Merchant Optimal": {
    category: "Acquiring",
    unit: "Merchant",
    type: "growth",
    definition: "Jumlah merchant EDC yang memenuhi standar omset minimum bulanan.",
    importance: "Bobot 0% di matriks saat ini.",
    tacticalAction: ["Re-aktivasi merchant dengan omset di bawah 10 juta/bulan."]
  },
  "User Registered - LVM": {
    category: "Acquiring",
    unit: "User",
    type: "growth",
    definition: "Total pendaftaran user Livin' Merchant.",
    importance: "Bobot 0% di matriks saat ini.",
    tacticalAction: ["N/A."]
  },
  "User Aktif - LVM": {
    category: "Acquiring",
    unit: "Merchant Aktif",
    type: "growth",
    definition: "Toko / UMKM yang aktif menerima pembayaran QRIS Livin' Merchant. Realisasi 10125: 91 vs target 77 (Acv 118% - Sempurna!).",
    importance: "Bobot 15% (skor maksimal 2,25 poin tercapai).",
    tacticalAction: ["Pertahankan keaktifan merchant kuliner."]
  },
  "Akuisisi New UREG - LVM": {
    category: "Acquiring",
    unit: "Merchant Baru",
    type: "growth",
    definition: "Merchant baru yang mengunduh dan mendaftar Livin' Merchant. Realisasi 10125: 405 vs target 369 (Acv 110% - Sempurna!).",
    importance: "Bobot 5% (skor maksimal 0,75 poin tercapai).",
    tacticalAction: ["Sosialisasi QRIS gratis untuk UMKM di kantin Office Tower 3."]
  },
  "SV Ytd (Rp M) - LVM": {
    category: "Acquiring",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Sales Volume transaksi QRIS Livin' Merchant. Realisasi 10125: 8.574 M vs target 7.680 M (Acv 112% - Sempurna!).",
    importance: "Bobot 10% (skor maksimal 1,50 poin tercapai).",
    tacticalAction: ["Dorong penggunaan QRIS untuk makan siang karyawan gedung."]
  },
  "FBI Ytd (Rp Jt) - LVM": {
    category: "Acquiring",
    unit: "Rp Juta",
    type: "growth",
    definition: "Fee based income dari MDR QRIS Livin' Merchant. Realisasi 10125: 2,54 Jt vs target 2,65 Jt (Acv 96% -> Gap tipis -0,06 poin).",
    importance: "Hampir mencapai target 100%.",
    tacticalAction: ["Dorong transaksi QRIS pada merchant belanja menengah."]
  },
  "Funding Rek Settlement (Rp M) - LVM": {
    category: "Acquiring",
    unit: "Rp Miliar",
    type: "growth",
    definition: "Saldo penampungan hasil transaksi QRIS Livin' Merchant. Realisasi 10125: 769,4 M vs target 2.522,7 M (Acv 31% -> Bocor -1,03 poin!).",
    importance: "Penyumbang gap signifikan pada LVM. Merchant seringkali langsung memindahkan saldo ke bank lain setelah settlement.",
    tacticalAction: [
      "PROGRAM 'HOLD SETTLEMENT BERBUNGA MENARIK': Berikan insentif cashback biaya administrasi atau bunga tabungan kompetitif bagi merchant yang menahan dana hasil penjualan minimum 7 hari di Mandiri.",
      "Tawarkan pinjaman modal kerja mikro/SME yang cicilannya dipotong langsung dari saldo settlement harian Livin' Merchant."
    ]
  },

  // ==================== GMM ====================
  "Livin - Jumlah Pegawai Berpartisipasi": {
    category: "GMM",
    unit: "Pegawai",
    type: "growth",
    definition: "Jumlah seluruh pegawai organik/aktif di cabang yang berpartisipasi aktif dalam kampanye sosialisasi dan akuisisi Livin'. Realisasi: 7 dari 7 pegawai (100% - Sempurna!).",
    importance: "Bobot 60% dari nilai GMM (skor 3,00 poin tercapai).",
    tacticalAction: ["Pertahankan disiplin morning briefing dan tracking harian."]
  },
  "Jumlah Akuisisi per Pegawai": {
    category: "GMM",
    unit: "User",
    type: "growth",
    definition: "Rata-rata jumlah akuisisi per pegawai (Bobot 0%).",
    importance: "Internal KPI pegawai.",
    tacticalAction: ["N/A."]
  },
  "% UREG Aktif Transaksi dari Total Akuisisi": {
    category: "GMM",
    unit: "Persen (%)",
    type: "growth",
    definition: "Persentase user yang tetap aktif bertransaksi setelah diakuisisi pegawai.",
    importance: "Bobot 0% di matriks saat ini.",
    tacticalAction: ["Edukasi transaksi berkelanjutan."]
  },
  "Duta Transaksi - Jumlah Pegawai Berpartisipasi": {
    category: "GMM",
    unit: "Pegawai",
    type: "growth",
    definition: "Pegawai yang aktif mengedukasi nasabah menggunakan channel digital Mandiri. Realisasi: 7 dari 7 pegawai (100% - Sempurna!).",
    importance: "Bobot 20% (skor 1,00 poin tercapai).",
    tacticalAction: ["Apresiasi mingguan 'Duta Transaksi Terbaik' bagi teller/CS."]
  },
  "Jumlah Pegawai dengan % On-Us >= 60%": {
    category: "GMM",
    unit: "Pegawai",
    type: "growth",
    definition: "Jumlah pegawai dengan rasio transaksi kartu Mandiri di EDC Mandiri >= 60%.",
    importance: "Bobot 0% di matriks saat ini.",
    tacticalAction: ["N/A."]
  },
  "Merchant - Jumlah Pegawai Berpartisipasi": {
    category: "GMM",
    unit: "Pegawai",
    type: "growth",
    definition: "Pegawai cabang yang mereferensikan merchant EDC / Livin' Merchant. Realisasi: 7 dari 7 pegawai (100% - Sempurna!).",
    importance: "Bobot 20% (skor 1,00 poin tercapai).",
    tacticalAction: ["Pertahankan keaktifan referral pegawai."]
  },

  // ==================== EKOSISTEM ====================
  "Porsi DPK Ekosistem Terhadap DPK Region": {
    category: "Ekosistem",
    unit: "Persen Rasio",
    type: "growth",
    definition: "Kontribusi porsi DPK ekosistem bisnis cabang terhadap total DPK ekosistem di seluruh Region V Jakarta 3. Realisasi 10125: 28,25% vs target 19,18% (Acv 147% - Sempurna!).",
    importance: "Bobot 100% dari nilai Ekosistem (skor maksimal 5,00 poin tercapai).",
    tacticalAction: ["Pertahankan posisi dominan ekosistem Pondok Indah."]
  },
  "Porsi Kredit Retail Ekosistem Terhadap Kredit Retail Region": {
    category: "Ekosistem",
    unit: "Persen Rasio",
    type: "growth",
    definition: "Kontribusi kredit ekosistem cabang terhadap total kredit ekosistem Region V.",
    importance: "Bobot 0% di matriks saat ini.",
    tacticalAction: ["N/A."]
  }
};

/**
 * Intelligent helper to find knowledge base entry by metric, subMetric, or name
 */
export function getMetricKnowledge(item) {
  if (!item) return {};
  return (
    metricKnowledge[item.name] ||
    (item.subMetric && item.metric ? metricKnowledge[`${item.subMetric} - ${item.metric}`] : null) ||
    (item.metric && item.subMetric ? metricKnowledge[`${item.metric} - ${item.subMetric}`] : null) ||
    (item.subMetric ? metricKnowledge[item.subMetric] : null) ||
    metricKnowledge[item.metric] ||
    metricKnowledge[item.name?.split(' - ')[0]] ||
    {}
  );
}

/**
 * Format currency and numbers for Indonesian banking dashboard (matching branchiq-dashboard & Mandiri format)
 */
export function formatBankingNumber(val, unit = '', isPct = false) {
  if (val === null || val === undefined || isNaN(val)) return '–';
  const num = Number(val);

  if (isPct || unit.includes('Persen (%)' )) {
    // Notice in Excel Database: % Kol 2 and % NPL are already stored as percentages or ratios depending on row
    // In branchiq-dashboard: fv(x, v) = x.isPct ? fmtPct(v) : fmt(v) where fmtPct(v) = (v*100).toFixed(2) + '%'
    return (num * 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
  if (unit.includes('Persen Rasio')) {
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
  if (unit.includes('Rp Miliar') || unit.includes('Rp M') || unit.includes('Rp Tn')) {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(num);
  }
  if (
    unit.includes('User') ||
    unit.includes('Rekening') ||
    unit.includes('Pegawai') ||
    unit.includes('Merchant') ||
    (unit.includes('Kartu') && !unit.includes('Ratusan'))
  ) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
  }
  if (Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: num % 1 !== 0 ? 1 : 0,
      maximumFractionDigits: num % 1 !== 0 ? 1 : 0
    }).format(num);
  }
  if (num % 1 !== 0) {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: Math.abs(num) < 10 ? 2 : 1,
      maximumFractionDigits: Math.abs(num) < 10 ? 2 : 2
    }).format(num);
  }
  return new Intl.NumberFormat('id-ID').format(num);
}
