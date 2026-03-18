import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

export interface RequirementLinkProps {
  /** i18n key for warning text (under 'common' namespace) */
  messageKey?: string;
  /** i18n key for the clickable link text */
  linkTextKey?: string;
  /** Target path, default: "/settings" */
  to?: string;
  /** Query param value for highlight, e.g. "ai-consent" */
  highlight?: string;
  /** 'alert' = destructive box, 'inline' = inline text link */
  variant?: 'inline' | 'alert';
  /** Path to return to after adjusting settings */
  returnTo?: string;
}

export function RequirementLink({
  messageKey = 'consentRequired.message',
  linkTextKey = 'consentRequired.linkText',
  to = '/settings',
  highlight = 'ai-consent',
  variant = 'alert',
  returnTo,
}: RequirementLinkProps) {
  const { t } = useTranslation('common');
  const href = highlight ? `${to}?highlight=${highlight}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}` : to;

  if (variant === 'inline') {
    return (
      <span data-testid="requirement-link">
        {t(messageKey)}{' '}
        <Link
          to={href}
          className="text-primary underline underline-offset-2 hover:text-primary/80 font-medium"
        >
          {t(linkTextKey)}
        </Link>
      </span>
    );
  }

  return (
    <div
      role="alert"
      data-testid="requirement-link"
      className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        {t(messageKey)}{' '}
        <Link
          to={href}
          className="text-destructive underline underline-offset-2 hover:text-destructive/80 font-medium"
        >
          {t(linkTextKey)}
        </Link>
      </span>
    </div>
  );
}
