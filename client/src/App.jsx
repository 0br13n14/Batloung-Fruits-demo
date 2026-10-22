import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROLES } from './constants'
import { AuthProvider } from './context/AuthProvider'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[ROLES.ADMINISTRATOR, ROLES.SALES]}
          />
        }
      >
        <Route element={<AppLayout />} path="/">
          <Route index element={<HomePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ApplicationRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
