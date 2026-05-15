import { Route, Routes } from 'react-router-dom'
import Landing from './ui/Landing'
import Room from './ui/Room'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  )
}
