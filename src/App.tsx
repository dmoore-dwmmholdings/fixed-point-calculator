import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Calculator from './pages/Calculator'
import Advisor from './pages/Advisor'
import Analyzer from './pages/Analyzer'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/advisor" element={<Advisor />} />
        <Route path="/analyzer" element={<Analyzer />} />
      </Routes>
    </Layout>
  )
}

export default App
