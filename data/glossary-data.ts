/**
 * FSVP & Food Safety Glossary
 * Comprehensive terminology for FSVP compliance and food safety management
 */

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category: 'FSVP' | 'Hazard' | 'Process' | 'Regulation' | 'Verification' | 'Document'
  cfr_reference?: string
  examples?: string[]
  relatedTerms?: string[]
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  // FSVP Core Terms
  {
    id: 'fsvp',
    term: 'FSVP',
    definition: 'Foreign Supplier Verification Program - a mandatory program for U.S. importers to ensure that imported food products meet U.S. food safety standards.',
    category: 'FSVP',
    cfr_reference: '21 CFR 1.505',
    examples: ['All food importers must have an FSVP to verify supplier compliance'],
    relatedTerms: ['QI', 'Verification', 'Supplier Evaluation']
  },
  {
    id: 'qi',
    term: 'QI (Qualified Individual)',
    definition: 'A person with appropriate education, training, and experience to oversee the FSVP activities of the importer.',
    category: 'FSVP',
    cfr_reference: '21 CFR 1.500(b)',
    examples: ['A QI must have 1+ years of food safety experience', 'QI must oversee supplier verification activities'],
    relatedTerms: ['FSVP', 'Training', 'Responsibility']
  },
  {
    id: 'sahcodha',
    term: 'SAHCODHA',
    definition: 'Specific, Actionable, Hazard-based, Comprehensive, On-site, Documented, Hazard Analysis - enhanced verification procedures for suppliers of certain high-risk products.',
    category: 'FSVP',
    cfr_reference: '21 CFR 1.506',
    examples: ['Leafy green suppliers require SAHCODHA verification', 'Juice suppliers require SAHCODHA verification'],
    relatedTerms: ['Hazard Analysis', 'Enhanced Verification', 'High-Risk Products']
  },
  {
    id: 'pcqi',
    term: 'PCQI (Preventive Controls Qualified Individual)',
    definition: 'A person trained in food safety and preventive controls to oversee food safety plans at manufacturing facilities.',
    category: 'FSVP',
    cfr_reference: '21 CFR 117.22',
    examples: ['Food manufacturers must employ a PCQI', 'PCQI must develop and oversee preventive controls'],
    relatedTerms: ['Preventive Controls', 'FSMA', 'Food Safety Plan']
  },

  // Hazard Categories
  {
    id: 'biological_hazard',
    term: 'Biological Hazard',
    definition: 'Pathogenic microorganisms or biological toxins that can cause food-borne illness when consumed.',
    category: 'Hazard',
    examples: ['Salmonella in poultry', 'Listeria in ready-to-eat foods', 'E. coli in raw produce'],
    relatedTerms: ['Pathogen', 'Contamination', 'Food-borne Illness']
  },
  {
    id: 'chemical_hazard',
    term: 'Chemical Hazard',
    definition: 'Harmful chemical substances that can contaminate food and cause adverse health effects.',
    category: 'Hazard',
    examples: ['Pesticide residues', 'Heavy metals like mercury', 'Food additives exceeding safe limits'],
    relatedTerms: ['Contaminant', 'Residue', 'Chemical Safety']
  },
  {
    id: 'physical_hazard',
    term: 'Physical Hazard',
    definition: 'Foreign objects or particles in food that can cause injury when consumed.',
    category: 'Hazard',
    examples: ['Glass shards from broken containers', 'Metal fragments from equipment', 'Plastic pieces from packaging'],
    relatedTerms: ['Contaminant', 'Foreign Object', 'Food Defense']
  },
  {
    id: 'allergen_hazard',
    term: 'Allergen',
    definition: 'A food ingredient that triggers allergic reactions in sensitive individuals. The FDA recognizes 9 major allergens.',
    category: 'Hazard',
    cfr_reference: '21 CFR 201.113',
    examples: ['Milk, eggs, fish, crustaceans, tree nuts, peanuts, wheat, soybeans, sesame'],
    relatedTerms: ['Allergen Control', 'Cross-contamination', 'Labeling Requirement']
  },
  {
    id: 'radiological_hazard',
    term: 'Radiological Hazard',
    definition: 'Radioactive contamination of food from environmental sources or intentional tampering.',
    category: 'Hazard',
    examples: ['Radioactive fallout from industrial accidents', 'Cesium-137 or Strontium-90 in milk'],
    relatedTerms: ['Contamination', 'Emergency Response']
  },

  // Verification & Monitoring Terms
  {
    id: 'supplier_verification',
    term: 'Supplier Verification',
    definition: 'Activities conducted to ensure suppliers meet U.S. food safety requirements, including audits, testing, and document review.',
    category: 'Verification',
    cfr_reference: '21 CFR 1.505(b)',
    examples: ['On-site audits of supplier facilities', 'Product testing', 'Review of supplier certificates'],
    relatedTerms: ['Audit', 'Testing', 'Certification']
  },
  {
    id: 'on_site_audit',
    term: 'On-site Audit',
    definition: 'An in-person inspection of a supplier facility to assess their food safety controls and operations.',
    category: 'Verification',
    examples: ['Annual audits of high-risk suppliers', 'FSMA compliance audits'],
    relatedTerms: ['Audit Finding', 'Corrective Action', 'Supplier Evaluation']
  },
  {
    id: 'product_testing',
    term: 'Product Testing',
    definition: 'Laboratory analysis of food samples to verify safety and compliance with regulatory standards.',
    category: 'Verification',
    examples: ['Pathogen testing for pathogens', 'Pesticide residue testing', 'Heavy metal testing'],
    relatedTerms: ['Microbiological Test', 'Chemical Analysis', 'Lot Testing']
  },
  {
    id: 'certificate_analysis',
    term: 'Certificate Analysis',
    definition: 'Review of third-party testing certificates provided by suppliers as evidence of food safety.',
    category: 'Verification',
    examples: ['Third-party laboratory certificates', 'Supplier safety certifications'],
    relatedTerms: ['Documentation', 'Third-Party Audit', 'Certification']
  },
  {
    id: 'hazard_analysis',
    term: 'Hazard Analysis',
    definition: 'A systematic process to identify and assess food safety hazards that could occur in a food product or process.',
    category: 'Process',
    cfr_reference: '21 CFR 117.130',
    examples: ['HACCP-based hazard analysis', 'Product-specific hazard identification'],
    relatedTerms: ['HACCP', 'Risk Assessment', 'Critical Control Point']
  },
  {
    id: 'haccp',
    term: 'HACCP (Hazard Analysis Critical Control Point)',
    definition: 'A systematic food safety management approach identifying critical control points where hazards can be prevented or eliminated.',
    category: 'Process',
    examples: ['Cook temperature is a CCP for meat products', 'pH level is a CCP for acidified foods'],
    relatedTerms: ['Critical Control Point', 'Preventive Controls', 'Food Safety Plan']
  },
  {
    id: 'risk_assessment',
    term: 'Risk Assessment',
    definition: 'Process of evaluating the likelihood and severity of food safety hazards to prioritize control measures.',
    category: 'Process',
    examples: ['Assessing pathogen risk in raw produce', 'Evaluating allergen cross-contamination risk'],
    relatedTerms: ['Hazard Analysis', 'Risk Matrix', 'Likelihood']
  },

  // Regulatory & Compliance Terms
  {
    id: 'cfr',
    term: 'CFR (Code of Federal Regulations)',
    definition: 'The official compilation of federal regulations issued by U.S. government agencies.',
    category: 'Regulation',
    examples: ['21 CFR Part 117 - FSMA regulations', '21 CFR 1.505 - FSVP requirements'],
    relatedTerms: ['FDA Regulation', 'FSMA', 'Compliance']
  },
  {
    id: 'fsma',
    term: 'FSMA (Food Safety Modernization Act)',
    definition: 'Landmark 2011 U.S. law that fundamentally reformed food safety oversight, emphasizing prevention over reaction.',
    category: 'Regulation',
    examples: ['FSMA established preventive controls requirements', 'FSMA created FSVP program'],
    relatedTerms: ['Preventive Controls', 'FSVP', 'Compliance']
  },
  {
    id: 'fda_warning_letter',
    term: 'FDA Warning Letter',
    definition: 'Official correspondence from FDA notifying a company of regulatory violations and requesting corrective action.',
    category: 'Regulation',
    examples: ['Warning letters document violations found during facility inspections'],
    relatedTerms: ['Inspection', 'Compliance', 'Enforcement']
  },
  {
    id: 'recall',
    term: 'Recall',
    definition: 'Removal of food products from commerce due to food safety risks or regulatory violations.',
    category: 'Regulation',
    examples: ['Class I recall - highest health risk', 'Class II recall - moderate health risk', 'Class III recall - low health risk'],
    relatedTerms: ['Contamination', 'Regulatory Action', 'Consumer Safety']
  },
  {
    id: 'import_alert',
    term: 'Import Alert',
    definition: 'FDA notice to U.S. Customs that shipments of specific products from certain sources should be detained pending FDA action.',
    category: 'Regulation',
    examples: ['Import alert issued for produce with Salmonella contamination history'],
    relatedTerms: ['Detention', 'Compliance', 'Regulatory Action']
  },

  // Document & Process Terms
  {
    id: 'documentation',
    term: 'Documentation',
    definition: 'Records and written procedures that document food safety activities, verification, and compliance.',
    category: 'Document',
    examples: ['Supplier verification records', 'Audit reports', 'Product test results'],
    relatedTerms: ['Record Retention', 'Traceability', 'Compliance Records']
  },
  {
    id: 'traceability',
    term: 'Traceability',
    definition: 'Ability to track food products through the supply chain from raw materials to finished products.',
    category: 'Document',
    examples: ['Track produce from farm to retail', 'Identify affected products during recalls'],
    relatedTerms: ['Track and Trace', 'Supply Chain', 'Documentation']
  },
  {
    id: 'record_retention',
    term: 'Record Retention',
    definition: 'Requirements to maintain food safety records for specified periods for regulatory inspection and recall response.',
    category: 'Document',
    cfr_reference: '21 CFR 11.10',
    examples: ['FSVP records must be retained for 2 years', 'Supplier verification documents must be available for inspection'],
    relatedTerms: ['Documentation', 'Compliance', 'Regulatory Requirement']
  },
  {
    id: 'corrective_action',
    term: 'Corrective Action',
    definition: 'Actions taken to eliminate or reduce food safety risks when problems are identified.',
    category: 'Process',
    examples: ['Recall product due to contamination', 'Implement new supplier controls', 'Retrofit facility equipment'],
    relatedTerms: ['Preventive Action', 'Risk Mitigation', 'Compliance']
  },
  {
    id: 'preventive_control',
    term: 'Preventive Control',
    definition: 'Physical, chemical, or procedural measures to prevent food safety hazards from occurring.',
    category: 'Process',
    cfr_reference: '21 CFR 117.135',
    examples: ['Temperature monitoring during cooking', 'Allergen segregation procedures', 'Supplier verification'],
    relatedTerms: ['HACCP', 'Critical Control Point', 'Food Safety Plan']
  },

  // Risk Tier Terms
  {
    id: 'low_risk',
    term: 'Low Risk Supplier',
    definition: 'Supplier with established food safety controls, good compliance history, and minimal hazard characteristics.',
    category: 'FSVP',
    examples: ['Established supplier with consistent audit history', 'Product with low inherent hazard risk'],
    relatedTerms: ['Risk Tier', 'Supplier Evaluation', 'Verification Type']
  },
  {
    id: 'medium_risk',
    term: 'Medium Risk Supplier',
    definition: 'Supplier with moderate hazard characteristics or some concerns in compliance history or control measures.',
    category: 'FSVP',
    examples: ['New supplier with limited history', 'Product with moderate hazard potential'],
    relatedTerms: ['Risk Tier', 'Enhanced Verification', 'Supplier Evaluation']
  },
  {
    id: 'high_risk',
    term: 'High Risk Supplier',
    definition: 'Supplier with significant hazard characteristics or limited evidence of food safety controls.',
    category: 'FSVP',
    examples: ['Supplier from country with weak food safety system', 'High-hazard product category'],
    relatedTerms: ['Risk Tier', 'Enhanced Verification', 'SAHCODHA']
  },
  {
    id: 'critical_risk',
    term: 'Critical Risk Supplier',
    definition: 'Supplier with highest food safety risks, including history of FDA warnings or recalls.',
    category: 'FSVP',
    examples: ['Supplier with recent FDA warning letter', 'Involved in multi-state outbreak'],
    relatedTerms: ['Risk Tier', 'SAHCODHA', 'Enhanced Verification']
  },

  // Product Category Terms
  {
    id: 'produce',
    term: 'Produce',
    definition: 'Raw fruits and vegetables grown for human consumption.',
    category: 'Hazard',
    cfr_reference: '21 CFR 112',
    examples: ['Leafy greens', 'Tomatoes', 'Melons', 'Berries'],
    relatedTerms: ['Biological Hazard', 'Contamination', 'PAMA']
  },
  {
    id: 'seafood',
    term: 'Seafood',
    definition: 'Fish and shellfish products for human consumption.',
    category: 'Hazard',
    cfr_reference: '21 CFR 123',
    examples: ['Fish', 'Shrimp', 'Oysters', 'Scallops'],
    relatedTerms: ['HACCP', 'Pathogen Control', 'Temperature Control']
  },
  {
    id: 'juice',
    term: 'Juice',
    definition: 'Beverage made from extracting or pressing juice from fruits or vegetables.',
    category: 'Hazard',
    cfr_reference: '21 CFR 120',
    examples: ['Orange juice', 'Apple juice', 'Vegetable juice'],
    relatedTerms: ['Pathogen Reduction', 'HACCP', 'Treatment Process']
  },
  {
    id: 'dairy',
    term: 'Dairy Products',
    definition: 'Milk and milk-derived food products.',
    category: 'Hazard',
    cfr_reference: '21 CFR 111',
    examples: ['Milk', 'Cheese', 'Yogurt', 'Butter'],
    relatedTerms: ['Pathogenic Microorganism Control', 'Temperature', 'Allergen']
  },

  // Additional Important Terms
  {
    id: 'cross_contamination',
    term: 'Cross-contamination',
    definition: 'Transfer of harmful substances, allergens, or pathogens from one food to another, usually unintentionally.',
    category: 'Hazard',
    examples: ['Allergen transfer from one product to another during processing', 'Pathogen spread through shared equipment'],
    relatedTerms: ['Allergen', 'Contamination', 'Preventive Control']
  },
  {
    id: 'food_defense',
    term: 'Food Defense',
    definition: 'Protective measures to ensure food and food ingredients are protected from intentional adulteration.',
    category: 'Process',
    cfr_reference: '21 CFR 121',
    examples: ['Facility security measures', 'Background checks for employees'],
    relatedTerms: ['Food Safety', 'Security', 'Contamination']
  },
  {
    id: 'supplier_control',
    term: 'Supplier Control',
    definition: 'Measures to ensure suppliers meet food safety standards and produce safe food.',
    category: 'FSVP',
    examples: ['Audit requirements', 'Testing protocols', 'Documentation requirements'],
    relatedTerms: ['FSVP', 'Verification', 'Compliance']
  },
  {
    id: 'country_of_origin',
    term: 'Country of Origin',
    definition: 'The country where food or a food ingredient was produced or grown.',
    category: 'Document',
    cfr_reference: '21 CFR 321.1',
    examples: ['Food produced in Canada', 'Ingredient sourced from India'],
    relatedTerms: ['Supply Chain', 'Import Alert', 'Risk Assessment']
  },
  {
    id: 'food_system_status',
    term: 'Food System Status',
    definition: 'Assessment of a country\'s food safety regulatory system and enforcement capabilities.',
    category: 'Regulation',
    examples: ['Countries with GFSI-recognized programs', 'Countries with weak food safety infrastructure'],
    relatedTerms: ['Country Risk', 'Supplier Evaluation', 'GFSI']
  },
]

/**
 * Helper function to search glossary terms
 */
export function searchGlossaryTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase()
  return GLOSSARY_TERMS.filter(
    term =>
      term.term.toLowerCase().includes(lowerQuery) ||
      term.definition.toLowerCase().includes(lowerQuery) ||
      term.examples?.some(ex => ex.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get terms by category
 */
export function getTermsByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return GLOSSARY_TERMS.filter(term => term.category === category)
}

/**
 * Get related terms
 */
export function getRelatedTerms(termId: string): GlossaryTerm[] {
  const term = GLOSSARY_TERMS.find(t => t.id === termId)
  if (!term || !term.relatedTerms) return []
  return GLOSSARY_TERMS.filter(t => term.relatedTerms?.includes(t.term))
}
