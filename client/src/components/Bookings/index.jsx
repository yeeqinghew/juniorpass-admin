import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CreditCardOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Search } = Input;
const { Text, Title } = Typography;
const PAGE_SIZE = 20;

const EMPTY_SUMMARY = {
  total: 0,
  upcoming: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "In progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const getBookingPolicy = (booking) => {
  let snapshot = booking?.policy_snapshot;
  if (typeof snapshot === "string") {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      snapshot = null;
    }
  }

  return {
    cancellation_notice_hours: Number(
      snapshot?.cancellation_notice_hours ?? 24,
    ),
    refund_before_deadline_percent: Number(
      snapshot?.refund_before_deadline_percent ?? 100,
    ),
    refund_after_deadline_percent: Number(
      snapshot?.refund_after_deadline_percent ?? 0,
    ),
    makeup_allowed: snapshot?.makeup_allowed === true,
    makeup_notice_hours: Number(snapshot?.makeup_notice_hours ?? 24),
    class_requirements: snapshot?.class_requirements || "",
  };
};

const getAuthorizedPickups = (booking) => {
  const pickups = booking?.authorized_pickups;
  if (Array.isArray(pickups)) return pickups;
  if (typeof pickups !== "string") return [];
  try {
    const parsed = JSON.parse(pickups);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getStatusPresentation = (status) => {
  switch (status) {
    case "upcoming":
      return {
        label: "Upcoming",
        className: "is-info",
      };
    case "in_progress":
      return {
        label: "In progress",
        className: "is-warning",
      };
    case "completed":
      return {
        label: "Completed",
        className: "is-success",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "is-error",
      };
    case "rescheduled":
      return {
        label: "Rescheduled",
        className: "is-info",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        className: "is-info",
      };
    default:
      return {
        label: "Unknown",
        className: "is-neutral",
      };
  }
};

const StatusTag = ({ status }) => {
  const presentation = getStatusPresentation(status);
  return (
    <Tag className={`admin-status-tag ${presentation.className}`}>
      {presentation.label}
    </Tag>
  );
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : "—");

const formatPackageName = (value) =>
  String(value || "Not recorded")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const formatBookingReference = (value) =>
  value ? `#${String(value).slice(0, 8).toUpperCase()}` : "—";

const formatCredits = (value) => {
  if (value === null || value === undefined) return "Not captured";
  const credits = Number(value);
  return Number.isFinite(credits)
    ? `${credits} credit${credits === 1 ? "" : "s"}`
    : "Not captured";
};

const formatSettlementValue = (credits, rate) => {
  if (credits === null || credits === undefined || !rate) return "—";
  const amount = Number(credits) * Number(rate);
  return Number.isFinite(amount) ? `SGD ${amount.toFixed(2)}` : "—";
};

const getChildAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPending =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate());
  if (birthdayPending) age -= 1;
  return Math.max(age, 0);
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        status,
      });
      if (search) params.set("search", search);

      const response = await fetchWithAuth(
        `${API_ENDPOINTS.GET_ADMIN_BOOKINGS}?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load bookings");
      }

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setPagination((current) => ({
        ...current,
        ...(data.pagination || {}),
      }));
    } catch (requestError) {
      console.error("Unable to load admin bookings:", requestError);
      setError(requestError.message || "Unable to load bookings");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const applySearch = (value) => {
    setSearch(String(value || "").trim());
    setPage(1);
  };

  const updateSearchInput = (event) => {
    const value = event.target.value;
    setSearchInput(value);
    if (!value) applySearch("");
  };

  const updateStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const columns = [
    {
      title: "Booking",
      dataIndex: "booking_id",
      key: "booking",
      render: (bookingId, booking) => (
        <div className="admin-booking-reference">
          <Text strong>{formatBookingReference(bookingId)}</Text>
          <Text type="secondary">Booked {formatDate(booking.created_at)}</Text>
        </div>
      ),
    },
    {
      title: "Class",
      dataIndex: "listing_title",
      key: "class",
      render: (listingTitle, booking) => (
        <div className="admin-booking-class">
          <Text strong>{listingTitle}</Text>
          <Text type="secondary">{booking.partner_name}</Text>
          <span>
            <EnvironmentOutlined /> {booking.outlet_name || "No outlet"}
          </span>
        </div>
      ),
    },
    {
      title: "Family",
      dataIndex: "child_name",
      key: "family",
      render: (childName, booking) => (
        <div className="admin-booking-family">
          <Text strong>{childName || "No child recorded"}</Text>
          <Text type="secondary">
            {booking.parent_name || "Unnamed parent"}
          </Text>
          <Text type="secondary">{booking.parent_email}</Text>
        </div>
      ),
    },
    {
      title: "Schedule",
      dataIndex: "start_date",
      key: "schedule",
      render: (startDate, booking) => (
        <div className="admin-booking-schedule">
          <Text strong>{formatDateTime(startDate)}</Text>
          <Text type="secondary">
            {booking.classes_total || booking.occurrence_count || 0} sessions
          </Text>
        </div>
      ),
    },
    {
      title: "Package",
      dataIndex: "enrolled_package_type",
      key: "package",
      render: (packageType, booking) => (
        <div className="admin-booking-package">
          <Text strong>{formatPackageName(packageType)}</Text>
          <Text type="secondary">{formatCredits(booking.charged_credits)}</Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "booking_status",
      key: "status",
      render: (bookingStatus) => <StatusTag status={bookingStatus} />,
    },
    {
      title: "Action",
      key: "action",
      render: (_, booking) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => setSelectedBooking(booking)}
        >
          View
        </Button>
      ),
    },
  ];

  const childAge = selectedBooking
    ? getChildAge(selectedBooking.child_date_of_birth)
    : null;
  const remainingClasses = selectedBooking
    ? (selectedBooking.classes_remaining ??
      Math.max(
        Number(selectedBooking.classes_total || 0) -
          Number(selectedBooking.classes_attended || 0),
        0,
      ))
    : 0;
  const selectedPolicy = getBookingPolicy(selectedBooking);
  const selectedAuthorizedPickups = getAuthorizedPickups(selectedBooking);
  const cancellationDeadline = selectedBooking
    ? new Date(
        new Date(selectedBooking.start_date).getTime() -
          selectedPolicy.cancellation_notice_hours * 60 * 60 * 1000,
      )
    : null;

  return (
    <div className="page-container admin-bookings-page">
      <div className="page-header-card">
        <div className="page-header">
          <span className="page-kicker">Operations</span>
          <Title level={1} className="page-title">
            Bookings
          </Title>
          <Text className="page-subtitle">
            Review enrolments, family details, credits, and class-session
            history.
          </Text>
        </div>
        <div className="page-record-count">
          <CalendarOutlined />
          {summary.total} bookings
        </div>
      </div>

      <div
        className="admin-summary-strip"
        aria-label="Booking operations summary"
      >
        <div>
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Upcoming</span>
          <strong>{summary.upcoming}</strong>
        </div>
        <div>
          <span>In progress</span>
          <strong>{summary.in_progress}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{summary.completed}</strong>
        </div>
        <div>
          <span>Cancelled</span>
          <strong>{summary.cancelled}</strong>
        </div>
      </div>

      {error && (
        <Alert
          className="admin-bookings-error"
          type="error"
          showIcon
          message="Bookings could not be loaded"
          description={error}
          action={<Button onClick={loadBookings}>Try again</Button>}
        />
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Booking records</h2>
            <p>Search by booking, class, family, partner, or outlet.</p>
          </div>
          <div className="table-toolbar-actions">
            <Search
              allowClear
              className="table-search"
              placeholder="Search bookings"
              value={searchInput}
              onChange={updateSearchInput}
              onSearch={applySearch}
              enterButton
            />
            <Select
              className="admin-booking-status-filter"
              options={STATUS_OPTIONS}
              value={status}
              onChange={updateStatus}
              aria-label="Filter bookings by status"
            />
          </div>
        </div>

        <Table
          rowKey="booking_id"
          columns={columns}
          dataSource={bookings}
          loading={loading}
          pagination={false}
          locale={{
            emptyText: <Empty description="No bookings match these filters" />,
          }}
        />

        {pagination.total > PAGE_SIZE && (
          <div className="admin-bookings-pagination">
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={pagination.total}
              showSizeChanger={false}
              showTotal={(total, range) =>
                `${range[0]}–${range[1]} of ${total} bookings`
              }
              onChange={setPage}
            />
          </div>
        )}
      </div>

      <Drawer
        rootClassName="admin-booking-details-drawer"
        title="Booking details"
        open={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
      >
        {selectedBooking && (
          <div className="admin-booking-details">
            <div className="admin-booking-details-heading">
              <div>
                <span className="page-kicker">
                  {formatBookingReference(selectedBooking.booking_id)}
                </span>
                <Title level={2}>{selectedBooking.listing_title}</Title>
                <Text>{selectedBooking.partner_name}</Text>
              </div>
              <StatusTag status={selectedBooking.booking_status} />
            </div>

            <div className="admin-booking-detail-grid">
              <div>
                <span>Booked</span>
                <strong>{formatDateTime(selectedBooking.created_at)}</strong>
              </div>
              <div>
                <span>Package</span>
                <strong>
                  {formatPackageName(selectedBooking.enrolled_package_type)}
                </strong>
              </div>
              <div>
                <span>Credits charged</span>
                <strong>
                  {formatCredits(selectedBooking.charged_credits)}
                </strong>
              </div>
              <div>
                <span>Sessions remaining</span>
                <strong>{remainingClasses}</strong>
              </div>
            </div>

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <UserOutlined />
                <div>
                  <h3>Family</h3>
                  <p>Parent and attending child</p>
                </div>
              </div>
              <dl className="admin-booking-detail-list">
                <div>
                  <dt>Parent</dt>
                  <dd>{selectedBooking.parent_name || "Unnamed parent"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selectedBooking.parent_email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selectedBooking.parent_phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Child</dt>
                  <dd>{selectedBooking.child_name || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{formatDate(selectedBooking.child_date_of_birth)}</dd>
                </div>
                <div>
                  <dt>Age</dt>
                  <dd>
                    {childAge === null ? "Not available" : `${childAge} years`}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <SafetyCertificateOutlined />
                <div>
                  <h3>Child safety information</h3>
                  <p>
                    Visible only to authorised staff supporting this booking
                  </p>
                </div>
              </div>
              <dl className="admin-booking-detail-list">
                <div>
                  <dt>Emergency contact</dt>
                  <dd>
                    {selectedBooking.emergency_contact_name || "Not provided"}
                    {selectedBooking.emergency_contact_relationship
                      ? ` · ${selectedBooking.emergency_contact_relationship}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Emergency phone</dt>
                  <dd>
                    {selectedBooking.emergency_contact_phone || "Not provided"}
                  </dd>
                </div>
                <div className="admin-booking-detail-wide">
                  <dt>Allergies, medical and care notes</dt>
                  <dd className="admin-booking-safety-notes">
                    {selectedBooking.child_safety_notes || "None declared"}
                  </dd>
                </div>
                <div className="admin-booking-detail-wide">
                  <dt>Authorised pickup people</dt>
                  <dd>
                    {selectedAuthorizedPickups.length > 0
                      ? selectedAuthorizedPickups
                          .map((pickup) =>
                            [pickup.name, pickup.relationship, pickup.phone]
                              .filter(Boolean)
                              .join(" · "),
                          )
                          .join("; ")
                      : "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>Safety details updated</dt>
                  <dd>{formatDateTime(selectedBooking.safety_updated_at)}</dd>
                </div>
                <div>
                  <dt>Acknowledgement accepted</dt>
                  <dd>
                    {formatDateTime(selectedBooking.waiver_acknowledged_at)}
                  </dd>
                </div>
              </dl>
            </section>

            {selectedBooking.makeup_requests?.length > 0 && (
              <section className="admin-booking-detail-section">
                <div className="admin-booking-section-heading">
                  <SwapOutlined />
                  <div>
                    <h3>Make-up request history</h3>
                    <p>
                      Parent requests and partner responses for this booking
                    </p>
                  </div>
                </div>
                <div className="admin-makeup-requests">
                  {selectedBooking.makeup_requests.map((request) => (
                    <article
                      className="admin-makeup-request"
                      key={request.request_id}
                    >
                      <div className="admin-makeup-request-heading">
                        <strong>
                          {formatDateTime(request.original_start_date)}
                        </strong>
                        <Tag
                          className={`admin-status-tag ${
                            request.status === "confirmed"
                              ? "is-success"
                              : request.status === "rejected"
                                ? "is-error"
                                : request.status === "offered"
                                  ? "is-info"
                                  : request.status === "withdrawn"
                                    ? "is-neutral"
                                    : "is-warning"
                          }`}
                        >
                          {titleCase(request.status)}
                        </Tag>
                      </div>
                      <dl className="admin-booking-detail-list">
                        <div>
                          <dt>Requested</dt>
                          <dd>{formatDateTime(request.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Offered date</dt>
                          <dd>{formatDateTime(request.offered_start_date)}</dd>
                        </div>
                        <div className="admin-booking-detail-wide">
                          <dt>Parent reason</dt>
                          <dd>{request.reason || "No reason provided"}</dd>
                        </div>
                        {request.partner_response && (
                          <div className="admin-booking-detail-wide">
                            <dt>Partner response</dt>
                            <dd>{request.partner_response}</dd>
                          </div>
                        )}
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <EnvironmentOutlined />
                <div>
                  <h3>Class and location</h3>
                  <p>Partner, schedule, and booked outlet</p>
                </div>
              </div>
              <dl className="admin-booking-detail-list">
                <div>
                  <dt>Class</dt>
                  <dd>{selectedBooking.listing_title}</dd>
                </div>
                <div>
                  <dt>Partner</dt>
                  <dd>{selectedBooking.partner_name}</dd>
                </div>
                <div>
                  <dt>Outlet</dt>
                  <dd>{selectedBooking.outlet_name || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{selectedBooking.outlet_address || "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Regular slot</dt>
                  <dd>
                    {selectedBooking.schedule_day || "—"},{" "}
                    {formatTime(selectedBooking.schedule_start_time)}–
                    {formatTime(selectedBooking.schedule_end_time)}
                  </dd>
                </div>
                <div>
                  <dt>Booking period</dt>
                  <dd>
                    {formatDateTime(selectedBooking.start_date)} –{" "}
                    {formatDateTime(selectedBooking.end_date)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <CreditCardOutlined />
                <div>
                  <h3>Credits</h3>
                  <p>Commercial values captured when the booking was made</p>
                </div>
              </div>
              <dl className="admin-booking-detail-list">
                <div>
                  <dt>Charged</dt>
                  <dd>{formatCredits(selectedBooking.charged_credits)}</dd>
                </div>
                <div>
                  <dt>Captured rate</dt>
                  <dd>
                    {selectedBooking.dollars_per_credit
                      ? `SGD ${Number(selectedBooking.dollars_per_credit).toFixed(2)}`
                      : "Not captured"}
                  </dd>
                </div>
                <div>
                  <dt>Settlement value</dt>
                  <dd>
                    {formatSettlementValue(
                      selectedBooking.charged_credits,
                      selectedBooking.dollars_per_credit,
                    )}
                  </dd>
                </div>
                {selectedBooking.status === "cancelled" && (
                  <>
                    <div>
                      <dt>Credits refunded</dt>
                      <dd>{formatCredits(selectedBooking.refunded_credits)}</dd>
                    </div>
                    <div>
                      <dt>Cancelled</dt>
                      <dd>{formatDateTime(selectedBooking.cancelled_at)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </section>

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <SafetyCertificateOutlined />
                <div>
                  <h3>Booking policy</h3>
                  <p>Terms captured when the booking was confirmed</p>
                </div>
              </div>
              <dl className="admin-booking-detail-list">
                <div>
                  <dt>Cancellation deadline</dt>
                  <dd>{formatDateTime(cancellationDeadline)}</dd>
                </div>
                <div>
                  <dt>Refund before deadline</dt>
                  <dd>{selectedPolicy.refund_before_deadline_percent}%</dd>
                </div>
                <div>
                  <dt>Refund after deadline</dt>
                  <dd>{selectedPolicy.refund_after_deadline_percent}%</dd>
                </div>
                <div>
                  <dt>Make-up requests</dt>
                  <dd>
                    {selectedPolicy.makeup_allowed
                      ? `Allowed with ${selectedPolicy.makeup_notice_hours} hours’ notice`
                      : "Not allowed"}
                  </dd>
                </div>
                <div className="admin-booking-detail-wide">
                  <dt>Class requirements</dt>
                  <dd>
                    {selectedPolicy.class_requirements ||
                      "No additional requirements provided"}
                  </dd>
                </div>
                {selectedBooking.cancellation_reason && (
                  <div className="admin-booking-detail-wide">
                    <dt>Cancellation reason</dt>
                    <dd>{selectedBooking.cancellation_reason}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="admin-booking-detail-section">
              <div className="admin-booking-section-heading">
                <TeamOutlined />
                <div>
                  <h3>Session history</h3>
                  <p>
                    {selectedBooking.occurrence_count} recorded class sessions
                  </p>
                </div>
              </div>

              {selectedBooking.occurrences?.length ? (
                <div className="admin-booking-occurrences">
                  {selectedBooking.occurrences.map((occurrence) => (
                    <article
                      className="admin-booking-occurrence"
                      key={occurrence.occurrence_id}
                    >
                      <div>
                        <strong>Session {occurrence.occurrence_number}</strong>
                        <span>{formatDateTime(occurrence.scheduled_date)}</span>
                        {occurrence.cancellation_reason && (
                          <small>{occurrence.cancellation_reason}</small>
                        )}
                      </div>
                      <div className="admin-booking-occurrence-status">
                        <StatusTag status={occurrence.status} />
                        {occurrence.attended && <span>Attended</span>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty description="No session history was recorded" />
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Bookings;
