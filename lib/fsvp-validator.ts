/**
 * FSVP Validator - Foreign Supplier Verification Program
 * 
 * Reference: 21 CFR Part 1, Subpart L (§1.500-§1.514)
 * 
 * Key Requirements:
 * - §1.500: Definitions
 * - §1.502: Qualified Individual
 * - §1.504: Hazard Analysis
 * - §1.505: Evaluation of Foreign Supplier
 * - §1.506: Supplier Verification Activities
 * - §1.508: Corrective Actions
 * - §1.510: Recordkeeping (24-hour retrieval)
 * - §1.512: DUNS/USCI Requirements
 */

import type { 
  AuditReport, 
  FSVPSupplier, 
  FSVPComplianceResult, 
  FSVPViolationItem,
  FSVPRequirement,
  SAHCODHACategory,
  FSVPImporterProfile
} from './types'

// ============================================================================
// FSVP Requirements Definitions
// ============================================================================

export const FSVP_REQUIREMENTS: FSVPRequirement[] = [
  {
    id: 'qi',
    cfrSection: '§1.502',
    title: 'Qualified Individual',
    description: 'Designate a Qualified Individual with technical food safety knowledge',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'hazard_analysis',
    cfrSection: '§1.504',
    title: 'Hazard Analysis',
    description: 'Conduct hazard analysis for each food imported',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'supplier_evaluation',
    cfrSection: '§1.505',
    title: 'Supplier Evaluation',
    description: 'Evaluate foreign supplier compliance history and food safety practices',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'verification_activities',
    cfrSection: '§1.506',
    title: 'Supplier Verification Activities',
    description: 'Conduct appropriate verification activities (audit, sampling, review)',
    isMandatory: true,
    verificationMethod: 'audit'
  },
  {
    id: 'corrective_actions',
    cfrSection: '§1.508',
    title: 'Corrective Actions',
    description: 'Document and implement corrective actions when issues identified',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'recordkeeping',
    cfrSection: '§1.510',
    title: 'Recordkeeping (24-hour retrieval)',
    description: 'Maintain records available to FDA within 24 hours of request',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'duns_registration',
    cfrSection: '§1.512',
    title: 'DUNS/USCI Number',
    description: 'Register with valid DUNS or Unique Supplier Identification number',
    isMandatory: true,
    verificationMethod: 'document'
  },
  {
    id: 'fce_sid_lacf',
    cfrSection: '§108.25/§108.35',
    title: 'FCE/SID Registration (LACF/AF)',
    description: 'Food Canning Establishment registration and Process Filing for LACF/Acidified Foods',
    isMandatory: false, // Only mandatory for LACF/AF products
    verificationMethod: 'document',
    applicableCategories: ['lacf', 'low_acid_canned', 'acidified_foods', 'canned_vegetables', 'canned_meat', 'pickles']
  }
]

// ============================================================================
// SAHCODHA Categories (Serious Adverse Health Consequences or Death)
// Per 21 CFR 1.506(d) - requires annual onsite audit
// ============================================================================

export const SAHCODHA_CATEGORIES: Record<string, SAHCODHACategory> = {
  'seafood': {
    hazards: ['Histamine', 'Scombrotoxin', 'Ciguatera', 'Vibrio', 'Parasites', 'Mercury', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123 (HACCP for Seafood)'
  },
  'fish': {
    hazards: ['Histamine', 'Scombrotoxin', 'Parasites', 'Mercury', 'Environmental contaminants'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  // Pangasius / Cá tra - Vietnamese catfish (high FDA Import Alert history)
  'pangasius': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Veterinary drug residues', 'Malachite green', 'Fluoroquinolones', 'Nitrofurans'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123, Import Alert 16-131'
  },
  'cá tra': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Veterinary drug residues', 'Malachite green', 'Fluoroquinolones', 'Nitrofurans'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123, Import Alert 16-131'
  },
  'catfish': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Veterinary drug residues', 'Environmental contaminants'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'basa': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Veterinary drug residues', 'Malachite green'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123, Import Alert 16-131'
  },
  'shellfish': {
    hazards: ['Vibrio', 'Norovirus', 'Biotoxins (PSP, DSP)', 'Heavy metals'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'leafy_greens': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cyclospora', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112 (Produce Safety Rule)'
  },
  'salad': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cyclospora', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'spinach': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cyclospora'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'lettuce': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cyclospora'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'sprouts': {
    hazards: ['Salmonella', 'E. coli O157:H7', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112.144 (Sprout-specific requirements)'
  },
  'juice': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cryptosporidium', 'Patulin (apple juice)'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 120 (HACCP for Juice)'
  },
  'unpasteurized_juice': {
    hazards: ['E. coli O157:H7', 'Salmonella', 'Cryptosporidium'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 120'
  },
  'ras_fish': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'shell_eggs': {
    hazards: ['Salmonella Enteritidis'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 118 (Shell Egg Safety)'
  },
  'raw_milk': {
    hazards: ['Salmonella', 'E. coli O157:H7', 'Listeria monocytogenes', 'Campylobacter'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 1240.61'
  },
  'deli_meat': {
    hazards: ['Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '9 CFR 430 (FSIS)'
  },
  'soft_cheese': {
    hazards: ['Listeria monocytogenes', 'Salmonella', 'E. coli'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 133'
  },
  // Tree nuts - High-risk for Salmonella and Allergen (FDA Import Alert 99-19)
  'cashew': {
    hazards: ['Salmonella', 'Tree nut allergen', 'Aflatoxin', 'Ochratoxin A'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-19'
  },
  'hạt điều': {
    hazards: ['Salmonella', 'Tree nut allergen', 'Aflatoxin', 'Ochratoxin A'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-19'
  },
  'tree_nuts': {
    hazards: ['Salmonella', 'Tree nut allergen', 'Aflatoxin', 'E. coli'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'peanuts': {
    hazards: ['Salmonella', 'Peanut allergen', 'Aflatoxin'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'almonds': {
    hazards: ['Salmonella', 'Tree nut allergen', 'E. coli'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  
  // ============================================================================
  // LOW-ACID CANNED FOODS (LACF) - 21 CFR 113
  // High risk for Clostridium botulinum (botulism)
  // ============================================================================
  'lacf': {
    hazards: ['Clostridium botulinum', 'Botulism toxin', 'Underprocessing'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 113 (Thermally Processed Low-Acid Foods)'
  },
  'canned_vegetables': {
    hazards: ['Clostridium botulinum', 'Botulism toxin'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 113'
  },
  'canned_meat': {
    hazards: ['Clostridium botulinum', 'Botulism toxin', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 113'
  },
  'retort_pouches': {
    hazards: ['Clostridium botulinum', 'Seal integrity failure'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 113'
  },
  
  // ============================================================================
  // ACIDIFIED FOODS - 21 CFR 114
  // pH must be ≤4.6 to prevent C. botulinum growth
  // ============================================================================
  'acidified_foods': {
    hazards: ['Clostridium botulinum', 'pH control failure', 'Spoilage organisms'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 114 (Acidified Foods)'
  },
  'pickles': {
    hazards: ['Clostridium botulinum', 'pH control failure'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 114'
  },
  'peppers_in_oil': {
    hazards: ['Clostridium botulinum', 'pH control failure', 'Anaerobic conditions'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 114'
  },
  'artichoke_hearts': {
    hazards: ['Clostridium botulinum', 'pH control failure'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 114'
  },
  'sauces': {
    hazards: ['Clostridium botulinum', 'pH control failure', 'Salmonella'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 114'
  },
  
  // ============================================================================
  // DIETARY SUPPLEMENTS - 21 CFR 111
  // Subject to CGMP and modified FSVP requirements (21 CFR 1.511)
  // ============================================================================
  'dietary_supplements': {
    hazards: ['Heavy metals (Lead, Arsenic, Cadmium, Mercury)', 'Microbial contamination', 'Undeclared ingredients', 'Pesticide residues'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 111 (Dietary Supplement CGMP), 21 CFR 1.511'
  },
  'herbal_supplements': {
    hazards: ['Botanical identity', 'Heavy metals', 'Pesticide residues', 'Microbial contamination', 'Pyrrolizidine alkaloids'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 111'
  },
  'vitamin_supplements': {
    hazards: ['Heavy metals', 'Potency/stability', 'Microbial contamination'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 111'
  },
  'protein_supplements': {
    hazards: ['Heavy metals (Lead)', 'Melamine', 'Microbial contamination', 'Undeclared allergens'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 111'
  },
  'probiotic_supplements': {
    hazards: ['Microbial identity', 'Viability', 'Contamination with pathogens'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 111'
  },
  
  // ============================================================================
  // INFANT FORMULA - 21 CFR 106/107
  // CRITICAL - Highest risk category, requires strictest controls
  // ============================================================================
  'infant_formula': {
    hazards: ['Cronobacter sakazakii', 'Salmonella', 'Nutrient deficiency', 'Heavy metals', 'Melamine'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 106/107 (Infant Formula)'
  },
  'infant_food': {
    hazards: ['Heavy metals (Lead, Arsenic, Cadmium, Mercury)', 'Cronobacter sakazakii', 'Microbial contamination'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 106/107'
  },
  'baby_food': {
    hazards: ['Heavy metals', 'Pesticide residues', 'Microbial contamination', 'Acrylamide'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 106/107'
  },
  
  // ============================================================================
  // SPICES - Import Alert 99-08
  // High Salmonella and aflatoxin risk, especially from certain countries
  // ============================================================================
  'spices': {
    hazards: ['Salmonella', 'Filth', 'Aflatoxin', 'Pesticide residues', 'Color additives'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-08'
  },
  'pepper': {
    hazards: ['Salmonella', 'Filth', 'Aflatoxin'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-08'
  },
  'paprika': {
    hazards: ['Salmonella', 'Aflatoxin', 'Sudan dyes (illegal color additives)'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-08'
  },
  'cumin': {
    hazards: ['Salmonella', 'Peanut allergen (undeclared)', 'Lead contamination'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117, Import Alert 99-08'
  },
  'turmeric': {
    hazards: ['Lead contamination', 'Salmonella', 'Undeclared color additives'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'cinnamon': {
    hazards: ['Salmonella', 'Coumarin (high levels)', 'Filth'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'oregano': {
    hazards: ['Salmonella', 'Filth', 'Adulteration with olive leaves'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  
  // ============================================================================
  // ANIMAL FOOD / PET FOOD - 21 CFR 507
  // Subject to Preventive Controls for Animal Food
  // ============================================================================
  'animal_food': {
    hazards: ['Salmonella', 'Nutrient deficiency/toxicity', 'Chemical contaminants', 'Mycotoxins'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 507 (Preventive Controls for Animal Food)'
  },
  'pet_food': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'Aflatoxin', 'Thiamine deficiency', 'Vitamin D toxicity'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 507'
  },
  'raw_pet_food': {
    hazards: ['Salmonella', 'Listeria monocytogenes', 'E. coli O157:H7', 'Campylobacter'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 507'
  },
  'pet_treats': {
    hazards: ['Salmonella', 'Undeclared allergens', 'Choking hazards'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 507'
  },
  'animal_feed': {
    hazards: ['Mycotoxins (Aflatoxin, DON, Fumonisin)', 'Salmonella', 'Heavy metals', 'Drug residues'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 507'
  },
  
  // ============================================================================
  // FRESH PRODUCE - Additional high-risk items (21 CFR 112)
  // ============================================================================
  'tomatoes': {
    hazards: ['Salmonella', 'Cyclospora'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'melons': {
    hazards: ['Salmonella', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'cantaloupe': {
    hazards: ['Salmonella', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'berries': {
    hazards: ['Hepatitis A', 'Norovirus', 'Cyclospora'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'raspberries': {
    hazards: ['Cyclospora', 'Hepatitis A', 'Norovirus'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'strawberries': {
    hazards: ['Hepatitis A', 'Cyclospora', 'Norovirus'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'cilantro': {
    hazards: ['Cyclospora', 'Salmonella'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  'green_onions': {
    hazards: ['Hepatitis A', 'Salmonella', 'Cyclospora'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 112'
  },
  
  // ============================================================================
  // SEAFOOD - Additional species (21 CFR 123)
  // ============================================================================
  'tuna': {
    hazards: ['Histamine (Scombroid)', 'Mercury', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'mahi_mahi': {
    hazards: ['Histamine (Scombroid)', 'Ciguatera'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'mackerel': {
    hazards: ['Histamine (Scombroid)', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'salmon': {
    hazards: ['Parasites (Anisakis)', 'Listeria monocytogenes', 'Environmental contaminants'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'smoked_fish': {
    hazards: ['Listeria monocytogenes', 'Clostridium botulinum', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'sushi_grade_fish': {
    hazards: ['Parasites (Anisakis)', 'Histamine', 'Vibrio'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'oysters': {
    hazards: ['Vibrio vulnificus', 'Vibrio parahaemolyticus', 'Norovirus', 'Biotoxins'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'clams': {
    hazards: ['Vibrio', 'Biotoxins (PSP)', 'Norovirus'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'mussels': {
    hazards: ['Biotoxins (PSP, DSP, ASP)', 'Vibrio', 'Heavy metals'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'crab': {
    hazards: ['Vibrio', 'Listeria monocytogenes', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'lobster': {
    hazards: ['Vibrio', 'Biotoxins', 'Parasites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123'
  },
  'shrimp': {
    hazards: ['Salmonella', 'Vibrio', 'Antibiotic residues', 'Sulfites'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123, Import Alert 16-124'
  },
  'tôm': {
    hazards: ['Salmonella', 'Vibrio', 'Antibiotic residues', 'Nitrofurans'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 123, Import Alert 16-124'
  },
  
  // ============================================================================
  // CHOCOLATE & CONFECTIONERY
  // ============================================================================
  'chocolate': {
    hazards: ['Salmonella', 'Heavy metals (Lead, Cadmium)', 'Undeclared allergens'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'cocoa': {
    hazards: ['Salmonella', 'Heavy metals (Lead, Cadmium)', 'Ochratoxin A'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  
  // ============================================================================
  // GRAINS - Mycotoxin risk
  // ============================================================================
  'wheat': {
    hazards: ['Deoxynivalenol (DON/Vomitoxin)', 'Aflatoxin', 'Ochratoxin A'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'corn': {
    hazards: ['Aflatoxin', 'Fumonisin', 'Deoxynivalenol'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  'rice': {
    hazards: ['Arsenic', 'Aflatoxin', 'Cadmium'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 117'
  },
  
  // ============================================================================
  // HARD-COOKED EGGS - 21 CFR 118
  // ============================================================================
  'hard_cooked_eggs': {
    hazards: ['Listeria monocytogenes', 'Salmonella'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 118'
  },
  'egg_products': {
    hazards: ['Salmonella Enteritidis', 'Listeria monocytogenes'],
    requiresAnnualAudit: true,
    cfrReference: '21 CFR 118'
  }
}

// High-risk countries based on FDA Import Alert history
export const HIGH_RISK_COUNTRIES = [
  'China',
  'India', 
  'Vietnam',
  'Thailand',
  'Mexico',
  'Indonesia',
  'Bangladesh',
  'Pakistan',
  'Ecuador',
  'Peru'
]

// ============================================================================
// DUNS Validation
// ============================================================================

/**
 * Validate DUNS Number format
 * DUNS = Data Universal Numbering System (9 digits)
 * Required for FSV role in customs declarations
 */
export function validateDUNS(duns: string): { valid: boolean; error?: string; formatted?: string } {
  if (!duns || typeof duns !== 'string') {
    return { valid: false, error: 'DUNS number is required' }
  }
  
  // Remove any non-digit characters
  const cleaned = duns.replace(/\D/g, '')
  
  if (cleaned.length !== 9) {
    return { 
      valid: false, 
      error: `DUNS number must be exactly 9 digits (received ${cleaned.length} digits)` 
    }
  }
  
  // Check if all zeros (invalid)
  if (/^0+$/.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Invalid DUNS number (cannot be all zeros)' 
    }
  }
  
  // Check if sequential (likely fake)
  if (/^123456789$|^987654321$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid DUNS number (sequential numbers not allowed)'
    }
  }
  
  // Format as XX-XXX-XXXX for display
  const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`
  
  return { valid: true, formatted }
}

// ============================================================================
// FCE/SID Validation for LACF/Acidified Foods (21 CFR 108/113/114)
// ============================================================================

/**
 * LACF/AF product categories that require FCE/SID
 */
export const LACF_AF_CATEGORIES = [
  'lacf', 'low_acid_canned', 'canned_vegetables', 'canned_meat', 'retort_pouches',
  'acidified_foods', 'pickles', 'peppers_in_oil', 'artichoke_hearts', 'sauces'
] as const

/**
 * Check if product category requires FCE/SID registration
 */
export function requiresFCESID(category: string): boolean {
  if (!category) return false
  const normalizedCategory = category.toLowerCase().replace(/[\s-]/g, '_')
  return LACF_AF_CATEGORIES.some(cat => normalizedCategory.includes(cat))
}

/**
 * Validate FCE (Food Canning Establishment) Number format
 * FCE numbers are assigned by FDA and typically are 5-digit numbers
 */
export function validateFCE(fce: string): { valid: boolean; error?: string; formatted?: string } {
  if (!fce || typeof fce !== 'string') {
    return { valid: false, error: 'FCE number is required for LACF/Acidified Foods per 21 CFR 108.25' }
  }
  
  // Remove any non-alphanumeric characters
  const cleaned = fce.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  if (cleaned.length < 3 || cleaned.length > 10) {
    return { 
      valid: false, 
      error: 'FCE number must be between 3-10 characters' 
    }
  }
  
  // Check if all zeros (invalid)
  if (/^0+$/.test(cleaned)) {
    return { 
      valid: false, 
      error: 'Invalid FCE number (cannot be all zeros)' 
    }
  }
  
  return { valid: true, formatted: cleaned }
}

/**
 * Validate SID (Submission Identifier/Process Filing) Number format
 * SID numbers are assigned by FDA when a scheduled process is filed
 */
export function validateSID(sid: string): { valid: boolean; error?: string; formatted?: string } {
  if (!sid || typeof sid !== 'string') {
    return { valid: false, error: 'SID (Process Filing Number) is required for LACF/Acidified Foods per 21 CFR 108.35' }
  }
  
  // Remove any non-alphanumeric characters
  const cleaned = sid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  
  if (cleaned.length < 3 || cleaned.length > 15) {
    return { 
      valid: false, 
      error: 'SID number must be between 3-15 characters' 
    }
  }
  
  return { valid: true, formatted: cleaned }
}

/**
 * Validate pH value for acidified foods
 * Per 21 CFR 114, equilibrium pH must be ≤4.6 to prevent C. botulinum growth
 */
export function validateAcidifiedPH(ph: number): { valid: boolean; error?: string; warning?: string } {
  if (ph === null || ph === undefined || isNaN(ph)) {
    return { valid: false, error: 'pH value is required for acidified foods per 21 CFR 114.80' }
  }
  
  if (ph < 0 || ph > 14) {
    return { valid: false, error: 'pH must be between 0 and 14' }
  }
  
  if (ph > 4.6) {
    return { 
      valid: false, 
      error: `Equilibrium pH of ${ph} exceeds maximum of 4.6 for acidified foods. Product may be classified as LACF requiring thermal processing per 21 CFR 113.` 
    }
  }
  
  if (ph > 4.2 && ph <= 4.6) {
    return { 
      valid: true, 
      warning: `pH of ${ph} is close to the 4.6 limit. Consider additional controls to ensure consistent acidification.` 
    }
  }
  
  return { valid: true }
}

/**
 * Check FCE/SID compliance for a product
 */
export function checkFCESIDCompliance(
  productCategory: string,
  fceNumber?: string,
  sidNumber?: string,
  processAuthorityName?: string,
  scheduledProcessFiled?: boolean,
  equilibriumPH?: number
): {
  requiresFCESID: boolean
  isCompliant: boolean
  violations: string[]
  warnings: string[]
  cfrReference: string
} {
  const violations: string[] = []
  const warnings: string[] = []
  
  const needsFCESID = requiresFCESID(productCategory)
  
  if (!needsFCESID) {
    return {
      requiresFCESID: false,
      isCompliant: true,
      violations: [],
      warnings: [],
      cfrReference: ''
    }
  }
  
  // Determine CFR reference based on category
  const isAcidified = ['acidified_foods', 'pickles', 'peppers_in_oil', 'artichoke_hearts', 'sauces']
    .some(cat => productCategory.toLowerCase().includes(cat))
  const cfrReference = isAcidified ? '21 CFR 114 (Acidified Foods)' : '21 CFR 113 (LACF)'
  
  // Check FCE
  if (!fceNumber) {
    violations.push('FCE Number is required. Foreign canning establishments must register with FDA per 21 CFR 108.25.')
  } else {
    const fceValidation = validateFCE(fceNumber)
    if (!fceValidation.valid) {
      violations.push(fceValidation.error!)
    }
  }
  
  // Check SID
  if (!sidNumber) {
    violations.push('SID (Process Filing Number) is required. Scheduled processes must be filed with FDA per 21 CFR 108.35.')
  } else {
    const sidValidation = validateSID(sidNumber)
    if (!sidValidation.valid) {
      violations.push(sidValidation.error!)
    }
  }
  
  // Check Process Authority
  if (!processAuthorityName) {
    warnings.push('Process Authority validation is recommended. Scheduled processes should be validated by a recognized Process Authority.')
  }
  
  // Check scheduled process filing
  if (!scheduledProcessFiled) {
    violations.push('Scheduled process must be filed with FDA before importing LACF/Acidified Foods.')
  }
  
  // Check pH for acidified foods
  if (isAcidified && equilibriumPH !== undefined) {
    const phValidation = validateAcidifiedPH(equilibriumPH)
    if (!phValidation.valid) {
      violations.push(phValidation.error!)
    } else if (phValidation.warning) {
      warnings.push(phValidation.warning)
    }
  }
  
  return {
    requiresFCESID: true,
    isCompliant: violations.length === 0,
    violations,
    warnings,
    cfrReference
  }
}

// ============================================================================
// SAHCODHA Risk Assessment
// ============================================================================

/**
 * Determine if product requires SAHCODHA-level verification
 * (annual onsite audit required per 21 CFR 1.506(d))
 */
export function assessSAHCODHARisk(
  productCategory: string,
  productName: string,
  ingredients?: string,
  countryOfOrigin?: string
): {
  isHighRisk: boolean
  requiredVerification: 'annual_onsite' | 'periodic' | 'standard'
  hazards: string[]
  rationale: string
  cfrReference?: string
} {
  const categoryLower = productCategory?.toLowerCase() || ''
  const productLower = productName?.toLowerCase() || ''
  const ingredientsLower = ingredients?.toLowerCase() || ''
  const searchText = `${categoryLower} ${productLower} ${ingredientsLower}`
  
  // Check direct SAHCODHA categories
  for (const [cat, config] of Object.entries(SAHCODHA_CATEGORIES)) {
    if (searchText.includes(cat) || categoryLower.includes(cat)) {
      return {
        isHighRisk: true,
        requiredVerification: 'annual_onsite',
        hazards: config.hazards,
        rationale: `Product matches SAHCODHA category "${cat}". Annual onsite audit of foreign supplier is required per 21 CFR 1.506(d)(1).`,
        cfrReference: config.cfrReference
      }
    }
  }
  
  // Check specific high-risk keywords
  const highRiskKeywords = [
    { keyword: 'raw', hazards: ['Pathogens', 'Parasites'], reason: 'Raw/unprocessed product' },
    { keyword: 'unpasteurized', hazards: ['Pathogens'], reason: 'Unpasteurized product' },
    { keyword: 'fermented', hazards: ['Botulism', 'Mycotoxins'], reason: 'Fermented product' },
    { keyword: 'smoked', hazards: ['Listeria', 'Clostridium botulinum'], reason: 'Smoked product' },
    { keyword: 'dried fish', hazards: ['Histamine', 'Parasites'], reason: 'Dried seafood' },
    { keyword: 'sashimi', hazards: ['Parasites', 'Pathogens'], reason: 'Raw fish preparation' },
    { keyword: 'ceviche', hazards: ['Parasites', 'Vibrio'], reason: 'Raw seafood preparation' },
  ]
  
  for (const { keyword, hazards, reason } of highRiskKeywords) {
    if (searchText.includes(keyword)) {
      return {
        isHighRisk: true,
        requiredVerification: 'annual_onsite',
        hazards,
        rationale: `${reason} identified. May require enhanced supplier verification per 21 CFR 1.506(d).`
      }
    }
  }
  
  // Check country-specific risks
  const isHighRiskCountry = countryOfOrigin && HIGH_RISK_COUNTRIES.some(c => 
    countryOfOrigin.toLowerCase().includes(c.toLowerCase())
  )
  
  if (isHighRiskCountry) {
    return {
      isHighRisk: false,
      requiredVerification: 'periodic',
      hazards: [],
      rationale: `Product from ${countryOfOrigin} may require enhanced verification activities based on FDA Import Alert history for this region.`
    }
  }
  
  return {
    isHighRisk: false,
    requiredVerification: 'standard',
    hazards: [],
    rationale: 'Standard FSVP verification activities apply per 21 CFR 1.506.'
  }
}

// ============================================================================
// Main FSVP Compliance Checker
// ============================================================================

/**
 * Check if FSVP applies to this report/product
 */
export function requiresFSVP(report: AuditReport): boolean {
  // FSVP applies when:
  // 1. Product is imported (country of origin != USA)
  // 2. Importer is subject to FSVP (not exempt)
  // 3. Product is food for human or animal consumption
  
  const countryOfOrigin = report.manufacturer_info?.country_of_origin?.toLowerCase()
  const isImporter = report.manufacturer_info?.is_importer === true
  const productType = report.product_type?.toLowerCase()
  
  // Must be imported (not from USA)
  if (!countryOfOrigin || countryOfOrigin === 'usa' || countryOfOrigin === 'united states') {
    return false
  }
  
  // Must be an importer
  if (!isImporter) {
    return false
  }
  
  // Must be food/beverage/dietary supplement (not cosmetic or drug)
  const fsvpApplicableTypes = ['food', 'beverage', 'dietary_supplement', 'infant_formula', 'medical_food']
  if (productType && !fsvpApplicableTypes.includes(productType)) {
    return false
  }
  
  return true
}

/**
 * Generate FSVP compliance check result
 */
export function checkFSVPCompliance(
  report: AuditReport,
  importerProfile?: FSVPImporterProfile,
  supplier?: FSVPSupplier | null
): FSVPComplianceResult {
  // First check if FSVP applies
  if (!requiresFSVP(report)) {
    return {
      isApplicable: false,
      isCompliant: true,
      violations: [],
      warnings: []
    }
  }
  
  const violations: FSVPViolationItem[] = []
  const warnings: FSVPViolationItem[] = []
  
  // ============ Check DUNS Number (§1.512) ============
  if (!importerProfile?.importer_duns) {
    violations.push({
      id: 'FSVP-001',
      category: 'FSVP Compliance',
      severity: 'critical',
      description: 'Missing DUNS number for importer. DUNS is required for FSV role in customs declarations.',
      regulation_reference: '21 CFR 1.512',
      suggested_fix: 'Register for a DUNS number at dnb.com and add to your importer profile. This is required before importing food products.'
    })
  } else {
    const dunsValidation = validateDUNS(importerProfile.importer_duns)
    if (!dunsValidation.valid) {
      violations.push({
        id: 'FSVP-001',
        category: 'FSVP Compliance',
        severity: 'critical',
        description: `Invalid DUNS number: ${dunsValidation.error}`,
        regulation_reference: '21 CFR 1.512',
        suggested_fix: 'Correct your DUNS number in your importer profile. Format: 9 digits (e.g., 12-345-6789).'
      })
    }
  }
  
  // ============ Check Qualified Individual (§1.502) ============
  if (!importerProfile?.fsvp_qualified_individual) {
    violations.push({
      id: 'FSVP-002',
      category: 'FSVP Compliance',
      severity: 'critical',
      description: 'No Qualified Individual (QI) designated for FSVP program.',
      regulation_reference: '21 CFR 1.502',
      suggested_fix: 'Designate a Qualified Individual with documented food safety training and education. The QI must have technical expertise in food safety or be supervised by someone who does.'
    })
  } else if (!importerProfile.fsvp_qi_credentials?.training_completed?.length) {
    warnings.push({
      id: 'FSVP-002',
      category: 'FSVP Compliance',
      severity: 'warning',
      description: 'Qualified Individual credentials/training records not documented.',
      regulation_reference: '21 CFR 1.502(b)',
      suggested_fix: 'Document QI training records including FSVP training, HACCP certification, or equivalent food safety education.'
    })
  }
  
  // ============ Check Supplier Record (§1.505, §1.506) ============
  if (!supplier) {
    violations.push({
      id: 'FSVP-006',
      category: 'FSVP Compliance',
      severity: 'critical',
      description: 'No foreign supplier record linked to this product.',
      regulation_reference: '21 CFR 1.505',
      suggested_fix: 'Add the foreign supplier to your FSVP supplier management system and link to this product.'
    })
  } else {
    // Check supplier evaluation
    if (!supplier.supplier_evaluation || Object.keys(supplier.supplier_evaluation).length === 0) {
      violations.push({
        id: 'FSVP-006',
        category: 'FSVP Compliance',
        severity: 'critical',
        description: `Foreign supplier "${supplier.supplier_name}" has not been evaluated.`,
        regulation_reference: '21 CFR 1.505',
        suggested_fix: 'Conduct and document an evaluation of the foreign supplier\'s compliance with FDA regulations and food safety practices.'
      })
    }
    
    // Check verification activities
    if (!supplier.verification_activities || supplier.verification_activities.length === 0) {
      violations.push({
        id: 'FSVP-004',
        category: 'FSVP Compliance',
        severity: 'critical',
        description: `No verification activities recorded for supplier "${supplier.supplier_name}".`,
        regulation_reference: '21 CFR 1.506',
        suggested_fix: 'Conduct appropriate supplier verification activities (onsite audit, sampling/testing, document review) and document the results.'
      })
    }
    
    // Check if verification is overdue
    if (supplier.next_verification_due) {
      const dueDate = new Date(supplier.next_verification_due)
      const now = new Date()
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilDue < 0) {
        violations.push({
          id: 'FSVP-004',
          category: 'FSVP Compliance',
          severity: 'critical',
          description: `Supplier verification overdue by ${Math.abs(daysUntilDue)} days for "${supplier.supplier_name}".`,
          regulation_reference: '21 CFR 1.506',
          suggested_fix: 'Immediately conduct supplier verification activities and update records.'
        })
      } else if (daysUntilDue <= 30) {
        warnings.push({
          id: 'FSVP-004',
          category: 'FSVP Compliance',
          severity: 'warning',
          description: `Supplier verification due in ${daysUntilDue} days for "${supplier.supplier_name}".`,
          regulation_reference: '21 CFR 1.506',
          suggested_fix: 'Schedule supplier verification activities before the due date.'
        })
      }
    }
    
    // Check SAHCODHA audit requirement
    if (supplier.requires_annual_audit && supplier.next_onsite_audit_due) {
      const auditDueDate = new Date(supplier.next_onsite_audit_due)
      const now = new Date()
      const daysUntilAuditDue = Math.floor((auditDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilAuditDue < 0) {
        violations.push({
          id: 'FSVP-005',
          category: 'FSVP Compliance',
          severity: 'critical',
          description: `Annual onsite audit overdue for SAHCODHA product from "${supplier.supplier_name}". This product poses serious health risk - audit required annually.`,
          regulation_reference: '21 CFR 1.506(d)(1)',
          suggested_fix: 'Immediately schedule and complete an onsite audit of the foreign supplier facility. SAHCODHA products require annual audits.'
        })
      } else if (daysUntilAuditDue <= 60) {
        warnings.push({
          id: 'FSVP-005',
          category: 'FSVP Compliance',
          severity: 'warning',
          description: `Annual onsite audit due in ${daysUntilAuditDue} days for SAHCODHA supplier "${supplier.supplier_name}".`,
          regulation_reference: '21 CFR 1.506(d)(1)',
          suggested_fix: 'Schedule onsite audit before due date. SAHCODHA products require annual audits to verify hazard controls.'
        })
      }
    }
  }
  
  // ============ Check Hazard Analysis (§1.504) ============
  // Look for hazard analysis in supplier record or generate based on product
  const productCategory = report.product_category || ''
  const productName = report.product_name || ''
  const ingredients = report.ingredient_list || ''
  const countryOfOrigin = report.manufacturer_info?.country_of_origin || ''
  
  const sahcodhaAssessment = assessSAHCODHARisk(productCategory, productName, ingredients, countryOfOrigin)
  
  if (!supplier?.hazard_analysis || Object.keys(supplier.hazard_analysis).length === 0) {
    if (sahcodhaAssessment.isHighRisk) {
      violations.push({
        id: 'FSVP-003',
        category: 'FSVP Compliance',
        severity: 'critical',
        description: `Hazard analysis not documented for high-risk SAHCODHA product. Identified hazards: ${sahcodhaAssessment.hazards.join(', ')}.`,
        regulation_reference: '21 CFR 1.504',
        suggested_fix: `Conduct and document a thorough hazard analysis. This product requires enhanced controls due to SAHCODHA hazards. Reference: ${sahcodhaAssessment.cfrReference || '21 CFR 1.504'}`
      })
    } else {
      violations.push({
        id: 'FSVP-003',
        category: 'FSVP Compliance',
        severity: 'critical',
        description: 'Hazard analysis not documented for this imported product.',
        regulation_reference: '21 CFR 1.504',
        suggested_fix: 'Conduct and document a hazard analysis identifying known or reasonably foreseeable hazards for this food.'
      })
    }
  }
  
  // Add SAHCODHA warning if applicable but not yet flagged
  if (sahcodhaAssessment.isHighRisk && supplier && !supplier.is_sahcodha_risk) {
    warnings.push({
      id: 'FSVP-005',
      category: 'FSVP Compliance',
      severity: 'warning',
      description: `Product may be SAHCODHA category requiring annual onsite audit. ${sahcodhaAssessment.rationale}`,
      regulation_reference: '21 CFR 1.506(d)',
      suggested_fix: 'Update supplier record to mark as SAHCODHA risk and establish annual audit schedule.'
    })
  }
  
  // Build supplier status for result
  const supplierStatus = supplier ? {
    supplierId: supplier.id,
    supplierName: supplier.supplier_name,
    status: supplier.status,
    verificationDue: supplier.next_verification_due,
    isOverdue: supplier.next_verification_due ? new Date(supplier.next_verification_due) < new Date() : false
  } : undefined
  
  return {
    isApplicable: true,
    isCompliant: violations.length === 0,
    violations,
    warnings,
    supplierStatus,
    sahcodhaAssessment
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get FSVP requirement details by ID
 */
export function getFSVPRequirement(id: string): FSVPRequirement | undefined {
  return FSVP_REQUIREMENTS.find(r => r.id === id)
}

/**
 * Check if a product category is SAHCODHA
 */
export function isSAHCODHACategory(category: string): boolean {
  const categoryLower = category.toLowerCase()
  return Object.keys(SAHCODHA_CATEGORIES).some(key => categoryLower.includes(key))
}

/**
 * Get SAHCODHA hazards for a category
 */
export function getSAHCODHAHazards(category: string): string[] {
  const categoryLower = category.toLowerCase()
  for (const [key, config] of Object.entries(SAHCODHA_CATEGORIES)) {
    if (categoryLower.includes(key)) {
      return config.hazards
    }
  }
  return []
}

/**
 * Calculate days until verification due
 */
export function getDaysUntilVerificationDue(supplier: FSVPSupplier): number | null {
  if (!supplier.next_verification_due) return null
  const dueDate = new Date(supplier.next_verification_due)
  const now = new Date()
  return Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get urgency level for supplier verification
 */
export function getVerificationUrgency(supplier: FSVPSupplier): 'overdue' | 'critical' | 'warning' | 'normal' | 'unknown' {
  const days = getDaysUntilVerificationDue(supplier)
  if (days === null) return 'unknown'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'critical'
  if (days <= 30) return 'warning'
  return 'normal'
}

/**
 * Format FSVP violations for inclusion in main audit report
 */
export function formatFSVPViolationsForReport(result: FSVPComplianceResult): Array<{
  category: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  regulation_reference: string
  suggested_fix: string
  citations: Array<{ regulation_id: string; section: string; text: string; source: string; relevance_score: number }>
}> {
  const violations = [...result.violations, ...result.warnings]
  
  return violations.map(v => ({
    category: v.category,
    severity: v.severity,
    description: v.description,
    regulation_reference: v.regulation_reference,
    suggested_fix: v.suggested_fix,
    citations: [{
      regulation_id: '21cfr1',
      section: v.regulation_reference.replace('21 CFR ', ''),
      text: `${v.description} - ${v.suggested_fix}`,
      source: 'FSVP Regulations',
      relevance_score: 1.0
    }]
  }))
}
