export const resolveWorkerListVariant = ({ staffType, type, activeDashboard, localTypeId, overseasTypeId, hasPhilippinesNationality }) => {
  if (staffType === 'partner') {
    if (activeDashboard === 'dashboard_2') return 'partner_dashboard_2';
    if (activeDashboard === 'dashboard_1') return 'partner_dashboard_1';
    if (activeDashboard === 'dashboard_3') return 'partner_dashboard_3';
    if (activeDashboard === 'dashboard_4') return 'partner_dashboard_4';
    if (activeDashboard === 'dashboard_5') return 'partner_dashboard_5';
    if (type === overseasTypeId && activeDashboard === 'dashboard_8') return 'partner_holiday_mode_reset';
    return 'partner_default';
  }
  if (type === localTypeId && activeDashboard === 'dashboard_2') return 'local_dashboard_2';
  if (type === overseasTypeId && activeDashboard === 'dashboard_2') return 'overseas_dashboard_2';
  if (type === localTypeId && activeDashboard === 'dashboard_1') return 'local_dashboard_1';
  if (type === overseasTypeId && activeDashboard === 'dashboard_1') return 'overseas_dashboard_1';
  if (type === localTypeId && activeDashboard === 'dashboard_3') return 'local_dashboard_3';
  if (type === overseasTypeId && activeDashboard === 'dashboard_3') return 'overseas_dashboard_3';
  if (type === localTypeId && activeDashboard === 'dashboard_4') return 'local_dashboard_4';
  if (type === overseasTypeId && activeDashboard === 'dashboard_4') return 'overseas_dashboard_4';
  if (type === localTypeId && activeDashboard === 'dashboard_5') return 'local_dashboard_5';
  if (type === overseasTypeId && activeDashboard === 'dashboard_5') return 'overseas_dashboard_5';
  if (type === overseasTypeId && hasPhilippinesNationality) return 'overseas_philippines_default';
  if (activeDashboard === 'dashboard_1') return 'dashboard_1_default';
  return 'default';
};
