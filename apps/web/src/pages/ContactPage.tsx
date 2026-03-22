/* eslint-disable edusphere-design-system/require-page-shell -- multi-section layout */
import { useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { PageMeta } from '@/components/seo';
import { PublicLayout } from '@/components/PublicLayout';

const SUBJECTS = ['General', 'Sales', 'Support', 'Partnership'] as const;

const INFO_CARDS = [
  { Icon: Mail, label: 'Email', value: 'hello@edusphere.dev' },
  { Icon: Phone, label: 'Phone', value: '+1-888-EDU-SPHR' },
  { Icon: MapPin, label: 'HQ', value: 'San Francisco, CA' },
] as const;

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PublicLayout navVariant="minimal">
      <PageMeta title="Contact Us | EduSphere" description="Get in touch with the EduSphere team." />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-900 dark:text-white">Contact Us</h1>

        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          {INFO_CARDS.map(({ Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm">
              <Icon className="mb-3 h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h2 className="text-sm font-medium text-gray-500 dark:text-slate-300">{label}</h2>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {submitted ? (
          <div role="status" className="rounded-xl bg-green-50 dark:bg-green-900/30 p-8 text-center">
            <p className="text-lg font-semibold text-green-800 dark:text-green-300">Thank you! We&apos;ll be in touch soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl bg-white dark:bg-slate-800 p-8 shadow-sm">
            <div className="mb-4">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Name</label>
              <input id="name" type="text" required className="w-full rounded-lg border px-4 py-2 dark:text-white dark:placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Email</label>
              <input id="email" type="email" required className="w-full rounded-lg border px-4 py-2 dark:text-white dark:placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <div className="mb-4">
              <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Subject</label>
              <select id="subject" required className="w-full rounded-lg border px-4 py-2 dark:text-white dark:bg-slate-700 dark:border-slate-600">
                <option value="">Select a subject</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">Message</label>
              <textarea id="message" rows={4} required className="w-full rounded-lg border px-4 py-2 dark:text-white dark:placeholder:text-slate-400 dark:bg-slate-700 dark:border-slate-600" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:text-white">
              Send Message
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}

export default ContactPage;
