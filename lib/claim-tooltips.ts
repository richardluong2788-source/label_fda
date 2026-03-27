// ────────────────────────────────────────────────────────────
// Claim Tooltips - i18n support for FDA regulation references
// ────────────────────────────────────────────────────────────

export type ClaimTooltipInfo = { regulation: string; note: string; needsLabTest?: boolean }

export function getClaimTooltips(locale: string, productCategory?: string): Record<string, ClaimTooltipInfo> {
  const isVi = locale === 'vi'
  const isCosmetic = productCategory === 'cosmetic'
  
  return {
    // Gluten Free - 21 CFR 101.91
    'gf': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    'gluten free': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    'gluten-free': {
      regulation: '21 CFR §101.91',
      note: isVi ? '< 20ppm gluten để được gọi là "Gluten-Free"' : '< 20ppm gluten required to label as "Gluten-Free"',
      needsLabTest: true
    },
    // Keto - Unregulated
    'keto': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức. Thường hiểu là low-carb, high-fat.' : 'Not officially regulated by FDA. Generally understood as low-carb, high-fat.',
    },
    'keto friendly': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức. Thường hiểu là low-carb, high-fat.' : 'Not officially regulated by FDA. Generally understood as low-carb, high-fat.',
    },
    // Paleo - Unregulated
    'paleo': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định chính thức.' : 'Not officially regulated by FDA.',
    },
    // Non-GMO
    'non-gmo': {
      regulation: 'USDA Bioengineered (BE) Disclosure',
      note: isVi ? 'Phải tuân thủ National Bioengineered Food Disclosure Standard.' : 'Must comply with National Bioengineered Food Disclosure Standard.',
    },
    'gmo free': {
      regulation: 'USDA Bioengineered (BE) Disclosure',
      note: isVi ? 'Phải tuân thủ National Bioengineered Food Disclosure Standard.' : 'Must comply with National Bioengineered Food Disclosure Standard.',
    },
    // Superfood - Marketing claim
    'superfood': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim marketing không được FDA định nghĩa. Có thể bị coi là misleading nếu không có evidence.' : 'Marketing claim not defined by FDA. May be considered misleading without evidence.',
    },
    // Vegan/Vegetarian
    'vegan': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Khuyến nghị có chứng nhận từ bên thứ ba.' : 'Voluntary claim. Third-party certification recommended.',
    },
    'vegetarian': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Khuyến nghị có chứng nhận từ bên thứ ba.' : 'Voluntary claim. Third-party certification recommended.',
    },
    'plant-based': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa chính thức.' : 'Not officially defined by FDA.',
    },
    // Natural
    'all natural': {
      regulation: 'FDA Policy (no CFR)',
      note: isVi ? 'FDA chưa có định nghĩa chính thức. Nên tránh sử dụng hoặc cần evidence.' : 'FDA has no formal definition. Avoid using or provide evidence.',
    },
    'natural': {
      regulation: 'FDA Policy (no CFR)',
      note: isVi ? 'FDA chưa có định nghĩa chính thức. Nên tránh sử dụng hoặc cần evidence.' : 'FDA has no formal definition. Avoid using or provide evidence.',
    },
    // Organic
    'usda organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isVi ? 'Phải có chứng nhận USDA Organic từ certifying agent.' : 'Must have USDA Organic certification from accredited certifying agent.',
    },
    'organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isVi ? 'Phải có chứng nhận từ USDA-accredited certifying agent.' : 'Must have certification from USDA-accredited certifying agent.',
    },
    // No Artificial claims
    'no artificial flavors': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có artificial flavors theo định nghĩa FDA.' : 'Must ensure no artificial flavors per FDA definition.',
    },
    'no artificial sweeteners': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có artificial sweeteners.' : 'Must ensure no artificial sweeteners.',
    },
    'no preservatives': {
      regulation: '21 CFR §101.22',
      note: isVi ? 'Phải đảm bảo không có preservatives theo định nghĩa FDA.' : 'Must ensure no preservatives per FDA definition.',
    },
    // Sugar claims
    'no added sugar': {
      regulation: '21 CFR §101.60(c)',
      note: isVi ? 'Không được thêm đường trong quá trình sản xuất.' : 'No sugar added during processing.',
    },
    'sugar free': {
      regulation: '21 CFR §101.60(c)',
      note: isVi ? '< 0.5g đường mỗi khẩu phần.' : '< 0.5g sugar per serving.',
    },
    // Fat claims
    'fat free': {
      regulation: '21 CFR §101.62(b)',
      note: isVi ? '< 0.5g chất béo mỗi khẩu phần.' : '< 0.5g fat per serving.',
    },
    'low fat': {
      regulation: '21 CFR §101.62(b)',
      note: isVi ? '≤ 3g chất béo mỗi khẩu phần.' : '≤ 3g fat per serving.',
    },
    // Sodium claims
    'low sodium': {
      regulation: '21 CFR §101.61',
      note: isVi ? '≤ 140mg sodium mỗi khẩu phần.' : '≤ 140mg sodium per serving.',
    },
    'sodium free': {
      regulation: '21 CFR §101.61',
      note: isVi ? '< 5mg sodium mỗi khẩu phần.' : '< 5mg sodium per serving.',
    },
    // Religious certifications
    'kosher': {
      regulation: isVi ? 'Chứng nhận Kosher' : 'Kosher Certification',
      note: isVi ? 'Phải có chứng nhận từ tổ chức Kosher được công nhận.' : 'Must have certification from recognized Kosher organization.',
    },
    'halal': {
      regulation: isVi ? 'Chứng nhận Halal' : 'Halal Certification',
      note: isVi ? 'Phải có chứng nhận từ tổ chức Halal được công nhận.' : 'Must have certification from recognized Halal organization.',
    },
    
    // ═══════════════════════════════════════════════════════════
    // COSMETIC CLAIMS (21 CFR 701)
    // ═══════════════════════════════════════════════════════════
    
    // Hypoallergenic - No FDA definition
    'hypoallergenic': {
      regulation: isVi ? 'Không có quy định FDA (21 CFR 701)' : 'No FDA regulation (21 CFR 701)',
      note: isVi ? 'FDA không có định nghĩa hoặc tiêu chuẩn cho "hypoallergenic". Nhà sản xuất tự chịu trách nhiệm.' : 'FDA has no definition or standard for "hypoallergenic". Manufacturer bears responsibility.',
    },
    // Dermatologist tested
    'dermatologist tested': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim cần có bằng chứng về clinical testing. Không có tiêu chuẩn cụ thể.' : 'Claim requires evidence of clinical testing. No specific standard exists.',
    },
    'dermatologically tested': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim cần có bằng chứng về clinical testing. Không có tiêu chuẩn cụ thể.' : 'Claim requires evidence of clinical testing. No specific standard exists.',
    },
    // Non-comedogenic
    'non-comedogenic': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định. Cần clinical evidence để support.' : 'Not regulated by FDA. Requires clinical evidence to support.',
    },
    'noncomedogenic': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA quy định. Cần clinical evidence để support.' : 'Not regulated by FDA. Requires clinical evidence to support.',
    },
    // Fragrance-free
    'fragrance free': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Sản phẩm không được chứa fragrance ingredients. Masking agents có thể được phép.' : 'Product must not contain fragrance ingredients. Masking agents may be permitted.',
    },
    'fragrance-free': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Sản phẩm không được chứa fragrance ingredients. Masking agents có thể được phép.' : 'Product must not contain fragrance ingredients. Masking agents may be permitted.',
    },
    'unscented': {
      regulation: '21 CFR §701.3',
      note: isVi ? 'Có thể chứa masking fragrance để neutralize odor. Khác với "fragrance-free".' : 'May contain masking fragrance to neutralize odor. Different from "fragrance-free".',
    },
    // Paraben-free
    'paraben free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa parabens. Claim tự nguyện, cần verify ingredient list.' : 'Product contains no parabens. Voluntary claim, verify ingredient list.',
    },
    'paraben-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa parabens. Claim tự nguyện, cần verify ingredient list.' : 'Product contains no parabens. Voluntary claim, verify ingredient list.',
    },
    // Sulfate-free
    'sulfate free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa sulfates (SLS, SLES). Claim tự nguyện.' : 'Product contains no sulfates (SLS, SLES). Voluntary claim.',
    },
    'sulfate-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Sản phẩm không chứa sulfates (SLS, SLES). Claim tự nguyện.' : 'Product contains no sulfates (SLS, SLES). Voluntary claim.',
    },
    // Cruelty-free
    'cruelty free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    'cruelty-free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    'not tested on animals': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'FDA không quy định animal testing. Nên có chứng nhận từ Leaping Bunny hoặc PETA.' : 'FDA does not regulate animal testing. Certification from Leaping Bunny or PETA recommended.',
    },
    // Organic cosmetics / food
    'certified organic': {
      regulation: 'USDA NOP (7 CFR Part 205)',
      note: isCosmetic
        ? (isVi ? 'Cosmetics có thể dùng USDA Organic seal nếu đáp ứng tiêu chuẩn food organic.' : 'Cosmetics may use USDA Organic seal if meeting food organic standards.')
        : (isVi ? 'Phải có chứng nhận USDA Organic từ USDA-accredited certifying agent.' : 'Must have USDA Organic certification from accredited certifying agent.'),
    },
    // SPF claims
    'spf': {
      regulation: '21 CFR §201.327 (OTC Drug)',
      note: isVi ? 'Sản phẩm có SPF được quy định như OTC drug. Cần tuân thủ FDA sunscreen monograph.' : 'Products with SPF are regulated as OTC drugs. Must comply with FDA sunscreen monograph.',
      needsLabTest: true
    },
    'broad spectrum': {
      regulation: '21 CFR §201.327',
      note: isVi ? 'Phải pass FDA broad spectrum test. Chỉ SPF 15+ mới được claim "reduce skin cancer risk".' : 'Must pass FDA broad spectrum test. Only SPF 15+ can claim "reduce skin cancer risk".',
      needsLabTest: true
    },
    // Anti-aging claims
    'anti-aging': {
      regulation: isVi ? 'FD&C Act - Drug vs Cosmetic' : 'FD&C Act - Drug vs Cosmetic',
      note: isVi ? 'Claim cần thận trọng. Nếu claim thay đổi cấu trúc da, sản phẩm có thể bị classify là drug.' : 'Use caution. If claiming to alter skin structure, product may be classified as drug.',
    },
    'anti-wrinkle': {
      regulation: isVi ? 'FD&C Act - Drug vs Cosmetic' : 'FD&C Act - Drug vs Cosmetic',
      note: isVi ? 'Claim cần thận trọng. Nếu claim thay đổi cấu trúc da, sản phẩm có thể bị classify là drug.' : 'Use caution. If claiming to alter skin structure, product may be classified as drug.',
    },
    // Sensitive skin
    'for sensitive skin': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa. Nên có clinical testing để support.' : 'Not defined by FDA. Should have clinical testing to support.',
    },
    'sensitive skin': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim không được FDA định nghĩa. Nên có clinical testing để support.' : 'Not defined by FDA. Should have clinical testing to support.',
    },
    // Alcohol-free
    'alcohol free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Thường nghĩa là không có ethyl alcohol. Fatty alcohols (cetyl, cetearyl) có thể được phép.' : 'Usually means no ethyl alcohol. Fatty alcohols (cetyl, cetearyl) may be permitted.',
    },
    'alcohol-free': {
      regulation: isVi ? 'Không có quy định FDA cụ thể' : 'No specific FDA regulation',
      note: isVi ? 'Thường nghĩa là không có ethyl alcohol. Fatty alcohols (cetyl, cetearyl) có thể được phép.' : 'Usually means no ethyl alcohol. Fatty alcohols (cetyl, cetearyl) may be permitted.',
    },
    // Oil-free
    'oil free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Verify ingredient list không có oil-based ingredients.' : 'Voluntary claim. Verify ingredient list contains no oil-based ingredients.',
    },
    'oil-free': {
      regulation: isVi ? 'Không có quy định FDA' : 'No FDA regulation',
      note: isVi ? 'Claim tự nguyện. Verify ingredient list không có oil-based ingredients.' : 'Voluntary claim. Verify ingredient list contains no oil-based ingredients.',
    },
    // Clinically proven
    'clinically proven': {
      regulation: isVi ? 'FTC Act (Substantiation)' : 'FTC Act (Substantiation)',
      note: isVi ? 'Phải có clinical study evidence. FTC có thể yêu cầu substantiation nếu bị challenge.' : 'Must have clinical study evidence. FTC may request substantiation if challenged.',
    },
    'clinically tested': {
      regulation: isVi ? 'FTC Act (Substantiation)' : 'FTC Act (Substantiation)',
      note: isVi ? 'Phải có clinical study evidence. FTC có thể yêu cầu substantiation nếu bị challenge.' : 'Must have clinical study evidence. FTC may request substantiation if challenged.',
    },
  }
}

export function getLabTestLabel(locale: string): string {
  return locale === 'vi' ? 'Cần lab test để xác nhận tuân thủ' : 'Lab test required to confirm compliance'
}
