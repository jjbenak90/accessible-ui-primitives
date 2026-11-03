/// <reference types="vite/client" />
import type { Preview } from '@storybook/react';
// Import your global CSS containing Tailwind directives
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;