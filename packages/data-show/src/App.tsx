import { useState, useEffect, useRef, type ReactNode } from "react";
import "./App.css";
import { Drawer, Button, Tree } from "antd"; // Added Tree import
import Draggable from "react-draggable";
import { MenuOutlined } from "@ant-design/icons";
import { v4 as uuidv4 } from "uuid";
import { useMemoizedFn } from "ahooks";
import { SESSION_STORAGE_KEY } from "../../crx/lib/const.js";

const MAX_TREE_DEPTH = 3;

function App() {
  const [open, setOpen] = useState(false);
  const [grpcData, setGrpcData] = useState<Record<string, any>>({});
  const [treeData, setTreeData] = useState<any[]>([]);
  const nodeRef = useRef(null);

  const loadGrpcData = useMemoizedFn(() => {
    try {
      const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (data) {
        const obj = JSON.parse(data);
        setGrpcData(obj);
        if (Object.keys(obj).length > 0) {
          setTreeData(buildTreeData(obj));
        }
      }
    } catch (e) {
      console.error("Failed to parse grpc data from sessionStorage", e);
    }
  });

  useEffect(() => {
    loadGrpcData();

    window.addEventListener(SESSION_STORAGE_KEY, loadGrpcData);

    return () => {
      window.removeEventListener(SESSION_STORAGE_KEY, loadGrpcData);
    };
  }, []);

  const buildTreeData = (data: Record<string, any>, idx = 1): any[] => {
    const unikey = uuidv4();
    if (
      typeof data !== "object" ||
      data === null ||
      Object.keys(data).length === 0
    ) {
      return [{ title: JSON.stringify(data), key: unikey, isLeaf: true }];
    }

    return Object.entries(data).map(([key, value], index) => {
      const childUnikey = uuidv4();
      const valueStr = JSON.stringify(value);
      const isObjectOrArray = typeof value === "object" && value !== null;

      let title = "";
      if (idx === 1) {
        title = `(${index + 1}) ${value.url}`;
      } else if (idx > MAX_TREE_DEPTH) {
        title = `${key}: ${valueStr}`;
      } else {
        title = `${key}: ${isObjectOrArray ? "" : valueStr}`;
      }

      return {
        title,
        key: childUnikey,
        isLeaf: idx > MAX_TREE_DEPTH || !isObjectOrArray,
        children: isObjectOrArray ? buildTreeData(value, idx + 1) : undefined,
      };
    });
  };

  const updateTreeData = (
    list: any[],
    key: React.Key,
    children: any[],
    idx = 1
  ): any[] => {
    return list.map((node) => {
      if (node.key === key) {
        return {
          ...node,
          children,
        };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeData(node.children, key, children, idx + 1),
        };
      }
      return node;
    });
  };

  const onLoadData = ({ key, children, rawData }: any) =>
    new Promise<void>((resolve) => {
      if (children) {
        resolve();
        return;
      }
      setTreeData((origin) =>
        updateTreeData(origin, key, buildTreeData(rawData))
      );
      resolve();
    });

  const renderContent = (): ReactNode => {
    return (
      <div>
        <h3>gRPC-Web Transformed Data:</h3>
        {Object.keys(grpcData).length > 0 ? (
          <Tree showLine={true} treeData={treeData} loadData={onLoadData} />
        ) : (
          <p>
            No gRPC data available. Please ensure the extension is active and
            data is being transformed.
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <Draggable nodeRef={nodeRef} defaultPosition={{ x: 0, y: 100 }}>
        <div ref={nodeRef} className="draggable-button-container">
          <Button
            type="primary"
            shape="circle"
            icon={<MenuOutlined />}
            size="large"
            onClick={() => setOpen(true)}
          />
        </div>
      </Draggable>
      <Drawer
        width={1200}
        title="gRPC-Web Data Viewer"
        open={open}
        onClose={() => setOpen(false)}
      >
        {renderContent()}
      </Drawer>
    </>
  );
}

export default App;
