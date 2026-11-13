import React from "react";
import { Navigate } from "react-router-dom";
import PropTypes from 'prop-types';
import { useSelector } from "react-redux";
import { hasPermission, isAdminUser } from "../../services/commonService";

const ProtectedRoute = ({ children, permissionKey, moduleKey }) => {
    // const location = useLocation();
    const { permissionList } = useSelector((state) => state.users);
    const isAdmin = isAdminUser();
    if (isAdmin || !permissionKey) {
        return children;
    }
    const isPermitted = hasPermission(permissionList?.data, moduleKey, permissionKey);
    return isPermitted ? children : <Navigate to={ "/dashboard" } />;
};
ProtectedRoute.propTypes = {
    children: PropTypes.node,
    permissionKey: PropTypes.string,
    moduleKey: PropTypes.string,

};
export default ProtectedRoute;
