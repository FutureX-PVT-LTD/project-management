const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

// UI fixtures are isolated from real accounts and database mutations.
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const access of ['ADMIN', 'OWNER']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const project = { id: 'demo', name: 'Demo Product', members: [], tasks: [{ id: 'task', workType: 'STANDARD_CHECKLIST', workstream: 'DEVELOPMENT' }] };
      const marketing = [{ id: 'marketing', title: 'Confirm identity', checklistCode: 'MI-01', checklistPhase: 'Identity', status: 'UNASSIGNED' }];
      const members = [{ id: 'a', firstName: 'Nimal', lastName: 'Silva' }, { id: 'b', firstName: 'Amal', lastName: 'Perera' }];
      const developmentWorkspace = { totalItems: 1, assignedItems: 0, unassignedItems: 1, readyItems: 1, waitingItems: 0, members, phases: [{ phaseKey: 'Core Development', orderIndex: 1, defaultAssigneeId: null, memberIds: [], taskCount: 1, assignedCount: 0, unassignedCount: 1, tasks: [{ id: 'task', humanId: 'DEMO-101', title: 'Build API', phase: 'Core Development', status: 'READY', progress: 0 }] }] };
      const marketingWorkspace = { totalItems: 1, assignedItems: 0, unassignedItems: 1, readyItems: 1, waitingItems: 0, members, phases: [{ phaseKey: 'Identity', orderIndex: 1, defaultAssigneeId: null, memberIds: [], taskCount: 1, assignedCount: 0, unassignedCount: 1, tasks: [{ id: 'marketing', humanId: 'DEMO-201', title: 'Confirm identity', phase: 'Identity', status: 'READY', progress: 0 }] }] };
      let saved;
      await page.route('**/api/v1/**', async route => {
        const url = new URL(route.request().url());
        let data = [];
        if (url.pathname.endsWith('/auth/me')) data = { id: 'manager', firstName: 'Manager', lastName: 'Test', globalRole: access };
        else if (url.pathname.endsWith('/projects/demo')) data = project;
        else if (url.pathname.endsWith('/marketing/checklist')) data = marketing;
        else if (url.pathname.endsWith('/assignment-workspace')) data = url.searchParams.get('workstream') === 'MARKETING' ? marketingWorkspace : developmentWorkspace;
        else if (route.request().method() === 'POST') { saved = route.request().postDataJSON(); data = { success: true, assignedCount: 1 }; }
        await route.fulfill({ json: { success: true, data } });
      });
      await page.goto((process.env.APP_URL || 'http://localhost:3000') + '/projects/demo/setup');
      await page.getByRole('heading', { name: 'Assign Development Work', exact: true }).waitFor();
      await page.getByLabel('Core Development default assignee').selectOption('a');
      await page.getByRole('button', { name: 'Add phase member', exact: true }).click();
      await page.getByLabel('Add member to Core Development').selectOption('b');
      await page.getByRole('button', { name: 'Apply Assignments', exact: true }).click();
      assert.deepEqual(saved, { workstream: 'DEVELOPMENT', assignments: [{ phaseKey: 'Core Development', defaultAssigneeId: 'a', additionalMemberIds: ['b'], reassignActive: false }] });
      await page.getByRole('tab', { name: /Marketing/ }).click();
      await page.getByRole('heading', { name: 'Assign Marketing Work', exact: true }).waitFor();
      const output = path.resolve(__dirname, '../../scratch/ui-verification');
      fs.mkdirSync(output, { recursive: true });
      await page.screenshot({ path: path.join(output, access + '-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await page.screenshot({ path: path.join(output, access + '-mobile.png'), fullPage: true });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('Admin/Owner shared phase assignment, additional member, payload, mobile overflow and runtime checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
