"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MeasureLeadForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
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
      setName("");
      setPhone("");
      setComment("");
      setWebsite("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="zamer-form"
      className="scroll-mt-24 border-b border-zinc-200 bg-zinc-100/80 py-10 print:hidden"
      aria-labelledby="zamer-form-title"
    >
      <div className="mx-auto max-w-lg px-4">
        <Card>
          <CardHeader>
            <CardTitle id="zamer-form-title" className="text-xl">
              Запишитесь на бесплатный замер
            </CardTitle>
            <CardDescription>
              Оставьте контакты — перезвоним в удобное время, уточним размеры проёмов и подготовим
              расчёт.
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
                <Button type="submit" className="w-full" disabled={loading}>
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
