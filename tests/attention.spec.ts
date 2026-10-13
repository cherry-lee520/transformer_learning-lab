import { test, expect } from '../frontend/node_modules/@playwright/test';
import type { Page } from '../frontend/node_modules/@playwright/test';
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',message=>{if(message.type()==='error')list.push(message.text());});});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function tab(page:Page,name:string){await page.getByRole('tab',{name,exact:true}).click();}
const cell=(page:Page,title:string,row:number,col:number)=>page.getByRole('table',{name:title,exact:true}).locator('td[data-row="'+row+'"][data-column="'+col+'"]');
async function value(page:Page,title:string,row=0,col=0){return Number(await cell(page,title,row,col).getAttribute('data-value'));}
test('正式入口、默认投影、查询兼容、刷新与安全返回',async({page})=>{
  await page.goto('/laboratory');await page.getByRole('link',{name:'进入 Attention 实验室',exact:true}).click();
  await expect(page).toHaveURL('/laboratory/attention');await expect(page.getByRole('heading',{level:1,name:'Attention 核心机制实验室'})).toBeVisible();
  await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','1');
  await expect(page.getByText('X：3×4',{exact:true})).toBeVisible();
  await page.reload();await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','1');
  await page.goto('/laboratory?experiment=attention&from=multi-head');await expect(page).toHaveURL('/laboratory/attention?from=multi-head');await expect(page.getByRole('link',{name:'返回原课时',exact:true})).toHaveAttribute('href','/lessons/multi-head');
  await page.goto('/laboratory/attention?from=https://example.com');await expect(page.getByRole('link',{name:'返回原课时',exact:true})).toHaveAttribute('href','/lessons/attention');
});
test('WQ 编辑、投影点积行列高亮、非法草稿隔离与种子复现',async({page})=>{
  await page.goto('/laboratory/attention');await page.getByRole('spinbutton',{name:'WQ 元素值',exact:true}).fill('2');
  await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','2');
  await page.getByRole('button',{name:'选择 Q[0,0]',exact:true}).click();await expect(page.getByTestId('projection-detail')).toContainText('2');
  await expect(page.getByRole('table',{name:'参与计算的 X 行',exact:true}).locator('.at-highlight')).toHaveCount(4);
  await page.getByRole('spinbutton',{name:'WQ 元素值',exact:true}).fill('100');await expect(page.getByRole('alert')).toContainText('保留上次有效计算');await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','2');
  await page.getByRole('spinbutton',{name:'WQ 元素值',exact:true}).fill('1');await page.getByRole('button',{name:'随机初始化单头权重',exact:true}).click();
  const random=await value(page,'WQ');await page.getByRole('button',{name:'随机初始化单头权重',exact:true}).click();expect(await value(page,'WQ')).toBe(random);
  await page.getByRole('button',{name:'恢复教学权重',exact:true}).click();await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','1');
  await page.getByRole('spinbutton',{name:'单头 dk',exact:true}).fill('2');await expect(page.getByRole('figure').filter({has:page.getByRole('table',{name:'Q',exact:true})})).toContainText('3 × 2');
});
test('九步矩阵、逐行 Softmax、播放暂停速度与上游修改重置',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'B 逐步计算');
  for(let i=1;i<=9;i++){await expect(page.getByTestId('attention-step')).toHaveAttribute('data-step',String(i));await expect(page.getByText('本步输入矩阵及形状',{exact:true})).toBeVisible();if(i<9)await page.getByRole('button',{name:'下一步',exact:true}).click();}
  await expect(page.getByRole('button',{name:'下一步',exact:true})).toBeDisabled();await page.getByRole('button',{name:'上一步',exact:true}).click();await expect(page.getByTestId('attention-step')).toHaveAttribute('data-step','8');
  await page.getByRole('button',{name:/7\s*逐行 Softmax/}).click();await page.getByRole('button',{name:'查看下一行 Softmax'}).click();await expect(page.getByRole('combobox',{name:'Softmax 行',exact:true})).toHaveValue('1');
  await page.getByRole('button',{name:'重置步骤',exact:true}).click();await page.getByRole('combobox',{name:'播放速度',exact:true}).selectOption('2');await page.getByRole('button',{name:'自动播放',exact:true}).click();await expect.poll(()=>page.getByTestId('attention-step').getAttribute('data-step')).not.toBe('1');await page.getByRole('button',{name:'暂停播放',exact:true}).click();
  const stopped=await page.getByTestId('attention-step').getAttribute('data-step');await page.waitForTimeout(800);await expect(page.getByTestId('attention-step')).toHaveAttribute('data-step',stopped!);
  await page.getByRole('button',{name:'自动播放',exact:true}).click();await page.getByRole('spinbutton',{name:'单头 dk',exact:true}).fill('3');await expect(page.getByTestId('attention-step')).toHaveAttribute('data-step','1');await expect(page.getByRole('button',{name:'自动播放',exact:true})).toBeVisible();await page.waitForTimeout(750);await expect(page.getByTestId('attention-step')).toHaveAttribute('data-step','1');
});
test('缩放开关影响实际权重，Softmax 示范可调分数与 dk',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'D 注意力与贡献');const scaled=await value(page,'当前 Query 权重',0,0);
  await page.getByRole('checkbox',{name:'单头 √dk 缩放',exact:true}).uncheck();expect(await value(page,'当前 Query 权重',0,0)).toBeGreaterThan(scaled);
  await tab(page,'B 逐步计算');await page.getByRole('button',{name:/5\s*缩放分数/}).click();await expect(page.locator('.at-current-step .katex-mathml annotation')).toContainText('\\alpha=1');
  await page.getByRole('checkbox',{name:'单头 √dk 缩放',exact:true}).check();await page.getByRole('button',{name:/5\s*缩放分数/}).click();await expect(page.locator('.at-current-step .katex-mathml annotation')).toContainText('\\sqrt');
  await tab(page,'C Softmax 与缩放');const baseline=await value(page,'当前示例使用的 Softmax 权重',0,2);
  await page.getByRole('spinbutton',{name:'示例分数 2',exact:true}).fill('12');expect(await value(page,'当前示例使用的 Softmax 权重',0,2)).toBeGreaterThan(baseline);
  await page.getByRole('spinbutton',{name:'缩放示例 dk',exact:true}).fill('16');const softened=await value(page,'当前示例使用的 Softmax 权重',0,2);await page.getByRole('checkbox',{name:'示例缩放开关',exact:true}).uncheck();expect(await value(page,'当前示例使用的 Softmax 权重',0,2)).toBeGreaterThan(softened);
  await page.getByRole('combobox',{name:'分数来源',exact:true}).selectOption('current');await expect(cell(page,'原始分数',0,0)).toHaveAttribute('data-value','2');
});
test('Heatmap 点击与键盘、Query 切换、真实 Value 贡献求和',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'D 注意力与贡献');
  const target=page.locator('[aria-label="Attention Heatmap"] [data-query="1"][data-key="0"]');await target.click();
  await expect(page.getByRole('combobox',{name:'选择 Query Token',exact:true})).toHaveValue('1');await expect(page.getByTestId('heatmap-detail')).toContainText('0.186324');
  const terms=await page.getByRole('table',{name:'逐项 Weight × Value 贡献',exact:true}).locator('td[data-column="0"]').evaluateAll(cells=>cells.reduce((sum,c)=>sum+Number(c.getAttribute('data-value')),0));expect(await value(page,'贡献求和 Output[i]')).toBeCloseTo(terms,12);
  await page.getByRole('combobox',{name:'选择 Query Token',exact:true}).selectOption('2');await expect(page.locator('.at-token-links [data-key="0"]')).toHaveAttribute('data-weight',String(await value(page,'当前 Query 权重',0,0)));
  const keyboard=page.locator('[aria-label="Attention Heatmap"] [data-query="0"][data-key="2"]');await keyboard.focus();await page.keyboard.press('Enter');await expect(page.getByRole('combobox',{name:'选择 Query Token',exact:true})).toHaveValue('0');
});
test('多头独立参数、Concat、WO、Head 数量和 d_model',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'E Multi-Head');
  await expect(page.getByRole('combobox',{name:'Head 数量',exact:true})).toHaveValue('2');await page.getByRole('combobox',{name:'查看 Head',exact:true}).selectOption('1');const other=await value(page,'Head 1 Q');
  await page.getByRole('combobox',{name:'查看 Head',exact:true}).selectOption('0');const before=await value(page,'Multi-Head Output');await page.getByRole('spinbutton',{name:'H0 WQ 元素值',exact:true}).fill('1');expect(await value(page,'Multi-Head Output')).not.toBe(before);
  await page.getByRole('combobox',{name:'查看 Head',exact:true}).selectOption('1');expect(await value(page,'Head 1 Q')).toBe(other);
  await page.getByRole('spinbutton',{name:'WO 元素值',exact:true}).fill('1');await expect(page.getByRole('table',{name:'Concat 全部 Head 输出',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Head 数量',exact:true}).selectOption('4');await expect(page.getByRole('table',{name:'Head 0 Q',exact:true}).locator('td')).toHaveCount(3);
  await page.getByRole('combobox',{name:'Attention d_model',exact:true}).selectOption('8');await expect(page.getByRole('combobox',{name:'Head 数量',exact:true})).toHaveValue('2');await expect(page.getByRole('table',{name:'Concat 全部 Head 输出',exact:true}).locator('tbody tr').first().locator('td')).toHaveCount(8);
});
test('Causal Mask 真实排除未来，切回无 Mask 恢复非零分布',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'F Causal Mask');await page.getByRole('checkbox',{name:'启用 Causal Mask',exact:true}).check();
  const cells=await page.getByRole('table',{name:'Masked Softmax Weights',exact:true}).locator('td').evaluateAll(list=>list.map(c=>({i:Number(c.getAttribute('data-row')),j:Number(c.getAttribute('data-column')),value:Number(c.getAttribute('data-value'))})));
  for(const c of cells)if(c.j>c.i)expect(c.value).toBe(0);
  await expect(cell(page,'Masked Softmax Weights',0,0)).toHaveAttribute('data-value','1');await expect(cell(page,'Masked Scores',0,1)).toHaveAttribute('data-value','masked');
  await expect(page.locator('[aria-label="Mask Attention Heatmap"] [data-query="0"][data-key="2"]')).toHaveAttribute('data-weight','0');
  await page.getByRole('checkbox',{name:'启用 Causal Mask',exact:true}).uncheck();expect(await value(page,'Masked Softmax Weights',0,1)).toBeGreaterThan(0);
});
test('从 T07 传递真实矩阵，Token/ID/数值不变，刷新恢复并返回来源',async({page})=>{
  await page.goto('/laboratory/language-representation');await page.getByRole('textbox',{name:'输入短句',exact:true}).fill('I love I');await page.getByRole('combobox',{name:'向量维度 d_model',exact:true}).selectOption('4');await page.getByRole('tab',{name:'G 完整流水线',exact:true}).click();await page.getByRole('button',{name:/8\s*Final Input Matrix/}).click();
  const final=await value(page,'Final Input Matrix');await page.getByRole('link',{name:'将当前矩阵传入 Attention 实验室',exact:true}).click();await expect(page).toHaveURL('/laboratory/attention?from=language-representation');
  await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value',String(final));await expect(page.getByText('Tokens：I · love · I',{exact:true})).toBeVisible();await expect(page.getByText('ID：4, 5, 4',{exact:true})).toBeVisible();
  await page.getByRole('spinbutton',{name:'WQ 元素值',exact:true}).fill('2');await page.reload();await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value',String(final));await expect(page.getByRole('status').filter({hasText:'已恢复上次导入'})).toBeVisible();
  await page.getByRole('link',{name:'返回语言表示实验室',exact:true}).click();await expect(page).toHaveURL('/laboratory/language-representation');
});
test('损坏和缺失输入回退、JSON 校验、存储拒绝与不覆盖进度',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.setItem('transformer-learning-lab.attention-input','{'));
  await page.goto('/laboratory/attention');await expect(page.getByRole('status').filter({hasText:'已回退默认'})).toBeVisible();await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','1');
  await page.getByText('粘贴 T07 输入 JSON · 校验并保存',{exact:true}).click();await page.getByRole('textbox',{name:'T07 输入 JSON',exact:true}).fill('{"schemaVersion":2}');await page.getByRole('button',{name:'校验并导入 JSON',exact:true}).click();await expect(page.getByRole('alert')).toContainText('版本');await expect(cell(page,'Q',0,0)).toHaveAttribute('data-value','1');
  const data={schemaVersion:1,kind:'transformer-input',tokenizer:'character',tokens:['你','好'],ids:[4,5],shape:[2,2],values:[[1,0],[0,1]],embeddingScale:1,positionStart:0,note:'测试未训练输入'};
  await page.getByRole('textbox',{name:'T07 输入 JSON',exact:true}).fill(JSON.stringify(data));await page.getByRole('button',{name:'校验并导入 JSON',exact:true}).click();await expect(page.getByText('X：2×2',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('Tokens：你 · 好',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'恢复默认输入',exact:true}).click();await expect(page.getByText('X：3×4',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('status').filter({hasText:'默认教学输入'})).toBeVisible();
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError');};});await page.getByText('粘贴 T07 输入 JSON · 校验并保存',{exact:true}).click();await page.getByRole('textbox',{name:'T07 输入 JSON',exact:true}).fill(JSON.stringify(data));await page.getByRole('button',{name:'校验并导入 JSON',exact:true}).click();await expect(page.getByRole('alert')).toContainText('blocked');await expect(page.getByText('X：3×4',{exact:true})).toBeVisible();
});
test('四节教材真实公式、实验往返和学习进度保留',async({page})=>{
  for(const id of ['attention-math','attention','multi-head','decoder-mask']){
    await page.goto('/lessons/'+id);await expect(page.locator('article .katex').first()).toBeVisible();await expect(page.getByText('此内容块暂不可用，其他内容仍可继续阅读。')).toHaveCount(0);
    await page.getByRole('link',{name:'进入 Attention 实验室',exact:true}).click();await expect(page).toHaveURL('/laboratory/attention?from='+id);await page.getByRole('link',{name:'返回原课时',exact:true}).click();await expect(page).toHaveURL('/lessons/'+id);
  }
  await page.getByRole('button',{name:'标记课时完成',exact:true}).click();await page.getByRole('link',{name:'进入 Attention 实验室',exact:true}).click();await page.reload();await page.getByRole('link',{name:'返回原课时',exact:true}).click();await expect(page.getByRole('button',{name:'撤销完成',exact:true})).toBeVisible();
});
test('六项挑战提交正误、容限、解析、重试与完成状态隔离',async({page})=>{
  await page.goto('/laboratory/attention');await tab(page,'G 综合挑战');const cards=page.locator('.quiz-card');
  await cards.nth(0).getByRole('spinbutton').fill('99');await cards.nth(0).getByRole('button',{name:'提交答案'}).click();await expect(cards.nth(0)).toContainText('这次还不正确');await expect(cards.nth(0)).toContainText('答案解析');await cards.nth(0).getByRole('button',{name:'重新作答'}).click();
  for(const [index,answer] of [[0,'4'],[1,'11'],[2,'0.7500001'],[4,'5']] as const){await cards.nth(index).getByRole('spinbutton').fill(answer);await cards.nth(index).getByRole('button',{name:'提交答案'}).click();await expect(cards.nth(index)).toContainText('回答正确');}
  await cards.nth(3).getByLabel('Key 0',{exact:true}).check();await cards.nth(3).getByLabel('Key 1',{exact:true}).check();await cards.nth(3).getByRole('button',{name:'提交答案'}).click();await expect(cards.nth(3)).toContainText('回答正确');await cards.nth(5).getByLabel('3×4',{exact:true}).check();await cards.nth(5).getByRole('button',{name:'提交答案'}).click();await expect(cards.nth(5)).toContainText('回答正确');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('transformer-learning-lab.progress')!).records)).toEqual([]);
});
test('七模块四种宽度无页面溢出，键盘和减少动态效果，真实截图',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/laboratory/attention');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const name of ['A Q、K、V','B 逐步计算','C Softmax 与缩放','D 注意力与贡献','E Multi-Head','F Causal Mask','G 综合挑战']){await tab(page,name);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
  await page.getByRole('tab',{name:'G 综合挑战',exact:true}).focus();await page.keyboard.press('Home');await expect(page.getByRole('tab',{name:'A Q、K、V',exact:true})).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'B 逐步计算',exact:true})).toBeFocused();
  await page.setViewportSize({width:testInfo.project.name==='desktop'?1440:testInfo.project.name==='tablet'?768:390,height:950});for(const [name,slug] of [['A Q、K、V','qkv'],['D 注意力与贡献','contribution'],['E Multi-Head','multi'],['F Causal Mask','mask']]){await tab(page,name);await page.locator('.at-workbench').screenshot({path:'../docs/screenshots/t08/'+testInfo.project.name+'-'+slug+'.png'});}
});
test('最大教学输入 32×16、多头 8 和窄屏局部滚动，挑战页签保留',async({page})=>{
  await page.goto('/laboratory/attention');await page.getByText('粘贴 T07 输入 JSON · 校验并保存',{exact:true}).click();
  const data={schemaVersion:1,kind:'transformer-input',tokenizer:'character',tokens:Array.from({length:32},(_,i)=>'t'+i),ids:Array.from({length:32},(_,i)=>i),shape:[32,16],values:Array.from({length:32},(_,i)=>Array.from({length:16},(_,j)=>Math.sin(i+j))),embeddingScale:1,positionStart:0,note:'尺寸边界教学输入，未训练'};
  await page.getByRole('textbox',{name:'T07 输入 JSON',exact:true}).fill(JSON.stringify(data));await page.getByRole('button',{name:'校验并导入 JSON',exact:true}).click();await expect(page.getByText('X：32×16',{exact:true})).toBeVisible();
  await tab(page,'D 注意力与贡献');await page.getByRole('combobox',{name:'选择 Query Token',exact:true}).selectOption('31');await expect(page.locator('[aria-label="Attention Heatmap"] [data-query="31"]')).toHaveCount(32);await expect(page.getByRole('table',{name:'逐项 Weight × Value 贡献',exact:true}).locator('tbody tr')).toHaveCount(32);
  await tab(page,'E Multi-Head');await page.getByRole('combobox',{name:'Head 数量',exact:true}).selectOption('8');await page.getByRole('combobox',{name:'查看 Head',exact:true}).selectOption('7');await expect(page.getByRole('table',{name:'Head 7 Q',exact:true}).locator('tbody tr').first().locator('td')).toHaveCount(2);await expect(page.getByRole('table',{name:'Multi-Head Output',exact:true}).locator('tbody tr')).toHaveCount(32);
  await page.setViewportSize({width:320,height:950});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await tab(page,'G 综合挑战');const first=page.locator('.quiz-card').first();await first.getByRole('spinbutton').fill('4');await first.getByRole('button',{name:'提交答案'}).click();await tab(page,'A Q、K、V');await tab(page,'G 综合挑战');await expect(first).toContainText('回答正确');
  await page.getByRole('button',{name:'恢复默认输入',exact:true}).click();await expect(page.getByText('X：3×4',{exact:true})).toBeVisible();
});
