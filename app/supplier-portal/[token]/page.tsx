'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AlertTriangle, 
  Clock, 
  ShieldX, 
  FileX,
  ArrowLeft,
  Building2,
  CheckCircle2
} from 'lucide-react'
import { SupplierAuthModal } from '@/components/supplier-portal/auth-modal'
import { RequestInfoCard } from '@/components/supplier-portal/request-info-card'
import { DocumentUploadForm } from '@/components/supplier-portal/document-upload-form'
import type { TokenValidationResult, DocumentRequestWithDetails } from '@/lib/supplier-portal-types'
import { createClient } from '@/lib/supabase/client'

interface PageProps {
  params: Promise<{ token: string }>
}

type PageState = 'loading' | 'invalid' | 'expired' | 'revoked' | 'not_found' | 'auth_required' | 'ready'

export default function SupplierPortalPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token
  const router = useRouter()
  const supabase = createClient()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [request, setRequest] = useState<DocumentRequestWithDetails | null>(null)
  const [tokenData, setTokenData] = useState<TokenValidationResult['token'] | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<'guest' | 'authenticated' | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Check if user is already authenticated
  const checkExistingAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  // Validate token and load request
  const loadRequest = async () => {
    try {
      const response = await fetch(`/api/supplier-portal/${token}`)
      const data: TokenValidationResult = await response.json()

      if (!data.valid) {
        switch (data.errorCode) {
          case 'INVALID_TOKEN':
            setPageState('invalid')
            setErrorMessage(data.error || 'Invalid link')
            break
          case 'EXPIRED_TOKEN':
            setPageState('expired')
            setErrorMessage(data.error || 'This link has expired')
            break
          case 'REVOKED_TOKEN':
            setPageState('revoked')
            setErrorMessage(data.error || 'This link has been revoked')
            break
          case 'REQUEST_NOT_FOUND':
            setPageState('not_found')
            setErrorMessage(data.error || 'Request not found')
            break
          default:
            setPageState('invalid')
            setErrorMessage(data.error || 'Unknown error')
        }
        return
      }

      setRequest(data.request!)
      setTokenData(data.token!)

      // Check if user is already authenticated
      const user = await checkExistingAuth()
      if (user) {
        // Create authenticated session
        const sessionRes = await fetch(`/api/supplier-portal/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'authenticated_session' })
        })

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          setSessionId(sessionData.sessionId)
          setSessionType('authenticated')
          setPageState('ready')
          return
        }
      }

      // Not authenticated - show auth modal
      setPageState('auth_required')
      setShowAuthModal(true)

    } catch (error) {
      console.error('Error loading request:', error)
      setPageState('invalid')
      setErrorMessage('Failed to load request. Please try again.')
    }
  }

  useEffect(() => {
    loadRequest()
  }, [token])

  const handleAuthSuccess = (newSessionId: string, type: 'guest' | 'authenticated') => {
    setSessionId(newSessionId)
    setSessionType(type)
    setPageState('ready')
  }

  const handleUploadSuccess = () => {
    // Reload request to get updated uploaded documents
    loadRequest()
  }

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Error states
  if (pageState === 'invalid' || pageState === 'expired' || pageState === 'revoked' || pageState === 'not_found') {
    const errorConfig = {
      invalid: {
        icon: FileX,
        title: 'Invalid Link',
        description: 'This link is not valid. Please check the link or contact the importer.'
      },
      expired: {
        icon: Clock,
        title: 'Link Expired',
        description: 'This link has expired. Please contact the importer to request a new link.'
      },
      revoked: {
        icon: ShieldX,
        title: 'Link Revoked',
        description: 'This link has been revoked by the importer. Please contact them for more information.'
      },
      not_found: {
        icon: AlertTriangle,
        title: 'Request Not Found',
        description: 'The document request associated with this link could not be found.'
      }
    }

    const config = errorConfig[pageState]
    const Icon = config.icon

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auth required state - show modal
  if (pageState === 'auth_required') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Supplier Document Portal</h1>
            </div>
            <p className="text-muted-foreground">
              Please verify your identity to access this document request
            </p>
          </div>

          {/* Request preview (limited info) */}
          {request && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Document Request</CardTitle>
                <CardDescription>
                  From {request.importer?.company_name || request.importer?.email || 'Importer'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  You have been requested to provide documentation. Please verify your identity to continue.
                </p>
              </CardContent>
            </Card>
          )}

          <Button onClick={() => setShowAuthModal(true)} className="w-full max-w-md">
            Continue to Verify Identity
          </Button>
        </div>

        <SupplierAuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          token={token}
          supplierEmail={tokenData?.supplier_email}
          supplierName={tokenData?.supplier_name}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    )
  }

  // Ready state - show full portal
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Supplier Document Portal</h1>
            </div>
            {sessionType === 'authenticated' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Signed in
              </div>
            )}
            {sessionType === 'guest' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Guest access
              </div>
            )}
          </div>
          <p className="text-muted-foreground">
            Upload the requested documents for the importer to review
          </p>
        </div>

        <div className="space-y-6">
          {/* Request info */}
          {request && <RequestInfoCard request={request} />}

          {/* Upload form */}
          {request && sessionId && (
            <DocumentUploadForm
              requestId={request.id}
              token={token}
              sessionId={sessionId}
              requestedDocuments={request.requested_documents || []}
              uploadedDocuments={request.uploaded_documents || []}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Powered by VeXIM - FDA Compliance Platform
          </p>
        </div>
      </div>
    </div>
  )
}
