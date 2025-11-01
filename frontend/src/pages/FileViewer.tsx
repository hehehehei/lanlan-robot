import { useTranslation } from 'react-i18next';
import { CanvasContainer } from '../components/CanvasContainer';
import './FileViewer.css';

export const FileViewer = () => {
  const { t } = useTranslation();

  return (
    <div className="file-viewer">
      <header className="file-header">
        <h1>{t('pages.fileViewer')}</h1>
      </header>
      <CanvasContainer />
    </div>
  );
};
