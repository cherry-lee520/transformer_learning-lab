import { test, expect } from '../frontend/node_modules/@playwright/test';
import type { Page } from '../frontend/node_modules/@playwright/test';
const route = '/laboratory/language-representation';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });
async function tab(page: Page, name: string) { await page.getByRole('tab', { name: new RegExp(name + '$') }).click(); }
const matrixCell = (page: Page, table: string, row = 0, column = 0) => page.getByRole('table', { name: table, exact: true }).locator('[data-row="' + row + '"][data-column="' + column + '"]');

test('列表、正式路由、旧查询与刷新，来源参数不支持外部跳转', async ({ page }) => {
  await page.goto('/laboratory');
  await page.getByRole('link', { name: '进入语言表示实验室' }).click();
  await expect(page).toHaveURL(new RegExp(route + '$'));
  await expect(page.getByRole('heading', { level: 1, name: 'Token、Embedding 与位置编码' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(7);
  await page.reload(); await expect(page.getByTestId('token-count')).toHaveText('Token 数量：3');
  await page.goto('/laboratory?experiment=language-representation&from=position-encoding');
  await expect(page).toHaveURL(/language-representation\?from=position-encoding$/);
  await expect(page.getByRole('link', { name: '返回原课时' })).toHaveAttribute('href', '/lessons/position-encoding');
  await page.goto(route + '?from=https://example.com');
  await expect(page.getByRole('link', { name: '返回原课时' })).toHaveAttribute('href', '/lessons/embedding');
});

test('英文中文分词、Unicode 来源对应、子词规则与空输入', async ({ page }) => {
  await page.goto(route);
  await page.getByLabel('输入短句', { exact: true }).fill('I  love learning!');
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：3');
  await expect(page.locator('.lr-tokens button').last()).toContainText('learning!');
  await page.getByLabel('分词方式', { exact: true }).selectOption('subword');
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：4');
  await page.locator('.lr-tokens button').nth(2).focus();
  expect((await page.locator('.lr-source-active').allTextContents()).join('')).toBe('learning');
  await page.getByRole('button', { name: '中文短句', exact: true }).click();
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：6');
  await page.getByLabel('分词方式', { exact: true }).selectOption('whitespace');
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：1');
  await page.getByLabel('输入短句', { exact: true }).fill('𠮷 e\u0301 👍🏽 👨‍👩‍👧‍👦');
  await page.getByLabel('分词方式', { exact: true }).selectOption('character');
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：4');
  await expect(page.locator('.lr-tokens button').last()).toContainText('👨‍👩‍👧‍👦');
  await page.getByLabel('输入短句', { exact: true }).fill('');
  await expect(page.getByTestId('token-count')).toHaveText('Token 数量：0');
  await tab(page, '完整流水线');
  await page.getByRole('button', { name: /8.*Final Input Matrix/ }).click();
  await expect(page.locator('.lr-empty').last()).toContainText('0 × 8');
});

test('词表双向映射、UNK、重复拒绝、空词表与应用后形状同步', async ({ page }) => {
  await page.goto(route); await tab(page, '词表与 ID');
  await page.getByLabel('查询 Token', { exact: true }).fill('unseen');
  await expect(page.getByTestId('lookup-id')).toContainText('ID 1 → [UNK]（未知 Token');
  await page.getByLabel('ID 反查', { exact: true }).selectOption('5');
  await expect(page.getByRole('tabpanel')).toContainText('ID 5 → love');
  await page.getByLabel('自定义词表', { exact: true }).fill('I\nI');
  await page.getByRole('button', { name: '应用词表', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('重复 Token');
  await expect(page.locator('.lr-stats')).toContainText('V = 36');
  await page.getByLabel('自定义词表', { exact: true }).fill('');
  await page.getByRole('button', { name: '应用词表', exact: true }).click();
  await expect(page.locator('.lr-stats')).toContainText('V = 4');
  await tab(page, 'One-Hot');
  await expect(page.getByTestId('one-hot-summary')).toContainText('长度 4 · 非零索引 0');
  await page.getByLabel('One-Hot Token ID', { exact: true }).selectOption('2');
  await expect(matrixCell(page, 'One-Hot 行向量', 0, 2)).toHaveAttribute('data-value', '1');
  await tab(page, '完整流水线'); await page.getByRole('button', { name: /3.*Token IDs/ }).click();
  await expect(page.locator('.lr-step-card pre').last()).toContainText('[\n  1,\n  1,\n  1\n]');
});

test('One-Hot、编辑 Embedding、重复 Token 联动与非法草稿隔离', async ({ page }) => {
  await page.goto(route); await page.getByLabel('输入短句', { exact: true }).fill('I love I');
  await tab(page, 'One-Hot');
  await page.getByLabel('One-Hot Token ID', { exact: true }).selectOption('4');
  await expect(page.getByTestId('one-hot-summary')).toContainText('长度 36 · 非零索引 4');
  await expect(page.locator('.lr-hot-svg [data-value="1"]')).toHaveAttribute('data-id', '4');
  await tab(page, 'Embedding');
  await expect(page.getByTestId('lookup-proof')).toContainText('数值一致');
  await page.getByLabel('Embedding 元素', { exact: true }).fill('2');
  await expect(matrixCell(page, '查表 E[ID]')).toHaveAttribute('data-value', '2');
  await expect(matrixCell(page, 'One-Hot × E')).toHaveAttribute('data-value', '2');
  await expect(matrixCell(page, '整句 Embedding', 2)).toHaveAttribute('data-value', '2');
  await expect(page.getByLabel('Embedding 元素', { exact: true })).toBeFocused();
  await page.getByLabel('Embedding 元素', { exact: true }).fill('999');
  await expect(page.getByLabel('Embedding 元素', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(matrixCell(page, '查表 E[ID]')).toHaveAttribute('data-value', '2');
  await page.getByLabel('Embedding 元素', { exact: true }).fill('3');
  await tab(page, '完整流水线'); await page.getByRole('button', { name: /8.*Final Input Matrix/ }).click();
  await expect(matrixCell(page, 'Final Input Matrix')).toHaveAttribute('data-value', '3');
  await expect(matrixCell(page, 'Final Input Matrix', 2)).toHaveAttribute('data-value', String(3 + Math.sin(2)));
});

test('固定种子初始化可复现，维度变更重建真实矩阵并重置流水线', async ({ page }) => {
  await page.goto(route); await tab(page, 'Embedding');
  await page.getByRole('button', { name: '按种子随机初始化', exact: true }).click();
  const first = await matrixCell(page, 'Embedding Matrix E', 4).getAttribute('data-value');
  await page.getByRole('button', { name: '按种子随机初始化', exact: true }).click();
  await expect(matrixCell(page, 'Embedding Matrix E', 4)).toHaveAttribute('data-value', first!);
  await page.getByRole('button', { name: '恢复教学矩阵', exact: true }).click();
  await expect(matrixCell(page, 'Embedding Matrix E', 4)).toHaveAttribute('data-value', '-0.25');
  await tab(page, '完整流水线'); await page.getByRole('button', { name: /8.*Final Input Matrix/ }).click();
  await page.getByLabel('向量维度 d_model', { exact: true }).selectOption('4');
  await expect(page.getByTestId('pipeline-step')).toHaveText('Tokenization');
  await page.getByRole('button', { name: /8.*Final Input Matrix/ }).click();
  await expect(page.getByRole('table', { name: 'Final Input Matrix', exact: true }).locator('tbody td')).toHaveCount(12);
});

test('向量指标与逐项计算同步，二维投影和零向量余弦未定义', async ({ page }) => {
  await page.goto(route); await tab(page, '向量相似度');
  await page.getByLabel('相似度指标', { exact: true }).selectOption('dot');
  const a = [-0.25,0.25,0.75,-1,-0.5,0,0.5,1], b = [0.5,1,-0.75,-0.25,0.25,0.75,-1,-0.5];
  await expect(page.getByTestId('similarity-result')).toHaveAttribute('data-value', String(a.reduce((sum,n,i)=>sum+n*b[i],0)));
  await page.getByLabel('相似度指标', { exact: true }).selectOption('distance');
  expect(Number(await page.getByTestId('similarity-result').getAttribute('data-value'))).toBeCloseTo(Math.hypot(...a.map((n,i)=>n-b[i])),12);
  await expect(page.getByRole('tabpanel')).toContainText('指标使用全部 8 维');
  await tab(page, 'Embedding'); await page.getByRole('button', { name: '将选中向量置零' }).click();
  await tab(page, '向量相似度');
  await expect(page.getByTestId('similarity-result')).toHaveAttribute('data-value', 'undefined');
  await expect(page.getByTestId('similarity-result')).toContainText('未定义（零向量没有方向）');
  await expect(page.locator('[data-point="a"]')).toHaveAttribute('data-value', '0');
});

test('PE 公式、预览长度、位置/维度曲线、热图与句子相加一致', async ({ page }) => {
  await page.goto(route); await tab(page, '位置编码');
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.locator('.lr-heatmap [data-position]')).toHaveCount(64);
  await expect(page.getByTestId('position-value')).toHaveAttribute('data-value', '0');
  await page.getByLabel('位置编码预览长度', { exact: true }).fill('4');
  await page.getByLabel('当前位置 pos', { exact: true }).fill('1');
  await expect(page.getByTestId('position-value')).toHaveAttribute('data-value', String(Math.sin(1)));
  await expect(page.locator('[data-point="pe-point-0"]')).toHaveAttribute('data-value', String(Math.sin(1)));
  await page.getByLabel('位置编码维度索引', { exact: true }).fill('3');
  await expect.poll(async () => Number(await page.getByTestId('position-value').getAttribute('data-value'))).toBeCloseTo(Math.cos(1/10),12);
  await expect(page.locator('.lr-heatmap [data-position]')).toHaveCount(32);
  await expect(matrixCell(page, 'Embedding + PE', 0, 1)).toHaveAttribute('data-value', '1.25');
  await page.getByLabel('向量维度 d_model', { exact: true }).selectOption('4');
  await expect(page.locator('.lr-heatmap [data-position]')).toHaveCount(16);
  await expect.poll(async () => Number(await page.getByTestId('position-value').getAttribute('data-value'))).toBeCloseTo(Math.cos(1/100),12);
  await page.getByLabel('位置编码预览长度', { exact: true }).fill('999');
  await expect(page.getByLabel('位置编码预览长度', { exact: true })).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.lr-heatmap [data-position]')).toHaveCount(16);
  await page.locator('.lr-heatmap [role="button"]').nth(2).focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => Number(await page.getByTestId('position-value').getAttribute('data-value'))).toBeCloseTo(Math.cos(2/100),12);
});

test('八步输入输出形状、真实 JSON 导出及上游错误不显示旧矩阵', async ({ page }, testInfo) => {
  await page.goto(route); await tab(page, '完整流水线');
  for (let i = 0; i < 8; i++) {
    await expect(page.locator('.lr-step-card .eyebrow')).toHaveText('STEP '+(i+1)+' / 8');
    await expect(page.getByRole('group')).toHaveCount(2);
    if (i < 7) await page.getByRole('button', { name: '下一步', exact: true }).click();
  }
  await expect(matrixCell(page, 'Final Input Matrix')).toHaveAttribute('data-value','-0.25');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button',{name:'导出输入 JSON'}).click();
  const download=await downloaded, path=testInfo.outputPath('transformer-input-v1.json'); await download.saveAs(path);
  const stream=await download.createReadStream(); let body='';
  for await (const chunk of stream!) body+=chunk.toString();
  const data=JSON.parse(body);
  expect(data.schemaVersion).toBe(1); expect(data.tokens).toEqual(['I','love','learning']); expect(data.shape).toEqual([3,8]);
  expect(data.values[0]).toEqual([-0.25,1.25,0.75,0,-0.5,1,0.5,2]);
  await page.getByLabel('分词方式', { exact: true }).selectOption('character');
  await expect(page.getByTestId('pipeline-step')).toHaveText('Tokenization');
  await page.getByLabel('输入短句', { exact: true }).fill('a'.repeat(33));
  await expect(page.getByRole('alert')).toContainText('超过 32');
  await expect(page.getByRole('table',{name:'Final Input Matrix',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'英文短句',exact:true}).click();
  await expect(page.getByTestId('pipeline-step')).toHaveText('Tokenization');
});

test('两节教材往返、KaTeX、测验与 T02 完成进度刷新后保留', async ({ page }) => {
  for (const id of ['embedding','position-encoding']) {
    await page.goto('/lessons/'+id);
    await expect(page.locator('article .katex').first()).toBeVisible();
    await page.getByRole('button',{name:'标记课时完成',exact:true}).click();
    await page.getByRole('link',{name:'进入语言表示实验室',exact:true}).click();
    await expect(page).toHaveURL(new RegExp('language-representation\\?from='+id+'$'));
    await page.reload(); await page.getByRole('link',{name:'返回原课时',exact:true}).click();
    await expect(page.getByRole('button',{name:'撤销完成',exact:true})).toBeVisible();
  }
  await page.goto('/progress'); await expect(page.getByRole('heading',{name:'你已完成 2 个课时'})).toBeVisible();
});

test('七区在 320/390/768/1440px 无整体溢出，键盘标签与减少动画可用', async ({ page }, testInfo) => {
  await page.emulateMedia({reducedMotion:'reduce'}); await page.goto(route);
  await page.getByRole('tab',{name:/文本分词$/}).focus(); await page.keyboard.press('End');
  await expect(page.getByRole('tab',{name:/完整流水线$/})).toBeFocused();
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    for (const name of ['文本分词','词表与 ID','One-Hot','Embedding','向量相似度','位置编码','完整流水线']) {
      await tab(page,name);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),name+' at '+width).toBe(true);
    }
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  for (const [name,file] of [['文本分词','tokens'],['Embedding','embedding'],['位置编码','position'],['完整流水线','pipeline']]) {
    await tab(page,name); if(file==='pipeline') await page.getByRole('button',{name:/8.*Final Input Matrix/}).click();
    await page.locator('.lr-workbench').screenshot({path:'../docs/screenshots/t07/'+testInfo.project.name+'-'+file+'.png'});
  }
});
