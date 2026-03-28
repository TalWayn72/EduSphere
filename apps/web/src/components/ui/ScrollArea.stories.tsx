import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
};
export default meta;

type Story = StoryObj<typeof ScrollArea>;

const ITEMS = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-48 w-48 rounded-md border p-4" orientation="vertical">
      {ITEMS.map((item) => (
        <div key={item}>
          <div className="text-sm py-1">{item}</div>
          <Separator />
        </div>
      ))}
    </ScrollArea>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-64 rounded-md border p-4" orientation="horizontal">
      <div className="flex gap-4 w-[800px]">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-24 h-24 rounded-md bg-muted flex items-center justify-center text-sm"
          >
            Card {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const BothDirections: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border p-4" orientation="both">
      <div className="w-[600px]">
        {ITEMS.map((item) => (
          <div key={item} className="text-sm py-1 whitespace-nowrap">
            {item} — Extended content that overflows horizontally to demonstrate scrolling
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
