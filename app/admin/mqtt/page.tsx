// app/admin/mqtt/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MqttDataPoint } from '@/types/mqtt';
import { Trash2, Edit, PlusCircle, Save } from 'lucide-react';

export default function MqttAdminPage() {
  const [dataPoints, setDataPoints] = useState<MqttDataPoint[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingPoint, setEditingPoint] = useState<Partial<MqttDataPoint> | null>(null);

  useEffect(() => {
    fetch('/api/mqtt/datapoints')
      .then((res) => res.json())
      .then(setDataPoints);
  }, []);

  const handleSave = () => {
    fetch('/api/mqtt/datapoints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPoints),
    }).then(() => {
      // You might want to add a toast notification here
      console.log('Data points saved');
    });
  };

  const handleAddPoint = () => {
    setEditingPoint({});
    setEditingIndex(dataPoints.length);
  };

  const handleEditPoint = (index: number) => {
    setEditingIndex(index);
    setEditingPoint(dataPoints[index]);
  };

  const handleDeletePoint = (index: number) => {
    const newPoints = dataPoints.filter((_, i) => i !== index);
    setDataPoints(newPoints);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    if (editingIndex === dataPoints.length) {
      setDataPoints([...dataPoints, editingPoint as MqttDataPoint]);
    } else {
      const newPoints = [...dataPoints];
      newPoints[editingIndex] = editingPoint as MqttDataPoint;
      setDataPoints(newPoints);
    }
    setEditingIndex(null);
    setEditingPoint(null);
  };

  const renderEditForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>{editingIndex === dataPoints.length ? 'Add' : 'Edit'} Data Point</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="id">ID</Label>
            <Input
              id="id"
              value={editingPoint?.id || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, id: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editingPoint?.name || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={editingPoint?.topic || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, topic: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="dataType">Data Type</Label>
            <Input
              id="dataType"
              value={editingPoint?.dataType || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, dataType: e.target.value as MqttDataPoint['dataType'] })}
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={editingPoint?.unit || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, unit: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="factor">Factor</Label>
            <Input
              id="factor"
              type="number"
              value={editingPoint?.factor || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, factor: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="precision">Precision</Label>
            <Input
              id="precision"
              type="number"
              value={editingPoint?.precision || ''}
              onChange={(e) => setEditingPoint({ ...editingPoint, precision: parseInt(e.target.value) })}
            />
          </div>
        </div>
        <Button onClick={handleSaveEdit} className="mt-4">
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button onClick={() => setEditingIndex(null)} variant="outline" className="mt-4 ml-4">
          Cancel
        </Button>
      </CardContent>
    </Card>
  );

  const renderDataPointsList = () => (
    <Card>
      <CardHeader>
        <CardTitle>Existing Data Points</CardTitle>
      </CardHeader>
      <CardContent>
        {dataPoints.map((point, index) => (
          <div key={index} className="flex items-center gap-4 mb-4">
            <div className="flex-grow">
              <p className="font-semibold">{point.name}</p>
              <p className="text-sm text-gray-500">{point.topic}</p>
            </div>
            <Button onClick={() => handleEditPoint(index)} variant="outline" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
            <Button onClick={() => handleDeletePoint(index)} variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button onClick={handleAddPoint} className="mt-4">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Data Point
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">MQTT Data Point Management</h1>
      {editingIndex !== null ? renderEditForm() : renderDataPointsList()}
      <Button onClick={handleSave} className="mt-4">
        Save All Changes
      </Button>
    </div>
  );
}
