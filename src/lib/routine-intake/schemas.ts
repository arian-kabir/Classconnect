import { z } from "zod";

export const RunQuerySchema = z.object({
  sheetId: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
  dryRun: z.boolean().optional().default(false),
});

export const PreviewQuerySchema = z.object({
  sheetId: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
});

export const RunsListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const CoursesListQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
});

export const SectionsListQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
});

export const SlotsListQuerySchema = z.object({
  sectionId: z.coerce.number().int().positive().optional(),
  day: z.coerce.number().int().min(1).max(6).optional(),
});

export type RunQuery = z.infer<typeof RunQuerySchema>;
export type PreviewQuery = z.infer<typeof PreviewQuerySchema>;
export type RunsListQuery = z.infer<typeof RunsListQuerySchema>;
export type CoursesListQuery = z.infer<typeof CoursesListQuerySchema>;
export type SectionsListQuery = z.infer<typeof SectionsListQuerySchema>;
export type SlotsListQuery = z.infer<typeof SlotsListQuerySchema>;
