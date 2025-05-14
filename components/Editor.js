"use client";

import React, { useState, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { List, Heading1, Heading2, CheckSquare, Code, MoreHorizontal } from "lucide-react"
import BlockMenu from "./BlockMenu"
import { cn } from "../libs/utils"

export default function Editor() {
    const [blocks, setBlocks] = useState([{ id: uuidv4(), type: "paragraph", content: 'Paragraph' }])
    const [title, setTitle] = useState("Naslov")
    const [currentBlockId, setCurrentBlockId] = useState(null)
    const [showBlockMenu, setShowBlockMenu] = useState(false)
    const [blockMenuPos, setBlockMenuPos] = useState({ top: 0, left: 0 })
    const [menuFilter, setMenuFilter] = useState("")
    const refs = useRef({})

    const handleTitleChange = e => setTitle(e.target.value)
    const handleBlockChange = (id, e) => {
        const content = e.currentTarget.textContent || ""
        setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b))
    }
    const handleTodoToggle = id => setBlocks(blocks.map(b => b.id === id ? { ...b, checked: !b.checked } : b))

    const addBlockAfter = (id, type = "paragraph") => {
        const idx = blocks.findIndex(b => b.id === id)
        if (idx === -1) return
        const newBlock = { id: uuidv4(), type, content: "" }
        const newBlocks = [...blocks]
        newBlocks.splice(idx + 1, 0, newBlock)
        setBlocks(newBlocks)
        setTimeout(() => refs.current[newBlock.id]?.focus(), 0)
    }

    const deleteBlock = id => {
        if (blocks.length === 1) return setBlocks([{ id: blocks[0].id, type: "paragraph", content: "" }])
        const idx = blocks.findIndex(b => b.id === id)
        const newBlocks = blocks.filter(b => b.id !== id)
        setBlocks(newBlocks)
        setTimeout(() => {
            const focusBlock = newBlocks[Math.max(0, idx - 1)]
            refs.current[focusBlock.id]?.focus()
        }, 0)
    }

    const changeBlockType = (id, newType) => { setBlocks(blocks.map(b => b.id === id ? { ...b, type: newType } : b)); setShowBlockMenu(false) }

    const handleKeyDown = (e, id) => {
        const block = blocks.find(b => b.id === id)
        if (!block) return
        if (e.key === "/" && (block.content === "" || e.currentTarget.textContent === "")) {
            e.preventDefault()
            setCurrentBlockId(id)
            setMenuFilter("")
            const rect = e.currentTarget.getBoundingClientRect()
            setBlockMenuPos({ top: rect.bottom, left: rect.left })
            setShowBlockMenu(true)
            return
        }
        if (showBlockMenu && currentBlockId === id) return
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addBlockAfter(id); return }
        // new:
        if (e.key === "Backspace" && e.currentTarget.textContent === "") {
            e.preventDefault()
            deleteBlock(id)
            return
        }        // Arrow navigation omitted for brevity
    }

    const handleBlockMenuSelect = type => {
        if (!currentBlockId) return
        changeBlockType(currentBlockId, type)
        setTimeout(() => {
            refs.current[currentBlockId]?.focus()
            const sel = window.getSelection()
            const range = document.createRange()
            range.selectNodeContents(refs.current[currentBlockId])
            range.collapse(false)
            sel?.removeAllRanges()
            sel?.addRange(range)
        }, 0)
        setShowBlockMenu(false)
        setMenuFilter("")
    }

    useEffect(() => {
        const handler = e => {
            const el = currentBlockId ? refs.current[currentBlockId] : null
            if (el && el.contains(e.target)) return
            setShowBlockMenu(false)
            setMenuFilter("")
        }
        document.addEventListener("click", handler)
        return () => document.removeEventListener("click", handler)
    }, [currentBlockId])

    const renderBlock = block => {
        const commonProps = {
            ref: el => (refs.current[block.id] = el),
            contentEditable: true,
            suppressContentEditableWarning: true,
            onBlur: e => handleBlockChange(block.id, e),
            onKeyDown: e => handleKeyDown(e, block.id)
        }
        switch (block.type) {
            case "heading-1": return <div {...commonProps} className="text-3xl font-bold mt-6 mb-2 outline-none">{block.content}</div>
            case "heading-2": return <div {...commonProps} className="text-2xl font-semibold mt-5 mb-2 outline-none">{block.content}</div>
            case "bulleted-list": return <div className="flex items-center"><span className="mr-2">•</span><div {...commonProps} className="flex-1 outline-none">{block.content}</div></div>
            case "todo": return <div className="flex items-center gap-2"><button className="btn btn-square btn-outline btn-xs h-4 w-4 p-0" onClick={() => handleTodoToggle(block.id)}>{block.checked ? <div className="w-2 h-2 bg-current rounded-sm"></div> : null}</button><div {...commonProps} className={cn("flex-1 outline-none", block.checked && "line-through text-gray-500")}>{block.content}</div></div>
            case "code": return <pre className="font-mono bg-base-200 p-3 rounded"><div {...commonProps} className="outline-none">{block.content}</div></pre>
            default: return <div {...commonProps} className="outline-none">{block.content}</div>
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <input type="text" value={title} onChange={handleTitleChange} placeholder="Untitled" className="w-full text-4xl font-bold mb-6 outline-none border-none" />
            <div className="space-y-3">
                {blocks.map(block => (
                    <div key={block.id} className="group relative flex items-center">
                        <div className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center h-full dropdown">
                            <button tabIndex="0" className="btn btn-ghost btn-square btn-sm"><MoreHorizontal className="h-4 w-4" /></button>
                            <ul tabIndex="0" className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                                <li><button onClick={() => changeBlockType(block.id, "paragraph")}><span className="mr-2">¶</span> Text</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "heading-1")}><Heading1 className="mr-2 h-4 w-4" /> Heading 1</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "heading-2")}><Heading2 className="mr-2 h-4 w-4" /> Heading 2</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "bulleted-list")}><List className="mr-2 h-4 w-4" /> Bullet List</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "todo")}><CheckSquare className="mr-2 h-4 w-4" /> To-do</button></li>
                                <li><button onClick={() => changeBlockType(block.id, "code")}><Code className="mr-2 h-4 w-4" /> Code</button></li>
                            </ul>
                        </div>
                        {renderBlock(block)}
                    </div>
                ))}
            </div>
            {showBlockMenu && (
                <BlockMenu position={blockMenuPos} onSelect={handleBlockMenuSelect} filter={menuFilter} onFilterChange={setMenuFilter} />
            )}
        </div>
    )
}
