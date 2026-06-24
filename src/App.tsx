import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Users from '@/pages/Users'
import Hscodes from '@/pages/Hscodes'
import HscodeReview from '@/pages/HscodeReview'
import Audit from '@/pages/Audit'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { useAuthStore } from '@/stores/authStore'

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="hscodes" element={<Hscodes />} />
          <Route path="hscodes/pending" element={<HscodeReview />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<Audit />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
