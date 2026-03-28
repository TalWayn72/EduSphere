import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Pagination } from './pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  args: { onPageChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: { currentPage: 3, totalPages: 10 },
};

export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 10 },
};

export const LastPage: Story = {
  args: { currentPage: 10, totalPages: 10 },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3 },
};

export const SinglePage: Story = {
  args: { currentPage: 1, totalPages: 1 },
};

export const ManyPages: Story = {
  args: { currentPage: 50, totalPages: 100 },
};
