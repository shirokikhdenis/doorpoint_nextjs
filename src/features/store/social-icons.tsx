type SocialIconProps = {
  className?: string;
};

function SocialIconImg({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function VkIcon({ className }: SocialIconProps) {
  return <SocialIconImg src="/icons/vk.svg" className={className} />;
}

export function TelegramIcon({ className }: SocialIconProps) {
  return <SocialIconImg src="/icons/telegram.svg" className={className} />;
}

export function MaxIcon({ className }: SocialIconProps) {
  return <SocialIconImg src="/icons/max-messenger.svg" className={className} />;
}
