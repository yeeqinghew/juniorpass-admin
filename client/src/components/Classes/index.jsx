import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  ReadOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Paragraph, Text, Title } = Typography;

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const TABLE_PAGINATION = {
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50],
  showSizeChanger: true,
  showTotal: (total, range) => `${range[0]}–${range[1]} of ${total} classes`,
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return [];
};

const getFirstImage = (images) => toArray(images).find(Boolean) || null;

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : "—");

const formatPackageName = (value) =>
  String(value || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `SGD ${amount.toFixed(2)}` : "—";
};

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_CLASSES);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load classes");
      }

      setClasses(Array.isArray(data.listings) ? data.listings : []);
    } catch (requestError) {
      console.error("Unable to load admin classes:", requestError);
      setError(requestError.message || "Unable to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const filteredClasses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return classes.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? item.active : !item.active);

      if (!matchesStatus) return false;
      if (!normalizedSearch) return true;

      const searchableValues = [
        item.listing_title,
        item.partner_name,
        item.partner_email,
        ...toArray(item.categories),
        ...toArray(item.outlets).flatMap((outlet) => [
          outlet.outlet_name,
          outlet.address,
          outlet.nearest_mrt,
        ]),
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(normalizedSearch),
      );
    });
  }, [classes, searchTerm, statusFilter]);

  const summary = useMemo(
    () =>
      classes.reduce(
        (totals, item) => ({
          total: totals.total + 1,
          active: totals.active + (item.active ? 1 : 0),
          outlets: totals.outlets + Number(item.outlet_count || 0),
          schedules: totals.schedules + Number(item.schedule_count || 0),
        }),
        { total: 0, active: 0, outlets: 0, schedules: 0 },
      ),
    [classes],
  );

  const updateLocalStatus = (listingId, active) => {
    setClasses((current) =>
      current.map((item) =>
        item.listing_id === listingId ? { ...item, active } : item,
      ),
    );
    setSelectedClass((current) =>
      current?.listing_id === listingId ? { ...current, active } : current,
    );
  };

  const handleActivate = async (item) => {
    setActionLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.APPROVE_CLASS(item.listing_id),
        { method: "PATCH" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to activate class");

      updateLocalStatus(item.listing_id, true);
      message.success("Class activated");
    } catch (requestError) {
      message.error(requestError.message || "Unable to activate class");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget || !deactivationReason.trim()) return;

    setActionLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.REJECT_CLASS(deactivateTarget.listing_id),
        {
          method: "PATCH",
          body: JSON.stringify({ reason: deactivationReason.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to deactivate class");
      }

      updateLocalStatus(deactivateTarget.listing_id, false);
      setDeactivateTarget(null);
      setDeactivationReason("");
      message.success("Class deactivated");
    } catch (requestError) {
      message.error(requestError.message || "Unable to deactivate class");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: "Class",
      dataIndex: "listing_title",
      key: "class",
      render: (listingTitle, item) => {
        const image = getFirstImage(item.images);
        return (
          <div className="admin-class-cell">
            {image ? (
              <img src={image} alt="" className="admin-class-image" />
            ) : (
              <span className="admin-class-image-placeholder" aria-hidden="true">
                <ReadOutlined />
              </span>
            )}
            <div className="admin-class-copy">
              <Text strong>{listingTitle}</Text>
              <div className="admin-class-categories">
                {toArray(item.categories).length > 0 ? (
                  toArray(item.categories).map((category) => (
                    <Tag key={category} className="admin-class-category-tag">
                      {category}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">No category</Text>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Partner",
      dataIndex: "partner_name",
      key: "partner",
      render: (partnerName, item) => (
        <div className="admin-class-partner">
          <Text strong>{partnerName}</Text>
          <Text type="secondary">{item.partner_email}</Text>
          {item.partner_suspended && (
            <Tag className="admin-class-warning-tag">Partner suspended</Tag>
          )}
        </div>
      ),
    },
    {
      title: "Coverage",
      dataIndex: "outlet_count",
      key: "coverage",
      render: (outletCount, item) => (
        <div className="admin-class-coverage">
          <span>
            <EnvironmentOutlined /> {outletCount} outlets
          </span>
          <span>
            <CalendarOutlined /> {item.schedule_count} time slots
          </span>
        </div>
      ),
    },
    {
      title: "Bookings",
      dataIndex: "booking_count",
      key: "bookings",
      render: (bookingCount, item) => (
        <div className="admin-class-bookings">
          <Text strong>{bookingCount}</Text>
          <Text type="secondary">{item.current_booking_count} current</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "status",
      render: (active) => (
        <Tag
          icon={active ? <CheckCircleOutlined /> : <StopOutlined />}
          className={`admin-class-status ${active ? "is-active" : "is-inactive"}`}
        >
          {active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      dataIndex: "listing_id",
      key: "actions",
      render: (listingId, item) => (
        <div className="admin-class-actions">
          <Button
            icon={<EyeOutlined />}
            onClick={() => setSelectedClass({ ...item, listing_id: listingId })}
          >
            View
          </Button>
          {item.active ? (
            <Button
              className="admin-class-deactivate"
              icon={<StopOutlined />}
              onClick={() => setDeactivateTarget(item)}
            >
              Deactivate
            </Button>
          ) : (
            <Popconfirm
              title="Activate this class?"
              description="It can appear on the customer site when its required information is complete."
              okText="Activate"
              cancelText="Cancel"
              onConfirm={() => handleActivate(item)}
            >
              <Button
                className="admin-class-activate"
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
              >
                Activate
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-container admin-classes-page">
      <div className="page-header-card">
        <div className="page-header">
          <span className="page-kicker">Operations</span>
          <Title level={1} className="page-title">
            Classes
          </Title>
          <Text className="page-subtitle">
            Review class availability, locations, schedules, and booking activity.
          </Text>
        </div>
        <div className="page-record-count">
          <ReadOutlined />
          {summary.total} classes
        </div>
      </div>

      <div className="admin-classes-summary" aria-label="Class operations summary">
        <div>
          <span>Total classes</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>{summary.active}</strong>
        </div>
        <div>
          <span>Linked outlets</span>
          <strong>{summary.outlets}</strong>
        </div>
        <div>
          <span>Weekly time slots</span>
          <strong>{summary.schedules}</strong>
        </div>
      </div>

      {error && (
        <Alert
          className="admin-classes-error"
          type="error"
          showIcon
          message="Classes could not be loaded"
          description={error}
          action={<Button onClick={loadClasses}>Try again</Button>}
        />
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Class operations</h2>
            <p>Search across classes, partners, categories, and locations.</p>
          </div>
          <div className="table-toolbar-actions">
            <Input
              allowClear
              className="table-search"
              prefix={<SearchOutlined />}
              placeholder="Search classes or partners"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select
              className="admin-class-status-filter"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              aria-label="Filter classes by status"
            />
          </div>
        </div>

        <Table
          rowKey="listing_id"
          columns={columns}
          dataSource={filteredClasses}
          loading={loading}
          pagination={TABLE_PAGINATION}
          locale={{ emptyText: <Empty description="No classes match these filters" /> }}
        />
      </div>

      <Drawer
        rootClassName="admin-class-details-drawer"
        title="Class details"
        open={Boolean(selectedClass)}
        onClose={() => setSelectedClass(null)}
      >
        {selectedClass && (
          <div className="admin-class-details">
            <div className="admin-class-details-heading">
              <div>
                <span className="page-kicker">{selectedClass.partner_name}</span>
                <Title level={2}>{selectedClass.listing_title}</Title>
              </div>
              <Tag
                className={`admin-class-status ${selectedClass.active ? "is-active" : "is-inactive"}`}
              >
                {selectedClass.active ? "Active" : "Inactive"}
              </Tag>
            </div>

            <div className="admin-class-detail-grid">
              <div>
                <span>Created</span>
                <strong>{formatDate(selectedClass.created_at)}</strong>
              </div>
              <div>
                <span>Bookings</span>
                <strong>{selectedClass.booking_count}</strong>
              </div>
              <div>
                <span>Outlets</span>
                <strong>{selectedClass.outlet_count}</strong>
              </div>
              <div>
                <span>Time slots</span>
                <strong>{selectedClass.schedule_count}</strong>
              </div>
            </div>

            <section className="admin-class-detail-section">
              <h3>Age groups</h3>
              <div className="admin-class-detail-tags">
                {toArray(selectedClass.age_groups).length > 0 ? (
                  toArray(selectedClass.age_groups).map((ageGroup) => (
                    <Tag key={ageGroup}>{ageGroup}</Tag>
                  ))
                ) : (
                  <Text type="secondary">No age groups configured</Text>
                )}
              </div>
            </section>

            <section className="admin-class-detail-section">
              <div className="admin-class-section-heading">
                <div>
                  <h3>Outlets and schedules</h3>
                  <p>The locations and recurring time slots configured by the partner.</p>
                </div>
              </div>

              <div className="admin-class-outlet-list">
                {toArray(selectedClass.outlets).length > 0 ? (
                  toArray(selectedClass.outlets).map((outlet) => (
                    <article className="admin-class-outlet" key={outlet.outlet_id}>
                      <header>
                        <EnvironmentOutlined />
                        <div>
                          <h4>{outlet.outlet_name || "Unnamed outlet"}</h4>
                          <p>{outlet.address || "No address provided"}</p>
                          {outlet.nearest_mrt && <span>Near {outlet.nearest_mrt}</span>}
                        </div>
                      </header>

                      <div className="admin-class-schedule-list">
                        {toArray(outlet.schedule_groups).length > 0 ? (
                          toArray(outlet.schedule_groups).map((group, groupIndex) => (
                            <div
                              className="admin-class-schedule-group"
                              key={group.schedule_group_id}
                            >
                              <div className="admin-class-schedule-heading">
                                <div>
                                  <h5>Schedule {groupIndex + 1}</h5>
                                  <span>
                                    {group.frequency || "Frequency not set"}
                                    {group.is_progressive ? " · Progressive" : ""}
                                  </span>
                                </div>
                                <div className="admin-class-package-tags">
                                  {toArray(group.package_types).map((packageType) => (
                                    <Tag key={packageType}>
                                      {formatPackageName(packageType)}
                                    </Tag>
                                  ))}
                                </div>
                              </div>

                              <dl className="admin-class-pricing">
                                <div>
                                  <dt>Pay as you go</dt>
                                  <dd>{formatMoney(group.price_payg)}</dd>
                                </div>
                                <div>
                                  <dt>Full term</dt>
                                  <dd>{formatMoney(group.price_fullterm)}</dd>
                                </div>
                                <div>
                                  <dt>Short term</dt>
                                  <dd>{formatMoney(group.price_shortterm)}</dd>
                                </div>
                                <div>
                                  <dt>Term starts</dt>
                                  <dd>{formatDate(group.full_term_start_date)}</dd>
                                </div>
                              </dl>

                              <div className="admin-class-time-slots">
                                {toArray(group.time_slots).length > 0 ? (
                                  toArray(group.time_slots).map((slot) => (
                                    <div key={slot.schedule_id}>
                                      <span>
                                        <ClockCircleOutlined /> {slot.day}
                                      </span>
                                      <strong>
                                        {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                                      </strong>
                                      <span>{slot.slots} places</span>
                                    </div>
                                  ))
                                ) : (
                                  <Text type="secondary">No time slots configured</Text>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No schedules configured for this outlet"
                          />
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty description="No outlets linked to this class" />
                )}
              </div>
            </section>

            {selectedClass.description && (
              <section className="admin-class-detail-section">
                <h3>Description</h3>
                <Paragraph>{selectedClass.description}</Paragraph>
              </section>
            )}

            <div className="admin-class-detail-actions">
              {selectedClass.active ? (
                <Button
                  className="admin-class-deactivate"
                  icon={<StopOutlined />}
                  onClick={() => setDeactivateTarget(selectedClass)}
                >
                  Deactivate class
                </Button>
              ) : (
                <Popconfirm
                  title="Activate this class?"
                  description="Confirm that its information is ready for customers."
                  okText="Activate"
                  cancelText="Cancel"
                  onConfirm={() => handleActivate(selectedClass)}
                >
                  <Button
                    className="admin-class-activate"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading}
                  >
                    Activate class
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        className="admin-class-deactivate-modal"
        title="Deactivate class"
        open={Boolean(deactivateTarget)}
        okText="Deactivate"
        cancelText="Keep active"
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: !deactivationReason.trim() }}
        onOk={handleDeactivate}
        onCancel={() => {
          setDeactivateTarget(null);
          setDeactivationReason("");
        }}
      >
        <Paragraph>
          This removes <strong>{deactivateTarget?.listing_title}</strong> from active
          customer discovery. The partner will receive your reason.
        </Paragraph>
        <label className="admin-class-reason-label" htmlFor="class-deactivation-reason">
          Reason
        </label>
        <Input.TextArea
          id="class-deactivation-reason"
          rows={4}
          maxLength={500}
          showCount
          placeholder="Explain why this class is being deactivated"
          value={deactivationReason}
          onChange={(event) => setDeactivationReason(event.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Classes;
