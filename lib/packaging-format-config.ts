/**
 * PACKAGING FORMAT CONFIGURATION - MULTI-DOMAIN
 * 
 * Different packaging tiers have different labeling requirements.
 * Rules vary by PRODUCT DOMAIN (food, supplement, cosmetic) AND packaging tier.
 *
 * Supported domains:
 *   - food         -> 21 CFR Part 101 (Nutrition Facts, FALCPA allergens)
 *   - supplement   -> 21 CFR 101.36 / DSHEA (Supplement Facts, disclaimer)
 *   - cosmetic     -> 21 CFR 701/740 (INCI ingredient list, warnings)
 *   - drug_otc     -> 21 CFR 201 (Drug Facts - future)
 *   - device       -> 21 CFR 801 (UDI labeling - future)
 *
 * Reference: 21 CFR 101, 21 CFR 101.36, 21 CFR 701, FDA CPG, FALCPA, MoCRA 2022
 */

// ============================================
// TYPES
// ============================================

export type PackagingFormatId = 'outer_carton' | 'retail_box' | 'individual_unit' | 'multipack_wrapper' | 'single_package'

export type ProductDomain = 'food' | 'supplement' | 'cosmetic' | 'drug_otc' | 'device'

export interface PackagingFormatRule {
  minFontSize: number
  nutritionFactsFormat: 'standard' | 'simplified' | 'linear' | 'tabular' | 'aggregate' | 'none'
  nutritionFactsRequired: boolean
  fullIngredientListRequired: boolean
  allergenDeclarationRequired: boolean
  netWeightRequired: boolean
  manufacturerInfoRequired: boolean
  canReferenceInnerLabel: boolean
  requiresTotalCount: boolean
  requiresAggregateDV: boolean
}

export interface PackagingFormat {
  id: PackagingFormatId
  name: string
  nameVi: string
  description: string
  descriptionVi: string
  icon: string
  /** Domain-specific overrides. Key = ProductDomain */
  domainOverrides: Partial<Record<ProductDomain, DomainOverride>>
  /** Default (food) rules - used when no domain override exists */
  defaultRules: PackagingFormatRule
  defaultFdaRegulations: string[]
  defaultFdaNotes: string[]
  defaultFdaNotesVi: string[]
}

export interface DomainOverride {
  rules: Partial<PackagingFormatRule>
  fdaRegulations: string[]
  fdaNotes: string[]
  fdaNotesVi: string[]
}

// ============================================
// DOMAIN METADATA
// ============================================

export const PRODUCT_DOMAINS: Record<ProductDomain, {
  name: string
  nameVi: string
  primaryRegulation: string
  factsPanel: string
  factsPanelVi: string
}> = {
  food: {
    name: 'Conventional Food',
    nameVi: 'Thực phẩm thông thường',
    primaryRegulation: '21 CFR Part 101',
    factsPanel: 'Nutrition Facts',
    factsPanelVi: 'Bảng Thông tin Dinh dưỡng (Nutrition Facts)',
  },
  supplement: {
    name: 'Dietary Supplement',
    nameVi: 'Thực phẩm chức năng / TPCN',
    primaryRegulation: '21 CFR 101.36 / DSHEA',
    factsPanel: 'Supplement Facts',
    factsPanelVi: 'Bảng Thông tin Bổ sung (Supplement Facts)',
  },
  cosmetic: {
    name: 'Cosmetic',
    nameVi: 'Mỹ phẩm',
    primaryRegulation: '21 CFR 701 / FD&C Act / MoCRA 2022',
    factsPanel: 'Ingredient List (INCI)',
    factsPanelVi: 'Danh sách thành phần (INCI)',
  },
  drug_otc: {
    name: 'OTC Drug',
    nameVi: 'Dược phẩm không kê đơn (OTC)',
    primaryRegulation: '21 CFR Part 201',
    factsPanel: 'Drug Facts',
    factsPanelVi: 'Bảng Thông tin Thuốc (Drug Facts)',
  },
  device: {
    name: 'Medical Device',
    nameVi: 'Thiết bị y tế',
    primaryRegulation: '21 CFR Part 801',
    factsPanel: 'UDI / Device Labeling',
    factsPanelVi: 'Nhãn thiết bị (UDI)',
  },
}

// ============================================
// PACKAGING FORMATS - MULTI-DOMAIN
// ============================================

export const PACKAGING_FORMATS: PackagingFormat[] = [
  // ------- SINGLE PACKAGE -------
  {
    id: 'single_package',
    name: 'Single Package (Standard)',
    nameVi: 'Bao bì đơn (Tiêu chuẩn)',
    description: 'Standard single retail package - the most common format. Full compliance required.',
    descriptionVi: 'Bao bì bán lẻ đơn tiêu chuẩn — định dạng phổ biến nhất. Cần tuân thủ đầy đủ.',
    icon: 'Package',
    defaultRules: {
      minFontSize: 6,
      nutritionFactsFormat: 'standard',
      nutritionFactsRequired: true,
      fullIngredientListRequired: true,
      allergenDeclarationRequired: true,
      netWeightRequired: true,
      manufacturerInfoRequired: true,
      canReferenceInnerLabel: false,
      requiresTotalCount: false,
      requiresAggregateDV: false,
    },
    defaultFdaRegulations: ['21 CFR 101.1', '21 CFR 101.9', '21 CFR 101.4', '21 CFR 101.105'],
    defaultFdaNotes: [
      'Full Nutrition Facts panel required per 21 CFR 101.9',
      'Complete ingredient list in descending order per 21 CFR 101.4',
      'Net weight in both metric and imperial per 21 CFR 101.105',
      'Allergen declaration per FALCPA Section 203',
    ],
    defaultFdaNotesVi: [
      'Yêu cầu bảng Nutrition Facts đầy đủ theo 21 CFR 101.9',
      'Danh sách thành phần đầy đủ theo thứ tự giảm dần theo 21 CFR 101.4',
      'Khối lượng tịnh cả metric và imperial theo 21 CFR 101.105',
      'Khai báo dị ứng theo FALCPA Section 203',
    ],
    domainOverrides: {
      supplement: {
        rules: { nutritionFactsFormat: 'standard' },
        fdaRegulations: ['21 CFR 101.36', 'DSHEA', '21 CFR 101.4'],
        fdaNotes: [
          'Supplement Facts panel required per 21 CFR 101.36',
          'DSHEA disclaimer required: "This statement has not been evaluated by the FDA..."',
          'Other Ingredients list required below Supplement Facts',
          'Allergen declaration per FALCPA if contains major allergens',
          'Structure/function claims must not imply disease treatment',
        ],
        fdaNotesVi: [
          'Yêu cầu bảng Supplement Facts theo 21 CFR 101.36',
          'Bắt buộc có disclaimer DSHEA: "Tuyên bố này chưa được FDA đánh giá..."',
          'Bắt buộc có danh sách Thành phần khác (Other Ingredients) bên dưới Supplement Facts',
          'Khai báo dị ứng theo FALCPA nếu chứa dị ứng chính',
          'Các tuyên bố cấu trúc/chức năng không được ngụ ý điều trị bệnh',
        ],
      },
      cosmetic: {
        rules: {
          nutritionFactsFormat: 'none',
          nutritionFactsRequired: false,
          allergenDeclarationRequired: false,
        },
        fdaRegulations: ['21 CFR 701.1', '21 CFR 701.3', '21 CFR 740', 'MoCRA 2022'],
        fdaNotes: [
          'Ingredient list using INCI names, descending order per 21 CFR 701.3',
          'NO Nutrition Facts panel - cosmetics use ingredient declaration only',
          'Warning statements required for specific categories (hair dye, aerosol, etc.)',
          'MoCRA 2022: Facility registration + product listing now required',
          'If SPF claim: product becomes OTC drug - Drug Facts panel required',
          'Net contents in weight, measure, or count per 21 CFR 701.13',
        ],
        fdaNotesVi: [
          'Danh sách thành phần dùng tên INCI, giảm dần theo 21 CFR 701.3',
          'KHÔNG có Nutrition Facts — mỹ phẩm chỉ dùng khai báo thành phần',
          'Cảnh báo bắt buộc cho các loại cụ thể (thuốc nhuộm tóc, bình xịt, v.v.)',
          'MoCRA 2022: Bắt buộc đăng ký cơ sở + liệt kê sản phẩm',
          'Nếu có tuyên bố SPF: sản phẩm trở thành thuốc OTC — cần Drug Facts',
          'Khối lượng tịnh theo trọng lượng, đo lường hoặc số lượng theo 21 CFR 701.13',
        ],
      },
      drug_otc: {
        rules: {
          nutritionFactsFormat: 'none',
          nutritionFactsRequired: false,
          allergenDeclarationRequired: false,
        },
        fdaRegulations: ['21 CFR 201.66', '21 CFR 201.10', '21 CFR 201.62'],
        fdaNotes: [
          'Drug Facts panel required per 21 CFR 201.66',
          'Must include: Active ingredients, Purpose, Uses, Warnings, Directions, Inactive ingredients',
          'Minimum 6pt font for Drug Facts panel',
          'Tamper-evident packaging required per 21 CFR 211.132',
        ],
        fdaNotesVi: [
          'Yêu cầu bảng Drug Facts theo 21 CFR 201.66',
          'Phải bao gồm: Hoạt chất, Mục đích, Công dụng, Cảnh báo, Hướng dẫn, Thành phần không hoạt tính',
          'Cỡ chữ tối thiểu 6pt cho Drug Facts',
          'Yêu cầu bao bì chống mở theo 21 CFR 211.132',
        ],
      },
    },
  },

  // ------- OUTER CARTON -------
  {
    id: 'outer_carton',
    name: 'Outer Carton / Shipping Box',
    nameVi: 'Thùng carton ngoài / Thùng vận chuyển',
    description: 'Outer shipping carton that contains inner retail packages. May use simplified labeling if inner packages are fully labeled.',
    descriptionVi: 'Thùng carton vận chuyển chứa các gói bán lẻ bên trong. Có thể dùng nhãn đơn giản hóa nếu bao bì bên trong đã có nhãn đầy đủ.',
    icon: 'Box',
    defaultRules: {
      minFontSize: 8,
      nutritionFactsFormat: 'standard',
      nutritionFactsRequired: false,
      fullIngredientListRequired: false,
      allergenDeclarationRequired: true,
      netWeightRequired: true,
      manufacturerInfoRequired: true,
      canReferenceInnerLabel: true,
      requiresTotalCount: true,
      requiresAggregateDV: false,
    },
    defaultFdaRegulations: ['21 CFR 101.100(d)', '21 CFR 101.2(c)', '21 CFR 101.105', '19 CFR §134.11', '19 CFR §134.22', '19 CFR §134.46'],
    defaultFdaNotes: [
      'May omit Nutrition Facts if inner packages are fully labeled (21 CFR 101.100(d))',
      'MUST still declare: Product name, Net quantity (total), Manufacturer info',
      'MUST include total count of inner units (e.g., "24 x 100g packets")',
      'Allergen declaration still required even on outer carton',
      'Can state "See individual package for Nutrition Facts and ingredients"',
      '19 CFR §134.22 (CBP): Outer carton is the first container CBP inspects — Country of Origin MUST be marked conspicuously on the outside',
      '19 CFR §134.46 (CBP): If any other geographic name appears (e.g., "Distributed by XYZ, Los Angeles, CA"), "Made in [Country]" MUST appear nearby in same font size',
    ],
    defaultFdaNotesVi: [
      'Có thể bỏ Nutrition Facts nếu bao bì bên trong đã có nhãn đầy đủ (21 CFR 101.100(d))',
      'VẪN PHẢI khai báo: Tên sản phẩm, Khối lượng tịnh (tổng), Thông tin nhà sản xuất',
      'PHẢI ghi tổng số gói bên trong (vd: "24 x 100g gói")',
      'Khai báo dị ứng vẫn bắt buộc trên thùng ngoài',
      'Có thể ghi "Xem bao bì đơn lẻ để biết Nutrition Facts và thành phần"',
      '19 CFR §134.22 (CBP): Thùng carton là container CBP kiểm tra đầu tiên — PHẢI ghi rõ nước xuất xứ ở bên ngoài, dễ thấy',
      '19 CFR §134.46 (CBP): Nếu thùng có ghi tên địa danh Mỹ (vd: "Distributed by XYZ, Los Angeles, CA"), PHẢI ghi "Made in [Nước]" ở gần đó với cỡ chữ tương đương',
    ],
    domainOverrides: {
      supplement: {
        rules: {
          nutritionFactsRequired: false,
          fullIngredientListRequired: false,
          allergenDeclarationRequired: true,
        },
        fdaRegulations: ['21 CFR 101.36', '21 CFR 101.100(d)'],
        fdaNotes: [
          'May omit Supplement Facts if inner bottles/packages are fully labeled',
          'MUST still have: Product name, quantity (e.g., "12 bottles"), manufacturer',
          'DSHEA disclaimer NOT required on outer carton if inner has it',
          'Lot number / batch traceability recommended on outer carton',
        ],
        fdaNotesVi: [
          'Có thể bỏ Supplement Facts nếu chai/gói bên trong đã có nhãn đầy đủ',
          'VẪN PHẢI có: Tên sản phẩm, Số lượng (vd: "12 chai"), nhà sản xuất',
          'Disclaimer DSHEA KHÔNG bắt buộc trên thùng ngoài nếu bên trong đã có',
          'Khuyến nghị ghi số lô / truy xuất trên thùng ngoài',
        ],
      },
      cosmetic: {
        rules: {
          nutritionFactsRequired: false,
          nutritionFactsFormat: 'none',
          fullIngredientListRequired: false,
          allergenDeclarationRequired: false,
        },
        fdaRegulations: ['21 CFR 701.12', 'MoCRA 2022', '19 CFR §134.11', '19 CFR §134.22', '19 CFR §134.46'],
        fdaNotes: [
          'Outer carton for cosmetics: MUST have product identity + net contents',
          'Full INCI ingredient list NOT required if inner package has it',
          'MoCRA 2022: Adverse event contact info still required',
          'Warning statements may be required depending on product type',
          '19 CFR §134.22 (CBP): Outer carton must bear Country of Origin — this is the first container CBP inspects at port of entry',
          '19 CFR §134.46 (CBP): If US distributor address appears, "Made in [Country]" must be adjacent with equal prominence',
        ],
        fdaNotesVi: [
          'Thùng ngoài mỹ phẩm: BẮT BUỘC có tên sản phẩm + khối lượng tịnh',
          'Danh sách INCI đầy đủ KHÔNG bắt buộc nếu bao bì bên trong đã có',
          'MoCRA 2022: Thông tin liên hệ sự cố bất lợi vẫn bắt buộc',
          'Cảnh báo có thể bắt buộc tùy theo loại sản phẩm',
          '19 CFR §134.22 (CBP): Thùng carton PHẢI ghi nước xuất xứ — đây là container CBP kiểm tra đầu tiên tại cảng',
          '19 CFR §134.46 (CBP): Nếu có địa chỉ nhà phân phối Mỹ, "Made in [Nước]" phải đặt kề bên với cỡ chữ tương đương',
        ],
        fdaNotesVi: [
          'Thùng ngoài mỹ phẩm: BẮT BUỘC có tên sản phẩm + khối lượng tịnh',
          'Danh sách INCI đầy đủ KHÔNG bắt buộc nếu bao bì bên trong đã có',
          'MoCRA 2022: Thông tin liên hệ sự cố bất lợi vẫn bắt buộc',
          'Cảnh báo có thể b���t buộc tùy theo loại sản phẩm',
          'Ghi nước xuất xứ theo quy định hải quan',
        ],
      },
    },
  },

  // ------- RETAIL BOX -------
  {
    id: 'retail_box',
    name: 'Inner Retail Box',
    nameVi: 'Hộp bán lẻ (Nhãn chính)',
    description: 'Primary retail package that consumers see on shelves. Full compliance required - this is the main label.',
    descriptionVi: 'Bao bì bán lẻ chính mà người tiêu dùng thấy trên kệ. Yêu cầu tuân thủ đầy đủ — đây là nhãn chính.',
    icon: 'Package',
    defaultRules: {
      minFontSize: 6,
      nutritionFactsFormat: 'standard',
      nutritionFactsRequired: true,
      fullIngredientListRequired: true,
      allergenDeclarationRequired: true,
      netWeightRequired: true,
      manufacturerInfoRequired: true,
      canReferenceInnerLabel: false,
      requiresTotalCount: false,
      requiresAggregateDV: false,
    },
    defaultFdaRegulations: ['21 CFR 101.1', '21 CFR 101.9', '21 CFR 101.4', '21 CFR 101.105', 'FALCPA Section 203'],
    defaultFdaNotes: [
      'This is the PRIMARY label - full compliance required',
      'Full Nutrition Facts panel required per 21 CFR 101.9',
      'Complete ingredient list per 21 CFR 101.4',
      'Bold allergen declaration per FALCPA Section 203',
      'Net weight in both metric and imperial per 21 CFR 101.105',
    ],
    defaultFdaNotesVi: [
      'Đây là NHÃN CHÍNH — cần tuân thủ đầy đủ',
      'Yêu cầu bảng Nutrition Facts đầy đủ theo 21 CFR 101.9',
      'Danh sách thành phần đầy đủ theo 21 CFR 101.4',
      'Khai báo dị ứng in đậm theo FALCPA Section 203',
      'Khối lượng tịnh cả metric và imperial theo 21 CFR 101.105',
    ],
    domainOverrides: {
      supplement: {
        rules: {},
        fdaRegulations: ['21 CFR 101.36', 'DSHEA', 'FALCPA'],
        fdaNotes: [
          'PRIMARY label - full Supplement Facts panel required (21 CFR 101.36)',
          'DSHEA disclaimer mandatory if structure/function claims are made',
          'Other Ingredients list below Supplement Facts',
          'Suggested Use / Directions for use required',
          'Lot number and expiration date recommended',
        ],
        fdaNotesVi: [
          'NHÃN CHÍNH — bảng Supplement Facts đầy đủ bắt buộc (21 CFR 101.36)',
          'Disclaimer DSHEA bắt buộc nếu có tuyên bố cấu trúc/chức năng',
          'Danh sách Thành phần khác (Other Ingredients) bên dưới Supplement Facts',
          'Hướng dẫn sử dụng / Liều lượng bắt buộc',
          'Khuyến nghị ghi số lô và hạn sử dụng',
        ],
      },
      cosmetic: {
        rules: {
          nutritionFactsRequired: false,
          nutritionFactsFormat: 'none',
          allergenDeclarationRequired: false,
        },
        fdaRegulations: ['21 CFR 701.1', '21 CFR 701.3', '21 CFR 701.13', '21 CFR 740', 'MoCRA 2022'],
        fdaNotes: [
          'PRIMARY label - full INCI ingredient list required (21 CFR 701.3)',
          'Product identity statement on PDP (principal display panel)',
          'Net contents on PDP per 21 CFR 701.13',
          'Warning statements per 21 CFR 740 if applicable (hair dye, aerosol, etc.)',
          'MoCRA 2022: Adverse event reporting contact info required',
          'If product claims SPF: automatically becomes OTC drug - Drug Facts required',
        ],
        fdaNotesVi: [
          'NHÃN CHÍNH — danh sách INCI đầy đủ bắt buộc (21 CFR 701.3)',
          'Tên sản phẩm trên mặt trước chính (PDP)',
          'Khối lượng tịnh trên PDP theo 21 CFR 701.13',
          'Cảnh báo theo 21 CFR 740 nếu áp dụng (thuốc nhuộm tóc, bình xịt, v.v.)',
          'MoCRA 2022: Thông tin liên hệ báo cáo sự cố bất lợi bắt buộc',
          'Nếu sản phẩm tuyên bố SPF: tự động trở thành thuốc OTC — cần Drug Facts',
        ],
      },
    },
  },

  // ------- INDIVIDUAL UNIT -------
  {
    id: 'individual_unit',
    name: 'Individual Unit / Sachet / Small Package',
    nameVi: 'Gói nhỏ / Gói lẻ / Bao bì nhỏ',
    description: 'Small individual package (< 12 sq in total surface area). May use simplified or linear format.',
    descriptionVi: 'Bao bì nhỏ đơn lẻ (< 12 sq in tổng diện tích bề mặt). Có thể dùng định dạng đơn giản hóa hoặc dạng dòng.',
    icon: 'Minimize',
    defaultRules: {
      minFontSize: 4.5,
      nutritionFactsFormat: 'linear',
      nutritionFactsRequired: true,
      fullIngredientListRequired: true,
      allergenDeclarationRequired: true,
      netWeightRequired: true,
      manufacturerInfoRequired: true,
      canReferenceInnerLabel: false,
      requiresTotalCount: false,
      requiresAggregateDV: false,
    },
    defaultFdaRegulations: ['21 CFR 101.9(j)(13)', '21 CFR 101.9(j)(17)', '21 CFR 101.105(f)'],
    defaultFdaNotes: [
      'Packages with < 12 sq in total surface area may use LINEAR format (21 CFR 101.9(j)(13))',
      'Packages with < 40 sq in PDP may use SIMPLIFIED format (omit zero-value nutrients)',
      'Font size minimum is 4.5pt for very small packages (< 12 sq in)',
      'Must still include all mandatory information but layout can be adjusted',
    ],
    defaultFdaNotesVi: [
      'Bao bì < 12 sq in có thể dùng Nutrition Facts DẠNG DÒNG (21 CFR 101.9(j)(13))',
      'Bao bì < 40 sq in PDP có thể dùng định dạng ĐƠN GIẢN HÓA (bỏ giá trị 0)',
      'Cỡ chữ tối thiểu 4.5pt cho bao bì rất nhỏ (< 12 sq in)',
      'Vẫn phải có đầy đủ thông tin bắt buộc nhưng có thể điều chỉnh bố cục',
    ],
    domainOverrides: {
      supplement: {
        rules: { minFontSize: 4.5 },
        fdaRegulations: ['21 CFR 101.36(i)(2)', '21 CFR 101.36(e)(8)'],
        fdaNotes: [
          'Small supplement package: Supplement Facts can use linear (horizontal) format',
          'Minimum font 4.5pt for total surface < 12 sq in per 21 CFR 101.36(i)(2)',
          'DSHEA disclaimer can use smaller font but must still be present',
          'May omit zero-value nutrients from Supplement Facts',
        ],
        fdaNotesVi: [
          'Gói nhỏ TPCN: Supplement Facts có thể dùng dạng dòng (ngang)',
          'Cỡ chữ tối thiểu 4.5pt cho diện tích < 12 sq in theo 21 CFR 101.36(i)(2)',
          'Disclaimer DSHEA có thể có chữ nhỏ hơn nhưng vẫn phải có',
          'Có thể bỏ các chất dinh dưỡng có giá trị 0 khỏi Supplement Facts',
        ],
      },
      cosmetic: {
        rules: {
          minFontSize: 4,
          nutritionFactsRequired: false,
          nutritionFactsFormat: 'none',
          allergenDeclarationRequired: false,
          fullIngredientListRequired: false,
          canReferenceInnerLabel: true,
        },
        fdaRegulations: ['21 CFR 701.3(a)', '21 CFR 701.12(e)'],
        fdaNotes: [
          'Small cosmetic package (< 12 sq in): ingredient list may be on outer packaging instead',
          'MUST still have: Product identity + net contents on the unit itself',
          'Warning statements still required if applicable (even on small packages)',
          'Can reference outer packaging: "See outer carton for ingredients"',
          'MoCRA: Adverse event contact still required somewhere accessible',
        ],
        fdaNotesVi: [
          'Bao bì mỹ phẩm nhỏ (< 12 sq in): danh sách thành phần có thể ở bao bì ngoài',
          'VẪN PHẢI CÓ: Tên sản phẩm + khối lượng tịnh trên bao bì đơn lẻ',
          'Cảnh báo vẫn bắt buộc nếu áp dụng (kể cả trên bao bì nhỏ)',
          'Có thể tham chiếu bao bì ngoài: "Xem thùng ngoài để biết thành phần"',
          'MoCRA: Thông tin liên hệ sự cố bất lợi vẫn phải có ở nơi truy cập được',
        ],
      },
    },
  },

  // ------- MULTI-PACK WRAPPER -------
  {
    id: 'multipack_wrapper',
    name: 'Multi-pack Wrapper',
    nameVi: 'Bao bì nhiều gói (Multi-pack)',
    description: 'Outer wrapper for multi-pack products (e.g., 6-pack, variety pack). Must declare total count.',
    descriptionVi: 'Bao ngoài cho sản phẩm nhiều gói (vd: lốc 6 gói, bộ sản phẩm). Phải khai báo tổng số lượng.',
    icon: 'Layers',
    defaultRules: {
      minFontSize: 6,
      nutritionFactsFormat: 'aggregate',
      nutritionFactsRequired: true,
      fullIngredientListRequired: true,
      allergenDeclarationRequired: true,
      netWeightRequired: true,
      manufacturerInfoRequired: true,
      canReferenceInnerLabel: true,
      requiresTotalCount: true,
      requiresAggregateDV: true,
    },
    defaultFdaRegulations: ['21 CFR 101.100(d)', '21 CFR 101.9(h)(1)', '21 CFR 101.105(g)'],
    defaultFdaNotes: [
      'MUST declare total count of individual units (e.g., "6 packets")',
      'Net weight must be total of all units (e.g., "Net Wt 600g (6 x 100g)")',
      'Nutrition Facts can show per individual unit AND/OR per total package',
      'If variety pack: each variety needs its own Nutrition Facts',
      'Allergen declaration must cover ALL products in the multi-pack',
    ],
    defaultFdaNotesVi: [
      'PHẢI khai báo tổng số gói đơn lẻ (vd: "6 gói")',
      'Khối lượng tịnh phải là tổng tất cả các gói (vd: "Net Wt 600g (6 x 100g)")',
      'Nutrition Facts có thể hiển thị theo từng gói VÀ/HOẶC theo tổng bao bì',
      'Nếu là bộ nhiều loại: mỗi loại phải có Nutrition Facts riêng',
      'Khai báo dị ứng phải bao gồm TẤT CẢ sản phẩm trong bộ',
    ],
    domainOverrides: {
      supplement: {
        rules: { requiresAggregateDV: false },
        fdaRegulations: ['21 CFR 101.36', 'DSHEA', '21 CFR 101.105(g)'],
        fdaNotes: [
          'Multi-pack supplement: total unit count required (e.g., "3 bottles x 60 capsules")',
          'Each inner bottle must have full Supplement Facts',
          'Outer wrapper can reference inner: "See individual bottle for Supplement Facts"',
          'Total net content of all units required on outer wrapper',
        ],
        fdaNotesVi: [
          'Bộ nhiều TPCN: tổng số đơn vị bắt buộc (vd: "3 chai x 60 viên")',
          'Mỗi chai bên trong phải có Supplement Facts đầy đủ',
          'Bao ngoài có thể tham chiếu: "Xem chai đơn lẻ để biết Supplement Facts"',
          'Tổng khối lượng/số lượng của tất cả đơn vị bắt buộc trên bao ngoài',
        ],
      },
      cosmetic: {
        rules: {
          nutritionFactsRequired: false,
          nutritionFactsFormat: 'none',
          allergenDeclarationRequired: false,
          requiresAggregateDV: false,
        },
        fdaRegulations: ['21 CFR 701.12', '21 CFR 701.13', 'MoCRA 2022'],
        fdaNotes: [
          'Multi-pack cosmetic: total count required (e.g., "Set of 3 lip colors")',
          'Net contents for each unit OR aggregate total required',
          'Ingredient list can reference inner packaging if each unit has it',
          'If variety set: all shade/variant names should be listed',
          'MoCRA: Adverse event contact required on accessible packaging',
        ],
        fdaNotesVi: [
          'Bộ nhiều mỹ phẩm: tổng số đơn vị bắt buộc (vd: "Bộ 3 màu son")',
          'Khối lượng tịnh từng đơn vị HOẶC tổng bắt buộc',
          'Danh sách thành phần có thể tham chiếu bao bì bên trong nếu mỗi đơn vị đã có',
          'Nếu là bộ nhiều màu: liệt kê tất cả tên màu/phiên bản',
          'MoCRA: Thông tin liên hệ sự cố bất lợi bắt buộc trên bao bì truy cập được',
        ],
      },
    },
  },
]

// ============================================
// HELPER: Map product_type to ProductDomain
// ============================================

export function mapProductTypeToDomain(productType?: string): ProductDomain {
  if (!productType) return 'food'
  
  const mapping: Record<string, ProductDomain> = {
    'food': 'food',
    'conventional-foods': 'food',
    'beverage': 'food',
    'infant_formula': 'food',
    'medical_food': 'food',
    'dietary_supplement': 'supplement',
    'dietary-supplements': 'supplement',
    'supplement': 'supplement',
    'cosmetic': 'cosmetic',
    'cosmetics': 'cosmetic',
    'skincare': 'cosmetic',
    'makeup': 'cosmetic',
    'drug_otc': 'drug_otc',
    'otc_drug': 'drug_otc',
    'device': 'device',
    'medical_device': 'device',
  }
  
  return mapping[productType] || 'food'
}

// ============================================
// CORE FUNCTIONS - DOMAIN-AWARE
// ============================================

/**
 * Get packaging format config by ID
 */
export function getPackagingFormat(formatId: PackagingFormatId): PackagingFormat | undefined {
  return PACKAGING_FORMATS.find(f => f.id === formatId)
}

/**
 * Get RESOLVED rules for a format + domain combination.
 * Domain overrides are merged on top of default rules.
 */
export function getResolvedRules(formatId: PackagingFormatId, domain: ProductDomain = 'food'): PackagingFormatRule {
  const format = getPackagingFormat(formatId)
  if (!format) {
    return PACKAGING_FORMATS[0].defaultRules // fallback to single_package
  }

  const override = format.domainOverrides[domain]
  if (!override) {
    return format.defaultRules
  }

  return { ...format.defaultRules, ...override.rules }
}

/**
 * Get FDA regulations for format + domain
 */
export function getResolvedRegulations(formatId: PackagingFormatId, domain: ProductDomain = 'food'): string[] {
  const format = getPackagingFormat(formatId)
  if (!format) return []

  const override = format.domainOverrides[domain]
  return override?.fdaRegulations ?? format.defaultFdaRegulations
}

/**
 * Get FDA notes (Vietnamese) for format + domain
 */
export function getResolvedFdaNotesVi(formatId: PackagingFormatId, domain: ProductDomain = 'food'): string[] {
  const format = getPackagingFormat(formatId)
  if (!format) return []

  const override = format.domainOverrides[domain]
  return override?.fdaNotesVi ?? format.defaultFdaNotesVi
}

/**
 * Get FDA notes (English) for format + domain
 */
export function getResolvedFdaNotes(formatId: PackagingFormatId, domain: ProductDomain = 'food'): string[] {
  const format = getPackagingFormat(formatId)
  if (!format) return []

  const override = format.domainOverrides[domain]
  return override?.fdaNotes ?? format.defaultFdaNotes
}

/**
 * Get format-specific FDA rules (backwards compatible)
 */
export function getFormatSpecificRules(formatId: PackagingFormatId): PackagingFormatRule | null {
  const format = getPackagingFormat(formatId)
  return format?.defaultRules || null
}

/**
 * Check if a packaging format allows simplified labeling
 */
export function canUseSimplifiedLabeling(formatId: PackagingFormatId, pdpAreaSqIn: number, domain: ProductDomain = 'food'): boolean {
  const rules = getResolvedRules(formatId, domain)
  
  if (formatId === 'outer_carton' && !rules.nutritionFactsRequired) {
    return true
  }

  if (formatId === 'individual_unit' && pdpAreaSqIn < 40) {
    return true
  }

  return false
}

/**
 * Get minimum font size for a packaging format
 */
export function getMinFontSize(formatId: PackagingFormatId, pdpAreaSqIn: number, domain: ProductDomain = 'food'): number {
  const rules = getResolvedRules(formatId, domain)

  if (formatId === 'individual_unit' && pdpAreaSqIn < 12) {
    return Math.min(rules.minFontSize, 4.5)
  }

  return rules.minFontSize
}

/**
 * Get fields that are NOT required for a given format + domain
 */
export function getExemptFields(formatId: PackagingFormatId, domain: ProductDomain = 'food'): string[] {
  const rules = getResolvedRules(formatId, domain)
  const exemptions: string[] = []

  if (!rules.nutritionFactsRequired) {
    exemptions.push('nutrition_facts')
  }
  if (!rules.fullIngredientListRequired) {
    exemptions.push('ingredient_list')
  }
  if (!rules.allergenDeclarationRequired) {
    exemptions.push('allergen_declaration')
  }
  if (rules.canReferenceInnerLabel) {
    exemptions.push('detailed_nutrition')
    exemptions.push('full_ingredients')
  }

  return exemptions
}

/**
 * Build AI prompt context for packaging format + domain
 */
export function buildPackagingFormatPrompt(formatId: PackagingFormatId, domain: ProductDomain = 'food'): string {
  const format = getPackagingFormat(formatId)
  if (!format) return ''

  const rules = getResolvedRules(formatId, domain)
  const domainMeta = PRODUCT_DOMAINS[domain]
  const regulations = getResolvedRegulations(formatId, domain)
  const notes = getResolvedFdaNotes(formatId, domain)

  let prompt = `\n\nPACKAGING FORMAT CONTEXT: ${format.name}`
  prompt += `\nPRODUCT DOMAIN: ${domainMeta.name} (${domainMeta.primaryRegulation})`
  prompt += `\nFacts Panel Type: ${domainMeta.factsPanel}`
  prompt += `\nDescription: ${format.description}`
  prompt += `\nRelevant Regulations: ${regulations.join(', ')}\n\n`

  prompt += 'FORMAT-SPECIFIC RULES:\n'
  prompt += `- Facts panel format: ${rules.nutritionFactsFormat}\n`
  prompt += `- ${domainMeta.factsPanel} required on this package: ${rules.nutritionFactsRequired ? 'YES' : 'NO (can reference inner package)'}\n`
  prompt += `- Full ingredient list required: ${rules.fullIngredientListRequired ? 'YES' : 'NO'}\n`
  prompt += `- Allergen declaration required: ${rules.allergenDeclarationRequired ? 'YES' : 'NO'}\n`
  prompt += `- Minimum font size: ${rules.minFontSize}pt\n`
  prompt += `- Can reference inner label: ${rules.canReferenceInnerLabel ? 'YES' : 'NO'}\n`
  prompt += `- Must declare total unit count: ${rules.requiresTotalCount ? 'YES' : 'NO'}\n\n`

  prompt += 'KEY NOTES:\n'
  notes.forEach(n => { prompt += `- ${n}\n` })

  // Domain-specific critical instructions
  if (domain === 'cosmetic') {
    prompt += '\nCRITICAL: This is a COSMETIC product. Do NOT look for or flag missing Nutrition Facts - cosmetics do not have Nutrition Facts panels. Focus on: INCI ingredient list, warning statements, net contents, product identity, and MoCRA requirements.\n'
  }

  if (domain === 'supplement') {
    prompt += '\nCRITICAL: This is a DIETARY SUPPLEMENT. Look for Supplement Facts (NOT Nutrition Facts). Check for DSHEA disclaimer, Other Ingredients, structure/function claims.\n'
  }

  if (formatId === 'outer_carton') {
    prompt += `\nIMPORTANT: This is an OUTER CARTON for ${domainMeta.name}. Do NOT flag missing ${domainMeta.factsPanel} if inner packages have it. Focus on: product name, net quantity (total), manufacturer info, total unit count.\n`
  }

  if (formatId === 'individual_unit') {
    prompt += `\nIMPORTANT: This is a SMALL INDIVIDUAL PACKAGE. Simplified/linear format is acceptable. Font sizes as small as ${rules.minFontSize}pt are acceptable.\n`
  }

  if (formatId === 'multipack_wrapper') {
    prompt += '\nIMPORTANT: This is a MULTI-PACK WRAPPER. Verify: (1) Total unit count declared, (2) Aggregate net weight, (3) All varieties covered.\n'
  }

  return prompt
}
