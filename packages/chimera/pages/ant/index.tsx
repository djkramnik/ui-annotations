"use client";

import { ConfigProvider } from "antd";
import { useRouter } from "next/router";
import { InteractiveLabel } from "ui-labelling-shared";
import { AntRadioGroup } from "../../components/ant/radio";
import AntDatePicker from "../../components/ant/datepicker";
import { randomAntTheme } from "../../components/ant/theme";
import { useMemo } from "react";
import { AntSelectableCard } from "../../components/ant/selectable-card";
import { AntAccordion } from "../../components/ant/accordion";

const AntdComponent = () => {
  const { query } = useRouter();
  const component = String(query.component) as InteractiveLabel;

  switch (component) {
    case InteractiveLabel.accordion:
      return (
        <AntAccordion />
      )
    case InteractiveLabel.selectablecard:
      return (
        <AntSelectableCard />
      )
    case InteractiveLabel.radio:
      return (
        <AntRadioGroup
          title="Gender"
          options={['Male', 'Female', 'Binary', 'Zim']}
          selected={3}
        />
      );
    case InteractiveLabel.datepicker:
      return (
        <AntDatePicker />
      )
    default:
      return null
  }
};

export default function Page() {
  const theme = useMemo(() => randomAntTheme(), [])
  return (
    <ConfigProvider theme={theme} >
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
