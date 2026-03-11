import {
  DashboardOutlined,
  LaptopOutlined,
  MessageOutlined,
  MobileOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { RefineThemes, ThemedLayout, ThemedTitleV2 } from "@refinedev/antd";
import { Refine } from "@refinedev/core";
import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, ConfigProvider } from "antd";
import { HashRouter, Outlet, Route, Routes } from "react-router";

import "@ant-design/v5-patch-for-react-19";
import "@refinedev/antd/dist/reset.css";
import "./index.css";

import { CustomSider } from "./components";
import {
  CampaignsPage,
  DashboardPage,
  DevicesPage,
  ProfilePage,
  SessionsPage,
} from "./pages/hubmsg";

const App = () => {
  return (
    <HashRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            resources={[
              {
                name: "dashboard",
                list: "/dashboard",
                meta: {
                  label: "Dashboard",
                  icon: <DashboardOutlined />,
                },
              },
              {
                name: "sessions",
                list: "/sessions",
                meta: {
                  label: "Sessions",
                  icon: <MobileOutlined />,
                },
              },
              {
                name: "devices",
                list: "/devices",
                meta: {
                  label: "Devices",
                  icon: <LaptopOutlined />,
                },
              },
              {
                name: "campaigns",
                list: "/campaigns",
                meta: {
                  label: "Campaigns",
                  icon: <MessageOutlined />,
                },
              },
              {
                name: "profile",
                list: "/profile",
                meta: {
                  label: "Profile",
                  icon: <UserOutlined />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <ThemedLayout
                    Title={(titleProps) => (
                      <ThemedTitleV2 {...titleProps} text="HubMSG" />
                    )}
                    Sider={({ Title, meta, render }) => (
                      <CustomSider Title={Title} meta={meta} render={render} />
                    )}
                  >
                    <Outlet />
                  </ThemedLayout>
                }
              >
                <Route index element={<NavigateToResource resource="dashboard" />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </HashRouter>
  );
};

export default App;
