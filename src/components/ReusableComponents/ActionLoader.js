import React from "react";
import { Spinner, Button } from "react-bootstrap";
import PropTypes from 'prop-types';

const ActionLoader = ({ paddingClass = 'primary', loaderText = 'Loading...' }) => {
    return (
        <Button variant={paddingClass} disabled>
            <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
            />
            <span className="visually-hidden">{loaderText}</span>
        </Button>
    );
};

ActionLoader.propTypes = {
    paddingClass: PropTypes.string,
    loaderText: PropTypes.string,
};
export default ActionLoader;