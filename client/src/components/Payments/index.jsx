import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Input,
  Select,
  Skeleton,
  Table,
  Tabs,
  Tag,
} from "antd";
import {
  AuditOutlined,
  CreditCardOutlined,
  GiftOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const SECTION_CONFIG = {
  payments: {
    label: "Top-ups",
    statuses: ["ALL", "PENDING", "COMPLETED", "FAILED"],
  },
  transactions: {
    label: "Wallet transactions",
    statuses: ["ALL", "CREDIT", "DEBIT"],
  },
  webhooks: {
    label: "Webhook history",
    statuses: [
      "ALL",
      "RECEIVED",
      "PROCESSED",
      "IGNORED",
      "REJECTED",
      "FAILED",
    ],
  },
  referrals: {
    label: "Referral rewards",
    statuses: ["ALL", "PENDING", "COMPLETED", "EXPIRED", "CANCELLED"],
  },
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(Number(value || 0));

const statusTag = (status) => {
  const value = String(status || "UNKNOWN").toUpperCase();
  return <Tag className={`payment-status payment-status-${value.toLowerCase()}`}>{value}</Tag>;
};

const getRowKey = (section, row) => {
  if (section === "payments") return row.request_id;
  if (section === "transactions") return row.transaction_id;
  if (section === "webhooks") return row.webhook_event_id;
  return row.id;
};

const Payments = () => {
  const [section, setSection] = useState("payments");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const requestSequence = useRef(0);

  const loadWorkspace = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      section,
      status,
      page: String(page),
      limit: "20",
    });
    if (submittedSearch) params.set("search", submittedSearch);

    try {
      const response = await fetchWithAuth(
        `${API_ENDPOINTS.ADMIN_PAYMENTS}?${params.toString()}`,
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load payment data");
      if (requestSequence.current === requestId) setData(result);
    } catch (loadError) {
      if (requestSequence.current === requestId) setError(loadError.message);
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, [page, section, status, submittedSearch]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const columns = useMemo(() => {
    const details = {
      title: "",
      key: "details",
      render: (_, row) => (
        <Button type="link" onClick={() => setSelected(row)}>
          View
        </Button>
      ),
    };

    if (section === "payments") {
      return [
        {
          title: "Parent",
          key: "parent",
          render: (_, row) => (
            <div className="payment-person">
              <strong>{row.user_name}</strong>
              <span>{row.user_email}</span>
            </div>
          ),
        },
        { title: "Amount", dataIndex: "amount", render: formatMoney },
        { title: "Credits", dataIndex: "credits", render: (value) => `${value} credits` },
        { title: "Status", dataIndex: "status", render: statusTag },
        {
          title: "Webhook",
          dataIndex: "webhook_received",
          render: (value) => (value ? "Received" : "Waiting"),
        },
        { title: "Created", dataIndex: "created_at", render: formatDate },
        details,
      ];
    }

    if (section === "transactions") {
      return [
        {
          title: "Parent",
          key: "parent",
          render: (_, row) => (
            <div className="payment-person">
              <strong>{row.user_name}</strong>
              <span>{row.user_email}</span>
            </div>
          ),
        },
        { title: "Movement", dataIndex: "transaction_type", render: statusTag },
        { title: "Credits", dataIndex: "used_credit", render: (value) => `${value} credits` },
        { title: "Source", dataIndex: "source", render: statusTag },
        { title: "Class", dataIndex: "listing_title", render: (value) => value || "—" },
        { title: "Created", dataIndex: "created_at", render: formatDate },
        details,
      ];
    }

    if (section === "webhooks") {
      return [
        { title: "Received", dataIndex: "received_at", render: formatDate },
        { title: "HitPay status", dataIndex: "payment_status", render: statusTag },
        { title: "Processing", dataIndex: "processing_status", render: statusTag },
        {
          title: "Signature",
          dataIndex: "signature_valid",
          render: (value) => statusTag(value ? "VALID" : "INVALID"),
        },
        { title: "Response", dataIndex: "response_code", render: (value) => value || "—" },
        { title: "Parent", dataIndex: "user_email", render: (value) => value || "Unmatched" },
        details,
      ];
    }

    return [
      {
        title: "Referrer",
        key: "referrer",
        render: (_, row) => (
          <div className="payment-person">
            <strong>{row.referrer_name}</strong>
            <span>{row.referrer_email}</span>
          </div>
        ),
      },
      {
        title: "Referred parent",
        key: "referee",
        render: (_, row) => (
          <div className="payment-person">
            <strong>{row.referee_name}</strong>
            <span>{row.referee_email}</span>
          </div>
        ),
      },
      { title: "Status", dataIndex: "status", render: statusTag },
      { title: "Rewarded", dataIndex: "reward_credits", render: (value) => `${value} credits` },
      { title: "Created", dataIndex: "created_at", render: formatDate },
      details,
    ];
  }, [section]);

  const summary = data?.summary;
  const tabs = Object.entries(SECTION_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
  }));

  const changeSection = (nextSection) => {
    setSection(nextSection);
    setStatus("ALL");
    setPage(1);
    setSelected(null);
  };

  const detailItems = selected
    ? Object.entries(selected)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => ({
          key,
          label: key.replaceAll("_", " "),
          children:
            key.endsWith("_at") || key === "created_at" || key === "updated_at"
              ? formatDate(value)
              : typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value),
        }))
    : [];

  return (
    <section className="payments-workspace">
      <header className="payments-heading">
        <div>
          <span className="payments-eyebrow">FINANCE OPERATIONS</span>
          <h1>Payments & transactions</h1>
          <p>Trace every top-up, wallet movement, HitPay callback and referral reward.</p>
        </div>
        <Button onClick={loadWorkspace} loading={loading}>Refresh</Button>
      </header>

      {error && <Alert type="error" showIcon message="Payments could not be loaded" description={error} />}

      <div className="payments-summary" aria-label="Payment summary">
        <article>
          <CreditCardOutlined />
          <div><span>Completed top-ups</span><strong>{formatMoney(summary?.payments?.completed_amount)}</strong></div>
          <small>{summary?.payments?.completed || 0} payments · {summary?.payments?.completed_credits || 0} credits</small>
        </article>
        <article>
          <AuditOutlined />
          <div><span>Needs attention</span><strong>{summary?.payments?.failed || 0}</strong></div>
          <small>{summary?.payments?.pending || 0} pending · {summary?.webhooks?.rejected || 0} rejected callbacks</small>
        </article>
        <article>
          <SwapOutlined />
          <div><span>Wallet movement</span><strong>{summary?.wallet?.credits_in || 0} in</strong></div>
          <small>{summary?.wallet?.credits_out || 0} credits used</small>
        </article>
        <article>
          <GiftOutlined />
          <div><span>Referral rewards</span><strong>{summary?.referrals?.rewarded_credits || 0}</strong></div>
          <small>{summary?.referrals?.completed || 0} completed referrals</small>
        </article>
      </div>

      <div className="payments-panel">
        <Tabs activeKey={section} items={tabs} onChange={changeSection} />
        <div className="payments-toolbar">
          <Input.Search
            value={search}
            allowClear
            placeholder="Search parent, reference or ID"
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => {
              setSubmittedSearch(value.trim());
              setPage(1);
            }}
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={SECTION_CONFIG[section].statuses.map((value) => ({
              value,
              label: value === "ALL" ? "All statuses" : value.replaceAll("_", " "),
            }))}
          />
        </div>

        {loading && !data ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <div className="payments-table">
            <Table
              columns={columns}
              dataSource={data?.items || []}
              loading={loading}
              rowKey={(row) => getRowKey(section, row)}
              pagination={{
                current: data?.pagination?.page || page,
                pageSize: data?.pagination?.limit || 20,
                total: data?.pagination?.total || 0,
                showSizeChanger: false,
                onChange: setPage,
              }}
            />
          </div>
        )}
      </div>

      <Drawer
        title={`${SECTION_CONFIG[section].label} details`}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        <Descriptions column={1} items={detailItems} className="payment-details" />
        <p className="payment-audit-note">
          Raw HitPay payloads, signatures and credentials are never displayed or stored here.
        </p>
      </Drawer>
    </section>
  );
};

export default Payments;
