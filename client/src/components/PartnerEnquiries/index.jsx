import React, { useEffect, useState } from "react";
import {
  Table,
  message,
  Tag,
  Button,
  Modal,
  Space,
  Typography,
  Card,
  Popconfirm,
  Input,
} from "antd";
import {
  EyeOutlined,
  CheckOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";

const { Text, Paragraph } = Typography;

const PartnerEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch partner enquiries data
  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_ALL_PARTNER_ENQUIRIES,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch partner enquiries");
      }

      const data = await response.json();
      setEnquiries(data);
      message.success("Partner enquiries loaded successfully!");
    } catch (error) {
      console.error(error.message);
      toast.error("Error loading partner enquiries. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsResponded = async (enquiryId) => {
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.MARK_ENQUIRY_RESPONDED(enquiryId),
        {
          method: "PUT",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark enquiry as responded");
      }

      message.success("Enquiry marked as responded!");
      fetchEnquiries();
    } catch (error) {
      console.error(error.message);
      toast.error("Error updating enquiry status.");
    }
  };

  const handleViewDetails = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsModalOpen(true);
  };

  // Define table columns
  const columns = [
    {
      title: "Status",
      dataIndex: "responded",
      key: "responded",
      width: 135,
      render: (responded) => (
        <Tag
          className={`admin-status-tag ${responded ? "is-success" : "is-warning"}`}
        >
          {responded ? "Responded" : "Pending"}
        </Tag>
      ),
      filters: [
        { text: "Pending", value: false },
        { text: "Responded", value: true },
      ],
      onFilter: (value, record) => record.responded === value,
      defaultFilteredValue: [false], // Show pending by default
    },
    {
      title: "Company Name",
      dataIndex: "company_name",
      key: "company_name",
      width: 190,
      ellipsis: true,
      sorter: (a, b) => a.company_name.localeCompare(b.company_name),
    },
    {
      title: "Contact Person",
      dataIndex: "contact_person_name",
      key: "contact_person_name",
      width: 180,
      ellipsis: true,
      sorter: (a, b) =>
        a.contact_person_name.localeCompare(b.contact_person_name),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 230,
      ellipsis: true,
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      width: 260,
      ellipsis: true,
      render: (message) => (
        <Text ellipsis style={{ maxWidth: 300 }}>
          {message || "No message"}
        </Text>
      ),
    },
    {
      title: "Submitted On",
      dataIndex: "created_at",
      key: "created_at",
      width: 195,
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 190,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            ghost
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            View
          </Button>
          {!record.responded && (
            <Popconfirm
              title="Mark as responded?"
              description="Are you sure you want to mark this enquiry as responded?"
              onConfirm={() => handleMarkAsResponded(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="primary" icon={<CheckOutlined />} size="small">
                Done
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredEnquiries = normalizedSearch
    ? enquiries.filter((enquiry) =>
        [
          enquiry.company_name,
          enquiry.contact_person_name,
          enquiry.email,
          enquiry.message,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch),
        ),
      )
    : enquiries;

  return (
    <div className="page-container">
      <div className="page-header-card page-actions">
        <div className="page-header">
          <span className="page-kicker">Partner management</span>
          <h1 className="page-title">Partner enquiries</h1>
          <p className="page-subtitle">
            Review partnership requests and track responses.
          </p>
        </div>
        <Button onClick={fetchEnquiries} loading={loading}>
          Refresh
        </Button>
      </div>

      <div className="admin-summary-strip">
        <div>
          <Text>Total enquiries</Text>
          <strong>{enquiries.length}</strong>
        </div>
        <div className="summary-warning">
          <Text>Pending</Text>
          <strong>{enquiries.filter((e) => !e.responded).length}</strong>
        </div>
        <div className="summary-success">
          <Text>Responded</Text>
          <strong>{enquiries.filter((e) => e.responded).length}</strong>
        </div>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Enquiry inbox</h2>
            <p>{filteredEnquiries.length} records shown</p>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search company, contact, or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="table-search"
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredEnquiries.map((enquiry) => ({
            ...enquiry,
            key: enquiry.id,
          }))}
          loading={loading}
          bordered={false}
          size="middle"
          scroll={{ x: 1380 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} enquiries`,
          }}
        />
      </div>

      <Modal
        title={
          <Space>
            <Text strong style={{ fontSize: 18 }}>
              Enquiry Details
            </Text>
            {selectedEnquiry && (
              <Tag
                className={`admin-status-tag ${
                  selectedEnquiry.responded ? "is-success" : "is-warning"
                }`}
              >
                {selectedEnquiry.responded ? "Responded" : "Pending"}
              </Tag>
            )}
          </Space>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedEnquiry(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>,
          selectedEnquiry && !selectedEnquiry.responded && (
            <Popconfirm
              key="markResponded"
              title="Mark as responded?"
              description="Are you sure you want to mark this enquiry as responded?"
              onConfirm={() => {
                handleMarkAsResponded(selectedEnquiry.id);
                setIsModalOpen(false);
              }}
              okText="Yes"
              cancelText="No"
            >
              <Button type="primary" icon={<CheckOutlined />}>
                Mark as Responded
              </Button>
            </Popconfirm>
          ),
        ]}
        width={700}
      >
        {selectedEnquiry && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Card size="small" title="Company Information" className="modal-section-card">
              <Space direction="vertical" style={{ width: "100%" }}>
                <div className="modal-field">
                  <Text className="modal-field-label">Company Name:</Text>
                  <br />
                  <Text className="modal-field-value modal-field-value-large">
                    {selectedEnquiry.company_name}
                  </Text>
                </div>
                <div className="modal-field">
                  <Text className="modal-field-label">Contact Person:</Text>
                  <br />
                  <Text className="modal-field-value">{selectedEnquiry.contact_person_name}</Text>
                </div>
                <div className="modal-field">
                  <Text className="modal-field-label">Email:</Text>
                  <br />
                  <Text className="modal-field-value" copyable>
                    {selectedEnquiry.email}
                  </Text>
                </div>
              </Space>
            </Card>

            <Card size="small" title="Message" className="modal-section-card">
              <Paragraph className="modal-message">
                {selectedEnquiry.message || "No message provided"}
              </Paragraph>
            </Card>

            <Card size="small" title="Metadata" className="modal-section-card">
              <Space direction="vertical" style={{ width: "100%" }}>
                <div className="modal-field">
                  <Text className="modal-field-label">Enquiry ID:</Text>
                  <br />
                  <Text code>{selectedEnquiry.id}</Text>
                </div>
                <div className="modal-field">
                  <Text className="modal-field-label">Submitted On:</Text>
                  <br />
                  <Text>
                    {new Date(selectedEnquiry.created_at).toLocaleString()}
                  </Text>
                </div>
                {selectedEnquiry.updated_at && (
                  <div className="modal-field">
                    <Text className="modal-field-label">Last Updated:</Text>
                    <br />
                    <Text>
                      {new Date(selectedEnquiry.updated_at).toLocaleString()}
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default PartnerEnquiries;
