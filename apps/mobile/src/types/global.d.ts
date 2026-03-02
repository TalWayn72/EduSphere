// TypeScript 5.8+ JSX compatibility patch for React Navigation v7 + Apollo Client.
// TypeScript 5.8 made JSX component type checking stricter (refs property required).
// This augmentation restores compatibility without disabling strict mode.
// See: https://github.com/microsoft/TypeScript/pull/57139

import 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Component<_P = {}, _S = {}, _SS = any> {
    refs: Record<string, React.ReactInstance>;
  }
}
