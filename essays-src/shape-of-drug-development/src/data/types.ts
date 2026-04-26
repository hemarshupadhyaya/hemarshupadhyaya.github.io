export interface DataSnapshot {
  source_repo: string;
  source_branch: string;
  source_commit: string;
  synced_at: string;
  data_year_range: string;
  notes: string;
}

export interface ApprovalTrendRow {
  year: number;
  approvals: number;
}

export interface ApplicationTypeRow {
  year: number;
  application_type: string;
  approvals: number;
}

export interface ExpeditedPathwayRow {
  year: number;
  pathway: string;
  count: number;
}

export interface TherapeuticAreaCountRow {
  therapeutic_area: string;
  count: number;
}

export interface DosageFormRow {
  year: number;
  dosage_form: string;
  count: number;
}
