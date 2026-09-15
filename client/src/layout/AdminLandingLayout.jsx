import { useEffect } from "react";
import { ConfigProvider } from "antd";
import { Outlet } from "react-router-dom";

const AdminLandingLayout = () => {
  useEffect(() => {
    // check if admin is login
    // if login, bring to homepage
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          // Seed Token
          colorPrimary: "#98BDD2",
          colorPrimaryActive: "#98BDD2",

          // Alias
          colorBgContainer: "#FCFBF8",
          fontSize: 14,
        },
        components: {
          Layout: {
            headerBg: "#FCFBF8",
            bodyBg: "#FCFBF8",
            headerHeight: 84,
            lightSiderBg: "#FCFBF8",
            siderBg: "#FCFBF8",
            triggerBg: "#98BDD2",
            lightTriggerBg: "#98BDD2",
          },
          Menu: {
            horizontalItemSelectedColor: "#98BDD2",
          },
          Tabs: {
            itemActiveColor: "#98BDD2",
            itemHoverColor: "#98BDD2",
            itemSelectedColor: "#98BDD2",
            inkBarColor: "#98BDD2",
          },
        },
      }}
    >
      <div
        style={{
          backgroundColor: "#FCFBF8",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </div>
    </ConfigProvider>
  );
};

export default AdminLandingLayout;
