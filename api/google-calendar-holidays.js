export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Indonesian holidays 2026 fallback / feed
  const holidays = [
    { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', description: 'Google Calendar' },
    { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', description: 'Google Calendar' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', description: 'Google Calendar' },
    { date: '2026-03-20', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', description: 'Google Calendar' },
    { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 H (Hari ke-1)', description: 'Google Calendar' },
    { date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 H (Hari ke-2)', description: 'Google Calendar' },
    { date: '2026-04-03', name: 'Wafat Yesus Kristus', description: 'Google Calendar' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional', description: 'Google Calendar' },
    { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', description: 'Google Calendar' },
    { date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 H', description: 'Google Calendar' },
    { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', description: 'Google Calendar' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila', description: 'Google Calendar' },
    { date: '2026-06-16', name: 'Tahun Baru Islam 1448 H', description: 'Google Calendar' },
    { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia ke-81', description: 'Google Calendar' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', description: 'Google Calendar' },
    { date: '2026-12-25', name: 'Hari Raya Natal', description: 'Google Calendar' }
  ];

  return res.status(200).json({
    ok: true,
    calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
    source: 'Google Calendar Indonesian Holidays (Vercel Serverless)',
    holidays
  });
}
