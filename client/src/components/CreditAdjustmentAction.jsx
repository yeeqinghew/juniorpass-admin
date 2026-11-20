import { useState } from "react";
import {
  Button,
  Checkbox,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { WalletOutlined } from "@ant-design/icons";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../config/api";
import "./CreditAdjustmentAction.css";

const { Text } = Typography;

const CreditAdjustmentAction = ({ accountType, account, onUpdated }) => {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("credit");
  const [credits, setCredits] = useState(null);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const accountId =
    accountType === "parent" ? account.user_id : account.partner_id;
  const accountName =
    accountType === "parent" ? account.name : account.partner_name;
  const currentBalance = Math.max(0, Number(account.credit) || 0);
  const signedCredits = direction === "credit" ? Number(credits || 0) : -Number(credits || 0);
  const resultingBalance = currentBalance + signedCredits;

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.GET_CREDIT_ADJUSTMENTS(accountType, accountId),
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load adjustment history");
      setHistory(data.adjustments || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const showModal = () => {
    setIdempotencyKey(window.crypto.randomUUID());
    setOpen(true);
    loadHistory();
  };

  const closeModal = (force = false) => {
    if (loading && !force) return;
    setOpen(false);
    setDirection("credit");
    setCredits(null);
    setReason("");
    setReference("");
    setConfirmed(false);
    setHistory([]);
    setIdempotencyKey("");
  };

  const submitAdjustment = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREDIT_ADJUSTMENTS, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          account_type: accountType,
          account_id: accountId,
          direction,
          credits,
          reason: reason.trim(),
          reference: reference.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to adjust credits");
      onUpdated(accountId, { credit: Number(data.account.credit) });
      toast.success(
        data.alreadyApplied
          ? "This adjustment was already applied"
          : "Credit adjustment recorded",
      );
      closeModal(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    Number.isSafeInteger(Number(credits)) &&
    Number(credits) > 0 &&
    resultingBalance >= 0 &&
    reason.trim().length >= 10 &&
    confirmed &&
    Boolean(idempotencyKey);

  return (
    <>
      <Button type="link" icon={<WalletOutlined />} onClick={showModal}>
        Adjust credits
      </Button>
      <Modal
        title={`Adjust credits · ${accountName || account.email}`}
        open={open}
        okText="Apply adjustment"
        okButtonProps={{ disabled: !canSubmit, danger: direction === "debit" }}
        confirmLoading={loading}
        onOk={submitAdjustment}
        onCancel={closeModal}
        width={680}
        centered
        className="credit-adjustment-modal"
      >
        <div className="credit-adjustment-balance" aria-live="polite">
          <div>
            <span>Current balance</span>
            <strong>{currentBalance} credits</strong>
          </div>
          <div>
            <span>Balance after adjustment</span>
            <strong className={resultingBalance < 0 ? "is-invalid" : ""}>
              {resultingBalance} credits
            </strong>
          </div>
        </div>

        <Space direction="vertical" size="middle" className="credit-adjustment-form">
          <div className="credit-adjustment-fields">
            <label>
              <span>Adjustment</span>
              <Select
                value={direction}
                onChange={setDirection}
                options={[
                  { value: "credit", label: "Give credits" },
                  { value: "debit", label: "Deduct credits" },
                ]}
              />
            </label>
            <label>
              <span>Number of credits</span>
              <InputNumber
                min={1}
                max={1_000_000}
                precision={0}
                value={credits}
                onChange={setCredits}
                placeholder="Enter credits"
              />
            </label>
          </div>
          {resultingBalance < 0 && (
            <Text type="danger">
              A deduction cannot make the account balance negative.
            </Text>
          )}
          <label>
            <span>Reason</span>
            <Input.TextArea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              showCount
              placeholder="Required audit reason (at least 10 characters)"
            />
          </label>
          <label>
            <span>Reference</span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={200}
              placeholder="Optional ticket, payment, or support reference"
            />
          </label>
          <Checkbox checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}>
            I have checked the account, amount and reason. This record cannot be edited or deleted.
          </Checkbox>
        </Space>

        <Divider>Recent adjustments</Divider>
        <List
          loading={historyLoading}
          dataSource={history}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No manual adjustments" /> }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={Number(item.credit_delta) > 0 ? "green" : "red"}>
                      {Number(item.credit_delta) > 0 ? "+" : ""}{item.credit_delta} credits
                    </Tag>
                    <Text>{item.balance_before} → {item.balance_after}</Text>
                  </Space>
                }
                description={`${item.reason} · ${item.created_by_name || "Administrator"} · ${new Date(item.created_at).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default CreditAdjustmentAction;
