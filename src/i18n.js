import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { store } from './redux/store';

let lastLang = localStorage.getItem('i18nextLng') || 'en';

i18n
    .use(HttpBackend) // Load translations using HTTP
    .use(LanguageDetector) // Detect user language
    .use(initReactI18next) // Pass i18n instance to react-i18next
    .init({
        fallbackLng: 'en', // Default language
        debug: false, // Enable debug mode in development
        lng: localStorage.getItem('i18nextLng') || 'en', // Set initial language
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        backend: {
            loadPath: '/locales/{{lng}}/translation.json', // Path to translation files
            crossDomain: true,
            requestOptions: {
                cache: 'default'
            }
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            lookupLocalStorage: 'i18nextLng',
            caches: ['localStorage']
        },
        react: {
            useSuspense: false,
            bindI18n: 'languageChanged loaded',
            bindI18nStore: 'added removed',
            transEmptyNodeValue: '',
            transSupportBasicHtmlNodes: true,
            transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'span']
        },
        preload: ['en', 'zh_HK', 'in', 'zh_CN'],
        initImmediate: false
    });

i18n.on('initialized', () => {
    console.log('i18n initialized');
});

i18n.on('languageChanged', (lng) => {
    if (lng !== lastLang) {
        localStorage.setItem('i18nextLng', lng);
        store.dispatch({ type: "RESET_REDUX_AFTER_LANGUAGE_CHANGE" });
        lastLang = lng;
    }
});

export default i18n;