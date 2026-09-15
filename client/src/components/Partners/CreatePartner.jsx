import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Typography,
  Space,
  Alert,
  Divider,
} from "antd";
import {
  MailOutlined,
  SendOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import { useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

const CreatePartner = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREATE_PARTNER, {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          partner_name: values.partner_name || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitation");
      }

      message.success(
        "Invitation sent successfully! The partner will receive an email with login credentials."
      );
      toast.success(`Invitation sent to ${values.email}`);

      form.resetFields();

      // Redirect after success
      setTimeout(() => {
        navigate("/partners");
      }, 2000);
    } catch (error) {
      console.error(error.message);
      toast.error(error.message || "Error sending invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-card page-actions">
        <div className="page-header">
          <span className="page-kicker">Partner management</span>
          <Title level={2} className="page-title">
            Invite new partner
          </Title>
          <Text className="page-subtitle">
            Send an invitation email to onboard a new partner organisation.
          </Text>
        </div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/partners")}
        >
          Back to partners
        </Button>
      </div>

      {/* Main Content - Left Aligned */}
      <div className="invitation-content-wrapper">
        <Card className="invitation-form-card">
          <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
            Partner Details
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Enter the partner's email address. A temporary password will be generated
            and sent via email.
          </Paragraph>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item
              label="Partner Organization Name"
              name="partner_name"
              extra="Optional - Partner can update this after logging in"
            >
              <Input
                prefix={<ShopOutlined />}
                placeholder="e.g., ABC Learning Center"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Email Address"
              name="email"
              rules={[
                { required: true, message: "Please enter partner's email" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="partner@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<SendOutlined />}
                loading={loading}
              >
                Send Invitation Email
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          {/* What Happens Next */}
          <div className="invitation-workflow">
            <Title level={5} style={{ marginBottom: 16 }}>
              <InfoCircleOutlined style={{ marginRight: 8 }} />
              What Happens Next
            </Title>
            <ol className="workflow-steps">
              <li>
                <strong>Email Sent:</strong> Partner receives an email with temporary login credentials
              </li>
              <li>
                <strong>First Login:</strong> Partner logs in at{" "}
                <a href="https://partner.juniorpass.sg" target="_blank" rel="noopener noreferrer">
                  partner.juniorpass.sg
                </a>
              </li>
              <li>
                <strong>Password Change:</strong> System prompts partner to change their temporary password
              </li>
              <li>
                <strong>Profile Setup:</strong> Partner completes their organization profile:
                <ul className="profile-fields">
                  <li>Organization name & description</li>
                  <li>Contact number & website</li>
                  <li>Upload logo</li>
                  <li>Select service categories</li>
                  <li>Add outlet locations</li>
                </ul>
              </li>
              <li>
                <strong>Account Active:</strong> Partner can start creating class listings
              </li>
            </ol>
          </div>
        </Card>

        {/* Sidebar Info */}
        <div className="invitation-info-sidebar">
          <Alert
            message="Temporary Credentials"
            description={
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text>A secure 12-character password will be auto-generated</Text>
                <Text>Partner must change password on first login</Text>
                <Text>Email is sent immediately upon invitation</Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Alert
            message="Default Settings"
            description={
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text>• Credit balance: 0</Text>
                <Text>• Rating: 0 (updates with reviews)</Text>
                <Text>• Profile: Incomplete (requires setup)</Text>
                <Text>• Default category: Sports</Text>
              </Space>
            }
            type="warning"
            showIcon
          />
        </div>
      </div>
    </div>
  );
};

export default CreatePartner;
