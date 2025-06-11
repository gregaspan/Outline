"use client";

import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { MessageCircle, X, Send, Lightbulb } from "lucide-react";

export default function AIConsultant({ selectedText, show, onClose }) {
    const [consultantQuestion, setConsultantQuestion] = useState("");
    const [consultantResponse, setConsultantResponse] = useState("");
    const [consultantLoading, setConsultantLoading] = useState(false);
    const [consultantHistory, setConsultantHistory] = useState([]);

    // Suggested questions
    const suggestedQuestions = [
        "Kako lahko izboljšam jasnost tega odstavka?",
        "Ali je ta argument dovolj močan in prepričljiv?",
        "Kako bi strukturiral to idejo bolje?",
        "Ali je akademski ton primeren?",
        "Katere vire bi dodal za podporo tej trditvi?",
        "Kako se ta del povezuje z osrednjo tezo?"
    ];

    const askConsultant = async (question = consultantQuestion) => {
        if (!question.trim() || !selectedText) return;

        setConsultantLoading(true);
        setConsultantResponse("");
        setConsultantQuestion(question);

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;

            const prompt = `You are an expert academic writing consultant specializing in thesis and dissertation writing. You have extensive experience in academic writing, research methodology, and helping students improve their scholarly work.

Selected text from the thesis:
"${selectedText}"

Student's question:
${question}

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
Only format the text using break lines - add one after each suggestion, no other formatting. Do not try to make any text bold or italic.
When you reply:
• Return only the final answer in plain text.
• Do not include greetings, explanations, or apologies.`;

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
                    question: question,
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

    const handleSuggestedQuestion = (question) => {
        askConsultant(question);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">
                            AI Writing Assistant
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-600 mb-2">Selected text</p>
                    <div className="text-sm text-gray-800 italic leading-relaxed max-h-24 overflow-y-auto">
                        <div>&quot;{selectedText}&quot;</div>                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100">
                        <textarea
                            value={consultantQuestion}
                            onChange={(e) => setConsultantQuestion(e.target.value)}
                            placeholder="Ask about your selected text..."
                            className="w-full p-0 border-0 resize-none focus:outline-none focus:ring-0 text-base placeholder-gray-400 bg-transparent"
                            rows="3"
                        />

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center space-x-2">
                                <Lightbulb className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">Suggestions</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {suggestedQuestions.map((question, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestedQuestion(question)}
                                        disabled={consultantLoading}
                                        className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-0"
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => askConsultant()}
                                disabled={!consultantQuestion.trim() || consultantLoading}
                                className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {consultantLoading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Ask
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {consultantResponse && (
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                        <MessageCircle className="h-3 w-3 text-gray-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        Assistant Response
                                    </span>
                                </div>
                                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {consultantResponse}
                                </div>
                            </div>
                        )}

                        {consultantHistory.length > 0 && (
                            <div className="p-6">
                                <h4 className="text-sm font-medium text-gray-500 mb-4">
                                    Recent conversations
                                </h4>
                                <div className="space-y-4">
                                    {consultantHistory
                                        .slice()
                                        .reverse()
                                        .slice(0, 3)
                                        .map((item) => (
                                            <div
                                                key={item.id}
                                                className="border-l-2 border-gray-100 pl-4 py-2"
                                            >
                                                <div className="text-sm text-gray-900 mb-1">
                                                    {item.question}
                                                </div>
                                                <div className="text-sm text-gray-500 line-clamp-2">
                                                    {item.response}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {item.timestamp.toLocaleTimeString()}
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