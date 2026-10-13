import { QuizProvider, useQuiz } from '../../store/QuizProvider';
import { QuizRenderer } from '../../components/lesson/QuizRenderer';
import { ACTIVATION_CHALLENGES } from './challenges';
const scope = 'laboratory-activation';
function ChallengeSet() {
  const { attempts } = useQuiz();
  const completed = ACTIVATION_CHALLENGES.filter(block => attempts[scope]?.[block.id]?.correct).length;
  return <section className="panel ag-module" id="activation-challenges" aria-labelledby="ag-challenges-heading"><div className="ag-section-heading"><div><span className="eyebrow">05-E · CHECK YOUR UNDERSTANDING</span><h2 id="ag-challenges-heading">四个挑战，验证你的理解</h2></div><span className="ag-challenge-count">{'答对 ' + completed + '/' + ACTIVATION_CHALLENGES.length}</span></div><p className="ag-intro">显式提交后显示正误和中文解析，可以重试。这里的答题状态独立于课程学习进度；离开实验页或刷新后清空。</p><div className="ag-challenge-grid">{ACTIVATION_CHALLENGES.map(block => <div key={block.id} data-ag-challenge={block.id}><QuizRenderer block={block} lessonId={scope} /></div>)}</div></section>;
}
export function ActivationChallenges() { return <QuizProvider><ChallengeSet /></QuizProvider>; }
