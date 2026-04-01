import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { HotspotQuestion } from './HotspotQuestion';
import type { Hotspot } from '@/types/quiz';

const sampleItem: Hotspot = {
  type: 'HOTSPOT',
  question:
    'Click on the regions that represent the frontal lobe of the brain:',
  imageUrl: 'https://placehold.co/600x400/e2e8f0/64748b?text=Brain+Diagram',
  hotspots: [
    { id: 'h1', x: 25, y: 30, radius: 8, label: 'Frontal Lobe' },
    { id: 'h2', x: 60, y: 25, radius: 8, label: 'Parietal Lobe' },
    { id: 'h3', x: 75, y: 50, radius: 8, label: 'Occipital Lobe' },
    { id: 'h4', x: 40, y: 60, radius: 8, label: 'Temporal Lobe' },
  ],
  correctHotspotIds: ['h1'],
};

function Wrapper({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <HotspotQuestion
      item={sampleItem}
      value={value}
      onChange={setValue}
      disabled={disabled}
    />
  );
}

const meta: Meta<typeof HotspotQuestion> = {
  title: 'Quiz/HotspotQuestion',
  component: HotspotQuestion,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof HotspotQuestion>;

export const Default: Story = {
  render: () => <Wrapper />,
};

export const WithSelection: Story = {
  render: () => (
    <HotspotQuestion
      item={sampleItem}
      value={['h1', 'h3']}
      onChange={() => {}}
    />
  ),
};

export const AllSelected: Story = {
  render: () => (
    <HotspotQuestion
      item={sampleItem}
      value={sampleItem.hotspots.map((h) => h.id)}
      onChange={() => {}}
    />
  ),
};

export const Disabled: Story = {
  render: () => <Wrapper disabled />,
};
