import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';
import { Input } from './input';
import { Button } from './button';
import { Textarea } from './textarea';

const meta: Meta<typeof Form> = {
  title: 'UI/Form',
  component: Form,
};
export default meta;

type Story = StoryObj<typeof Form>;

function BasicFormDemo() {
  const form = useForm({
    defaultValues: { name: '', email: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-4 w-80">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormDescription>Your full name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

export const Default: Story = {
  render: () => <BasicFormDemo />,
};

function FormWithTextareaDemo() {
  const form = useForm({
    defaultValues: { title: '', description: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})} className="space-y-4 w-80">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course Title</FormLabel>
              <FormControl>
                <Input placeholder="Course name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the course..." {...field} />
              </FormControl>
              <FormDescription>Max 500 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Course</Button>
      </form>
    </Form>
  );
}

export const WithTextarea: Story = {
  render: () => <FormWithTextareaDemo />,
};
