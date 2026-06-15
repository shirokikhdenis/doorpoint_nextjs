export const SITE_PHONE_DISPLAY = "+7 921 290 5999";
export const SITE_PHONE_TEL = "+79212905999";
export const SITE_EMAIL = "doorpoint29@yandex.ru";
export const SITE_ADDRESS =
  "Архангельск, ТЦ Новосёл, пр. Московский, д. 25, к. 4, стр. 1, 1 этаж, направо до конца";
export const SITE_ADDRESS_SHORT =
  "Архангельск, ТЦ «Новосёл», Московский пр., 25";
export const SITE_HOURS = "Пн–Пт: 11:00–19:00, Сб–Вс: 11:00–17:00";

export type SiteSocialLink = {
  id: string;
  label: string;
  href: string;
};

export const SITE_SOCIAL_LINKS: SiteSocialLink[] = [
  { id: "vk", label: "ВК", href: "https://vk.com/doorpoint29" },
  { id: "telegram", label: "Телеграм", href: "https://t.me/doorpoint29" },
  {
    id: "max",
    label: "MAX",
    href: "https://max.ru/u/f9LHodD0cOL1AjR0QA8Zgkpo-B2GXH4PtR0wLrPvLyhMyPEoG1mnaPOq4Dc",
  },
];
