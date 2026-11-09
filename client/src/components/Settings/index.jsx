import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker, Form, InputNumber, Space, Table, Typography, message } from "antd";
import dayjs from "dayjs";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";
import "./styles.css";

const { Title, Paragraph, Text } = Typography;

const Settings = () => {
  const [form] = Form.useForm();
  const [pricingForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [pricingHistory, setPricingHistory] = useState([]);
  const [upcomingPricing, setUpcomingPricing] = useState([]);

  useEffect(() => {
    const loadRate = async () => {
      try {
        const response = await fetchWithAuth(API_ENDPOINTS.CREDIT_CONVERSION);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load rate");
        form.setFieldsValue({
          dollars_per_credit: data.dollars_per_credit,
          effective_from: dayjs(),
        });
        setHistory(data.history || []);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    loadRate();
  }, [form]);

  const loadPricing = useCallback(async () => {
    setPricingLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREDIT_PRICING);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load credit pricing");
      setPricingTiers(data.tiers || []);
      setPricingHistory(data.history || []);
      setUpcomingPricing(data.upcoming || []);
      pricingForm.setFieldsValue({
        rates: Object.fromEntries((data.tiers || []).map((tier) => [tier.key, tier.rate])),
        effective_from: dayjs(),
      });
    } catch (error) {
      message.error(error.message);
    } finally {
      setPricingLoading(false);
    }
  }, [pricingForm]);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const saveRate = async (values) => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREDIT_CONVERSION, {
        method: "PUT",
        body: JSON.stringify({
          dollars_per_credit: values.dollars_per_credit,
          effective_from: values.effective_from.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save rate");
      form.setFieldsValue({
        dollars_per_credit: data.dollars_per_credit,
        effective_from: dayjs(),
      });
      message.success("Credit conversion rate updated");
      setHistory((current) => [
        {
          old_value: data.old_value,
          new_value: data.dollars_per_credit,
          effective_from: data.effective_from,
          changed_at: data.updated_at,
        },
        ...current,
      ]);
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const savePricing = async (values) => {
    setPricingSaving(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.CREDIT_PRICING, {
        method: "PUT",
        body: JSON.stringify({
          rates: values.rates,
          effective_from: values.effective_from.toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save credit pricing");
      message.success("Parent top-up pricing saved");
      await loadPricing();
    } catch (error) {
      message.error(error.message);
    } finally {
      setPricingSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <Title level={2}>Platform Settings</Title>
      <Paragraph type="secondary">
        Manage commercial settings used across partner pricing and parent bookings.
      </Paragraph>
      <Card loading={loading} className="settings-card">
        <Title level={4}>Credit conversion</Title>
        <Paragraph type="secondary">
          Partners enter package prices in dollars. The platform divides that price
          by this rate and rounds up to the next whole credit for parents.
        </Paragraph>
        <Alert
          type="info"
          showIcon
          message="Rate changes apply only to new bookings. Existing bookings retain their original rate."
        />
        <Form form={form} layout="vertical" onFinish={saveRate} className="settings-form">
          <Form.Item
            name="dollars_per_credit"
            label="Partner dollar value per credit"
            rules={[
              { required: true, message: "Enter a conversion rate" },
              { type: "number", min: 0.01, message: "Rate must be greater than zero" },
            ]}
          >
            <InputNumber prefix="$" min={0.01} precision={2} step={0.05} />
          </Form.Item>
          <Form.Item
            name="effective_from"
            label="Effective from"
            rules={[{ required: true, message: "Select an effective date" }]}
          >
            <DatePicker showTime />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>Save rate</Button>
            <Text type="secondary">Example: $1,000 at $9.50/credit = 106 credits</Text>
          </Space>
        </Form>
      </Card>
      <Card loading={pricingLoading} className="settings-card">
        <Title level={4}>Parent top-up pricing</Title>
        <Paragraph type="secondary">
          Set the SGD price paid for each credit. Tier boundaries stay fixed so
          checkout, reporting and published pricing remain consistent.
        </Paragraph>
        <Alert
          type="warning"
          showIcon
          message="Changes affect new payment requests only. Existing payments and wallet balances are unchanged."
        />
        {upcomingPricing.length > 0 && (
          <Alert
            type="info"
            showIcon
            className="settings-upcoming-alert"
            message={`${upcomingPricing.length} scheduled tier change${upcomingPricing.length === 1 ? "" : "s"}`}
          />
        )}
        <Form
          form={pricingForm}
          layout="vertical"
          onFinish={savePricing}
          className="settings-form"
        >
          <div className="settings-tier-grid">
            {pricingTiers.map((tier) => (
              <Form.Item
                key={tier.key}
                name={["rates", tier.key]}
                label={tier.label}
                rules={[
                  { required: true, message: "Enter a rate" },
                  { type: "number", min: 0.01, max: 1000, message: "Enter $0.01–$1,000" },
                ]}
              >
                <InputNumber prefix="$" min={0.01} max={1000} precision={2} step={0.05} />
              </Form.Item>
            ))}
          </div>
          <Form.Item
            name="effective_from"
            label="Effective from"
            rules={[{ required: true, message: "Select an effective date" }]}
          >
            <DatePicker showTime />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={pricingSaving}>
            Save top-up pricing
          </Button>
        </Form>
      </Card>
      <Card className="settings-card" title="Top-up pricing history">
        <Table
          rowKey={(row) => `${row.key}-${row.effective_from}-${row.changed_at}`}
          pagination={{ pageSize: 8 }}
          dataSource={pricingHistory}
          columns={[
            {
              title: "Tier",
              dataIndex: "key",
              render: (key) =>
                pricingTiers.find((tier) => tier.key === key)?.label || key,
            },
            {
              title: "Previous",
              dataIndex: "old_rate",
              render: (value) => (value == null ? "—" : `$${value.toFixed(2)}`),
            },
            {
              title: "New rate",
              dataIndex: "new_rate",
              render: (value) => `$${value.toFixed(2)}`,
            },
            {
              title: "Effective from",
              dataIndex: "effective_from",
              render: (value) => dayjs(value).format("D MMM YYYY, h:mm A"),
            },
          ]}
        />
      </Card>
      <Card className="settings-card" title="Rate history">
        <Table
          rowKey={(row) => `${row.effective_from}-${row.changed_at}`}
          pagination={false}
          dataSource={history}
          columns={[
            {
              title: "Previous",
              dataIndex: "old_value",
              render: (value) => (value == null ? "—" : `$${value.toFixed(2)}`),
            },
            {
              title: "New rate",
              dataIndex: "new_value",
              render: (value) => `$${value.toFixed(2)}`,
            },
            {
              title: "Effective from",
              dataIndex: "effective_from",
              render: (value) => dayjs(value).format("D MMM YYYY, h:mm A"),
            },
            {
              title: "Changed at",
              dataIndex: "changed_at",
              render: (value) => dayjs(value).format("D MMM YYYY, h:mm A"),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Settings;
