import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Laboratory } from './pages/Laboratory';
import { Paper } from './pages/Paper';
import { Progress } from './pages/Progress';
import { NotFound } from './pages/NotFound';
import { LearningProvider } from './store/LearningProvider';
import { QuizProvider } from './store/QuizProvider';
const Lessons = lazy(() => import('./pages/Lessons').then(module => ({ default: module.Lessons })));
const NeuronLaboratory = lazy(() => import('./pages/NeuronLaboratory').then(module => ({ default: module.NeuronLaboratory })));
const ActivationLaboratory = lazy(() => import('./pages/ActivationLaboratory').then(module => ({ default: module.ActivationLaboratory })));
const NeuralNetworkLaboratory = lazy(() => import('./pages/NeuralNetworkLaboratory').then(module => ({ default: module.NeuralNetworkLaboratory })));
const LanguageRepresentationLaboratory = lazy(() => import('./pages/LanguageRepresentationLaboratory').then(module => ({ default: module.LanguageRepresentationLaboratory })));
const AttentionLaboratory = lazy(() => import('./pages/AttentionLaboratory').then(module => ({ default: module.AttentionLaboratory })));
const TransformerLaboratory = lazy(() => import('./pages/TransformerLaboratory').then(module => ({ default: module.TransformerLaboratory })));
const TransformerTrainingLaboratory = lazy(() => import('./pages/TransformerTrainingLaboratory').then(module => ({ default: module.TransformerTrainingLaboratory })));
function LessonPage() {
  return <Suspense fallback={<div className="page-container" role="status">正在加载教材…</div>}><Lessons /></Suspense>;
}

export default function App() {
  return <LearningProvider><QuizProvider><Routes><Route element={<AppLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="lessons" element={<LessonPage />} />
    <Route path="lessons/:lessonId" element={<LessonPage />} />
    <Route path="laboratory" element={<Laboratory />} />
    <Route path="laboratory/activation" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><ActivationLaboratory /></Suspense>} />
    <Route path="laboratory/neural-network" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><NeuralNetworkLaboratory /></Suspense>} />
    <Route path="laboratory/language-representation" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><LanguageRepresentationLaboratory /></Suspense>} />
    <Route path="laboratory/attention" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><AttentionLaboratory /></Suspense>} />
    <Route path="laboratory/transformer" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><TransformerLaboratory /></Suspense>} />
    <Route path="laboratory/transformer-training" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><TransformerTrainingLaboratory /></Suspense>} />
    <Route path="laboratory/:experimentId" element={<Suspense fallback={<div className="page-container" role="status">正在加载实验…</div>}><NeuronLaboratory /></Suspense>} />
    <Route path="paper" element={<Paper />} />
    <Route path="progress" element={<Progress />} />
    <Route path="*" element={<NotFound />} />
  </Route></Routes></QuizProvider></LearningProvider>;
}
