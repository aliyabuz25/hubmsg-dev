import { DeleteOutlined, ReloadOutlined, SaveOutlined, SendOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  List,
  message,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import React from "react";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

type DashboardConfig = {
  profile?: {
    username?: string;
    apiKey?: string;
    agreementSigned?: boolean;
  };
  stats?: {
    sessions?: Array<unknown>;
    connectionStatus?: string;
    queuedMessageCount?: number;
    pendingMessages?: number;
    deliveredMessages?: number;
    lastScanned?: string;
  };
  ownerOptions?: Array<{
    username: string;
    label: string;
  }>;
};

type QueueResponse = {
  queue: Array<{
    recipient: string;
    label?: string;
    status?: string;
    deviceId?: string;
    createdAt?: string;
    lastAttempt?: string;
  }>;
  totals?: Record<string, number>;
  total?: number;
};

type MetricsResponse = {
  successRate?: number;
  deliveredCount?: number;
  failedCount?: number;
  blockedCount?: number;
  uniqueRecipients?: number;
  suspendedCount?: number;
  riskyDevices?: Array<{
    id: string;
    label?: string;
    phone?: string;
    suspended?: boolean;
    errorRate?: number;
    consecutiveFailures?: number;
    lastError?: string;
  }>;
};

type SessionItem = {
  id: string;
  label?: string;
  ready?: boolean;
  status?: string;
  statusMessage?: string;
  qr?: string | null;
  owner?: string;
  createdAt?: string;
};

type DeviceItem = {
  id: string;
  label?: string;
  platform?: string;
  phone?: string;
  owner?: string;
  ready?: boolean;
  readyAt?: string;
  health?: {
    suspended?: boolean;
    suspendedReason?: string;
  };
};

type TemplateItem = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
};

type ProfileResponse = {
  username?: string;
  apiKey?: string;
  phoneNumber?: string;
  trustedDevices?: Array<{
    id: string;
    ua?: string;
    ip?: string;
    lastActive?: string;
  }>;
};

type DataState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR");
}

function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : typeof payload === "string"
          ? payload
          : `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

function useRemoteData<T>(loader: () => Promise<T>, deps: React.DependencyList = []) {
  const [state, setState] = React.useState<DataState<T>>({
    data: null,
    loading: true,
    error: "",
  });

  const refresh = React.useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: "" });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, deps);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}

function PageShell({
  title,
  subtitle,
  loading,
  error,
  actions,
  children,
}: React.PropsWithChildren<{
  title: string;
  subtitle: string;
  loading?: boolean;
  error?: string;
  actions?: React.ReactNode;
}>) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type="secondary">{subtitle}</Text>
          </Space>
        </Col>
        <Col>{actions}</Col>
      </Row>
      {error ? <Alert type="error" message={error} showIcon /> : null}
      {loading ? (
        <Card>
          <Space align="center">
            <Spin size="small" />
            <Text>Loading...</Text>
          </Space>
        </Card>
      ) : (
        children
      )}
    </Space>
  );
}

export function DashboardPage() {
  const config = useRemoteData<DashboardConfig>(() => apiFetch("/admin/config"), []);
  const metrics = useRemoteData<MetricsResponse>(() => apiFetch("/admin/ops-metrics"), []);
  const queue = useRemoteData<QueueResponse>(() => apiFetch("/admin/queue"), []);

  const queueColumns: ColumnsType<QueueResponse["queue"][number]> = [
    { title: "Recipient", dataIndex: "recipient", key: "recipient" },
    { title: "Label", dataIndex: "label", key: "label" },
    { title: "Status", dataIndex: "status", key: "status" },
    { title: "Device", dataIndex: "deviceId", key: "deviceId" },
    {
      title: "Updated",
      key: "updatedAt",
      render: (_, record) => formatDate(record.lastAttempt || record.createdAt),
    },
  ];

  const actions = (
    <Button icon={<ReloadOutlined />} onClick={() => {
      config.refresh();
      metrics.refresh();
      queue.refresh();
    }}>
      Refresh
    </Button>
  );

  return (
    <PageShell
      title="Dashboard"
      subtitle="Current queue status, delivery metrics and risky devices."
      loading={config.loading || metrics.loading || queue.loading}
      error={config.error || metrics.error || queue.error}
      actions={actions}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Active sessions" value={config.data?.stats?.sessions?.length || 0} />
            <Text type="secondary">{config.data?.stats?.connectionStatus || "Preparing"}</Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Queued messages" value={config.data?.stats?.queuedMessageCount || 0} />
            <Text type="secondary">
              Pending {config.data?.stats?.pendingMessages || 0} / Delivered {config.data?.stats?.deliveredMessages || 0}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="24h success" value={Number(metrics.data?.successRate || 0)} suffix="%" precision={1} />
            <Text type="secondary">
              {metrics.data?.deliveredCount || 0} delivered / {metrics.data?.failedCount || 0} failed
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="Risky devices" value={metrics.data?.riskyDevices?.length || 0} />
            <Text type="secondary">{metrics.data?.blockedCount || 0} blocked deliveries</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Queue summary">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Waiting">{queue.data?.totals?.queued || 0}</Descriptions.Item>
              <Descriptions.Item label="Sending">{queue.data?.totals?.iletiliyor || 0}</Descriptions.Item>
              <Descriptions.Item label="Delivered">{queue.data?.totals?.iletildi || 0}</Descriptions.Item>
              <Descriptions.Item label="Failed">{queue.data?.totals?.hata || 0}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Risk snapshot">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Unique recipients">{metrics.data?.uniqueRecipients || 0}</Descriptions.Item>
              <Descriptions.Item label="Blocked">{metrics.data?.blockedCount || 0}</Descriptions.Item>
              <Descriptions.Item label="Suspended">{metrics.data?.suspendedCount || 0}</Descriptions.Item>
              <Descriptions.Item label="Last scan">{formatDate(config.data?.stats?.lastScanned)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Latest queue activity">
            <Table
              columns={queueColumns}
              dataSource={queue.data?.queue || []}
              rowKey={(record) => `${record.recipient}-${record.createdAt}`}
              pagination={false}
              locale={{ emptyText: "No queue record." }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Risky devices">
            <List
              dataSource={metrics.data?.riskyDevices || []}
              locale={{ emptyText: "No risky device right now." }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.label || item.id}
                    description={
                      <>
                        <div>{item.phone || item.id}</div>
                        <div>
                          {item.suspended ? "Suspended" : "Monitoring"} • Error rate {formatPercent((item.errorRate || 0) * 100)}
                        </div>
                        <div>{item.lastError || "No recent error"}</div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageShell>
  );
}

export function SessionsPage() {
  const sessions = useRemoteData<{ sessions: SessionItem[] }>(() => apiFetch("/admin/clients"), []);
  const config = useRemoteData<DashboardConfig>(() => apiFetch("/admin/config"), []);
  const [form] = Form.useForm();

  const refreshAll = () => {
    sessions.refresh();
    config.refresh();
  };

  const createSession = async (values: { label: string; owner?: string }) => {
    await apiFetch("/admin/clients", {
      method: "POST",
      body: JSON.stringify(values),
    });
    message.success("Session created.");
    form.resetFields(["label"]);
    refreshAll();
  };

  const refreshSession = async (id: string) => {
    await apiFetch(`/admin/clients/${id}/refresh`, { method: "POST" });
    message.success("Session refreshed.");
    refreshAll();
  };

  const deleteSession = async (id: string) => {
    await apiFetch(`/admin/clients/${id}`, { method: "DELETE" });
    message.success("Session deleted.");
    refreshAll();
  };

  return (
    <PageShell
      title="Sessions"
      subtitle="Create, refresh and manage active WhatsApp sessions."
      loading={sessions.loading || config.loading}
      error={sessions.error || config.error}
      actions={<Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="Create new session">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                label: "Yeni Cihaz",
                owner: config.data?.ownerOptions?.[0]?.username,
              }}
              onFinish={createSession}
            >
              <Form.Item label="Label" name="label" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              {config.data?.ownerOptions?.length ? (
                <Form.Item label="Owner" name="owner">
                  <Select
                    options={config.data.ownerOptions.map((option) => ({
                      label: option.label,
                      value: option.username,
                    }))}
                  />
                </Form.Item>
              ) : null}
              <Button type="primary" htmlType="submit">
                Create session
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="Session list">
            <List
              dataSource={sessions.data?.sessions || []}
              locale={{ emptyText: "No session found." }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="refresh" icon={<ReloadOutlined />} onClick={() => refreshSession(item.id)}>
                      Refresh
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="Delete session?"
                      onConfirm={() => deleteSession(item.id)}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.label || item.id}
                    description={
                      <>
                        <div>ID: {item.id}</div>
                        <div>Status: {item.ready ? "Ready" : item.status || "Preparing"}</div>
                        <div>Owner: {item.owner || "admin"}</div>
                        <div>Created: {formatDate(item.createdAt)}</div>
                        <div>{item.statusMessage || "No status message"}</div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageShell>
  );
}

export function DevicesPage() {
  const devices = useRemoteData<{ devices: DeviceItem[] }>(() => apiFetch("/admin/devices"), []);

  const removeDevice = async (id: string) => {
    await apiFetch(`/admin/devices/${id}`, { method: "DELETE" });
    message.success("Device removed.");
    devices.refresh();
  };

  const columns: ColumnsType<DeviceItem> = [
    { title: "Label", dataIndex: "label", key: "label", render: (_, record) => record.label || record.phone || record.id },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    { title: "Owner", dataIndex: "owner", key: "owner" },
    { title: "Platform", dataIndex: "platform", key: "platform" },
    { title: "Status", key: "status", render: (_, record) => (record.ready ? "Active" : "Passive") },
    { title: "Ready at", key: "readyAt", render: (_, record) => formatDate(record.readyAt) },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Popconfirm title="Remove device?" onConfirm={() => removeDevice(record.id)}>
          <Button danger icon={<DeleteOutlined />}>
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageShell
      title="Devices"
      subtitle="Track connected numbers, owners and current health state."
      loading={devices.loading}
      error={devices.error}
      actions={<Button icon={<ReloadOutlined />} onClick={devices.refresh}>Refresh</Button>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card><Statistic title="Total devices" value={devices.data?.devices?.length || 0} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Ready devices" value={(devices.data?.devices || []).filter((item) => item.ready).length} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Owners" value={new Set((devices.data?.devices || []).map((item) => item.owner || "admin")).size} /></Card>
        </Col>
      </Row>
      <Card title="Connected devices">
        <Table
          columns={columns}
          dataSource={devices.data?.devices || []}
          rowKey="id"
          locale={{ emptyText: "No device connected." }}
        />
      </Card>
    </PageShell>
  );
}

export function CampaignsPage() {
  const queue = useRemoteData<QueueResponse>(() => apiFetch("/admin/queue"), []);
  const templates = useRemoteData<TemplateItem[]>(() => apiFetch("/admin/templates"), []);
  const config = useRemoteData<DashboardConfig>(() => apiFetch("/admin/config"), []);
  const [campaignForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  const refreshAll = () => {
    queue.refresh();
    templates.refresh();
    config.refresh();
  };

  const submitCampaign = async (values: { label: string; recipients: string; message: string }) => {
    const result = await apiFetch<{ message: string }>("/api/admin/message", {
      method: "POST",
      body: JSON.stringify(values),
    });
    message.success(result.message);
    campaignForm.resetFields(["recipients"]);
    refreshAll();
  };

  const saveTemplate = async (values: { id?: string; title: string; content: string }) => {
    await apiFetch("/admin/templates", {
      method: "POST",
      body: JSON.stringify(values),
    });
    message.success("Template saved.");
    templateForm.resetFields();
    templates.refresh();
  };

  const deleteTemplate = async (id: string) => {
    await apiFetch(`/admin/templates/${id}`, { method: "DELETE" });
    message.success("Template deleted.");
    templates.refresh();
  };

  return (
    <PageShell
      title="Campaigns"
      subtitle="Create queue entries, review delivery backlog and manage templates."
      loading={queue.loading || templates.loading || config.loading}
      error={queue.error || templates.error || config.error}
      actions={<Button icon={<ReloadOutlined />} onClick={refreshAll}>Refresh</Button>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Send message">
            <Form
              layout="vertical"
              form={campaignForm}
              initialValues={{ label: "Kampanya", recipients: "", message: "" }}
              onFinish={submitCampaign}
            >
              <Form.Item label="Label" name="label" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Recipients" name="recipients" rules={[{ required: true }]}>
                <TextArea rows={6} placeholder="One phone per line" />
              </Form.Item>
              <Form.Item label="Message" name="message" rules={[{ required: true }]}>
                <TextArea rows={6} />
              </Form.Item>
              <Button type="primary" icon={<SendOutlined />} htmlType="submit">
                Add to queue
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Save template">
            <Form layout="vertical" form={templateForm} onFinish={saveTemplate}>
              <Form.Item name="id" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="Title" name="title" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Content" name="content" rules={[{ required: true }]}>
                <TextArea rows={6} />
              </Form.Item>
              <Space>
                <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                  Save template
                </Button>
                <Button onClick={() => templateForm.resetFields()}>Clear</Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="Queue preview">
            <Table
              dataSource={queue.data?.queue || []}
              rowKey={(record) => `${record.recipient}-${record.createdAt}`}
              pagination={false}
              locale={{ emptyText: "Queue is empty." }}
              columns={[
                { title: "Recipient", dataIndex: "recipient", key: "recipient" },
                { title: "Status", dataIndex: "status", key: "status" },
                { title: "Label", dataIndex: "label", key: "label" },
                { title: "Created", key: "createdAt", render: (_, record) => formatDate(record.createdAt) },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Saved templates">
            <List
              dataSource={templates.data || []}
              locale={{ emptyText: "No template found." }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="apply"
                      onClick={() => {
                        templateForm.setFieldsValue(item);
                        campaignForm.setFieldsValue({
                          label: item.title,
                          message: item.content,
                        });
                      }}
                    >
                      Use
                    </Button>,
                    <Popconfirm key="delete" title="Delete template?" onConfirm={() => deleteTemplate(item.id)}>
                      <Button danger icon={<DeleteOutlined />}>
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <>
                        <Paragraph ellipsis={{ rows: 2 }}>{item.content}</Paragraph>
                        <Text type="secondary">{formatDate(item.createdAt)}</Text>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageShell>
  );
}

export function ProfilePage() {
  const profile = useRemoteData<ProfileResponse>(() => apiFetch("/admin/profile"), []);
  const config = useRemoteData<DashboardConfig>(() => apiFetch("/admin/config"), []);
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (profile.data) {
      form.setFieldsValue({ phoneNumber: profile.data.phoneNumber || "" });
    }
  }, [form, profile.data]);

  const saveProfile = async (values: { phoneNumber: string }) => {
    await apiFetch("/admin/profile", {
      method: "POST",
      body: JSON.stringify(values),
    });
    message.success("Profile updated.");
    profile.refresh();
  };

  const revokeDevice = async (deviceId: string) => {
    await apiFetch("/admin/security/revoke-device", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
    });
    message.success("Trusted device removed.");
    profile.refresh();
  };

  return (
    <PageShell
      title="Profile"
      subtitle="Manage account information and trusted devices."
      loading={profile.loading || config.loading}
      error={profile.error || config.error}
      actions={<Button icon={<ReloadOutlined />} onClick={() => {
        profile.refresh();
        config.refresh();
      }}>Refresh</Button>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="Account">
            <Descriptions column={1} size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Username">{profile.data?.username || "-"}</Descriptions.Item>
              <Descriptions.Item label="API key">{profile.data?.apiKey || "-"}</Descriptions.Item>
              <Descriptions.Item label="Agreement">
                {config.data?.profile?.agreementSigned ? "Signed" : "Pending"}
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical" onFinish={saveProfile}>
              <Form.Item label="Phone number" name="phoneNumber">
                <Input />
              </Form.Item>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit">
                Save profile
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="Trusted devices">
            <List
              dataSource={profile.data?.trustedDevices || []}
              locale={{ emptyText: "No trusted device." }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Popconfirm key="remove" title="Remove trusted device?" onConfirm={() => revokeDevice(item.id)}>
                      <Button danger icon={<DeleteOutlined />}>
                        Remove
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.ua || item.id}
                    description={
                      <>
                        <div>IP: {item.ip || "-"}</div>
                        <div>Last active: {formatDate(item.lastActive)}</div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageShell>
  );
}
