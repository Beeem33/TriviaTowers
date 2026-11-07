import type { Metadata } from "next";
import { Header, Footer } from "@/components/ui/Header";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="sky-bg min-h-dvh">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <ProfileView />
      </main>
      <Footer />
    </div>
  );
}
