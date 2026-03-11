import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from './components/ui/toaster';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import ContractsPage from './pages/Contracts';
import CreateContractPage from './pages/CreateContract';
import ContractDetailPage from './pages/ContractDetail';
import LoginPage from './pages/Login';
import NotFoundPage from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import CreateEscrowDeal from './pages/CreateEscrowDeal';
import EscrowDealDetail from './pages/EscrowDealDetail';
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<HomePage />} />
              <Route
                path="/contracts"
                element={
                  <ProtectedRoute>
                    <ContractsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/new"
                element={
                  <ProtectedRoute>
                    <CreateContractPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <ProtectedRoute>
                    <ContractDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/escrow/new" element={<CreateEscrowDeal />} />
              <Route path="/escrow/:id" element={<EscrowDealDetail />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster />
          </Layout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
export default App;