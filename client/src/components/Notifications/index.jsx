import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Pagination,
  Skeleton,
  Tag,
} from "antd";
import {
  BankOutlined,
  CheckOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  FormOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import { AUTH_ROLES } from "../../constants/auth";
import "./index.css";

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "payment_failed", label: "Failed payments" },
  { key: "booking_dispute", label: "Booking disputes" },
  { key: "partner_application", label: "Partner applications" },
  { key: "settlement_deadline", label: "Settlements" },
  { key: "system_failure", label: "System failures" },
];

const ICONS = {
  payment_failed: <CreditCardOutlined />,
  booking_dispute: <ExclamationCircleOutlined />,
  partner_application: <FormOutlined />,
  settlement_deadline: <BankOutlined />,
  system_failure: <WarningOutlined />,
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const notifyHeader = () =>
  window.dispatchEvent(new CustomEvent("admin-notifications-changed"));

const Notifications = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);

  const loadNotifications = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      type: AUTH_ROLES.ADMIN,
      page: String(page),
      limit: "12",
      unread: String(unreadOnly),
    });
    if (category !== "all") params.set("category", category);

    try {
      const response = await fetchWithAuth(
        `${API_ENDPOINTS.NOTIFICATIONS}?${params.toString()}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load notifications");
      if (requestSequence.current === requestId) {
        setPayload(data);
        notifyHeader();
      }
    } catch (requestError) {
      if (requestSequence.current === requestId) setError(requestError.message);
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
    }
  }, [category, page, unreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notificationId) => {
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.MARK_NOTIFICATION_READ(notificationId),
        {
          method: "PATCH",
          body: JSON.stringify({ type: AUTH_ROLES.ADMIN }),
        },
      );
      if (!response.ok) throw new Error("Unable to mark notification as read");
      await loadNotifications();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const markAllRead = async () => {
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.MARK_ALL_NOTIFICATIONS_READ, {
        method: "PATCH",
        body: JSON.stringify({ type: AUTH_ROLES.ADMIN }),
      });
      if (!response.ok) throw new Error("Unable to mark notifications as read");
      if (page === 1) {
        await loadNotifications();
      } else {
        setPage(1);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const chooseCategory = (nextCategory) => {
    setCategory(nextCategory);
    setPage(1);
  };

  return (
    <section className="admin-notifications-page">
      <header className="page-header-card admin-notifications-header">
        <div>
          <span className="admin-notifications-kicker">OPERATIONS INBOX</span>
          <h1 className="page-title">Admin notifications</h1>
          <p className="page-subtitle">Review financial, partner, settlement and platform issues that need attention.</p>
        </div>
        <div className="admin-notifications-header-actions">
          <Button
            onClick={() => {
              setUnreadOnly((value) => !value);
              setPage(1);
            }}
          >
            {unreadOnly ? "Show all" : "Unread only"}
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={!payload?.unread_total}
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        </div>
      </header>

      {error && <Alert type="error" showIcon message="Notifications could not be loaded" description={error} />}

      <section className="admin-summary-strip" aria-label="Notification summary">
        <div><span>All notifications</span><strong>{payload?.all_total || 0}</strong></div>
        <div className="summary-warning"><span>Unread</span><strong>{payload?.unread_total || 0}</strong></div>
        <div><span>System failures</span><strong>{payload?.category_totals?.system_failure || 0}</strong></div>
      </section>

      <nav className="admin-notification-filters" aria-label="Notification categories">
        {CATEGORIES.map((item) => {
          const count = item.key === "all"
            ? payload?.all_total
            : payload?.category_totals?.[item.key];
          return (
            <button
              type="button"
              key={item.key}
              className={category === item.key ? "is-active" : ""}
              aria-pressed={category === item.key}
              onClick={() => chooseCategory(item.key)}
            >
              <span>{item.label}</span>
              <small>{count || 0}</small>
            </button>
          );
        })}
      </nav>

      <section className="admin-notification-list" aria-live="polite">
        {loading && !payload ? (
          <Skeleton active paragraph={{ rows: 7 }} />
        ) : payload?.data?.length ? (
          payload.data.map((notification) => (
            <article
              key={notification.notification_id}
              className={`admin-notification-item ${notification.is_read ? "" : "is-unread"}`}
            >
              <div className={`admin-notification-icon is-${notification.type}`}>
                {ICONS[notification.type] || <ExclamationCircleOutlined />}
              </div>
              <div className="admin-notification-copy">
                <div className="admin-notification-meta">
                  <Tag>{notification.type.replaceAll("_", " ")}</Tag>
                  <time dateTime={notification.created_at}>{formatDate(notification.created_at)}</time>
                </div>
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
              </div>
              <div className="admin-notification-actions">
                {notification.data?.route && (
                  <Button onClick={() => navigate(notification.data.route)}>Open</Button>
                )}
                {!notification.is_read && (
                  <Button type="link" onClick={() => markRead(notification.notification_id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </article>
          ))
        ) : (
          <Empty description="No notifications in this category" />
        )}
      </section>

      {(payload?.total || 0) > (payload?.limit || 12) && (
        <Pagination
          current={payload.page}
          pageSize={payload.limit}
          total={payload.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </section>
  );
};

export default Notifications;
