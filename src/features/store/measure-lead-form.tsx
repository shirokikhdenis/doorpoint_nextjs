import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Макет формы записи на замер (без отправки на сервер).
 */
export function MeasureLeadForm() {
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
              расчёт. Пока это демо-форма: отправка будет подключена позже.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="zamer-name">Имя</Label>
                <Input id="zamer-name" name="name" type="text" autoComplete="name" placeholder="Как к вам обращаться" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zamer-phone">Телефон</Label>
                <Input
                  id="zamer-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+7 (900) 000-00-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zamer-comment">Комментарий</Label>
                <Textarea
                  id="zamer-comment"
                  name="comment"
                  placeholder="Адрес, удобное время, пожелания по дверям…"
                  rows={4}
                />
              </div>
              <Button type="submit" className="w-full">
                Отправить заявку
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
