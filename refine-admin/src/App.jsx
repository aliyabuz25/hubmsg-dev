import { Refine } from "@refinedev/core";
import routerProvider, { NavigateToResource } from "@refinedev/react-router";
import dataProvider from "@refinedev/simple-rest";
import { AntdInferencer } from "@refinedev/inferencer/antd";
import { App as AntdApp, ConfigProvider } from "antd";
import {
  ErrorComponent,
  RefineThemes,
  ThemedLayoutV2,
  useNotificationProvider,
} from "@refinedev/antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";

import "@refinedev/antd/dist/reset.css";

const API_URL = "https://api.fake-rest.refine.dev";

function Layout() {
  return (
    <ThemedLayoutV2>
      <Outlet />
    </ThemedLayoutV2>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            dataProvider={dataProvider(API_URL)}
            notificationProvider={useNotificationProvider}
            routerProvider={routerProvider}
            resources={[
              {
                name: "posts",
                list: "/posts",
                create: "/posts/create",
                edit: "/posts/:id/edit",
                show: "/posts/:id",
                meta: {
                  label: "Posts",
                },
              },
              {
                name: "categories",
                list: "/categories",
                create: "/categories/create",
                edit: "/categories/:id/edit",
                show: "/categories/:id",
                meta: {
                  label: "Categories",
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<NavigateToResource resource="posts" />} />

                <Route path="posts">
                  <Route index element={<AntdInferencer />} />
                  <Route path="create" element={<AntdInferencer />} />
                  <Route path=":id" element={<AntdInferencer />} />
                  <Route path=":id/edit" element={<AntdInferencer />} />
                </Route>

                <Route path="categories">
                  <Route index element={<AntdInferencer />} />
                  <Route path="create" element={<AntdInferencer />} />
                  <Route path=":id" element={<AntdInferencer />} />
                  <Route path=":id/edit" element={<AntdInferencer />} />
                </Route>

                <Route path="*" element={<ErrorComponent />} />
              </Route>
            </Routes>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
