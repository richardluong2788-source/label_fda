'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  GraduationCap, 
  UserPlus, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Building2,
  Search,
  Star,
  Shield,
  ExternalLink,
  Users,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface QIProfile {
  id: string
  name: string
  email: string
  credentials: string[]
  certifications: string[]
  experience_years: number
  specializations: string[]
  rating: number
  active_clients: number
  status: 'available' | 'busy' | 'unavailable'
  verified: boolean
  former_fda: boolean
}

// Mock QI profiles for demonstration
const mockQIProfiles: QIProfile[] = [
  {
    id: 'qi-1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@fsvp-experts.com',
    credentials: ['PhD Food Science', 'PCQI Certified', 'Lead Auditor'],
    certifications: ['SQF Practitioner', 'FSSC 22000 Lead Auditor'],
    experience_years: 15,
    specializations: ['Seafood', 'Ready-to-Eat Foods', 'SAHCODHA Products'],
    rating: 4.9,
    active_clients: 12,
    status: 'available',
    verified: true,
    former_fda: true,
  },
  {
    id: 'qi-2',
    name: 'Michael Chen',
    email: 'mchen@foodsafety-consulting.com',
    credentials: ['MS Food Safety', 'PCQI Certified', 'HACCP Manager'],
    certifications: ['BRC Lead Auditor', 'ISO 22000 Auditor'],
    experience_years: 10,
    specializations: ['Produce', 'Grains', 'Spices'],
    rating: 4.7,
    active_clients: 8,
    status: 'available',
    verified: true,
    former_fda: false,
  },
  {
    id: 'qi-3',
    name: 'Jennifer Williams',
    email: 'jwilliams@qi-services.com',
    credentials: ['MS Microbiology', 'PCQI Certified'],
    certifications: ['SQF Practitioner'],
    experience_years: 7,
    specializations: ['Dairy', 'Beverages'],
    rating: 4.5,
    active_clients: 15,
    status: 'busy',
    verified: true,
    former_fda: false,
  },
]

interface QIAssignment {
  id: string
  qi_id: string
  qi_name: string
  qi_email: string
  status: 'pending' | 'active' | 'declined' | 'expired'
  assigned_date: string
  response_date?: string
  scope: string[]
}

export function QIAssignmentManager() {
  const { locale } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedQI, setSelectedQI] = useState<QIProfile | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [assignments, setAssignments] = useState<QIAssignment[]>([])

  const filteredQIs = mockQIProfiles.filter(qi => 
    qi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    qi.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
    qi.credentials.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleInviteQI = () => {
    if (!selectedQI) return
    
    const newAssignment: QIAssignment = {
      id: `assignment-${Date.now()}`,
      qi_id: selectedQI.id,
      qi_name: selectedQI.name,
      qi_email: selectedQI.email,
      status: 'pending',
      assigned_date: new Date().toISOString(),
      scope: ['Hazard Analysis Review', 'Supplier Verification', 'Annual FSVP Review'],
    }
    
    setAssignments([...assignments, newAssignment])
    setShowInviteDialog(false)
    setSelectedQI(null)
    setInviteMessage('')
  }

  const getStatusBadge = (status: QIAssignment['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-500"><Clock className="h-3 w-3 mr-1" /> {locale === 'vi' ? 'Chờ phản hồi' : 'Pending'}</Badge>
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> {locale === 'vi' ? 'Đang hoạt động' : 'Active'}</Badge>
      case 'declined':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> {locale === 'vi' ? 'Từ chối' : 'Declined'}</Badge>
      case 'expired':
        return <Badge variant="secondary">{locale === 'vi' ? 'Hết hạn' : 'Expired'}</Badge>
    }
  }

  const getAvailabilityBadge = (status: QIProfile['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">{locale === 'vi' ? 'Sẵn sàng' : 'Available'}</Badge>
      case 'busy':
        return <Badge variant="outline" className="text-amber-600 border-amber-500">{locale === 'vi' ? 'Bận' : 'Busy'}</Badge>
      case 'unavailable':
        return <Badge variant="secondary">{locale === 'vi' ? 'Không khả dụng' : 'Unavailable'}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Current QI Assignment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {locale === 'vi' ? 'Qualified Individual của bạn' : 'Your Qualified Individual'}
          </CardTitle>
          <CardDescription>
            {locale === 'vi' 
              ? 'QI chịu trách nhiệm thực hiện và giám sát FSVP program theo 21 CFR 1.502'
              : 'QI responsible for performing and overseeing FSVP activities per 21 CFR 1.502'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {locale === 'vi' ? 'Chưa có Qualified Individual' : 'No Qualified Individual Assigned'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {locale === 'vi' 
                  ? 'FSVP yêu cầu bạn phải có Qualified Individual để thực hiện và giám sát các hoạt động FSVP. Bạn có thể tự làm QI (nếu đủ điều kiện) hoặc thuê QI bên ngoài.'
                  : 'FSVP requires you to have a Qualified Individual to perform and oversee FSVP activities. You can act as your own QI (if qualified) or hire an external QI.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-violet-600 hover:bg-violet-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {locale === 'vi' ? 'Tìm và Mời QI' : 'Find & Invite QI'}
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Button variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  {locale === 'vi' ? 'Tự làm QI' : 'Act as Own QI'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{assignment.qi_name}</h4>
                      <p className="text-sm text-muted-foreground">{assignment.qi_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {locale === 'vi' ? 'Gửi lời mời: ' : 'Invited: '}
                        {new Date(assignment.assigned_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(assignment.status)}
                    <Button variant="outline" size="sm">
                      {locale === 'vi' ? 'Chi tiết' : 'Details'}
                    </Button>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Mời thêm QI' : 'Invite Another QI'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QI Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {locale === 'vi' ? 'Tìm Qualified Individual' : 'Find Qualified Individual'}
            </DialogTitle>
            <DialogDescription>
              {locale === 'vi' 
                ? 'Tìm và mời QI có chuyên môn phù hợp với products của bạn'
                : 'Search for QIs with expertise matching your products'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={locale === 'vi' ? 'Tìm theo tên, chuyên môn, chứng chỉ...' : 'Search by name, specialization, credentials...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* QI List */}
            <div className="space-y-3">
              {filteredQIs.map((qi) => (
                <Card 
                  key={qi.id} 
                  className={`cursor-pointer transition-all ${selectedQI?.id === qi.id ? 'ring-2 ring-violet-500 bg-violet-50' : 'hover:border-violet-300'}`}
                  onClick={() => setSelectedQI(qi)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-6 w-6 text-violet-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{qi.name}</h4>
                            {qi.verified && (
                              <Badge variant="outline" className="text-blue-600 border-blue-500 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            {qi.former_fda && (
                              <Badge className="bg-violet-600 text-xs">Former FDA</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              {qi.rating}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {qi.active_clients} clients
                            </span>
                            <span>{qi.experience_years} years exp.</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {qi.specializations.map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{spec}</Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {qi.credentials.slice(0, 3).map((cred, idx) => (
                              <span key={idx} className="text-xs text-muted-foreground">{cred}{idx < 2 && qi.credentials.length > idx + 1 ? ' • ' : ''}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getAvailabilityBadge(qi.status)}
                        {selectedQI?.id === qi.id && (
                          <CheckCircle2 className="h-5 w-5 text-violet-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedQI && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label>{locale === 'vi' ? 'Tin nhắn cho QI (tùy chọn)' : 'Message to QI (optional)'}</Label>
                  <Textarea 
                    placeholder={locale === 'vi' 
                      ? 'Giới thiệu về công ty và products của bạn...'
                      : 'Introduce your company and products...'}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleInviteQI}
              disabled={!selectedQI || selectedQI.status === 'unavailable'}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              {locale === 'vi' ? 'Gửi lời mời' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QI Requirements Info */}
      <Alert className="border-blue-500/50 bg-blue-50">
        <GraduationCap className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">
          {locale === 'vi' ? 'Yêu cầu về Qualified Individual (21 CFR 1.502)' : 'Qualified Individual Requirements (21 CFR 1.502)'}
        </AlertTitle>
        <AlertDescription className="text-blue-700">
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>{locale === 'vi' ? 'Có education, training, hoặc experience trong food safety' : 'Has education, training, or experience in food safety'}</li>
            <li>{locale === 'vi' ? 'Hiểu được ngôn ngữ của tài liệu cần review' : 'Understands the language of documents to be reviewed'}</li>
            <li>{locale === 'vi' ? 'Có thể là nhân viên nội bộ hoặc contractor bên ngoài' : 'Can be an employee or external contractor'}</li>
            <li>{locale === 'vi' ? 'Có thể là Importer owner nếu đủ điều kiện' : 'Can be the importer owner if qualified'}</li>
          </ul>
          <Button variant="link" className="p-0 h-auto mt-2 text-blue-700" asChild>
            <a href="https://www.ecfr.gov/current/title-21/section-1.502" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" />
              {locale === 'vi' ? 'Xem quy định chi tiết' : 'View full regulation'}
            </a>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
