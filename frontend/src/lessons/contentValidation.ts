import type { ContentBlock, HeadingBlock, LessonContent } from './contentTypes.ts';

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const unique = (values: unknown[]) => new Set(values).size === values.length;
const inline = (value: unknown) => Array.isArray(value) && value.every(part => typeof part === 'string' || (object(part) && part.type === 'math' && text(part.latex) && (part.label === undefined || text(part.label))));
export function safeImageSource(src: unknown): src is string {
  if (!text(src) || /[\s\\\u0000-\u001f]/.test(src)) return false;
  return /^\/(?!\/)/.test(src) || /^https:\/\//.test(src);
}
function question(value: unknown): boolean {
  if (!object(value) || !text(value.prompt) || !text(value.explanation)) return false;
  if (value.kind === 'numeric') return finite(value.answer) && finite(value.tolerance) && value.tolerance >= 0;
  if (!Array.isArray(value.options) || value.options.length < 2 || !value.options.every(option => object(option) && id(option.id) && text(option.text))) return false;
  const optionIds = value.options.map(option => (option as { id: string }).id);
  if (!unique(optionIds)) return false;
  if (value.kind === 'single') return typeof value.correctOptionId === 'string' && optionIds.includes(value.correctOptionId);
  if (value.kind === 'multiple') return Array.isArray(value.correctOptionIds) && value.correctOptionIds.length > 0 && unique(value.correctOptionIds) && value.correctOptionIds.every(answer => optionIds.includes(answer));
  return false;
}
const blockChecks: Record<ContentBlock['type'], (block: Record<string, unknown>) => boolean> = {
  heading: block => (block.level === 2 || block.level === 3) && text(block.title),
  text: block => Array.isArray(block.paragraphs) && block.paragraphs.every(inline) && (block.bullets === undefined || (Array.isArray(block.bullets) && block.bullets.every(inline))),
  formula: block => text(block.latex) && text(block.label) && (block.display === undefined || typeof block.display === 'boolean') && (block.symbols === undefined || (Array.isArray(block.symbols) && block.symbols.every(symbol => object(symbol) && id(symbol.id) && text(symbol.latex) && text(symbol.label) && text(symbol.description)) && unique(block.symbols.map(symbol => (symbol as { id: string }).id)))),
  code: block => text(block.title) && (block.lineNumbers === undefined || typeof block.lineNumbers === 'boolean') && Array.isArray(block.examples) && block.examples.length > 0 && block.examples.every(example => object(example) && (example.language === 'python' || example.language === 'c') && text(example.code)) && unique(block.examples.map(example => (example as { language: string }).language)),
  callout: block => typeof block.tone === 'string' && ['info', 'tip', 'warning'].includes(block.tone) && text(block.title) && text(block.text),
  image: block => safeImageSource(block.src) && text(block.alt) && (block.caption === undefined || text(block.caption)),
  quiz: block => question(block.question),
  interactive: block => block.demo === 'linear-neuron' && text(block.title) && object(block.defaults) && ['x', 'w', 'b'].every(key => finite((block.defaults as Record<string, unknown>)[key]) && Math.abs((block.defaults as Record<string, number>)[key]) <= 10),
};
export function isContentBlock(value: unknown): value is ContentBlock {
  if (!object(value) || !id(value.id) || typeof value.type !== 'string' || !Object.hasOwn(blockChecks, value.type)) return false;
  if (value.paperSection !== undefined && !text(value.paperSection)) return false;
  if (value.paperPage !== undefined && (!Number.isSafeInteger(value.paperPage) || Number(value.paperPage) < 1)) return false;
  if (value.paperEquation !== undefined && !text(value.paperEquation)) return false;
  if (value.relatedExperimentId !== undefined && !id(value.relatedExperimentId)) return false;
  return blockChecks[value.type as ContentBlock['type']](value);
}
export function validateLessonContent(content: unknown): string[] {
  if (!object(content) || !text(content.intro) || !Array.isArray(content.objectives) || !content.objectives.every(text)) return ['正文介绍或学习目标格式不正确'];
  if (content.kind !== 'structured') return content.kind === undefined || content.kind === 'placeholder' ? [] : ['未知正文类型'];
  const errors: string[] = [];
  if (content.version !== 1 || !id(content.lessonId) || !Array.isArray(content.blocks)) return ['结构化正文版本、课时 ID 或 blocks 格式不正确'];
  const ids = new Set<string>();
  for (const block of content.blocks) {
    if (!isContentBlock(block)) { errors.push('存在未知类型或格式错误的内容块'); continue; }
    if (ids.has(block.id)) errors.push(`内容块 ID 重复：${block.id}`);
    ids.add(block.id);
  }
  return errors;
}
export type RenderEntry = { key: string; block: ContentBlock | null };
export const blockAnchor = (lessonId: string, blockId: string) => `${lessonId}--${blockId}`;
/** Resolve only validated blocks. Unknown or damaged entries become safe placeholders. */
export function prepareContent(content: unknown, lessonId: string): RenderEntry[] {
  if (!object(content)) return [{ key: 'missing', block: null }];
  let blocks: unknown[];
  if (content.kind === 'structured') {
    if (content.version !== 1 || content.lessonId !== lessonId || !Array.isArray(content.blocks)) return [{ key: 'incompatible', block: null }];
    blocks = content.blocks;
  } else if ((content.kind === undefined || content.kind === 'placeholder') && !validateLessonContent(content).length) {
    blocks = [
      { type: 'callout', id: 'placeholder-intro', tone: 'info', title: '正文占位', text: content.intro },
      { type: 'heading', id: 'placeholder-objectives', title: '学习目标', level: 2 },
      { type: 'text', id: 'placeholder-goals', paragraphs: [], bullets: (content.objectives as string[]).map(goal => [goal]) },
    ];
  } else return [{ key: 'invalid', block: null }];
  const seen = new Set<string>();
  return blocks.map((block, index) => {
    if (!isContentBlock(block) || seen.has(block.id)) return { key: `__unavailable-${index}`, block: null };
    seen.add(block.id);
    return { key: block.id, block };
  });
}
export function contentHeadings(content: unknown, lessonId: string): HeadingBlock[] {
  return prepareContent(content, lessonId).flatMap(entry => entry.block?.type === 'heading' ? [entry.block] : []);
}
export function validateContentLinks(lessons: readonly { id: string; contentKey: string }[], contents: Record<string, LessonContent>): string[] {
  const errors: string[] = [], globalIds = new Set<string>();
  for (const lesson of lessons) {
    const content = contents[lesson.contentKey];
    if (!content) { errors.push(`正文缺失：${lesson.id}`); continue; }
    errors.push(...validateLessonContent(content).map(error => `${lesson.id}: ${error}`));
    if (content.kind !== 'structured') continue;
    if (content.lessonId !== lesson.id) errors.push(`正文与课时 ID 不匹配：${lesson.id}`);
    for (const block of content.blocks) {
      if (globalIds.has(block.id)) errors.push(`跨正文的内容块 ID 重复：${block.id}`);
      globalIds.add(block.id);
    }
  }
  return errors;
}
