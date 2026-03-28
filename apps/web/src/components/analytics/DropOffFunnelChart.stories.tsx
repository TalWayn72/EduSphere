import type { Meta, StoryObj } from '@storybook/react';
import { DropOffFunnelChart } from './DropOffFunnelChart';

const SAMPLE_DATA = [
  { moduleName: 'Introduction', dropOffRate: 5 },
  { moduleName: 'Basics', dropOffRate: 12 },
  { moduleName: 'Intermediate', dropOffRate: 28 },
  { moduleName: 'Advanced', dropOffRate: 45 },
  { moduleName: 'Expert', dropOffRate: 62 },
];

const meta: Meta<typeof DropOffFunnelChart> = {
  title: 'Analytics/DropOffFunnelChart',
  component: DropOffFunnelChart,
  decorators: [
    (Story) => (
      <div className="w-[600px] h-[300px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof DropOffFunnelChart>;

export const Default: Story = {
  args: { data: SAMPLE_DATA },
};

export const LowDropOff: Story = {
  args: {
    data: [
      { moduleName: 'Module 1', dropOffRate: 3 },
      { moduleName: 'Module 2', dropOffRate: 5 },
      { moduleName: 'Module 3', dropOffRate: 8 },
    ],
  },
};

export const HighDropOff: Story = {
  args: {
    data: [
      { moduleName: 'Lesson 1', dropOffRate: 40 },
      { moduleName: 'Lesson 2', dropOffRate: 55 },
      { moduleName: 'Lesson 3', dropOffRate: 72 },
      { moduleName: 'Lesson 4', dropOffRate: 85 },
    ],
  },
};
