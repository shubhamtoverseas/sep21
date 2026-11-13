import React from "react";
import intelligentMatching from "../../../assets/img/home/intelligent-matching.svg";
import guidedProcess from "../../../assets/img/home/guided-process.svg";
import trustedNetwork from "../../../assets/img/home/trusted-network.svg";
import fastProcessing from "../../../assets/img/home/fast-processing.svg";
import FeatureItem from "../feature-item/FeatureItem";

const FeaturesSection = () => {
  return (
    <section className="features-section bg-white ptb-100">
      <div className="container">
        <div className="row">
          <FeatureItem icon={intelligentMatching} title='Intelligent Matching'
          itemColor='blue'
          marginBorromClass="mb-4"
           description='Our platform&apos;s smart filters and rich profiles help you surface tailored profiles based on your requirements.' />

           <FeatureItem icon={guidedProcess} title='A Guided, Simple Process'
           itemColor='orange'
            marginBorromClass="mb-4"
           description='A dedicated agent guides you every step of the way, ensuring a seamless experience.' />

            <FeatureItem icon={trustedNetwork} title='Trusted Partner Network'
           itemColor='purple'
           description='We partner with top-rated agencies for end-to-end support so you can hire with total confidence.' />

            <FeatureItem icon={fastProcessing} title='Fast Processing'
           itemColor='pink'
           description='Streamlined processing and quick approvals so new hires can start work sooner.' />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;