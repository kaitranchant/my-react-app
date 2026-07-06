import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function mergeSignatureIntoPdf({
  templatePdfBytes,
  signaturePngBytes,
  signerName,
  signedAtLabel,
}: {
  templatePdfBytes: Uint8Array
  signaturePngBytes: Uint8Array
  signerName: string
  signedAtLabel: string
}) {
  const pdfDoc = await PDFDocument.load(templatePdfBytes)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1] ?? pdfDoc.addPage()
  const signatureImage = await pdfDoc.embedPng(signaturePngBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const signatureWidth = 180
  const signatureHeight = 60
  const margin = 48

  lastPage.drawImage(signatureImage, {
    x: margin,
    y: margin + 28,
    width: signatureWidth,
    height: signatureHeight,
  })
  lastPage.drawText(`Signed by: ${signerName}`, {
    x: margin,
    y: margin + 16,
    size: 10,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })
  lastPage.drawText(`Date: ${signedAtLabel}`, {
    x: margin,
    y: margin + 4,
    size: 10,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  return Buffer.from(await pdfDoc.save())
}

export function dataUrlToPngBytes(dataUrl: string) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  return Buffer.from(base64, 'base64')
}
