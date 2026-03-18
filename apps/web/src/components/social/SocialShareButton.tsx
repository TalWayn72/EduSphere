import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Linkedin, Facebook, Twitter, MessageCircle, Copy, Check } from 'lucide-react';

type Platform = 'linkedin' | 'facebook' | 'twitter' | 'whatsapp' | 'copy';

interface SocialShareButtonProps {
  platform: Platform;
  url: string;
  title: string;
  description?: string;
  variant?: 'icon' | 'full';
}

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: React.ElementType }> = {
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  facebook: { label: 'Facebook', icon: Facebook },
  twitter: { label: 'X (Twitter)', icon: Twitter },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  copy: { label: 'Copy Link', icon: Copy },
};

function buildShareUrl(platform: Platform, url: string, title: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  switch (platform) {
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`;
    case 'copy':
      return null;
  }
}

export function SocialShareButton({ platform, url, title, variant = 'icon' }: SocialShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const config = PLATFORM_CONFIG[platform];
  const Icon = copied && platform === 'copy' ? Check : config.icon;

  const handleClick = useCallback(() => {
    if (platform === 'copy') {
      void navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
      return;
    }
    const shareUrl = buildShareUrl(platform, url, title);
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  }, [platform, url, title]);

  return (
    <Button
      variant="outline"
      size={variant === 'icon' ? 'icon' : 'default'}
      onClick={handleClick}
      aria-label={copied ? 'Copied!' : `Share on ${config.label}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {variant === 'full' && (
        <span className="ml-2">{copied ? 'Copied!' : config.label}</span>
      )}
    </Button>
  );
}
