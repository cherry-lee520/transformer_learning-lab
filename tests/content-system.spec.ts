import { test, expect } from '../frontend/node_modules/@playwright/test';
import { lessons } from '../frontend/src/lessons/index';
const storageKey = 'transformer-learning-lab.progress';

test('全部课时加载，旧链接与跨章节导航，末课边界', async ({ page }) => {
  for (const lesson of lessons) {
    await page.goto(`/lessons/${lesson.id}`);
    await expect(page.locator('article').getByRole('heading', { level: 2, name: lesson.title, exact: true })).toBeVisible();
    await expect(page.locator('a[aria-current="page"].course-item')).toHaveAttribute('href', `/lessons/${lesson.id}`);
    expect(await page.locator('a[aria-current="page"].course-item').evaluate(element => {
      const tree = element.closest('aside')!.getBoundingClientRect();
      const item = element.getBoundingClientRect();
      return item.top >= tree.top && item.bottom <= tree.bottom;
    })).toBe(true);
  }
  await expect(page.getByRole('button', { name: '已到最后一节' })).toBeDisabled();
  await page.goto('/lessons?lesson=gradients-backprop');
  await expect(page).toHaveURL(/\/lessons\/gradients-backprop$/);
  await page.getByRole('link', { name: '下一节' }).click();
  await expect(page).toHaveURL(/\/lessons\/embedding$/);
  await expect(page.getByRole('heading', { name: 'Token 与词向量：把文字变成向量', exact: true })).toBeVisible();
});

test('访问不等于完成，首页继续最近课时，重开页面记录保留', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: '继续学习', exact: true })).toHaveAttribute('href', '/lessons/start');
  await page.goto('/lessons/multi-head');
  await expect(page.locator('article .lesson-status').first()).toHaveText('学习中');
  await page.goto('/');
  await expect(page.getByRole('link', { name: '继续学习', exact: true })).toHaveAttribute('href', '/lessons/multi-head');
  await expect(page.getByRole('progressbar', { name: '学习进度' }).last()).toHaveAttribute('aria-valuenow', '0');
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByRole('link', { name: '继续学习', exact: true })).toHaveAttribute('href', '/lessons/multi-head');
  await reopened.close();
});

test('损坏数据恢复，历史无效 ID 安全过滤', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('已恢复为空白进度');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({
    schemaVersion: 1, courseVersion: 'old', recentLessonId: 'removed', records: [
      { lessonId: 'start', status: 'completed', lastVisitedAt: '2026-10-11T01:00:00.000Z', completedAt: '2026-10-11T01:00:00.000Z' },
      { lessonId: 'removed', status: 'completed', lastVisitedAt: '2026-10-11T02:00:00.000Z', completedAt: '2026-10-11T02:00:00.000Z' },
    ],
  })), storageKey);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('其余进度已保留');
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: '你已完成 1 个课时' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.length, storageKey)).toBe(1);
});

test('未知版本保留原始记录，页面提示仅临时保存', async ({ page }) => {
  await page.goto('/');
  const original = JSON.stringify({ schemaVersion: 999, records: ['future-format'] });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: original });
  await page.reload();
  await expect(page.getByRole('status')).toContainText('原记录不会被覆盖');
  await page.goto('/lessons/start');
  await page.getByRole('button', { name: '标记课时完成' }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(original);
});

test('浏览器拒绝存储时仍然可以阅读和标记', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    Storage.prototype.setItem = () => { throw new Error('denied'); };
  });
  await page.goto('/lessons/start');
  await expect(page.locator('.storage-notice')).toContainText('本次学习记录仅保留在当前页面');
  await page.getByRole('button', { name: '标记课时完成' }).click();
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
});

test('无效课时不创建学习记录，可返回目录', async ({ page }) => {
  await page.goto('/lessons/invalid-id');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: '找不到这个课时' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records, storageKey)).toEqual([]);
  await page.getByRole('link', { name: '返回课程目录' }).click();
  await expect(page.getByRole('heading', { name: '互动课程', exact: true })).toBeVisible();
});
