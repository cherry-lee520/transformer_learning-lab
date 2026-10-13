export interface PaperAssociation {
  paperSection?: string;
  paperPage?: number;
  paperEquation?: string;
  relatedExperimentId?: string;
}
export interface BlockBase extends PaperAssociation { id: string }
export type InlinePart = string | { type: 'math'; latex: string; label?: string };
export interface HeadingBlock extends BlockBase { type: 'heading'; level: 2 | 3; title: string }
export interface TextBlock extends BlockBase { type: 'text'; paragraphs: InlinePart[][]; bullets?: InlinePart[][] }
export interface SymbolAnnotation { id: string; latex: string; label: string; description: string }
export interface FormulaBlock extends BlockBase {
  type: 'formula'; latex: string; label: string; display?: boolean; symbols?: SymbolAnnotation[];
}
export interface CodeExample { language: 'python' | 'c'; code: string }
export interface CodeBlock extends BlockBase { type: 'code'; title: string; examples: CodeExample[]; lineNumbers?: boolean }
export interface CalloutBlock extends BlockBase { type: 'callout'; tone: 'info' | 'tip' | 'warning'; title: string; text: string }
export interface ImageBlock extends BlockBase { type: 'image'; src: string; alt: string; caption?: string }
export interface Option { id: string; text: string }
interface QuestionBase { prompt: string; explanation: string }
export interface SingleQuestion extends QuestionBase { kind: 'single'; options: Option[]; correctOptionId: string }
export interface MultipleQuestion extends QuestionBase { kind: 'multiple'; options: Option[]; correctOptionIds: string[] }
export interface NumericQuestion extends QuestionBase { kind: 'numeric'; answer: number; tolerance: number }
export type QuizQuestion = SingleQuestion | MultipleQuestion | NumericQuestion;
export type QuizAnswer = string | string[];
export interface QuizBlock extends BlockBase { type: 'quiz'; question: QuizQuestion }
export interface NeuronParameters { x: number; w: number; b: number }
export interface InteractiveBlock extends BlockBase { type: 'interactive'; demo: 'linear-neuron'; title: string; defaults: NeuronParameters }
export type ContentBlock = HeadingBlock | TextBlock | FormulaBlock | CodeBlock | CalloutBlock | ImageBlock | QuizBlock | InteractiveBlock;
export interface PlaceholderContent { intro: string; objectives: string[]; kind?: 'placeholder' }
export interface StructuredLessonContent {
  kind: 'structured'; version: 1; lessonId: string; intro: string; objectives: string[]; blocks: ContentBlock[];
}
export type LessonContent = PlaceholderContent | StructuredLessonContent;
