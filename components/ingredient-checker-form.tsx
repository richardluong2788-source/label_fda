'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface IngredientCheckerFormProps {
  onAnalyze: (ingredients: string[], language: string) => Promise<void>
  isLoading?: boolean
}

export function IngredientCheckerForm({ onAnalyze, isLoading = false }: IngredientCheckerFormProps) {
  const [ingredientText, setIngredientText] = useState('')
  const [language, setLanguage] = useState('en')
  const { toast } = useToast()

  const handleAnalyze = async () => {
    if (!ingredientText.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter ingredient list',
        variant: 'destructive',
      })
      return
    }

    // Parse ingredients - split by comma or newline
    const ingredients = ingredientText
      .split(/[,\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0)

    if (ingredients.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid ingredients found',
        variant: 'destructive',
      })
      return
    }

    await onAnalyze(ingredients, language)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingredient Check</CardTitle>
        <CardDescription>
          Enter ingredients to check for FDA compliance issues, allergens, and naming standards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Selection */}
        <div className="space-y-3">
          <Label>Language</Label>
          <ToggleGroup type="single" value={language} onValueChange={setLanguage}>
            <ToggleGroupItem value="en">English</ToggleGroupItem>
            <ToggleGroupItem value="vi">Vietnamese</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Ingredient Input */}
        <div className="space-y-3">
          <Label htmlFor="ingredients">Ingredient List</Label>
          <Textarea
            id="ingredients"
            placeholder="Enter ingredients separated by commas or new lines&#10;&#10;Example:&#10;Water, Salt, Sugar&#10;or&#10;Water&#10;Salt&#10;Sugar"
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Separate multiple ingredients with commas or newlines
          </p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !ingredientText.trim()}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Ingredients'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
