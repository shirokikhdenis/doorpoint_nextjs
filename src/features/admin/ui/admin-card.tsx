import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AdminCardProps = {
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function AdminCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: AdminCardProps) {
  if (!title && !description) {
    return (
      <Card className={cn(className)}>
        <CardContent className={cn("p-5", contentClassName)}>{children}</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-4">
        {title ? <CardTitle className="text-lg">{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
