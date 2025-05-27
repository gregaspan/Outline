"use client";

import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Heading1, Heading2, MoreHorizontal } from "lucide-react";
import BlockMenu from "./BlockMenu";
import { cn } from "../libs/utils";

// Base URL of your FastAPI backend
const API_BASE = "http://127.0.0.1:8000";

// Component: DocumentUploader
export function DocumentUploader({ onResult }) {
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    setError(null);
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const isPDF = file.name.toLowerCase().endsWith(".pdf");
    const endpoint = isPDF ? "/upload-pdf" : "/upload-docx";

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt);
      }
      const json = await res.json();
      onResult({ ...json, isPDF });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="mb-6">
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
        className="mb-2"
      />
      {error && <div className="text-red-600">Error: {error}</div>}
    </div>
  );
}

// Utility: map Word styles to our block types
function mapStyleToType(style) {
  const s = style.toLowerCase();
  if (s.includes("heading 1") || s === "heading 1") return "heading-1";
  if (s.includes("heading 2") || s === "heading 2") return "heading-2";
  if (s.includes("heading 3") || s === "heading 3") return "heading-3";
  if (s.includes("caption")) return "caption";
  return "paragraph";
}

// Utility: derive block type from TOC number
function tocTypeFromNumber(number) {
  const level = number.split('.').length;
  if (level === 1) return 'heading-1';
  if (level === 2) return 'heading-2';
  return 'heading-3';
}

// Component: Editor
export default function Editor() {
  const [blocks, setBlocks] = useState([
    { id: uuidv4(), type: "paragraph", content: "Paragraph" },
  ]);
  const [title, setTitle] = useState("Naslov");
  const [currentBlockId, setCurrentBlockId] = useState(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [blockMenuPos, setBlockMenuPos] = useState({ top: 0, left: 0 });
  const [menuFilter, setMenuFilter] = useState("");
  const refs = useRef({});
  const [uploadResult, setUploadResult] = useState(null);

  // Replace blocks on document upload, preserving styles or using TOC for PDF
  useEffect(() => {
    if (!uploadResult) return;
    const { paragraphs, table_of_contents = [], isPDF } = uploadResult;
    const imported = paragraphs.map((p) => {
      let type = mapStyleToType(p.style);
      let content = p.content;
      if (isPDF && table_of_contents.length) {
        // Try to match TOC entry
        const match = table_of_contents.find(({ number, title }) => {
          const text = p.content.trim();
          return text === title || text.startsWith(number + ' ');
        });
        if (match) {
          type = tocTypeFromNumber(match.number);
          // strip leading number from content
          content = content.replace(new RegExp(`^${match.number}\s*`), '').trim();
        }
      }
      return { id: p.id, type, content };
    });
    setBlocks(imported);
  }, [uploadResult]);

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleBlockChange = (id, e) => {
    const content = e.currentTarget.textContent || "";
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
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
    if (blocks.length === 1)
      return setBlocks([{ id: blocks[0].id, type: "paragraph", content: "" }]);
    const idx = blocks.findIndex((b) => b.id === id);
    const newBlocks = blocks.filter((b) => b.id !== id);
    setBlocks(newBlocks);
    setTimeout(() => {
      const focusBlock = newBlocks[Math.max(0, idx - 1)];
      refs.current[focusBlock.id]?.focus();
    }, 0);
  };

  const changeBlockType = (id, newType) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, type: newType } : b)));
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
    const common = {
      ref: (el) => (refs.current[block.id] = el),
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: (e) => handleBlockChange(block.id, e),
      onKeyDown: (e) => handleKeyDown(e, block.id),
    };
    switch (block.type) {
      case "heading-1":
        return (
          <h1 {...common} className="text-3xl font-bold mt-6 mb-2 outline-none">
            {block.content}
          </h1>
        );
      case "heading-2":
        return (
          <h2 {...common} className="text-2xl font-semibold mt-5 mb-2 outline-none">
            {block.content}
          </h2>
        );
      case "heading-3":
        return (
          <h3 {...common} className="text-xl font-medium mt-4 mb-2 outline-none">
            {block.content}
          </h3>
        );
      case "caption":
        return (
          <div {...common} className="text-sm italic text-gray-500 mt-2 mb-4 outline-none">
            {block.content}
          </div>
        );
      default:
        return <p {...common} className="outline-none">{block.content}</p>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <DocumentUploader onResult={setUploadResult} />

      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full text-4xl font-bold mb-6 outline-none border-none"
      />

      <div className="space-y-3">
        {blocks.map((block) => (
          <div key={block.id} className="group relative flex items-center">
            <div className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center h-full dropdown">
              <button tabIndex="0" className="btn btn-ghost btn-square btn-sm">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <ul tabIndex="0" className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <button onClick={() => changeBlockType(block.id, "paragraph")}>¶ Text</button>
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
            {renderBlock(block)}
          </div>
        ))}
      </div>

      {showBlockMenu && (
        <BlockMenu
          position={blockMenuPos}
          onSelect={handleBlockMenuSelect}
          filter={menuFilter}
          onFilterChange={setMenuFilter}
        />
      )}
    </div>
  );
}