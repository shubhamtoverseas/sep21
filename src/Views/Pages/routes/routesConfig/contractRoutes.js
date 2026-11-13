const contractRoutes = {
  contracts: "/contracts",
  contractDetails: "/contracts/details/:contract_id", // Contract Details (prototype Contract_Details.html)
  extendVisaCase: "/contracts/details/:contract_id/extend-visa/:extend_visa_case_id", // Extend Visa case (EXTEND.md §2.2: the opaque case id is the only route key)
};

export default contractRoutes;
