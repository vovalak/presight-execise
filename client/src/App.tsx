import { Navigate, Route, Routes } from 'react-router';
import { DirectoryPage } from './pages/DirectoryPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DirectoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
