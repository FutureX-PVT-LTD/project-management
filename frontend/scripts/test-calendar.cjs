const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/features/calendar/calendar-date.ts'), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
const calendar = {};
vm.runInNewContext(code, { exports: calendar, Date });
const originalTimezone = process.env.TZ;
try {
  for (const zone of ['Asia/Colombo', 'America/Los_Angeles', 'UTC']) {
    process.env.TZ = zone;
    assert.equal(calendar.calendarDateKey(new Date(2026, 8, 10)), '2026-09-10');
    assert.equal(calendar.calendarDateKey(new Date(2026, 12, 1)), '2027-01-01');
    assert.equal(calendar.calendarDateKey(new Date(2027, -1, 1)), '2026-12-01');
    const range = calendar.calendarRange(new Date(2026, 11, 15));
    assert.equal(range.startDate, '2026-11-01T00:00:00.000Z');
    assert.equal(range.endDate, '2027-01-31T23:59:59.999Z');
  }
  console.log('15 calendar timezone/year-boundary assertions passed');
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}
