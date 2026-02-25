import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TERMS_OF_SERVICE, CONTENT_MODERATION_GUIDELINES } from '@/T&Cs';

export const metadata = {
  title: 'Terms of Service | Nima AI',
  description: 'Terms of Service for Nima AI — your personal AI stylist.',
};

export default function TermsAndConditionsPage() {
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
            {TERMS_OF_SERVICE.title}
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <p className="text-sm text-muted-foreground mb-8">
          Effective Date: {TERMS_OF_SERVICE.effectiveDate}
        </p>

        <div className="space-y-8">
          {TERMS_OF_SERVICE.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-serif font-semibold text-foreground mb-3">
                {section.heading}
              </h2>

              {'content' in section && section.content && (
                <p className="text-sm leading-relaxed text-foreground/90 mb-3">
                  {section.content}
                </p>
              )}

              {'list' in section && section.list && (
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

              {'footer' in section && section.footer && (
                <p className="text-sm leading-relaxed text-foreground/90 mt-3">
                  {section.footer}
                </p>
              )}
            </section>
          ))}
        </div>

        {/* Content Moderation Guidelines */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-xl font-serif font-semibold text-foreground mb-4">
            {CONTENT_MODERATION_GUIDELINES.title}
          </h2>
          <ul className="space-y-2 ml-1">
            {CONTENT_MODERATION_GUIDELINES.rules.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nima AI Inc. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link
              href="/privacyPolicy"
              className="text-xs text-secondary hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

