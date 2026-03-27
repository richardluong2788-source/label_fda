'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GraduationCap,
  Users,
  FileSearch,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Beaker,
  Shield,
  ListChecks,
  ChevronRight,
  Bell,
  Settings,
  TrendingUp,
  Calendar,
  Star,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  FileText,
  ClipboardCheck,
  UserCheck
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Mock data for demo
const mockAssignments = [
  {
    id: '1',
    importer_name: 'Pacific Foods Import LLC',
    importer_email: 'compliance@pacificfoods.com',
    status: 'active',
    start_date: '2025-01-15',
    products_count: 12,
    suppliers_count: 5,
    pending_reviews: 3,
    last_activity: '2025-03-10',
  },
  {
    id: '2',
    importer_name: 'Golden Gate Imports Inc.',
    importer_email: 'fsvp@goldengateimports.com',
    status: 'active',
    start_date: '2024-11-20',
    products_count: 28,
    suppliers_count: 8,
    pending_reviews: 7,
    last_activity: '2025-03-12',
  },
  {
    id: '3',
    importer_name: 'Fresh Harvest Trading',
    importer_email: 'regulatory@freshharvest.com',
    status: 'pending',
    start_date: null,
    products_count: 0,
    suppliers_count: 0,
    pending_reviews: 0,
    last_activity: null,
  },
]

const mockReviewQueue = [
  {
    id: '1',
    type: 'hazard_analysis',
    title: 'Hazard Analysis: Frozen Shrimp (Thailand)',
    importer: 'Pacific Foods Import LLC',
    priority: 'high',
    due_date: '2025-03-18',
    created_at: '2025-03-08',
  },
  {
    id: '2',
    type: 'supplier_evaluation',
    title: 'Supplier Evaluation: Seafood Processing Co.',
    importer: 'Golden Gate Imports Inc.',
    priority: 'normal',
    due_date: '2025-03-25',
    created_at: '2025-03-10',
  },
  {
    id: '3',
    type: 'verification_plan',
    title: 'Annual Verification Plan: Canned Vegetables',
    importer: 'Golden Gate Imports Inc.',
    priority: 'high',
    due_date: '2025-03-20',
    created_at: '2025-03-05',
  },
  {
    id: '4',
    type: 'corrective_action',
    title: 'CAPA Review: Listeria Detection - Supplier ABC',
    importer: 'Pacific Foods Import LLC',
    priority: 'urgent',
    due_date: '2025-03-15',
    created_at: '2025-03-12',
  },
]

export default function QIDashboardPage() {
  const { t, locale } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // Stats calculation
  const stats = {
    activeClients: mockAssignments.filter(a => a.status === 'active').length,
    pendingInvitations: mockAssignments.filter(a => a.status === 'pending').length,
    pendingReviews: mockReviewQueue.length,
    urgentItems: mockReviewQueue.filter(r => r.priority === 'urgent').length,
    completedThisMonth: 15,
    avgResponseTime: '1.5 days',
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getReviewTypeIcon = (type: string) => {
    switch (type) {
      case 'hazard_analysis': return <Beaker className="h-4 w-4" />
      case 'supplier_evaluation': return <Building2 className="h-4 w-4" />
      case 'verification_plan': return <Shield className="h-4 w-4" />
      case 'corrective_action': return <AlertTriangle className="h-4 w-4" />
      default: return <FileSearch className="h-4 w-4" />
    }
  }

  const getReviewTypeLabel = (type: string) => {
    switch (type) {
      case 'hazard_analysis': return 'Hazard Analysis'
      case 'supplier_evaluation': return 'Supplier Evaluation'
      case 'verification_plan': return 'Verification Plan'
      case 'corrective_action': return 'Corrective Action'
      default: return 'Review'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-600">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {locale === 'vi' ? 'QI Dashboard' : 'QI Dashboard'}
              </h1>
              <Badge variant="outline" className="border-violet-500 text-violet-700">
                Qualified Individual
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {locale === 'vi' 
                ? 'Quản lý FSVP compliance activities cho các Importers'
                : 'Manage FSVP compliance activities for your Importer clients'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            {locale === 'vi' ? 'Thông báo' : 'Notifications'}
            {stats.urgentItems > 0 && (
              <Badge className="ml-2 bg-red-500">{stats.urgentItems}</Badge>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {locale === 'vi' ? 'Cài đặt' : 'Settings'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.activeClients}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {locale === 'vi' ? 'Active Clients' : 'Active Clients'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <FileSearch className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.pendingReviews}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {locale === 'vi' ? 'Hoàn thành tháng này' : 'Completed This Month'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {locale === 'vi' ? 'Thời gian phản hồi TB' : 'Avg. Response Time'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Alert */}
      {stats.urgentItems > 0 && (
        <Alert className="border-red-500/50 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">
            {locale === 'vi' ? 'Cần xử lý gấp' : 'Urgent Action Required'}
          </AlertTitle>
          <AlertDescription className="text-red-700">
            {locale === 'vi'
              ? `Bạn có ${stats.urgentItems} items cần xử lý khẩn cấp trong hàng đợi review.`
              : `You have ${stats.urgentItems} urgent items requiring immediate attention in your review queue.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full lg:w-auto lg:grid-cols-none lg:flex grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            <span className="hidden sm:inline">
              Review Queue
              {stats.pendingReviews > 0 && (
                <Badge className="ml-2" variant="secondary">{stats.pendingReviews}</Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pending Reviews Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    {locale === 'vi' ? 'Pending Reviews' : 'Pending Reviews'}
                  </CardTitle>
                  <CardDescription>
                    {locale === 'vi'
                      ? 'Items đang chờ bạn review và phê duyệt'
                      : 'Items awaiting your review and approval'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockReviewQueue.slice(0, 4).map((review) => (
                      <div
                        key={review.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            review.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                            review.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                            'bg-violet-100 text-violet-600'
                          }`}>
                            {getReviewTypeIcon(review.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{review.title}</p>
                            <p className="text-xs text-muted-foreground">{review.importer}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(review.priority)}>
                            {review.priority}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setActiveTab('reviews')}>
                    {locale === 'vi' ? 'Xem tất cả' : 'View All Reviews'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>{locale === 'vi' ? 'Quick Actions' : 'Quick Actions'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('reviews')}>
                      <ListChecks className="h-6 w-6 text-violet-600" />
                      <span>{locale === 'vi' ? 'Process Review Queue' : 'Process Review Queue'}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" onClick={() => setActiveTab('clients')}>
                      <Users className="h-6 w-6 text-violet-600" />
                      <span>{locale === 'vi' ? 'Manage Clients' : 'Manage Clients'}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                      <FileText className="h-6 w-6 text-violet-600" />
                      <span>{locale === 'vi' ? 'Generate Report' : 'Generate Report'}</span>
                    </Button>
                    <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2">
                      <Calendar className="h-6 w-6 text-violet-600" />
                      <span>{locale === 'vi' ? 'Schedule Review' : 'Schedule Review'}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Clients Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {locale === 'vi' ? 'Client Summary' : 'Client Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Clients</span>
                    <span className="font-semibold">{stats.activeClients}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Invitations</span>
                    <Badge variant="outline">{stats.pendingInvitations}</Badge>
                  </div>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => setActiveTab('clients')}>
                    {locale === 'vi' ? 'Xem Clients' : 'View Clients'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Profile Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {locale === 'vi' ? 'QI Profile' : 'QI Profile'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground ml-1">4.8</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Reviews Completed</span>
                      <span className="font-medium">156</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Client Satisfaction</span>
                      <span className="font-medium">98%</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    {locale === 'vi' ? 'Edit Profile' : 'Edit Profile'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {locale === 'vi' ? 'Your Clients' : 'Your Clients'}
                  </CardTitle>
                  <CardDescription>
                    {locale === 'vi'
                      ? 'Importers bạn đang hỗ trợ với FSVP compliance'
                      : 'Importers you are currently supporting with FSVP compliance'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={locale === 'vi' ? 'Tìm client...' : 'Search clients...'}
                      className="pl-9 w-[200px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{assignment.importer_name}</h3>
                          <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                            {assignment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{assignment.importer_email}</p>
                        {assignment.status === 'active' && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{assignment.products_count} products</span>
                            <span>{assignment.suppliers_count} suppliers</span>
                            {assignment.pending_reviews > 0 && (
                              <Badge variant="outline" className="text-amber-700 border-amber-200">
                                {assignment.pending_reviews} pending
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.status === 'pending' ? (
                        <>
                          <Button size="sm" variant="outline">
                            {locale === 'vi' ? 'Từ chối' : 'Decline'}
                          </Button>
                          <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                            {locale === 'vi' ? 'Chấp nhận' : 'Accept'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {locale === 'vi' ? 'Xem chi tiết' : 'View Details'}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View FSVP Records</DropdownMenuItem>
                              <DropdownMenuItem>Contact Importer</DropdownMenuItem>
                              <DropdownMenuItem>Generate Report</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">End Assignment</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Queue Tab */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    {locale === 'vi' ? 'Review Queue' : 'Review Queue'}
                  </CardTitle>
                  <CardDescription>
                    {locale === 'vi'
                      ? 'Items cần bạn review và phê duyệt theo 21 CFR 1.502-1.510'
                      : 'Items requiring your review and approval per 21 CFR 1.502-1.510'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReviewQueue.map((review) => (
                  <div
                    key={review.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                      review.priority === 'urgent' ? 'border-red-200 bg-red-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        review.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                        review.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                        'bg-violet-100 text-violet-600'
                      }`}>
                        {getReviewTypeIcon(review.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{review.title}</h3>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span>{review.importer}</span>
                          <span>Due: {review.due_date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(review.priority)}>
                        {review.priority}
                      </Badge>
                      <Badge variant="outline">
                        {getReviewTypeLabel(review.type)}
                      </Badge>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                        <UserCheck className="h-4 w-4 mr-2" />
                        {locale === 'vi' ? 'Review' : 'Review'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                {locale === 'vi' ? 'Review History' : 'Review History'}
              </CardTitle>
              <CardDescription>
                {locale === 'vi'
                  ? 'Lịch sử các reviews bạn đã hoàn thành'
                  : 'History of reviews you have completed'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>
                  {locale === 'vi'
                    ? 'Lịch sử review sẽ hiển thị ở đây.'
                    : 'Your review history will appear here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
