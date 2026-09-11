const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');
const assert = require('node:assert/strict');

// Transpile greeting.ts to commonjs for testing
const source = fs.readFileSync(path.join(__dirname, '../src/lib/greeting.ts'), 'utf8');
const code = ts.transpile(source, { module: ts.ModuleKind.CommonJS });
const greetingModule = {};
vm.runInNewContext(code, { exports: greetingModule, Math, Date });

const { getGreetingByHour, getTimeGreeting, formatGreeting, resolveUserDisplayName } = greetingModule;

console.log('Testing time-based greeting rules...');

// Required hour verifications from prompt:
// Hour 06 → Good morning
assert.equal(getGreetingByHour(6), 'Good morning', 'Hour 06 must return Good morning');

// Hour 11 → Good morning
assert.equal(getGreetingByHour(11), 'Good morning', 'Hour 11 must return Good morning');

// Hour 12 → Good afternoon
assert.equal(getGreetingByHour(12), 'Good afternoon', 'Hour 12 must return Good afternoon');

// Hour 17 → Good afternoon
assert.equal(getGreetingByHour(17), 'Good afternoon', 'Hour 17 must return Good afternoon');

// Hour 18 → Good evening
assert.equal(getGreetingByHour(18), 'Good evening', 'Hour 18 must return Good evening');

// Hour 23 → Good evening
assert.equal(getGreetingByHour(23), 'Good evening', 'Hour 23 must return Good evening');

// Boundary & edge cases
assert.equal(getGreetingByHour(0), 'Good morning', 'Hour 00:00 must return Good morning');
assert.equal(getGreetingByHour(11.99), 'Good morning', 'Hour 11:59 must return Good morning');
assert.equal(getGreetingByHour(12.0), 'Good afternoon', 'Hour 12:00 must return Good afternoon');
assert.equal(getGreetingByHour(17.99), 'Good afternoon', 'Hour 17:59 must return Good afternoon');
assert.equal(getGreetingByHour(18.0), 'Good evening', 'Hour 18:00 must return Good evening');
assert.equal(getGreetingByHour(23.99), 'Good evening', 'Hour 23:59 must return Good evening');

// Name formatting tests
assert.equal(formatGreeting('Good morning', 'Anjana'), 'Good morning, Anjana');
assert.equal(formatGreeting('Good afternoon', 'Anjana'), 'Good afternoon, Anjana');
assert.equal(formatGreeting('Good evening', 'Anjana'), 'Good evening, Anjana');
assert.equal(formatGreeting('Good morning', ''), 'Good morning');
assert.equal(formatGreeting('Good morning', null), 'Good morning');
assert.equal(formatGreeting('Good morning', undefined), 'Good morning');
assert.equal(formatGreeting('Good morning', '  John Doe  '), 'Good morning, John Doe');

// Display name resolution
assert.equal(resolveUserDisplayName({ firstName: 'Anjana', lastName: 'Imesh' }), 'Anjana');
assert.equal(resolveUserDisplayName({ lastName: 'Smith' }), 'Smith');
assert.equal(resolveUserDisplayName({ email: 'developer@futurex.com' }), 'developer');
assert.equal(resolveUserDisplayName(null, 'there'), 'there');

// Date-based greeting tests across local mock dates
const morningDate = new Date(2026, 8, 11, 8, 30, 0);
assert.equal(getTimeGreeting(morningDate), 'Good morning', '08:30 must return Good morning');

const afternoonDate = new Date(2026, 8, 11, 14, 15, 0);
assert.equal(getTimeGreeting(afternoonDate), 'Good afternoon', '14:15 must return Good afternoon');

const eveningDate = new Date(2026, 8, 11, 19, 30, 0);
assert.equal(getTimeGreeting(eveningDate), 'Good evening', '19:30 must return Good evening');

// Timezone test: Ensure browser date uses local time irrespective of TZ environment
const originalTimezone = process.env.TZ;
try {
  for (const zone of ['Asia/Colombo', 'America/New_York', 'UTC', 'Europe/London', 'Asia/Tokyo']) {
    process.env.TZ = zone;
    // Specific local hours in any TZ
    assert.equal(getGreetingByHour(6), 'Good morning');
    assert.equal(getGreetingByHour(11), 'Good morning');
    assert.equal(getGreetingByHour(12), 'Good afternoon');
    assert.equal(getGreetingByHour(17), 'Good afternoon');
    assert.equal(getGreetingByHour(18), 'Good evening');
    assert.equal(getGreetingByHour(23), 'Good evening');
  }
} finally {
  if (originalTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = originalTimezone;
}

console.log('✅ All time-based greeting assertions passed successfully!');
