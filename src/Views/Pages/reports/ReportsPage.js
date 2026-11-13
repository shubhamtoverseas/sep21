import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import Icon from "../../../components/Icon/Icon";
import configData from "../../../components/ReusableComponents/app-configs";
import { ShowToast } from "../../../components/show-toast/ShowToast";
import { getPermissionValue, isAdminUser } from "../../../services/commonService";
import translation from "../../../utils/translation";
import { ReportPage } from "./ReportShell";

const ReportCards = ({ reports }) => (
  <div className="rpt-home-grid">
    {reports.map((report, index) => (
      <Link key={index} className="rpt-home-card" to={report.link ? `../${report.link}` : '#'}>
        <div>
          <div className="rpt-home-card-title">{translation(report.title) + ' ' + translation('key_report')}</div>
          <div className="rpt-home-card-text">{translation(report.description)}</div>
        </div>
        <Icon name="chev_right" size={14} className="rpt-home-card-chevron" />
      </Link>
    ))}
  </div>
);

ReportCards.propTypes = {
  reports: PropTypes.array.isRequired,
};

function ReportsPage() {
  const { permissionList } = useSelector((state) => state.users);
  const isAdmin = isAdminUser();
  const reportAccessPermission = getPermissionValue(permissionList?.data, 'reports', 'report_access');
  const hrmsReportsAccessPermission = getPermissionValue(permissionList?.data, 'hrms_report', 'hrms_reports_access');
  const hasPermission = (key, permissionsModule) => {
    if (isAdmin) return true;
    const val = getPermissionValue(permissionList?.data, permissionsModule, key);
    return String(val || '').toLowerCase() === 'y';
  };

  const visibleReports = configData.reportsConfig.filter(
    (report) => report.permissionKey && hasPermission(report.permissionKey, 'reports')
  );

  const visibleHRMSReports = configData.hrmsReportsConfig.filter(
    (report) => report.permissionKey && hasPermission(report.permissionKey, 'hrms_report')
  );

  if (reportAccessPermission !== 'y') {
    ShowToast('error', translation('key_you_are_not_authorized_to_access_this_page'));
    return false;
  }

  return (
    <ReportPage title={translation('key_reports')} home>
      <section className="rpt-home-section">
        <h2 className="rpt-home-title">{translation('key_reports')}</h2>
        <ReportCards reports={visibleReports} />
      </section>

      {hrmsReportsAccessPermission === 'y' && (
        <section className="rpt-home-section">
          <h2 className="rpt-home-title">{translation('key_hrms_reports')}</h2>
          <ReportCards reports={visibleHRMSReports} />
        </section>
      )}
    </ReportPage>
  );
}

export default React.memo(ReportsPage);
