# Vexim System Deployment Guide

## Quick Start

### Prerequisites
- Supabase project configured
- Node.js 18+ installed
- Database migration tool access

### Step 1: Database Migration

Execute the Prior Notice system schema:

```bash
# Copy and paste the SQL from scripts/062_prior_notice_system.sql
# into your Supabase SQL editor, or run via psql:
psql -U postgres -d your_database -f scripts/062_prior_notice_system.sql
```

**Tables Created:**
- `prior_notices` - Main shipment records
- `prior_notice_items` - Product items in each shipment
- `prior_notice_documents` - Supporting documentation
- `compliance_checks` - Compliance verification results

### Step 2: Environment Configuration

Ensure these are in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Step 3: Install Dependencies

```bash
pnpm install
```

### Step 4: Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` and navigate to:
- Dashboard > Ingredient Check (NEW)
- Dashboard > Prior Notice (NEW)

---

## Feature Documentation

### Ingredient Check

**Path**: Dashboard → Ingredient Check

**Workflow**:
1. Enter ingredients (comma-separated)
2. System checks for:
   - FDA restricted ingredients
   - Major allergens (Big 9)
   - Compliance issues
3. View detailed analysis with recommendations

**API Endpoint**:
```
POST /api/ingredient-check
Body: { ingredients: string[] }
```

### Prior Notice

**Path**: Dashboard → Prior Notice → New Prior Notice

**Workflow**:
1. Fill shipment information (shipper, consignee, estimated arrival)
2. Enter product details (name, type, ingredients)
3. Declare allergens
4. System auto-generates PNRN (Prior Notice Reference Number)
5. Automatic compliance checking
6. View compliance report with status (Compliant/Conditional/Non-Compliant)

**PNRN Format**: `PNRN-YYYYMMDD-XXXXX`

**API Endpoints**:
```
POST /api/prior-notice/generate
  - Generates PNRN
  - Runs compliance checks
  - Stores in database

GET /api/prior-notice/list
  - Lists all user's prior notices

GET /api/prior-notice/[id]
  - Gets specific prior notice details

DELETE /api/prior-notice/[id]
  - Deletes a prior notice
```

---

## Compliance Rules Reference

### Restricted Ingredients (Will fail compliance)
- Safrole
- Sassafras
- Coumarin
- Calamus
- Cyclamate
- Cycad
- Bracken fern
- Thiouracil

### FDA Major Allergens - Big 9 (Must be declared)
- Milk
- Eggs
- Peanuts
- Tree nuts
- Fish
- Crustacean shellfish
- Sesame
- Soy
- Wheat

### Compliance Status Meanings

**Compliant** (Green)
- No violations or issues
- Ready for FDA submission

**Conditional** (Yellow)
- Minor warnings present
- May need clarification
- Generally acceptable with notes

**Non-Compliant** (Red)
- Critical issues detected
- Remediation required before submission
- Blocked from FDA submission

---

## Testing Checklist

### Ingredient Check Tests
- [ ] Submit valid ingredients
- [ ] Try restricted ingredient (should fail)
- [ ] Verify allergen detection
- [ ] Test with 1 ingredient
- [ ] Test with 10+ ingredients

### Prior Notice Tests
- [ ] Create new prior notice with valid data
- [ ] Verify PNRN is unique each time
- [ ] Test missing required fields (should show errors)
- [ ] Submit with restricted ingredient (should fail compliance)
- [ ] Submit without allergen declaration (should warn)
- [ ] List all prior notices
- [ ] View specific prior notice details
- [ ] Delete a prior notice

### UI/UX Tests
- [ ] Menu navigation works correctly
- [ ] Forms are responsive on mobile
- [ ] Error messages display clearly
- [ ] Loading states show during processing
- [ ] Results display formatted correctly

### Database Tests
- [ ] Data persists after refresh
- [ ] Multiple users see only their data
- [ ] Row Level Security (RLS) prevents unauthorized access
- [ ] Old records remain accessible

---

## Troubleshooting

### Issue: "Table does not exist" error
**Solution**: Run database migration script
```bash
psql -U postgres -d your_database -f scripts/062_prior_notice_system.sql
```

### Issue: Ingredient Check returns empty results
**Solution**: 
1. Verify `lib/ingredient-analysis-engine.ts` exists
2. Check OpenAI API key is valid
3. Ensure ANTHROPIC_API_KEY is set for Claude vision

### Issue: Prior Notice form won't submit
**Solution**:
1. Check browser console for errors
2. Verify all required fields are filled
3. Ensure Supabase connection is active
4. Check network tab for failed requests

### Issue: PNRN not generating
**Solution**:
1. Verify system date/time is correct
2. Check that uuid library is installed: `pnpm list uuid`
3. Review server logs for errors

---

## Production Deployment

### Before Going Live

1. **Security Audit**
   - Enable RLS on all tables
   - Verify auth policies
   - Test permission boundaries

2. **Performance Optimization**
   - Add database indexes (already in migration script)
   - Enable caching where applicable
   - Monitor API response times

3. **Data Validation**
   - Test with various ingredient lists
   - Verify allergen database is complete
   - Validate PNRN uniqueness

4. **Backup Strategy**
   - Enable Supabase automated backups
   - Test backup restoration
   - Document recovery procedure

### Deployment Steps

```bash
# 1. Run migrations
pnpm run migrate

# 2. Build for production
pnpm run build

# 3. Run tests
pnpm test

# 4. Deploy to Vercel
vercel deploy --prod
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor
- API response times
- Database query performance
- Error rates on prior notice generation
- User engagement with new features

### Regular Maintenance
- Review compliance rule updates from FDA
- Update restricted ingredients list quarterly
- Monitor database size and optimize queries
- Check for deprecated API dependencies

---

## Support & Resources

### Internal Documentation
- `VEXIM_INTERNAL_SYSTEM.md` - System overview
- `VEXIM_SYSTEM_TRANSFORMATION_REPORT.md` - Complete implementation report
- Code comments in utility files explain compliance logic

### FDA Resources
- [FDA Prior Notice System](https://www.fda.gov/food/prior-notice-system-foods-and-food-facilities/)
- [FSMA Requirements](https://www.fda.gov/food/fsma-foods-and-food-facilities/)
- [Allergen Labeling Requirements](https://www.fda.gov/food/food-allergensgluten-free-guidanceregulatory-information/food-allergen-labeling-and-protection-act-falcpa)

---

## Version History

**v1.0 - Initial Release (March 2025)**
- Transformed from SaaS to internal system
- Added Ingredient Check feature
- Implemented Prior Notice system
- Created PNRN generation and compliance checking

---

## Contact & Issues

For issues or questions, refer to the implementation team or check the detailed transformation report.

Generated: 2025-03-27
Last Updated: Deployment Guide Complete
