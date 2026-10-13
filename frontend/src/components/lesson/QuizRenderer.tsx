import { useState } from 'react';
import type { FormEvent } from 'react';
import type { QuizBlock, QuizAnswer } from '../../lessons/contentTypes';
import { judgeAnswer } from '../../services/quiz';
import { useQuiz } from '../../store/QuizProvider';
export function QuizRenderer({ block, lessonId }: { block: QuizBlock; lessonId: string }) {
  const { attempts, record } = useQuiz();
  const previous = attempts[lessonId]?.[block.id];
  const [answer, setAnswer] = useState<QuizAnswer>(() => previous?.answer ?? (block.question.kind === 'multiple' ? [] : ''));
  const [error, setError] = useState('');
  const question = block.question;
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = judgeAnswer(question, answer);
    if (!result.valid) { setError(question.kind === 'numeric' ? '请输入有效的有限数字。' : '请先选择答案。'); return; }
    setError('');
    record(lessonId, block.id, { answer: Array.isArray(answer) ? [...answer] : answer, correct: result.correct, submittedAt: new Date().toISOString() });
  }
  function retry() { record(lessonId, block.id, null); setAnswer(question.kind === 'multiple' ? [] : ''); setError(''); }
  return <form className="quiz-card" onSubmit={submit} noValidate><span className="eyebrow">{question.kind === 'single' ? '单选题' : question.kind === 'multiple' ? '多选题 · 选择所有正确项' : '数值计算题'}</span><fieldset disabled={!!previous}><legend>{question.prompt}</legend>{question.kind === 'numeric' ? <label className="numeric-answer">你的答案<input type="number" step="any" value={typeof answer === 'string' ? answer : ''} onChange={event => setAnswer(event.target.value)} /><small>绝对误差容限：{question.tolerance}</small></label> : <div className="quiz-options">{question.options.map(option => <label key={option.id}><input type={question.kind === 'single' ? 'radio' : 'checkbox'} name={`${lessonId}-${block.id}`} value={option.id} checked={question.kind === 'single' ? answer === option.id : Array.isArray(answer) && answer.includes(option.id)} onChange={event => question.kind === 'single' ? setAnswer(option.id) : setAnswer(current => event.target.checked ? [...(Array.isArray(current) ? current : []), option.id] : (Array.isArray(current) ? current : []).filter(id => id !== option.id))} /><span>{option.text}</span></label>)}</div>}</fieldset>
    {error && <p role="alert" className="parameter-error">{error}</p>}{previous ? <><div className={`quiz-feedback ${previous.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{previous.correct ? '回答正确' : '这次还不正确'}</strong><h4>答案解析</h4><p>{question.explanation}</p></div><button type="button" className="button secondary" onClick={retry}>重新作答</button></> : <button className="button primary" type="submit">提交答案</button>}
  </form>;
}
