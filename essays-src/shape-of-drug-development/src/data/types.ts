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
  total_approvals: number;
}

export interface TherapeuticAreaPeriodRow {
  period: string;
  therapeutic_area: string;
  total_approvals: number;
  manual_review_count?: number;
  mean_confidence?: number;
}

export interface DosageFormRow {
  approval_year: number;
  dosage_form: string;
  total_approvals: number;
}

export interface TaFormMatrix {
  therapeutic_areas: { therapeutic_area: string; total: number }[];
  dosage_forms: string[];
  matrix: {
    therapeutic_area: string;
    total: number;
    forms: Record<string, { count: number; share: number }>;
  }[];
}

export interface ApprovalRecord {
  approval_year: number;
  approval_date: string | null;
  proprietary_name: string | null;
  active_ingredient: string | null;
  application_type: string | null;
  applicant: string | null;
  indication: string | null;
  therapeutic_area: string | null;
  dosage_form: string | null;
  source_status: string | null;
  source_as_of_date: string | null;
  is_provisional: boolean | null;
}
