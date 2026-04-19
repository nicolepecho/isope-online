export type QType = "input" | "dropdown" | "likert" | "checkbox";

export type Question = {
  id: string;
  type: QType;
  text: string;
  options?: string[];
  scale?: number;
};

export type AnswersMap = Record<string, any>;
