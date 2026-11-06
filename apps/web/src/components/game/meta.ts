import type { QuestionCategory, Difficulty } from "@triviatowers/shared-types";

export const CATEGORY_META: Record<QuestionCategory, { label: string; emoji: string; color: string }> = {
  geography: { label: "Geography", emoji: "🌍", color: "bg-sky-100 text-sky-800" },
  history: { label: "History", emoji: "🏛️", color: "bg-amber-100 text-amber-800" },
  science: { label: "Science", emoji: "🔬", color: "bg-violet-100 text-violet-800" },
  technology: { label: "Technology", emoji: "💻", color: "bg-indigo-100 text-indigo-800" },
  sports: { label: "Sports", emoji: "⚽", color: "bg-emerald-100 text-emerald-800" },
  entertainment: { label: "Entertainment", emoji: "🎬", color: "bg-rose-100 text-rose-800" },
  nature: { label: "Nature", emoji: "🌿", color: "bg-lime-100 text-lime-800" },
  general: { label: "General", emoji: "💡", color: "bg-yellow-100 text-yellow-800" },
  food: { label: "Food", emoji: "🍕", color: "bg-orange-100 text-orange-800" },
  "pop-culture": { label: "Pop Culture", emoji: "⭐", color: "bg-pink-100 text-pink-800" },
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const LETTERS = ["A", "B", "C", "D"] as const;
