import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenerationCategory, timelineConfig } from '@/config/timelineConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, PlusCircle, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { DataPoint } from '@/config/dataPoints';

interface CategoryManagerProps {
    categories: GenerationCategory[];
    allPossibleDataPoints: DataPoint[];
    onCategoriesChange: (categories: GenerationCategory[]) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, allPossibleDataPoints, onCategoriesChange }) => {
    const [editingCategory, setEditingCategory] = useState<GenerationCategory | null>(null);

    const handleAddCategory = () => {
        const newCategory: GenerationCategory = {
            id: `new-category-${Date.now()}`,
            label: 'New Category',
            icon: PlusCircle,
            dataPointIds: [],
            color: '#000000',
        };
        onCategoriesChange([...categories, newCategory]);
        setEditingCategory(newCategory);
    };

    const handleRemoveCategory = (categoryId: string) => {
        onCategoriesChange(categories.filter(c => c.id !== categoryId));
    };

    const handleUpdateCategory = (updatedCategory: GenerationCategory) => {
        onCategoriesChange(categories.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    };

    const handleAddDataPoint = (categoryId: string, dpId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (category && !category.dataPointIds.includes(dpId)) {
            handleUpdateCategory({ ...category, dataPointIds: [...category.dataPointIds, dpId] });
        }
    };

    const handleRemoveDataPoint = (categoryId: string, dpId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            handleUpdateCategory({ ...category, dataPointIds: category.dataPointIds.filter(id => id !== dpId) });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Manage Generation Categories</h3>
                <Button onClick={handleAddCategory}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>
            <ScrollArea className="h-[400px] p-4 border rounded-lg">
                <AnimatePresence>
                    {categories.map(category => (
                        <motion.div
                            key={category.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-4 border rounded-lg mb-4"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-6 h-6 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    <h4 className="text-lg font-semibold">{category.label}</h4>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(category)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCategory(category.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <Label>Data Points:</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {category.dataPointIds.map(dpId => {
                                        const dp = allPossibleDataPoints.find(p => p.id === dpId);
                                        return (
                                            <Badge key={dpId} variant="outline">
                                                {dp?.name}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 ml-1"
                                                    onClick={() => handleRemoveDataPoint(category.id, dpId)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Badge>
                                        );
                                    })}
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            <PlusCircle className="h-4 w-4 mr-2" />
                                            Add Data Point
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <Command>
                                            <CommandInput placeholder="Search data points..." />
                                            <CommandEmpty>No data points found.</CommandEmpty>
                                            <CommandGroup>
                                                {allPossibleDataPoints
                                                    .filter(dp => !category.dataPointIds.includes(dp.id))
                                                    .map(dp => (
                                                        <CommandItem
                                                            key={dp.id}
                                                            onSelect={() => handleAddDataPoint(category.id, dp.id)}
                                                        >
                                                            {dp.name}
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </ScrollArea>
            {editingCategory && (
                <EditCategoryForm
                    category={editingCategory}
                    onUpdate={handleUpdateCategory}
                    onClose={() => setEditingCategory(null)}
                />
            )}
        </div>
    );
};

interface EditCategoryFormProps {
    category: GenerationCategory;
    onUpdate: (category: GenerationCategory) => void;
    onClose: () => void;
}

const EditCategoryForm: React.FC<EditCategoryFormProps> = ({ category, onUpdate, onClose }) => {
    const [label, setLabel] = useState(category.label);
    const [color, setColor] = useState(category.color);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate({ ...category, label, color });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card p-6 rounded-lg w-full max-w-md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-semibold">Edit Category</h3>
                    <div>
                        <Label htmlFor="label">Label</Label>
                        <Input id="label" value={label} onChange={e => setLabel(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="color">Color</Label>
                        <Input id="color" type="color" value={color} onChange={e => setColor(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CategoryManager;
