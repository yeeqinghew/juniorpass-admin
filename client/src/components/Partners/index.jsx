import React, { useEffect, useState } from "react";
import { Table, message, Image, Button, Input, Tag } from "antd";
import { PlusOutlined, SearchOutlined, ShopOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import AccountSuspensionAction from "../AccountSuspensionAction";
import { isSuspensionActive } from "../../utils/accountSuspension";

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const columns = [
    {
      title: "Logo",
      dataIndex: "picture",
      key: "picture",
      width: 82,
      render: (picture) => (
        <Image
          src={picture}
          alt="Partner Logo"
          width={50}
          height={50}
          preview={false}
          className="partner-logo"
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "partner_name",
      key: "partner_name",
      width: 190,
      ellipsis: true,
      sorter: (a, b) => a.partner_name.localeCompare(b.partner_name),
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
      title: "Contact Number",
      dataIndex: "contact_number",
      key: "contact_number",
      width: 170,
      sorter: (a, b) => a.contact_number.localeCompare(b.contact_number),
    },
    {
      title: "Website",
      dataIndex: "website",
      key: "website",
      width: 100,
      render: (website) => (
        website ? (
          <a href={website} target="_blank" rel="noopener noreferrer" className="table-link">
            Visit
          </a>
        ) : "—"
      ),
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 100,
      render: (rating) => `${rating} / 5`,
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: "Categories",
      dataIndex: "categories",
      key: "categories",
      width: 180,
      ellipsis: true,
      render: (categories) =>
        String(categories || "").replace(/{|}/g, "") || "—",
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, partner) =>
        isSuspensionActive(partner) ? <Tag color="error">Suspended</Tag> : <Tag color="success">Active</Tag>,
    },
    {
      title: "Created On",
      dataIndex: "created_at",
      key: "created_at",
      width: 200,
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, partner) => (
        <AccountSuspensionAction
          accountType="partner"
          account={partner}
          onUpdated={(id, changes) =>
            setPartners((current) => current.map((item) => item.partner_id === id ? { ...item, ...changes } : item))
          }
        />
      ),
    },
  ];

  useEffect(() => {
    async function fetchPartners() {
      setLoading(true);
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_PARTNERS, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch partners");
        }

        const data = await response.json();
        setPartners(data);
        message.success("Partners loaded successfully!");
      } catch (error) {
        console.error(error.message);
        toast.error("Error loading partners. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchPartners();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPartners = normalizedSearch
    ? partners.filter((partner) =>
        [
          partner.partner_name,
          partner.email,
          partner.contact_number,
          partner.categories,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedSearch),
        ),
      )
    : partners;

  return (
    <div className="page-container">
      <div className="page-header-card page-actions">
        <div className="page-header">
          <span className="page-kicker">Partner management</span>
          <h1 className="page-title">Partners</h1>
          <p className="page-subtitle">Manage partner organisations and onboarding.</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => navigate("/create-partner")}
          className="page-primary-action"
        >
          Invite partner
        </Button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Partner directory</h2>
            <p>{filteredPartners.length} records shown</p>
          </div>
          <div className="table-toolbar-actions">
            <div className="page-record-count compact">
              <ShopOutlined />
              {partners.length} total
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search partners"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="table-search"
            />
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filteredPartners.map((partner) => ({
            ...partner,
            key: partner.partner_id,
          }))}
          loading={loading}
          bordered={false}
          size="middle"
          scroll={{ x: 1370 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} partners`,
          }}
          onChange={(pagination, filters, sorter) => {
            console.log("Params", pagination, filters, sorter);
          }}
        />
      </div>
    </div>
  );
};

export default Partners;
