import { test, expect } from '../frontend/node_modules/@playwright/test';
import { neuronLesson } from '../frontend/src/lessons/contents/neuron';
const url = '/lessons/neuron-forward';
const key = 'transformer-learning-lab.progress';

test('完整示范教材、公式排版、键盘符号解释与章节目录', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await expect(page.locator('article h2')).toHaveText('神经元是什么？从一个数学公式开始');
  await expect(page.locator('.math-display .katex').first()).toBeVisible();
  expect(await page.locator('.katex').count()).toBeGreaterThan(10);
  await expect(page.locator('.formula-error, .katex-error')).toHaveCount(0);
  await expect(page.locator('img[src="/images/neuron-flow.svg"]')).toBeVisible();
  expect(await page.locator('img[src="/images/neuron-flow.svg"]').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const weight = page.getByRole('button', { name: '解释 w：权重' });
  await weight.focus();
  await expect(weight).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.symbol-note')).toContainText('控制输入对输出的影响程度');
  await page.keyboard.press('Escape');
  await expect(page.locator('.symbol-note')).toHaveCount(0);
  await page.getByRole('complementary', { name: '本节目录' }).getByRole('link', { name: '07 / 输入多了，会发生什么' }).click();
  await expect(page).toHaveURL(/#neuron-forward--neuron-multi-heading$/);
  expect(errors).toEqual([]);
});

test('滑块、数字输入、非法值与恢复默认值同步计算', async ({ page }) => {
  await page.goto(url);
  const output = page.getByLabel('神经元输出');
  const x = page.getByRole('spinbutton', { name: 'x · 输入值', exact: true });
  await expect(output).toHaveText('7');
  await x.fill('4');
  await expect(output).toHaveText('13');
  await page.getByRole('spinbutton', { name: 'w · 权重', exact: true }).fill('-2');
  await expect(output).toHaveText('-7');
  await page.getByRole('spinbutton', { name: 'b · 偏置', exact: true }).fill('-1');
  await expect(output).toHaveText('-9');
  for (const bad of ['11', '', '1e309']) {
    await x.fill(bad);
    await expect(x).toHaveAttribute('aria-invalid', 'true');
    await expect(output).toHaveText('-9');
  }
  await page.getByRole('button', { name: '恢复默认值' }).click();
  await expect(output).toHaveText('7');
  await expect(x).toHaveValue('2');
  const slider = page.getByRole('slider', { name: 'x 输入值滑块' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(x).toHaveValue('2.1');
  await expect(output).toHaveText('7.3');
  await expect(page.locator('.neuron-result')).toContainText('再加偏置：6.3 + (1) = 7.3');
});

test('三种测验有正确和错误反馈、解析、重做；答题不自动完成课时', async ({ page }) => {
  await page.goto(url);
  const concept = page.locator('.quiz-card').nth(0);
  await concept.getByRole('button', { name: '提交答案' }).click();
  await expect(concept.getByRole('alert')).toHaveText('请先选择答案。');
  await concept.getByLabel('让输出永远等于一个固定数', { exact: true }).check();
  await concept.getByRole('button', { name: '提交答案' }).click();
  await expect(concept.getByRole('status')).toContainText('这次还不正确');
  await expect(concept.getByRole('status')).toContainText('答案解析');
  await expect(page.locator('article .lesson-meta .lesson-status')).toHaveText('学习中');
  await expect(page.getByRole('button', { name: '标记课时完成' })).toBeVisible();
  await concept.getByRole('button', { name: '重新作答' }).click();
  await concept.getByLabel('控制输入变化对线性结果的影响', { exact: true }).check();
  await concept.getByRole('button', { name: '提交答案' }).click();
  await expect(concept.getByRole('status')).toContainText('回答正确');
  const number = page.locator('.quiz-card').nth(1);
  await number.getByRole('spinbutton').fill('5.0000005');
  await number.getByRole('button', { name: '提交答案' }).click();
  await expect(number.getByRole('status')).toContainText('回答正确');
  const application = page.locator('.quiz-card').nth(2);
  await application.getByRole('checkbox').nth(0).check();
  await application.getByRole('checkbox').nth(1).check();
  await application.getByRole('button', { name: '提交答案' }).click();
  await expect(application.getByRole('status')).toContainText('回答正确');
  await expect(page.locator('.quiz-session-note')).toContainText('已提交 3/3 题');
  await page.getByRole('link', { name: '下一节', exact: true }).click();
  await page.getByRole('link', { name: '上一节', exact: true }).click();
  await expect(page.locator('.quiz-session-note')).toContainText('已提交 3/3 题');
  await page.reload();
  await expect(page.locator('.quiz-session-note')).toContainText('已提交 0/3 题');
  await expect(page.locator('article .lesson-meta .lesson-status')).toHaveText('学习中');
});

test('Python/C 高亮、键盘切换并实际复制所选代码', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(url);
  const code = page.locator('.code-viewer');
  await expect(code.getByRole('tab', { name: 'Python', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(code.locator('.token.keyword').first()).toBeVisible();
  const examples = neuronLesson.blocks.find(block => block.type === 'code')!;
  if (examples.type !== 'code') throw new Error('示范代码不存在');
  for (const language of ['python', 'c'] as const) {
    await code.getByRole('tab', { name: language === 'python' ? 'Python' : 'C', exact: true }).click();
    await code.getByRole('button', { name: '复制代码', exact: true }).click();
    await expect(code.getByRole('status')).toHaveText('已复制');
    // Windows clipboard text uses CRLF; compare the actual code after newline normalization.
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(examples.examples.find(item => item.language === language)!.code);
  }
  await code.getByRole('tab', { name: 'C', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(code.getByRole('tab', { name: 'Python', exact: true })).toBeFocused();
  await expect(code.getByRole('tabpanel')).toContainText('print(y)');
});

test('剪贴板不可用时提供手动复制和明确反馈', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } }, configurable: true }));
  await page.goto(url);
  await page.getByRole('button', { name: '复制代码' }).click();
  await expect(page.locator('.copy-feedback')).toContainText('无法自动复制');
  await expect(page.getByRole('textbox', { name: '手动复制代码' })).toHaveValue(/y = w \* x \+ b/);
});

test('T02 历史完成记录兼容，刷新保留，撤销仍有效', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, courseVersion: '2026.10.t02', records: [{ lessonId: 'neuron-forward', status: 'completed', lastVisitedAt: '2026-10-10T01:00:00.000Z', completedAt: '2026-10-10T01:05:00.000Z', courseVersion: '2026.10.t02' }], recentLessonId: 'neuron-forward' })), key);
  await page.goto(url);
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.find((item: { lessonId: string }) => item.lessonId === 'neuron-forward').completedAt, key)).toBe('2026-10-10T01:05:00.000Z');
  await page.getByRole('button', { name: '撤销完成' }).click();
  await page.getByRole('button', { name: '标记课时完成' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '撤销完成' })).toBeVisible();
});

test('教材在各设备及 320px 窄屏没有页面横向溢出，保留局部滚动', async ({ page }, testInfo) => {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const demo = page.locator('.interactive-card');
  await demo.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `../docs/screenshots/t03/${testInfo.project.name}-neuron-demo.png`, animations: 'disabled' });
  await page.locator('.code-viewer').screenshot({ path: `../docs/screenshots/t03/${testInfo.project.name}-code.png`, animations: 'disabled' });
  await page.locator('.quiz-card').first().screenshot({ path: `../docs/screenshots/t03/${testInfo.project.name}-quiz.png`, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.code-scroll').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await expect(page.getByRole('slider', { name: 'x 输入值滑块' })).toHaveCount(1);
  await page.getByRole('tab', { name: 'C', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
