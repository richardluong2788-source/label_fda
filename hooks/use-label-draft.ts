'use client'

import React from "react"

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  type LabelConfig,
  getLabelConfig,
  getDefaultFormData,
  buildNutritionFacts,
} from '@/lib/label-field-config'
import { toast } from '@/hooks/use-toast'

export function useLabelDraft(initialCategoryId = 'conventional-foods') {
  const router = useRouter()
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [submitting, setSubmitting] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const config = useMemo(() => getLabelConfig(categoryId), [categoryId])
  const [formData, setFormData] = useState<Record<string, string>>(
    () => getDefaultFormData(config)
  )

  /** Switch product category - resets form to new defaults */
  const switchCategory = useCallback(
    (newCategoryId: string) => {
      const newConfig = getLabelConfig(newCategoryId)
      setCategoryId(newCategoryId)
      setFormData(getDefaultFormData(newConfig))
    },
    []
  )

  /** Update a single field */
  const updateField = useCallback(
    (key: string, value: string) => {
      setFormData(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  /** Handle native input change events */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      updateField(name, value)
    },
    [updateField]
  )

  /** Save draft to DB without AI analysis */
  const handleSave = useCallback(async () => {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('You must be logged in')

      const nutritionFacts = buildNutritionFacts(config, formData)

      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .insert({
          user_id: user.id,
          status: 'pending',
          label_image_url: 'manual-entry',
          product_category: categoryId,
          nutrition_facts: nutritionFacts,
          ingredient_list: formData.ingredients || formData.otherIngredients || null,
          allergen_declaration: formData.allergens || null,
          form_data: formData,
        })
        .select()
        .single()

      if (reportError) throw reportError
      router.push(`/audit/${report.id}`)
    } catch (error) {
      console.error('[v0] Draft submission error:', error)
      toast({ title: 'Loi', description: 'Khong the tao bao cao. Vui long thu lai.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [config, formData, categoryId, router])

  /** Save + trigger AI analysis */
  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('You must be logged in')

      const nutritionFacts = buildNutritionFacts(config, formData)

      const { data: report, error: reportError } = await supabase
        .from('audit_reports')
        .insert({
          user_id: user.id,
          status: 'pending',
          label_image_url: 'manual-entry',
          product_category: categoryId,
          nutrition_facts: nutritionFacts,
          ingredient_list: formData.ingredients || formData.otherIngredients || null,
          allergen_declaration: formData.allergens || null,
          form_data: formData,
        })
        .select()
        .single()

      if (reportError) throw reportError

      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, phase: 'full' }),
      })

      if (!analyzeResponse.ok) throw new Error('AI analysis failed')

      router.push(`/audit/${report.id}`)
    } catch (error) {
      console.error('[v0] AI analysis error:', error)
      toast({ title: 'Loi', description: 'Khong the phan tich. Vui long thu lai.', variant: 'destructive' })
    } finally {
      setAnalyzing(false)
    }
  }, [config, formData, categoryId, router])

  return {
    categoryId,
    config,
    formData,
    submitting,
    analyzing,
    switchCategory,
    updateField,
    handleChange,
    handleSave,
    handleAnalyze,
  }
}
