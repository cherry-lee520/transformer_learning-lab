import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/PageContainer';
export function NotFound() {
  return <PageContainer eyebrow="404 · PAGE NOT FOUND" title="这个知识节点还不存在" description="页面地址可能有误。回到学习概览，继续你的探索吧。"><Link className="button primary" to="/"><ArrowLeft size={17} /> 返回学习概览</Link></PageContainer>;
}
