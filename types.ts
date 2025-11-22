export interface TimelineEvent {
  year: number;
  dateStr?: string;
  title: string;
  description: string;
  category: 'founding' | 'product' | 'acquisition' | 'scandal' | 'general';
}

export interface OrgNode {
  name: string;
  role: 'root' | 'parent' | 'subsidiary' | 'department' | 'child';
  children?: OrgNode[];
  description?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface CompanyData {
  companyName: string;
  summary: string;
  timeline: TimelineEvent[];
  structure: OrgNode;
  sources: GroundingSource[];
}

export interface GeminiResponse {
  data: CompanyData | null;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isUpdate?: boolean; // If this message triggered a data update
}
