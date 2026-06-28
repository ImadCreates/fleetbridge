import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { FleetProvider } from './state/FleetContext'
import { Layout } from './components/Layout'
import { FleetOverview } from './pages/FleetOverview'
import { VehicleDetail } from './pages/VehicleDetail'
import { Placeholder } from './pages/Placeholder'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <FleetProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<FleetOverview />} />
            <Route path="/vehicle/:id" element={<VehicleDetail />} />
            <Route
              path="/normalization"
              element={<Placeholder title="Normalization" />}
            />
            <Route
              path="/add-provider"
              element={<Placeholder title="Add provider" />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FleetProvider>
    </BrowserRouter>
  )
}
