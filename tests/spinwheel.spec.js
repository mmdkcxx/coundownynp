import { test, expect } from '@playwright/test';

const SK = 'ynp_spinwheel_v1';
const GROUPS = ['Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4'];
const SPIN_TIMEOUT = 6000; // 3800ms animation + buffer

/** Inject participants into localStorage then reload */
async function seed(page, participants, done = []) {
  const confirmedIdx = new Set(done.map(d => d.pidx));
  const queue = participants.map((_, i) => i).filter(i => !confirmedIdx.has(i));
  await page.evaluate(({ sk, payload }) => localStorage.setItem(sk, JSON.stringify(payload)), {
    sk: SK,
    payload: {
      groups: GROUPS,
      participants,
      session: { queue, currentIdx: queue[0] ?? null, done },
    },
  });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/spinwheel.html');
  await page.evaluate(sk => localStorage.removeItem(sk), SK);
  await page.reload();
});

// ═══ EMPTY STATE ═════════════════════════════════════════════

test('empty: nameTxt shows no-participants message', async ({ page }) => {
  await expect(page.locator('#nameTxt')).toHaveText('Belum ada peserta di-input');
});

test('empty: spin button is disabled', async ({ page }) => {
  await expect(page.locator('#spinBtn')).toBeDisabled();
});

test('empty: queue panel shows empty message', async ({ page }) => {
  await expect(page.locator('#queueList')).toContainText('Antrian kosong');
});

// ═══ WITH PARTICIPANTS ════════════════════════════════════════

test('participants: spin button enabled when queue has members', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }, { name: 'Bob', group: 1 }]);
  await expect(page.locator('#spinBtn')).toBeEnabled();
});

test('participants: queue list shows all pending names', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }, { name: 'Bob', group: 1 }]);
  await expect(page.locator('#queueList')).toContainText('Alice');
  await expect(page.locator('#queueList')).toContainText('Bob');
});

test('participants: progress bar hidden before any confirm', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await expect(page.locator('#progWrap')).toBeHidden();
});

// ═══ SPIN FLOW ════════════════════════════════════════════════

test('spin: result area appears after spin completes', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
});

test('spin: result badge shows the pre-assigned group', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  await expect(page.locator('#resultBadge')).toContainText('Kelompok 1');
});

test('spin: nameTxt shows selected participant name', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }, { name: 'Bob', group: 1 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  const name = (await page.locator('#nameTxt').textContent())?.trim();
  expect(['Alice', 'Bob']).toContain(name);
});

test('spin: spin button disabled while spinning', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  // immediately after click, button should be disabled
  await expect(page.locator('#spinBtn')).toBeDisabled();
});

// ═══ CONFIRM FLOW ════════════════════════════════════════════

test('confirm: selected participant removed from queue', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }, { name: 'Bob', group: 1 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  const selected = (await page.locator('#nameTxt').textContent())?.trim();
  await page.click('#confirmBtn');
  const queueText = await page.locator('#queueList').textContent();
  expect(queueText).not.toContain(selected);
});

test('confirm: participant appears in done list', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  await page.click('#confirmBtn');
  await expect(page.locator('#doneList')).toContainText('Alice');
});

test('confirm: progress bar visible after first confirm', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  await page.click('#confirmBtn');
  await expect(page.locator('#progWrap')).toBeVisible();
});

test('confirm: result area hides after confirm', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  await page.click('#confirmBtn');
  await expect(page.locator('#resultArea')).toHaveClass(/hidden/);
});

// ═══ ALL DONE ════════════════════════════════════════════════

test('all-done: banner shown when all participants confirmed', async ({ page }) => {
  await seed(
    page,
    [{ name: 'Alice', group: 0 }],
    [{ pidx: 0, cGroup: 0 }]
  );
  await expect(page.locator('#allDone')).not.toHaveClass(/hidden/);
});

test('all-done: spin button disabled when all confirmed', async ({ page }) => {
  await seed(
    page,
    [{ name: 'Alice', group: 0 }],
    [{ pidx: 0, cGroup: 0 }]
  );
  await expect(page.locator('#spinBtn')).toBeDisabled();
});

// ═══ RETRY ═══════════════════════════════════════════════════

test('retry: result area stays visible after retry', async ({ page }) => {
  await seed(page, [
    { name: 'Alice', group: 0 },
    { name: 'Bob', group: 1 },
    { name: 'Charlie', group: 2 },
  ]);
  await page.click('#spinBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
  await page.click('#retryBtn');
  await expect(page.locator('#resultArea')).not.toHaveClass(/hidden/, { timeout: SPIN_TIMEOUT });
});

// ═══ GROUPS PANEL ════════════════════════════════════════════

test('groups panel: confirmed participant appears in correct group', async ({ page }) => {
  await seed(
    page,
    [{ name: 'Alice', group: 0 }],
    [{ pidx: 0, cGroup: 0 }]
  );
  const group0Card = page.locator('.gc-0');
  await expect(group0Card).toContainText('Alice');
});

test('groups panel: empty group shows placeholder', async ({ page }) => {
  await seed(page, [{ name: 'Alice', group: 0 }]);
  const group1Card = page.locator('.gc-1');
  await expect(group1Card).toContainText('kosong');
});

// ═══ ADMIN PANEL ════════════════════════════════════════════

test('admin: wrong password shows error, content hidden', async ({ page }) => {
  await page.evaluate(() => openAdmin());
  await expect(page.locator('#adminAuth')).toBeVisible();
  await page.fill('#authInp', 'wrongpass');
  await page.click('#authSubmit');
  await expect(page.locator('#adminContent')).toBeHidden();
  await expect(page.locator('#authErr')).not.toBeEmpty();
});

test('admin: correct password reveals admin content', async ({ page }) => {
  await page.evaluate(() => openAdmin());
  await page.fill('#authInp', 'ynp2026');
  await page.click('#authSubmit');
  await expect(page.locator('#adminContent')).toBeVisible();
});

test('admin: add participant updates queue list', async ({ page }) => {
  await page.evaluate(() => openAdmin());
  await page.fill('#authInp', 'ynp2026');
  await page.click('#authSubmit');
  await page.fill('#addName', 'TestPeserta');
  await page.selectOption('#addGroup', '0');
  await page.click('#addParticipant');
  await page.click('#adminClose');
  await expect(page.locator('#queueList')).toContainText('TestPeserta');
  await expect(page.locator('#spinBtn')).toBeEnabled();
});

test('admin: import CSV adds multiple participants', async ({ page }) => {
  await page.evaluate(() => openAdmin());
  await page.fill('#authInp', 'ynp2026');
  await page.click('#authSubmit');
  await page.fill('#importTa', 'Peserta A,0\nPeserta B,1\nPeserta C,2');
  await page.click('#importBtn');
  await page.click('#adminClose');
  await expect(page.locator('#queueList')).toContainText('Peserta A');
  await expect(page.locator('#queueList')).toContainText('Peserta B');
  await expect(page.locator('#queueList')).toContainText('Peserta C');
});

test('admin: reset session restores all confirmed back to queue', async ({ page }) => {
  await seed(
    page,
    [{ name: 'Alice', group: 0 }, { name: 'Bob', group: 1 }],
    [{ pidx: 0, cGroup: 0 }]
  );
  // Alice confirmed, Bob in queue
  await expect(page.locator('#doneList')).toContainText('Alice');
  // open admin and reset
  await page.evaluate(() => openAdmin());
  await page.fill('#authInp', 'ynp2026');
  await page.click('#authSubmit');
  page.once('dialog', d => d.accept());
  await page.click('#resetSession');
  await expect(page.locator('#queueList')).toContainText('Alice');
  await expect(page.locator('#queueList')).toContainText('Bob');
});
