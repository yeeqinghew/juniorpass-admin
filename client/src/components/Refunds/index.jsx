import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Text, Title } = Typography;
const statusColor = {
  pending: "gold",
  processed: "green",
  rejected: "red",
  failed: "volcano",
};

const Refunds = () => {
  const [form] = Form.useForm();
  const [refunds, setRefunds] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [requestKey, setRequestKey] = useState("");
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAuth(
        `${API_ENDPOINTS.GET_REFUNDS}?status=${status}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load refunds");
      setRefunds(data.refunds || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);

  const createRefund = async (values) => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREATE_REFUND, {
        method: "POST",
        body: JSON.stringify({ ...values, idempotency_key: requestKey }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to request refund");
      form.resetFields();
      setCreating(false);
      await load();
    } catch (requestError) {
      Modal.error({
        title: "Refund was not requested",
        content: requestError.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const reviewRefund = async () => {
    setSaving(true);
    try {
      const endpoint =
        decision === "approve"
          ? API_ENDPOINTS.APPROVE_REFUND(reviewing.refund_id)
          : API_ENDPOINTS.REJECT_REFUND(reviewing.refund_id);
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify({ review_note: reviewNote }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to review refund");
      setReviewing(null);
      setReviewNote("");
      await load();
    } catch (requestError) {
      Modal.error({
        title: "Refund was not updated",
        content: requestError.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Booking",
      dataIndex: "booking_id",
      render: (value, row) => (
        <div className="refund-primary">
          <strong>{row.listing_title}</strong>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "Family",
      dataIndex: "parent_name",
      render: (value, row) => (
        <div className="refund-primary">
          <strong>{value}</strong>
          <span>
            {row.parent_email} · {row.child_name || "No child"}
          </span>
        </div>
      ),
    },
    {
      title: "Refund",
      dataIndex: "requested_credits",
      render: (value, row) => (
        <div className="refund-primary">
          <strong>{value} credits</strong>
          <span>{row.reason}</span>
        </div>
      ),
    },
    { title: "Requested by", dataIndex: "requested_by_name" },
    {
      title: "Status",
      dataIndex: "status",
      render: (value) => <Tag color={statusColor[value]}>{value}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) =>
        row.status === "pending" ? (
          <div className="refund-actions">
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                setDecision("reject");
                setReviewing(row);
              }}
            >
              Reject
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                setDecision("approve");
                setReviewing(row);
              }}
            >
              Approve
            </Button>
          </div>
        ) : (
          <Text type="secondary">{row.reviewed_by_name || "—"}</Text>
        ),
    },
  ];

  return (
    <div className="refunds-page">
      <header className="refunds-header">
        <div>
          <span className="refunds-eyebrow">Financial controls</span>
          <h1 className="page-title">Refund management</h1>
          <p className="page-subtitle">
            Request and independently approve controlled wallet refunds.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setRequestKey(crypto.randomUUID());
            setCreating(true);
          }}
        >
          Request refund
        </Button>
      </header>
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Refunds could not be loaded"
          description={error}
        />
      ) : null}
      <section className="refunds-panel">
        <div className="refunds-toolbar">
          <strong>{refunds.length} refunds</strong>
          <Select
            value={status}
            onChange={setStatus}
            options={["all", "pending", "processed", "rejected", "failed"].map(
              (value) => ({
                value,
                label: value[0].toUpperCase() + value.slice(1),
              }),
            )}
          />
        </div>
        <Table
          rowKey="refund_id"
          loading={loading}
          columns={columns}
          dataSource={refunds}
          scroll={{ x: 900 }}
        />
      </section>
      <Modal
        open={creating}
        title="Request credit refund"
        footer={null}
        onCancel={() => !saving && setCreating(false)}
      >
        <Alert
          type="info"
          showIcon
          message="A different administrator must approve this request."
        />
        <Form
          form={form}
          layout="vertical"
          onFinish={createRefund}
          className="refund-form"
        >
          <Form.Item
            name="booking_id"
            label="Booking ID"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="credits"
            label="Credits to refund"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} precision={0} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Customer-facing reason"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="internal_notes" label="Internal notes">
            <Input.TextArea rows={3} maxLength={2000} showCount />
          </Form.Item>
          <div className="refund-form-actions">
            <Button onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<UndoOutlined />}
            >
              Submit for approval
            </Button>
          </div>
        </Form>
      </Modal>
      <Modal
        open={Boolean(reviewing)}
        title={decision === "approve" ? "Approve refund" : "Reject refund"}
        onCancel={() => !saving && setReviewing(null)}
        onOk={reviewRefund}
        confirmLoading={saving}
        okText={decision === "approve" ? "Approve and process" : "Reject"}
        okButtonProps={{
          danger: decision === "reject",
          disabled: decision === "reject" && !reviewNote.trim(),
        }}
      >
        <p>
          {reviewing?.requested_credits} credits for {reviewing?.parent_name}
        </p>
        <Input.TextArea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={
            decision === "approve"
              ? "Optional approval note"
              : "Required rejection reason"
          }
        />
      </Modal>
    </div>
  );
};

export default Refunds;
