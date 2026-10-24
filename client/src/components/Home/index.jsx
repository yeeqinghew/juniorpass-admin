import { useEffect, useState } from "react";
import { Button, Card, Col, Row, Typography } from "antd";
import {
  ArrowRightOutlined,
  FormOutlined,
  PlusOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";

const { Title, Text } = Typography;

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChildren: 0,
    totalPartners: 0,
    pendingEnquiries: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [parentsRes, childrenRes, partnersRes, enquiriesRes] =
          await Promise.all([
            fetchWithAuth(API_ENDPOINTS.GET_ALL_PARENTS, { method: "GET" }),
            fetchWithAuth(API_ENDPOINTS.GET_ALL_CHILDREN, { method: "GET" }),
            fetchWithAuth(API_ENDPOINTS.GET_ALL_PARTNERS, { method: "GET" }),
            fetchWithAuth(API_ENDPOINTS.GET_ALL_PARTNER_ENQUIRIES, {
              method: "GET",
            }),
          ]);

        const [parents, children, partners, enquiries] = await Promise.all([
          parentsRes.json(),
          childrenRes.json(),
          partnersRes.json(),
          enquiriesRes.json(),
        ]);

        setStats({
          totalUsers: Array.isArray(parents) ? parents.length : 0,
          totalChildren: Array.isArray(children) ? children.length : 0,
          totalPartners: Array.isArray(partners) ? partners.length : 0,
          pendingEnquiries: Array.isArray(enquiries)
            ? enquiries.filter((enquiry) => !enquiry.responded).length
            : 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total parents",
      value: stats.totalUsers,
      icon: <UserOutlined />,
      color: "#98BDD2",
    },
    {
      title: "Total children",
      value: stats.totalChildren,
      icon: <TeamOutlined />,
      color: "#10b981",
    },
    {
      title: "Total partners",
      value: stats.totalPartners,
      icon: <ShopOutlined />,
      color: "#8b5cf6",
    },
    {
      title: "Pending enquiries",
      value: stats.pendingEnquiries,
      icon: <FormOutlined />,
      color: "#f59e0b",
    },
  ];

  const managementLinks = [
    {
      title: "Review partner enquiries",
      description: "Read new partnership requests and update their status.",
      icon: <FormOutlined />,
      route: "/partner-enquiries",
    },
    {
      title: "Manage partner accounts",
      description: "View partner organisations and onboarding information.",
      icon: <ShopOutlined />,
      route: "/partners",
    },
    {
      title: "Manage user records",
      description: "Review registered parents and their account details.",
      icon: <UserOutlined />,
      route: "/parents",
    },
  ];

  return (
    <div className="home-container">
      <div className="dashboard-hero">
        <div>
          <Text className="dashboard-kicker">Platform overview</Text>
          <Title level={2} className="home-title">
            Dashboard
          </Title>
          <Text className="home-subtitle">
            Monitor Junior Pass activity and access daily admin tasks.
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate("/create-partner")}
          className="dashboard-primary-action"
        >
          Invite partner
        </Button>
      </div>

      <Row gutter={[16, 16]} className="dashboard-stats-grid">
        {statCards.map((stat) => (
          <Col xs={24} sm={12} xl={6} key={stat.title}>
            <Card className="stat-card" styles={{ body: { padding: 0 } }}>
              <div className="stat-card-body">
                <div
                  className="stat-card-icon-wrapper"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <div className="stat-card-details">
                  <Text className="stat-card-label">{stat.title}</Text>
                  <strong className="stat-card-value">{stat.value}</strong>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="dashboard-management-row">
        <Col xs={24} lg={16}>
          <Card
            title="Management shortcuts"
            className="dashboard-panel"
            extra={<Text className="dashboard-panel-note">Common tasks</Text>}
          >
            <div className="management-link-list">
              {managementLinks.map((item) => (
                <button
                  type="button"
                  className="management-link"
                  key={item.title}
                  onClick={() => navigate(item.route)}
                >
                  <span className="management-link-icon">{item.icon}</span>
                  <span className="management-link-copy">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </span>
                  <ArrowRightOutlined />
                </button>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Admin checklist" className="dashboard-panel">
            <div className="admin-checklist">
              <div>
                <span className="checklist-dot" />
                <p>
                  <strong>Enquiries</strong>
                  <small>{stats.pendingEnquiries} awaiting review</small>
                </p>
              </div>
              <div>
                <span className="checklist-dot" />
                <p>
                  <strong>Partner network</strong>
                  <small>{stats.totalPartners} active records</small>
                </p>
              </div>
              <div>
                <span className="checklist-dot" />
                <p>
                  <strong>User records</strong>
                  <small>
                    {stats.totalUsers + stats.totalChildren} parent and child records
                  </small>
                </p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
