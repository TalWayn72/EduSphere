# @edusphere/ui

Shared UI component library for EduSphere web and mobile applications.

## Overview

This package provides platform-agnostic React components built with React Native that work seamlessly on both web (via react-native-web) and native mobile platforms (iOS/Android).

## Components

### Button

Customizable button with variants, sizes, and loading states.

```typescript
import { Button } from '@edusphere/ui';

<Button
  title="Click Me"
  onPress={() => console.log('clicked')}
  variant="primary"    // primary | secondary | outline | ghost
  size="md"           // sm | md | lg
  disabled={false}
  loading={false}
  fullWidth={false}
/>
```

**Props:**

- `title` (string, required): Button text
- `onPress` (function, required): Click handler
- `variant` (string): Visual style
- `size` (string): Button size
- `disabled` (boolean): Disable interactions
- `loading` (boolean): Show loading spinner
- `fullWidth` (boolean): Take full container width
- `style` (ViewStyle): Custom container styles
- `textStyle` (TextStyle): Custom text styles

### Card

Container component with elevation and border variants.

```typescript
import { Card } from '@edusphere/ui';

<Card variant="elevated" padding={16}>
  <Text>Card content</Text>
</Card>
```

**Props:**

- `children` (ReactNode, required): Card content
- `variant` (string): elevated | outlined | filled
- `padding` (number): Internal padding (default: 16)
- `style` (ViewStyle): Custom styles

### Input

Text input field with label, error states, and helper text.

```typescript
import { Input } from '@edusphere/ui';

<Input
  label="Email"
  placeholder="you@example.com"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  helperText="We'll never share your email"
  autoCapitalize="none"
  keyboardType="email-address"
/>
```

**Props:**

- All standard TextInput props
- `label` (string): Field label
- `error` (string): Error message
- `helperText` (string): Helper text below input
- `containerStyle` (ViewStyle): Container styles

### Text

Typography component with semantic variants.

```typescript
import { Text } from '@edusphere/ui';

<Text variant="h1">Heading 1</Text>
<Text variant="h2" color="#007AFF">Heading 2</Text>
<Text variant="body" align="center">Body text</Text>
<Text variant="caption" weight="bold">Caption</Text>
```

**Props:**

- `children` (ReactNode, required): Text content
- `variant` (string): h1 | h2 | h3 | body | caption | label
- `color` (string): Text color
- `align` (string): left | center | right
- `weight` (string): normal | medium | semibold | bold
- `style` (TextStyle): Custom styles

**Variants:**

- `h1`: 32px, bold, for main headings
- `h2`: 24px, bold, for section headings
- `h3`: 20px, semibold, for subsection headings
- `body`: 16px, normal, for body text
- `caption`: 12px, normal, for small text
- `label`: 14px, semibold, for labels

### Avatar

User avatar with initials fallback.

```typescript
import { Avatar } from '@edusphere/ui';

<Avatar name="John Doe" size={60} />
<Avatar uri="https://example.com/avatar.jpg" size={40} />
<Avatar
  name="Jane Smith"
  backgroundColor="#34C759"
  textColor="#fff"
  size={50}
/>
```

**Props:**

- `name` (string): User name for initials
- `uri` (string): Image URL
- `size` (number): Avatar diameter (default: 40)
- `backgroundColor` (string): Background color (default: #007AFF)
- `textColor` (string): Text color (default: #fff)
- `style` (ViewStyle): Custom styles

### Badge

Status badge with color variants.

```typescript
import { Badge } from '@edusphere/ui';

<Badge label="Published" variant="success" />
<Badge label="Draft" variant="warning" />
<Badge label="Error" variant="error" size="sm" />
```

**Props:**

- `label` (string, required): Badge text
- `variant` (string): primary | success | warning | error | info
- `size` (string): sm | md
- `style` (ViewStyle): Custom container styles
- `textStyle` (TextStyle): Custom text styles

**Variant Colors:**

- `primary`: #007AFF (iOS blue)
- `success`: #34C759 (green)
- `warning`: #FF9500 (orange)
- `error`: #FF3B30 (red)
- `info`: #5856D6 (purple)

## Installation

This package is part of the EduSphere monorepo and uses pnpm workspaces.

```bash
# In mobile app
"dependencies": {
  "@edusphere/ui": "workspace:*"
}

# In web app (with react-native-web)
"dependencies": {
  "@edusphere/ui": "workspace:*",
  "react-native-web": "^0.19.0"
}
```

## Usage with Web

For web applications, you'll need `react-native-web`:

```bash
pnpm add react-native-web
```

Configure webpack/vite to alias React Native modules:

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
    },
  },
};
```

## Theming

Components use a consistent color scheme:

```typescript
const colors = {
  primary: '#007AFF', // iOS Blue
  secondary: '#5856D6', // Purple
  success: '#34C759', // Green
  warning: '#FF9500', // Orange
  error: '#FF3B30', // Red
  info: '#5856D6', // Purple

  // Grays
  gray50: '#f5f5f5',
  gray100: '#e0e0e0',
  gray300: '#ccc',
  gray600: '#666',
  gray900: '#333',
};
```

To customize, pass style props:

```typescript
<Button
  title="Custom"
  variant="primary"
  style={{ backgroundColor: '#FF6B6B' }}
  textStyle={{ fontSize: 18 }}
/>
```

## Extending Components

Create custom components by wrapping base components:

```typescript
// CustomButton.tsx
import { Button, ButtonProps } from '@edusphere/ui';

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return (
    <Button
      {...props}
      variant="primary"
      style={{ backgroundColor: '#FF3B30' }}
    />
  );
}
```

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
import { ButtonProps, CardProps, InputProps } from '@edusphere/ui';

// Use types for custom components
type CustomButtonProps = ButtonProps & {
  icon?: string;
};

function IconButton({ icon, ...props }: CustomButtonProps) {
  // Implementation
}
```

## Accessibility

Components follow accessibility best practices:

- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- High contrast color ratios
- Touch target sizes (minimum 44x44)

## Platform Differences

Most components work identically across platforms, but some have minor differences:

### Shadows

- **iOS/Android**: Uses shadowColor, shadowOffset, elevation
- **Web**: Automatically converted to CSS box-shadow

### Fonts

- **iOS**: San Francisco
- **Android**: Roboto
- **Web**: System font stack

### Touch Feedback

- **iOS**: Opacity animation
- **Android**: Ripple effect
- **Web**: Hover states

## Performance

Components are optimized for performance:

- Minimal re-renders with React.memo
- Lightweight styles (StyleSheet.create)
- No runtime CSS-in-JS
- Tree-shakeable exports

## Contributing

To add new components:

1. Create component file in `src/`
2. Export from `src/index.ts`
3. Add TypeScript types
4. Document props and usage
5. Test on web and mobile

## License

MIT
