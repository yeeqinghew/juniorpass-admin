import React, { useEffect, useState } from "react";
import { Input, Table } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./Children.css";

const Children = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const formatDate = (value) =>
    value
      ? new Intl.DateTimeFormat("en-SG", { dateStyle: "medium" }).format(
          new Date(value),
        )
      : "Not available";

  useEffect(() => {
    const getChildren = async () => {
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_CHILDREN, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }

        const data = await response.json();
        setChildren(data);
      } catch {
        toast.error("Error loading children data");
      } finally {
        setLoading(false);
      }
    };

    getChildren();
  }, []);

  const columns = [
    {
      title: "Child",
      key: "child",
      width: 220,
      render: (_, child) => (
        <div className="child-directory-person">
          <strong>{child.name || "Unnamed child"}</strong>
          <span>Born {formatDate(child.date_of_birth)}</span>
        </div>
      ),
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: "Age",
      dataIndex: "age",
      key: "age",
      width: 100,
      render: (age) => (Number.isFinite(age) ? `${age} years` : "Not available"),
      sorter: (a, b) => (a.age ?? -1) - (b.age ?? -1),
    },
    {
      title: "Gender",
      dataIndex: "gender",
      key: "gender",
      width: 120,
      render: (gender) => gender || "Not available",
    },
    {
      title: "Parent / guardian",
      key: "parent",
      width: 260,
      render: (_, child) => (
        <div className="child-directory-person">
          <strong>{child.parent_name || "Not available"}</strong>
          <span>{child.parent_email || "No email recorded"}</span>
        </div>
      ),
      sorter: (a, b) =>
        (a.parent_name || "").localeCompare(b.parent_name || ""),
    },
    {
      title: "Enrolments",
      key: "enrolments",
      width: 140,
      render: (_, child) => (
        <div className="child-directory-enrolments">
          <strong>{child.booking_count || 0} total</strong>
          <span>{child.upcoming_booking_count || 0} upcoming</span>
        </div>
      ),
      sorter: (a, b) => (a.booking_count || 0) - (b.booking_count || 0),
    },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredChildren = normalizedSearch
    ? children.filter((child) =>
        [child.name, child.parent_name, child.parent_email].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        ),
      )
    : children;

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-header">
          <span className="page-kicker">User management</span>
          <h1 className="page-title">Children</h1>
          <p className="page-subtitle">Review registered children profiles.</p>
        </div>
        <div className="page-record-count">
          <TeamOutlined />
          {children.length} {children.length === 1 ? "profile" : "profiles"}
        </div>
      </div>

      <section className="admin-summary-strip" aria-label="Child profile summary">
        <div>
          <span>Registered children</span>
          <strong>{children.length}</strong>
        </div>
        <div className="summary-success">
          <span>With upcoming classes</span>
          <strong>{children.filter((child) => child.upcoming_booking_count > 0).length}</strong>
        </div>
        <div>
          <span>Confirmed enrolments</span>
          <strong>{children.reduce((total, child) => total + (child.booking_count || 0), 0)}</strong>
        </div>
      </section>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Children directory</h2>
            <p>{filteredChildren.length} records shown</p>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search child or parent"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="table-search"
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredChildren}
          rowKey="child_id"
          loading={loading}
          bordered={false}
          size="middle"
          scroll={{ x: 840 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} children`,
          }}
          onChange={(pagination, filters, sorter) => {
            console.log("Params", pagination, filters, sorter);
          }}
        />
      </div>
    </div>
  );
};

export default Children;
