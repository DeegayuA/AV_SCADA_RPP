import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { timelineConfig, UnitPrice } from '@/config/timelineConfig';

interface SettingsManagerProps {
    historicalApiUrl: string;
    unitPrice: UnitPrice;
    onHistoricalApiUrlChange: (url: string) => void;
    onUnitPriceChange: (unitPrice: UnitPrice) => void;
}

const SettingsManager: React.FC<SettingsManagerProps> = ({
    historicalApiUrl,
    unitPrice,
    onHistoricalApiUrlChange,
    onUnitPriceChange,
}) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Advanced Settings</h3>
            <div className="space-y-2">
                <Label htmlFor="api-url">Historical API URL</Label>
                <Input
                    id="api-url"
                    value={historicalApiUrl}
                    onChange={e => onHistoricalApiUrlChange(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>Unit Prices</Label>
                <div className="grid grid-cols-2 gap-4">
                    {Object.keys(unitPrice).map(currency => (
                        <div key={currency} className="space-y-1">
                            <Label htmlFor={`price-${currency}`}>{currency}</Label>
                            <Input
                                id={`price-${currency}`}
                                type="number"
                                value={unitPrice[currency as keyof UnitPrice]}
                                onChange={e =>
                                    onUnitPriceChange({
                                        ...unitPrice,
                                        [currency]: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;
