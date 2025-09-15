import React from 'react';
import {
  Zap, Wind, Sun, CloudSun, CloudMoon, Moon, BatteryCharging, BatteryFull, Battery,
  PlugZap, Plug, ShoppingCart, Home, Factory, Building, Waves, Thermometer,
  TrendingUp, TrendingDown, Gauge, Activity, Send, Server, Cloud, Cog, type LucideIcon
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  Zap, Wind, Sun, CloudSun, CloudMoon, Moon, BatteryCharging, BatteryFull, Battery,
  PlugZap, Plug, ShoppingCart, Home, Factory, Building, Waves, Thermometer,
  TrendingUp, TrendingDown, Gauge, Activity, Send, Server, Cloud, Cog
};

const availableIcons = Object.keys(iconMap);

const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onIconSelect }) => {
  return (
    <div className="space-y-2">
       <Label>Icon</Label>
      <ScrollArea className="h-32 w-full rounded-md border p-2">
        <div className="grid grid-cols-8 gap-2">
          {availableIcons.map(iconName => {
            const LucideIconComponent = iconMap[iconName];
            if (!LucideIconComponent) return null;
            const isSelected = selectedIcon === iconName;
            return (
              <Button
                key={iconName}
                variant={isSelected ? 'default' : 'outline'}
                size="icon"
                onClick={() => onIconSelect(iconName)}
                className={isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                title={iconName}
              >
                <LucideIconComponent className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default IconPicker;
