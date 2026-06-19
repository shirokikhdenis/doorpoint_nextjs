import Link from "next/link";

type FormPrivacyConsentProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function FormPrivacyConsent({
  id,
  checked,
  onChange,
  disabled = false,
}: FormPrivacyConsentProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-xs leading-snug text-zinc-600">
      <input
        id={id}
        name="privacyConsent"
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-brand focus:ring-brand"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required
        disabled={disabled}
      />
      <span>
        Соглашаюсь с{" "}
        <Link href="/privacy" prefetch={false} className="text-brand underline-offset-2 hover:underline">
          политикой конфиденциальности
        </Link>{" "}
        и даю согласие на обработку персональных данных.
      </span>
    </label>
  );
}
