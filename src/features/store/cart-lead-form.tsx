"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CartItem } from "@/lib/client/cart-types";
import { formatPrice } from "@/lib/client/format";
import { FormPrivacyConsent } from "@/features/store/form-privacy-consent";
import { trackYandexGoal, YANDEX_METRIKA_GOALS } from "@/lib/client/yandex-metrika";

type CartLeadFormProps = {
  items: CartItem[];
  totalPrice: number;
  onSubmitted?: () => void;
};

export function CartLeadForm({ items, totalPrice, onSubmitted }: CartLeadFormProps) {
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
    if (loading || items.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/leads/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          comment,
          website,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            color: item.color,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }
      setSuccess(true);
      trackYandexGoal(YANDEX_METRIKA_GOALS.cartLead);
      setName("");
      setPhone("");
      setComment("");
      setWebsite("");
      setPrivacyConsent(false);
      onSubmitted?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="cart-lead-form"
      className="mt-8 scroll-mt-24 print:hidden"
      aria-labelledby="cart-lead-form-title"
    >
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle id="cart-lead-form-title" className="text-xl">
            Отправить заявку
          </CardTitle>
          <CardDescription>
            Оставьте контакты — мы перезвоним и уточним детали заказа на сумму{" "}
            <span className="font-medium text-zinc-900">{formatPrice(totalPrice)}</span>.
          </CardDescription>
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
                <Label htmlFor="cart-lead-website">Сайт</Label>
                <Input
                  id="cart-lead-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cart-lead-name">Имя</Label>
                <Input
                  id="cart-lead-name"
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
                <Label htmlFor="cart-lead-phone">Телефон</Label>
                <Input
                  id="cart-lead-phone"
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
                <Label htmlFor="cart-lead-comment">Комментарий</Label>
                <Textarea
                  id="cart-lead-comment"
                  name="comment"
                  placeholder="Адрес доставки, удобное время звонка…"
                  rows={3}
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
                id="cart-lead-privacy"
                checked={privacyConsent}
                onChange={setPrivacyConsent}
                disabled={loading}
              />
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading || !privacyConsent}
              >
                {loading ? "Отправка…" : "Отправить заявку"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
