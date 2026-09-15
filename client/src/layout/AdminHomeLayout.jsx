import React, { useEffect, useState } from "react";
import {
  UploadOutlined,
  UserOutlined,
  TeamOutlined,
  LogoutOutlined,
  HomeOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  FormOutlined,
  SettingOutlined,
  TagsOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  Image,
  Avatar,
  Typography,
  Button,
  Spin,
  Tooltip,
} from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../images/logopngResize.png";
import { API_ENDPOINTS, fetchWithAuth } from "../config/api";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AdminHomeLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.VERIFY_AUTH);
        if (!response.ok) {
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Admin session verification failed:", error);
        navigate("/login", { replace: true });
      } finally {
        if (active) setAuthChecking(false);
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, [navigate]);

  const routeDetails = {
    "/home": { key: "home", title: "Dashboard" },
    "/parents": { key: "parents", title: "Parents" },
    "/children": { key: "children", title: "Children" },
    "/classes": { key: "classes", title: "Classes" },
    "/partners": { key: "partners", title: "Partners" },
    "/create-partner": { key: "partners", title: "Invite Partner" },
    "/partner-enquiries": { key: "enquiries", title: "Partner Enquiries" },
    "/settings": { key: "settings", title: "Platform Settings" },
    "/categories": { key: "categories", title: "Categories" },
  };

  const currentRoute = routeDetails[location.pathname] || routeDetails["/home"];

  const handleNavigation = ({ key }) => {
    const routeMap = {
      home: "/home",
      parents: "/parents",
      children: "/children",
      classes: "/classes",
      partners: "/partners",
      enquiries: "/partner-enquiries",
      settings: "/settings",
      categories: "/categories",
    };

    if (routeMap[key]) {
      navigate(routeMap[key]);
      setMobileOpen(false);
    }
  };

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpen((open) => !open);
      return;
    }

    setCollapsed((value) => !value);
  };

  if (authChecking) {
    return (
      <div className="admin-auth-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="admin-layout">
      <Sider
        collapsible
        collapsed={isMobile ? !mobileOpen : collapsed}
        collapsedWidth={isMobile ? 0 : 80}
        width={232}
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          if (broken) setMobileOpen(false);
        }}
        trigger={null}
        theme="light"
        className={`sidebar ${isMobile ? "sidebar-mobile" : ""}`}
      >
        <div
          className={`sidebar-logo-wrapper ${
            !isMobile && collapsed ? "collapsed" : "expanded"
          }`}
        >
          <Image
            src={logo}
            preview={false}
            width={!isMobile && collapsed ? 42 : 104}
            className="sidebar-logo"
          />
          {(!collapsed || isMobile) && (
            <Text className="sidebar-workspace-label">Admin workspace</Text>
          )}
        </div>

        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[currentRoute.key]}
          onClick={handleNavigation}
          className="sidebar-menu"
          items={[
            {
              key: "home",
              icon: <HomeOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Dashboard</span>,
            },
            {
              key: "classes",
              icon: <ReadOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Classes</span>,
            },
            {
              key: "parents",
              icon: <UserOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Parents</span>,
            },
            {
              key: "children",
              icon: <TeamOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Children</span>,
            },
            {
              key: "partners",
              icon: <ShopOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Partners</span>,
            },
            {
              key: "enquiries",
              icon: <FormOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Partner Enquiries</span>,
            },
            {
              key: "categories",
              icon: <TagsOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Categories</span>,
            },
            {
              key: "settings",
              icon: <SettingOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Settings</span>,
            },
          ]}
        />

        {(!collapsed || isMobile) && (
          <div className="sidebar-footer">
            <UploadOutlined />
            <div>
              <Text>Transactions</Text>
              <small>Coming soon</small>
            </div>
          </div>
        )}
      </Sider>

      {isMobile && mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Layout
        className={`main-layout ${
          isMobile
            ? "sidebar-mobile-layout"
            : collapsed
              ? "sidebar-collapsed"
              : "sidebar-expanded"
        }`}
      >
        <Header className="main-header">
          <div className="header-left">
            {React.createElement(
              isMobile || collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: "header-toggle-icon",
                onClick: handleToggle,
                role: "button",
                tabIndex: 0,
                "aria-label": "Toggle navigation",
              }
            )}
            <div className="header-page-context">
              <Text className="header-eyebrow">JuniorPASS admin</Text>
              <Text className="header-title">{currentRoute.title}</Text>
            </div>
          </div>

          <div className="header-right">
            <Tooltip title="Notifications">
              <Button
                type="text"
                shape="circle"
                className="header-icon-button"
                icon={<BellOutlined />}
                aria-label="Notifications"
              />
            </Tooltip>

            <div className="header-identity">
              <Avatar
                size={38}
                className="header-avatar"
                icon={<UserOutlined />}
              />
              <div className="header-identity-copy">
                <Text strong>Administrator</Text>
                <small>JuniorPASS</small>
              </div>
            </div>

            <Tooltip title="Sign out">
              <Button
                type="text"
                shape="circle"
                className="header-icon-button header-logout-button"
                icon={<LogoutOutlined />}
                aria-label="Sign out"
                onClick={async () => {
                  try {
                    await fetchWithAuth(API_ENDPOINTS.LOGOUT, {
                      method: "POST",
                    });
                  } catch (error) {
                    console.error("Admin logout failed:", error);
                  } finally {
                    navigate("/login", { replace: true });
                  }
                }}
              />
            </Tooltip>
          </div>
        </Header>
        <Content className="main-content">
          <div className="fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminHomeLayout;
