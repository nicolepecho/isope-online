"use client";

import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Question, QType, AnswersMap } from "@/app/lib/evaluationData";
import AnswerView from "@/app/ui/snippets/evaluation/AnswerView";

type Props = {
  questions: Question[];
  selectedType: QType;
  setSelectedType: (value: QType) => void;
  addQuestion: () => void;
  saveForm: () => void;
  updateQuestion: (id: string, patch: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  addOption: (id: string) => void;
  updateOption: (id: string, idx: number, value: string) => void;
  removeOption: (id: string, idx: number) => void;
};

export default function OsasEvaluationView({
  questions,
  selectedType,
  setSelectedType,
  addQuestion,
  saveForm,
  updateQuestion,
  removeQuestion,
  addOption,
  updateOption,
  removeOption,
}: Props) {
  const [previewAnswers, setPreviewAnswers] = useState<AnswersMap>({});

  const setAnswer = (qid: string, value: any) => {
    setPreviewAnswers((p) => ({ ...p, [qid]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Form Editor */}
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Form Editor</h2>
          </div>
          
          {/* Add Question Controls */}
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                  Question Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as QType)}
                  className="w-full border border-gray-300 px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="input">Input</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="likert">Likert (scale)</option>
                  <option value="checkbox">Checkboxes</option>
                </select>
              </div>
              <div className="flex gap-2 sm:items-end">
                <button 
                  type="button" 
                  onClick={addQuestion} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition-colors cursor-pointer"
                >
                  Add Question
                </button>
                <button 
                  type="button" 
                  onClick={saveForm} 
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors cursor-pointer"
                >
                  Save Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {questions.length === 0 && (
            <div className="bg-white border border-gray-200 px-6 py-8">
              <p className="text-sm text-gray-500 text-center">No questions yet — add one to get started.</p>
            </div>
          )}

          {questions.map((q, index) => (
            <div key={q.id} className="bg-white border border-gray-200">
              {/* Question Header */}
              <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">Question {index + 1}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {q.type}
                  </span>
                </div>
                <button 
                  type="button" 
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors cursor-pointer" 
                  onClick={() => removeQuestion(q.id)}
                  aria-label="Delete question"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Question Content */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                    Question Text
                  </label>
                  <input
                    className="w-full border border-gray-300 px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                    placeholder="Enter your question here..."
                  />
                </div>

                {(q.type === "dropdown" || q.type === "checkbox") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                      Options
                    </label>
                    <div className="space-y-2">
                      {(q.options || []).map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            className="flex-1 border border-gray-300 px-3 py-2 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={opt}
                            onChange={(e) => updateOption(q.id, idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                          />
                          <button 
                            type="button" 
                            className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded font-medium cursor-pointer" 
                            onClick={() => removeOption(q.id, idx)}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium" 
                        onClick={() => addOption(q.id)}
                      >
                        + Add option
                      </button>
                    </div>
                  </div>
                )}

                {q.type === "likert" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                      Scale (Number of Points)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={q.scale ?? 5}
                      onChange={(e) => updateQuestion(q.id, { scale: Number(e.target.value) })}
                      className="border border-gray-300 px-3 py-2 w-24 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
        </div>
        <div className="px-6 py-4">
          <AnswerView questions={questions} answers={previewAnswers} setAnswer={setAnswer} />
        </div>
      </div>
    </div>
  );
}