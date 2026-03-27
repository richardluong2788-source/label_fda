'use client'

import React from 'react'

// ────────────────────────────────────────────────────────────
// Simple Markdown Renderer for AI-generated content
// ────────────────────────────────────────────────────────────

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul'
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 space-y-1 text-sm text-slate-700`}
        >
          {listItems}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  const formatInline = (text: string) => {
    // Handle **bold** and *italic*
    const parts: React.ReactNode[] = []
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      if (match[1]) {
        parts.push(<strong key={match.index} className="font-semibold text-slate-800">{match[1]}</strong>)
      } else if (match[2]) {
        parts.push(<em key={match.index}>{match[2]}</em>)
      }
      lastIndex = regex.lastIndex
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    return parts.length > 0 ? parts : [text]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines
    if (!line) {
      flushList()
      continue
    }

    // Headers: ### / ## / #
    const h3Match = line.match(/^###\s+(.+)/)
    if (h3Match) {
      flushList()
      elements.push(
        <h4 key={`h3-${i}`} className="text-xs font-bold uppercase tracking-wider text-slate-600 mt-3 mb-1.5">
          {formatInline(h3Match[1].replace(/#+$/, '').trim())}
        </h4>
      )
      continue
    }

    const h2Match = line.match(/^##\s+(.+)/)
    if (h2Match) {
      flushList()
      elements.push(
        <h3 key={`h2-${i}`} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
          {formatInline(h2Match[1].replace(/#+$/, '').trim())}
        </h3>
      )
      continue
    }

    const h1Match = line.match(/^#\s+(.+)/)
    if (h1Match) {
      flushList()
      elements.push(
        <h3 key={`h1-${i}`} className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
          {formatInline(h1Match[1].replace(/#+$/, '').trim())}
        </h3>
      )
      continue
    }

    // Unordered list: - item
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    if (ulMatch) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(ulMatch[1])}
        </li>
      )
      continue
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\d+[.)]\s+(.+)/)
    if (olMatch) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(
        <li key={`li-${i}`} className="leading-relaxed">
          {formatInline(olMatch[1])}
        </li>
      )
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={`p-${i}`} className="text-sm text-slate-700 leading-relaxed">
        {formatInline(line)}
      </p>
    )
  }

  flushList()

  return <div className={`space-y-2 ${className || ''}`}>{elements}</div>
}
