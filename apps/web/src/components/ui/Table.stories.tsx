import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './table';
import { Badge } from './badge';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
};
export default meta;

type Story = StoryObj<typeof Table>;

const courses = [
  {
    id: 'C-001',
    name: 'Machine Learning 101',
    students: 245,
    status: 'Active',
  },
  { id: 'C-002', name: 'Data Structures', students: 189, status: 'Active' },
  { id: 'C-003', name: 'Intro to AI Ethics', students: 72, status: 'Draft' },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>A list of recent courses.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">ID</TableHead>
          <TableHead>Course Name</TableHead>
          <TableHead className="text-right">Students</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {courses.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.id}</TableCell>
            <TableCell>{c.name}</TableCell>
            <TableCell className="text-right">{c.students}</TableCell>
            <TableCell>
              <Badge variant={c.status === 'Draft' ? 'secondary' : 'default'}>
                {c.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="text-center text-muted-foreground">
            No results found.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
