"use client";

import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Heading1, Heading2, MoreHorizontal, ChevronRight, ChevronDown, Sparkles, MessageCircle, X, Send } from "lucide-react";
import BlockMenu from "./BlockMenu";
import { cn } from "../libs/utils";
import DocumentUploader from "./DocumentUploader";
import ResultSummary from "./ResultSummary";
import InternalCoverInfo from "./InternalCoverInfo";

// Utility: map Word styles to block types
function mapStyleToType(style) {
    const s = style.toLowerCase();
    if (s.includes("heading 1")) return "heading-1";
    if (s.includes("heading 2")) return "heading-2";
    if (s.includes("heading 3")) return "heading-3";
    if (s.includes("caption")) return "caption";
    return "paragraph";
}

// Utility: derive block type from TOC number
function tocTypeFromNumber(number) {
    const level = number.split(".").length;
    if (level === 1) return "heading-1";
    if (level === 2) return "heading-2";
    return "heading-3";
}

// Utility: get heading level from block type
function getHeadingLevel(type) {
    switch (type) {
        case "heading-1": return 1;
        case "heading-2": return 2;
        case "heading-3": return 3;
        default: return null;
    }
}

// Utility: check if block type is a heading
function isHeading(type) {
    return ["heading-1", "heading-2", "heading-3"].includes(type);
}

export default function Editor() {
    const [uploadResult, setUploadResult] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [title, setTitle] = useState("Naslov");
    const [currentBlockId, setCurrentBlockId] = useState(null);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [blockMenuPos, setBlockMenuPos] = useState({ top: 0, left: 0 });
    const [menuFilter, setMenuFilter] = useState("");
    const [collapsedHeadings, setCollapsedHeadings] = useState(new Set());
    const [loadingSuggestions, setLoadingSuggestions] = useState(new Set());
    const [suggestions, setSuggestions] = useState({});

    // AI Consultant states
    const [selectedText, setSelectedText] = useState("");
    const [showConsultant, setShowConsultant] = useState(false);
    const [consultantQuestion, setConsultantQuestion] = useState("");
    const [consultantResponse, setConsultantResponse] = useState("");
    const [consultantLoading, setConsultantLoading] = useState(false);
    const [consultantHistory, setConsultantHistory] = useState([]);

    const refs = useRef({});

    useEffect(() => {
        if (uploadResult?.notranja_naslovna?.title) {
            setTitle(uploadResult.notranja_naslovna.title);
        }
    }, [uploadResult]);

    // Handle text selection
    useEffect(() => {
        const handleTextSelection = () => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText && selectedText.length > 0) {
                setSelectedText(selectedText);
                setShowConsultant(true);
                setConsultantQuestion("");
                setConsultantResponse("");
            }
        };

        document.addEventListener('mouseup', handleTextSelection);
        document.addEventListener('touchend', handleTextSelection);

        return () => {
            document.removeEventListener('mouseup', handleTextSelection);
            document.removeEventListener('touchend', handleTextSelection);
        };
    }, []);

    // Import paragraphs into blocks on upload
    useEffect(() => {
        if (!uploadResult) return;
        const { paragraphs, table_of_contents = [] } = uploadResult;
        const isPDF = table_of_contents.length > 0;
        const imported = paragraphs.map((p) => {
            let type = mapStyleToType(p.style);
            let content = p.content;
            if (isPDF) {
                const match = table_of_contents.find(
                    ({ number, title }) =>
                        content.trim() === title ||
                        content.trim().startsWith(number + " ")
                );
                if (match) {
                    type = tocTypeFromNumber(match.number);
                    content = content.replace(
                        new RegExp(`^${match.number}\\s*`),
                        ""
                    ).trim();
                }
            }
            return { id: p.id, type, content };
        });
        setBlocks(imported);
    }, [uploadResult]);

    // Get content under a specific heading
    const getChapterContent = (headingId) => {
        const headingIndex = blocks.findIndex(b => b.id === headingId);
        if (headingIndex === -1) return null;

        const headingBlock = blocks[headingIndex];
        const headingLevel = getHeadingLevel(headingBlock.type);
        if (headingLevel === null) return null;

        const chapterBlocks = [headingBlock];

        // Collect all blocks under this heading until we hit another heading at same or higher level
        for (let i = headingIndex + 1; i < blocks.length; i++) {
            const block = blocks[i];
            const blockLevel = getHeadingLevel(block.type);

            // Stop if we hit a heading at same or higher level
            if (blockLevel !== null && blockLevel <= headingLevel) {
                break;
            }

            chapterBlocks.push(block);
        }

        return {
            title: headingBlock.content || 'Untitled Chapter',
            blocks: chapterBlocks
        };
    };

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
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ni bilo mogoče pridobiti odgovora.';

            setConsultantResponse(responseText);

            // Add to history
            setConsultantHistory(prev => [...prev, {
                id: uuidv4(),
                selectedText,
                question: consultantQuestion,
                response: responseText,
                timestamp: new Date()
            }]);

        } catch (error) {
            console.error('Error getting consultant response:', error);
            setConsultantResponse('Napaka pri pridobivanju odgovora. Preverite svoj API ključ in poskusite znova.');
        } finally {
            setConsultantLoading(false);
        }
    };

    // Suggest improvements using Gemini Flash 2.0
    const suggestImprovements = async (headingId) => {
        const chapterContent = getChapterContent(headingId);
        if (!chapterContent) return;

        setLoadingSuggestions(prev => new Set([...prev, headingId]));

        try {
            // Format the chapter content for the API
            const formattedContent = chapterContent.blocks
                .map(block => {
                    switch (block.type) {
                        case 'heading-1':
                        case 'heading-2':
                        case 'heading-3':
                            return `# ${block.content}`;
                        case 'caption':
                            return `*${block.content}*`;
                        default:
                            return block.content;
                    }
                })
                .filter(content => content.trim())
                .join('\n\n');


            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Please analyze the following chapter and provide specific, actionable improvement suggestions. Focus on:
1. Content clarity and structure
2. Writing style and flow
3. Missing information or gaps
4. Better organization of ideas
5. Engagement and readability

Chapter content:
${formattedContent}

Please provide 1-3 specific, actionable suggestions for improvement - do not write anything else. Write in slovenian language. Only format the text using break lines - add one after each suggestion, no other formatting. Do not try to make any text bold or italic.`,
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const suggestionText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No suggestions available.';

            setSuggestions(prev => ({
                ...prev,
                [headingId]: suggestionText
            }));

        } catch (error) {
            console.error('Error getting suggestions:', error);
            setSuggestions(prev => ({
                ...prev,
                [headingId]: 'Error getting suggestions. Please check your API key and try again.'
            }));
        } finally {
            setLoadingSuggestions(prev => {
                const newSet = new Set(prev);
                newSet.delete(headingId);
                return newSet;
            });
        }
    };

    const toggleHeading = (headingId) => {
        setCollapsedHeadings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(headingId)) {
                newSet.delete(headingId);
            } else {
                newSet.add(headingId);
            }
            return newSet;
        });
    };

    // Get blocks that should be visible based on collapsed headings
    const getVisibleBlocks = () => {
        const visibleBlocks = [];
        let skipUntilLevel = null;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const headingLevel = getHeadingLevel(block.type);

            // If we're skipping content under a collapsed heading
            if (skipUntilLevel !== null) {
                // If this is a heading at the same level or higher, stop skipping
                if (headingLevel !== null && headingLevel <= skipUntilLevel) {
                    skipUntilLevel = null;
                } else {
                    // Skip this block
                    continue;
                }
            }

            // Add the block to visible blocks
            visibleBlocks.push(block);

            // If this is a collapsed heading, start skipping content
            if (headingLevel !== null && collapsedHeadings.has(block.id)) {
                skipUntilLevel = headingLevel;
            }
        }

        return visibleBlocks;
    };

    // Check if a heading has content underneath it
    const hasContentUnder = (headingId) => {
        const headingIndex = blocks.findIndex(b => b.id === headingId);
        if (headingIndex === -1) return false;

        const headingLevel = getHeadingLevel(blocks[headingIndex].type);
        if (headingLevel === null) return false;

        // Look for content after this heading
        for (let i = headingIndex + 1; i < blocks.length; i++) {
            const nextBlock = blocks[i];
            const nextLevel = getHeadingLevel(nextBlock.type);

            // If we hit a heading at the same level or higher, stop looking
            if (nextLevel !== null && nextLevel <= headingLevel) {
                break;
            }

            // If we find any content (heading or paragraph), return true
            return true;
        }

        return false;
    };

    const handleTitleChange = (e) => setTitle(e.target.value);

    const handleBlockChange = (id, e) => {
        const content = e.currentTarget.textContent || "";
        setBlocks(blocks.map((b) =>
            b.id === id ? { ...b, content } : b
        ));
    };

    const addBlockAfter = (id, type = "paragraph") => {
        const idx = blocks.findIndex((b) => b.id === id);
        if (idx === -1) return;
        const newBlock = { id: uuidv4(), type, content: "" };
        const newBlocks = [...blocks];
        newBlocks.splice(idx + 1, 0, newBlock);
        setBlocks(newBlocks);
        setTimeout(() => refs.current[newBlock.id]?.focus(), 0);
    };

    const deleteBlock = (id) => {
        if (blocks.length === 1) {
            setBlocks([{ ...blocks[0], content: "" }]);
            return;
        }
        const idx = blocks.findIndex((b) => b.id === id);
        const newBlocks = blocks.filter((b) => b.id !== id);
        setBlocks(newBlocks);

        // Remove from collapsed headings if it was collapsed
        setCollapsedHeadings(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });

        setTimeout(() => {
            const focusBlock = newBlocks[Math.max(0, idx - 1)];
            refs.current[focusBlock.id]?.focus();
        }, 0);
    };

    const changeBlockType = (id, newType) => {
        setBlocks(blocks.map((b) =>
            b.id === id ? { ...b, type: newType } : b
        ));

        // If changing from heading to non-heading, remove from collapsed state
        const oldBlock = blocks.find(b => b.id === id);
        if (oldBlock && isHeading(oldBlock.type) && !isHeading(newType)) {
            setCollapsedHeadings(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }

        setShowBlockMenu(false);
    };

    const handleKeyDown = (e, id) => {
        const block = blocks.find((b) => b.id === id);
        if (!block) return;
        if (e.key === "/" && !block.content) {
            e.preventDefault();
            setCurrentBlockId(id);
            setMenuFilter("");
            const rect = e.currentTarget.getBoundingClientRect();
            setBlockMenuPos({ top: rect.bottom, left: rect.left });
            setShowBlockMenu(true);
            return;
        }
        if (showBlockMenu && currentBlockId === id) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            addBlockAfter(id);
            return;
        }
        if (e.key === "Backspace" && !e.currentTarget.textContent) {
            e.preventDefault();
            deleteBlock(id);
            return;
        }
    };

    const handleBlockMenuSelect = (type) => {
        if (!currentBlockId) return;
        changeBlockType(currentBlockId, type);
        setTimeout(() => {
            const el = refs.current[currentBlockId];
            el?.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }, 0);
        setShowBlockMenu(false);
        setMenuFilter("");
    };

    // Close block menu on outside click
    useEffect(() => {
        const handler = (e) => {
            const el = currentBlockId ? refs.current[currentBlockId] : null;
            if (el && el.contains(e.target)) return;
            setShowBlockMenu(false);
            setMenuFilter("");
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [currentBlockId]);

    const renderBlock = (block) => {
        const isHeadingBlock = isHeading(block.type);
        const isCollapsed = collapsedHeadings.has(block.id);
        const hasContent = hasContentUnder(block.id);

        const common = {
            ref: (el) => (refs.current[block.id] = el),
            contentEditable: true,
            suppressContentEditableWarning: true,
            onBlur: (e) => handleBlockChange(block.id, e),
            onKeyDown: (e) => handleKeyDown(e, block.id),
        };

        const toggleIcon = isHeadingBlock && hasContent ? (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    toggleHeading(block.id);
                }}
                className="flex-shrink-0 mr-2 p-1 hover:bg-gray-100 rounded transition-colors"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
            </button>
        ) : (
            isHeadingBlock && <div className="w-6 mr-2 flex-shrink-0" />
        );

        const suggestButton = isHeadingBlock ? (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    suggestImprovements(block.id);
                }}
                disabled={loadingSuggestions.has(block.id)}
                className="flex-shrink-0 ml-2 p-1 hover:bg-blue-50 rounded transition-colors group/suggest"
                title="Suggest improvements"
            >
                {loadingSuggestions.has(block.id) ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                ) : (
                    <Sparkles className="h-4 w-4 text-gray-400 group-hover/suggest:text-blue-500 transition-colors" />
                )}
            </button>
        ) : null;

        const headingContent = (content) => (
            <div className="flex items-center w-full group/heading">
                {toggleIcon}
                <div {...common} className="flex-1 outline-none">
                    {content}
                </div>
                <div className="opacity-0 group-hover/heading:opacity-100 transition-opacity">
                    {suggestButton}
                </div>
            </div>
        );

        switch (block.type) {
            case "heading-1":
                return (
                    <h1 className="text-3xl font-bold mt-6 mb-2">
                        {headingContent(block.content)}
                    </h1>
                );
            case "heading-2":
                return (
                    <h2 className="text-2xl font-semibold mt-5 mb-2">
                        {headingContent(block.content)}
                    </h2>
                );
            case "heading-3":
                return (
                    <h3 className="text-xl font-medium mt-4 mb-2">
                        {headingContent(block.content)}
                    </h3>
                );
            case "caption":
                return <div {...common} className="text-sm italic text-gray-500 mt-2 mb-4 outline-none">{block.content}</div>;
            default:
                return <p {...common} className="outline-none">{block.content}</p>;
        }
    };

    const visibleBlocks = getVisibleBlocks();

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Internal Cover Page Info */}
            {uploadResult?.notranja_naslovna && (
                <InternalCoverInfo info={uploadResult.notranja_naslovna} />
            )}

            {/* Uploader */}
            <DocumentUploader onResult={setUploadResult} />

            {/* Summary */}
            {uploadResult && (
                <ResultSummary
                    frontMatter={uploadResult.front_matter_found}
                    bodySections={uploadResult.body_sections_found}
                />
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold mt-6 mb-2 outline-none">{title}</h1>

            {/* Editor Blocks */}
            <div className="space-y-3">
                {visibleBlocks.map((block) => (
                    <div key={block.id} className="group relative flex items-start">
                        <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center h-8 dropdown">
                            <button tabIndex="0" className="btn btn-ghost btn-square btn-sm">
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                            <ul tabIndex="0" className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                                <li><button onClick={() => changeBlockType(block.id, "paragraph")}>¶ Text</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "heading-1")}><Heading1 className="mr-2 h-4 w-4" /> H1</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "heading-2")}><Heading2 className="mr-2 h-4 w-4" /> H2</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "heading-3")}><span className="mr-2 text-lg">3</span> H3</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "caption")}><span className="mr-2 text-sm italic">❝</span> Caption</button></li>
                            </ul>
                        </div>
                        <div className="flex-1">
                            {renderBlock(block)}
                            {/* Suggestions Display */}
                            {isHeading(block.type) && suggestions[block.id] && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
                                        <h4 className="font-medium text-blue-800">Predlogi za izboljsavo</h4>
                                        <button
                                            onClick={() => setSuggestions(prev => {
                                                const newSuggestions = { ...prev };
                                                delete newSuggestions[block.id];
                                                return newSuggestions;
                                            })}
                                            className="ml-auto text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="text-sm text-blue-700 whitespace-pre-wrap">
                                        {suggestions[block.id]}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Block Insert Menu */}
            {showBlockMenu && (
                <BlockMenu
                    position={blockMenuPos}
                    onSelect={handleBlockMenuSelect}
                    filter={menuFilter}
                    onFilterChange={setMenuFilter}
                />
            )}

            {/* AI Consultant Panel */}
            {showConsultant && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center">
                                <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
                                <h3 className="text-lg font-semibold text-gray-800">AI Svetovalec za pisanje</h3>
                            </div>
                            <button
                                onClick={() => setShowConsultant(false)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Selected Text */}
                        <div className="p-4 bg-gray-50 border-b">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Izbrani tekst:</h4>
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
                                        {consultantLoading ? 'Razmišljam...' : 'Vprašaj'}
                                    </button>
                                </div>
                            </div>

                            {/* Response Area */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {consultantResponse && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center mb-2">
                                            <MessageCircle className="h-4 w-4 text-blue-600 mr-2" />
                                            <h4 className="font-medium text-blue-800">Odgovor svetovalca</h4>
                                        </div>
                                        <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                                            {consultantResponse}
                                        </div>
                                    </div>
                                )}

                                {/* Consultation History */}
                                {consultantHistory.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Prejšnja vprašanja</h4>
                                        <div className="space-y-3">
                                            {consultantHistory.slice().reverse().slice(0, 3).map((item) => (
                                                <div key={item.id} className="bg-gray-50 rounded-lg p-3 text-sm">
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
            )}
        </div>
    );
}