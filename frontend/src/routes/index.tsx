import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProjectViewer } from '../pages/ProjectViewer';
import { FileViewer } from '../pages/FileViewer';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/project" replace />,
      },
      {
        path: 'project',
        element: <ProjectViewer />,
      },
      {
        path: 'file/:fileId',
        element: <FileViewer />,
      },
    ],
  },
]);
