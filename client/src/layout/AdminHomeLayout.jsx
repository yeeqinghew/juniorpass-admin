import React, { useCallback, useEffect, useState } from "react";
import {
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
  CalendarOutlined,
  StarOutlined,
  PercentageOutlined,
  BankOutlined,
  CreditCardOutlined,
  HistoryOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  Layout,
  Menu,
  Image,
  Avatar,
  Typography,
  Button,
  Modal,
  Spin,
  Tooltip,
  Badge,
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionExpiryWarningOpen, setSessionExpiryWarningOpen] =
    useState(false);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.VERIFY_AUTH);
        if (!response.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const session = await response.json();
        setSessionExpiresAt(session.expires_at || null);
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

  const loadUnreadNotifications = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.NOTIFICATION_UNREAD_COUNT,
      );
      if (!response.ok) return;
      const payload = await response.json();
      setUnreadNotifications(payload.unread_count || 0);
    } catch (error) {
      console.error("Unable to load admin notification count:", error);
    }
  }, []);

  useEffect(() => {
    if (authChecking) return undefined;
    loadUnreadNotifications();
    const refreshTimer = window.setInterval(loadUnreadNotifications, 60000);
    window.addEventListener(
      "admin-notifications-changed",
      loadUnreadNotifications,
    );
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener(
        "admin-notifications-changed",
        loadUnreadNotifications,
      );
    };
  }, [authChecking, loadUnreadNotifications]);

  useEffect(() => {
    if (!sessionExpiresAt) return undefined;

    const expiresAt = new Date(sessionExpiresAt).getTime();
    if (Number.isNaN(expiresAt)) return undefined;

    const warningDelay = Math.max(expiresAt - Date.now() - 15 * 60 * 1000, 0);
    const expiryDelay = Math.max(expiresAt - Date.now(), 0);
    const warningTimer = window.setTimeout(
      () => setSessionExpiryWarningOpen(true),
      warningDelay,
    );
    const expiryTimer = window.setTimeout(() => {
      setSessionExpiryWarningOpen(false);
      navigate("/login", { replace: true });
    }, expiryDelay);

    return () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(expiryTimer);
    };
  }, [navigate, sessionExpiresAt]);

  const routeDetails = {
    "/home": { key: "home", title: "Dashboard" },
    "/parents": { key: "parents", title: "Parents" },
    "/children": { key: "children", title: "Children" },
    "/classes": { key: "classes", title: "Classes" },
    "/bookings": { key: "bookings", title: "Bookings" },
    "/reviews": { key: "reviews", title: "Reviews" },
    "/promotions": { key: "promotions", title: "Promotions" },
    "/payouts": { key: "payouts", title: "Partner Payouts" },
    "/payments": { key: "payments", title: "Payments & Transactions" },
    "/refunds": { key: "refunds", title: "Refund Management" },
    "/notifications": { key: "notifications", title: "Admin Notifications" },
    "/audit-log": { key: "audit-log", title: "Audit Log" },
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
      bookings: "/bookings",
      reviews: "/reviews",
      promotions: "/promotions",
      payouts: "/payouts",
      payments: "/payments",
      refunds: "/refunds",
      partners: "/partners",
      enquiries: "/partner-enquiries",
      settings: "/settings",
      categories: "/categories",
      "audit-log": "/audit-log",
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

  const handleLogout = async () => {
    try {
      await fetchWithAuth(API_ENDPOINTS.LOGOUT, { method: "POST" });
    } catch (error) {
      console.error("Admin logout failed:", error);
    } finally {
      navigate("/login", { replace: true });
    }
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
      <Modal
        centered
        closable={false}
        open={sessionExpiryWarningOpen}
        title="Your session is ending soon"
        footer={[
          <Button
            key="sign-out"
            onClick={handleLogout}
          >
            Sign out now
          </Button>,
          <Button
            key="continue"
            type="primary"
            onClick={() => setSessionExpiryWarningOpen(false)}
          >
            Continue working
          </Button>,
        ]}
      >
        <Text>
          For security, you will be signed out in 15 minutes. Please save any
          unfinished work.
        </Text>
      </Modal>
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
              key: "bookings",
              icon: <CalendarOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Bookings</span>,
            },
            {
              key: "reviews",
              icon: <StarOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Reviews</span>,
            },
            {
              key: "promotions",
              icon: <PercentageOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Promotions</span>,
            },
            {
              key: "payouts",
              icon: <BankOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Payouts</span>,
            },
            {
              key: "payments",
              icon: <CreditCardOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Payments</span>,
            },
            {
              key: "refunds",
              icon: <UndoOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Refunds</span>,
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
            {
              key: "audit-log",
              icon: <HistoryOutlined className="sidebar-menu-icon" />,
              label: <span className="sidebar-menu-label">Audit Log</span>,
            },
          ]}
        />

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
              <Text className="header-eyebrow">Junior Pass admin</Text>
              <Text className="header-title">{currentRoute.title}</Text>
            </div>
          </div>

          <div className="header-right">
            <Tooltip title="Notifications">
              <Badge count={unreadNotifications} size="small" overflowCount={99}>
                <Button
                  type="text"
                  shape="circle"
                  className="header-icon-button"
                  icon={<BellOutlined />}
                  aria-label={`${unreadNotifications} unread notifications`}
                  onClick={() => navigate("/notifications")}
                />
              </Badge>
            </Tooltip>

            <div className="header-identity">
              <Avatar
                size={38}
                className="header-avatar"
                icon={<UserOutlined />}
              />
              <div className="header-identity-copy">
                <Text strong>Administrator</Text>
                <small>Junior Pass</small>
              </div>
            </div>

            <Tooltip title="Sign out">
              <Button
                type="text"
                shape="circle"
                className="header-icon-button header-logout-button"
                icon={<LogoutOutlined />}
                aria-label="Sign out"
                onClick={handleLogout}
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
