"use client";

import type { AnswersMap, Question } from "@/app/lib/evaluationData";
import AnswerView from "@/app/ui/snippets/evaluation/AnswerView";

export default function MemberEvaluationView({
  questions,
  answers,
  setAnswer,
  readOnly = false,
}: {
  questions: Question[];
  answers: AnswersMap;
  setAnswer: (qid: string, value: any) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-lg font-semibold mb-4 text-black">Evaluation Form</h2>
      <AnswerView questions={questions} answers={answers} setAnswer={setAnswer} readOnly={readOnly} />
    </div>
  );
}
