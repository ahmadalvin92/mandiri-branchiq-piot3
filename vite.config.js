import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import https from 'https';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'branchiq_db.json');

const INITIAL_USERS = [
  { username: 'superadmin', displayName: 'Super Administrator', password: 'mandiri123', role: 'superadmin', jabatan: 'System Superadmin & IT', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'alvin.superadmin', displayName: 'Alvin (Superadmin)', password: 'mandiri123', role: 'superadmin', jabatan: 'Superadmin & System Architect', createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z' },
  { username: 'michael.superadmin', displayName: 'Michael Danniel (Superadmin)', password: 'mandiri123', role: 'superadmin', jabatan: 'Kepala Cabang & Superadmin', createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z' },
  { username: 'amalia.superadmin', displayName: 'Amalia (Superadmin)', password: 'mandiri123', role: 'superadmin', jabatan: 'Superadmin Cabang', createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z' },
  { username: 'michael', displayName: 'Michael Danniel', password: 'mandiri123', role: 'admin', jabatan: 'Kepala Cabang / Konseptor Utama', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'alvin.admin', displayName: 'Alvin (Admin)', password: 'mandiri123', role: 'admin', jabatan: 'Admin / Konseptor Cabang', createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z' },
  { username: 'amal.admin', displayName: 'Amal (Admin)', password: 'mandiri123', role: 'admin', jabatan: 'Admin / Konseptor Cabang', createdAt: '2026-11-17T08:00:00Z', updatedAt: '2026-11-17T08:00:00Z' },
  { username: 'rian', displayName: 'Rian', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'dina', displayName: 'Dina', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'disa', displayName: 'Disa', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'fia', displayName: 'Fia', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'wardah', displayName: 'Wardah', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'embun', displayName: 'Embun', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'febri', displayName: 'Febri', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'arga', displayName: 'Arga', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'arsya', displayName: 'Arsya', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'akbar', displayName: 'Akbar', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'dimas', displayName: 'Dimas', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'rafli', displayName: 'Rafli', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'alvin', displayName: 'Alvin', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' },
  { username: 'amalia', displayName: 'Amalia', password: 'mandiri123', role: 'viewer', jabatan: 'Branch Officer (Viewer)', createdAt: '2026-11-16T08:00:00Z', updatedAt: '2026-11-16T08:00:00Z' }
];

function mergeRequiredUsers(existingUsers = []) {
  const map = new Map();
  if (Array.isArray(existingUsers)) {
    existingUsers.forEach(u => {
      if (u && u.username) map.set(u.username.toLowerCase(), u);
    });
  }
  INITIAL_USERS.forEach(initU => {
    const key = initU.username.toLowerCase();
    if (!map.has(key)) map.set(key, { ...initU });
  });
  return Array.from(map.values());
}

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      users: INITIAL_USERS,
      masterTargets: {},
      masterStrategies: {},
      viewerSimulations: [],
      timestandConfig: {
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
        googleApiKey: '',
        customHolidays: [],
        updatedBy: 'michael',
        updatedAt: '2026-11-16T08:00:00Z'
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    parsed.users = mergeRequiredUsers(parsed.users);
    if (!parsed.masterTargets) parsed.masterTargets = {};
    if (!parsed.masterStrategies) parsed.masterStrategies = {};
    if (!parsed.viewerSimulations) parsed.viewerSimulations = [];
    if (!parsed.timestandConfig) {
      parsed.timestandConfig = {
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
        googleApiKey: '',
        customHolidays: [],
        updatedBy: 'michael',
        updatedAt: new Date().toISOString()
      };
    }
    return parsed;
  } catch (e) {
    return {
      users: INITIAL_USERS,
      masterTargets: {},
      masterStrategies: {},
      viewerSimulations: [],
      timestandConfig: {
        startDate: '2026-11-16',
        endDate: '2026-11-30',
        calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
        googleApiKey: '',
        customHolidays: [],
        updatedBy: 'michael',
        updatedAt: new Date().toISOString()
      }
    };
  }
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function fetchUrlText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => resolve(raw));
      })
      .on('error', reject);
  });
}

function parseGoogleICalHolidays(icsText) {
  const blocks = icsText.split('BEGIN:VEVENT').slice(1);
  const holidaysMap = {};
  for (const b of blocks) {
    const dtStart = (b.match(/DTSTART;VALUE=DATE:(\d{8})/) || [])[1];
    const dtEnd = (b.match(/DTEND;VALUE=DATE:(\d{8})/) || [])[1];
    const summaryRaw = (b.match(/SUMMARY:(.+)/) || [])[1] || '';
    const descRaw = (b.match(/DESCRIPTION:(.+)/) || [])[1] || '';
    const summary = summaryRaw.trim().replace(/\\,/g, ',');
    const description = descRaw.trim().replace(/\\n/g, ' ').replace(/\\,/g, ',');

    // Include official national holidays & cuti bersama (or Hijri New Year)
    const isNationalHoliday =
      description.toLowerCase().includes('hari libur nasional') ||
      summary.toLowerCase().includes('cuti bersama') ||
      summary.toLowerCase().includes('tahun baru hijriah') ||
      summary.toLowerCase().includes('muharam');

    if (dtStart && isNationalHoliday) {
      const y = dtStart.slice(0, 4);
      const m = dtStart.slice(4, 6);
      const d = dtStart.slice(6, 8);
      const dateStr = `${y}-${m}-${d}`;
      holidaysMap[dateStr] = {
        date: dateStr,
        name: summary,
        description: 'Hari Libur Nasional / Cuti Bersama (Google Calendar)',
        source: 'id.indonesian#holiday@group.v.calendar.google.com'
      };
    }
  }
  return Object.values(holidaysMap).sort((a, b) => a.date.localeCompare(b.date));
}

function branchIqApiPlugin() {
  return {
    name: 'branchiq-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const sendJson = (status, payload) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };

        const readBody = () =>
          new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch (e) {
                resolve({});
              }
            });
          });

        const urlObj = new URL(req.url, 'http://localhost');
        const pathname = urlObj.pathname;

        try {
          if (pathname === '/api/db' && req.method === 'GET') {
            return sendJson(200, loadDb());
          }

          if (pathname === '/api/db/sync' && req.method === 'POST') {
            const body = await readBody();
            const current = loadDb();
            const merged = {
              users: Array.isArray(body.users) && body.users.length ? body.users : current.users,
              masterTargets: body.masterTargets !== undefined ? body.masterTargets : current.masterTargets,
              masterStrategies: body.masterStrategies !== undefined ? body.masterStrategies : current.masterStrategies,
              viewerSimulations: Array.isArray(body.viewerSimulations) ? body.viewerSimulations : current.viewerSimulations,
              timestandConfig: body.timestandConfig || current.timestandConfig
            };
            saveDb(merged);
            return sendJson(200, { ok: true, db: merged });
          }

          if (pathname === '/api/google-calendar-holidays' && req.method === 'GET') {
            const apiKey = urlObj.searchParams.get('apiKey') || process.env.VITE_GOOGLE_CALENDAR_API_KEY || '';
            const calId = 'id.indonesian%23holiday%40group.v.calendar.google.com';

            if (apiKey) {
              try {
                const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?key=${encodeURIComponent(apiKey)}&singleEvents=true&maxResults=250`;
                const rawJson = await fetchUrlText(apiUrl);
                const parsed = JSON.parse(rawJson);
                if (Array.isArray(parsed.items)) {
                  const holidays = parsed.items
                    .filter((item) => item.start?.date)
                    .map((item) => ({
                      date: item.start.date,
                      name: item.summary || 'Hari Libur Nasional',
                      description: item.description || 'Google Calendar API',
                      source: 'Google Calendar REST API v3 (id.indonesian#holiday@group.v.calendar.google.com)'
                    }));
                  return sendJson(200, {
                    ok: true,
                    calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
                    source: 'Google Calendar REST API v3',
                    holidays
                  });
                }
              } catch (err) {
                // Fall through to Google Calendar public iCal feed
              }
            }

            // Live fetch from official Google Calendar public feed for id.indonesian#holiday@group.v.calendar.google.com
            const icsUrl = `https://calendar.google.com/calendar/ical/${calId}/public/basic.ics`;
            const icsText = await fetchUrlText(icsUrl);
            const holidays = parseGoogleICalHolidays(icsText);
            return sendJson(200, {
              ok: true,
              calendarId: 'id.indonesian#holiday@group.v.calendar.google.com',
              source: 'Google Calendar Live Feed (id.indonesian#holiday@group.v.calendar.google.com)',
              holidays
            });
          }

          return sendJson(404, { error: 'Endpoint not found' });
        } catch (err) {
          return sendJson(500, { error: err.message || 'Internal Server Error' });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    branchIqApiPlugin()
  ],
  server: {
    port: 5173,
    host: true,
  },
});
