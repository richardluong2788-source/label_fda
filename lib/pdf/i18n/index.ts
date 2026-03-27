import type { SupportedLang, PDFLabels } from '../types'
import { pdfLabelsVi } from './vi'
import { pdfLabelsEn } from './en'

export const PDF_LABELS: Record<SupportedLang, PDFLabels> = {
  vi: pdfLabelsVi,
  en: pdfLabelsEn,
}

export function getPDFLabels(lang: SupportedLang): PDFLabels {
  return PDF_LABELS[lang] || PDF_LABELS.vi
}
