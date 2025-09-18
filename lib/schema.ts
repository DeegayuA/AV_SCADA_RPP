// lib/schema.ts
import { z } from 'zod';

export const plantConfigSchema = z.object({
  plantName: z.string().min(1, 'Plant name is required'),
  plantLocation: z.string().min(1, 'Plant location is required'),
  plantType: z.string().min(1, 'Plant type is required'),
  plantCapacity: z.string().min(1, 'Plant capacity is required'),
  opcUaEndpointOfflineIP: z.string().ip({ version: "v4", message: "Invalid IPv4 address" }).min(1, 'Offline OPC UA IP is required'),
  opcUaEndpointOfflinePort: z.coerce.number().min(1024).max(65535).default(4840),
  opcUaEndpointOnlineIP: z.string().ip({ version: "v4", message: "Invalid IPv4 address" }).optional().or(z.literal('')),
  opcUaEndpointOnlinePort: z.coerce.number().min(1024).max(65535).optional(),
  appName: z.string().optional(),
  selectedPlant: z.string().optional(),
});

export type PlantConfigFormData = z.infer<typeof plantConfigSchema>;

// For Step 2: DataPoint configuration if you add manual editing or more complex validation
// For now, file upload handles it, but schema is good for type safety.
export const dataPointConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    nodeId: z.string(),
    dataType: z.enum([
        'Boolean', 'Float', 'Double', 'Int16', 'Int32', 'UInt16', 'UInt32',
        'String', 'DateTime', 'ByteString', 'Guid', 'Byte', 'SByte', 'Int64', 'UInt64'
    ]),
    uiType: z.enum(['display', 'button', 'switch', 'gauge']),
    // icon: z.string(), // Icon name would be validated against lucide-react exports
    unit: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    description: z.string().optional(),
    category: z.string(), // Could be an enum if categories are fixed
    factor: z.number().optional(),
    phase: z.enum(['a', 'b', 'c', 'x']).optional(),
    // ... other fields from DataPointConfig
});