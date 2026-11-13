import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CustomSpinner from '../ReusableComponents/CustomSpinner';
import PropTypes from 'prop-types';

const TranslationProvider = ({ children }) => {
  const { i18n, ready } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkTranslations = async () => {
      try {
        if (ready) {
          const currentLanguage = i18n.language;
          const translations = i18n.getResourceBundle(currentLanguage, 'translation');
          
          if (!translations || Object.keys(translations).length === 0) {
            await i18n.reloadResources([currentLanguage]);
          }
          
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading translations:', error);
        setIsLoading(false); 
      }
    };

    checkTranslations();

    const handleLanguageChanged = () => {
      setIsLoading(false);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n, ready]);

  if (isLoading) {
    return <CustomSpinner />;
  }

  return children;
};

TranslationProvider.propTypes = {
    children: PropTypes.node.isRequired,
}

export default TranslationProvider;