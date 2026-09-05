import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '../core/auth/AuthProvider'
import { LoginPage } from '../core/auth/LoginPage'
import { AppShell } from '../core/navigation/AppShell'
import { ProtectedRoute } from '../core/auth/ProtectedRoute'
import { DashboardPage } from '../core/dashboard/DashboardPage'
import { WorkspaceProvider } from '../core/workspaces/WorkspaceProvider'
import { ModuleGuard } from '../core/modules/ModuleGuard'

const ExampleModulePage = lazy(() => import('../modules/example/ExampleModulePage'))

function ModuleFallback() {
  return <div className="page-loading">Loading module…</div>
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <WorkspaceProvider>
                <AppShell />
              </WorkspaceProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/modules/example"
            element={
              <ModuleGuard moduleId="example">
                <Suspense fallback={<ModuleFallback />}>
                  <ExampleModulePage />
                </Suspense>
              </ModuleGuard>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
