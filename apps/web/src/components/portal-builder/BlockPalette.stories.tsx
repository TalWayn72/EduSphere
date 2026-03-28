import type { Meta, StoryObj } from '@storybook/react';
import { BlockPalette } from './BlockPalette';

const meta: Meta<typeof BlockPalette> = {
  title: 'PortalBuilder/BlockPalette',
  component: BlockPalette,
  decorators: [
    (Story) => (
      <div className="w-72 border rounded-lg">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof BlockPalette>;

export const Default: Story = {};
