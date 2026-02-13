import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import EvidenceChain from './pages/EvidenceChain';
import StateMachine from './pages/StateMachine';
import OverrideGovernance from './pages/OverrideGovernance';
import AuditReports from './pages/AuditReports';
import Replay from './pages/Replay';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/evidence" element={<EvidenceChain />} />
        <Route path="/state" element={<StateMachine />} />
        <Route path="/overrides" element={<OverrideGovernance />} />
        <Route path="/audit" element={<AuditReports />} />
        <Route path="/replay" element={<Replay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
