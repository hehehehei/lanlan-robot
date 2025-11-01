import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './i18n';
import './styles/theme.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
