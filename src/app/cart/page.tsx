"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatCartItemName } from "@/lib/client/cart-item-name";
import { downloadCartCsv } from "@/lib/client/cart-csv-export";
import { CartItem, cartItemHasProductLink } from "@/lib/client/cart-store";
import { formatPrice } from "@/lib/client/format";
import { productHref } from "@/lib/client/product-url";
import { useCart } from "@/lib/client/use-cart";
import { CartLeadForm } from "@/features/store/cart-lead-form";
import { AdminCartLeadForm } from "@/features/store/admin-cart-lead-form";
import {
  ADMIN_CART_SERVICE_DEFS,
  createInitialAdminCartServiceLines,
  sumAdminServiceLines,
  toAdminServiceCartItems,
  type AdminCartServiceKey,
  type AdminCartServiceLineState,
} from "@/features/store/admin-cart-service-lines";
import {
  clearAdminCartCustomLines,
  createAdminCartCustomLine,
  readAdminCartCustomLines,
  sumAdminCustomLines,
  toAdminCustomCartItems,
  writeAdminCartCustomLines,
  type AdminCartCustomLineState,
} from "@/features/store/admin-cart-custom-lines";
import { useAdminSession } from "@/lib/client/use-admin-session";
import {
  resolveCartManufacturerArticle,
  useCartManufacturerArticles,
} from "@/lib/client/use-cart-manufacturer-articles";
import { SITE_EMAIL, SITE_ADDRESS, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from "@/lib/site-contact";
import { getSiteUrl, SITE_NAME } from "@/lib/site-seo";

const formatSiteUrlForPrint = () => getSiteUrl().replace(/^https?:\/\//, "");

const formatToday = () => {
  try {
    return new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

/** Только неотрицательные целые без лишних символов; иначе в поле показываем NaN. Не больше двух цифр. */
const CART_QTY_MAX = 99;

function CartLineQuantity({
  item,
  setQuantity,
  size = "sm",
}: {
  item: CartItem;
  setQuantity: (ref: {
    id: number;
    name: string;
    color: string;
    hideCartImage: boolean;
  }, quantity: number) => void;
  size?: "sm" | "md";
}) {
  const lineRef = {
    id: item.id,
    name: item.name,
    color: item.color ?? "",
    finishId: item.finishId,
    glassOptionId: item.glassOptionId,
    hardwareServiceKey: (item.hardwareServices || [])
      .map((service) => service.id)
      .sort((a, b) => a - b)
      .join(","),
    hideCartImage: item.hideCartImage === true,
  };
  const [text, setText] = useState(() => String(item.quantity));

  useEffect(() => {
    setText(String(item.quantity));
  }, [item.quantity, item.id, item.name, item.color, item.finishId, item.glassOptionId, item.hardwareServices, item.hideCartImage]);

  const applyQuantity = (next: number) => {
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, Math.floor(next)));
    setQuantity(lineRef, clamped);
  };

  const handleChange = (raw: string) => {
    if (raw === "") {
      setText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setText(String(item.quantity));
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    setText(String(clamped));
    setQuantity(lineRef, clamped);
  };

  const handleBlur = () => {
    if (text === "" || !/^\d+$/.test(text)) {
      setText(String(item.quantity));
      return;
    }
    const n = parseInt(text, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(0, n));
    if (clamped !== n || text !== String(clamped)) {
      setText(String(clamped));
      setQuantity(lineRef, clamped);
    }
  };

  const isMd = size === "md";
  const btnClass = isMd
    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded border border-zinc-300 text-lg leading-none"
    : "h-8 shrink-0 rounded border px-2";
  const inputClass = isMd
    ? "h-10 w-11 shrink-0 rounded border border-zinc-300 px-1 text-center text-sm tabular-nums"
    : "h-8 w-9 shrink-0 rounded border border-zinc-300 px-1 py-1 text-center text-sm tabular-nums";

  return (
    <>
      <button
        type="button"
        className={btnClass}
        onClick={() => applyQuantity(item.quantity - 1)}
        aria-label="Уменьшить количество"
      >
        -
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Количество: ${item.name}`}
        className={inputClass}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
      <button
        type="button"
        className={btnClass}
        onClick={() => applyQuantity(item.quantity + 1)}
        aria-label="Увеличить количество"
      >
        +
      </button>
    </>
  );
}

function useAdminServiceLineEditor(
  line: AdminCartServiceLineState,
  onChange: (
    patch: Partial<Pick<AdminCartServiceLineState, "name" | "quantity" | "price">>,
  ) => void,
) {
  const [nameText, setNameText] = useState(() => line.name);
  const [qtyText, setQtyText] = useState(() => String(line.quantity));
  const [priceText, setPriceText] = useState(() => String(line.price));

  useEffect(() => {
    setNameText(line.name);
  }, [line.name, line.key]);

  useEffect(() => {
    setQtyText(String(line.quantity));
  }, [line.quantity, line.key]);

  useEffect(() => {
    setPriceText(String(line.price));
  }, [line.price, line.key]);

  const applyQuantity = (next: number) => {
    const clamped = Math.min(CART_QTY_MAX, Math.max(1, Math.floor(next)));
    setQtyText(String(clamped));
    onChange({ quantity: clamped });
  };

  const handleQtyChange = (raw: string) => {
    if (raw === "") {
      setQtyText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setQtyText(String(line.quantity));
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(1, n));
    setQtyText(String(clamped));
    onChange({ quantity: clamped });
  };

  const handleQtyBlur = () => {
    if (qtyText === "" || !/^\d+$/.test(qtyText)) {
      setQtyText(String(line.quantity));
      return;
    }
    applyQuantity(parseInt(qtyText, 10));
  };

  const handlePriceChange = (raw: string) => {
    if (raw === "") {
      setPriceText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setPriceText(String(line.price));
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.max(0, n);
    setPriceText(String(clamped));
    onChange({ price: clamped });
  };

  const handlePriceBlur = () => {
    if (priceText === "" || !/^\d+$/.test(priceText)) {
      setPriceText(String(line.price));
      onChange({ price: line.price });
      return;
    }
    const clamped = Math.max(0, parseInt(priceText, 10));
    setPriceText(String(clamped));
    onChange({ price: clamped });
  };

  const handleNameBlur = () => {
    const next = nameText.trim() || line.name;
    setNameText(next);
    if (next !== line.name) onChange({ name: next });
  };

  return {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  };
}

function useAdminCustomLineEditor(
  line: AdminCartCustomLineState,
  onChange: (
    patch: Partial<Pick<AdminCartCustomLineState, "name" | "quantity" | "price">>,
  ) => void,
) {
  const [nameText, setNameText] = useState(() => line.name);
  const [qtyText, setQtyText] = useState(() => String(line.quantity));
  const [priceText, setPriceText] = useState(() => (line.price > 0 ? String(line.price) : ""));

  useEffect(() => {
    setNameText(line.name);
  }, [line.name, line.id]);

  useEffect(() => {
    setQtyText(String(line.quantity));
  }, [line.quantity, line.id]);

  useEffect(() => {
    setPriceText(line.price > 0 ? String(line.price) : "");
  }, [line.price, line.id]);

  const applyQuantity = (next: number) => {
    const clamped = Math.min(CART_QTY_MAX, Math.max(1, Math.floor(next)));
    setQtyText(String(clamped));
    onChange({ quantity: clamped });
  };

  const handleQtyChange = (raw: string) => {
    if (raw === "") {
      setQtyText("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setQtyText(String(line.quantity));
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.min(CART_QTY_MAX, Math.max(1, n));
    setQtyText(String(clamped));
    onChange({ quantity: clamped });
  };

  const handleQtyBlur = () => {
    if (qtyText === "" || !/^\d+$/.test(qtyText)) {
      setQtyText(String(line.quantity));
      return;
    }
    applyQuantity(parseInt(qtyText, 10));
  };

  const handlePriceChange = (raw: string) => {
    if (raw === "") {
      setPriceText("");
      onChange({ price: 0 });
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setPriceText(line.price > 0 ? String(line.price) : "");
      return;
    }
    const n = parseInt(raw, 10);
    const clamped = Math.max(0, n);
    setPriceText(String(clamped));
    onChange({ price: clamped });
  };

  const handlePriceBlur = () => {
    if (priceText === "" || !/^\d+$/.test(priceText)) {
      setPriceText(line.price > 0 ? String(line.price) : "");
      onChange({ price: 0 });
      return;
    }
    const clamped = Math.max(0, parseInt(priceText, 10));
    setPriceText(String(clamped));
    onChange({ price: clamped });
  };

  const handleNameBlur = () => {
    const next = nameText.trim();
    setNameText(next);
    if (next !== line.name) onChange({ name: next });
  };

  return {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  };
}

function AdminCustomLineControls({
  line,
  onChange,
  onRemove,
}: {
  line: AdminCartCustomLineState;
  onChange: (
    patch: Partial<Pick<AdminCartCustomLineState, "name" | "quantity" | "price">>,
  ) => void;
  onRemove: () => void;
}) {
  const {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  } = useAdminCustomLineEditor(line, onChange);

  const lineLabel = line.name.trim() || "позицию";

  return (
    <>
      <td className="px-4 py-3 align-middle">
        <input
          type="text"
          aria-label="Наименование товара"
          placeholder="Наименование"
          className="box-border w-full min-w-0 max-w-full rounded border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-900 print:hidden"
          value={nameText}
          onChange={(event) => setNameText(event.target.value)}
          onBlur={handleNameBlur}
        />
        <p className="hidden font-medium leading-snug text-zinc-900 print:block">
          {line.name.trim() || "—"}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-zinc-500 print:hidden">
        —
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-medium">
        <div className="flex items-center print:hidden">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Цена"
            placeholder="Цена"
            className="box-border w-full min-w-0 max-w-full rounded border border-zinc-300 px-2 py-1 text-sm tabular-nums"
            value={priceText}
            onChange={(event) => handlePriceChange(event.target.value)}
            onBlur={handlePriceBlur}
          />
          <span className="ml-1 text-zinc-500">₽</span>
        </div>
        <span className="hidden print:inline">{formatPrice(line.price)}</span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex w-full items-center justify-start gap-2 print:hidden">
          <button
            type="button"
            className="shrink-0 rounded border px-2"
            onClick={() => applyQuantity(line.quantity - 1)}
            aria-label={`Уменьшить количество: ${lineLabel}`}
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Количество: ${lineLabel}`}
            className="w-9 shrink-0 rounded border border-zinc-300 px-1 py-1 text-center text-sm tabular-nums"
            value={qtyText}
            onChange={(event) => handleQtyChange(event.target.value)}
            onBlur={handleQtyBlur}
          />
          <button
            type="button"
            className="shrink-0 rounded border px-2"
            onClick={() => applyQuantity(line.quantity + 1)}
            aria-label={`Увеличить количество: ${lineLabel}`}
          >
            +
          </button>
        </div>
        <span className="hidden whitespace-nowrap print:inline">{line.quantity} шт.</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-medium">
        {formatPrice(line.price * line.quantity)}
      </td>
      <td className="w-10 px-2 py-3 text-right align-middle print:hidden">
        <button
          type="button"
          aria-label="Удалить позицию"
          title="Удалить"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          onClick={onRemove}
        >
          <span className="text-lg leading-none" aria-hidden="true">
            ✕
          </span>
        </button>
      </td>
    </>
  );
}

function AdminServiceLineControls({
  line,
  onChange,
}: {
  line: AdminCartServiceLineState;
  onChange: (
    patch: Partial<Pick<AdminCartServiceLineState, "name" | "quantity" | "price">>,
  ) => void;
}) {
  const {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  } = useAdminServiceLineEditor(line, onChange);

  return (
    <>
      <td className="px-4 py-3 align-middle">
        <input
          type="text"
          aria-label="Наименование услуги"
          className="box-border w-full min-w-0 max-w-full rounded border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-900 print:hidden"
          value={nameText}
          onChange={(event) => setNameText(event.target.value)}
          onBlur={handleNameBlur}
        />
        <p className="hidden font-medium leading-snug text-zinc-900 print:block">{line.name}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-zinc-500 print:hidden">
        —
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle font-medium">
        <div className="flex items-center print:hidden">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Цена: ${line.name}`}
            className="box-border w-full min-w-0 max-w-full rounded border border-zinc-300 px-2 py-1 text-sm tabular-nums"
            value={priceText}
            onChange={(event) => handlePriceChange(event.target.value)}
            onBlur={handlePriceBlur}
          />
          <span className="ml-1 text-zinc-500">₽</span>
        </div>
        <span className="hidden print:inline">{formatPrice(line.price)}</span>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex w-full items-center justify-start gap-2 print:hidden">
          <button
            type="button"
            className="shrink-0 rounded border px-2"
            onClick={() => applyQuantity(line.quantity - 1)}
          >
            -
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Количество: ${line.name}`}
            className="w-9 shrink-0 rounded border border-zinc-300 px-1 py-1 text-center text-sm tabular-nums"
            value={qtyText}
            onChange={(event) => handleQtyChange(event.target.value)}
            onBlur={handleQtyBlur}
          />
          <button
            type="button"
            className="shrink-0 rounded border px-2"
            onClick={() => applyQuantity(line.quantity + 1)}
          >
            +
          </button>
        </div>
        <span className="hidden whitespace-nowrap print:inline">{line.quantity} шт.</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-medium">
        {formatPrice(line.price * line.quantity)}
      </td>
      <td className="w-10 px-2 py-3 text-right align-middle print:hidden" />
    </>
  );
}

function CartItemName({ item }: { item: CartItem }) {
  const name = formatCartItemName(
    item.name,
    item.color,
    item.finishName,
    item.glassOptionName,
    item.hardwareServices,
    item.glass,
    item.manufacturerName,
    item.categorySlug,
  );
  const className = "break-words font-medium leading-snug text-zinc-900";
  if (cartItemHasProductLink(item)) {
    return (
      <Link
        href={productHref(item)}
        className={`${className} underline-offset-2 hover:text-brand hover:underline`}
      >
        {name}
      </Link>
    );
  }
  return <p className={className}>{name}</p>;
}

function CartLineRemoveButton({
  item,
  onRemove,
  large = false,
}: {
  item: CartItem;
  onRemove: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`Удалить «${item.name}» из корзины`}
      title="Удалить"
      className={
        large
          ? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          : "inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      }
      onClick={onRemove}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        ✕
      </span>
    </button>
  );
}

function CartProductCard({
  item,
  adminMode,
  manufacturerArticle,
  setQuantity,
  onRemove,
}: {
  item: CartItem;
  adminMode: boolean;
  manufacturerArticle: string;
  setQuantity: (
    ref: {
      id: number;
      name: string;
      color: string;
      hideCartImage: boolean;
    },
    quantity: number,
  ) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 break-words">
          <CartItemName item={item} />
          {adminMode ? (
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {manufacturerArticle || "—"}
            </p>
          ) : null}
        </div>
        <CartLineRemoveButton item={item} onRemove={onRemove} large />
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Цена</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums text-zinc-900">
              {formatPrice(item.price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Сумма</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Кол-во</p>
          <div className="flex items-center gap-1.5">
            <CartLineQuantity item={item} setQuantity={setQuantity} size="md" />
          </div>
        </div>
      </div>
    </article>
  );
}

function AdminServiceLineCard({
  line,
  onChange,
}: {
  line: AdminCartServiceLineState;
  onChange: (
    patch: Partial<Pick<AdminCartServiceLineState, "name" | "quantity" | "price">>,
  ) => void;
}) {
  const {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  } = useAdminServiceLineEditor(line, onChange);

  return (
    <article className="rounded-lg border border-sky-200 bg-sky-50/40 p-3">
      <input
        type="text"
        aria-label="Наименование услуги"
        className="box-border w-full min-w-0 rounded border border-zinc-300 bg-white px-2 py-2 text-sm font-medium text-zinc-900"
        value={nameText}
        onChange={(event) => setNameText(event.target.value)}
        onBlur={handleNameBlur}
      />
      <div className="mt-3 flex flex-col gap-3">
        <label className="min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Цена</span>
          <span className="mt-0.5 flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Цена: ${line.name}`}
              className="box-border w-full min-w-0 max-w-[8rem] rounded border border-zinc-300 bg-white px-2 py-2 text-sm tabular-nums"
              value={priceText}
              onChange={(event) => handlePriceChange(event.target.value)}
              onBlur={handlePriceBlur}
            />
            <span className="shrink-0 text-zinc-500">₽</span>
          </span>
        </label>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Кол-во</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-lg leading-none"
                onClick={() => applyQuantity(line.quantity - 1)}
                aria-label="Уменьшить количество"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`Количество: ${line.name}`}
                className="h-10 w-11 shrink-0 rounded border border-zinc-300 bg-white px-1 text-center text-sm tabular-nums"
                value={qtyText}
                onChange={(event) => handleQtyChange(event.target.value)}
                onBlur={handleQtyBlur}
              />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-lg leading-none"
                onClick={() => applyQuantity(line.quantity + 1)}
                aria-label="Увеличить количество"
              >
                +
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Сумма</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(line.price * line.quantity)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function AdminCustomLineCard({
  line,
  onChange,
  onRemove,
}: {
  line: AdminCartCustomLineState;
  onChange: (
    patch: Partial<Pick<AdminCartCustomLineState, "name" | "quantity" | "price">>,
  ) => void;
  onRemove: () => void;
}) {
  const {
    nameText,
    setNameText,
    qtyText,
    priceText,
    applyQuantity,
    handleQtyChange,
    handleQtyBlur,
    handlePriceChange,
    handlePriceBlur,
    handleNameBlur,
  } = useAdminCustomLineEditor(line, onChange);

  const lineLabel = line.name.trim() || "позицию";

  return (
    <article className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 p-3">
      <div className="flex items-start gap-2">
        <input
          type="text"
          aria-label="Наименование товара"
          placeholder="Наименование"
          className="box-border min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-2 text-sm font-medium text-zinc-900"
          value={nameText}
          onChange={(event) => setNameText(event.target.value)}
          onBlur={handleNameBlur}
        />
        <button
          type="button"
          aria-label="Удалить позицию"
          title="Удалить"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          onClick={onRemove}
        >
          <span className="text-lg leading-none" aria-hidden="true">
            ✕
          </span>
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <label className="min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Цена</span>
          <span className="mt-0.5 flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Цена"
              placeholder="Цена"
              className="box-border w-full min-w-0 max-w-[8rem] rounded border border-zinc-300 bg-white px-2 py-2 text-sm tabular-nums"
              value={priceText}
              onChange={(event) => handlePriceChange(event.target.value)}
              onBlur={handlePriceBlur}
            />
            <span className="shrink-0 text-zinc-500">₽</span>
          </span>
        </label>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Кол-во</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-lg leading-none"
                onClick={() => applyQuantity(line.quantity - 1)}
                aria-label={`Уменьшить количество: ${lineLabel}`}
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={`Количество: ${lineLabel}`}
                className="h-10 w-11 shrink-0 rounded border border-zinc-300 bg-white px-1 text-center text-sm tabular-nums"
                value={qtyText}
                onChange={(event) => handleQtyChange(event.target.value)}
                onBlur={handleQtyBlur}
              />
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-lg leading-none"
                onClick={() => applyQuantity(line.quantity + 1)}
                aria-label={`Увеличить количество: ${lineLabel}`}
              >
                +
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Сумма</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
              {formatPrice(line.price * line.quantity)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CartPage() {
  const { items, totalPrice, setQuantity, removeItem, clear } = useCart();
  const { isAdmin, loading: adminLoading } = useAdminSession();
  const [isExporting, setIsExporting] = useState(false);
  const [serviceLines, setServiceLines] = useState(createInitialAdminCartServiceLines);
  const [customLines, setCustomLines] = useState<AdminCartCustomLineState[]>(() =>
    readAdminCartCustomLines(),
  );

  const adminMode = !adminLoading && isAdmin;
  const manufacturerArticles = useCartManufacturerArticles(items, adminMode);
  const tableColSpan = adminMode ? 6 : 5;
  const customCartItems = useMemo(
    () => (adminMode ? toAdminCustomCartItems(customLines) : []),
    [adminMode, customLines],
  );
  const customTotal = useMemo(
    () => (adminMode ? sumAdminCustomLines(customLines) : 0),
    [adminMode, customLines],
  );
  const productTotal = totalPrice + customTotal;
  const serviceCartItems = useMemo(
    () => (adminMode ? toAdminServiceCartItems(serviceLines) : []),
    [adminMode, serviceLines],
  );
  const serviceTotal = useMemo(
    () => (adminMode ? sumAdminServiceLines(serviceLines) : 0),
    [adminMode, serviceLines],
  );
  const invoiceItems = useMemo(
    () => (adminMode ? [...items, ...customCartItems, ...serviceCartItems] : items),
    [adminMode, items, customCartItems, serviceCartItems],
  );
  const invoiceTotal = productTotal + serviceTotal;
  const hasEnabledServices = serviceLines.some((line) => line.enabled);
  const hasClearableContent =
    items.length > 0 || customLines.length > 0 || hasEnabledServices;

  useEffect(() => {
    if (!adminMode) return;
    writeAdminCartCustomLines(customLines);
  }, [adminMode, customLines]);

  const updateServiceLine = (
    key: AdminCartServiceKey,
    patch: Partial<Pick<AdminCartServiceLineState, "enabled" | "name" | "quantity" | "price">>,
  ) => {
    setServiceLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const addCustomLine = () => {
    setCustomLines((current) => [...current, createAdminCartCustomLine()]);
  };

  const updateCustomLine = (
    id: string,
    patch: Partial<Pick<AdminCartCustomLineState, "name" | "quantity" | "price">>,
  ) => {
    setCustomLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  };

  const removeCustomLine = (id: string) => {
    setCustomLines((current) => current.filter((line) => line.id !== id));
  };

  const handleClear = () => {
    if (!hasClearableContent) return;
    const ok = window.confirm("Очистить корзину? Действие нельзя отменить.");
    if (!ok) return;
    clear();
    setServiceLines(createInitialAdminCartServiceLines());
    setCustomLines([]);
    clearAdminCartCustomLines();
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleExportCsv = async () => {
    if (invoiceItems.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      await downloadCartCsv(invoiceItems);
    } finally {
      setIsExporting(false);
    }
  };

  if (items.length === 0 && !isAdmin && !adminLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold">Корзина</h1>
        <p className="mt-3 text-zinc-600">Корзина пуста.</p>
        <Link
          href="/catalog"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          Перейти в каталог
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Заголовок страницы и панель действий (на печати действия скрыты). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl font-semibold">Корзина</h1>
          {!adminLoading && isAdmin ? (
            <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 print:hidden">
              Режим администратора
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-stretch gap-2 print:hidden sm:items-center">
          {adminMode ? (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60 sm:min-h-0 sm:flex-none sm:py-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19h14" />
              </svg>
              {isExporting ? "Экспорт…" : "Экспорт CSV"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 transition hover:border-zinc-500 hover:bg-zinc-50 sm:min-h-0 sm:flex-none sm:py-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 9V3h12v6" />
              <rect x="4" y="9" width="16" height="8" rx="2" />
              <path d="M6 17v4h12v-4" />
            </svg>
            Печать
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasClearableContent}
            className="min-h-10 flex-1 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm text-rose-700 transition hover:border-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:flex-none sm:py-1.5"
          >
            Очистить корзину
          </button>
        </div>
      </div>

      {/* Шапка для печатной версии: видна только при печати. */}
      <div className="mt-4 hidden border-b border-zinc-300 pb-3 print:block">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-semibold">Заказ</h2>
          <span className="text-sm">от {formatToday()}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-700">
          Телефон:{" "}
          <a href={`tel:${SITE_PHONE_TEL}`} className="font-medium text-zinc-900">
            {SITE_PHONE_DISPLAY}
          </a>
          <span className="mx-2 text-zinc-400">·</span>
          E-mail:{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="font-medium text-zinc-900">
            {SITE_EMAIL}
          </a>
        </p>
      </div>

      {/* Карточки позиций: на узком экране таблица не помещается без горизонтального скролла. */}
      <div className="mt-4 space-y-3 lg:hidden print:hidden">
        {adminMode ? (
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">Товары</p>
        ) : null}
        {items.map((item) => (
          <CartProductCard
            key={`${item.id}-${item.name}-${item.color ?? ""}-${item.hideCartImage ? "1" : "0"}`}
            item={item}
            adminMode={adminMode}
            manufacturerArticle={resolveCartManufacturerArticle(item, manufacturerArticles)}
            setQuantity={setQuantity}
            onRemove={() =>
              removeItem({
                id: item.id,
                name: item.name,
                color: item.color ?? "",
                hideCartImage: item.hideCartImage === true,
              })
            }
          />
        ))}
        {adminMode
          ? customLines.map((line) => (
              <AdminCustomLineCard
                key={line.id}
                line={line}
                onChange={(patch) => updateCustomLine(line.id, patch)}
                onRemove={() => removeCustomLine(line.id)}
              />
            ))
          : null}
        {adminMode ? (
          <button
            type="button"
            onClick={addCustomLine}
            className="w-full rounded-md border border-dashed border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
          >
            Добавить позицию
          </button>
        ) : null}
        {adminMode ? (
          <div className="flex items-baseline justify-between gap-3 px-1 py-1 text-sm">
            <span className="text-zinc-700">Стоимость товара</span>
            <span className="font-semibold tabular-nums text-zinc-900">{formatPrice(productTotal)}</span>
          </div>
        ) : null}
        {adminMode && serviceCartItems.length > 0 ? (
          <>
            <p className="px-1 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              Услуги
            </p>
            {serviceLines
              .filter((line) => line.enabled)
              .map((line) => (
                <AdminServiceLineCard
                  key={`admin-service-card-${line.key}`}
                  line={line}
                  onChange={(patch) => updateServiceLine(line.key, patch)}
                />
              ))}
            <div className="flex items-baseline justify-between gap-3 px-1 py-1 text-sm">
              <span className="text-zinc-700">Стоимость услуг</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatPrice(serviceTotal)}
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-zinc-200 bg-white lg:block print:mt-3 print:block print:rounded-none print:border-0">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            {adminMode ? <col className="w-[9.5rem] print:hidden" /> : null}
            <col className="w-[7rem]" />
            <col className="w-[8.25rem]" />
            <col className="w-[7rem]" />
            <col className="w-10 print:hidden" />
          </colgroup>
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Наименование</th>
              {adminMode ? (
                <th className="px-4 py-2 font-medium print:hidden">
                  <span className="lg:hidden">Артикул</span>
                  <span className="hidden lg:inline">Артикул производителя</span>
                </th>
              ) : null}
              <th className="px-4 py-2 font-medium">Цена</th>
              <th className="px-4 py-2 font-medium">Кол-во</th>
              <th className="px-4 py-2 text-right font-medium">Сумма</th>
              <th className="w-10 px-2 py-2 print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {adminMode ? (
              <tr className="bg-zinc-50 print:bg-transparent">
                <td
                  colSpan={tableColSpan}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 print:hidden"
                >
                  Товары
                </td>
                <td
                  colSpan={4}
                  className="hidden px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 print:table-cell"
                >
                  Товары
                </td>
              </tr>
            ) : null}
            {items.map((item) => (
              <tr
                key={`${item.id}-${item.name}-${item.color ?? ""}-${item.hideCartImage ? "1" : "0"}`}
                className="hover:bg-zinc-50/60 print:break-inside-avoid"
              >
                <td className="break-words px-4 py-3 align-middle">
                  <CartItemName item={item} />
                </td>
                {adminMode ? (
                  <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-xs text-zinc-600 print:hidden">
                    {resolveCartManufacturerArticle(item, manufacturerArticles) || "—"}
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3 align-middle font-medium">
                  {formatPrice(item.price)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex w-full items-center justify-start gap-2 print:hidden">
                    <CartLineQuantity item={item} setQuantity={setQuantity} />
                  </div>
                  <span className="hidden whitespace-nowrap print:inline">
                    {item.quantity} шт.
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-medium">
                  {formatPrice(item.price * item.quantity)}
                </td>
                <td className="px-2 py-3 text-right align-middle print:hidden">
                  <CartLineRemoveButton
                    item={item}
                    onRemove={() =>
                      removeItem({
                        id: item.id,
                        name: item.name,
                        color: item.color ?? "",
                        hideCartImage: item.hideCartImage === true,
                      })
                    }
                  />
                </td>
              </tr>
            ))}
            {adminMode
              ? customLines.map((line) => (
                  <tr
                    key={line.id}
                    className="bg-zinc-50/40 hover:bg-zinc-50/70 print:break-inside-avoid print:bg-transparent"
                  >
                    <AdminCustomLineControls
                      line={line}
                      onChange={(patch) => updateCustomLine(line.id, patch)}
                      onRemove={() => removeCustomLine(line.id)}
                    />
                  </tr>
                ))
              : null}
            {adminMode ? (
              <tr className="print:hidden">
                <td colSpan={tableColSpan} className="px-4 py-2">
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="rounded-md border border-dashed border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                  >
                    Добавить позицию
                  </button>
                </td>
              </tr>
            ) : null}
            {adminMode ? (
              <tr className="bg-zinc-50/80 print:break-inside-avoid print:bg-transparent">
                <td colSpan={4} className="px-4 py-2.5 text-sm font-medium text-zinc-700 print:hidden">
                  Стоимость товара
                </td>
                <td
                  colSpan={3}
                  className="hidden px-4 py-2.5 text-sm font-medium text-zinc-700 print:table-cell"
                >
                  Стоимость товара
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold text-zinc-900">
                  {formatPrice(productTotal)}
                </td>
                <td className="print:hidden" />
              </tr>
            ) : null}

            {adminMode && serviceCartItems.length > 0 ? (
              <>
                <tr className="bg-zinc-50 print:bg-transparent">
                  <td
                    colSpan={tableColSpan}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 print:hidden"
                  >
                    Услуги
                  </td>
                  <td
                    colSpan={4}
                    className="hidden px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 print:table-cell"
                  >
                    Услуги
                  </td>
                </tr>
                {serviceLines
                  .filter((line) => line.enabled)
                  .map((line) => (
                    <tr
                      key={`admin-service-${line.key}`}
                      className="bg-sky-50/40 hover:bg-sky-50/70 print:break-inside-avoid print:bg-transparent"
                    >
                      <AdminServiceLineControls
                        line={line}
                        onChange={(patch) => updateServiceLine(line.key, patch)}
                      />
                    </tr>
                  ))}
                <tr className="bg-zinc-50/80 print:break-inside-avoid print:bg-transparent">
                  <td colSpan={4} className="px-4 py-2.5 text-sm font-medium text-zinc-700 print:hidden">
                    Стоимость услуг
                  </td>
                  <td
                    colSpan={3}
                    className="hidden px-4 py-2.5 text-sm font-medium text-zinc-700 print:table-cell"
                  >
                    Стоимость услуг
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold text-zinc-900">
                    {formatPrice(serviceTotal)}
                  </td>
                  <td className="print:hidden" />
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      {adminMode ? (
        <fieldset className="mt-4 space-y-3 rounded-lg border border-sky-200 bg-sky-50/40 px-4 py-3 print:hidden">
          <legend className="px-1 text-sm font-medium text-sky-950">Добавить к счёту</legend>
          {serviceLines.map((line) => (
            <div key={line.key} className="flex min-h-10 items-center gap-3">
              <input
                type="checkbox"
                id={`admin-service-${line.key}`}
                className="h-5 w-5 shrink-0 rounded border-zinc-300 text-sky-700 focus:ring-sky-500"
                checked={line.enabled}
                onChange={(event) => updateServiceLine(line.key, { enabled: event.target.checked })}
              />
              <label htmlFor={`admin-service-${line.key}`} className="sr-only">
                Добавить {line.name}
              </label>
              <input
                type="text"
                aria-label={`Название услуги ${line.key === "montage" ? "монтажа" : "доставки"}`}
                className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-800 sm:py-1.5"
                value={line.name}
                onChange={(event) => updateServiceLine(line.key, { name: event.target.value })}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (!next) {
                    const fallback =
                      ADMIN_CART_SERVICE_DEFS.find((def) => def.key === line.key)?.name || line.name;
                    updateServiceLine(line.key, { name: fallback });
                  } else if (next !== line.name) {
                    updateServiceLine(line.key, { name: next });
                  }
                }}
              />
            </div>
          ))}
        </fieldset>
      ) : null}

      <div className="mt-6 space-y-1 text-right">
        {adminMode ? (
          <>
            <p className="text-sm text-zinc-600">
              Стоимость товара:{" "}
              <span className="font-medium text-zinc-900">{formatPrice(productTotal)}</span>
            </p>
            {serviceCartItems.length > 0 ? (
              <p className="text-sm text-zinc-600">
                Стоимость услуг:{" "}
                <span className="font-medium text-zinc-900">{formatPrice(serviceTotal)}</span>
              </p>
            ) : null}
            {serviceCartItems.length > 0 ? (
              <p className="text-lg font-semibold text-zinc-900">
                Стоимость под ключ: {formatPrice(invoiceTotal)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-lg font-semibold">Итого: {formatPrice(totalPrice)}</p>
        )}
      </div>

      <div className="mt-8 hidden border-t border-zinc-300 pt-4 text-sm text-zinc-700 print:block">
        <p className="font-semibold text-zinc-900">{SITE_NAME}</p>
        <p className="mt-1">{SITE_ADDRESS}</p>
        <p className="mt-1">{formatSiteUrlForPrint()}</p>
      </div>

      {adminMode ? (
        <AdminCartLeadForm
          items={invoiceItems}
          productItems={[...items, ...customCartItems]}
          serviceItems={serviceCartItems}
          productTotal={productTotal}
          serviceTotal={serviceTotal}
          totalPrice={invoiceTotal}
          manufacturerArticles={manufacturerArticles}
        />
      ) : (
        <CartLeadForm items={items} totalPrice={totalPrice} onSubmitted={clear} />
      )}
    </main>
  );
}
