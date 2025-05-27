"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AVAILABLE_SLD_LAYOUT_IDS } from "@/config/constants";
import {
  CopyOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  DownloadOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import { useLocalStorage } from "@/hooks/useLocalStorage"; // Assuming this is a simple getItem/setItem wrapper
import {
  Typography,
  Select,
  Input,
  Space,
  Button,
  Tooltip,
  message,
  Drawer,
  Modal,
  List,
  Divider,
  Alert,
  Card,
  Row,
  Col,
} from "antd";
import SLDWidget from "@/app/circuit/sld/SLDWidget"; // Corrected path assumption

const { Title, Paragraph,Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// This must match the prefix used inside SLDWidget.tsx
const SLD_WIDGET_LOCAL_STORAGE_KEY_PREFIX = "sldLayout_";

interface SavedCircuit {
  name: string;
  code: string; // This will be the JSON string representation of SLDLayout
  layoutId: string; // The base layoutId used for this circuit
  lastModified: string; // ISO date string
}

export default function CircuitDesignerStudio() {
  const [selectedLayout, setSelectedLayout] = useState<string>(
    AVAILABLE_SLD_LAYOUT_IDS[0]
  );
  const [currentSldCode, setCurrentSldCode] = useState<string>("");
  const [actualLayoutIdFromWidget, setActualLayoutIdFromWidget] = useState<string>(""); // Track the layoutId associated with currentSldCode
  
  const [isDrawerVisible, setIsDrawerVisible] = useState<boolean>(false);
  const [savedCircuits, setSavedCircuits] = useState<SavedCircuit[]>([]);
  const [currentCircuitName, setCurrentCircuitName] = useState<string>("");
  const [sldWidgetRefreshKey, setSldWidgetRefreshKey] = useState<number>(0);

  const sldCodeTextAreaRef = useRef<any>(null); // For AntD TextArea ref

  // Custom hook for localStorage might be:
  // const { setItem, getItem, removeItem } = useLocalStorage();
  // For simplicity, directly using localStorage if useLocalStorage is just a wrapper:
  const getItem = (key: string) => localStorage.getItem(key);
  const setItem = (key: string, value: string) => localStorage.setItem(key, value);

  // Load saved circuits from localStorage on initial mount
  useEffect(() => {
    const savedData = getItem("studio_savedCircuits"); // Using a different key to avoid conflict
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as SavedCircuit[];
        if (
          Array.isArray(parsedData) &&
          parsedData.every(
            (item) =>
              typeof item.name === "string" &&
              typeof item.code === "string" &&
              typeof item.layoutId === "string" &&
              typeof item.lastModified === "string" // Add check for new field
          )
        ) {
          setSavedCircuits(parsedData);
        } else {
          console.warn(
            "Loaded studio_savedCircuits data is invalid, resetting."
          );
          setSavedCircuits([]);
          setItem("studio_savedCircuits", JSON.stringify([]));
        }
      } catch (error) {
        console.error(
          "Failed to parse studio_savedCircuits from localStorage:",
          error
        );
        setSavedCircuits([]);
        setItem("studio_savedCircuits", JSON.stringify([]));
      }
    }
  }, []); // getItem, setItem are stable from localStorage itself

  // Callback from SLDWidget when its internal code representation changes
  const handleSldWidgetCodeChange = useCallback(
    (code: string, layoutId: string) => {
      setCurrentSldCode(code);
      setActualLayoutIdFromWidget(layoutId); 
      // If the loaded code matches a saved circuit, potentially update currentCircuitName.
      // This might be complex if names are not unique or if code is modified.
      // For now, we set currentCircuitName manually or when loading.
    },
    []
  );

  // Copy current SLD code to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!currentSldCode) {
      message.info("No SLD code to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(currentSldCode);
      message.success("SLD code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy SLD code:", err);
      // Fallback for older browsers or if permission denied
      if (sldCodeTextAreaRef.current?.resizableTextArea?.textArea) {
        sldCodeTextAreaRef.current.resizableTextArea.textArea.select();
        document.execCommand("copy"); // Deprecated, but a fallback
        message.success("SLD code copied (fallback method)");
      } else {
        message.error("Failed to copy SLD code.");
      }
    }
  }, [currentSldCode]);

  // Auto-copy SLD code (optional, can be annoying)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (currentSldCode) {
  //       // Consider a less intrusive way, e.g., a small notification "Auto-copied"
  //       // For now, let's keep manual copy as primary and well-indicated.
  //       // copyToClipboard();
  //     }
  //   }, 30000); // 30 seconds
  //   return () => clearInterval(interval);
  // }, [currentSldCode, copyToClipboard]);

  // Save the current design
  const saveCurrentCircuit = () => {
    if (!currentCircuitName.trim()) {
      message.error("Please enter a name for your circuit design.");
      return;
    }
    if (!currentSldCode.trim()) {
      message.error("No SLD data to save. Design your circuit first.");
      return;
    }
    // Ensure we are saving the code associated with the currently selected layout
    if (actualLayoutIdFromWidget !== selectedLayout && actualLayoutIdFromWidget) {
      Modal.confirm({
        title: "Layout Mismatch",
        content: `The current SLD code is for layout "${actualLayoutIdFromWidget}", but you have "${selectedLayout}" selected. Save under "${selectedLayout}"? The SLD data will still reflect its original layout.`,
        onOk: () => proceedWithSave(selectedLayout), // Save with the intended selected layout ID
        // If the user cancels, they might want to switch selectedLayout to actualLayoutIdFromWidget first.
      });
    } else {
       proceedWithSave(selectedLayout);
    }
  };
  
  const proceedWithSave = (layoutIdToSaveWith: string) => {
    const newCircuitData: SavedCircuit = {
      name: currentCircuitName.trim(),
      code: currentSldCode,
      layoutId: layoutIdToSaveWith, // Using the (potentially confirmed) layoutId
      lastModified: new Date().toISOString(),
    };

    setSavedCircuits((prevCircuits) => {
      const existingIndex = prevCircuits.findIndex(
        (c) => c.name === newCircuitData.name
      );
      let updatedCircuits;
      if (existingIndex >= 0) {
        // Confirm overwrite
        Modal.confirm({
            title: 'Overwrite Circuit?',
            content: `A circuit named "${newCircuitData.name}" already exists. Overwrite it?`,
            okText: "Overwrite",
            onOk: () => {
                updatedCircuits = [...prevCircuits];
                updatedCircuits[existingIndex] = newCircuitData;
                setSavedCircuits(updatedCircuits); // Update state first for UI responsiveness
                setItem("studio_savedCircuits", JSON.stringify(updatedCircuits));
                message.success(`Circuit "${newCircuitData.name}" updated successfully.`);
            }
        })
        return prevCircuits; // Return previous if not confirmed immediately. This will be handled async
      } else {
        updatedCircuits = [...prevCircuits, newCircuitData];
        setSavedCircuits(updatedCircuits); // Update state first
        setItem("studio_savedCircuits", JSON.stringify(updatedCircuits));
        message.success(`Circuit "${newCircuitData.name}" saved successfully.`);
        return updatedCircuits;
      }
    });
  }

  // Load a saved circuit
  const loadSavedCircuit = (circuitName: string) => {
    const circuitToLoad = savedCircuits.find((c) => c.name === circuitName);
    if (circuitToLoad) {
      // 1. Update SLDWidget's localStorage for the target layoutId
      // SLDWidget will pick this up when its layoutId/refreshKey changes.
      localStorage.setItem(
        `${SLD_WIDGET_LOCAL_STORAGE_KEY_PREFIX}${circuitToLoad.layoutId}`,
        circuitToLoad.code
      );

      // 2. Update designer's state
      setCurrentCircuitName(circuitToLoad.name);
      
      // 3. Trigger SLDWidget refresh
      // If layoutId is different, SLDWidget's layoutId useEffect handles it.
      // If layoutId is the same, we need refreshKey.
      if (selectedLayout === circuitToLoad.layoutId) {
        setSldWidgetRefreshKey((prev) => prev + 1);
      }
      // This must happen AFTER setSldWidgetRefreshKey if layoutId is same, or it can happen before if layoutId differs
      setSelectedLayout(circuitToLoad.layoutId);

      message.success(`Circuit "${circuitToLoad.name}" loaded. The diagram will update.`);
      setIsDrawerVisible(false);
    } else {
      message.error(`Circuit "${circuitName}" not found.`);
    }
  };

  // Delete a saved circuit
  const deleteSavedCircuit = (circuitName: string) => {
    Modal.confirm({
      title: "Confirm Deletion",
      content: `Are you sure you want to delete the circuit "${circuitName}"? This action cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: () => {
        const newSavedCircuits = savedCircuits.filter(
          (c) => c.name !== circuitName
        );
        setSavedCircuits(newSavedCircuits);
        setItem("studio_savedCircuits", JSON.stringify(newSavedCircuits));
        message.success(`Circuit "${circuitName}" deleted successfully.`);
        if (currentCircuitName === circuitName) {
          setCurrentCircuitName("");
          // Optionally clear SLD code or selected layout if desired.
          // For now, user can start fresh or select another layout.
        }
      },
    });
  };

  // Export all saved circuits from this Studio
  const exportCircuits = () => {
    if (savedCircuits.length === 0) {
      message.info("No circuit designs to export.");
      return;
    }
    const dataStr = JSON.stringify(savedCircuits, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `studio-circuit-designs-${new Date().toISOString().substring(0,10)}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    message.success("All circuit designs exported.");
  };

  // Import circuit designs
  const handleImportCircuits = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as SavedCircuit[];

        if (
          Array.isArray(parsedData) &&
          parsedData.every(
            (item) =>
              item.name &&
              item.code &&
              item.layoutId &&
              item.lastModified &&
              AVAILABLE_SLD_LAYOUT_IDS.includes(item.layoutId) // Also validate layoutId
          )
        ) {
          // Simple merge: Add new, overwrite existing by name.
          const combinedCircuitsMap = new Map<string, SavedCircuit>();
          savedCircuits.forEach(c => combinedCircuitsMap.set(c.name, c));
          parsedData.forEach(c => combinedCircuitsMap.set(c.name, c));
          
          const mergedCircuits = Array.from(combinedCircuitsMap.values());

          setSavedCircuits(mergedCircuits);
          setItem("studio_savedCircuits", JSON.stringify(mergedCircuits));
          message.success(
            `${parsedData.length} circuits imported/updated successfully.`
          );
        } else {
          message.error(
            "Invalid file format or content. Ensure it's a JSON array of valid circuit designs."
          );
        }
      } catch (err) {
        console.error("Import error:", err);
        message.error(
          "Failed to import circuit designs. The file might be corrupted or not valid JSON."
        );
      } finally {
        event.target.value = ""; // Reset file input
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  // Handle manual layout selection change
  const handleLayoutChange = (newLayoutId: string) => {
    if (newLayoutId !== selectedLayout) {
       // If there's unsaved work tied to the currentCircuitName, prompt or handle.
      // For now, assume changing layout implies starting fresh or loading for that layout.
      Modal.confirm({
        title: "Switch Base Layout?",
        content: "Changing the base layout template might discard unsaved work for the current circuit name unless saved. Continue?",
        onOk: () => {
          setSelectedLayout(newLayoutId);
          setCurrentCircuitName(""); // Clear name as it's a new context
          // setCurrentSldCode(""); // SLDWidget will emit new code based on newLayoutId
          // SLDWidget will re-render with the new layoutId, load its data, and emit onCodeChange
        }
      })
    }
  };

  const handleSLDWidgetLayoutChange = (newLayoutId: string) => {
    // This handles if SLDWidget's internal layout switcher is used.
    // It should typically be in sync with `selectedLayout` from CircuitDesigner.
    if (newLayoutId !== selectedLayout) {
        Modal.confirm({
          title: "Layout Switched in Widget",
          content: `The SLD widget's layout changed to "${newLayoutId}". Update the Studio's selected layout to match? This might clear the current circuit name.`,
          okText: "Update Studio Layout",
          onOk: () => {
            setSelectedLayout(newLayoutId);
            setCurrentCircuitName(""); 
            // The widget has already changed its internal state and will emit new code.
          },
          onCancel: () => {
            // If user cancels, SLDWidget is on newLayoutId, but Studio state for selectedLayout is old.
            // This could be confusing. Ideally, one source of truth for layout selection.
            // Forcing SLDWidget back might be an option, or disabling its internal switcher.
            // Simplest: accept SLDWidget's change.
            message.info(`SLD widget is on ${newLayoutId}. Studio selection is ${selectedLayout}. Sync if needed.`);
          }
        });
    }
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <Title level={2} className="mb-2">
        Circuit Designer Studio
      </Title>
      <Paragraph type="secondary" className="mb-6">
        Design, save, and manage your Single Line Diagrams.
      </Paragraph>

      <Row gutter={[24, 24]}>
        {/* Left Column: SLD Widget and Controls */}
        <Col xs={24} lg={16}>
          <Card
            title="SLD Canvas"
            bordered={false}
            extra={
                <Space>
                     <Tooltip title="Base layout template for the SLD">
                        <Select
                            style={{ width: 200 }}
                            value={selectedLayout}
                            onChange={handleLayoutChange}
                        >
                            {AVAILABLE_SLD_LAYOUT_IDS.map((id) => (
                            <Option key={id} value={id}>
                                {id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </Option>
                            ))}
                        </Select>
                    </Tooltip>
                    <Tooltip title="Manage all saved circuit designs">
                        <Button
                        icon={<FolderOpenOutlined />}
                        onClick={() => setIsDrawerVisible(true)}
                        >
                        Designs
                        </Button>
                    </Tooltip>
                </Space>
            }
          >
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                 <Text strong>Current Design:</Text>
                <Space.Compact style={{ width: '100%' }} className="mt-1">
                    <Input
                        placeholder="Enter design name (e.g., 'Site A Solar PV')"
                        value={currentCircuitName}
                        onChange={(e) => setCurrentCircuitName(e.target.value)}
                        allowClear
                    />
                    <Tooltip title="Save current design">
                        <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={saveCurrentCircuit}
                        disabled={!currentCircuitName.trim() || !currentSldCode.trim()}
                        >
                        Save
                        </Button>
                    </Tooltip>
                </Space.Compact>
            </div>
            
            <div
              className="h-[600px] md:h-[700px] border rounded overflow-hidden bg-white relative"
              style={{ minHeight: "500px" }}
            >
              {/* Add a loading overlay or placeholder for SLDWidget if needed */}
              <SLDWidget
                // Key composed of selectedLayout and refreshKey to ensure re-render
                // and re-initialization when either changes.
                key={`${selectedLayout}-${sldWidgetRefreshKey}`}
                layoutId={selectedLayout}
                onCodeChange={handleSldWidgetCodeChange}
                onLayoutIdChange={handleSLDWidgetLayoutChange} // If SLDWidget has its own selector
                isEditMode={true} // This studio is for designing
              />
            </div>
          </Card>
        </Col>

        {/* Right Column: Code Output and Actions */}
        <Col xs={24} lg={8}>
          <Card title="SLD Code & Actions" bordered={false}>
            <Paragraph type="secondary" className="mb-1">
              JSON representation of the current SLD.
            </Paragraph>
            <TextArea
              ref={sldCodeTextAreaRef}
              value={currentSldCode}
              readOnly
              autoSize={{ minRows: 15, maxRows: 20 }}
              className="font-mono text-xs bg-gray-100 border-gray-300"
              placeholder="SLD code will appear here as you design..."
            />
            <Button
              icon={<CopyOutlined />}
              onClick={copyToClipboard}
              disabled={!currentSldCode}
              className="mt-3 w-full"
            >
              Copy Code to Clipboard
            </Button>
            {/* <Paragraph className="mt-2 text-xs text-gray-500 text-center">
              Code is auto-copied every 30s (feature currently paused for UX)
            </Paragraph> */}

            <Divider>Studio Actions</Divider>
            <Space direction="vertical" className="w-full">
                <Button 
                    onClick={exportCircuits} 
                    icon={<ExportOutlined />} 
                    block
                >
                    Export All My Designs
                </Button>
                <label htmlFor="import-studio-designs-file-input" className="sr-only">
                    Import circuit designs
                </label>
                <input
                    id="import-studio-designs-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleImportCircuits}
                    className="hidden"
                    aria-label="Import circuit designs"
                />
                <Button
                    icon={<ImportOutlined />}
                    onClick={() =>
                    document.getElementById("import-studio-designs-file-input")?.click()
                    }
                    block
                >
                    Import My Designs
                </Button>
            </Space>

            <Alert
                className="mt-6"
                type="info"
                showIcon
                icon={<QuestionCircleOutlined />}
                message="About Layouts & Designs"
                description={
                    <ul className="list-disc list-inside text-xs">
                        <li>'Base Layout' is a template from the SLD Widget.</li>
                        <li>'Designs' are your named versions, saved with their SLD code and original base layout ID.</li>
                        <li>SLD Widget may have its own internal save/sync. This Studio saves your named "designs" separately in your browser.</li>
                    </ul>
                }
            />

          </Card>
        </Col>
      </Row>

      {/* Drawer for managing saved circuit designs */}
      <Drawer
        title="My Circuit Designs"
        placement="right"
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        width={Math.min(500, typeof window !== "undefined" ? window.innerWidth * 0.9 : 500)}
      >
        {savedCircuits.length === 0 ? (
          <Paragraph>
            No circuit designs saved yet. Create or import designs.
          </Paragraph>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={savedCircuits.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())} // Sort by most recent
            renderItem={(circuit) => (
              <List.Item
                actions={[
                  <Tooltip title="Load this design" key="load">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      onClick={() => loadSavedCircuit(circuit.name)}
                    />
                  </Tooltip>,
                  <Tooltip title="Delete this design" key="delete">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => deleteSavedCircuit(circuit.name)}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Text strong className={circuit.name === currentCircuitName ? "text-blue-600" : ""}>
                      {circuit.name}
                    </Text>
                  }
                  description={
                    <>
                      Base Layout: {circuit.layoutId.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} <br />
                      Last Modified: {new Date(circuit.lastModified).toLocaleString()}
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </div>
  );
}



