import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  PRIVACY_POLICY,
  DATA_HANDLING_POLICY,
  COOKIE_POLICY,
  AI_TRANSPARENCY_NOTICE,
  PERMISSIONS_JUSTIFICATION,
} from '@/Policies';

export const metadata = {
  title: 'Privacy Policy | Nima AI',
  description: 'Privacy Policy for Nima AI — your personal AI stylist.',
};

/**
 * Renders a generic policy section with optional content, list, subsections, paragraphs, and footer.
 */
function PolicySection({
  section,
}: {
  section: {
    heading: string;
    content?: string;
    paragraphs?: readonly string[];
    list?: readonly string[];
    footer?: string;
    subsections?: readonly {
      subheading: string;
      content?: string;
      list?: readonly string[];
      footer?: string;
    }[];
  };
}) {
  return (
    <section>
      <h2 className="text-xl font-serif font-semibold text-foreground mb-3">
        {section.heading}
      </h2>

      {section.paragraphs &&
        section.paragraphs.map((p, i) => (
          <p
            key={i}
            className="text-sm leading-relaxed text-foreground/90 mb-3"
          >
            {p}
          </p>
        ))}

      {section.content && (
        <p className="text-sm leading-relaxed text-foreground/90 mb-3">
          {section.content}
        </p>
      )}

      {section.list && (
        <ul className="space-y-2 ml-1">
          {section.list.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {section.subsections &&
        section.subsections.map((sub, i) => (
          <div key={i} className="mt-4 ml-2">
            <h3 className="text-base font-serif font-medium text-foreground mb-2">
              {sub.subheading}
            </h3>
            {sub.content && (
              <p className="text-sm leading-relaxed text-foreground/90 mb-2">
                {sub.content}
              </p>
            )}
            {sub.list && (
              <ul className="space-y-2 ml-1">
                {sub.list.map((item, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {sub.footer && (
              <p className="text-sm leading-relaxed text-foreground/90 mt-2 italic">
                {sub.footer}
              </p>
            )}
          </div>
        ))}

      {section.footer && (
        <p className="text-sm leading-relaxed text-foreground/90 mt-3">
          {section.footer}
        </p>
      )}
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="text-lg font-serif font-semibold text-foreground">
            {PRIVACY_POLICY.title}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-8">
          <p>Effective Date: {PRIVACY_POLICY.effectiveDate}</p>
          <p>Last Updated: {PRIVACY_POLICY.lastUpdated}</p>
          <p>Company: {PRIVACY_POLICY.company}</p>
          <p>
            Website:{' '}
            <a
              href={PRIVACY_POLICY.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              {PRIVACY_POLICY.website}
            </a>
          </p>
          <p>Contact: {PRIVACY_POLICY.contact}</p>
        </div>

        {/* Privacy Policy Sections */}
        <div className="space-y-8">
          {PRIVACY_POLICY.sections.map((section, idx) => (
            <PolicySection key={idx} section={section} />
          ))}
        </div>

        {/* Data Handling Policy */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
            {DATA_HANDLING_POLICY.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {DATA_HANDLING_POLICY.company} &mdash;{' '}
            <a
              href={`https://${DATA_HANDLING_POLICY.website.replace('https://', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              {DATA_HANDLING_POLICY.website}
            </a>
          </p>
          <div className="space-y-8">
            {DATA_HANDLING_POLICY.sections.map((section, idx) => (
              <PolicySection key={idx} section={section} />
            ))}
          </div>
        </div>

        {/* Cookie Policy */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
            {COOKIE_POLICY.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {COOKIE_POLICY.company} &mdash;{' '}
            <a
              href={COOKIE_POLICY.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              {COOKIE_POLICY.website}
            </a>
          </p>
          <div className="space-y-8">
            {COOKIE_POLICY.sections.map((section, idx) => (
              <PolicySection key={idx} section={section} />
            ))}
          </div>
        </div>

        {/* AI Transparency Notice */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
            {AI_TRANSPARENCY_NOTICE.title}
          </h2>
          <ul className="space-y-2 ml-1">
            {AI_TRANSPARENCY_NOTICE.points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Permissions Justification */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
            {PERMISSIONS_JUSTIFICATION.title}
          </h2>
          <div className="space-y-4">
            {PERMISSIONS_JUSTIFICATION.permissions.map((perm, i) => (
              <div key={i}>
                <h3 className="text-base font-serif font-medium text-foreground">
                  {perm.name}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90 mt-1">
                  {perm.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nima AI Inc. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link
              href="/termsAndConditions"
              className="text-xs text-secondary hover:underline"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

