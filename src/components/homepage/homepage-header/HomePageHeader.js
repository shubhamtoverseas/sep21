import React from "react";
import logoAppIcon from "../../../assets/img/logo-appicon.png";
import logoMaidMatch from "../../../assets/img/maidmatch-logo.svg";
import './home-page-header.css';
import { Link } from "react-router-dom";
const HomePageHeader = () => {
  return (
    <header className="bg-white">
      <div className="d-flex align-items-center justify-content-between">
        <div className="">
          <Link to="/">
            <img src={logoAppIcon} alt="App Logo" className="mr8" />
            <img src={logoMaidMatch} alt="App icon logo" />
          </Link>
        </div>
        <button className="rounded-filled-btn-maidmatch">
          Get The App
        </button>
      </div>
    </header>
  );
};

export default HomePageHeader;