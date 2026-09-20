import { useState } from "react";
import { Image } from "antd";
import {
  LockOutlined,
  MailOutlined,
  EyeTwoTone,
  EyeInvisibleOutlined,
  SafetyOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Typography } from "antd";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logopngResize.png";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./Login.css";

const { Title, Text } = Typography;

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.LOGIN, {
        method: "POST",
        body: JSON.stringify(values),
      });

      const parseRes = await response.json();
      if (response.ok && parseRes.authenticated) {
        navigate("/home");
        toast.success("Login successfully");
      } else {
        toast.error("Wrong credential");
      }
    } catch (error) {
      console.error(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-login-page">
      <div className="admin-login-card fade-in">
        <div className="admin-login-header">
          <Image
            src={logo}
            preview={false}
            width={126}
            className="admin-login-logo"
          />
          <Title level={2} className="admin-login-title">
            Admin Portal
          </Title>
          <Text className="admin-login-subtitle">
            Sign in to manage your platform
          </Text>
        </div>

        <Form
          name="normal_login"
          className="admin-login-form"
          onFinish={handleLogin}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              {
                required: true,
                message: "Please enter your username",
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your username"
              size="large"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              {
                required: true,
                message: "Please enter your password",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
              autoComplete="current-password"
              iconRender={(visible) =>
                visible ? (
                  <EyeTwoTone twoToneColor="#98BDD2" />
                ) : (
                  <EyeInvisibleOutlined />
                )
              }
            />
          </Form.Item>

          <Form.Item className="admin-login-submit">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<ArrowRightOutlined />}
              iconPosition="end"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Form.Item>
        </Form>

        <div className="admin-login-footer">
          <Text>JuniorPASS administration workspace</Text>
        </div>
      </div>
    </section>
  );
};

export default AdminLogin;
