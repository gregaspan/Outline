"use client";

import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Heading1, Heading2, MoreHorizontal, ChevronRight, ChevronDown, Sparkles, Copy, Clipboard, Brain, Volume2, VolumeX, Shield, Search } from "lucide-react";
import BlockMenu from "./BlockMenu";
import { cn } from "../libs/utils";
import DocumentUploader from "./DocumentUploader";
import ResultSummary from "./ResultSummary";
import InternalCoverInfo from "./InternalCoverInfo";
import AIConsultant from "./AIConsultant";

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
        case "heading-1":
            return 1;
        case "heading-2":
            return 2;
        case "heading-3":
            return 3;
        default:
            return null;
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

    const [selectedText, setSelectedText] = useState("");
    const [showConsultant, setShowConsultant] = useState(false);

    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

    const [currentAudio, setCurrentAudio] = useState(null);
    const [playingBlockId, setPlayingBlockId] = useState(null);
    const [loadingTTS, setLoadingTTS] = useState(new Set());

    const [loadingDetection, setLoadingDetection] = useState(new Set());
    const [loadingPlagiarism, setLoadingPlagiarism] = useState(new Set());
    const [detectionResults, setDetectionResults] = useState({});
    const [plagiarismResults, setPlagiarismResults] = useState({});

    const refs = useRef({});

    useEffect(() => {
        if (uploadResult?.notranja_naslovna?.title) {
            setTitle(uploadResult.notranja_naslovna.title);
        }
    }, [uploadResult]);

    // Handle text selection and context menu
    useEffect(() => {
        const handleTextSelection = () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text && text.length > 0) {
                setSelectedText(text);

                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top;

                setContextMenuPos({ x, y });
                setShowContextMenu(true);
            } else {
                setShowContextMenu(false);
            }
        };

        document.addEventListener("mouseup", handleTextSelection);
        document.addEventListener("touchend", handleTextSelection);

        return () => {
            document.removeEventListener("mouseup", handleTextSelection);
            document.removeEventListener("touchend", handleTextSelection);
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
                    content = content
                        .replace(new RegExp(`^${match.number}\\s*`), "")
                        .trim();
                }
            }
            return { id: p.id, type, content };
        });
        setBlocks(imported);
    }, [uploadResult]);

    // TTS Functions
    const synthesizeSpeech = async (text, blockId) => {
        if (!text.trim()) return;

        setLoadingTTS(prev => new Set([...prev, blockId]));

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Default voice
                }),
            });

            if (!response.ok) {
                throw new Error(`TTS API request failed: ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Stop current audio if playing
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            setCurrentAudio(audio);
            setPlayingBlockId(blockId);

            audio.onended = () => {
                setPlayingBlockId(null);
                setCurrentAudio(null);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                setPlayingBlockId(null);
                setCurrentAudio(null);
                URL.revokeObjectURL(audioUrl);
            };

            await audio.play();

        } catch (error) {
            console.error('TTS Error:', error);
            alert('Error generating speech. Please check your ElevenLabs API configuration.');
        } finally {
            setLoadingTTS(prev => {
                const newSet = new Set(prev);
                newSet.delete(blockId);
                return newSet;
            });
        }
    };

    const stopSpeech = () => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            setPlayingBlockId(null);
            setCurrentAudio(null);
        }
    };

    const handleTTS = (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block || !block.content.trim()) return;

        if (playingBlockId === blockId) {
            stopSpeech();
        } else {
            synthesizeSpeech(block.content, blockId);
        }
    };

    // AI Content Detection
    const checkAIContent = async (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block || !block.content.trim()) return;

        setLoadingDetection(prev => new Set([...prev, blockId]));

        try {
            const response = await fetch('/api/ai-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: block.content,
                }),
            });

            if (!response.ok) {
                throw new Error(`AI Detection API request failed: ${response.status}`);
            }

            const data = await response.json();
            setDetectionResults(prev => ({
                ...prev,
                [blockId]: data
            }));

        } catch (error) {
            console.error('AI Detection Error:', error);
            alert('Error checking AI content. Please check your Winston AI API configuration.');
        } finally {
            setLoadingDetection(prev => {
                const newSet = new Set(prev);
                newSet.delete(blockId);
                return newSet;
            });
        }
    };

    // Plagiarism Detection
    const checkPlagiarism = async (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block || !block.content.trim()) return;

        setLoadingPlagiarism(prev => new Set([...prev, blockId]));

        try {
            const response = await fetch('/api/plagiarism-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: block.content,
                }),
            });

            if (!response.ok) {
                throw new Error(`Plagiarism API request failed: ${response.status}`);
            }

            const data = await response.json();
            setPlagiarismResults(prev => ({
                ...prev,
                [blockId]: data
            }));

        } catch (error) {
            console.error('Plagiarism Check Error:', error);
            alert('Error checking plagiarism. Please check your Winston AI API configuration.');
        } finally {
            setLoadingPlagiarism(prev => {
                const newSet = new Set(prev);
                newSet.delete(blockId);
                return newSet;
            });
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(selectedText);
            setShowContextMenu(false);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            document.execCommand('insertText', false, text);
            setShowContextMenu(false);
        } catch (err) {
            console.error('Failed to paste text: ', err);
        }
    };

    const handleAIConsultant = () => {
        setShowContextMenu(false);
        setShowConsultant(true);
    };

    // Get content under a specific heading
    const getChapterContent = (headingId) => {
        const headingIndex = blocks.findIndex((b) => b.id === headingId);
        if (headingIndex === -1) return null;

        const headingBlock = blocks[headingIndex];
        const headingLevel = getHeadingLevel(headingBlock.type);
        if (headingLevel === null) return null;

        const chapterBlocks = [headingBlock];

        for (let i = headingIndex + 1; i < blocks.length; i++) {
            const block = blocks[i];
            const blockLevel = getHeadingLevel(block.type);

            if (blockLevel !== null && blockLevel <= headingLevel) {
                break;
            }

            chapterBlocks.push(block);
        }

        return {
            title: headingBlock.content || "Untitled Chapter",
            blocks: chapterBlocks,
        };
    };

    const suggestImprovements = async (headingId) => {
        const chapterContent = getChapterContent(headingId);
        if (!chapterContent) return;

        setLoadingSuggestions((prev) => new Set([...prev, headingId]));

        try {
            const formattedContent = chapterContent.blocks
                .map((block) => {
                    switch (block.type) {
                        case "heading-1":
                        case "heading-2":
                        case "heading-3":
                            return `# ${block.content}`;
                        case "caption":
                            return `*${block.content}*`;
                        default:
                            return block.content;
                    }
                })
                .filter((content) => content.trim())
                .join("\n\n");

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`;

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
                                    text: `Please analyze the following chapter and provide specific, actionable improvement suggestions. Focus on:
1. Content clarity and structure
2. Writing style and flow
3. Missing information or gaps
4. Better organization of ideas
5. Engagement and readability

Chapter content:
${formattedContent}

Please provide 1-3 specific, actionable suggestions for improvement - do not write anything else. Write in slovenian language. Only format the text using break lines - add one after each suggestion, no other formatting. Do not try to make any text bold or italic.`,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const suggestionText =
                data.candidates?.[0]?.content?.parts?.[0]?.text ||
                "No suggestions available.";

            setSuggestions((prev) => ({
                ...prev,
                [headingId]: suggestionText,
            }));
        } catch (error) {
            console.error("Error getting suggestions:", error);
            setSuggestions((prev) => ({
                ...prev,
                [headingId]:
                    "Error getting suggestions. Please check your API key and try again.",
            }));
        } finally {
            setLoadingSuggestions((prev) => {
                const newSet = new Set(prev);
                newSet.delete(headingId);
                return newSet;
            });
        }
    };

    const toggleHeading = (headingId) => {
        setCollapsedHeadings((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(headingId)) {
                newSet.delete(headingId);
            } else {
                newSet.add(headingId);
            }
            return newSet;
        });
    };

    const getVisibleBlocks = () => {
        const visibleBlocks = [];
        let skipUntilLevel = null;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const headingLevel = getHeadingLevel(block.type);

            if (skipUntilLevel !== null) {
                if (headingLevel !== null && headingLevel <= skipUntilLevel) {
                    skipUntilLevel = null;
                } else {
                    continue;
                }
            }

            visibleBlocks.push(block);

            if (headingLevel !== null && collapsedHeadings.has(block.id)) {
                skipUntilLevel = headingLevel;
            }
        }

        return visibleBlocks;
    };

    // Check if a heading has content underneath it
    const hasContentUnder = (headingId) => {
        const headingIndex = blocks.findIndex((b) => b.id === headingId);
        if (headingIndex === -1) return false;

        const headingLevel = getHeadingLevel(blocks[headingIndex].type);
        if (headingLevel === null) return false;

        for (let i = headingIndex + 1; i < blocks.length; i++) {
            const nextBlock = blocks[i];
            const nextLevel = getHeadingLevel(nextBlock.type);

            if (nextLevel !== null && nextLevel <= headingLevel) {
                break;
            }

            return true;
        }

        return false;
    };

    const handleTitleChange = (e) => setTitle(e.target.value);

    const handleBlockChange = (id, e) => {
        const content = e.currentTarget.textContent || "";
        setBlocks(
            blocks.map((b) => (b.id === id ? { ...b, content } : b))
        );
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

        setCollapsedHeadings((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });

        // Stop TTS if this block was playing
        if (playingBlockId === id) {
            stopSpeech();
        }

        // Clean up detection results
        setDetectionResults((prev) => {
            const newResults = { ...prev };
            delete newResults[id];
            return newResults;
        });

        setPlagiarismResults((prev) => {
            const newResults = { ...prev };
            delete newResults[id];
            return newResults;
        });

        setTimeout(() => {
            const focusBlock = newBlocks[Math.max(0, idx - 1)];
            refs.current[focusBlock.id]?.focus();
        }, 0);
    };

    const changeBlockType = (id, newType) => {
        setBlocks(
            blocks.map((b) => (b.id === id ? { ...b, type: newType } : b))
        );

        const oldBlock = blocks.find((b) => b.id === id);
        if (oldBlock && isHeading(oldBlock.type) && !isHeading(newType)) {
            setCollapsedHeadings((prev) => {
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

        const toggleIcon =
            isHeadingBlock && hasContent ? (
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
            ) : isHeadingBlock ? (
                <div className="w-6 mr-2 flex-shrink-0" />
            ) : null;

        // TTS button for all blocks with content
        const ttsButton = block.content?.trim() ? (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    handleTTS(block.id);
                }}
                disabled={loadingTTS.has(block.id)}
                className="flex-shrink-0 ml-2 p-1 hover:bg-green-50 rounded transition-colors group/tts"
                title={playingBlockId === block.id ? "Stop speech" : "Read aloud"}
            >
                {loadingTTS.has(block.id) ? (
                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                ) : playingBlockId === block.id ? (
                    <VolumeX className="h-4 w-4 text-red-500 group-hover/tts:text-red-600 transition-colors" />
                ) : (
                    <Volume2 className="h-4 w-4 text-gray-400 group-hover/tts:text-green-500 transition-colors" />
                )}
            </button>
        ) : null;

        // AI Detection button for all blocks with content
        const aiDetectionButton = block.content?.trim() ? (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    checkAIContent(block.id);
                }}
                disabled={loadingDetection.has(block.id)}
                className="flex-shrink-0 ml-2 p-1 hover:bg-purple-50 rounded transition-colors group/detection"
                title="Check AI content"
            >
                {loadingDetection.has(block.id) ? (
                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                ) : (
                    <Shield className="h-4 w-4 text-gray-400 group-hover/detection:text-purple-500 transition-colors" />
                )}
            </button>
        ) : null;

        // Plagiarism check button for all blocks with content
        const plagiarismButton = block.content?.trim() ? (
            <button
                onClick={(e) => {
                    e.preventDefault();
                    checkPlagiarism(block.id);
                }}
                disabled={loadingPlagiarism.has(block.id)}
                className="flex-shrink-0 ml-2 p-1 hover:bg-orange-50 rounded transition-colors group/plagiarism"
                title="Check plagiarism"
            >
                {loadingPlagiarism.has(block.id) ? (
                    <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                ) : (
                    <Search className="h-4 w-4 text-gray-400 group-hover/plagiarism:text-orange-500 transition-colors" />
                )}
            </button>
        ) : null;

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
                <div className="opacity-0 group-hover/heading:opacity-100 transition-opacity flex items-center">
                    {ttsButton}
                    {aiDetectionButton}
                    {plagiarismButton}
                    {suggestButton}
                </div>
            </div>
        );

        const regularContent = (content, className = "") => (
            <div className="flex items-start w-full group/block">
                <div {...common} className={`flex-1 outline-none ${className}`}>
                    {content}
                </div>
                <div className="opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center ml-2">
                    {ttsButton}
                    {aiDetectionButton}
                    {plagiarismButton}
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
                return (
                    <div className="text-sm italic text-gray-500 mt-2 mb-4">
                        {regularContent(block.content)}
                    </div>
                );
            default:
                return (
                    <p>
                        {regularContent(block.content)}
                    </p>
                );
        }
    };

    const visibleBlocks = getVisibleBlocks();

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Uploader */}
            <DocumentUploader onResult={setUploadResult} />

            {/* Internal Cover Page Info */}
            {uploadResult?.notranja_naslovna && (
                <InternalCoverInfo info={uploadResult.notranja_naslovna} />
            )}

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
                            <ul
                                tabIndex="0"
                                className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52"
                            >
                                <li>
                                    <button onClick={() => changeBlockType(block.id, "paragraph")}>
                                        ¶ Text
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => changeBlockType(block.id, "heading-1")}>
                                        <Heading1 className="mr-2 h-4 w-4" /> H1
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => changeBlockType(block.id, "heading-2")}>
                                        <Heading2 className="mr-2 h-4 w-4" /> H2
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => changeBlockType(block.id, "heading-3")}>
                                        <span className="mr-2 text-lg">3</span> H3
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => changeBlockType(block.id, "caption")}>
                                        <span className="mr-2 text-sm italic">❝</span> Caption
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1">
                            {renderBlock(block)}

                            {/* Suggestions Display */}
                            {isHeading(block.type) && suggestions[block.id] && (
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center mb-2">
                                        <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
                                        <h4 className="font-medium text-blue-800">
                                            Predlogi za izboljsavo
                                        </h4>
                                        <button
                                            onClick={() =>
                                                setSuggestions((prev) => {
                                                    const newSuggestions = { ...prev };
                                                    delete newSuggestions[block.id];
                                                    return newSuggestions;
                                                })
                                            }
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
                            {/* AI Detection Results - Comprehensive */}
{detectionResults[block.id] && (
    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center mb-3">
            <Shield className="h-4 w-4 text-purple-500 mr-2" />
            <h4 className="font-medium text-purple-800">
                AI Content Detection Results
            </h4>
            <button
                onClick={() =>
                    setDetectionResults((prev) => {
                        const newResults = { ...prev };
                        delete newResults[block.id];
                        return newResults;
                    })
                }
                className="ml-auto text-purple-600 hover:text-purple-800 text-sm"
            >
                ✕
            </button>
        </div>
        <div className="space-y-3 text-sm">
            {/* Main Scores */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-purple-800">Overall AI Score</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {detectionResults[block.id].score}%
                    </p>
                </div>
                <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-purple-800">Readability Score</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {detectionResults[block.id].readability_score || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Sentence Analysis */}
            {detectionResults[block.id].sentences && Array.isArray(detectionResults[block.id].sentences) && (
                <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-purple-800 mb-2">Sentence-by-Sentence Analysis</p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                        {detectionResults[block.id].sentences.map((sentence, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium">Sentence {index + 1}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        sentence.score > 80 ? 'bg-red-100 text-red-800' :
                                        sentence.score > 50 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                        {sentence.score}%
                                    </span>
                                </div>
                                <p className="text-gray-700 leading-tight">
                                    {sentence.text?.substring(0, 150)}{sentence.text?.length > 150 ? '...' : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
)}

{/* Plagiarism Results - Comprehensive */}
{plagiarismResults[block.id] && (
    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center mb-3">
            <Search className="h-4 w-4 text-orange-500 mr-2" />
            <h4 className="font-medium text-orange-800">
                Plagiarism Check Results
            </h4>
            <button
                onClick={() =>
                    setPlagiarismResults((prev) => {
                        const newResults = { ...prev };
                        delete newResults[block.id];
                        return newResults;
                    })
                }
                className="ml-auto text-orange-600 hover:text-orange-800 text-sm"
            >
                ✕
            </button>
        </div>
        <div className="space-y-3 text-sm">
            {/* Main Score */}
            <div className="bg-white p-3 rounded border text-center">
                <p className="font-semibold text-orange-800">Plagiarism Score</p>
                <p className={`text-3xl font-bold ${
                    plagiarismResults[block.id].result?.score > 20 ? 'text-red-600' :
                    plagiarismResults[block.id].result?.score > 10 ? 'text-yellow-600' :
                    'text-green-600'
                }`}>
                    {plagiarismResults[block.id].result?.score || 0}%
                </p>
            </div>


            {/* Detailed Statistics */}
            {plagiarismResults[block.id].result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded border">
                        <p className="font-semibold text-orange-800 mb-2">Word Statistics</p>
                        <p><strong>Total Words:</strong> {plagiarismResults[block.id].result.textWordCounts}</p>
                        <p><strong>Plagiarized Words:</strong> {plagiarismResults[block.id].result.totalPlagiarismWords}</p>
                        <p><strong>Identical Words:</strong> {plagiarismResults[block.id].result.identicalWordCounts}</p>
                        <p><strong>Similar Words:</strong> {plagiarismResults[block.id].result.similarWordCounts}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                        <p className="font-semibold text-orange-800 mb-2">Source Information</p>
                        <p><strong>Sources Found:</strong> {plagiarismResults[block.id].result.sourceCounts || 0}</p>
                    </div>
                </div>
            )}

            {/* Sources */}
            {plagiarismResults[block.id].sources && plagiarismResults[block.id].sources.length > 0 && (
                <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-orange-800 mb-2">Sources Found ({plagiarismResults[block.id].sources.length})</p>
                    <div className="max-h-60 overflow-y-auto space-y-3">
                        {plagiarismResults[block.id].sources.map((source, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded border">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800">
                                            {source.title || 'Untitled Source'}
                                        </p>
                                        {source.url && (
                                            <a 
                                                href={source.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 text-xs break-all"
                                            >
                                                {source.url}
                                            </a>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ml-2 ${
                                        source.score > 80 ? 'bg-red-100 text-red-800' :
                                        source.score > 50 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-orange-100 text-orange-800'
                                    }`}>
                                        {source.score}%
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                    <p><strong>Plagiarized Words:</strong> {source.plagiarismWords}</p>
                                    <p><strong>Total Words:</strong> {source.totalNumberOfWords}</p>
                                    <p><strong>Identical:</strong> {source.identicalWordCounts}</p>
                                    <p><strong>Similar:</strong> {source.similarWordCounts}</p>
                                </div>

                                {source.author && (
                                    <p className="text-xs text-gray-600"><strong>Author:</strong> {source.author}</p>
                                )}
                                
                                {source.description && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        <strong>Description:</strong> {source.description.substring(0, 100)}
                                        {source.description.length > 100 ? '...' : ''}
                                    </p>
                                )}

                                {source.publishedDate && (
                                    <p className="text-xs text-gray-600">
                                        <strong>Published:</strong> {new Date(source.publishedDate).toLocaleDateString()}
                                    </p>
                                )}

                                <div className="flex gap-2 mt-2">
                                    {source.canAccess && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Accessible</span>
                                    )}
                                    {source.citation && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Citation</span>
                                    )}
                                    {source.is_excluded && (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Excluded</span>
                                    )}
                                </div>

                                {/* Plagiarism Found Sequences */}
                                {source.plagiarismFound && source.plagiarismFound.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="text-xs font-medium cursor-pointer text-orange-700">
                                            View Plagiarized Sequences ({source.plagiarismFound.length})
                                        </summary>
                                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                            {source.plagiarismFound.map((seq, seqIndex) => (
                                                <div key={seqIndex} className="bg-red-50 p-2 rounded text-xs">
                                                    <p className="text-gray-600">
                                                        <strong>Position:</strong> {seq.startIndex}-{seq.endIndex}
                                                    </p>
                                                    <p className="text-red-800 font-medium">
                                                        &quot;{seq.sequence}&quot;                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Similar Words */}
            {plagiarismResults[block.id].similarWords && plagiarismResults[block.id].similarWords.length > 0 && (
                <details className="bg-white p-3 rounded border">
                    <summary className="font-semibold text-orange-800 cursor-pointer">
                        Similar Words ({plagiarismResults[block.id].similarWords.length})
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-1 text-xs">
                            {plagiarismResults[block.id].similarWords.map((word, index) => (
                                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                    {word.word} ({word.index})
                                </span>
                            ))}
                        </div>
                    </div>
                </details>
            )}

            {/* Citations */}
            {plagiarismResults[block.id].citations && plagiarismResults[block.id].citations.length > 0 && (
                <details className="bg-white p-3 rounded border">
                    <summary className="font-semibold text-orange-800 cursor-pointer">
                        Citations ({plagiarismResults[block.id].citations.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto text-xs">
                        {plagiarismResults[block.id].citations.map((citation, index) => (
                            <p key={index} className="p-2 bg-blue-50 rounded text-blue-800">
                                {citation}
                            </p>
                        ))}
                    </div>
                </details>
            )}

           
        </div>
    </div>
)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Context Menu */}
            {showContextMenu && (
                <div
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                    style={{
                        left: contextMenuPos.x,
                        top: contextMenuPos.y,
                        transform: 'translate(-50%, -100%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleCopy}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Kopiraj
                    </button>
                    <button
                        onClick={handlePaste}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <Clipboard className="h-4 w-4 mr-2" />
                        Prilepi
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                        onClick={handleAIConsultant}
                        className="flex items-center w-full px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                        <Brain className="h-4 w-4 mr-2" />
                        AI Svetovalec
                    </button>
                </div>
            )}

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
            <AIConsultant
                selectedText={selectedText}
                show={showConsultant}
                onClose={() => setShowConsultant(false)}
            />
        </div>
    );
}