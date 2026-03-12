import React from 'react';

const ROWS = [
  { feature: 'Knowledge Graph AI', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'Visual Anchoring Sidebar', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'Air-Gapped / On-Premise', edu: true, canvas: false, d2l: 'partial', bb: 'partial', docebo: false },
  { feature: 'AI Chavruta Tutor', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'AI Course Builder (10 min)', edu: true, canvas: 'partial', d2l: 'partial', bb: false, docebo: 'partial' },
  { feature: 'GraphRAG (45–71% fewer hallucinations)', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'White-label Included', edu: true, canvas: false, d2l: false, bb: false, docebo: 'partial' },
  { feature: 'FERPA + GDPR + Air-Gapped', edu: true, canvas: 'partial', d2l: 'partial', bb: 'partial', docebo: false },
  { feature: 'YAU-based pricing', edu: true, canvas: false, d2l: false, bb: false, docebo: 'partial' },
  { feature: 'Open-source core', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'Offline-first mobile', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { feature: 'B2B2C Partner API', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
] as const;

type CellValue = boolean | 'partial';

function Cell({ val, highlight = false }: { val: CellValue; highlight?: boolean }) {
  if (val === true) {
    return (
      <td className={`px-4 py-3 text-center text-base ${highlight ? 'bg-indigo-50' : ''}`}>
        <span className="text-green-600 font-bold" aria-label="Yes">✅</span>
      </td>
    );
  }
  if (val === 'partial') {
    return (
      <td className="px-4 py-3 text-center text-base">
        <span className="text-amber-500 font-bold" aria-label="Partial">⚠️</span>
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-center text-base">
      <span className="text-red-400 font-bold" aria-label="No">❌</span>
    </td>
  );
}

export function VsCompetitorsSection() {
  return (
    <section
      data-testid="vs-competitors-section"
      className="bg-slate-50 py-20"
      aria-label="Comparison with competitors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Why Switch from Canvas, D2L, or Blackboard?
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            EduSphere leads on every dimension that matters to modern institutions.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[700px] bg-white" role="table" aria-label="LMS comparison table">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 bg-slate-50 sticky left-0 z-10 min-w-[220px]">
                  Feature
                </th>
                <th className="px-4 py-4 text-center text-sm font-bold text-indigo-700 bg-indigo-50 min-w-[110px]">
                  EduSphere
                </th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-slate-600 min-w-[90px]">Canvas</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-slate-600 min-w-[90px]">D2L</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-slate-600 min-w-[110px]">Blackboard</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-slate-600 min-w-[90px]">Docebo</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                    {row.feature}
                  </td>
                  <Cell val={row.edu} highlight />
                  <Cell val={row.canvas} />
                  <Cell val={row.d2l} />
                  <Cell val={row.bb} />
                  <Cell val={row.docebo} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          ✅ Yes &nbsp;⚠️ Partial / Add-on cost &nbsp;❌ Not available — Based on publicly available documentation, Q1 2026
        </p>
      </div>
    </section>
  );
}
