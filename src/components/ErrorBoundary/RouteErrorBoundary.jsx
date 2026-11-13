import React from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

const RouteErrorBoundary = ({ children }) => {
    const location = useLocation();
    return (
        <ErrorBoundary compact resetKeys={[location.pathname]}>
            {children}
        </ErrorBoundary>
    );
};

RouteErrorBoundary.propTypes = {
    children: PropTypes.node,
};

export default RouteErrorBoundary;
