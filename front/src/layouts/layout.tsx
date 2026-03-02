import { Fragment, useState } from 'react';
import { Layout as Lay, Model, TabNode, Action } from 'flexlayout-react';

// --- Panel Components ---
// Notice they are just normal React components taking normal props
function AboutPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      {Array.from({ length: 75 }, (_, i) => (
        <Fragment key={i}>
          <p>scroll</p>
        </Fragment>
      ))}
    </div>
  );
}

function ProjectsPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>h1 test</h1>
      <h2>h2 test</h2>
      <h3>h3 test</h3>
      <h4>h4 test</h4>
      <h5>h5 test</h5>
      <h6>h6 test</h6>
      <p>paragraph</p>
      <p>i am a <a href='https://www.google.com/' target="_blank">hyperlink</a>
      </p>


    </div>
  );
}

// --- Layout Config ---
const defaultLayoutJson = {
  global: {
    tabEnableClose: true,
    tabSetEnableMaximize: false,
  },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 50,
        children: [
          { type: "tab", name: "About", component: "about" }
        ]
      },
      {
        type: "tabset",
        weight: 50,
        children: [
          { type: "tab", name: "Projects", component: "projects" }
        ]
      },
      {
        type: "tabset",
        weight: 50,
        children: [
          { type: "tab", name: "Projects", component: "projects" }
        ]
      },
      {
        type: "tabset",
        weight: 50,
        children: [
          { type: "tab", name: "Projects", component: "projects" }
        ]
      }

    ]
  }
};

export default function Layout() {
  const [model, setModel] = useState(() => {
    const saved = localStorage.getItem('layout');
    if (saved) {
      return Model.fromJson(JSON.parse(saved));
    }
    return Model.fromJson(defaultLayoutJson);
  });

  // Save layout state whenever it changes
  const onModelChange = (currentModel: Model, action: Action) => {
    localStorage.setItem('layout', JSON.stringify(currentModel.toJson()));
  };

  // The factory function: Maps a config string to actual JSX
  const factory = (node: TabNode) => {
    const component = node.getComponent();

    // You can pass the node itself if the panel needs to rename itself or close itself
    if (component === "about") return <AboutPanel />;
    if (component === "projects") return <ProjectsPanel />;

    return <div>Component not found</div>;
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-(--rcolor-highlight)">

      {/* top bar */}
      <div className="flex h-[50px] items-center-safe bg-var(--rcolor-highlight) px-5">
        <h1 >rblackbeard.com</h1>
      </div>

      {/* layout */}
      <div className="relative flex-1 h-full border-t-[7px] border-t-(--rcolor-gap)">
        <Lay
          model={model}
          factory={factory}
          onModelChange={onModelChange}
        />
      </div>

    </div>
  );
}
