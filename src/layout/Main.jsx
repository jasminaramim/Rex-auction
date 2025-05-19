import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../component/shared/Navbar";
import Footer from "../component/shared/Footer";
import SdBot from "../extra/sdChatBot/SdBot";

const Main = () => {
  const location = useLocation();
  const head =
    location.pathname.includes("login") ||
    location.pathname.includes("register") ||
    location.pathname.includes("forgotPassword");

  return (
    <div className="mx-auto ">
      {head || <Navbar />}
      <Outlet />
      {head || <Footer />}
      {head || <SdBot />}
    </div>
  );
};

export default Main;
