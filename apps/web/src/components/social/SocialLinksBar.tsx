import React from 'react';
import { Linkedin, Facebook, Twitter, Youtube, Instagram, MessageCircle, Github } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialLinks {
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  instagram?: string;
  whatsapp?: string;
  github?: string;
}

interface SocialLinksBarProps {
  links: SocialLinks;
  size?: 'sm' | 'md';
  className?: string;
}

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  linkedin: 'https://linkedin.com/company/edusphere',
  twitter: 'https://twitter.com/edusphere',
  github: 'https://github.com/edusphere',
};

const ICON_MAP: Record<keyof SocialLinks, { icon: React.ElementType; label: string }> = {
  linkedin: { icon: Linkedin, label: 'LinkedIn' },
  facebook: { icon: Facebook, label: 'Facebook' },
  twitter: { icon: Twitter, label: 'Twitter' },
  youtube: { icon: Youtube, label: 'YouTube' },
  instagram: { icon: Instagram, label: 'Instagram' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  github: { icon: Github, label: 'GitHub' },
};

const SIZE_CLASSES = { sm: 'h-4 w-4', md: 'h-5 w-5' } as const;

export function SocialLinksBar({ links, size = 'sm', className }: SocialLinksBarProps) {
  const entries = (Object.keys(ICON_MAP) as Array<keyof SocialLinks>).filter(
    (key) => links[key],
  );

  if (entries.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-3', className)} role="list" aria-label="Social links">
      {entries.map((key) => {
        const { icon: Icon, label } = ICON_MAP[key];
        return (
          <a
            key={key}
            href={links[key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            role="listitem"
            className="text-slate-400 hover:text-white transition-colors dark:text-slate-500"
          >
            <Icon className={SIZE_CLASSES[size]} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
