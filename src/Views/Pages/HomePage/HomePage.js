import React from "react";

import SimplerFasterSection from "../../../components/homepage/simpler-faster-section/SimplerFasterSection";
import HomePageHeader from "../../../components/homepage/homepage-header/HomePageHeader";
import ManageSearchSection from "../../../components/homepage/manage-search-section/ManageSearchSection";
import FindRightHelpSection from "../../../components/homepage/find-right-help-section/FindRightHelpSection";
import BetterHiringExperienceSection from "../../../components/homepage/better-hiring-experience-section/BetterHiringExperienceSection";
import FeaturesSection from "../../../components/homepage/feature-section/FeaturesSection";
import HomePageFooter from "../../../components/homepage/home-page-footer/HomePageFooter";
import HomePageBanner from "../../../components/homepage/home-page-banner/HomePageBanner";
import './home-page.css';

const HomePage = () => {
  return (
    <section className="home-page wrap-div">
      <HomePageHeader />
      <HomePageBanner />
      <SimplerFasterSection />
      <ManageSearchSection />
      <FindRightHelpSection />
      <BetterHiringExperienceSection />
      <FeaturesSection />
      <HomePageFooter />
    </section>
  );
};

export default HomePage;