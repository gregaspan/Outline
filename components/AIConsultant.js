"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MessageCircle, X, Send } from "lucide-react";

export default function AIConsultant({ selectedText, show, onClose }) {
  const [consultantQuestion, setConsultantQuestion] = useState("");
  const [consultantResponse, setConsultantResponse] = useState("");
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantHistory, setConsultantHistory] = useState([]);

  const askConsultant = async () => {
    if (!consultantQuestion.trim() || !selectedText) return;

    setConsultantLoading(true);
    setConsultantResponse("");

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;

      const prompt = `You are an expert academic writing consultant specializing in thesis and dissertation writing. You have extensive experience in academic writing, research methodology, and helping students improve their scholarly work.

Selected text from the thesis:
"${selectedText}"

Student's question:
${consultantQuestion}

Please provide expert advice as a thesis writing consultant. Consider:
- Academic writing standards and best practices
- Clarity, coherence, and flow of ideas
- Research methodology appropriateness
- Citation and referencing guidelines
- Structure and organization
- Argumentation and evidence presentation
- Language precision and academic tone

Respond in Slovenian language. Be specific, actionable, and supportive. Provide concrete suggestions for improvement where applicable.
do not write anything else
Only format the text using break lines - add one after each suggestion, no other formatting. Do not try to make any text bold or italic.`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const responseText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Ni bilo mogoče pridobiti odgovora.";

      setConsultantResponse(responseText);

      setConsultantHistory((prev) => [
        ...prev,
        {
          id: uuidv4(),
          selectedText,
          question: consultantQuestion,
          response: responseText,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error getting consultant response:", error);
      setConsultantResponse(
        "Napaka pri pridobivanju odgovora. Preverite svoj API ključ in poskusite znova."
      );
    } finally {
      setConsultantLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">
              AI Svetovalec za pisanje
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected Text */}
        <div className="p-4 bg-gray-50 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Izbrani tekst:
          </h4>
          <div className="bg-white p-3 rounded border text-sm text-gray-800 max-h-32 overflow-y-auto">
            "{selectedText}"
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Question Input */}
          <div className="p-4 border-b">
            <textarea
              value={consultantQuestion}
              onChange={(e) => setConsultantQuestion(e.target.value)}
              placeholder="Vprašajte svetovalca o izbranem tekstu (npr. 'Kako lahko izboljšam jasnost tega odstavka?', 'Ali je ta argument dovolj močan?', 'Kako bi strukturiral to idejo?')"
              className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Nasvet: Bodite specifični pri svojih vprašanjih za boljše odgovore
              </span>
              <button
                onClick={askConsultant}
                disabled={!consultantQuestion.trim() || consultantLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {consultantLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {consultantLoading ? "Razmišljam..." : "Vprašaj"}
              </button>
            </div>
          </div>

          {/* Response Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {consultantResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <MessageCircle className="h-4 w-4 text-blue-600 mr-2" />
                  <h4 className="font-medium text-blue-800">
                    Odgovor svetovalca
                  </h4>
                </div>
                <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                  {consultantResponse}
                </div>
              </div>
            )}

            {/* Consultation History */}
            {consultantHistory.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Prejšnja vprašanja
                </h4>
                <div className="space-y-3">
                  {consultantHistory
                    .slice()
                    .reverse()
                    .slice(0, 3)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 rounded-lg p-3 text-sm"
                      >
                        <div className="font-medium text-gray-700 mb-1">
                          V: {item.question}
                        </div>
                        <div className="text-gray-600 text-xs line-clamp-2">
                          O: {item.response}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}