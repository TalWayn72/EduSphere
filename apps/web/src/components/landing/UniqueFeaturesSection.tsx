import React from 'react';
import { Network, Image, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    icon: Network,
    title: 'Knowledge Graph Intelligence',
    desc: 'Multi-hop reasoning across your entire knowledge base. Students explore concept relationships instead of linear content.',
    detail: '45–71% fewer AI hallucinations vs standard RAG',
    badge: 'GraphRAG Native',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  {
    icon: Image,
    title: 'Visual Anchoring Sidebar',
    desc: 'Auto-semantic anchors on images, diagrams, and documents. Every visual element becomes an interactive knowledge node.',
    detail: '+30% knowledge retention in visual-heavy subjects',
    badge: 'Patent Pending',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    icon: Zap,
    title: 'AI Course Builder',
    desc: 'Build a complete course in 10 minutes from a prompt, syllabus, or URL. AI generates modules, lessons, and quizzes automatically.',
    detail: '60% instructor time savings on course creation',
    badge: 'Unique in LMS Market',
    badgeColor: 'bg-green-100 text-green-700 border-green-200',
  },
];

export function UniqueFeaturesSection() {
  return (
    <section
      data-testid="unique-features-section"
      className="bg-white py-20"
      aria-label="Unique features"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Three Capabilities No Other LMS Offers
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Not incremental improvements — architectural breakthroughs that change how learning works.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, detail, badge, badgeColor }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Indigo gradient top border */}
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" aria-hidden="true" />
              <div className="p-7">
                <div className="p-3 rounded-xl bg-indigo-50 inline-flex mb-5">
                  <Icon className="h-7 w-7 text-indigo-600" aria-hidden="true" />
                </div>
                <div className="mb-3">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold mb-3 ${badgeColor}`}
                  >
                    {badge}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">{desc}</p>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-green-600 font-bold text-sm" aria-hidden="true">✓</span>
                  <span className="text-sm font-semibold text-slate-700">{detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
