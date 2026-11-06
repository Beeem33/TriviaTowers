import Link from "next/link";

export default function NotFound() {
  return (
    <main className="sky-bg grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md space-y-3 p-8 text-center">
        <p className="text-6xl" aria-hidden>🌫️</p>
        <h1 className="font-display text-3xl font-bold">Lost in the clouds</h1>
        <p className="text-ink-soft">This page floated away. Let’s get you back to your island.</p>
        <Link href="/" className="btn btn-sun">Back home</Link>
      </div>
    </main>
  );
}
