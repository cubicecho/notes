import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { Pressable, Text } from 'react-native';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Button({
  variant,
  size,
  onPress,
  children,
  className,
  disabled,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {typeof children === 'string' ? (
        <Text className="text-inherit">{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
