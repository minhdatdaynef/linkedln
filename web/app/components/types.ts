export type Job = {
  title: string; company: string; location: string; url: string; posted: string;
  seniority?: string; salary?: string; working_hours?: string;
  experience_required?: string; key_requirements?: string[];
  benefits?: string[]; work_location_detail?: string;
};

export type RunStatus = "idle" | "queued" | "in_progress" | "completed";

export type AtsCheck = { label: string; pass: boolean; hint?: string };

export type CVAnalysis = {
  match_score: number; summary: string;
  strengths: string[]; gaps: string[];
  cv_suggestions: string[]; keywords_to_add: string[];
  ats_checks?: AtsCheck[];
};

export type CVJson = Record<string, unknown>;

export type ChatMsg = {
  id: string; role: "user" | "assistant"; content: string;
  attachLabel?: string;
};

export type SavedVersion = {
  id: string; name: string; score: number; savedAt: string;
  cvContext: string; jdContext: string; cvFileName: string; jdFileName: string;
  originalCV: string; improvedCV: string; coverLetter: string;
  analysis: CVAnalysis | null; cvJson: CVJson | null; changes: string[];
  messages: ChatMsg[];
};
