import type { TaskPriority } from "@/lib/supabase/types";

export const PRIORITY_COLOUR: Record<TaskPriority, string> = {
  low: "#5da882",
  medium: "#e8956a",
  high: "#e07070",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  everyone: "Everyone",
  family_only: "Family only",
  private: "Private",
};

export const VISIBILITY_COLOUR: Record<string, string> = {
  everyone: "#5da882",
  family_only: "#e8956a",
  private: "#8a9e8c",
};
