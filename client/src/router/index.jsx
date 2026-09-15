import { Routes, Route, Navigate } from "react-router-dom";
import AdminLandingLayout from "../layout/AdminLandingLayout";
import AdminHomeLayout from "../layout/AdminHomeLayout";
import AdminLogin from "../components/Login";
import Home from "../components/Home";
import Partners from "../components/Partners";
import CreatePartner from "../components/Partners/CreatePartner";
import Parents from "../components/Users/Parents";
import Children from "../components/Users/Children";
import Classes from "../components/Classes";
import PartnerEnquiries from "../components/PartnerEnquiries";
import Settings from "../components/Settings";
import Categories from "../components/Categories";

const Routers = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/*" element={<AdminLandingLayout />}>
        <Route path="login" element={<AdminLogin />}></Route>
        <Route element={<AdminHomeLayout />}>
          <Route path="home" element={<Home />}></Route>
          <Route path="parents" element={<Parents />}></Route>
          <Route path="children" element={<Children />}></Route>
          <Route path="classes" element={<Classes />}></Route>
          <Route path="partners" element={<Partners />}></Route>
          <Route path="settings" element={<Settings />}></Route>
          <Route path="categories" element={<Categories />}></Route>
          <Route path="create-partner" element={<CreatePartner />}></Route>
          <Route
            path="partner-enquiries"
            element={<PartnerEnquiries />}
          ></Route>
        </Route>
      </Route>
    </Routes>
  );
};

export default Routers;
