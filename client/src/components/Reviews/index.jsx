import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Rate, Select, Tag, Typography } from "antd";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Text, Title } = Typography;

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("all");
  const [moderating, setModerating] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_REVIEWS);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load reviews");
      setReviews(data.reviews || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const visibleReviews = useMemo(
    () => reviews.filter((review) => status === "all" || review.status === status),
    [reviews, status],
  );

  const updateStatus = async (review, nextStatus, moderationReason = "") => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.MODERATE_REVIEW(review.review_id),
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus, reason: moderationReason }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update review");
      setModerating(null);
      setReason("");
      await loadReviews();
    } catch (updateError) {
      Modal.error({ title: "Review was not updated", content: updateError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-reviews-page">
      <header className="page-header-card admin-reviews-header">
        <div>
          <Text className="admin-reviews-kicker">Trust and quality</Text>
          <Title level={1} className="page-title">Reviews</Title>
          <Text className="page-subtitle">Moderate verified booking reviews and partner responses.</Text>
        </div>
      </header>

      <section className="admin-summary-strip" aria-label="Review summary">
        <div><span>Total reviews</span><strong>{reviews.length}</strong></div>
        <div className="summary-success"><span>Published</span><strong>{reviews.filter((review) => review.status === "published").length}</strong></div>
        <div className="summary-warning"><span>Hidden</span><strong>{reviews.filter((review) => review.status === "hidden").length}</strong></div>
      </section>

      {error ? <Alert type="error" showIcon message="Reviews could not be loaded" /> : null}

      <section className="table-card admin-reviews-panel" aria-busy={loading}>
        <div className="admin-reviews-toolbar">
          <strong>{visibleReviews.length} reviews</strong>
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: "All statuses", value: "all" },
              { label: "Published", value: "published" },
              { label: "Hidden", value: "hidden" },
            ]}
          />
        </div>
        {visibleReviews.length > 0 ? (
          <div className="admin-review-list">
            {visibleReviews.map((review) => (
              <article className="admin-review-card" key={review.review_id}>
                <div className="admin-review-card-heading">
                  <div>
                    <strong>{review.listing_title}</strong>
                    <span>{review.partner_name} · {review.reviewer_name} ({review.reviewer_email})</span>
                  </div>
                  <div className="admin-review-rating">
                    <Rate disabled value={review.rating} />
                    <Tag
                      className={`admin-status-tag ${
                        review.status === "published" ? "is-success" : "is-warning"
                      }`}
                    >
                      {review.status}
                    </Tag>
                  </div>
                </div>
                {review.tags?.length > 0 ? (
                  <div className="admin-review-tags">
                    {review.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  </div>
                ) : null}
                <p>{review.comment || "No written comment."}</p>
                {review.partner_reply ? (
                  <div className="admin-review-reply">
                    <strong>Partner response</strong>
                    <p>{review.partner_reply}</p>
                  </div>
                ) : null}
                {review.status === "hidden" ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Moderation reason"
                    description={review.moderation_reason}
                  />
                ) : null}
                <div className="admin-review-actions">
                  {review.status === "published" ? (
                    <Button
                      danger
                      icon={<EyeInvisibleOutlined />}
                      onClick={() => setModerating(review)}
                    >
                      Hide review
                    </Button>
                  ) : (
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => updateStatus(review, "published")}
                    >
                      Publish review
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : loading ? (
          <div className="admin-review-loading">Loading reviews…</div>
        ) : (
          <Empty description="No reviews in this view" />
        )}
      </section>

      <Modal
        open={Boolean(moderating)}
        title="Hide review"
        onCancel={() => {
          if (saving) return;
          setModerating(null);
          setReason("");
        }}
        onOk={() => updateStatus(moderating, "hidden", reason)}
        okText="Hide review"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        confirmLoading={saving}
        className="admin-review-modal"
      >
        <p>The reason is shown to the partner but not publicly.</p>
        <Input.TextArea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          maxLength={500}
          showCount
          placeholder="Explain why this review violates the review guidelines…"
        />
      </Modal>
    </div>
  );
};

export default Reviews;
