import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ModelViewer from './pages/ModelViewer';
import CameraCapture from './pages/CameraCapture';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModelViewer />} />
        <Route path="/capture" element={<CameraCapture />} />
      </Routes>
    </Router>
  );
}

export default App;
