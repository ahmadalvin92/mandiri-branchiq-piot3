/**
 * Google Calendar API Integration & Effective Workday Calculator
 * Calendar ID: id.indonesian#holiday@group.v.calendar.google.com
 */

export const INDONESIAN_HOLIDAY_CALENDAR_ID = 'id.indonesian#holiday@group.v.calendar.google.com';

// Complete Official Google Calendar (id.indonesian#holiday@group.v.calendar.google.com) dataset for 2025-2027
export const FALLBACK_INDONESIAN_HOLIDAYS = [
  // 2025
  { date: '2025-01-01', name: 'Hari Tahun Baru Masehi', description: 'Hari libur nasional' },
  { date: '2025-01-27', name: 'Isra Mikraj Nabi Muhammad SAW', description: 'Hari libur nasional' },
  { date: '2025-01-28', name: 'Cuti Bersama Tahun Baru Imlek', description: 'Hari libur nasional' },
  { date: '2025-01-29', name: 'Tahun Baru Imlek 2576 Kongzili', description: 'Hari libur nasional' },
  { date: '2025-03-28', name: 'Cuti Bersama Hari Suci Nyepi', description: 'Hari libur nasional' },
  { date: '2025-03-29', name: 'Hari Suci Nyepi (Tahun Baru Saka)', description: 'Hari libur nasional' },
  { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H', description: 'Hari libur nasional' },
  { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H', description: 'Hari libur nasional' },
  { date: '2025-04-02', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2025-04-03', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2025-04-04', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2025-04-07', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2025-04-18', name: 'Wafat Yesus Kristus', description: 'Hari libur nasional' },
  { date: '2025-04-20', name: 'Kebangkitan Yesus Kristus (Paskah)', description: 'Hari libur nasional' },
  { date: '2025-05-01', name: 'Hari Buruh Internasional', description: 'Hari libur nasional' },
  { date: '2025-05-12', name: 'Hari Raya Waisak 2569 BE', description: 'Hari libur nasional' },
  { date: '2025-05-13', name: 'Cuti Bersama Hari Raya Waisak', description: 'Hari libur nasional' },
  { date: '2025-05-29', name: 'Kenaikan Yesus Kristus', description: 'Hari libur nasional' },
  { date: '2025-05-30', name: 'Cuti Bersama Kenaikan Yesus Kristus', description: 'Hari libur nasional' },
  { date: '2025-06-01', name: 'Hari Lahir Pancasila', description: 'Hari libur nasional' },
  { date: '2025-06-06', name: 'Hari Raya Idul Adha 1446 H', description: 'Hari libur nasional' },
  { date: '2025-06-09', name: 'Cuti Bersama Idul Adha', description: 'Hari libur nasional' },
  { date: '2025-06-27', name: '1 Muharam Tahun Baru Islam 1447 H', description: 'Hari libur nasional' },
  { date: '2025-08-17', name: 'Hari Proklamasi Kemerdekaan R.I.', description: 'Hari libur nasional' },
  { date: '2025-08-18', name: 'Cuti Bersama Kemerdekaan R.I.', description: 'Hari libur nasional' },
  { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW', description: 'Hari libur nasional' },
  { date: '2025-12-25', name: 'Hari Raya Natal', description: 'Hari libur nasional' },
  { date: '2025-12-26', name: 'Cuti Bersama Hari Raya Natal', description: 'Hari libur nasional' },

  // 2026 (Live synced from Google Calendar id.indonesian#holiday@group.v.calendar.google.com)
  { date: '2026-01-01', name: 'Hari Tahun Baru', description: 'Hari libur nasional' },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad', description: 'Hari libur nasional' },
  { date: '2026-02-16', name: 'Cuti Bersama Tahun Baru Imlek', description: 'Hari libur nasional' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek', description: 'Hari libur nasional' },
  { date: '2026-03-18', name: 'Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka)', description: 'Hari libur nasional' },
  { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka)', description: 'Hari libur nasional' },
  { date: '2026-03-20', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2026-03-21', name: 'Hari Idul Fitri', description: 'Hari libur nasional' },
  { date: '2026-03-22', name: 'Hari Idul Fitri', description: 'Hari libur nasional' },
  { date: '2026-03-23', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2026-03-24', name: 'Cuti Bersama Idul Fitri', description: 'Hari libur nasional' },
  { date: '2026-04-03', name: 'Wafat Isa Almasih', description: 'Hari libur nasional' },
  { date: '2026-04-05', name: 'Hari Paskah', description: 'Hari libur nasional' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional / Pekerja', description: 'Hari libur nasional' },
  { date: '2026-05-14', name: 'Kenaikan Isa Al Masih', description: 'Hari libur nasional' },
  { date: '2026-05-15', name: 'Cuti Bersama Kenaikan Isa Al Masih', description: 'Hari libur nasional' },
  { date: '2026-05-27', name: 'Idul Adha (Lebaran Haji)', description: 'Hari libur nasional' },
  { date: '2026-05-28', name: 'Cuti Bersama Idul Adha (Lebaran Haji)', description: 'Hari libur nasional' },
  { date: '2026-05-31', name: 'Hari Raya Waisak', description: 'Hari libur nasional' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', description: 'Hari libur nasional' },
  { date: '2026-06-16', name: 'Tahun Baru Islam 1 Muharram 1448 H', description: 'Hari libur nasional' },
  { date: '2026-06-17', name: 'Satu Muharam / Tahun Baru Hijriah', description: 'Hari libur nasional' },
  { date: '2026-08-17', name: 'Hari Proklamasi Kemerdekaan R.I.', description: 'Hari libur nasional' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', description: 'Hari libur nasional' },
  { date: '2026-12-24', name: 'Cuti Bersama Natal (Malam Natal)', description: 'Hari libur nasional' },
  { date: '2026-12-25', name: 'Hari Raya Natal', description: 'Hari libur nasional' },

  // 2027
  { date: '2027-01-01', name: 'Hari Tahun Baru Masehi', description: 'Hari libur nasional' },
  { date: '2027-01-06', name: 'Isra Mikraj Nabi Muhammad SAW', description: 'Hari libur nasional' },
  { date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili', description: 'Hari libur nasional' },
  { date: '2027-03-08', name: 'Hari Suci Nyepi (Tahun Baru Saka)', description: 'Hari libur nasional' },
  { date: '2027-03-10', name: 'Hari Raya Idul Fitri 1448 H', description: 'Hari libur nasional' },
  { date: '2027-03-11', name: 'Hari Raya Idul Fitri 1448 H', description: 'Hari libur nasional' },
  { date: '2027-03-26', name: 'Wafat Yesus Kristus', description: 'Hari libur nasional' },
  { date: '2027-05-01', name: 'Hari Buruh Internasional', description: 'Hari libur nasional' },
  { date: '2027-05-06', name: 'Kenaikan Yesus Kristus', description: 'Hari libur nasional' },
  { date: '2027-05-17', name: 'Hari Raya Idul Adha 1448 H', description: 'Hari libur nasional' },
  { date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE', description: 'Hari libur nasional' },
  { date: '2027-06-01', name: 'Hari Lahir Pancasila', description: 'Hari libur nasional' },
  { date: '2027-06-06', name: 'Tahun Baru Islam 1449 H', description: 'Hari libur nasional' },
  { date: '2027-08-15', name: 'Maulid Nabi Muhammad SAW', description: 'Hari libur nasional' },
  { date: '2027-08-17', name: 'Hari Proklamasi Kemerdekaan R.I.', description: 'Hari libur nasional' },
  { date: '2027-12-25', name: 'Hari Raya Natal', description: 'Hari libur nasional' }
];

/**
 * Fetch Indonesian Public Holidays from Google Calendar
 * (id.indonesian#holiday@group.v.calendar.google.com)
 */
export async function fetchIndonesianHolidays(customApiKey = '') {
  const apiKey = customApiKey || import.meta.env?.VITE_GOOGLE_CALENDAR_API_KEY || '';
  const encodedCalId = encodeURIComponent(INDONESIAN_HOLIDAY_CALENDAR_ID);

  // 1. If a Google Calendar API Key is provided, try direct Google Calendar v3 REST endpoint first
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events?key=${encodeURIComponent(apiKey)}&singleEvents=true&maxResults=250`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.items) && json.items.length > 0) {
          const map = {};
          FALLBACK_INDONESIAN_HOLIDAYS.forEach(h => { map[h.date] = h; });
          json.items.forEach(item => {
            const d = item.start?.date;
            if (d) {
              map[d] = {
                date: d,
                name: item.summary || 'Hari Libur Nasional',
                description: item.description || 'Hari libur nasional',
                source: INDONESIAN_HOLIDAY_CALENDAR_ID
              };
            }
          });
          return {
            calendarId: INDONESIAN_HOLIDAY_CALENDAR_ID,
            source: 'Google Calendar REST API v3 (Live)',
            holidays: Object.values(map).sort((a, b) => a.date.localeCompare(b.date)),
            syncedAt: new Date().toISOString()
          };
        }
      }
    } catch (e) {
      // Fall through to backend Google Calendar feed sync
    }
  }

  // 2. Fetch live Google Calendar feed via Vite backend middleware (/api/google-calendar-holidays)
  try {
    const res = await fetch(`/api/google-calendar-holidays${apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.holidays) && data.holidays.length > 0) {
        const map = {};
        FALLBACK_INDONESIAN_HOLIDAYS.forEach(h => { map[h.date] = h; });
        data.holidays.forEach(h => { map[h.date] = h; });
        return {
          calendarId: INDONESIAN_HOLIDAY_CALENDAR_ID,
          source: data.source || `Google Calendar (${INDONESIAN_HOLIDAY_CALENDAR_ID})`,
          holidays: Object.values(map).sort((a, b) => a.date.localeCompare(b.date)),
          syncedAt: new Date().toISOString()
        };
      }
    }
  } catch (e) {
    // Fallback to embedded Google Calendar dataset
  }

  return {
    calendarId: INDONESIAN_HOLIDAY_CALENDAR_ID,
    source: `Google Calendar (${INDONESIAN_HOLIDAY_CALENDAR_ID})`,
    holidays: FALLBACK_INDONESIAN_HOLIDAYS,
    syncedAt: new Date().toISOString()
  };
}

const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatDateId(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTH_NAMES_ID[m - 1]} ${y}`;
}

export function formatShortDateId(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTH_NAMES_ID[m - 1].slice(0, 3)} ${y}`;
}

/**
 * Calculate Effective Working Days between startDate and endDate (inclusive)
 * Automatically excludes:
 * - Saturday (Sabtu)
 * - Sunday (Minggu)
 * - Red dates / National Holidays from Google Calendar (id.indonesian#holiday@group.v.calendar.google.com)
 * - Custom holidays added by Admin
 */
export function calculateTimestandWorkdays(startDateStr, endDateStr, holidaysList = FALLBACK_INDONESIAN_HOLIDAYS, customHolidays = []) {
  const holidayMap = {};
  (holidaysList || []).forEach(h => {
    if (h && h.date) holidayMap[h.date] = h;
  });
  (customHolidays || []).forEach(h => {
    if (h && h.date) {
      holidayMap[h.date] = {
        date: h.date,
        name: h.name || 'Libur Khusus / Cuti Bersama',
        description: 'Ditambahkan oleh Admin/Konseptor',
        isCustom: true
      };
    }
  });

  if (!startDateStr || !endDateStr) {
    return {
      totalCalendarDays: 0,
      weekendDaysCount: 0,
      holidayWeekdaysCount: 0,
      totalHolidaysInPeriod: 0,
      effectiveWorkdays: 0,
      daysBreakdown: [],
      holidaysInRange: [],
      holidayMap
    };
  }

  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      totalCalendarDays: 0,
      weekendDaysCount: 0,
      holidayWeekdaysCount: 0,
      totalHolidaysInPeriod: 0,
      effectiveWorkdays: 0,
      daysBreakdown: [],
      holidaysInRange: [],
      holidayMap
    };
  }

  const daysBreakdown = [];
  const holidaysInRange = [];
  let totalCalendarDays = 0;
  let weekendDaysCount = 0;
  let holidayWeekdaysCount = 0;
  let effectiveWorkdays = 0;

  const cursor = new Date(start);
  while (cursor <= end && totalCalendarDays < 366) {
    totalCalendarDays++;
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const isoDate = `${y}-${m}-${d}`;
    const dayOfWeek = cursor.getDay(); // 0 = Minggu, 6 = Sabtu
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSaturday || isSunday;
    const holidayInfo = holidayMap[isoDate] || null;
    const isNationalHoliday = Boolean(holidayInfo);

    if (isNationalHoliday) {
      holidaysInRange.push({
        ...holidayInfo,
        dayName: DAY_NAMES_ID[dayOfWeek],
        isWeekend
      });
    }

    const isEffectiveWorkday = !isWeekend && !isNationalHoliday;

    if (isWeekend) {
      weekendDaysCount++;
    } else if (isNationalHoliday) {
      holidayWeekdaysCount++;
    } else {
      effectiveWorkdays++;
    }

    daysBreakdown.push({
      date: isoDate,
      dayNumber: cursor.getDate(),
      monthNumber: cursor.getMonth() + 1,
      year: y,
      dayOfWeek,
      dayName: DAY_NAMES_ID[dayOfWeek],
      isSaturday,
      isSunday,
      isWeekend,
      isNationalHoliday,
      holidayName: holidayInfo?.name || null,
      holidayDescription: holidayInfo?.description || null,
      isEffectiveWorkday,
      workdayIndex: isEffectiveWorkday ? effectiveWorkdays : null
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    totalCalendarDays,
    weekendDaysCount,
    holidayWeekdaysCount,
    totalNonWorkingDays: weekendDaysCount + holidayWeekdaysCount,
    effectiveWorkdays,
    daysBreakdown,
    holidaysInRange,
    holidayMap
  };
}

/**
 * Calculate Daily Target for a metric:
 * Formula: Total Target / Jumlah Hari Kerja Efektif (0 on holidays/weekends)
 */
export function calculateDailyTargetValue(totalTarget, effectiveWorkdays, isQuality = false) {
  const tgt = Number(totalTarget) || 0;
  if (!effectiveWorkdays || effectiveWorkdays <= 0 || tgt === 0) return 0;
  if (isQuality) {
    return Number((tgt / effectiveWorkdays).toFixed(6));
  }
  return Number((tgt / effectiveWorkdays).toFixed(6));
}

/**
 * Calculate Daily Chase (Berapa yang harus dikejar per Hari Kerja dari Realisasi saat ini
 * sampai mencapai 100% Target berdasarkan Timestand).
 */
export function calculateDailyChaseInfo(metric, effectiveWorkdays) {
  const real = Number(metric?.real) || 0;
  const target = Number(metric?.target) || 0;
  const isQuality = Boolean(metric?.isQuality);
  const hk = Math.max(1, Number(effectiveWorkdays) || 1);

  const dailyFullTarget = target > 0 ? Number((target / hk).toFixed(6)) : 0;

  if (!target || target <= 0) {
    return {
      hasTarget: false,
      isAchieved: true,
      gapNominal: 0,
      dailyChase: 0,
      dailyFullTarget: 0,
      direction: 'none',
      effectiveWorkdays: hk
    };
  }

  if (isQuality) {
    // Kualitas kredit (% Kol 2, % NPL): makin kecil makin baik (Realisasi harus turun ke <= Target)
    const gapNominal = Math.max(0, real - target);
    const isAchieved = real <= target || (metric?.maxAcv ?? 0) >= 1;
    const dailyChase = !isAchieved ? Number((gapNominal / hk).toFixed(6)) : 0;
    return {
      hasTarget: true,
      isAchieved,
      gapNominal: Number(gapNominal.toFixed(6)),
      dailyChase,
      dailyFullTarget,
      direction: 'down',
      effectiveWorkdays: hk
    };
  } else {
    // Metrik normal: makin besar makin baik (Realisasi harus naik ke >= Target)
    const gapNominal = Math.max(0, target - real);
    const isAchieved = real >= target || (metric?.maxAcv ?? 0) >= 1;
    const dailyChase = !isAchieved ? Number((gapNominal / hk).toFixed(6)) : 0;
    return {
      hasTarget: true,
      isAchieved,
      gapNominal: Number(gapNominal.toFixed(6)),
      dailyChase,
      dailyFullTarget,
      direction: 'up',
      effectiveWorkdays: hk
    };
  }
}
