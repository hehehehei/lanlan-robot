import { useTranslation } from 'react-i18next';
import './Sidebar.css';

export const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">{t('sidebar.title')}</h2>
      <div className="sidebar-content">
        <p className="sidebar-placeholder">{t('sidebar.placeholder')}</p>
      </div>
    </aside>
  );
};
