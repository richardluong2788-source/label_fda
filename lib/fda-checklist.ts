// ────────────────────────────────────────────────────────────
// FDA Review Checklist Items
// ────────────────────────────────────────────────────────────

export interface FdaChecklistItem {
  id: string
  label: string
  cfr: string
  hint: string
}

export const FDA_CHECKLIST: FdaChecklistItem[] = [
  {
    id: 'identity',
    label: 'Product identity statement verified',
    cfr: '21 CFR 101.3',
    hint: 'Common/usual name clearly displayed on PDP',
  },
  {
    id: 'net_contents',
    label: 'Net contents declaration checked',
    cfr: '21 CFR 101.105',
    hint: 'Correct units (oz/g/ml), proper placement on lower 30% of PDP',
  },
  {
    id: 'ingredients',
    label: 'Ingredient list order verified',
    cfr: '21 CFR 101.4',
    hint: 'Listed in descending order by weight, common names used',
  },
  {
    id: 'allergens',
    label: 'Allergen declarations present (FALCPA)',
    cfr: "FD&C Act 403(w)",
    hint: 'Big 9 allergens: milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame',
  },
  {
    id: 'nutrition',
    label: 'Nutrition Facts format correct',
    cfr: '21 CFR 101.9',
    hint: 'Serving size, calories, 13 mandatory nutrients, %DV, footnote',
  },
  {
    id: 'health_claims',
    label: 'No prohibited health/disease claims',
    cfr: "FD&C Act 403(r)",
    hint: 'No "cures", "treats", "prevents" disease language without FDA approval',
  },
  {
    id: 'manufacturer',
    label: 'Manufacturer/distributor info present',
    cfr: '21 CFR 101.5',
    hint: 'Name and address of manufacturer, packer, or distributor',
  },
  {
    id: 'warnings',
    label: 'Required warnings present (if applicable)',
    cfr: 'Various',
    hint: 'Juice HACCP, phenylalanine (aspartame), FD&C Yellow No. 5, sulfites',
  },
  {
    id: 'font_size',
    label: 'Font size minimums met',
    cfr: '21 CFR 101.2',
    hint: 'Minimum 1/16 inch for most text, varies by PDP area',
  },
  {
    id: 'country_origin',
    label: 'Country of origin declared (if imported)',
    cfr: 'US Customs / COOL',
    hint: 'Required on all imported food products entering the US',
  },
]
