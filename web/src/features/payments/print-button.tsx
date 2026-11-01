'use client'

/** Browser print dialog; "Save as PDF" in the dialog produces the invoice PDF. */
export function PrintInvoiceButton() {
  return (
    <button className="primary rental-print-button" type="button" onClick={() => window.print()}>
      In / Lưu PDF
    </button>
  )
}
