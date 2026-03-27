import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check Part 1 data
    const { data: part1Data, error: part1Error } = await supabase
      .from('compliance_knowledge')
      .select('id, title, cfr_title, cfr_part, cfr_section, cfr_subpart, category, created_at')
      .eq('cfr_part', '1')
      .order('cfr_section', { ascending: true })

    if (part1Error) {
      console.error('[v0] Error fetching Part 1 data:', part1Error)
      return NextResponse.json({ error: part1Error.message }, { status: 500 })
    }

    // Filter for Subpart L (FSVP) - sections 1.500 to 1.514
    const subpartLData = part1Data?.filter((item) => {
      const section = item.cfr_section
      if (!section) return false
      // Check if section starts with 1.5 (which indicates Subpart L - FSVP)
      const sectionNum = parseFloat(section.replace('§', '').replace('1.', ''))
      return sectionNum >= 500 && sectionNum <= 514
    })

    // Get distinct subparts in Part 1
    const subparts = [...new Set(part1Data?.map((item) => item.cfr_subpart).filter(Boolean))]

    // Count by subpart
    const subpartCounts: Record<string, number> = {}
    part1Data?.forEach((item) => {
      const subpart = item.cfr_subpart || 'Unknown'
      subpartCounts[subpart] = (subpartCounts[subpart] || 0) + 1
    })

    // Get FSVP specific sections
    const fsvpSections = subpartLData?.map((item) => ({
      id: item.id,
      title: item.title,
      section: item.cfr_section,
      subpart: item.cfr_subpart,
    }))

    return NextResponse.json({
      success: true,
      summary: {
        totalPart1Records: part1Data?.length || 0,
        totalSubpartLRecords: subpartLData?.length || 0,
        subpartsFound: subparts,
        subpartCounts,
        hasSubpartL: (subpartLData?.length || 0) > 0,
      },
      fsvpSections: fsvpSections || [],
      allPart1Titles: part1Data?.slice(0, 50).map((item) => ({
        title: item.title,
        section: item.cfr_section,
        subpart: item.cfr_subpart,
      })),
    })
  } catch (error: any) {
    console.error('[v0] Error checking Part 1 Subpart L:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
