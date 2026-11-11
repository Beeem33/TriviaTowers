import type { Metadata } from "next";
import { Suspense } from "react";
import { Header, Footer } from "@/components/ui/Header";
import { ReviewView } from "@/components/review/ReviewView";

export const metadata: Metadata = {
  title: "Daily Tower Answers",
  description: "Answers and explanations for past TriviaTowers Daily Tower questions.",
};

export default function ReviewPage() {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
        <Suspense fallback={<div className="card h-64 animate-pulse" />}>
          <ReviewView />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
