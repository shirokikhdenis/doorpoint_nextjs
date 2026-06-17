"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CartItem } from "@/lib/client/cart-types";
import { formatCartItemName } from "@/lib/client/cart-item-name";
import { formatPrice } from "@/lib/client/format";

type AdminCartLeadFormProps = {
  items: CartItem[];
  totalPrice: number;
  onSubmitted?: () => void;
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export function AdminCartLeadForm({ items, totalPrice, onSubmitted }: AdminCartLeadFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractDate, setContractDate] = useState(todayIsoDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || items.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/leads", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName,
          address,
          phone,
          contractNumber,
          contractDate: contractDate || null,
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
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; id?: number }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || `Ошибка ${response.status}`);
      }
      const leadId = typeof payload?.id === "number" ? payload.id : null;
      if (!leadId) {
        throw new Error("Заявка создана, но не удалось получить её номер");
      }
      onSubmitted?.();
      router.push(`/admin/leads/${leadId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось создать заявку");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="admin-cart-lead-form"
      className="mt-8 scroll-mt-24 print:hidden"
      aria-labelledby="admin-cart-lead-form-title"
    >
      <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
        <CardHeader>
          <CardTitle id="admin-cart-lead-form-title" className="text-xl">
            Создать заявку
          </CardTitle>
          <CardDescription>
            Режим администратора. Заявка сохранится в CRM на сумму{" "}
            <span className="font-medium text-zinc-900">{formatPrice(totalPrice)}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
              <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Наименование</th>
                      <th className="px-3 py-2 font-medium">Цена</th>
                      <th className="px-3 py-2 font-medium">Кол-во</th>
                      <th className="px-3 py-2 text-right font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((item) => (
                      <tr key={`${item.id}-${item.name}-${item.color ?? ""}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-zinc-900">
                            {formatCartItemName(item.name, item.color)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{formatPrice(item.price)}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {formatPrice(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-lead-name">ФИО</Label>
                  <Input
                    id="admin-lead-name"
                    name="customerName"
                    type="text"
                    autoComplete="name"
                    placeholder="Фамилия Имя Отчество"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                    minLength={2}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="admin-lead-address">Адрес</Label>
                  <Input
                    id="admin-lead-address"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Город, улица, дом, квартира"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-lead-phone">Телефон</Label>
                  <Input
                    id="admin-lead-phone"
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
                  <Label htmlFor="admin-lead-contract">№ договора</Label>
                  <Input
                    id="admin-lead-contract"
                    name="contractNumber"
                    type="text"
                    placeholder="Д-000123"
                    value={contractNumber}
                    onChange={(event) => setContractNumber(event.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-lead-date">Дата</Label>
                  <Input
                    id="admin-lead-date"
                    name="contractDate"
                    type="date"
                    value={contractDate}
                    onChange={(event) => setContractDate(event.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading ? "Сохранение…" : "Создать заявку"}
              </Button>
            </form>
        </CardContent>
      </Card>
    </section>
  );
}
