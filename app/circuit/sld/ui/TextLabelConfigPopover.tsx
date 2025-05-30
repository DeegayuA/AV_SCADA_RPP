// app/circuit/sld/ui/TextLabelConfigPopover.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Palette, TextQuote, AlignLeft, AlignCenter, AlignRight, Baseline, CaseSensitive, Blend } from 'lucide-react';
import { TextNodeStyleConfig, TextLabelNodeData } from '@/types/sld';
import { Node } from 'reactflow';

interface TextLabelConfigPopoverProps {
  node: Node<TextLabelNodeData>;
  onUpdateNodeStyle: (newStyleConfig: TextNodeStyleConfig) => void;
  onUpdateNodeLabel?: (newLabel: string) => void;
  onUpdateNodeText?: (newText: string) => void;
  children: React.ReactElement; // MODIFIED: Changed from React.ReactNode
  isEditMode: boolean;
}

const fontSizes = [
  { label: "X-Small (10px)", value: "10px" },
  { label: "Small (12px)", value: "12px" },
  { label: "Normal (14px)", value: "14px" },
  { label: "Medium (16px)", value: "16px" },
  { label: "Large (18px)", value: "18px" },
  { label: "X-Large (24px)", value: "24px" },
  { label: "Custom", value: "custom" },
];

const fontWeights = [
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Light", value: "300" },
];

const textAlignments: { value: 'left' | 'center' | 'right' | 'justify'; icon: React.ElementType; label: string }[] = [
  { value: 'left', icon: AlignLeft, label: 'Left' },
  { value: 'center', icon: AlignCenter, label: 'Center' },
  { value: 'right', icon: AlignRight, label: 'Right' },
];

export const TextLabelConfigPopover: React.FC<TextLabelConfigPopoverProps> = ({
  node,
  onUpdateNodeStyle,
  onUpdateNodeLabel,
  onUpdateNodeText,
  children,
  isEditMode
}) => {
  const initialStyles = node.data.styleConfig || {};
  const [fontSize, setFontSize] = useState(initialStyles.fontSize || '14px');
  const [customFontSize, setCustomFontSize] = useState(
    fontSizes.some(fs => fs.value === initialStyles.fontSize) ? '' : initialStyles.fontSize || ''
  );
  const [textColor, setTextColor] = useState(initialStyles.color || '#000000');
  const [fontWeight, setFontWeight] = useState(initialStyles.fontWeight?.toString() || 'normal');
  const [fontStyle, setFontStyle] = useState<string>(initialStyles.fontStyle || 'normal');
  const [textAlign, setTextAlign] = useState(initialStyles.textAlign || 'left');
  const [backgroundColor, setBackgroundColor] = useState(initialStyles.backgroundColor || 'transparent');
  const [padding, setPadding] = useState(initialStyles.padding || '2px 4px');

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && node.data.styleConfig) {
      const currentStyles = node.data.styleConfig;
      setFontSize(currentStyles.fontSize || '14px');
      setCustomFontSize(fontSizes.some(fs => fs.value === currentStyles.fontSize) ? '' : currentStyles.fontSize || '');
      setTextColor(currentStyles.color || '#000000');
      setFontWeight(currentStyles.fontWeight?.toString() || 'normal');
      setFontStyle(currentStyles.fontStyle || 'normal');
      setTextAlign(currentStyles.textAlign || 'left');
      setBackgroundColor(currentStyles.backgroundColor || 'transparent');
      setPadding(currentStyles.padding || '2px 4px');
    }
  }, [isOpen, node.data.styleConfig]);


  const handleStyleChange = () => {
    const newStyle: TextNodeStyleConfig = {
      fontSize: fontSize === 'custom' ? customFontSize : fontSize,
      color: textColor,
      fontWeight: fontWeight as TextNodeStyleConfig['fontWeight'],
      fontStyle: fontStyle as TextNodeStyleConfig['fontStyle'],
      textAlign: textAlign as TextNodeStyleConfig['textAlign'],
      backgroundColor: backgroundColor,
      padding: padding,
    };
    onUpdateNodeStyle(newStyle);
  };

  useEffect(() => {
    if(isOpen) handleStyleChange();
  }, [fontSize, customFontSize, textColor, fontWeight, fontStyle, textAlign, backgroundColor, padding]);

  if (!isEditMode) {
    // When not in edit mode, children prop is rendered directly.
    // Wrap in a fragment if it helps ensure a single return node, though often not strictly necessary here.
    return <>{children}</>;
  }

  // --- MODIFIED SECTION: Runtime guard for children ---
  // `PopoverTrigger asChild` requires its `children` prop to be a single, valid React element.
  const isSingleValidChild = React.isValidElement(children) && React.Children.count(children) === 1;

  if (!isSingleValidChild) {
    console.error(
      "[TextLabelConfigPopover] Runtime Error: `PopoverTrigger asChild` expected a single React element child for its `children` prop, but received an invalid value. ",
      "Received children:", children,
      "Count:", React.Children.count(children),
      "isValidElement:", React.isValidElement(children)
    );
    // Fallback: Render the children directly without Popover functionality to prevent a crash.
    // This makes the popover inaccessible if children are invalid but keeps the app running.
    // You might choose a different fallback based on UX needs (e.g., render nothing, or an error indicator).
    return <>{children}</>;
  }
  // --- END MODIFIED SECTION ---

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-80 z-50 shadow-2xl bg-card border-border rounded-lg p-0"
        onClick={(e) => e.stopPropagation()} // Prevent SLD pane click from closing
        onInteractOutside={(e) => {
             // Prevent closing if click is on another react-flow element during drag, etc.
            if ((e.target as HTMLElement)?.closest('.react-flow__pane')) {
                e.preventDefault();
            }
        }}
      >
        <div className="p-4 space-y-4">
          <h4 className="font-medium text-lg leading-none flex items-center">
            <TextQuote className="w-5 h-5 mr-2 text-primary" />
            Text Styling
          </h4>
          <div className="space-y-1">
            <Label htmlFor="node-label-input" className="text-xs">Node Label (ID)</Label>
            <Input
              id="node-label-input"
              value={node.data.label}
              onChange={(e) => onUpdateNodeLabel?.(e.target.value)}
              className="h-8 text-xs"
              placeholder="Node identifier"
            />
             <p className="text-xs text-muted-foreground">For identification in lists/editor, not displayed text.</p>
          </div>
           <div className="space-y-1">
            <Label htmlFor="text-content-input" className="text-xs">Display Text</Label>
            <Input
              id="text-content-input"
              value={node.data.text || ''}
              onChange={(e) => onUpdateNodeText?.(e.target.value)}
              className="h-8 text-xs"
              placeholder="Text to display"
            />
          </div>
          <Separator />

          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="font-size" className="text-xs flex items-center">
                <Baseline className="w-3.5 h-3.5 mr-1.5" /> Size
              </Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger id="font-size" className="h-8 text-xs">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {fontSizes.map((fs) => (
                    <SelectItem key={fs.value} value={fs.value} className="text-xs">
                      {fs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {fontSize === 'custom' && (
              <div className="space-y-1">
                <Label htmlFor="custom-font-size" className="text-xs">Custom (e.g., 13px, 1.2em)</Label>
                <Input
                  id="custom-font-size"
                  value={customFontSize}
                  onChange={(e) => setCustomFontSize(e.target.value)}
                  className="h-8 text-xs"
                  placeholder="e.g. 13px"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="font-weight" className="text-xs flex items-center">
                <CaseSensitive className="w-3.5 h-3.5 mr-1.5" /> Weight
              </Label>
              <Select value={fontWeight} onValueChange={setFontWeight}>
                <SelectTrigger id="font-weight" className="h-8 text-xs">
                  <SelectValue placeholder="Select weight" />
                </SelectTrigger>
                <SelectContent>
                  {fontWeights.map((fw) => (
                    <SelectItem key={fw.value} value={fw.value} className="text-xs">
                      {fw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-1">
                <Label htmlFor="font-style" className="text-xs">Style</Label>
                 <Select value={fontStyle} onValueChange={setFontStyle}>
                    <SelectTrigger id="font-style" className="h-8 text-xs">
                        <SelectValue placeholder="Style" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                        <SelectItem value="italic" className="text-xs">Italic</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs flex items-center mb-1">
              <AlignLeft className="w-3.5 h-3.5 mr-1.5" /> Alignment
            </Label>
            <div className="flex space-x-1">
              {textAlignments.map(align => (
                <Button
                  key={align.value}
                  variant={textAlign === align.value ? "secondary" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setTextAlign(align.value)}
                  title={align.label}
                >
                  <align.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </div>
          
          <Separator />

          <div className="grid grid-cols-1 gap-4 items-end">
            <div className="space-y-1">
                <Label htmlFor="text-color" className="text-xs flex items-center">
                    <Palette className="w-3.5 h-3.5 mr-1.5" /> Text Color
                </Label>
                <div className="flex items-center space-x-2">
                    <Input
                        id="text-color-input"
                        type="text" // For hex/rgba input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-8 text-xs flex-grow"
                        placeholder="#RRGGBB or rgba(...)"
                    />
                    <Input
                        id="text-color-picker"
                        type="color" // Basic color picker
                        value={textColor.startsWith('#') && (textColor.length === 7 || textColor.length === 4) ? textColor : '#000000'} // Only valid hex for picker
                        onChange={(e) => setTextColor(e.target.value)}
                        className="h-8 w-10 p-1 cursor-pointer"
                    />
                </div>
            </div>
             <div className="space-y-1">
                <Label htmlFor="bg-color" className="text-xs flex items-center">
                    <Blend className="w-3.5 h-3.5 mr-1.5" /> Background Color (Text Area)
                </Label>
                 <div className="flex items-center space-x-2">
                    <Input
                        id="bg-color-input"
                        type="text" // For hex/rgba input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 text-xs flex-grow"
                        placeholder="transparent, #RRGGBB, rgba(...)"
                    />
                    <Input
                        id="bg-color-picker"
                        type="color"
                        value={backgroundColor.startsWith('#') && (backgroundColor.length === 7 || backgroundColor.length === 4) ? backgroundColor : '#ffffff'}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 w-10 p-1 cursor-pointer"
                    />
                </div>
            </div>
          </div>

           <div className="space-y-1">
            <Label htmlFor="padding-input" className="text-xs">Padding (e.g. 2px, 0.5rem 1rem)</Label>
            <Input
              id="padding-input"
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
              className="h-8 text-xs"
              placeholder="e.g. 2px 4px"
            />
          </div>
        </div>
        <div className="p-2 border-t bg-muted/50">
          <Button onClick={handleStyleChange} size="sm" className="w-full h-8">
            Apply Styles
          </Button>
        </div>       
      </PopoverContent>
    </Popover>
  );
};