import React, { useEffect, useState } from "react";
import { Input, Table } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";

const Children = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 320,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Age",
      dataIndex: "age",
      key: "age",
      width: 180,
      sorter: (a, b) => a.age - b.age,
    },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredChildren = normalizedSearch
    ? children.filter((child) =>
        child.name?.toLowerCase().includes(normalizedSearch),
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

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Children directory</h2>
            <p>{filteredChildren.length} records shown</p>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search by name"
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
          scroll={{ x: 500 }}
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
