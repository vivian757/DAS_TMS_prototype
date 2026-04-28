import { Routes, Route, Navigate } from 'react-router-dom';
import { Agentation } from 'agentation';
import AppShell from './layouts/AppShell';
import Landing from './pages/Landing';
import PrototypeA from './pages/PrototypeA';
import PrototypeB from './pages/PrototypeB';
import BatchImportPage from './pages/BatchImportPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/a" element={<PrototypeA />} />
          <Route path="/a/batch-import" element={<BatchImportPage />} />
          <Route path="/a-plus" element={<Navigate to="/a" replace />} />
          <Route path="/aa" element={<Navigate to="/a" replace />} />
          <Route path="/b" element={<PrototypeB />} />
          <Route path="/b-1" element={<Navigate to="/b" replace />} />
          <Route path="/b-2" element={<Navigate to="/b" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Agentation />
    </>
  );
}
