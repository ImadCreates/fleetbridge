import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { FleetProvider } from './state/FleetContext'
import { Layout } from './components/Layout'
import { FleetOverview } from './pages/FleetOverview'
import { VehicleDetail } from './pages/VehicleDetail'
import { Normalization } from './pages/Normalization'
import { AddProvider } from './pages/AddProvider'
import { NotFound } from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <FleetProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<FleetOverview />} />
            <Route path="/vehicle/:id" element={<VehicleDetail />} />
            <Route path="/normalization" element={<Normalization />} />
            <Route path="/add-provider" element={<AddProvider />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </FleetProvider>
    </BrowserRouter>
  )
}
