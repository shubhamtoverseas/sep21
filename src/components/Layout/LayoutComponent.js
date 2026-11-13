import React from "react";
import PropTypes from "prop-types";
import AppShell from "./AppShell";

export const LayoutComponent = (props) => {
  return (
    <AppShell>
      {props.children}
    </AppShell>
  );
};
LayoutComponent.propTypes = {
  children: PropTypes.node.isRequired,
};
export default LayoutComponent;
