import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Empty, Input, Modal, Select, Tag, Typography } from "antd";
import { CheckOutlined, CloseOutlined, PercentageOutlined } from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./index.css";

const { Text, Title } = Typography;

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState("pending");
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [fundedBy, setFundedBy] = useState("partner");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_PROMOTIONS);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load promotions");
      setPromotions(data.promotions || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const visiblePromotions = useMemo(
    () => promotions.filter((promotion) => status === "all" || promotion.status === status),
    [promotions, status],
  );

  const submitReview = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.REVIEW_PROMOTION(reviewing.promotion_id),
        {
          method: "PATCH",
          body: JSON.stringify({
            decision,
            funded_by: decision === "approve" ? fundedBy : null,
            reason: decision === "reject" ? reason : "",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to review promotion");
      setReviewing(null);
      setReason("");
      await loadPromotions();
    } catch (reviewError) {
      Modal.error({ title: "Promotion was not updated", content: reviewError.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-promotions-page">
      <header className="admin-promotions-header">
        <div>
          <Text className="admin-promotions-kicker">Pricing governance</Text>
          <Title level={1}>Promotions</Title>
          <Text>Approve limited partner offers and decide who funds each discount.</Text>
        </div>
        <span className="admin-promotions-header-icon"><PercentageOutlined /></span>
      </header>

      {error ? <Alert type="error" showIcon message="Promotions could not be loaded" /> : null}

      <section className="admin-promotions-panel" aria-busy={loading}>
        <div className="admin-promotions-toolbar">
          <strong>{visiblePromotions.length} promotions</strong>
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "pending", label: "Pending approval" },
              { value: "approved", label: "Approved" },
              { value: "paused", label: "Paused" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All statuses" },
            ]}
          />
        </div>
        {visiblePromotions.length > 0 ? (
          <div className="admin-promotion-list">
            {visiblePromotions.map((promotion) => (
              <article className="admin-promotion-card" key={promotion.promotion_id}>
                <div className="admin-promotion-card-heading">
                  <div>
                    <strong>{promotion.listing_title}</strong>
                    <span>{promotion.partner_name} · {promotion.outlet_name}</span>
                  </div>
                  <Tag>{promotion.status}</Tag>
                </div>
                <div className="admin-promotion-metrics">
                  <div><span>Promotional price</span><strong>{promotion.promotional_credit_cost} credits</strong></div>
                  <div><span>Package</span><strong>{promotion.package_type.replaceAll("-", " ")}</strong></div>
                  <div><span>Redemptions</span><strong>{promotion.redemption_count}/{promotion.max_redemptions}</strong></div>
                  <div><span>Eligibility</span><strong>{promotion.eligibility.replaceAll("_", " ")}</strong></div>
                  <div><span>Dates</span><strong>{new Date(promotion.starts_at).toLocaleDateString("en-SG")} – {new Date(promotion.ends_at).toLocaleDateString("en-SG")}</strong></div>
                  <div><span>Funding</span><strong>{promotion.funded_by || "Not decided"}</strong></div>
                </div>
                {promotion.rejection_reason ? (
                  <Alert type="warning" showIcon message="Rejection reason" description={promotion.rejection_reason} />
                ) : null}
                {promotion.status === "pending" ? (
                  <div className="admin-promotion-actions">
                    <Button
                      icon={<CloseOutlined />}
                      danger
                      onClick={() => {
                        setDecision("reject");
                        setReviewing(promotion);
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => {
                        setDecision("approve");
                        setReviewing(promotion);
                      }}
                    >
                      Review and approve
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : loading ? (
          <div className="admin-promotions-loading">Loading promotions…</div>
        ) : (
          <Empty description="No promotions in this view" />
        )}
      </section>

      <Modal
        open={Boolean(reviewing)}
        title={decision === "approve" ? "Approve promotion" : "Reject promotion"}
        onCancel={() => {
          if (!saving) setReviewing(null);
        }}
        onOk={submitReview}
        okText={decision === "approve" ? "Approve promotion" : "Reject promotion"}
        okButtonProps={{
          danger: decision === "reject",
          disabled: decision === "reject" && !reason.trim(),
        }}
        confirmLoading={saving}
        className="admin-promotion-modal"
      >
        {decision === "approve" ? (
          <>
            <p>Choose whose settlement balance absorbs the difference from the standard price.</p>
            <Select
              value={fundedBy}
              onChange={setFundedBy}
              options={[
                { value: "partner", label: "Partner funded" },
                { value: "platform", label: "JuniorPASS platform funded" },
              ]}
            />
            <Alert
              type="info"
              showIcon
              message={
                fundedBy === "partner"
                  ? "Partner receives only the promotional credits."
                  : "Parent pays the promotional credits; partner receives the standard credits."
              }
            />
          </>
        ) : (
          <Input.TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            showCount
            placeholder="Explain why this promotion cannot be approved…"
          />
        )}
      </Modal>
    </div>
  );
};

export default Promotions;
