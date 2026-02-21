import { useState } from 'react';
import { Layout, Model, TabNode, Action } from 'flexlayout-react';

// --- Panel Components ---
// Notice they are just normal React components taking normal props
function AboutPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
      <h1>test test</h1>
      <p>test</p>
    </div>
  );
}

function ProjectsPanel() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>My Projects</h2>
    </div>
  );
}

// --- Layout Config ---
// Very similar to GoldenLayout, but strictly typed and safer
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
        weight: 50, // 30% width
        children: [
          { type: "tab", name: "About", component: "about" }
        ]
      },
      {
        type: "tabset",
        weight: 50, // 70% width
        children: [
          { type: "tab", name: "Projects", component: "projects" }
        ]
      }
    ]
  }
};

// --- Main Shell ---
export default function LayoutShell() {
  // Initialize the model from JSON.
  // In a real app, you'd check localStorage here first.
  const [model, setModel] = useState(() => {
    const saved = localStorage.getItem('flex-layout');
    if (saved) {
      // return Model.fromJson(JSON.parse(saved));
      return Model.fromJson(defaultLayoutJson);
    }
    return Model.fromJson(defaultLayoutJson);
  });

  // Save layout state whenever it changes
  const onModelChange = (currentModel: Model, action: Action) => {
    localStorage.setItem('flex-layout', JSON.stringify(currentModel.toJson()));
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
    // The container must have a relative or absolute position
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#1e1e1e' }}>
      <Layout
        model={model}
        factory={factory}
        onModelChange={onModelChange}
      />
    </div>
  );
}
