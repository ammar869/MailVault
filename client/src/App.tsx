function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">MailVault</h1>
            <nav className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">MVP - Phase 0</span>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">MailVault</h2>
          <p className="text-gray-600 mb-8">AI-powered Email Privacy, Identity, and Automation SaaS</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Phase 0: Scaffolding</h3>
              <p className="text-gray-600 text-sm">Monorepo, Docker, TypeScript, ESLint, Prettier</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Client: React + Vite + Tailwind</h3>
              <p className="text-gray-600 text-sm">TanStack Query, Socket.IO client, Zod validation</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Ready for Phase 1</h3>
              <p className="text-gray-600 text-sm">Auth, Inboxes, Email Parsing, Worker</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App