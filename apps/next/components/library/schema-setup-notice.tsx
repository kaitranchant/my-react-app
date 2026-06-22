import { FileCode2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SchemaSetupNoticeProps = {
  tables: string[]
  sqlFile: string
}

export function SchemaSetupNotice({ tables, sqlFile }: SchemaSetupNoticeProps) {
  const tableList = tables.join(', ')

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle>Database setup required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed">
        <p className="text-muted-foreground">
          The <span className="text-foreground font-medium">{tableList}</span>{' '}
          table{tables.length === 1 ? ' is' : 's are'} not in your Supabase
          database yet. Run the SQL migration once to enable this tab.
        </p>
        <ol className="text-muted-foreground list-decimal space-y-2 pl-5">
          <li>
            Open your{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium underline underline-offset-2"
            >
              Supabase Dashboard
            </a>{' '}
            → <span className="text-foreground">SQL</span> →{' '}
            <span className="text-foreground">New query</span>
          </li>
          <li>
            Copy the full contents of{' '}
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-xs">
              supabase/{sqlFile}
            </code>{' '}
            from this project
          </li>
          <li>Paste into the editor and click Run</li>
          <li>Refresh this page</li>
        </ol>
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <FileCode2 className="mt-0.5 size-4 shrink-0" />
          Or via CLI:{' '}
          <code className="bg-muted text-foreground rounded px-1.5 py-0.5">
            npx supabase login && yarn db:link && yarn db:push
          </code>
        </p>
      </CardContent>
    </Card>
  )
}

function isMissingTableError(message: string) {
  return message.includes('Could not find the table')
}

export function LibraryLoadError({
  resource,
  error,
  sqlFile = 'apply-library.sql',
}: {
  resource: string
  error: { message: string }
  sqlFile?: string
}) {
  if (isMissingTableError(error.message)) {
    return (
      <div className="p-6">
        <SchemaSetupNotice tables={[resource]} sqlFile={sqlFile} />
      </div>
    )
  }

  return (
    <p className="text-destructive p-6 text-sm">
      Could not load {resource}: {error.message}
    </p>
  )
}
