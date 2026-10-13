import { Component } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ContentBlock, HeadingBlock, TextBlock, FormulaBlock, CodeBlock, CalloutBlock, ImageBlock, QuizBlock, InteractiveBlock, InlinePart } from '../../lessons/contentTypes';
import { blockAnchor, prepareContent } from '../../lessons/contentValidation';
import { useQuiz } from '../../store/QuizProvider';
import { AnnotatedFormula, MathFormula } from './MathFormula';
import { CodeViewer } from './CodeViewer';
import { NeuronDemo } from './NeuronDemo';
import { QuizRenderer } from './QuizRenderer';
import { experimentPath } from '../../experiments/catalog';

interface BlockProps<B extends ContentBlock> { block: B; lessonId: string }
function Inline({ parts }: { parts: InlinePart[] }) { return <>{parts.map((part, index) => typeof part === 'string' ? part : <MathFormula key={index} latex={part.latex} label={part.label} />)}</>; }
function Heading({ block }: BlockProps<HeadingBlock>) { return block.level === 2 ? <h3>{block.title}</h3> : <h4>{block.title}</h4>; }
function Text({ block }: BlockProps<TextBlock>) { return <>{block.paragraphs.map((parts, index) => <p key={index}><Inline parts={parts} /></p>)}{block.bullets && <ul>{block.bullets.map((parts, index) => <li key={index}><Inline parts={parts} /></li>)}</ul>}</>; }
function Formula({ block }: BlockProps<FormulaBlock>) { return <AnnotatedFormula block={block} />; }
function Code({ block }: BlockProps<CodeBlock>) { return <CodeViewer title={block.title} examples={block.examples} lineNumbers={block.lineNumbers} />; }
function Callout({ block }: BlockProps<CalloutBlock>) { return <aside className={`lesson-callout callout-${block.tone}`} role="note"><strong>{block.title}</strong><p>{block.text}</p></aside>; }
function Image({ block }: BlockProps<ImageBlock>) { return <figure className="lesson-image"><img src={block.src} alt={block.alt} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.querySelector<HTMLElement>('.image-fallback')?.removeAttribute('hidden'); }} /><p className="image-fallback" hidden>配图暂时无法加载：{block.alt}</p>{block.caption && <figcaption>{block.caption}</figcaption>}</figure>; }
function Quiz({ block, lessonId }: BlockProps<QuizBlock>) { return <QuizRenderer block={block} lessonId={lessonId} />; }
function Interactive({ block }: BlockProps<InteractiveBlock>) { return <div className="interactive-card"><h4>{block.title}</h4><NeuronDemo defaults={block.defaults} /></div>; }

/** A mapped registry makes a newly added union member require a matching renderer. */
export const blockRegistry = { heading: Heading, text: Text, formula: Formula, code: Code, callout: Callout, image: Image, quiz: Quiz, interactive: Interactive } satisfies { [K in ContentBlock['type']]: ComponentType<BlockProps<Extract<ContentBlock, { type: K }>>> };
function RegisteredBlock<B extends ContentBlock>({ block, lessonId }: BlockProps<B>) {
  // Validation and the mapped registry guarantee that this key matches its props.
  const Renderer = blockRegistry[block.type] as ComponentType<BlockProps<B>>;
  return <Renderer block={block} lessonId={lessonId} />;
}
function UnavailableBlock() { return <aside className="lesson-callout callout-warning" role="note">此内容块暂不可用，其他内容仍可继续阅读。</aside>; }
class BlockBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <UnavailableBlock /> : this.props.children; }
}
export function LessonRenderer({ content, lessonId }: { content: unknown; lessonId: string }) {
  const entries = prepareContent(content, lessonId);
  const { attempts } = useQuiz();
  const quizIds = entries.flatMap(entry => entry.block?.type === 'quiz' ? [entry.block.id] : []);
  const submitted = quizIds.filter(id => attempts[lessonId]?.[id]).length;
  return <div className="lesson-renderer">{quizIds.length > 0 && <p className="quiz-session-note">随堂练习：已提交 {submitted}/{quizIds.length} 题。作答记录保留在本次会话，刷新后清空；课时完成状态独立保存。</p>}{entries.map(entry => <div className={`lesson-block ${entry.block?.type === 'heading' ? 'heading-block' : ''}`} id={blockAnchor(lessonId, entry.key)} key={entry.key}><BlockBoundary>{entry.block ? <><RegisteredBlock block={entry.block} lessonId={lessonId} />{(entry.block.paperSection || entry.block.paperPage || entry.block.paperEquation || entry.block.relatedExperimentId) && <div className="block-associations">{(entry.block.paperSection || entry.block.paperPage || entry.block.paperEquation) && <Link to="/paper">论文关联{entry.block.paperSection ? ` · 第 ${entry.block.paperSection} 节` : ''}{entry.block.paperPage ? ` · 第 ${entry.block.paperPage} 页` : ''}{entry.block.paperEquation ? ` · 公式 ${entry.block.paperEquation}` : ''}</Link>}{entry.block.relatedExperimentId && <Link to={experimentPath(entry.block.relatedExperimentId, lessonId)}>打开关联实验</Link>}</div>}</> : <UnavailableBlock />}</BlockBoundary></div>)}</div>;
}
