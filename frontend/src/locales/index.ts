import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './zh-CN/common.json';

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': {
      translation: common
    }
  },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
