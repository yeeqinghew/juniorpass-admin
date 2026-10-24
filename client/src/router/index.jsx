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
import Bookings from "../components/Bookings";
import PartnerEnquiries from "../components/PartnerEnquiries";
import Settings from "../components/Settings";
import Categories from "../components/Categories";
import Reviews from "../components/Reviews";
import Promotions from "../components/Promotions";
import Payouts from "../components/Payouts";
import Payments from "../components/Payments";
import Notifications from "../components/Notifications";

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
          <Route path="bookings" element={<Bookings />}></Route>
          <Route path="reviews" element={<Reviews />}></Route>
          <Route path="promotions" element={<Promotions />}></Route>
          <Route path="payouts" element={<Payouts />}></Route>
          <Route path="payments" element={<Payments />}></Route>
          <Route path="notifications" element={<Notifications />}></Route>
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
