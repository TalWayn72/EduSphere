import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Share2,
  Linkedin,
  Facebook,
  Twitter,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';

interface SocialShareMenuProps {
  url: string;
  title: string;
  description?: string;
  triggerLabel?: string;
}

const SHARE_ITEMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'twitter', label: 'X (Twitter)', icon: Twitter },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
] as const;

function buildShareUrl(key: string, url: string, title: string): string {
  const eu = encodeURIComponent(url);
  const et = encodeURIComponent(title);
  const urls: Record<string, string> = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${eu}`,
    twitter: `https://twitter.com/intent/tweet?url=${eu}&text=${et}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`,
  };
  return urls[key] ?? '';
}

export function SocialShareMenu({
  url,
  title,
  triggerLabel = 'Share',
}: SocialShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleShare = useCallback(
    (key: string) => {
      const shareUrl = buildShareUrl(key, url, title);
      if (shareUrl)
        window.open(
          shareUrl,
          '_blank',
          'noopener,noreferrer,width=600,height=400'
        );
    },
    [url, title]
  );

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  const CopyIcon = copied ? Check : Copy;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={triggerLabel}>
          <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SHARE_ITEMS.map(({ key, label, icon: Icon }) => (
          <DropdownMenuItem key={key} onClick={() => handleShare(key)}>
            <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={handleCopy}>
          <CopyIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          {copied ? 'Copied!' : 'Copy Link'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
