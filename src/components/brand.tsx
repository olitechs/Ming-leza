import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button as PrimitiveButton,
  type ButtonProps as PrimitiveButtonProps,
} from "@/components/ui/button";
import { Input as PrimitiveInput } from "@/components/ui/input";
import { Card as PrimitiveCard } from "@/components/ui/card";
import {
  Avatar as PrimitiveAvatar,
  AvatarFallback as PrimitiveAvatarFallback,
  AvatarImage as PrimitiveAvatarImage,
} from "@/components/ui/avatar";

export const Button = React.forwardRef<HTMLButtonElement, PrimitiveButtonProps>(
  ({ className, size = "default", ...props }, ref) => (
    <PrimitiveButton ref={ref} size={size} className={cn("min-h-11", className)} {...props} />
  ),
);
Button.displayName = "BrandButton";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof PrimitiveInput>
>(({ className, ...props }, ref) => (
  <PrimitiveInput
    ref={ref}
    className={cn("min-h-11 rounded-2xl bg-background", className)}
    {...props}
  />
));
Input.displayName = "BrandInput";

type FieldProps = {
  label: string;
  htmlFor: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, description, error, children, className }: FieldProps) {
  const associatedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const childProps = child.props as {
      id?: string;
      "aria-describedby"?: string;
      "aria-invalid"?: boolean;
    };
    if (!childProps.id) return child;
    const describedBy = [
      childProps["aria-describedby"],
      description ? `${htmlFor}-description` : undefined,
      error ? `${htmlFor}-error` : undefined,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ");
    return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      "aria-describedby": describedBy || undefined,
      "aria-invalid": error ? true : childProps["aria-invalid"],
    });
  });

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {associatedChildren}
      {description && (
        <p id={`${htmlFor}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCard ref={ref} className={cn("rounded-3xl shadow-soft", className)} {...props} />
  ),
);
Card.displayName = "BrandCard";

export const Avatar = React.forwardRef<
  React.ElementRef<typeof PrimitiveAvatar>,
  React.ComponentPropsWithoutRef<typeof PrimitiveAvatar>
>(({ className, ...props }, ref) => (
  <PrimitiveAvatar
    ref={ref}
    className={cn("size-12 bg-secondary text-primary", className)}
    {...props}
  />
));
Avatar.displayName = "BrandAvatar";

export const AvatarImage = PrimitiveAvatarImage;
export const AvatarFallback = PrimitiveAvatarFallback;

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-3xl border-2 border-dashed bg-card p-10 text-center", className)}
    >
      <Icon aria-hidden="true" className="mx-auto size-9 text-primary" />
      <h2 className="mt-3 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}

export function ErrorBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("rounded-2xl bg-destructive/10 p-4 text-sm text-destructive-text", className)}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold text-muted-foreground">{eyebrow}</div>
        )}
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
