import { test, expect } from '../frontend/node_modules/@playwright/test';
import type { Page } from '../frontend/node_modules/@playwright/test';
const url = '/laboratory/neural-network';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
const steps = (page: Page) => page.getByLabel('训练更新次数', { exact: true });
const loss = (page: Page) => page.getByLabel('当前训练损失', { exact: true });
const status = (page: Page) => page.getByRole('status', { name: '训练状态', exact: true });
const forward = (page: Page) => page.getByRole('status', { name: '前向层状态', exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const select = (page: Page, name: string) => page.getByLabel(name, { exact: true });
const boundary = (page: Page) => page.locator('.nn-boundary svg');

test('直接访问、真实初始化、公式、曲线、边界与刷新', async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole('heading', { name: '让一个小网络，真正学会 XOR', exact: true })).toBeVisible();
  for (const name of ['训练控制台', '搭建你的网络', '看见每一条真实连接', '按层观察前向传播', '反向传播与参数检查', 'Loss 曲线', '二维决策边界', 'XOR 的当前预测', '用数值梯度核对反向传播']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(steps(page)).toHaveText('0');
  expect(Number(await loss(page).textContent())).toBeCloseTo(0.901818712, 6);
  await expect(page.locator('.nn-edge')).toHaveCount(12);
  await expect(page.locator('.nn-node')).toHaveCount(7);
  for (const sign of ['positive', 'negative']) {
    const hit = page.locator('.nn-edge.' + sign + ' .nn-edge-hit').first();
    expect(await hit.evaluate(element => getComputedStyle(element).stroke)).toBe('rgba(0, 0, 0, 0)');
  }
  await expect(page.locator('.katex-error, .formula-error')).toHaveCount(0);
  expect(await page.locator('.katex').count()).toBeGreaterThan(6);
  await expect(boundary(page)).toHaveAttribute('data-grid-size', '25');
  await expect(boundary(page).locator('rect[data-probability]')).toHaveCount(625);
  await expect(page.locator('.nn-loss-curve svg')).toHaveAttribute('data-history-count', '1');
  await button(page, '单步训练').click();
  await expect(steps(page)).toHaveText('1');
  await page.reload();
  await expect(steps(page)).toHaveText('0');
  expect(Number(await loss(page).textContent())).toBeCloseTo(0.901818712, 6);
});

test('结构编辑、所有连接、激活切换、固定种子与非法草稿', async ({ page }) => {
  await page.goto(url);
  const original = await page.locator('.nn-edge').first().getAttribute('data-weight');
  await select(page, '隐藏层数量').selectOption('2');
  await select(page, '隐藏层 1 神经元数量').selectOption('3');
  await select(page, '隐藏层 2 神经元数量').selectOption('2');
  await expect(page.locator('.nn-node')).toHaveCount(8);
  await expect(page.locator('.nn-edge')).toHaveCount(14);
  for (const type of ['linear', 'relu', 'sigmoid', 'tanh']) {
    await select(page, '隐藏层激活函数').selectOption(type);
    await expect(page.locator('.nn-layer-label')).toHaveCount(4);
    await expect(status(page)).toHaveAttribute('data-status', 'idle');
  }
  const seed = page.getByRole('spinbutton', { name: '网络随机种子', exact: true });
  await seed.fill('123');
  await expect(seed).toBeFocused();
  const seeded = await page.locator('.nn-edge').first().getAttribute('data-weight');
  await button(page, '单步训练').click();
  await button(page, '重新初始化参数').click();
  await expect(page.locator('.nn-edge').first()).toHaveAttribute('data-weight', seeded!);
  await seed.fill('-1');
  await expect(seed).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.nn-edge').first()).toHaveAttribute('data-weight', seeded!);
  await button(page, '恢复默认 XOR 预设').click();
  await expect(seed).toHaveValue('42');
  await expect(seed).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('.nn-edge').first()).toHaveAttribute('data-weight', original!);
});

test('按层前向、矩阵维度、图形数据与键盘检查连接', async ({ page }) => {
  await page.goto(url);
  await expect(forward(page)).toHaveAttribute('data-layer', '0');
  await button(page, '执行下一层').click();
  await expect(forward(page)).toHaveAttribute('data-layer', '1');
  await expect(page.locator('.nn-shape-equation')).toHaveText('(4 × 2) · (2 × 1) + (4 × 1) → (4 × 1)');
  await expect(page.locator('.nn-forward')).toContainText('W[1] 权重');
  await expect(page.locator('.nn-forward .katex').first()).toBeVisible();
  await button(page, '完整前向传播').click();
  await expect(forward(page)).toHaveAttribute('data-layer', '2');
  await button(page, '上一层').click();
  await expect(forward(page)).toHaveAttribute('data-layer', '1');
  await select(page, '当前前向样本').selectOption('1');
  await expect(page.locator('[data-node="0-1"]')).toHaveAttribute('data-activation', '1');
  const edge = button(page, '连接 第 1 层 W[1,1]');
  await edge.focus(); await page.keyboard.press('Enter');
  expect(Number(await page.getByLabel('选中连接权重', { exact: true }).textContent())).toBeCloseTo(Number(await edge.getAttribute('data-weight')), 6);
  expect(Number(await page.getByLabel('选中连接梯度', { exact: true }).textContent())).toBeCloseTo(Number(await edge.getAttribute('data-gradient')), 6);
  await button(page, '第 1 层神经元 1').focus(); await page.keyboard.press('Space');
  await expect(page.locator('.nn-selection')).toContainText('输入列向量');
  await button(page, '单步训练').click();
  await expect(forward(page)).toHaveAttribute('data-layer', '0');
});

test('真实 SGD、快照固定、参数更新、MSE/BCE 与数值梯度检查', async ({ page }) => {
  await page.goto(url);
  const initial = Number(await loss(page).textContent());
  await button(page, '单步训练').click();
  await expect(steps(page)).toHaveText('1');
  await expect(page.getByLabel('训练 Epoch', { exact: true })).toHaveText('1');
  expect(Number(await loss(page).textContent())).toBeLessThan(initial);
  await page.getByText('展开前向缓存与参数更新矩阵', { exact: true }).click();
  for (const name of ['W 更新前', 'W 更新后', 'ΔW = -η dL/dW']) await expect(page.locator('.nn-backprop')).toContainText(name);
  await select(page, '检查训练快照').selectOption('1');
  const before = await page.locator('.nn-backprop .nn-tensor').allTextContents();
  await button(page, '单步训练').click();
  await expect(steps(page)).toHaveText('2');
  await expect(page.getByRole('status', { name: '当前检查对象', exact: true })).toHaveAttribute('data-snapshot-step', '1');
  expect(await page.locator('.nn-backprop .nn-tensor').allTextContents()).toEqual(before);
  await select(page, '检查训练快照').selectOption('latest');
  await select(page, '梯度检查层').selectOption('1');
  await expect(page.locator('.nn-backprop')).toContainText('delta[2]');
  await button(page, '运行数值梯度检查').click();
  await expect(page.getByRole('status', { name: '数值梯度检查结果', exact: true })).toHaveAttribute('data-passed', 'true');
  await expect(page.getByRole('status', { name: '数值梯度检查结果', exact: true })).toContainText('17 个参数');
  await select(page, '训练损失函数').selectOption('mse');
  await select(page, '输出层激活函数').selectOption('linear');
  await button(page, '单步训练').click();
  await expect(steps(page)).toHaveText('1');
  await expect(page.getByLabel('XOR 分类正确数', { exact: true })).toHaveText('当前输出不是概率');
  await expect(page.locator('.nn-boundary')).toContainText('当前网络不适用');
  await button(page, '运行数值梯度检查').click();
  await expect(page.getByRole('status', { name: '数值梯度检查结果', exact: true })).toHaveAttribute('data-passed', 'true');
  await select(page, '训练损失函数').selectOption('bce');
  await expect(select(page, '输出层激活函数')).toHaveValue('sigmoid');
  await expect(steps(page)).toHaveText('0');
});

test('连续训练、暂停继续停止、设置修改与卸载清理', async ({ page }) => {
  await page.goto(url);
  await button(page, '连续训练').click();
  await expect.poll(async () => Number(await steps(page).textContent())).toBeGreaterThan(0);
  await button(page, '暂停训练').click();
  await expect(status(page)).toHaveAttribute('data-status', 'paused');
  const paused = await steps(page).textContent();
  await page.waitForTimeout(350);
  await expect(steps(page)).toHaveText(paused!);
  await button(page, '继续训练').click();
  await expect.poll(async () => Number(await steps(page).textContent())).toBeGreaterThan(Number(paused));
  await button(page, '停止训练').click();
  await expect(status(page)).toHaveAttribute('data-status', 'stopped');
  const stopped = await steps(page).textContent();
  await page.waitForTimeout(350);
  await expect(steps(page)).toHaveText(stopped!);
  const rate = page.getByRole('spinbutton', { name: '训练 η · 学习率', exact: true });
  await rate.fill('0.25');
  await select(page, '训练批量大小').selectOption('2');
  await expect(steps(page)).toHaveText(stopped!);
  await button(page, '单步训练').click();
  await expect(steps(page)).toHaveText(String(Number(stopped) + 1));
  await button(page, '继续训练').click();
  await rate.fill('0');
  await expect(rate).toHaveAttribute('aria-invalid', 'true');
  await expect(status(page)).toHaveAttribute('data-status', 'paused');
  const invalid = await steps(page).textContent();
  await page.waitForTimeout(350);
  await expect(steps(page)).toHaveText(invalid!);
  await select(page, '隐藏层数量').selectOption('2');
  await expect(steps(page)).toHaveText('0');
  await expect(rate).toHaveValue('0.25');
  await button(page, '连续训练').click();
  await page.getByRole('link', { name: '返回实验列表', exact: true }).click();
  await expect(page).toHaveURL('/laboratory');
  await page.getByRole('link', { name: '进入神经网络训练实验室', exact: true }).click();
  await page.waitForTimeout(350);
  await expect(steps(page)).toHaveText('0');
  await expect(status(page)).toHaveAttribute('data-status', 'idle');
});

test('损失历史来自更新、查看与清空保留当前模型、批量 Epoch', async ({ page }) => {
  await page.goto(url);
  await select(page, '训练批量大小').selectOption('2');
  await button(page, '单步训练').click();
  await expect(page.getByLabel('训练 Epoch', { exact: true })).toHaveText('0');
  await button(page, '单步训练').click();
  await expect(page.getByLabel('训练 Epoch', { exact: true })).toHaveText('1');
  await expect(page.locator('.nn-loss-curve svg')).toHaveAttribute('data-history-count', '3');
  const slider = page.getByRole('slider', { name: '查看损失历史点', exact: true });
  await slider.focus(); await page.keyboard.press('Home');
  await expect(page.getByLabel('所选损失记录', { exact: true })).toContainText('Step 0');
  expect(Number(await page.locator('[data-selected-loss]').getAttribute('data-selected-loss'))).toBeCloseTo(0.901818712, 9);
  await page.keyboard.press('End');
  await expect(page.getByLabel('所选损失记录', { exact: true })).toContainText('Step 2');
  const current = await loss(page).textContent();
  await button(page, '清空损失曲线').click();
  await expect(page.locator('.nn-loss-curve svg')).toHaveAttribute('data-history-count', '1');
  await expect(steps(page)).toHaveText('2');
  await expect(loss(page)).toHaveText(current!);
  await expect(page.getByRole('status', { name: '当前检查对象', exact: true })).toHaveAttribute('data-snapshot-step', '2');
});

test('发散配置真实中止、保留有限模型并可恢复默认预设', async ({ page }) => {
  await page.goto(url);
  await select(page, '隐藏层数量').selectOption('2');
  for (const i of [1, 2]) await select(page, '隐藏层 ' + i + ' 神经元数量').selectOption('8');
  await select(page, '隐藏层激活函数').selectOption('linear');
  await select(page, '训练损失函数').selectOption('mse');
  await select(page, '输出层激活函数').selectOption('linear');
  await page.getByRole('spinbutton', { name: '训练 η · 学习率', exact: true }).fill('2');
  for (let i = 1; i <= 3; i++) {
    await button(page, '单步训练').click();
    await expect(steps(page)).toHaveText(String(i));
  }
  const validLoss = await loss(page).textContent();
  await button(page, '继续训练').click();
  await expect(status(page)).toHaveAttribute('data-status', 'error');
  await expect(page.getByRole('status', { name: '训练操作反馈', exact: true })).toContainText('数值溢出');
  await expect(steps(page)).toHaveText('3');
  await expect(loss(page)).toHaveText(validLoss!);
  await page.waitForTimeout(350);
  await expect(steps(page)).toHaveText('3');
  await button(page, '恢复默认 XOR 预设').click();
  await expect(status(page)).toHaveAttribute('data-status', 'idle');
  await expect(steps(page)).toHaveText('0');
});

test('默认预设真实训练 2000 步收敛 XOR，边界与记录同步', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.goto(url);
  await button(page, '连续训练').click();
  await expect(status(page)).toHaveAttribute('data-status', 'finished', { timeout: 75000 });
  await expect(steps(page)).toHaveText('2000');
  await expect(page.getByLabel('XOR 分类正确数', { exact: true })).toHaveText('4/4 正确');
  expect(Number(await loss(page).textContent())).toBeCloseTo(0.001360731, 6);
  const probabilities = await page.locator('[data-xor-sample]').evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-probability'))));
  const expected = [0.0007512941876291948, 0.9984963615069318, 0.9986168139321204, 0.0018008109545269327];
  probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 10));
  await expect(page.locator('[data-xor-sample][data-correct="true"]')).toHaveCount(4);
  await expect(boundary(page)).toHaveAttribute('data-model-step', '2000');
  await expect(page.locator('.nn-loss-curve svg')).toHaveAttribute('data-history-count', '300');
  await expect(page.locator('.nn-loss-curve svg')).toHaveAttribute('data-last-step', '2000');
  await expect(select(page, '检查训练快照').locator('option')).toHaveCount(13);
  await expect(button(page, '连续训练')).toBeDisabled();
  await page.locator('.nn-bottom-grid').screenshot({ path: '../docs/screenshots/t06/' + testInfo.project.name + '-trained-plots.png', animations: 'disabled' });
});

test('教材往返和学习记录保持、反向传播入口、旧查询与旧实验', async ({ page }) => {
  await page.goto('/lessons/loss-training');
  await expect(page.locator('article h2')).toHaveText('损失函数与模型训练');
  await expect(page.getByRole('heading', { name: '多层感知机：把神经元连起来', exact: true })).toBeVisible();
  await expect(page.locator('.katex-error, .formula-error')).toHaveCount(0);
  await button(page, '标记课时完成').click();
  await page.getByRole('link', { name: '进入神经网络训练实验室', exact: true }).click();
  await expect(page).toHaveURL(url + '?from=loss-training');
  await button(page, '单步训练').click();
  await page.reload();
  await page.getByRole('link', { name: '返回原课时', exact: true }).click();
  await expect(button(page, '撤销完成')).toBeVisible();
  await page.goto('/lessons/gradients-backprop');
  await page.locator('a[href="/laboratory/neural-network?from=gradients-backprop"]').click();
  await expect(page).toHaveURL(url + '?from=gradients-backprop');
  await page.getByRole('link', { name: '返回原课时', exact: true }).click();
  await expect(page).toHaveURL('/lessons/gradients-backprop');
  await expect(page.getByRole('link', { name: '进入激活与梯度实验室', exact: true })).toBeVisible();
  await page.goto('/laboratory?experiment=neural-network&from=loss-training');
  await expect(page).toHaveURL(url + '?from=loss-training');
  await page.goto(url + '?from=https%3A%2F%2Fexample.com');
  await expect(page.getByRole('link', { name: '返回原课时', exact: true })).toHaveAttribute('href', '/lessons/loss-training');
  await page.goto('/laboratory/neuron');
  await expect(page.getByLabel('实验输出', { exact: true })).toHaveText('7');
  await page.goto('/laboratory/activation');
  await expect(page.getByLabel('当前函数值', { exact: true })).toHaveText('0.5');
});

test('320、390、768、1440 布局、局部矩阵滚动与截图', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await select(page, '隐藏层数量').selectOption('2');
  for (const i of [1, 2]) await select(page, '隐藏层 ' + i + ' 神经元数量').selectOption('8');
  await expect(page.locator('.nn-edge')).toHaveCount(88);
  await expect(page.locator('.nn-node')).toHaveCount(19);
  await button(page, '执行下一层').click();
  await button(page, '执行下一层').click();
  await button(page, '单步训练').click();
  await select(page, '梯度检查层').selectOption('1');
  await page.getByText('展开前向缓存与参数更新矩阵', { exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'viewport ' + width).toBe(true);
    if (width === 320) {
      expect(await page.locator('.nn-graph-scroll').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
      expect(await page.locator('.nn-backprop .math-display').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth))).toBe(true);
    }
  }
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 390, height: 844 });
  else if (testInfo.project.name === 'tablet') await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('.nn-network').screenshot({ path: '../docs/screenshots/t06/' + testInfo.project.name + '-network.png', animations: 'disabled' });
  await page.locator('.nn-backprop').screenshot({ path: '../docs/screenshots/t06/' + testInfo.project.name + '-backprop.png', animations: 'disabled' });
  await page.locator('.nn-bottom-grid').screenshot({ path: '../docs/screenshots/t06/' + testInfo.project.name + '-plots.png', animations: 'disabled' });
});
