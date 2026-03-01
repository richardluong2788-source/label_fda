'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Loader2, CheckCircle, Database, Settings, ArrowUpDown, Brain, Shield, AlertTriangle } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Citation {
  id: string
  rank: number
  regulation_id: string
  section_refs: string[]
  title: string
  content: string
  category: string
  source: string
  similarity: number
  metadata?: Record<string, any>
  chunk_info?: string | null
  hybrid_boost?: number
  // Phase 2 reranker fields
  rerank_score?: number | null
  intent_boost?: number | null
  metadata_penalty?: number | null
  relevance_tier?: 'primary' | 'supporting' | 'related' | null
}

interface RerankStats {
  totalInput: number
  totalOutput: number
  avgFinalScore: number
  avgVectorScore: number
  avgRerankScore: number
  rerankedAt: string
  processingTimeMs: number
}

interface QueryIntent {
  category: string
  confidence: number
  keywords: string[]
}

export default function TestRAGPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Citation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState<number>(0)
  const [topK, setTopK] = useState(5)
  const [searchMethod, setSearchMethod] = useState<string>('')
  const [requestedCount, setRequestedCount] = useState<number>(0)

  // Phase 2: Reranker controls
  const [useReranker, setUseReranker] = useState(true)
  const [rerankStats, setRerankStats] = useState<RerankStats | null>(null)
  const [queryIntent, setQueryIntent] = useState<QueryIntent | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Reranker weight controls
  const [vectorWeight, setVectorWeight] = useState(55)
  const [keywordWeight, setKeywordWeight] = useState(25)
  const [rerankWeight, setRerankWeight] = useState(10)
  const [intentWeight, setIntentWeight] = useState(10)

  const testQueries = [
    'What are the FDA requirements for nutrition facts labeling?',
    'How should allergens be declared on food labels?',
    'What are the font size requirements for product names?',
    'Serving size declaration requirements',
    'Health claims regulations for food products',
    'Cosmetic labeling requirements Part 701',
    'Drug vs cosmetic classification rules',
    'Net quantity statement requirements'
  ]

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])
    setRerankStats(null)
    setQueryIntent(null)
    const startTime = Date.now()

    try {
      const rerankConfig = useReranker ? {
        vectorWeight: vectorWeight / 100,
        keywordWeight: keywordWeight / 100,
        rerankWeight: rerankWeight / 100,
        intentWeight: intentWeight / 100,
      } : {}

      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: query,
          limit: topK,
          useReranker,
          rerankConfig,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      const endTime = Date.now()
      setSearchTime(endTime - startTime)
      setResults(data.results || [])
      setSearchMethod(data.method || 'unknown')
      setRequestedCount(data.requested || topK)

      // Phase 2: Reranker metadata
      if (data.reranker?.enabled) {
        setRerankStats(data.reranker.stats)
        setQueryIntent(data.reranker.queryIntent)
      }

    } catch (err: any) {
      console.error('[v0] Search error:', err)
      setError(err.message || 'Search error')
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-600'
    if (score >= 0.5) return 'bg-blue-600'
    if (score >= 0.35) return 'bg-yellow-600'
    return 'bg-zinc-500'
  }

  const getTierColor = (tier: string | null | undefined) => {
    switch (tier) {
      case 'primary': return 'bg-green-100 text-green-800 border-green-300'
      case 'supporting': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'related': return 'bg-zinc-100 text-zinc-700 border-zinc-300'
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-300'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-800'
      case 'drug': return 'bg-red-100 text-red-800'
      case 'cosmetic': return 'bg-pink-100 text-pink-800'
      case 'supplement': return 'bg-purple-100 text-purple-800'
      case 'device': return 'bg-cyan-100 text-cyan-800'
      case 'mixed': return 'bg-amber-100 text-amber-800'
      default: return 'bg-zinc-100 text-zinc-800'
    }
  }

  const totalWeights = vectorWeight + keywordWeight + rerankWeight + intentWeight

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold font-sans text-foreground">Test RAG System</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Database className="mr-1 h-3 w-3" />
              Phase 2: Reranker
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground">
          Test vector search + reranker pipeline with intent classification and metadata validation
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Query</CardTitle>
          <CardDescription>
            Search regulations with Phase 2 Reranker (weighted fusion scoring)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Query:</label>
            <Textarea
              placeholder="E.g.: What are the requirements for nutrition facts panel?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="mb-3"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quick Tests:</label>
            <div className="flex flex-wrap gap-2">
              {testQueries.map((q, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(q)}
                  disabled={loading}
                >
                  {q.substring(0, 40)}...
                </Button>
              ))}
            </div>
          </div>

          {/* Search Controls */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Top-K: {topK}
                </label>
              </div>
              <Slider
                value={[topK]}
                onValueChange={(value) => setTopK(value[0])}
                min={3}
                max={20}
                step={1}
                className="w-full"
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Reranker
              </label>
              <Switch
                checked={useReranker}
                onCheckedChange={setUseReranker}
                disabled={loading}
              />
            </div>
          </div>

          {/* Advanced Reranker Config */}
          {useReranker && (
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Weights
                  {totalWeights !== 100 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Sum: {totalWeights}% (should be 100%)
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2 p-4 border rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">
                  Adjust scoring weights. Formula: final = (vector * W_v) + (keyword * W_k) + (rerank * W_r) + (intent * W_i) - penalty
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Vector Similarity: {vectorWeight}%</label>
                    <Slider value={[vectorWeight]} onValueChange={(v) => setVectorWeight(v[0])} min={0} max={100} step={5} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Keyword Match: {keywordWeight}%</label>
                    <Slider value={[keywordWeight]} onValueChange={(v) => setKeywordWeight(v[0])} min={0} max={100} step={5} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Cross-Encoder: {rerankWeight}%</label>
                    <Slider value={[rerankWeight]} onValueChange={(v) => setRerankWeight(v[0])} min={0} max={100} step={5} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Intent Alignment: {intentWeight}%</label>
                    <Slider value={[intentWeight]} onValueChange={(v) => setIntentWeight(v[0])} min={0} max={100} step={5} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Button 
            onClick={handleSearch} 
            disabled={loading || !query.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Top {topK} {useReranker ? '(with Reranker)' : '(without Reranker)'}
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Phase 2: Query Intent + Reranker Stats */}
      {(queryIntent || rerankStats) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {queryIntent && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Query Intent Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <Badge className={getCategoryColor(queryIntent.category)}>
                    {queryIntent.category.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({(queryIntent.confidence * 100).toFixed(0)}% confidence)
                  </span>
                </div>
                {queryIntent.keywords.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Keywords:</span>
                    {queryIntent.keywords.slice(0, 5).map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {rerankStats && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  Reranker Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Input / Output:</span>
                    <span className="ml-1 font-medium">{rerankStats.totalInput} / {rerankStats.totalOutput}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Processing:</span>
                    <span className="ml-1 font-medium">{rerankStats.processingTimeMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Vector:</span>
                    <span className="ml-1 font-medium">{(rerankStats.avgVectorScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Final:</span>
                    <span className="ml-1 font-medium font-mono">{(rerankStats.avgFinalScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Rerank:</span>
                    <span className="ml-1 font-medium">{(rerankStats.avgRerankScore * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              {results.length} results
              {requestedCount > 0 && results.length < requestedCount && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({requestedCount} requested, {results.length} after filtering)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <CheckCircle className="mr-1 h-3 w-3" />
                {searchTime}ms total
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {searchMethod}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({results.length})</TabsTrigger>
              <TabsTrigger value="primary">
                Primary ({results.filter(r => r.relevance_tier === 'primary').length})
              </TabsTrigger>
              <TabsTrigger value="supporting">
                Supporting ({results.filter(r => r.relevance_tier === 'supporting').length})
              </TabsTrigger>
              <TabsTrigger value="related">
                Related ({results.filter(r => r.relevance_tier === 'related').length})
              </TabsTrigger>
            </TabsList>

            {['all', 'primary', 'supporting', 'related'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                {results
                  .filter(r => tab === 'all' || r.relevance_tier === tab)
                  .map((result, idx) => (
                  <Card
                    key={result.id || idx}
                    className="border-l-4"
                    style={{ borderLeftColor: getSimilarityColor(result.similarity).replace('bg-', '').includes('green') ? '#16a34a' : getSimilarityColor(result.similarity).includes('blue') ? '#2563eb' : getSimilarityColor(result.similarity).includes('yellow') ? '#ca8a04' : '#71717a' }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs shrink-0">
                              #{idx + 1}
                            </Badge>
                            {result.relevance_tier && (
                              <Badge className={`text-xs shrink-0 ${getTierColor(result.relevance_tier)}`}>
                                {result.relevance_tier}
                              </Badge>
                            )}
                            <CardTitle className="text-base flex-1 leading-snug">
                              {result.title}
                            </CardTitle>
                            <Badge 
                              className={`${getSimilarityColor(result.similarity)} text-white shrink-0`}
                            >
                              {(result.similarity * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          <CardDescription className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="font-medium text-muted-foreground">Source:</span>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                                {result.source}
                              </code>
                              <span className="font-medium text-muted-foreground">ID:</span>
                              <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                                {result.regulation_id}
                              </code>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="secondary" className="text-xs">
                                {result.category}
                              </Badge>
                              {result.section_refs?.slice(0, 5).map((ref, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-mono">
                                  {ref}
                                </Badge>
                              ))}
                              {(result.section_refs?.length || 0) > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.section_refs!.length - 5} more
                                </Badge>
                              )}
                              {result.chunk_info && (
                                <Badge variant="outline" className="text-xs">
                                  {result.chunk_info}
                                </Badge>
                              )}
                            </div>
                            {/* Phase 2: Reranker scoring breakdown */}
                            {useReranker && (result.rerank_score != null || result.intent_boost != null) && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-1 pt-1 border-t border-dashed">
                                {result.hybrid_boost != null && result.hybrid_boost > 0 && (
                                  <Badge variant="default" className="text-xs bg-green-700 text-white">
                                    KW +{(result.hybrid_boost * 100).toFixed(0)}%
                                  </Badge>
                                )}
                                {result.rerank_score != null && (
                                  <Badge variant="outline" className="text-xs">
                                    Rerank: {(result.rerank_score * 100).toFixed(0)}%
                                  </Badge>
                                )}
                                {result.intent_boost != null && result.intent_boost > 0 && (
                                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                    <Brain className="mr-0.5 h-2.5 w-2.5" />
                                    Intent +{(result.intent_boost * 100).toFixed(0)}%
                                  </Badge>
                                )}
                                {result.metadata_penalty != null && result.metadata_penalty > 0 && (
                                  <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                                    <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                                    Penalty -{(result.metadata_penalty * 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {result.content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {results.filter(r => tab === 'all' || r.relevance_tier === tab).length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      No {tab} results found.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No results found. Try a different query.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
