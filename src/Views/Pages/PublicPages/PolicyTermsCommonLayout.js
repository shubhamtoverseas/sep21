import React from "react";
import PropTypes from "prop-types";

import PolicyTermsHeader from "./PolicyTermsHeader";
import Footer from "../../../components/Layout/Footer/Footer";
import './terms-and-privacy.css';

const PolicyTermsCommonLayout = ({ heading = '', title = '', children }) => {
    return <div className="policies-and-terms">
        <PolicyTermsHeader heading={heading} title={title} />
        <div className="container py-sm-5 py-4">
            {children}
        </div>
        <Footer footerBgClass="bg-f5" />
    </div>
};
PolicyTermsCommonLayout.propTypes = {
    heading: PropTypes.string,
    title: PropTypes.string,
    children: PropTypes.node.isRequired,
}

export default PolicyTermsCommonLayout;