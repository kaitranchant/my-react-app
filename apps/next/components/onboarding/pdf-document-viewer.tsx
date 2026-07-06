'use client'

import * as React from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

type PdfDocumentViewerProps = {
  fileUrl: string
}

export function PdfDocumentViewer({ fileUrl }: PdfDocumentViewerProps) {
  const [numPages, setNumPages] = React.useState(0)

  return (
    <div className="grid gap-4">
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
        loading={<p className="text-muted-foreground text-sm">Loading document…</p>}
        error={<p className="text-destructive text-sm">Could not load document.</p>}
      >
        {Array.from({ length: numPages }, (_, index) => (
          <Page
            key={`page-${index + 1}`}
            pageNumber={index + 1}
            width={640}
            className="mb-4 overflow-hidden rounded-md border bg-white"
          />
        ))}
      </Document>
    </div>
  )
}
