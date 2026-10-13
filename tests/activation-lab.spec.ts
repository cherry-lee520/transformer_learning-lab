import { test, expect } from '../frontend/node_modules/@playwright/test';
import type { Page } from '../frontend/node_modules/@playwright/test';
const url = '/laboratory/activation';
const storageKey = 'transformer-learning-lab.progress';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
const input = (page: Page, name: string) => page.getByRole('spinbutton', { name, exact: true });
const value = (page: Page) => page.getByLabel('当前函数值', { exact: true });
const slope = (page: Page) => page.getByLabel('当前局部导数', { exact: true });
const gradient = (page: Page) => page.getByLabel('最终链式梯度', { exact: true });
const derivativePlot = (page: Page) => page.locator('.ag-derivative-module');
const lastPoint = (page: Page, layer: number) => page.locator('.ag-gradient-point[data-layer="' + layer + '"]');

test('直接访问、五个模块、真实公式与刷新', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole('heading', { level: 1, name: '看见非线性，理解梯度' })).toBeVisible();
  for (const heading of ['两次线性变换，能合并吗？', '移动一点，看见导数与切线', '梯度怎样沿复合函数传播？', '放在同一坐标里比较', '四个挑战，验证你的理解']) await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  await expect(page.locator('.katex-error, .formula-error')).toHaveCount(0);
  expect(await page.locator('.katex').count()).toBeGreaterThan(10);
  await expect(value(page)).toHaveText('0.5');
  await page.reload();
  await expect(slope(page)).toHaveText('0.25');
  await expect(page.locator('.ag-challenge-count')).toHaveText('答对 0/4');
});

test('两层仿射合并、ReLU 对照与非法草稿', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByLabel('两层仿射输出', { exact: true })).toHaveText('5');
  await input(page, '仿射 w1 · 权重').fill('-2');
  await input(page, '仿射 b1 · 偏置').fill('1');
  await input(page, '仿射 w2 · 权重').fill('3');
  await input(page, '仿射 b2 · 偏置').fill('2');
  await expect(page.getByLabel('两层仿射输出', { exact: true })).toHaveText('-7');
  await expect(page.getByLabel('等效仿射输出', { exact: true })).toHaveText('-7');
  await expect(page.getByLabel('非线性对照输出', { exact: true })).toHaveText('2');
  await expect(page.locator('[data-point="affine-current"]')).toHaveAttribute('data-value', '-7');
  await expect(page.getByLabel('当前等效仿射公式').locator('annotation')).toContainText('(-6)x+');
  await input(page, '仿射 w1 · 权重').fill('11');
  await expect(input(page, '仿射 w1 · 权重')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('等效仿射输出', { exact: true })).toHaveText('-7');
  await page.getByLabel('加入 ReLU 对照曲线', { exact: true }).uncheck();
  await expect(page.locator('[data-series="affine-relu"]')).toHaveCount(0);
  await page.getByRole('button', { name: '恢复仿射默认值', exact: true }).click();
  await expect(input(page, '仿射 w1 · 权重')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByLabel('等效仿射输出', { exact: true })).toHaveText('5');
});

test('四种函数、真实导数和切线同步；ReLU 零点没有唯一切线', async ({ page }) => {
  await page.goto(url);
  const select = page.getByLabel('切线实验激活函数', { exact: true });
  await select.selectOption('linear');
  await input(page, '切线 x · 输入').fill('2');
  await expect(value(page)).toHaveText('2'); await expect(slope(page)).toHaveText('1');
  await expect(derivativePlot(page).locator('[data-series="tangent"]')).toHaveCount(1);
  await expect(page.getByLabel('当前真实切线公式').locator('annotation')).toContainText('t(u)=2+(1)(u-(2))');
  await select.selectOption('sigmoid');
  expect(Number(await value(page).textContent())).toBeCloseTo(0.880797, 6);
  expect(Number(await slope(page).textContent())).toBeCloseTo(0.104994, 6);
  await select.selectOption('tanh');
  expect(Number(await value(page).textContent())).toBeCloseTo(0.964028, 6);
  expect(Number(await slope(page).textContent())).toBeCloseTo(0.070651, 6);
  await select.selectOption('relu');
  await input(page, '切线 x · 输入').fill('-2');
  await expect(value(page)).toHaveText('0'); await expect(slope(page)).toHaveText('0');
  await input(page, '切线 x · 输入').fill('0');
  await expect(slope(page)).toHaveText('未定义');
  await expect(page.getByRole('status', { name: '不可导提示' })).toContainText('左斜率为 0，右斜率为 1');
  await expect(derivativePlot(page).locator('[data-series="tangent"]')).toHaveCount(0);
  await page.getByLabel('切线实验曲线内容', { exact: true }).selectOption('derivative');
  await expect(derivativePlot(page).locator('[data-point="derivative-current"]')).toHaveCount(0);
  await expect(derivativePlot(page).locator('[data-point="relu-left-open"]')).toHaveAttribute('fill', 'white');
  await expect(derivativePlot(page).locator('[data-point="relu-right-open"]')).toHaveAttribute('data-value', '1');
  expect((await derivativePlot(page).locator('[data-series="activation-main"]').getAttribute('d'))!.match(/M/g)).toHaveLength(2);
  await input(page, '切线 x · 输入').fill('1');
  await expect(slope(page)).toHaveText('1');
  await expect(derivativePlot(page).locator('[data-point="derivative-current"]')).toHaveAttribute('data-value', '1');
});

test('键盘滑块、播放暂停、输入编辑暂停与减少动态效果', async ({ page }) => {
  await page.goto(url);
  const slider = page.getByRole('slider', { name: '切线 x 输入滑块', exact: true });
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect(input(page, '切线 x · 输入')).toHaveValue('0.1');
  await page.getByRole('button', { name: '播放输入变化', exact: true }).click();
  await expect.poll(() => input(page, '切线 x · 输入').inputValue()).not.toBe('0.1');
  await page.getByRole('button', { name: '暂停输入移动', exact: true }).click();
  const paused = await input(page, '切线 x · 输入').inputValue();
  await page.waitForTimeout(350);
  await expect(input(page, '切线 x · 输入')).toHaveValue(paused);
  await page.getByRole('button', { name: '播放输入变化', exact: true }).click();
  await input(page, '切线 x · 输入').fill('4');
  await expect(page.getByRole('button', { name: '播放输入变化', exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  await expect(input(page, '切线 x · 输入')).toHaveValue('4');
  await input(page, '切线 x · 输入').fill('');
  await expect(input(page, '切线 x · 输入')).toHaveAttribute('aria-invalid', 'true');
  expect(Number(await value(page).textContent())).toBeCloseTo(0.982014, 6);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: '播放输入变化', exact: true })).toBeDisabled();
});

test('层数、每层参数、梯度符号/幅度/图形及键盘查看同步', async ({ page }) => {
  await page.goto(url);
  await page.getByLabel('梯度预设实验', { exact: true }).selectOption('linear-control');
  await expect(gradient(page)).toHaveText('1');
  await page.getByLabel('链式层数', { exact: true }).selectOption('8');
  await expect(page.locator('[data-chain-layer]')).toHaveCount(8);
  await expect(page.locator('.ag-gradient-point')).toHaveCount(9);
  await page.getByLabel('链式层数', { exact: true }).selectOption('2');
  await input(page, '梯度 w1 · 权重').fill('-2');
  await input(page, '梯度 w2 · 权重').fill('3');
  await expect(gradient(page)).toHaveText('-6');
  await expect(lastPoint(page, 2)).toHaveAttribute('data-sign', 'negative');
  await expect(lastPoint(page, 2)).toHaveAttribute('data-gradient', '-6');
  await expect(lastPoint(page, 2)).toHaveAttribute('data-magnitude', '6');
  expect(Number(await lastPoint(page, 2).getAttribute('data-log'))).toBeCloseTo(Math.log10(6), 12);
  await input(page, '梯度 b2 · 偏置').fill('2');
  await expect(page.getByLabel('链式输出', { exact: true })).toHaveText('-4');
  await expect(page.locator('[data-chain-layer="2"] td').nth(4)).toHaveText('-6');
  await lastPoint(page, 2).focus(); await page.keyboard.press('Enter');
  await expect(lastPoint(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: '第 2 层计算', exact: true })).toBeVisible();
  await input(page, '梯度 w2 · 权重').fill('11');
  await expect(input(page, '梯度 w2 · 权重')).toHaveAttribute('aria-invalid', 'true');
  await expect(gradient(page)).toHaveText('-6');
  await page.getByLabel('使用对数幅度坐标', { exact: true }).uncheck();
  await expect(page.locator('.ag-gradient-svg')).toContainText('线性幅度');
});

test('饱和、权重补偿、零梯度与链式条件不足明确区分', async ({ page }) => {
  await page.goto(url);
  const preset = page.getByLabel('梯度预设实验', { exact: true });
  const tiny = Number(await lastPoint(page, 4).getAttribute('data-gradient'));
  expect(tiny).toBeGreaterThan(0); expect(tiny).toBeLessThan(1e-10);
  await expect(gradient(page)).not.toHaveText('0');
  await preset.selectOption('tanh-saturation');
  expect(Number(await gradient(page).textContent())).toBeGreaterThan(0);
  await preset.selectOption('sigmoid-balanced');
  await expect(gradient(page)).toHaveText('1');
  await preset.selectOption('relu-zero');
  await expect(gradient(page)).toHaveText('0');
  await expect(lastPoint(page, 4)).toHaveAttribute('data-sign', 'zero');
  await expect(lastPoint(page, 4)).toHaveAttribute('data-log', 'none');
  await expect(lastPoint(page, 4).locator('circle')).toHaveAttribute('cy', '316');
  await page.getByLabel('链式层数', { exact: true }).selectOption('1');
  await input(page, '梯度 b1 · 偏置').fill('-1');
  await expect(gradient(page)).toHaveText('连乘暂不可判定');
  await expect(lastPoint(page, 1)).toHaveAttribute('data-sign', 'undefined');
  await expect(page.getByRole('status', { name: '链式不可判定提示' })).toContainText('不等于证明复合函数一定不可导');
  expect(await page.locator('.ag-gradient-svg').evaluate(element => /NaN|Infinity/.test(element.outerHTML))).toBe(false);
});

test('同步比较共用坐标、可多选、函数解释与导数断点', async ({ page }) => {
  await page.goto(url);
  const plot = page.locator('.ag-comparison-module');
  await expect(plot.locator('[data-series^="compare-"]')).toHaveCount(4);
  const axes = await plot.locator('.ag-axis-label').allTextContents();
  await page.getByLabel('比较 Linear', { exact: true }).uncheck();
  expect(await plot.locator('.ag-axis-label').allTextContents()).toEqual(axes);
  await input(page, '比较 x · 同步输入').fill('2');
  expect(Number(await plot.locator('[data-point="sigmoid"]').getAttribute('data-value'))).toBeCloseTo(1 / (1 + Math.exp(-2)), 12);
  await page.getByLabel('比较曲线内容', { exact: true }).selectOption('derivative');
  await expect(plot.locator('[data-point="compare-relu-left"]')).toHaveAttribute('fill', 'white');
  await page.getByRole('button', { name: '了解 Tanh', exact: true }).click();
  await expect(plot.getByRole('heading', { name: 'Tanh 的特点', exact: true })).toBeVisible();
  await expect(plot.locator('.ag-feature-list')).toContainText('(-1, 1)');
  await expect(plot).toContainText('向量逐元素计算：[-2, 0, 2]');
  for (const name of ['ReLU', 'Sigmoid', 'Tanh']) await page.getByLabel('比较 ' + name, { exact: true }).uncheck();
  await expect(plot.getByRole('status')).toHaveText('请选择至少一个函数。');
  await expect(plot.locator('[data-series^="compare-"]')).toHaveCount(0);
});

test('四个挑战正误、重试、容限与解析；课程学习记录隔离', async ({ page }) => {
  await page.goto(url);
  const before = await page.evaluate(key => localStorage.getItem(key), storageKey);
  const one = page.locator('[data-ag-challenge="ag-predict-output"]');
  await one.getByRole('spinbutton').fill('2'); await one.getByRole('button', { name: '提交答案' }).click();
  await expect(one.getByRole('status')).toContainText('这次还不正确');
  await expect(one.getByRole('status')).toContainText('答案解析');
  await one.getByRole('button', { name: '重新作答' }).click();
  await one.getByRole('spinbutton').fill('0.0000001'); await one.getByRole('button', { name: '提交答案' }).click();
  await expect(one.getByRole('status')).toContainText('回答正确');
  const two = page.locator('[data-ag-challenge="ag-predict-derivative"]');
  await two.getByRole('spinbutton').fill('0.25'); await two.getByRole('button', { name: '提交答案' }).click();
  const three = page.locator('[data-ag-challenge="ag-saturation"]');
  await three.getByLabel('x = -8', { exact: true }).check(); await three.getByLabel('x = 8', { exact: true }).check();
  await three.getByRole('button', { name: '提交答案' }).click();
  const four = page.locator('[data-ag-challenge="ag-compare-chain"]');
  await four.getByLabel('A 组衰减更明显', { exact: true }).check(); await four.getByRole('button', { name: '提交答案' }).click();
  for (const challenge of [two, three, four]) await expect(challenge.getByRole('status')).toContainText('回答正确');
  await expect(page.locator('.ag-challenge-count')).toHaveText('答对 4/4');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(before);
  await page.reload();
  await expect(page.locator('.ag-challenge-count')).toHaveText('答对 0/4');
});

test('教材往返、完成状态、列表与旧查询兼容；T04 仍可访问', async ({ page }) => {
  await page.goto('/lessons/gradients-backprop');
  await page.getByRole('button', { name: '标记课时完成', exact: true }).click();
  await page.getByRole('link', { name: '进入激活与梯度实验室', exact: true }).click();
  await expect(page).toHaveURL(url + '?from=gradients-backprop');
  await page.reload();
  await page.getByRole('link', { name: '返回原课时', exact: true }).click();
  await expect(page).toHaveURL('/lessons/gradients-backprop');
  await expect(page.getByRole('button', { name: '撤销完成', exact: true })).toBeVisible();
  await page.goto('/laboratory');
  await page.getByRole('link', { name: '进入激活与梯度实验室', exact: true }).click();
  await expect(page).toHaveURL(url);
  await page.goto('/laboratory?experiment=activation&from=neuron-forward');
  await expect(page).toHaveURL(url + '?from=neuron-forward');
  await expect(page.getByRole('link', { name: '返回原课时', exact: true })).toHaveAttribute('href', '/lessons/neuron-forward');
  await page.goto(url + '?from=https%3A%2F%2Fexample.com');
  await expect(page.getByRole('link', { name: '返回原课时', exact: true })).toHaveAttribute('href', '/lessons/gradients-backprop');
  await page.goto('/laboratory/neuron');
  await expect(page.getByLabel('实验输出', { exact: true })).toHaveText('7');
});

test('320、390、768、1440 宽度无整体溢出；局部滚动与真实截图验收', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.getByLabel('链式层数', { exact: true }).selectOption('8');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'viewport ' + width).toBe(true);
    if (width === 320) {
      expect(await page.locator('.ag-table-scroll').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      expect(await derivativePlot(page).locator('.ag-plot').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    }
  }
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
  else if (testInfo.project.name === 'tablet') await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('.ag-derivative-module').screenshot({ path: '../docs/screenshots/t05/' + testInfo.project.name + '-derivative.png', animations: 'disabled' });
  await page.locator('.ag-chain-module').screenshot({ path: '../docs/screenshots/t05/' + testInfo.project.name + '-chain.png', animations: 'disabled' });
  await page.locator('.ag-comparison-module').screenshot({ path: '../docs/screenshots/t05/' + testInfo.project.name + '-comparison.png', animations: 'disabled' });
});
