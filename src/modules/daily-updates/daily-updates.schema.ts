import { z } from "zod";

/**
 * Schema for raw materials used in standard daily updates
 */
export const RawMaterialSchema = z.object({
    materialName: z.string().min(1, "Material name is required"),
    quantity: z.number().nonnegative("Quantity must be a non-negative number"),
    notes: z.string().optional().nullable()
});

/**
 * Schema for material consumption used in admin daily updates
 */
export const QuantityConsumptionSchema = z.object({
    materialName: z.string().min(1, "Material name is required"),
    totalQuantity: z.union([z.string(), z.number()]),
    consumed: z.union([z.string(), z.number()]),
    date: z.string().min(1, "Date is required"),
    unit: z.string().min(1, "Unit is required"),
    notes: z.string().optional().nullable()
});

/**
 * Schema for labour worker details used in admin daily updates
 */
export const LabourWorkersSchema = z.object({
    noOfLabours: z.number().nonnegative("Number of labors must be a non-negative number"),
    notes: z.string().optional().nullable()
});

// TypeScript interfaces inferred from schemas
export type RawMaterial = z.infer<typeof RawMaterialSchema>;
export type QuantityConsumption = z.infer<typeof QuantityConsumptionSchema>;
export type LabourWorkers = z.infer<typeof LabourWorkersSchema>;

// Array schemas for plural fields
export const RawMaterialArraySchema = z.array(RawMaterialSchema);
export const QuantityConsumptionArraySchema = z.array(QuantityConsumptionSchema);
export const LabourWorkersArraySchema = z.array(LabourWorkersSchema);

/**
 * Helper to safely parse and validate JSON data
 * @param data - The data to parse (can be string or already parsed object)
 * @param schema - The Zod schema to validate against
 * @returns Validated data
 * @throws Error if parsing or validation fails
 */
export const validateJsonInput = <T>(data: any, schema: z.ZodSchema<T>): T => {
    let parsedData = data;
    
    // Safety check for malicious/deeply nested JSON
    if (typeof data === 'string') {
        if (data.length > 50000) { // arbitrary limit to prevent massive strings
            throw new Error("Input payload too large");
        }
        try {
            parsedData = JSON.parse(data);
        } catch (error) {
            throw new Error("Invalid JSON format");
        }
    }

    return schema.parse(parsedData);
};
