import { test, expect } from '../frontend/node_modules/@playwright/test';
import type { Page } from '../frontend/node_modules/@playwright/test';
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));page.on('console',m=>{if(m.type()==='error')list.push(m.text());});});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
const route='/laboratory/transformer';
async function tab(page:Page,name:string){await page.getByRole('tab',{name,exact:true}).click();}
const cell=(page:Page,title:string,row=0,column=0)=>page.getByRole('table',{name:title,exact:true}).locator('td[data-row="'+row+'"][data-column="'+column+'"]');
const value=async(page:Page,title:string,row=0,column=0)=>Number(await cell(page,title,row,column).getAttribute('data-value'));
async function step(page:Page,id:string){await page.getByRole('combobox',{name:'选择张量步骤',exact:true}).selectOption(id);}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();}

test('实验列表/旧查询/安全返回、默认配置与刷新',async({page})=>{
  await page.goto('/laboratory');await page.getByRole('link',{name:'进入 Transformer 架构实验室',exact:true}).click();
  await expect(page).toHaveURL(route);await expect(page.getByRole('heading',{level:1,name:'Transformer 完整架构实验室'})).toBeVisible();
  await expect(page.getByRole('combobox',{name:'Encoder 层数',exact:true})).toHaveValue('1');await expect(page.getByRole('combobox',{name:'Decoder 层数',exact:true})).toHaveValue('1');
  await expect(page.getByTestId('source-shape')).toHaveText('Source：3×8');await expect(page.getByTestId('target-shape')).toHaveText('Target：2×8');
  await page.reload();await expect(page.getByTestId('token-ids')).toContainText('Source IDs=[4, 5, 6]');await expect(page.getByTestId('token-ids')).toContainText('Target IDs=[2, 7]');
  await page.goto('/laboratory?experiment=transformer&from=encoder');await expect(page).toHaveURL(route+'?from=encoder');
  await expect(page.getByRole('link',{name:'返回原课时',exact:true})).toHaveAttribute('href','/lessons/encoder');
  await page.goto(route+'?from=https://example.com');await expect(page.getByRole('link',{name:'返回原课时',exact:true})).toHaveAttribute('href','/lessons/transformer');
});
test('Encoder/Decoder 层数、d_model、Heads、d_ff 及固定种子重建',async({page})=>{
  await page.goto(route);await page.getByRole('combobox',{name:'Encoder 层数',exact:true}).selectOption('3');await page.getByRole('combobox',{name:'Decoder 层数',exact:true}).selectOption('2');
  await page.getByRole('combobox',{name:'d_model',exact:true}).selectOption('16');await page.getByRole('combobox',{name:'Heads',exact:true}).selectOption('4');await page.getByRole('combobox',{name:'d_ff',exact:true}).selectOption('64');
  await expect(page.getByRole('status').filter({hasText:'全部参数已按固定种子重新初始化'})).toBeVisible();
  await expect(page.getByRole('button',{name:'查看模块 Encoder 3 FFN',exact:true})).toBeAttached();await expect(page.getByRole('button',{name:'查看模块 Decoder 2 Cross-Attention',exact:true})).toBeAttached();
  await expect(page.getByTestId('source-shape')).toHaveText('Source：3×16');
  await tab(page,'D 参数编辑');const first=await value(page,'所选参数');await page.getByRole('button',{name:'重新初始化参数',exact:true}).click();expect(await value(page,'所选参数')).toBe(first);
  await page.getByRole('spinbutton',{name:'随机种子',exact:true}).fill('43');expect(await value(page,'所选参数')).not.toBe(first);
  await page.getByRole('button',{name:'恢复默认模型',exact:true}).click();await expect(page.getByRole('combobox',{name:'Heads',exact:true})).toHaveValue('2');
});
test('完整与逐步前向、架构模块选择、依赖连线和 KaTeX',async({page})=>{
  await page.goto(route);await page.getByRole('button',{name:'下一步',exact:true}).click();await expect(page.getByTestId('current-tensor')).toHaveText('Source Embedding');
  await expect(page.locator('#tr-panel .katex').first()).toBeVisible();await page.getByRole('button',{name:'上一步',exact:true}).click();await expect(page.getByTestId('current-tensor')).toContainText('Tokens');
  await step(page,'encoder-0-self');await expect(page.getByTestId('tensor-shape')).toContainText('3 × 8');
  await page.getByRole('button',{name:'查看模块 Decoder 1 Cross-Attention',exact:true}).click();await expect(page.getByTestId('current-tensor')).toHaveText('Decoder 1 Cross-Attention');
  await expect(page.locator('path[data-from="encoder-memory"][data-to="decoder-0-cross"]')).toHaveCount(1);
  await expect(page.locator('path[data-from="source-input"][data-to="encoder-0-norm1"]')).toHaveCount(1);
  await page.getByRole('button',{name:'执行完整前向传播',exact:true}).click();await expect(page.getByTestId('current-tensor')).toHaveText('Softmax / Next Token Probabilities');
  await expect(page.getByTestId('tensor-shape')).toContainText('2 × 16');await expect(page.getByRole('button',{name:'下一步',exact:true})).toBeDisabled();
});
test('自动播放、暂停、速度、修改上游后停止并清除过期步骤',async({page})=>{
  await page.goto(route);await page.getByRole('combobox',{name:'播放速度',exact:true}).selectOption('2');await page.getByRole('button',{name:'自动播放',exact:true}).click();await expect(page.getByTestId('forward-state')).toContainText('播放中');
  await expect(page.getByTestId('forward-state')).not.toContainText('步骤 1/');await page.getByRole('button',{name:'暂停',exact:true}).click();const paused=await page.getByTestId('forward-state').textContent();await page.waitForTimeout(750);expect(await page.getByTestId('forward-state').textContent()).toBe(paused);
  await page.getByRole('button',{name:'自动播放',exact:true}).click();await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill('I love');
  await expect(page.getByTestId('forward-state')).toContainText('步骤 1/');await expect(page.getByTestId('forward-state')).toContainText('已暂停');await page.waitForTimeout(750);await expect(page.getByTestId('forward-state')).toContainText('步骤 1/');
  await step(page,'decoder-output');await page.getByRole('button',{name:'重置步骤',exact:true}).click();await expect(page.getByTestId('current-tensor')).toHaveText('Source Tokens / IDs');
});
test('三种 Attention、Head 切换、不同长度 Cross 与严格 Causal Mask',async({page})=>{
  await page.goto(route);await tab(page,'B 注意力');await expect(page.getByRole('table',{name:'Attention Weights',exact:true}).locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('#tr-panel .katex-mathml mfrac')).toHaveCount(1);await expect(page.locator('#tr-panel annotation')).toContainText('\\frac{QK');
  const first=await value(page,'Attention Q');await page.getByRole('combobox',{name:'Attention Head',exact:true}).selectOption('1');expect(await value(page,'Attention Q')).not.toBe(first);
  await page.getByRole('combobox',{name:'选择层与注意力类型',exact:true}).selectOption('decoder-0-self');
  await expect(cell(page,'Attention Weights',0,1)).toHaveAttribute('data-value','0');await expect(cell(page,'Masked Scores',0,1)).toHaveAttribute('data-value','masked');
  await page.getByRole('button',{name:/^权重 0,1 =/}).click();await expect(page.getByTestId('attention-cell')).toContainText('未来被 Mask');
  await page.getByRole('combobox',{name:'选择层与注意力类型',exact:true}).selectOption('decoder-0-cross');
  await expect(page.getByRole('table',{name:'Attention Weights',exact:true}).locator('tbody tr')).toHaveCount(2);await expect(page.getByRole('table',{name:'Attention Weights',exact:true}).locator('tbody tr').first().locator('td')).toHaveCount(3);
  await expect(cell(page,'Attention K',2,0)).toBeVisible();await page.getByRole('button',{name:/^权重 1,2 =/}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('attention-cell')).toContainText('Weight[1,2]');
  await page.getByRole('spinbutton',{name:'Query 位置',exact:true}).fill('0');await expect(page.getByTestId('attention-cell')).toContainText('Weight[0,2]');
  const values=await page.getByRole('table',{name:'Attention Weights',exact:true}).locator('tbody tr').first().locator('td').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-value'))));expect(Math.abs(values.reduce((a,b)=>a+b,0)-1)).toBeLessThan(1e-12);
});
test('FFN 内部、输出元素点积、残差和逐 Token LayerNorm',async({page})=>{
  await page.goto(route);await tab(page,'C FFN 与 Add & Norm');await expect(page.getByTestId('ffn-detail')).toBeVisible();await expect(page.getByRole('table',{name:'FFN Linear 1',exact:true}).locator('tbody tr').first().locator('td')).toHaveCount(16);
  await page.getByRole('button',{name:'选择 当前张量[1,2]',exact:true}).click();await expect(page.getByTestId('ffn-element')).toContainText('输出 [1,2]');await expect(page.getByTestId('ffn-element')).toContainText('点积');
  await page.getByRole('combobox',{name:'选择 FFN 或 Add & Norm',exact:true}).selectOption('decoder-0-norm3');await expect(page.getByTestId('norm-detail')).toBeVisible();
  await expect(page.locator('[data-testid="norm-detail"] annotation').first()).toHaveText('\\mu_i=\\frac1d\\sum_j r_{ij},\\quad \\sigma_i^2=\\frac1d\\sum_j(r_{ij}-\\mu_i)^2');
  const residual=await value(page,'残差相加'),skip=await value(page,'残差输入 X'),sub=await value(page,'子层输出');expect(Math.abs(residual-skip-sub)).toBeLessThan(1e-12);
  await expect(page.getByRole('table',{name:'每 Token 均值',exact:true}).locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button',{name:'编辑此子层参数',exact:true}).click();await expect(page.getByTestId('parameter-name')).toContainText('Decoder 1 norm3 gamma');
});
test('编辑共享 E/FFN/gamma 实时改变真实结果，非法草稿不污染',async({page})=>{
  await page.goto(route);await tab(page,'D 参数编辑');const before=await value(page,'更新后的 Logits');
  const initial=await value(page,'所选参数');await page.getByRole('spinbutton',{name:'所选参数 元素值',exact:true}).fill(String(initial+.5));expect(await value(page,'更新后的 Logits')).not.toBe(before);
  const after=await value(page,'更新后的 Logits');await page.getByRole('spinbutton',{name:'所选参数 元素值',exact:true}).fill('999');await expect(page.getByRole('alert')).toContainText('保留上次有效计算');expect(await value(page,'更新后的 Logits')).toBe(after);
  await page.getByRole('combobox',{name:'选择模型参数',exact:true}).selectOption('encoders.0.ffn.w1');const ff=await value(page,'所选参数');await page.getByRole('spinbutton',{name:'所选参数 元素值',exact:true}).fill(String(ff+.5));expect(await value(page,'更新后的 Logits')).not.toBe(after);
  await page.getByRole('combobox',{name:'选择模型参数',exact:true}).selectOption('decoders.0.norm3.beta');const hidden=await value(page,'更新后的 Decoder 输出');await page.getByRole('spinbutton',{name:'所选参数 元素值',exact:true}).fill('1');expect(await value(page,'更新后的 Decoder 输出')).toBeCloseTo(hidden+1,10);
  await tab(page,'A 架构与前向');await expect(page.getByTestId('forward-state')).toContainText('步骤 1/');
});
test('输出 Logits、概率和为1、Top-K 与最后前缀位置',async({page})=>{
  await page.goto(route);await tab(page,'E 输出概率');await expect(page.getByTestId('probability-sum')).toContainText('第 1 行概率和：1');
  await expect(page.locator('#tr-panel annotation')).toHaveText('Z=HE^{\\mathsf T},\\qquad P_i=\\mathrm{softmax}(Z_i)');
  await expect(page.getByRole('table',{name:'目标词表概率',exact:true}).locator('tbody tr')).toHaveCount(16);
  const data=await page.getByRole('table',{name:'目标词表概率',exact:true}).locator('[data-probability]').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-probability'))));expect(Math.abs(data.reduce((a,b)=>a+b,0)-1)).toBeLessThan(1e-12);
  await page.getByRole('spinbutton',{name:'Top-K',exact:true}).fill('3');await expect(page.locator('.at-bars output')).toHaveCount(3);
  const ranked=await page.locator('.at-bars output').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-probability'))));expect(ranked).toEqual([...data].sort((a,b)=>b-a).slice(0,3));
  await page.getByRole('spinbutton',{name:'查看目标位置',exact:true}).fill('0');await expect(page.getByTestId('probability-sum')).toContainText('第 0 行');await page.getByRole('button',{name:'查看前缀最后位置',exact:true}).click();await expect(page.getByTestId('probability-sum')).toContainText('第 1 行');
});
test('前缀未来信息隔离：改变第三个 Token 后前两位置概率不变',async({page})=>{
  await page.goto(route);await page.getByRole('combobox',{name:'Decoder 层数',exact:true}).selectOption('3');await page.getByRole('textbox',{name:'Target Prefix',exact:true}).fill('[BOS] 我 爱');await page.getByRole('button',{name:'执行完整前向传播',exact:true}).click();
  const before=await page.getByRole('table',{name:'当前张量',exact:true}).locator('td').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-value'))));
  await page.getByRole('textbox',{name:'Target Prefix',exact:true}).fill('[BOS] 我 AI');await page.getByRole('button',{name:'执行完整前向传播',exact:true}).click();
  const after=await page.getByRole('table',{name:'当前张量',exact:true}).locator('td').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-value'))));expect(after.slice(0,32)).toEqual(before.slice(0,32));expect(after.slice(32)).not.toEqual(before.slice(32));
});
test('输入/词表错误安全处理、未知词和 epsilon 更新',async({page})=>{
  await page.goto(route);await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill('');await expect(page.getByRole('alert')).toContainText('当前前向结果不可用');await expect(page.getByTestId('current-tensor')).toHaveCount(0);
  await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill('未知词');await expect(page.getByTestId('token-ids')).toContainText('实际计算使用 [UNK]');
  await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill('[PAD]');await expect(page.getByRole('alert')).toContainText('Padding Mask');await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill('I love AI');
  await page.getByRole('spinbutton',{name:'LayerNorm epsilon',exact:true}).fill('0');await expect(page.getByRole('alert')).toContainText('保留上次有效计算');await page.getByRole('spinbutton',{name:'LayerNorm epsilon',exact:true}).fill('0.01');
  await page.getByText('教学词表 · 源/目标共享 · V≤32',{exact:true}).click();await page.getByRole('textbox',{name:'自定义词表',exact:true}).fill('I\nI');await page.getByRole('button',{name:'应用教学词表',exact:true}).click();await expect(page.getByRole('alert')).toContainText('重复');
  await page.getByRole('textbox',{name:'自定义词表',exact:true}).fill('I\n我');await page.getByRole('button',{name:'应用教学词表',exact:true}).click();await expect(page.getByText('V=6',{exact:true})).toBeVisible();await tab(page,'E 输出概率');await expect(page.getByRole('table',{name:'目标词表概率',exact:true}).locator('tbody tr')).toHaveCount(6);
});
test('T08 及四节教材往返、原进度刷新保留',async({page})=>{
  await page.goto('/laboratory/attention');await page.getByRole('link',{name:'进入 Transformer 架构实验室 →',exact:true}).click();await expect(page).toHaveURL(route+'?from=attention-laboratory');await page.reload();await page.getByRole('link',{name:'返回 Attention 实验室',exact:true}).click();await expect(page).toHaveURL('/laboratory/attention');
  for(const id of ['ffn-residual-norm','encoder','decoder-mask','transformer']){
    await page.goto('/lessons/'+id);await expect(page.locator('article .katex').first()).toBeVisible();await expect(page.getByText('此内容块暂不可用，其他内容仍可继续阅读。')).toHaveCount(0);
    await page.locator('article a[href="/laboratory/transformer?from='+id+'"]').first().click();await expect(page).toHaveURL(route+'?from='+id);await page.getByRole('link',{name:'返回原课时',exact:true}).click();await expect(page).toHaveURL('/lessons/'+id);
  }
  await page.getByRole('button',{name:'标记课时完成',exact:true}).click();await page.getByRole('link',{name:'进入 Transformer 架构实验室',exact:true}).click();await page.reload();await page.getByRole('link',{name:'返回原课时',exact:true}).click();await expect(page.getByRole('button',{name:'撤销完成',exact:true})).toBeVisible();
});
test('五模块 320/390/768/1440 无整页溢出、键盘与减少动态效果',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const name of ['A 架构与前向','B 注意力','C FFN 与 Add & Norm','D 参数编辑','E 输出概率']){await tab(page,name);await noOverflow(page);}
  }
  await tab(page,'A 架构与前向');await page.getByRole('tab',{name:'A 架构与前向',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'B 注意力',exact:true})).toBeFocused();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'E 输出概率',exact:true})).toBeFocused();
  await page.keyboard.press('Home');await page.getByRole('button',{name:'查看模块 Encoder 1 Self-Attention',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByTestId('current-tensor')).toHaveText('Encoder 1 Self-Attention');
  await page.setViewportSize({width:info.project.name==='desktop'?1440:info.project.name==='tablet'?768:390,height:950});
  for(const [name,file] of [['A 架构与前向','architecture'],['B 注意力','attention'],['C FFN 与 Add & Norm','ffn'],['E 输出概率','probabilities']]){await tab(page,name);await page.locator('.tr-workbench').screenshot({path:'../docs/screenshots/t09/'+info.project.name+'-'+file+'.png'});}
});
test('最大配置与最长教学序列可计算，内部滚动和刷新默认提示',async({page})=>{
  await page.goto(route);await page.getByRole('combobox',{name:'Encoder 层数',exact:true}).selectOption('3');await page.getByRole('combobox',{name:'Decoder 层数',exact:true}).selectOption('3');await page.getByRole('combobox',{name:'d_model',exact:true}).selectOption('16');await page.getByRole('combobox',{name:'Heads',exact:true}).selectOption('4');await page.getByRole('combobox',{name:'d_ff',exact:true}).selectOption('64');
  await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill(Array(12).fill('I').join(' '));await page.getByRole('textbox',{name:'Target Prefix',exact:true}).fill('[BOS] '+Array(11).fill('我').join(' '));
  await tab(page,'B 注意力');await page.getByRole('combobox',{name:'选择层与注意力类型',exact:true}).selectOption('decoder-2-cross');await expect(page.getByRole('table',{name:'Attention Weights',exact:true}).locator('tbody tr')).toHaveCount(12);
  await page.setViewportSize({width:320,height:900});await noOverflow(page);await tab(page,'E 输出概率');await noOverflow(page);await expect(page.getByTestId('probability-sum')).toContainText('概率和：1');
  await page.getByRole('textbox',{name:'Source Tokens',exact:true}).fill(Array(13).fill('I').join(' '));await expect(page.getByRole('alert')).toContainText('输入长度');
  await page.reload();await expect(page.getByTestId('source-shape')).toHaveText('Source：3×8');await expect(page.getByRole('status').filter({hasText:'刷新或离开后恢复默认'})).toBeVisible();
});
