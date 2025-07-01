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
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

// Feedback options for suggestion ratings
const feedbackOptions = [
    { id: 'helpful', label: 'Helpful', icon: '👍' },
    { id: 'unclear', label: 'Unclear', icon: '❓' },
    { id: 'irrelevant', label: 'Irrelevant', icon: '❌' },
    { id: 'too_general', label: 'Too General', icon: '🌐' },
    { id: 'too_specific', label: 'Too Specific', icon: '🎯' },
    { id: 'good_style', label: 'Good Style', icon: '✨' },
    { id: 'needs_improvement', label: 'Needs Improvement', icon: '🔧' }
];

export default function Editor() {
    const [uploadResult, setUploadResult] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [title, setTitle] = useState("");
    const [currentBlockId, setCurrentBlockId] = useState(null);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [blockMenuPos, setBlockMenuPos] = useState({ top: 0, left: 0 });
    const [menuFilter, setMenuFilter] = useState("");
    const [collapsedHeadings, setCollapsedHeadings] = useState(new Set());
    const [loadingSuggestions, setLoadingSuggestions] = useState(new Set());
    const [suggestions, setSuggestions] = useState({});
    const [suggestionFeedback, setSuggestionFeedback] = useState({});
    const [suggestionModels, setSuggestionModels] = useState({});
    const [showFeedbackModal, setShowFeedbackModal] = useState(null);

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
    const availableModels = [
        "openai/gpt-4o",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-2.5-pro",
        "perplexity/sonar-pro",
        "deepseek/deepseek-r1",
        "x-ai/grok-3-mini-beta"
    ];

    const getRandomModel = () => {
        const randomIndex = Math.floor(Math.random() * availableModels.length);
        const selectedModel = availableModels[randomIndex];
        console.log('Using model:', selectedModel);
        return selectedModel;
    };

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

    const handleSuggestionFeedback = async (blockId, rating) => {
        setSuggestionFeedback(prev => ({
            ...prev,
            [blockId]: { rating }
        }));

        const block = blocks.find(b => b.id === blockId);
        const chapterContent = getChapterContent(blockId);
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

            const prompt = `You are a helpful academic writing assistant.

            Please read the following chapter (written in Slovenian) and give exactly **one** specific, actionable suggestion to improve it.
            
            Focus on:
            1. Content clarity and structure
            2. Writing style and flow
            3. Missing information or logical gaps
            4. Better organization of ideas
            5. Engagement and readability
            
            Chapter content:
            ${formattedContent}
            
            🟢 Please reply with:
            - One actionable suggestion for improving this paragraph, written in Slovenian.
            - Use a new line after your suggestion. Do not add any bullet points, bold text, or additional formatting.
            - Do NOT explain your reasoning. Do NOT add any intro or outro. Just one suggestion only.`
        // Log to console
        console.log({
            text: suggestions[blockId],
            model: suggestionModels[blockId],
            feedback: {
                rating
            },
            prompt: prompt
        });

        // Save to Supabase
        try {
            const { data, error } = await supabase
                .from('suggestion_feedback')
                .insert([
                    {
                        block_id: blockId,
                        suggestion_text: suggestions[blockId],
                        model: suggestionModels[blockId],
                        rating: rating,
                        prompt: prompt
                    }
                ]);

            if (error) {
                console.error('Error saving feedback to Supabase:', error);
            } else {
                console.log('Feedback saved successfully:', data);
            }
        } catch (error) {
            console.error('Error saving feedback:', error);
        }

        setShowFeedbackModal(null);
        setSuggestions(prev => {
            const newSuggestions = { ...prev };
            delete newSuggestions[blockId];
            return newSuggestions;
        });
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

            const selectedModel = getRandomModel();
            setSuggestionModels(prev => ({
                ...prev,
                [headingId]: selectedModel
            }));

            const payload = {
                "model": selectedModel,
                "messages": [{
                    "role": "user",
                    "content": `Please analyze the following chapter and provide specific, actionable improvement suggestions. Focus on:
1. Content clarity and structure
2. Writing style and flow
3. Missing information or gaps
4. Better organization of ideas
5. Engagement and readability

Chapter content:
${formattedContent}

Please provide only 1 specific, actionable suggestions for improvement - do not write anything else. Write in slovenian language. Only format the text using break lines - add one after each suggestion, no other formatting. Do not try to make any text bold or italic.`
                }]
            };

            const response = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const suggestionText = data.choices[0].message.content;

            setSuggestions((prev) => ({
                ...prev,
                [headingId]: suggestionText,
            }));
            setSuggestionFeedback((prev) => {
                const newFeedback = { ...prev };
                delete newFeedback[headingId];
                return newFeedback;
            });
        } catch (error) {
            console.error("Error getting suggestions:", error);
            setSuggestions((prev) => ({
                ...prev,
                [headingId]:
                    "Error getting suggestions. Please try again.",
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
                <div className={`transition-opacity flex items-center ${loadingSuggestions.has(block.id) ? 'opacity-100' : 'opacity-0 group-hover/heading:opacity-100'}`}>
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
                    <h1 className="text-3xl font-bold mt-6 mb-2 text-black">
                        {headingContent(block.content)}
                    </h1>
                );
            case "heading-2":
                return (
                    <h2 className="text-2xl font-semibold mt-5 mb-2 text-black">
                        {headingContent(block.content)}
                    </h2>
                );
            case "heading-3":
                return (
                    <h3 className="text-xl font-medium mt-4 mb-2 text-black">
                        {headingContent(block.content)}
                    </h3>
                );
            case "caption":
                return (
                    <div className="text-sm italic text-gray-500 mt-2 mb-4 text-gray">
                        {regularContent(block.content)}
                    </div>
                );
            default:
                return (
                    <p className="text-black">
                        {regularContent(block.content)}
                    </p>
                );
        }
    };

    const visibleBlocks = getVisibleBlocks();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-8 py-12">
                {/* Uploader */}
                <div className="mb-12">
                    <DocumentUploader onResult={setUploadResult} />
                </div>

                {/* Internal Cover Page Info */}
                {uploadResult?.notranja_naslovna && (
                    <div className="mb-8">
                        <InternalCoverInfo info={uploadResult.notranja_naslovna} />
                    </div>
                )}

                {/* Summary */}
                {uploadResult && (
                    <div className="mb-12">
                        <ResultSummary
                            frontMatter={uploadResult.front_matter_found}
                            bodySections={uploadResult.body_sections_found}
                        />
                    </div>
                )}

                {/* Document Title */}
                <div className="mb-8">
                    <h1 className="text-4xl font-semibold text-gray-900 outline-none border-none focus:ring-0 leading-tight">
                        {title}
                    </h1>
                </div>

                {/* Editor Blocks */}
                <div className="space-y-1">
                    {visibleBlocks.map((block) => (
                        <div key={block.id} className="group relative">
                            {/* Block Actions */}
                            <div className="absolute -left-10 top-1 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center">
                                <div className="dropdown">
                                    <button 
                                        tabIndex="0" 
                                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                                    >
                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                    </button>
                                    <ul
                                        tabIndex="0"
                                        className="dropdown-content menu p-2 shadow-lg bg-white rounded-lg border border-gray-200 w-48 z-10"
                                    >
                                        <li>
                                            <button 
                                                onClick={() => changeBlockType(block.id, "paragraph")}
                                                className="flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="w-5 h-5 mr-3 flex items-center justify-center text-gray-500">¶</span>
                                                Text
                                            </button>
                                        </li>
                                        <li>
                                            <button 
                                                onClick={() => changeBlockType(block.id, "heading-1")}
                                                className="flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <Heading1 className="w-5 h-5 mr-3 text-gray-500" />
                                                Heading 1
                                            </button>
                                        </li>
                                        <li>
                                            <button 
                                                onClick={() => changeBlockType(block.id, "heading-2")}
                                                className="flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <Heading2 className="w-5 h-5 mr-3 text-gray-500" />
                                                Heading 2
                                            </button>
                                        </li>
                                        <li>
                                            <button 
                                                onClick={() => changeBlockType(block.id, "heading-3")}
                                                className="flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="w-5 h-5 mr-3 flex items-center justify-center text-gray-500 font-medium">H3</span>
                                                Heading 3
                                            </button>
                                        </li>
                                        <li>
                                            <button 
                                                onClick={() => changeBlockType(block.id, "caption")}
                                                className="flex items-center text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <span className="w-5 h-5 mr-3 flex items-center justify-center text-gray-500">❝</span>
                                                Caption
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {/* Block Content */}
                            <div className="min-h-[1.5rem] py-1">
                                {renderBlock(block)}

                                {/* Suggestions */}
                                {isHeading(block.type) && suggestions[block.id] && (
                                    <div className="mt-3 p-4 bg-blue-50/50 border-l-4 border-blue-200 rounded-r-lg">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center">
                                                <Sparkles className="h-4 w-4 text-blue-500 mr-2" />
                                                <span className="font-medium text-blue-900 text-sm">Suggestions</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => setSuggestions((prev) => {
                                                        const newSuggestions = { ...prev };
                                                        delete newSuggestions[block.id];
                                                        return newSuggestions;
                                                    })}
                                                    className="text-blue-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <span className="text-lg">×</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap mb-3">
                                            {suggestions[block.id]}
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-500 mr-2">Rate this suggestion:</span>
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    onClick={() => handleSuggestionFeedback(block.id, rating)}
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                                                        suggestionFeedback[block.id]?.rating === rating
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {rating}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* AI Detection Results */}
                                {detectionResults[block.id] && (
                                    <div className="mt-3 p-4 bg-purple-50/50 border-l-4 border-purple-200 rounded-r-lg">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center">
                                                <Shield className="h-4 w-4 text-purple-500 mr-2" />
                                                <span className="font-medium text-purple-900 text-sm">AI Detection</span>
                                            </div>
                                            <button
                                                onClick={() => setDetectionResults((prev) => {
                                                    const newResults = { ...prev };
                                                    delete newResults[block.id];
                                                    return newResults;
                                                })}
                                                className="text-purple-400 hover:text-purple-600 transition-colors"
                                            >
                                                <span className="text-lg">×</span>
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-semibold text-purple-600">
                                                    {detectionResults[block.id].score}%
                                                </div>
                                                <div className="text-xs text-purple-600 font-medium">AI Score</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-semibold text-purple-600">
                                                    {detectionResults[block.id].readability_score || 'N/A'}
                                                </div>
                                                <div className="text-xs text-purple-600 font-medium">Readability</div>
                                            </div>
                                        </div>

                                        {detectionResults[block.id].sentences && Array.isArray(detectionResults[block.id].sentences) && (
                                            <details className="group">
                                                <summary className="cursor-pointer text-sm font-medium text-purple-700 hover:text-purple-800 mb-2">
                                                    Sentence Analysis ({detectionResults[block.id].sentences.length})
                                                </summary>
                                                <div className="max-h-32 overflow-y-auto space-y-2 pl-2">
                                                    {detectionResults[block.id].sentences.map((sentence, index) => (
                                                        <div key={index} className="text-xs p-2 bg-white/60 rounded border-l-2 border-purple-100">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="font-medium text-purple-800">#{index + 1}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    sentence.score > 80 ? 'bg-red-100 text-red-700' :
                                                                    sentence.score > 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {sentence.score}%
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 leading-relaxed">
                                                                {sentence.text?.substring(0, 100)}{sentence.text?.length > 100 ? '…' : ''}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}

                                {/* Plagiarism Results */}
                                {plagiarismResults[block.id] && (
                                    <div className="mt-3 p-4 bg-orange-50/50 border-l-4 border-orange-200 rounded-r-lg">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center">
                                                <Search className="h-4 w-4 text-orange-500 mr-2" />
                                                <span className="font-medium text-orange-900 text-sm">Plagiarism Check</span>
                                            </div>
                                            <button
                                                onClick={() => setPlagiarismResults((prev) => {
                                                    const newResults = { ...prev };
                                                    delete newResults[block.id];
                                                    return newResults;
                                                })}
                                                className="text-orange-400 hover:text-orange-600 transition-colors"
                                            >
                                                <span className="text-lg">×</span>
                                            </button>
                                        </div>

                                        <div className="text-center mb-4">
                                            <div className={`text-3xl font-semibold ${
                                                plagiarismResults[block.id].result?.score > 20 ? 'text-red-600' :
                                                plagiarismResults[block.id].result?.score > 10 ? 'text-yellow-600' :
                                                'text-green-600'
                                            }`}>
                                                {plagiarismResults[block.id].result?.score || 0}%
                                            </div>
                                            <div className="text-xs text-orange-600 font-medium">Plagiarism Score</div>
                                        </div>

                                        {plagiarismResults[block.id].result && (
                                            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                                <div className="bg-white/60 p-2 rounded">
                                                    <div className="font-medium text-orange-800 mb-1">Word Stats</div>
                                                    <div className="space-y-0.5 text-gray-600">
                                                        <div>Total: {plagiarismResults[block.id].result.textWordCounts}</div>
                                                        <div>Plagiarized: {plagiarismResults[block.id].result.totalPlagiarismWords}</div>
                                                    </div>
                                                </div>
                                                <div className="bg-white/60 p-2 rounded">
                                                    <div className="font-medium text-orange-800 mb-1">Sources</div>
                                                    <div className="text-gray-600">
                                                        Found: {plagiarismResults[block.id].result.sourceCounts || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {plagiarismResults[block.id].sources && plagiarismResults[block.id].sources.length > 0 && (
                                            <details className="group">
                                                <summary className="cursor-pointer text-sm font-medium text-orange-700 hover:text-orange-800">
                                                    View Sources ({plagiarismResults[block.id].sources.length})
                                                </summary>
                                                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pl-2">
                                                    {plagiarismResults[block.id].sources.map((source, index) => (
                                                        <div key={index} className="p-2 bg-white/60 rounded border-l-2 border-orange-100">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <div className="text-xs font-medium text-gray-800 flex-1 mr-2">
                                                                    {source.title || 'Untitled Source'}
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    source.score > 80 ? 'bg-red-100 text-red-700' :
                                                                    source.score > 50 ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                    {source.score}%
                                                                </span>
                                                            </div>
                                                            {source.url && (
                                                                <a 
                                                                    href={source.url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:text-blue-700 text-xs break-all block mb-1"
                                                                >
                                                                    {source.url.substring(0, 60)}{source.url.length > 60 ? '…' : ''}
                                                                </a>
                                                            )}
                                                            <div className="text-xs text-gray-500">
                                                                {source.plagiarismWords} / {source.totalNumberOfWords} words
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Context Menu */}
                {showContextMenu && (
                    <div
                        className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-36"
                        style={{
                            left: contextMenuPos.x,
                            top: contextMenuPos.y,
                            transform: 'translate(-50%, -100%)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleCopy}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Copy className="h-4 w-4 mr-3 text-gray-400" />
                            Copy
                        </button>
                        <button
                            onClick={handlePaste}
                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Clipboard className="h-4 w-4 mr-3 text-gray-400" />
                            Paste
                        </button>
                        <div className="h-px bg-gray-200 my-1" />
                        <button
                            onClick={handleAIConsultant}
                            className="flex items-center w-full px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                            <Brain className="h-4 w-4 mr-3 text-blue-500" />
                            AI Assistant
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

                {/* Feedback Modal */}
                {showFeedbackModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Provide Feedback</h3>
                                <button
                                    onClick={() => setShowFeedbackModal(null)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <span className="text-lg">×</span>
                                </button>
                            </div>
                            
                            {/* Rating Scale */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    How helpful was this suggestion?
                                </label>
                                <div className="flex justify-between">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <button
                                            key={rating}
                                            onClick={() => handleSuggestionFeedback(
                                                showFeedbackModal,
                                                rating
                                            )}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                                                suggestionFeedback[showFeedbackModal]?.rating === rating
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Tags */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select feedback tags
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {feedbackOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => {
                                                const currentTags = suggestionFeedback[showFeedbackModal]?.tags || [];
                                                const newTags = currentTags.includes(option.id)
                                                    ? currentTags.filter(tag => tag !== option.id)
                                                    : [...currentTags, option.id];
                                                
                                                handleSuggestionFeedback(
                                                    showFeedbackModal,
                                                    suggestionFeedback[showFeedbackModal]?.rating || 0,
                                                    newTags
                                                );
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm flex items-center space-x-1 transition-colors ${
                                                suggestionFeedback[showFeedbackModal]?.tags?.includes(option.id)
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span>{option.icon}</span>
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowFeedbackModal(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}