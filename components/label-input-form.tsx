'use client'

import React from "react"

import { Settings2, AlertCircle } from 'lucide-react'
import type { LabelConfig } from '@/lib/label-field-config'

interface LabelInputFormProps {
  config: LabelConfig
  formData: Record<string, string>
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

/**
 * Generic label input form - renders fields dynamically from config.
 * Works for any product type: food, supplement, cosmetics, pharma.
 * 
 * This component is PURELY for data entry.
 * All validation and rounding is handled by AI via /api/analyze.
 */
export function LabelInputForm({ config, formData, onChange }: LabelInputFormProps) {
  // Split fields into groups
  const groupedFields = config.groups.map(group => ({
    ...group,
    fields: config.fields.filter(f => f.group === group.id),
  }))

  // Separate groups into two columns: left gets first half, right gets second half
  const midpoint = Math.ceil(groupedFields.length / 2)
  const leftGroups = groupedFields.slice(0, midpoint)
  const rightGroups = groupedFields.slice(midpoint)

  // Check if there are any "bottom" groups (ingredients, warnings) that span full width
  const fullWidthGroupIds = ['ingredients', 'warnings', 'other', 'manufacturer']
  const columnLeftGroups = leftGroups.filter(g => !fullWidthGroupIds.includes(g.id))
  const columnRightGroups = rightGroups.filter(g => !fullWidthGroupIds.includes(g.id))
  const bottomGroups = groupedFields.filter(g => fullWidthGroupIds.includes(g.id))

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
        <Settings2 size={18} className="text-muted-foreground" />
        <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider">
          Thong So Nhap Lieu - {config.name}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground italic">
          {config.regulation}
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {columnLeftGroups.map(group => (
            <FieldGroup key={group.id} group={group} formData={formData} onChange={onChange} />
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {columnRightGroups.map(group => (
            <FieldGroup key={group.id} group={group} formData={formData} onChange={onChange} />
          ))}
        </div>
      </div>

      {/* Full width bottom groups */}
      {bottomGroups.length > 0 && (
        <div className="p-6 pt-0 space-y-4">
          {bottomGroups.map(group => (
            <FieldGroup key={group.id} group={group} formData={formData} onChange={onChange} />
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-3 items-start">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
        <p className="text-[11px] text-amber-800 leading-relaxed">
          <strong>Luu y:</strong> {'Nhap gia tri tho (raw values). AI se tu dong kiem tra FDA rounding rules, %DV, va toan bo quy dinh tuan thu khi ban bam "Phan Tich AI". Du lieu knowledge base duoc cap nhat thuong xuyen tu FDA Warning Letters va regulations.'}
        </p>
      </div>
    </div>
  )
}

/** Render a group of fields */
function FieldGroup({
  group,
  formData,
  onChange,
}: {
  group: { id: string; label: string; fields: LabelConfig['fields'] }
  formData: Record<string, string>
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}) {
  // Separate text fields and number fields
  const numberFields = group.fields.filter(f => f.type === 'number')
  const textFields = group.fields.filter(f => f.type === 'text')
  const textareaFields = group.fields.filter(f => f.type === 'textarea')

  return (
    <div>
      <h3 className="text-xs font-bold text-primary uppercase border-b pb-1 mb-3">
        {group.label}
      </h3>

      {/* Text fields - full width */}
      {textFields.map(field => (
        <div key={field.key} className="mb-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {field.label}
          </label>
          <input
            name={field.key}
            value={formData[field.key] || ''}
            onChange={onChange}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-sm bg-background text-foreground"
          />
        </div>
      ))}

      {/* Number fields - 2 column grid */}
      {numberFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {numberFields.map(field => (
            <div key={field.key} className={numberFields.length === 1 ? 'col-span-2' : ''}>
              <label className="block text-[10px] font-medium text-muted-foreground uppercase">
                {field.label} {field.unit ? `(${field.unit})` : ''}
              </label>
              <input
                type="number"
                name={field.key}
                value={formData[field.key] || ''}
                onChange={onChange}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring focus:outline-none bg-background text-foreground"
              />
            </div>
          ))}
        </div>
      )}

      {/* Textarea fields - full width */}
      {textareaFields.map(field => (
        <div key={field.key} className="mt-3">
          <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-tighter">
            {field.label}
          </label>
          <textarea
            name={field.key}
            value={formData[field.key] || ''}
            onChange={onChange}
            rows={field.rows || 3}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-ring focus:outline-none bg-background text-foreground"
          />
        </div>
      ))}
    </div>
  )
}
