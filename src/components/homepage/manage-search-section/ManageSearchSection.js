import React from "react";
import iphone14Pro from "../../../assets/img/home/iPhone-14-pro.svg";
import appStore from "../../../assets/img/app-store.svg";
import playStore from "../../../assets/img/play-store.svg";
import qrCode from "../../../assets/img/qr-code.svg";
import FeatureBox from "../feature-box/FeatureBox";

import babyCareFeatureIcon from "../../../assets/img/home/baby-care-feature.svg";
import toddlerCareIcon from "../../../assets/img/home/toddler-care.svg";
import childCareIcon from "../../../assets/img/home/child-care.svg";
import specialNeedsChildIcon from "../../../assets/img/home/special-needs-child.svg";
import adultsCareIcon from "../../../assets/img/home/adults-care.svg";
import elderlyCareIcon from "../../../assets/img/home/elderly-care.svg";
import petCareIcon from "../../../assets/img/home/pet-care.svg";
import cookingIcon from "../../../assets/img/home/cooking.svg";
import drivingIcon from "../../../assets/img/home/driving.svg";
import tutoringIcon from "../../../assets/img/home/tutoring.svg";
import householdChoresIcon from "../../../assets/img/home/household-chores.svg";
import groceryShoppingIcon from "../../../assets/img/home/grocery-shopping.svg";
import carWashingIcon from "../../../assets/img/home/car-washing.svg";
import gardeningIcon from "../../../assets/img/home/gardening.svg";
import './manage-search-section.css';

const ManageSearchSection = () => {
    return (
        <section className="manage-search-section ptb-80 light-bg-section">
            <div className="custom-container">
                <div className="row align-items-center">
                    <div className="col-md-12 col-xl-7 mb-xl-0 mb-4">
                        <div className="row">
                            {/* Left Feature Icons */}
                            <div className="col-sm-4 mb-4 mb-md-0 py-3">
                                <div className="d-sm-flex flex-column align-items-end justify-content-between h-100">
                                    <FeatureBox icon={babyCareFeatureIcon} title="Baby Care" />
                                    <FeatureBox icon={toddlerCareIcon} title="Toddler Care" />
                                    <FeatureBox icon={childCareIcon} title="Child Care" />
                                    <FeatureBox icon={specialNeedsChildIcon} title="Special Needs Child" />
                                    <FeatureBox icon={adultsCareIcon} title="Special Needs Adult" />
                                    <FeatureBox icon={elderlyCareIcon} title="Elderly Care" />
                                    <FeatureBox icon={petCareIcon} title="Pet Care" />
                                </div>
                            </div>

                            {/* Phone Preview */}
                            <div className="col-sm-4 mb-4 mb-md-0 text-center">
                                <img src={iphone14Pro} alt="App Preview" className="img-fluid iphone14pro" />
                            </div>

                            {/* Right Feature Icons */}
                            <div className="col-sm-4 mb-4 mb-md-0 py-3">
                                <div className="d-sm-flex flex-column align-items-start justify-content-between h-100">
                                    <FeatureBox icon={cookingIcon} title="Cooking" />
                                    <FeatureBox icon={drivingIcon} title="Driving" />
                                    <FeatureBox icon={tutoringIcon} title="Tutoring" />
                                    <FeatureBox icon={householdChoresIcon} title="Household Chores" />
                                    <FeatureBox icon={groceryShoppingIcon} title="Grocery Shopping" />
                                    <FeatureBox icon={carWashingIcon} title="Car Washing" />
                                    <FeatureBox icon={gardeningIcon} title="Gardening" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text + App Download Section */}
                    <div className="col-xl-5 col-md-12 text-center text-xl-left">
                        <h1 className="section-title mb28">Manage Your Search, <br /> Effortlessly</h1>
                        <p className="section-description mb28">
                            Take full control of your hiring experience with our mobile app.
                            It&apos;s the most convenient way to receive curated candidate recommendations,
                            schedule interviews, and access other advanced features. Download the free app for
                            the best experience.
                        </p>
                        <div className="app-download-buttons d-flex">
                            <div className="d-flex flex-column justify-content-between mr15">
                                <img src={appStore} alt="Download on App Store" className="mt-2" />
                                <img src={playStore} alt="Get it on Google Play" className="mb-2" />
                            </div>
                            <img src={qrCode} alt="QR Code" width='120' />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ManageSearchSection;
