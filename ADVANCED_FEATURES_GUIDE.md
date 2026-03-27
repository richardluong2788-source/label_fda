# Vexim Compliance AI - Advanced Features Guide

## Overview
This document describes the two advanced features added to enhance the Vexim Compliance AI system:
1. **Visual Geometry Analysis** - FDA-compliant text size ratio and placement validation
2. **Version Control & Comparison** - Track label revisions and compare improvements

---

## 1. Visual Geometry Analysis

### Purpose
Validates visual aspects of food labels that cannot be checked through text analysis alone, such as:
- Font size ratios (product name vs brand name)
- Text prominence and area calculations
- Element placement and spacing
- Minimum font size requirements based on panel size

### Implementation

#### Core Module: `lib/visual-geometry-analyzer.ts`

The `VisualGeometryAnalyzer` class provides methods to validate FDA visual requirements:

```typescript
// Example: Validate product name size
const violation = VisualGeometryAnalyzer.validateProductNameSize(
  brandName,    // TextElement with fontSize: 48px
  productName   // TextElement with fontSize: 20px
)

// If product name < 50% of brand name, returns violation
// Result: 20/48 = 0.42 (42%) → CRITICAL VIOLATION
```

#### Key Validations

**1. Product Name Size Ratio**
- **Regulation**: 21 CFR 101.3(d)
- **Rule**: Product name must be ≥50% of brand name font size
- **Example**: Brand "ACME" (48px) → Product "Cookies" must be ≥24px

**2. Net Quantity Prominence**
- **Regulation**: 21 CFR 101.105
- **Rule**: Net quantity must occupy ≥2% of principal display panel area
- **Calculation**: `(net_quantity_area / panel_area) * 100 ≥ 2%`

**3. Allergen Statement Placement**
- **Regulation**: FALCPA Section 203(c)
- **Rule**: Must be within 1-2 line heights of ingredient list
- **Calculation**: `vertical_distance ≤ fontSize * 2`

**4. Minimum Font Size**
- **Regulation**: 21 CFR 101.105(h)
- **Rules based on panel area**:
  - ≤5 sq in → 1/16 inch minimum
  - ≤25 sq in → 1/8 inch minimum
  - ≤100 sq in → 3/16 inch minimum
  - >100 sq in → 1/4 inch minimum

#### Data Structure

```typescript
interface TextElement {
  text: string
  fontSize: number        // in pixels
  fontWeight: string
  x: number              // position
  y: number              // position
  width: number          // bounding box
  height: number         // bounding box
  area: number           // width × height
}

interface GeometryViolation {
  type: 'font_ratio' | 'text_area' | 'placement' | 'prominence'
  severity: 'critical' | 'warning' | 'info'
  description: string
  expected: string       // e.g., "At least 50% of brand name"
  actual: string         // e.g., "Current ratio: 41.7%"
  regulation: string     // e.g., "21 CFR 101.3(d)"
}
```

#### Integration with AI Analysis

In `/app/api/analyze/route.ts`, geometry analysis runs after text extraction:

```typescript
// 1. Extract text elements from OCR (mock in current implementation)
const mockTextElements = {
  brandName: { fontSize: 48, ... },
  productName: { fontSize: 20, ... },
  panelAreaSquareInches: 50
}

// 2. Run geometry analysis
const geometryViolations = VisualGeometryAnalyzer.analyzeLabel(mockTextElements)

// 3. Store in database
await supabase.from('audit_reports').update({
  geometry_violations: geometryViolations,
  ...
})
```

#### Displaying Results

Geometry violations appear in:
- **Audit Report Page**: Shows violations with severity badges
- **Version Comparison**: Dedicated "Geometry Analysis" tab
- **Expert Review Interface**: Allows experts to override or confirm findings

### Production Integration Notes

The current implementation uses **mock data** for text elements. For production:

1. **Integrate OCR Service** (e.g., Google Vision, AWS Textract):
```typescript
const ocrResult = await visionClient.documentTextDetection(imageBuffer)
const textElements = extractTextElementsFromOCR(ocrResult)
```

2. **Extract Bounding Boxes**:
```typescript
function extractTextElementsFromOCR(ocrResult: any): TextElement[] {
  return ocrResult.textAnnotations.map(annotation => ({
    text: annotation.description,
    fontSize: estimateFontSize(annotation.boundingBox),
    x: annotation.boundingBox.vertices[0].x,
    y: annotation.boundingBox.vertices[0].y,
    width: calculateWidth(annotation.boundingBox),
    height: calculateHeight(annotation.boundingBox),
    area: calculateArea(annotation.boundingBox)
  }))
}
```

3. **Classify Text Elements** (brand name, product name, etc.):
```typescript
const classifier = await trainTextClassifier() // ML model
const brandName = textElements.find(el => classifier.predict(el) === 'brand_name')
const productName = textElements.find(el => classifier.predict(el) === 'product_name')
```

---

## 2. Version Control & Comparison

### Purpose
Enables customers to:
- Submit revised labels after fixing violations
- Track improvement over time
- Compare "before" and "after" side-by-side
- See which issues were resolved vs new issues introduced

### Database Schema

#### Added Columns to `audit_reports`
```sql
ALTER TABLE audit_reports
ADD COLUMN version_number INTEGER DEFAULT 1,
ADD COLUMN parent_report_id UUID REFERENCES audit_reports(id),
ADD COLUMN is_latest_version BOOLEAN DEFAULT true,
ADD COLUMN version_notes TEXT,
ADD COLUMN geometry_violations JSONB DEFAULT '[]'::jsonb;
```

#### New Table: `label_versions`
Stores historical snapshots when labels are resubmitted:

```sql
CREATE TABLE label_versions (
  id UUID PRIMARY KEY,
  original_report_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  label_image_url TEXT NOT NULL,
  status TEXT NOT NULL,
  overall_result TEXT,
  findings JSONB,
  geometry_violations JSONB,
  created_at TIMESTAMP,
  created_by UUID,
  version_notes TEXT,
  changes_summary JSONB,
  UNIQUE(original_report_id, version_number)
);
```

#### New Table: `comparison_sessions`
Tracks which versions were compared together:

```sql
CREATE TABLE comparison_sessions (
  id UUID PRIMARY KEY,
  original_report_id UUID NOT NULL,
  version_a_id UUID NOT NULL,
  version_b_id UUID NOT NULL,
  compared_by UUID,
  comparison_notes TEXT,
  created_at TIMESTAMP
);
```

### Automatic Versioning

A database trigger automatically creates versions when labels are resubmitted:

```sql
CREATE TRIGGER auto_create_label_version
  BEFORE UPDATE ON audit_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_label_version();
```

**How it works**:
1. Customer uploads revised label → `label_image_url` changes
2. Trigger saves old version to `label_versions` table
3. `version_number` increments automatically
4. Old version remains accessible for comparison

### User Interface

#### Version History Page
**Route**: `/audit/[id]/versions`

Features:
- Timeline view of all versions
- Click to select 2 versions for comparison
- Displays version metadata (date, status, violation count)
- Quick visual preview of each version

```typescript
// User clicks "Version History" button on audit page
router.push(`/audit/${reportId}/versions`)

// Page loads all versions from database
const versions = await supabase
  .from('label_versions')
  .select('*')
  .eq('original_report_id', reportId)
  .order('version_number', { ascending: false })
```

#### Comparison Interface
**Component**: `components/label-version-comparison.tsx`

Three tabs:

**1. Visual Comparison**
- Side-by-side image display
- Version metadata (date, result badge)
- Violation count summary

**2. Violations Comparison**
Shows three categories:
- **Resolved Issues** (green): In Version A, not in Version B
- **New Issues** (red): Not in Version A, in Version B
- **Modified Issues** (orange): Present in both but changed

```typescript
function calculateDifferences(versionA, versionB) {
  const violationsA = versionA.findings.map(v => v.regulation_reference)
  const violationsB = versionB.findings.map(v => v.regulation_reference)
  
  return {
    resolved_violations: versionA.findings.filter(
      v => !violationsB.includes(v.regulation_reference)
    ),
    new_violations: versionB.findings.filter(
      v => !violationsA.includes(v.regulation_reference)
    ),
    modified_violations: versionB.findings.filter(
      v => violationsA.includes(v.regulation_reference)
    )
  }
}
```

**3. Geometry Analysis**
- Side-by-side geometry violations
- Shows expected vs actual measurements
- Highlights improvements in text sizing/placement

#### Improvement Summary Card
Shows overall progress metrics:
- **Resolved Issues**: Count of fixed violations
- **New Issues**: Count of new problems introduced
- **Overall Progress**: Percentage improvement
  ```typescript
  progress = (resolved / (resolved + new)) * 100
  ```

### Usage Flow

1. **Initial Submission**:
   - Customer uploads label → Creates `audit_report` with `version_number: 1`
   - AI analyzes → Finds 5 violations

2. **Customer Fixes Label**:
   - Customer uploads revised label to same report
   - Trigger saves Version 1 to `label_versions` table
   - New analysis runs → `version_number: 2`

3. **Expert Review**:
   - Expert clicks "Version History"
   - Selects Version 1 and Version 2
   - Clicks "Compare Selected Versions"
   - Reviews resolved issues (3 fixed, 1 new, 1 persists)
   - Adds review notes to approve or reject

4. **Customer Views Progress**:
   - Sees improvement summary: "3 issues resolved, 1 new issue"
   - Downloads comparison report for internal records

### Integration with Expert Review

In `components/expert-review-interface.tsx`, experts can:
- View all previous versions before approving
- Compare customer's fix with their recommendations
- Verify geometry improvements
- Add notes like: "Customer correctly increased product name to 28px (58% of brand name)"

### Data Retention

Versions are kept indefinitely to:
- Maintain audit trail for regulatory compliance
- Allow retrospective analysis
- Support dispute resolution
- Track customer improvement over time

---

## Testing Guide

### Test Visual Geometry Analysis

1. Upload label with small product name relative to brand
2. Check audit report for geometry violations
3. Verify violation shows:
   - Type: `font_ratio`
   - Expected: "At least 50% of brand name"
   - Actual: "Current ratio: 42%"
   - Regulation: "21 CFR 101.3(d)"

### Test Version Comparison

1. Upload initial label → Note Report ID
2. Wait for analysis to complete
3. Upload revised label with fixes
4. Navigate to Report → Click "Version History"
5. Select Version 1 and Version 2
6. Click "Compare Selected Versions"
7. Verify:
   - Side-by-side images displayed
   - Resolved violations shown in green
   - New violations shown in red
   - Improvement percentage calculated

---

## API Reference

### Geometry Analysis

```typescript
// Import analyzer
import { VisualGeometryAnalyzer } from '@/lib/visual-geometry-analyzer'

// Analyze full label
const violations = VisualGeometryAnalyzer.analyzeLabel({
  brandName: TextElement,
  productName: TextElement,
  netQuantity: TextElement,
  principalDisplay: TextElement,
  allergenStatement: TextElement,
  ingredientList: TextElement,
  nutritionLabel: TextElement,
  panelAreaSquareInches: number
})

// Individual validations
const violation = VisualGeometryAnalyzer.validateProductNameSize(brand, product)
const violation = VisualGeometryAnalyzer.validateNetQuantityProminence(net, panel)
const violation = VisualGeometryAnalyzer.validateAllergenPlacement(allergen, ingredients)
const violation = VisualGeometryAnalyzer.validateNutritionLabelFont(nutrition, panelArea)
```

### Version Management

```typescript
// Get all versions for a report
const { data: versions } = await supabase
  .from('label_versions')
  .select('*')
  .eq('original_report_id', reportId)
  .order('version_number', { ascending: false })

// Get specific version
const { data: version } = await supabase
  .from('label_versions')
  .select('*')
  .eq('id', versionId)
  .single()

// Create comparison session
const { data: session } = await supabase
  .from('comparison_sessions')
  .insert({
    original_report_id: reportId,
    version_a_id: version1Id,
    version_b_id: version2Id,
    compared_by: userId
  })
```

---

## File Structure

```
/lib
  visual-geometry-analyzer.ts    # Geometry validation logic
  types.ts                        # TypeScript interfaces

/scripts
  003_add_version_control.sql    # Database migration

/app
  /audit/[id]
    /versions
      page.tsx                    # Version history page

/components
  label-version-comparison.tsx   # Side-by-side comparison UI
  version-history-view.tsx       # Timeline of versions
  expert-review-interface.tsx    # Expert review with version access
```

---

## Future Enhancements

### Visual Geometry
1. **Machine Learning Classification**
   - Train model to identify brand name, product name, etc.
   - Automatic text element classification

2. **Color Contrast Analysis**
   - Validate text/background contrast ratios
   - Ensure readability per FDA guidelines

3. **Image Quality Checks**
   - Detect blur, low resolution
   - Validate DPI requirements for print

### Version Control
1. **Diff Visualization**
   - Highlight exact pixel differences between versions
   - Overlay annotations showing changes

2. **Automated Regression Testing**
   - Alert if new version reintroduces old violations
   - Track recurring issues

3. **Export Comparison Reports**
   - PDF export with side-by-side comparison
   - Shareable links for stakeholders

---

## Compliance Notes

- Geometry validations based on **21 CFR** and **FALCPA**
- All calculations use **96 DPI** standard for screen display
- Font sizes converted to **inches** for FDA compliance checks
- Version history provides **audit trail** for regulatory inspections

---

## Support

For questions about these features, contact:
- **Technical Issues**: dev@vexim.global
- **Compliance Questions**: compliance@vexim.global
- **Feature Requests**: support@vexim.global

---

**Last Updated**: 2024
**System Version**: 2.0
**Documentation Version**: 1.0
