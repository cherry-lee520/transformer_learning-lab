import { test, expect } from '../frontend/node_modules/@playwright/test';

test('页面视觉验收截图', async ({ page }, testInfo) => {
  for (const [name, route] of [['dashboard', '/'], ['lessons', '/lessons/attention'], ['progress', '/progress']]) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot({ path: `../docs/screenshots/t03/${testInfo.project.name}-regression-${name}.png`, fullPage: true, animations: 'disabled' });
  }
});
