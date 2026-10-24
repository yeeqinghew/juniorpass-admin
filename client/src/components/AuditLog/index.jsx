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
  Tag,
} from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const ENTITY_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "credit", label: "Credits" },
  { value: "class", label: "Classes" },
  { value: "account", label: "Accounts" },
  { value: "conversion_rate", label: "Conversion rates" },
  { value: "settlement", label: "Settlements" },
  { value: "promotion", label: "Promotions" },
  { value: "refund", label: "Refunds" },
];

const ACTOR_OPTIONS = [
  { value: "all", label: "All actors" },
  { value: "admin", label: "Admins" },
  { value: "partner", label: "Partners" },
  { value: "user", label: "Parents" },
  { value: "system", label: "System" },
];

const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));

const prettyJson = (value) =>
  value && Object.keys(value).length ? JSON.stringify(value, null, 2) : "No values recorded";

const AuditLog = () => {
  const [entityType, setEntityType] = useState("all");
  const [actorType, setActorType] = useState("all");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const loadAuditLog = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      entity_type: entityType,
      actor_type: actorType,
      page: String(page),
      limit: "25",
    });
    if (submittedSearch) params.set("search", submittedSearch);

    try {
      const response = await fetchWithAuth(
        `${API_ENDPOINTS.AUDIT_LOG}?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load audit log");
      if (requestSequence.current === requestId) setPayload(data);
    } catch (requestError) {
      if (requestSequence.current === requestId) setError(requestError.message);
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, [actorType, entityType, page, submittedSearch]);

  useEffect(() => {
    loadAuditLog();
  }, [loadAuditLog]);

  const columns = useMemo(
    () => [
      {
        title: "When",
        dataIndex: "created_at",
        render: formatDate,
      },
      {
        title: "Actor",
        key: "actor",
        render: (_, event) => (
          <div className="audit-actor">
            <strong>{event.actor_name}</strong>
            <span>{titleCase(event.actor_type)}</span>
          </div>
        ),
      },
      {
        title: "Action",
        dataIndex: "action",
        render: (value) => <strong>{titleCase(value)}</strong>,
      },
      {
        title: "Area",
        dataIndex: "entity_type",
        render: (value) => <Tag className={`audit-entity is-${value}`}>{titleCase(value)}</Tag>,
      },
      {
        title: "Record",
        dataIndex: "entity_id",
        render: (value) => <code className="audit-record-id">{value}</code>,
      },
      {
        title: "",
        key: "view",
        render: (_, event) => (
          <Button icon={<EyeOutlined />} onClick={() => setSelected(event)}>
            Inspect
          </Button>
        ),
      },
    ],
    [],
  );

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <section className="audit-log-page">
      <header className="page-header-card audit-log-header">
        <div>
          <span className="audit-log-kicker">GOVERNANCE</span>
          <h1 className="page-title">Audit log</h1>
          <p className="page-subtitle">Immutable history of sensitive financial, catalogue and account changes.</p>
        </div>
        <Button onClick={loadAuditLog} loading={loading}>Refresh</Button>
      </header>

      {error && <Alert type="error" showIcon message="Audit log could not be loaded" description={error} />}

      <section className="admin-summary-strip" aria-label="Audit log summary">
        <div><span>Total events</span><strong>{payload?.pagination?.total || 0}</strong></div>
        <div><span>Account events</span><strong>{payload?.summary?.account || 0}</strong></div>
        <div><span>Financial events</span><strong>{(payload?.summary?.credit || 0) + (payload?.summary?.settlement || 0)}</strong></div>
      </section>

      <section className="audit-log-panel">
        <div className="audit-log-toolbar">
          <Input.Search
            value={search}
            allowClear
            placeholder="Search action, record ID or actor"
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => {
              setSubmittedSearch(value.trim());
              setPage(1);
            }}
          />
          <Select
            aria-label="Filter audit area"
            value={entityType}
            options={ENTITY_OPTIONS.map((option) => ({
              ...option,
              label: `${option.label}${option.value === "all" ? "" : ` (${payload?.summary?.[option.value] || 0})`}`,
            }))}
            onChange={changeFilter(setEntityType)}
          />
          <Select
            aria-label="Filter actor"
            value={actorType}
            options={ACTOR_OPTIONS}
            onChange={changeFilter(setActorType)}
          />
        </div>

        {loading && !payload ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <div className="audit-log-table">
            <Table
              rowKey="audit_id"
              columns={columns}
              dataSource={payload?.items || []}
              loading={loading}
              pagination={{
                current: payload?.pagination?.page || page,
                pageSize: payload?.pagination?.limit || 25,
                total: payload?.pagination?.total || 0,
                showSizeChanger: false,
                onChange: setPage,
              }}
            />
          </div>
        )}
      </section>

      <Drawer
        title="Audit event details"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="audit-event-details">
            <Descriptions
              column={1}
              items={[
                { key: "actor", label: "Actor", children: `${selected.actor_name} (${titleCase(selected.actor_type)})` },
                { key: "action", label: "Action", children: titleCase(selected.action) },
                { key: "entity", label: "Record", children: `${titleCase(selected.entity_type)} · ${selected.entity_id}` },
                { key: "time", label: "Time", children: formatDate(selected.created_at) },
                { key: "request", label: "Request ID", children: selected.request_id || "—" },
              ]}
            />
            <section>
              <h2>Before</h2>
              <pre>{prettyJson(selected.before_state)}</pre>
            </section>
            <section>
              <h2>After</h2>
              <pre>{prettyJson(selected.after_state)}</pre>
            </section>
            <section>
              <h2>Context</h2>
              <pre>{prettyJson(selected.metadata)}</pre>
            </section>
          </div>
        )}
      </Drawer>
    </section>
  );
};

export default AuditLog;
