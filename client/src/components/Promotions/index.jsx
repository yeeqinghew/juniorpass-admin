import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, DatePicker, Drawer, Empty, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography } from "antd";
import { CheckOutlined, CloseOutlined, FileSearchOutlined, PauseCircleOutlined, PlayCircleOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Text, Title } = Typography;
const labelize = (value) => String(value || "").replaceAll("_", " ").replaceAll("-", " ");

const Promotions = () => {
  const [form] = Form.useForm();
  const [promotions, setPromotions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("all");
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [fundedBy, setFundedBy] = useState("partner");
  const [platformShare, setPlatformShare] = useState(50);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const scheduleId = Form.useWatch("schedule_group_id", form);
  const createFunding = Form.useWatch("funded_by", form);
  const createEligibility = Form.useWatch("eligibility", form);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const [promotionsResponse, optionsResponse] = await Promise.all([
        fetchWithAuth(API_ENDPOINTS.GET_PROMOTIONS), fetchWithAuth(API_ENDPOINTS.GET_PROMOTION_OPTIONS),
      ]);
      const [promotionsData, optionsData] = await Promise.all([promotionsResponse.json(), optionsResponse.json()]);
      if (!promotionsResponse.ok || !optionsResponse.ok) throw new Error();
      setPromotions(promotionsData.promotions || []); setSchedules(optionsData.schedules || []);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => promotions.filter((item) => status === "all" || item.status === status), [promotions, status]);
  const selectedSchedule = schedules.find((item) => item.schedule_group_id === scheduleId);

  const request = async (url, options, fallback) => {
    const response = await fetchWithAuth(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await request(API_ENDPOINTS.REVIEW_PROMOTION(reviewing.promotion_id), { method: "PATCH", body: JSON.stringify({ decision, funded_by: fundedBy, platform_funding_percentage: platformShare, reason }) }, "Unable to review promotion");
      setReviewing(null); setReason(""); await load();
    } catch (err) { Modal.error({ title: "Promotion was not updated", content: err.message }); } finally { setSaving(false); }
  };

  const createPromotion = async (values) => {
    setSaving(true);
    try {
      const schedule = schedules.find((item) => item.schedule_group_id === values.schedule_group_id);
      await request(API_ENDPOINTS.CREATE_PROMOTION, { method: "POST", body: JSON.stringify({
        ...values, listing_id: schedule.listing_id,
        starts_at: values.dates[0].toISOString(), ends_at: values.dates[1].toISOString(), dates: undefined,
        selected_user_emails: values.selected_user_emails
          ? values.selected_user_emails.split(/[\n,]+/).map((email) => email.trim()).filter(Boolean)
          : [],
      }) }, "Unable to create promotion");
      setCreating(false); form.resetFields(); await load();
    } catch (err) { Modal.error({ title: "Promotion was not created", content: err.message }); } finally { setSaving(false); }
  };

  const changeStatus = async (promotion, nextStatus) => {
    const execute = async (terminationReason = "") => {
      try {
        await request(API_ENDPOINTS.UPDATE_PROMOTION_STATUS(promotion.promotion_id), { method: "PATCH", body: JSON.stringify({ status: nextStatus, reason: terminationReason }) }, "Unable to update promotion");
        await load();
      } catch (err) { Modal.error({ title: "Promotion was not updated", content: err.message }); }
    };
    if (nextStatus !== "terminated") return execute();
    let value = "";
    Modal.confirm({ title: "Terminate this promotion?", content: <Input.TextArea rows={3} placeholder="Reason for termination" onChange={(event) => { value = event.target.value; }} />, okText: "Terminate", okButtonProps: { danger: true }, onOk: () => value.trim() ? execute(value.trim()) : Promise.reject(new Error("Add a reason")) });
  };

  const openReport = async (promotion) => {
    setReport({ promotion, redemptions: [] }); setReportLoading(true);
    try { setReport(await request(API_ENDPOINTS.GET_PROMOTION_REPORT(promotion.promotion_id), {}, "Unable to load report")); }
    catch (err) { setReport(null); Modal.error({ title: "Report could not be loaded", content: err.message }); }
    finally { setReportLoading(false); }
  };

  const reportColumns = [
    { title: "Customer", key: "customer", render: (_, row) => <div className="admin-promotion-customer"><strong>{row.full_name}</strong><span>{row.email}</span></div> },
    { title: "Paid", dataIndex: "charged_credits", render: (value) => `${value} credits` },
    { title: "Junior Pass funded", dataIndex: "platform_funded_credits", render: (value) => `${value} credits` },
    { title: "Partner funded", dataIndex: "partner_funded_credits", render: (value) => `${value} credits` },
    { title: "Redeemed", dataIndex: "created_at", render: (value) => new Date(value).toLocaleString("en-SG") },
  ];

  return <div className="admin-promotions-page">
    <header className="page-header-card admin-promotions-header"><div><Text className="admin-promotions-kicker">Pricing governance</Text><Title level={1} className="page-title">Promotions</Title><Text className="page-subtitle">Create platform offers, review partner submissions and track every redemption.</Text></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>New platform promotion</Button></header>
    {error ? <Alert type="error" showIcon message="Promotions could not be loaded" /> : null}
    <section className="admin-summary-strip" aria-label="Promotion summary"><div><span>Total promotions</span><strong>{promotions.length}</strong></div><div className="summary-warning"><span>Awaiting review</span><strong>{promotions.filter((promotion) => promotion.status === "pending").length}</strong></div><div className="summary-success"><span>Active promotions</span><strong>{promotions.filter((promotion) => promotion.status === "approved").length}</strong></div></section>
    <section className="table-card admin-promotions-panel" aria-busy={loading}>
      <div className="admin-promotions-toolbar"><strong>{visible.length} promotions</strong><Select value={status} onChange={setStatus} options={["all", "pending", "approved", "paused", "rejected", "terminated"].map((value) => ({ value, label: labelize(value) }))} /></div>
      {visible.length ? <div className="admin-promotion-list">{visible.map((promotion) => {
        const platformCost = Number(promotion.partner_credited_credits_total) - Number(promotion.charged_credits_total);
        const partnerCost = Number(promotion.standard_credits_total) - Number(promotion.partner_credited_credits_total);
        return <article className="admin-promotion-card" key={promotion.promotion_id}>
          <div className="admin-promotion-card-heading"><div><strong>{promotion.listing_title}</strong><span>{promotion.partner_name} · {promotion.outlet_name}</span></div><div className="admin-promotion-tags"><Tag>{promotion.submitted_by === "admin" ? "Junior Pass" : "Partner submitted"}</Tag><Tag>{promotion.status}</Tag></div></div>
          <div className="admin-promotion-metrics">
            <div><span>Price</span><strong>{promotion.promotional_credit_cost} credits</strong></div><div><span>Package</span><strong>{labelize(promotion.package_type)}</strong></div><div><span>Redemptions</span><strong>{promotion.redemption_count}/{promotion.max_redemptions}</strong></div><div><span>Per customer</span><strong>{promotion.per_user_redemption_limit}</strong></div><div><span>Eligibility</span><strong>{labelize(promotion.eligibility)}</strong></div><div><span>Funding</span><strong>{labelize(promotion.funded_by || "Not decided")}</strong></div><div><span>Dates</span><strong>{new Date(promotion.starts_at).toLocaleDateString("en-SG")} – {new Date(promotion.ends_at).toLocaleDateString("en-SG")}</strong></div><div><span>Junior Pass cost</span><strong>{platformCost} credits</strong></div><div><span>Partner cost</span><strong>{partnerCost} credits</strong></div>
          </div>
          {promotion.rejection_reason || promotion.termination_reason ? <Alert type="warning" showIcon message={promotion.rejection_reason || promotion.termination_reason} /> : null}
          <div className="admin-promotion-actions"><Button icon={<FileSearchOutlined />} onClick={() => openReport(promotion)}>Report</Button>{promotion.status === "pending" ? <><Button danger icon={<CloseOutlined />} onClick={() => { setDecision("reject"); setReviewing(promotion); }}>Reject</Button><Button type="primary" icon={<CheckOutlined />} onClick={() => { setDecision("approve"); setReviewing(promotion); }}>Review</Button></> : null}{promotion.status === "approved" ? <Button icon={<PauseCircleOutlined />} onClick={() => changeStatus(promotion, "paused")}>Pause</Button> : null}{promotion.status === "paused" ? <Button icon={<PlayCircleOutlined />} onClick={() => changeStatus(promotion, "approved")}>Resume</Button> : null}{["approved", "paused"].includes(promotion.status) ? <Button danger icon={<StopOutlined />} onClick={() => changeStatus(promotion, "terminated")}>Terminate</Button> : null}</div>
        </article>;
      })}</div> : loading ? <div className="admin-promotions-loading">Loading promotions…</div> : <Empty description="No promotions in this view" />}
    </section>

    <Modal open={Boolean(reviewing)} title={decision === "approve" ? "Approve promotion" : "Reject promotion"} onCancel={() => !saving && setReviewing(null)} onOk={submitReview} okText={decision === "approve" ? "Approve" : "Reject"} confirmLoading={saving} className="admin-promotion-modal">{decision === "approve" ? <><Select value={fundedBy} onChange={setFundedBy} options={[{ value: "partner", label: "Partner funded" }, { value: "platform", label: "Junior Pass funded" }, { value: "shared", label: "Shared" }]} />{fundedBy === "shared" ? <div className="admin-promotion-field"><label>Junior Pass share of discount (%)</label><InputNumber min={1} max={99} value={platformShare} onChange={setPlatformShare} /></div> : null}</> : <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Rejection reason" />}</Modal>

    <Modal open={creating} title="New platform promotion" footer={null} onCancel={() => !saving && setCreating(false)} width={760} className="admin-promotion-modal" destroyOnClose>
      <Form form={form} layout="vertical" onFinish={createPromotion} initialValues={{ eligibility: "everyone", funded_by: "platform", max_redemptions: 100, per_user_redemption_limit: 1 }}>
        <Form.Item name="schedule_group_id" label="Class and schedule" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={schedules.map((item) => ({ value: item.schedule_group_id, label: `${item.partner_name} · ${item.listing_title} · ${item.outlet_name}` }))} /></Form.Item>
        <div className="admin-promotion-form-grid">
          <Form.Item name="package_type" label="Eligible package" rules={[{ required: true }]}><Select disabled={!selectedSchedule} options={(selectedSchedule?.package_types || []).map((value) => ({ value, label: labelize(value) }))} /></Form.Item>
          <Form.Item name="promotional_credit_cost" label="Promotional credit price" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item>
          <Form.Item name="dates" label="Start and end" rules={[{ required: true }]}><DatePicker.RangePicker showTime /></Form.Item>
          <Form.Item name="eligibility" label="Eligibility" rules={[{ required: true }]}><Select options={[{ value: "everyone", label: "Everyone" }, { value: "first_time_customer", label: "First-time customer" }, { value: "selected_users", label: "Selected users" }]} /></Form.Item>
          {createEligibility === "selected_users" ? <Form.Item name="selected_user_emails" label="Selected user emails" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="One email per line, or separate with commas" /></Form.Item> : null}
          <Form.Item name="max_redemptions" label="Maximum redemptions" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item>
          <Form.Item name="per_user_redemption_limit" label="Per-user limit" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item>
          <Form.Item name="funded_by" label="Funding source" rules={[{ required: true }]}><Select options={[{ value: "platform", label: "Junior Pass" }, { value: "partner", label: "Partner" }, { value: "shared", label: "Shared" }]} /></Form.Item>
          {createFunding === "shared" ? <Form.Item name="platform_funding_percentage" label="Junior Pass share (%)" rules={[{ required: true }]}><InputNumber min={1} max={99} /></Form.Item> : null}
        </div>
        <div className="admin-promotion-form-actions"><Button onClick={() => setCreating(false)}>Cancel</Button><Button type="primary" htmlType="submit" loading={saving}>Create and activate</Button></div>
      </Form>
    </Modal>

    <Drawer open={Boolean(report)} onClose={() => setReport(null)} title="Promotion report" width={820} className="admin-promotion-report">{report ? <><div className="admin-promotion-report-summary"><div><span>Redemptions</span><strong>{report.promotion.redemption_count}</strong></div><div><span>Customer credits paid</span><strong>{report.promotion.charged_credits_total}</strong></div><div><span>Junior Pass funded</span><strong>{Number(report.promotion.partner_credited_credits_total) - Number(report.promotion.charged_credits_total)}</strong></div><div><span>Partner funded</span><strong>{Number(report.promotion.standard_credits_total) - Number(report.promotion.partner_credited_credits_total)}</strong></div></div><Table rowKey="redemption_id" loading={reportLoading} columns={reportColumns} dataSource={report.redemptions} pagination={{ pageSize: 10 }} scroll={{ x: 720 }} /></> : null}</Drawer>
  </div>;
};

export default Promotions;
