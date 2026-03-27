/**
 * FSVP Product-Hazard Mapping
 * 
 * Auto-suggests mandatory hazards based on product category.
 * This ensures compliance officers are prompted with the most critical
 * hazards for each product type per FDA guidance and historical enforcement.
 * 
 * Reference: FDA FSVP Guidance, Import Alerts, Warning Letter history
 */

import type { HazardItem } from './fsvp-supplier-types'

export interface ProductHazardProfile {
  category: string
  categoryAliases: string[] // Alternative names/Vietnamese names
  mandatoryHazards: MandatoryHazard[]
  commonHazards: string[]
  regulatoryReferences: string[]
  importAlerts?: string[]
  notes?: string
}

export interface MandatoryHazard {
  hazard_name: string
  hazard_type: 'biological' | 'chemical' | 'physical' | 'radiological' | 'allergen'
  description: string
  severity: 'medium' | 'high' | 'sahcodha'
  likelihood: 'medium' | 'high'
  control_measure: string
  verification_method: string
  monitoring_frequency: string
  source: string
  is_mandatory: boolean
  cfr_reference?: string
  // Enhanced evidence fields
  fda_import_alert?: string
  fda_import_alert_url?: string
  warning_letters?: string[]
  outbreak_history?: string[]
  scientific_references?: string[]
  fda_guidance_url?: string
  country_risk_note?: string
}

/**
 * Product-Hazard Mapping Database
 * Maps product categories to their mandatory and common hazards
 */
export const PRODUCT_HAZARD_MAPPING: ProductHazardProfile[] = [
  // =====================
  // Tree Nuts
  // =====================
  {
    category: 'cashew',
    categoryAliases: ['hạt điều', 'cashew nuts', 'cashew nut', 'điều'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - FDA has documented multiple outbreaks linked to tree nuts including cashews from Vietnam. Salmonella can survive in low-moisture foods like nuts for extended periods.',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Thermal processing (roasting at minimum 121°C for 15+ minutes), supplier HACCP verification, environmental monitoring program',
        verification_method: 'Third-party lab testing (n=5, c=0), Certificate of Analysis review, annual onsite audit',
        monitoring_frequency: 'Every shipment + annual supplier audit',
        source: 'FDA Import Alert 99-19, Warning Letters history',
        is_mandatory: true,
        cfr_reference: '21 CFR 117.135',
        // Evidence and citations
        fda_import_alert: 'Import Alert 99-19: Detention Without Physical Examination of Tree Nuts Due to Salmonella',
        fda_import_alert_url: 'https://www.accessdata.fda.gov/cms_ia/importalert_106.html',
        warning_letters: [
          'WL 320-20-48 (Tan Tan Food Import Export, Vietnam) - Salmonella in cashews, 2020',
          'WL 320-19-12 (Long Son Joint Stock Company, Vietnam) - Salmonella contamination, 2019',
          'WL 320-18-37 (Binh Phuoc Cashew, Vietnam) - Positive Salmonella findings, 2018',
        ],
        outbreak_history: [
          '2018: Multistate Salmonella Typhimurium outbreak linked to cashews - 13 cases across 7 states (CDC)',
          '2016: Wonderful Pistachios & Cashews recall - potential Salmonella contamination',
          '2015: Sahale Snacks cashew recall - Salmonella risk from supplier',
        ],
        scientific_references: [
          'Harris et al. (2016) "Salmonella survival in low-moisture foods" - Journal of Food Protection',
          'FDA Guidance: Control of Salmonella in Low-Moisture Foods (2018)',
          'Beuchat & Mann (2016) "Survival of Salmonella in dry foods" - Applied and Environmental Microbiology',
        ],
        fda_guidance_url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/draft-guidance-industry-control-salmonella-low-moisture-foods',
        country_risk_note: 'Vietnam is among the top exporters of cashews to the US. FDA has issued multiple Warning Letters to Vietnamese cashew processors for Salmonella violations. Enhanced scrutiny recommended for Vietnamese suppliers.',
      },
      {
        hazard_name: 'Tree nut allergen',
        hazard_type: 'allergen',
        description: 'Major allergen - Tree nuts are one of the Big 9 allergens requiring declaration per FALCPA',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Allergen control program, dedicated lines or validated cleaning, supplier allergen documentation',
        verification_method: 'Supplier allergen questionnaire, ELISA testing if cross-contact risk',
        monitoring_frequency: 'Annual supplier audit, per-shipment documentation review',
        source: 'FALCPA, 21 CFR 101.4',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      }
    ],
    commonHazards: ['Aflatoxin', 'Ochratoxin A', 'E. coli', 'Metal fragments', 'Pesticide residues'],
    regulatoryReferences: ['21 CFR 117', '21 CFR 101.4 (Allergen)', 'FSMA Preventive Controls'],
    importAlerts: ['Import Alert 99-19 (Salmonella in tree nuts)'],
    notes: 'Vietnam is a major exporter. FDA has issued multiple Warning Letters for Salmonella in cashews from Vietnam.'
  },
  {
    category: 'peanuts',
    categoryAliases: ['đậu phộng', 'lạc', 'peanut', 'groundnuts'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - Multiple outbreaks linked to peanut products',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Roasting/thermal kill step, supplier HACCP verification',
        verification_method: 'Third-party lab testing, Certificate of Analysis',
        monitoring_frequency: 'Every shipment',
        source: 'FDA historical data',
        is_mandatory: true,
        cfr_reference: '21 CFR 117.135'
      },
      {
        hazard_name: 'Peanut allergen',
        hazard_type: 'allergen',
        description: 'Major allergen - Peanuts are Big 9 allergen, most common cause of fatal food allergic reactions',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Allergen control program, dedicated processing, proper labeling',
        verification_method: 'Supplier allergen documentation, ELISA testing',
        monitoring_frequency: 'Annual audit, per-shipment documentation',
        source: 'FALCPA',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      },
      {
        hazard_name: 'Aflatoxin',
        hazard_type: 'chemical',
        description: 'Mycotoxin - Aflatoxin B1 is carcinogenic, FDA action level 20 ppb total aflatoxins',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Supplier testing program, proper storage conditions, visual inspection',
        verification_method: 'Certificate of Analysis showing aflatoxin levels <20 ppb',
        monitoring_frequency: 'Every shipment',
        source: 'FDA CPG 555.400',
        is_mandatory: true,
        cfr_reference: 'FDA CPG 555.400'
      }
    ],
    commonHazards: ['Metal fragments', 'Pesticide residues', 'Ochratoxin'],
    regulatoryReferences: ['21 CFR 117', '21 CFR 101.4', 'FDA CPG 555.400'],
    importAlerts: ['Import Alert 99-19'],
    notes: 'Aflatoxin testing is critical for peanuts, especially from tropical climates.'
  },
  // =====================
  // Seafood - Vietnamese exports
  // =====================
  {
    category: 'pangasius',
    categoryAliases: ['cá tra', 'cá basa', 'basa', 'vietnamese catfish', 'swai', 'tra fish'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - FDA Import Alert 16-131 lists Vietnamese catfish for Salmonella',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'HACCP plan, proper cooking temperatures, supplier GMP verification',
        verification_method: 'Third-party lab testing, onsite audit of supplier',
        monitoring_frequency: 'Every shipment + annual onsite audit required',
        source: 'FDA Import Alert 16-131',
        is_mandatory: true,
        cfr_reference: '21 CFR 123'
      },
      {
        hazard_name: 'Veterinary drug residues',
        hazard_type: 'chemical',
        description: 'Antibiotics and banned substances - FDA detains shipments for fluoroquinolones, nitrofurans, malachite green',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Supplier drug-free certification, withdrawal period compliance, testing program',
        verification_method: 'Certificate of Analysis for drug residues, supplier audit',
        monitoring_frequency: 'Every shipment',
        source: 'FDA Import Alert 16-124, 16-125',
        is_mandatory: true,
        cfr_reference: '21 CFR 556'
      },
      {
        hazard_name: 'Listeria monocytogenes',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - Significant concern for frozen/refrigerated fish products',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'Proper cold chain, sanitation controls, supplier HACCP',
        verification_method: 'Environmental monitoring records, lab testing',
        monitoring_frequency: 'Annual supplier audit',
        source: 'FDA HACCP guidance',
        is_mandatory: true,
        cfr_reference: '21 CFR 123'
      }
    ],
    commonHazards: ['Mercury', 'Parasites', 'Histamine', 'Metal fragments'],
    regulatoryReferences: ['21 CFR 123 (Seafood HACCP)', '21 CFR 556 (Drug residues)'],
    importAlerts: ['Import Alert 16-131 (Salmonella)', 'Import Alert 16-124 (Drug residues)', 'Import Alert 16-125 (Unsafe drug residues)'],
    notes: 'Vietnamese Pangasius requires annual onsite audit per SAHCODHA rules. Multiple FDA Import Alerts active.'
  },
  {
    category: 'shrimp',
    categoryAliases: ['tôm', 'prawns', 'shrimp products'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen in raw/frozen shrimp',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Proper cooking, HACCP controls, supplier verification',
        verification_method: 'Lab testing, supplier audit',
        monitoring_frequency: 'Every shipment',
        source: 'FDA Import Alerts',
        is_mandatory: true,
        cfr_reference: '21 CFR 123'
      },
      {
        hazard_name: 'Shellfish allergen',
        hazard_type: 'allergen',
        description: 'Major allergen - Crustacean shellfish is Big 9 allergen',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Allergen labeling, cross-contact prevention',
        verification_method: 'Label review, supplier documentation',
        monitoring_frequency: 'Every shipment',
        source: 'FALCPA',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      },
      {
        hazard_name: 'Veterinary drug residues',
        hazard_type: 'chemical',
        description: 'Antibiotics from aquaculture - nitrofurans, chloramphenicol concerns',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Drug-free certification, testing program',
        verification_method: 'Certificate of Analysis',
        monitoring_frequency: 'Every shipment',
        source: 'FDA Import Alerts',
        is_mandatory: true,
        cfr_reference: '21 CFR 556'
      }
    ],
    commonHazards: ['Vibrio', 'Sulfites', 'Metal fragments'],
    regulatoryReferences: ['21 CFR 123', '21 CFR 101.4'],
    importAlerts: ['Import Alert 16-124'],
    notes: 'Sulfite declaration required if used. Aquaculture shrimp may have drug residue concerns.'
  },
  // =====================
  // Produce
  // =====================
  {
    category: 'leafy_greens',
    categoryAliases: ['rau xanh', 'lettuce', 'spinach', 'kale', 'salad greens'],
    mandatoryHazards: [
      {
        hazard_name: 'E. coli O157:H7',
        hazard_type: 'biological',
        description: 'Pathogenic bacteria - Multiple deadly outbreaks linked to leafy greens',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Agricultural water testing, GAP compliance, supplier FSMA compliance',
        verification_method: 'Supplier audit, water test records, GAP certification',
        monitoring_frequency: 'Annual supplier audit',
        source: 'FDA Leafy Greens STEC Action Plan',
        is_mandatory: true,
        cfr_reference: '21 CFR 112'
      },
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen in fresh produce',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'GAP compliance, water quality, sanitation',
        verification_method: 'Supplier audit, certifications',
        monitoring_frequency: 'Annual',
        source: 'FDA Produce Safety Rule',
        is_mandatory: true,
        cfr_reference: '21 CFR 112'
      },
      {
        hazard_name: 'Cyclospora',
        hazard_type: 'biological',
        description: 'Parasitic pathogen - outbreaks linked to imported produce',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Water quality controls, supplier GAP',
        verification_method: 'Supplier audit',
        monitoring_frequency: 'Annual',
        source: 'FDA historical data',
        is_mandatory: true,
        cfr_reference: '21 CFR 112'
      }
    ],
    commonHazards: ['Listeria monocytogenes', 'Pesticide residues', 'Physical contaminants'],
    regulatoryReferences: ['21 CFR 112 (Produce Safety Rule)', 'FSMA'],
    importAlerts: ['Import Alert 99-23'],
    notes: 'Leafy greens are SAHCODHA category requiring annual supplier audit.'
  },
  // =====================
  // Spices
  // =====================
  {
    category: 'spices',
    categoryAliases: ['gia vị', 'pepper', 'cinnamon', 'turmeric', 'dried spices'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - Spices have high Salmonella contamination rates per FDA studies',
        severity: 'high',
        likelihood: 'high',
        control_measure: 'Supplier treatment (steam, irradiation), supplier HACCP',
        verification_method: 'Certificate of treatment, lab testing',
        monitoring_frequency: 'Every shipment',
        source: 'FDA Spice Study',
        is_mandatory: true,
        cfr_reference: '21 CFR 117'
      },
      {
        hazard_name: 'Aflatoxin',
        hazard_type: 'chemical',
        description: 'Mycotoxin - Risk in improperly stored spices',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Proper storage, supplier testing',
        verification_method: 'Certificate of Analysis',
        monitoring_frequency: 'Every shipment',
        source: 'FDA guidance',
        is_mandatory: true,
        cfr_reference: 'FDA CPG 555.400'
      }
    ],
    commonHazards: ['Lead', 'Pesticide residues', 'Insect filth', 'Color additives'],
    regulatoryReferences: ['21 CFR 117', '21 CFR 110'],
    importAlerts: ['Import Alert 99-08'],
    notes: 'FDA found Salmonella in ~7% of imported spice shipments. Treatment verification important.'
  },
  // =====================
  // LOW-ACID CANNED FOODS (LACF) - 21 CFR 113
  // =====================
  {
    category: 'lacf',
    categoryAliases: ['low acid canned food', 'canned vegetables', 'canned meat', 'retort pouches', 'thực phẩm đóng hộp'],
    mandatoryHazards: [
      {
        hazard_name: 'Clostridium botulinum',
        hazard_type: 'biological',
        description: 'Spore-forming bacteria producing deadly botulism toxin - Primary hazard for LACF with pH >4.6',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Scheduled thermal process validated by process authority, container integrity controls',
        verification_method: 'Scheduled process filed with FDA, process authority letter, retort records review',
        monitoring_frequency: 'Every batch - temperature/time records required',
        source: '21 CFR 113',
        is_mandatory: true,
        cfr_reference: '21 CFR 113.40'
      },
      {
        hazard_name: 'Container integrity failure',
        hazard_type: 'physical',
        description: 'Defective seams or seals allowing post-process contamination',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'Double seam inspection, seam teardown analysis, closure inspection',
        verification_method: 'Seam measurement records, visual inspection logs',
        monitoring_frequency: 'Per production run',
        source: '21 CFR 113.60',
        is_mandatory: true,
        cfr_reference: '21 CFR 113.60'
      }
    ],
    commonHazards: ['Metal fragments', 'Undeclared allergens'],
    regulatoryReferences: ['21 CFR 113 (Thermally Processed Low-Acid Foods)', '21 CFR 108 (Registration)'],
    importAlerts: ['Import Alert 99-33 (LACF lacking FDA registration)'],
    notes: 'Foreign LACF establishments must register with FDA and file scheduled processes. Lack of registration = automatic detention.'
  },
  // =====================
  // ACIDIFIED FOODS - 21 CFR 114
  // =====================
  {
    category: 'acidified_foods',
    categoryAliases: ['pickles', 'peppers in oil', 'artichoke hearts', 'dưa chua', 'ớt ngâm'],
    mandatoryHazards: [
      {
        hazard_name: 'Clostridium botulinum',
        hazard_type: 'biological',
        description: 'C. botulinum spores can germinate if pH is not properly controlled below 4.6',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'pH control to ≤4.6 equilibrium pH, thermal process, acidification schedule',
        verification_method: 'pH records (equilibrium pH testing), process authority review',
        monitoring_frequency: 'Every batch - pH measurement required',
        source: '21 CFR 114',
        is_mandatory: true,
        cfr_reference: '21 CFR 114.80'
      },
      {
        hazard_name: 'pH control failure',
        hazard_type: 'chemical',
        description: 'Insufficient acidification allowing pathogen growth - critical process deviation',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'Validated acidification schedule, equilibrium pH monitoring, acid concentration controls',
        verification_method: 'pH meter calibration records, equilibrium pH testing records',
        monitoring_frequency: 'Every batch',
        source: '21 CFR 114.90',
        is_mandatory: true,
        cfr_reference: '21 CFR 114.90'
      }
    ],
    commonHazards: ['Spoilage organisms', 'Metal fragments from containers'],
    regulatoryReferences: ['21 CFR 114 (Acidified Foods)', '21 CFR 108'],
    importAlerts: ['Import Alert 99-33'],
    notes: 'Acidified foods must have pH ≤4.6 or aw ≤0.85. Supplier must have Better Process Control School training.'
  },
  // =====================
  // DIETARY SUPPLEMENTS - 21 CFR 111
  // =====================
  {
    category: 'dietary_supplements',
    categoryAliases: ['vitamins', 'herbal supplements', 'protein powder', 'thực phẩm chức năng', 'vitamin'],
    mandatoryHazards: [
      {
        hazard_name: 'Heavy metals',
        hazard_type: 'chemical',
        description: 'Lead, Arsenic, Cadmium, Mercury contamination - especially in herbal/botanical products',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Supplier testing program, specifications for heavy metals, supplier qualification',
        verification_method: 'Certificate of Analysis with heavy metal results, supplier audit',
        monitoring_frequency: 'Every lot',
        source: '21 CFR 111, FDA guidance',
        is_mandatory: true,
        cfr_reference: '21 CFR 111.70'
      },
      {
        hazard_name: 'Microbial contamination',
        hazard_type: 'biological',
        description: 'Bacterial, yeast, mold contamination - critical for non-sterilized products',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Supplier GMP, microbial specifications, environmental controls',
        verification_method: 'Certificate of Analysis with micro results',
        monitoring_frequency: 'Every lot',
        source: '21 CFR 111.70',
        is_mandatory: true,
        cfr_reference: '21 CFR 111.70'
      },
      {
        hazard_name: 'Identity/potency issues',
        hazard_type: 'chemical',
        description: 'Wrong ingredient identity, insufficient potency - common in botanical supplements',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Identity testing per USP/specifications, potency testing',
        verification_method: 'Certificate of Analysis, identity testing records',
        monitoring_frequency: 'Every lot',
        source: '21 CFR 111.75',
        is_mandatory: true,
        cfr_reference: '21 CFR 111.75'
      }
    ],
    commonHazards: ['Undeclared ingredients', 'Pesticide residues', 'Pyrrolizidine alkaloids', 'Solvent residues'],
    regulatoryReferences: ['21 CFR 111 (Dietary Supplement CGMP)', '21 CFR 1.511 (Modified FSVP)'],
    importAlerts: ['Import Alert 54-07 (Contaminated DS)', 'Import Alert 54-12 (Undeclared drug ingredients)'],
    notes: 'Dietary supplements subject to modified FSVP requirements under 21 CFR 1.511. Must verify DS CGMP compliance.'
  },
  // =====================
  // INFANT FORMULA - 21 CFR 106/107
  // =====================
  {
    category: 'infant_formula',
    categoryAliases: ['baby formula', 'sữa công thức', 'infant food', 'baby food'],
    mandatoryHazards: [
      {
        hazard_name: 'Cronobacter sakazakii',
        hazard_type: 'biological',
        description: 'Deadly pathogen for infants - Can cause meningitis, sepsis with 40-80% fatality rate in neonates',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Validated thermal process, environmental monitoring, hygienic design, wet cleaning controls',
        verification_method: 'Environmental monitoring records, finished product testing, supplier audit',
        monitoring_frequency: 'Every lot + continuous environmental monitoring',
        source: '21 CFR 106.55, FDA guidance',
        is_mandatory: true,
        cfr_reference: '21 CFR 106.55'
      },
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen - Significant risk in powdered infant formula',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Thermal process validation, environmental controls, finished product testing',
        verification_method: 'Lab testing records, supplier audit',
        monitoring_frequency: 'Every lot',
        source: '21 CFR 106.55',
        is_mandatory: true,
        cfr_reference: '21 CFR 106.55'
      },
      {
        hazard_name: 'Nutrient deficiency',
        hazard_type: 'chemical',
        description: 'Inadequate nutrient levels - Infant formula is sole source of nutrition, deficiencies cause serious harm',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'Nutrient specifications per 21 CFR 107, stability testing, formulation controls',
        verification_method: 'Certificate of Analysis, stability data',
        monitoring_frequency: 'Every lot + stability program',
        source: '21 CFR 107.100',
        is_mandatory: true,
        cfr_reference: '21 CFR 107.100'
      },
      {
        hazard_name: 'Heavy metals',
        hazard_type: 'chemical',
        description: 'Lead, Arsenic, Cadmium, Mercury - FDA has set action levels for baby food',
        severity: 'sahcodha',
        likelihood: 'medium',
        control_measure: 'Supplier testing, ingredient specifications',
        verification_method: 'Certificate of Analysis',
        monitoring_frequency: 'Every lot',
        source: 'FDA Action Levels',
        is_mandatory: true,
        cfr_reference: 'FDA Guidance'
      }
    ],
    commonHazards: ['Melamine', 'Mycotoxins', 'Physical contaminants'],
    regulatoryReferences: ['21 CFR 106 (Infant Formula Requirements)', '21 CFR 107 (Infant Formula)'],
    importAlerts: ['Import Alert 99-04 (Infant formula)'],
    notes: 'CRITICAL CATEGORY. Infant formula requires pre-market notification to FDA. Subject to strictest controls.'
  },
  // =====================
  // ANIMAL FOOD / PET FOOD - 21 CFR 507
  // =====================
  {
    category: 'animal_food',
    categoryAliases: ['pet food', 'dog food', 'cat food', 'animal feed', 'thức ăn thú cưng'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Pathogen affecting animals and humans handling pet food - Multiple recalls for Salmonella in pet food',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Kill step (extrusion, cooking), environmental controls, supplier HACCP',
        verification_method: 'Supplier audit, finished product testing records',
        monitoring_frequency: 'Every lot + environmental monitoring',
        source: '21 CFR 507',
        is_mandatory: true,
        cfr_reference: '21 CFR 507.33'
      },
      {
        hazard_name: 'Mycotoxins',
        hazard_type: 'chemical',
        description: 'Aflatoxin, Vomitoxin (DON), Fumonisin - From contaminated grains, can cause serious illness/death',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: 'Grain supplier testing, specifications, proper storage',
        verification_method: 'Certificate of Analysis for mycotoxins',
        monitoring_frequency: 'Every lot of grain ingredients',
        source: 'FDA CPG',
        is_mandatory: true,
        cfr_reference: 'FDA CPG 683.100'
      },
      {
        hazard_name: 'Nutrient deficiency/toxicity',
        hazard_type: 'chemical',
        description: 'Inadequate or excess vitamins/minerals - Can cause serious harm (e.g., Vitamin D toxicity, thiamine deficiency)',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Formulation controls, premix testing, nutrient assays',
        verification_method: 'Certificate of Analysis, formulation records',
        monitoring_frequency: 'Every lot',
        source: 'AAFCO guidelines',
        is_mandatory: true,
        cfr_reference: '21 CFR 507'
      }
    ],
    commonHazards: ['Listeria monocytogenes', 'Metal fragments', 'Pentobarbital'],
    regulatoryReferences: ['21 CFR 507 (Preventive Controls for Animal Food)', '21 CFR 589 (Substances prohibited from feed)'],
    importAlerts: ['Import Alert 99-04 (Pet food)'],
    notes: 'Raw pet food has higher risk for Salmonella and Listeria. Subject to FSMA Preventive Controls for Animal Food.'
  },
  // =====================
  // JUICE - 21 CFR 120
  // =====================
  {
    category: 'juice',
    categoryAliases: ['fruit juice', 'nước ép', 'unpasteurized juice', 'vegetable juice'],
    mandatoryHazards: [
      {
        hazard_name: 'E. coli O157:H7',
        hazard_type: 'biological',
        description: 'Deadly pathogen - Multiple outbreaks linked to unpasteurized apple cider/juice',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: '5-log reduction via pasteurization, UV treatment, or validated alternative',
        verification_method: 'Process validation records, HACCP plan review',
        monitoring_frequency: 'Continuous monitoring of CCP',
        source: '21 CFR 120',
        is_mandatory: true,
        cfr_reference: '21 CFR 120.24'
      },
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Bacterial pathogen in fresh juice products',
        severity: 'sahcodha',
        likelihood: 'high',
        control_measure: '5-log reduction process',
        verification_method: 'Process validation, HACCP records',
        monitoring_frequency: 'Per batch',
        source: '21 CFR 120',
        is_mandatory: true,
        cfr_reference: '21 CFR 120.24'
      },
      {
        hazard_name: 'Patulin',
        hazard_type: 'chemical',
        description: 'Mycotoxin in apple juice - FDA action level 50 ppb',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Cull/sort program for apples, supplier controls',
        verification_method: 'Certificate of Analysis',
        monitoring_frequency: 'Per lot',
        source: 'FDA CPG 510.150',
        is_mandatory: true,
        cfr_reference: 'FDA CPG 510.150'
      }
    ],
    commonHazards: ['Cryptosporidium', 'Cyclospora', 'Pesticide residues'],
    regulatoryReferences: ['21 CFR 120 (HACCP for Juice)', '21 CFR 101.17(g) (Warning statement for unpasteurized juice)'],
    importAlerts: [],
    notes: 'Juice processors must achieve 5-log pathogen reduction. Unpasteurized juice requires warning statement.'
  },
  
  // =====================================================================
  // NON-SAHCODHA PRODUCTS (Still require FSVP, but flexible verification)
  // Per 21 CFR 1.506(d)(1) - verification activities appropriate to hazards
  // =====================================================================
  
  // =====================
  // CONFECTIONERY / CANDY
  // =====================
  {
    category: 'chocolate_confectionery',
    categoryAliases: ['chocolate', 'candy', 'confection', 'sô cô la', 'kẹo', 'bánh kẹo'],
    mandatoryHazards: [
      {
        hazard_name: 'Salmonella',
        hazard_type: 'biological',
        description: 'Low moisture product but Salmonella can survive - Multiple recalls in chocolate products',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Supplier HACCP, roasting verification, environmental monitoring',
        verification_method: 'Certificate of Analysis, sampling program',
        monitoring_frequency: 'Per lot or quarterly',
        source: '21 CFR 117',
        is_mandatory: true,
        cfr_reference: '21 CFR 117.135'
      },
      {
        hazard_name: 'Undeclared allergens',
        hazard_type: 'allergen',
        description: 'Cross-contact with milk, tree nuts, peanuts common in confectionery facilities',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Allergen control program, supplier questionnaire',
        verification_method: 'Supplier allergen documentation review',
        monitoring_frequency: 'Annual',
        source: 'FALCPA, 21 CFR 101.4',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      }
    ],
    commonHazards: ['Heavy metals (Lead, Cadmium)', 'Metal fragments'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Standard FSVP - Flexible verification activities. Sampling/testing or records review acceptable.'
  },
  // =====================
  // COOKIES / BAKED GOODS
  // =====================
  {
    category: 'baked_goods',
    categoryAliases: ['cookies', 'biscuits', 'crackers', 'pastries', 'bánh quy', 'bánh ngọt'],
    mandatoryHazards: [
      {
        hazard_name: 'Undeclared allergens',
        hazard_type: 'allergen',
        description: 'Wheat, milk, eggs, tree nuts commonly used - Cross-contact risk high',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Allergen control program, label review',
        verification_method: 'Supplier allergen questionnaire, label verification',
        monitoring_frequency: 'Annual supplier review + per-product label check',
        source: 'FALCPA',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      }
    ],
    commonHazards: ['Metal fragments', 'Salmonella (if contains eggs/flour)'],
    regulatoryReferences: ['21 CFR 117', 'FALCPA'],
    importAlerts: [],
    notes: 'Standard FSVP - Records review and supplier documentation typically sufficient.'
  },
  // =====================
  // SAUCES / CONDIMENTS (non-acidified)
  // =====================
  {
    category: 'sauces',
    categoryAliases: ['sauce', 'condiment', 'dressing', 'nước sốt', 'gia vị'],
    mandatoryHazards: [
      {
        hazard_name: 'Undeclared allergens',
        hazard_type: 'allergen',
        description: 'Soy, wheat, fish, sesame common in sauces',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Label review, supplier allergen program',
        verification_method: 'Label verification, supplier documentation',
        monitoring_frequency: 'Per product line',
        source: 'FALCPA',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      }
    ],
    commonHazards: ['Preservative levels', 'pH control (if acidified)'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Check if acidified (pH ≤4.6) - may require 21 CFR 114 compliance.'
  },
  // =====================
  // BEVERAGES (non-juice)
  // =====================
  {
    category: 'beverages',
    categoryAliases: ['drink', 'tea', 'coffee', 'water', 'trà', 'cà phê', 'nước'],
    mandatoryHazards: [
      {
        hazard_name: 'Microbial contamination',
        hazard_type: 'biological',
        description: 'Yeast, mold, bacteria - depends on product type',
        severity: 'medium',
        likelihood: 'medium',
        control_measure: 'Supplier GMP, processing controls',
        verification_method: 'Certificate of Analysis',
        monitoring_frequency: 'Quarterly or per lot for high-risk',
        source: '21 CFR 117',
        is_mandatory: false,
        cfr_reference: '21 CFR 117'
      }
    ],
    commonHazards: ['Pesticide residues (tea/coffee)', 'Heavy metals'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Lower risk category - Records review typically sufficient.'
  },
  // =====================
  // DRIED FRUITS
  // =====================
  {
    category: 'dried_fruits',
    categoryAliases: ['dried fruit', 'raisins', 'dates', 'figs', 'trái cây sấy', 'nho khô'],
    mandatoryHazards: [
      {
        hazard_name: 'Aflatoxin',
        hazard_type: 'chemical',
        description: 'Mycotoxin risk in dried fruits, especially figs and dates',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Supplier testing program, storage controls',
        verification_method: 'Certificate of Analysis for aflatoxin',
        monitoring_frequency: 'Per lot',
        source: 'FDA CPG',
        is_mandatory: true,
        cfr_reference: 'FDA CPG 570.500'
      },
      {
        hazard_name: 'Sulfite (undeclared)',
        hazard_type: 'chemical',
        description: 'Sulfites used as preservative - Must be declared if >10ppm',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Label verification, supplier specifications',
        verification_method: 'Label review, COA',
        monitoring_frequency: 'Per product',
        source: '21 CFR 101.100',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.100'
      }
    ],
    commonHazards: ['Ochratoxin A', 'Insect infestation', 'Pesticide residues'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Standard FSVP - Sampling/testing for mycotoxins recommended.'
  },
  // =====================
  // FROZEN VEGETABLES
  // =====================
  {
    category: 'frozen_vegetables',
    categoryAliases: ['frozen vegetable', 'frozen peas', 'frozen corn', 'rau đông lạnh'],
    mandatoryHazards: [
      {
        hazard_name: 'Listeria monocytogenes',
        hazard_type: 'biological',
        description: 'Can survive freezing - Multiple recalls in frozen vegetables',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Supplier environmental monitoring, HACCP verification',
        verification_method: 'Review supplier HACCP records, environmental monitoring data',
        monitoring_frequency: 'Annual supplier review',
        source: 'FDA historical recalls',
        is_mandatory: true,
        cfr_reference: '21 CFR 117'
      }
    ],
    commonHazards: ['Pesticide residues', 'Metal fragments'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Standard FSVP - Review supplier HACCP and environmental monitoring.'
  },
  // =====================
  // OILS & FATS
  // =====================
  {
    category: 'oils',
    categoryAliases: ['oil', 'fat', 'olive oil', 'coconut oil', 'dầu ăn', 'dầu dừa', 'dầu ô liu'],
    mandatoryHazards: [
      {
        hazard_name: 'Adulteration',
        hazard_type: 'chemical',
        description: 'Economically motivated adulteration - mixing with cheaper oils',
        severity: 'medium',
        likelihood: 'medium',
        control_measure: 'Supplier qualification, authenticity testing',
        verification_method: 'Identity testing, supplier audit',
        monitoring_frequency: 'Annual or per supplier',
        source: 'FDA EMA guidance',
        is_mandatory: false,
        cfr_reference: '21 CFR 117.130'
      }
    ],
    commonHazards: ['Rancidity', 'Pesticide residues'],
    regulatoryReferences: ['21 CFR 117'],
    importAlerts: [],
    notes: 'Standard FSVP - Authenticity verification recommended for olive oil.'
  },
  // =====================
  // SNACKS (general)
  // =====================
  {
    category: 'snacks',
    categoryAliases: ['snack', 'chips', 'crisps', 'đồ ăn vặt', 'bánh snack'],
    mandatoryHazards: [
      {
        hazard_name: 'Undeclared allergens',
        hazard_type: 'allergen',
        description: 'Common allergen cross-contact in snack facilities',
        severity: 'high',
        likelihood: 'medium',
        control_measure: 'Allergen control program, label review',
        verification_method: 'Supplier allergen questionnaire',
        monitoring_frequency: 'Annual',
        source: 'FALCPA',
        is_mandatory: true,
        cfr_reference: '21 CFR 101.4'
      }
    ],
    commonHazards: ['Acrylamide (fried products)', 'Metal fragments'],
    regulatoryReferences: ['21 CFR 117', 'FALCPA'],
    importAlerts: [],
    notes: 'Standard FSVP - Records review typically sufficient.'
  }
]

/**
 * Get mandatory hazards for a product category
 * Returns suggested hazards that should be included in hazard analysis
 */
export function getMandatoryHazardsForProduct(
  productCategory: string,
  productName?: string
): { profile: ProductHazardProfile | null; suggestedHazards: HazardItem[]; isDefaultProfile?: boolean } {
  const searchText = `${productCategory} ${productName || ''}`.toLowerCase()
  
  // Find matching profile
  let matchedProfile: ProductHazardProfile | null = null
  
  for (const profile of PRODUCT_HAZARD_MAPPING) {
    // Check category name
    if (searchText.includes(profile.category.toLowerCase())) {
      matchedProfile = profile
      break
    }
    // Check aliases
    for (const alias of profile.categoryAliases) {
      if (searchText.includes(alias.toLowerCase())) {
        matchedProfile = profile
        break
      }
    }
    if (matchedProfile) break
  }
  
  if (!matchedProfile) {
    // Return default hazards for unmapped products
    // ALL imported foods require FSVP - these are baseline hazards to consider
    const defaultHazards: HazardItem[] = [
      {
        id: `default-${Date.now()}-1`,
        hazard_name: 'Undeclared allergens',
        hazard_type: 'allergen',
        description: 'Cross-contact with major allergens during manufacturing - common issue in imported foods',
        source: 'FALCPA, 21 CFR 101.4',
        likelihood: 'medium',
        severity: 'high',
        is_reasonably_foreseeable: true,
        control_measure: 'Supplier allergen control program, label verification',
        verification_method: 'Supplier allergen questionnaire, label review',
        monitoring_frequency: 'Per product line',
        responsible_person: '',
      },
      {
        id: `default-${Date.now()}-2`,
        hazard_name: 'Foreign material',
        hazard_type: 'physical',
        description: 'Metal fragments, glass, plastic - common physical hazard in food manufacturing',
        source: '21 CFR 117',
        likelihood: 'medium',
        severity: 'medium',
        is_reasonably_foreseeable: true,
        control_measure: 'Supplier GMP, metal detection, foreign material controls',
        verification_method: 'Review supplier GMP records',
        monitoring_frequency: 'Annual supplier review',
        responsible_person: '',
      }
    ]
    
    return { 
      profile: {
        category: 'general_food',
        categoryAliases: [],
        mandatoryHazards: [],
        commonHazards: ['Microbial contamination', 'Foreign material', 'Undeclared allergens'],
        regulatoryReferences: ['21 CFR 117 (Preventive Controls)'],
        notes: 'Generic imported food - FSVP required per 21 CFR Part 1 Subpart L. Risk-based verification activities recommended.'
      }, 
      suggestedHazards: defaultHazards,
      isDefaultProfile: true 
    }
  }
  
  // Convert mandatory hazards to HazardItem format
  const suggestedHazards: HazardItem[] = matchedProfile.mandatoryHazards.map((mh, index) => ({
    id: `suggested-${Date.now()}-${index}`,
    hazard_name: mh.hazard_name,
    hazard_type: mh.hazard_type,
    description: mh.description,
    source: mh.source,
    likelihood: mh.likelihood,
    severity: mh.severity,
    is_reasonably_foreseeable: true,
    control_measure: mh.control_measure,
    verification_method: mh.verification_method,
    monitoring_frequency: mh.monitoring_frequency,
    responsible_person: '',
  }))
  
  return { profile: matchedProfile, suggestedHazards }
}

/**
 * Check if product category requires SAHCODHA-level verification
 * based on mandatory hazards with severity = 'sahcodha'
 */
export function requiresSAHCODHAVerification(productCategory: string, productName?: string): {
  requires: boolean
  hazards: string[]
  rationale: string
} {
  const { profile, suggestedHazards } = getMandatoryHazardsForProduct(productCategory, productName)
  
  if (!profile) {
    return { requires: false, hazards: [], rationale: 'Product category not in high-risk mapping' }
  }
  
  const sahcodhaHazards = suggestedHazards.filter(h => h.severity === 'sahcodha')
  
  if (sahcodhaHazards.length > 0) {
    return {
      requires: true,
      hazards: sahcodhaHazards.map(h => h.hazard_name),
      rationale: `Product matches "${profile.category}" category with SAHCODHA hazards: ${sahcodhaHazards.map(h => h.hazard_name).join(', ')}. Annual onsite audit required per 21 CFR 1.506(d).`
    }
  }
  
  return { requires: false, hazards: [], rationale: 'No SAHCODHA-level hazards identified' }
}

/**
 * Check FSVP requirement for imported product
 * Per 21 CFR Part 1 Subpart L, ALL imported food requires FSVP
 * 
 * Returns:
 * - fsvpRequired: Always TRUE for imported food
 * - verificationType: 'sahcodha' (annual audit required) or 'standard' (flexible)
 * - verificationOptions: Available verification activities per 21 CFR 1.506(d)
 */
export function checkFSVPRequirement(productCategory: string, productName?: string): {
  fsvpRequired: boolean
  verificationType: 'sahcodha' | 'standard'
  verificationOptions: string[]
  rationale: string
} {
  const sahcodhaCheck = requiresSAHCODHAVerification(productCategory, productName)
  
  if (sahcodhaCheck.requires) {
    return {
      fsvpRequired: true,
      verificationType: 'sahcodha',
      verificationOptions: ['annual_onsite_audit'], // Only option for SAHCODHA
      rationale: `SAHCODHA product (${sahcodhaCheck.hazards.join(', ')}). Annual onsite audit REQUIRED per 21 CFR 1.506(d)(2).`
    }
  }
  
  return {
    fsvpRequired: true, // ALL imported foods require FSVP
    verificationType: 'standard',
    verificationOptions: [
      'onsite_audit',           // Option per 21 CFR 1.506(d)(1)(i)
      'sampling_testing',       // Option per 21 CFR 1.506(d)(1)(ii)
      'supplier_records_review', // Option per 21 CFR 1.506(d)(1)(iii)
      'other_appropriate'        // Option per 21 CFR 1.506(d)(1)(iv)
    ],
    rationale: 'Standard FSVP required per 21 CFR Part 1 Subpart L. Importer may choose appropriate verification activities based on hazard analysis.'
  }
}

/**
 * Get FSVP verification frequency recommendation
 * Based on 21 CFR 1.506(e)
 */
export function getVerificationFrequency(productCategory: string, productName?: string): {
  frequency: string
  rationale: string
} {
  const sahcodhaCheck = requiresSAHCODHAVerification(productCategory, productName)
  
  if (sahcodhaCheck.requires) {
    return {
      frequency: 'annually',
      rationale: 'SAHCODHA products require AT LEAST annual verification per 21 CFR 1.506(d)(2).'
    }
  }
  
  // For non-SAHCODHA, frequency is risk-based
  const { profile } = getMandatoryHazardsForProduct(productCategory, productName)
  
  if (!profile || profile.category === 'general_food') {
    return {
      frequency: 'every_3_years',
      rationale: 'Low-risk product. Verification every 3 years acceptable if no hazards identified per 21 CFR 1.506(e).'
    }
  }
  
  // Has hazards but not SAHCODHA
  return {
    frequency: 'annually_or_as_risk_indicates',
    rationale: 'Moderate risk product. Annual verification recommended, or more frequently if supplier performance issues arise.'
  }
}

/**
 * Get all product categories that have hazard mappings
 */
export function getAllMappedCategories(): string[] {
  const categories: string[] = []
  for (const profile of PRODUCT_HAZARD_MAPPING) {
    categories.push(profile.category)
    categories.push(...profile.categoryAliases)
  }
  return [...new Set(categories)]
}

/**
 * FCE/SID Required Categories
 * Products that require FCE (Food Canning Establishment) registration 
 * and SID (Submission Identifier) for process filing per 21 CFR 108
 * 
 * LACF: 21 CFR 108.25 (Low-Acid Canned Foods)
 * Acidified Foods: 21 CFR 108.35
 */
const FCE_SID_REQUIRED_CATEGORIES = [
  // LACF categories
  'lacf',
  'low_acid_canned',
  'canned_vegetables', 
  'canned_meat',
  'canned_seafood',
  'retort_pouches',
  // Acidified food categories
  'acidified_foods',
  'pickles',
  'peppers_in_oil',
  'artichoke_hearts',
  'pickled_vegetables',
  // Vietnamese aliases
  'do_hop',
  'thuc_pham_dong_hop',
  'dua_chua',
  'ot_ngam',
]

/**
 * FCE/SID keyword patterns for detection from product names
 */
const FCE_SID_KEYWORDS = [
  // English
  'canned', 'retort', 'pouch', 'jarred', 'preserved',
  'pickled', 'acidified', 'low acid', 'lacf',
  // Product types
  'pickles', 'artichoke', 'hearts of palm', 'bamboo shoots',
  'water chestnuts', 'mushrooms canned', 'corn canned',
  'peas canned', 'beans canned', 'tomato paste', 'tomato sauce',
  // Vietnamese
  'đồ hộp', 'đóng hộp', 'dưa chua', 'dưa muối', 'ớt ngâm',
  'măng', 'nấm đóng hộp', 'cá hộp', 'thịt hộp',
]

export interface FceSidRequirement {
  required: boolean
  regulation: string
  regulationUrl: string
  reason: string
  category: string | null
  registrationInfo: {
    fceDatabaseUrl: string
    registrationGuideUrl: string
    betterProcessControlUrl: string
  }
}

/**
 * Check if a product requires FCE/SID registration
 * 
 * FCE (Food Canning Establishment) Number: Identifies the facility
 * SID (Submission Identifier): Identifies the specific process filing
 * 
 * Required for:
 * - Low-Acid Canned Foods (LACF) per 21 CFR 108.25
 * - Acidified Foods (AF) per 21 CFR 108.35
 * 
 * @param productCategory - Product category from hazard analysis
 * @param productName - Product name for keyword detection
 * @returns FceSidRequirement object with requirement details
 */
export function requiresFceSid(productCategory: string, productName?: string): FceSidRequirement {
  const defaultResult: FceSidRequirement = {
    required: false,
    regulation: '',
    regulationUrl: '',
    reason: '',
    category: null,
    registrationInfo: {
      fceDatabaseUrl: 'https://www.fda.gov/food/registration-food-facilities/food-canning-establishment-registration',
      registrationGuideUrl: 'https://www.fda.gov/food/guidance-documents-regulatory-information-topic-food-and-dietary-supplements/guidance-documents-acidified-low-acid-canned-foods',
      betterProcessControlUrl: 'https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/better-process-control-school',
    },
  }
  
  // First check: Direct category match
  const normalizedCategory = productCategory.toLowerCase().replace(/[\s-]/g, '_')
  
  if (FCE_SID_REQUIRED_CATEGORIES.includes(normalizedCategory)) {
    const isLACF = ['lacf', 'low_acid_canned', 'canned_vegetables', 'canned_meat', 'canned_seafood', 'retort_pouches'].includes(normalizedCategory)
    
    return {
      required: true,
      regulation: isLACF ? '21 CFR 108.25 (LACF)' : '21 CFR 108.35 (Acidified Foods)',
      regulationUrl: isLACF 
        ? 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.25'
        : 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.35',
      reason: isLACF 
        ? 'Low-Acid Canned Foods (pH > 4.6) require FCE registration and scheduled process filing to control C. botulinum risk'
        : 'Acidified Foods require FCE registration and scheduled process filing to ensure pH control below 4.6',
      category: normalizedCategory,
      registrationInfo: defaultResult.registrationInfo,
    }
  }
  
  // Second check: Get hazard profile and check if it's LACF/AF category
  const { profile } = getMandatoryHazardsForProduct(productCategory, productName)
  
  if (profile && FCE_SID_REQUIRED_CATEGORIES.includes(profile.category)) {
    const isLACF = ['lacf', 'low_acid_canned', 'canned_vegetables', 'canned_meat', 'canned_seafood', 'retort_pouches'].includes(profile.category)
    
    return {
      required: true,
      regulation: isLACF ? '21 CFR 108.25 (LACF)' : '21 CFR 108.35 (Acidified Foods)',
      regulationUrl: isLACF 
        ? 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.25'
        : 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.35',
      reason: `Product matches "${profile.category}" category which requires FCE/SID registration`,
      category: profile.category,
      registrationInfo: defaultResult.registrationInfo,
    }
  }
  
  // Third check: Keyword detection in product name
  if (productName) {
    const lowerName = productName.toLowerCase()
    
    for (const keyword of FCE_SID_KEYWORDS) {
      if (lowerName.includes(keyword)) {
        // Determine if LACF or Acidified based on keyword
        const isAcidified = ['pickled', 'acidified', 'pickles', 'dưa chua', 'dưa muối', 'ớt ngâm'].some(k => lowerName.includes(k))
        const isLACF = !isAcidified && ['canned', 'retort', 'đồ hộp', 'đóng hộp', 'hộp'].some(k => lowerName.includes(k))
        
        if (isLACF || isAcidified) {
          return {
            required: true,
            regulation: isLACF ? '21 CFR 108.25 (LACF)' : '21 CFR 108.35 (Acidified Foods)',
            regulationUrl: isLACF 
              ? 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.25'
              : 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-108/subpart-B/section-108.35',
            reason: `Product name contains "${keyword}" suggesting ${isLACF ? 'Low-Acid Canned Food' : 'Acidified Food'} - FCE/SID registration likely required`,
            category: isLACF ? 'lacf' : 'acidified_foods',
            registrationInfo: defaultResult.registrationInfo,
          }
        }
      }
    }
  }
  
  return defaultResult
}

/**
 * Check FCE/SID status from supplier profile
 * Returns existing FCE/SID if supplier has it registered
 */
export interface SupplierFceSidStatus {
  hasFceSid: boolean
  fceNumber: string | null
  fceSid: string | null
  fceExpiryDate: string | null
  isExpired: boolean
  source: 'supplier_profile' | 'fda_database' | 'manual_entry' | null
}

export function checkSupplierFceSid(supplier: {
  fce_number?: string | null
  fce_sid?: string | null
  fce_expiry_date?: string | null
  is_lacf_manufacturer?: boolean
  is_acidified_manufacturer?: boolean
}): SupplierFceSidStatus {
  const fceNumber = supplier.fce_number || null
  const fceSid = supplier.fce_sid || null
  const fceExpiryDate = supplier.fce_expiry_date || null
  
  // Check if FCE is expired
  let isExpired = false
  if (fceExpiryDate) {
    const expiryDate = new Date(fceExpiryDate)
    isExpired = expiryDate < new Date()
  }
  
  return {
    hasFceSid: !!(fceNumber && fceSid),
    fceNumber,
    fceSid,
    fceExpiryDate,
    isExpired,
    source: fceNumber ? 'supplier_profile' : null,
  }
}
