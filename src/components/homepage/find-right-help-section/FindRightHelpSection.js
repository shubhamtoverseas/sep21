import React from "react";
import findRightHelpStep1 from "../../../assets/img/home/find-right-help-step1.svg";
import findRightHelpStep2 from "../../../assets/img/home/find-right-help-step2.svg";
import findRightHelpStep3 from "../../../assets/img/home/find-right-help-step3.jpg";
import HelpingStep from "../helping-step/HelpingStep";
import './find-right-help-section.css';

const FindRightHelpSection = () => {
  return (
    <section className="find-right-help-section bg-white ptb-80">
      <div className="custom-container text-center">
        <div className="row d-flex justify-content-center">
          <div className="col-lg-6  col-12 mb70">
            <div className="section-title mb28">
              Find the Right Help—Fast.
            </div>
            <p className="section-desctiption mb-0">
              Our smart matching platform connects you with thousands of verified candidates. Get started in minutes with expert guidance.
            </p>
          </div>
        </div>
        <div className="row">
            <HelpingStep image={findRightHelpStep1} stepNumber={'1'} title='Tell Us What You Need'
            description='Tell us your requirements. Our team will then help you create and refine the perfect job offer to attract the right candidates.' />
          
           <HelpingStep image={findRightHelpStep2} stepNumber={'2'} title='Receive Curated Candidates'
            description='Using our smart matching platform, a dedicated agent will deliver to you a shortlist of tailored candidate recommendations based on your requirements.' />

             <HelpingStep image={findRightHelpStep3} stepNumber={'3'} title='Interview & Hire Seamlessly'
            description='Our team will handle everything—from arranging interviews to handling visa paperwork—ensuring a smooth hiring process from start to finish.' />
        </div>
      </div>
    </section>
  );
};

export default FindRightHelpSection;