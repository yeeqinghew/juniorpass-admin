import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckOutlined,
  DownloadOutlined,
  FileDoneOutlined,
  PlusOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Text, Title } = Typography;

const money = (value) => new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
}).format(Number(value || 0));

const date = (value) => value ? dayjs(value).format("D MMM YYYY") : "—";

const titleCase = (value) => String(value || "")
  .replaceAll("_", " ")
  .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const Payouts = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ partners: [], payouts: [] });
  const [draftOpen, setDraftOpen] = useState(false);
  const [paidPayout, setPaidPayout] = useState(null);
  const [voidingPayout, setVoidingPayout] = useState(null);
  const [voidError, setVoidError] = useState("");
  const [draftForm] = Form.useForm();
  const [paidForm] = Form.useForm();

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_PAYOUTS);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load payouts");
      setData(payload);
    } catch (requestError) {
      setError(requestError.message || "Unable to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const totals = useMemo(() => data.partners.reduce((result, partner) => ({
    credits: result.credits + Number(partner.available_credits || 0),
    amount: result.amount + Number(partner.available_amount || 0),
    partners: result.partners + (Number(partner.available_sessions || 0) > 0 ? 1 : 0),
  }), { credits: 0, amount: 0, partners: 0 }), [data.partners]);

  const createDraft = async (values) => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREATE_PAYOUT, {
        method: "POST",
        body: JSON.stringify({
          partner_id: values.partner_id,
          cutoff_date: values.cutoff_date.format("YYYY-MM-DD"),
          notes: values.notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create payout draft");
      setDraftOpen(false);
      draftForm.resetFields();
      await loadPayouts();
    } catch (requestError) {
      setError(requestError.message || "Unable to create payout draft");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (values) => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.MARK_PAYOUT_PAID(paidPayout.payout_id), {
        method: "PATCH",
        body: JSON.stringify({
          transfer_reference: values.transfer_reference,
          paid_at: values.paid_at.toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to record transfer");
      setPaidPayout(null);
      paidForm.resetFields();
      await loadPayouts();
    } catch (requestError) {
      setError(requestError.message || "Unable to record transfer");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidingPayout) return;
    setSaving(true);
    setVoidError("");
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.VOID_PAYOUT(voidingPayout.payout_id),
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to void payout");
      setVoidingPayout(null);
      await loadPayouts();
    } catch (requestError) {
      setVoidError(requestError.message || "Unable to void payout");
    } finally {
      setSaving(false);
    }
  };

  const openStatement = async (payout, format = "") => {
    const previewWindow = format ? null : window.open("", "_blank");
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.PAYOUT_STATEMENT(payout.payout_id, format),
      );
      if (!response.ok) throw new Error("Unable to download statement");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (format) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `juniorpass-payout-${payout.payout_id}.${format}`;
        anchor.click();
      } else if (previewWindow) {
        previewWindow.location = url;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      previewWindow?.close();
      setError(requestError.message);
    }
  };

  const columns = [
    {
      title: "Partner",
      dataIndex: "partner_name",
      key: "partner",
      render: (value, payout) => <div className="payout-partner-cell"><strong>{value}</strong><span>{payout.email}</span></div>,
    },
    {
      title: "Period",
      key: "period",
      render: (_, payout) => `${date(payout.period_start)} – ${date(dayjs(payout.period_end).subtract(1, "day"))}`,
    },
    { title: "Sessions", dataIndex: "session_count", key: "sessions" },
    { title: "Credits", dataIndex: "total_credits", key: "credits" },
    { title: "Net payout", dataIndex: "net_amount", key: "amount", render: money },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          className={`admin-status-tag is-${
            status === "PAID" ? "success" : status === "VOID" ? "error" : "warning"
          }`}
        >
          {titleCase(status.toLowerCase())}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, payout) => (
        <div className="admin-payout-actions">
          <Button size="small" icon={<FileDoneOutlined />} onClick={() => openStatement(payout)}>Statement</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => openStatement(payout, "csv")}>CSV</Button>
          {payout.status === "DRAFT" && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => {
                setPaidPayout(payout);
                paidForm.setFieldsValue({ paid_at: dayjs() });
              }}>Mark paid</Button>
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => {
                  setVoidError("");
                  setVoidingPayout(payout);
                }}
              >
                Void
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="admin-payouts-page">
      <section className="page-header-card admin-payouts-header">
        <div>
          <Text className="admin-payouts-kicker">Partner finance</Text>
          <Title level={1} className="page-title">Payouts</Title>
          <Text className="page-subtitle">Review delivered sessions and record each manual partner transfer.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          draftForm.setFieldsValue({ cutoff_date: dayjs().add(1, "day").startOf("day") });
          setDraftOpen(true);
        }}>Create payout</Button>
      </section>

      {error && <Alert showIcon type="error" message={error} closable onClose={() => setError("")} />}

      {loading ? <Skeleton active /> : (
        <>
          <section className="admin-summary-strip" aria-label="Payout summary">
            <article><span>Ready to settle</span><strong>{money(totals.amount)}</strong><small>{totals.credits.toFixed(4)} credits</small></article>
            <article><span>Partners ready</span><strong>{totals.partners}</strong><small>with delivered sessions</small></article>
          </section>

          <section className="table-card admin-payouts-panel">
            <div className="admin-payouts-panel-heading">
              <Title level={3}>Payout history</Title>
              <Text type="secondary">Drafts reserve earnings so they cannot enter another payout.</Text>
            </div>
            <Table
              rowKey="payout_id"
              columns={columns}
              dataSource={data.payouts}
              scroll={{ x: 1050 }}
              locale={{ emptyText: <Empty description="No payouts created yet" /> }}
            />
          </section>
        </>
      )}

      <Modal title="Create payout draft" open={draftOpen} onCancel={() => setDraftOpen(false)} onOk={() => draftForm.submit()} okText="Create draft" confirmLoading={saving} destroyOnClose>
        <Alert type="info" showIcon message="All available sessions before the cutoff will be locked into this draft." />
        <Form form={draftForm} layout="vertical" onFinish={createDraft} className="admin-payout-form">
          <Form.Item name="partner_id" label="Partner" rules={[{ required: true, message: "Select a partner" }]}> 
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a partner"
              options={data.partners.map((partner) => ({
                value: partner.partner_id,
                label: `${partner.partner_name} · ${money(partner.available_amount)} available`,
                disabled: Number(partner.available_sessions) === 0,
              }))}
            />
          </Form.Item>
          <Form.Item name="cutoff_date" label="Include sessions ending before" rules={[{ required: true, message: "Choose a cutoff" }]}> 
            <DatePicker />
          </Form.Item>
          <Form.Item name="notes" label="Internal note" rules={[{ max: 1000 }]}> 
            <Input.TextArea rows={3} placeholder="Optional note for the payout record" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Record manual transfer" open={Boolean(paidPayout)} onCancel={() => setPaidPayout(null)} onOk={() => paidForm.submit()} okText="Mark paid" confirmLoading={saving} destroyOnClose>
        <Alert type="warning" showIcon message={`Confirm that ${money(paidPayout?.net_amount)} has been transferred before marking this payout paid.`} />
        <Form form={paidForm} layout="vertical" onFinish={markPaid} className="admin-payout-form">
          <Form.Item name="transfer_reference" label="Bank transfer reference" rules={[{ required: true, message: "Enter the transfer reference" }, { max: 255 }]}> 
            <Input placeholder="e.g. FAST-20261023-1234" />
          </Form.Item>
          <Form.Item name="paid_at" label="Transferred at" rules={[{ required: true, message: "Select the transfer time" }]}> 
            <DatePicker showTime />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Void this payout draft?"
        open={Boolean(voidingPayout)}
        onCancel={() => {
          setVoidingPayout(null);
          setVoidError("");
        }}
        onOk={confirmVoid}
        okText="Void draft"
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
        closable={!saving}
        maskClosable={!saving}
        destroyOnClose
      >
        <div className="admin-payout-void-content">
          <Alert
            type="warning"
            showIcon
            message="The draft will be cancelled"
            description="Its session earnings will return to the available balance and can be included in a new payout."
          />
          {voidError && <Alert type="error" showIcon message={voidError} />}
        </div>
      </Modal>
    </div>
  );
};

export default Payouts;
