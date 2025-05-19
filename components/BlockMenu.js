"use client";

import React, { useState, useEffect, useRef } from "react"
import { Heading1, Heading2 } from "lucide-react"
import { cn } from "../libs/utils"

export default function BlockMenu({ position, onSelect, filter, onFilterChange }) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef(null)

    const blockOptions = [
        { type: "paragraph", label: "Text", icon: <span className="text-lg">¶</span> },
        { type: "heading-1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" /> },
        { type: "heading-2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" /> },
        { type: "heading-3", label: "Heading 3", icon: <span className="text-lg">3</span> },
        { type: "caption", label: "Caption", icon: <span className="text-sm italic">❝</span> },
    ]

    const filteredOptions = blockOptions.filter(o => o.label.toLowerCase().includes(filter.toLowerCase()))

    useEffect(() => {
        function handleKeyDown(e) {
            e.stopPropagation()
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
                    break
                case "Enter":
                    e.preventDefault()
                    filteredOptions[selectedIndex] && onSelect(filteredOptions[selectedIndex].type)
                    break
                case "Escape":
                    e.preventDefault()
                    onFilterChange("")
                    break
                default:
                    if (e.key.length === 1) onFilterChange(filter + e.key)
                    else if (e.key === "Backspace") onFilterChange(filter.slice(0, -1))
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [selectedIndex, filteredOptions, onSelect, filter, onFilterChange])

    useEffect(() => { setSelectedIndex(0) }, [filteredOptions.length])
    useEffect(() => {
        const el = document.getElementById(`block-option-${selectedIndex}`)
        if (el && menuRef.current) {
            const menuRect = menuRef.current.getBoundingClientRect()
            const selRect = el.getBoundingClientRect()
            if (selRect.bottom > menuRect.bottom) menuRef.current.scrollTop += selRect.bottom - menuRect.bottom
            else if (selRect.top < menuRect.top) menuRef.current.scrollTop -= menuRect.top - selRect.top
        }
    }, [selectedIndex])

    if (!filteredOptions.length) return null

    return (
        <div
            ref={menuRef}
            className="absolute z-10 bg-base-100 shadow-lg rounded-md border w-64 max-h-64 overflow-y-auto dropdown-content"
            style={{ top: position.top, left: position.left }}
            onClick={e => e.stopPropagation()}
        >
            {filter && <div className="px-3 py-2 text-sm text-gray-500 border-b">Filtering: {filter}</div>}
            <div className="py-1">
                {filteredOptions.map((opt, idx) => (
                    <div
                        id={`block-option-${idx}`}
                        key={opt.type}
                        className={cn("px-3 py-2 flex items-center gap-2 cursor-pointer", idx === selectedIndex && "bg-gray-100")}
                        onClick={() => onSelect(opt.type)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                    >
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{opt.icon}</div>
                        <div className="font-medium">{opt.label}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}
