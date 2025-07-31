import { useState, useEffect, useRef, type ReactNode } from 'react'
import './App.css'
import {Drawer, Button, Tree} from 'antd' // Added Tree import
import Draggable from 'react-draggable';
import { MenuOutlined } from '@ant-design/icons';

function App() {
  const [open, setOpen] = useState(false);
  const [grpcData, setGrpcData] = useState({});
  const nodeRef = useRef(null);

  const SESSION_KEY = "GRPC_WEB_TRANSFORMED";

  const loadGrpcData = () => {
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (data) {
        setGrpcData(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to parse grpc data from sessionStorage", e);
    }
  };

  useEffect(() => {
    loadGrpcData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === SESSION_KEY) {
        loadGrpcData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const buildTreeData = (data: any, parentKey: string = '', isLazyLoad: boolean = false): any[] => {
    if (typeof data !== 'object' || data === null) {
      return [{ key: parentKey, title: String(data), isLeaf: true }];
    }

    if (isLazyLoad && Object.keys(data).length > 0) {
      return [{
        key: parentKey,
        title: `${parentKey.split('-').pop()}: ${Array.isArray(data) ? '[...]' : '{...}'}`,
        children: [],
        isLeaf: false,
      }];
    }

    return Object.entries(data).map(([key, value]) => {
      const currentKey = parentKey ? `${parentKey}-${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return {
          key: currentKey,
          title: `${key}: ${Array.isArray(value) ? '[...]' : '{...}'}`,
          children: buildTreeData(value, currentKey, true),
          isLeaf: false,
        };
      } else {
        return {
          key: currentKey,
          title: `${key}: ${String(value)}`,
          isLeaf: true,
        };
      }
    });
  };

  const findNodeData = (keys: string[], data: any): any => {
    let current = data;
    for (let i = 0; i < keys.length; i++) {
      if (Array.isArray(current)) {
        const index = parseInt(keys[i]);
        if (!isNaN(index) && index < current.length) {
          current = current[index];
        } else {
          return undefined;
        }
      } else if (typeof current === 'object' && current !== null) {
        current = current[keys[i]];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const onLoadData = ({ key }: any) =>
    new Promise<void>(resolve => {
      // Removed the early return condition: if (children && children.length > 0) { resolve(); return; }

      const keys = key.split('-');
      const nodeData = findNodeData(keys, grpcData);

      if (nodeData) {
        const newChildren = buildTreeData(nodeData, key, false);
        setTreeData(prevTreeData => {
          const updateTree = (tree: any[]): any[] => {
            return tree.map(node => {
              if (node.key === key) {
                return { ...node, children: newChildren };
              }
              if (node.children) {
                return { ...node, children: updateTree(node.children) };
              }
              return node;
            });
          };
          return updateTree(prevTreeData);
        });
      }
      resolve();
    });

  const [treeData, setTreeData] = useState<any[]>([]);

  useEffect(() => {
    if (Object.keys(grpcData).length > 0) {
      setTreeData(buildTreeData(grpcData));
    }
  }, [grpcData]);

  const renderContent = (): ReactNode => {
    return (
      <div>
        <h3>gRPC-Web Transformed Data:</h3>
        {Object.keys(grpcData).length > 0 ? (
          <Tree
            showLine={true}
            treeData={treeData}
            loadData={onLoadData}
          />
        ) : (
          <p>No gRPC data available. Please ensure the extension is active and data is being transformed.</p>
        )}
      </div>
    );
  };

  return (
    <>
      <Draggable nodeRef={nodeRef} defaultPosition={{x: 0, y: 100}}>
        <div ref={nodeRef} className="draggable-button-container">
          <Button type="primary" shape="circle" icon={<MenuOutlined />} size="large" onClick={() => setOpen(true)} />
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
  )
}

export default App
