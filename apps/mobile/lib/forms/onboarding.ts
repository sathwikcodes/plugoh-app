import { z } from "zod";

export const influencerBasicsSchema = z.object({
  full_name: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  location: z.string().trim().min(1),
});

export type InfluencerBasicsForm = z.infer<typeof influencerBasicsSchema>;
