import type { Preview, ReactRenderer } from '@storybook/react';
import type { DecoratorFunction } from '@storybook/types';
import React from 'react';
import '../src/styles/globals.css';

const withDarkMode: DecoratorFunction<ReactRenderer> = (Story, context) => {
  const dark = context.globals.theme === 'dark';
  return React.createElement(
    'div',
    { className: dark ? 'dark' : '', style: { padding: '1rem' } },
    React.createElement(Story),
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Toggle dark mode',
      toolbar: {
        title: 'Theme',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [withDarkMode],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};

export default preview;
