import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { PageMeta, FAQSchema, BreadcrumbSchema, OrganizationSchema } from '@/components/seo';
import { FAQ_ITEMS } from '@/lib/aeo-data';
import { Input } from '@/components/ui/input';

const CATEGORIES = [
  { id: 'all', label: 'All Questions' },
  { id: 'platform', label: 'Platform' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'technical', label: 'Technical' },
  { id: 'enterprise', label: 'Enterprise' },
];

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

function AccordionItem({ question, answer, isOpen, onToggle, index }: AccordionItemProps) {
  return (
    <div
      className="border border-gray-200 dark:border-border rounded-lg overflow-hidden"
      itemScope
      itemType="https://schema.org/Question"
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
        id={`faq-question-${index}`}
        className="w-full flex items-center justify-between p-5 text-left bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-accent/30 transition-colors"
      >
        <span
          className="font-medium text-gray-900 dark:text-foreground pr-4"
          itemProp="name"
        >
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-indigo-600 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
        )}
      </button>
      {isOpen && (
        <div
          id={`faq-answer-${index}`}
          role="region"
          aria-labelledby={`faq-question-${index}`}
          itemScope
          itemType="https://schema.org/Answer"
          className="px-5 pb-5 bg-white dark:bg-card"
        >
          <p
            className="text-gray-600 dark:text-muted-foreground leading-relaxed"
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
        title="Frequently Asked Questions"
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

      <div className="min-h-screen bg-gray-50 dark:bg-background">
        {/* Header */}
        <div className="bg-indigo-700 text-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-indigo-200 text-lg mb-8">
              Everything you need to know about EduSphere.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white text-gray-900 border-0"
                aria-label="Search frequently asked questions"
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={activeCategory === cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setOpenIndex(null);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-card text-gray-600 dark:text-muted-foreground hover:bg-indigo-50 dark:hover:bg-accent border border-gray-200 dark:border-border'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-muted-foreground">
              <p>No questions found matching &ldquo;{searchQuery}&rdquo;.</p>
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
                  onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-12 p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
              Still have questions?
            </h2>
            <p className="text-gray-600 dark:text-muted-foreground mb-4">
              Our team is happy to help. Reach out and we&apos;ll respond within one business day.
            </p>
            <a
              href="mailto:support@edusphere.dev"
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </main>
      </div>
    </>
  );
}

export default FaqPage;
