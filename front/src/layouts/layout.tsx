import { Fragment, useState, useEffect } from 'react';
import { Layout as Lay, Model, TabNode, Action } from 'flexlayout-react';
import Letterpress from '../components/letterpress';
import About from '../components/about';
import ITF from '../components/itf';

// --- Panel Components ---
function ProjectsPanel() {
  return (
    <div className='p-5'>
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
    tabEnableClose: false,
    tabEnableRename: false,
    tabSetEnableMaximize: false,
  },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 100,
        children: [
          { type: "tab", name: "About", component: "about" },
          { type: "tab", name: "Projects", component: "projects" },
          { type: "tab", name: "Solver", component: "solver" },
          { type: "tab", name: "ITF", component: "itf" },
        ]
      },
    ]
  }
};

export default function Layout() {
  const [model, setModel] = useState(() => Model.fromJson(defaultLayoutJson));

  // Load saved layout from localStorage after mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('layout');
      if (saved) {
        try {
          setModel(Model.fromJson(JSON.parse(saved)));
        } catch (err) {
          console.error('Failed to load saved layout:', err);
        }
      }
    }
  }, []);

  // Save layout state whenever it changes
  const onModelChange = (currentModel: Model, action: Action) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('layout', JSON.stringify(currentModel.toJson()));
    }
  };

  // The factory function: Maps a config string to actual JSX
  const factory = (node: TabNode) => {
    const component = node.getComponent();

    // You can pass the node itself if the panel needs to rename itself or close itself
    if (component === "about") return <About />;
    if (component === "projects") return <ProjectsPanel />;
    if (component === "solver") return <Letterpress />;
    if (component === "itf") return <ITF />;

    return <div>Component not found</div>;
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-(--rcolor-highlight)">

      {/* top bar */}
      <div className="flex h-[50px] items-center-safe bg-var(--rcolor-highlight) px-5">
        <h1 className='text-(--rcolor-2)'>rblackbeard.com</h1>
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
