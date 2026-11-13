import React from "react";
import simplerFasterSection1 from "../../../assets/img/home/simpler-faster-process-1.svg";
import simplerFasterSection2 from "../../../assets/img/home/simpler-faster-process-2.svg";
import simplerFasterSection3 from "../../../assets/img/home/simpler-faster-process-3.jpg";
import './simpler-faster-section.css'; 
const SimplerFasterSection = () => {
  return (
    <section className="simpler-faster-section bg-white ptb-100">
      <div className="custom-container">
        <div className="row">
          <div className="col-md-7 d-flex align-items-center">
            <img src={simplerFasterSection1} width="130" alt="Icon" className="mr56" />
            <img src={simplerFasterSection2} width="130" alt="Icon" className="mr56" />
            <img src={simplerFasterSection3} width="130" alt="Icon" />
          </div>
          <div className="col-md-5">
            <h1 className="section-title mb28">A Simpler, Faster Process</h1>
            <p className="section-description mb28">
              Our free matching platform gives you instant access to thousands of qualified candidates.
              A dedicated agent will be on hand to assist you every step of the way.
            </p>
            <p className="section-description mb-0">
              You only pay when you&apos;re ready to hire—no subscription fees, no hidden costs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimplerFasterSection;