"use client";

type CartQuantityStepperProps = {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
};

export function CartQuantityStepper({
  quantity,
  onQuantityChange,
  min = 1,
  max = 99,
}: CartQuantityStepperProps) {
  const clampQty = (value: number) =>
    Math.max(min, Math.min(max, Math.floor(value) || min));

  return (
    <div className="inline-flex items-center overflow-hidden rounded border border-zinc-300 bg-white">
      <button
        type="button"
        onClick={() => onQuantityChange(clampQty(quantity - 1))}
        className="px-2 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={quantity <= min}
        aria-label="Уменьшить количество"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={quantity}
        onChange={(event) => onQuantityChange(clampQty(Number(event.target.value)))}
        className="w-12 border-x border-zinc-300 px-1 py-1.5 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Количество"
      />
      <button
        type="button"
        onClick={() => onQuantityChange(clampQty(quantity + 1))}
        className="px-2 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={quantity >= max}
        aria-label="Увеличить количество"
      >
        +
      </button>
    </div>
  );
}
