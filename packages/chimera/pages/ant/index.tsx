import { ConfigProvider } from "antd";
import { useRouter } from "next/router";
import { InteractiveLabel } from "ui-labelling-shared";
import { AntRadioGroup } from "../../components/ant/radio";
import { AntDatePicker } from "../../components/ant/datepicker";
import { randomAntTheme } from "../../components/ant/theme";
import { useEffect, useState } from "react";
import { AntAccordion } from "../../components/ant/accordion";
import { AntTextarea } from "../../components/ant/textarea";
import { AntToggle } from "../../components/ant/toggle";
import { AntSlider } from "../../components/ant/slider";
import { AntAvatar } from "../../components/ant/avatar";
import { AntPagination } from "../../components/ant/pagination";
import { AntDropdown } from "../../components/ant/dropdown";
import { AntTextInput } from "../../components/ant/textinput";
import { AntButtonSet } from "../../components/ant/button";
import { AntIconsGrid } from "../../components/ant/icon";
import { AntCheckboxGroup } from "../../components/ant/checkbox";
import {
  applyPreferredFamily,
  loadInlineFontBundleStyles,
  loadRandomFontBundle,
} from "../../util/font-bundle";

const AntdComponent = () => {
  const { query } = useRouter();
  const component = String(query.component) as InteractiveLabel;

  switch (component) {
    case InteractiveLabel.checkbox:
      return (
        <AntCheckboxGroup
            title="Gender"
            options={['Male', 'Female', 'Binary', 'Zim']}
            selected={[3]}
        />
      )
    case InteractiveLabel.iconbutton:
      return <AntIconsGrid />
    case InteractiveLabel.button:
      return <AntButtonSet />
    case InteractiveLabel.textinput:
      return <AntTextInput />
    case InteractiveLabel.dropdown:
      return <AntDropdown />
    case InteractiveLabel.dropdown_menu:
      return <AntDropdown open={true} />
    case InteractiveLabel.pagination:
      return <AntPagination />
    case InteractiveLabel.avatar:
      return <AntAvatar />
    case InteractiveLabel.slider:
      return (<AntSlider />)
    case InteractiveLabel.toggle:
      return (
        <AntToggle />
      )
    case InteractiveLabel.textarea:
      return (
        <AntTextarea />
      )
    case InteractiveLabel.accordion:
      return (
        <AntAccordion />
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
    case InteractiveLabel.calendar:
      return (
        <AntDatePicker open={true} />
      )
    default:
      return null
  }
};

export default function Page() {
  const [theme, setTheme] = useState(() => randomAntTheme());

  useEffect(() => {
    let mounted = true;

    async function loadFontTheme(): Promise<void> {
      const bundle = await loadRandomFontBundle();
      if (!bundle) {
        console.warn("[chimera] No font bundles available from /api/fonts/random");
        if (mounted) {
          setTheme(randomAntTheme());
        }
        return;
      }

      const { slug, family, cssText, manifest } = bundle;
      console.log(`[chimera] Using font bundle id: ${bundle.id}`);
      console.log(`[chimera] Using font folder: ${slug || "(none)"}`);
      console.log(`[chimera] Selected font family: ${family}`);

      try {
        loadInlineFontBundleStyles(cssText);
        if (!mounted) {
          return;
        }
        setTheme(randomAntTheme(applyPreferredFamily(manifest, family)));
      } catch (_error) {
        if (mounted) {
          setTheme(randomAntTheme());
        }
      }
    }

    void loadFontTheme();

    return () => {
      mounted = false;
    };
  }, []);

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
