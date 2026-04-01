import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  PageMeta,
  FAQSchema,
  BreadcrumbSchema,
  OrganizationSchema,
} from '@/components/seo';
import { FAQ_ITEMS } from '@/lib/aeo-data';
import { Input } from '@/components/ui/input';
import { PublicLayout } from '@/components/PublicLayout';

const CATEGORY_IDS = [
  'all',
  'platform',
  'pricing',
  'technical',
  'enterprise',
] as const;

const CATEGORY_MAP: Record<string, number[]> = {
  platform: [0, 1, 2, 8, 9, 13, 15, 16],
  pricing: [3, 16, 17],
  technical: [4, 5, 6, 10, 11, 14, 18, 19],
  enterprise: [6, 7, 10, 16, 17, 18],
};

interface AccordionItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: AccordionItemProps) {
  return (
    <div
      className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
      itemScope
      itemType="https://schema.org/Question"
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
        id={`faq-question-${index}`}
        className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <span
          className="font-medium text-gray-900 dark:text-white pr-4"
          itemProp="name"
        >
          {question}
        </span>
        {isOpen ? (
          <ChevronUp
            className="h-5 w-5 text-indigo-600 flex-shrink-0 dark:text-indigo-400"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-5 w-5 text-gray-400 dark:text-slate-400 flex-shrink-0"
            aria-hidden="true"
          />
        )}
      </button>
      {isOpen && (
        <div
          id={`faq-answer-${index}`}
          role="region"
          aria-labelledby={`faq-question-${index}`}
          itemScope
          itemType="https://schema.org/Answer"
          className="px-5 pb-5 bg-white dark:bg-slate-800"
        >
          <p
            className="text-gray-600 dark:text-slate-300 leading-relaxed"
            itemProp="text"
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}

export function FaqPage() {
  const { t } = useTranslation('common');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = FAQ_ITEMS.filter((item, index) => {
    const matchesCategory =
      activeCategory === 'all' ||
      (CATEGORY_MAP[activeCategory]?.includes(index) ?? false);
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <PageMeta
        title={t('faq.pageTitle')}
        description="Find answers to common questions about EduSphere: AI tutoring, pricing plans, SCORM support, accessibility, enterprise features, and more."
        canonical="https://app.edusphere.dev/faq"
      />
      <FAQSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema
        items={[
          { name: 'EduSphere', url: 'https://app.edusphere.dev/landing' },
          { name: 'FAQ', url: 'https://app.edusphere.dev/faq' },
        ]}
      />
      <OrganizationSchema />

      <PublicLayout navVariant="minimal">
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
          {/* Header */}
          <div className="bg-indigo-700 text-white py-16 dark:bg-indigo-400 dark:text-white">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
                {t('faq.heading')}
              </h1>
              <p className="text-indigo-100 text-lg mb-8 dark:text-indigo-300">
                {t('faq.subtitle')}
              </p>
              <div className="relative max-w-xl mx-auto">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder={t('faq.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border-0"
                  aria-label={t('faq.searchLabel')}
                />
              </div>
            </div>
          </div>

          <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Category Tabs */}
            <div
              role="tablist"
              aria-label="FAQ categories"
              className="flex flex-wrap gap-2 mb-8"
            >
              {CATEGORY_IDS.map((id) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeCategory === id}
                  onClick={() => {
                    setActiveCategory(id);
                    setOpenIndex(null);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }`}
                >
                  {t(`faq.categories.${id}`)}
                </button>
              ))}
            </div>

            {/* FAQ Accordion */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <p>{t('faq.noResults', { query: searchQuery })}</p>
              </div>
            ) : (
              <div
                className="space-y-3"
                itemScope
                itemType="https://schema.org/FAQPage"
              >
                {filteredItems.map((item, index) => (
                  <AccordionItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                    isOpen={openIndex === index}
                    onToggle={() =>
                      setOpenIndex(openIndex === index ? null : index)
                    }
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* Contact CTA */}
            <div className="mt-12 p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('faq.stillHaveQuestions')}
              </h2>
              <p className="text-gray-600 dark:text-slate-300 mb-4">
                {t('faq.contactCta')}
              </p>
              <a
                href="mailto:support@edusphere.dev"
                className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors dark:bg-indigo-500 dark:text-white"
              >
                {t('faq.contactSupport')}
              </a>
            </div>
          </main>
        </div>
      </PublicLayout>
    </>
  );
}

export default FaqPage;
