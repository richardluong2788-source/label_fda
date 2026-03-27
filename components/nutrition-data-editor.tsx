'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, Pencil, X, Plus, Trash2 } from 'lucide-react'

interface NutritionFact {
  name: string
  value: number
  unit: string
  dailyValue?: number | null
}

interface NutritionDataEditorProps {
  initialData: NutritionFact[]
  onSave: (data: NutritionFact[]) => void
  onCancel: () => void
  confidence?: number
}

export function NutritionDataEditor({ initialData, onSave, onCancel, confidence }: NutritionDataEditorProps) {
  const [facts, setFacts] = useState<NutritionFact[]>(initialData)
  const [isEditing, setIsEditing] = useState(true)

  const updateFact = (index: number, field: keyof NutritionFact, value: any) => {
    const updated = [...facts]
    updated[index] = { ...updated[index], [field]: value }
    setFacts(updated)
  }

  const removeFact = (index: number) => {
    setFacts(facts.filter((_, i) => i !== index))
  }

  const addFact = () => {
    setFacts([...facts, { name: '', value: 0, unit: 'g', dailyValue: null }])
  }

  const handleSave = () => {
    onSave(facts.filter(f => f.name && f.name.trim().length > 0))
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">AI-Extracted Nutrition Facts</h3>
            <p className="text-sm text-muted-foreground">
              Xác nhận và chỉnh sửa các giá trị AI trích xuất được trước khi tiếp tục
            </p>
          </div>
          {confidence !== undefined && (
            <Badge variant={confidence > 0.8 ? 'default' : 'secondary'}>
              Confidence: {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>

        {confidence !== undefined && confidence < 0.8 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Độ chính xác thấp phát hiện</p>
              <p className="text-amber-800 mt-1">
                AI không chắc chắn về dữ liệu trích xuất. Vui lòng kiểm tra kỹ các giá trị bên dưới với nhãn gốc.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {facts.map((fact, index) => (
            <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
              <div className="flex-1 grid grid-cols-4 gap-2">
                <Input
                  placeholder="Nutrient name"
                  value={fact.name}
                  onChange={(e) => updateFact(index, 'name', e.target.value)}
                  disabled={!isEditing}
                  className="col-span-1"
                />
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={fact.value}
                    onChange={(e) => updateFact(index, 'value', parseFloat(e.target.value) || 0)}
                    disabled={!isEditing}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Unit"
                    value={fact.unit}
                    onChange={(e) => updateFact(index, 'unit', e.target.value)}
                    disabled={!isEditing}
                    className="w-16"
                  />
                </div>
                <Input
                  type="number"
                  placeholder="% DV (optional)"
                  value={fact.dailyValue ?? ''}
                  onChange={(e) => updateFact(index, 'dailyValue', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={!isEditing}
                />
              </div>
              {isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFact(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {isEditing && (
          <Button variant="outline" onClick={addFact} className="w-full bg-transparent">
            <Plus className="mr-2 h-4 w-4" />
            Thêm nutrient
          </Button>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
            <X className="mr-2 h-4 w-4" />
            Hủy
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Check className="mr-2 h-4 w-4" />
            Xác nhận và phân tích
          </Button>
        </div>
      </div>
    </Card>
  )
}
