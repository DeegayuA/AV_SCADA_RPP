import React from 'react';
import { icons } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (iconName: string) => void;
}

const availableIcons: (keyof typeof icons)[] = [
  'Zap', 'Wind', 'Sun', 'CloudSun', 'CloudMoon', 'Moon', 'BatteryCharging', 'BatteryFull', 'Battery',
  'PlugZap', 'Plug', 'ShoppingCart', 'Home', 'Factory', 'Building', 'Waves', 'Thermometer',
  'TrendingUp', 'TrendingDown', 'Gauge', 'Activity', 'Send', 'Server', 'Cloud', 'Cog'
];

const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onIconSelect }) => {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Icon</p>
      <ScrollArea className="h-48 w-full rounded-md border p-4">
        <div className="grid grid-cols-6 gap-2">
          {availableIcons.map(iconName => {
            const LucideIcon = icons[iconName];
            const isSelected = selectedIcon === iconName;
            return (
              <Button
                key={iconName}
                variant={isSelected ? 'default' : 'outline'}
                size="icon"
                onClick={() => onIconSelect(iconName)}
                className={isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
              >
                <LucideIcon className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default IconPicker;
