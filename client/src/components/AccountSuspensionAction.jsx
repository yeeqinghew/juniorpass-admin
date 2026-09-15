import { useState } from "react";
import { Button, DatePicker, Input, Modal, Space, Typography } from "antd";
import toast from "react-hot-toast";
import { API_ENDPOINTS, fetchWithAuth } from "../config/api";
import { isSuspensionActive } from "../utils/accountSuspension";
import "./AccountSuspensionAction.css";

const { Text } = Typography;

const AccountSuspensionAction = ({ accountType, account, onUpdated }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const active = isSuspensionActive(account);
  const accountId = accountType === "parent" ? account.user_id : account.partner_id;

  const updateSuspension = async (suspended, acknowledge = false) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_ACCOUNT_SUSPENSION(accountType, accountId),
        {
          method: "PATCH",
          body: JSON.stringify({
            suspended,
            reason: reason.trim(),
            expires_at: expiresAt?.toISOString() || null,
            acknowledge_upcoming_bookings: acknowledge,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (
        response.status === 409 &&
        data.code === "UPCOMING_BOOKINGS_ACKNOWLEDGEMENT_REQUIRED"
      ) {
        setUpcomingBookings(data.upcoming_booking_count);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to update account");
      onUpdated(accountId, data);
      setOpen(false);
      setReason("");
      setExpiresAt(null);
      setUpcomingBookings(0);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const restore = () => {
    Modal.confirm({
      title: "Restore this account?",
      content: "The account will regain portal access immediately.",
      okText: "Restore account",
      centered: true,
      onOk: () => updateSuspension(false, true),
    });
  };

  return (
    <>
      <Button danger={!active} type={active ? "default" : "link"} onClick={active ? restore : () => setOpen(true)}>
        {active ? "Restore" : "Suspend"}
      </Button>
      <Modal
        title={`Suspend ${accountType} account`}
        open={open}
        okText={upcomingBookings ? "Suspend anyway" : "Review suspension"}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        confirmLoading={loading}
        onOk={() => updateSuspension(true, upcomingBookings > 0)}
        onCancel={() => {
          setOpen(false);
          setUpcomingBookings(0);
        }}
        centered
      >
        <Space direction="vertical" size="middle" className="suspension-form">
          <Text>
            This immediately blocks login and existing sessions.
            {accountType === "partner" ? " Its listings will be hidden from families." : ""}
          </Text>
          {upcomingBookings > 0 && (
            <Text type="danger" strong>
              This account has {upcomingBookings} upcoming booking{upcomingBookings === 1 ? "" : "s"}. Confirm that they will be handled.
            </Text>
          )}
          <Input.TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required suspension reason"
            maxLength={1000}
            showCount
            rows={4}
          />
          <DatePicker
            showTime
            value={expiresAt}
            onChange={setExpiresAt}
            placeholder="Optional automatic expiry"
            disabledDate={(date) => date?.endOf("day").isBefore(new Date())}
          />
        </Space>
      </Modal>
    </>
  );
};

export default AccountSuspensionAction;
