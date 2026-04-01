import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );

  it('renders tab triggers', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
  });

  it('renders a tablist', () => {
    renderTabs();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('shows the active tab content', () => {
    renderTabs();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('the active trigger has data-state=active', () => {
    renderTabs();
    const trigger = screen.getByRole('tab', { name: 'Tab 1' });
    expect(trigger).toHaveAttribute('data-state', 'active');
  });

  it('the inactive trigger has data-state=inactive', () => {
    renderTabs();
    const trigger = screen.getByRole('tab', { name: 'Tab 2' });
    expect(trigger).toHaveAttribute('data-state', 'inactive');
  });
});

describe('TabsList', () => {
  it('forwards className', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="mt-4" data-testid="list">
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByTestId('list')).toHaveClass('mt-4');
  });

  it('has correct displayName', () => {
    expect(TabsList.displayName).toBe('TabsList');
  });
});

describe('TabsTrigger', () => {
  it('forwards className', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a" className="px-6">
            A
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('tab')).toHaveClass('px-6');
  });

  it('has correct displayName', () => {
    expect(TabsTrigger.displayName).toBe('TabsTrigger');
  });
});

describe('TabsContent', () => {
  it('forwards className', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="p-4" data-testid="content">
          Body
        </TabsContent>
      </Tabs>
    );
    expect(screen.getByTestId('content')).toHaveClass('p-4');
  });

  it('has correct displayName', () => {
    expect(TabsContent.displayName).toBe('TabsContent');
  });
});
