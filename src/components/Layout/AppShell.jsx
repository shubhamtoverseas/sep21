import React, { useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { logout } from "../../redux/Slices/Auth";
import { persistor } from "../../redux/store";
import authHeader from "../../services/authHeader";
import { getCurrentUser } from "../../services/commonService";
import { SELECT_SCOPE_ATTR, selectScopeFor } from "../../utils/selectScope";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import styles from "./AppShell.module.css";

const AppShell = ({ children }) => {
  const dispatch = useDispatch();

  const currentUser = getCurrentUser()?.data;
  const { pathname } = useLocation();

  /* the kit select skin follows the route (Invoice / Insurance / Chat keep the browser's own picker); on <body> so portals are covered */
  useEffect(() => {
    document.body.dataset[SELECT_SCOPE_ATTR] = selectScopeFor(pathname);
    return () => { delete document.body.dataset[SELECT_SCOPE_ATTR]; };
  }, [pathname]);

  useEffect(() => {
    if (!currentUser) {
      dispatch(logout());
    }
  }, [currentUser, dispatch]);

  // Verify token on interaction
  const handleContentClick = useCallback(() => {
    const token = authHeader();
    if (token === "") {
      dispatch(logout());
    }
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    await persistor.purge();
    await persistor.flush();
    dispatch(logout());
  }, [dispatch]);

  return (
    <div className={styles.shell} onClick={handleContentClick}>
      <Sidebar onLogout={handleLogout} />
      <div className={styles.main}>
        <Topbar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

AppShell.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppShell;
