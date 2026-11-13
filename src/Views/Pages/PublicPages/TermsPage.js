import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";

import PolicyTermsCommonLayout from "./PolicyTermsCommonLayout";
import translation from "../../../utils/translation";
import './terms-and-privacy.css';
import i18n from "../../../i18n.js";
import constData from "../../../components/ReusableComponents/constants";

const TermsPage = () => {
  const [searchParams] = useSearchParams();
    const [langReady, setLangReady] = useState(false);
  
    useEffect(() => {
      const langParam = searchParams.get("language");
      if (langParam) {
        const mappedLang = constData.LANGUAGE_MAP[langParam] || "en";
  
        // Temporarily change language WITHOUT persisting to localStorage
        const previousLang = localStorage.getItem('i18nextLng'); // save web lang
        console.log(previousLang, 'previousLang')
  
  
        i18n.changeLanguage(mappedLang).then(() => {
          // Immediately restore localStorage to the real web language
          // so admin panel / web flow is never affected
          localStorage.setItem('i18nextLng', previousLang);
          setLangReady(true);
        });
  
        return () => {
          // Restore i18n instance language on unmount too
          i18n.changeLanguage(previousLang);
        };
  
      } else {
        setLangReady(true);
      }
    }, [searchParams]);
  
    if (!langReady) return null;
  
  return (<>
    <Helmet>
      <title>{translation('key_terms_page_title')}</title>
      <meta name="description" content={translation('key_terms_page_meta_description')} />
    </Helmet>
    <PolicyTermsCommonLayout heading={translation('key_terms_and_conditions')} title={translation('key_privacy_terms_effective_date')}>
      <p className="mb28 main-desc">
        {translation('key_terms_policy_intro_part1')} <strong>{translation('key_terms_policy_intro_we_our_us')}</strong>.
        {translation('key_terms_policy_intro_part2')} <strong>{translation('key_terms_policy_intro_app')}</strong> {translation('key_terms_policy_intro_part3')}
        <strong>{translation('key_terms_policy_intro_platform')}</strong>,
        {translation('key_terms_policy_intro_part4')} <strong>{translation('key_terms_policy_intro_terms')}</strong>.
        {translation('key_terms_policy_intro_part5')} <strong>{translation('key_terms_policy_intro_terms')}</strong>, {translation('key_terms_policy_intro_part6')}
      </p>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_1_title')}</h2>
        <p className="mb12">{translation('key_terms_section_1_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_1_item1')}</li>
          <li>{translation('key_terms_section_1_item2')}</li>
          <li>{translation('key_terms_section_1_item3')}</li>
        </ul>
        <p className="mb12">{translation('key_terms_section_1_conclusion')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_2_title')}</h2>
        <p className="mb12">{translation('key_terms_section_2_intro_agree')}</p>
        <ul>
          <li>{translation('key_terms_section_2_agree_item1')}</li>
          <li>{translation('key_terms_section_2_agree_item2')}</li>
          <li>{translation('key_terms_section_2_agree_item3')}</li>
        </ul>
        <p className="mb12">{translation('key_terms_section_2_intro_may_not')}</p>
        <ul>
          <li>{translation('key_terms_section_2_may_not_item1')}</li>
          <li>{translation('key_terms_section_2_may_not_item2')}</li>
          <li>{translation('key_terms_section_2_may_not_item3')}</li>
        </ul>
        <p className="mb12">{translation('key_terms_section_2_conclusion')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_3_title')}</h2>
        <p className="mb12">{translation('key_terms_section_3_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_3_item1')}</li>
          <li>{translation('key_terms_section_3_item2')}</li>
          <li>{translation('key_terms_section_3_item3')}</li>
          <li><strong>{translation('key_terms_section_3_transparency_label')}:</strong> {translation('key_terms_section_3_transparency_text')}</li>
          <li><strong>{translation('key_terms_section_3_independent_label')}:</strong> {translation('key_terms_section_3_independent_text')}</li>
          <li><strong>{translation('key_terms_section_3_disputes_label')}:</strong> {translation('key_terms_section_3_disputes_text')}</li>
        </ul>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_4_title')}</h2>
        <p className="mb12">{translation('key_terms_section_4_intro')}</p>
        
        <h4 className="sub-heading mb12">{translation('key_terms_section_4_1_title')}</h4>
        <ul>
          <li>{translation('key_terms_section_4_1_item1')}</li>
          <li>{translation('key_terms_section_4_1_item2')}</li>
        </ul>
        
        <h4 className="sub-heading mb12">{translation('key_terms_section_4_2_title')}</h4>
        <ul>
          <li>{translation('key_terms_section_4_2_item1')}</li>
          <li>{translation('key_terms_section_4_2_item2')}</li>
          <li>{translation('key_terms_section_4_2_item3')}</li>
        </ul>
        
        <h4 className="sub-heading mb12">{translation('key_terms_section_4_3_title')}</h4>
        <ul>
          <li>
            {translation('key_terms_section_4_3_item1_intro')}
            <ul>
              <li>{translation('key_terms_section_4_3_item1_sub1')}</li>
              <li>{translation('key_terms_section_4_3_item1_sub2')}</li>
              <li>{translation('key_terms_section_4_3_item1_sub3')}</li>
            </ul>
          </li>
          <li>{translation('key_terms_section_4_3_item2')}</li>
        </ul>
        
        <h4 className="sub-heading mb12">{translation('key_terms_section_4_4_title')}</h4>
        <ul>
          <li>{translation('key_terms_section_4_4_item1_intro')}
            <ul>
              <li>{translation('key_terms_section_4_4_item1_sub1')}</li>
              <li>{translation('key_terms_section_4_4_item1_sub2')}</li>
            </ul>
          </li>
          <li>{translation('key_terms_section_4_4_item2')}</li>
        </ul>

        <h4 className="sub-heading mb12">{translation('key_terms_section_4_5_title')}</h4>
        <ul>
          <li>{translation('key_terms_section_4_5_item1')}</li>
        </ul>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_5_title')}</h2>
        <p className="mb12">{translation('key_terms_section_5_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_5_item1')}</li>
          <li>{translation('key_terms_section_5_item2')}</li>
          <li>{translation('key_terms_section_5_item3')}</li>
        </ul>
        <p className="mb12">{translation('key_terms_section_5_conclusion')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_6_title')}</h2>
        <p className="mb12">{translation('key_terms_section_6_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_6_item1')}</li>
          <li>{translation('key_terms_section_6_item2')}</li>
          <li>{translation('key_terms_section_6_item3')}</li>
        </ul>
        <p className="mb12">{translation('key_terms_section_6_conclusion')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_7_title')}</h2>
        <p className="mb12">{translation('key_terms_section_7_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_7_item1')}</li>
          <li>{translation('key_terms_section_7_item2')}</li>
        </ul>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_8_title')}</h2>
        <p className="mb12">{translation('key_terms_section_8_intro')}</p>
        <ul>
          <li>{translation('key_terms_section_8_item1')}</li>
          <li>{translation('key_terms_section_8_item2')}</li>
        </ul>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_9_title')}</h2>
        <p className="mb12">{translation('key_terms_section_9_text')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_10_title')}</h2>
        <p className="mb12">{translation('key_terms_section_10_text')}</p>
      </div>

      <div className="mb28">
        <h2 className="heading mb12">{translation('key_terms_section_11_title')}</h2>
        <p className="mb12">{translation('key_terms_section_11_text')}</p>
      </div>

      <div className="">
        <h2 className="heading mb12">{translation('key_terms_section_12_title')}</h2>
        <p className="mb12">{translation('key_terms_section_12_intro')}</p>
        <ul>
          <li>
            <strong>{translation('key_email')}:</strong> <a href="mailto:info@maidmatch.ai">{translation('key_privacy_contact_email')}</a>
          </li>
          <li>
            <strong>{translation('key_address')}:</strong> {translation('key_terms_contact_address')}
          </li>
        </ul>
      </div>
    </PolicyTermsCommonLayout>
  </>
  );
};

export default TermsPage;