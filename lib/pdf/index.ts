// Re-export all PDF-related modules
export * from './types'
export * from './utils'
export { pdfStyles } from './styles'
export { PDF_LABELS, getPDFLabels } from './i18n'

// Re-export the main generator from the refactored location
// The main generatePDFReportHTML is kept in pdf-report-generator.ts 
// but now uses these extracted modules
