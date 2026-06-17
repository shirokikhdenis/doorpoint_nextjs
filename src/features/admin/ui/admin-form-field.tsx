import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AdminFormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
};

export function AdminFormField({ label, htmlFor, hint, className, children }: AdminFormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-admin-text-secondary">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-admin-text-muted">{hint}</p> : null}
    </div>
  );
}

type AdminInputFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  label: string;
  id: string;
  hint?: string;
};

export function AdminInputField({ label, id, hint, className, ...props }: AdminInputFieldProps) {
  return (
    <AdminFormField label={label} htmlFor={id} hint={hint}>
      <Input id={id} className={className} {...props} />
    </AdminFormField>
  );
}

type AdminTextareaFieldProps = Omit<React.ComponentProps<typeof Textarea>, "id"> & {
  label: string;
  id: string;
  hint?: string;
};

export function AdminTextareaField({
  label,
  id,
  hint,
  className,
  ...props
}: AdminTextareaFieldProps) {
  return (
    <AdminFormField label={label} htmlFor={id} hint={hint}>
      <Textarea id={id} className={className} {...props} />
    </AdminFormField>
  );
}

type AdminSelectFieldProps = {
  label: string;
  id: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export function AdminSelectField({
  label,
  id,
  hint,
  className,
  children,
  ...props
}: AdminSelectFieldProps) {
  return (
    <AdminFormField label={label} htmlFor={id} hint={hint}>
      <select
        id={id}
        className={cn(
          "flex h-10 w-full border border-admin-input-border bg-admin-input-bg px-3 py-2 text-sm text-admin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-focus-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </AdminFormField>
  );
}
