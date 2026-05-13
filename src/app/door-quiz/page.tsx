import Link from "next/link";

export default function DoorQuizPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Подбор двери</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Опросник появится здесь чуть позже. Пока загляните в{" "}
        <Link href="/catalog" className="text-zinc-900 underline underline-offset-2">
          каталог
        </Link>
        .
      </p>
    </main>
  );
}
