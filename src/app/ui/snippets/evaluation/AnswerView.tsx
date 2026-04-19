"use client";

import type { Question, AnswersMap } from "@/app/lib/evaluationData";

export default function AnswerView({
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
    <form className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border-b pb-3">
          <label className="block font-medium mb-2 text-black">{q.text}</label>

          {q.type === "input" && (
            <input
              className="w-full border px-2 py-1 text-black"
              placeholder={q.text}
              value={(answers[q.id] ?? "") as string}
              readOnly={readOnly}
              onChange={(e) => !readOnly && setAnswer(q.id, e.target.value)}
            />
          )}

          {q.type === "dropdown" && (
            <select
              className="w-full border px-2 py-1 text-black"
              value={(answers[q.id] ?? "") as string}
              disabled={readOnly}
              onChange={(e) => !readOnly && setAnswer(q.id, e.target.value)}
            >
              <option value="" disabled>
                {q.text}
              </option>
              {(q.options || []).map((o, idx) => (
                <option key={idx} value={o} className="text-black">
                  {o}
                </option>
              ))}
            </select>
          )}

          {q.type === "checkbox" && (
            <div className="space-y-1">
              {(q.options || []).map((o, idx) => {
                const current: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                const checked = current.includes(o);

                return (
                  <label key={idx} className="flex items-center gap-2 text-black">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={(e) => {
                        if (readOnly) return;
                        const next = e.target.checked
                          ? Array.from(new Set([...current, o]))
                          : current.filter((x) => x !== o);
                        setAnswer(q.id, next);
                      }}
                    />
                    <span className="text-black">{o}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === "likert" && (
            <div className="flex gap-2 items-center">
              {[...Array(q.scale ?? 5)].map((_, idx) => {
                const val = idx + 1;
                const current = Number(answers[q.id] ?? 0);

                return (
                  <label key={idx} className="flex flex-col items-center text-sm text-black">
                    <input
                      type="radio"
                      name={q.id}
                      checked={current === val}
                      disabled={readOnly}
                      onChange={() => !readOnly && setAnswer(q.id, val)}
                    />
                    <span className="text-xs">{val}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </form>
  );
}
