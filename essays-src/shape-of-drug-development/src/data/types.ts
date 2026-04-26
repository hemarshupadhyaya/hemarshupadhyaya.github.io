export interface DataSnapshot {
  source_repo: string;
  source_branch: string;
  source_commit: string;
  synced_at: string;
  data_year_range: string;
  notes: string;
}

export interface ApprovalTrendRow {
  approval_year: number;
  total_approvals: number;
}

export interface ApplicationTypeRow {
  approval_year: number;
  total_approvals: number;
  nda_count: number;
  bla_count: number;
  unknown_count: number;
}

export interface ExpeditedPathwayRow {
  approval_year: number;
  total_approvals: number;
  fast_track_count: number;
  breakthrough_therapy_count: number;
  accelerated_approval_count: number;
  priority_review_count: number;
  qualified_infectious_disease_product_count: number;
  any_expedited_pathway_count: number;
}

export interface TherapeuticAreaCountRow {
  therapeutic_area: string;
  count: number;
}

export interface DosageFormRow {
  approval_year: number;
  dosage_form: string;
  count: number;
}
