import React from 'react';
import { useTranslation } from 'react-i18next';

const ROW_KEYS = [
  { key: 'knowledgeGraphAI', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'visualAnchoringSidebar', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'airGappedOnPremise', edu: true, canvas: false, d2l: 'partial', bb: 'partial', docebo: false },
  { key: 'aiChavruta', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'aiCourseBuilder10min', edu: true, canvas: 'partial', d2l: 'partial', bb: false, docebo: 'partial' },
  { key: 'graphRAG', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'whiteLabelIncluded', edu: true, canvas: false, d2l: false, bb: false, docebo: 'partial' },
  { key: 'ferpaGdprAirGapped', edu: true, canvas: 'partial', d2l: 'partial', bb: 'partial', docebo: false },
  { key: 'yauPricing', edu: true, canvas: false, d2l: false, bb: false, docebo: 'partial' },
  { key: 'openSourceCore', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'offlineFirstMobile', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
  { key: 'b2b2cPartnerApi', edu: true, canvas: false, d2l: false, bb: false, docebo: false },
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
  const { t } = useTranslation('common');

  return (
    <section
      data-testid="vs-competitors-section"
      className="bg-slate-50 py-20"
      aria-label="Comparison with competitors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('landing.competitors.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            {t('landing.competitors.subtitle')}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[700px] bg-white" role="table" aria-label="LMS comparison table">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 bg-slate-50 sticky left-0 z-10 min-w-[220px]">
                  {t('landing.competitors.feature')}
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
              {ROW_KEYS.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white z-10">
                    {t(`landing.competitors.${row.key}`)}
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
        <p className="text-center text-xs text-slate-500 mt-4">
          {t('landing.competitors.legend')}
        </p>
      </div>
    </section>
  );
}
