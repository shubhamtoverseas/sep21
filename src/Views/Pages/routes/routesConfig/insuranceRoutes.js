  const insuranceRoutes = {
    insurance: "/insurance",
    insuranceNew: "/insurance/new",
    insuranceRecord: "/insurance/:ref",
    // OP-N2 (kept in I-5): Insurance notification links carry the numeric record id.
    insuranceDetails: "/insurances/:insurance_id",
  };

  export default insuranceRoutes;
