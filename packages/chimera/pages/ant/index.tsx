"use client";

import { ConfigProvider } from "antd";
import { useRouter } from "next/router";
import { InteractiveLabel } from "ui-labelling-shared";
import { AntRadioGroup } from "../../components/ant/radio";

const AntdComponent = () => {
  const { query } = useRouter();
  const component = String(query.component) as InteractiveLabel;

  switch (component) {
    case InteractiveLabel.radio:
      return (
        <AntRadioGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={3}
        />
      );
    default:
      return "hi";
  }
};

export default function Page() {
  return (
    <ConfigProvider>
      <div
        style={{
          backgroundColor: "#fafafa", // or use token.colorBgLayout if you configure a theme
          width: "100vw",
          height: "100vh",
        }}
      >
        <div id="wrapper" style={{ width: "fit-content", padding: 16 }}>
          <AntdComponent />
        </div>
      </div>
    </ConfigProvider>
  );
}
