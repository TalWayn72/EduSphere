import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AITransparencyBadge } from './AITransparencyBadge';
import { TooltipProvider } from '@/components/ui/tooltip';

const meta: Meta<typeof AITransparencyBadge> = {
  title: 'AI/AITransparencyBadge',
  component: AITransparencyBadge,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="p-8">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<typeof AITransparencyBadge>;

export const Assessment: Story = {
  args: { type: 'assessment', confidence: 0.92 },
};

export const Recommendation: Story = {
  args: { type: 'recommendation', confidence: 0.85 },
};

export const Content: Story = {
  args: { type: 'content', confidence: 0.78 },
};

export const Chat: Story = {
  args: { type: 'chat' },
};

export const AllTypes: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap gap-4">
        <AITransparencyBadge type="assessment" confidence={0.92} />
        <AITransparencyBadge type="recommendation" confidence={0.85} />
        <AITransparencyBadge type="content" confidence={0.78} />
        <AITransparencyBadge type="chat" />
      </div>
    </TooltipProvider>
  ),
};
