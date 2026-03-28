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
    viewport: {
      viewports: {
        smallMobile: { name: 'Small Mobile (320×568)', styles: { width: '320px', height: '568px' } },
        mobile: { name: 'Mobile (375×812)', styles: { width: '375px', height: '812px' } },
        tablet: { name: 'Tablet (768×1024)', styles: { width: '768px', height: '1024px' } },
        laptop: { name: 'Laptop (1024×768)', styles: { width: '1024px', height: '768px' } },
        desktop: { name: 'Desktop (1280×720)', styles: { width: '1280px', height: '720px' } },
        qhd: { name: '4K QHD (2560×1440)', styles: { width: '2560px', height: '1440px' } },
      },
    },
  },
};

export default preview;
