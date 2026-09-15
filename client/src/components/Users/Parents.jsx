import React, { useEffect, useState } from "react";
import { Input, Table, Tag, message } from "antd";
import { SearchOutlined, UserOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import AccountSuspensionAction from "../AccountSuspensionAction";
import { isSuspensionActive } from "../../utils/accountSuspension";

const Parents = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 190,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 260,
      ellipsis: true,
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: "Phone Number",
      dataIndex: "phone_number",
      key: "phone_number",
      width: 170,
      sorter: (a, b) => a.phone_number.localeCompare(b.phone_number),
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, user) =>
        isSuspensionActive(user) ? <Tag color="error">Suspended</Tag> : <Tag color="success">Active</Tag>,
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      width: 210,
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, user) => (
        <AccountSuspensionAction
          accountType="parent"
          account={user}
          onUpdated={(id, changes) =>
            setUsers((current) => current.map((item) => item.user_id === id ? { ...item, ...changes } : item))
          }
        />
      ),
    },
  ];

  useEffect(() => {
    async function getAllUsers() {
      setLoading(true);
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_PARENTS, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }

        const data = await response.json();
        setUsers(data);
        message.success("Users loaded successfully!");
      } catch (err) {
        console.error(err.message);
        toast.error("Error retrieving users. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    getAllUsers();
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = normalizedSearch
    ? users.filter((user) =>
        [user.name, user.email, user.phone_number].some((value) =>
          value?.toLowerCase().includes(normalizedSearch),
        ),
      )
    : users;

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-header">
          <span className="page-kicker">User management</span>
          <h1 className="page-title">Parents</h1>
          <p className="page-subtitle">Review and manage parent user accounts.</p>
        </div>
        <div className="page-record-count">
          <UserOutlined />
          {users.length} {users.length === 1 ? "account" : "accounts"}
        </div>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Parent directory</h2>
            <p>{filteredUsers.length} records shown</p>
          </div>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search name, email, or phone"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="table-search"
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredUsers.map((user) => ({
            ...user,
            key: user.user_id,
          }))}
          loading={loading}
          bordered={false}
          size="middle"
          scroll={{ x: 830 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} users`,
          }}
          onChange={(pagination, filters, sorter) => {
            console.log("Params", pagination, filters, sorter);
          }}
        />
      </div>
    </div>
  );
};

export default Parents;
