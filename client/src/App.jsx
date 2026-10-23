import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ROLES } from './constants'
import { AuthProvider } from './context/AuthProvider'
import { FruitsPage } from './pages/FruitsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProductsPage } from './pages/ProductsPage'
import { StockPage } from './pages/StockPage'
import { SuppliersPage } from './pages/SuppliersPage'

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
          <Route path="fruits" element={<FruitsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route
            element={<ProtectedRoute allowedRoles={[ROLES.ADMINISTRATOR]} />}
          >
            <Route path="stock" element={<StockPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
          </Route>
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
