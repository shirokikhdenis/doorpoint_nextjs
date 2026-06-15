import { SITE_SOCIAL_LINKS } from "@/lib/site-contact";
import { MaxIcon, TelegramIcon, VkIcon } from "@/features/store/social-icons";
import { cn } from "@/lib/utils";

type SiteSocialLinksProps = {
  variant?: "footer" | "light" | "header";
  className?: string;
};

const variantClass = {
  footer:
    "inline-flex items-center justify-center rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white",
  light:
    "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50",
  header:
    "inline-flex h-9 w-9 items-center justify-center transition hover:opacity-80",
} as const;

const listClass = {
  footer: "flex flex-wrap gap-2",
  light: "flex flex-wrap gap-2",
  header: "flex flex-wrap items-center gap-1.5",
} as const;

const headerIcons = {
  vk: VkIcon,
  telegram: TelegramIcon,
  max: MaxIcon,
} as const;

export function SiteSocialLinks({ variant = "footer", className }: SiteSocialLinksProps) {
  return (
    <ul className={cn(listClass[variant], className)}>
      {SITE_SOCIAL_LINKS.map((link) => {
        const HeaderIcon = variant === "header" ? headerIcons[link.id as keyof typeof headerIcons] : null;

        return (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className={variantClass[variant]}
            >
              {HeaderIcon ? <HeaderIcon className="h-6 w-6" /> : link.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
