import { metaFetchAll, META_AD_ACCOUNT_ID } from "./client";

export interface MetaAudience {
  id: string;
  name: string;
  subtype: string; // CUSTOM, LOOKALIKE, WEBSITE, etc.
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  description?: string;
  time_created?: string;
  time_updated?: string;
  data_source?: {
    type: string;
    sub_type?: string;
  };
  lookalike_spec?: {
    country: string;
    ratio: number;
    type: string;
  };
}

export async function fetchAudiences(): Promise<MetaAudience[]> {
  return metaFetchAll<MetaAudience>(`/${META_AD_ACCOUNT_ID}/customaudiences`, {
    fields:
      "id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,description,time_created,time_updated,data_source,lookalike_spec",
  });
}

export async function fetchSavedAudiences(): Promise<MetaAudience[]> {
  return metaFetchAll<MetaAudience>(`/${META_AD_ACCOUNT_ID}/saved_audiences`, {
    fields: "id,name,targeting,time_created,time_updated",
  });
}
