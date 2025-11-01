import { useTranslation } from 'react-i18next';
import { CanvasContainer } from '../components/CanvasContainer';
import './ProjectViewer.css';

export const ProjectViewer = () => {
  const { t } = useTranslation();

  return (
    <div className="project-viewer">
      <header className="project-header">
        <h1>{t('pages.project')}</h1>
      </header>
      <CanvasContainer />
    </div>
  );
};
