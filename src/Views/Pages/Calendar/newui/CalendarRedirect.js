import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import routes from "../../routes/routesConfig";

/* The package routes the Calendar at /calendar only; bookmarks and delivered links on the old address land on it. */
const CalendarRedirect = () => {
    const { search } = useLocation();
    return <Navigate to={ { pathname: routes.calendar, search } } replace />;
};

export default CalendarRedirect;
