import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { BadgeFormFields, type BadgeFormData } from './BadgeFormFields';

const emptyForm: BadgeFormData = {
  name: '',
  description: '',
  iconEmoji: '',
  category: '',
  pointsReward: 0,
  conditionType: '',
  conditionValue: 0,
};

const filledForm: BadgeFormData = {
  name: 'Course Champion',
  description: 'Complete 10 courses with a score of 90% or above',
  iconEmoji: '🏆',
  category: 'Achievement',
  pointsReward: 500,
  conditionType: 'courses_completed',
  conditionValue: 10,
};

function Wrapper({
  initial = emptyForm,
  saving,
}: {
  initial?: BadgeFormData;
  saving?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <BadgeFormFields
      value={value}
      onChange={setValue}
      onSave={() => {}}
      onCancel={() => {}}
      saving={saving}
    />
  );
}

const meta: Meta<typeof BadgeFormFields> = {
  title: 'Certificates/BadgeFormFields',
  component: BadgeFormFields,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof BadgeFormFields>;

export const Empty: Story = {
  render: () => <Wrapper />,
};

export const Filled: Story = {
  render: () => <Wrapper initial={filledForm} />,
};

export const Saving: Story = {
  render: () => <Wrapper initial={filledForm} saving />,
};

export const CustomLabel: Story = {
  render: () => (
    <BadgeFormFields
      value={filledForm}
      onChange={() => {}}
      onSave={() => {}}
      onCancel={() => {}}
      saveLabel="Create Badge"
    />
  ),
};
