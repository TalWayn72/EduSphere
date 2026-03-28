import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ImportSourceSelector } from './ImportSourceSelector';

const meta: Meta<typeof ImportSourceSelector> = {
  title: 'ContentImport/ImportSourceSelector',
  component: ImportSourceSelector,
  args: { onSelect: fn() },
};
export default meta;

type Story = StoryObj<typeof ImportSourceSelector>;

export const NoneSelected: Story = {
  args: { selected: null },
};

export const YouTubeSelected: Story = {
  args: { selected: 'youtube' },
};

export const WebsiteSelected: Story = {
  args: { selected: 'website' },
};

export const FolderSelected: Story = {
  args: { selected: 'folder' },
};

export const DriveSelected: Story = {
  args: { selected: 'drive' },
};
