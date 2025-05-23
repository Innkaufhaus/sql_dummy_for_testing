"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

interface QueryResult {
  success: boolean
  data?: any[]
  error?: string
  message?: string
}

interface AdminSettings {
  database: {
    host: string
    port: string
    user: string
    password: string
  }
  executable: {
    path: string
    defaultParams: string
  }
}

export default function SQLPanel() {
  const [credentials, setCredentials] = useState({
    host: '',
    port: '',
    user: '',
    password: '',
    database: ''
  })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [databases, setDatabases] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [csvFilename, setCsvFilename] = useState('')
  const [executablePath, setExecutablePath] = useState('')
  const [executableParams, setExecutableParams] = useState('')
  const [savedCsvPath, setSavedCsvPath] = useState('')
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    database: { host: '', port: '', user: '', password: '' },
    executable: { path: '', defaultParams: '' }
  })

  // Load saved settings on mount
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const response = await fetch('/api/admin-settings')
        const data = await response.json()
        if (data.success) {
          setAdminSettings(data.settings)
          // Pre-fill credentials if not already set
          if (!credentials.host && !credentials.port && !credentials.user && !credentials.password) {
            setCredentials({
              ...credentials,
              ...data.settings.database
            })
          }
        }
      } catch (error) {
        console.error('Failed to load saved settings:', error)
      }
    }
    loadSavedSettings()
  }, [])

  const fetchDatabases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/list-databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      const data = await response.json()
      if (data.success) {
        setDatabases(data.databases)
        if (result?.error?.includes('Failed to fetch databases')) {
          setResult(null)
        }
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to fetch databases. Please check your connection and try again.'
        })
        setIsConnected(false)
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to fetch databases. Please check your connection and try again.'
      })
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/execute-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, query }),
        signal: controller.signal
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setResult({
          success: false,
          error: 'Query cancelled by user.',
        })
      } else {
        setResult({
          success: false,
          error: 'Failed to execute query. Please try again.',
        })
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  const handleCancelQuery = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">SQL Query Explorer</h1>
          <p className="text-muted-foreground">
            Enter your database credentials and SQL query to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Database Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    placeholder="Enter host (e.g., localhost)"
                    value={credentials.host}
                    onChange={(e) =>
                      setCredentials({ ...credentials, host: e.target.value })
                    }
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    placeholder="Enter port (default: 3306)"
                    value={credentials.port}
                    onChange={(e) =>
                      setCredentials({ ...credentials, port: e.target.value })
                    }
                    type="number"
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user">Username</Label>
                  <Input
                    id="user"
                    placeholder="Enter database username"
                    value={credentials.user}
                    onChange={(e) =>
                      setCredentials({ ...credentials, user: e.target.value })
                    }
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter database password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isConnected && databases.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Select Database</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="database">Database</Label>
                  <select
                    id="database"
                    className="w-full p-2 border rounded-md bg-background"
                    value={credentials.database}
                    onChange={(e) =>
                      setCredentials({ ...credentials, database: e.target.value })
                    }
                    required
                  >
                    <option value="">Select a database</option>
                    {databases.map((db) => (
                      <option key={db} value={db}>
                        {db}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>SQL Query</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter your SQL query here (e.g., SELECT * FROM users)"
                  className="min-h-[150px] font-mono"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
                <div className="flex space-x-4">
                  {loading ? (
                    <>
                      <Button type="submit" className="flex-1" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executing Query...
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive"
                        className="flex-1"
                        onClick={handleCancelQuery}
                      >
                        Cancel Query
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" className="flex-1">
                      Execute Query
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      setLoading(true)
                      setResult(null)
                      setIsConnected(false)
                      try {
                        const response = await fetch('/api/test-connection', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(credentials),
                        })
                        const data = await response.json()
                        setResult(data)
                        if (data.success) {
                          setIsConnected(true)
                          await fetchDatabases()
                        } else {
                          setIsConnected(false)
                        }
                      } catch (error) {
                        setResult({
                          success: false,
                          error: 'Failed to test connection. Please try again.',
                        })
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="fixed bottom-4 right-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/admin'}
            className="bg-white hover:bg-gray-100"
          >
            Admin Settings
          </Button>
        </div>

        {savedCsvPath && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Execute File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="executablePath">Executable Path</Label>
                  <Input
                    id="executablePath"
                    placeholder="Enter path to executable (e.g., C:\ameise.exe)"
                    value={executablePath || adminSettings.executable.path}
                    onChange={(e) => setExecutablePath(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="executableParams">Parameters</Label>
                  <Input
                    id="executableParams"
                    placeholder="Enter parameters (use {csv} to reference the saved CSV file)"
                    value={executableParams || adminSettings.executable.defaultParams}
                    onChange={(e) => setExecutableParams(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!executablePath) return
                    try {
                      const params = executableParams
                        .split(' ')
                        .map(param => param.replace('{csv}', savedCsvPath))
                      
                      const response = await fetch('/api/execute-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          filePath: executablePath,
                          parameters: params
                        }),
                      })
                      const data = await response.json()
                      setResult({
                        success: data.success,
                        data: data.success ? data.output : null,
                        error: data.error
                      })
                    } catch (error) {
                      setResult({
                        success: false,
                        error: error instanceof Error ? error.message : 'Failed to execute file'
                      })
                    }
                  }}
                  disabled={!executablePath}
                >
                  Execute
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result?.success && Array.isArray(result.data) && result.data.length > 0 && (
                <div className="mb-4">
                  <div className="flex space-x-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="csvFilename">Save as CSV</Label>
                      <Input
                        id="csvFilename"
                        placeholder="Enter filename (e.g., results.csv)"
                        value={csvFilename}
                        onChange={(e) => setCsvFilename(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={async () => {
                        if (!csvFilename) return
                        try {
                          const response = await fetch('/api/save-csv', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              data: result.data,
                              filename: csvFilename
                            }),
                          })
                          const data = await response.json()
                          if (data.success) {
                            setSavedCsvPath(data.filePath)
                            setResult({
                              success: true,
                              data: result.data,
                              message: 'CSV file saved successfully'
                            })
                          } else {
                            throw new Error(data.error)
                          }
                        } catch (error) {
                          setResult({
                            success: false,
                            error: error instanceof Error ? error.message : 'Failed to save CSV'
                          })
                        }
                      }}
                      disabled={!csvFilename}
                    >
                      Save CSV
                    </Button>
                  </div>
                </div>
              )}
              {result.success ? (
                <div className="overflow-x-auto">
                  {Array.isArray(result.data) && result.data.length > 0 ? (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(result.data[0]).map((key) => (
                            <th
                              key={key}
                              className="border px-4 py-2 bg-muted text-left"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((value: any, j) => (
                              <td key={j} className="border px-4 py-2">
                                {JSON.stringify(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>Query executed successfully.</p>
                      {result.data === null ? (
                        <p className="mt-1">No results to display.</p>
                      ) : (
                        <p className="mt-1">Affected rows: {JSON.stringify(result.data)}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
