import type { Meta, StoryObj } from '@storybook/react';
import { SocialLinksBar, DEFAULT_SOCIAL_LINKS } from './SocialLinksBar';

const meta: Meta<typeof SocialLinksBar> = {
  title: 'Social/SocialLinksBar',
  component: SocialLinksBar,
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof SocialLinksBar>;

export const Default: Story = {
  args: { links: DEFAULT_SOCIAL_LINKS },
};

export const AllLinks: Story = {
  args: {
    links: {
      linkedin: 'https://linkedin.com/company/edusphere',
      facebook: 'https://facebook.com/edusphere',
      twitter: 'https://twitter.com/edusphere',
      youtube: 'https://youtube.com/edusphere',
      instagram: 'https://instagram.com/edusphere',
      whatsapp: 'https://wa.me/1234567890',
      github: 'https://github.com/edusphere',
    },
  },
};

export const SmallSize: Story = {
  args: { links: DEFAULT_SOCIAL_LINKS, size: 'sm' },
};

export const SingleLink: Story = {
  args: { links: { github: 'https://github.com/edusphere' } },
};
