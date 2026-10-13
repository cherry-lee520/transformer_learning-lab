import { test, expect } from '../frontend/node_modules/@playwright/test';

const routes = [
  ['/', '你好，未来的探索者。'], ['/lessons', '互动课程'], ['/laboratory', '探索实验室'],
  ['/paper', '走进原始论文'], ['/progress', '我的学习进度'], ['/missing', '这个知识节点还不存在'],
  ['/lessons/attention', '互动课程'], ['/lessons/no-such-lesson', '找不到这个课时'],
];
test('所有路由直接访问与刷新，页面没有横向溢出或运行错误', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [url, heading] of routes) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('主导航、课程翻页、完成与撤销、刷新持久化', async ({ page }) => {
  await page.goto('/');
  const mobileMenu = page.getByRole('button', { name: '打开导航' });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '互动课程' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '互动课程' })).toBeVisible();
  await page.getByRole('link', { name: '开始第一课' }).click();
  await expect(page.locator('article .lesson-status').first()).toHaveText('学习中');
  await expect(page.getByRole('button', { name: '上一节' })).toBeDisabled();
  await page.getByRole('button', { name: '标记课时完成' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
  await page.getByRole('link', { name: '下一节' }).click();
  await expect(page.getByRole('heading', { level: 2, name: '向量与矩阵的直觉' })).toBeVisible();
  await page.getByRole('link', { name: '下一节' }).click();
  await expect(page.getByRole('heading', { level: 2, name: '神经元是什么？从一个数学公式开始' })).toBeVisible();
  await page.getByRole('button', { name: '标记课时完成' }).click();
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '我的学习进度' }).click();
  await expect(page.getByRole('heading', { name: '你已完成 2 个课时' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '数学与神经网络完成率' })).toHaveAttribute('aria-valuenow', '40');
  await page.goto('/lessons/neuron-forward');
  await page.getByRole('button', { name: '撤销完成' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '标记课时完成' })).toBeVisible();
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: '你已完成 1 个课时' })).toBeVisible();
});
test('实验预览、论文链接和 404 返回', async ({ page }) => {
  await page.goto('/laboratory');
  await page.getByRole('link', { name: '进入实验预览' }).first().click();
  await expect(page.getByText('实验交互将在后续任务中开放')).toBeVisible();
  await page.getByRole('link', { name: '关闭实验预览' }).click();
  await expect(page.getByText('实验交互将在后续任务中开放')).toHaveCount(0);
  await page.goto('/paper');
  await expect(page.getByRole('link', { name: '查看 arXiv 原文' })).toHaveAttribute('href', 'https://arxiv.org/abs/1706.03762');
  await page.goto('/unknown');
  await page.getByRole('link', { name: '返回学习概览' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '你好，未来的探索者。' })).toBeVisible();
});
test('移动导航支持 Escape 关闭并恢复焦点', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('button', { name: '打开导航' });
  if (!await menu.isVisible()) return;
  await menu.click();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
});
