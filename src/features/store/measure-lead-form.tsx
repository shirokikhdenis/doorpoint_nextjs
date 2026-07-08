"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormPrivacyConsent } from "@/features/store/form-privacy-consent";
import { storefrontPageContainerClass } from "@/features/store/storefront-ui";
import { TrackedPhoneLink } from "@/features/store/tracked-phone-link";
import { trackYandexGoal, YANDEX_METRIKA_GOALS } from "@/lib/client/yandex-metrika";
import { cn } from "@/lib/utils";
import { SITE_PHONE_DISPLAY } from "@/lib/site-contact";

const BENEFITS = [
  "Выезд замерщика бесплатно",
  "Точный расчёт стоимости дверей и монтажа",
  "Подбор моделей под ваши проёмы и бюджет",
] as const;

type MeasureLeadFormProps = {
  /** Внутри `<main>` на главной — без полноширинной подложки */
  embedded?: boolean;
};

export function MeasureLeadForm({ embedded = false }: MeasureLeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/leads/measure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, comment, website }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }
      setSuccess(true);
      trackYandexGoal(YANDEX_METRIKA_GOALS.measureLead);
      setName("");
      setPhone("");
      setComment("");
      setWebsite("");
      setPrivacyConsent(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="zamer-form"
      className={cn(
        "scroll-mt-24 print:hidden",
        embedded
          ? "rounded-xl bg-zinc-100/80 p-4 sm:p-6"
          : "border-t border-zinc-200 bg-zinc-100/80 py-10",
      )}
      aria-labelledby="zamer-form-title"
    >
      <div
        className={cn(
          !embedded && storefrontPageContainerClass,
          "mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:gap-10",
        )}
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <h2 id="zamer-form-title" className="text-2xl font-bold text-zinc-900 sm:text-3xl">
              Запишитесь на бесплатный замер
            </h2>
            <p className="text-base leading-relaxed text-zinc-600">
              Оставьте контакты — перезвоним в удобное время, уточним размеры проёмов и подготовим
              расчёт.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-zinc-700">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-zinc-600">
            Или позвоните:{" "}
            <TrackedPhoneLink className="font-semibold text-zinc-900 hover:text-brand hover:underline">
              {SITE_PHONE_DISPLAY}
            </TrackedPhoneLink>
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Заявка на замер</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                role="status"
              >
                Заявка отправлена. Мы свяжемся с вами в ближайшее время.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
                <div className="hidden" aria-hidden>
                  <Label htmlFor="zamer-website">Сайт</Label>
                  <Input
                    id="zamer-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zamer-name">Имя</Label>
                  <Input
                    id="zamer-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Как к вам обращаться"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zamer-phone">Телефон</Label>
                  <Input
                    id="zamer-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+7 (900) 000-00-00"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zamer-comment">Комментарий</Label>
                  <Textarea
                    id="zamer-comment"
                    name="comment"
                    placeholder="Адрес, удобное время, пожелания по дверям…"
                    rows={4}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={loading}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-rose-700" role="alert">
                    {error}
                  </p>
                ) : null}
                <FormPrivacyConsent
                  id="zamer-privacy"
                  checked={privacyConsent}
                  onChange={setPrivacyConsent}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="brand"
                  className="w-full"
                  disabled={loading || !privacyConsent}
                >
                  {loading ? "Отправка…" : "Отправить заявку"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
