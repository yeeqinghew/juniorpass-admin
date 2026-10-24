import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import {
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { API_ENDPOINTS, fetchWithAuth } from "../../config/api";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ENDPOINTS.GET_ALL_CATEGORIES);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    form.setFieldsValue({
      name: "",
      display_order:
        categories.reduce(
          (highest, category) => Math.max(highest, category.display_order),
          -1,
        ) + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      display_order: category.display_order,
    });
    setModalOpen(true);
  };

  const saveCategory = async (values) => {
    setSaving(true);
    try {
      const response = await fetchWithAuth(
        editingCategory
          ? API_ENDPOINTS.UPDATE_CATEGORY(editingCategory.id)
          : API_ENDPOINTS.CREATE_CATEGORY,
        {
          method: editingCategory ? "PATCH" : "POST",
          body: JSON.stringify(values),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save category");

      message.success(
        editingCategory ? "Category updated" : "Category created",
      );
      setModalOpen(false);
      form.resetFields();
      await loadCategories();
    } catch (error) {
      message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const setCategoryActive = async (category, isActive) => {
    try {
      const response = await fetchWithAuth(
        API_ENDPOINTS.UPDATE_CATEGORY(category.id),
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update category");
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id ? { ...item, is_active: isActive } : item,
        ),
      );
      message.success(isActive ? "Category activated" : "Category deactivated");
    } catch (error) {
      message.error(error.message);
    }
  };

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((category) =>
      [category.name, category.slug].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [categories, searchTerm]);

  const columns = [
    {
      title: "Category",
      dataIndex: "name",
      render: (name, category) => (
        <div>
          <strong>{name}</strong>
          <div className="category-slug">/{category.slug}</div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 130,
      render: (isActive) => (
        <Tag className={`admin-status-tag ${isActive ? "is-success" : "is-neutral"}`}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Partners",
      dataIndex: "partner_count",
      width: 110,
    },
    {
      title: "Classes",
      dataIndex: "listing_count",
      width: 110,
    },
    {
      title: "Order",
      dataIndex: "display_order",
      width: 90,
    },
    {
      title: "Available",
      width: 110,
      render: (_, category) => (
        <Switch
          checked={category.is_active}
          aria-label={`${category.is_active ? "Deactivate" : "Activate"} ${category.name}`}
          onChange={(checked) => setCategoryActive(category, checked)}
        />
      ),
    },
    {
      title: "Actions",
      width: 105,
      render: (_, category) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => openEditModal(category)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header-card page-actions">
        <div className="page-header">
          <span className="page-kicker">Catalogue settings</span>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            Control the categories partners can assign to their business and classes.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="page-primary-action"
          onClick={openCreateModal}
        >
          Add category
        </Button>
      </div>

      <section className="admin-summary-strip" aria-label="Category catalogue summary">
        <div>
          <span>Total categories</span>
          <strong>{categories.length}</strong>
        </div>
        <div className="summary-success">
          <span>Active categories</span>
          <strong>{categories.filter((category) => category.is_active).length}</strong>
        </div>
        <div>
          <span>Class assignments</span>
          <strong>{categories.reduce((total, category) => total + Number(category.listing_count || 0), 0)}</strong>
        </div>
      </section>

      <div className="table-card">
        <div className="table-toolbar">
          <div>
            <h2>Category catalogue</h2>
            <p>Deactivate categories instead of deleting categories in use.</p>
          </div>
          <div className="table-toolbar-actions">
            <div className="page-record-count compact">
              <TagsOutlined /> {categories.length} total
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search categories"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="table-search"
            />
          </div>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filteredCategories}
          columns={columns}
          pagination={false}
          scroll={{ x: 820 }}
        />
      </div>

      <Modal
        title={editingCategory ? "Edit category" : "Add category"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingCategory ? "Save changes" : "Add category"}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={saveCategory}>
          <Form.Item
            name="name"
            label="Category name"
            rules={[
              { required: true, message: "Enter a category name" },
              { min: 2, max: 60, message: "Use between 2 and 60 characters" },
            ]}
          >
            <Input placeholder="e.g. Arts & Crafts" maxLength={60} />
          </Form.Item>
          <Form.Item
            name="display_order"
            label="Display order"
            rules={[
              { required: true, message: "Enter a display order" },
              {
                type: "number",
                min: 0,
                message: "Display order cannot be negative",
              },
            ]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categories;
